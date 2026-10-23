/**
 * The number rules for the small kit apps (src/lib/kits.ts, src/components/tools/kit.tsx).
 *
 * One promise for every kit: a typed value that is not clearly the number the
 * person meant never turns into a plausible-looking result. Each box says what
 * it accepts, and anything else is named on screen instead of computed:
 *
 *  - "7,5" (comma decimal), "1.500,00", spaces and stray signs follow the shared
 *    policy in src/lib/number-input.ts ("Use a dot for decimals, e.g. 7.5").
 *  - Thousands separators in valid groups are fine: "1,500" is 1500.
 *  - A unit is accepted only when it is the box's own unit ("60kg" in a kg box);
 *    any other trailing word ("60 lb", "60 stone") is refused, never ignored.
 *  - A currency sign is accepted only in money boxes ("₦1,500").
 *  - Negatives, zero and values past a realistic limit are refused per box,
 *    with the reason. A value that is possible but unusual can carry a warning
 *    that is shown next to the result.
 *  - Blank is reported as blank, never as 0, so a calculator asks for it.
 */
import { parseNumberInput } from "@/lib/number-input";

export type NumberRule = {
  /** Smallest allowed value (default 0: no negatives). Use -Infinity to allow negatives. */
  min?: number;
  /** The value must be above `min`, not equal to it (e.g. weight, portions). */
  aboveMin?: boolean;
  /** Largest realistic value; anything above is refused with a "check the figure" message. */
  max?: number;
  /** Units this box may carry after the number, e.g. ["kg"]. Matched without case. */
  units?: readonly string[];
  /** A money box: a currency sign or code at the start or end is accepted. */
  money?: boolean;
  /** Only whole numbers (people, years, portions where a fraction makes no sense). */
  whole?: boolean;
  /** Possible but unusual above this: the result is shown with `note`. */
  warnAbove?: { value: number; note: string };
};

export type NumberRead =
  | { state: "blank" }
  | { state: "ok"; value: number; warning?: string }
  | { state: "bad"; message: string };

/** Absolute ceiling for any kit box, so "1e309"-style input can never reach a sum. */
const HARD_MAX = 1e13;

function stripUnit(text: string, units: readonly string[] | undefined): { text: string; foreign: string | null } {
  const match = /^(.*?\d)\s*([a-zA-Zµ%/][a-zA-Zµ%/.\s]*)$/.exec(text);
  if (!match) return { text, foreign: null };
  const unit = match[2].trim();
  // A currency code after the number ("1500 NGN") is the money policy's business, not a unit.
  if (/^(NGN|USD|GBP|EUR|GHS|KES|ZAR|CAD|INR|naira)$/i.test(unit)) return { text, foreign: null };
  const allowed = (units ?? []).some((item) => item.toLowerCase().replace(/\s+/g, "") === unit.toLowerCase().replace(/\s+/g, ""));
  return allowed ? { text: match[1], foreign: null } : { text, foreign: unit };
}

function show(value: number): string {
  return value.toLocaleString("en", { maximumFractionDigits: 6 });
}

/** Read one typed value for a kit box under its rule. */
export function readNumber(raw: string | undefined | null, label: string, rule: NumberRule = {}): NumberRead {
  const typed = (raw ?? "").trim();
  if (!typed) return { state: "blank" };
  const { text, foreign } = stripUnit(typed, rule.units);
  if (foreign) {
    const own = rule.units?.length ? ` in ${rule.units[0]}` : "";
    return { state: "bad", message: `${label}: type the number only${own}, without “${foreign}”.` };
  }
  const parsed = parseNumberInput(text, { allowNegative: true, allowCurrency: rule.money === true, label });
  if (!parsed.ok) return { state: "bad", message: parsed.problem === "invalid" ? `${label} must be a number, like ${rule.whole ? "4" : "2 or 1.5"}.` : `${label}: ${parsed.message}` };
  const value = parsed.value;
  const min = rule.min ?? 0;
  if (value < min || (rule.aboveMin && value === min)) {
    if (value < 0 && min >= 0) return { state: "bad", message: `${label} can’t be negative.` };
    return { state: "bad", message: rule.aboveMin ? `${label} must be more than ${show(min)}.` : `${label} must be at least ${show(min)}.` };
  }
  if (rule.whole && !Number.isInteger(value)) return { state: "bad", message: `${label} must be a whole number.` };
  if (value > Math.min(rule.max ?? HARD_MAX, HARD_MAX)) {
    return { state: "bad", message: `${label} of ${show(value)} is not realistic. Check the figure.` };
  }
  if (rule.warnAbove && value > rule.warnAbove.value) return { state: "ok", value, warning: rule.warnAbove.note };
  return { state: "ok", value };
}

export type FieldValues = Record<string, string | undefined>;

/**
 * Read every number box of a form. `problem` is the first message to show
 * (a bad value, else the first blank required box); `values` holds the read
 * numbers; `warnings` the notes for unusual but allowed values.
 */
export function readNumbers(
  fields: readonly { id: string; label: string; rule?: NumberRule; optional?: boolean }[],
  values: FieldValues,
): { problem: string | null; values: Record<string, number>; warnings: string[] } {
  const out: Record<string, number> = {};
  const warnings: string[] = [];
  const blanks: string[] = [];
  for (const field of fields) {
    const read = readNumber(values[field.id], field.label, field.rule);
    if (read.state === "bad") return { problem: read.message, values: out, warnings };
    if (read.state === "blank") {
      if (!field.optional) blanks.push(field.label);
      continue;
    }
    out[field.id] = read.value;
    if (read.warning) warnings.push(read.warning);
  }
  if (blanks.length) return { problem: `Fill in ${blanks.join(", ")}.`, values: out, warnings };
  return { problem: null, values: out, warnings };
}
