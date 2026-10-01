create table if not exists submissions (
  id text primary key,
  owner_id text not null,
  slug text not null unique,
  name text not null,
  blurb text not null,
  genre text not null,
  html text not null,
  draft_status text not null,
  review_note text,
  published_name text,
  published_blurb text,
  published_genre text,
  published_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_owner_idx on submissions (owner_id);

create table if not exists admin_seat (
  id integer primary key,
  user_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_uses (
  app_id text not null,
  user_id text not null,
  used_on date not null,
  primary key (app_id, user_id, used_on)
);
