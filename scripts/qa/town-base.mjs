// Blackout Protocol in Calder Quay (the default base): starts a match from the
// lobby, photographs the spawn, a task panel, the medevac landing point in
// Market Square, a storm drain and the town siren, plays a while watching for
// page errors, then checks ?base=breakwater still opens Breakwater.
//   node scripts/qa/town-base.mjs [width]   → screenshots/qa/town
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280),
  H = W < 500 ? 844 : 720,
  M = W < 500;
const OUT = "screenshots/qa/town";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errs = [];
const open = async (query = "") => {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M, deviceScaleFactor: M ? 3 : 1 });
  ctx.setDefaultTimeout(240000);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  await p.addInitScript(() => {
    if (sessionStorage.getItem("qa")) return;
    sessionStorage.setItem("qa", "1");
    localStorage.removeItem("midnry-outpost-base");
    localStorage.setItem("midnry-outpost-mode", "protocol");
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
    localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true }));
  });
  await p.goto(`http://127.0.0.1:8080/games/outpost-zero.html${query}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 300000, polling: 1000 });
  await p.waitForTimeout(1500);
  await pickGame(p, "protocol", { timeout: 60000 });
  await play(p, { timeout: 60000 });
  await p.waitForFunction(() => { const e = document.querySelector("midnry-fps").engine; return e.state === "playing" && e.running; }, null, { timeout: 120000 });
  await p.waitForFunction(() => document.querySelector(".mf-transition")?.hidden !== false, null, { timeout: 300000, polling: 1000 });
  // Close the round briefing if it shows.
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Understood|Got it|Begin/i.test(x.textContent) && x.offsetParent)?.click());
  await p.waitForTimeout(1500);
  return { ctx, p };
};
const { ctx, p } = await open();
const info = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  return { map: g.arena.mapId, base: g.arena.base?.().name, size: g.arena.level.length, stations: g.arena.protocol.stations.length };
});
const VIEWS = [
  ["spawn", null],
  ["task-panel", () => ({ x: 6.5, y: 6.5, a: -Math.PI * 0.8 })],
  ["landing-point", (m) => ({ x: m.loading.x, y: m.loading.y - 3.2, a: Math.PI / 2 })],
  ["siren", (m) => ({ x: m.emergency.x + 2.5, y: m.emergency.y + 0.5, a: Math.PI })],
  ["clinic-cabinets", (m) => ({ x: 12.5, y: 25.5, a: 0 })],
];
const shots = [];
for (const [name, place] of VIEWS) {
  const r = await p.evaluate((src) => {
    const g = document.querySelector("midnry-fps").engine,
      m = g.arena.base(),
      me = g.player;
    if (src) Object.assign(me, new Function("m", "return (" + src + ")(m)")(m));
    g.cameraPitch = -0.08;
    for (let i = 0; i < 4; i++) g.military.render();
    return { x: +me.x.toFixed(1), y: +me.y.toFixed(1), calls: g.military.renderer.info.render.calls };
  }, place && place.toString());
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${name}-${W}.png` });
  shots.push({ name, ...r });
}
// Let the real round run for a while (bots working, events, sabotage).
await p.waitForTimeout(20000);
const after = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  return { state: g.arena.state, time: Math.round(g.arena.time), loaded: g.arena.protocol.mission.manifest.reduce((n, i) => n + i.loaded, 0) };
});
await ctx.close();
// The hidden option.
const old = await open("?base=breakwater");
const breakwater = await old.p.evaluate(() => document.querySelector("midnry-fps").engine.arena.mapId);
await old.p.screenshot({ path: `${OUT}/breakwater-option-${W}.png` });
// …and it stays chosen on this device until ?base=town.
const remembered = await old.p.evaluate(() => localStorage.getItem("midnry-outpost-base"));
await old.ctx.close();
console.log(JSON.stringify({ info, shots, after, breakwater, remembered, errors: errs }, null, 1));
await b.close();
process.exitCode = errs.length || info.map !== "town" || breakwater !== "breakwater" ? 1 : 0;
