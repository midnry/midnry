// The next batch's Invoice changes on a PRODUCTION build (or the live site), through the app's own
// screens only (no /src imports): Share PDF (share sheet SIMULATED: headless
// Chromium has none) leaves the status alone until "Mark as sent"; Needs
// follow-up lists the overdue sent invoice; Copy reminder; Remind me fills Remind.
// Usage: QA_TARGET=build QA_BASE=http://127.0.0.1:8081 node scripts/qa/next-batch-build.mjs [outdir] [mobile]
import { appendFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, TARGET } from "./target.mjs";

const OUT = process.argv[2] || "screenshots/qa/next-batch-build";
const MOBILE = process.argv[3] === "mobile";
const TAG = MOBILE ? "-mobile" : "";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
console.log(`target: ${TARGET} at ${BASE}${MOBILE ? " (390x844 touch)" : " (1280x900)"}`);
const account = { email: `qa-nextbuild-${Date.now().toString(36)}@example.test`, password: "nextbuild-pass-1", name: "QA Next Build", ageConfirmed: true };
appendFileSync("screenshots/qa/test-accounts.jsonl", JSON.stringify({ email: account.email, password: account.password, base: BASE }) + "\n");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  ...(MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } }),
  timezoneId: "Africa/Lagos",
});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
// SIMULATED share sheet: accepts files and reports success.
await ctx.addInitScript(() => {
  window.__shared = [];
  Object.defineProperty(navigator, "canShare", { configurable: true, value: (data) => Boolean(data?.files?.length) });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: async (data) => {
      const file = data.files[0];
      const head = new TextDecoder().decode((await file.arrayBuffer()).slice(0, 5));
      window.__shared.push({ name: file.name, size: file.size, head });
    },
  });
});
const errors = [];
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const res = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers: { origin: BASE }, data: account });
if (!res.ok()) throw new Error(`sign-up: ${res.status()}`);

await page.goto(`${BASE}/apps/invoice`, { waitUntil: "networkidle", timeout: 120000 });
await page.getByLabel("Invoice number").waitFor({ timeout: 60000 });
const today = await page.evaluate(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});
const add = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
await page.getByLabel("From").fill("Synthetic Studio Ltd\nLagos");
await page.getByLabel("Currency").selectOption("NGN");
await page.getByLabel("Bill to").fill("Okafor Foods\nokafor@example.test");
await page.getByLabel("Description 1").fill("Logo design");
await page.getByLabel("Quantity 1").fill("1");
await page.getByLabel("Rate 1").fill("50,000");
await page.getByLabel("Due").fill(add(-3));
await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
const status = page.getByRole("combobox", { name: /^Status/ });

// Share PDF ships separately. Where it is present, check it (SIMULATED share sheet);
// otherwise mark the invoice sent with the Status box.
if ((await page.getByRole("button", { name: "Share PDF" }).count()) > 0) {
  // Share PDF (SIMULATED share sheet): no status change until "Mark as sent".
  await page.getByRole("button", { name: "Share PDF" }).click();
  await page.getByText("Did you send it?").waitFor({ timeout: 30000 });
  const shared = await page.evaluate(() => window.__shared);
  ok(shared.length === 1 && shared[0].head === "%PDF-" && shared[0].size > 1000, `Share PDF built a real PDF in the production build (${shared[0]?.name}, ${shared[0]?.size} bytes)`);
  ok((await status.inputValue()) === "draft", "after a (simulated) share the invoice is still Draft");
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Invoice number").waitFor({ timeout: 30000 });
  ok((await page.getByRole("combobox", { name: /^Status/ }).inputValue()) === "draft", "still Draft after reload (nothing saved as sent)");
  await page.getByRole("button", { name: "Share PDF" }).click();
  await page.getByRole("button", { name: "Mark as sent" }).click();
  await page.waitForTimeout(400);
  ok((await status.inputValue()) === "sent", "Mark as sent sets Sent");
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Invoice number").waitFor({ timeout: 30000 });
  ok((await page.getByRole("combobox", { name: /^Status/ }).inputValue()) === "sent", "Sent is saved");

} else {
  console.log("(Share PDF not in this build: marking Sent with the Status box)");
  await status.selectOption("sent");
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Invoice number").waitFor({ timeout: 30000 });
  ok((await page.getByRole("combobox", { name: /^Status/ }).inputValue()) === "sent", "Sent is saved");
}

// Needs follow-up.
await page.getByRole("button", { name: "All invoices" }).click();
const row = page.locator('[data-follow-up-row="0001"]');
await row.waitFor({ timeout: 30000 });
ok((await row.locator("[data-late]").innerText()) === "3 days overdue", "Needs follow-up lists it as 3 days overdue");
await page.screenshot({ path: `${OUT}/follow-up${TAG}.png`, fullPage: true });
await row.locator("[data-copy-reminder]").click();
await page.getByText("Reminder for 0001 copied").waitFor({ timeout: 10000 });
const clip = await page.evaluate(() => navigator.clipboard.readText());
ok(/^Hello Okafor Foods,/.test(clip) && clip.includes("invoice 0001 for ₦50,000.00 was due on") && clip.includes("(3 days ago)"), "Copy reminder text");
await row.locator("[data-remind-me]").click();
await page.waitForURL(/\/apps\/tasks/, { timeout: 60000 });
const box = page.locator("#remind-quick-add");
await box.waitFor({ timeout: 60000 });
ok((await box.inputValue()) === "Follow up invoice 0001 with Okafor Foods tomorrow 9am", `Remind me fills Remind ("${await box.inputValue()}")`);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, `no sideways scrolling in Remind (${wide}px)`);
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
