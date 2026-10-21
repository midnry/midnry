import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal", { timeout: 60000 }); await p.waitForTimeout(800);
await play(p, { timeout: 60000 }); await p.waitForTimeout(4000);
await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; window.__g = g; const me = g.arena.entities.find(e => e.id === g.selfId); for (const e of g.arena.entities) if (e !== me) e.hp = 0.0001; g.arena.zone.delay = 1e9; g.arena.damage(me, 55); });
const read = () => p.evaluate(() => { const me = __g.arena.entities.find(e => e.id === __g.selfId); return { t: +__g.arena.time.toFixed(1), hp: +me.hp.toFixed(1), shown: document.querySelector(".mf-hp")?.textContent }; });
let last; for (let k = 0; k < 200; k++) { const r = await read(); if (!last || r.t - last.t >= 1) { console.log(JSON.stringify(r)); last = r; } if (r.hp >= 100) break; await p.waitForTimeout(1500); }
console.log("errors", errs);
await b.close();
