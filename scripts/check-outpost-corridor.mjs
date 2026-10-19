/** Real-engine scoped art regression: controls, clearances, dye, sabotage,
 * indoor/outdoor lighting and desktop/touch rendering. Not an FPS test. */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080",
  label = process.argv[3] || "dev";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const results = [];
mkdirSync("/workspace/screenshots/outpost-corridor", { recursive: true });
try {
  for (const mobile of [false, true]) {
    const device = mobile ? "mobile" : "desktop",
      errors = [];
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") errors.push(e.text());
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "balanced", options: { adaptive: false } }),
      );
      localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 10 }));
    });
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 120000 },
    );
    const result = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.lockMouse = () => {};
      const { dailyRandom } = await import("./outpost-shifts.js"),
        random = Math.random;
      try {
        Math.random = dailyRandom("outpost-corridor-20261019");
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
      const e = g.arena.entities.find((e) => e !== g.player);
      Object.assign(e, { x: 9.7, y: 19.35, a: -Math.PI / 2, color: "#a78bce" });
      const draw = (x, y, a = 0) => {
        Object.assign(g.player, { x, y, a });
        g.protocolCache = null;
        r.frameProtocolArena = null;
        r.lastRenderAt = performance.now() - 16;
        g.protocolUI.update(true);
        g.render();
      };
      r.naturalLighting.initialized = false;
      draw(9.7, 18.2, Math.PI / 2);
      const materials = [];
      r.actors.get(e.id).model.traverse((o) => {
        if (o.isMesh)
          for (const m of [].concat(o.material))
            if (!materials.some((a) => a.name === m.name))
              materials.push({
                name: m.name,
                dye: !!m.userData.playerDye,
                roughness: !!m.roughnessMap,
                metalness: !!m.metalnessMap,
                colorSpace: m.roughnessMap?.colorSpace,
              });
      });
      const response = Object.values(r.operatorResponse).map((t) => ({
        colorSpace: t.colorSpace,
        flipY: t.flipY,
        size: [t.image.width, t.image.height],
      }));
      // Exercise the actual controls and authoritative movement without allowing
      // bots/patients to advance. A/D must retain the engine's existing signs.
      draw(9.5, 17, Math.PI / 2);
      g.keys.add("w");
      g.keys.add("a");
      const left = g.controls();
      g.keys.clear();
      g.keys.add("w");
      g.keys.add("d");
      const right = g.controls();
      g.keys.clear();
      const path = [
        [9.5, 17],
        [9.5, 19.5],
        [10.5, 19.5],
        [10.5, 23.5],
      ];
      let blocked = 0;
      for (let j = 1; j < path.length; j++) {
        Object.assign(g.player, { x: path[j - 1][0], y: path[j - 1][1] });
        const [x, y] = path[j],
          dx = x - g.player.x,
          dy = y - g.player.y,
          n = Math.ceil(Math.hypot(dx, dy) / 0.05);
        for (let i = 0; i < n; i++) g.arena.move(g.player, dx / n, dy / n);
        if (Math.hypot(g.player.x - x, g.player.y - y) > 0.01) blocked++;
      }
      const clearances = r.benchmarkCorridor.records.reduce((a, record) => {
        a[record.kind] = (a[record.kind] || 0) + 1;
        return a;
      }, {});
      const clearanceErrors = r.benchmarkCorridor.records.filter((o) =>
        o.kind === "ceiling"
          ? o.min[1] < 2.9
          : o.kind === "floor"
            ? o.max[1] > 0.05 || g.level[Math.floor(o.p[2] / 3)]?.[Math.floor(o.p[0] / 3)] !== 0
            : Math.min(...[o.p[0], o.p[2]].map((n) => Math.abs(n / 3 - Math.round(n / 3)) * 3)) >
              0.17,
      );
      const baffles = [g.level[15][10], g.level[20][9]];
      // Check several identity colours and both original LOD material sets.
      const dyes = [];
      for (const color of ["#cf5e59", "#6ea6ca", "#d5b55b", "#a78bce"]) {
        e.color = color;
        draw(9.7, 18.2, Math.PI / 2);
        const m = r.actors.get(e.id).ownedMaterials.find((m) => m.userData.playerDye);
        dyes.push(m.userData.playerDye.value.getHexString());
      }
      e.color = "#a78bce";
      draw(9.7, 18.2, Math.PI / 2);
      const lods = [];
      r.actors.get(e.id).model.traverse((o) => {
        if (o.isMesh)
          lods.push({ lod: o.userData.operatorLOD, visible: o.visible, skinned: o.isSkinnedMesh });
      });
      const actor = r.actors.get(e.id);
      const run = actor.actions.Run?.getClip().name;
      // Same camera, power on/off. Practical geometry remains present; its
      // emissive state and the existing real-light pool follow sabotage.
      draw(9.7, 22.4, -Math.PI / 2);
      const on = r.protocolLightMaterials.map((m) => m.emissiveIntensity);
      g.arena.protocol.sabotage.powerUntil = g.time + 60;
      draw(9.7, 22.4, -Math.PI / 2);
      const off = r.protocolLightMaterials.map((m) => m.emissiveIntensity);
      g.arena.protocol.sabotage.powerUntil = 0;
      const exposure = [];
      for (const [x, y] of [
        [9.7, 23.5],
        [10.5, 24.5],
        [10.5, 26.5],
        [9.7, 23.5],
      ]) {
        draw(x, y, 0);
        exposure.push(r.renderer.toneMappingExposure);
      }
      const previousModifier = g.arena.protocol.match.modifier;
      g.arena.protocol.match.modifier = "night-shift";
      draw(9.7, 22.4, -Math.PI / 2);
      const nightActive = r.night.active,
        nightExposure = r.renderer.toneMappingExposure;
      g.arena.protocol.match.modifier = previousModifier;
      // The evidence image is the settled day state, rather than the first
      // few milliseconds of adaptation back from the night/sabotage checks.
      r.naturalLighting.initialized = false;
      draw(9.7, 22.4, -Math.PI / 2);
      g.lookPitch = -0.035;
      g.render();
      return {
        materials,
        response,
        left: { forward: left.forward, strafe: left.strafe },
        right: { forward: right.forward, strafe: right.strafe },
        blocked,
        clearances,
        clearanceErrors,
        baffles,
        dyes,
        lods,
        run,
        lightOn: Math.max(...on),
        lightOff: Math.max(...off),
        exposure,
        nightActive,
        nightExposure,
        reflection: r.reflection?.visible,
        assetErrors: r.assetErrors,
        viewport: [innerWidth, innerHeight],
        buffer: [r.renderer.domElement.width, r.renderer.domElement.height],
        lightPool: r.protocolLights.length,
      };
    });
    assert.deepEqual(result.assetErrors, []);
    assert.deepEqual(result.clearanceErrors, []);
    assert.equal(result.blocked, 0);
    assert.ok(result.baffles.every(Boolean));
    assert.equal(result.left.strafe, -1);
    assert.equal(result.right.strafe, 1);
    assert.equal(result.left.forward, 1);
    assert.ok(
      result.materials
        .filter((m) => /uniform|fabric/i.test(m.name))
        .every((m) => m.dye && m.roughness),
    );
    assert.ok(result.response.every((t) => t.colorSpace === "" && !t.flipY));
    assert.equal(new Set(result.dyes).size, 4);
    assert.ok(result.lods.some((o) => o.lod === 0) && result.lods.some((o) => o.lod === 1));
    assert.equal(result.run, "Run");
    assert.equal(result.reflection, false);
    assert.ok(result.lightOff < result.lightOn);
    assert.ok(result.exposure.every(Number.isFinite));
    assert.equal(result.nightActive, true);
    assert.ok(Number.isFinite(result.nightExposure));
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: `/workspace/screenshots/outpost-corridor/${label}-${device}.png`,
      timeout: 120000,
      animations: "disabled",
    });
    results.push({ device, ...result, errors });
    console.log(
      JSON.stringify({
        device,
        blocked: result.blocked,
        dyes: result.dyes,
        lightPool: result.lightPool,
        errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(
    `docs/graphics-benchmark/qa-${label}.json`,
    JSON.stringify(results, null, 2),
  );
}
