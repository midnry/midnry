-- Age confirmation at sign-up (src/lib/auth/age.server.ts).
--
-- When a new account ticked "I'm 13 or older, or I have a parent's or
-- guardian's permission". Every account created from now on has it: email
-- sign-up and Google sign-up both refuse to create the account without the
-- tick. Accounts created before this migration stay null (they were never
-- asked); nothing is backfilled.
alter table "user" add column if not exists age_confirmed_at timestamptz;
