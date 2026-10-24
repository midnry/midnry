// Measures frame hitches during a Last Signal round. Locker character models
// are delayed and staggered so they arrive mid-match (as on a slow
// connection), and every frame gap well above the median is logged with
// what changed at that moment (characters loaded, GPU textures, shader
// programs). A hitch that lines up with a character arrival is the swap
// of a bot's stand-in sculpt for its character.
//   node scripts/qa/signal-hitches.mjs [width=1280] [stagger=4000] [seconds=80] [preset=balanced] [height]
// (the headless renderer is slow: 640 wide, 360 high and "performance" give usable frame times)
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
const [width = "1280", stagger = "4000", seconds = "80", preset = "balanced", height] = process.argv.slice(2);
const W = Number(width), M = W < 500, H = M ? 844 : Number(height || 720);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
let n = 0;
const arrivals = [];
await p.route(/models\/characters\/.*\.glb/, async (route) => {
  const wait = Number(stagger) * ++n;
  await new Promise((r) => setTimeout(r, wait));
  arrivals.push({ file: route.request().url().split("/").pop().split("?")[0], at: Date.now() });
  await route.continue();
});
await p.addInitScript((preset) => {
  window.__preset = preset;
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset: window.__preset, options: { adaptive: false } }));
  window.__long = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ at: Date.now() - performance.now() + e.startTime, ms: Math.round(e.duration) }); }).observe({ entryTypes: ["longtask"] }); } catch {}
}, preset);
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal", { timeout: 60000 });
await p.waitForTimeout(1000);
await play(p, { timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.running, null, { timeout: 120000 });
const t0 = Date.now();
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine, r = g.military;
  window.__frames = [];
  let last = performance.now();
  const snap = () => ({ chars: r.characterAssets?.size || 0, tex: r.renderer.info.memory.textures, prog: r.renderer.info.programs.length, t: +(g.arena?.time || 0).toFixed(1) });
  const tick = (t) => { window.__frames.push({ at: Date.now(), ms: t - last, ...snap() }); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__bot = setInterval(() => { g.firing = Math.random() < 0.3; g.keys.add("w"); if (Math.random() < 0.08) g.player.a += (Math.random() - 0.5) * 2; }, 100);
});
await p.waitForTimeout(Number(seconds) * 1000);
const frames = await p.evaluate(() => (clearInterval(window.__bot), window.__frames));
const long = await p.evaluate(() => window.__long);
const wearing = await p.evaluate(() => { const r = document.querySelector("midnry-fps").engine.military; return [...r.actors.values()].filter((a) => a.character).length + "/" + r.actors.size; });
const ms = frames.map((f) => f.ms).sort((a, b) => a - b), median = ms[ms.length >> 1];
const hitches = frames.filter((f) => f.ms > Math.max(3 * median, 250));
console.log(`frames ${frames.length}, median ${median.toFixed(0)} ms, worst ${ms[ms.length - 1].toFixed(0)} ms, hitches ${hitches.length} (>${Math.max(3 * median, 250).toFixed(0)} ms), long tasks ${long.length}`);
for (const h of hitches) {
  const near = arrivals.filter((a) => Math.abs(a.at - h.at) < 2500).map((a) => a.file);
  const prev = frames[frames.indexOf(h) - 1] || h;
  console.log(`  +${((h.at - t0) / 1000).toFixed(1)}s  ${h.ms.toFixed(0)} ms  chars ${prev.chars}->${h.chars} tex ${prev.tex}->${h.tex} prog ${prev.prog}->${h.prog}  arrivals: ${near.join(",") || "-"}`);
}
console.log("bots wearing a character at the end:", wearing);
console.log("character arrivals:", arrivals.map((a) => `${a.file}@+${((a.at - t0) / 1000).toFixed(1)}s`).join(" "));
console.log("errors", errs);
await b.close();
