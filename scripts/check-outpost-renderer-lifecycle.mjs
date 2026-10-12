/** Cinematic-only failure/retry/context-loss checks against a local server. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const base = process.argv[2] || "http://127.0.0.1:8080";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname));
const retired =
  /\/games\/(?:outpost-(?:art|characters|weapons|environment)\.js|(?:characters|weapons|environment)\/)/;
const modulePattern = "**/outpost-military.js*";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
mkdirSync("/workspace/screenshots", { recursive: true });

async function waitLoaded(page) {
  await page.waitForFunction(
    () => {
      const g = document.querySelector("midnry-fps")?.engine;
      return (
        g?.militaryLoaded && !g.militaryLoading && g.compatibilityReport?.status !== "unsupported"
      );
    },
    null,
    { polling: 100, timeout: 60000 },
  );
  return page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    g.render();
    return {
      assets: g.military.assetErrors,
      canvasCount: g.root.querySelectorAll(".mf-webgl").length,
      legacyInstances: ["art", "environment", "characters", "weapons"].filter((key) => !!g[key]),
      roundId: g.arena.roundId,
    };
  });
}

async function assertRecoveryScreen(page) {
  await page.waitForFunction(
    () => {
      const g = document.querySelector("midnry-fps")?.engine;
      return (
        g &&
        !g.militaryLoading &&
        !g.$(".mf-render-status").hidden &&
        !g.$(".mf-render-retry").hidden
      );
    },
    null,
    { polling: 100, timeout: 15000 },
  );
  const state = await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    g.render();
    const pixels = g.ctx.getImageData(0, 0, g.w, g.h).data;
    let blank = true;
    for (let i = 3; i < pixels.length; i += 4)
      if (pixels[i]) {
        blank = false;
        break;
      }
    const overlay = g.$(".mf-render-status");
    const rect = overlay.getBoundingClientRect();
    const covering = document.elementFromPoint(rect.left + 2, rect.top + 2);
    return {
      loaded: g.militaryLoaded,
      running: g.running,
      blank,
      coversGame: overlay === covering || overlay.contains(covering),
      opaque: getComputedStyle(overlay).backgroundColor === "rgb(16, 24, 21)",
      startDisabled: g.$(".mf-start").disabled,
      legacyInstances: ["art", "environment", "characters", "weapons"].filter((key) => !!g[key]),
      focusedRetry: document.activeElement === g.$(".mf-render-retry"),
    };
  });
  assert.equal(state.loaded, false);
  assert.equal(state.running, false);
  assert.equal(state.blank, true, "failed 3D leaves the original Canvas transparent");
  assert.equal(
    state.coversGame,
    true,
    "opaque recovery screen covers game controls and stale GPU pixels",
  );
  assert.equal(state.opaque, true);
  assert.equal(state.startDisabled, true);
  assert.equal(state.focusedRetry, true);
  assert.deepEqual(state.legacyInstances, []);
  assert.ok(await page.getByRole("button", { name: "Exit game", exact: true }).isVisible());
  const retry = await page.locator(".mf-render-retry").boundingBox();
  assert.ok(retry?.width >= 44 && retry?.height >= 44);
}

try {
  const verdicts = [];
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      ignoreHTTPSErrors: true, // Local QA proxy CA; production browser behavior is unchanged.
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [],
      requests = [],
      failedRequests = [];
    let blocking = true;
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("console", (message) => {
      // The injected transport failure is expected; unrelated resource/runtime
      // errors still fail the test, including errors during context recovery.
      if (message.type() !== "error") return;
      if (
        blocking &&
        /\/outpost-military\.js/.test(message.location().url) &&
        /Failed to load resource/.test(message.text())
      )
        return;
      errors.push(message.text());
    });
    page.on("request", (request) => requests.push(request.url()));
    page.on("requestfailed", (request) => failedRequests.push(request.url()));
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      ),
    );
    await page.route(modulePattern, (route) => route.abort("failed"));
    await page.goto(base + "/games/outpost-zero.html?renderer=classic");
    await assertRecoveryScreen(page);
    assert.ok(
      failedRequests.some((url) => /\/outpost-military\.js/.test(url)),
      "military module loading was actually blocked",
    );
    assert.deepEqual(
      requests.filter((url) => retired.test(url)),
      [],
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-cinematic-unavailable-${mobile ? "mobile" : "desktop"}.png`,
    });

    await page.unroute(modulePattern);
    blocking = false;
    await page.locator(".mf-render-retry").click();
    const restored = await waitLoaded(page);
    assert.deepEqual(restored.assets, []);
    assert.equal(restored.canvasCount, 1);
    assert.deepEqual(restored.legacyInstances, []);
    assert.equal(await page.locator(".mf-render-status").isVisible(), false);

    // Enter a real round so recovery must preserve its state and pause offline.
    await page.evaluate(() => {
      document.querySelector("midnry-fps").engine.lockMouse = () => {};
    });
    await page.locator(".mf-start").click();
    await page.locator(".mf-protocol-begin").click();
    const beforeLoss = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.arena.advance(0.1, {});
      window.__outpostLifecycleOldRenderer = g.military;
      const extension = g.military.renderer.getContext().getExtension("WEBGL_lose_context");
      if (!extension) throw Error("Chromium did not expose the context-loss extension");
      const state = { roundId: g.arena.roundId, time: g.time };
      extension.loseContext();
      return state;
    });
    const recovered = await waitLoaded(page);
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.military.profile.safeMode), true, "GPU loss automatically selects the bounded cinematic renderer");
    assert.equal(
      recovered.roundId,
      beforeLoss.roundId,
      "graphics retry retains the existing match",
    );
    assert.deepEqual(recovered.assets, []);
    assert.equal(recovered.canvasCount, 1);
    assert.deepEqual(recovered.legacyInstances, []);
    const disposal = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      const result = {
        previousDisposed: window.__outpostLifecycleOldRenderer.disposed,
        distinctRenderer: g.military !== window.__outpostLifecycleOldRenderer,
        timeUnchanged: g.time,
      };
      delete window.__outpostLifecycleOldRenderer;
      return result;
    });
    assert.equal(disposal.previousDisposed, true);
    assert.equal(disposal.distinctRenderer, true);
    assert.equal(disposal.timeUnchanged, beforeLoss.time);
    await page.screenshot({
      path: `/workspace/screenshots/outpost-cinematic-recovered-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.evaluate(() => {
      const root = document.querySelector("midnry-fps"),
        g = root.engine;
      root.remove();
      if (!g.abort.signal.aborted || !g.military.disposed || g.root.querySelector(".mf-webgl"))
        throw Error("unmount did not dispose the renderer");
    });
    assert.deepEqual(
      requests.filter((url) => retired.test(url)),
      [],
    );
    assert.deepEqual(errors, []);
    verdicts.push({
      mobile,
      moduleFailure: "passed",
      neutralRecovery: "passed",
      retry: "passed",
      realGPUContextLoss: "passed",
      matchPreserved: "passed",
      retiredArtworkAbsent: "passed",
      teardown: "passed",
      errors,
    });
    await page.close();
  }
  // A missing infantry model must fail the cinematic load instead of allowing
  // simplified placeholder actors into the match.
  const assetPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    ignoreHTTPSErrors: true,
  });
  const assetErrors = [],
    assetRequests = [];
  assetPage.on("pageerror", (error) => assetErrors.push(error.message));
  assetPage.on("request", (request) => assetRequests.push(request.url()));
  await assetPage.addInitScript(() =>
    localStorage.setItem(
      "midnry-outpost-graphics",
      JSON.stringify({ preset: "performance", options: { adaptive: false } }),
    ),
  );
  await assetPage.route("**/military/models/soldier.glb", (route) => route.abort("failed"));
  await assetPage.goto(base + "/games/outpost-zero.html");
  await assertRecoveryScreen(assetPage);
  assert.equal(
    await assetPage.evaluate(() => document.querySelector("midnry-fps").engine.militaryLoadError),
    "assets-unavailable",
  );
  assert.equal(await assetPage.locator(".mf-webgl").count(), 0);
  await assetPage.unroute("**/military/models/soldier.glb");
  await assetPage.locator(".mf-render-retry").click();
  const assetsRestored = await waitLoaded(assetPage);
  assert.deepEqual(assetsRestored.assets, []);
  assert.deepEqual(
    assetRequests.filter((url) => retired.test(url)),
    [],
  );
  assert.deepEqual(assetErrors, []);
  await assetPage.close();
  const texturePage = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const textureErrors = [];
  texturePage.on("pageerror", (error) => textureErrors.push(error.message));
  await texturePage.addInitScript(() => localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset: "performance", options: { adaptive: false } })));
  await texturePage.route("**/military/textures/realism-plaster-normal.jpg", (route) => route.abort("failed"));
  await texturePage.goto(base + "/games/outpost-zero.html");
  await assertRecoveryScreen(texturePage);
  assert.equal(await texturePage.evaluate(() => document.querySelector("midnry-fps").engine.militaryLoadError), "assets-unavailable");
  assert.equal(await texturePage.locator(".mf-webgl").count(), 0);
  await texturePage.unroute("**/military/textures/realism-plaster-normal.jpg");
  await texturePage.locator(".mf-render-retry").click();
  assert.deepEqual((await waitLoaded(texturePage)).assets, []);
  assert.deepEqual(textureErrors, []);
  await texturePage.close();
  console.log(JSON.stringify({ rendererLifecycle: verdicts, missingModelRecovery: "passed", missingSurfaceRecovery: "passed" }));
} finally {
  await browser.close();
}
