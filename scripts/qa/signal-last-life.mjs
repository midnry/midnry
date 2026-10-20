// Last Signal vision by lives: photos at 3 lives, 2 lives, last life with the
// adrenaline rush, and last life badly hurt. Usage:
//   node scripts/qa/signal-last-life.mjs [width]   (390 = phone)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] ?? 1280), M = W < 500, H = M ? 844 : 720;
const OUT = "screenshots/qa/lastlife";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + (e.stack || e.message).slice(0, 400)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await p.click(".mf-gamepick [data-mode=signal]", { timeout: 60000 });
await p.waitForTimeout(1500);
await p.click(".mf-start", { timeout: 60000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 180000 });
await p.waitForTimeout(4000);
const states = [
  ["lives3", "p.lives = 2;"],
  ["lives2", "p.lives = 1;"],
  ["last-rush", "p.lives = 0; p.adrenalineUntil = p.speedUntil = a.time + 6;"],
  ["last-lowhp", "p.lives = 0; p.adrenalineUntil = 0; p.hp = 20;"],
];
for (const [name, setup] of states) {
  const info = await p.evaluate((setup) => {
    const g = document.querySelector("midnry-fps").engine, a = g.arena, p = g.player;
    for (const e of a.entities) e.bot = false;
    p.hp = p.maxHp;
    new Function("g", "a", "p", setup)(g, a, p);
    g.updateHUD(true);
    const fx = document.querySelector(".mf-lifefx");
    return { classes: fx.className, opacity: getComputedStyle(fx).opacity, stat: document.querySelector(".mf-teamstat").textContent };
  }, setup);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/${name}-${W}.png` });
  console.log(name, JSON.stringify(info));
}
// Final call-outs as the field thins.
const calls = await p.evaluate(async () => {
  const g = document.querySelector("midnry-fps").engine, a = g.arena, seen = [];
  const others = a.entities.filter((e) => e !== g.player);
  for (const n of [5, 6]) { others[n - 5].hp = 0; others[n - 5].lives = 0; }
  for (let i = 0; i < 6; i++) { others[i].hp = 0; others[i].lives = 0; g.updateHUD(true); seen.push(document.querySelector(".mf-toast").textContent); }
  return seen;
});
console.log("toasts", JSON.stringify(calls));
console.log("errors", errs);
await b.close();
