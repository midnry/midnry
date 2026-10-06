import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

// Abuja Hustle progress, saved on the player's account. One save per account,
// stored with the other per-app documents.
const APP_ID = "game:abuja-hustle";
const MAX = 400_000;

export const loadGame = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const today = new Date().toISOString().slice(0, 10);
    // Counted with app use, so the admin's Stats page sees who plays.
    await sql`
      insert into catalog_uses (slug, user_id, used_on)
      values ('abuja-hustle', ${context.userId}, ${today})
      on conflict do nothing
    `;
    const rows = await sql<{ payload: string }>`
      select payload from app_documents where user_id = ${context.userId} and app_id = ${APP_ID}
    `;
    return { payload: rows[0]?.payload ?? null };
  });

export const saveGame = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((payload: string | null) => {
    if (payload !== null && (typeof payload !== "string" || payload.length > MAX)) throw new Error("Save is too large.");
    if (payload) JSON.parse(payload);
    return payload;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data === null) {
      await sql`delete from app_documents where user_id = ${context.userId} and app_id = ${APP_ID}`;
      return { ok: true as const };
    }
    await sql`
      insert into app_documents (user_id, app_id, payload, updated_at)
      values (${context.userId}, ${APP_ID}, ${data}, now())
      on conflict (user_id, app_id) do update set payload = excluded.payload, updated_at = now()
    `;
    return { ok: true as const };
  });
