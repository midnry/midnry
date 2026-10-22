// Account closure, the 30-day purge of closed accounts and the 90-day stats
// retention. Every function takes the SQL runner as an argument (no import of
// "@/lib/db") so scripts/retention.test.mjs can run the same statements
// against an in-memory Postgres (PGLite) with the real migrations applied.
//
// Decided by Midnry Ltd:
// - A closed account is kept for 30 days, then deleted.
// - Payment records needed for tax/accounting (Midnry Pass subscription rows
//   with a payment reference, Outpost Zero store purchases) are kept,
//   anonymised (no name or email, linked to a random id), for 6 years.
// - The same goes for creator earnings and payouts made to a maker; a maker's
//   payout (bank) details are deleted with the account.
// - Usage stats are deleted after 90 days.

export type Runner = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

export type Step = { label: string; text: string; params: unknown[] };

export const CLOSED_GRACE_DAYS = 30;
export const STATS_RETENTION_DAYS = 90;
export const PAYMENT_RETENTION_YEARS = 6;
/** Accounts purged per hourly run; the rest wait for the next run. */
export const PURGE_BATCH = 50;
export const MAINTENANCE_JOB = "retention";

/** Anonymised payment rows are re-keyed to an id with this prefix. */
export const ANON_PREFIX = "deleted-";

/** A random id that anonymised payment rows of one deleted account share. */
export function anonymousId(): string {
  return `${ANON_PREFIX}${globalThis.crypto.randomUUID()}`;
}

/**
 * Every table that holds a user id, and the column. Kept in step with the
 * migrations by scripts/retention.test.mjs, which fails when a new table with
 * a user column is not listed here (and so not covered by the purge).
 */
export const USER_COLUMNS: Record<string, string[]> = {
  user: ["id"],
  session: ["userId"],
  account: ["userId"],
  twoFactor: ["userId"],
  subscriptions: ["user_id"],
  app_documents: ["user_id"],
  submissions: ["owner_id"],
  admin_seat: ["user_id"],
  app_uses: ["user_id"],
  catalog_uses: ["user_id"],
  app_favorites: ["user_id"],
  user_avatar: ["user_id"],
  remind_projects: ["owner_id"],
  remind_members: ["user_id"],
  remind_invites: ["invited_by"],
  remind_files: ["owner_id"],
  remind_feeds: ["user_id"],
  remind_email_prefs: ["user_id"],
  remind_email_sent: ["user_id"],
  ai_writes: ["user_id"],
  study_shares: ["owner_id"],
  writing_drafts: ["user_id"],
  abuja_lives: ["user_id"],
  abuja_feedback: ["user_id"],
  outpost_match: ["user_id"],
  outpost_purchase: ["user_id"],
  account_closure: ["user_id"],
  creator_earnings: ["owner_id"],
  creator_payouts: ["owner_id"],
  creator_payout_details: ["user_id"],
};

/**
 * Tables with no user id: either anonymous by design (a random device id or
 * a hash of one) or site configuration. Listed so the coverage test can tell
 * "reviewed, nothing personal to purge" from "forgotten".
 */
export const UNLINKED_TABLES = [
  "verification", // keyed by email / token; purged by the account's email and id below
  "stripe_catalog",
  "paystack_catalog",
  "remind_tick",
  "abuja_play", // random device id; 90-day retention
  "outpost_room", // short-lived anonymous rooms with their own expiry
  "outpost_daily", // hash of a random device token; 90-day retention
  "maintenance_runs",
  "pass_payments", // Pass payment amounts and fees, no user id; kept 6 years
  "creator_months", // monthly pool totals
];

/**
 * Deletes everything a closed account left behind, in an order that is safe
 * to re-run after a partial failure: payment records are anonymised first,
 * rows that are found through the user row (email) go before it, and the
 * closure row goes last so the account is picked up again until it is gone.
 *
 * $1 is the closed account's id; $2 the random id for its payment records.
 */
export function purgeSteps(userId: string, anonId: string): Step[] {
  const u = [userId];
  const step = (label: string, text: string, params: unknown[] = u): Step => ({ label, text, params });
  return [
    // Payment records: keep for accounting, without name or email.
    step(
      "subscriptions: anonymise paid",
      `update subscriptions
         set user_id = $2, paystack_email = null, paystack_email_token = null
       where user_id = $1
         and (paystack_reference is not null or paystack_subscription_code is not null
              or stripe_subscription_id is not null or stripe_customer_id is not null)`,
      [userId, anonId],
    ),
    step("subscriptions: delete unpaid", `delete from subscriptions where user_id = $1`),
    step("outpost_purchase: delete unpaid checkouts", `delete from outpost_purchase where user_id = $1 and status = 'pending'`),
    step(
      "outpost_purchase: anonymise paid",
      `update outpost_purchase set user_id = $2 where user_id = $1`,
      [userId, anonId],
    ),

    // Creator earnings and payouts: accounting records, kept anonymised.
    // Bank details are deleted.
    step(
      "creator_earnings: anonymise",
      `update creator_earnings set owner_id = $2 where owner_id = $1`,
      [userId, anonId],
    ),
    step(
      "creator_payouts: anonymise",
      `update creator_payouts set owner_id = $2 where owner_id = $1`,
      [userId, anonId],
    ),
    step("creator_payout_details", `delete from creator_payout_details where user_id = $1`),

    // Community apps they made, and what pointed at them.
    step(
      "app_uses: uses of their apps",
      `delete from app_uses where app_id in (select id from submissions where owner_id = $1)`,
    ),
    step(
      "app_favorites: favourites of their apps",
      `delete from app_favorites where slug in (select slug from submissions where owner_id = $1)`,
    ),
    step("submissions", `delete from submissions where owner_id = $1`),

    // Remind. Invites are matched by the account's email, read from the user
    // row (deleted later in this list), so no email passes through the app.
    step(
      "remind_invites",
      `delete from remind_invites
        where invited_by = $1
           or project_id in (select id from remind_projects where owner_id = $1)
           or email = (select lower(email) from "user" where id = $1)`,
    ),
    step(
      "remind_files",
      `delete from remind_files
        where owner_id = $1 or project_id in (select id from remind_projects where owner_id = $1)`,
    ),
    step(
      "remind_members",
      `delete from remind_members
        where user_id = $1 or project_id in (select id from remind_projects where owner_id = $1)`,
    ),
    step("remind_projects", `delete from remind_projects where owner_id = $1`),
    step("remind_feeds", `delete from remind_feeds where user_id = $1`),
    step("remind_email_prefs", `delete from remind_email_prefs where user_id = $1`),
    step("remind_email_sent", `delete from remind_email_sent where user_id = $1`),

    step("app_documents", `delete from app_documents where user_id = $1`),
    // Study space share links; they already stop opening when the account is closed.
    step("study_shares", `delete from study_shares where owner_id = $1`),
    step("writing_drafts", `delete from writing_drafts where user_id = $1`),
    step("app_uses", `delete from app_uses where user_id = $1`),
    step("catalog_uses", `delete from catalog_uses where user_id = $1`),
    step("app_favorites", `delete from app_favorites where user_id = $1`),
    step("admin_seat", `delete from admin_seat where user_id = $1`),
    step("user_avatar", `delete from user_avatar where user_id = $1`),
    step("ai_writes", `delete from ai_writes where user_id = $1`),
    step("abuja_lives", `delete from abuja_lives where user_id = $1`),
    step("abuja_feedback", `delete from abuja_feedback where user_id = $1`),
    step("outpost_match", `delete from outpost_match where user_id = $1`),

    // Better Auth.
    step(
      "verification",
      `delete from "verification"
        where identifier = (select email from "user" where id = $1)
           or identifier = (select lower(email) from "user" where id = $1)
           or position($1 in "value") > 0`,
    ),
    step("twoFactor", `delete from "twoFactor" where "userId" = $1`),
    step("session", `delete from "session" where "userId" = $1`),
    step("account", `delete from "account" where "userId" = $1`),
    step("user", `delete from "user" where id = $1`),

    step("account_closure", `delete from account_closure where user_id = $1`),
  ];
}

/** Closed accounts past the grace period, oldest first. */
export const DUE_FOR_PURGE = `
  select user_id from account_closure
  where closed_at < now() - interval '${CLOSED_GRACE_DAYS} days'
  order by closed_at
  limit $1`;

/** Stats older than 90 days, and anonymised payment records older than 6 years. */
export const RETENTION_STEPS: Step[] = [
  { label: "app_uses", text: `delete from app_uses where used_on < current_date - ${STATS_RETENTION_DAYS}`, params: [] },
  { label: "catalog_uses", text: `delete from catalog_uses where used_on < current_date - ${STATS_RETENTION_DAYS}`, params: [] },
  { label: "ai_writes", text: `delete from ai_writes where used_on < current_date - ${STATS_RETENTION_DAYS}`, params: [] },
  { label: "outpost_daily", text: `delete from outpost_daily where day < current_date - ${STATS_RETENTION_DAYS}`, params: [] },
  {
    label: "outpost_match",
    text: `delete from outpost_match where created_at < now() - interval '${STATS_RETENTION_DAYS} days'`,
    params: [],
  },
  {
    label: "abuja_play",
    text: `delete from abuja_play where created_at < now() - interval '${STATS_RETENTION_DAYS} days'`,
    params: [],
  },
  {
    label: "abuja_feedback",
    text: `delete from abuja_feedback where created_at < now() - interval '${STATS_RETENTION_DAYS} days'`,
    params: [],
  },
  {
    label: "subscriptions: anonymised, past 6 years",
    text: `delete from subscriptions
            where user_id like '${ANON_PREFIX}%'
              and greatest(updated_at, coalesce(current_period_end, updated_at)) < now() - interval '${PAYMENT_RETENTION_YEARS} years'`,
    params: [],
  },
  {
    label: "outpost_purchase: anonymised, past 6 years",
    text: `delete from outpost_purchase
            where user_id like '${ANON_PREFIX}%'
              and coalesce(paid_at, created_at) < now() - interval '${PAYMENT_RETENTION_YEARS} years'`,
    params: [],
  },
  {
    label: "creator_earnings: anonymised, past 6 years",
    text: `delete from creator_earnings
            where owner_id like '${ANON_PREFIX}%'
              and month < now() - interval '${PAYMENT_RETENTION_YEARS} years'`,
    params: [],
  },
  {
    label: "creator_payouts: anonymised, past 6 years",
    text: `delete from creator_payouts
            where owner_id like '${ANON_PREFIX}%'
              and created_at < now() - interval '${PAYMENT_RETENTION_YEARS} years'`,
    params: [],
  },
  {
    label: "pass_payments: past 6 years",
    text: `delete from pass_payments where occurred_at < now() - interval '${PAYMENT_RETENTION_YEARS} years'`,
    params: [],
  },
];

async function run(sql: Runner, steps: Step[]): Promise<void> {
  for (const s of steps) await sql.query(s.text, s.params);
}

/** Purge accounts closed more than 30 days ago. Returns how many were purged. */
export async function purgeClosedAccounts(
  sql: Runner,
  options: { limit?: number; newAnonId?: () => string } = {},
): Promise<number> {
  const due = await sql.query<{ user_id: string }>(DUE_FOR_PURGE, [options.limit ?? PURGE_BATCH]);
  let purged = 0;
  for (const { user_id } of due) {
    await run(sql, purgeSteps(user_id, (options.newAnonId ?? anonymousId)()));
    purged += 1;
  }
  return purged;
}

export async function applyRetention(sql: Runner): Promise<void> {
  await run(sql, RETENTION_STEPS);
}

/**
 * Claim the hourly slot. True for exactly one caller per hour, however often
 * and however concurrently the scheduler pings.
 */
export async function claimHourlyRun(sql: Runner, job = MAINTENANCE_JOB): Promise<boolean> {
  const rows = await sql.query<{ job: string }>(
    `insert into maintenance_runs (job, last_run) values ($1, now())
     on conflict (job) do update set last_run = now()
     where maintenance_runs.last_run <= now() - interval '1 hour'
     returning job`,
    [job],
  );
  return rows.length > 0;
}

export type MaintenanceResult = { ran: boolean; purged: number };

/** The hourly job: purge closed accounts past 30 days, then apply retention. */
export async function runMaintenance(sql: Runner): Promise<MaintenanceResult> {
  if (!(await claimHourlyRun(sql))) return { ran: false, purged: 0 };
  const purged = await purgeClosedAccounts(sql);
  await applyRetention(sql);
  return { ran: true, purged };
}

// ── Closing an account ──────────────────────────────────────────────────────

export type ClosedFootprint = {
  /** Shared Remind projects the person was removed from (for unassigning tasks). */
  leftProjects: string[];
};

/**
 * The database side of closing an account. Idempotent. Everything is scoped
 * to `userId`, which the caller must take from the verified session.
 *
 * - records the closure (sign-in is refused from now on),
 * - unpublishes their community apps and withdraws pending reviews,
 * - removes them from shared Remind projects; a shared project they own passes
 *   to its longest-standing member so the others keep their work,
 * - revokes every session.
 * Hall of Fame entries are hidden by the read side while the closure row
 * exists (src/games/abuja/fame.functions.ts) and deleted by the purge.
 */
export async function closeAccountRecords(sql: Runner, userId: string): Promise<ClosedFootprint> {
  await sql.query(
    `insert into account_closure (user_id) values ($1) on conflict (user_id) do nothing`,
    [userId],
  );

  await sql.query(
    `update submissions
        set published_name = null, published_blurb = null, published_genre = null,
            published_html = null, published_features = null, published_guide = null,
            published_audiences = null, published_fields = null,
            draft_status = case when draft_status = 'pending' then 'rejected' else draft_status end,
            review_note = case when draft_status = 'pending' then 'Account closed.' else review_note end,
            updated_at = now()
      where owner_id = $1`,
    [userId],
  );

  // Shared projects they own: hand each to the member who joined first.
  const owned = await sql.query<{ project_id: string; heir: string }>(
    `select distinct on (m.project_id) m.project_id, m.user_id as heir
       from remind_members m
       join remind_projects p on p.id = m.project_id
      where p.owner_id = $1 and m.user_id <> $1
      order by m.project_id, m.joined_at, m.user_id`,
    [userId],
  );
  for (const { project_id, heir } of owned) {
    await sql.query(
      `update remind_projects set owner_id = $2, updated_at = now() where id = $1 and owner_id = $3`,
      [project_id, heir, userId],
    );
    await sql.query(`update remind_members set role = 'owner' where project_id = $1 and user_id = $2`, [
      project_id,
      heir,
    ]);
  }

  // Projects someone else owns (including the ones just handed over).
  const left = await sql.query<{ project_id: string }>(
    `delete from remind_members m
      using remind_projects p
      where p.id = m.project_id and m.user_id = $1 and p.owner_id <> $1
      returning m.project_id`,
    [userId],
  );

  await sql.query(`delete from "session" where "userId" = $1`, [userId]);
  return { leftProjects: left.map((row) => row.project_id) };
}

export async function isAccountClosed(sql: Runner, userId: string): Promise<boolean> {
  const rows = await sql.query<{ user_id: string }>(`select user_id from account_closure where user_id = $1`, [userId]);
  return rows.length > 0;
}
