// Calder Quay water: photos of swimming (your eye at the waterline), a
// swimmer seen from the quay, a culvert mouth with the Dive prompt, diving,
// and electrified water. Also checks the page stays error-free.
//   node scripts/qa/quay-swim.mjs [width]   → screenshots/qa/quay
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
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  g.lockMouse = () => {};
  g.mode = "signal";
  g.seriesKind = "single";
  g.series = null;
  g.reset();
  g.start();
});
await p.waitForFunction(() => document.querySelector(".mf-transition")?.hidden !== false, null, { timeout: 300000, polling: 1000 });
await p.waitForTimeout(1200);
// Stop the page loop; step the round and draw by hand.
const shot = async (name, setup) => {
  const state = await p.evaluate((setup) => {
    const g = document.querySelector("midnry-fps").engine,
      a = g.arena,
      me = g.player,
      others = a.entities.filter((e) => e !== me);
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    a.countdown = 0;
    a.disaster = null;
    for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 0, hp: e.maxHp, diveUntil: 0 });
    others.forEach((e, i) => Object.assign(e, { x: 1.5 + i, y: 1.5 }));
    a.waterShockUntil = 0;
    new Function("g", "a", "me", "others", setup)(g, a, me, others);
    for (let i = 0; i < 6; i++) a.advance(1 / 30, { [me.id]: { aim: me.a, jump: !!g.diveNow && i === 0 } });
    g.time = a.time;
    g.draw?.();
    g.military.render();
    g.updateWaterHud();
    return { stance: me.stance, wet: a.inWater(me), diving: me.diveUntil > a.time, live: a.waterShockUntil > a.time, jump: document.querySelector(".mf-jump span")?.textContent };
  }, setup);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}/swim-${name}-${W}.png` });
  return { name, ...state };
};
const results = [];
// Swimming in the canal, looking along it.
results.push(await shot("in-canal", "Object.assign(me,{x:8.5,y:19.6,a:0}); g.cameraPitch=0;"));
// A swimmer seen from the quay.
results.push(await shot("swimmer-from-quay", "Object.assign(me,{x:9.5,y:18.4,a:Math.PI/2}); Object.assign(others[0],{x:9.4,y:20.2,a:-Math.PI/2}); g.cameraPitch=-0.3;"));
// At a culvert mouth: the Dive prompt.
results.push(await shot("culvert-mouth", "Object.assign(me,{x:2.5,y:19.6,a:-Math.PI/2}); g.cameraPitch=0;"));
// Diving.
results.push(await shot("diving", "Object.assign(me,{x:2.5,y:19.5,a:-Math.PI/2}); g.diveNow=true;"));
// Electrified water, a swimmer in it.
results.push(await shot("electrified", "g.diveNow=false; Object.assign(me,{x:10.5,y:18.4,a:Math.PI/2+0.3}); Object.assign(others[0],{x:12.5,y:20.6}); a.electrifyWater(12.5,20.5); g.cameraPitch=-0.2;"));
console.log(JSON.stringify({ results, errors: errs }, null, 1));
await b.close();
process.exitCode = errs.length ? 1 : 0;
