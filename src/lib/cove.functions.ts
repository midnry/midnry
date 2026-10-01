import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getApp } from "@/lib/catalog";
import { readAccount } from "@/lib/account.server";
import { readIsAdmin } from "@/lib/community.functions";
import type { AccountState } from "@/lib/access";

async function gate(
  userId: string,
  slug: string,
): Promise<{ ok: true } | { ok: false; error: "locked" }> {
  const app = getApp(slug);
  if (!app) throw new Error("Unknown app");
  if (app.tier === "free") return { ok: true };
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
    if (typeof slug !== "string" || !getApp(slug)) throw new Error("Unknown app");
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
    const rows = await sql<{ payload: string }>`
      select payload from app_documents
      where user_id = ${context.userId} and app_id = ${slug}
    `;
    return { ok: true as const, payload: rows[0]?.payload ?? null };
  });

export const saveDoc = createServerFn({ method: "POST" })
  .validator((input: { slug: string; payload: string }) => {
    if (!input || typeof input.slug !== "string" || typeof input.payload !== "string") {
      throw new Error("Invalid document");
    }
    if (!getApp(input.slug)) throw new Error("Unknown app");
    if (input.payload.length > 100_000) throw new Error("Document is too large");
    try {
      JSON.parse(input.payload);
    } catch {
      throw new Error("Invalid document");
    }
    return { slug: input.slug, payload: input.payload };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const allowed = await gate(context.userId, data.slug);
    if (!allowed.ok) return allowed;
    const sql = await getSql();
    await sql`
      insert into app_documents (user_id, app_id, payload, updated_at)
      values (${context.userId}, ${data.slug}, ${data.payload}, now())
      on conflict (user_id, app_id) do update
      set payload = excluded.payload, updated_at = now()
    `;
    return { ok: true as const };
  });

