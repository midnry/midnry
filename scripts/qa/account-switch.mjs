// Another account signs in on the same browser while a page opened by the first
// account still has an unsaved change (a shared or family computer). The change
// must never be saved into the second account. Covers the shared app document
// (Emergency card) and Writing studio drafts. Synthetic accounts only.
// Usage: node scripts/qa/account-switch.mjs [outdir] [mobile]   (QA_TARGET=build for a production build)
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, TARGET, isServerFn } from "./target.mjs";

const OUT = process.argv[2] || "screenshots/qa/account-switch";
const MOBILE = process.argv[3] === "mobile";
const TAG = MOBILE ? "-mobile" : "";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
console.log(`target: ${TARGET} at ${BASE}`);
const errors = [];
const headers = { origin: BASE };
const stamp = Date.now().toString(36);
const A = { email: `qa-switch-a-${stamp}@example.test`, password: "switch-pass-a-1", name: "Switch A", ageConfirmed: true };
const B = { email: `qa-switch-b-${stamp}@example.test`, password: "switch-pass-b-1", name: "Switch B", ageConfirmed: true };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext(MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
ctx.on("page", (page) => {
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
});
const created = new Set();
async function signIn(account) {
  await ctx.request.post(`${BASE}/api/auth/sign-out`, { headers, data: {} });
  if (!created.has(account.email)) {
    created.add(account.email);
    if ((await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: account })).ok()) return;
  }
  // Production limits repeated sign-ins (HTTP 429): wait it out instead of failing the check.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: account });
    if (res.ok()) return;
    if (res.status() !== 429) throw new Error(`sign-in ${account.email}: ${res.status()}`);
    console.log(`(sign-in rate limited, waiting)`);
    await new Promise((resolve) => setTimeout(resolve, 12000));
  }
  throw new Error(`sign-in ${account.email}: still rate limited`);
}
async function cardName() {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/apps/ice-card`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByLabel("Your name").waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  const value = await page.getByLabel("Your name").inputValue();
  await page.close({ runBeforeUnload: false });
  return value;
}
const blockFn = (name) => (route) => (route.request().method() === "POST" && isServerFn(route.request(), name) ? route.abort("failed") : route.continue());

// ── 1. Shared app document (Emergency card): both accounts start empty, the worst case ──
await signIn(B);
ok((await cardName()) === "", "B's card starts empty");
await signIn(A);
const tab = await ctx.newPage();
await tab.goto(`${BASE}/apps/ice-card`, { waitUntil: "networkidle", timeout: 120000 });
await tab.getByLabel("Your name").waitFor({ timeout: 60000 });
const block = blockFn("saveDoc");
await tab.route("**/_serverFn/**", block);
await tab.getByLabel("Your name").fill("A's private note");
await tab.getByText("Not saved, retrying").first().waitFor({ timeout: 15000 });
await signIn(B);
await tab.unroute("**/_serverFn/**", block);
await tab.locator('[data-doc-recovery="account"]').waitFor({ timeout: 40000 });
ok(true, "A's open page stops and explains that another account is signed in");
await tab.screenshot({ path: `${OUT}/card-account-panel${TAG}.png`, fullPage: MOBILE });
ok((await cardName()) === "", "nothing was saved into B's card");
await tab.close({ runBeforeUnload: false });
await signIn(A);
ok((await cardName()) === "", "A's card on the server is unchanged");
const back = await ctx.newPage();
await back.goto(`${BASE}/apps/ice-card`, { waitUntil: "networkidle", timeout: 120000 });
const offer = back.locator('[data-doc-recovery="recovered"]');
await offer.waitFor({ timeout: 15000 });
await offer.getByRole("button", { name: "Keep my version" }).click();
await offer.getByRole("button", { name: "Replace it with my version" }).click();
await offer.waitFor({ state: "detached", timeout: 15000 });
await back.getByText("Saved", { exact: true }).first().waitFor({ timeout: 30000 });
await back.close();
ok((await cardName()) === "A's private note", "A gets the change back after signing in again, and it saves to A");

// ── 2. Writing studio draft ──────────────────────────────────────────────────
await signIn(A);
const studio = await ctx.newPage();
await studio.goto(`${BASE}/apps/write?view=letters`, { waitUntil: "networkidle", timeout: 120000 });
const field = studio.getByLabel("Your name and address");
await field.waitFor({ timeout: 60000 });
const blockDraft = blockFn("saveDraft");
await studio.route("**/_serverFn/**", blockDraft);
await field.fill("A's private letter, 1 Synthetic Close");
await studio.locator('[data-save="error"]').waitFor({ timeout: 20000 });
await signIn(B);
await studio.unroute("**/_serverFn/**", blockDraft);
await studio.locator('[data-save="account"]').waitFor({ timeout: 20000 });
ok(true, "the studio stops and says another account is signed in");
ok((await field.inputValue()).includes("A's private letter"), "the text stays on the page to copy");
await studio.screenshot({ path: `${OUT}/studio-account${TAG}.png`, fullPage: MOBILE });
await studio.close({ runBeforeUnload: false });
const bStudio = await ctx.newPage();
await bStudio.goto(`${BASE}/apps/write?view=letters`, { waitUntil: "networkidle", timeout: 120000 });
await bStudio.getByLabel("Your name and address").waitFor({ timeout: 60000 });
await bStudio.waitForTimeout(800);
ok(!(await bStudio.locator("body").innerText()).includes("A's private letter"), "B's drafts do not include A's letter");
await bStudio.close();

ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(" | ")})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
