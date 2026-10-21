-- A revision number on each saved app document, so a save can say which
-- revision it was based on and be refused (instead of silently overwriting)
-- when another tab or device saved in between. See src/lib/app-docs.server.ts.
--
-- Additive and safe to run on a live table: existing rows get revision 0 and
-- their payload is untouched. Older code ignores the column.
-- Rollback: deploy the previous code (it does not read the column), then if
-- wanted:  alter table app_documents drop column if exists revision;
alter table app_documents add column if not exists revision integer not null default 0;
