import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { CLOSE_CONFIRM_WORD } from "@/lib/account-closed";
import { closeAccountRecords, isAccountClosed } from "@/lib/retention";

export type CloseInput = { confirm: string; password?: string };

export type CloseResult =
  | { ok: true }
  | { ok: false; reason: "confirm" | "password" | "stale" | "billing"; message: string };

function authHeaders(bearerToken?: string): Headers {
  const request = getRequest();
  const headers = new Headers(request?.headers);
  if (bearerToken) headers.set("Authorization", `Bearer ${bearerToken}`);
  return headers;
}

/**
 * Re-authenticate before closing. With a password on the account, the
 * password is required. Without one (Google-only), the session must be
 * fresh in Better Auth's sense: created within `session.freshAge` (Better
 * Auth's default, 24 hours), read from the database, not the cookie cache.
 */
async function reauthenticate(userId: string, password: string | undefined, bearerToken?: string): Promise<CloseResult> {
  const { auth } = await import("@/lib/auth/server");
  const headers = authHeaders(bearerToken);
  const sql = await getSql();
  const credential = await sql<{ n: number }>`
    select count(*)::int as n from "account"
    where "userId" = ${userId} and "providerId" = 'credential' and "password" is not null
  `;
  if (Number(credential[0]?.n ?? 0) > 0) {
    if (!password) return { ok: false, reason: "password", message: "Enter your password." };
    try {
      const result = await auth.api.verifyPassword({ body: { password }, headers });
      if (!result?.status) throw new Error("invalid");
    } catch {
      return { ok: false, reason: "password", message: "That password isn't right." };
    }
    return { ok: true };
  }

  const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
  const ctx = await auth.$context;
  const freshMs = ctx.sessionConfig.freshAge * 1000;
  const createdAt = session?.session ? new Date(session.session.createdAt).getTime() : 0;
  if (!session?.user || session.user.id !== userId || (freshMs > 0 && Date.now() - createdAt >= freshMs)) {
    return {
      ok: false,
      reason: "stale",
      message: "For your safety, sign in again, then come back here to delete your account.",
    };
  }
  return { ok: true };
}

/** Cancel a renewing Midnry Pass through the normal billing path. */
async function cancelPassRenewal(userId: string): Promise<CloseResult> {
  const sql = await getSql();
  const rows = await sql<{ status: string; paystack_subscription_code: string | null }>`
    select status, paystack_subscription_code from subscriptions where user_id = ${userId}
  `;
  const row = rows[0];
  if (!row?.paystack_subscription_code || row.status !== "active") return { ok: true };
  try {
    const billing = await import("@/lib/paystack.server");
    await billing.cancelRenewal(userId);
    return { ok: true };
  } catch (error) {
    console.error("[account] renewal cancel failed:", error instanceof Error ? error.message : "unknown");
    return {
      ok: false,
      reason: "billing",
      message:
        "We couldn't cancel your Midnry Pass renewal, so your account is still open. Try again in a minute, or email hello@midnry.com.",
    };
  }
}

export async function closeAccount(userId: string, input: CloseInput, bearerToken?: string): Promise<CloseResult> {
  if (input.confirm.trim() !== CLOSE_CONFIRM_WORD) {
    return { ok: false, reason: "confirm", message: `Type ${CLOSE_CONFIRM_WORD} to confirm.` };
  }
  const sql = await getSql();
  if (await isAccountClosed(sql, userId)) return { ok: true };

  const reauth = await reauthenticate(userId, input.password, bearerToken);
  if (!reauth.ok) return reauth;

  // Billing first: if the renewal can't be cancelled, the account stays open
  // rather than leaving a closed account that is still charged.
  const billing = await cancelPassRenewal(userId);
  if (!billing.ok) return billing;

  const { leftProjects } = await closeAccountRecords(sql, userId);
  if (leftProjects.length) {
    const { unassign } = await import("@/lib/remind.functions");
    for (const projectId of leftProjects) {
      await unassign(sql, projectId, userId).catch(() => undefined);
    }
  }
  return { ok: true };
}
