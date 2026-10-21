// Creator earnings and payouts, end to end on the local dev server
// (sh scripts/qa/dev-up.sh; its PAYSTACK_SECRET_KEY signs the webhooks here):
//  1. signed Paystack webhooks record Pass payments (fees, missing fees,
//     a repeat delivery, a refund) and the maker's /earnings pool follows,
//  2. a maker saves, sees masked, edits and deletes payout details,
//  3. /payouts is refused to a maker and shown to the admin, with the final
//     month and the CSV export.
//   node scripts/qa/payouts.mjs [outdir]
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const SECRET = process.env.PAYSTACK_SECRET_KEY || "sk_test_outpost_qa_local";
const OUT = process.argv[2] || "screenshots/qa/payouts";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const stamp = Date.now().toString(36);
const password = "payouts-qa-pass-1";
const headers = { origin: BASE };

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function account(ctx, email, name) {
  const r = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email, password, name, ageConfirmed: true } });
  if (!r.ok()) await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email, password } });
}

async function newCtx(viewport = { width: 1280, height: 860 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
  return ctx;
}

async function webhook(event, data) {
  const payload = JSON.stringify({ event, data });
  const signature = createHmac("sha512", SECRET).update(payload).digest("hex");
  const r = await fetch(`${BASE}/api/paystack/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-paystack-signature": signature },
    body: payload,
  });
  return r.status;
}

const passCharge = (reference, paidAt, fees) => ({
  status: "success",
  reference,
  amount: 500,
  currency: "USD",
  ...(fees === undefined ? {} : { fees }),
  paid_at: paidAt,
  metadata: { purpose: "cove_pass" },
  customer: { email: `nobody-${stamp}@example.test`, customer_code: `CUS_${stamp}` },
});

async function poolCents(page) {
  await page.goto(`${BASE}/earnings`, { waitUntil: "networkidle", timeout: 120000 });
  const text = await page.getByText(/^Pool so far/).textContent({ timeout: 60000 });
  return Math.round(Number(/Pool so far \$([\d,.]+)/.exec(text)[1].replace(/,/g, "")) * 100);
}

// 1. Payments → pool.
const makerCtx = await newCtx();
await account(makerCtx, `qa-maker-${stamp}@example.test`, "QA Maker");
const maker = await makerCtx.newPage();
const before = await poolCents(maker);
ok(await maker.getByText("estimated", { exact: true }).first().isVisible(), "current month is labelled estimated");
ok(await maker.getByText(/after payment fees and refunds, shared by opens/).first().isVisible(), "earnings copy names fees and refunds");

const now = new Date().toISOString();
ok((await webhook("charge.success", passCharge(`qa-a-${stamp}`, now, 30))) === 200, "charge webhook accepted");
ok((await webhook("charge.success", passCharge(`qa-a-${stamp}`, now, 30))) === 200, "repeat delivery accepted");
ok((await webhook("charge.success", passCharge(`qa-b-${stamp}`, now))) === 200, "charge without fees accepted");
const afterCharges = await poolCents(maker);
// 70% × (500 − 30) + 70% × (500 − estimated 27)
const expected = Math.floor(((500 - 30) * 70) / 100);
const delta = afterCharges - before;
ok(delta >= expected + 300 && delta <= expected + 340, `pool grew once per payment, net of fees (+${delta} cents)`);
ok((await webhook("refund.processed", { id: `rf-${stamp}`, transaction_reference: `qa-a-${stamp}`, amount: 500, currency: "USD", status: "processed" })) === 200, "refund webhook accepted");
ok((await webhook("refund.processed", { id: `rf-x-${stamp}`, transaction_reference: `unknown-${stamp}`, amount: 500, currency: "USD" })) === 200, "refund of an unknown payment is ignored");
const afterRefund = await poolCents(maker);
ok(afterCharges - afterRefund >= 349 && afterCharges - afterRefund <= 351, `refund comes off the pool (−${afterCharges - afterRefund} cents)`);
// A payment last month, so a final month exists for /payouts.
const last = new Date();
last.setUTCDate(1);
last.setUTCMonth(last.getUTCMonth() - 1);
last.setUTCDate(15);
ok((await webhook("charge.success", passCharge(`qa-c-${stamp}`, last.toISOString(), 30))) === 200, "last month's charge accepted");

// 2. Payout details.
await maker.goto(`${BASE}/earnings#payout-details`, { waitUntil: "networkidle" });
const section = maker.locator("#payout-details");
ok(await maker.getByText("You’re responsible for any tax on your earnings.").isVisible(), "tax line");
ok(await maker.getByText(/once your balance reaches US\$20 \(₦20,000/).isVisible(), "payout rule copy");
await section.getByLabel("Account holder name").fill("Ada QA Maker");
await section.getByLabel("Bank name").fill("QA Bank");
await section.getByLabel("Account number").fill("123456789");
await section.getByLabel("Bank country").selectOption("NG");
await section.getByRole("button", { name: "Save payout details" }).click();
const alert = section.getByRole("alert");
await alert.waitFor({ timeout: 30000 }).catch(() => {});
ok(/Nigerian account number has 10 digits/.test((await alert.textContent().catch(() => "")) ?? ""), `bad NUBAN refused (${await alert.textContent().catch(() => "no alert")})`);
await section.getByLabel("Account number").fill("0123456789");
await section.getByRole("button", { name: "Save payout details" }).click();
await section.getByText("•••• 6789").waitFor({ timeout: 30000 });
ok(true, "saved details shown masked");
await maker.reload({ waitUntil: "networkidle" });
await section.getByText("•••• 6789").waitFor({ timeout: 30000 });
const html = await maker.content();
ok(!html.includes("0123456789") && !html.includes("Ada QA Maker"), "full account number and name never reach the page");
await section.scrollIntoViewIfNeeded();
await maker.screenshot({ path: `${OUT}/earnings-desktop.png`, fullPage: true });
await section.getByRole("button", { name: "Edit" }).click();
await section.getByLabel("Account holder name").fill("Ada QA Maker");
await section.getByLabel("Account number").fill("0123456780");
await section.getByRole("button", { name: "Save payout details" }).click();
await section.getByText("•••• 6780").waitFor({ timeout: 30000 });
ok(true, "details edited");

// 3. Admin page: refused to the maker.
await maker.goto(`${BASE}/payouts`, { waitUntil: "networkidle" });
ok(await maker.getByText("Only the admin can see payouts.").isVisible(), "maker is refused /payouts");

const adminCtx = await newCtx();
await account(adminCtx, "qa-admin@example.test", "QA Admin");
const admin = await adminCtx.newPage();
await admin.goto(`${BASE}/payouts`, { waitUntil: "networkidle", timeout: 120000 });
await admin.getByRole("heading", { name: "Payouts" }).waitFor({ timeout: 60000 });
ok(await admin.getByRole("link", { name: "Payouts" }).first().isVisible().catch(() => false) || (await admin.locator('a[href="/payouts"]').count()) > 0, "Payouts in the admin nav");
ok(await admin.getByText("estimated", { exact: true }).first().isVisible(), "current month estimated on /payouts");
ok(await admin.getByRole("heading", { name: "Final months" }).isVisible(), "final months section");
ok(await admin.getByLabel("Month").isVisible(), "a final month is listed");
ok(await admin.getByText(/Transfers for this month are due by/).isVisible(), "due date shown");
ok(await admin.getByRole("button", { name: "Export CSV" }).isVisible(), "CSV export button");
await admin.screenshot({ path: `${OUT}/payouts-desktop.png`, fullPage: true });

const phoneCtx = await newCtx({ width: 390, height: 844 }, true);
await account(phoneCtx, "qa-admin@example.test", "QA Admin");
const phone = await phoneCtx.newPage();
await phone.goto(`${BASE}/payouts`, { waitUntil: "networkidle", timeout: 120000 });
await phone.getByRole("heading", { name: "Payouts" }).waitFor({ timeout: 60000 });
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll on a phone (/payouts)");
await phone.screenshot({ path: `${OUT}/payouts-phone.png`, fullPage: true });
await phone.goto(`${BASE}/earnings`, { waitUntil: "networkidle" });
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll on a phone (/earnings)");
await phone.screenshot({ path: `${OUT}/earnings-phone.png`, fullPage: true });

// Clean up: delete the maker's details.
maker.once("dialog", (d) => void d.accept());
await maker.goto(`${BASE}/earnings#payout-details`, { waitUntil: "networkidle" });
await section.getByRole("button", { name: "Delete" }).click();
await section.getByRole("button", { name: "Save payout details" }).waitFor({ timeout: 30000 });
ok(true, "details deleted");

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
if (fails.length) {
  console.log(`\n${fails.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
