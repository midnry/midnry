import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { readAccount } from "@/lib/account.server";
import { PASS_PRICE_CENTS, type AccountState } from "@/lib/access";

const PAYSTACK_API = "https://api.paystack.co";
const CURRENCY = "USD";

export type CheckoutStart =
  | { action: "redirect"; url: string }
  | { action: "already" }
  | { action: "unconfigured" };

export type BillingConfig = { ready: boolean; mode: "live" | "test" | "off" };

type PaystackCustomer = {
  id?: number;
  email?: string;
  customer_code?: string;
};

type PaystackPlan = {
  plan_code?: string;
  amount?: number;
  currency?: string;
  interval?: string;
};

type PaystackSub = {
  status?: string;
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string | null;
  customer?: PaystackCustomer | number;
  plan?: PaystackPlan | string;
};

type PaystackCharge = {
  status?: string;
  reference?: string;
  amount?: number | string;
  currency?: string;
  paid_at?: string | null;
  metadata?: { user_id?: string; purpose?: string } | null;
  customer?: PaystackCustomer;
  plan?: PaystackPlan | string | null;
};

export function readBillingConfig(): BillingConfig {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
  if (!key) return { ready: false, mode: "off" };
  if (key.includes("_test_")) return { ready: true, mode: "test" };
  return { ready: true, mode: "live" };
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("Card checkout is not configured.");
  return key;
}

function safeMessage(message: unknown, fallback: string): string {
  if (typeof message !== "string") return fallback;
  const text = message.trim();
  if (!text || text.length > 180 || /sk_|whsec_|bearer /i.test(text)) return fallback;
  return text;
}

async function paystack<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = (await response.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: T;
  } | null;
  if (!response.ok || !json || json.status === false) {
    throw new Error(safeMessage(json?.message, "Paystack rejected that request."));
  }
  return json.data as T;
}

function requestOrigin(): string {
  const request = getRequest();
  if (!request) throw new Error("Missing request.");
  const url = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host)
    .split(",")[0]
    .trim()
    .toLowerCase();
  const proto = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""))
    .split(",")[0]
    .trim()
    .toLowerCase();
  if ((proto !== "https" && proto !== "http") || !/^[a-z0-9.-]+(?::\d+)?$/.test(host)) {
    throw new Error("Could not determine the site address.");
  }
  return `${proto}://${host}`;
}

function addMonth(from: string): string {
  const date = new Date(from);
  if (Number.isNaN(date.getTime())) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

function futureIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function subState(sub: PaystackSub, paidAt?: string | null): {
  status: "active" | "canceled" | "inactive";
  periodEnd: string;
} {
  const next = futureIso(sub.next_payment_date);
  const paidAnchor = paidAt && !Number.isNaN(Date.parse(paidAt)) ? paidAt : new Date().toISOString();
  if (sub.status === "active" || sub.status === "non-renewing") {
    return {
      status: sub.status === "active" ? "active" : "canceled",
      periodEnd: next ?? addMonth(paidAnchor),
    };
  }
  if (sub.status === "attention") {
    return { status: "inactive", periodEnd: new Date().toISOString() };
  }
  return { status: "canceled", periodEnd: new Date().toISOString() };
}

function planCodeOf(plan: PaystackPlan | string | null | undefined): string | null {
  if (!plan) return null;
  if (typeof plan === "string") return plan;
  return plan.plan_code ?? null;
}

function customerOf(customer: PaystackSub["customer"]): PaystackCustomer | null {
  if (!customer || typeof customer === "number") return null;
  return customer;
}

function isMidnryPlan(plan: PaystackPlan | string | null | undefined, expected: string | null): boolean {
  const code = planCodeOf(plan);
  if (expected && code) return code === expected;
  if (!plan || typeof plan === "string") return false;
  return (
    Number(plan.amount) === PASS_PRICE_CENTS &&
    plan.currency?.toUpperCase() === CURRENCY &&
    plan.interval === "monthly"
  );
}

async function storedPlanCode(): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ plan_code: string }>`select plan_code from paystack_catalog where id = 1`;
  return rows[0]?.plan_code ?? null;
}

async function rememberPlan(planCode: string): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into paystack_catalog (id, plan_code) values (1, ${planCode})
    on conflict (id) do update set plan_code = excluded.plan_code
  `;
}

function assertPlan(plan: PaystackPlan): void {
  if (
    Number(plan.amount) !== PASS_PRICE_CENTS ||
    plan.currency?.toUpperCase() !== CURRENCY ||
    plan.interval !== "monthly"
  ) {
    throw new Error("The Paystack plan is not $5 USD per month.");
  }
}

async function resolvePlanCode(): Promise<string> {
  const envPlan = process.env.PAYSTACK_PLAN_CODE?.trim();
  if (envPlan) {
    assertPlan(await paystack<PaystackPlan>(`/plan/${encodeURIComponent(envPlan)}`));
    return envPlan;
  }
  const existing = await storedPlanCode();
  if (existing) {
    try {
      assertPlan(await paystack<PaystackPlan>(`/plan/${encodeURIComponent(existing)}`));
      return existing;
    } catch {
      // Plan belongs to the other Paystack mode, or the amount changed.
    }
  }
  const created = await paystack<PaystackPlan>("/plan", {
    method: "POST",
    body: {
      name: "Midnry Pass",
      interval: "monthly",
      amount: PASS_PRICE_CENTS,
      currency: CURRENCY,
    },
  });
  if (!created.plan_code) throw new Error("Paystack did not return a plan.");
  assertPlan(created);
  await rememberPlan(created.plan_code);
  return created.plan_code;
}

async function savePass(input: {
  userId: string;
  status: "active" | "canceled" | "inactive";
  periodEnd: string;
  customerCode?: string | null;
  subscriptionCode?: string | null;
  emailToken?: string | null;
  email?: string | null;
  reference?: string | null;
  mode: "force" | "same";
}): Promise<void> {
  const sql = await getSql();
  if (input.mode === "same" && input.subscriptionCode) {
    const existing = await sql<{ paystack_subscription_code: string | null }>`
      select paystack_subscription_code from subscriptions where user_id = ${input.userId}
    `;
    const current = existing[0]?.paystack_subscription_code;
    if (current && current !== input.subscriptionCode) return;
  }
  await sql`
    insert into subscriptions (
      user_id, status, price_cents, current_period_end,
      paystack_customer_code, paystack_subscription_code, paystack_email_token,
      paystack_email, paystack_reference, updated_at
    ) values (
      ${input.userId},
      ${input.status},
      ${PASS_PRICE_CENTS},
      ${input.periodEnd},
      ${input.customerCode ?? null},
      ${input.subscriptionCode ?? null},
      ${input.emailToken ?? null},
      ${input.email ?? null},
      ${input.reference ?? null},
      now()
    )
    on conflict (user_id) do update set
      status = excluded.status,
      price_cents = excluded.price_cents,
      current_period_end = excluded.current_period_end,
      paystack_customer_code = coalesce(excluded.paystack_customer_code, subscriptions.paystack_customer_code),
      paystack_subscription_code = coalesce(excluded.paystack_subscription_code, subscriptions.paystack_subscription_code),
      paystack_email_token = coalesce(excluded.paystack_email_token, subscriptions.paystack_email_token),
      paystack_email = coalesce(excluded.paystack_email, subscriptions.paystack_email),
      paystack_reference = coalesce(excluded.paystack_reference, subscriptions.paystack_reference),
      updated_at = now()
  `;
}

async function applySubscription(
  userId: string,
  sub: PaystackSub,
  mode: "force" | "same",
  reference?: string | null,
): Promise<void> {
  if (!sub.subscription_code) return;
  const customer = customerOf(sub.customer);
  const state = subState(sub);
  await savePass({
    userId,
    status: state.status,
    periodEnd: state.periodEnd,
    customerCode: customer?.customer_code ?? null,
    subscriptionCode: sub.subscription_code,
    emailToken: sub.email_token ?? null,
    email: customer?.email ?? null,
    reference,
    mode,
  });
}

async function userIdForCustomer(customerCode: string | null, email: string | null): Promise<string | null> {
  const sql = await getSql();
  if (customerCode) {
    const rows = await sql<{ user_id: string }>`
      select user_id from subscriptions where paystack_customer_code = ${customerCode}
    `;
    if (rows[0]?.user_id) return rows[0].user_id;
  }
  if (email) {
    const rows = await sql<{ user_id: string }>`
      select user_id from subscriptions where paystack_email = ${email}
    `;
    if (rows[0]?.user_id) return rows[0].user_id;
    const users = await sql<{ id: string }>`select id from "user" where email = ${email}`;
    if (users[0]?.id) return users[0].id;
  }
  return null;
}

async function findSubscription(customerId: number | undefined, planCode: string): Promise<PaystackSub | null> {
  if (!customerId) return null;
  const query = new URLSearchParams({
    customer: String(customerId),
    plan: planCode,
    perPage: "20",
  });
  const list = await paystack<PaystackSub[]>(`/subscription?${query.toString()}`);
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    list.find((sub) => sub.status === "active" || sub.status === "non-renewing") ??
    list[0] ??
    null
  );
}

async function accountEmail(userId: string): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  const email = rows[0]?.email?.trim();
  if (!email) throw new Error("Paystack needs an email on this account.");
  return email;
}

export async function beginCheckout(userId: string): Promise<CheckoutStart> {
  if (!readBillingConfig().ready) return { action: "unconfigured" };
  const sql = await getSql();
  const rows = await sql<{ paystack_subscription_code: string | null }>`
    select paystack_subscription_code from subscriptions where user_id = ${userId}
  `;
  const existingCode = rows[0]?.paystack_subscription_code;
  if (existingCode) {
    const sub = await paystack<PaystackSub>(`/subscription/${encodeURIComponent(existingCode)}`);
    await applySubscription(userId, sub, "force");
    if (sub.status === "active") return { action: "already" };
    if (sub.status === "non-renewing" || sub.status === "attention") {
      const link = await paystack<{ link?: string }>(
        `/subscription/${encodeURIComponent(existingCode)}/manage/link`,
      );
      if (!link.link) throw new Error("Paystack did not return a card page.");
      return { action: "redirect", url: link.link };
    }
  }
  const email = await accountEmail(userId);
  const planCode = await resolvePlanCode();
  await sql`
    insert into subscriptions (user_id, status, price_cents, paystack_email, updated_at)
    values (${userId}, 'inactive', ${PASS_PRICE_CENTS}, ${email}, now())
    on conflict (user_id) do update set
      paystack_email = excluded.paystack_email,
      updated_at = now()
  `;
  const reference = `midnry${crypto.randomUUID().replace(/-/g, "")}`;
  const origin = requestOrigin();
  const started = await paystack<{ authorization_url?: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email,
      amount: PASS_PRICE_CENTS,
      currency: CURRENCY,
      plan: planCode,
      reference,
      callback_url: `${origin}/billing?checkout=success`,
      metadata: { user_id: userId, purpose: "cove_pass" },
    },
  });
  if (!started.authorization_url) throw new Error("Paystack did not return a checkout page.");
  return { action: "redirect", url: started.authorization_url };
}

async function applyVerifiedCharge(userId: string, charge: PaystackCharge): Promise<void> {
  if (charge.status !== "success") throw new Error("The card payment is not complete.");
  if (Number(charge.amount) !== PASS_PRICE_CENTS || charge.currency?.toUpperCase() !== CURRENCY) {
    throw new Error("The payment was not $5 USD.");
  }
  const owner = charge.metadata?.user_id;
  if (owner && owner !== userId) throw new Error("This payment belongs to another account.");
  const planCode = await storedPlanCode();
  const purpose = charge.metadata?.purpose;
  if (purpose !== "cove_pass" && !isMidnryPlan(charge.plan, planCode)) {
    throw new Error("This payment is not for Midnry Pass.");
  }
  const paidAt = charge.paid_at ?? new Date().toISOString();
  let periodEnd = addMonth(paidAt);
  let subscriptionCode: string | null = null;
  let emailToken: string | null = null;
  const customer = charge.customer;
  if (planCode && customer?.id) {
    const sub = await findSubscription(customer.id, planCode).catch(() => null);
    if (sub?.subscription_code) {
      const state = subState(sub, paidAt);
      periodEnd = state.periodEnd;
      subscriptionCode = sub.subscription_code;
      emailToken = sub.email_token ?? null;
    }
  }
  await savePass({
    userId,
    status: "active",
    periodEnd,
    customerCode: customer?.customer_code ?? null,
    subscriptionCode,
    emailToken,
    email: customer?.email ?? null,
    reference: charge.reference ?? null,
    mode: "force",
  });
}

export async function confirmCheckout(userId: string, reference: string): Promise<AccountState> {
  const charge = await paystack<PaystackCharge>(`/transaction/verify/${encodeURIComponent(reference)}`);
  await applyVerifiedCharge(userId, charge);
  const account = await readAccount(userId);
  if (!account.hasPass) throw new Error("The payment is still processing.");
  return account;
}

async function loadSubRow(userId: string): Promise<{
  paystack_subscription_code: string | null;
  paystack_email_token: string | null;
} | null> {
  const sql = await getSql();
  const rows = await sql<{
    paystack_subscription_code: string | null;
    paystack_email_token: string | null;
  }>`
    select paystack_subscription_code, paystack_email_token
    from subscriptions
    where user_id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function cancelRenewal(userId: string): Promise<AccountState> {
  const row = await loadSubRow(userId);
  if (!row?.paystack_subscription_code || !row.paystack_email_token) {
    throw new Error("Paystack is still setting up the subscription. Try again in a minute.");
  }
  await paystack("/subscription/disable", {
    method: "POST",
    body: { code: row.paystack_subscription_code, token: row.paystack_email_token },
  });
  const sub = await paystack<PaystackSub>(
    `/subscription/${encodeURIComponent(row.paystack_subscription_code)}`,
  );
  await applySubscription(userId, sub, "force");
  return readAccount(userId);
}

export async function resumeRenewal(userId: string): Promise<AccountState> {
  const row = await loadSubRow(userId);
  if (!row?.paystack_subscription_code || !row.paystack_email_token) {
    throw new Error("There is no card subscription to resume.");
  }
  await paystack("/subscription/enable", {
    method: "POST",
    body: { code: row.paystack_subscription_code, token: row.paystack_email_token },
  });
  const sub = await paystack<PaystackSub>(
    `/subscription/${encodeURIComponent(row.paystack_subscription_code)}`,
  );
  await applySubscription(userId, sub, "force");
  return readAccount(userId);
}

export async function openCardPortal(userId: string): Promise<string> {
  const row = await loadSubRow(userId);
  if (!row?.paystack_subscription_code) throw new Error("No card is on file yet.");
  const link = await paystack<{ link?: string }>(
    `/subscription/${encodeURIComponent(row.paystack_subscription_code)}/manage/link`,
  );
  if (!link.link) throw new Error("Paystack did not return a card page.");
  return link.link;
}

function signed(payload: string, header: string | null): boolean {
  if (!header) return false;
  const hash = createHmac("sha512", secretKey()).update(payload).digest("hex");
  const actual = Buffer.from(hash);
  const claimed = Buffer.from(header);
  if (actual.length !== claimed.length) return false;
  return timingSafeEqual(actual, claimed);
}

export async function handlePaystackWebhook(request: Request): Promise<Response> {
  if (!readBillingConfig().ready) return new Response("Paystack is not configured", { status: 500 });
  const payload = await request.text();
  if (!signed(payload, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let event: { event?: string; data?: unknown };
  try {
    event = JSON.parse(payload) as { event?: string; data?: unknown };
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
  try {
    await dispatch(event.event ?? "", event.data);
  } catch {
    console.error("paystack webhook failed", event.event);
    return new Response("retry", { status: 500 });
  }
  return new Response("ok");
}

async function dispatch(name: string, data: unknown): Promise<void> {
  if (!data || typeof data !== "object") return;
  if (name === "charge.success") {
    const charge = data as PaystackCharge;
    const userId =
      charge.metadata?.user_id ||
      (await userIdForCustomer(charge.customer?.customer_code ?? null, charge.customer?.email ?? null));
    if (!userId) return;
    const planCode = await storedPlanCode();
    if (charge.metadata?.purpose !== "cove_pass" && !isMidnryPlan(charge.plan, planCode)) return;
    if (Number(charge.amount) !== PASS_PRICE_CENTS || charge.currency?.toUpperCase() !== CURRENCY) return;
    if (charge.status !== "success") return;
    await applyVerifiedCharge(userId, charge);
    return;
  }
  if (name !== "subscription.create" && name !== "subscription.disable" && name !== "subscription.not_renew") {
    return;
  }
  const sub = data as PaystackSub;
  const customer = customerOf(sub.customer);
  const userId = await userIdForCustomer(customer?.customer_code ?? null, customer?.email ?? null);
  if (!userId) return;
  const planCode = await storedPlanCode();
  if (!isMidnryPlan(sub.plan, planCode) && name === "subscription.create") return;
  await applySubscription(userId, sub, name === "subscription.create" ? "force" : "same");
}
