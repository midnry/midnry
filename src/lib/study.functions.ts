import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { readAccount } from "@/lib/account.server";
import { readIsAdmin } from "@/lib/community.functions";
import { createShare, listShares, openShare, revokeShare, type CreateShareResult, type OpenShareResult, type ShareInfo } from "@/lib/study-shares.server";
import { SHARE_MAX_CHARS, isShareToken } from "@/lib/study";

// Study space share links (Midnry Pass to make, any signed-in account to open).
// Every function runs behind authMiddleware and uses the verified user id only.

/** Pass holders and admins can make links; checked here on the server, never taken from the client. */
async function canShare(userId: string): Promise<boolean> {
  if (await readIsAdmin(userId)) return true;
  return (await readAccount(userId)).hasPass;
}

export const myShares = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ canShare: boolean; shares: ShareInfo[] }> => {
    const sql = await getSql();
    return { canShare: await canShare(context.userId), shares: await listShares(sql, context.userId) };
  });

export const shareStudyItem = createServerFn({ method: "POST" })
  .validator((input: { kind: "deck" | "quiz"; item: unknown }) => {
    if (!input || (input.kind !== "deck" && input.kind !== "quiz") || !input.item || typeof input.item !== "object") {
      throw new Error("Nothing to share");
    }
    if (JSON.stringify(input.item).length > SHARE_MAX_CHARS + 50_000) throw new Error("Too large to share");
    return { kind: input.kind, item: input.item };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<CreateShareResult> => {
    const sql = await getSql();
    return createShare(sql, context.userId, await canShare(context.userId), data.kind, data.item);
  });

export const revokeStudyShare = createServerFn({ method: "POST" })
  .validator((token: string) => {
    if (!isShareToken(token)) throw new Error("Unknown link");
    return token;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: token }): Promise<{ ok: boolean }> => {
    const sql = await getSql();
    return { ok: await revokeShare(sql, context.userId, token) };
  });

export const openStudyShare = createServerFn({ method: "GET" })
  .validator((token: string) => (typeof token === "string" ? token.slice(0, 64) : ""))
  .middleware([authMiddleware])
  .handler(async ({ context, data: token }): Promise<OpenShareResult> => {
    const sql = await getSql();
    return openShare(sql, context.userId, token);
  });
