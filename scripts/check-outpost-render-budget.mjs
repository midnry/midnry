/** Actual 3D frame profiling and touch-layout checks. Headless/software GPU
 * results describe this test machine, not a promised physical-phone FPS. */
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
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      ),
    );
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 120000 },
    );
    console.log(mobile ? "Touch renderer loaded" : "Desktop renderer loaded");
    const result = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.lockMouse = () => {};
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      Object.assign(g.player, { x: 3.5, y: 5.5, a: 0 });
      Object.assign(g.arena.entities[1], { x: 4.5, y: 5.5, a: Math.PI });
      Object.assign(g.arena.entities[2], { x: 7.5, y: 5.5, a: Math.PI });
      g.protocolCache = null;
      r.frameProtocolArena = null;
      g.protocolUI.update(true);
      g.render();
      const before = JSON.stringify(g.arena.snapshot()),
        work = [],
        intervals = [];
      let last;
      for (let i = 0; i < 12; i++) {
        const now = await new Promise(requestAnimationFrame);
        if (last) intervals.push(now - last);
        last = now;
        g.visualTime = g.time + i / 60;
        const start = performance.now();
        g.render();
        work.push(performance.now() - start);
      }
      work.sort((a, b) => a - b);
      intervals.sort((a, b) => a - b);
      const meshes = [...r.actors.values()]
        .filter((a) => a.root.visible)
        .flatMap((a) => a.detailMeshes.filter((m) => m.visible));
      return {
        pure: before === JSON.stringify(g.arena.snapshot()),
        metrics: r.metrics,
        mobile: r.mobileDevice,
        activeLOD: meshes.map((m) => m.userData.operatorLOD),
        cpuP50: work[Math.floor(work.length * 0.5)],
        cpuP95: work[Math.floor(work.length * 0.95)],
        frameP50: intervals[Math.floor(intervals.length * 0.5)],
        frameP95: intervals[Math.floor(intervals.length * 0.95)],
        animationFPS: 30,
        assetErrors: r.assetErrors,
      };
    });
    assert.equal(result.pure, true);
    assert.equal(result.mobile, mobile);
    assert.ok(result.metrics.culled > 0);
    assert.ok(result.metrics.visible >= 2);
    assert.ok(result.metrics.drawCalls > 0 && result.metrics.triangles > 0);
    assert.ok(result.activeLOD.includes(0));
    if (mobile) assert.ok(result.activeLOD.includes(1));
    assert.deepEqual(result.assetErrors, []);
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: `/workspace/screenshots/outpost-realtime-render-${mobile ? "mobile" : "desktop"}.png`,
    });
    // Native controls still reach the simulation; no extra performance HUD.
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.frame = requestAnimationFrame(g.loop);
      g.shell.focus();
    });
    if (!mobile) {
      const x = await page.evaluate(() => document.querySelector("midnry-fps").engine.player.x);
      await page.keyboard.down("w");
      await page.waitForFunction(
        (x) => document.querySelector("midnry-fps").engine.player.x > x + 0.02,
        x,
      );
      await page.keyboard.up("w");
      await page.keyboard.press("i");
      assert.equal(await page.locator(".mf-protocol-info").evaluate((e) => e.open), true);
      await page.keyboard.press("i");
      assert.equal(await page.locator(".mf-protocol-info").evaluate((e) => e.open), false);
    } else {
      await page.getByRole("button", { name: "Open mission information", exact: true }).tap();
      assert.equal(await page.locator(".mf-protocol-info").evaluate((e) => e.open), true);
      assert.equal(await page.locator(".mf-voicejoin").evaluate((e) => e.disabled), true);
      await page.locator(".mf-protocol-infoclose").tap();
      const stick = await page.locator(".mf-stick").boundingBox();
      const touch = await page.context().newCDPSession(page),
        x = stick.x + stick.width / 2,
        y = stick.y + stick.height / 2;
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - 35 }],
      });
      assert.ok(await page.evaluate(() => document.querySelector("midnry-fps").engine.touch.y < 0));
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    console.log(JSON.stringify({ device: mobile ? "touch emulation" : "desktop", ...result }));
    await page.close();
  }
} finally {
  await browser.close();
}
