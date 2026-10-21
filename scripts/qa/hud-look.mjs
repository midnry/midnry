// In-game HUD look during a Last Signal round: portrait phone, landscape phone
// and desktop, first with the start shield active, then with the special move
// charged. Prints the HUD element boxes, overlaps between them and console
// errors; photos go to screenshots/qa/hud/.
// Usage: node scripts/qa/hud-look.mjs   (dev server on :8080)
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
mkdirSync("screenshots/qa/hud", { recursive: true });
const URL = "http://127.0.0.1:8080/games/outpost-zero.html";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const SELECTORS = [
  ".mf-sig-status",
  ".mf-sig-shield",
  ".mf-sig-haze",
  ".mf-disaster",
  ".mf-pause",
  ".mf-bottom .mf-stat:first-child",
  ".mf-stick",
  ".mf-super",
  ".mf-fire",
  ".mf-reload",
  ".mf-stance",
  ".mf-scope",
  ".mf-jump",
  ".mf-ammo",
  ".mf-sprint",
];
const report = {};
const errors = [];
for (const [name, w, h, touch] of [
  ["portrait", 390, 844, true],
  ["landscape", 844, 390, true],
  ["desktop", 1280, 720, false],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`${name}: console ${m.text()}`));
  await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
  await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await p.waitForFunction(
    () => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled,
    null,
    { timeout: 240000, polling: 500 },
  );
  // The lobby may be mid-redesign: fall back to the mode buttons' own handlers.
  try {
    await pickGame(p, "signal", { timeout: 15000 });
    await play(p, { timeout: 15000 });
  } catch {
    await p.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      if (g.mode !== "signal") {
        g.mode = "signal";
        g.reset();
      }
      if (g.state !== "playing") g.start();
    });
  }
  await p.waitForFunction(
    () => {
      const g = document.querySelector("midnry-fps")?.engine;
      const load = document.querySelector(".mf-loading"),
        tr = document.querySelector(".mf-transition");
      if (tr && !tr.hidden) return false;
      if (g?.sceneTransition && (g.sceneTransition.pending || g.sceneTransition.lastRound !== g.arena?.roundId)) return false;
      return g?.militaryLoaded && g.state === "playing" && g.player && g.frame && (!load || load.hidden || getComputedStyle(load).display === "none");
    },
    null,
    { timeout: 240000, polling: 500 },
  );
  for (const shot of ["shield", "charged"]) {
    const boxes = await p.evaluate(
      ({ shot, SELECTORS }) => {
        const g = document.querySelector("midnry-fps").engine;
        cancelAnimationFrame(g.frame);
        g.frame = 0;
        const pl = g.player;
        // Keep the round early so Red Haze is still counting down.
        g.time = Math.min(g.time, Math.max(0, g.zone.delay - 11));
        if (g.arena) g.arena.time = g.time;
        if (shot === "shield") {
          pl.shieldUntil = g.time + 7;
          pl.charge = 64;
        } else {
          pl.shieldUntil = 0;
          pl.charge = 100;
        }
        g.updateHUD(true);
        g.render();
        const out = {};
        for (const sel of SELECTORS) {
          const e = document.querySelector(sel);
          if (!e || e.hidden || getComputedStyle(e).display === "none" || getComputedStyle(e).visibility === "hidden") continue;
          const r = e.getBoundingClientRect();
          if (r.width && r.height) out[sel] = [r.left, r.top, r.right, r.bottom].map(Math.round);
        }
        const L = g.hudMapBox?.();
        if (L) out.minimap = L.map(Math.round);
        return out;
      },
      { shot, SELECTORS },
    );
    // Let the browser paint the frozen frame.
    await p.waitForFunction(() => new Promise((r) => requestAnimationFrame(() => r(true))), null, { timeout: 60000, polling: "raf" });
    const keys = Object.keys(boxes);
    const overlaps = [];
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++) {
        const [a, c] = [boxes[keys[i]], boxes[keys[j]]];
        if (a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3]) overlaps.push(`${keys[i]} x ${keys[j]}`);
      }
    const outside = keys.filter((k) => boxes[k][0] < 0 || boxes[k][1] < 0 || boxes[k][2] > w || boxes[k][3] > h);
    const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
    report[`${name}-${shot}`] = { viewport: [w, h], boxes, overlaps, outside, horizontalOverflow: scrollW > w };
    await p.screenshot({ path: `screenshots/qa/hud/${name}-${shot}.png` });
  }
  await ctx.close();
}
console.log(JSON.stringify({ report, errors }, null, 1));
await b.close();
