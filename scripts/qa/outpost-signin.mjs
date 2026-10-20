// Outpost Zero sign-in, end to end on the local dev server (scripts/qa/dev-up.sh):
// a signed-out visitor sees the sign-in screen (laptop + phone), creates an
// account, lands back in the game, finishes a match, and the admin's Stats
// page lists that player and match.
//   node scripts/qa/outpost-signin.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = "http://127.0.0.1:8080";
const OUT = "screenshots/qa/signin";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
// The real signed-out answer, not the local QA stand-in player.
const signedOut = { name: "outpost-qa-signed-out", value: "1", domain: "127.0.0.1", path: "/" };
const result = {};
const errors = [];

// 1. Phone: the sign-in screen covers the game.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addCookies([signedOut]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
  const frame = p.frameLocator("iframe");
  await frame.getByRole("heading", { name: "Sign in to play" }).waitFor({ timeout: 120000 });
  await p.screenshot({ path: `${OUT}/gate-390.png` });
  await ctx.close();
}

// 2. Laptop: create an account from the game and come back to it.
const stamp = Date.now().toString(36);
const player = { name: `Tester ${stamp}`, email: `qa-${stamp}@example.test`, password: "outpost-zero-qa-1" };
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addCookies([signedOut]);
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`${BASE}/games/outpost-zero?room=ABC234`, { waitUntil: "domcontentloaded", timeout: 90000 });
let frame = p.frameLocator("iframe");
await frame.getByRole("heading", { name: "Sign in to play" }).waitFor({ timeout: 120000 });
result.gateInert = await p.frames()[1].evaluate(() => document.querySelector("midnry-fps").inert);
await p.screenshot({ path: `${OUT}/gate-1280.png` });
// The game keeps loading behind the screen, so don't wait on the click itself.
await frame.getByRole("button", { name: "Create account" }).click({ noWaitAfter: true, timeout: 60000 });
await p.waitForURL(/\/login\?/, { timeout: 180000 });
await p.getByLabel("Name").waitFor({ timeout: 120000 });
result.loginUrl = new URL(p.url()).search;
await p.getByLabel("Name").fill(player.name);
await p.getByLabel("Email").fill(player.email);
await p.getByLabel("Password").fill(player.password);
await p.locator("form button[type=submit]").first().click();
await p.waitForURL(/\/games\/outpost-zero/, { timeout: 60000 });
result.backAt = new URL(p.url()).pathname + new URL(p.url()).search;
// The room code opens the online lobby; play the offline match without it
// (after the login page's own redirect has settled).
await p.waitForLoadState("load");
await p.waitForTimeout(3000);
await p.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
frame = p.frameLocator("iframe");
const game = () => p.frames().find((f) => f.url().includes("outpost-zero.html"));
await p.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector(".mf-start:not([disabled])"), null, { timeout: 180000 });
result.gateAfterSignIn = await game().evaluate(() => {
  const gate = document.querySelector(".oz-gate");
  return { shown: !!gate && !gate.hidden, inert: document.querySelector("midnry-fps").inert };
});

// 3. Finish a Last Signal match through the game's own end-of-match path.
await game().evaluate(() => document.querySelector(".mf-gamepick [data-mode=signal]").click());
await p.waitForTimeout(800);
await game().evaluate(() => document.querySelector(".mf-start").click());
await game().waitForFunction(() => document.querySelector("midnry-fps").engine?.arena?.roundId, null, { timeout: 180000 });
const recorded = await game().evaluate(async () => {
  const g = document.querySelector("midnry-fps").engine;
  g.player.kills = 3;
  const sent = new Promise((resolve) => {
    const original = window.fetch;
    window.fetch = (...args) => {
      const out = original(...args);
      if (String(args[0]).includes("outpost-stats")) out.then((r) => r.clone().json()).then(resolve, resolve);
      return out;
    };
  });
  g.retention.finish(true);
  return { id: g.arena.roundId, mode: g.mode, map: g.arena.mapId, response: await sent };
});
result.match = recorded;
await ctx.close();

// 4. The admin sees the player and the match on /stats.
const admin = await b.newContext({ viewport: { width: 1280, height: 900 } });
const a = await admin.newPage();
a.on("pageerror", (e) => errors.push(e.message));
await a.goto(`${BASE}/login?intent=register&next=/stats`, { waitUntil: "domcontentloaded", timeout: 90000 });
await a.getByLabel("Name").fill("QA Admin");
await a.getByLabel("Email").fill("qa-admin@example.test");
await a.getByLabel("Password").fill(player.password);
await a.locator("form button[type=submit]").first().click();
await a.waitForURL(/\/stats/, { timeout: 60000 }).catch(() => {});
if (!/\/stats/.test(a.url())) {
  // Already registered from an earlier run: sign in instead.
  await a.goto(`${BASE}/login?next=/stats`);
  await a.getByLabel("Email").fill("qa-admin@example.test");
  await a.getByLabel("Password").fill(player.password);
  await a.locator("form button[type=submit]").first().click();
  await a.waitForURL(/\/stats/, { timeout: 60000 });
}
const section = a.locator("section[aria-labelledby=outpost-stats]");
await section.getByText(player.email).waitFor({ timeout: 60000 });
result.statsRow = (await section.locator("tr", { hasText: player.email }).innerText()).replace(/\s+/g, " ");
await section.scrollIntoViewIfNeeded();
await section.screenshot({ path: `${OUT}/admin-stats.png` });
await admin.close();
await b.close();

result.errors = errors;
console.log(JSON.stringify(result, null, 1));
const ok =
  result.gateInert &&
  !result.gateAfterSignIn.shown &&
  !result.gateAfterSignIn.inert &&
  result.backAt.includes("room=ABC234") &&
  result.match.response?.ok &&
  result.statsRow.includes(" 1 ") &&
  !errors.length;
if (!ok) process.exit(1);
