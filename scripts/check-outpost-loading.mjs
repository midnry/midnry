import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ready = (page) => page.waitForFunction(
  () => document.querySelector("midnry-fps")?.engine?.loading === false,
  null, { timeout: 60000 },
);
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: mobile, hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (mobile) await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      window.contextAttempts = [];
      HTMLCanvasElement.prototype.getContext = function(type, options) {
        if (type === "webgl2") {
          window.contextAttempts.push(options);
          if (window.contextAttempts.length === 1) return null;
        }
        return getContext.call(this, type, options);
      };
    });
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route("**/outpost-military.js*", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.loading);
    assert(await page.locator(".mf-loading").isVisible());
    assert(await page.locator(".mf-shell").evaluate((el) => el.inert));
    if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.QA_SCREENSHOTS}/outpost-loading-${mobile ? "mobile" : "desktop"}.png` });
    release();
    await ready(page);
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.militaryLoaded), true);
    assert.equal(await page.locator(".mf-loading").isVisible(), false);
    assert.deepEqual(await page.evaluate(() => document.querySelector("midnry-fps").engine.military.assetErrors), []);
    if (mobile) assert.equal(await page.evaluate(() => window.contextAttempts[1].powerPreference), "low-power");
    await page.getByRole("button", { name: "START SOLO", exact: false }).click();
    assert(await page.locator(".mf-modal").evaluate((el) => el.hidden));
    if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.QA_SCREENSHOTS}/outpost-game-${mobile ? "mobile" : "desktop"}.png` });
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.military.renderer.domElement.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    });
    assert.equal(await page.evaluate(() => !!document.querySelector("midnry-fps").engine.militaryLoaded), false);
    assert(await page.locator(".mf-rendernotice").isVisible());
    assert(await page.getByRole("link", { name: "Retry 3D" }).isVisible());
    assert.deepEqual(errors, []);
    await page.close();
  }
  // An asset failure must remove the GPU canvas, release loading and explain fallback.
  const page = await browser.newPage();
  await page.route("**/military/models/soldier.glb", (route) => route.abort());
  await page.goto(base + "/games/outpost-zero.html");
  await ready(page);
  assert(await page.locator(".mf-rendernotice").isVisible());
  assert.equal(await page.locator(".mf-webgl").count(), 0);
  await page.goto(base + "/games/outpost-zero.html?renderer=classic");
  await ready(page);
  assert.equal(await page.locator(".mf-webgl").count(), 0);
  assert.equal(await page.locator(".mf-rendernotice").count(), 0);
  await page.close();
  console.log("Desktop/mobile loading, default 3D, compatible context retry, deployment, GPU-loss cleanup, asset fallback and classic opt-out passed.");
} finally {
  await browser.close();
}
