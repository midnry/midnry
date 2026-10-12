import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname));
const retired =
  /\/games\/(?:outpost-(?:art|characters|weapons|environment)\.js|(?:characters|weapons|environment)\/)/;
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
mkdirSync("/workspace/screenshots", { recursive: true });
try {
  const results = [];
  for (const entry of [
    { name: "hosted-desktop", path: "/games/outpost-zero", embedded: true },
    { name: "direct-desktop", path: "/games/outpost-zero.html" },
    { name: "old-bookmark-desktop", path: "/games/outpost-zero.html?renderer=classic" },
    { name: "hosted-mobile", path: "/games/outpost-zero", embedded: true, mobile: true },
  ]) {
    const page = await browser.newPage({
      ignoreHTTPSErrors: true, // Local QA proxy CA; production browser behavior is unchanged.
      viewport: entry.mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: !!entry.mobile,
      hasTouch: !!entry.mobile,
    });
    const errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => requests.push(request.url()));
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      ),
    );
    await page.goto(base + entry.path, { waitUntil: "domcontentloaded" });
    let frame = page;
    if (entry.embedded) {
      const iframe = await page.waitForSelector('iframe[src*="outpost-zero.html"]');
      assert.match(await iframe.getAttribute("src"), /renderer=military/);
      frame = await iframe.contentFrame();
      assert.ok(frame);
    }
    await frame.waitForFunction(
      () => {
        const g = document.querySelector("midnry-fps")?.engine;
        return g?.militaryLoaded && g.compatibilityReport?.status !== "unsupported";
      },
      null,
      { polling: 100, timeout: 60000 },
    );
    const state = await frame.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.render();
      return {
        loaded: g.militaryLoaded,
        scene: !!g.military?.scene,
        assetErrors: g.military?.assetErrors,
        legacyInstances: ["art", "environment", "characters", "weapons"].filter((key) => !!g[key]),
        statusHidden: g.$(".mf-render-status").hidden,
        canvasCount: g.root.querySelectorAll(".mf-webgl").length,
      };
    });
    assert.equal(state.loaded, true);
    assert.equal(state.scene, true);
    assert.deepEqual(state.assetErrors, []);
    assert.deepEqual(state.legacyInstances, []);
    assert.equal(state.statusHidden, true);
    assert.equal(state.canvasCount, 1);
    assert.deepEqual(
      requests.filter((url) => retired.test(url)),
      [],
      "entry point never requests retired comic artwork",
    );
    assert.deepEqual(errors, []);
    if (entry.embedded)
      await page.screenshot({
        path: `/workspace/screenshots/outpost-cinematic-embed-${entry.mobile ? "mobile" : "desktop"}.png`,
      });
    await frame.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.destroy();
      if (!g.military.disposed || !g.abort.signal.aborted || g.root.querySelector(".mf-webgl"))
        throw Error("renderer teardown left resources or canvas alive");
    });
    assert.deepEqual(errors, []);
    results.push({
      entry: entry.name,
      cinematicOnly: "passed",
      retiredAssetsAbsent: "passed",
      teardown: "passed",
    });
    await page.close();
  }
  console.log(JSON.stringify({ cinematicEntries: results }));
} finally {
  await browser.close();
}
