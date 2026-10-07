import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

// Abuja Hustle progress, saved on the player's account: up to three lives,
// stored with the other per-app documents. Slot 1 keeps the original id.
const APP_ID = "game:abuja-hustle";
const appId = (slot: number) => (slot === 1 ? APP_ID : `${APP_ID}:${slot}`);
const SLOTS = [1, 2, 3];
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
    const rows = await sql<{ app_id: string; payload: string }>`
      select app_id, payload from app_documents where user_id = ${context.userId} and app_id = any(${SLOTS.map(appId)}::text[])
    `;
    const bySlot = SLOTS.map((n) => rows.find((r) => r.app_id === appId(n))?.payload ?? null);
    return { payload: bySlot[0] ?? null, slots: bySlot };
  });

export const saveGame = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string | null | { slot: number; payload: string | null }) => {
    // A bare payload is slot 1 (older clients).
    const { slot, payload } = input !== null && typeof input === "object" ? input : { slot: 1, payload: input };
    if (!SLOTS.includes(slot)) throw new Error("No such save slot.");
    if (payload !== null && (typeof payload !== "string" || payload.length > MAX)) throw new Error("Save is too large.");
    if (payload) JSON.parse(payload);
    return { slot, payload };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = appId(data.slot);
    if (data.payload === null) {
      await sql`delete from app_documents where user_id = ${context.userId} and app_id = ${id}`;
      return { ok: true as const };
    }
    await sql`
      insert into app_documents (user_id, app_id, payload, updated_at)
      values (${context.userId}, ${id}, ${data.payload}, now())
      on conflict (user_id, app_id) do update set payload = excluded.payload, updated_at = now()
    `;
    return { ok: true as const };
  });
