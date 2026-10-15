/** Compare the same camera with/without room culling, including daylight
 * shadows. Significant pixel differences catch missing doors, roofs or views. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "midnry-outpost-graphics",
      JSON.stringify({
        preset: "balanced",
        options: { adaptive: false, width: 720, shadows: true, lighting: true },
      }),
    ),
  );
  await page.goto(base + "/games/outpost-zero.html");
  await page.waitForFunction(
    () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
    null,
    { timeout: 120000 },
  );
  await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    g.lockMouse = () => {};
    g.start();
    g.protocolUI.brief.close();
    for (const e of g.arena.entities) e.bot = false;
  });
  for (const view of [
    { id: "command", x: 3.5, y: 5.5, a: 0 },
    { id: "doorway", x: 8.5, y: 6.5, a: 0 },
    { id: "doorway-up-left", x: 8.15, y: 6.5, a: -.35, pitch: .6 },
    { id: "doorway-up-right", x: 8.85, y: 6.5, a: .35, pitch: .6 },
    { id: "courtyard-grazing", x: 12.15, y: 14.5, a: -Math.PI / 2, pitch: .3 },
    { id: "flight-window", transport: true, x: 8.5, y: 2.5, a: -Math.PI / 2 },
  ]) {
    await page.evaluate((view) => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      if (view.transport) {
        for (const i of g.arena.protocol.mission.manifest) i.loaded = i.required;
        const p = g.arena.protocol.mission.loading;
        Object.assign(g.player, { x: p.x, y: p.y });
        g.arena.departMission(g.player);
      }
      Object.assign(g.player, { x: view.x, y: view.y, a: view.a });
      g.lookPitch = view.pitch || 0;
      g.protocolCache = null;
      r.frameProtocolArena = null;
      g.protocolUI.update(true);
      // Compare static geometry with settled lighting. Doorway adaptation has
      // its own movement test and must not change between these two captures.
      r.naturalLighting.initialized = false;
      g.render();
      window.worldBefore = JSON.stringify(g.arena.snapshot());
      const v = r.worldVisibility;
      window.visibilityUpdate = v.update;
      v.update = () => {};
      for (const e of v.entries) e.mesh.layers.enable(0);
      r.lastRenderAt = performance.now();
      g.render();
    }, view);
    const before = await page.screenshot({
      path: `/workspace/screenshots/outpost-world-${view.id}-before.png`,
    });
    const full = await page.evaluate(() => ({
      ...document.querySelector("midnry-fps").engine.military.metrics,
    }));
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        v = g.military.worldVisibility;
      v.update = window.visibilityUpdate;
      v.last = null;
      g.military.lastRenderAt = performance.now();
      g.render();
    });
    const after = await page.screenshot({
      path: `/workspace/screenshots/outpost-world-${view.id}-after.png`,
    });
    const result = await page.evaluate(
      async ({ before, after }) => {
        const load = async (data) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const c = document.createElement("canvas");
          c.width = image.width;
          c.height = image.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(image, 0, 0);
          return ctx.getImageData(0, 0, c.width, c.height).data;
        };
        const a = await load(before),
          b = await load(after);
        let changed = 0,
          total = 0;
        for (let i = 0; i < a.length; i += 4) {
          const d = Math.max(
            Math.abs(a[i] - b[i]),
            Math.abs(a[i + 1] - b[i + 1]),
            Math.abs(a[i + 2] - b[i + 2]),
          );
          total += d;
          if (d > 18) changed++;
        }
        const g = document.querySelector("midnry-fps").engine;
        return {
          changedFraction: changed / (a.length / 4),
          meanDifference: total / (a.length / 4),
          metrics: g.military.metrics,
          pure: window.worldBefore === JSON.stringify(g.arena.snapshot()),
          cameraMask: g.military.camera.layers.mask,
        };
      },
      { before: before.toString("base64"), after: after.toString("base64") },
    );
    console.log(JSON.stringify({ view: view.id, full, result }));
    assert.equal(result.pure, true);
    assert.equal(result.cameraMask, 1);
    assert.ok(result.changedFraction < 0.005, `${view.id}: room culling changed visible surfaces`);
    assert.ok(result.metrics.worldCulled > 0);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
