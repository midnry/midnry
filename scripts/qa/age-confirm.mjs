// Age confirmations, end to end on the local dev server (sh scripts/qa/dev-up.sh)
// with the stand-in Paystack (node scripts/qa/mock-paystack.mjs on :8099):
//  1. sign-up needs "13 or older, or a parent's or guardian's permission";
//     sign-in of an existing account does not,
//  2. Midnry Pass checkout on /billing needs "18 or older, or a parent or
//     guardian is paying",
//  3. the Outpost Zero Locker needs the same before a store checkout,
//  4. the server refuses each without the flag (direct calls),
//  5. phone layout (390×844) of all three.
// Usage: node scripts/qa/age-confirm.mjs [outdir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const OUT = process.argv[2] || "screenshots/qa/age";
mkdirSync(OUT, { recursive: true });
const BASE = "http://127.0.0.1:8080";
const AGE = "I'm 13 or older, or I have a parent's or guardian's permission.";
const ADULT = "I'm 18 or older, or a parent or guardian is paying.";
const fails = [];
const errors = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const stamp = Date.now().toString(36);
const password = "correct-horse-42";

async function newPage(viewport = { width: 1280, height: 860 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  return page;
}
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const hit = async (locator) => (await locator.boundingBox())?.height ?? 0;

// ── 1. Sign-up ──────────────────────────────────────────────────────────────
const email = `qa-age-${stamp}@example.test`;
const page = await newPage();
await page.goto(`${BASE}/login?intent=register&next=/billing`, { waitUntil: "networkidle", timeout: 120000 });
await page.getByLabel("Name").fill("QA Age");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill(password);
const ageBox = page.getByLabel(AGE);
ok(await ageBox.isVisible(), "sign-up shows the age checkbox");
ok((await ageBox.getAttribute("type")) === "checkbox", "it is a real checkbox");
ok((await hit(page.locator("label", { has: ageBox }))) >= 44, "age label hit area is at least 44px");
await page.getByRole("button", { name: "Create account" }).click();
const ageError = page.locator("#age-confirm-error");
await ageError.waitFor({ timeout: 10000 });
ok(/confirm you're 13 or older/.test(await ageError.innerText()), "unticked sign-up shows the inline message");
ok((await ageBox.getAttribute("aria-describedby")) === "age-confirm-error", "message is linked with aria-describedby");
ok(await ageBox.evaluate((el) => el === document.activeElement), "focus moves to the checkbox");
ok(page.url().includes("/login"), "no account created without the tick");
await page.screenshot({ path: `${OUT}/signup-blocked-1280.png` });
// Keyboard: Space ticks it.
await ageBox.focus();
await page.keyboard.press("Space");
ok(await ageBox.isChecked(), "Space ticks the checkbox");
ok(!(await ageError.isVisible()), "ticking clears the message");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL(/\/billing/, { timeout: 60000 });
ok(true, "ticked sign-up creates the account");

// Sign-in of the existing account: no checkbox.
const signin = await newPage();
await signin.goto(`${BASE}/login?intent=sign-in&next=/apps`, { waitUntil: "networkidle" });
ok((await signin.getByLabel(AGE).count()) === 0, "sign-in has no age checkbox");
await signin.getByLabel("Email").fill(email);
await signin.getByLabel("Password").fill(password);
await signin.getByRole("button", { name: "Sign in" }).click();
await signin.waitForURL(/\/apps/, { timeout: 60000 });
ok(true, "existing account signs in without it");

// The OAuth error redirect lands on the register form with the message.
await signin.context().clearCookies();
await signin.goto(`${BASE}/login?error=AGE_CONFIRMATION_REQUIRED&intent=sign-in`, { waitUntil: "networkidle" });
ok(await signin.locator("#age-confirm-error").isVisible(), "Google refusal (?error=AGE_CONFIRMATION_REQUIRED) shows the message");
ok(await signin.getByRole("button", { name: "Create account" }).isVisible(), "…on the register form");

// Direct API: sign-up without the flag is refused.
const api = await page.evaluate(async (e) => {
  const r = await fetch("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "X", email: e, password: "correct-horse-42" }),
  });
  return { status: r.status, body: await r.json() };
}, `qa-age-api-${stamp}@example.test`);
ok(api.status === 400 && api.body.code === "AGE_CONFIRMATION_REQUIRED", `API sign-up without ageConfirmed is refused (${api.status})`);

// ── 2. Billing ──────────────────────────────────────────────────────────────
await page.goto(`${BASE}/billing`, { waitUntil: "networkidle" });
const adultBox = page.getByLabel(ADULT);
await adultBox.waitFor({ timeout: 30000 });
ok((await hit(page.locator("label", { has: adultBox }))) >= 44, "billing label hit area is at least 44px");
await page.getByRole("button", { name: /Get Midnry Pass/ }).click();
const adultError = page.locator("#adult-confirm-error");
await adultError.waitFor({ timeout: 10000 });
ok((await adultBox.getAttribute("aria-describedby")) === "adult-confirm-error", "billing message linked with aria-describedby");
ok(page.url().endsWith("/billing"), "billing checkout blocked without the tick");
await page.screenshot({ path: `${OUT}/billing-blocked-1280.png` });

// Direct server call without the flag: rewrite the request body.
await page.route("**/_serverFn/**", async (route) => {
  const body = route.request().postData() || "";
  if (!body.includes("adultConfirmed")) return route.continue();
  // Server functions send seroval: true is {"t":2,"s":2}, false {"t":2,"s":3}.
  const tampered = body.replace('"k":["adultConfirmed"],"v":[{"t":2,"s":2}]', '"k":["adultConfirmed"],"v":[{"t":2,"s":3}]');
  ok(tampered !== body, "request body was rewritten to adultConfirmed: false");
  await route.continue({ postData: tampered });
});
await adultBox.check();
await page.getByRole("button", { name: /Get Midnry Pass/ }).click();
await page.waitForTimeout(3000);
ok(page.url().endsWith("/billing"), "server refuses beginCheckout with adultConfirmed: false");
ok(await page.getByText("Before paying, confirm").first().isVisible(), "…and the page says why");
await page.unroute("**/_serverFn/**");
await page.reload({ waitUntil: "networkidle" });
await page.getByLabel(ADULT).check();
await page.getByRole("button", { name: /Get Midnry Pass/ }).click();
await page.waitForURL(/127\.0\.0\.1:8099\/pay\//, { timeout: 60000 });
ok(true, "ticked billing checkout opens Paystack");
await page.screenshot({ path: `${OUT}/billing-paystack-1280.png` });

// ── 3. Outpost Zero store ──────────────────────────────────────────────────
const storeApi = await page.context().newPage();
await storeApi.goto(`${BASE}/robots.txt`);
const call = (data) =>
  storeApi.evaluate(async (data) => {
    const r = await fetch("/api/games/outpost-store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    return { status: r.status, body: await r.json() };
  }, data);
const bare = await call({ op: "buy", item: "carbon" });
ok(bare.status === 400 && /18 or older/.test(bare.body.error), `store API buy without adultConfirmed is refused (${bare.status})`);
const falsy = await call({ op: "buy", item: "carbon", adultConfirmed: "true" });
ok(falsy.status === 400, "store API only accepts adultConfirmed: true (boolean)");

const game = (p) => p.frames().find((f) => f.url().includes("outpost-zero.html"));
const ready = (p) =>
  p.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector(".mf-start:not([disabled])"), null, { timeout: 240000 });
const g = page;
await g.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
await ready(g);
await game(g).evaluate(() => document.querySelector("midnry-fps").engine.retention.locker());
await game(g).waitForSelector('[data-finish="tiger"] .mf-finishstate:text("Buy")', { timeout: 30000 });
const check = game(g).getByLabel(ADULT);
ok(await check.isVisible(), "Locker shows the adult checkbox");
ok((await hit(game(g).locator(".mf-adult label"))) >= 44, "Locker label hit area is at least 44px");
await game(g).locator('[data-finish="tiger"]').click();
await game(g).locator("#mf-adulterr").waitFor({ timeout: 10000 });
ok((await game(g).locator(".mf-adultcheck").getAttribute("aria-describedby")) === "mf-adulterr", "Locker message linked with aria-describedby");
ok(await game(g).locator(".mf-adultcheck").evaluate((el) => el === document.activeElement), "focus moves to the Locker checkbox");
ok(g.url().includes("/games/outpost-zero"), "store checkout blocked without the tick");
await game(g).locator(".mf-adult").scrollIntoViewIfNeeded();
await g.screenshot({ path: `${OUT}/locker-blocked-1280.png` });
await g.keyboard.press("Space");
ok(await game(g).locator(".mf-adultcheck").isChecked(), "Space ticks the Locker checkbox");
ok((await game(g).locator("#mf-adulterr").count()) === 0, "ticking clears the Locker message");
await g.screenshot({ path: `${OUT}/locker-ticked-1280.png` });
await game(g).locator('[data-finish="tiger"]').click({ noWaitAfter: true });
await g.waitForURL(/127\.0\.0\.1:8099\/pay\//, { timeout: 60000 });
ok(true, "ticked store purchase opens Paystack");

// ── 4. Phone ───────────────────────────────────────────────────────────────
const phone = await newPage({ width: 390, height: 844 }, true);
await phone.goto(`${BASE}/login?intent=register`, { waitUntil: "networkidle" });
await phone.getByLabel("Name").fill("QA Phone");
await phone.getByLabel("Email").fill(`qa-age-m-${stamp}@example.test`);
await phone.getByLabel("Password").fill(password);
await phone.getByRole("button", { name: "Create account" }).click();
await phone.locator("#age-confirm-error").waitFor();
ok(await noOverflow(phone), "phone sign-up: no horizontal overflow");
await phone.screenshot({ path: `${OUT}/signup-blocked-390.png`, fullPage: true });
await phone.goto(`${BASE}/login?intent=sign-in&next=/billing`, { waitUntil: "networkidle" });
await phone.getByLabel("Email").fill(email);
await phone.getByLabel("Password").fill(password);
await phone.getByRole("button", { name: "Sign in" }).click();
await phone.waitForURL(/\/billing/, { timeout: 60000 });
await phone.getByRole("button", { name: /Get Midnry Pass/ }).click();
await phone.locator("#adult-confirm-error").waitFor();
ok(await noOverflow(phone), "phone billing: no horizontal overflow");
await phone.screenshot({ path: `${OUT}/billing-blocked-390.png`, fullPage: true });
await phone.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
await ready(phone);
await game(phone).evaluate(() => document.querySelector("midnry-fps").engine.retention.locker());
await game(phone).waitForSelector(".mf-adult", { timeout: 30000 });
await game(phone).locator('[data-finish="tiger"]').click();
await game(phone).locator("#mf-adulterr").waitFor();
await game(phone).locator(".mf-adult").scrollIntoViewIfNeeded();
const lockerFits = await game(phone).evaluate(() => {
  const body = document.querySelector(".mf-lockerbody");
  const box = document.querySelector(".mf-adult").getBoundingClientRect();
  return body.scrollWidth <= body.clientWidth + 1 && box.right <= window.innerWidth;
});
ok(lockerFits, "phone Locker: checkbox row fits");
await phone.screenshot({ path: `${OUT}/locker-blocked-390.png` });

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
