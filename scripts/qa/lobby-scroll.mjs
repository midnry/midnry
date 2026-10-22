// Phone portrait lobby: scroll the menu and measure where the operator
// (3D) and the pad "+" buttons land on screen.
import { chromium } from "playwright";
const TAG = process.argv[2] || "before";
const b = await chromium.launch({});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
await p.addInitScript(() => { localStorage.setItem("midnry-outpost-mode", "signal"); localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })); localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true })); });
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded" });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 300000, polling: 1000 });
await p.waitForTimeout(2500);
const out = [];
for (const y of [0, 60, 160, 320]) {
  await p.evaluate((y) => (document.querySelector(".mf-modal").scrollTop = y), y);
  await p.waitForTimeout(400);
  out.push(await p.evaluate(() => {
    const e = document.querySelector("midnry-fps").engine, l = Object.values(e).find((v) => v && v.lobby)?.lobby, c = l.camera;
    const plus = document.querySelector(".mf-squad [data-invite]")?.getBoundingClientRect(), sq = document.querySelector(".mf-squad");
    return { scroll: document.querySelector(".mf-modal").scrollTop, viewOffsetY: c.view ? Math.round(c.view.offsetY) : null, camY: +c.position.y.toFixed(2), plusTop: plus && Math.round(plus.top), squadShown: sq && getComputedStyle(sq).opacity };
  }));
  await p.screenshot({ path: `screenshots/qa/lobby/scroll-${TAG}-${y}.png` });
}
console.table(out);
await b.close();
