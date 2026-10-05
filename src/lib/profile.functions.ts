import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

// A 256px JPEG from the browser is ~20–40 KB; leave headroom, refuse anything bigger.
const MAX_DATA_URL_CHARS = 400_000;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function looksLikeImage(mime: string, bytes: Buffer): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 4).toString("hex") === "89504e47";
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export const saveAvatar = createServerFn({ method: "POST" })
  .validator((dataUrl: string) => {
    if (typeof dataUrl !== "string" || dataUrl.length > MAX_DATA_URL_CHARS) {
      throw new Error("That photo is too large.");
    }
    const match = DATA_URL.exec(dataUrl);
    if (!match) throw new Error("Use a JPG, PNG or WebP photo.");
    const mime = match[1];
    const bytes = Buffer.from(match[2], "base64");
    if (!looksLikeImage(mime, bytes)) throw new Error("That file isn't a photo.");
    return { mime, data: match[2] };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ url: string }> => {
    const sql = await getSql();
    await sql`
      insert into user_avatar (user_id, mime, data, updated_at)
      values (${context.userId}, ${data.mime}, ${data.data}, now())
      on conflict (user_id) do update set
        mime = excluded.mime,
        data = excluded.data,
        updated_at = now()
    `;
    return { url: `/api/avatar/${encodeURIComponent(context.userId)}?v=${Date.now()}` };
  });

export const removeAvatar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`delete from user_avatar where user_id = ${context.userId}`;
    return { ok: true };
  });
