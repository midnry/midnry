import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getSql } from "../db";
import { ACCOUNT_CLOSED_CODE, ACCOUNT_CLOSED_MESSAGE } from "../account-closed";

/**
 * Refuses sign-in to an account that was closed (a row in account_closure).
 *
 * Every sign-in path (email and password, Google, the Grok broker, the gate)
 * ends in Better Auth creating a session row, so the guard sits on that one
 * write. For email sign-in the client receives the message; for OAuth the
 * callback redirects to its error URL (/login) with `error=ACCOUNT_CLOSED`,
 * which the login page turns into the same message. Signing up again with the
 * closed account's email gets the same answer instead of "already exists".
 */
function closedError(): APIError {
  return new APIError("FORBIDDEN", { message: ACCOUNT_CLOSED_MESSAGE, code: ACCOUNT_CLOSED_CODE });
}

async function closedById(userId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`select user_id from account_closure where user_id = ${userId}`;
  return rows.length > 0;
}

async function closedByEmail(email: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select c.user_id from account_closure c join "user" u on u.id = c.user_id
    where lower(u.email) = lower(${email})
  `;
  return rows.length > 0;
}

export function closedAccountGuard(): BetterAuthPlugin {
  return {
    id: "closed-account-guard",
    init() {
      return {
        options: {
          databaseHooks: {
            session: {
              create: {
                before: async (session: { userId: string }) => {
                  if (await closedById(session.userId)) throw closedError();
                },
              },
            },
          },
        },
      };
    },
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === "/sign-up/email",
          handler: createAuthMiddleware(async (ctx) => {
            const email = (ctx.body as { email?: unknown } | undefined)?.email;
            if (typeof email === "string" && email && (await closedByEmail(email))) throw closedError();
          }),
        },
      ],
    },
  };
}
