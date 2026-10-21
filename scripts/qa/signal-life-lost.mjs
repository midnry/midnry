// Last Signal: losing a spare life shows the "Life lost" screen (who took it,
// lives left, redeploy bar) while the round holds still, then play resumes at
// the new spot. Twice: the second time is the last life.
//   node scripts/qa/signal-life-lost.mjs [width]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280),
  M = W < 500;
const S = "screenshots/qa/signal";
mkdirSync(S, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal", { timeout: 60000 });
await play(p, { timeout: 60000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000 });
await p.waitForTimeout(2500);
const look = () =>
  p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine,
      me = g.arena.entities.find((e) => e.id === g.selfId),
      el = document.querySelector(".mf-lifelost");
    return { on: el.classList.contains("mf-on"), text: [...el.querySelectorAll("small, strong, span, em")].map((n) => n.textContent).join(" · "), running: g.running, time: +g.arena.time.toFixed(2), lives: me.lives, hp: Math.round(me.hp) };
  });
const kill = () =>
  p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine,
      me = g.arena.entities.find((e) => e.id === g.selfId),
      rival = g.arena.entities.find((e) => e !== me && e.hp > 0);
    me.shieldUntil = 0;
    g.arena.damage(me, 999, rival);
  });
const result = {};
for (const [name, shot] of [["first", "life-lost"], ["last", "last-life-lost"]]) {
  await kill();
  // The software GPU here draws a few frames a second: wait on state.
  await p.waitForFunction(() => document.querySelector(".mf-lifelost.mf-on"), null, { timeout: 20000 });
  const during = await look();
  await p.waitForTimeout(300);
  const later = await look();
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${S}/${shot}-${W}.png` });
  await p.waitForFunction(() => !document.querySelector(".mf-lifelost.mf-on") && document.querySelector("midnry-fps").engine.running, null, { timeout: 120000 });
  const after = await look();
  result[name] = { during, later, frozen: later.on && during.time === later.time, after };
  await p.waitForTimeout(1000);
}
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok =
  result.first.during.on &&
  /life lost/i.test(result.first.during.text) &&
  /2 lives left/i.test(result.first.during.text) &&
  /taken down by/i.test(result.first.during.text) &&
  result.first.frozen &&
  !result.first.after.on &&
  result.first.after.running &&
  result.last.during.on &&
  /last life/i.test(result.last.during.text) &&
  result.last.after.running &&
  !errs.length;
if (!ok) process.exit(1);
