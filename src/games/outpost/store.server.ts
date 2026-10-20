import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { readAccount } from "@/lib/account.server";
import {
  accountEmail,
  paystack,
  readBillingConfig,
  requestOrigin,
  type PaystackCharge,
} from "@/lib/paystack.server";
import { CURRENCIES, FINISHES } from "../../../public/games/outpost-finishes.js";
import { OutpostError } from "./rooms.server";

// Outpost Zero store: one-time cosmetic purchases (weapon finishes) paid with
// Paystack. Prices come from the shared catalog, never from the client. An
// item is owned once its charge has been verified with Paystack, either when
// the player returns from checkout (confirm) or by the signed webhook.

// The Paystack account takes both; the buyer picks one in the Locker.
type Currency = "NGN" | "USD";
const currencyOf = (value: unknown): Currency =>
  CURRENCIES.includes(value as Currency) ? (value as Currency) : "NGN";
const REFERENCE = /^oz[a-f0-9]{24}$/;

type Finish = (typeof FINISHES)[number];
const premium = (id: unknown): Finish | null => {
  const item = FINISHES.find((f) => f.id === id) as Finish | undefined;
  return item?.kind === "premium" && item.price ? item : null;
};

async function owned(userId: string): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql<{ item: string }>`select item from outpost_purchase
    where user_id = ${userId} and status = 'paid'`;
  return rows.map((r) => r.item);
}

/** What the Locker needs: the store state for this account. */
export async function storeState(userId: string) {
  const account = await readAccount(userId);
  return {
    ready: readBillingConfig().ready,
    currencies: CURRENCIES,
    owned: await owned(userId),
    pass: account.hasPass,
  };
}

/** Start a Paystack checkout for one item; returns the checkout page. */
export async function beginPurchase(userId: string, itemId: unknown, currencyId?: unknown) {
  const item = premium(itemId);
  if (!item) throw new OutpostError("That item isn't for sale.");
  if (!readBillingConfig().ready) throw new OutpostError("The store isn't open yet.", 503);
  if ((await owned(userId)).includes(item.id)) return { already: true };
  const sql = await getSql();
  const recent = await sql<{ n: number }>`select count(*)::int as n from outpost_purchase
    where user_id = ${userId} and created_at > now() - interval '1 hour'`;
  if (Number(recent[0]?.n ?? 0) >= 20) throw new OutpostError("Too many checkouts. Try again later.", 429);
  const currency = currencyOf(currencyId),
    amount = item.price![currency];
  const reference = `oz${randomBytes(12).toString("hex")}`;
  await sql`insert into outpost_purchase (reference, user_id, item, amount, currency)
    values (${reference}, ${userId}, ${item.id}, ${amount}, ${currency})`;
  const started = await paystack<{ authorization_url?: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: await accountEmail(userId),
      amount,
      currency,
      reference,
      callback_url: `${requestOrigin()}/games/outpost-zero?purchase=${reference}`,
      metadata: { user_id: userId, purpose: "outpost_item", item: item.id },
    },
  });
  if (!started.authorization_url) throw new OutpostError("Paystack did not return a checkout page.", 502);
  return { url: started.authorization_url };
}

/** Mark a verified charge paid. Every field must match the pending row. */
async function settle(charge: PaystackCharge, userId?: string) {
  if (charge.status !== "success") throw new OutpostError("The payment is not complete yet.");
  const reference = charge.reference ?? "";
  if (!REFERENCE.test(reference)) throw new OutpostError("Unknown payment.");
  const sql = await getSql();
  const rows = await sql<{ user_id: string; item: string; amount: number; currency: string; status: string }>`
    select user_id, item, amount, currency, status from outpost_purchase where reference = ${reference}`;
  const row = rows[0];
  if (!row) throw new OutpostError("Unknown payment.");
  if (userId && row.user_id !== userId) throw new OutpostError("This payment belongs to another account.");
  if (charge.metadata?.user_id && charge.metadata.user_id !== row.user_id)
    throw new OutpostError("This payment belongs to another account.");
  if (charge.metadata?.item && charge.metadata.item !== row.item) throw new OutpostError("Payment mismatch.");
  if (Number(charge.amount) !== Number(row.amount) || charge.currency?.toUpperCase() !== row.currency)
    throw new OutpostError("Payment amount mismatch.");
  if (row.status === "paid") return row.item;
  // A second paid row for the same item would break the owned index:
  // if this account already owns it (a double checkout), keep the record.
  const already = await sql<{ n: number }>`select count(*)::int as n from outpost_purchase
    where user_id = ${row.user_id} and item = ${row.item} and status = 'paid'`;
  await sql`update outpost_purchase set status = ${Number(already[0]?.n) ? "duplicate" : "paid"},
    paid_at = coalesce(${charge.paid_at ?? null}::timestamptz, now()) where reference = ${reference}`;
  return row.item;
}

/** The player is back from checkout: verify the charge with Paystack. */
export async function confirmPurchase(userId: string, reference: unknown) {
  if (typeof reference !== "string" || !REFERENCE.test(reference)) throw new OutpostError("Unknown payment.");
  const charge = await paystack<PaystackCharge>(`/transaction/verify/${encodeURIComponent(reference)}`);
  const item = await settle(charge, userId);
  return { item, ...(await storeState(userId)) };
}

/** Signed webhook (charge.success with purpose "outpost_item"). */
export async function applyItemCharge(charge: PaystackCharge) {
  try {
    await settle(charge);
  } catch (error) {
    // A mismatched or unknown charge is ignored, not retried.
    if (!(error instanceof OutpostError)) throw error;
    console.error("[outpost] Store webhook ignored", error.message);
  }
}

export type StoreSales = {
  /** Last 30 days, per currency (smallest unit). */
  revenue30: { currency: string; amount: number }[];
  sales30: number;
  buyers30: number;
  items: { item: string; sales: number; revenue: { currency: string; amount: number }[] }[];
};

/** Owner's view: paid sales (amounts per currency, smallest unit). */
export async function storeSales(): Promise<StoreSales> {
  const sql = await getSql();
  const totals = await sql<{ sales: number; buyers: number }>`
    select count(*)::int as sales, count(distinct user_id)::int as buyers
    from outpost_purchase where status = 'paid' and paid_at > now() - interval '30 days'`;
  const revenue = await sql<{ currency: string; amount: number }>`
    select currency, coalesce(sum(amount), 0)::bigint as amount from outpost_purchase
    where status = 'paid' and paid_at > now() - interval '30 days' group by currency order by currency desc`;
  const rows = await sql<{ item: string; currency: string; sales: number; amount: number }>`
    select item, currency, count(*)::int as sales, coalesce(sum(amount), 0)::bigint as amount
    from outpost_purchase where status = 'paid' group by item, currency`;
  const items = new Map<string, { item: string; sales: number; revenue: { currency: string; amount: number }[] }>();
  for (const r of rows) {
    const entry = items.get(r.item) ?? { item: r.item, sales: 0, revenue: [] };
    entry.sales += Number(r.sales);
    entry.revenue.push({ currency: r.currency, amount: Number(r.amount) });
    items.set(r.item, entry);
  }
  return {
    revenue30: revenue.map((r) => ({ currency: r.currency, amount: Number(r.amount) })),
    sales30: Number(totals[0]?.sales ?? 0),
    buyers30: Number(totals[0]?.buyers ?? 0),
    items: [...items.values()].sort((a, b) => b.sales - a.sales),
  };
}
