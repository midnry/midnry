/**
 * How large one saved app document may be (characters of JSON), shared by the
 * server check in cove.functions.ts and the tools that warn before the limit.
 *
 * Ledger keeps every expense in one document (about 120 characters each), so
 * it gets room for roughly 8,000 expenses. Remind keeps up to 500 tasks with
 * comments. Invoice keeps every invoice, quote, proposal and client in one
 * document (an invoice with a few lines is about 1,000 characters), so it gets
 * the same room as Ledger: several hundred documents, and it warns first.
 * Everything else is small.
 */
export const DOC_LIMITS: Record<string, number> = {
  invoice: 1_000_000,
  tasks: 600_000,
  ledger: 1_000_000,
};

export const DEFAULT_DOC_LIMIT = 100_000;

export function docLimit(slug: string): number {
  return DOC_LIMITS[slug] ?? DEFAULT_DOC_LIMIT;
}

/** Share of the limit at which a tool starts warning, before saving stops. */
export const DOC_WARN_SHARE = 0.85;
