// Switching between Blackout Protocol and Last Signal in the menu, many times:
// GPU memory (geometries, textures), JS heap and page errors must stay flat.
//   node scripts/qa/mode-switch.mjs [width=1280] [switches=24]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280), M = W < 500, N = Number(process.argv[3] || 24);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-precise-memory-info"] });
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
p.on("crash", () => errs.push("PAGE CRASHED"));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await p.waitForTimeout(2000);
const sample = () => p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine, r = g.military, m = r?.renderer.info.memory;
  return { mode: g.mode, map: g.arena?.mapId, geo: m?.geometries, tex: m?.textures, heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6), lost: r?.contextUnavailable || false };
});
const log = [await sample()];
for (let i = 0; i < N; i++) {
  const mode = i % 2 ? "protocol" : "signal";
  const t0 = Date.now();
  await pickGame(p, mode, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const s = await sample();
  s.ms = Date.now() - t0;
  log.push(s);
  if (errs.includes("PAGE CRASHED")) break;
}
for (const s of log) console.log(JSON.stringify(s));
console.log("errors", JSON.stringify(errs));
await b.close();
