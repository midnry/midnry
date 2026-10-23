// Close-ups of each modelled dressing vignette (prop-*) placed in a Last
// Signal arena: finds one instance of each in the "Arena props" group, stands
// the player 4 m in front of it looking at it, and photographs it. Also checks
// that no dressing stands on a lane tile (every prop's tile hugs exactly one
// wall, so routes and cover are unchanged).
//   node scripts/qa/prop-closeup.mjs [mapId=outpost] [width=1280]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const [mapId = "outpost", width = "1280"] = process.argv.slice(2);
const W = Number(width), M = W < 500, H = M ? 844 : 720;
const OUT = "screenshots/qa/props";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset: "balanced", options: { adaptive: false } }));
});
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal");
await p.waitForTimeout(800);
const pick = { outpost: 0.1, skyport: 0.5, estate: 0.9 }[mapId];
await p.evaluate((pick) => { const g = document.querySelector("midnry-fps").engine, r = Math.random; Math.random = () => pick; g.reset(); Math.random = r; document.querySelector(".mf-start").click(); }, pick);
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 180000 });
await p.waitForFunction((id) => { const s = document.querySelector("midnry-fps").engine.military?.arenaStyle?.of(id); return !s || s.ready || s.failed; }, mapId, { timeout: 180000 });
await p.waitForTimeout(4000);
// Props are static-batched after placement, so read the placements from the
// style's own record (dress() keeps them in group.userData.placed).
const placed = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  // Rebuild once so the world (and its props) exist for this round.
  g.render();
  const group = g.military.world.children.find((c) => c.name === "Arena props");
  return group?.userData.placed || [];
});
console.log(`placed ${placed.length} props:`, Object.entries(placed.reduce((m, q) => ((m[q.asset] = (m[q.asset] || 0) + 1), m), {})).map(([k, v]) => `${k} ×${v}`).join(", "));
// Lane check: each prop's tile must touch exactly one wall.
const bad = await p.evaluate((placed) => {
  const g = document.querySelector("midnry-fps").engine, level = g.level, open = (x, y) => level[y]?.[x] === 0;
  return placed.filter(({ tile: [x, y] }) => !open(x, y) || [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => !open(x + dx, y + dy)).length !== 1);
}, placed);
console.log(bad.length ? `FAIL ${bad.length} props off a single-wall tile` : "PASS every prop hugs exactly one wall, on an open tile");
const seen = new Set();
for (const q of placed) {
  if (!q.asset.startsWith("prop-") || seen.has(q.asset)) continue;
  seen.add(q.asset);
  const info = await p.evaluate(({ q }) => {
    const g = document.querySelector("midnry-fps").engine, arena = g.arena, SCALE = 3;
    cancelAnimationFrame(g.frame); g.frame = 0;
    for (const e of arena.entities) if (e !== g.player) Object.assign(e, { bot: false, x: 1.5, y: 1.5, hp: 1e6 });
    // Stand 4 m into the lane from the prop, facing it.
    const px = q.x / SCALE, py = q.z / SCALE, dx = -q.dx, dy = -q.dy;
    const sx = px + dx * 1.3, sy = py + dy * 1.3;
    Object.assign(g.player, { x: sx, y: sy, a: Math.atan2(py - sy, px - sx), shieldUntil: 1e9 });
    g.viewPitch = 0.08;
    arena.time = 5;
    g.updateHUD(true);
    for (let i = 0; i < 4; i++) g.render();
    return { at: [+sx.toFixed(1), +sy.toFixed(1)], calls: g.military.renderer.info.render.calls };
  }, { q });
  await p.screenshot({ path: `${OUT}/${mapId}-${q.asset}-${W}.png` });
  console.log(q.asset, JSON.stringify(info));
}
console.log("errors", errs);
await b.close();
