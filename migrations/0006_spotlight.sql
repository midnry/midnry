create table if not exists catalog_uses (
  slug text not null,
  user_id text not null,
  used_on date not null,
  primary key (slug, user_id, used_on)
);

create table if not exists app_favorites (
  user_id text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create index if not exists app_favorites_user_idx on app_favorites (user_id, created_at desc);
