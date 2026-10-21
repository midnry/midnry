// Dust Outpost must be dressed on the first frame of a match, not swapped in later.
//   node scripts/qa/arena-first-frame.mjs [width=1280]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280), M = W < 500;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
const before = await p.evaluate(() => document.querySelector("midnry-fps").engine.military?.arenaStyle?.readyFor("outpost"));
await pickGame(p, "signal");
await p.waitForTimeout(500);
// Watch every frame from the click: the first outpost frame must already be dressed.
const seen = await p.evaluate(async () => {
  const g = document.querySelector("midnry-fps").engine, r = Math.random, frames = [];
  const render = g.render.bind(g);
  g.render = (...a) => {
    const out = render(...a);
    // Only frames a player can see: not behind the round's loading screen.
    const screen = document.querySelector(".mf-transition");
    const covered = screen && !screen.hidden && !screen.classList.contains("mf-out");
    if (g.arena?.mapId === "outpost" && !covered && frames.length < 5)
      frames.push(!!g.military?.world?.children.find((c) => c.name === "Arena props"));
    return out;
  };
  Math.random = () => 0.1; g.reset(); Math.random = r;
  document.querySelector(".mf-start").click();
  for (let i = 0; i < 100 && frames.length < 5; i++) await new Promise((res) => setTimeout(res, 100));
  return frames;
});
console.log(JSON.stringify({ styleReadyAtMenu: before, dressedFrames: seen, errors: errs }));
await b.close();
if (!before || !seen.length || seen.includes(false) || errs.length) process.exit(1);
