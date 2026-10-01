alter table "user" add column if not exists "twoFactorEnabled" boolean not null default false;

create table if not exists "twoFactor" (
  "id" text not null primary key,
  "secret" text not null,
  "backupCodes" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "verified" boolean not null default true,
  "failedVerificationCount" integer not null default 0,
  "lockedUntil" timestamptz
);

create unique index if not exists "twoFactor_userId_uidx" on "twoFactor" ("userId");
create index if not exists "twoFactor_secret_idx" on "twoFactor" ("secret");
