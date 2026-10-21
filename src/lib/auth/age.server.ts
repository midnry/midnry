import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getOAuthState } from "better-auth/api";
import { AGE_REQUIRED_CODE, AGE_SIGNUP_MESSAGE } from "../age";

/**
 * Sign-up age confirmation ("I'm 13 or older, or I have a parent's or
 * guardian's permission"), enforced on every path that creates an account.
 *
 * Every new account, whatever the path, is one `user` row insert, so the
 * check sits on that write (`databaseHooks.user.create.before`) and stamps
 * `age_confirmed_at`. The confirmation itself travels with the request that
 * creates the account:
 *
 *  - Email sign-up: `ageConfirmed: true` in the `/sign-up/email` body. A
 *    before-hook refuses the request without it, with a readable message.
 *  - Google (direct) and the Grok broker providers: the login page passes
 *    `additionalData: { ageConfirmed: true }` when it starts OAuth. Better
 *    Auth keeps that inside its own signed, server-checked OAuth state (10
 *    minutes), and hands it back on the callback (`getOAuthState`). Without
 *    it the account is not created and the callback sends the person to
 *    /login?error=AGE_CONFIRMATION_REQUIRED, which shows the message.
 *
 * Signing in to an account that already exists never creates a user row, so
 * it is never asked. Any other creation path (for example the Grok preview's
 * zero-click gate identity) carries no confirmation and is refused the same
 * way; that person signs up from /login with the box ticked.
 */
function ageRequired(message: string): APIError {
  return new APIError("BAD_REQUEST", { message, code: AGE_REQUIRED_CODE });
}

type HookContext = { path?: string; body?: unknown } | null | undefined;

async function confirmedFor(ctx: HookContext): Promise<boolean> {
  if (ctx?.path === "/sign-up/email") return (ctx.body as { ageConfirmed?: unknown } | undefined)?.ageConfirmed === true;
  try {
    const state = await getOAuthState();
    return (state as { ageConfirmed?: unknown } | null)?.ageConfirmed === true;
  } catch {
    return false;
  }
}

export function ageConfirmationGuard(): BetterAuthPlugin {
  return {
    id: "age-confirmation-guard",
    schema: {
      user: {
        fields: {
          // Server-stamped only: clients can never set or change it.
          ageConfirmedAt: { type: "date", required: false, input: false, fieldName: "age_confirmed_at" },
        },
      },
    },
    init() {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                before: async (user: Record<string, unknown>, ctx: HookContext) => {
                  if (!(await confirmedFor(ctx))) {
                    // OAuth callbacks turn the message into `?error=`, so it
                    // must be the bare code there.
                    throw ageRequired(ctx?.path === "/sign-up/email" ? AGE_SIGNUP_MESSAGE : AGE_REQUIRED_CODE);
                  }
                  return { data: { ...user, ageConfirmedAt: new Date() } };
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
            if ((ctx.body as { ageConfirmed?: unknown } | undefined)?.ageConfirmed !== true) {
              throw ageRequired(AGE_SIGNUP_MESSAGE);
            }
          }),
        },
      ],
    },
  };
}
