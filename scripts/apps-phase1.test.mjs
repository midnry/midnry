// Phase 1 app fixes: Ledger keeps every entry, Board's one card limit,
// Invoice validation and rounding, Medicines' dated ticks, Reconcile's
// explicit reporting, and the shared save loop (retries, conflicts, size).
// Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const L = await jiti.import("../src/lib/ledger.ts");
const B = await jiti.import("../src/lib/board.ts");
const I = await jiti.import("../src/lib/invoice-math.ts");
const M = await jiti.import("../src/lib/meds.ts");
const R = await jiti.import("../src/lib/reconcile.ts");
const S = await jiti.import("../src/lib/doc-saver.ts");
const { docLimit } = await jiti.import("../src/lib/doc-limits.ts");

// ── Ledger ──────────────────────────────────────────────────────────────────

function ledgerEntries(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `e-${i}`,
    label: `Synthetic expense ${i}, "quoted"`,
    cents: 100 + i,
    category: "Food",
    date: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  }));
}

test("ledger: 750 entries survive a save and reload, in order", () => {
  const doc = { entries: ledgerEntries(750), currency: "NGN" };
  const payload = JSON.stringify(doc);
  assert.ok(payload.length <= docLimit("ledger"), `fits the ledger limit (${payload.length})`);
  const reloaded = L.asEntries(JSON.parse(payload).entries);
  assert.equal(reloaded.length, 750);
  assert.deepEqual(reloaded.map((e) => e.id), doc.entries.map((e) => e.id));
});

test("ledger: CSV export has a row for every one of 501+ entries", () => {
  const entries = ledgerEntries(612);
  const csv = L.ledgerCsv(entries);
  const lines = csv.split("\n");
  assert.equal(lines.length, 613, "header + 612 rows");
  assert.equal(lines[0], "Date,What,Category,Amount");
  assert.equal(lines[612], `${entries[611].date},"Synthetic expense 611, ""quoted""",Food,7.11`);
});

test("ledger: the room check warns before the limit and never trims", () => {
  const small = L.ledgerRoom({ entries: ledgerEntries(10) });
  assert.equal(small.full, false);
  assert.equal(small.nearlyFull, false);
  // Enough entries to pass the warning share but not the limit.
  const perEntry = JSON.stringify(ledgerEntries(1)[0]).length + 1;
  const near = Math.ceil((docLimit("ledger") * 0.9) / perEntry);
  const room = L.ledgerRoom({ entries: ledgerEntries(near) });
  assert.equal(room.nearlyFull, true);
  assert.equal(room.full, false);
  const over = L.ledgerRoom({ entries: ledgerEntries(Math.ceil(docLimit("ledger") / perEntry) + 50) });
  assert.equal(over.full, true);
});

test("ledger: the server limit is raised for ledger only", () => {
  assert.equal(docLimit("ledger"), 1_000_000);
  assert.equal(docLimit("tasks"), 600_000);
  assert.equal(docLimit("board"), 100_000);
});

// ── Board ───────────────────────────────────────────────────────────────────

const card = (i) => ({ id: `c-${i}`, title: `Card ${i}` });
function board(counts) {
  return B.DEFAULT_COLUMNS.map((column, index) => ({ ...column, cards: Array.from({ length: counts[index] }, (_, i) => card(`${index}-${i}`)) }));
}

test("board: a saved column with 41 cards keeps all 41", () => {
  const saved = JSON.parse(JSON.stringify(board([41, 0, 0])));
  const columns = B.asColumns(saved);
  assert.equal(columns[0].cards.length, 41);
});

test("board: adding to a column at the limit is refused with a message", () => {
  const columns = board([40, 3, 0]);
  const refused = B.addCard(columns, 0, card("new"));
  assert.equal(refused.ok, false);
  assert.match(refused.message, /“To do” is full \(40 cards\)/);
  assert.equal(columns[0].cards.length, 40, "nothing changed");
  const legacy = B.addCard(board([41, 0, 0]), 0, card("new"));
  assert.equal(legacy.ok, false, "an over-limit saved column refuses new cards");
  const fine = B.addCard(columns, 1, card("new"));
  assert.equal(fine.ok, true);
  assert.equal(fine.columns[1].cards.length, 4);
});

test("board: more than 80 cards in total is allowed when each column has room", () => {
  const columns = board([40, 40, 10]);
  const result = B.addCard(columns, 2, card("81st+"));
  assert.equal(result.ok, true);
});

test("board: moving a card into a full column is refused and nothing moves", () => {
  const columns = board([5, 40, 0]);
  const refused = B.moveCard(columns, 0, columns[0].cards[0].id, 1);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /“Doing” is full/);
  assert.equal(refused.column, "todo", "the message shows under the card's column");
  const moved = B.moveCard(columns, 0, columns[0].cards[0].id, -1);
  assert.equal(moved.ok, false, "no column to the left");
  const ok = B.moveCard(board([5, 39, 0]), 0, "c-0-0", 1);
  assert.equal(ok.ok, true);
  assert.equal(ok.columns[1].cards.length, 40);
  assert.equal(ok.columns[0].cards.length, 4);
});

// ── Invoice ─────────────────────────────────────────────────────────────────

const line = (qty, rate, description = "Work") => ({ description, qty, rate });

test("invoice: valid lines total with tax, rounded to the minor unit", () => {
  const check = I.checkInvoice([line("3", "33.33"), line("1.5", "0.07")], "7.5", "NGN");
  assert.equal(check.valid, true);
  // 3 × 33.33 = 99.99; 1.5 × 0.07 = 0.105 → 0.11 (half up)
  assert.deepEqual(check.lines.map((l) => l.amountMinor), [9999, 11]);
  assert.equal(check.subtotalMinor, 10010);
  // 100.10 × 7.5% = 7.5075 → 7.51
  assert.equal(check.taxMinor, 751);
  assert.equal(check.totalMinor, 10761);
  assert.equal(check.taxPercent, "7.5");
});

test("invoice: decimals that float arithmetic gets wrong are exact", () => {
  // 0.1 × 3 and 1.005 × 1 are classic float traps.
  const check = I.checkInvoice([line("3", "0.10"), line("0.5", "0.01")], "0", "USD");
  assert.deepEqual(check.lines.map((l) => l.amountMinor), [30, 1]);
  assert.equal(check.totalMinor, 31);
});

test("invoice: blanks are errors, untouched new lines are skipped", () => {
  const check = I.checkInvoice([line("", "10"), line("2", ""), { description: "", qty: "1", rate: "" }], "", "USD");
  assert.equal(check.valid, false);
  assert.equal(check.totalMinor, null, "no total while invalid");
  assert.equal(check.lines[0].qtyError, "Enter a quantity.");
  assert.equal(check.lines[1].rateError, "Enter a rate.");
  assert.equal(check.lines[2].empty, true);
  assert.match(check.taxError, /Enter a tax percent/);
  assert.equal(check.errorCount, 3);
  const none = I.checkInvoice([{ description: "", qty: "1", rate: "" }], "0", "USD");
  assert.equal(none.valid, false);
  assert.equal(none.formError, "Add at least one line item.");
});

test("invoice: text, negatives and too many decimals are errors", () => {
  const check = I.checkInvoice([line("two", "10"), line("-1", "10"), line("1", "-5"), line("1", "9.999")], "abc", "USD");
  assert.equal(check.valid, false);
  assert.match(check.lines[0].qtyError, /must be a number/);
  assert.match(check.lines[1].qtyError, /can’t be negative/);
  assert.match(check.lines[2].rateError, /can’t be negative/);
  assert.match(check.lines[3].rateError, /at most 2 decimal places/);
  assert.equal(check.taxError, "Tax must be a number from 0 to 100.");
  assert.equal(check.subtotalMinor, null);
});

test("invoice: tax must be 0–100; 100.01 and negatives are refused", () => {
  assert.equal(I.checkInvoice([line("1", "10")], "100.01", "USD").taxError, "Tax can’t be more than 100%.");
  assert.match(I.checkInvoice([line("1", "10")], "-1", "USD").taxError, /can’t be negative/);
  const full = I.checkInvoice([line("1", "10")], "100", "USD");
  assert.equal(full.valid, true);
  assert.equal(full.totalMinor, 2000);
  assert.equal(I.checkInvoice([line("1", "10")], "0", "USD").totalMinor, 1000);
  assert.equal(I.checkInvoice([line("1", "10")], "16%", "KES").taxMinor, 160, "a trailing % is accepted");
});

test("invoice: the rounding rule is stated and every app currency has 2 minor digits", () => {
  for (const code of ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "CAD", "INR"]) assert.equal(I.minorDigits(code), 2, code);
  assert.match(I.roundingNote("NGN"), /rounded to 2 decimal places/);
});

// ── Medicines ───────────────────────────────────────────────────────────────

test("meds: rows saved by the old tracker load unchanged", () => {
  const legacy = { rows: [{ name: "Synthetic A", when: "Morning" }, { name: "Synthetic B", when: "Night", extra: "kept" }] };
  const doc = M.asMedsDoc(JSON.parse(JSON.stringify(legacy)));
  assert.equal(doc.rows.length, 2);
  assert.deepEqual(doc.rows.map((r) => [r.name, r.when]), [["Synthetic A", "Morning"], ["Synthetic B", "Night"]]);
  assert.equal(doc.rows[1].extra, "kept");
  assert.deepEqual(doc.rows.map((r) => r.id), ["legacy-0", "legacy-1"]);
  assert.deepEqual(doc.taken, {});
});

test("meds: tick today, untick an accidental tick, and keep a dated history", () => {
  let doc = M.asMedsDoc({ rows: [{ id: "a", name: "Synthetic A", when: "Morning" }, { id: "b", name: "Synthetic B", when: "Night" }] });
  doc = M.toggleTaken(doc, doc.rows[0], "2026-10-20", "08:05");
  doc = M.toggleTaken(doc, doc.rows[0], "2026-10-21", "08:10");
  doc = M.toggleTaken(doc, doc.rows[1], "2026-10-21", "21:00");
  assert.deepEqual(M.isTaken(doc, "a", "2026-10-21"), { name: "Synthetic A", at: "08:10" });
  doc = M.toggleTaken(doc, doc.rows[1], "2026-10-21", "21:01");
  assert.equal(M.isTaken(doc, "b", "2026-10-21"), null, "untick");
  const days = M.history(doc, "2026-10-21");
  assert.equal(days.length, 30);
  assert.equal(days[0].day, "2026-10-21");
  assert.deepEqual(days[0].ticks, [{ name: "Synthetic A", at: "08:10" }]);
  assert.deepEqual(days[1].ticks, [{ name: "Synthetic A", at: "08:05" }]);
  assert.equal(days[29].day, "2026-09-22");
  // Survives a save and reload.
  const again = M.asMedsDoc(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(again.taken, doc.taken);
});

test("meds: ticks older than 90 days are cleared, recent ones kept", () => {
  const taken = { "2026-01-01": { a: { name: "A", at: "08:00" } }, "2026-07-24": { a: { name: "A", at: "08:00" } } };
  const kept = M.prune(taken, "2026-10-21");
  assert.deepEqual(Object.keys(kept), ["2026-07-24"]);
});

// ── Reconcile ───────────────────────────────────────────────────────────────

test("reconcile: malformed lines are reported with line number and reason", () => {
  const list = R.parseAmounts("12,500\n\nabc\n2026-10-01 12,500\n1.234\n₦780.50\n(300)");
  assert.deepEqual(list.amounts, [{ line: 1, cents: 1250000 }, { line: 6, cents: 78050 }, { line: 7, cents: -30000 }]);
  assert.deepEqual(list.bad, [
    { line: 3, text: "abc", reason: "is not an amount" },
    { line: 4, text: "2026-10-01 12,500", reason: "has more than one number; put only the amount on the line" },
    { line: 5, text: "1.234", reason: "has more than 2 decimal places" },
  ]);
});

test("reconcile: amounts in both lists pair once; the rest is shown per side", () => {
  const result = R.compareLists("100\n100\n250.10\n0.30", "100\n250.1\n75\n0.3");
  assert.deepEqual(result.both.map((p) => p.cents), [10000, 25010, 30]);
  assert.deepEqual(result.onlyLeft, [{ line: 2, cents: 10000 }]);
  assert.deepEqual(result.onlyRight, [{ line: 3, cents: 7500 }]);
  assert.equal(result.gap, 10000 - 7500);
});

// ── Shared save loop ────────────────────────────────────────────────────────

function harness(responses, limit = 1000) {
  const timers = [];
  const states = [];
  const events = [];
  const sent = [];
  const saver = new S.DocSaver({
    limit,
    save: (payload, base, keepalive) => {
      sent.push({ payload, base, keepalive });
      const next = responses.shift();
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
    onState: (state) => states.push(state),
    onEvent: (event) => events.push(event),
    setTimer: (fn, ms) => {
      const timer = { fn, ms, live: true };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      if (timer) timer.live = false;
    },
  });
  const runTimers = () => {
    for (const timer of timers.splice(0)) if (timer.live) timer.fn();
  };
  return { saver, timers, states, events, sent, runTimers };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("saver: debounced change saves with the loaded revision, then the new one", async () => {
  const h = harness([{ ok: true, revision: 4 }, { ok: true, revision: 5 }]);
  h.saver.start(3);
  h.saver.change({ n: 1 });
  h.saver.change({ n: 2 });
  assert.equal(h.sent.length, 0, "waits for the pause");
  h.runTimers();
  await settle();
  assert.deepEqual(h.sent[0], { payload: '{"n":2}', base: 3, keepalive: false });
  h.saver.change({ n: 3 });
  h.runTimers();
  await settle();
  assert.equal(h.sent[1].base, 4);
  assert.equal(h.states.at(-1), "saved");
});

test("saver: only one save in flight; a change made meanwhile follows with the new revision", async () => {
  let release;
  const h = harness([]);
  h.saver.start(0);
  const pending = new Promise((resolve) => (release = resolve));
  h.saver["deps"].save = (payload, base) => {
    h.sent.push({ payload, base });
    return h.sent.length === 1 ? pending : Promise.resolve({ ok: true, revision: 2 });
  };
  h.saver.change({ n: 1 });
  h.runTimers();
  h.saver.change({ n: 2 });
  h.runTimers();
  assert.equal(h.sent.length, 1, "second save waits");
  release({ ok: true, revision: 1 });
  await settle();
  await settle();
  assert.deepEqual(h.sent.map((s) => [s.payload, s.base]), [['{"n":1}', 0], ['{"n":2}', 1]]);
});

test("saver: a failed save keeps the change, shows retrying, and backs off", async () => {
  const h = harness([new Error("offline"), new Error("offline"), { ok: true, revision: 1 }]);
  h.saver.start(0);
  h.saver.change({ n: 1 });
  h.runTimers();
  await settle();
  assert.equal(h.states.at(-1), "retrying");
  assert.deepEqual(h.events, ["retrying"]);
  assert.equal(h.saver.dirty, true, "the change is kept");
  assert.equal(h.timers.at(-1).ms, 1000);
  h.runTimers();
  await settle();
  assert.equal(h.timers.at(-1).ms, 2000, "backoff doubles");
  h.saver.change({ n: 2 });
  h.runTimers();
  await settle();
  assert.equal(h.sent.at(-1).payload, '{"n":2}', "the retry carries the newest change");
  assert.equal(h.states.at(-1), "saved");
  assert.ok(h.events.includes("saved-after-retry"));
  assert.equal(S.backoffMs(10), 30000, "capped at 30s");
});

test("saver: a conflict stops saving and overwrites nothing", async () => {
  const h = harness([{ ok: false, error: "conflict", revision: 9 }]);
  h.saver.start(3);
  h.saver.change({ mine: true });
  h.runTimers();
  await settle();
  assert.equal(h.states.at(-1), "conflict");
  assert.deepEqual(h.events, ["conflict"]);
  h.saver.change({ mine: "again" });
  h.runTimers();
  h.saver.flush(true);
  await settle();
  assert.equal(h.sent.length, 1, "no further saves after a conflict");
  assert.equal(h.saver.dirty, true, "local changes are kept on the page");
});

test("saver: a document over the limit is not sent and the change is kept", async () => {
  const h = harness([{ ok: true, revision: 1 }], 20);
  h.saver.start(0);
  h.saver.change({ text: "x".repeat(50) });
  h.runTimers();
  await settle();
  assert.equal(h.sent.length, 0);
  assert.equal(h.states.at(-1), "too-large");
  assert.equal(h.saver.dirty, true);
  h.saver.change({ text: "short" });
  h.runTimers();
  await settle();
  assert.equal(h.sent.length, 1, "saves again once it fits");
});

test("saver: flush sends at once with keepalive (tab hidden or closing)", async () => {
  const h = harness([{ ok: true, revision: 1 }]);
  h.saver.start(0);
  h.saver.change({ n: 1 });
  h.saver.flush(true);
  await settle();
  assert.deepEqual(h.sent[0], { payload: '{"n":1}', base: 0, keepalive: true });
  assert.equal(h.timers.filter((t) => t.live).length, 0, "the debounce was cancelled");
});

test("saver: nothing is sent before the document has loaded", async () => {
  const h = harness([{ ok: true, revision: 6 }]);
  h.saver.change({ early: true });
  h.runTimers();
  await settle();
  assert.equal(h.sent.length, 0);
  h.saver.start(5);
  await settle();
  assert.equal(h.sent[0].base, 5);
});
