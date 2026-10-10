-- Abuja Hustle Hall of Fame: one row per finished life a signed-in player shares.
create table if not exists abuja_lives (
  id bigserial primary key,
  user_id text not null references "user" ("id") on delete cascade,
  life_key text not null,
  name text not null,
  ending text not null,
  net_worth bigint not null,
  age integer not null,
  generation integer not null default 1,
  background text not null,
  created_at timestamptz not null default now(),
  unique (user_id, life_key)
);
create index if not exists abuja_lives_worth on abuja_lives (net_worth desc);
create index if not exists abuja_lives_user_day on abuja_lives (user_id, created_at);
