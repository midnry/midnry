// Invoice as a client-work tool (src/lib/client-work.ts): migration of the old
// single invoice and of the old Quote/Proposal app documents, numbering,
// overdue, quote → invoice, proposal → quote, search, and the shared maths.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const W = await jiti.import("../src/lib/client-work.ts");
const M = await jiti.import("../src/lib/invoice-math.ts");
const { APP_ALIASES } = await jiti.import("../src/lib/app-aliases.ts");
const { getApp } = await jiti.import("../src/lib/catalog.ts");
const { docTier } = await jiti.import("../src/lib/merged-docs.ts");
const { docLimit } = await jiti.import("../src/lib/doc-limits.ts");

function stamper(today = "2026-10-21") {
  let n = 0;
  return { id: () => `id-${++n}`, today, now: `${today}T09:00:00.000Z` };
}

const OLD = {
  from: "Ada Studio\nLagos",
  to: "Bola Foods\nbola@example.test\n12 Marina, Lagos",
  number: "INV-0007",
  issued: "2026-10-01",
  due: "2026-10-15",
  currency: "USD",
  notes: "Thank you",
  taxPercent: "7.5",
  lines: [
    { id: "l1", description: "Design", qty: "3", rate: "33.33" },
    { id: "l2", description: "Delivery", qty: "1.5", rate: "0.07" },
  ],
};

test("the old single invoice becomes the first invoice of the archive, with nothing lost", () => {
  const doc = W.normalizeDoc(structuredClone(OLD));
  assert.equal(doc.v, 2);
  assert.equal(doc.invoices.length, 1);
  const [inv] = doc.invoices;
  assert.equal(inv.id, W.LEGACY_INVOICE_ID);
  for (const key of ["from", "to", "number", "issued", "due", "currency", "notes", "taxPercent"]) assert.equal(inv[key], OLD[key], key);
  assert.deepEqual(inv.lines, OLD.lines);
  assert.equal(inv.status, "draft");
  assert.deepEqual(doc.legacy, OLD, "a copy of the old document is kept as it was");
  assert.equal(doc.openId, inv.id, "it opens on that invoice");
  assert.deepEqual(doc.clients.map((c) => [c.name, c.email, c.address]), [["Bola Foods", "bola@example.test", "12 Marina, Lagos"]]);
  assert.equal(inv.clientId, doc.clients[0].id);
  assert.equal(doc.from, OLD.from);
  assert.deepEqual(doc.numbering, { prefix: "INV-", next: 8, pad: 4 }, "numbering continues from the old number");
  // Same input, same result: migration can run on every read until the first save.
  assert.deepEqual(W.normalizeDoc(structuredClone(OLD)), doc);
  // The migrated document reads back unchanged once saved.
  const json = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(json(W.normalizeDoc(json(doc))), json(doc));
});

test("the old shape with missing or odd fields still loads", () => {
  const doc = W.normalizeDoc({ number: "0001", lines: [null, { id: "a", description: "x", qty: "1", rate: "5" }] });
  assert.equal(doc.invoices.length, 1);
  assert.equal(doc.invoices[0].lines.length, 1);
  assert.equal(doc.invoices[0].taxPercent, "0");
  assert.deepEqual(doc.numbering, { prefix: "", next: 2, pad: 4 });
  assert.deepEqual(W.normalizeDoc({}).invoices, [], "an empty document has no invoices");
  assert.deepEqual(W.normalizeDoc(null).invoices, []);
  assert.equal(W.isLegacyInvoice({ v: 2, invoices: [] }), false);
});

test("numbering: auto-increment with an editable prefix, never repeating a number", () => {
  const n = { prefix: "INV-", next: 1, pad: 4 };
  assert.equal(W.nextNumber(n, []), "INV-0001");
  assert.equal(W.nextNumber(n, ["INV-0001", "INV-0002"]), "INV-0003");
  assert.equal(W.nextNumber(n, ["INV-0009", "0042", "Q-0100"]), "INV-0010", "other prefixes do not count");
  assert.equal(W.nextNumber({ ...n, next: 50 }, ["INV-0009"]), "INV-0050", "the counter can be moved forward");
  assert.equal(W.nextNumber({ prefix: "", next: 1, pad: 4 }, ["0007"]), "0008");
  assert.equal(W.nextNumber({ prefix: "2026/", next: 1, pad: 3 }, ["2026/012"]), "2026/013");
  assert.deepEqual(W.bumpNumbering(n, "INV-0041"), { ...n, next: 42 });
  assert.deepEqual(W.bumpNumbering(n, "custom"), n);

  // New invoices preserve earlier ones and take the next number.
  const s = stamper();
  let doc = W.normalizeDoc(structuredClone(OLD));
  const a = W.draftInvoice(doc, s);
  doc = W.putInvoice(doc, a);
  const b = W.draftInvoice(doc, s);
  doc = W.putInvoice(doc, b);
  assert.deepEqual(doc.invoices.map((i) => i.number), ["INV-0007", "INV-0008", "INV-0009"]);
  assert.equal(doc.invoices[0].lines.length, 2, "the first invoice is untouched");
  assert.equal(a.from, OLD.from, "your details carry over");
  assert.equal(a.taxPercent, "7.5");
  // Changing the prefix starts a new series.
  doc = { ...doc, numbering: { ...doc.numbering, prefix: "A-" } };
  assert.equal(W.draftInvoice(doc, s).number, "A-0010");
});

test("overdue is derived from the due date; paid stays paid", () => {
  const today = "2026-10-21";
  assert.equal(W.invoiceState({ status: "sent", due: "2026-10-20" }, today), "overdue");
  assert.equal(W.invoiceState({ status: "draft", due: "2026-10-20" }, today), "overdue");
  assert.equal(W.invoiceState({ status: "sent", due: "2026-10-21" }, today), "sent", "due today is not overdue yet");
  assert.equal(W.invoiceState({ status: "sent", due: "" }, today), "sent");
  assert.equal(W.invoiceState({ status: "paid", due: "2026-01-01" }, today), "paid");
  const s = stamper(today);
  const inv = W.draftInvoice(W.emptyDoc(), s);
  const paid = W.setInvoiceStatus(inv, "paid", s);
  assert.equal(paid.paidOn, today);
  assert.equal(W.setInvoiceStatus(inv, "paid", s, "2026-10-19").paidOn, "2026-10-19");
  assert.equal(W.setInvoiceStatus(paid, "sent", s).paidOn, undefined, "un-paying clears the date");
  assert.equal(W.quoteState({ status: "sent", validUntil: "2026-10-01" }, today), "expired");
  assert.equal(W.quoteState({ status: "sent", validUntil: "2026-10-01", invoiceId: "x" }, today), "invoiced");
});

test("quote → invoice copies client and lines without retyping, links both, and does not duplicate", () => {
  const s = stamper();
  let doc = W.emptyDoc();
  const client = W.upsertClient(doc, { name: "Chidi Ltd", email: "c@example.test", address: "Abuja" }, s);
  doc = client.doc;
  const q = { ...W.draftQuote(doc, s, client.client), taxPercent: "10", currency: "NGN", lines: [{ id: "x", description: "Logo", qty: "2", rate: "25000" }] };
  doc = W.putQuote(doc, q);
  assert.equal(q.number, "Q-0001");
  assert.equal(q.validUntil, "2026-11-20", "quotes hold for 30 days by default");
  const r = W.quoteToInvoice(doc, q.id, s);
  assert.ok(r.created);
  const inv = r.invoice;
  assert.equal(inv.to, q.to);
  assert.equal(inv.clientId, client.client.id);
  assert.equal(inv.currency, "NGN");
  assert.equal(inv.taxPercent, "10");
  assert.deepEqual(inv.lines.map(({ description, qty, rate }) => ({ description, qty, rate })), [{ description: "Logo", qty: "2", rate: "25000" }]);
  assert.notEqual(inv.lines[0].id, q.lines[0].id, "the lines are copies");
  assert.equal(inv.quoteId, q.id);
  const linked = r.doc.quotes.find((x) => x.id === q.id);
  assert.equal(linked.invoiceId, inv.id);
  assert.equal(linked.status, "accepted");
  assert.equal(W.billCheck(inv, "NGN").totalMinor, W.billCheck(q, "NGN").totalMinor, "same total");
  const again = W.quoteToInvoice(r.doc, q.id, s);
  assert.equal(again.created, false);
  assert.equal(again.invoice.id, inv.id);
  assert.equal(again.doc.invoices.length, 1);
});

test("proposal → quote splits the work into lines", () => {
  const s = stamper();
  let doc = W.emptyDoc();
  const p = { ...W.draftProposal(s), title: "Shop site", to: "Dayo", work: "- Design: 3 pages - 150000\n- Hosting set-up - 20,000\n- Training" };
  doc = W.putProposal(doc, p);
  const r = W.proposalToQuote(doc, p.id, s);
  assert.deepEqual(r.quote.lines.map(({ description, qty, rate }) => [description, qty, rate]), [
    ["Design: 3 pages", "1", "150000"],
    ["Hosting set-up", "1", "20000"],
    ["Training", "1", ""],
  ]);
  assert.equal(r.quote.proposalId, p.id);
  assert.equal(r.doc.proposals[0].quoteId, r.quote.id);
  const single = W.proposalToQuote(W.putProposal(W.emptyDoc(), { ...p, id: "p2", work: "Full build", price: "₦300,000" }), "p2", s);
  assert.equal(single.quote.lines[0].rate, "300000", "one line takes the price");
});

test("old Quote and Proposal app documents are copied in once; nothing is lost", () => {
  const s = stamper();
  const quoteKit = { values: { client: "Efe Bakery", lines: "Cake design - ₦15,000\n2 x 5000\nDelivery: 3 x ₦2,000\nAsk about icing", until: "2026-11-30", total: "21000" } };
  const proposalKit = { values: { client: "Efe Bakery", problem: "No website", work: "One page site", price: "₦80,000", next: "Call on Monday" } };
  const before = W.normalizeDoc(structuredClone(OLD));
  const { doc, changed } = W.importKitDocs(before, { quote: quoteKit, proposal: proposalKit }, s);
  assert.ok(changed);
  assert.deepEqual(doc.invoices, before.invoices, "invoices are untouched");
  const q = doc.quotes.find((x) => x.id === W.KIT_QUOTE_ID);
  assert.ok(q);
  assert.equal(q.to, "Efe Bakery");
  assert.equal(q.validUntil, "2026-11-30");
  assert.deepEqual(q.lines.map(({ description, qty, rate }) => [description, qty, rate]), [
    ["Cake design", "1", "15000"],
    ["", "2", "5000"],
    ["Delivery", "3", "2000"],
  ]);
  assert.ok(q.notes.includes(quoteKit.values.lines), "the original text is kept word for word");
  assert.ok(q.notes.includes("21000"));
  const p = doc.proposals.find((x) => x.id === W.KIT_PROPOSAL_ID);
  assert.deepEqual([p.problem, p.work, p.price, p.next], ["No website", "One page site", "₦80,000", "Call on Monday"]);
  assert.equal(p.title, "Proposal for Efe Bakery");
  assert.equal(doc.clients.filter((c) => c.name === "Efe Bakery").length, 1, "one saved client, not two");
  assert.deepEqual(doc.imported, { quote: true, proposal: true });
  assert.deepEqual(quoteKit.values.client, "Efe Bakery", "the source is not changed");
  // Running it again adds nothing.
  const twice = W.importKitDocs(doc, { quote: quoteKit, proposal: proposalKit }, s);
  assert.equal(twice.changed, false);
  assert.equal(twice.doc.quotes.length, 1);
  // A read that failed (null) is retried later; an empty document is not imported.
  const failed = W.importKitDocs(W.emptyDoc(), { quote: null }, s);
  assert.equal(failed.changed, false);
  assert.equal(failed.doc.imported.quote, undefined);
  const empty = W.importKitDocs(W.emptyDoc(), { quote: { values: { client: " " } } }, s);
  assert.equal(empty.changed, false);
  assert.equal(empty.doc.quotes.length, 0);
});

test("a quote with only a total keeps it as one line", () => {
  const { doc } = W.importKitDocs(W.emptyDoc(), { quote: { values: { client: "Zee", lines: "Branding work", total: "45000" } } }, stamper());
  assert.deepEqual(doc.quotes[0].lines.map(({ description, rate }) => [description, rate]), [["Work as quoted", "45000"]]);
});

test("totals use the shared invoice maths (same as the homepage demo)", () => {
  const doc = W.normalizeDoc(structuredClone(OLD));
  const check = W.billCheck(doc.invoices[0], "USD");
  const direct = M.checkInvoice(OLD.lines, OLD.taxPercent, "USD");
  assert.deepEqual(check, direct);
  assert.equal(check.subtotalMinor, 10010); // 99.99 + 0.11
  assert.equal(check.taxMinor, 751);
  assert.equal(check.totalMinor, 10761);
  assert.equal(W.plainAmount(10761, "USD"), "107.61");
  assert.equal(W.plainAmount(5, "USD"), "0.05");
});

test("search by client, number or amount", () => {
  const doc = W.normalizeDoc(structuredClone(OLD));
  const inv = doc.invoices[0];
  const ctx = { clients: doc.clients, currency: "USD" };
  for (const q of ["bola", "BOLA foods", "INV-0007", "0007", "107.61", "$107.61", "bola 107.61"]) assert.ok(W.matchesSearch(inv, q, ctx), q);
  for (const q of ["zed", "0008", "999"]) assert.ok(!W.matchesSearch(inv, q, ctx), q);
  const big = { ...inv, lines: [{ id: "a", description: "x", qty: "1", rate: "1500" }], taxPercent: "0" };
  for (const q of ["1500", "1,500", "1,500.00", "1500.00"]) assert.ok(W.matchesSearch(big, q, ctx), q);
});

test("duplicate keeps the lines and the payment gap, as a new numbered draft", () => {
  const s = stamper("2026-10-21");
  const doc = W.normalizeDoc(structuredClone(OLD));
  const r = W.duplicateInvoice({ ...doc, invoices: [W.setInvoiceStatus(doc.invoices[0], "paid", s)] }, W.LEGACY_INVOICE_ID, s);
  assert.equal(r.invoice.number, "INV-0008");
  assert.equal(r.invoice.status, "draft");
  assert.equal(r.invoice.paidOn, undefined);
  assert.equal(r.invoice.issued, "2026-10-21");
  assert.equal(r.invoice.due, "2026-11-04", "14 days, as before");
  assert.equal(r.doc.invoices.length, 2);
});

test("old links and storage: quote and proposal lead to Invoice, their documents stay readable", () => {
  assert.deepEqual(APP_ALIASES.quote, { to: "invoice", view: "quotes" });
  assert.deepEqual(APP_ALIASES.proposal, { to: "invoice", view: "proposals" });
  assert.equal(getApp("quote"), undefined);
  assert.equal(getApp("proposal"), undefined);
  assert.equal(getApp("invoice").tier, "free", "Invoice stays free");
  assert.equal(docTier("quote"), "free");
  assert.equal(docTier("proposal"), "free");
  assert.ok(docLimit("invoice") >= 1_000_000, "room for hundreds of invoices");
});

// ── 2026-10-23 audit fixes: how to pay, notes per invoice, declined quotes, number clashes, sharing ──

test("how to pay prints on every invoice; notes stop carrying over once it exists", () => {
  const s = stamper();
  let doc = W.emptyDoc();
  const first = { ...W.draftInvoice(doc, s), notes: "Reply to confirm and we start Monday.", taxPercent: "7.5", lines: [{ id: "a", description: "Design", qty: "1", rate: "100" }] };
  doc = W.putInvoice(doc, first);
  assert.equal(W.draftInvoice(doc, s).notes, "Reply to confirm and we start Monday.", "without a How to pay block the latest notes still carry over (bank details lived there)");
  doc = { ...doc, payment: "Bank: Example Bank\nAccount: 0123456789" };
  assert.equal(W.normalizeDoc(JSON.parse(JSON.stringify(doc))).payment, "Bank: Example Bank\nAccount: 0123456789", "saved and read back");
  const second = W.draftInvoice(doc, s);
  assert.equal(second.notes, "", "with a How to pay block, a new invoice does not inherit another client's note");
  assert.equal(second.taxPercent, "7.5", "the tax rate still carries over");
  assert.equal(W.draftInvoice({ ...doc, payment: "   " }, s).notes, first.notes, "blank counts as not set");
});

test("a declined quote is not converted; a number already used is flagged", () => {
  const s = stamper();
  let doc = W.emptyDoc();
  const q = { ...W.draftQuote(doc, s), status: "declined", lines: [{ id: "x", description: "Logo", qty: "1", rate: "25000" }] };
  doc = W.putQuote(doc, q);
  assert.equal(W.quoteToInvoice(doc, q.id, s), null, "declined quotes stay quotes");
  doc = W.putQuote(doc, { ...q, status: "sent" });
  assert.ok(W.quoteToInvoice(doc, q.id, s)?.created, "once the status changes it converts");
  const a = { ...W.draftInvoice(doc, s), number: "0001" };
  doc = W.putInvoice(doc, a);
  const b = { ...W.draftInvoice(doc, s), number: " 0001 " };
  assert.equal(W.numberClash(doc.invoices, b), true, "same number, ignoring spaces");
  assert.equal(W.numberClash(doc.invoices, { ...b, number: "0002" }), false);
  assert.equal(W.numberClash(doc.invoices, a), false, "an invoice never clashes with itself");
  assert.equal(W.numberClash(doc.invoices, { ...b, number: "" }), false, "no number, no clash");
});

test("the WhatsApp summary has the number, parties, total, due date and how to pay", () => {
  const text = W.invoiceShareText({
    number: "SSL-0102",
    from: "Synthetic Studio Ltd\n12 Allen Avenue, Ikeja",
    to: "Amaka Okafor\nOkafor Foods",
    total: "₦623,500.00",
    due: "2026-11-15",
    payment: "Bank: Example Bank\nAccount number: 0123456789",
  });
  assert.equal(text, "Invoice SSL-0102 from Synthetic Studio Ltd\nTo: Amaka Okafor\nTotal: ₦623,500.00 (due 2026-11-15)\nHow to pay:\nBank: Example Bank\nAccount number: 0123456789");
  assert.equal(W.invoiceShareText({ number: "", from: "", to: "", total: "$10.00" }), "Invoice —\nTotal: $10.00");
});
