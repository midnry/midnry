/** Fixed scene and cameras; counts include all render passes and refreshed
 * shadows. Managed source-texture bytes are estimates; renderer.info reports
 * texture-object counts. Render targets and driver memory are excluded. */
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
const phase = process.argv[2] || "before",
  base = process.argv[3] || "http://127.0.0.1:8080";
const seed = "outpost-corridor-20261019";
const poses = [
  { id: "rations-approach", x: 9.7, y: 16.4, a: Math.PI / 2, pitch: -0.035 },
  { id: "cold-storage-junction", x: 9.7, y: 22.4, a: -Math.PI / 2, pitch: -0.035 },
  { id: "cold-storage-terminal", x: 6.45, y: 23.5, a: 0, pitch: -0.04 },
  { id: "soldier", x: 9.7, y: 18.2, a: Math.PI / 2, pitch: -0.11 },
];
mkdirSync("/workspace/screenshots/outpost-corridor", { recursive: true });
mkdirSync("docs/graphics-benchmark", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const bundle = process.env.OUTPOST_BENCH_BUNDLE || "public/games/outpost-military.js";
const output = {
  phase,
  seed,
  memoryScope:
    "Unique uploaded managed source textures with mipmaps; excludes render targets, driver allocations and internal PMREM/MSAA. Not total GPU memory.",
  bundleSHA256: createHash("sha256").update(readFileSync(bundle)).digest("hex"),
  resolution: [1280, 800],
  browser: "Chromium SwiftShader software renderer; timings are not hardware FPS",
  poses,
  results: [],
};
try {
  for (const preset of phase === "after"
    ? ["balanced", "performance", "high"]
    : ["performance", "balanced", "high"]) {
    if (process.env.OUTPOST_BENCH_PRESET && process.env.OUTPOST_BENCH_PRESET !== preset) continue;
    const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") errors.push(e.text());
    });
    await page.addInitScript((preset) => {
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset, options: { adaptive: false } }),
      );
      localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 10 }));
    }, preset);
    if (process.env.OUTPOST_BENCH_BUNDLE)
      await page.route("**/outpost-military.js*", (route) =>
        route.fulfill({ path: bundle, contentType: "text/javascript" }),
      );
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 120000 },
    );
    await page.evaluate(async (seed) => {
      const g = document.querySelector("midnry-fps").engine,
        { dailyRandom } = await import("./outpost-shifts.js");
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.lockMouse = () => {};
      const original = Math.random;
      try {
        Math.random = dailyRandom(seed);
        g.mode = "protocol";
        g.rolePreference = "operator";
        g.shift = "full";
        g.modifier = "radio-silence";
        g.reset();
      } finally {
        Math.random = original;
      }
      g.start();
      for (const d of g.root.querySelectorAll("dialog[open]")) d.close();
      g.arena.time = 30;
      for (const e of g.arena.entities) {
        e.bot = false;
        if (e !== g.player) Object.assign(e, { x: 21.5, y: 7.5, a: 0 });
      }
      const actor = g.arena.entities.find((e) => e !== g.player);
      Object.assign(actor, { x: 9.7, y: 19.35, a: -Math.PI / 2, color: "#a78bce" });
      for (const p of g.arena.protocol.mission.patients) p.decay = 0;
      g.arena.protocol.events = [];
      g.arena.protocol.sabotage.powerUntil = 0;
      window.benchmarkActor = actor.id;
    }, seed);
    const rows = [];
    for (const pose of poses) {
      const row = await page.evaluate((pose) => {
        const g = document.querySelector("midnry-fps").engine,
          r = g.military;
        if (g.level[Math.floor(pose.y)]?.[Math.floor(pose.x)] !== 0)
          throw Error("Benchmark camera is inside collision: " + pose.id);
        Object.assign(g.player, { x: pose.x, y: pose.y, a: pose.a });
        g.lookPitch = pose.pitch;
        g.protocolCache = null;
        r.frameProtocolArena = null;
        r.naturalLighting.initialized = false;
        // A dirty rebuild restores previously hidden layers before reculling.
        // reset() is for replaced worlds; calling it on this same world discards
        // those restoration records and makes results depend on earlier views.
        const samples = [];
        for (let i = 0; i < 3; i++) {
          r.lastRenderAt = performance.now() - 16;
          r.lastShadowAt = 0;
          if (r.worldVisibility) r.worldVisibility.dirty = true;
          g.protocolUI.update(true);
          g.render();
          samples.push({
            calls: r.renderer.info.render.calls,
            triangles: r.renderer.info.render.triangles,
          });
        }
        const textures = new Set(r.textures);
        const scan = (root) =>
          root?.traverse((o) => {
            for (const m of [].concat(o.material || []))
              for (const v of Object.values(m || {})) if (v?.isTexture) textures.add(v);
          });
        scan(r.scene);
        scan(r.weaponScene);
        const seen = new Set();
        let sourceBytes = 0;
        const imageInfo = [];
        for (const t of textures) {
          const handle = r.renderer.properties.get(t).__webglTexture;
          if (!handle || seen.has(handle)) continue;
          seen.add(handle);
          const im = t.image;
          if (!im?.width || !im?.height) continue;
          const bpp = t.type === 1016 ? 8 : t.type === 1015 ? 16 : 4;
          const bytes = im.width * im.height * bpp * (t.generateMipmaps ? 4 / 3 : 1);
          sourceBytes += bytes;
          imageInfo.push({
            name: t.name || im.src?.split("/").at(-1) || t.userData?.source || "",
            width: im.width,
            height: im.height,
            colorSpace: t.colorSpace,
            bytes: Math.round(bytes),
          });
        }
        const actor = r.actors.get(window.benchmarkActor),
          materials = [];
        actor?.model.traverse((o) => {
          if (o.isMesh)
            for (const m of [].concat(o.material))
              if (!materials.some((e) => e.name === m.name))
                materials.push({
                  name: m.name,
                  roughness: m.roughness,
                  metalness: m.metalness,
                  hasDye: !!m.userData.playerDye,
                  normal: !!m.normalMap,
                  roughnessMap: !!m.roughnessMap,
                });
        });
        return {
          pose: pose.id,
          samples,
          calls: Math.max(...samples.map((s) => s.calls)),
          triangles: Math.max(...samples.map((s) => s.triangles)),
          textureObjects: r.renderer.info.memory.textures,
          managedTextureBytesEstimate: Math.round(sourceBytes),
          textureInventory: imageInfo,
          geometryObjects: r.renderer.info.memory.geometries,
          profile: r.profile,
          exposure: r.renderer.toneMappingExposure,
          shadowSize: r.sun.shadow.mapSize.x,
          pixelRatio: r.renderer.getPixelRatio(),
          drawingBuffer: [r.renderer.domElement.width, r.renderer.domElement.height],
          post: r.composer?.passes.map((p) => ({ type: p.constructor.name, enabled: p.enabled })),
          reflectionVisible: r.reflection?.visible,
          inside: r.naturalLighting.inside,
          assetErrors: r.assetErrors,
          actorMaterials: materials,
        };
      }, pose);
      assert.deepEqual(row.assetErrors, []);
      assert.ok(row.calls > 0);
      if (phase === "after" && preset === "balanced") {
        const baseline = JSON.parse(readFileSync("docs/graphics-benchmark/before.json"))
          .results.find((r) => r.preset === "balanced")
          .rows.find((r) => r.pose === pose.id);
        assert.ok(
          row.calls <= baseline.calls,
          `${pose.id}: Balanced calls ${row.calls} exceed baseline ${baseline.calls}`,
        );
      }
      if (preset === "balanced") assert.equal(row.reflectionVisible, false);
      await page.locator("canvas.mf-webgl").screenshot({
        path: `/workspace/screenshots/outpost-corridor/${phase}-${preset}-${pose.id}.png`,
        timeout: 120000,
        animations: "disabled",
      });
      rows.push(row);
      console.log(
        JSON.stringify({
          phase,
          preset,
          pose: pose.id,
          calls: row.calls,
          triangles: row.triangles,
          textures: row.textureObjects,
          managedMiB: (row.managedTextureBytesEstimate / 1048576).toFixed(1),
        }),
      );
    }
    const resources = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((e) => e.name.includes("/games/"))
        .map((e) => ({
          url: new URL(e.name).pathname,
          bytes: e.encodedBodySize || e.decodedBodySize,
        })),
    );
    const unique = Object.values(Object.fromEntries(resources.map((r) => [r.url, r]))),
      downloadBytes = unique.reduce((n, r) => n + r.bytes, 0);
    output.results.push({ preset, downloadBytes, resources: unique, rows });
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(`docs/graphics-benchmark/${phase}.json`, JSON.stringify(output, null, 2));
}
if (phase === "after") {
  const before = JSON.parse(readFileSync("docs/graphics-benchmark/before.json"));
  for (const result of output.results.filter((r) => r.preset === "balanced"))
    for (const row of result.rows) {
      const old = before.results
        .find((r) => r.preset === result.preset)
        .rows.find((r) => r.pose === row.pose);
      assert.ok(
        row.calls <= old.calls,
        `${row.pose}: Balanced draw calls ${row.calls} exceed baseline ${old.calls}`,
      );
    }
}
