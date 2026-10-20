// Fixed "look" views of a Last Signal arena for before/after graphics work.
//   node scripts/qa/arena-look.mjs <tag> [mapId=outpost] [width=1280] [preset=balanced]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const [tag = "now", mapId = "outpost", width = "1280", preset = "balanced"] = process.argv.slice(2);
const W = Number(width), M = W < 500, H = M ? 844 : 720;
const OUT = "screenshots/qa/look";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript((preset) => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset, options: { adaptive: false } }));
}, preset);
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal");
await p.waitForTimeout(800);
const pick = { outpost: 0.1, skyport: 0.5, estate: 0.9 }[mapId];
await p.evaluate((pick) => { const g = document.querySelector("midnry-fps").engine, r = Math.random; Math.random = () => pick; g.reset(); Math.random = r; document.querySelector(".mf-start").click(); }, pick);
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 180000 });
// Arena art loads in the background; wait for it (or its failure).
await p.waitForFunction((id) => {
  const s = document.querySelector("midnry-fps").engine.military?.arenaStyle?.of(id);
  return !s || s.ready || s.failed;
}, mapId, { timeout: 180000 });
const failed = await p.evaluate((id) => !!document.querySelector("midnry-fps").engine.military.arenaStyle.of(id)?.failed, mapId);
if (failed) console.log("ARENA ART FAILED", mapId);
await p.waitForTimeout(4000);
// [name, x, y, angle, pitch]
const VIEWS = {
  outpost: [["spawn", 2.5, 2.5, 0.78, 0], ["ring", 6.5, 3.5, 0, 0.05], ["gate", 9.9, 4.2, 1.57, 0], ["court", 14, 10.5, 1.57, -0.05], ["hut", 21.5, 5.5, -1.57, 0], ["wide", 3, 24.5, -0.6, 0.12]],
  skyport: [["spawn", 2.5, 2.5, 0.78, 0], ["apron", 18, 30.5, -1.57, 0.05], ["terminal", 11.5, 18.5, -1.2, 0], ["uld", 19.5, 6.2, -1.57, 0.05], ["cargo", 7.5, 6.5, -1.57, 0]],
  estate: [["spawn", 2.5, 2.5, 0.78, 0], ["pool", 16, 24, -1.57, 0], ["villa", 10.5, 15, -1.3, 0], ["hedge", 6.5, 6.2, -1.57, 0.05]],
}[mapId];
// A close look at the first sandbag barrier, wherever the round placed it.
const barrier = await p.evaluate(() => document.querySelector("midnry-fps").engine.arena.crates.find((c) => c.kind === "barrier"));
if (barrier) VIEWS.push(["barrier", barrier.x + 0.25, barrier.y + 1.25, -1.57, -0.12]);
for (const [name, x, y, a, pitch] of VIEWS) {
  const info = await p.evaluate(({ x, y, a, pitch }) => {
    const g = document.querySelector("midnry-fps").engine, arena = g.arena;
    cancelAnimationFrame(g.frame); g.frame = 0;
    for (const e of arena.entities) if (e !== g.player) Object.assign(e, { bot: false, x: 1.5, y: 1.5, hp: 1e6 });
    Object.assign(g.player, { x, y, a, shieldUntil: 1e9 });
    g.viewPitch = pitch;
    arena.time = 5;
    g.updateHUD(true);
    for (let i = 0; i < 4; i++) g.render();
    const info = g.military.renderer.info.render;
    const props = g.military.world.children.find((c) => c.name === "Arena props");
    return { calls: info.calls, tris: Math.round(info.triangles / 1000) + "k", props: props?.children.length ?? 0 };
  }, { x, y, a, pitch });
  await p.screenshot({ path: `${OUT}/${mapId}-${name}-${tag}-${W}.png` });
  console.log(name, JSON.stringify(info));
}
console.log("errors", errs);
await b.close();
