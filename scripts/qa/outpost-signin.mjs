// Outpost Zero sign-in, end to end on the local dev server (scripts/qa/dev-up.sh):
// a signed-out visitor plays one free match, then the sign-in screen covers the
// game (laptop + phone); they create an account, land back in the game, the
// free match is filed, a second match too, and the admin's Stats page shows
// both. A visitor who already used the free match is asked straight away, and
// login keeps a friend's room code.
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
const game = (p) => p.frames().find((f) => f.url().includes("outpost-zero.html"));
const ready = (p) =>
  p.waitForFunction(() => document.querySelector("iframe")?.contentDocument?.querySelector(".mf-start:not([disabled])"), null, {
    timeout: 240000,
  });
const gateState = (p) =>
  game(p).evaluate(() => {
    const gate = document.querySelector(".oz-gate");
    return { shown: !!gate && !gate.hidden, title: gate?.querySelector("h2")?.textContent ?? null, inert: document.querySelector("midnry-fps").inert };
  });
/** Start a Last Signal match and end it through the game's own end-of-match path. */
async function playMatch(p, kills) {
  await game(p).evaluate(() => document.querySelector(".mf-gamepick [data-mode=signal]").click());
  await p.waitForTimeout(800);
  await game(p).evaluate(() => document.querySelector(".mf-start").click());
  await game(p).waitForFunction(() => document.querySelector("midnry-fps").engine?.running, null, { timeout: 180000 });
  return game(p).evaluate((kills) => {
    const g = document.querySelector("midnry-fps").engine;
    g.player.kills = kills;
    g.retention.finish(true);
    return g.arena.roundId;
  }, kills);
}

// 1. Phone: the game is open; after the free match the sign-in screen follows.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addCookies([signedOut]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await ready(p);
  await p.waitForTimeout(1500);
  result.phoneBeforeMatch = await gateState(p);
  await playMatch(p, 1);
  await p.frameLocator("iframe").getByRole("heading", { name: "Sign in to keep playing" }).waitFor({ timeout: 30000 });
  await p.screenshot({ path: `${OUT}/gate-after-free-390.png` });
  await ctx.close();
}

// 2. Already used the free match, joining a friend's room: asked straight
// away, and login keeps the room code.
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addCookies([signedOut]);
  await ctx.addInitScript(() => localStorage.setItem("midnry-outpost-guest", JSON.stringify({ played: 1 })));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/games/outpost-zero?room=ABC234`, { waitUntil: "domcontentloaded", timeout: 90000 });
  const frame = p.frameLocator("iframe");
  await frame.getByRole("heading", { name: "Sign in to play" }).waitFor({ timeout: 120000 });
  result.returningGate = await gateState(p);
  await p.screenshot({ path: `${OUT}/gate-returning-1280.png` });
  await frame.getByRole("button", { name: "Sign in" }).click({ noWaitAfter: true, timeout: 60000 });
  await p.waitForURL(/\/login\?/, { timeout: 180000 });
  result.loginUrl = new URL(p.url()).search;
  await ctx.close();
}

// 3. Laptop: free match, sign-in screen, create an account, back to the game.
const stamp = Date.now().toString(36);
const player = { name: `Tester ${stamp}`, email: `qa-${stamp}@example.test`, password: "outpost-zero-qa-1" };
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addCookies([signedOut]);
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`${BASE}/games/outpost-zero`, { waitUntil: "domcontentloaded", timeout: 90000 });
await ready(p);
result.free = await playMatch(p, 2);
const frame = p.frameLocator("iframe");
await frame.getByRole("heading", { name: "Sign in to keep playing" }).waitFor({ timeout: 30000 });
result.afterFree = await gateState(p);
await p.screenshot({ path: `${OUT}/gate-after-free-1280.png` });
// The game keeps running behind the screen, so don't wait on the click itself.
await frame.getByRole("button", { name: "Create account" }).click({ noWaitAfter: true, timeout: 60000 });
await p.waitForURL(/\/login\?/, { timeout: 180000 });
await p.getByLabel("Name").waitFor({ timeout: 120000 });
await p.getByLabel("Name").fill(player.name);
await p.getByLabel("Email").fill(player.email);
await p.getByLabel("Password").fill(player.password);
await p.getByLabel("I'm 13 or older, or I have a parent's or guardian's permission.").check();
await p.locator("form button[type=submit]").first().click();
await p.waitForURL(/\/games\/outpost-zero/, { timeout: 60000 });
await ready(p);
await game(p).waitForFunction(() => !localStorage.getItem("midnry-outpost-guest"), null, { timeout: 30000 });
result.afterSignIn = await gateState(p);
result.second = await playMatch(p, 3);
await p.waitForTimeout(3000);
await ctx.close();

// 4. The admin sees the player with both matches on /stats. (Signed in
// through the auth API: the login form itself was covered in step 3.)
const admin = await b.newContext({ viewport: { width: 1280, height: 900 } });
const headers = { origin: BASE };
const creds = { email: "qa-admin@example.test", password: player.password };
const signIn = await admin.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: creds });
if (!signIn.ok())
  await admin.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { ...creds, name: "QA Admin", ageConfirmed: true } });
const a = await admin.newPage();
a.on("pageerror", (e) => errors.push(e.message));
await a.goto(`${BASE}/stats`, { waitUntil: "domcontentloaded", timeout: 90000 });
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
  !result.phoneBeforeMatch.shown &&
  result.returningGate.shown &&
  result.returningGate.inert &&
  result.loginUrl.includes("room%3DABC234") &&
  result.afterFree.shown &&
  !result.afterSignIn.shown &&
  !result.afterSignIn.inert &&
  // Player, matches 2 (free + second), wins 2, kills 5.
  / 2 2 5 /.test(` ${result.statsRow} `) &&
  !errors.length;
if (!ok) process.exit(1);
