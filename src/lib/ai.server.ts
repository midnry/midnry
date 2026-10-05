import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";
import { readIsAdmin } from "@/lib/community.functions";

// AI requests one person can make per day across the writing apps, Planner, and
// Apply. The site's key pays for them, so the cap keeps the bill predictable.
// AI_DAILY_LIMIT on the server overrides it. The admin is not limited.
const DEFAULT_LIMIT = 30;

export const AI_OFF = "AI writing is still being set up on Midnry. Please check back soon.";

export function aiKey(): string | undefined {
  return env("XAI_API_KEY");
}

function dailyLimit(): number {
  const raw = Number(env("AI_DAILY_LIMIT"));
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_LIMIT;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Null when the person may make `cost` more AI requests today, else a message saying why not. */
export async function aiBlocked(userId: string, cost = 1): Promise<string | null> {
  if (!aiKey()) return AI_OFF;
  if (await readIsAdmin(userId)) return null;
  const sql = await getSql();
  const rows = await sql<{ count: number }>`
    select count from ai_uses where user_id = ${userId} and used_on = ${today()}
  `;
  const used = Number(rows[0]?.count ?? 0);
  const limit = dailyLimit();
  if (used + cost > limit) {
    return `You have used today's ${limit} AI requests. They reset at midnight (UTC).`;
  }
  return null;
}

/** Count `cost` AI requests against today's allowance, after one succeeds. */
export async function recordAiUse(userId: string, cost = 1): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into ai_uses (user_id, used_on, count)
    values (${userId}, ${today()}, ${cost})
    on conflict (user_id, used_on) do update set count = ai_uses.count + ${cost}
  `;
}
