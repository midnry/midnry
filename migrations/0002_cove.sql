create table if not exists subscriptions (
  user_id text primary key,
  status text not null,
  price_cents integer not null default 500,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_documents (
  user_id text not null,
  app_id text not null,
  payload text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, app_id)
);
