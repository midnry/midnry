/** Actual-render lighting comparison and gameplay checks for Blackout Protocol. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const before = process.argv.includes("--before");
const label = before ? "before" : "after";
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const results = [];
async function refresh(page, point) {
  await page.evaluate((point) => {
    const g = document.querySelector("midnry-fps").engine;
    if (point) Object.assign(g.player, { x: point.x, y: point.y });
    g.protocolCache = null;
    g.protocolUI.update(true);
  }, point || null);
}
async function tick(page, seconds) {
  await page.evaluate((seconds) => {
    const g = document.querySelector("midnry-fps").engine;
    for (let left = seconds; left > 1e-8; left -= 0.04) g.update(Math.min(0.04, left));
    g.protocolCache = null;
    g.protocolUI.update(true);
  }, seconds);
}
async function hold(page, mobile, seconds, selector = ".mf-protocol-hold") {
  if (!mobile) {
    await page.locator(".mf-shell").focus();
    await page.keyboard.down(selector === ".mf-fire" ? " " : "e");
    await tick(page, seconds);
    await page.keyboard.up(selector === ".mf-fire" ? " " : "e");
  } else {
    const rect = await page.locator(selector).boundingBox();
    assert.ok(rect && rect.width >= 44 && rect.height >= 44);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }],
    });
    await tick(page, seconds);
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  }
  await tick(page, 0.05);
}
try {
  for (const [name, width, height, mobile] of [
    ["desktop", 1280, 800, false],
    ["mobile", 390, 844, true],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "balanced", options: { adaptive: false } }),
      ),
    );
    await page.goto(base + "/games/outpost-zero.html?renderer=military");
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
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      Object.assign(g.player, { x: 3.5, y: 5.5, a: Math.atan2(8.5, 10.5), pitch: 0 });
      g.viewPitch = 0;
      g.protocolUI.update(true);
      g.render();
    });
    const stats = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      return {
        litPrograms: r.renderer.info.programs.length,
        drawCalls: r.renderer.info.render.calls,
        triangles: r.renderer.info.render.triangles,
      };
    });
    await page.screenshot({
      path: `/workspace/screenshots/outpost-lighting-${label}-lit-${name}.png`,
    });
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.arena.protocol.sabotage.powerUntil = g.time + 40;
      g.protocolCache = null;
      g.protocolUI.update(true);
      g.render();
      g.military.renderer.getContext().finish();
    });
    await page.screenshot({
      path: `/workspace/screenshots/outpost-lighting-${label}-blackout-${name}.png`,
    });
    const dark = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military,
        costs = [];
      for (let i = 0; i < 5; i++) {
        const t = performance.now();
        r.render();
        r.renderer.getContext().finish();
        costs.push(performance.now() - t);
      }
      costs.sort((a, b) => a - b);
      return {
        darkPrograms: r.renderer.info.programs.length,
        torchIntensity: r.protocolTorch.intensity,
        torchRange: r.protocolTorch.distance,
        fog: r.scene.fog.density,
        renderCostMs: Math.round(costs[2] * 10) / 10,
      };
    });
    let gameplay = null;
    if (!before) {
      assert.equal(
        dark.darkPrograms,
        stats.litPrograms,
        "power changes reuse compiled light shaders",
      );
      assert.ok(dark.torchIntensity > 80 && dark.torchRange >= 16 && dark.fog < 0.06);
      const loading = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.arena.protocol.sabotage.powerUntil = 0;
        for (const item of g.arena.protocol.mission.manifest) item.loaded = item.required;
        return g.arena.protocol.mission.loading;
      });
      await refresh(page, loading);
      await hold(page, mobile, 3.2);
      const tasks = await page.evaluate(
        () =>
          document.querySelector("midnry-fps").engine.protocolView().protocol.mission.flightTasks,
      );
      assert.equal(tasks.length, 3);
      for (const task of tasks) {
        await refresh(page, task);
        assert.equal(await page.locator(".mf-protocol-hold").isVisible(), true);
        await hold(page, mobile, task.duration + 0.2);
        assert.equal(
          await page.evaluate(
            (id) =>
              document
                .querySelector("midnry-fps")
                .engine.protocolView()
                .protocol.mission.flightTasks.find((t) => t.id === id).done,
            task.id,
          ),
          true,
        );
      }
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector("midnry-fps").engine.arena.protocol.mission.vehicle.autopilot,
        ),
        true,
      );
      await page.locator(".mf-protocol-infoopen").click();
      assert.match(
        await page.locator(".mf-protocol-tasks summary").innerText(),
        /Aircraft duties 3\/3/,
      );
      await page.screenshot({ path: `/workspace/screenshots/outpost-aircraft-duties-${name}.png` });
      await page.locator(".mf-protocol-infoclose").click();
      await page.waitForFunction(() => document.querySelector("midnry-fps").engine.running);
      const emergency = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.arena.entities.at(-1).hp = 0;
        return g.arena.protocol.emergency;
      });
      await refresh(page, emergency);
      await page.locator(".mf-protocol-emergency").click();
      await tick(page, 0.05);
      await tick(page, 15.2);
      const targetId = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        return g.arena.entities.find((e) => e.id !== g.selfId && e.hp > 0).id;
      });
      await page.locator(`[data-vote="${targetId}"]`).click();
      await tick(page, 0.05);
      await page.evaluate((targetId) => {
        const g = document.querySelector("midnry-fps").engine;
        for (const e of g.arena.entities.filter((e) => e.hp > 0 && e.id !== g.selfId).slice(0, 3))
          g.arena.action(e, {
            seq: g.arena.privateFor(e).actionSeq + 1,
            op: "vote",
            target: targetId,
          });
      }, targetId);
      await tick(page, 15.2);
      assert.equal(
        await page.evaluate(() => document.querySelector("midnry-fps").engine.arena.protocol.phase),
        "combat",
      );
      // Put this gunfire fixture in the connected cabin aisle. Only position
      // setup is synthetic: the vote, touch/keyboard hold, hits and result use
      // the same production UI and authoritative rules as a normal match.
      await page.evaluate((targetId) => {
        const g = document.querySelector("midnry-fps").engine;
        for (const e of g.arena.entities) {
          e.x = 10.5;
          e.y = 15.5;
        }
        Object.assign(g.player, { x: 8.5, y: 5.5, a: Math.PI / 2 });
        g.viewPitch = 0;
        Object.assign(
          g.arena.entities.find((e) => e.id === targetId),
          { x: 8.5, y: 8.5 },
        );
      }, targetId);
      await tick(page, 5.2);
      await page.evaluate(() => document.querySelector("midnry-fps").engine.render());
      assert.match(await page.locator(".mf-protocol-combatstats").innerText(), /6 vs 1/);
      assert.equal(await page.locator(".mf-protocol-actions").isVisible(), false);
      assert.equal(await page.locator(".mf-protocol-combattarget").isVisible(), true);
      if (mobile) {
        assert.equal(await page.locator(".mf-fire").isVisible(), true);
        assert.equal(await page.locator(".mf-reload").isVisible(), true);
      }
      await page.screenshot({ path: `/workspace/screenshots/outpost-last-stand-${name}.png` });
      await hold(page, mobile, 0.65, ".mf-fire");
      const final = await page.evaluate((targetId) => {
        const g = document.querySelector("midnry-fps").engine;
        return {
          phase: g.arena.protocol.phase,
          hp: g.arena.entities.find((e) => e.id === targetId).hp,
          otherHp: g.arena.entities
            .filter((e) => e.id !== targetId && e.id !== g.selfId)
            .map((e) => e.hp),
          firing: g.firing,
        };
      }, targetId);
      assert.equal(final.hp, 0);
      assert.equal(final.phase, "roam");
      assert.equal(final.firing, false);
      assert.equal(await page.locator(".mf-fire").isVisible(), false);
      gameplay = {
        aircraftDuties: "three real holds",
        autopilot: "healthy",
        majorityFight: "6 vs 1",
        weaponInput: mobile ? "native touch" : "keyboard",
        fightResolved: "passed",
      };
    }
    assert.deepEqual(errors, []);
    results.push({ name, ...stats, ...dark, gameplay, errors });
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  `/workspace/screenshots/outpost-systems-${label}.json`,
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify({ label, results }));
