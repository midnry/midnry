// Close synthetic test accounts (…@example.test only) through the site's own
// "Delete my account" flow, e.g. after release checks on the live site.
// Reads accounts from screenshots/qa/test-accounts.jsonl (written by the QA
// scripts) plus any given as email:password arguments. Closed accounts are
// purged by the site's hourly clean-up after 30 days.
// Usage: QA_BASE=https://www.midnry.com node scripts/qa/close-test-accounts.mjs [email:password …]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { BASE } from "./target.mjs";

const FILE = "screenshots/qa/test-accounts.jsonl";
const listed = existsSync(FILE) ? readFileSync(FILE, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
const given = process.argv.slice(2).map((arg) => ({ email: arg.slice(0, arg.indexOf(":")), password: arg.slice(arg.indexOf(":") + 1) }));
const accounts = [...new Map([...listed, ...given].filter((a) => a.base === undefined || a.base === BASE).map((a) => [a.email, a])).values()];
const headers = { origin: BASE };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const remaining = [];
for (const account of accounts) {
  if (!/@example\.test$/.test(account.email)) {
    console.log(`SKIP ${account.email}: not a synthetic @example.test account`);
    continue;
  }
  const ctx = await browser.newContext();
  let res;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    res = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: account.email, password: account.password } });
    if (res.status() !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 12000));
  }
  if (!res.ok()) {
    const body = await res.text();
    console.log(`${/closed/i.test(body) ? "DONE" : "FAIL"} ${account.email}: sign-in ${res.status()} ${/closed/i.test(body) ? "(already closed)" : ""}`);
    if (!/closed/i.test(body)) remaining.push(account);
    await ctx.close();
    continue;
  }
  const page = await ctx.newPage();
  await page.goto(`${BASE}/account`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: "Delete my account" }).first().click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  if (await dialog.getByLabel("Your password").isVisible().catch(() => false)) await dialog.getByLabel("Your password").fill(account.password);
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForTimeout(3000);
  const again = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: account.email, password: account.password } });
  const closed = !again.ok() && /closed/i.test(await again.text());
  console.log(`${closed ? "DONE" : "FAIL"} ${account.email}: ${closed ? "closed" : `still open (${again.status()})`}`);
  if (!closed) remaining.push(account);
  await ctx.close();
}
await browser.close();
if (existsSync(FILE)) writeFileSync(FILE, remaining.map((a) => JSON.stringify(a)).join("\n") + (remaining.length ? "\n" : ""));
process.exit(remaining.length ? 1 : 0);
