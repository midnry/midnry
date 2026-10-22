// Calder Quay (grey box): loads the arena through the play-test link
// (?arena=quay), photographs set views with fighters in them, plays a bot
// round watching for page errors, and reports draw calls.
//   node scripts/qa/quay-look.mjs [width]   → screenshots/qa/quay
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280),
  H = W < 500 ? 844 : 720,
  M = W < 500;
const OUT = "screenshots/qa/quay";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M, deviceScaleFactor: M ? 3 : 1 });
ctx.setDefaultTimeout(240000);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()) && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-mode", "signal");
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-series", "single");
  localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true }));
});
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html?arena=quay", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 300000, polling: 1000 });
const mapId = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  g.lockMouse = () => {};
  g.mode = "signal";
  g.seriesKind = "single";
  g.series = null;
  g.reset();
  g.start();
  return g.arena.mapId;
});
await p.waitForFunction(() => document.querySelector(".mf-transition")?.hidden !== false, null, { timeout: 300000, polling: 1000 });
await p.waitForTimeout(1500);
// Views: name, player x, y, heading, fighters placed ahead.
const VIEWS = [
  ["spawn-north", 15, 1.5, Math.PI / 2],
  ["avenue-to-square", 15.5, 6.5, Math.PI / 2],
  ["market-square", 14.5, 16.5, -Math.PI / 2 - 0.4],
  ["avenue-bridge", 15.5, 18.5, Math.PI / 2],
  ["quay-west", 2.5, 18.5, 0],
  ["across-canal", 10.5, 18.5, Math.PI / 2 - 0.5],
  ["dock-bridge", 24.5, 17.5, Math.PI / 2],
  ["inside-clinic", 10.5, 24.5, 0],
  ["inside-police", 11.5, 6.5, -Math.PI / 2 + 0.4],
  ["inside-depot", 20.5, 24.5, 0.3],
  ["inside-radio", 6.5, 4.5, Math.PI - 0.3],
  ["depot-yard", 27.5, 27.5, -Math.PI * 0.75],
];
const shots = [];
for (const [name, x, y, a] of VIEWS) {
  const stats = await p.evaluate(
    ({ x, y, a }) => {
      const g = document.querySelector("midnry-fps").engine,
        me = g.player,
        bots = g.arena.entities.filter((e) => e !== me);
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      Object.assign(me, { x, y, a, hp: me.maxHp });
      g.cameraPitch = 0;
      // Fighters ahead at 3–12 tiles where there is open floor.
      let k = 0;
      for (const d of [3, 5, 7, 9, 12])
        for (const s of [-1.2, 0, 1.2]) {
          const e = bots[k];
          if (!e) break;
          const ex = x + Math.cos(a) * d - Math.sin(a) * s,
            ey = y + Math.sin(a) * d + Math.cos(a) * s;
          if (g.arena.canMove(ex, ey, 0.3)) Object.assign(bots[k++], { x: ex, y: ey, a: a + Math.PI, hp: 100 });
        }
      for (; k < bots.length; k++) Object.assign(bots[k], { x: 1.5, y: 1.5, hp: 0 });
      for (let i = 0; i < 3; i++) {
        g.time += 0.02;
        g.military.render();
      }
      return { drawCalls: g.military.renderer.info.render.calls };
    },
    { x, y, a },
  );
  await p.screenshot({ path: `${OUT}/${name}-${W}.png` });
  shots.push({ name, ...stats });
}
// A bot round in the page: every fighter is a bot; the renderer draws
// every few steps so render errors surface too.
const round = await p.evaluate(async () => {
  const g = document.querySelector("midnry-fps").engine;
  cancelAnimationFrame(g.frame);
  g.frame = 0;
  g.reset();
  for (const e of g.arena.entities) e.bot = true;
  let steps = 0;
  while (g.arena.state === "playing" && g.arena.time < 400) {
    g.arena.advance(1 / 30, {});
    if (++steps % 15 === 0) {
      g.time = g.arena.time;
      g.military.render();
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  g.military.render();
  return { state: g.arena.state, simSeconds: Math.round(g.arena.time), mapId: g.arena.mapId, winner: g.arena.winner ?? null };
});
await p.screenshot({ path: `${OUT}/after-round-${W}.png` });
console.log(JSON.stringify({ mapId, shots, round, errors: errs }, null, 1));
await b.close();
process.exitCode = errs.length || mapId !== "quay" ? 1 : 0;
