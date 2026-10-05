create table if not exists user_avatar (
  user_id text primary key references "user" ("id") on delete cascade,
  mime text not null,
  data text not null,
  updated_at timestamptz not null default now()
);
