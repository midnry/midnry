// Outpost Zero store, end to end on the local dev server with the stand-in
// Paystack (scripts/qa/mock-paystack.mjs on :8099; scripts/qa/dev-up.sh wires it):
//  1. a signed-in player opens the Locker (laptop + phone screenshots),
//  2. buys Tiger Stripe: checkout page → back to the game → confirmed → equips
//     it, and the first-person gun wears it,
//  3. a second item is settled by the signed webhook alone,
//  4. tampered payments (wrong amount, someone else's reference) never grant,
//  5. the admin's Stats page shows the sales.
//   node scripts/qa/mock-paystack.mjs & node scripts/qa/outpost-store.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = "http://127.0.0.1:8080",
  MOCK = "http://127.0.0.1:8099";
const OUT = "screenshots/qa/store";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const result = {},
  errors = [];
const stamp = Date.now().toString(36),
  password = "outpost-zero-qa-1";
const headers = { origin: BASE };
async function account(ctx, email, name) {
  const r = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email, password, name, ageConfirmed: true } });
  if (!r.ok()) await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email, password } });
}
// Store calls run inside a page: its __Host- session cookie is Secure, which
// a page on this local origin sends but Playwright's request API does not.
const pages = new Map();
async function api(ctx, data) {
  if (!pages.has(ctx)) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/robots.txt`);
    pages.set(ctx, page);
  }
  return pages.get(ctx).evaluate(async (data) => {
    const r = await fetch("/api/games/outpost-store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    return { status: r.status, body: await r.json() };
  }, data);
}
const game = (p) => p.frames().find((f) => f.url().includes("outpost-zero.html"));
const ready = (p) =>
  p.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector(".mf-start:not([disabled])"), null, { timeout: 240000 });

// 1. Locker, laptop.
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
// Skip the first-match How to Play cards: these flows click Play directly.
await ctx.addInitScript(() => localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true })));
await account(ctx, `buyer-${stamp}@example.test`, `Buyer ${stamp}`);
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
await ready(p);
await game(p).evaluate(() => document.querySelector("midnry-fps").engine.retention.locker());
await game(p).waitForSelector('[data-finish="tiger"] .mf-finishstate:text("Buy")', { timeout: 30000 });
await p.screenshot({ path: `${OUT}/locker-1280.png` });
result.lockerTiger = await game(p).locator('[data-finish="tiger"] .mf-finishstate').innerText();

// 2. Buy Tiger Stripe through the checkout page.
await game(p).locator(".mf-adultcheck").check();
await game(p).locator('[data-finish="tiger"]').click({ noWaitAfter: true });
await p.waitForURL(/127\.0\.0\.1:8099\/pay\//, { timeout: 60000 });
await p.getByRole("button", { name: "Pay" }).click();
await p.waitForURL(/\/games\/outpost-zero\?purchase=/, { timeout: 60000 });
await ready(p);
await game(p).waitForFunction(() => document.querySelector(".mf-storestatus")?.textContent.includes("Purchase complete"), null, { timeout: 60000 });
result.afterBuy = await game(p).locator('[data-finish="tiger"] .mf-finishstate').innerText();
await game(p).locator('[data-finish="tiger"]').click();
result.equipped = await game(p).evaluate(() => document.querySelector("midnry-fps").engine.retention.weaponFinish());
await p.screenshot({ path: `${OUT}/locker-owned-1280.png` });
// The first-person gun wears it.
await game(p).evaluate(() => document.querySelector(".mf-locker").close());
await game(p).evaluate(() => document.querySelector(".mf-gamepick [data-mode=signal]").click());
await p.waitForTimeout(600);
await game(p).evaluate(() => document.querySelector(".mf-start").click());
await game(p).waitForFunction(() => document.querySelector("midnry-fps").engine?.running && document.querySelector("midnry-fps").engine.military?.weaponKit, null, { timeout: 180000 });
result.gun = await game(p).evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  cancelAnimationFrame(g.frame);
  g.frame = 0;
  Object.assign(g.player, { weapon: "carbine", shieldUntil: 1e9 });
  for (let i = 0; i < 3; i++) g.render();
  let painted = false;
  g.military.rig.traverse((o) => (painted ||= !!o.material?.map?.isCanvasTexture));
  return { finish: g.military.weaponFinish, painted };
});
await p.screenshot({ path: `${OUT}/gun-tiger-1280.png` });

// 3. Webhook only: start a checkout through the API, pay, no redirect.
const started = await api(ctx, { op: "buy", item: "carbon", adultConfirmed: true });
const last = await (await fetch(`${MOCK}/qa/last`)).json();
result.webhookStatus = (await (await fetch(`${MOCK}/qa/pay`, { method: "POST", body: JSON.stringify({ reference: last.reference, webhook: true }) })).json()).webhook;
result.afterWebhook = (await api(ctx, { op: "state" })).body.owned;

// 3b. Dollars: the same flow priced in USD cents.
await api(ctx, { op: "buy", item: "pixel", currency: "USD", adultConfirmed: true });
const usd = await (await fetch(`${MOCK}/qa/last`)).json();
result.usdCharge = `${usd.currency} ${usd.amount}`;
await fetch(`${MOCK}/qa/pay`, { method: "POST", body: JSON.stringify({ reference: usd.reference, webhook: true }) });
result.usdOwned = (await api(ctx, { op: "state" })).body.owned.includes("pixel");

// 4. Tampering: underpaid webhook, and another account confirming our reference.
await api(ctx, { op: "buy", item: "damascus", adultConfirmed: true });
const cheap = await (await fetch(`${MOCK}/qa/last`)).json();
await fetch(`${MOCK}/qa/pay`, { method: "POST", body: JSON.stringify({ reference: cheap.reference, webhook: true, overrides: { amount: 100 } }) });
const afterCheap = await api(ctx, { op: "state" });
result.underpaidOwned = !!afterCheap.body.owned?.includes("damascus");
const thief = await b.newContext();
await account(thief, `thief-${stamp}@example.test`, "Thief");
result.thief = await api(thief, { op: "confirm", reference: cheap.reference });
result.thiefOwned = (await api(thief, { op: "state" })).body.owned;
result.notForSale = (await api(ctx, { op: "buy", item: "signal", adultConfirmed: true })).status;
await thief.close();
await ctx.close();

// 1b. Locker on a phone.
const phone = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await account(phone, `buyer-${stamp}@example.test`, `Buyer ${stamp}`);
const q = await phone.newPage();
await q.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
await ready(q);
await game(q).evaluate(() => document.querySelector("midnry-fps").engine.retention.locker());
await game(q).waitForSelector('[data-finish="carbon"] .mf-finishstate:text("Equip")', { timeout: 30000 });
await game(q).locator(".mf-finishgrid").scrollIntoViewIfNeeded();
await q.screenshot({ path: `${OUT}/locker-390.png` });
result.phoneOverflow = await game(q).evaluate(() => document.querySelector(".mf-locker").scrollWidth > document.querySelector(".mf-locker").clientWidth);
await phone.close();

// 5. Admin sales.
const admin = await b.newContext({ viewport: { width: 1280, height: 900 } });
await account(admin, "qa-admin@example.test", "QA Admin");
const a = await admin.newPage();
await a.goto(`${BASE}/stats`, { waitUntil: "domcontentloaded", timeout: 90000 });
const store = a.locator("section[aria-labelledby=outpost-stats]").getByText("Last 30 days:");
await store.waitFor({ timeout: 60000 });
result.adminSales = await store.innerText();
await admin.close();
await b.close();

result.errors = errors;
console.log(JSON.stringify(result, null, 1));
const ok =
  /Buy/.test(result.lockerTiger) &&
  /Equip/.test(result.afterBuy) &&
  result.equipped === "tiger" &&
  result.gun.finish === "tiger" &&
  result.gun.painted &&
  started.status === 200 &&
  result.webhookStatus === 200 &&
  result.afterWebhook.includes("carbon") &&
  result.usdCharge === "USD 149" &&
  result.usdOwned &&
  /\$/.test(result.adminSales) &&
  !result.underpaidOwned &&
  result.thief.status >= 400 &&
  !result.thiefOwned.length &&
  result.notForSale === 400 &&
  !result.phoneOverflow &&
  !errors.length;
if (!ok) process.exit(1);
