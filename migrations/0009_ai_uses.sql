create table if not exists ai_uses (
  user_id text not null,
  used_on date not null,
  count integer not null default 0,
  primary key (user_id, used_on)
);
