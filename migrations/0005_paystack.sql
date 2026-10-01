alter table subscriptions add column if not exists paystack_customer_code text;
alter table subscriptions add column if not exists paystack_subscription_code text;
alter table subscriptions add column if not exists paystack_email_token text;
alter table subscriptions add column if not exists paystack_email text;
alter table subscriptions add column if not exists paystack_reference text;

create unique index if not exists subscriptions_paystack_subscription_idx
  on subscriptions (paystack_subscription_code)
  where paystack_subscription_code is not null;

create index if not exists subscriptions_paystack_customer_idx
  on subscriptions (paystack_customer_code);

create table if not exists paystack_catalog (
  id integer primary key,
  plan_code text not null
);
