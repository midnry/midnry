// Last Signal stances in the browser: keyboard C (tap crouch, hold prone),
// Space jump, the eye height for each, bots shown crouched / prone / jumping,
// and on a phone the stance (tap / hold) and jump buttons.
//   node scripts/qa/stance-look.mjs [width]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280),
  M = W < 500;
const OUT = "screenshots/qa/stance";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M });
ctx.setDefaultTimeout(180000);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.militaryLoaded, null, { timeout: 240000, polling: 1000 });
await pickGame(p, "signal");
await play(p);
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000, polling: 1000 });
await p.waitForTimeout(3000);
const g = (fn, arg) => p.evaluate(fn, arg);
const me = () =>
  g(() => {
    const e = document.querySelector("midnry-fps").engine,
      pl = e.arena.entities.find((x) => x.id === e.selfId);
    return { stance: pl.stance, jumpAt: pl.jumpAt, time: e.arena.time, want: e.stanceWant, eye: e.military?.eyeHeight };
  });
// Freeze the bots so the view is calm.
await g(() => {
  const e = document.querySelector("midnry-fps").engine;
  for (const x of e.arena.entities) if (x.id !== e.selfId) Object.assign(x, { bot: false });
});
const result = {};
// The software GPU here draws a frame or two a second: wait on the game state.
const until = (check) =>
  p.waitForFunction(
    (src) => {
      const e = document.querySelector("midnry-fps").engine,
        pl = e.arena.entities.find((x) => x.id === e.selfId);
      return new Function("pl", "e", "return " + src)(pl, e);
    },
    check,
    { timeout: 60000, polling: 200 },
  );
if (!M) {
  await p.keyboard.press("c");
  await until('pl.stance === "crouch"');
  await p.waitForTimeout(1500);
  result.crouch = await me();
  await p.screenshot({ path: `${OUT}/crouch-${W}.png` });
  await p.keyboard.down("c");
  await p.waitForTimeout(600);
  await p.keyboard.up("c");
  await until('pl.stance === "prone"');
  await p.waitForTimeout(2500);
  result.prone = await me();
  await p.screenshot({ path: `${OUT}/prone-${W}.png` });
  await p.keyboard.press("Space");
  await until("pl.jumpAt > 0");
  result.jump = await me();
}
// Bots in each pose, posed in front of the camera.
await g(() => {
  const e = document.querySelector("midnry-fps").engine,
    a = e.arena,
    pl = a.entities.find((x) => x.id === e.selfId);
  Object.assign(pl, { stance: "stand", jumpAt: -10 });
  e.setStance("stand");
  const others = a.entities.filter((x) => x.id !== e.selfId).slice(0, 3);
  const poses = ["crouch", "prone", "stand"];
  others.forEach((x, i) => {
    let ok = false;
    for (let r = 2.2; r < 4 && !ok; r += 0.4) {
      const ang = pl.a + (i - 1) * 0.42,
        tx = pl.x + Math.cos(ang) * r,
        ty = pl.y + Math.sin(ang) * r;
      if (a.canMove(tx, ty)) {
        Object.assign(x, { x: tx, y: ty, a: pl.a + Math.PI, stance: poses[i], stanceAt: 0, hp: 100 });
        ok = true;
      }
    }
  });
  others[2].jumpAt = a.time + 5;
  window.__poseJump = others[2].id;
});
await p.waitForTimeout(4200);
await g(() => {
  const e = document.querySelector("midnry-fps").engine,
    x = e.arena.entities.find((v) => v.id === window.__poseJump);
  x.jumpAt = e.arena.time - 0.25;
});
await p.waitForTimeout(150);
await p.screenshot({ path: `${OUT}/bots-poses-${W}.png` });
result.poses = await g(() => {
  const e = document.querySelector("midnry-fps").engine;
  return [...e.military.actors.values()].map((a) => a.action).slice(0, 7);
});
if (M) {
  // Phone: tap the stance button (crouch), hold it (prone), tap jump.
  const box = await p.locator(".mf-stance").boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await until('pl.stance === "crouch"');
  result.tap = await me();
  await p.screenshot({ path: `${OUT}/phone-crouch-${W}.png` });
  await p.dispatchEvent(".mf-stance", "pointerdown", { pointerId: 7, pointerType: "touch" });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/phone-holding-${W}.png` });
  await p.waitForTimeout(400);
  await p.dispatchEvent(".mf-stance", "pointerup", { pointerId: 7, pointerType: "touch" });
  await until('pl.stance === "prone"');
  await p.waitForTimeout(2000);
  result.hold = await me();
  await p.screenshot({ path: `${OUT}/phone-prone-${W}.png` });
  const jump = await p.locator(".mf-jump").boundingBox();
  await p.touchscreen.tap(jump.x + jump.width / 2, jump.y + jump.height / 2);
  await until("pl.jumpAt > 0");
  result.jump = await me();
}
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok = M
  ? result.tap.stance === "crouch" && result.hold.stance === "prone" && result.jump.jumpAt > 0
  : result.crouch.stance === "crouch" && result.prone.stance === "prone" && result.prone.eye < 0.6 && result.jump.jumpAt > 0;
if (!ok || errs.length) process.exit(1);
