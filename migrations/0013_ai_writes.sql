-- How many AI writes each person used per day, for the daily allowance.
create table if not exists ai_writes (
  user_id text not null references "user" ("id") on delete cascade,
  used_on date not null,
  count integer not null default 0,
  primary key (user_id, used_on)
);
