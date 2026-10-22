// Outpost Zero menus: photographs every top-level screen (Home for both
// games, Locker, How to play, Settings, Practice), the pause card and the
// end-of-round debrief, on laptop and phone → screenshots/qa/menus.
//   node scripts/qa/menu-tour.mjs [tag]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
const TAG = process.argv[2] || "now";
const OUT = "screenshots/qa/menus";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errors = [];
for (const [w, h] of [
  [1280, 720],
  [390, 844],
]) {
  const m = w < 500;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 3 : 1 });
  ctx.setDefaultTimeout(180000);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${w}: ${e.message}`));
  await p.addInitScript(() => {
    if (sessionStorage.getItem("qa-seeded")) return;
    sessionStorage.setItem("qa-seeded", "1");
    localStorage.setItem("midnry-outpost-mode", "signal");
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
    localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true }));
  });
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 300000, polling: 1000 });
  await p.waitForTimeout(2000);
  const snap = async (name) => {
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${TAG}-${name}-${w}.png` });
  };
  await snap("home-signal");
  for (const tab of ["locker", "guide", "settings", "practice"]) {
    const sel = `[data-go="${tab}"]:visible`;
    if (!(await p.locator(sel).count())) continue;
    await p.locator(sel).first().click();
    await snap(tab);
    if (tab === "locker")
      for (const t of ["loadout", "finishes", "progress"]) {
        await p.click(`[data-ltab="${t}"]`);
        await snap(`locker-${t}`);
      }
    // Back home (Esc closes dialogs; the Home tab returns otherwise).
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    if (await p.locator('[data-go="home"]:visible').count()) await p.locator('[data-go="home"]:visible').first().click();
  }
  await pickGame(p, "protocol");
  await snap("home-protocol");
  await pickGame(p, "signal");
  // The game picker sheet.
  if (await p.locator(".mf-modechange:visible").count()) {
    await p.click(".mf-modechange:visible");
    await snap("picker");
    await p.click(".mf-pickerclose");
  }
  // Pause, then the debrief after a lost round.
  await play(p);
  await p.waitForFunction(() => { const e = document.querySelector("midnry-fps").engine; return e.state === "playing" && e.running; }, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector("midnry-fps").engine.pause());
  await snap("pause");
  await p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    g.start();
    const me = g.player;
    me.lives = 0;
    me.shieldUntil = 0;
    g.arena.damage(me, 999, null);
  });
  await p.waitForTimeout(9000);
  await snap("debrief");
  await ctx.close();
}
console.log(JSON.stringify({ errors }, null, 1));
await b.close();
