// Last Signal round loading screen: arena art while the arena builds.
//   node scripts/qa/signal-loading.mjs [width=1280] [pick=0.1|0.5|0.9 → outpost|skyport|estate]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280), M = W < 500, pick = Number(process.argv[3] || 0.9);
const OUT = "screenshots/qa/loading";
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
// Hold the screen open for the photo (the real one closes once built).
if (process.env.HOLD) await p.evaluate(() => { const t = document.querySelector("midnry-fps").engine.sceneTransition; t.hide = () => {}; });
await p.evaluate((pick) => { const g = document.querySelector("midnry-fps").engine, r = Math.random; Math.random = () => pick; g.reset(); Math.random = r; document.querySelector(".mf-start").click(); }, pick);
await p.waitForSelector(".mf-transition:not([hidden])", { timeout: 30000 });
await p.waitForTimeout(150);
const info = await p.evaluate(() => ({ map: document.querySelector("midnry-fps").engine.arena.mapId, kicker: document.querySelector(".mf-transition small").textContent, image: document.querySelector(".mf-transition").style.backgroundImage }));
await p.screenshot({ path: `${OUT}/signal-${info.map}-${W}.png` });
if (!process.env.HOLD) await p.waitForSelector(".mf-transition[hidden]", { state: "attached", timeout: 60000 });
console.log(JSON.stringify({ ...info, closed: true, errors: errs }));
await b.close();
