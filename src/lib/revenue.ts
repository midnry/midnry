export const CREATOR_POOL_PERCENT = 70;
export const MAX_APPS_PER_OWNER = 12;
export const MAX_HTML_CHARS = 80_000;

export function poolCents(activePasses: number, priceCents: number): number {
  if (!Number.isFinite(activePasses) || activePasses <= 0) return 0;
  return Math.floor((activePasses * priceCents * CREATOR_POOL_PERCENT) / 100);
}

export function cutCents(pool: number, uses: number, totalUses: number): number {
  if (pool <= 0 || uses <= 0 || totalUses <= 0) return 0;
  return Math.floor((pool * uses) / totalUses);
}
