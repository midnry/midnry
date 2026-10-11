import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
mkdirSync("/workspace/screenshots", { recursive: true });
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
    await page.locator(".mf-retention summary").click();
    await page.locator(".mf-difficulty").selectOption("easy");
    await page.locator(".mf-mapselect").selectOption("freight");
    await page.locator(".mf-weaponselect").selectOption("rocket");
    await page.locator(".mf-mode[data-mode=duo]").click();
    await page.locator(".mf-lockeropen").click();
    assert.ok(await page.locator(".mf-locker").isVisible());
    assert.notEqual(
      await page.locator('.mf-finish option[value="copper"]').getAttribute("disabled"),
      null,
    );
    await page.locator(".mf-lockerclose").click();
    await page.locator(".mf-volume").fill("25");
    await page.locator(".mf-mute").check();
    assert.ok(
      await page.evaluate(() => {
        const a = document.querySelector("midnry-fps").engine.retention.audio;
        return a.ctx.state === "running" && a.volume === 0.25 && a.muted;
      }),
    );
    await page.locator(".mf-start").click();
    // Controlled combat fixture uses real rules to finish a round and exercise the debrief.
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.time = 40;
      g.arena.cores.push({ x: g.player.x, y: g.player.y });
      g.arena.collectCores(g.player);
      for (const e of g.combatants().filter((e) => e.team !== g.player.team))
        g.arena.damage(e, 999, g.player);
      g.checkResult();
    });
    assert.ok(await page.locator(".mf-results").isVisible());
    assert.ok(
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        const r = g.$(".mf-results").getBoundingClientRect(),
          p = g.$(".mf-panel").getBoundingClientRect();
        return r.top >= p.top && r.top < p.bottom;
      }),
    );
    assert.match(await page.locator(".mf-resultstats").innerText(), /Team #1/);
    assert.match(await page.locator(".mf-resultstats").innerText(), /600/);
    assert.match(await page.locator(".mf-earned").innerText(), /\+157 XP/);
    const xp = await page.evaluate(
      () => document.querySelector("midnry-fps").engine.retention.profile.xp,
    );
    await page.evaluate(() => document.querySelector("midnry-fps").engine.retention.finish(true));
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.retention.profile.xp),
      xp,
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-debrief-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.locator(".mf-again").click();
    const quick = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      const x = g.player.x,
        ammo = g.player.ammo;
      g.shoot();
      g.arena.advance(0.05, { [g.selfId]: { forward: 1, fire: true } });
      return {
        mode: g.mode,
        map: g.mapId,
        weapon: g.weapon,
        difficulty: g.difficulty,
        countdown: g.arena.countdown,
        time: g.time,
        blocked: g.player.x === x && g.player.ammo === ammo,
      };
    });
    assert.equal(quick.mode, "duo");
    assert.equal(quick.map, "freight");
    assert.equal(quick.weapon, "rocket");
    assert.equal(quick.difficulty, "easy");
    assert.ok(quick.countdown > 0 && quick.countdown <= 2 && quick.blocked);
    assert.equal(quick.time, 0);
    await page.waitForFunction(() => document.querySelector("midnry-fps").engine.time > 0);
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.time = 40;
      for (const e of g.combatants().filter((e) => e.team !== g.player.team))
        g.arena.damage(e, 999, g.player);
      g.checkResult();
    });
    await page.locator(".mf-lockeropen").click();
    await page.locator(".mf-finish").selectOption("copper");
    assert.ok(
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          before = JSON.stringify(g.arena.snapshot());
        g.render();
        return (
          g.retention.finishColor() === "#cb8750" && before === JSON.stringify(g.arena.snapshot())
        );
      }),
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-locker-${mobile ? "mobile" : "desktop"}.png`,
    });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.reload();
    assert.ok(
      await page.evaluate(() => {
        const r = document.querySelector("midnry-fps").engine.retention;
        return (
          r.profile.skin === "copper" &&
          r.profile.matches === 2 &&
          r.audio.muted &&
          r.audio.volume === 0.25
        );
      }),
    );
    // A guest who misses the ended snapshot must still switch to the next round.
    assert.ok(
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        const next = new g.arena.constructor({
          mode: "duo",
          difficulty: "hard",
          countdown: 2,
          humans: [
            { id: "guest", team: 0 },
            { id: "host", team: 0 },
          ],
        });
        g.selfId = "guest";
        g.online = { phase: "playing", host: "host", code: "ABC234" };
        g.state = "ended";
        g.retention.summary = { won: false };
        g.applyRoom({
          phase: "playing",
          host: "host",
          code: "ABC234",
          mode: "duo",
          difficulty: "hard",
          mapId: "outpost",
          arena: next.snapshot(),
          members: [
            { id: "guest", name: "Guest", team: 0, weapon: "carbine", connected: true },
            { id: "host", name: "Host", team: 0, weapon: "carbine", connected: true },
          ],
        });
        const ok =
          g.running &&
          g.state === "playing" &&
          g.retention.summary === null &&
          g.arena.roundId === next.roundId &&
          g.$(".mf-difficulty").disabled;
        g.online = null;
        g.reset();
        g.pause();
        return ok;
      }),
    );
    // Boot Camp never awards match XP, even if its targets are eliminated.
    const savedXp = await page.evaluate(
      () => document.querySelector("midnry-fps").engine.retention.profile.xp,
    );
    await page.locator(".mf-boot").click();
    assert.equal(
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.retention.finish(true);
        g.checkResult();
        return g.retention.profile.xp;
      }),
      savedXp,
    );
    await page.evaluate(() => document.querySelector("midnry-fps").engine.academy.finish());
    // Teardown releases the audio context and the component's event subscriptions.
    await page.locator(".mf-start").click();
    await page.evaluate(() => {
      const el = document.querySelector("midnry-fps");
      window.oldAudio = el.engine.retention.audio.ctx;
      el.remove();
    });
    await page.waitForFunction(() => window.oldAudio.state === "closed");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${mobile ? "Mobile" : "Desktop"}: results, XP, rematch, countdown, cosmetic isolation, storage and audio teardown passed`,
    );
  }
} finally {
  await browser.close();
}
