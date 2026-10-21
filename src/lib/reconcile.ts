/**
 * Reconcile: two lists of amounts, paired by amount only.
 *
 * Each non-blank line must be one amount. A line that is not (text, two
 * numbers, too many decimals) is reported with its line number and reason,
 * never silently skipped. Amounts are compared in whole cents.
 */

export type ParsedAmount = { line: number; cents: number };
export type BadLine = { line: number; text: string; reason: string };
export type ParsedList = { amounts: ParsedAmount[]; bad: BadLine[] };

const SYMBOLS = /[₦$£€₵₹¥]|\bKSh\b|\bNGN\b|\bUSD\b|\bGBP\b|\bEUR\b|\bGHS\b|\bKES\b|\bZAR\b|\bCAD\b|\bINR\b/gi;

function parseLine(raw: string): { cents: number } | { reason: string } {
  const stripped = raw.trim().replace(SYMBOLS, "");
  let text = stripped.replace(/[,\s]/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    const [whole, frac = ""] = text.split(".");
    if (frac.length > 2) return { reason: "has more than 2 decimal places" };
    const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
    if (!Number.isSafeInteger(cents)) return { reason: "is too large" };
    return { cents: negative ? -cents : cents };
  }
  if ((stripped.match(/\d[\d,.]*/g) ?? []).length >= 2) {
    return { reason: "has more than one number; put only the amount on the line" };
  }
  return { reason: "is not an amount" };
}

export function parseAmounts(text: string): ParsedList {
  const amounts: ParsedAmount[] = [];
  const bad: BadLine[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    if (!raw.trim()) return;
    const result = parseLine(raw);
    if ("cents" in result) amounts.push({ line: index + 1, cents: result.cents });
    else bad.push({ line: index + 1, text: raw.trim(), reason: result.reason });
  });
  return { amounts, bad };
}

export type Pair = { cents: number; leftLine: number; rightLine: number };
export type Comparison = {
  left: ParsedList;
  right: ParsedList;
  /** Amounts that appear in both lists, each paired once. */
  both: Pair[];
  onlyLeft: ParsedAmount[];
  onlyRight: ParsedAmount[];
  leftTotal: number;
  rightTotal: number;
  /** leftTotal − rightTotal, in cents. */
  gap: number;
};

export function compareLists(leftText: string, rightText: string): Comparison {
  const left = parseAmounts(leftText);
  const right = parseAmounts(rightText);
  const pool = right.amounts.slice();
  const both: Pair[] = [];
  const onlyLeft: ParsedAmount[] = [];
  for (const item of left.amounts) {
    const index = pool.findIndex((other) => other.cents === item.cents);
    if (index === -1) onlyLeft.push(item);
    else {
      both.push({ cents: item.cents, leftLine: item.line, rightLine: pool[index].line });
      pool.splice(index, 1);
    }
  }
  const total = (list: ParsedAmount[]) => list.reduce((sum, item) => sum + item.cents, 0);
  const leftTotal = total(left.amounts);
  const rightTotal = total(right.amounts);
  return { left, right, both, onlyLeft, onlyRight: pool, leftTotal, rightTotal, gap: leftTotal - rightTotal };
}
