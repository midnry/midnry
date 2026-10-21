/** Opening loading screen: one painting, one fixed briefing, no slideshow controls; optional-art failure. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : "/opt/pw-browsers/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  for (const mobile of [false, true]) {
    const name = mobile ? "mobile" : "desktop",
      page = await browser.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: mobile,
        hasTouch: mobile,
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      );
      // A returning player: Play starts the game chosen last time.
      localStorage.setItem("midnry-outpost-mode", "protocol");
    });
    let release;
    const held = new Promise((resolve) => (release = resolve));
    await page.route("**/outpost-military.js*", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.loading);
    await page.waitForFunction(
      () => document.querySelector(".mf-loadimage.is-active")?.naturalWidth > 0,
    );
    assert.equal(await page.locator(".mf-slidetitle").textContent(), "Prepare to deploy");
    assert.equal(
      await page.locator(".mf-start").isDisabled(),
      true,
      "deployment stays disabled during the device/asset check",
    );
    assert.doesNotMatch(
      await page.locator(".mf-loading").textContent(),
      /Flare Launcher|Freight Rush|In Duo/,
    );
    assert.equal(
      await page
        .locator(".mf-loading")
        .evaluate((e) => e.scrollWidth <= e.clientWidth && e.scrollHeight <= e.clientHeight),
      true,
    );
    await page.screenshot({ path: `/workspace/screenshots/outpost-loading-current-${name}.png` });
    // One painting (wide or tall cut), no slideshow controls, and nothing rotates.
    const cut = mobile ? "tall" : "wide";
    assert.ok(
      (await page.locator(".mf-loadimage.is-active").evaluate((i) => i.currentSrc || i.src)).includes(`/loading/bp-key-${cut}.webp`),
    );
    assert.equal(await page.locator(".mf-loading button").count(), 0);
    await page.waitForTimeout(5000);
    assert.equal(await page.locator(".mf-slidetitle").textContent(), "Prepare to deploy");
    release();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.militaryLoaded,
      null,
      { timeout: 120000 },
    );
    assert.equal(await page.locator(".mf-loading").isVisible(), false);
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
    });
    const start = page.locator(".mf-start:visible, .mf-modeplay:visible").first();
    await start.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
    const r = await start.boundingBox();
    if (mobile) await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    else await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    assert.equal(await page.locator(".mf-protocol-brief").isVisible(), true);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        name,
        loadingArt: "current main briefing assets",
        briefing: "one painting, one fixed briefing, no controls",
        deployment: "passed",
        errors,
      }),
    );
    await page.close();
  }
  const page = await browser.newPage({ reducedMotion: "reduce" });
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route("**/outpost-military.js*", async (route) => {
    await held;
    await route.continue();
  });
  // The loading painting fails: the briefing still shows, no retry prompt.
  await page.route("**/loading/*.webp", (route) => route.abort());
  await page.goto(base + "/games/outpost-zero.html");
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".mf-slidetitle").textContent(), "Prepare to deploy");
  assert.equal(await page.locator(".mf-loadretry").isVisible(), false);
  release();
  await page.waitForFunction(
    () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
    null,
    { timeout: 120000 },
  );
  console.log("Optional loading artwork failure does not block the game");
  await page.close();
} finally {
  await browser.close();
}
