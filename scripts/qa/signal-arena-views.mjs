// Last Signal arenas: one photo per arena from the spawn edge and from inside,
// with all 8 fighters in view, plus renderer draw calls. Usage:
//   node scripts/qa/signal-arena-views.mjs [width]   (390 = phone)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] ?? 1280), M = W < 500, H = M ? 844 : 720;
const OUT = "screenshots/qa/arenas";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + (e.stack || e.message).slice(0, 400)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset: "balanced", options: { adaptive: false } }));
});
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await p.click(".mf-playlists [data-mode=signal]", { timeout: 60000 });
await p.waitForTimeout(1500);
await p.click(".mf-start", { timeout: 60000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 180000 });
await p.waitForTimeout(4000);
// Views: [name, player x, y, angle, fighters placed along the view].
const views = {
  outpost: [["edge", 2.5, 2.5, Math.PI / 4], ["gate", 9.9, 4.5, Math.PI / 2], ["centre", 14, 9, Math.PI / 2]],
  skyport: [["edge", 2.5, 2.5, Math.PI / 4], ["fence", 11.9, 4.5, Math.PI / 2], ["apron", 18, 30.5, -Math.PI / 2]],
  estate: [["edge", 2.5, 2.5, Math.PI / 4], ["gate", 9.9, 4.5, Math.PI / 2], ["pool", 16, 24, -Math.PI / 2]],
};
const r = { 0.1: "outpost", 0.5: "skyport", 0.9: "estate" };
for (const [pick, mapId] of Object.entries(r)) {
  const map = await p.evaluate(async (pick) => {
    const g = document.querySelector("midnry-fps").engine, random = Math.random;
    Math.random = () => pick; g.reset(); Math.random = random;
    g.start();
    await new Promise((res) => setTimeout(res, 3000));
    cancelAnimationFrame(g.frame); g.frame = 0;
    return g.arena.mapId;
  }, Number(pick));
  if (map !== mapId) throw new Error(`expected ${mapId}, got ${map}`);
  for (const [name, x, y, a] of views[mapId]) {
    const result = await p.evaluate(({ x, y, a }) => {
      const g = document.querySelector("midnry-fps").engine, arena = g.arena;
      Object.assign(g.player, { x, y, a, hp: g.player.maxHp });
      g.viewPitch = 0;
      // Seven rivals spread 3–9 tiles ahead on the nearest open tiles.
      const others = arena.entities.filter((e) => e !== g.player);
      others.forEach((e, i) => {
        const d = 3 + i, side = (i % 2 ? 1 : -1) * (0.3 + 0.2 * i);
        let px = x + Math.cos(a) * d - Math.sin(a) * side, py = y + Math.sin(a) * d + Math.cos(a) * side;
        for (let k = 0; k < 12 && !arena.canMove(px, py); k++) { px -= Math.cos(a) * 0.5; py -= Math.sin(a) * 0.5; }
        Object.assign(e, { x: px, y: py, hp: e.maxHp, bot: false, a: a + Math.PI });
      });
      for (let i = 0; i < 4; i++) { g.time += 0.05; g.render(); }
      g.render();
      const info = g.military.renderer.info.render;
      return { calls: info.calls, tris: Math.round(info.triangles / 1000) + "k", inView: others.filter((e) => arena.canMove(e.x, e.y)).length };
    }, { x, y, a });
    await p.screenshot({ path: `${OUT}/${mapId}-${name}-${W}.png` });
    console.log(mapId, name, JSON.stringify(result));
  }
}
console.log("errors", errs);
await b.close();
