import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { aiDailyLimit } from "@/lib/ai-allowance";
import type { Piece } from "@/lib/writers";

export type AiWriteResult =
  | { ok: true; pieces: Piece[]; left: number | null; styled?: boolean }
  | { ok: false; reason: "off" | "error" | "busy" | "limit"; limit?: number; hasPass?: boolean };

/**
 * Writers that use AI when the site has a key: the Writing studio's modes,
 * by their old app slugs (the AI rules in ai-write.server.ts use the same).
 */
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

export const aiWrite = createServerFn({ method: "POST" })
  .validator((input: { slug: string; values: Record<string, string>; variant: number; style?: boolean }) => {
    const slug = typeof input?.slug === "string" ? input.slug : "";
    if (!AI_WRITERS.has(slug)) throw new Error("This app doesn't use AI writing.");
    const values: Record<string, string> = {};
    if (input?.values && typeof input.values === "object") {
      for (const [key, value] of Object.entries(input.values).slice(0, 20)) {
        if (typeof value === "string" && /^[a-z]{1,20}$/.test(key)) values[key] = value.slice(0, 15_000);
      }
    }
    const variant = Number.isFinite(input?.variant) ? Math.max(0, Math.min(50, Math.floor(input.variant))) : 0;
    return { slug, values, variant, style: input?.style === true };
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
    const limit = aiDailyLimit(process.env, { admin, hasPass });
    const today = new Date().toISOString().slice(0, 10);
    const rows = await sql<{ count: number }>`select count from ai_writes where user_id = ${context.userId} and used_on = ${today}`;
    const used = Number(rows[0]?.count ?? 0);
    if (limit !== null && used >= limit) return { ok: false, reason: "limit", limit, hasPass };

    // The saved house style is a Pass extra (Writing studio): read it here, never from the browser.
    let style = "";
    if (data.style && hasPass) {
      const { readSettings } = await import("@/lib/studio.server");
      const { styleInstruction } = await import("@/lib/studio");
      style = styleInstruction((await readSettings(sql, context.userId)).settings.style);
    }

    const result = await write(data.slug, data.values, data.variant, style);
    if (!result.ok) return result;
    await sql`
      insert into ai_writes (user_id, used_on, count) values (${context.userId}, ${today}, 1)
      on conflict (user_id, used_on) do update set count = ai_writes.count + 1
    `;
    return { ok: true, pieces: result.pieces, left: limit === null ? null : Math.max(0, limit - used - 1), styled: Boolean(style) };
  });
