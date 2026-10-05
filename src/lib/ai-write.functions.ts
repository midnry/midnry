import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Piece } from "@/lib/writers";

export type AiWriteResult =
  | { ok: true; pieces: Piece[]; left: number | null }
  | { ok: false; reason: "off" | "error" | "busy" | "limit"; limit?: number; hasPass?: boolean };

/** Writers that use AI when the site has a key. The page checks this before calling. */
export const AI_WRITERS = new Set([
  "cold-email",
  "ad-copy",
  "captions",
  "listing",
  "letters",
  "remarks",
  "lesson",
  "outliner",
  "case-brief",
  "soap-note",
  "readme",
  "digest",
  "contract-scan",
  "explainer",
  "bug-scan",
]);

function dailyLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export const aiWrite = createServerFn({ method: "POST" })
  .validator((input: { slug: string; values: Record<string, string>; variant: number }) => {
    const slug = typeof input?.slug === "string" ? input.slug : "";
    if (!AI_WRITERS.has(slug)) throw new Error("This app doesn't use AI writing.");
    const values: Record<string, string> = {};
    if (input?.values && typeof input.values === "object") {
      for (const [key, value] of Object.entries(input.values).slice(0, 20)) {
        if (typeof value === "string" && /^[a-z]{1,20}$/.test(key)) values[key] = value.slice(0, 15_000);
      }
    }
    const variant = Number.isFinite(input?.variant) ? Math.max(0, Math.min(50, Math.floor(input.variant))) : 0;
    return { slug, values, variant };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<AiWriteResult> => {
    const { aiConfigured, aiWrite: write } = await import("@/lib/ai-write.server");
    if (!aiConfigured()) return { ok: false, reason: "off" };
    const sql = await getSql();
    const { readIsAdmin } = await import("@/lib/community.functions");
    const { readAccount } = await import("@/lib/account.server");
    const admin = await readIsAdmin(context.userId);
    const hasPass = admin || (await readAccount(context.userId)).hasPass;
    const limit = admin ? null : hasPass ? dailyLimit("AI_DAILY_PASS", 30) : dailyLimit("AI_DAILY_FREE", 5);
    const today = new Date().toISOString().slice(0, 10);
    const rows = await sql<{ count: number }>`select count from ai_writes where user_id = ${context.userId} and used_on = ${today}`;
    const used = Number(rows[0]?.count ?? 0);
    if (limit !== null && used >= limit) return { ok: false, reason: "limit", limit, hasPass };

    const result = await write(data.slug, data.values, data.variant);
    if (!result.ok) return result;
    await sql`
      insert into ai_writes (user_id, used_on, count) values (${context.userId}, ${today}, 1)
      on conflict (user_id, used_on) do update set count = ai_writes.count + 1
    `;
    return { ok: true, pieces: result.pieces, left: limit === null ? null : Math.max(0, limit - used - 1) };
  });
