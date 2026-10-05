-- Remind email: who wants which emails, what was already sent, and a throttle
-- so the scheduler runs at most once a minute however often it is pinged.

create table if not exists remind_email_prefs (
  user_id text primary key references "user" ("id") on delete cascade,
  digest boolean not null default false,
  due boolean not null default false,
  tz text not null default 'UTC',
  unsub_token text not null unique,
  last_test timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists remind_email_sent (
  key text primary key,
  user_id text not null,
  sent_at timestamptz not null default now()
);

create index if not exists remind_email_sent_at_idx on remind_email_sent (sent_at);

create table if not exists remind_tick (
  id integer primary key,
  last_run timestamptz not null
);
