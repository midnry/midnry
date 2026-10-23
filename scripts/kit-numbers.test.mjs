// Number input in the kit apps (src/lib/kit-numbers.ts, src/lib/kit-calcs.ts,
// the rules on each box in src/lib/kits.ts). The promise under test: a typed
// value that is not clearly the number meant never yields a plausible result.
// Covers comma decimals, thousands separators, units, currency, zero,
// negatives, letters, blanks and unrealistic values, for every kit that has a
// number box (Dose first), plus Units, Circuit, Solver, Ratios, Break-even
// and Tax. Synthetic values only.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const N = await jiti.import("../src/lib/kit-numbers.ts");
const C = await jiti.import("../src/lib/kit-calcs.ts");
const { KITS, getKit } = await jiti.import("../src/lib/kits.ts");

const calc = (slug, values) => C.calcLines(getKit(slug), values);
const value = (lines, label) => lines.find((line) => line.label === label)?.value;
/** No line looks like an answer: the only lines are a request to fix or fill something. */
function refused(lines, why) {
  assert.ok(lines.length >= 1, why);
  for (const line of lines) assert.ok(["Check the figures", "Result", "Check the costs"].includes(line.label), `${why}: unexpected result line ${JSON.stringify(line)}`);
}
/** A plausible number for any of a calculator's result labels. */
const RESULT_LABELS = ["Total", "Volume", "Profit", "Margin", "Batch", "Each", "Per hectare", "Cost per unit", "You put in", "The sum"];

// ── the reader ────────────────────────────────────────────────────────────────

test("reader: dot decimals, thousands groups and the box's own unit are read", () => {
  assert.deepEqual(N.readNumber("7.5", "Weight"), { state: "ok", value: 7.5 });
  assert.deepEqual(N.readNumber("1,500", "Amount", { money: true }), { state: "ok", value: 1500 });
  assert.deepEqual(N.readNumber("12,345,678.9", "Amount", { money: true }), { state: "ok", value: 12345678.9 });
  assert.deepEqual(N.readNumber("₦1,500", "Amount", { money: true }), { state: "ok", value: 1500 });
  assert.deepEqual(N.readNumber("60kg", "Weight", { units: ["kg"] }), { state: "ok", value: 60 });
  assert.deepEqual(N.readNumber("60 KG", "Weight", { units: ["kg"] }), { state: "ok", value: 60 });
  assert.deepEqual(N.readNumber("15 mg/kg", "Dose", { units: ["mg/kg"] }), { state: "ok", value: 15 });
  assert.deepEqual(N.readNumber("  ", "Weight"), { state: "blank" });
});

test("reader: every mistake is named, never read as a nearby number", () => {
  const bad = (raw, rule, pattern) => {
    const read = N.readNumber(raw, "Weight", rule);
    assert.equal(read.state, "bad", `${JSON.stringify(raw)} should be refused`);
    if (pattern) assert.match(read.message, pattern, raw);
  };
  bad("7,5", {}, /Use a dot for decimals, e\.g\. 7\.5/);
  bad("1,50", {}, /Use a dot for decimals/);
  bad("1.500,00", { money: true }, /commas for thousands|dot for decimals/i);
  bad("1 5", {}, null);
  bad("abc", {}, /must be a number/);
  bad("1e3", {}, /must be a number/);
  bad("0x10", {}, /must be a number/);
  bad("Infinity", {}, /must be a number/);
  bad("60 lb", { units: ["kg"] }, /type the number only in kg, without “lb”/);
  bad("60 stone", { units: ["kg"] }, /without “stone”/);
  bad("60kg", {}, /without “kg”/, "a unit is refused where the box has none");
  bad("₦60", {}, /must be a number/, "currency only in money boxes");
  bad("-3", {}, /can’t be negative/);
  bad("0", { aboveMin: true }, /must be more than 0/);
  bad("351", { max: 350 }, /not realistic/);
  bad("99999999999999", { money: true }, /not realistic/);
  bad("2.5", { whole: true }, /whole number/);
});

test("reader: a value that is possible but unusual carries its warning", () => {
  assert.deepEqual(N.readNumber("120", "mg per kg", { warnAbove: { value: 100, note: "Unusual." } }), { state: "ok", value: 120, warning: "Unusual." });
});

// ── Dose ─────────────────────────────────────────────────────────────────────

test("Dose: correct figures for clean input, with or without units", () => {
  for (const values of [
    { kg: "7.5", mgkg: "10", mgml: "24" },
    { kg: "7.5kg", mgkg: "10 mg/kg", mgml: "24 mg/mL" },
    { kg: " 7.5 ", mgkg: "10", mgml: "24.0" },
  ]) {
    const lines = calc("dose", values);
    assert.equal(value(lines, "Total"), "75 mg", JSON.stringify(values));
    assert.equal(value(lines, "Volume"), "3.13 mL");
  }
  const adult = calc("dose", { kg: "60", mgkg: "15", mgml: "50" });
  assert.equal(value(adult, "Total"), "900 mg");
  assert.equal(value(adult, "Volume"), "18 mL");
});

test("Dose: comma decimals, separators, units, zero, negatives, letters and unrealistic values are refused", () => {
  const cases = [
    [{ kg: "7,5", mgkg: "10", mgml: "24" }, /Use a dot for decimals, e\.g\. 7\.5/, "the old tenfold bug: 7,5 must not become 75"],
    [{ kg: "1,500", mgkg: "10", mgml: "24" }, /not realistic/, "1,500 kg is a thousands separator: read as 1500, then refused"],
    [{ kg: "60", mgkg: "1,5", mgml: "24" }, /Use a dot for decimals/, "comma in mg per kg"],
    [{ kg: "60", mgkg: "15", mgml: "0,5" }, /Use a dot for decimals/, "comma in mg per mL"],
    [{ kg: "132 lb", mgkg: "10", mgml: "24" }, /without “lb”/, "pounds are not kilograms"],
    [{ kg: "60", mgkg: "15", mgml: "50 mg/5mL" }, /without/, "a strength per 5 mL is not per mL"],
    [{ kg: "₦60", mgkg: "15", mgml: "50" }, /must be a number/, "no currency in a dose"],
    [{ kg: "0", mgkg: "15", mgml: "50" }, /Weight \(kg\) must be more than 0/, "zero weight"],
    [{ kg: "60", mgkg: "0", mgml: "50" }, /mg per kg must be more than 0/, "zero dose"],
    [{ kg: "60", mgkg: "15", mgml: "0" }, /mg per mL must be more than 0/, "zero strength (division by zero)"],
    [{ kg: "-60", mgkg: "15", mgml: "50" }, /can’t be negative/, "negative weight"],
    [{ kg: "60", mgkg: "-15", mgml: "50" }, /can’t be negative/, "negative dose"],
    [{ kg: "abc", mgkg: "15", mgml: "50" }, /Weight \(kg\) must be a number/, "letters"],
    [{ kg: "60", mgkg: "15", mgml: "" }, /Fill in mg per mL/, "a blank box is asked for, not read as 0"],
    [{ kg: "351", mgkg: "15", mgml: "50" }, /not realistic/, "over 350 kg"],
    [{ kg: "60", mgkg: "1500", mgml: "50" }, /not realistic/, "over 1,000 mg per kg"],
    [{ kg: "60", mgkg: "15", mgml: "5000" }, /not realistic/, "over 1,000 mg per mL"],
    [{ kg: "1e2", mgkg: "15", mgml: "50" }, /must be a number/, "exponent notation"],
  ];
  for (const [values, pattern, why] of cases) {
    const lines = calc("dose", values);
    refused(lines, why);
    assert.match(lines[0].value, pattern, why);
    for (const label of RESULT_LABELS) assert.equal(value(lines, label), undefined, `${why}: no ${label}`);
  }
  refused(calc("dose", {}), "empty form");
  assert.match(calc("dose", {})[0].value, /Fill in Weight \(kg\), mg per kg, mg per mL/);
});

test("Dose: an unusual but possible mg per kg is shown with a warning next to the figure", () => {
  const lines = calc("dose", { kg: "10", mgkg: "120", mgml: "100" });
  assert.equal(value(lines, "Total"), "1,200 mg");
  assert.match(value(lines, "Check"), /Over 100 mg per kg is unusual/);
});

// ── every other kit with a number box ───────────────────────────────────────

test("every kit number box has a rule and every calculator refuses the common mistakes", () => {
  const numberKits = KITS.filter((kit) => [...(kit.fields ?? []), ...(kit.parts ?? []), ...(kit.views ?? []).flatMap((view) => view.fields ?? [])].some((field) => field.kind === "number"));
  assert.deepEqual(numberKits.map((kit) => kit.slug).sort(), ["bill-watch", "catalog", "dose", "farm-sales", "margin", "menu", "pension", "recipe-cost", "statements", "stock", "yield"]);
  for (const kit of numberKits.filter((item) => item.kind === "calc")) {
    const numbers = kit.fields.filter((field) => field.kind === "number");
    const good = Object.fromEntries(numbers.map((field) => [field.id, field.id === "years" ? "10" : field.id === "rate" ? "8" : "100"]));
    if (kit.slug === "recipe-cost") good.costs = "500\n200";
    const ok = C.calcLines(kit, good);
    assert.ok(ok.some((line) => RESULT_LABELS.includes(line.label)), `${kit.slug} computes from clean input`);
    for (const field of numbers) {
      for (const raw of ["7,5", "abc", "-5", "1e3"]) {
        const lines = C.calcLines(kit, { ...good, [field.id]: raw });
        refused(lines, `${kit.slug}.${field.id} = ${raw}`);
      }
      const blank = C.calcLines(kit, { ...good, [field.id]: "" });
      refused(blank, `${kit.slug}.${field.id} blank`);
      assert.match(blank[0].value, new RegExp(`Fill in ${field.label.replace(/[()%]/g, ".")}`), `${kit.slug}.${field.id} blank is asked for`);
    }
  }
});

test("Profit, Recipe cost, Yield and Savings: right answers, and the limits that matter", () => {
  assert.equal(value(calc("margin", { cost: "₦1,200", price: "1,500" }), "Profit"), "300");
  assert.equal(value(calc("margin", { cost: "1200", price: "1500" }), "Margin"), "20%");
  assert.equal(value(calc("margin", { cost: "0", price: "0" }), "Margin"), "—", "zero price: no margin, not a division by zero");
  const recipe = calc("recipe-cost", { costs: "500\n₦1,200\n\n300.50", portions: "4" });
  assert.equal(value(recipe, "Batch"), "2,000.5");
  assert.equal(value(recipe, "Each"), "500.13");
  for (const costs of ["500\n7,5", "500\nabc", "500\n-200"]) {
    const lines = calc("recipe-cost", { costs, portions: "4" });
    refused(lines, costs);
    assert.match(lines[0].value, /Cost line 2/, "the bad line is named, never dropped from the total");
  }
  refused(calc("recipe-cost", { costs: "500", portions: "0" }), "zero portions");
  refused(calc("recipe-cost", { costs: "500", portions: "2.5.1" }), "garbled portions");
  assert.equal(value(calc("yield", { qty: "2,400", land: "1.5 ha", cost: "₦360,000" }), "Per hectare"), "1,600");
  refused(calc("yield", { qty: "2400", land: "0", cost: "1000" }), "zero land");
  refused(calc("yield", { qty: "2400", land: "3 acres", cost: "1000" }), "acres are not hectares");
  const savings = calc("pension", { monthly: "20,000", years: "10", rate: "8%" });
  assert.equal(value(savings, "You put in"), "2,400,000");
  refused(calc("pension", { monthly: "20000", years: "10", rate: "-8" }), "negative rate");
  refused(calc("pension", { monthly: "20000", years: "0", rate: "8" }), "zero years");
  refused(calc("pension", { monthly: "20000", years: "120", rate: "8" }), "120 years");
  refused(calc("pension", { monthly: "20000", years: "10", rate: "150" }), "150% a year");
  assert.match(value(calc("pension", { monthly: "20000", years: "10", rate: "40" }), "Check"), /unusual/);
});

test("tracker and template boxes: money and quantities follow the same rules", () => {
  for (const [slug, id] of [["menu", "price"], ["catalog", "price"], ["bill-watch", "amount"], ["farm-sales", "amount"], ["stock", "qty"], ["stock", "low"]]) {
    const field = getKit(slug).fields.find((item) => item.id === id);
    assert.equal(N.readNumber("7,5", field.label, field.rule).state, "bad", `${slug}.${id} 7,5`);
    assert.equal(N.readNumber("abc", field.label, field.rule).state, "bad", `${slug}.${id} letters`);
    assert.equal(N.readNumber("-2", field.label, field.rule).state, "bad", `${slug}.${id} negative`);
    assert.equal(N.readNumber("1,500", field.label, field.rule).state, "ok", `${slug}.${id} thousands`);
  }
  const prices = getKit("farm-sales").views.find((view) => view.id === "prices").fields.find((item) => item.id === "price");
  assert.equal(N.readNumber("₦45,000", prices.label, prices.rule).state, "ok");
  assert.equal(N.readNumber("45,0", prices.label, prices.rule).state, "bad");
  const parts = getKit("statements").parts.filter((part) => part.kind === "number");
  assert.equal(N.readNumbers(parts, { revenue: "₦500,000", cogs: "200,000", expenses: "50000" }).problem, null);
  assert.match(N.readNumbers(parts, { revenue: "500000", cogs: "-200000", expenses: "0" }).problem, /can’t be negative/);
  assert.match(N.readNumbers(parts, { revenue: "500,0", cogs: "1", expenses: "0" }).problem, /Use a dot/);
});

// ── the custom calculators ──────────────────────────────────────────────────

test("Circuit: Ohm's law, and every bad input or zero divisor named", () => {
  assert.equal(C.ohmLine("", "2", "6"), "12 V");
  assert.equal(C.ohmLine("12V", "", "6 ohms"), "2 A");
  assert.equal(C.ohmLine("12", "2A", ""), "6 Ω");
  assert.equal(C.ohmLine("12", "0", ""), "Current must not be 0 to find the resistance.");
  assert.match(C.ohmLine("12", "", "0"), /Resistance must be more than 0/);
  assert.match(C.ohmLine("1,5", "", "6"), /Use a dot/);
  assert.match(C.ohmLine("abc", "", "6"), /Voltage must be a number/);
  assert.match(C.ohmLine("12", "", "-6"), /can’t be negative/);
  assert.equal(C.ohmLine("12", "", ""), "Leave exactly one of V, I, or R blank.");
});

test("Solver: forward formulas only from clean numbers", () => {
  assert.equal(C.solverLine("speed", "100", "20"), "5 (distance ÷ time)");
  assert.equal(C.solverLine("force", "10", "-9.8"), "-98 (mass × acceleration)", "acceleration may be negative");
  assert.match(C.solverLine("speed", "100", "0"), /Time must be more than 0/);
  assert.match(C.solverLine("density", "-5", "2"), /can’t be negative/);
  assert.match(C.solverLine("molarity", "0,5", "2"), /Use a dot/);
  assert.equal(C.solverLine("speed", "", "20"), "Enter both numbers.", "blank is not 0");
});

test("Ratios and Break-even: no ratio from a bad or missing box", () => {
  assert.deepEqual(C.ratioLines({ current: "500,000", liability: "250,000", stock: "100,000", debt: "", equity: "" }), [
    { label: "Current", value: "2" },
    { label: "Quick", value: "1.6" },
  ]);
  assert.equal(C.ratioLines({ current: "500000", liability: "0", stock: "", debt: "", equity: "" })[0].label, "Check the figures", "no division by zero liabilities");
  assert.equal(C.ratioLines({ current: "abc", liability: "250000", stock: "", debt: "", equity: "" })[0].label, "Check the figures");
  assert.equal(C.ratioLines({ current: "100", liability: "50", stock: "200", debt: "", equity: "" })[0].label, "Check the figures", "stock above current assets");
  const even = C.breakEvenLines({ fixed: "₦100,000", price: "1,500", variable: "1000" });
  assert.equal(value(even, "Units to sell"), "200");
  for (const bad of [{ fixed: "100000", price: "1,5", variable: "1000" }, { fixed: "-100", price: "1500", variable: "1000" }, { fixed: "100000", price: "abc", variable: "1000" }, { fixed: "100000", price: "1500", variable: "" }]) {
    const lines = C.breakEvenLines(bad);
    assert.equal(value(lines, "Units to sell"), undefined, JSON.stringify(bad));
  }
});

test("Tax: the gazetted 2026 bands, and no ₦0 from a bad or blank pay", () => {
  // Test vectors: the audit's three cases and the ₦60m worked example (Mondaq, 5 Jan 2026), all with no rent.
  const paye = (pay, rent = "") => value(C.taxLines({ pay, rent, sale: "" }), "PAYE estimate");
  assert.equal(paye("1,800,000"), "₦150,000");
  assert.equal(paye("6000000"), "₦870,000");
  assert.equal(paye("₦24,000,000"), "₦4,470,000");
  assert.equal(paye("60000000"), "₦12,930,000");
  assert.equal(paye("840000"), "₦0", "minimum wage (₦70,000 a month) is exempt");
  assert.equal(paye("1800000", "1,200,000"), "₦114,000", "rent relief 20% of rent");
  assert.equal(paye("1800000", "4000000"), "₦75,000", "rent relief capped at ₦500,000");
  assert.equal(value(C.taxLines({ pay: "1000000", rent: "", sale: "100,000" }), "VAT at 7.5%"), "₦7,500");
  for (const pay of ["", "abc", "-1000000", "1,5000000", "1.800.000,00"]) {
    const lines = C.taxLines({ pay, rent: "", sale: "" });
    assert.equal(lines[0].label, "Check the figures", JSON.stringify(pay));
    assert.equal(value(lines, "PAYE estimate"), undefined, `${JSON.stringify(pay)} never shows ₦0`);
  }
  assert.equal(C.taxLines({ pay: "1800000", rent: "-5", sale: "" })[0].label, "Check the figures", "negative rent");
});
