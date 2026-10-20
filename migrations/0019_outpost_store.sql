-- Outpost Zero store: one row per checkout. A row becomes 'paid' only after
-- the server has verified the charge with Paystack (redirect back or the
-- signed webhook); an account owns an item when it has a paid row for it.
create table if not exists outpost_purchase (
  reference text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  item text not null,
  amount integer not null,
  currency text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists outpost_purchase_owned on outpost_purchase (user_id, item) where status = 'paid';
create index if not exists outpost_purchase_recent on outpost_purchase (created_at);
