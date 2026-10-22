/**
 * The daily AI writing allowance, shared by every Writing studio mode (and by
 * the writing apps before them). Unchanged by the studio:
 *  - 5 AI writes a day free, 30 with Midnry Pass, no limit for admins;
 *  - AI_DAILY_FREE and AI_DAILY_PASS on the server change the numbers;
 *  - the day is the GMT date, so it resets at 1 am Nigeria time.
 * A write is counted only when the AI succeeds (ai-write.functions.ts).
 */
export const AI_DAILY_DEFAULTS = { free: 5, pass: 30 } as const;

export function dailyLimit(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/** Writes allowed today, or null for no limit. */
export function aiDailyLimit(env: Record<string, string | undefined>, who: { admin: boolean; hasPass: boolean }): number | null {
  if (who.admin) return null;
  return who.hasPass ? dailyLimit(env.AI_DAILY_PASS, AI_DAILY_DEFAULTS.pass) : dailyLimit(env.AI_DAILY_FREE, AI_DAILY_DEFAULTS.free);
}

/** The allowance's day: the GMT date. */
export function aiDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
