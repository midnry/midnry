-- Remind: shared projects, invitations, file attachments and calendar links.
-- Personal tasks stay in app_documents (app_id 'tasks').

create table if not exists remind_projects (
  id text primary key,
  owner_id text not null references "user" ("id") on delete cascade,
  name text not null,
  doc text not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists remind_members (
  project_id text not null references remind_projects ("id") on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists remind_members_user_idx on remind_members (user_id);

create table if not exists remind_invites (
  project_id text not null references remind_projects ("id") on delete cascade,
  email text not null,
  invited_by text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);

create index if not exists remind_invites_email_idx on remind_invites (email);

create table if not exists remind_files (
  id text primary key,
  owner_id text not null references "user" ("id") on delete cascade,
  project_id text references remind_projects ("id") on delete cascade,
  task_id text not null,
  name text not null,
  mime text not null,
  size integer not null,
  data text not null,
  created_at timestamptz not null default now()
);

create index if not exists remind_files_task_idx on remind_files (task_id);
create index if not exists remind_files_owner_idx on remind_files (owner_id);

create table if not exists remind_feeds (
  user_id text primary key references "user" ("id") on delete cascade,
  token text not null unique,
  tz text not null default 'UTC',
  created_at timestamptz not null default now()
);
