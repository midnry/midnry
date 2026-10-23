// Laptop sprint and slide, measured in game time (software rendering makes
// real-time waits unreliable): hold W (+Shift) until 0.6 s of game time has
// passed, then read speed and the sprinting / sliding flags.
//   node scripts/qa/sprint-probe.mjs [base url]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto(`${BASE}/games/outpost-zero.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 240000 });
await pickGame(p, "signal");
await play(p);
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.running, null, { timeout: 240000 });
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  window.__g = g;
  setInterval(() => {
    for (const e of g.arena.entities) if (e.id !== g.selfId) Object.assign(e, { x: 1.5, y: 1.5, hp: 1e6 });
    g.player.hp = Math.max(g.player.hp, 50);
  }, 50);
});
await p.mouse.click(640, 360);
const me = () => p.evaluate(() => { const g = window.__g, e = g.arena.entities.find((x) => x.id === g.selfId); return { x: e.x, y: e.y, t: g.arena.time, sprinting: !!e.sprinting, sliding: (e.slideUntil || 0) > g.arena.time }; });
const hold = async (keys, game) => {
  for (const k of keys) await p.keyboard.down(k);
  const a = await me();
  let c = a, seen = { sprinting: false, sliding: false };
  while (c.t - a.t < game) {
    await p.waitForTimeout(150);
    c = await me();
    seen.sprinting ||= c.sprinting;
    seen.sliding ||= c.sliding;
  }
  return { a, c, seen };
};
const speed = ({ a, c }) => (Math.hypot(c.x - a.x, c.y - a.y) / Math.max(1e-3, c.t - a.t)).toFixed(2);
const walk = await hold(["w"], 0.6);
await p.keyboard.up("w");
console.log("walk", speed(walk), "tiles/s");
await p.waitForTimeout(500);
const run = await hold(["Shift", "w"], 0.6);
console.log("sprint", speed(run), "tiles/s, sprinting seen:", run.seen.sprinting);
await p.keyboard.press("c");
const slide = await hold([], 0.4);
console.log("slide seen:", slide.seen.sliding, "speed", speed(slide));
await p.keyboard.up("w");
await p.keyboard.up("Shift");
console.log("errors", errs);
await b.close();
