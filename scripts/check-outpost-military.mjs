import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
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
    page.on("pageerror", (e) => errors.push(e.stack));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(base + "/games/outpost-zero.html?renderer=military");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      {
        timeout: 60000,
      },
    );
    const stats = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.mode = "signal";
      g.mapId = "outpost";
      g.reset();
      g.$(".mf-modal").hidden = true;
      g.player.x = 3.5;
      g.player.y = 2.5;
      g.player.a = 0;
      g.viewPitch = 0;
      g.crates = [];
      g.enemies.forEach((e, i) => {
        e.x = 5.5 + i * 0.4;
        e.y = 2.8 + i * 0.3;
        e.a = Math.PI;
        e.hp = 100;
      });
      const before = JSON.stringify(g.arena.snapshot());
      g.render();
      const info = g.military.renderer.info;
      return {
        assets: g.military.assetErrors,
        soldier: !!g.military.soldier,
        actors: g.military.actors.size,
        pure: before === JSON.stringify(g.arena.snapshot()),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
        renderer: g.military.renderer
          .getContext()
          .getParameter(g.military.renderer.getContext().RENDERER),
      };
    });
    console.log(JSON.stringify({ mobile, ...stats }));
    assert.equal(stats.pure, true);
    assert(stats.soldier);
    assert.deepEqual(stats.assets, []);
    if (!mobile) {
      const coverage = await page.evaluate(async () => {
        const { MAPS, WEAPONS } = await import("/games/outpost-content.js");
        const g = document.querySelector("midnry-fps").engine,
          r = g.military;
        const check = (condition, message) => {
          if (!condition) throw Error(message);
        };
        g.academy.preset = "performance";
        g.academy.options.shadows = false;
        for (const id of Object.keys(MAPS).filter((id) => !MAPS[id].protocolOnly)) {
          g.mapId = id;
          g.reset();
          r.render();
          check(r.mapKey === id, "map rebuild " + id);
          check(
            [...r.actors.values()].every((a) => Number.isFinite(a.root.position.y)),
            "finite actor position " + id,
          );
          check(!r.reflection.visible, "performance reflection disabled");
        }
        g.mapId = "outpost";
        g.reset();
        r.render();
        const beforeCount = r.materials.size;
        for (let cycle = 0; cycle < 2; cycle++)
          for (const id of Object.keys(WEAPONS)) {
            r.updateWeapon(id);
            check(r.weaponId === id && r.rig.children.length > 0, "loadout " + id);
            const canvas = document.createElement("canvas");
            canvas.width = 240;
            canvas.height = 112;
            const before = JSON.stringify(g.arena.snapshot());
            r.preview(canvas.getContext("2d"), id, 240, 112);
            check(before === JSON.stringify(g.arena.snapshot()), "preview leaves gameplay intact");
          }
        r.updateWeapon("carbine");
        check(r.materials.size <= beforeCount + 3, "bounded weapon material cache");
        g.player.x = 3.5;
        g.player.y = 2.5;
        g.player.a = 0;
        g.keys.add("a");
        check(g.controls().strafe === -1, "A strafes left");
        g.keys.clear();
        g.keys.add("d");
        check(g.controls().strafe === 1, "D strafes right");
        g.keys.clear();
        g.arena.advance(0.01, { [g.selfId]: { strafe: 1, aim: 0 } });
        check(g.player.y > 2.5, "simulation right strafe matches camera");
        r.render();
        const direction = new r.camera.position.constructor();
        r.camera.getWorldDirection(direction);
        check(direction.x > 0.999 && Math.abs(direction.z) < 0.001, "camera matches hitscan aim");
        const wallKey = r.wallKeys;
        g.level[3][4] = 0;
        r.rebuildWalls();
        check(r.wallKeys !== wallKey, "destroyed cover rebuilt");
        const actor = [...r.actors.values()][0];
        let samples = 0,
          last = null;
        for (let i = 0; i < 120; i++) {
          r.updateActors(i / 120);
          if (actor.lastSample !== last) {
            samples++;
            last = actor.lastSample;
          }
        }
        check(samples === 30, "character animation samples at 30 FPS");
        for (const kind of ["rocket", "barrage", "lob", "barrel", "poison", "echo"])
          g.arena.projectile(g.player, 0, 1, kind, 5);
        r.updateProjectiles(g.animationTime);
        check(r.projectiles.size === 6, "weapon-specific projectile meshes");
        g.arena.fields.push({ id: 1001, x: 4, y: 4, radius: 2, kind: "bramble" });
        r.updateFields();
        check(r.fields.size === 1, "damaging field visible");
        g.arena.fields = [];
        r.updateFields();
        check(r.fields.size === 0, "expired field cleaned up");
        g.mapId = "outpost";
        g.reset();
        g.academy.preset = "high";
        g.academy.options.shadows = g.academy.options.lighting = true;
        r.render();
        check(r.ao.enabled, "High contact shadows enabled");
        check(r.sun.shadow.mapSize.x === 2048, "High focused shadow resolution");
        check(r.sun.shadow.camera.right <= 26 && r.sun.shadow.camera.left >= -26, "shadow detail stays focused near the player");
        check(!r.rim.visible && !r.grade.enabled, "natural materials and motivated sources supply the look");
        check(r.reflection.getRenderTarget().width === 1024, "High reflection resolution");
        const supportedSamples = r.offscreenSamples;
        r.offscreenSamples = 0;
        r.lastPreset = "";
        r.render();
        check(r.fxaa.enabled && r.composer.renderTarget1.samples === 0, "antialiasing works without float multisampling");
        r.offscreenSamples = supportedSamples;
        r.lastPreset = "";
        g.academy.preset = "balanced";
        r.render();
        g.player.x = 3.5;
        g.player.y = 2.5;
        g.player.a = 0;
        g.crates = [];
        g.enemies.forEach((e, i) => {
          e.x = 5.5 + i * 0.4;
          e.y = 2.8 + i * 0.3;
          e.a = Math.PI;
          e.hp = 100;
        });
        g.render();
        return {
          maps: Object.keys(MAPS).filter((id) => !MAPS[id].protocolOnly).length,
          weapons: Object.keys(WEAPONS).length,
          animationSamples: samples,
          materials: r.materials.size,
        };
      });
      console.log(JSON.stringify({ coverage }));
    }
    await page.screenshot({
      path: `/workspace/screenshots/outpost-military-${mobile ? "mobile" : "desktop"}.png`,
    });
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
