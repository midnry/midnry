import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { docTier } from "@/lib/merged-docs";
import { readAccount } from "@/lib/account.server";
import { readIsAdmin } from "@/lib/community.functions";
import type { AccountState } from "@/lib/access";
import { DOC_LIMITS, docLimit } from "@/lib/doc-limits";
import { readDoc, writeDoc } from "@/lib/app-docs.server";

/** Requests above every app's limit are refused before parsing. */
const HARD_LIMIT = Math.max(...Object.values(DOC_LIMITS)) + 1_000;

async function gate(
  userId: string,
  slug: string,
): Promise<{ ok: true } | { ok: false; error: "locked" }> {
  const tier = docTier(slug);
  if (!tier) throw new Error("Unknown app");
  if (tier === "free") return { ok: true };
  if (await readIsAdmin(userId)) return { ok: true };
  const account = await readAccount(userId);
  if (!account.hasPass) return { ok: false, error: "locked" };
  return { ok: true };
}

export const getAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccountState> => {
    return readAccount(context.userId);
  });

export const loadDoc = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (typeof slug !== "string" || !docTier(slug)) throw new Error("Unknown app");
    return slug;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: slug }) => {
    const allowed = await gate(context.userId, slug);
    if (!allowed.ok) return allowed;
    const sql = await getSql();
    const today = new Date().toISOString().slice(0, 10);
    await sql`
      insert into catalog_uses (slug, user_id, used_on)
      values (${slug}, ${context.userId}, ${today})
      on conflict do nothing
    `;
    const doc = await readDoc(sql, context.userId, slug);
    // `owner` keys this browser's recovery copy of unsaved changes per account
    // (src/lib/doc-recovery.ts); it is the signed-in person's own id.
    return { ok: true as const, payload: doc.payload, revision: doc.revision, owner: context.userId };
  });

export type SaveDocResult =
  | { ok: true; revision: number }
  | { ok: false; error: "locked" }
  | { ok: false; error: "conflict"; revision: number }
  | { ok: false; error: "refresh_required"; revision: number }
  | { ok: false; error: "too_large"; limit: number };

export const saveDoc = createServerFn({ method: "POST" })
  .validator((input: { slug: string; payload: string; baseRevision?: number }) => {
    if (!input || typeof input.slug !== "string" || typeof input.payload !== "string") {
      throw new Error("Invalid document");
    }
    if (!docTier(input.slug)) throw new Error("Unknown app");
    if (input.payload.length > HARD_LIMIT) throw new Error("Document is too large");
    const base = input.baseRevision;
    if (base !== undefined && (typeof base !== "number" || !Number.isInteger(base) || base < 0)) {
      throw new Error("Invalid revision");
    }
    try {
      JSON.parse(input.payload);
    } catch {
      throw new Error("Invalid document");
    }
    return { slug: input.slug, payload: input.payload, baseRevision: base };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<SaveDocResult> => {
    const allowed = await gate(context.userId, data.slug);
    if (!allowed.ok) return allowed;
    const limit = docLimit(data.slug);
    if (data.payload.length > limit) return { ok: false, error: "too_large", limit };
    const sql = await getSql();
    // Without a base revision (an outdated open tab) the save is refused with
    // "refresh_required" once the row has a revision; see app-docs.server.ts.
    return writeDoc(sql, context.userId, data.slug, data.payload, data.baseRevision);
  });
