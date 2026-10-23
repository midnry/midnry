/**
 * The pure sums behind the kit calculators (src/components/tools/kit.tsx),
 * kept out of the component file so they can be tested in Node
 * (scripts/kit-numbers.test.mjs). Every typed value is read under its box's
 * rule first (src/lib/kit-numbers.ts); nothing here computes from a value
 * that was not clearly the number the person meant.
 */
import type { Kit, Line } from "@/lib/kits";
import { readNumber, readNumbers, type NumberRule } from "@/lib/kit-numbers";

/** Same format as the kit screens: up to two decimals, "—" for anything not finite. */
function money(value: number): string {
  return Number.isFinite(value) ? (Math.round(value * 100) / 100).toLocaleString("en", { maximumFractionDigits: 2 }) : "—";
}

/**
 * A calculator's result, only from numbers read under each box's rule
 * (src/lib/kit-numbers.ts): a comma decimal, a stray unit, a negative, zero
 * where it can't be, an unrealistic value or a blank box is named instead of
 * computed. The kit's own sum then gets the clean numbers.
 */
export function calcLines(kit: Extract<Kit, { kind: "calc" }>, values: Record<string, string>): Line[] {
  const numbers = kit.fields.filter((field) => field.kind === "number");
  const read = readNumbers(numbers, values);
  if (read.problem) {
    const empty = numbers.every((field) => !values[field.id]?.trim());
    return [{ label: empty ? "Result" : "Check the figures", value: read.problem }];
  }
  const clean = { ...values, ...Object.fromEntries(Object.entries(read.values).map(([id, value]) => [id, String(value)])) };
  return [...kit.run(clean), ...read.warnings.map((note) => ({ label: "Check", value: note }))];
}

/** Ohm's law with every box read under a rule: a bad value or a zero divisor is named, never computed. */
export function ohmLine(v: string, i: string, r: string): string {
  const blank = [v, i, r].filter((item) => item.trim() === "").length;
  if (blank !== 1) return "Leave exactly one of V, I, or R blank.";
  const SIGNED: NumberRule = { min: -1e9, units: [] };
  const voltage = readNumber(v, "Voltage", { ...SIGNED, units: ["V"] });
  const current = readNumber(i, "Current", { ...SIGNED, units: ["A"] });
  const resistance = readNumber(r, "Resistance", { aboveMin: true, units: ["Ω", "ohm", "ohms"] });
  for (const read of [voltage, current, resistance]) if (read.state === "bad") return read.message;
  const val = (read: typeof voltage) => (read.state === "ok" ? read.value : NaN);
  const round = (x: number) => Math.round(x * 100) / 100;
  if (voltage.state === "blank") return `${round(val(current) * val(resistance))} V`;
  if (current.state === "blank") return `${round(val(voltage) / val(resistance))} A`;
  if (val(current) === 0) return "Current must not be 0 to find the resistance.";
  return `${round(val(voltage) / val(current))} Ω`;
}

/** Solver's one line: both boxes read under a rule; a divisor of 0 or a negative quantity is named. */
export function solverLine(which: string, a: string, b: string): string {
  const labels: Record<string, [string, string]> = { speed: ["Distance", "Time"], density: ["Mass", "Volume"], force: ["Mass", "Acceleration"], molarity: ["Moles", "Litres"] };
  const [first, second] = labels[which] ?? ["First value", "Second value"];
  const left = readNumber(a, first);
  const right = readNumber(b, second, which === "force" ? { min: -1e9 } : { aboveMin: true });
  if (left.state === "bad") return left.message;
  if (right.state === "bad") return right.message;
  if (left.state !== "ok" || right.state !== "ok") return "Enter both numbers.";
  const round = (x: number) => Math.round(x * 100) / 100;
  if (which === "speed") return `${round(left.value / right.value)} (distance ÷ time)`;
  if (which === "density") return `${round(left.value / right.value)} (mass ÷ volume)`;
  if (which === "molarity") return `${round(left.value / right.value)} mol/L`;
  return `${round(left.value * right.value)} (mass × acceleration)`;
}

/** Current, quick and debt-to-equity ratios. A ratio is shown only when its own boxes are filled and read. */
export function ratioLines(v: { current: string; liability: string; stock: string; debt: string; equity: string }): Line[] {
  const MONEY: NumberRule = { money: true };
  const read = readNumbers(
    [
      { id: "current", label: "Current assets", rule: MONEY, optional: true },
      { id: "liability", label: "Current liabilities", rule: { ...MONEY, aboveMin: true }, optional: true },
      { id: "stock", label: "Stock", rule: MONEY, optional: true },
      { id: "debt", label: "Debt", rule: MONEY, optional: true },
      { id: "equity", label: "Equity", rule: { ...MONEY, aboveMin: true }, optional: true },
    ],
    v,
  );
  if (read.problem) return [{ label: "Check the figures", value: read.problem }];
  const { current, liability, stock, debt, equity } = read.values;
  const round = (x: number) => String(Math.round(x * 100) / 100);
  const lines: Line[] = [];
  if (current !== undefined && liability !== undefined) {
    lines.push({ label: "Current", value: round(current / liability) });
    if (stock !== undefined) {
      if (stock > current) return [{ label: "Check the figures", value: "Stock can’t be more than current assets." }];
      lines.push({ label: "Quick", value: round((current - stock) / liability) });
    }
  }
  if (debt !== undefined && equity !== undefined) lines.push({ label: "Debt / equity", value: round(debt / equity) });
  return lines.length ? lines : [{ label: "Result", value: "Enter assets and liabilities, or debt and equity." }];
}

/** Units to sell to cover fixed costs. All three boxes are needed; price must be above the cost of one unit. */
export function breakEvenLines(v: { fixed: string; price: string; variable: string }): Line[] {
  const MONEY: NumberRule = { money: true };
  const read = readNumbers(
    [
      { id: "fixed", label: "Fixed costs", rule: MONEY },
      { id: "price", label: "Price", rule: { ...MONEY, aboveMin: true } },
      { id: "variable", label: "Cost per unit", rule: MONEY },
    ],
    v,
  );
  const empty = !v.fixed.trim() && !v.price.trim() && !v.variable.trim();
  if (read.problem) return [{ label: empty ? "Result" : "Check the figures", value: empty ? "Enter fixed costs, price and cost per unit." : read.problem }];
  const { fixed, price, variable } = read.values as { fixed: number; price: number; variable: number };
  const gap = price - variable;
  if (gap <= 0) return [{ label: "Result", value: "Price has to be above the cost of one unit." }];
  const units = Math.ceil(fixed / gap);
  return [
    { label: "Units to sell", value: units.toLocaleString("en") },
    { label: "Sales needed", value: money(units * price) },
    { label: "Profit per unit", value: money(gap) },
  ];
}

/**
 * The 2026 PAYE estimate (Nigeria Tax Act 2025, Fourth Schedule bands) and
 * VAT at 7.5%. Annual pay is required; a blank rent or VAT amount is 0. The
 * minimum-wage exemption (₦70,000 a month) gives 0 tax. Not reviewed by a tax
 * adviser; the screen says so (src/lib/review-notes.ts).
 */
export function taxLines(v: { pay: string; rent: string; sale: string }): Line[] {
  const read = readNumbers(
    [
      { id: "pay", label: "Annual pay", rule: { money: true } },
      { id: "rent", label: "Annual rent", rule: { money: true }, optional: true },
      { id: "sale", label: "Amount for VAT", rule: { money: true }, optional: true },
    ],
    v,
  );
  if (read.problem) return [{ label: "Check the figures", value: read.problem }];
  const income = read.values.pay as number;
  const relief = Math.min((read.values.rent ?? 0) * 0.2, 500000);
  const chargeable = Math.max(0, income - relief);
  const bands: [number, number][] = [
    [800000, 0],
    [2200000, 0.15],
    [9000000, 0.18],
    [13000000, 0.21],
    [25000000, 0.23],
    [Number.POSITIVE_INFINITY, 0.25],
  ];
  let left = chargeable;
  let tax = 0;
  if (income > 70000 * 12) {
    for (const [width, rate] of bands) {
      const slice = Math.min(left, width);
      tax += slice * rate;
      left -= slice;
      if (left <= 0) break;
    }
  }
  const vat = (read.values.sale ?? 0) * 0.075;
  return [
    { label: "PAYE estimate", value: `₦${Math.round(tax).toLocaleString("en")}` },
    { label: "VAT at 7.5%", value: `₦${Math.round(vat).toLocaleString("en")}` },
  ];
}
