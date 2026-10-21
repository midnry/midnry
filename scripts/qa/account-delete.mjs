// Account deletion journey against the local dev server (sh scripts/qa/dev-up.sh).
// Registers a throwaway email account, closes it from /account, then checks
// that sign-in and sign-up are refused with the closed-account message.
// Usage: node scripts/qa/account-delete.mjs [outdir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const out = process.argv[2] || "screenshots/qa/account-delete";
mkdirSync(out, { recursive: true });
const BASE = "http://127.0.0.1:8080";
const CLOSED = "This account was closed. Email hello@midnry.com within 30 days to restore it.";
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const email = `qa-close-${Date.now()}@example.test`;
const password = "correct-horse-42";

async function newPage(viewport = { width: 1280, height: 860 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|403|401/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
  });
  return page;
}

async function register(page) {
  await page.goto(`${BASE}/login?intent=register&next=/account`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByLabel("Name").fill("QA Closer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account/, { timeout: 60000 });
  await page.getByRole("heading", { name: "Delete account" }).waitFor({ timeout: 60000 });
}

// A second browser stays signed in, to prove its session is revoked too.
const other = await newPage();
const page = await newPage();
await register(page);
await other.goto(`${BASE}/login?intent=sign-in&next=/account`, { waitUntil: "networkidle" });
await other.getByLabel("Email").fill(email);
await other.getByLabel("Password").fill(password);
await other.getByRole("button", { name: "Sign in" }).click();
await other.waitForURL(/\/account/, { timeout: 60000 });

const section = page.locator("#delete");
ok(await section.getByText("Your Midnry Pass renewal is cancelled, and unused Pass time isn't refunded.").isVisible(), "explains the Pass");
ok(await section.getByText("Outpost Zero store items are lost.").isVisible(), "explains store items");
ok(await section.getByText("Your data is kept for 30 days, then permanently deleted.").isVisible(), "explains 30 days");
ok(await section.getByRole("link", { name: "hello@midnry.com" }).isVisible(), "restore email link");
await section.scrollIntoViewIfNeeded();
await page.screenshot({ path: `${out}/section.png`, fullPage: false });

const trigger = section.getByRole("button", { name: "Delete my account" });
const box = await trigger.boundingBox();
ok(box && box.height >= 44, `trigger is at least 44px tall (${box?.height})`);

// Escape cancels and returns focus.
await trigger.click();
const dialog = page.getByRole("alertdialog");
await dialog.waitFor();
ok(await dialog.getByLabel("Type DELETE to confirm").isVisible(), "dialog asks for DELETE");
ok(await dialog.getByLabel("Your password").isVisible(), "password account is asked for the password");
const submit = dialog.getByRole("button", { name: "Delete my account" });
ok(await submit.isDisabled(), "submit disabled until confirmed");
await page.keyboard.press("Escape");
await dialog.waitFor({ state: "hidden" });
ok(await page.evaluate(() => document.activeElement?.textContent === "Delete my account"), "Escape closes and returns focus to the trigger");

// Focus stays inside the dialog.
await trigger.click();
await dialog.waitFor();
for (let i = 0; i < 8; i += 1) await page.keyboard.press("Tab");
ok(await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]')), "Tab stays inside the dialog");

// Wrong confirmation word and wrong password.
await dialog.getByLabel("Type DELETE to confirm").fill("delete");
await dialog.getByLabel("Your password").fill("wrong-password-1");
ok(await submit.isDisabled(), "lower-case 'delete' does not enable submit");
await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
await submit.click();
await dialog.getByText("That password isn't right.").waitFor({ timeout: 30000 });
ok(true, "wrong password is refused and the account stays open");
for (const b of await dialog.getByRole("button").all()) {
  const bb = await b.boundingBox();
  ok(bb && bb.height >= 44, `dialog button "${await b.textContent()}" is at least 44px (${bb?.height})`);
}
await page.screenshot({ path: `${out}/dialog-wrong-password.png` });

// Close for real.
await dialog.getByLabel("Your password").fill(password);
await submit.click();
await page.waitForURL(/\/login/, { timeout: 60000 });
await page.getByText(CLOSED).first().waitFor({ timeout: 30000 });
ok(true, "after closing, the login page shows the closed message");
await page.screenshot({ path: `${out}/after-close.png` });

// The other browser's session is gone (cookie cache may hold it for up to 5 minutes;
// a fresh session fetch bypassing the cache must fail).
const otherSession = await other.evaluate(async () => {
  const r = await fetch("/api/auth/get-session?disableCookieCache=true", { credentials: "include" });
  return r.ok ? await r.json() : null;
});
ok(!otherSession, "the other browser's session was revoked");

// Sign-in is refused with the clear message.
const again = await newPage();
await again.goto(`${BASE}/login?intent=sign-in`, { waitUntil: "networkidle" });
await again.getByLabel("Email").fill(email);
await again.getByLabel("Password").fill(password);
await again.getByRole("button", { name: "Sign in" }).click();
await again.getByText(CLOSED).waitFor({ timeout: 30000 });
ok(true, "email sign-in to the closed account is refused with the closed message");
await again.screenshot({ path: `${out}/sign-in-refused.png` });

// Signing up again with the same email gets the same answer.
await again.getByRole("button", { name: "Need an account? Register" }).click();
await again.getByLabel("Name").fill("Again");
await again.getByLabel("Email").fill(email);
await again.getByLabel("Password").fill(password);
await again.getByRole("button", { name: "Create account" }).click();
await again.getByText(CLOSED).waitFor({ timeout: 30000 });
ok(true, "sign-up with the closed account's email is refused with the closed message");

// The OAuth error redirect shows the message; arbitrary error text is not reflected.
await again.goto(`${BASE}/login?error=ACCOUNT_CLOSED`, { waitUntil: "networkidle" });
ok(await again.getByText(CLOSED).isVisible(), "OAuth redirect ?error=ACCOUNT_CLOSED shows the message");
await again.goto(`${BASE}/login?error=%3Cb%3Ehi`, { waitUntil: "networkidle" });
ok((await again.getByRole("alert").count()) === 0, "other ?error values are ignored");

// Phone layout of the dialog.
const phone = await newPage({ width: 390, height: 844 }, true);
const email2 = `qa-close-m-${Date.now()}@example.test`;
await phone.goto(`${BASE}/login?intent=register&next=/account`, { waitUntil: "networkidle" });
await phone.getByLabel("Name").fill("QA Phone");
await phone.getByLabel("Email").fill(email2);
await phone.getByLabel("Password").fill(password);
await phone.getByRole("button", { name: "Create account" }).click();
await phone.waitForURL(/\/account/, { timeout: 60000 });
await phone.locator("#delete").getByRole("button", { name: "Delete my account" }).click();
await phone.getByRole("alertdialog").waitFor();
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
ok(!overflow, "no horizontal overflow on a phone");
await phone.screenshot({ path: `${out}/dialog-phone.png` });

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
if (fails.length) {
  console.log(`\n${fails.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
