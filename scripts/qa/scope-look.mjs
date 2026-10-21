// Last Signal scope (aim down the sights) and the special-move hint:
// laptop right-click zooms in; on a phone the SCOPE button toggles it; a
// charged meter shows what the special move does.
//   node scripts/qa/scope-look.mjs [width] [height] [height]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280),
  H = Number(process.argv[3] || 0),
  M = W < 500 || (H > 0 && H < 500);
const OUT = "screenshots/qa/scope";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await b.newContext({ viewport: { width: W, height: H || (M ? 844 : 720) }, isMobile: M, hasTouch: M });
ctx.setDefaultTimeout(180000);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.removeItem("midnry-outpost-overdrive-hint");
});
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.militaryLoaded, null, { timeout: 240000, polling: 1000 });
await pickGame(p, "signal");
await play(p);
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000, polling: 1000 });
await p.waitForTimeout(3000);
const g = (fn, arg) => p.evaluate(fn, arg);
// Calm view: bots frozen, carbine in hand, facing down a long line.
await g(() => {
  const e = document.querySelector("midnry-fps").engine;
  for (const x of e.arena.entities) if (x.id !== e.selfId) Object.assign(x, { bot: false });
  e.player.weapon = "carbine";
  e.player.charge = 0;
});
const state = () =>
  g(() => {
    const e = document.querySelector("midnry-fps").engine;
    return { ads: e.player.ads, aiming: e.aiming, zoom: e.military?.adsZoom, fov: e.military?.camera.fov, cls: e.shell.classList.contains("mf-ads") };
  });
const until = (src) => p.waitForFunction(new Function("const e=document.querySelector('midnry-fps').engine; return " + src), null, { timeout: 60000, polling: 200 });
const result = {};
await p.waitForTimeout(1500);
result.hip = await state();
await p.screenshot({ path: `${OUT}/hip-${W}${H ? 'x' + H : ''}.png` });
if (!M) {
  await p.mouse.move(W / 2, 360);
  await p.mouse.down({ button: "right" });
  await until("e.player.ads && e.military.adsZoom < 0.65");
  await p.waitForTimeout(800);
  result.aimed = await state();
  await p.screenshot({ path: `${OUT}/aimed-${W}${H ? 'x' + H : ''}.png` });
  await p.mouse.up({ button: "right" });
  await until("!e.player.ads && e.military.adsZoom > 0.98");
  result.released = await state();
} else {
  const box = await p.locator(".mf-scope").boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await until("e.player.ads && e.military.adsZoom < 0.65");
  await p.waitForTimeout(800);
  result.aimed = { ...(await state()), pressed: await p.locator(".mf-scope").getAttribute("aria-pressed") };
  await p.screenshot({ path: `${OUT}/aimed-${W}${H ? 'x' + H : ''}.png` });
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await until("!e.player.ads && e.military.adsZoom > 0.98");
  result.released = await state();
}
// Fill the special-move meter: the hint explains Overdrive.
await g(() => {
  document.querySelector("midnry-fps").engine.player.charge = 100;
});
await until('e.$(".mf-toast").textContent.includes("READY")');
await p.waitForTimeout(400);
result.hint = await g(() => document.querySelector("midnry-fps").engine.$(".mf-toast").textContent);
await p.screenshot({ path: `${OUT}/overdrive-hint-${W}${H ? 'x' + H : ''}.png` });
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok = result.aimed.ads && result.aimed.cls && result.aimed.zoom < 0.65 && !result.released.ads && /burst/.test(result.hint);
if (!ok || errs.length) process.exit(1);
