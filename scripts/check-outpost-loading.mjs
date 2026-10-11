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
    await page.waitForFunction(() => document.querySelector(".mf-loadimage.is-active").naturalWidth > 0);
    assert.equal(await page.locator(".mf-loadretry").isVisible(), false);
    assert.equal(await page.locator(".mf-loading").evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight), true);
    if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.QA_SCREENSHOTS}/outpost-loading-${mobile ? "mobile" : "desktop"}.png` });
    console.log("Showcase ready", { mobile });
    if (!mobile) {
      await page.waitForFunction(() => document.querySelector(".mf-slidetitle").textContent === "VX–7 Carbine", null, { timeout: 8000 });
    } else await page.getByRole("button", { name: "Next loading slide" }).click();
    await page.getByRole("button", { name: "Pause loading slideshow" }).click();
    assert.equal(await page.getByRole("button", { name: "Resume loading slideshow" }).getAttribute("aria-pressed"), "true");
    console.log("Paused carousel", { mobile });
    for (const title of ["VX–7 Carbine", "Field Operators", "Skyport", "Flare Launcher", "Freight Rush"]) {
      console.log("Checking slide", title);
      await page.waitForFunction(title => document.querySelector(".mf-loadimage.is-active").alt === title && document.querySelector(".mf-loadimage.is-active").naturalWidth > 0, title);
      assert.equal(await page.locator(".mf-slidetitle").textContent(), title);
      assert.ok((await page.locator(".mf-loadtip p").textContent()).length > 30);
      if (process.env.QA_SCREENSHOTS && title === "Field Operators") { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.QA_SCREENSHOTS}/outpost-showcase-${mobile ? "mobile" : "desktop"}.png` }); }
      await page.getByRole("button", { name: "Next loading slide" }).click();
    }
    await page.waitForFunction(() => document.querySelector(".mf-slidetitle").textContent === "Dust Outpost");
    await page.getByRole("button", { name: "Previous loading slide" }).click();
    await page.waitForFunction(() => document.querySelector(".mf-slidetitle").textContent === "Freight Rush");

    console.log("Releasing graphics", { mobile });
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
  // A failed optional still leaves core loading intact; reduced motion pauses rotation.
  const optional = await browser.newPage({ reducedMotion: "reduce" });
  let releaseOptional;
  const holdOptional = new Promise(resolve => { releaseOptional = resolve; });
  await optional.route("**/outpost-military.js*", async route => { await holdOptional; await route.continue(); });
  await optional.route("**/loading/carbine.webp", route => route.abort());
  await optional.goto(base + "/games/outpost-zero.html");
  await optional.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.loading);
  assert.equal(await optional.getByRole("button", { name: "Resume loading slideshow" }).getAttribute("aria-pressed"), "true");
  await optional.getByRole("button", { name: "Next loading slide" }).click();
  await optional.waitForTimeout(500);
  assert.equal(await optional.locator(".mf-loadimage.is-active").getAttribute("alt"), "Dust Outpost arena");
  assert.equal(await optional.locator(".mf-loadretry").isVisible(), false);
  releaseOptional();
  await ready(optional);
  assert.equal(await optional.locator(".mf-loading").isVisible(), false);
  const finalTitle = await optional.locator(".mf-slidetitle").textContent();
  await optional.getByRole("button", { name: "START SOLO", exact: false }).click();
  await optional.waitForTimeout(500);
  assert.equal(await optional.locator(".mf-slidetitle").textContent(), finalTitle);
  await optional.close();
  const coreFailure = await browser.newPage();
  await coreFailure.route("**/outpost-sim.js", route => route.abort());
  await coreFailure.goto(base + "/games/outpost-zero.html");
  await coreFailure.waitForFunction(() => !document.querySelector(".mf-loadretry").hidden);
  assert(await coreFailure.locator(".mf-loading").isVisible());
  assert(await coreFailure.locator(".mf-loadtip").isVisible());
  await coreFailure.close();
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
  console.log("Desktop/mobile showcase, automatic and manual slides, tips, pause, reduced motion, optional-image failures, module failure, 3D startup, GPU-loss cleanup and classic opt-out passed.");
} finally {
  await browser.close();
}
