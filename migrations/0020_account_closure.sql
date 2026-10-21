-- Account closure and data retention (src/lib/retention.ts).
--
-- A closed account gets one row here. Its sessions are revoked and sign-in is
-- refused while the row exists; after 30 days the hourly job deletes the
-- account's data. Restoring an account (by email to hello@midnry.com) means
-- deleting this row before then.
create table if not exists account_closure (
  user_id text primary key,
  closed_at timestamptz not null default now()
);
create index if not exists account_closure_closed_at on account_closure (closed_at);

-- When each housekeeping job last ran, so a scheduler that pings every few
-- minutes still runs a job at most once per period.
create table if not exists maintenance_runs (
  job text primary key,
  last_run timestamptz not null
);

-- Paid store records are kept for tax and accounting after an account is
-- deleted (anonymised, for 6 years), so they must not cascade away with the
-- user row.
alter table outpost_purchase drop constraint if exists outpost_purchase_user_id_fkey;

-- The 90-day retention deletes by date.
create index if not exists app_uses_used_on on app_uses (used_on);
create index if not exists catalog_uses_used_on on catalog_uses (used_on);
create index if not exists ai_writes_used_on on ai_writes (used_on);
create index if not exists abuja_play_created on abuja_play (created_at);
