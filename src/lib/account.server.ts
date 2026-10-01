import { getSql } from "@/lib/db";
import {
  emptyAccount,
  passIsOpen,
  PASS_PRICE_CENTS,
  type AccountState,
  type AccountStatus,
} from "@/lib/access";

type SubRow = {
  status: string;
  current_period_end: unknown;
  paystack_subscription_code: string | null;
  paystack_reference: string | null;
};

function asIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function asStatus(value: string): AccountStatus {
  if (value === "active" || value === "canceled") return value;
  return "inactive";
}

function toAccount(row: SubRow | undefined): AccountState {
  if (!row?.paystack_subscription_code && !row?.paystack_reference) return emptyAccount();
  const currentPeriodEnd = asIso(row.current_period_end);
  const status = asStatus(row.status);
  return {
    hasPass: passIsOpen(status, currentPeriodEnd),
    status,
    currentPeriodEnd,
    priceCents: PASS_PRICE_CENTS,
  };
}

export async function readAccount(userId: string): Promise<AccountState> {
  const sql = await getSql();
  const rows = await sql<SubRow>`
    select status, current_period_end, paystack_subscription_code, paystack_reference
    from subscriptions
    where user_id = ${userId}
  `;
  return toAccount(rows[0]);
}
