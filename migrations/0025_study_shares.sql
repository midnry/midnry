-- Study space share links (Midnry Pass, decision D6 in docs/phase3-plan.md).
-- One row is one read-only link to a copy of a deck or quiz. The token is 32
-- random URL-safe characters; anyone signed in who has it can open the copy
-- and save it into their own Study space. The owner turns a link off by
-- deleting its row. Rows go with the account (src/lib/retention.ts), and a
-- closed account's links stop opening at once (src/lib/study-shares.server.ts).
--
-- Additive: a new table only. Rollback: deploy the previous code, then if
-- wanted:  drop table if exists study_shares;
create table if not exists study_shares (
  token text primary key,
  owner_id text not null references "user" ("id") on delete cascade,
  kind text not null check (kind in ('deck', 'quiz')),
  item_id text not null,
  title text not null,
  payload text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind, item_id)
);

create index if not exists study_shares_owner_idx on study_shares (owner_id);
