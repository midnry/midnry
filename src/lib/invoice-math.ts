/**
 * Invoice sums, shared by the Invoice app and the homepage demo.
 *
 * Rounding, stated once: each line's quantity × rate is rounded half-up to
 * the currency's smallest unit (two decimal places for every currency the
 * app offers), the subtotal is the sum of those rounded lines, and tax is
 * worked out on the subtotal and rounded the same way. Arithmetic is done in
 * whole minor units with BigInt, so there is no floating-point drift.
 *
 * Any invalid input (blank, text, negative, too many decimals, tax outside
 * 0–100) gives an error for that field and no total at all.
 */

export type InvoiceLineInput = { description: string; qty: string; rate: string };

export type LineCheck = {
  /** A line with nothing filled in (new, untouched). It is skipped, not an error. */
  empty: boolean;
  qtyError: string | null;
  rateError: string | null;
  /** Rate in minor units, when valid. */
  rateMinor: number | null;
  /** Line amount in minor units, when both inputs are valid. */
  amountMinor: number | null;
};

export type InvoiceCheck = {
  lines: LineCheck[];
  taxError: string | null;
  /** Problems that are not tied to one field (e.g. no lines). */
  formError: string | null;
  valid: boolean;
  /** How many fields need fixing. */
  errorCount: number;
  /** Tax percent as typed, when valid (e.g. "7.5"). */
  taxPercent: string | null;
  subtotalMinor: number | null;
  taxMinor: number | null;
  totalMinor: number | null;
};

const QTY_DECIMALS = 4;
const TAX_DECIMALS = 4;
const MAX_QTY = 1_000_000;
const MAX_RATE_MAJOR = 10_000_000_000;

/** Decimal places of the currency's smallest unit (2 for NGN, USD, GBP, …). */
export function minorDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

function plain(raw: string): string {
  return raw.trim().replace(/[,\s]/g, "");
}

type Parsed = { ok: true; scaled: bigint; text: string } | { ok: false; error: string };

/** A non-negative decimal with at most `decimals` places, scaled to an integer. */
function parseDecimal(raw: string, decimals: number, what: string, blank: string): Parsed {
  const text = plain(raw);
  if (!text) return { ok: false, error: blank };
  if (/^-/.test(text) && /^-\d*\.?\d+$/.test(text)) return { ok: false, error: `${what} can’t be negative.` };
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(text)) return { ok: false, error: `${what} must be a number, like 2 or 1.5.` };
  const [whole, frac = ""] = text.split(".");
  if (frac.length > decimals) {
    return { ok: false, error: decimals === 0 ? `${what} must be a whole number.` : `${what} can have at most ${decimals} decimal places.` };
  }
  const scaled = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt((frac + "0".repeat(decimals)).slice(0, decimals) || "0");
  return { ok: true, scaled, text };
}

/** Round a non-negative numerator / denominator half-up. */
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

function isEmptyLine(line: InvoiceLineInput): boolean {
  const qty = plain(line.qty);
  return !line.description.trim() && !plain(line.rate) && (qty === "" || qty === "1");
}

export function checkInvoice(lines: InvoiceLineInput[], taxRaw: string, currency: string): InvoiceCheck {
  const digits = minorDigits(currency);
  const qtyScale = 10n ** BigInt(QTY_DECIMALS);
  const checked: LineCheck[] = lines.map((line) => {
    if (isEmptyLine(line)) return { empty: true, qtyError: null, rateError: null, rateMinor: null, amountMinor: null };
    const qty = parseDecimal(line.qty, QTY_DECIMALS, "Quantity", "Enter a quantity.");
    const rate = parseDecimal(line.rate, digits, "Rate", "Enter a rate.");
    let qtyError = qty.ok ? null : qty.error;
    let rateError = rate.ok ? null : rate.error;
    if (qty.ok && qty.scaled > BigInt(MAX_QTY) * qtyScale) qtyError = `Quantity can be at most ${MAX_QTY.toLocaleString("en")}.`;
    if (rate.ok && rate.scaled > BigInt(MAX_RATE_MAJOR) * 10n ** BigInt(digits)) rateError = "That rate is too large.";
    const rateMinor = rate.ok && !rateError ? Number(rate.scaled) : null;
    const amountMinor =
      qty.ok && rate.ok && !qtyError && !rateError ? Number(roundDiv(qty.scaled * rate.scaled, qtyScale)) : null;
    return { empty: false, qtyError, rateError, rateMinor, amountMinor };
  });

  const taxScale = 10n ** BigInt(TAX_DECIMALS);
  const tax = parseDecimal(taxRaw.trim().replace(/%$/, ""), TAX_DECIMALS, "Tax", "Enter a tax percent. Use 0 if there is no tax.");
  let taxError = tax.ok ? null : tax.error;
  if (tax.ok && tax.scaled > 100n * taxScale) taxError = "Tax can’t be more than 100%.";
  if (taxError && /must be a number/.test(taxError)) taxError = "Tax must be a number from 0 to 100.";

  const used = checked.filter((line) => !line.empty);
  const formError = used.length === 0 ? "Add at least one line item." : null;
  const errorCount =
    checked.reduce((count, line) => count + (line.qtyError ? 1 : 0) + (line.rateError ? 1 : 0), 0) + (taxError ? 1 : 0);
  const valid = errorCount === 0 && !formError;

  if (!valid || !tax.ok) {
    return { lines: checked, taxError, formError, valid: false, errorCount, taxPercent: null, subtotalMinor: null, taxMinor: null, totalMinor: null };
  }
  const subtotal = used.reduce((sum, line) => sum + BigInt(line.amountMinor ?? 0), 0n);
  const taxMinor = roundDiv(subtotal * tax.scaled, 100n * taxScale);
  return {
    lines: checked,
    taxError: null,
    formError: null,
    valid: true,
    errorCount: 0,
    taxPercent: tax.text.replace(/^\./, "0.").replace(/\.$/, ""),
    subtotalMinor: Number(subtotal),
    taxMinor: Number(taxMinor),
    totalMinor: Number(subtotal + taxMinor),
  };
}

/** Minor units to a plain number of major units, for formatting. */
export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** minorDigits(currency);
}

/** The rounding rule in words, for the page. */
export function roundingNote(currency: string): string {
  const digits = minorDigits(currency);
  return `Each line is rounded to ${digits} decimal place${digits === 1 ? "" : "s"}, the currency’s smallest unit; tax is worked out on the subtotal and rounded the same way.`;
}
