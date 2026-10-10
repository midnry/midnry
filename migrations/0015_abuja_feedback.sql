-- Abuja Hustle: what players tell us (the pause-menu feedback button) and
-- anonymous play counts (how far lives get, endings, loading times). A random
-- id per device groups play events; nothing personal is stored with them.
create table if not exists abuja_feedback (
  id bigserial primary key,
  user_id text references "user" ("id") on delete set null,
  device text not null,
  message text not null,
  context text not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists abuja_feedback_created on abuja_feedback (created_at desc);

create table if not exists abuja_play (
  id bigserial primary key,
  device text not null,
  kind text not null,
  label text not null default '',
  num double precision,
  created_at timestamptz not null default now()
);
create index if not exists abuja_play_kind on abuja_play (kind, created_at);
create index if not exists abuja_play_device_day on abuja_play (device, created_at);
