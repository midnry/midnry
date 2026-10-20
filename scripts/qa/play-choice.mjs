// The big Play button never guesses the game: a new player is asked to
// choose; after choosing Last Signal, Play starts Last Signal; back in the
// menu, choosing Blackout Protocol and Play starts that (behind its loading
// screen, the old arena having been replaced).   node scripts/qa/play-choice.mjs [width]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280), M = W < 500;
mkdirSync("screenshots/qa/menu", { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await p.waitForTimeout(1000);
const state = () => p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; return { mode: g.mode, state: g.state, label: document.querySelector(".mf-start").textContent }; });
const result = { fresh: await state() };
await p.click(".mf-start");
await p.waitForTimeout(1200);
result.afterPlayUnchosen = await state();
result.asked = await p.evaluate(() => document.querySelector(".mf-gamepick").classList.contains("mf-ask"));
await p.screenshot({ path: `screenshots/qa/menu/choose-first-${W}.png` });
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(800);
result.chosenSignal = await state();
await p.click(M ? ".mf-playnext" : ".mf-start");
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 60000 });
result.started = await state();
// Leave the match for the menu, choose Blackout Protocol, play.
await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; g.pause(); });
await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector(".mf-leavematch").click());
await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector(".mf-confirmapply")?.click());
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "fresh", null, { timeout: 30000 }).catch(() => {});
await p.click(".mf-gamepick [data-mode=protocol]");
await p.waitForTimeout(800);
result.chosenProtocol = await state();
await p.click(M ? ".mf-playnext" : ".mf-start");
await p.waitForTimeout(200);
result.protocolScreen = await p.evaluate(() => !document.querySelector(".mf-transition")?.hidden);
await p.waitForFunction(() => { const g = document.querySelector("midnry-fps").engine; return g.state === "playing" && g.mode === "protocol"; }, null, { timeout: 120000 });
result.startedProtocol = await state();
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok = result.fresh.label.startsWith("CHOOSE") && result.afterPlayUnchosen.state === "fresh" && result.asked &&
  result.chosenSignal.label === "PLAY LAST SIGNAL →" && result.started.mode === "signal" && result.started.state === "playing" &&
  result.chosenProtocol.label === "PLAY BLACKOUT PROTOCOL →" && result.startedProtocol.mode === "protocol" && !errs.length;
if (!ok) process.exit(1);
