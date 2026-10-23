// The one number-format policy (src/lib/number-input.ts) and every place that
// reads a typed amount through it. Each call-site test shows what did not
// change and the new refusal of a comma used as the decimal point.
// Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const N = await jiti.import("../src/lib/number-input.ts");
const I = await jiti.import("../src/lib/invoice-math.ts");
const R = await jiti.import("../src/lib/reconcile.ts");
const M = await jiti.import("../src/lib/merges.ts");
const C = await jiti.import("../src/lib/client-work.ts");
const Rec = await jiti.import("../src/lib/records.ts");
const K = await jiti.import("../src/lib/kits.ts");

const ok = (raw, opts) => {
  const r = N.parseNumberInput(raw, opts);
  assert.equal(r.ok, true, `${JSON.stringify(raw)} should parse: ${r.message}`);
  return r;
};
const no = (raw, problem, opts) => {
  const r = N.parseNumberInput(raw, opts);
  assert.equal(r.ok, false, `${JSON.stringify(raw)} should be refused`);
  if (problem) assert.equal(r.problem, problem, `${JSON.stringify(raw)}: ${r.message}`);
  return r;
};

// ── the policy ──────────────────────────────────────────────────────────────

test("policy: a dot is the decimal point", () => {
  const r = ok("7.5");
  assert.equal(r.value, 7.5);
  assert.equal(r.text, "7.5");
  assert.equal(ok(".5").text, "0.5");
  assert.equal(ok("5.").text, "5");
});

test("policy: a comma that is not thousands grouping is refused with a dot example", () => {
  assert.equal(no("7,5", "comma-decimal").message, "Use a dot for decimals, e.g. 7.5");
  assert.equal(no("1,50", "comma-decimal").message, "Use a dot for decimals, e.g. 1.50");
  assert.match(no("1,5000", "comma-decimal").message, /^Use a dot for decimals, e\.g\. 7\.5/);
});

test("policy: valid thousands grouping with commas is accepted", () => {
  assert.equal(ok("1,500.00").value, 1500);
  assert.equal(ok("1,500.00").text, "1500.00");
  assert.equal(ok("12,345,678.9").value, 12345678.9);
  assert.equal(ok("12,345,678.9").whole, "12345678");
});

test("policy: European format is refused with the number rewritten", () => {
  assert.equal(no("1.500,00", "comma-decimal-european").message, "Use a dot for decimals and commas for thousands, e.g. 1,500.00");
  assert.equal(no("1.500.000", "comma-decimal-european").message, "Use commas for thousands, e.g. 1,500,000");
});

test("policy: a currency symbol or code is stripped only at the start or end", () => {
  assert.equal(ok("₦ 1,500").value, 1500);
  assert.equal(ok("$1,500.00").value, 1500);
  assert.equal(ok("1,500 NGN").value, 1500);
  assert.equal(ok("USD 12").value, 12);
  assert.equal(ok("N5000").value, 5000);
  no("12 ₦ 5", "currency");
  no("₦1,500", "invalid", { allowCurrency: false });
});

test("policy: spaces are only thousands grouping (regular, no-break or narrow no-break)", () => {
  assert.equal(ok("1 500 000.50").value, 1500000.5);
  assert.equal(ok("1 500").value, 1500);
  assert.equal(ok("1 500").value, 1500);
  no("1 5", "space");
  no("1,500 000", "space");
  no("1 500 000", "space");
  no("1\t500", "space");
});

test("policy: negatives only where the caller allows them", () => {
  no("-3", "negative");
  assert.equal(ok("-3", { allowNegative: true }).value, -3);
  assert.equal(ok("-₦500", { allowNegative: true }).value, -500);
  assert.equal(ok("−2", { allowNegative: true }).value, -2, "a typographic minus");
});

test("policy: blank is blank, nonsense is invalid", () => {
  assert.equal(no(" ", "blank").problem, "blank");
  assert.equal(no("", "blank").problem, "blank");
  no("abc", "invalid");
  no("1..5", "invalid");
  no("1e3", "invalid");
  no("Infinity", "invalid");
  no("0x10", "invalid");
});

test("policy: decimals limit and exact scaling", () => {
  assert.equal(no("1.234", "decimals", { maxDecimals: 2, label: "Amount" }).message, "Amount can have at most 2 decimal places.");
  assert.equal(N.toScaled(ok("12,345.67"), 2), 1234567n);
  assert.equal(N.toScaled(ok("0.1"), 2), 10n);
  assert.equal(N.toScaled(ok("2.345"), 2), 235n, "extra decimals round half-up");
  assert.equal(N.toScaled(ok("-1.5", { allowNegative: true }), 2), -150n);
});

// ── call sites ──────────────────────────────────────────────────────────────

const line = (qty, rate) => ({ description: "Synthetic work", qty, rate });

test("Invoice (and its demo, and client-work quotes): unchanged sums; a comma tax is refused with no total", () => {
  const good = I.checkInvoice([line("2", "1,500.50")], "7.5", "NGN");
  assert.equal(good.valid, true);
  assert.equal(good.subtotalMinor, 300100);
  assert.equal(good.taxMinor, 22508);
  assert.equal(good.taxPercent, "7.5");
  assert.equal(I.checkInvoice([line("2", "1500.50")], "7.5%", "NGN").totalMinor, good.totalMinor, "with or without grouping");
  const comma = I.checkInvoice([line("2", "1500")], "7,5", "NGN");
  assert.equal(comma.valid, false);
  assert.equal(comma.taxError, "Use a dot for decimals, e.g. 7.5");
  assert.equal(comma.totalMinor, null, "no total at all");
  assert.equal(I.checkInvoice([line("1,5", "100")], "0", "NGN").lines[0].qtyError, "Use a dot for decimals, e.g. 1.5");
  assert.equal(I.checkInvoice([line("1", "1.500,00")], "0", "NGN").lines[0].rateError, "Use a dot for decimals and commas for thousands, e.g. 1,500.00");
  assert.equal(I.checkInvoice([line("1", "₦1,500")], "0", "NGN").subtotalMinor, 150000, "a pasted symbol on the rate is fine");
  assert.equal(I.checkInvoice([line("1", "100")], "abc", "NGN").taxError, "Tax must be a number from 0 to 100.", "old message kept");
  assert.equal(I.checkInvoice([line("-1", "100")], "0", "NGN").lines[0].qtyError, "Quantity can’t be negative.", "old message kept");
});

test("Ledger, Ledger demo, Split and Payouts (checkCents): amounts as before; comma decimals named", () => {
  assert.deepEqual(N.checkCents("12.50"), { ok: true, cents: 1250 });
  assert.deepEqual(N.checkCents("₦1,500"), { ok: true, cents: 150000 });
  assert.deepEqual(N.checkCents("$84.20"), { ok: true, cents: 8420 });
  const bad = N.checkCents("12,50");
  assert.equal(bad.ok, false);
  assert.equal(bad.hint, "Use a dot for decimals, e.g. 12.50", "shown instead of the usual message");
  assert.equal(N.checkCents("abc").hint, null, "other mistakes keep each tool's own message");
  assert.equal(N.checkCents("1.234").ok, false, "still two decimals at most");
  assert.equal(N.checkCents("-5").ok, false, "still no negatives");
  assert.equal(N.checkCents("100,000,001").ok, false, "still capped");
  assert.equal(N.checkCents("").problem, "blank");
});

test("Split tip: whole and decimal percents as before; '7,5' is refused with a hint", () => {
  const tip = (raw) => N.parseNumberInput(raw, { allowCurrency: false, label: "Tip" });
  assert.equal(tip("18").value, 18);
  assert.equal(tip("12.5").value, 12.5);
  assert.equal(N.formatHint(tip("7,5")), "Use a dot for decimals, e.g. 7.5");
});

test("Reconcile: amounts read as before; a comma decimal is reported with the dot hint", () => {
  const list = R.parseAmounts("1,500.00\n(200)\n₦ 3,000\n7,5\n2026-10-01 3,000\nabc\n1.234");
  assert.deepEqual(list.amounts.map((a) => [a.line, a.cents]), [[1, 150000], [2, -20000], [3, 300000]]);
  assert.deepEqual(
    list.bad.map((b) => [b.line, b.reason]),
    [
      [4, "uses a comma as the decimal point. Use a dot for decimals, e.g. 7.5"],
      [5, "has more than one number; put only the amount on the line"],
      [6, "is not an amount"],
      [7, "has more than 2 decimal places"],
    ],
  );
});

test("Ledger import from old Budget/Pocket (merges.amountCents): as before, but '7,5' is skipped, not 75", () => {
  assert.equal(M.amountCents("1,200.50"), 120050);
  assert.equal(M.amountCents("₦500"), 50000);
  assert.equal(M.amountCents("-300"), 30000, "minus ignored, as before");
  assert.equal(M.amountCents("7,5"), null);
  assert.equal(M.amountCents(""), null);
});

test("Client work import of old quotes (amountOf, parseKitLine): as before, comma decimals not misread", () => {
  assert.equal(C.amountOf("₦12,500.00"), "12500.00");
  assert.equal(C.amountOf("12500"), "12500");
  assert.equal(C.amountOf("12,50"), null);
  assert.equal(C.amountOf("1.5000"), null, "at most two decimals");
  assert.deepEqual(C.parseKitLine("Logo design - ₦50,000"), { description: "Logo design", qty: "1", rate: "50000" });
});

test("Bills 'Add to Remind' text (records.remindText): amounts formatted as before, '₦12,000' now too", () => {
  assert.match(Rec.remindText("bill-watch", { name: "Electricity", amount: "12000" }), /\(12,000\)/);
  assert.match(Rec.remindText("bill-watch", { name: "Electricity", amount: "₦12,000" }), /\(12,000\)/);
  assert.match(Rec.remindText("bill-watch", { name: "Water", amount: "7,5" }), /\(7,5\)/, "not a number: copied as typed, not 75");
});

test("Kit calculators (kits.ts num, recipe cost, typedNumber/firstHint in kit.tsx)", () => {
  const margin = K.getKit("margin");
  assert.deepEqual(margin.run({ cost: "100", price: "150" }).map((l) => l.value), ["50", "33.33%"]);
  assert.equal(margin.run({ cost: "1,000", price: "1,500" })[0].value, "500", "grouping now reads");
  assert.equal(margin.run({ cost: "7,5", price: "10" })[0].value, "Enter both numbers.", "a comma decimal is not misread");
  const recipe = K.getKit("recipe-cost");
  assert.equal(recipe.run({ costs: "500\n200", portions: "4" })[1].value, "175");
  // The bad line is named (2026-10-23: every cost line is read under the money rule, src/lib/kit-numbers.ts).
  assert.deepEqual(recipe.run({ costs: "500\n7,5", portions: "4" }), [{ label: "Check the costs", value: "Cost line 2: Use a dot for decimals, e.g. 7.5" }]);
  assert.equal(N.typedNumber(undefined), NaN);
  assert.equal(N.typedNumber(""), 0, "blank is 0, as Number('') was");
  assert.equal(N.typedNumber("3000000"), 3000000);
  assert.equal(N.typedNumber("3,000,000"), 3000000);
  assert.ok(Number.isNaN(N.typedNumber("7,5")));
  assert.equal(N.firstHint(["100", "", "7,5"]), "Use a dot for decimals, e.g. 7.5");
  assert.equal(N.firstHint(["100", "abc"]), null);
});
