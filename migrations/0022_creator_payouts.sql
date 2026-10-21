-- Creator earnings and manual payouts (src/lib/payouts/ledger.ts).
--
-- Makers earn 70% of Midnry Pass revenue after payment fees and refunds,
-- shared by opens. The pool is worked out from the payments Paystack reports.

-- Midnry Pass payments as Paystack reports them. One row per successful Pass
-- charge (id 'charge:<reference>') and per processed refund ('refund:<id>').
-- No user id or email: the pool only needs amounts and dates.
create table if not exists pass_payments (
  id text primary key,
  kind text not null,
  reference text not null,
  amount_cents integer not null,
  fees_cents integer not null default 0,
  fees_estimated boolean not null default false,
  currency text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists pass_payments_occurred on pass_payments (occurred_at);
create index if not exists pass_payments_reference on pass_payments (reference);

-- A closed (final) month: its pool and counted opens, frozen once the month
-- ends, because opens are deleted after 90 days.
create table if not exists creator_months (
  month date primary key,
  gross_cents bigint not null,
  fees_cents bigint not null,
  refunds_cents bigint not null,
  pool_cents bigint not null,
  total_uses integer not null,
  charges integer not null,
  estimated_fees integer not null,
  closed_at timestamptz not null default now()
);

-- Each app's share of a closed month, in USD cents.
create table if not exists creator_earnings (
  month date not null,
  app_id text not null,
  owner_id text not null,
  app_name text not null,
  uses integer not null,
  cents integer not null,
  primary key (month, app_id)
);
create index if not exists creator_earnings_owner on creator_earnings (owner_id);

-- Bank transfers made to a maker, and earnings the admin withheld. month is
-- the earnings month whose payout cycle the row settles.
create table if not exists creator_payouts (
  id text primary key,
  owner_id text not null,
  month date not null,
  kind text not null,
  amount_cents integer not null,
  paid_on date,
  transfer_reference text,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists creator_payouts_owner on creator_payouts (owner_id);

-- Where a maker wants to be paid. details is the encrypted JSON of account
-- holder, bank, account number and country (src/lib/payouts/details.ts).
create table if not exists creator_payout_details (
  user_id text primary key,
  details text not null,
  updated_at timestamptz not null default now()
);
