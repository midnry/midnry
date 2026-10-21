// Creator pool, earnings and manual payouts (src/lib/payouts/*), run against
// an in-memory Postgres (PGLite) with the real migrations applied.
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
const L = await jiti.import("../src/lib/payouts/ledger.ts");
const D = await jiti.import("../src/lib/payouts/details.ts");
const Rev = await jiti.import("../src/lib/revenue.ts");

const migrationsDir = join(root, "migrations");
const migrationFiles = pendingMigrations(readdirSync(migrationsDir), []);

async function freshDb() {
  const pg = new PGlite();
  for (const { name } of migrationFiles) await pg.exec(readFileSync(join(migrationsDir, name), "utf8"));
  const sql = { query: async (text, params = []) => (await pg.query(text, params)).rows };
  return { pg, sql };
}

/** A published app owned by `owner`, opened by `n` distinct people on one day. */
async function appWithOpens(sql, { id, owner, n, day }) {
  await sql.query(
    `insert into submissions (id, owner_id, slug, name, blurb, genre, html, draft_status, published_name, published_html)
     values ($1, $2, $1, $1, 'b', 'work', '<p>', 'clean', $1, '<p>') on conflict (id) do nothing`,
    [id, owner],
  );
  for (let i = 0; i < n; i += 1) {
    await sql.query(`insert into app_uses (app_id, user_id, used_on) values ($1, $2, $3) on conflict do nothing`, [id, `viewer-${i}`, day]);
  }
}

const charge = (reference, paidAt, fees = 25, amount = 500) => ({ reference, amount, fees, currency: "USD", paid_at: paidAt });

// ── Pure maths ──────────────────────────────────────────────────────────────

test("the pool is 70% of revenue after fees and refunds, never below zero", () => {
  assert.equal(Rev.poolFromPayments(1000, 50, 0), 665);
  assert.equal(Rev.poolFromPayments(1000, 50, 500), 315);
  assert.equal(Rev.poolFromPayments(500, 25, 500), 0);
  assert.equal(Rev.poolFromPayments(0, 0, 0), 0);
  assert.equal(Rev.cutCents(665, 1, 3), 221);
});

test("estimated fees use the international card rate; minimums per country", () => {
  // 3.9% of $5 = 19.5 → 20, plus ₦100 at the estimated rate.
  assert.equal(L.estimateFeeCents(500, "USD"), 20 + Math.ceil(10000 / L.NGN_PER_USD_ESTIMATE));
  assert.equal(L.minimumCents("US"), 2000);
  assert.equal(L.minimumCents(null), 2000);
  assert.equal(L.minimumCents("NG"), Math.ceil((20000 * 100) / L.NGN_PER_USD_ESTIMATE));
  assert.equal(L.payoutDueDate("2026-12"), "2027-01-15");
  assert.equal(L.monthIsFinal("2026-09", new Date("2026-10-01T12:00:00Z")), false, "grace day");
  assert.equal(L.monthIsFinal("2026-09", new Date("2026-10-02T00:00:00Z")), true);
});

// ── Against Postgres ────────────────────────────────────────────────────────

test("payments are recorded idempotently; real fees replace an estimate", async () => {
  const { pg, sql } = await freshDb();
  await L.recordPassCharge(sql, charge("ref-1", "2026-09-03T10:00:00Z"));
  await L.recordPassCharge(sql, charge("ref-1", "2026-09-03T10:00:00Z"));
  await L.recordPassCharge(sql, { ...charge("ref-2", "2026-09-04T10:00:00Z"), fees: null });
  let rows = await sql.query(`select id, fees_cents, fees_estimated from pass_payments order by id`);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].fees_estimated, true);
  assert.equal(rows[1].fees_cents, L.estimateFeeCents(500, "USD"));
  // The webhook later reports the real fee.
  await L.recordPassCharge(sql, charge("ref-2", "2026-09-04T10:00:00Z", 30));
  // An estimate never overwrites a real fee.
  await L.recordPassCharge(sql, { ...charge("ref-1", "2026-09-03T10:00:00Z"), fees: undefined });
  rows = await sql.query(`select id, fees_cents, fees_estimated from pass_payments order by id`);
  assert.deepEqual(rows, [
    { id: "charge:ref-1", fees_cents: 25, fees_estimated: false },
    { id: "charge:ref-2", fees_cents: 30, fees_estimated: false },
  ]);

  // Refunds: once per refund id, only for Pass charges.
  assert.equal(await L.recordPassRefund(sql, { id: 7, transaction_reference: "ref-1", amount: 500, currency: "USD", refunded_at: "2026-09-10T00:00:00Z" }), true);
  assert.equal(await L.recordPassRefund(sql, { id: 7, transaction_reference: "ref-1", amount: 500, currency: "USD", refunded_at: "2026-09-10T00:00:00Z" }), true);
  assert.equal(await L.recordPassRefund(sql, { id: 8, transaction_reference: "store-item", amount: 100, currency: "NGN" }), false);
  const [{ n }] = await sql.query(`select count(*)::int as n from pass_payments where kind = 'refund'`);
  assert.equal(n, 1);
  await pg.close();
});

test("a month's pool counts its charges, fees and refunds only", async () => {
  const { pg, sql } = await freshDb();
  await L.recordPassCharge(sql, charge("a", "2026-09-01T00:00:00Z", 25));
  await L.recordPassCharge(sql, charge("b", "2026-09-30T23:59:59Z", 25));
  await L.recordPassCharge(sql, charge("c", "2026-10-01T00:00:00Z", 25)); // next month
  await L.recordPassCharge(sql, { reference: "ngn", amount: 500, fees: 0, currency: "NGN", paid_at: "2026-09-05T00:00:00Z" });
  await L.recordPassRefund(sql, { id: "r1", transaction_reference: "a", amount: 200, currency: "USD", refunded_at: "2026-09-20T00:00:00Z" });
  await L.recordPassRefund(sql, { id: "r2", transaction_reference: "b", amount: 500, currency: "USD", refunded_at: "2026-10-03T00:00:00Z" });
  const sep = await L.poolForMonth(sql, "2026-09");
  assert.deepEqual(
    { gross: sep.grossCents, fees: sep.feesCents, refunds: sep.refundsCents, pool: sep.poolCents, charges: sep.charges },
    { gross: 1000, fees: 50, refunds: 200, pool: Math.floor((750 * 70) / 100), charges: 2 },
  );
  // October: one $5 charge, a $5 refund of September's charge → floored at 0.
  const oct = await L.poolForMonth(sql, "2026-10");
  assert.equal(oct.poolCents, 0);
  await pg.close();
});

test("closing a month freezes shares by opens; balances roll over below the minimum", async () => {
  const { pg, sql } = await freshDb();
  // September: 8 charges → gross 4000, fees 200 → pool 2660.
  for (let i = 0; i < 8; i += 1) await L.recordPassCharge(sql, charge(`s${i}`, "2026-09-10T00:00:00Z"));
  await appWithOpens(sql, { id: "big", owner: "maker-a", n: 3, day: "2026-09-12" });
  await appWithOpens(sql, { id: "small", owner: "maker-b", n: 1, day: "2026-09-12" });
  // The owner's own open never counts.
  await sql.query(`insert into app_uses (app_id, user_id, used_on) values ('big', 'maker-a', '2026-09-13')`);

  assert.deepEqual(await L.closeDueMonths(sql, new Date("2026-10-01T12:00:00Z")), [], "not final during the grace day");
  assert.deepEqual(await L.closeDueMonths(sql, new Date("2026-10-02T00:00:00Z")), ["2026-09"]);
  assert.deepEqual(await L.closeDueMonths(sql, new Date("2026-10-05T00:00:00Z")), [], "closed once");
  const [sepClosed] = await L.closedMonths(sql);
  assert.equal(sepClosed.poolCents, 2660);
  assert.equal(sepClosed.totalUses, 4);

  const a = await L.makerSummary(sql, "maker-a");
  const b = await L.makerSummary(sql, "maker-b");
  assert.equal(a.balanceCents, 1995); // 2660 × 3/4
  assert.equal(b.balanceCents, 665);
  assert.ok(a.balanceCents < L.minimumCents("US"), "maker-a is below US$20");
  assert.ok(a.balanceCents >= L.minimumCents("NG"), "but above ₦20,000 for a Nigerian bank");

  // October adds more; September's balance carries over.
  for (let i = 0; i < 4; i += 1) await L.recordPassCharge(sql, charge(`o${i}`, "2026-10-10T00:00:00Z"));
  await appWithOpens(sql, { id: "big", owner: "maker-a", n: 1, day: "2026-10-12" });
  await L.closeDueMonths(sql, new Date("2026-11-03T00:00:00Z"));
  const [octLine] = await L.adminMonthLines(sql, "2026-10");
  assert.equal(octLine.ownerId, "maker-a");
  assert.equal(octLine.carriedCents, 1995);
  assert.equal(octLine.earnedCents, 1330);
  assert.equal(octLine.dueCents, 3325);
  assert.ok(octLine.dueCents >= L.minimumCents("US"));
  const octB = (await L.adminMonthLines(sql, "2026-10")).find((l) => l.ownerId === "maker-b");
  assert.equal(octB.carriedCents, 665, "maker-b rolls over with no new earnings");

  // Paying maker-a for October settles the whole balance.
  await assert.rejects(L.recordPayout(sql, { ownerId: "maker-a", month: "2026-10", kind: "paid", amountCents: 3326, paidOn: "2026-11-14" }), /more than/);
  await assert.rejects(L.recordPayout(sql, { ownerId: "maker-a", month: "2026-11", kind: "paid", amountCents: 1, paidOn: "2026-12-14" }), /not final/);
  await assert.rejects(L.recordPayout(sql, { ownerId: "maker-a", month: "2026-10", kind: "paid", amountCents: 100 }), /date/);
  const paid = await L.recordPayout(sql, { ownerId: "maker-a", month: "2026-10", kind: "paid", amountCents: 3325, paidOn: "2026-11-14", transferReference: "TRF-1" });
  assert.equal(paid.kind, "paid");
  assert.equal(paid.transferReference, "TRF-1");
  assert.equal((await L.makerSummary(sql, "maker-a")).balanceCents, 0);
  await pg.close();
});

test("withheld earnings leave the balance and need a reason", async () => {
  const { pg, sql } = await freshDb();
  for (let i = 0; i < 10; i += 1) await L.recordPassCharge(sql, charge(`w${i}`, "2026-09-10T00:00:00Z", 0));
  await appWithOpens(sql, { id: "botty", owner: "maker-c", n: 5, day: "2026-09-12" });
  await L.closeDueMonths(sql, new Date("2026-10-02T00:00:00Z"));
  assert.equal((await L.makerSummary(sql, "maker-c")).balanceCents, 3500);
  await assert.rejects(L.recordPayout(sql, { ownerId: "maker-c", month: "2026-09", kind: "withheld", amountCents: 1000, reason: " " }), /reason/);
  await L.recordPayout(sql, { ownerId: "maker-c", month: "2026-09", kind: "withheld", amountCents: 3000, reason: "Automated opens" });
  const summary = await L.makerSummary(sql, "maker-c");
  assert.equal(summary.balanceCents, 500);
  assert.equal(summary.history[0].reason, "Automated opens");
  assert.equal(summary.months[0].withheldCents, 3000);
  assert.ok(summary.balanceCents < L.minimumCents("US"), "the rest rolls over");
  await pg.close();
});

test("a maker's summary and details are scoped to their own id", async () => {
  const { pg, sql } = await freshDb();
  for (let i = 0; i < 4; i += 1) await L.recordPassCharge(sql, charge(`m${i}`, "2026-09-10T00:00:00Z", 0));
  await appWithOpens(sql, { id: "one", owner: "maker-x", n: 1, day: "2026-09-12" });
  await appWithOpens(sql, { id: "two", owner: "maker-y", n: 1, day: "2026-09-12" });
  await L.closeDueMonths(sql, new Date("2026-10-02T00:00:00Z"));
  await L.recordPayout(sql, { ownerId: "maker-y", month: "2026-09", kind: "withheld", amountCents: 100, reason: "r" });
  const x = await L.makerSummary(sql, "maker-x");
  assert.equal(x.balanceCents, 700);
  assert.equal(x.history.length, 0, "maker-y's payout is not in maker-x's history");
  assert.equal(x.months.length, 1);

  const key = D.payoutKey("k".repeat(40));
  await D.saveDetails(sql, "maker-x", D.validateDetails({ holder: "Ada Obi", bank: "Bank X", account: "0123456789", country: "NG" }), key);
  assert.equal(await D.readDetails(sql, "maker-y", key), null);
  assert.equal((await D.readDetails(sql, "maker-x", key)).details.holder, "Ada Obi");
  await D.deleteDetails(sql, "maker-y");
  assert.ok(await D.readDetails(sql, "maker-x", key), "deleting another maker's details does nothing to mine");
  await D.deleteDetails(sql, "maker-x");
  assert.equal(await D.readDetails(sql, "maker-x", key), null);
  await pg.close();
});

test("payout details are encrypted at rest and round-trip", async () => {
  const { pg, sql } = await freshDb();
  const key = D.payoutKey("s".repeat(40));
  const details = D.validateDetails({ holder: "  Ada   Obi ", bank: "First Bank", account: "0123 456 789", country: "ng" });
  assert.deepEqual(details, { holder: "Ada Obi", bank: "First Bank", account: "0123456789", country: "NG" });
  await D.saveDetails(sql, "maker-z", details, key);
  const [{ details: blob }] = await sql.query(`select details from creator_payout_details where user_id = 'maker-z'`);
  assert.doesNotMatch(blob, /Ada|First|0123456789/, "nothing readable at rest");
  const sealedTwice = await D.sealDetails(details, key);
  assert.notEqual(sealedTwice, blob, "a fresh nonce every time");
  assert.deepEqual((await D.readDetails(sql, "maker-z", key)).details, details);
  await assert.rejects(D.openDetails(blob, D.payoutKey("t".repeat(40))), "a different secret can't read it");
  const masked = D.maskDetails(details, "2026-10-21T00:00:00Z");
  assert.equal(masked.account, "•••• 6789");
  assert.equal(masked.holder, "A•• O••");
  assert.throws(() => D.payoutKey(""), /can't be saved/);
  assert.throws(() => D.validateDetails({ holder: "A B", bank: "Bank", account: "12345", country: "NG" }), /account number/);
  assert.throws(() => D.validateDetails({ holder: "A B", bank: "Bank", account: "GB29NWBK60161331926819", country: "XX" }), /country/);
  await pg.close();
});
