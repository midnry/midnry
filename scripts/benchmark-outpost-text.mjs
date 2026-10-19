/** Matched, real-engine Retina text captures. No simulation changes are shipped.
 * SwiftShader timings are deliberately not interpreted as hardware GPU costs. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
const phase = process.argv[2] || "before",
  base = process.argv[3] || "http://127.0.0.1:8080";
const folder = "docs/graphics-benchmark/text-clarity",
  shots = "/workspace/screenshots/outpost-text-clarity";
mkdirSync(folder, { recursive: true });
mkdirSync(shots, { recursive: true });
const devices = [
  { id: "retina", viewport: { width: 1280, height: 720 } },
  {
    id: "ipad",
    viewport: { width: 1024, height: 768 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  },
  { id: "phone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const result = {
  phase,
  seed: "outpost-text-20261019",
  deviceScaleFactor: 2,
  baseline: "b344507",
  rendererSHA256: createHash("sha256")
    .update(
      readFileSync(
        phase === "before"
          ? "/tmp/outpost-text-baseline/outpost-military.js"
          : "public/games/outpost-military.js",
      ),
    )
    .digest("hex"),
  timingLimit: "Chromium SwiftShader software rendering; no hardware FPS or GPU speed claim",
  rows: [],
  headroom: [],
};
// Persist each completed capture, including when a later browser/context dies.
// Only reuse data from this exact renderer, never an earlier artwork probe.
const oldPath=`${folder}/${phase}.json`;
const old=existsSync(oldPath)?JSON.parse(readFileSync(oldPath,'utf8')):null;
if(old?.rendererSHA256===result.rendererSHA256){result.rows=old.rows;result.headroom=old.headroom||[];}
const save=()=>writeFileSync(oldPath,JSON.stringify(result,null,2)+'\n');
try {
  for (const device of devices)
    for (const preset of ["balanced", "high"]) {
      if (process.env.OUTPOST_TEXT_DEVICE && process.env.OUTPOST_TEXT_DEVICE !== device.id)
        continue;
      if (process.env.OUTPOST_TEXT_PRESET && process.env.OUTPOST_TEXT_PRESET !== preset) continue;
      let targets = ["room-sign", "station-label", "terminal-screen"];
      if (device.id === "retina")
        targets.push(
          "medical-label",
          "room-sign-night",
          "terminal-screen-power-out",
          "benchmark-sign",
          "medical-wayfinding",
        );
      if (process.env.OUTPOST_TEXT_TARGETS)
        targets = targets.filter((t) => process.env.OUTPOST_TEXT_TARGETS.split(",").includes(t));
      if (!targets.length) continue;
      if(process.env.OUTPOST_TEXT_RESUME==='1'&&targets.every(target=>result.rows.some(r=>r.device===device.id&&r.preset===preset&&r.target===target))&&
        (phase==='before'||result.headroom.some(r=>r.device===device.id&&r.preset===preset)))continue;
      const page = await browser.newPage({
          ...device,
          deviceScaleFactor: 2,
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
      if (phase === "before")
        for (const file of ["outpost-military.js", "outpost-academy.js", "outpost-zero.html"])
          await page.route("**/" + file + "*", (route) =>
            route.fulfill({
              path: "/tmp/outpost-text-baseline/" + file,
              contentType: file.endsWith("html") ? "text/html" : "text/javascript",
            }),
          );
      await page.goto(base + "/games/outpost-zero.html",{waitUntil:'domcontentloaded',timeout:120000});
      await page.waitForFunction(
        () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
        null,
        { timeout: 180000 },
      );
      await page.evaluate(async (seed) => {
        const g = document.querySelector("midnry-fps").engine,
          { dailyRandom } = await import("./outpost-shifts.js");
        cancelAnimationFrame(g.frame);
        g.frame = 0;
        g.lockMouse = () => {};
        const random = Math.random;
        try {
          Math.random = dailyRandom(seed);
          g.mode = "protocol";
          g.rolePreference = "operator";
          g.shift = "full";
          g.modifier = "radio-silence";
          g.reset();
        } finally {
          Math.random = random;
        }
        g.start();
        for (const d of g.root.querySelectorAll("dialog[open]")) d.close();
        g.arena.time = 30;
        for (const e of g.arena.entities) {
          e.bot = false;
          if (e !== g.player) Object.assign(e, { x: 21.5, y: 7.5 });
        }
        for (const p of g.arena.protocol.mission.patients) p.decay = 0;
        g.arena.protocol.events = [];
        g.arena.protocol.sabotage.powerUntil = 0;
        g.protocolCache = null;
        g.render();
      }, result.seed);
      for (const target of targets) {
        const row = await page.evaluate(
          ({ target, phase }) => {
            const g = document.querySelector("midnry-fps").engine,
              r = g.military;
            const station = r.interactableInstances.find(
              (v) => v.type === "station" && v.id === "depot-seal",
            );
            let object;
            if (target === "benchmark-sign" || target === "medical-wayfinding") {
              const rec =
                target === "benchmark-sign"
                  ? r.benchmarkCorridor.records.find((v) => v.kind === "wall" && v.s?.[1] === 0.29)
                  : r.medicalDepotPresentation.records.find(
                      (v) => v.kind === "wall" && v.p[1] === 2.66,
                    );
              if (!rec) throw Error("Missing atlas fixture " + target);
              const sx = rec.max[0] - rec.min[0],
                sy = rec.max[1] - rec.min[1],
                sz = rec.max[2] - rec.min[2];
              // A synthetic diagnostic quad projects the bounds of the real batched
              // sign. It is never added to the scene or rendered into the screenshot.
              object = station.screen.clone();
              object.geometry = r.geometries.get("protocol-sign");
              object.position.set(...rec.p);
              object.scale.set(Math.max(sx, sz) / 2.5, sy / 0.73, 1);
              let nx = sx < 0.001 ? 1 : 0,
                nz = sx < 0.001 ? 0 : 1;
              if (
                g.level[Math.floor((rec.p[2] + nz * 2.5) / 3)]?.[
                  Math.floor((rec.p[0] + nx * 2.5) / 3)
                ]
              ) {
                nx *= -1;
                nz *= -1;
              }
              object.rotation.set(0, Math.atan2(nx, nz), 0);
              object.updateMatrixWorld(true);
              let material;
              r.world.traverse((o) => {
                if (
                  o.material?.map ===
                  (target === "benchmark-sign" ? r.benchmarkAtlas : r.medicalDepotAtlas)
                )
                  material = o.material;
              });
              object.material = material;
            } else if (target.startsWith("room-sign")) {
              const candidates = [];
              r.world.traverse((o) => {
                if (o.isMesh && o.geometry === r.geometries.get("protocol-sign"))
                  candidates.push(o);
              });
              object = candidates.sort((a, b) => {
                const p = a.getWorldPosition(a.position.clone()),
                  q = b.getWorldPosition(b.position.clone());
                return Math.hypot(p.x - 67.5, p.z - 69) - Math.hypot(q.x - 67.5, q.z - 69);
              })[0];
            } else if (target === "medical-label")
              object = r.interactableInstances.find(
                (v) => v.type === "cabinet-label" && v.id === "surgical-command",
              ).label;
            else
              object =
                target === "station-label"
                  ? station.root.children.find(
                      (o) => o.geometry === r.geometries.get("protocol-label"),
                    )
                  : station.screen;
            if (!object) throw Error("Missing target " + target);
            r.world.updateMatrixWorld(true);
            const center = object.getWorldPosition(object.position.clone()),
              normal = center
                .clone()
                .set(0, 0, 1)
                .applyQuaternion(object.getWorldQuaternion(object.quaternion.clone()));
            const distance = 2.5,
              x = (center.x + normal.x * distance) / 3,
              y = (center.z + normal.z * distance) / 3;
            if (g.level[Math.floor(y)]?.[Math.floor(x)])
              throw Error("Capture camera inside collision " + target + " " + x + "," + y);
            Object.assign(g.player, { x, y, a: Math.atan2(-normal.z, -normal.x) });
            g.lookPitch = Math.atan2(center.y - 1.65, distance);
            g.arena.protocol.match.modifier = target.endsWith("night")
              ? "night-shift"
              : "radio-silence";
            g.arena.protocol.sabotage.powerUntil = target.endsWith("power-out") ? g.time + 60 : 0;
            g.protocolCache = null;
            r.frameProtocolArena = null;
            r.naturalLighting.initialized = false;
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
            // Project the actual panel corners; screenshot is a crop, never upscaled art.
            const rect = r.renderer.domElement.getBoundingClientRect(),
              pos = object.geometry.attributes.position;
            const points = [];
            for (let i = 0; i < pos.count; i++)
              points.push(
                center
                  .clone()
                  .set(pos.getX(i), pos.getY(i), pos.getZ(i))
                  .applyMatrix4(object.matrixWorld)
                  .project(r.camera),
              );
            const loX = Math.min(...points.map((p) => (p.x * 0.5 + 0.5) * rect.width)),
              hiX = Math.max(...points.map((p) => (p.x * 0.5 + 0.5) * rect.width));
            const loY = Math.min(...points.map((p) => (-0.5 * p.y + 0.5) * rect.height)),
              hiY = Math.max(...points.map((p) => (-0.5 * p.y + 0.5) * rect.height));
            const clip = {
              x: Math.max(rect.x, Math.floor(rect.x + loX - 75)),
              y: Math.max(rect.y, Math.floor(rect.y + loY - 60)),
            };
            clip.width = Math.min(rect.right - clip.x, Math.ceil(hiX - loX + 150));
            clip.height = Math.min(rect.bottom - clip.y, Math.ceil(hiY - loY + 120));
            const textures = new Set(r.textures);
            r.scene.traverse((o) => {
              for (const m of [].concat(o.material || []))
                for (const v of Object.values(m || {})) if (v?.isTexture) textures.add(v);
            });
            const handles = new Set();
            let sourceBytes = 0;
            const inventory = [];
            for (const t of textures) {
              const handle = r.renderer.properties.get(t).__webglTexture;
              if (!handle || handles.has(handle) || !t.image?.width) continue;
              handles.add(handle);
              const bytes =
                t.image.width *
                t.image.height *
                (t.type === 1016 ? 8 : t.type === 1015 ? 16 : 4) *
                (t.generateMipmaps ? 4 / 3 : 1);
              sourceBytes += bytes;
              if (t.image.tagName === "CANVAS")
                inventory.push({
                  name: t.name,
                  width: t.image.width,
                  height: t.image.height,
                  mipmaps: t.generateMipmaps,
                  anisotropy: t.anisotropy,
                  colorSpace: t.colorSpace,
                  bytes: Math.round(bytes),
                });
            }
            const mat = object.material;
            return {
              target,
              distanceMetres: distance,
              camera: { x, y, a: g.player.a, pitch: g.lookPitch },
              clip,
              samples,
              calls: Math.max(...samples.map((s) => s.calls)),
              triangles: Math.max(...samples.map((s) => s.triangles)),
              drawingBuffer: [r.renderer.domElement.width, r.renderer.domElement.height],
              canvasDisplay: [rect.width * devicePixelRatio, rect.height * devicePixelRatio],
              sourceTextureBytesEstimate: Math.round(sourceBytes),
              canvasTextures: inventory,
              textArtwork: mat.map
                ? {
                    width: mat.map.image.width,
                    height: mat.map.image.height,
                    anisotropy: mat.map.anisotropy,
                    mipmaps: mat.map.generateMipmaps,
                    emissive: mat.emissive?.toArray(),
                    emissiveIntensity: mat.emissiveIntensity,
                    metadata: mat.map.userData.worldText,
                  }
                : null,
              maxAnisotropy: r.renderer.capabilities.getMaxAnisotropy(),
              profile: r.profile,
              bloom: {
                enabled: r.bloom.enabled,
                strength: r.bloom.strength,
                threshold: r.bloom.threshold,
              },
              font: r.worldTypography || null,
              timerQuerySupported: !!r.telemetry?.ext,
              assetErrors: r.assetErrors,
            };
          },
          { target, phase },
        );
        assert.deepEqual(row.assetErrors, []);
        assert.ok(row.calls > 0);
        if (phase === "after") {
          assert.equal(row.font.loaded, true);
          assert.equal(row.textArtwork.anisotropy, row.maxAnisotropy);
        }
        const name = `${phase}-${device.id}-${preset}-${target}.png`;
        await page.screenshot({
          path: shots + "/" + name,
          clip: row.clip,
          animations: "disabled",
          timeout: 120000,
        });
        result.rows=result.rows.filter(r=>!(r.device===device.id&&r.preset===preset&&r.target===target));
        result.rows.push({ device: device.id, preset, image: name, ...row });
        save();
        console.log(
          JSON.stringify({
            phase,
            device: device.id,
            preset,
            target,
            calls: row.calls,
            triangles: row.triangles,
            buffer: row.drawingBuffer,
          }),
        );
      }
      if (phase === "after" && !process.env.OUTPOST_TEXT_TARGETS) {
        const headroom = await page.evaluate(async () => {
          const g = document.querySelector("midnry-fps").engine,
            r = g.military,
            { FrameBudget } = await import("./outpost-academy.js");
          const budget = g.budget,
            adaptive = g.academy.options.adaptive,
            b = new FrameBudget();
          const measure = () => {
            g.resize();
            const samples=[];
            for(let i=0;i<3;i++){
              r.lastRenderAt = performance.now() - 16;
              r.lastShadowAt = 0;
              if(r.worldVisibility)r.worldVisibility.dirty=true;
              g.render();
              samples.push({calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles});
            }
            const targets = new Set([
              r.composer?.renderTarget1,
              r.composer?.renderTarget2,
              r.bloom?.renderTargetBright,
              ...(r.bloom?.renderTargetsHorizontal || []),
              ...(r.bloom?.renderTargetsVertical || []),
              r.reflection?.getRenderTarget(),
            ]);
            if (r.ao)
              for (const value of Object.values(r.ao))
                if (value?.isRenderTarget) targets.add(value);
            let rawColourBytes = 0;
            const targetInventory = [];
            for (const t of targets)
              if (t) {
                const bytes =
                  t.width *
                  t.height *
                  (t.texture.type === 1016 ? 8 : t.texture.type === 1015 ? 16 : 4);
                rawColourBytes += bytes;
                targetInventory.push({
                  width: t.width,
                  height: t.height,
                  type: t.texture.type,
                  samples: t.samples,
                  bytes,
                });
              }
            return {
              scale: b.scale,
              drawingBuffer: [r.renderer.domElement.width, r.renderer.domElement.height],
              calls: Math.max(...samples.map(s=>s.calls)),
              triangles: Math.max(...samples.map(s=>s.triangles)),
              samples,
              rawColourTargetBytes: rawColourBytes,
              targetInventory,
            };
          };
          g.budget = b;
          g.academy.options.adaptive = true;
          try {
            const base = measure();
            // Deterministic controller contract, not a claim about this software GPU.
            for (let i = 0; i < 4000; i++) b.sample(2, (i * 1000) / 60, true, true, 2, 1.5);
            const earned = measure();
            for (let i = 0; i < 180; i++) b.sample(2, 70000 + (i * 1000) / 60, true, true, 12, 1.5);
            const pressure = measure();
            return {
              input:
                "Synthetic 2 ms CPU / 2 ms GPU sustained-headroom trace, then 12 ms GPU pressure; hardware performance unmeasured",
              base,
              earned,
              pressure,
            };
          } finally {
            g.budget = budget;
            g.academy.options.adaptive = adaptive;
            g.resize();
          }
        });
        assert.equal(headroom.earned.scale, 1.5);
        assert.ok(headroom.pressure.scale < headroom.earned.scale);
        // Count refreshed shadow/reflection work too. A resize can invalidate
        // those caches; record the actual cost rather than assume +0 passes.
        result.headroom=result.headroom.filter(r=>!(r.device===device.id&&r.preset===preset));
        result.headroom.push({ device: device.id, preset, ...headroom });
        save();
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  save();
} finally {
  await browser.close();
}
