-- Daily case leaderboard: each device's best score for one UTC day. Players
-- are anonymous; `player` is a hash of a random device token, never shown.
create table if not exists outpost_daily (
  day date not null,
  player text not null,
  name text not null,
  score integer not null,
  won boolean not null,
  seconds integer not null,
  updated_at timestamptz not null default now(),
  primary key (day, player)
);
create index if not exists outpost_daily_board on outpost_daily(day, score desc, seconds asc, updated_at asc);
