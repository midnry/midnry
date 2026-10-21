import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { readIsAdmin } from "@/lib/community.functions";
import type { MaskedDetails } from "@/lib/payouts/countries";
import type { PayoutDetails } from "@/lib/payouts/details";
import type { AdminMakerLine, ClosedMonth, MonthLine, PayoutEntry, Pool } from "@/lib/payouts/ledger";

export type MyApp = { id: string; name: string; uses: number; cents: number };

export type MyEarnings = {
  /** The current month, estimated until it ends. */
  current: Pool & { totalUses: number; cents: number; apps: MyApp[] };
  /** Unpaid balance from final months, USD cents. */
  balanceCents: number;
  aboutNgn: number;
  minimumCents: number;
  minimumLabel: string;
  /** The latest final month, and when its payouts go out. */
  lastFinal: { month: string; dueBy: string } | null;
  months: MonthLine[];
  history: PayoutEntry[];
  hasDetails: boolean;
};

export const getMyEarnings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MyEarnings> => {
    const L = await import("@/lib/payouts/ledger");
    const sql = await getSql();
    const now = new Date();
    await L.closeDueMonths(sql, now);
    const key = L.monthKey(now);
    const pool = await L.poolForMonth(sql, key);
    const shares = await L.sharesForMonth(sql, key, pool.poolCents);
    const mine = await sql<{ id: string; name: string }>`
      select id, coalesce(published_name, name) as name
      from submissions
      where owner_id = ${context.userId} and published_html is not null
      order by coalesce(published_name, name)
    `;
    const byId = new Map(shares.apps.filter((a) => a.ownerId === context.userId).map((a) => [a.appId, a]));
    const apps = mine.map((app) => ({
      id: app.id,
      name: app.name,
      uses: byId.get(app.id)?.uses ?? 0,
      cents: byId.get(app.id)?.cents ?? 0,
    }));
    const summary = await L.makerSummary(sql, context.userId);
    const detailRows = await sql<{ n: number }>`
      select count(*)::int as n from creator_payout_details where user_id = ${context.userId}
    `;
    // The minimum depends on the bank's country, which only the encrypted
    // details hold; read it when the secret is available.
    let country: string | null = null;
    if (Number(detailRows[0]?.n)) {
      try {
        const D = await import("@/lib/payouts/details");
        country = (await D.readDetails(sql, context.userId, D.payoutKey()))?.details.country ?? null;
      } catch {
        country = null;
      }
    }
    const closed = await L.closedMonths(sql);
    const last = closed[0]?.month ?? null;
    return {
      current: { ...pool, totalUses: shares.totalUses, cents: apps.reduce((s, a) => s + a.cents, 0), apps },
      balanceCents: summary.balanceCents,
      aboutNgn: L.aboutNaira(summary.balanceCents),
      minimumCents: L.minimumCents(country),
      minimumLabel: country === "NG" ? `₦${L.MIN_PAYOUT_NGN.toLocaleString("en")}` : "US$20",
      lastFinal: last ? { month: last, dueBy: L.payoutDueDate(last) } : null,
      months: summary.months,
      history: summary.history,
      hasDetails: Number(detailRows[0]?.n) > 0,
    };
  });

export const getMyPayoutDetails = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ details: MaskedDetails | null; error: string | null }> => {
    const D = await import("@/lib/payouts/details");
    const sql = await getSql();
    try {
      const found = await D.readDetails(sql, context.userId, D.payoutKey());
      return { details: found ? D.maskDetails(found.details, found.updatedAt) : null, error: null };
    } catch {
      return { details: null, error: "Your saved payout details can't be read. Enter them again." };
    }
  });

export const savePayoutDetails = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<MaskedDetails> => {
    const D = await import("@/lib/payouts/details");
    const details = D.validateDetails(data);
    const sql = await getSql();
    await D.saveDetails(sql, context.userId, details, D.payoutKey());
    return D.maskDetails(details, new Date().toISOString());
  });

export const deletePayoutDetails = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const D = await import("@/lib/payouts/details");
    await D.deleteDetails(await getSql(), context.userId);
    return { ok: true };
  });

// ── Admin ───────────────────────────────────────────────────────────────────

export type AdminPayoutLine = AdminMakerLine & {
  name: string;
  email: string | null;
  deleted: boolean;
  minimumCents: number;
  reached: boolean;
  details: PayoutDetails | "unreadable" | null;
};

export type AdminPayouts = {
  current: Pool & { totalUses: number };
  months: ClosedMonth[];
  selected: string | null;
  dueBy: string | null;
  lines: AdminPayoutLine[];
  ngnPerUsd: number;
};

async function requireAdmin(userId: string): Promise<void> {
  if (!(await readIsAdmin(userId))) throw new Error("Only the admin can do that.");
}

export const adminPayouts = createServerFn({ method: "GET" })
  .validator((month: unknown) => (typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : null))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<AdminPayouts> => {
    await requireAdmin(context.userId);
    const L = await import("@/lib/payouts/ledger");
    const D = await import("@/lib/payouts/details");
    const sql = await getSql();
    const now = new Date();
    await L.closeDueMonths(sql, now);
    const key = L.monthKey(now);
    const pool = await L.poolForMonth(sql, key);
    const shares = await L.sharesForMonth(sql, key, pool.poolCents);
    const months = await L.closedMonths(sql);
    const selected = data && months.some((m) => m.month === data) ? data : (months[0]?.month ?? null);
    let lines: AdminPayoutLine[] = [];
    if (selected) {
      const raw = await L.adminMonthLines(sql, selected);
      const ids = raw.map((l) => l.ownerId);
      const users = ids.length
        ? await sql.query<{ id: string; name: string | null; email: string | null }>(
            `select id, name, email from "user" where id = any($1::text[])`,
            [ids],
          )
        : [];
      const byId = new Map(users.map((u) => [u.id, u]));
      let details = new Map<string, PayoutDetails | "unreadable">();
      try {
        details = await D.readAllDetails(sql, ids, D.payoutKey());
      } catch {
        details = new Map(ids.map((id) => [id, "unreadable" as const]));
      }
      lines = raw.map((line) => {
        const user = byId.get(line.ownerId);
        const d = details.get(line.ownerId) ?? null;
        const minimum = L.minimumCents(d && d !== "unreadable" ? d.country : null);
        return {
          ...line,
          name: user?.name?.trim() || (user ? "Unnamed maker" : "Deleted account"),
          email: user?.email ?? null,
          deleted: !user,
          minimumCents: minimum,
          reached: line.dueCents >= minimum,
          details: d,
        };
      });
    }
    return {
      current: { ...pool, totalUses: shares.totalUses },
      months,
      selected,
      dueBy: selected ? L.payoutDueDate(selected) : null,
      lines,
      ngnPerUsd: L.NGN_PER_USD_ESTIMATE,
    };
  });

type RecordInput = {
  ownerId: string;
  month: string;
  kind: "paid" | "withheld";
  amountCents: number;
  paidOn?: string | null;
  transferReference?: string | null;
  reason?: string | null;
};

export const adminRecordPayout = createServerFn({ method: "POST" })
  .validator((input: unknown): RecordInput => {
    const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : null);
    const kind = raw.kind === "withheld" ? "withheld" : raw.kind === "paid" ? "paid" : null;
    if (!kind) throw new Error("Pick paid or withheld.");
    const ownerId = text(raw.ownerId, 200);
    const month = text(raw.month, 7);
    if (!ownerId || !month) throw new Error("Missing maker or month.");
    return {
      ownerId,
      month,
      kind,
      amountCents: Number(raw.amountCents),
      paidOn: text(raw.paidOn, 10),
      transferReference: text(raw.transferReference, 120),
      reason: text(raw.reason, 500),
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<PayoutEntry> => {
    await requireAdmin(context.userId);
    const L = await import("@/lib/payouts/ledger");
    return L.recordPayout(await getSql(), data);
  });
