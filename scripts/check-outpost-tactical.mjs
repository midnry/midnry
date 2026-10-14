/** Native desktop/touch death, weapon, advice and optional cache checks. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  for (const [name, width, height, mobile] of [
    ["desktop", 1280, 800, false],
    ["mobile", 390, 844, true],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
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
      { timeout: 90000 },
    );
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.lockMouse = () => {};
    });
    await page.waitForFunction(
      () => !document.querySelector("midnry-fps").engine.connection.busy,
      null,
      { timeout: 25000 },
    );
    const connection = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine;
      const { connectionAdvice } = await import("/games/outpost-connection.js");
      const measured = g.connection.report;
      g.connection.report = connectionAdvice([210, 400, 200, 390], 0.7, 1);
      g.connection.refresh();
      return {
        measured: measured.latency,
        playEnabled: !g.$(".mf-start").disabled,
        advice: g.connection.report.advice,
      };
    });
    assert.ok(Number.isFinite(connection.measured));
    assert.equal(connection.playEnabled, true);
    assert.match(connection.advice, /available/);
    await page.locator(".mf-graphics").click();
    await page.locator(".mf-settings .mf-connection summary").click();
    assert.match(await page.locator(".mf-settings .mf-connectionadvice").innerText(), /available/);
    await page.screenshot({ path: `/workspace/screenshots/outpost-connection-${name}.png` });
    if (!mobile && !process.argv.includes('--no-cache')) {
      await page.locator(".mf-assetcache summary").click();
      await page.locator(".mf-saveassets").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("midnry-fps")
            .engine.assetCache.status.textContent.startsWith("Assets saved"),
        null,
        { timeout: 180000 },
      );
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await page.context().setOffline(true);
      const cached = await page.evaluate(async () => {
        const model = await fetch("/games/military/models/operator-v1.glb");
        const { ASSET_CACHE } = await import("/games/outpost-asset-manifest.js");
        const cache = await caches.open(ASSET_CACHE);
        return {
          bytes: (await model.arrayBuffer()).byteLength,
          keys: (await cache.keys()).map((r) => new URL(r.url).pathname),
          api: !!(await cache.match("/api/games/outpost")),
        };
      });
      assert.ok(cached.bytes > 1000000);
      assert.ok(cached.keys.length >= 35);
      assert.equal(cached.api, false);
      assert.equal(
        cached.keys.some((p) => p.endsWith(".html") || p.endsWith(".js")),
        false,
      );
      await page.context().setOffline(false);
      await page.locator(".mf-clearassets").click();
      await page.waitForFunction(() =>
        document
          .querySelector("midnry-fps")
          .engine.assetCache.status.textContent.includes("cleared"),
      );
      assert.match(await page.locator(".mf-cachestatus").innerText(), /cleared/);
    }
    await page.locator(".mf-settingsclose").click();
    const initial = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      Object.assign(g.player, { x: 3.5, y: 5.5, a: 0 });
      Object.assign(g.arena.entities[1], { x: 4.5, y: 5.5, a: Math.PI });
      g.protocolCache = null;
      g.military.frameProtocolArena = null;
      g.protocolUI.update(true);
      g.render();
      const before = JSON.stringify(g.arena.snapshot());
      g.render();
      return {
        pure: before === JSON.stringify(g.arena.snapshot()),
        assets: g.military.assetErrors,
        model: (() => {
          let found = false;
          g.military.soldier.scene.traverse((o) => {
            found ||= !!o.userData.originalOperator;
          });
          return found;
        })(),
        gunColor: g.military.realismWeaponMaterials.polymer.color.getHexString(),
        movingMagazine: !!g.military.rig.userData.carbine?.userData.carbineParts.magazine,
      };
    });
    assert.equal(initial.pure, true);
    assert.deepEqual(initial.assets, []);
    assert.equal(initial.model, true);
    assert.equal(initial.gunColor, "343b34");
    assert.equal(initial.movingMagazine, true);
    await page.screenshot({ path: `/workspace/screenshots/outpost-tactical-operator-${name}.png` });
    for (const kind of [
      "back-stab",
      "suppressed-shot",
      "back-breaker",
      "neck-breaker",
      "suffocation",
    ]) {
      const presentation = await page.evaluate((kind) => {
        const g = document.querySelector("midnry-fps").engine;
        g.reset();
        g.start();
        g.protocolUI.brief.close();
        for (const e of g.arena.entities) e.bot = false;
        Object.assign(g.player, { x: 3.5, y: 5.5, a: 0 });
        const attacker = g.arena.entities.find((e) => e.team === 1);
        Object.assign(attacker, { x: 3.6, y: 5.5 });
        g.arena.privateFor(attacker).killReadyAt = 0;
        g.arena.eliminate(attacker, g.selfId);
        g.arena.privateFor(g.player).deathScene.kind = kind;
        g.flushEvents();
        g.protocolCache = null;
        const start = performance.now();
        g.beginDeath(start);
        g.updateDeath(start + g.deathSequence.takedownDuration * 0.54);
        g.damageUntil = 0;
        g.$(".mf-toast").textContent = "";
        g.render();
        const r = g.military,
          pose = r.takedown;
        const snapshot = JSON.stringify(g.arena.snapshot());
        g.render();
        return {
          stage: g.deathStage,
          fall: g.deathProgress,
          kind: g.deathSequence.kind,
          readOnly: g.controls(),
          privateScene: pose.root.visible,
          pure: snapshot === JSON.stringify(g.arena.snapshot()),
          localHumans: !!pose.victim && !!pose.attacker,
          ownCamera: g.camera().id === g.selfId,
        };
      }, kind);
      assert.equal(presentation.stage, "takedown");
      assert.equal(presentation.fall, 0);
      assert.equal(presentation.kind, kind);
      assert.equal(presentation.privateScene, true);
      assert.equal(presentation.localHumans, true);
      assert.equal(presentation.pure, true);
      assert.equal(presentation.ownCamera, true);
      assert.equal(presentation.readOnly.fire, false);
      assert.equal(presentation.readOnly.forward, 0);
      assert.equal(await page.locator(".mf-deathskip").isVisible(), true);
      await page.screenshot({
        path: `/workspace/screenshots/outpost-takedown-${kind}-${name}.png`,
      });
      if (mobile) await page.locator(".mf-deathskip").tap();
      else await page.locator(".mf-deathskip").click();
      const skipped = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.render();
        return {
          stage: g.deathStage,
          fall: g.deathProgress,
          scene: g.military.takedown.root.visible,
        };
      });
      assert.equal(skipped.stage, "fall");
      assert.equal(skipped.scene, false);
      assert.ok(skipped.fall < 0.1);
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.updateDeath(g.deathSequence.at + g.deathSequence.duration + 1);
        g.render();
      });
      assert.equal(
        await page.evaluate(() => document.querySelector("midnry-fps").engine.spectator.active()),
        true,
      );
    }
    const pose = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine;
      g.reset();
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      Object.assign(g.player, { x: 3.5, y: 5.5, a: 0 });
      const victim = g.arena.entities.find((e) => e.team === 0 && e.id !== g.selfId),
        killer = g.arena.entities.find((e) => e.team === 1);
      Object.assign(victim, { x: 4.5, y: 5.5 });
      Object.assign(killer, { x: 4.6, y: 5.5 });
      g.arena.privateFor(killer).killReadyAt = 0;
      g.arena.eliminate(killer, victim.id);
      g.flushEvents();
      g.protocolCache = null;
      g.render();
      const actor = g.military.actors.get(victim.id);
      const { beginCombat } = await import("/games/outpost-protocol-combat.js");
      beginCombat(g.arena, killer);
      g.arena.time += 5.05;
      g.player.ammo = 0;
      g.arena.reload(g.player);
      g.arena.time += 0.45;
      g.protocolCache = null;
      g.protocolUI.update(true);
      g.render();
      return {
        action: actor.action,
        tPoseAction: !!actor.actions.TPose,
        deathWeight: actor.actions.Death.getEffectiveWeight(),
        magazineY: g.military.rig.userData.carbine.userData.carbineParts.magazine.position.y,
        skinBones: actor.model.getObjectByProperty("isSkinnedMesh", true)?.skeleton.bones.length,
        aliveSelf: g.player.hp > 0,
        scene: g.military.takedown.root.visible,
      };
    });
    assert.equal(pose.action, "Dead");
    assert.equal(pose.tPoseAction, false);
    assert.ok(pose.deathWeight > 0.99);
    assert.ok(pose.magazineY < -0.09);
    assert.ok(pose.skinBones > 20);
    assert.equal(pose.aliveSelf, true);
    assert.equal(pose.scene, false);
    await page.screenshot({ path: `/workspace/screenshots/outpost-reload-${name}.png` });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        name,
        operator: "loaded",
        takedowns: 5,
        victimOnly: "passed",
        skipThenFall: "passed",
        spectatorResume: "passed",
        corpsePose: "Dead; TPose never played",
        movingMagazine: "passed",
        weakConnection: "advisory; Play available",
        cache: mobile ? "desktop verified" : "offline asset hit; no API/documents cached",
        errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
