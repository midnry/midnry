-- Writing studio drafts (docs/phase3-plan.md, D3 and D4): one row per draft,
-- so a Midnry Pass history of several hundred drafts per mode never makes one
-- huge document. `payload` is the draft as JSON (src/lib/studio.ts, Draft);
-- `title` is copied out for the drafts list; `revision` makes saves
-- compare-and-set, like app_documents (0023). Rows go with the account
-- (on delete cascade, and USER_COLUMNS in src/lib/retention.ts).
--
-- Additive: a new table only. The old writing apps' documents in
-- app_documents are read, never changed, by the studio.
-- Rollback: deploy the previous code, then if wanted:  drop table if exists writing_drafts;
create table if not exists writing_drafts (
  user_id text not null references "user" ("id") on delete cascade,
  id text not null,
  mode text not null,
  title text not null default '',
  payload text not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists writing_drafts_user_mode on writing_drafts (user_id, mode, updated_at desc);
