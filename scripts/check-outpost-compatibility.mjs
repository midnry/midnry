/** Real browser checks for unsupported-device handling and recovery. Local servers only. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname));
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
try {
  const results = [];
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile, isMobile: mobile, ignoreHTTPSErrors: true });
    const errors = [], requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => requests.push(request.url()));
    await page.addInitScript(() => {
      localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset: "performance", options: { adaptive: false } }));
      window.__testEnableGraphics = false;
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === "webgl2" && !window.__testEnableGraphics) return null;
        return original.call(this, type, ...args);
      };
    });
    await page.goto(base + "/games/outpost-zero.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.compatibilityReport?.status === "unsupported", null, { polling: 100 });
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.militaryLoaded), false);
    await page.locator(".mf-render-retry").waitFor({ state: "visible" });
    assert.equal(await page.locator(".mf-start").isDisabled(), true);
    assert.match(await page.locator(".mf-render-status").innerText(), /WebGL 2 is unavailable/i);
    assert.equal(requests.some((url) => /\/outpost-military\.js/.test(url)), false, "unsupported graphics do not download the 3D renderer");
    await page.screenshot({ path: `/workspace/screenshots/outpost-compatibility-unsupported-${mobile ? "mobile" : "desktop"}.png` });
    await page.evaluate(() => { window.__testEnableGraphics = true; });
    await page.locator(".mf-render-retry").click();
    await page.waitForFunction(() => {
      const g = document.querySelector("midnry-fps").engine;
      return g.militaryLoaded && !g.militaryLoading;
    }, null, { polling: 100, timeout: 60000 });
    const report = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame); g.frame = 0;
      return { ...g.compatibilityReport, preset: g.academy.preset };
    });
    assert.ok(["ready", "limited"].includes(report.status));
    assert.equal(report.checks.length, 4);
    assert.ok(report.checks.every((check) => ["passed", "warning"].includes(check.status)));
    assert.ok(Number.isFinite(report.frameCostMs));
    assert.equal(report.preset, "performance", "recommendations preserve saved preferences");
    await page.locator(".mf-compat-open").click();
    await page.locator(".mf-compat-report").waitFor({ state: "visible" });
    assert.match(await page.locator(".mf-compat-body").innerText(), /brief test|short scene sample/i);
    await page.screenshot({ path: `/workspace/screenshots/outpost-compatibility-report-${mobile ? "mobile" : "desktop"}.png` });
    await page.locator(".mf-compat-close").click();
    const roundBeforeHelp = await page.evaluate(() => document.querySelector("midnry-fps").engine.arena.roundId);
    await page.locator(".mf-boot").click();
    await page.waitForFunction(() => document.querySelector("midnry-fps").engine.protocolUI.guide.open, null, { polling: 100 });
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.mode), "protocol");
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.arena.roundId), roundBeforeHelp, "mission tutorial preserves rescue progress");
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    results.push({ mobile, blockedGraphics: "passed", rendererNotDownloaded: "passed", retry: "passed", measuredReport: "passed", preferencesPreserved: "passed", errors });
    await page.close();
  }
  const features = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [], requests = [];
  features.on("pageerror", (error) => errors.push(error.message));
  features.on("request", (request) => requests.push(request.url()));
  await features.addInitScript(() => { window.ResizeObserver = undefined; });
  await features.goto(base + "/games/outpost-zero.html", { waitUntil: "domcontentloaded" });
  await features.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.compatibilityReport?.status === "unsupported", null, { polling: 100 });
  assert.match(await features.locator(".mf-render-status").innerText(), /ResizeObserver/);
  assert.equal(requests.some((url) => /\/outpost-military\.js/.test(url)), false);
  assert.deepEqual(errors, [], "missing browser APIs show a compatibility result instead of crashing setup");
  await features.close();
  console.log(JSON.stringify({ compatibility: results, missingBrowserFeature: "passed" }));
} finally { await browser.close(); }
