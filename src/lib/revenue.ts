export const CREATOR_POOL_PERCENT = 70;
export const MAX_APPS_PER_OWNER = 12;
export const MAX_HTML_CHARS = 80_000;

/**
 * The creator pool for a month: 70% of Midnry Pass revenue after payment
 * fees and refunds, never below zero. All amounts in USD cents.
 */
export function poolFromPayments(grossCents: number, feesCents: number, refundsCents: number): number {
  const net = grossCents - feesCents - refundsCents;
  if (!Number.isFinite(net) || net <= 0) return 0;
  return Math.floor((net * CREATOR_POOL_PERCENT) / 100);
}

/** An app's share of the pool: one person counts once per app per day; own opens don't count. */
export function cutCents(pool: number, uses: number, totalUses: number): number {
  if (pool <= 0 || uses <= 0 || totalUses <= 0) return 0;
  return Math.floor((pool * uses) / totalUses);
}
