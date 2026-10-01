alter table subscriptions add column if not exists stripe_customer_id text;
alter table subscriptions add column if not exists stripe_subscription_id text;

create unique index if not exists subscriptions_stripe_subscription_idx
  on subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists subscriptions_stripe_customer_idx
  on subscriptions (stripe_customer_id);

create table if not exists stripe_catalog (
  id integer primary key,
  price_id text not null
);
