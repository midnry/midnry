// Loading screen key art: the first three slides on laptop and phone, with
// the game held back so the loading screen stays up.
//   node scripts/qa/loading-art.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "screenshots/qa/loading";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [w, h, mobile] of [[1280, 720, false], [390, 844, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce" });
  await p.route("**/outpost-military.js*", () => {});
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html");
  for (let i = 0; i < 3; i++) {
    if (i) await p.getByRole("button", { name: "Next loading slide", exact: true }).click();
    await p.waitForTimeout(1200);
    const src = await p.locator(".mf-loadimage.is-active").evaluate((e) => e.currentSrc.split("/").pop());
    await p.screenshot({ path: `${OUT}/slide${i + 1}-${w}.png` });
    console.log(w, i + 1, src);
  }
  await p.close();
}
await b.close();
