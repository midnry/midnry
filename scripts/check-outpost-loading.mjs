/** Blackout-only loading art, native carousel controls and optional-art failure. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
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
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      ),
    );
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
    assert.equal(await page.locator(".mf-slidetitle").textContent(), "Blackout Protocol");
    assert.equal(
      await page.locator(".mf-start").isDisabled(),
      true,
      "deployment stays disabled during the device/asset check",
    );
    assert.doesNotMatch(
      await page.locator(".mf-loading").textContent(),
      /Dust Outpost|Last Signal|Flare Launcher|Freight Rush|In Duo/,
    );
    assert.equal(
      await page
        .locator(".mf-loading")
        .evaluate((e) => e.scrollWidth <= e.clientWidth && e.scrollHeight <= e.clientHeight),
      true,
    );
    await page.screenshot({ path: `/workspace/screenshots/outpost-loading-current-${name}.png` });
    for (const title of [
      "Watch the patrol",
      "Lifeline Medevac",
      "Protect the rescue",
      "Report, discuss, decide",
      "Every patrol matters",
      "Blackout Protocol",
    ]) {
      await page.getByRole("button", { name: "Next loading slide", exact: true }).click();
      await page.waitForFunction(
        (t) => document.querySelector(".mf-slidetitle").textContent === t,
        title,
      );
      assert.ok(
        (await page.locator(".mf-loadimage.is-active").getAttribute("src")).includes("/blackout-"),
      );
      assert.ok((await page.locator(".mf-loadtip p").textContent()).length > 35);
    }
    await page.getByRole("button", { name: "Previous loading slide" }).click();
    await page.waitForFunction(
      () => document.querySelector(".mf-slidetitle").textContent === "Every patrol matters",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Resume loading slideshow" })
        .getAttribute("aria-pressed"),
      "true",
    );
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
    const start = page.locator(".mf-start");
    await start.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
    const r = await start.boundingBox();
    if (mobile) await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    else await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    assert.equal(await page.locator(".mf-protocol-brief").isVisible(), true);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        name,
        loadingArt: "current game captures only",
        carousel: "six medical/role/radio briefings",
        reducedMotion: "paused",
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
  await page.route("**/loading/blackout-patrol.webp", (route) => route.abort());
  await page.goto(base + "/games/outpost-zero.html");
  await page.waitForFunction(
    () => document.querySelector(".mf-loadimage.is-active").naturalWidth > 0,
  );
  await page.getByRole("button", { name: "Next loading slide" }).click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".mf-slidetitle").textContent(), "Blackout Protocol");
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
