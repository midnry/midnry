/**
 * Reading a number that a person typed or pasted (amounts, rates, tax,
 * quantities). One policy for every tool, so "7,5" never quietly becomes 75.
 *
 * The policy, stated once:
 *  - "." is the decimal point. ".5" and "5." are read as 0.5 and 5.
 *  - "," is accepted only as a thousands separator in valid groups: one to
 *    three digits, then groups of exactly three ("1,500", "12,345,678.9").
 *    Anything else with a comma ("7,5", "1,50", "1,5000") is refused with
 *    "Use a dot for decimals, e.g. 7.5" (the example uses the typed digits).
 *  - "1.500,00" (comma as the decimal point) is refused the same way, with
 *    the number rewritten as an example ("e.g. 1,500.00").
 *  - Spaces inside the number are refused, except as thousands grouping in
 *    the same valid groups of three, with a regular space, a no-break space
 *    (U+00A0) or a narrow no-break space (U+202F), used consistently and
 *    never mixed with commas ("1 500 000.50" is fine, "1 5" is not).
 *  - A currency symbol or code (₦ $ £ € ₵ ₹ ¥, NGN USD GBP EUR GHS KES ZAR
 *    CAD INR, KSh, and N or R straight before the digits) is stripped only at
 *    the start or the end, with any spaces around it. One in the middle is
 *    refused.
 *  - A leading "-" (or "−") is accepted only when the caller allows
 *    negatives; "+" is accepted and ignored.
 *  - A blank (or only spaces) is reported as blank, never as zero.
 *  - No exponents, hex, "Infinity" or other things Number() would accept.
 *
 * The result keeps the digits as text, so callers that need exact money can
 * scale them with BigInt (see toScaled) instead of going through a float.
 */

export type NumberProblem = "blank" | "comma-decimal" | "comma-decimal-european" | "space" | "currency" | "negative" | "decimals" | "invalid";

export type ParsedNumber =
  | {
      ok: true;
      /** The value as a JavaScript number (fine for display and non-money maths). */
      value: number;
      negative: boolean;
      /** Whole-number digits, no separators, no leading sign ("1500"). */
      whole: string;
      /** Digits after the decimal point, as typed ("" when none). */
      frac: string;
      /** Canonical text: optional "-", digits, optional "." and decimals ("-1500.50"). */
      text: string;
    }
  | { ok: false; problem: NumberProblem; message: string };

export type NumberOptions = {
  /** Accept a leading minus sign. Off by default. */
  allowNegative?: boolean;
  /** Most digits allowed after the decimal point. No limit by default. */
  maxDecimals?: number;
  /** Strip a currency symbol or code at the start or end. On by default. */
  allowCurrency?: boolean;
  /** Field name for messages ("Amount"). */
  label?: string;
};

export const DOT_DECIMAL_MESSAGE = "Use a dot for decimals, e.g. 7.5";

const SYMBOL = "[₦$£€₵₹¥]";
const CODE = "NGN|USD|GBP|EUR|GHS|KES|ZAR|CAD|INR|KSh";
const PREFIX = new RegExp(`^(?:${SYMBOL}|(?:${CODE})(?![A-Za-z])|[NR](?=\\s*[\\d.]))\\s*`, "i");
const SUFFIX = new RegExp(`\\s*(?:${SYMBOL}|(?<![A-Za-z])(?:${CODE}))$`, "i");
const ANY_CURRENCY = new RegExp(`${SYMBOL}|\\b(?:${CODE})\\b`, "i");
/** Regular, no-break and narrow no-break spaces: the ones accepted as grouping. */
const GROUP_SPACES = /[ \u00a0\u202f]/;

function notNumber(label: string): string {
  return label === "Number" ? "Enter a number, like 2 or 1.5." : `${label} must be a number, like 2 or 1.5.`;
}

function fail(problem: NumberProblem, message: string): ParsedNumber {
  return { ok: false, problem, message };
}

function stripSign(text: string): { sign: "" | "-" | "+"; rest: string } {
  const m = /^([+\-−])\s*/.exec(text);
  if (!m) return { sign: "", rest: text };
  return { sign: m[1] === "+" ? "+" : "-", rest: text.slice(m[0].length) };
}

/** The typed number with "," and "." swapped, as a hint ("1.500,00" → "1,500.00"). */
function swapped(text: string): string {
  return text.replace(/[.,]/g, (c) => (c === "," ? "." : ","));
}

/** Read one typed number under the policy above. */
export function parseNumberInput(raw: string, options: NumberOptions = {}): ParsedNumber {
  const label = options.label ?? "Number";

  let text = (raw ?? "").replace(/^[\s\u00a0\u202f]+|[\s\u00a0\u202f]+$/g, "");
  if (!text) return fail("blank", "Enter a number.");

  // A sign may come before or after a leading currency mark ("-₦500", "₦-500").
  let { sign, rest } = stripSign(text);
  if (options.allowCurrency !== false) {
    const before = rest;
    rest = rest.replace(PREFIX, "");
    if (rest !== before && !sign) ({ sign, rest } = stripSign(rest));
    rest = rest.replace(SUFFIX, "");
  }
  text = rest.trim();
  if (!text) return fail("invalid", notNumber(label));
  if (ANY_CURRENCY.test(text) && options.allowCurrency === false) return fail("invalid", notNumber(label));
  if (ANY_CURRENCY.test(text)) return fail("currency", `${label === "Number" ? "Enter just the number" : `${label} must be just the number`}; put the currency at the start or end, like ₦1,500.`);

  // Grouping: commas or one kind of space, never both.
  const hasComma = text.includes(",");
  const spaceKinds = new Set(text.match(/[ \u00a0\u202f]/g) ?? []);
  if (/\s/.test(text.replace(/[ \u00a0\u202f]/g, ""))) return fail("space", `Remove the spaces inside the ${label.toLowerCase()}.`);

  // Comma used as the decimal point: "1.500,00", "7,5", "1,50".
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(text) || /^\d+\.\d{3},\d+$/.test(text)) {
    return fail("comma-decimal-european", `Use a dot for decimals and commas for thousands, e.g. ${swapped(text)}`);
  }
  if (hasComma && spaceKinds.size > 0) return fail("space", `Remove the spaces inside the ${label.toLowerCase()}.`);
  if (spaceKinds.size > 1) return fail("space", `Remove the spaces inside the ${label.toLowerCase()}.`);

  const sep = hasComma ? "," : spaceKinds.size === 1 ? [...spaceKinds][0] : "";
  const dotCount = (text.match(/\./g) ?? []).length;
  if (dotCount > 1) {
    return /^\d{1,3}(?:\.\d{3})+$/.test(text) && !hasComma
      ? fail("comma-decimal-european", `Use commas for thousands, e.g. ${text.replace(/\./g, ",")}`)
      : fail("invalid", notNumber(label));
  }
  const [intPart, fracPart] = dotCount === 1 ? [text.slice(0, text.indexOf(".")), text.slice(text.indexOf(".") + 1)] : [text, undefined];
  if (fracPart !== undefined && !/^\d*$/.test(fracPart)) {
    if (/,/.test(fracPart)) return fail("comma-decimal", DOT_DECIMAL_MESSAGE);
    if (GROUP_SPACES.test(fracPart)) return fail("space", `Remove the spaces inside the ${label.toLowerCase()}.`);
    return fail("invalid", notNumber(label));
  }

  let whole: string;
  if (sep) {
    const escaped = sep === "," ? "," : sep;
    const grouped = new RegExp(`^\\d{1,3}(?:${escaped}\\d{3})+$`);
    if (!grouped.test(intPart)) {
      if (sep === ",") {
        const simple = /^(\d+),(\d+)$/.exec(intPart);
        if (simple && simple[2].length <= 2 && fracPart === undefined) return fail("comma-decimal", `Use a dot for decimals, e.g. ${simple[1]}.${simple[2]}`);
        if (/^[\d,]+$/.test(intPart)) return fail("comma-decimal", `${DOT_DECIMAL_MESSAGE}. Commas can only separate thousands, like 1,500.`);
        return fail("invalid", notNumber(label));
      }
      if (/^[\d \u00a0\u202f]+$/.test(intPart)) return fail("space", `Remove the spaces inside the ${label.toLowerCase()}.`);
      return fail("invalid", notNumber(label));
    }
    whole = intPart.split(sep).join("");
  } else {
    if (!/^\d*$/.test(intPart)) return fail("invalid", notNumber(label));
    whole = intPart;
  }
  const frac = fracPart ?? "";
  if (!whole && !frac) return fail("invalid", notNumber(label));

  const negative = sign === "-";
  const isZero = !/[1-9]/.test(whole + frac);
  if (negative && !options.allowNegative && !isZero) return fail("negative", `${label} can’t be negative.`);
  if (options.maxDecimals !== undefined && frac.length > options.maxDecimals) {
    return fail(
      "decimals",
      options.maxDecimals === 0 ? `${label} must be a whole number.` : `${label} can have at most ${options.maxDecimals} decimal place${options.maxDecimals === 1 ? "" : "s"}.`,
    );
  }
  const digits = (whole || "0").replace(/^0+(?=\d)/, "");
  const canonical = `${negative && !isZero ? "-" : ""}${digits}${frac ? `.${frac}` : ""}`;
  const value = Number(canonical);
  if (!Number.isFinite(value)) return fail("invalid", "That number is too large.");
  return { ok: true, value, negative: negative && !isZero, whole: digits, frac, text: canonical };
}

/** The parsed value as an exact integer of 10^decimals units (cents for 2). Extra decimals round half-up. */
export function toScaled(parsed: Extract<ParsedNumber, { ok: true }>, decimals: number): bigint {
  const scale = 10n ** BigInt(decimals);
  const kept = (parsed.frac + "0".repeat(decimals)).slice(0, decimals);
  let units = BigInt(parsed.whole || "0") * scale + BigInt(kept || "0");
  const next = parsed.frac.charAt(decimals);
  if (next && Number(next) >= 5) units += 1n;
  return parsed.negative ? -units : units;
}

/** A typed number, or NaN when it is blank or does not follow the policy. */
export function numberOrNaN(raw: string, options: NumberOptions = { allowNegative: true }): number {
  const parsed = parseNumberInput(raw, options);
  return parsed.ok ? parsed.value : NaN;
}

/** The message to show for a typed number, or null when it is fine (or blank). */
export function numberProblem(raw: string, options: NumberOptions = { allowNegative: true }): string | null {
  const parsed = parseNumberInput(raw, options);
  return parsed.ok || parsed.problem === "blank" ? null : parsed.message;
}

/** Problems that get their own explanation; others fall back to the tool's usual message. */
const EXPLAINED: readonly NumberProblem[] = ["comma-decimal", "comma-decimal-european", "space", "currency"];

/**
 * The specific message for a format mistake ("Use a dot for decimals, e.g. 7.5"),
 * or null when the tool's own message ("Enter an amount like 12.50.") fits.
 */
export function formatHint(result: ParsedNumber): string | null {
  return !result.ok && EXPLAINED.includes(result.problem) ? result.message : null;
}

/** Largest amount the money tools accept: 100 million in major units. */
export const MAX_CENTS = 100_000_000_00;

export type CentsResult = { ok: true; cents: number } | { ok: false; problem: NumberProblem | "too-large"; message: string; hint: string | null };

/**
 * A typed money amount in cents (two decimals at most, not negative unless
 * allowed, at most MAX_CENTS). Used by Ledger, Split and the Ledger demo.
 */
export function checkCents(raw: string, options: { allowNegative?: boolean; label?: string } = {}): CentsResult {
  const parsed = parseNumberInput(raw, { allowNegative: options.allowNegative, maxDecimals: 2, label: options.label ?? "Amount" });
  if (!parsed.ok) return { ok: false, problem: parsed.problem, message: parsed.message, hint: formatHint(parsed) };
  const cents = toScaled(parsed, 2);
  if (cents > BigInt(MAX_CENTS) || cents < -BigInt(MAX_CENTS)) return { ok: false, problem: "too-large", message: "That amount is too large.", hint: null };
  return { ok: true, cents: Number(cents) };
}

/**
 * Drop-in for Number(raw) in the kit calculators: missing is NaN and blank is
 * 0 (as Number() gave, so their results don't change), anything else follows
 * the policy above (negatives allowed), so "1,500" is 1500 and "7,5" is NaN
 * instead of being misread.
 */
export function typedNumber(raw: string | undefined | null): number {
  if (raw === undefined || raw === null) return NaN;
  if (!raw.trim()) return 0;
  return numberOrNaN(raw, { allowNegative: true });
}

/** The first format hint among some typed values, for a calculator's result area. */
export function firstHint(values: readonly (string | undefined | null)[]): string | null {
  for (const raw of values) {
    if (!raw || !raw.trim()) continue;
    const hint = formatHint(parseNumberInput(raw, { allowNegative: true }));
    if (hint) return hint;
  }
  return null;
}
