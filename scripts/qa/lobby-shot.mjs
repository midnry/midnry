// One quick photo of the home lobby (no checks), for art iteration.
//   node scripts/qa/lobby-shot.mjs [width] [height] [tag]   (dev server on :8080)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280),
  H = Number(process.argv[3] || (W < 500 ? 844 : 720)),
  TAG = process.argv[4] || "",
  M = W < 700;
mkdirSync("screenshots/qa/lobby-shot", { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M, deviceScaleFactor: Number(process.env.DPR || 1) });
const p = await ctx.newPage();
await p.addInitScript(() => localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true })));
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-modal.mf-lobby") && document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, { timeout: 240000 });
await p.evaluate(({ noBloom, hideUi }) => {
  const r = document.querySelector("midnry-fps").engine.military;
  if (noBloom && r.lobby.bloom) r.lobby.bloom.enabled = false;
  if (hideUi) for (const e of document.querySelectorAll(".mf-modal > *")) e.style.visibility = "hidden";
  if (hideUi) document.querySelector(".mf-modal").style.background = "none";
}, { noBloom: !!process.env.NOBLOOM, hideUi: !!process.env.HIDEUI });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const r = document.querySelector("midnry-fps").engine.military,
    c = r.lobby.camera,
    canvas = r.renderer.domElement;
  return { cam: c.position.toArray().map((v) => +v.toFixed(2)), fov: c.fov, buffer: [canvas.width, canvas.height], css: [canvas.clientWidth, canvas.clientHeight], preset: r.g.academy.preset, composer: !!r.lobby.composer, samples: r.lobby.target?.samples };
});
const file = `screenshots/qa/lobby-shot/lobby-${W}x${H}${TAG}.png`;
await p.screenshot({ path: file });
console.log(JSON.stringify({ file, ...info, errors: errs }));
await b.close();
