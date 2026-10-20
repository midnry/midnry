-- Outpost Zero: one row per finished match of a signed-in player (the game
-- requires sign-in). Numbers come from the player's game and are capped on
-- the server; they are for the owner's stats, not a competitive ranking.
create table if not exists outpost_match (
  user_id text not null references "user" ("id") on delete cascade,
  round_id text not null,
  mode text not null,
  map text not null,
  online boolean not null,
  platform text not null,
  won boolean not null,
  kills integer not null,
  damage integer not null,
  seconds integer not null,
  placement integer not null,
  role text,
  created_at timestamptz not null default now(),
  primary key (user_id, round_id)
);
create index if not exists outpost_match_recent on outpost_match (created_at);
