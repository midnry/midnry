alter table submissions add column if not exists features text not null default '';
alter table submissions add column if not exists guide text not null default '';
alter table submissions add column if not exists published_features text;
alter table submissions add column if not exists published_guide text;
