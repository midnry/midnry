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
      hasTouch: mobile,
      isMobile: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.characters);
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      return Promise.all([g.characters.ready, g.weapons.ready, g.environment.ready]);
    });
    const result = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine,
        c = g.characters;
      cancelAnimationFrame(g.frame);
      g.$(".mf-modal").hidden = true;
      g.player.x = 3.5;
      g.player.y = 2.5;
      g.player.a = 0;
      g.crates = [];
      g.enemies.forEach((e, i) => {
        e.x = 5.5 + i * 0.3;
        e.y = 2.5 + (i - 3) * 0.2;
        e.a = Math.PI;
      });
      const e = g.enemies[0];
      e.hit = e.shotAt = -10;
      e.reloadUntil = 0;
      e.phase = 0;
      let changes = 0,
        last = -1;
      const images = new Set();
      for (let i = 0; i < 120; i++) {
        g.time = i / 120;
        c.observed.set(e.id, { movingUntil: 2, hp: e.hp, x: e.x, y: e.y });
        const pose = c.pose(e);
        if (pose.frame !== last) {
          changes++;
          images.add(c.sprite(e).toDataURL());
        }
        last = pose.frame;
      }
      const walkChanges = changes,
        uniqueWalk = images.size;
      changes = 0;
      last = -1;
      c.observed.get(e.id).movingUntil = 0;
      for (let i = 0; i < 120; i++) {
        g.time = i / 120;
        const p = c.pose(e);
        if (p.frame !== last) changes++;
        last = p.frame;
      }
      const idleChanges = changes;
      // A local presentation clock advances between authoritative 10Hz snapshots.
      g.online = { phase: "playing" };
      const onlineFrames = new Set();
      for (let i = 0; i < 120; i++) {
        g.time = Math.floor(i / 12) / 10;
        g.visualTime = i / 120;
        onlineFrames.add(c.pose(e).frame);
      }
      g.online = null;
      const onlineSamples = onlineFrames.size;
      g.time = 20;
      c.reset();
      g.render();
      let imageDraws = 0;
      const old = g.ctx.drawImage.bind(g.ctx);
      g.ctx.drawImage = (...args) => {
        imageDraws++;
        return old(...args);
      };
      const before = JSON.stringify(g.arena.snapshot());
      g.drawEnemies();
      const unchanged = before === JSON.stringify(g.arena.snapshot());
      g.ctx.drawImage = old;
      // Run at actual display callbacks rather than a tight drawing loop. This is
      // a headless cadence/performance check, not proof of physical 120Hz hardware.
      const work = [],
        intervals = [];
      let previous = null,
        clockStart = null;
      for (let i = 0; i < 240; i++) {
        const now = await new Promise(requestAnimationFrame);
        if (previous !== null) intervals.push(now - previous);
        previous = now;
        if (clockStart === null) clockStart = now;
        g.time = 20 + (now - clockStart) / 1000;
        g.player.a = 0.04 * Math.sin(i / 120);
        g.updateZone();
        for (const actor of g.enemies)
          c.observed.set(actor.id, {
            movingUntil: g.time + 1,
            hp: actor.hp,
            x: actor.x,
            y: actor.y,
          });
        const start = performance.now();
        g.render();
        const cost = performance.now() - start;
        if (g.budget.sample(cost, now, true, g.academy.options.adaptive)) g.resize();
        if (i >= 120) work.push(cost);
      }
      work.sort((a, b) => a - b);
      g.updateHUD();
      return {
        walkChanges,
        uniqueWalk,
        idleChanges,
        onlineSamples,
        imageDraws,
        unchanged,
        target: g.budget.target,
        measuredFPS: g.budget.fps,
        width: g.w,
        scale: g.budget.scale,
        workP50: work[Math.floor(work.length * 0.5)],
        workP95: work[Math.floor(work.length * 0.95)],
      };
    });
    assert.equal(result.target, 120);
    assert.equal(result.walkChanges, 30);
    assert.ok(result.uniqueWalk >= 15);
    assert.equal(result.idleChanges, 30);
    assert.equal(result.onlineSamples, 30);
    assert.ok(result.imageDraws < 30);
    assert.equal(result.unchanged, true);
    assert.ok(result.scale >= 0.5 && result.scale <= 1);
    assert.ok(result.workP50 < 8.33, JSON.stringify(result));
    assert.ok(result.workP95 < 16.67, JSON.stringify(result));
    await page.screenshot({
      path: `/workspace/screenshots/outpost-performance-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.close();
    console.log(JSON.stringify({ mobile, ...result }));
    assert.deepEqual(errors, []);
  }
  const page = await browser.newPage();
  await page.goto(base + "/games/outpost-zero.html");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const checkbox = page.getByLabel("Automatic resolution");
  assert.equal(await checkbox.isChecked(), true);
  await checkbox.uncheck();
  assert.ok(
    await page.getByRole("dialog", { name: "Apply graphics changes?", exact: true }).isVisible(),
  );
  assert.ok(
    (await page.locator(".mf-confirm").textContent()).includes("Automatic resolution: off"),
  );
  await page.locator(".mf-confirmapply").click();
  await page.waitForFunction(
    () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
  );
  await page.reload();
  assert.equal(
    await page.evaluate(() => document.querySelector("midnry-fps").engine.academy.options.adaptive),
    false,
  );
  console.log("Adaptive resolution confirmation and saved preference passed.");
  await page.close();
} finally {
  await browser.close();
}
