// Close-up of a supply crate on a phone-sized screen at a few angles, to
// catch shimmering stripes (shadow acne / z-fighting) on its faces.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("screenshots/qa/crate", { recursive: true });
const tag = process.argv[2] || "now";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const p = await (
  await b.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  })
).newPage();
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
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(800);
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine,
    r = Math.random;
  Math.random = () => 0.1;
  g.reset();
  Math.random = r;
  document.querySelector(".mf-start").click();
});
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {
  timeout: 180000,
});
await p.waitForTimeout(3000);
for (const [i, ang] of [
  [0, 0],
  [1, 0.5],
  [2, -0.6],
]) {
  const info = await p.evaluate((ang) => {
    const g = document.querySelector("midnry-fps").engine,
      a = g.arena;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    for (const e of a.entities) {
      e.bot = false;
      e.shieldUntil = 1e9;
    }
    const c = a.crates.find((c) => !c.kind && c.hp > 0 && a.canMove(c.x, c.y + 1.1));
    Object.assign(g.player, {
      x: c.x + Math.sin(ang) * 1.1,
      y: c.y + Math.cos(ang) * 1.1,
      a: -Math.PI / 2 - ang,
    });
    g.viewPitch = -0.1;
    for (let k = 0; k < 4; k++) g.render();
    const s = g.military.sun.shadow;
    return {
      crate: [c.x, c.y],
      shadowMap: s.mapSize.x,
      bias: s.bias,
      normalBias: s.normalBias,
      preset: g.academy.preset,
    };
  }, ang);
  await p.screenshot({ path: `screenshots/qa/crate/${tag}-${i}.png` });
  console.log(i, JSON.stringify(info));
}
await b.close();
