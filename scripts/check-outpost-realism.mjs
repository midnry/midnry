/** Reproducible renderer comparisons; actual mission controls have separate QA. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const base = args.find((arg) => /^https?:/.test(arg)) || "http://127.0.0.1:8080";
const phase = args.includes("--before") ? "before" : "after";
const preset = args.includes("--performance") ? "performance" : "high";
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname),
  "visual fixtures must target a local preview",
);
const output = "/workspace/screenshots";
mkdirSync(output, { recursive: true });
// The archived baseline used 1.5 m eye height outside the pilot seat. Art
// comparisons retain that exact camera; --gameplay-camera shows the new
// default eye height separately, without overwriting the matched evidence.
const matchCamera = phase === "after" && !args.includes("--gameplay-camera");
const baseline = matchCamera
  ? JSON.parse(readFileSync(`${output}/outpost-realism-before.json`, "utf8"))
  : null;
const matched = baseline
  ? new Map(baseline.results.map((result) => [`${result.mobile}:${result.scene}`, result]))
  : null;
if (baseline)
  assert.equal(
    baseline.preset,
    preset,
    "before/after comparisons use the same graphics preference",
  );
const captureLabel = phase === "after" && !matchCamera ? "gameplay" : phase;
const bundleHash = createHash("sha256")
  .update(readFileSync(new URL("../public/games/outpost-military.js", import.meta.url)))
  .digest("hex");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const allScenes = [
  "base-exterior",
  "base-interior",
  "character-weapon",
  "outpost",
  "freight",
  "aircraft",
  "clinic",
];
const selectedScene = args.find((arg) => arg.startsWith('--scene='))?.slice(8);
const scenes = selectedScene ? allScenes.filter((scene) => scene === selectedScene) : allScenes;
assert.ok(scenes.length, 'a valid screenshot scene is required');
const results = [];

async function stage(page, scene, baselineScene) {
  return page.evaluate(
    ({ scene, baselineScene }) => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.rolePreference = "operator";
      g.mode = ["outpost", "freight"].includes(scene) ? "training" : "protocol";
      g.mapId = g.mode === "training" ? scene : "breakwater";
      g.weapon = "carbine";
      g.reset();
      g.time = 6;
      g.step = 0;
      g.viewPitch = 0;
      g.player.shotAt = -100;
      g.player.hit = -100;
      g.player.reloadUntil = 0;
      g.crates = [];
      for (const [i, e] of g.enemies.entries()) {
        e.bot = false;
        e.x = g.arena.mapId === "breakwater" ? 15.5 : g.level.length - 2.5;
        e.y = g.arena.mapId === "breakwater" ? 8.5 : g.level.length - 2.5;
        e.hp = 100;
        e.hit = -100;
        e.shotAt = -100;
        e.path = [];
        e.jumpUntil = 0;
        e.a = i % 2 ? 0 : Math.PI;
      }
      const positions = {
        "base-exterior": { x: 14.5, y: 14.5, a: -Math.PI / 2 },
        "base-interior": { x: 3.5, y: 5.5, a: 0 },
        "character-weapon": { x: 6.5, y: 6.5, a: -Math.PI / 2 },
        outpost: { x: 3.5, y: 2.5, a: 0 },
        freight: { x: 3.5, y: 2.5, a: 0 },
      };
      if (positions[scene]) Object.assign(g.player, positions[scene]);
      if (scene === "character-weapon")
        Object.assign(g.enemies[0], { x: 6.5, y: 5.1, a: Math.PI / 2 });
      if (["outpost", "freight"].includes(scene))
        Object.assign(g.enemies[0], { x: 6.5, y: 2.8, a: Math.PI });
      if (["aircraft", "clinic"].includes(scene)) {
        const mission = g.arena.protocol.mission;
        // Presentation fixtures only: no fake completion is used in mission QA.
        mission.manifest.forEach((item) => {
          item.loaded = item.required;
        });
        Object.assign(g.player, { x: mission.loading.x, y: mission.loading.y });
        if (!g.arena.departMission(g.player)) throw Error("Could not stage the aircraft");
        g.mapId = g.arena.mapId;
        Object.assign(mission.vehicle, {
          progress: 60,
          altitude: 0.65,
          heading: 0,
          autopilot: true,
        });
        if (scene === "aircraft") {
          Object.assign(g.player, {
            x: g.transportMap.helm.x,
            y: g.transportMap.helm.y,
            a: -Math.PI / 2,
          });
          mission.vehicle.pilotId = g.selfId;
        } else {
          Object.assign(mission.vehicle, {
            arrived: true,
            progress: mission.vehicle.duration,
            pilotId: null,
          });
          Object.assign(g.player, { x: g.transportMap.cargo.x, y: g.transportMap.cargo.y, a: 0 });
        }
      }
      g.protocolCache = null;
      if (g.arena.wall(g.player.x, g.player.y))
        throw Error("Visual camera fixture is inside a wall");
      for (const child of g.shell.children)
        if (child !== r.renderer.domElement) child.style.visibility = "hidden";
      r.render();
      // Idle poses use precisely the same authored animation time for every run.
      for (const a of r.actors.values()) {
        a.mixer?.stopAllAction();
        a.actions.Idle?.reset().play();
        a.mixer?.setTime(0.5);
        a.lastSample = 6;
      }
      const before = JSON.stringify(g.arena.snapshot());
      r.render();
      if (scene === "clinic") {
        r.rig.visible = false;
        r.flash.visible = false;
        if (r.arrivalPatients.size !== 4) throw Error("Destination scene is missing patients");
      }
      if (baselineScene) {
        const saved = baselineScene.camera;
        if (![saved.x, saved.y, saved.z, saved.fov].every(Number.isFinite))
          throw Error("Invalid archived camera");
        r.camera.position.set(saved.x, saved.y, saved.z);
        r.camera.fov = saved.fov;
        r.camera.aspect = baselineScene.width / baselineScene.height;
        r.camera.rotation.set(0, -baselineScene.player.a - Math.PI / 2, 0, "YXZ");
        r.camera.updateProjectionMatrix();
        r.camera.updateMatrixWorld(true);
      }
      // Draw once using the final comparison camera. Calling r.render() here
      // would reset its height to the actual gameplay eye level again.
      if (baselineScene || scene === "clinic") {
        r.renderer.info.reset();
        if (g.academy.preset === "performance") {
          r.renderer.autoClear = true;
          r.renderer.render(r.scene, r.camera);
          r.renderer.autoClear = false;
          r.renderer.clearDepth();
          r.renderer.render(r.weaponScene, r.weaponCamera);
          r.renderer.autoClear = true;
        } else r.composer.render();
      }
      const finiteActors = [...r.actors.values()].every((actor) =>
        [
          actor.root.position.x,
          actor.root.position.y,
          actor.root.position.z,
          actor.model.scale.x,
          actor.model.scale.y,
          actor.model.scale.z,
        ].every(Number.isFinite),
      );
      r.renderer.getContext().finish();
      const after = JSON.stringify(g.arena.snapshot());
      return {
        scene,
        map: g.arena.mapId,
        preset: g.academy.preset,
        width: g.w,
        height: g.h,
        player: { x: g.player.x, y: g.player.y, a: g.player.a },
        time: g.time,
        camera: {
          x: r.camera.position.x,
          y: r.camera.position.y,
          z: r.camera.position.z,
          fov: r.camera.fov,
        },
        pure: before === after,
        finiteActors,
        assetErrors: r.assetErrors,
        actors: r.actors.size,
        drawCalls: r.renderer.info.render.calls,
        triangles: r.renderer.info.render.triangles,
        textures: r.renderer.info.memory.textures,
        geometries: r.renderer.info.memory.geometries,
        patientModels: r.arrivalPatients.size,
      };
    },
    { scene, baselineScene },
  );
}

try {
  for (const mobile of args.includes('--desktop-only') ? [false] : [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      hasTouch: mobile,
      isMobile: mobile,
      ignoreHTTPSErrors: true,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.addInitScript(
      (preset) =>
        localStorage.setItem(
          "midnry-outpost-graphics",
          JSON.stringify({ preset, options: { adaptive: false } }),
        ),
      preset,
    );
    await page.goto(base + "/games/outpost-zero.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const g = document.querySelector("midnry-fps")?.engine;
        return g?.militaryLoaded && g.compatibilityReport?.status !== "unsupported";
      },
      null,
      { polling: 100, timeout: 90000 },
    );
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
    });
    for (const scene of scenes) {
      const previous = matched?.get(`${mobile}:${scene}`);
      if (matchCamera) assert.ok(previous, "the scene has an archived baseline");
      const state = await stage(page, scene, previous);
      assert.equal(state.pure, true, "renderer never changes mission state");
      assert.equal(state.finiteActors, true, "animated actor transforms stay finite");
      assert.deepEqual(state.assetErrors, []);
      if (previous) {
        assert.deepEqual(
          state.camera,
          previous.camera,
          "comparison camera exactly matches the before view",
        );
        assert.deepEqual(state.player, previous.player, "the staged viewpoint is unchanged");
        assert.equal(state.width, previous.width);
        assert.equal(state.height, previous.height);
        assert.equal(state.time, previous.time, "the match/animation frame is unchanged");
      }
      const path = `${output}/outpost-realism-${captureLabel}-${scene}-${mobile ? "mobile" : "desktop"}.png`;
      await page.screenshot({ path });
      results.push({ mobile, ...state, screenshot: path });
      console.log(JSON.stringify({ phase, mobile, scene, path }));
    }
    assert.deepEqual(errors, []);
    await page.evaluate(() => document.querySelector("midnry-fps").engine.destroy());
    await page.close();
  }
  writeFileSync(
    `${output}/outpost-realism-${captureLabel}.json`,
    JSON.stringify({ phase, matchCamera, bundleHash, preset, results }, null, 2),
  );
  console.log(
    JSON.stringify({
      realismCapture: captureLabel,
      matchCamera,
      scenes: results.length,
      preset,
      bundleHash,
      errors: [],
    }),
  );
} finally {
  await browser.close();
}
