// Every weapon finish on the first-person carbine (owned locally for the shot).
//   node scripts/qa/finish-look.mjs [width=1280]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280), M = W < 500;
const OUT = "screenshots/qa/finishes";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5, xp: 5000 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal");
await p.waitForTimeout(800);
await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine, r = Math.random; Math.random = () => 0.1; g.reset(); Math.random = r; document.querySelector(".mf-start").click(); });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.military?.weaponKit, null, { timeout: 180000 });
await p.waitForTimeout(2500);
const ids = await p.evaluate(() => [...document.querySelectorAll("midnry-fps")][0] && ["standard", "copper", "glacier", "nightfall", "tiger", "pixel", "carbon", "damascus", "haze", "signal"]);
for (const id of ids) {
  await p.evaluate((id) => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame); g.frame = 0;
    for (const e of g.arena.entities) if (e !== g.player) Object.assign(e, { bot: false, x: 1.5, y: 1.5, hp: 1e6 });
    g.retention.store.owned.add(id);
    g.retention.store.pass = true;
    g.retention.profile.skin = id;
    Object.assign(g.player, { x: 14, y: 10.5, a: 1.57, shieldUntil: 1e9, weapon: "carbine" });
    g.lookPitch = -0.05;
    for (let i = 0; i < 3; i++) g.render();
  }, id);
  await p.screenshot({ path: `${OUT}/${id}-${W}.png`, clip: M ? undefined : { x: 760, y: 380, width: 520, height: 340 } });
}
console.log(JSON.stringify({ shots: ids.length, errors: errs }));
await b.close();
