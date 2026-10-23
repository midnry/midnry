// Invoice "Needs follow-up" (src/lib/invoice-follow-up.ts): which invoices are
// listed, in what order, the reminder message, and the Remind link text.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const W = await jiti.import("../src/lib/client-work.ts");
const F = await jiti.import("../src/lib/invoice-follow-up.ts");
const { parseTask } = await jiti.import("../src/lib/remind/parse.ts");

const TODAY = "2026-10-23";

function addDays(iso, days) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

let seq = 0;
function invoice(over = {}) {
  seq += 1;
  return {
    id: `inv-${seq}`,
    number: `INV-${String(seq).padStart(4, "0")}`,
    from: "Ada Studio\nLagos",
    to: "Okafor Foods\nokafor@example.test",
    issued: "2026-10-01",
    due: addDays(TODAY, -2),
    currency: "NGN",
    notes: "",
    taxPercent: "7.5",
    lines: [{ id: `l-${seq}`, description: "Design", qty: "2", rate: "50000" }],
    status: "sent",
    createdAt: `2026-10-01T09:00:00.000Z`,
    updatedAt: `2026-10-01T09:00:00.000Z`,
    ...over,
  };
}

function docOf(invoices, extra = {}) {
  return W.normalizeDoc({ v: 2, invoices, quotes: [], proposals: [], clients: [], from: "Ada Studio\nLagos", currency: "NGN", ...extra });
}

test("lists sent invoices that are overdue or due within 3 days, most overdue first", () => {
  const doc = docOf([
    invoice({ number: "A-soon2", due: addDays(TODAY, 2) }),
    invoice({ number: "A-late10", due: addDays(TODAY, -10) }),
    invoice({ number: "A-today", due: TODAY }),
    invoice({ number: "A-soon3", due: addDays(TODAY, 3) }),
    invoice({ number: "A-soon4", due: addDays(TODAY, 4) }),
    invoice({ number: "A-late1", due: addDays(TODAY, -1) }),
  ]);
  const list = F.followUps(doc, TODAY, "NGN");
  assert.deepEqual(
    list.map((item) => [item.invoice.number, item.daysLate]),
    [
      ["A-late10", 10],
      ["A-late1", 1],
      ["A-today", 0],
      ["A-soon2", -2],
      ["A-soon3", -3],
    ],
  );
});

test("paid invoices, drafts, and invoices without a usable due date are left out", () => {
  const doc = docOf([
    invoice({ number: "paid", status: "paid", paidOn: TODAY, due: addDays(TODAY, -5) }),
    invoice({ number: "draft", status: "draft", due: addDays(TODAY, -5) }),
    invoice({ number: "nodue", due: "" }),
    invoice({ number: "baddue", due: "2026-02-30" }),
    invoice({ number: "text", due: "next week" }),
    invoice({ number: "kept", due: addDays(TODAY, -5) }),
  ]);
  assert.deepEqual(F.followUps(doc, TODAY, "NGN").map((item) => item.invoice.number), ["kept"]);
});

test("marking an invoice paid removes it from the list", () => {
  const one = invoice({ number: "P-1", due: addDays(TODAY, -3) });
  let doc = docOf([one]);
  assert.equal(F.followUps(doc, TODAY, "NGN").length, 1);
  doc = W.putInvoice(doc, W.setInvoiceStatus(doc.invoices[0], "paid", { today: TODAY, now: `${TODAY}T10:00:00.000Z`, id: () => "x" }));
  assert.equal(F.followUps(doc, TODAY, "NGN").length, 0);
});

test("overdue in the list matches the Overdue badge on every day around month and year ends", () => {
  for (const today of ["2026-10-23", "2026-10-31", "2026-11-01", "2026-12-31", "2027-01-01", "2028-02-29", "2028-03-01"]) {
    for (let offset = -12; offset <= 12; offset += 1) {
      const inv = invoice({ due: addDays(today, offset) });
      const listed = F.followUps(docOf([inv]), today, "NGN");
      const badge = W.invoiceState(inv, today);
      const late = listed[0]?.daysLate ?? null;
      assert.equal(late != null && late > 0, badge === "overdue", `today ${today}, due ${inv.due}`);
      assert.equal(listed.length === 1, offset <= 3, `listed when due ${offset} days from ${today}`);
      if (late != null) assert.equal(late + offset, 0);
    }
  }
});

test("a bad 'today' lists nothing rather than guessing", () => {
  assert.deepEqual(F.followUps(docOf([invoice()]), "", "NGN"), []);
  assert.deepEqual(F.followUps(docOf([invoice()]), "23/10/2026", "NGN"), []);
});

test("labels read plainly", () => {
  assert.equal(F.lateLabel(1), "1 day overdue");
  assert.equal(F.lateLabel(12), "12 days overdue");
  assert.equal(F.lateLabel(0), "Due today");
  assert.equal(F.lateLabel(-1), "Due tomorrow");
  assert.equal(F.lateLabel(-3), "Due in 3 days");
  assert.equal(F.longDate("2026-10-05"), "5 Oct 2026");
  assert.equal(F.longDate("not a date"), "not a date");
});

test("the reminder message has the number, amount, due date, days late and How to pay", () => {
  const doc = docOf([invoice({ number: "INV-0042", due: "2026-10-20" })], { payment: "Bank: Example Bank\nAccount number: 0123456789" });
  const [item] = F.followUps(doc, TODAY, "NGN");
  const text = F.reminderMessage(item, { from: doc.from, payment: doc.payment });
  assert.match(text, /^Hello Okafor Foods,/);
  assert.match(text, /invoice INV-0042 for ₦107,500\.00 was due on 20 Oct 2026 \(3 days ago\)\./);
  assert.match(text, /If you have already paid, thank you/);
  assert.match(text, /How to pay:\nBank: Example Bank\nAccount number: 0123456789/);
  assert.match(text, /Thank you,\nAda Studio$/);
});

test("due-soon and due-today messages do not call the invoice late", () => {
  const doc = docOf([invoice({ number: "S-1", due: addDays(TODAY, 2) }), invoice({ number: "S-0", due: TODAY })]);
  const [today, soon] = F.followUps(doc, TODAY, "NGN");
  const todayText = F.reminderMessage(today, { from: doc.from });
  const soonText = F.reminderMessage(soon, { from: doc.from });
  assert.match(todayText, /S-0 for ₦107,500\.00 is due today, 23 Oct 2026\./);
  assert.match(soonText, /S-1 for ₦107,500\.00 is due on 25 Oct 2026\./);
  for (const text of [todayText, soonText]) {
    assert.doesNotMatch(text, /overdue|ago|already paid/);
    assert.doesNotMatch(text, /How to pay/); // none saved
  }
});

test("a reminder carries no other client's details", () => {
  const doc = docOf(
    [
      invoice({ number: "X-1", to: "Bola Stores\nbola@example.test\n12 Marina", due: addDays(TODAY, -4), lines: [{ id: "a", description: "Logo for Bola", qty: "1", rate: "11111" }] }),
      invoice({ number: "X-2", to: "Chika Prints\nchika@example.test", due: addDays(TODAY, -1), lines: [{ id: "b", description: "Flyers", qty: "1", rate: "22222" }] }),
    ],
    { payment: "Account number: 0123456789" },
  );
  const [bola, chika] = F.followUps(doc, TODAY, "NGN");
  const text = F.reminderMessage(chika, { from: doc.from, payment: doc.payment });
  assert.equal(chika.invoice.number, "X-2");
  for (const other of ["Bola", "X-1", "11,111", "12 Marina", "bola@example.test", "Logo"]) assert.ok(!text.includes(other), `found ${other}`);
  assert.ok(F.reminderMessage(bola, { from: doc.from }).includes("Bola Stores"));
});

test("Remind me text is read by Remind as tomorrow 9am with the whole title", () => {
  const tomorrow = addDays(TODAY, 1);
  const cases = [
    ["Okafor Foods", "Follow up invoice INV-0002 with Okafor Foods"],
    ["Friday Catering", "Follow up invoice INV-0002 with Friday Catering"],
    ["May & June Stores", "Follow up invoice INV-0002 with May & June Stores"],
    // Names Remind would cut up fall back to the number alone.
    ["Tomorrow Ventures", "Follow up invoice INV-0002"],
    ["Every Day Supplies", "Follow up invoice INV-0002"],
    ["Lagos #1 Prints", "Follow up invoice INV-0002"],
    ["Ivy p1 Studio", "Follow up invoice INV-0002"],
  ];
  for (const [name, title] of cases) {
    const text = F.remindText({ invoice: invoice({ number: "INV-0002" }), name }, TODAY);
    const parsed = parseTask(text, TODAY);
    assert.equal(parsed.title, title, name);
    assert.equal(parsed.due, tomorrow, name);
    assert.equal(parsed.time, "09:00", name);
    assert.equal(parsed.recur, "none", name);
  }
  // A number Remind would read as a project falls back to plain words.
  const odd = F.remindText({ invoice: invoice({ number: "#12" }), name: "Okafor Foods" }, TODAY);
  assert.equal(parseTask(odd, TODAY).title, "Follow up an unpaid invoice");
  assert.equal(parseTask(odd, TODAY).due, tomorrow);
});

test("works with a large archive (300 invoices)", () => {
  const many = [];
  for (let i = 0; i < 300; i += 1) many.push(invoice({ due: addDays(TODAY, (i % 40) - 20), status: i % 7 === 0 ? "paid" : "sent" }));
  const doc = docOf(many);
  const started = performance.now();
  const list = F.followUps(doc, TODAY, "NGN");
  const took = performance.now() - started;
  assert.ok(list.length > 100);
  assert.ok(list.every((item, i) => i === 0 || list[i - 1].daysLate >= item.daysLate));
  assert.ok(took < 200, `took ${took}ms`);
});
