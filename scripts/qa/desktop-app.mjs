// Desktop app (Electron) check: the game menu loads full-window, "Exit Game"
// closes the app, and a dead connection shows the offline screen.
//   node scripts/qa/desktop-app.mjs [siteUrl=http://127.0.0.1:8080]
// Needs desktop/node_modules (cd desktop && npm install) and an X display
// (xvfb-run -a node scripts/qa/desktop-app.mjs).
import { _electron as electron } from "playwright";
import { mkdirSync } from "node:fs";
const site = process.argv[2] || "http://127.0.0.1:8080";
const OUT = "screenshots/qa/desktop";
mkdirSync(OUT, { recursive: true });
const launch = (url) =>
  electron.launch({
    executablePath: "desktop/node_modules/electron/dist/electron",
    args: ["--no-sandbox", "desktop"],
    env: { ...process.env, OUTPOST_URL: url },
  });
const result = {};

// 1. Menu loads with 3D graphics and no page errors; Exit Game quits the app.
let app = await launch(site);
let page = await app.firstWindow();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 240000 });
result.menu = await page.evaluate(() => ({
  desktop: typeof window.midnryDesktop,
  graphics: !!document.querySelector("midnry-fps")?.engine?.militaryLoaded,
  size: [innerWidth, innerHeight],
}));
await page.screenshot({ path: `${OUT}/menu.png` });
const closed = new Promise((resolve) => app.process().once("exit", () => resolve(true)));
await page.evaluate(() => document.querySelector("midnry-fps .mf-exit").click());
const quit = page.getByRole("button", { name: "Quit game" });
await quit.waitFor({ timeout: 10000 });
await quit.click();
result.exitQuits = await Promise.race([closed, new Promise((r) => setTimeout(() => r(false), 15000))]);
if (!result.exitQuits) await app.close();
result.errors = errors;

// 2. Unreachable site: the offline screen with a retry button.
app = await launch("http://127.0.0.1:9");
page = await app.firstWindow();
await page.waitForSelector("#retry", { timeout: 30000 }).catch(() => {});
result.offline = await page.evaluate(() => document.querySelector("h1")?.textContent || location.href);
await page.screenshot({ path: `${OUT}/offline.png` });
await app.close();

console.log(JSON.stringify(result, null, 1));
if (!result.menu.graphics || !result.exitQuits || errors.length || result.offline !== "No connection") process.exit(1);
