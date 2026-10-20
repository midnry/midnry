// Home lobby: the operator on a lit platform, squad "+" pads either side,
// level and challenges on the left, the mode card bottom right. Checks the
// unchosen state, the picker sheet (open, pick, close), the mode card's Play
// starting the chosen game, and dragging to turn the operator.
//   node scripts/qa/lobby-look.mjs [width]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280),
  M = W < 500;
const OUT = "screenshots/qa/lobby";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-modal.mf-lobby") && document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, {
  timeout: 240000,
});
await p.waitForTimeout(1500);
const look = () =>
  p.evaluate(() => {
    const box = (s) => {
      const e = document.querySelector(s);
      if (!e || e.hidden || !e.offsetParent) return null;
      const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    };
    const g = document.querySelector("midnry-fps").engine;
    return {
      state: g.state,
      mode: g.mode,
      title: document.querySelector(".mf-modetitle")?.textContent,
      play: document.querySelector(".mf-modeplay")?.textContent,
      modeCard: box(".mf-modecard"),
      left: box(".mf-homeleft"),
      squad: [...document.querySelectorAll(".mf-squad [data-invite]")].map((e) => {
        const r = e.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y)];
      }),
      picker: document.querySelector(".mf-modal").classList.contains("mf-picking"),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
const result = { fresh: await look() };
await p.screenshot({ path: `${OUT}/lobby-unchosen-${W}.png` });
// Play without a game opens the picker sheet.
await p.click(".mf-modeplay");
await p.waitForTimeout(800);
result.afterPlay = await look();
await p.screenshot({ path: `${OUT}/picker-${W}.png` });
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(900);
if ((await look()).picker) await p.click(".mf-pickerclose");
await p.waitForTimeout(600);
result.chosen = await look();
// Drag to turn the operator.
const spin0 = await p.evaluate(() => document.querySelector("midnry-fps").engine.military.lobby.actor.root.rotation.y);
await p.mouse.move(W / 2, 300);
await p.mouse.down();
await p.mouse.move(W / 2 + 120, 300, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(100);
result.turned = Math.abs((await p.evaluate(() => document.querySelector("midnry-fps").engine.military.lobby.actor.root.rotation.y)) - spin0) > 0.2;
await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/lobby-signal-${W}.png` });
await p.click(".mf-modeplay");
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000 });
result.started = await look();
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok =
  result.fresh.modeCard &&
  result.fresh.squad.length === 2 &&
  result.afterPlay.picker &&
  result.afterPlay.state === "fresh" &&
  !result.chosen.picker &&
  /last signal/i.test(result.chosen.title) &&
  result.turned &&
  result.started.mode === "signal" &&
  !result.fresh.overflow &&
  !errs.length;
if (!ok) process.exit(1);
