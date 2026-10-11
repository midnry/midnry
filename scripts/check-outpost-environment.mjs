import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.environment);
    await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine;
      await Promise.all([g.environment.ready, g.characters.ready, g.weapons.ready]);
      cancelAnimationFrame(g.frame);
    });
    const skyImages = new Set();
    for (const id of ["outpost", "testblock", "skyport", "freight", "estate"]) {
      await page.locator(".mf-mapselect").selectOption(id);
      const result = await page.evaluate(async (id) => {
        const g = document.querySelector("midnry-fps").engine;
        g.$(".mf-modal").hidden = true;
        g.player.pitch = 0;
        g.player.a = 0;
        g.player.x = 1.5;
        g.player.y = 2.5;
        if (id === "skyport") {
          g.player.x = 16.5;
          g.player.y = 19.5;
        }
        if (id === "estate") {
          g.player.x = 12.5;
          g.player.y = 11.5;
        }
        const before = JSON.stringify(g.arena.snapshot());
        g.render();
        const first = g.canvas.toDataURL();
        g.render();
        const pure = before === JSON.stringify(g.arena.snapshot());
        const cache = g.environment.cache.size;
        g.render();
        const reused = cache === g.environment.cache.size;
        const p = g.camera(),
          h = g.h * 0.5;
        g.ctx.clearRect(0, 0, g.w, g.h);
        g.environment.sky({ id }, p, h);
        const sky = g.canvas.toDataURL();
        g.ctx.clearRect(0, 0, g.w, g.h);
        g.environment.sky({ id }, { ...p, a: p.a + Math.PI * 2 }, h);
        const wrapped = sky === g.canvas.toDataURL();
        g.player.a += 0.4;
        g.render();
        const turned = first !== g.canvas.toDataURL();
        g.player.x += 0.2;
        g.render();
        const moved = first !== g.canvas.toDataURL();
        const { mapOf } = await import("/games/outpost-sim.js");
        const map = mapOf(id),
          camera = g.camera();
        g.academy.floor(map, camera, h);
        const floor = g.academy.floorCanvas.toDataURL();
        g.academy.floor(map, { ...camera, x: camera.x + 0.2 }, h);
        const terrainMoves = floor !== g.academy.floorCanvas.toDataURL();
        const oldTime = g.time,
          oldHalf = g.zone.half,
          oldMode = g.mode;
        g.mode = "signal";
        g.time = g.zone.delay + 1;
        g.zone.half = 0.1;
        g.academy.floor(map, camera, h);
        const haze = floor !== g.academy.floorCanvas.toDataURL();
        g.time = oldTime;
        g.zone.half = oldHalf;
        g.mode = oldMode;
        g.render();
        const ground = g.environment.ground({ id }).map((levels) => levels[0].image.toDataURL());
        return {
          loaded: g.environment.loaded,
          sky,
          wrapped,
          pure,
          cache,
          reused,
          turned,
          moved,
          terrainMoves,
          haze,
          materials: new Set(ground).size,
        };
      }, id);
      assert(result.loaded);
      assert(result.pure);
      assert(result.wrapped);
      assert(result.reused);
      assert(result.turned);
      assert(result.moved);
      assert(result.terrainMoves);
      assert(result.haze);
      assert(result.cache <= 16);
      skyImages.add(result.sky);
      delete result.sky;
      await page.screenshot({
        path: `/workspace/screenshots/outpost-environment-${id}-${mobile ? "mobile" : "desktop"}.png`,
      });
      console.log(JSON.stringify({ mobile, id, ...result }));
      await page.evaluate(
        () => (document.querySelector("midnry-fps").engine.$(".mf-modal").hidden = false),
      );
    }
    assert.equal(skyImages.size, 5);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const fallback = await browser.newPage();
  await fallback.route("**/environment/*.webp", (r) => r.abort());
  const errors = [];
  fallback.on("pageerror", (e) => errors.push(e.message));
  await fallback.goto(base + "/games/outpost-zero.html");
  const result = await fallback.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine;
    const assets = await g.environment.ready;
    g.render();
    return { assets, loaded: g.environment.loaded, width: g.canvas.width };
  });
  assert.deepEqual(result.assets, [false, false]);
  assert.equal(result.loaded, false);
  assert(result.width > 0);
  assert.deepEqual(errors, []);
  console.log("Artwork failure keeps procedural environments playable.");
} finally {
  await browser.close();
}
