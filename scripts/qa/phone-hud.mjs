// Phone game screen during Last Signal with a disaster warning, a toast and
// the last-life overlay: photos in portrait and landscape, a list of HUD
// boxes, overlaps between them, and how much of the screen they cover.
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
mkdirSync("screenshots/qa/phone", { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const errs = [];
for (const [w, h] of [
  [390, 844],
  [844, 390],
]) {
  const p = await (
    await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  ).newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() =>
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })),
  );
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await p.waitForFunction(
    () => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled,
    null,
    { timeout: 180000 },
  );
  await pickGame(p, "signal");
  await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector(".mf-start").click());
  await p.waitForFunction(
    () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
    null,
    { timeout: 180000 },
  );
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    g.arena.time = g.arena.disaster.warnAt + 2;
    g.player.lives = 0;
    g.updateHUD(true);
    g.message("⚠ STORM INCOMING", 3);
    g.render();
    const boxes = {};
    for (const sel of [
      ".mf-top",
      ".mf-objective",
      ".mf-match",
      ".mf-disaster",
      ".mf-toast",
      ".mf-super",
      ".mf-bottom .mf-stat:first-child",
      ".mf-ammo",
      ".mf-stick",
      ".mf-slide",
      ".mf-touch",
    ]) {
      const e = document.querySelector(sel);
      if (!e || e.hidden || getComputedStyle(e).display === "none") continue;
      const b = e.getBoundingClientRect();
      if (b.width && b.height)
        boxes[sel] = [
          Math.round(b.left),
          Math.round(b.top),
          Math.round(b.right),
          Math.round(b.bottom),
        ];
    }
    // The minimap is drawn on the 2D canvas.
    const L = g.hudMap || { right: 24, top: 76, size: 128 },
      n = g.level.length,
      s = Math.max(1, L.size / n);
    boxes.minimap = [
      Math.round(g.w - n * s - L.right),
      L.top,
      Math.round(g.w - L.right),
      Math.round(L.top + n * s),
    ];
    return boxes;
  });
  const keys = Object.keys(r).filter((k) => k !== ".mf-touch" && k !== ".mf-top");
  const overlaps = [];
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const [a, c] = [r[keys[i]], r[keys[j]]];
      if (a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3])
        overlaps.push(keys[i] + " × " + keys[j]);
    }
  const area = keys
    .filter((k) => k !== ".mf-stick")
    .reduce((sum, k) => sum + (r[k][2] - r[k][0]) * (r[k][3] - r[k][1]), 0);
  console.log(w + "x" + h, JSON.stringify(r));
  console.log(
    "  overlaps:",
    overlaps.join(", ") || "none",
    "| HUD covers ~" + Math.round((area / (w * h)) * 100) + "% of the screen",
  );
  await p.screenshot({ path: `screenshots/qa/phone/hud-${w}x${h}.png` });
}
console.log("errors", errs);
await b.close();
