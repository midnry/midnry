// Creator pool, earnings and manual payouts. Every function takes the SQL
// runner as an argument (no import of "@/lib/db") so scripts/payouts.test.mjs
// can run the same statements against PGLite with the real migrations.
//
// Decided by Midnry Ltd:
// - Makers earn 70% of Midnry Pass revenue after payment fees and refunds,
//   shared by opens (one person counts once per app per day; own opens don't).
// - Pool for a month = 70% × (amount − fees of successful Pass charges paid
//   that month − refunds processed that month), never below zero.
// - Makers are paid by bank transfer by the 15th of the following month once
//   their balance reaches US$20 (₦20,000 for a Nigerian bank account).
//   Smaller balances roll over. The admin can withhold earnings from fake or
//   automated opens or from apps that break the rules.
// - Balances are kept in USD cents.

import { cutCents, poolFromPayments } from "@/lib/revenue";

export type Runner = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

/** Pass charges are in US dollars; only USD rows count toward the pool. */
export const POOL_CURRENCY = "USD";

/** Minimum balance before a transfer, in USD cents. */
export const MIN_PAYOUT_USD_CENTS = 2000;
/** Minimum balance for a Nigerian bank account, in naira. */
export const MIN_PAYOUT_NGN = 20_000;
/**
 * Naira per US dollar, used only to show balances "about ₦…" and to turn the
 * ₦20,000 minimum into USD cents. An estimate: update it when the rate moves.
 */
export const NGN_PER_USD_ESTIMATE = 1500;

/**
 * ESTIMATE, used only when Paystack does not report a charge's fees:
 * Paystack's published rate for international cards, 3.9% + ₦100.
 * The row is marked fees_estimated so the admin page can say so.
 */
export const ESTIMATED_INTL_CARD_FEE_PERCENT = 3.9;
export const ESTIMATED_INTL_CARD_FEE_FLAT_NGN = 100;

/** A month becomes final this many days after it ends (late webhooks). */
export const MONTH_GRACE_DAYS = 1;
/** Transfers go out by this day of the following month. */
export const PAYOUT_DAY = 15;

// ── Months ──────────────────────────────────────────────────────────────────

/** "YYYY-MM" of a date, in UTC. */
export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** First instant of a month, UTC. */
export function monthStart(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1));
}

export function nextMonthKey(key: string): string {
  const start = monthStart(key);
  return monthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)));
}

export function prevMonthKey(key: string): string {
  const start = monthStart(key);
  return monthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1)));
}

/** True once the month has ended and the grace day has passed. */
export function monthIsFinal(key: string, now: Date): boolean {
  const end = monthStart(nextMonthKey(key)).getTime();
  return now.getTime() >= end + MONTH_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

/** The date ("YYYY-MM-DD") a month's earnings are paid by. */
export function payoutDueDate(key: string): string {
  return `${nextMonthKey(key)}-${String(PAYOUT_DAY).padStart(2, "0")}`;
}

// ── Money ───────────────────────────────────────────────────────────────────

/** Estimated Paystack fee for a charge, in the charge's minor unit. */
export function estimateFeeCents(amount: number, currency: string): number {
  const percent = Math.ceil((amount * ESTIMATED_INTL_CARD_FEE_PERCENT) / 100);
  const flat =
    currency.toUpperCase() === "NGN"
      ? ESTIMATED_INTL_CARD_FEE_FLAT_NGN * 100
      : Math.ceil((ESTIMATED_INTL_CARD_FEE_FLAT_NGN * 100) / NGN_PER_USD_ESTIMATE);
  return percent + flat;
}

/** The minimum balance for a transfer to a bank in this country, in USD cents. */
export function minimumCents(country: string | null | undefined): number {
  if (country === "NG") return Math.ceil((MIN_PAYOUT_NGN * 100) / NGN_PER_USD_ESTIMATE);
  return MIN_PAYOUT_USD_CENTS;
}

/** Whole naira, about, for USD cents. */
export function aboutNaira(cents: number): number {
  return Math.round((cents / 100) * NGN_PER_USD_ESTIMATE);
}

// ── Recording payments ──────────────────────────────────────────────────────

export type ChargeInput = {
  reference?: string | null;
  amount?: number | string | null;
  fees?: number | string | null;
  currency?: string | null;
  paid_at?: string | null;
  paidAt?: string | null;
};

export type RefundInput = {
  id?: number | string | null;
  transaction_reference?: string | null;
  refund_reference?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  refunded_at?: string | null;
};

function wholeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function isoOr(value: string | null | undefined, fallback: Date): string {
  if (value) {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return fallback.toISOString();
}

/**
 * Record one successful Midnry Pass charge. Idempotent by reference: the
 * webhook and the checkout confirmation can both report the same payment.
 * A later report with real fees replaces an estimate.
 */
export async function recordPassCharge(sql: Runner, charge: ChargeInput, now = new Date()): Promise<void> {
  const reference = charge.reference?.trim();
  const amount = wholeNumber(charge.amount);
  const currency = charge.currency?.trim().toUpperCase();
  if (!reference || amount === null || amount <= 0 || !currency) return;
  const reported = wholeNumber(charge.fees);
  const estimated = reported === null;
  const fees = estimated ? estimateFeeCents(amount, currency) : reported;
  await sql.query(
    `insert into pass_payments (id, kind, reference, amount_cents, fees_cents, fees_estimated, currency, occurred_at)
     values ($1, 'charge', $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set fees_cents = excluded.fees_cents, fees_estimated = false
       where pass_payments.fees_estimated and not excluded.fees_estimated`,
    [`charge:${reference}`, reference, amount, fees, estimated, currency, isoOr(charge.paid_at ?? charge.paidAt, now)],
  );
}

/**
 * Record a processed refund of a Midnry Pass charge. Refunds of anything else
 * (store items) are ignored. Idempotent by the refund's id. Returns whether
 * the refund counts toward the pool.
 */
export async function recordPassRefund(sql: Runner, refund: RefundInput, now = new Date()): Promise<boolean> {
  const reference = refund.transaction_reference?.trim();
  const amount = wholeNumber(refund.amount);
  const currency = refund.currency?.trim().toUpperCase();
  if (!reference || amount === null || amount <= 0 || !currency) return false;
  const known = await sql.query<{ n: number }>(
    `select count(*)::int as n from (
       select 1 from pass_payments where kind = 'charge' and reference = $1
       union all
       select 1 from subscriptions where paystack_reference = $1
     ) t`,
    [reference],
  );
  if (!Number(known[0]?.n)) return false;
  const key = refund.id ?? refund.refund_reference ?? `${reference}:${amount}`;
  await sql.query(
    `insert into pass_payments (id, kind, reference, amount_cents, fees_cents, fees_estimated, currency, occurred_at)
     values ($1, 'refund', $2, $3, 0, false, $4, $5)
     on conflict (id) do nothing`,
    [`refund:${String(key)}`, reference, amount, currency, isoOr(refund.refunded_at, now)],
  );
  return true;
}

// ── The pool ────────────────────────────────────────────────────────────────

export type Pool = {
  month: string;
  grossCents: number;
  feesCents: number;
  refundsCents: number;
  poolCents: number;
  charges: number;
  /** Charges whose fees Paystack did not report, so they were estimated. */
  estimatedFees: number;
};

export async function poolForMonth(sql: Runner, key: string): Promise<Pool> {
  const rows = await sql.query<{ gross: unknown; fees: unknown; refunds: unknown; charges: unknown; estimated: unknown }>(
    `select coalesce(sum(amount_cents) filter (where kind = 'charge'), 0)::bigint as gross,
            coalesce(sum(fees_cents) filter (where kind = 'charge'), 0)::bigint as fees,
            coalesce(sum(amount_cents) filter (where kind = 'refund'), 0)::bigint as refunds,
            count(*) filter (where kind = 'charge')::int as charges,
            count(*) filter (where kind = 'charge' and fees_estimated)::int as estimated
       from pass_payments
      where currency = $1 and occurred_at >= $2 and occurred_at < $3`,
    [POOL_CURRENCY, monthStart(key).toISOString(), monthStart(nextMonthKey(key)).toISOString()],
  );
  const r = rows[0]!;
  const grossCents = Number(r.gross);
  const feesCents = Number(r.fees);
  const refundsCents = Number(r.refunds);
  return {
    month: key,
    grossCents,
    feesCents,
    refundsCents,
    poolCents: poolFromPayments(grossCents, feesCents, refundsCents),
    charges: Number(r.charges),
    estimatedFees: Number(r.estimated),
  };
}

export type AppShare = { appId: string; ownerId: string; name: string; uses: number; cents: number };

/** Each approved app's counted opens in a month and its share of the pool. */
export async function sharesForMonth(sql: Runner, key: string, pool: number): Promise<{ totalUses: number; apps: AppShare[] }> {
  const start = monthStart(key).toISOString().slice(0, 10);
  const end = monthStart(nextMonthKey(key)).toISOString().slice(0, 10);
  const rows = await sql.query<{ app_id: string; owner_id: string; name: string; uses: unknown }>(
    `select u.app_id, s.owner_id, coalesce(s.published_name, s.name) as name, count(*)::int as uses
       from app_uses u
       join submissions s on s.id = u.app_id
      where s.published_html is not null
        and u.user_id <> s.owner_id
        and u.used_on >= $1::date and u.used_on < $2::date
      group by u.app_id, s.owner_id, coalesce(s.published_name, s.name)
      order by u.app_id`,
    [start, end],
  );
  const totalUses = rows.reduce((sum, row) => sum + Number(row.uses), 0);
  return {
    totalUses,
    apps: rows.map((row) => ({
      appId: row.app_id,
      ownerId: row.owner_id,
      name: row.name,
      uses: Number(row.uses),
      cents: cutCents(pool, Number(row.uses), totalUses),
    })),
  };
}

/**
 * Freeze every month that has ended (plus the grace day) and has payments,
 * oldest first. Safe to run concurrently: the numbers are deterministic and
 * every insert ignores a row that already exists.
 */
export async function closeDueMonths(sql: Runner, now = new Date()): Promise<string[]> {
  const rows = await sql.query<{ month: string }>(
    `select distinct to_char(date_trunc('month', occurred_at at time zone 'UTC'), 'YYYY-MM') as month
       from pass_payments
      where occurred_at < $1
        and to_char(date_trunc('month', occurred_at at time zone 'UTC'), 'YYYY-MM-01')::date
            not in (select month from creator_months)
      order by month`,
    [monthStart(monthKey(now)).toISOString()],
  );
  const closed: string[] = [];
  for (const { month } of rows) {
    if (!monthIsFinal(month, now)) continue;
    const pool = await poolForMonth(sql, month);
    const shares = await sharesForMonth(sql, month, pool.poolCents);
    const first = `${month}-01`;
    for (const app of shares.apps) {
      if (app.cents <= 0 && app.uses <= 0) continue;
      await sql.query(
        `insert into creator_earnings (month, app_id, owner_id, app_name, uses, cents)
         values ($1::date, $2, $3, $4, $5, $6) on conflict (month, app_id) do nothing`,
        [first, app.appId, app.ownerId, app.name, app.uses, app.cents],
      );
    }
    await sql.query(
      `insert into creator_months (month, gross_cents, fees_cents, refunds_cents, pool_cents, total_uses, charges, estimated_fees)
       values ($1::date, $2, $3, $4, $5, $6, $7, $8) on conflict (month) do nothing`,
      [first, pool.grossCents, pool.feesCents, pool.refundsCents, pool.poolCents, shares.totalUses, pool.charges, pool.estimatedFees],
    );
    closed.push(month);
  }
  return closed;
}

export type ClosedMonth = Pool & { totalUses: number };

export async function closedMonths(sql: Runner): Promise<ClosedMonth[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `select to_char(month, 'YYYY-MM') as month, gross_cents, fees_cents, refunds_cents, pool_cents,
            total_uses, charges, estimated_fees
       from creator_months order by month desc`,
  );
  return rows.map((r) => ({
    month: String(r.month),
    grossCents: Number(r.gross_cents),
    feesCents: Number(r.fees_cents),
    refundsCents: Number(r.refunds_cents),
    poolCents: Number(r.pool_cents),
    totalUses: Number(r.total_uses),
    charges: Number(r.charges),
    estimatedFees: Number(r.estimated_fees),
  }));
}

// ── Balances ────────────────────────────────────────────────────────────────

export type PayoutEntry = {
  id: string;
  month: string;
  kind: "paid" | "withheld";
  amountCents: number;
  paidOn: string | null;
  transferReference: string | null;
  reason: string | null;
  createdAt: string;
};

type Ledger = {
  /** Earned per closed month. */
  earned: Map<string, number>;
  entries: PayoutEntry[];
};

async function ledgerFor(sql: Runner, ownerIds: string[] | null): Promise<Map<string, Ledger>> {
  const filter = ownerIds ? `where owner_id = any($1::text[])` : "";
  const params = ownerIds ? [ownerIds] : [];
  const earned = await sql.query<{ owner_id: string; month: string; cents: unknown }>(
    `select owner_id, to_char(month, 'YYYY-MM') as month, sum(cents)::bigint as cents
       from creator_earnings ${filter} group by owner_id, month`,
    params,
  );
  const paid = await sql.query<Record<string, unknown>>(
    `select id, owner_id, to_char(month, 'YYYY-MM') as month, kind, amount_cents,
            to_char(paid_on, 'YYYY-MM-DD') as paid_on, transfer_reference, reason,
            to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
       from creator_payouts ${filter} order by created_at, id`,
    params,
  );
  const out = new Map<string, Ledger>();
  const get = (id: string) => {
    let l = out.get(id);
    if (!l) out.set(id, (l = { earned: new Map(), entries: [] }));
    return l;
  };
  for (const row of earned) get(row.owner_id).earned.set(row.month, Number(row.cents));
  for (const row of paid) {
    get(String(row.owner_id)).entries.push({
      id: String(row.id),
      month: String(row.month),
      kind: row.kind === "withheld" ? "withheld" : "paid",
      amountCents: Number(row.amount_cents),
      paidOn: (row.paid_on as string | null) ?? null,
      transferReference: (row.transfer_reference as string | null) ?? null,
      reason: (row.reason as string | null) ?? null,
      createdAt: String(row.created_at),
    });
  }
  return out;
}

export type MonthLine = {
  month: string;
  earnedCents: number;
  /** Balance brought forward from earlier months (earned − paid − withheld). */
  carriedCents: number;
  /** carried + earned: what this month's payout cycle settles. */
  dueCents: number;
  paidCents: number;
  withheldCents: number;
  /** due − paid − withheld; rolls over to the next month. */
  remainingCents: number;
};

function monthLine(ledger: Ledger | undefined, key: string): MonthLine {
  let carried = 0;
  let earned = 0;
  let paid = 0;
  let withheld = 0;
  if (ledger) {
    for (const [m, cents] of ledger.earned) {
      if (m < key) carried += cents;
      else if (m === key) earned += cents;
    }
    for (const e of ledger.entries) {
      if (e.month < key) carried -= e.amountCents;
      else if (e.month === key) {
        if (e.kind === "paid") paid += e.amountCents;
        else withheld += e.amountCents;
      }
    }
  }
  const due = carried + earned;
  return {
    month: key,
    earnedCents: earned,
    carriedCents: carried,
    dueCents: due,
    paidCents: paid,
    withheldCents: withheld,
    remainingCents: due - paid - withheld,
  };
}

export type MakerSummary = {
  /** Unpaid balance from closed months, USD cents. */
  balanceCents: number;
  months: MonthLine[];
  history: PayoutEntry[];
};

/** A maker's own earnings and payouts. Scoped to ownerId only. */
export async function makerSummary(sql: Runner, ownerId: string): Promise<MakerSummary> {
  const ledger = (await ledgerFor(sql, [ownerId])).get(ownerId);
  const months = new Set<string>([...(ledger?.earned.keys() ?? []), ...(ledger?.entries.map((e) => e.month) ?? [])]);
  const lines = [...months].sort().map((m) => monthLine(ledger, m));
  const balance = lines.length ? lines[lines.length - 1]!.remainingCents : 0;
  return {
    balanceCents: balance,
    months: lines.reverse(),
    history: [...(ledger?.entries ?? [])].reverse(),
  };
}

export type AdminMakerLine = MonthLine & { ownerId: string; entries: PayoutEntry[] };

/** Every maker with something to settle (or settled) in a closed month. */
export async function adminMonthLines(sql: Runner, key: string): Promise<AdminMakerLine[]> {
  const ledgers = await ledgerFor(sql, null);
  const out: AdminMakerLine[] = [];
  for (const [ownerId, ledger] of ledgers) {
    const line = monthLine(ledger, key);
    if (!line.earnedCents && !line.carriedCents && !line.paidCents && !line.withheldCents) continue;
    out.push({ ...line, ownerId, entries: ledger.entries.filter((e) => e.month === key) });
  }
  return out.sort((a, b) => b.dueCents - a.dueCents || a.ownerId.localeCompare(b.ownerId));
}

export type PayoutInput = {
  ownerId: string;
  month: string;
  kind: "paid" | "withheld";
  amountCents: number;
  paidOn?: string | null;
  transferReference?: string | null;
  reason?: string | null;
};

/** Record a transfer or a withholding against a closed month. Admin only (the caller checks). */
export async function recordPayout(sql: Runner, input: PayoutInput, id = globalThis.crypto.randomUUID()): Promise<PayoutEntry> {
  if (!isMonthKey(input.month)) throw new Error("Pick a month.");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Enter an amount above zero.");
  const closed = await sql.query(`select 1 from creator_months where month = $1::date`, [`${input.month}-01`]);
  if (closed.length === 0) throw new Error("That month is not final yet.");
  const line = monthLine((await ledgerFor(sql, [input.ownerId])).get(input.ownerId), input.month);
  if (input.amountCents > line.remainingCents) throw new Error("That is more than the maker's unpaid balance for this month.");
  if (input.kind === "paid" && !/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn ?? "")) throw new Error("Enter the transfer date.");
  if (input.kind === "withheld" && !input.reason?.trim()) throw new Error("Give a reason for withholding.");
  await sql.query(
    `insert into creator_payouts (id, owner_id, month, kind, amount_cents, paid_on, transfer_reference, reason)
     values ($1, $2, $3::date, $4, $5, $6::date, $7, $8)`,
    [
      id,
      input.ownerId,
      `${input.month}-01`,
      input.kind,
      input.amountCents,
      input.kind === "paid" ? input.paidOn : null,
      input.kind === "paid" ? input.transferReference?.trim() || null : null,
      input.kind === "withheld" ? input.reason!.trim() : null,
    ],
  );
  const entry = (await ledgerFor(sql, [input.ownerId])).get(input.ownerId)!.entries.find((e) => e.id === id);
  return entry!;
}
