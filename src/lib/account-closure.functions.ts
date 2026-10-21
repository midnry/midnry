import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { CloseInput, CloseResult } from "@/lib/account-closure.server";

export type { CloseResult };

/**
 * Close the signed-in person's own account. The account is always the one
 * from the verified session (context.userId); the client sends only the
 * typed confirmation and, for accounts with a password, the password.
 */
export const closeAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CloseInput): CloseInput => {
    const confirm = typeof input?.confirm === "string" ? input.confirm.slice(0, 32) : "";
    const password = typeof input?.password === "string" && input.password ? input.password.slice(0, 512) : undefined;
    return { confirm, password };
  })
  .handler(async ({ context, data }): Promise<CloseResult> => {
    const server = await import("@/lib/account-closure.server");
    const bearerToken = (context as { bearerToken?: string }).bearerToken;
    return server.closeAccount(context.userId, data, bearerToken);
  });
