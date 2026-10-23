// Invoice "Share PDF": the PDF made on the device (src/lib/invoice-pdf.ts),
// read back with unpdf, its file name, and what pressing Share PDF does on
// each path (src/lib/invoice-share.ts). Sharing never marks the invoice sent;
// only "Mark as sent" does. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { extractText, getDocumentProxy } from "unpdf";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const W = await jiti.import("../src/lib/client-work.ts");
const { buildInvoicePdf } = await jiti.import("../src/lib/invoice-pdf.ts");
const S = await jiti.import("../src/lib/invoice-share.ts");
const { formatMoney } = await jiti.import("../src/lib/format.ts");

// The same Nunito pieces src/lib/apply/resume-fonts.ts loads in the browser.
const fontsSource = readFileSync(new URL("../src/lib/apply/resume-fonts.ts", import.meta.url), "utf8");
const files = [...fontsSource.matchAll(/from "@fontsource\/nunito\/files\/([\w-]+\.woff)\?url"/g)].map((m) => m[1]);
const load = (weight) =>
  files.filter((file) => file.includes(`-${weight}-`)).map((file) => new Uint8Array(readFileSync(new URL(`../node_modules/@fontsource/nunito/files/${file}`, import.meta.url))));
const fonts = { regular: load(400), bold: load(700) };

async function textOf(bytes) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return { text: text.normalize("NFC"), pages: pdf.numPages };
}

const PAYMENT = "Bank: Example Bank\nAccount name: Synthetic Studio Ltd\nAccount number: 0123456789";

function invoice(over = {}) {
  return {
    id: "inv-1",
    number: "INV-0002",
    from: "Adébáyọ̀ Studio\nLagos",
    to: "Okafor Foods\nbilling@okafor.example\n12 Marina, Lagos",
    issued: "2026-10-20",
    due: "2026-11-03",
    currency: "NGN",
    notes: "Thank you for your business.",
    taxPercent: "7.5",
    lines: [
      { id: "a", description: "Logo design", qty: "1", rate: "150000" },
      { id: "b", description: "Business cards (box)", qty: "3", rate: "12500.50" },
      { id: "c", description: "", qty: "1", rate: "" },
    ],
    status: "draft",
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
    ...over,
  };
}

function pdfInput(inv, payment = PAYMENT) {
  const check = W.billCheck(inv, inv.currency);
  return { number: inv.number, issued: inv.issued, due: inv.due, from: inv.from, to: inv.to, lines: inv.lines, check, currency: inv.currency, payment, notes: inv.notes, status: inv.status, paidOn: inv.paidOn };
}

/* ── the PDF ─────────────────────────────────────────────────────────────── */

test("the PDF has the number, dates, client, each line, the sums with ₦, How to pay and the notes", async () => {
  const inv = invoice();
  const input = pdfInput(inv);
  assert.ok(input.check.valid);
  const { bytes, missing } = await buildInvoicePdf(input, fonts);
  assert.deepEqual(missing, [], "every character has a font");
  const { text, pages } = await textOf(bytes);
  assert.equal(pages, 1);
  const flat = text.replace(/\s+/g, " ");
  const money = (n) => formatMoney(n, "NGN");
  assert.equal(money(187501.5), "₦187,501.50");
  for (const part of [
    "Invoice",
    "INV-0002",
    "Issued 2026-10-20",
    "Due 2026-11-03",
    "Adébáyọ̀ Studio".normalize("NFC"),
    "Okafor Foods",
    "billing@okafor.example",
    "Logo design",
    "Business cards (box)",
    money(150000), // line 1 rate and amount
    money(12500.5), // line 2 rate
    money(37501.5), // line 2 amount, 3 × 12,500.50
    "Subtotal",
    money(187501.5),
    "Tax 7.5%",
    money(14062.61), // 7.5% of 187,501.50, rounded half-up
    "Total",
    money(201564.11),
    "How to pay",
    "Bank: Example Bank",
    "Account name: Synthetic Studio Ltd",
    "Account number: 0123456789",
    "Thank you for your business.",
    "Amounts in Naira (NGN).",
  ]) {
    assert.ok(flat.includes(part), `${part} in ${JSON.stringify(flat)}`);
  }
  assert.ok(flat.includes("₦"), "the naira sign is drawn");
  // The empty third line is skipped, as on the sheet; quantities show as typed.
  assert.equal(flat.split("Logo design").length - 1, 1);
  assert.match(flat, /Business cards \(box\) 3 ₦12,500\.50 ₦37,501\.50/);
});

test("the PDF total matches the sheet's check for other currencies and a paid invoice", async () => {
  const inv = invoice({ currency: "USD", taxPercent: "0", status: "paid", paidOn: "2026-10-22", lines: [{ id: "a", description: "Consulting", qty: "2.5", rate: "80" }] });
  const { bytes } = await buildInvoicePdf(pdfInput(inv, ""), fonts);
  const flat = (await textOf(bytes)).text.replace(/\s+/g, " ");
  assert.ok(flat.includes("$200.00"));
  assert.ok(flat.includes("PAID 2026-10-22"));
  assert.ok(!flat.includes("How to pay"), "no How to pay heading when there are no details");
});

test("many lines run onto a second page with the column headings repeated", async () => {
  const lines = Array.from({ length: 30 }, (_, i) => ({ id: `l${i}`, description: `Item ${i + 1} ${"long words ".repeat(8)}`, qty: "1", rate: "1000" }));
  const inv = invoice({ lines, notes: "Note ".repeat(300) });
  const { bytes } = await buildInvoicePdf(pdfInput(inv), fonts);
  const { text, pages } = await textOf(bytes);
  assert.ok(pages >= 2, `${pages} pages`);
  const flat = text.replace(/\s+/g, " ");
  for (let i = 1; i <= 30; i++) assert.ok(flat.includes(`Item ${i} `), `Item ${i}`);
  assert.ok(flat.split("Description").length - 1 >= 2, "headings repeat");
  assert.ok(flat.includes(formatMoney(32250, "NGN")), "total of 30 × 1,000 plus 7.5%");
});

test("an invoice with errors is refused, not drawn without a total", async () => {
  const inv = invoice({ lines: [{ id: "a", description: "Bad", qty: "x", rate: "10" }] });
  await assert.rejects(() => buildInvoicePdf(pdfInput(inv), fonts), /Fix the invoice/);
});

/* ── the file name ───────────────────────────────────────────────────────── */

test("the file name has the number and the client's first line, safe for file systems", () => {
  assert.equal(S.invoicePdfName("INV-0002", "Okafor Foods\nbilling@okafor.example"), "Invoice INV-0002 – Okafor Foods.pdf");
  // The email line is not the client name, even when typed first.
  assert.equal(S.invoicePdfName("0003", "ade@example.test\nAde & Co."), "Invoice 0003 – Ade & Co.pdf");
  assert.equal(S.invoicePdfName("A/B:7", 'Foo*Bar? "Ltd" <x>|y\\z'), "Invoice A B 7 – Foo Bar Ltd x y z.pdf");
  assert.equal(S.invoicePdfName("  ", ""), "Invoice.pdf");
  assert.equal(S.invoicePdfName("0004", ""), "Invoice 0004.pdf");
  assert.equal(S.invoicePdfName("..", "...Okafor..."), "Invoice – Okafor.pdf");
  assert.equal(S.invoicePdfName("0005", "Tab\there\u0007"), "Invoice 0005 – Tab here.pdf");
  assert.equal(S.invoicePdfName("0006", "Adébáyọ̀ Ọlá"), `Invoice 0006 – ${"Adébáyọ̀ Ọlá".normalize("NFC")}.pdf`);
  const long = S.invoicePdfName("0007", "N".repeat(400));
  assert.ok([...long].length <= 104, long);
  assert.ok(long.endsWith(".pdf"));
  assert.doesNotMatch(S.invoicePdfName("x", "a/b\\c:d"), /[\\/:*?"<>|]/);
});

/* ── pressing Share PDF ──────────────────────────────────────────────────── */

const PDF = new Uint8Array([37, 80, 68, 70]);

function harness({ share, canShare = () => true, copyFails = false, status = "draft" } = {}) {
  const calls = { share: [], download: [], copy: [], made: 0 };
  const inv = invoice({ status });
  const before = structuredClone(inv);
  const nav = share === undefined ? {} : { share: async (data) => (calls.share.push(data), share(data)), canShare };
  const run = () =>
    S.sendInvoicePdf({
      nav,
      title: "Invoice INV-0002",
      text: "Invoice INV-0002 from Adébáyọ̀ Studio\nTotal: ₦201,564.11",
      status: inv.status,
      makeFile: async () => {
        calls.made++;
        return new File([PDF], S.invoicePdfName(inv.number, inv.to), { type: "application/pdf" });
      },
      download: (file) => calls.download.push(file),
      copy: async (text) => {
        calls.copy.push(text);
        if (copyFails) throw new Error("denied");
      },
    });
  return { calls, inv, before, run };
}

test("share supported and completed: status unchanged, 'Mark as sent' offered, nothing downloaded", async () => {
  const h = harness({ share: async () => undefined });
  const result = await h.run();
  assert.equal(result.route, "shared");
  assert.equal(result.offerMarkSent, true);
  assert.equal(result.message, "Shared.");
  assert.doesNotMatch(result.message, /deliver|sent/i, "sharing is not called delivery");
  assert.equal(h.calls.share.length, 1);
  const [data] = h.calls.share;
  assert.equal(data.files.length, 1);
  assert.equal(data.files[0].name, "Invoice INV-0002 – Okafor Foods.pdf");
  assert.equal(data.files[0].type, "application/pdf");
  assert.equal(data.title, "Invoice INV-0002");
  assert.match(data.text, /Total: ₦201,564\.11/);
  assert.deepEqual(h.calls.download, []);
  assert.deepEqual(h.calls.copy, []);
  assert.deepEqual(h.inv, h.before, "the invoice is not touched");
  assert.equal(h.inv.status, "draft");
});

test("share completed on an invoice already sent or paid: nothing offered", async () => {
  for (const status of ["sent", "paid"]) {
    const h = harness({ share: async () => undefined, status });
    const result = await h.run();
    assert.equal(result.route, "shared");
    assert.equal(result.offerMarkSent, false, status);
    assert.deepEqual(h.inv, h.before);
  }
});

test("cancelled (AbortError): nothing changes, nothing downloaded or copied, a quiet note", async () => {
  const h = harness({ share: async () => Promise.reject(new DOMException("Share canceled", "AbortError")) });
  const result = await h.run();
  assert.equal(result.route, "cancelled");
  assert.equal(result.offerMarkSent, false);
  assert.equal(result.message, "Not shared.");
  assert.deepEqual(h.calls.download, []);
  assert.deepEqual(h.calls.copy, []);
  assert.deepEqual(h.inv, h.before);
});

test("other share errors fall back to download + copy, and say why", async () => {
  const cases = [
    [new DOMException("not allowed", "NotAllowedError"), "This browser did not allow sharing."],
    [new TypeError("bad data"), "This browser could not share the file."],
    [new DOMException("bad", "DataError"), "This browser could not share the file."],
    [new Error("odd"), "Sharing did not work."],
  ];
  for (const [error, reason] of cases) {
    const h = harness({ share: async () => Promise.reject(error) });
    const result = await h.run();
    assert.equal(result.route, "fallback", error.name);
    assert.equal(result.message, `${reason} ${S.FALLBACK_DONE}`);
    assert.equal(h.calls.download.length, 1);
    assert.equal(h.calls.download[0].name, "Invoice INV-0002 – Okafor Foods.pdf");
    assert.equal(h.calls.copy.length, 1);
    assert.equal(result.offerMarkSent, true, "the person may still mark it sent themselves");
    assert.deepEqual(h.inv, h.before, "still not marked sent");
  }
});

test("unsupported browsers (no share, or canShare false for files) download and copy", async () => {
  for (const h of [harness({ share: undefined }), harness({ share: async () => assert.fail("must not share"), canShare: () => false }), harness({ share: async () => undefined, canShare: () => { throw new Error("x"); } })]) {
    const result = await h.run();
    assert.equal(result.route, "fallback");
    assert.equal(result.message, "PDF downloaded and message copied. Attach the PDF in WhatsApp or email.");
    assert.equal(h.calls.share.length, 0);
    assert.equal(h.calls.download.length, 1);
    assert.equal(h.calls.made, 1);
    assert.deepEqual(h.calls.copy, ["Invoice INV-0002 from Adébáyọ̀ Studio\nTotal: ₦201,564.11"]);
    assert.ok(result.copied && result.downloaded);
    assert.deepEqual(h.inv, h.before);
  }
});

test("when copying fails, the fallback still downloads and says so", async () => {
  const h = harness({ share: undefined, copyFails: true });
  const result = await h.run();
  assert.equal(result.message, S.FALLBACK_NO_COPY);
  assert.equal(result.copied, false);
  assert.equal(h.calls.download.length, 1);
});

test("a PDF that cannot be made is reported to the caller, nothing shared", async () => {
  const nav = { share: async () => assert.fail("must not share"), canShare: () => true };
  await assert.rejects(
    S.sendInvoicePdf({ nav, title: "t", text: "x", status: "draft", makeFile: async () => Promise.reject(new Error("font")), download: () => assert.fail(), copy: async () => undefined }),
    /font/,
  );
});

test("'Mark as sent' sets Sent with today's date, and Undo puts back what was there", () => {
  const stamp = { today: "2026-10-23", now: "2026-10-23T10:00:00.000Z" };
  const inv = invoice();
  const patch = S.markSentPatch(inv, stamp.today);
  assert.deepEqual(patch, { status: "sent", sentOn: "2026-10-23" });
  const sent = { ...inv, ...patch };
  assert.equal(W.invoiceState(sent, stamp.today), "sent");
  const undone = { ...sent, ...S.undoMarkSentPatch({ status: inv.status, sentOn: inv.sentOn }) };
  assert.equal(undone.status, "draft");
  assert.equal(undone.sentOn, undefined);
  // A sent or paid invoice is never moved back to Sent.
  assert.equal(S.markSentPatch({ status: "sent" }, stamp.today), null);
  assert.equal(S.markSentPatch({ status: "paid" }, stamp.today), null);
  // A draft that was sent once before gets today's date when marked again.
  assert.deepEqual(S.markSentPatch({ status: "draft", sentOn: "2026-09-01" }, stamp.today), { status: "sent", sentOn: "2026-10-23" });
  // The saved shape is unchanged: normalizeDoc keeps status and sentOn as they are.
  const doc = W.normalizeDoc({ v: 2, invoices: [sent] });
  assert.equal(doc.invoices[0].status, "sent");
  assert.equal(doc.invoices[0].sentOn, "2026-10-23");
});
