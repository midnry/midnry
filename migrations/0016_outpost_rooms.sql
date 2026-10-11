-- Short-lived anonymous game rooms. Player capabilities are stored as hashes
-- inside state; optimistic versions protect concurrent joins and game updates.
create table if not exists outpost_room (
  code text primary key,
  version bigint not null default 0,
  state jsonb not null,
  expires_at timestamptz not null
);
create index if not exists outpost_room_expiry on outpost_room(expires_at);
