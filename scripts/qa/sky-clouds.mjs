// Drifting clouds: the sky looking up, with the cloud layer off, on, and two
// minutes later (it must have moved).   node scripts/qa/sky-clouds.mjs [width]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280), M = W < 500;
const OUT = "screenshots/qa/sky";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal");
await p.waitForTimeout(800);
await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine, r = Math.random; Math.random = () => 0.1; g.reset(); Math.random = r; document.querySelector(".mf-start").click(); });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 180000 });
await p.waitForTimeout(3000);
const shot = async (name, visible, time) => {
  await p.evaluate(({ visible, time }) => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame); g.frame = 0;
    Object.assign(g.player, { x: 12, y: 12, a: 0.6, shieldUntil: 1e9 });
    g.lookPitch = 0.55;
    if (window.__cloudDebug) g.military.clouds.material.uniforms.lit.value.set("#ff0000");
    g.time = time;
    g.military.clouds.mesh.visible = visible;
    for (let i = 0; i < 3; i++) g.render();
  }, { visible, time });
  await p.screenshot({ path: `${OUT}/${name}-${W}.png` });
};
await shot("off", false, 10);
await shot("on", true, 10);
await shot("later", true, 130);
console.log(JSON.stringify({ errors: errs }));
await b.close();
