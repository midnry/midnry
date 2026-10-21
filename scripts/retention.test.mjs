// Account closure, the 30-day purge and the 90-day retention
// (src/lib/retention.ts), run against an in-memory Postgres (PGLite) with the
// real migrations applied — the same statements the hourly job runs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createJiti } from "jiti";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "./migration-plan.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const jiti = createJiti(import.meta.url, { alias: { "@": join(root, "src") } });
const R = await jiti.import("../src/lib/retention.ts");

const migrationsDir = join(root, "migrations");
const migrationFiles = pendingMigrations(readdirSync(migrationsDir), []);

// ── Schema coverage ─────────────────────────────────────────────────────────

/** Tables and their columns, read from every migration (create + alter add). */
function schema() {
  const tables = new Map();
  for (const { name } of migrationFiles) {
    const text = readFileSync(join(migrationsDir, name), "utf8").replace(/--.*$/gm, "");
    for (const m of text.matchAll(/create table if not exists "?(\w+)"?\s*\(([\s\S]*?)\n\);/g)) {
      const cols = [...m[2].matchAll(/^\s*"?(\w+)"?\s+\w/gm)].map((c) => c[1]).filter((c) => !["primary", "unique"].includes(c));
      tables.set(m[1], new Set([...(tables.get(m[1]) ?? []), ...cols]));
    }
    for (const m of text.matchAll(/alter table "?(\w+)"? add column if not exists "?(\w+)"?/g)) {
      tables.get(m[1])?.add(m[2]);
    }
  }
  return tables;
}

const USER_COLUMN = /^(user_id|userId|owner_id|invited_by)$/;

test("every table with a user column is covered by the purge", () => {
  const tables = schema();
  assert.ok(tables.size > 20, "migrations were parsed");
  const steps = R.purgeSteps("u", "a").map((s) => s.text).join("\n");
  for (const [table, cols] of tables) {
    const userCols = [...cols].filter((c) => USER_COLUMN.test(c));
    if (table === "user") userCols.push("id");
    if (userCols.length === 0) {
      assert.ok(R.UNLINKED_TABLES.includes(table), `${table}: no user column — list it in UNLINKED_TABLES once reviewed`);
      continue;
    }
    assert.deepEqual(R.USER_COLUMNS[table]?.slice().sort(), userCols.sort(), `${table}: USER_COLUMNS out of date`);
    assert.match(steps, new RegExp(`(from|update) "?${table}"?\\b`), `${table}: no purge step`);
  }
  for (const table of Object.keys(R.USER_COLUMNS)) assert.ok(tables.has(table), `${table} is not in the migrations`);
});

test("the purge removes the closure row last, after the user row", () => {
  const labels = R.purgeSteps("u", "a").map((s) => s.label);
  assert.equal(labels.at(-1), "account_closure");
  assert.equal(labels.at(-2), "user");
  // Rows found through the user's email go before the user row.
  assert.ok(labels.indexOf("remind_invites") < labels.indexOf("user"));
  assert.ok(labels.indexOf("verification") < labels.indexOf("user"));
  // Payment rows are anonymised before anything else.
  assert.ok(labels[0].startsWith("subscriptions"));
});

test("every purge step is scoped to the given account", () => {
  for (const step of R.purgeSteps("u-1", "deleted-x")) {
    assert.equal(step.params[0], "u-1", step.label);
    assert.match(step.text, /\$1/, step.label);
  }
});

test("retention windows are 90 days for stats and 6 years for anonymised payments", () => {
  const text = R.RETENTION_STEPS.map((s) => s.text).join("\n");
  for (const table of ["app_uses", "catalog_uses", "ai_writes", "outpost_daily", "outpost_match", "abuja_play", "abuja_feedback"]) {
    assert.match(text, new RegExp(`delete from ${table} where .*90`), table);
  }
  assert.doesNotMatch(text, /remind_email_sent/, "remind_email_sent keeps its own 40-day rule");
  assert.doesNotMatch(text, /abuja_lives/, "the Hall of Fame is not usage stats");
  // subscriptions, outpost_purchase, creator_earnings, creator_payouts (anonymised) and pass_payments.
  assert.equal((text.match(/6 years/g) ?? []).length, 5);
  assert.equal((text.match(/like 'deleted-%'/g) ?? []).length, 4, "only anonymised payment rows expire");
  assert.match(text, /delete from pass_payments where occurred_at < .*6 years/);
});

// ── Against Postgres ────────────────────────────────────────────────────────

async function freshDb() {
  const pg = new PGlite();
  for (const { name } of migrationFiles) await pg.exec(readFileSync(join(migrationsDir, name), "utf8"));
  const sql = { query: async (text, params = []) => (await pg.query(text, params)).rows };
  return { pg, sql };
}

/** Give one account a row in every table that can hold one. */
async function seedUser(sql, id, { closedDaysAgo = null } = {}) {
  const q = (text, params = []) => sql.query(text, params);
  await q(`insert into "user" (id, name, email, "emailVerified") values ($1, $1, $2, true)`, [id, `${id}@example.test`]);
  await q(`insert into "session" (id, "expiresAt", token, "updatedAt", "userId") values ($1, now() + interval '1 day', $1 || '-tok', now(), $2)`, [`${id}-s`, id]);
  await q(`insert into "account" (id, "accountId", "providerId", "userId", "updatedAt", password) values ($1, $2, 'credential', $2, now(), 'hash')`, [`${id}-a`, id]);
  await q(`insert into "twoFactor" (id, secret, "backupCodes", "userId") values ($1, 's', 'b', $2)`, [`${id}-2fa`, id]);
  await q(`insert into "verification" (id, identifier, value, "expiresAt") values ($1, $2, '{}', now() + interval '1 hour')`, [`${id}-v1`, `${id}@example.test`]);
  await q(`insert into "verification" (id, identifier, value, "expiresAt") values ($1, 'tok', $2, now() + interval '1 hour')`, [`${id}-v2`, `{"userId":"${id}"}`]);
  await q(`insert into subscriptions (user_id, status, paystack_customer_code, paystack_subscription_code, paystack_email, paystack_email_token, paystack_reference, current_period_end)
           values ($1, 'canceled', 'CUS_' || $1, 'SUB_' || $1, $1 || '@example.test', 'tok', 'ref-' || $1, now() - interval '1 day')`, [id]);
  await q(`insert into app_documents (user_id, app_id, payload) values ($1, 'tasks', '{}')`, [id]);
  await q(`insert into submissions (id, owner_id, slug, name, blurb, genre, html, draft_status, published_name, published_blurb, published_genre, published_html)
           values ($1 || '-app', $1, $1 || '-app', 'App', 'An app', 'work', '<p>', 'pending', 'App', 'An app', 'work', '<p>')`, [id]);
  await q(`insert into app_uses (app_id, user_id, used_on) values ($1 || '-app', $1, current_date)`, [id]);
  await q(`insert into app_uses (app_id, user_id, used_on) values ($1 || '-app', 'someone-else', current_date)`, [id]);
  await q(`insert into catalog_uses (slug, user_id, used_on) values ('notes', $1, current_date)`, [id]);
  await q(`insert into app_favorites (user_id, slug) values ($1, 'notes')`, [id]);
  await q(`insert into app_favorites (user_id, slug) values ('someone-else', $1 || '-app')`, [id]);
  await q(`insert into user_avatar (user_id, mime, data) values ($1, 'image/jpeg', 'x')`, [id]);
  await q(`insert into remind_projects (id, owner_id, name) values ($1 || '-solo', $1, 'Solo')`, [id]);
  await q(`insert into remind_members (project_id, user_id, role) values ($1 || '-solo', $1, 'owner')`, [id]);
  await q(`insert into remind_invites (project_id, email, invited_by) values ($1 || '-solo', 'friend@example.test', $1)`, [id]);
  await q(`insert into remind_files (id, owner_id, project_id, task_id, name, mime, size, data) values ($1 || '-f', $1, null, 't', 'f', 'text/plain', 1, 'x')`, [id]);
  await q(`insert into remind_feeds (user_id, token) values ($1, $1 || '-feed')`, [id]);
  await q(`insert into remind_email_prefs (user_id, unsub_token) values ($1, $1 || '-unsub')`, [id]);
  await q(`insert into remind_email_sent (key, user_id) values ($1 || '-k', $1)`, [id]);
  await q(`insert into ai_writes (user_id, used_on, count) values ($1, current_date, 3)`, [id]);
  await q(`insert into abuja_lives (user_id, life_key, name, ending, net_worth, age, background) values ($1, 'l1', 'Ada', 'freedom', 25000000, 40, 'average')`, [id]);
  await q(`insert into abuja_feedback (user_id, device, message) values ($1, 'dev', 'hi')`, [id]);
  await q(`insert into outpost_match (user_id, round_id, mode, map, online, platform, won, kills, damage, seconds, placement) values ($1, 'round-0001', 'signal', 'm', false, 'web', true, 1, 1, 60, 1)`, [id]);
  await q(`insert into outpost_purchase (reference, user_id, item, amount, currency, status, paid_at) values ($1 || '-paid', $1, 'skin', 100, 'NGN', 'paid', now())`, [id]);
  await q(`insert into outpost_purchase (reference, user_id, item, amount, currency, status) values ($1 || '-pending', $1, 'skin2', 100, 'NGN', 'pending')`, [id]);
  await q(`insert into creator_earnings (month, app_id, owner_id, app_name, uses, cents) values ('2026-09-01', $1 || '-app', $1, 'App', 3, 120)`, [id]);
  await q(`insert into creator_payouts (id, owner_id, month, kind, amount_cents, paid_on) values ($1 || '-po', $1, '2026-09-01', 'paid', 100, '2026-10-10')`, [id]);
  await q(`insert into creator_payout_details (user_id, details) values ($1, 'sealed')`, [id]);
  if (closedDaysAgo !== null) {
    await q(`insert into account_closure (user_id, closed_at) values ($1, now() - make_interval(days => $2))`, [id, closedDaysAgo]);
  }
}

/** Rows that still carry this account's id (or its email), table by table. */
async function leftovers(sql, id) {
  const found = {};
  for (const [table, cols] of Object.entries(R.USER_COLUMNS)) {
    const where = cols.map((c) => `"${c}" = $1`).join(" or ");
    const [{ n }] = await sql.query(`select count(*)::int as n from "${table}" where ${where}`, [id]);
    if (n) found[table] = n;
  }
  const [{ n: v }] = await sql.query(`select count(*)::int as n from "verification" where identifier like $1 || '%' or position($1 in value) > 0`, [id]);
  if (v) found.verification = v;
  const [{ n: e }] = await sql.query(`select count(*)::int as n from subscriptions where paystack_email like $1 || '%'`, [id]);
  if (e) found["subscriptions.paystack_email"] = e;
  const [{ n: i }] = await sql.query(`select count(*)::int as n from remind_invites where email = $1 || '@example.test'`, [id]);
  if (i) found["remind_invites.email"] = i;
  return found;
}

test("closed accounts past 30 days are purged; payment records stay, anonymised", async () => {
  const { pg, sql } = await freshDb();
  await seedUser(sql, "old", { closedDaysAgo: 31 });
  await seedUser(sql, "recent", { closedDaysAgo: 5 });
  await seedUser(sql, "active");
  // Someone invited the old account's email to their project.
  await sql.query(`insert into remind_projects (id, owner_id, name) values ('p-active', 'active', 'Shared')`);
  await sql.query(`insert into remind_invites (project_id, email, invited_by) values ('p-active', 'old@example.test', 'active')`);

  let n = 0;
  const purged = await R.purgeClosedAccounts(sql, { newAnonId: () => `deleted-test-${++n}` });
  assert.equal(purged, 1);
  assert.deepEqual(await leftovers(sql, "old"), {});

  // Other people's rows pointing at the deleted community app are gone too.
  const [{ n: uses }] = await sql.query(`select count(*)::int as n from app_uses where app_id = 'old-app'`);
  assert.equal(uses, 0);
  const [{ n: favs }] = await sql.query(`select count(*)::int as n from app_favorites where slug = 'old-app'`);
  assert.equal(favs, 0);

  // Payment records: kept, no name or email, linked to one random id.
  const subs = await sql.query(`select * from subscriptions where user_id = 'deleted-test-1'`);
  assert.equal(subs.length, 1);
  assert.equal(subs[0].paystack_email, null);
  assert.equal(subs[0].paystack_email_token, null);
  assert.equal(subs[0].paystack_reference, "ref-old");
  const earned = await sql.query(`select cents from creator_earnings where owner_id = 'deleted-test-1'`);
  assert.deepEqual(earned, [{ cents: 120 }], "creator earnings kept, anonymised");
  const payouts = await sql.query(`select amount_cents from creator_payouts where owner_id = 'deleted-test-1'`);
  assert.deepEqual(payouts, [{ amount_cents: 100 }], "payouts kept, anonymised");
  const [{ n: bank }] = await sql.query(`select count(*)::int as n from creator_payout_details where user_id in ('old', 'deleted-test-1')`);
  assert.equal(bank, 0, "payout details deleted");
  const buys = await sql.query(`select reference, status from outpost_purchase where user_id = 'deleted-test-1'`);
  assert.deepEqual(buys, [{ reference: "old-paid", status: "paid" }], "paid kept, unpaid checkout deleted");

  // The account closed 5 days ago and the open account are untouched.
  for (const id of ["recent", "active"]) {
    const [{ n: users }] = await sql.query(`select count(*)::int as n from "user" where id = $1`, [id]);
    assert.equal(users, 1, id);
    const [{ n: rows }] = await sql.query(`select count(*)::int as n from outpost_match where user_id = $1`, [id]);
    assert.equal(rows, 1, id);
  }

  // Idempotent: nothing left to purge, and re-running the steps is harmless.
  assert.equal(await R.purgeClosedAccounts(sql), 0);
  for (const step of R.purgeSteps("old", "deleted-again")) await sql.query(step.text, step.params);
  const [{ n: still }] = await sql.query(`select count(*)::int as n from subscriptions where user_id like 'deleted-%'`);
  assert.equal(still, 1);
  await pg.close();
});

test("closing an account hides its public footprint and revokes sessions", async () => {
  const { pg, sql } = await freshDb();
  await seedUser(sql, "leaver");
  await seedUser(sql, "friend");
  await seedUser(sql, "pal");
  // A shared project the leaver owns (friend joined first), and one the friend owns.
  await sql.query(`insert into remind_projects (id, owner_id, name) values ('shared-own', 'leaver', 'Ours')`);
  await sql.query(`insert into remind_members (project_id, user_id, role, joined_at) values
    ('shared-own', 'leaver', 'owner', now() - interval '3 days'),
    ('shared-own', 'friend', 'member', now() - interval '2 days'),
    ('shared-own', 'pal', 'member', now() - interval '1 day')`);
  await sql.query(`insert into remind_projects (id, owner_id, name) values ('shared-other', 'friend', 'Theirs')`);
  await sql.query(`insert into remind_members (project_id, user_id, role) values ('shared-other', 'friend', 'owner'), ('shared-other', 'leaver', 'member')`);

  const result = await R.closeAccountRecords(sql, "leaver");
  assert.deepEqual(result.leftProjects.sort(), ["shared-other", "shared-own"]);
  assert.equal(await R.isAccountClosed(sql, "leaver"), true);
  assert.equal(await R.isAccountClosed(sql, "friend"), false);

  const [{ n: sessions }] = await sql.query(`select count(*)::int as n from "session" where "userId" = 'leaver'`);
  assert.equal(sessions, 0);
  const [{ n: friendSessions }] = await sql.query(`select count(*)::int as n from "session" where "userId" = 'friend'`);
  assert.equal(friendSessions, 1);

  const [app] = await sql.query(`select published_html, draft_status, review_note, html from submissions where owner_id = 'leaver'`);
  assert.equal(app.published_html, null);
  assert.equal(app.draft_status, "rejected");
  assert.equal(app.html, "<p>", "the draft is kept for the 30 days");
  const [other] = await sql.query(`select published_html from submissions where owner_id = 'friend'`);
  assert.equal(other.published_html, "<p>");

  const owner = await sql.query(`select owner_id from remind_projects where id = 'shared-own'`);
  assert.equal(owner[0].owner_id, "friend", "passes to the member who joined first");
  const members = await sql.query(`select user_id, role from remind_members where project_id = 'shared-own' order by user_id`);
  assert.deepEqual(members, [{ user_id: "friend", role: "owner" }, { user_id: "pal", role: "member" }]);
  const [{ n: inOther }] = await sql.query(`select count(*)::int as n from remind_members where user_id = 'leaver' and project_id = 'shared-other'`);
  assert.equal(inOther, 0);
  const [{ n: solo }] = await sql.query(`select count(*)::int as n from remind_members where user_id = 'leaver' and project_id = 'leaver-solo'`);
  assert.equal(solo, 1, "a project only they are in is kept until the purge");

  // The Hall of Fame query (src/games/abuja/fame.functions.ts) hides them.
  const fame = await sql.query(`select user_id from abuja_lives l where not exists (select 1 from account_closure c where c.user_id = l.user_id) order by user_id`);
  assert.deepEqual(fame.map((r) => r.user_id), ["friend", "pal"]);

  // Closing twice is harmless.
  await R.closeAccountRecords(sql, "leaver");
  await pg.close();
});

test("retention deletes stats older than 90 days and anonymised payments older than 6 years", async () => {
  const { pg, sql } = await freshDb();
  await sql.query(`insert into "user" (id, name, email, "emailVerified") values ('live', 'Live', 'live@example.test', true)`);
  const q = (text) => sql.query(text);
  for (const [age, tag] of [[91, "old"], [89, "new"]]) {
    await q(`insert into app_uses (app_id, user_id, used_on) values ('a', '${tag}', current_date - ${age})`);
    await q(`insert into catalog_uses (slug, user_id, used_on) values ('s', '${tag}', current_date - ${age})`);
    await q(`insert into ai_writes (user_id, used_on) values ('live', current_date - ${age})`);
    await q(`insert into outpost_daily (day, player, name, score, won, seconds) values (current_date - ${age}, '${tag}', 'n', 1, true, 1)`);
    await q(`insert into outpost_match (user_id, round_id, mode, map, online, platform, won, kills, damage, seconds, placement, created_at)
             values ('live', 'round-${tag}-x', 'm', 'm', false, 'web', true, 0, 0, 0, 1, now() - interval '${age} days')`);
    await q(`insert into abuja_play (device, kind, created_at) values ('${tag}', 'start', now() - interval '${age} days')`);
    await q(`insert into abuja_feedback (device, message, created_at) values ('${tag}', 'm', now() - interval '${age} days')`);
    await q(`insert into remind_email_sent (key, user_id, sent_at) values ('${tag}', 'live', now() - interval '${age} days')`);
    await q(`insert into abuja_lives (user_id, life_key, name, ending, net_worth, age, background, created_at)
             values ('live', '${tag}', 'n', 'broke', 0, 30, 'average', now() - interval '${age} days')`);
  }
  // Payment records: anonymised past 6 years / within 6 years, and a live account's old one.
  await q(`insert into subscriptions (user_id, status, paystack_reference, current_period_end, updated_at) values
    ('deleted-a', 'canceled', 'r1', now() - interval '6 years 2 months', now() - interval '6 years 1 month'),
    ('deleted-b', 'canceled', 'r2', now() - interval '5 years', now() - interval '5 years'),
    ('live', 'canceled', 'r3', now() - interval '7 years', now() - interval '7 years')`);
  await q(`insert into outpost_purchase (reference, user_id, item, amount, currency, status, created_at, paid_at) values
    ('p1', 'deleted-a', 'i', 1, 'NGN', 'paid', now() - interval '7 years', now() - interval '7 years'),
    ('p2', 'deleted-b', 'i', 1, 'NGN', 'paid', now() - interval '5 years', now() - interval '5 years'),
    ('p3', 'live', 'i', 1, 'NGN', 'paid', now() - interval '7 years', now() - interval '7 years')`);

  await q(`insert into creator_earnings (month, app_id, owner_id, app_name, uses, cents) values
    ((now() - interval '6 years 2 months')::date, 'a1', 'deleted-a', 'A', 1, 1),
    ((now() - interval '5 years')::date, 'a2', 'deleted-b', 'A', 1, 1),
    ((now() - interval '7 years')::date, 'a3', 'live', 'A', 1, 1)`);
  await q(`insert into creator_payouts (id, owner_id, month, kind, amount_cents, created_at) values
    ('c1', 'deleted-a', '2019-01-01', 'withheld', 1, now() - interval '7 years'),
    ('c2', 'deleted-b', '2021-01-01', 'withheld', 1, now() - interval '5 years'),
    ('c3', 'live', '2019-01-01', 'withheld', 1, now() - interval '7 years')`);
  await q(`insert into pass_payments (id, kind, reference, amount_cents, currency, occurred_at) values
    ('charge:old', 'charge', 'old', 500, 'USD', now() - interval '7 years'),
    ('charge:new', 'charge', 'new', 500, 'USD', now() - interval '5 years')`);

  await R.applyRetention(sql);

  const count = async (text) => (await sql.query(text))[0].n;
  for (const [table, col] of [["app_uses", "used_on"], ["catalog_uses", "used_on"], ["ai_writes", "used_on"], ["outpost_daily", "day"]]) {
    assert.equal(await count(`select count(*)::int as n from ${table} where ${col} < current_date - 90`), 0, table);
    assert.equal(await count(`select count(*)::int as n from ${table}`), 1, `${table} keeps the recent row`);
  }
  for (const table of ["outpost_match", "abuja_play", "abuja_feedback"]) {
    assert.equal(await count(`select count(*)::int as n from ${table}`), 1, table);
    assert.equal(await count(`select count(*)::int as n from ${table} where created_at < now() - interval '90 days'`), 0, table);
  }
  assert.equal(await count(`select count(*)::int as n from remind_email_sent`), 2, "untouched here: its 40-day rule lives in the remind tick");
  assert.equal(await count(`select count(*)::int as n from abuja_lives`), 2, "Hall of Fame is kept");
  assert.deepEqual((await sql.query(`select user_id from subscriptions order by user_id`)).map((r) => r.user_id), ["deleted-b", "live"]);
  assert.deepEqual((await sql.query(`select reference from outpost_purchase order by reference`)).map((r) => r.reference), ["p2", "p3"]);
  assert.deepEqual((await sql.query(`select app_id from creator_earnings order by app_id`)).map((r) => r.app_id), ["a2", "a3"]);
  assert.deepEqual((await sql.query(`select id from creator_payouts order by id`)).map((r) => r.id), ["c2", "c3"]);
  assert.deepEqual((await sql.query(`select id from pass_payments`)).map((r) => r.id), ["charge:new"]);
  await pg.close();
});

test("the hourly job runs at most once an hour", async () => {
  const { pg, sql } = await freshDb();
  const first = await R.runMaintenance(sql);
  assert.deepEqual(first, { ran: true, purged: 0 });
  assert.deepEqual(await R.runMaintenance(sql), { ran: false, purged: 0 });
  const both = await Promise.all([R.claimHourlyRun(sql), R.claimHourlyRun(sql)]);
  assert.deepEqual(both, [false, false]);
  await sql.query(`update maintenance_runs set last_run = now() - interval '61 minutes'`);
  await seedUser(sql, "gone", { closedDaysAgo: 40 });
  assert.deepEqual(await R.runMaintenance(sql), { ran: true, purged: 1 });
  assert.deepEqual(await leftovers(sql, "gone"), {});
  await pg.close();
});
