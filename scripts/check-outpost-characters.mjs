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
    const result = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine,
        chars = g.characters;
      g.$(".mf-modal").hidden = true;
      const enemy = g.enemies[0];
      const before = JSON.stringify(g.arena.snapshot());
      const signatures = new Set(),
        states = ["idle", "walk", "fire", "reload", "hit", "down"];
      for (const state of states)
        for (let direction = 0; direction < 8; direction++) {
          const frames =
            state === "walk"
              ? 8
              : state === "reload"
                ? 6
                : state === "down"
                  ? 5
                  : state === "idle"
                    ? 4
                    : state === "fire"
                      ? 3
                      : 2;
          for (let frame = 0; frame < frames; frame++)
            signatures.add(chars.sprite(enemy, { state, frame, direction }).toDataURL());
        }
      const unchanged = before === JSON.stringify(g.arena.snapshot());
      const bound = chars.cache.size;
      const { WEAPONS } = await import("/games/outpost-content.js");
      const weapons = Object.values(WEAPONS);
      const sizes = [];
      for (const preset of ["performance", "balanced", "high"]) {
        g.academy.preset = preset;
        chars.clearCache();
        sizes.push(chars.sprite(enemy).width);
      }
      for (const w of weapons) chars.sprite({ ...enemy, weapon: w.id });
      const gallery = document.createElement("canvas");
      gallery.width = 1152;
      gallery.height = 630;
      const c = gallery.getContext("2d");
      c.fillStyle = "#252f40";
      c.fillRect(0, 0, gallery.width, gallery.height);
      const loadouts = ["carbine", "rocket", "venom"];
      for (let i = 0; i < 6; i++) {
        const sprite = chars.sprite(
          { ...enemy, weapon: loadouts[i % 3] },
          { state: i < 3 ? "idle" : "walk", frame: i < 3 ? 0 : 2, direction: i < 3 ? 0 : 1 },
        );
        c.drawImage(sprite, (i % 6) * 192, 30, 192, 288);
      }
      for (let i = 0; i < 6; i++) {
        const sprite = chars.sprite(enemy, {
          state: states[i],
          frame: i === 5 ? 3 : 2,
          direction: 0,
        });
        c.drawImage(sprite, i * 192, 330, 192, 288);
        c.fillStyle = "#fff2d3";
        c.font = "16px sans-serif";
        c.fillText(states[i], i * 192 + 65, 625);
      }
      gallery.id = "character-gallery";
      gallery.style = "position:fixed;inset:0;z-index:999999;width:100vw;height:auto";
      document.body.append(gallery);
      return { unchanged, bound, unique: signatures.size, sizes, weapons: weapons.length };
    });
    assert.equal(result.unchanged, true);
    assert.ok(result.bound <= 64);
    assert.ok(result.unique > 140);
    assert.deepEqual(result.sizes, [192, 288, 384]);
    assert.equal(result.weapons, 11);
    if (!mobile)
      await page
        .locator("#character-gallery")
        .screenshot({ path: "/tmp/outpost-character-gallery.png" });
    await page.evaluate(() => document.querySelector("#character-gallery").remove());
    const behavior = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        c = g.characters,
        e = g.enemies[0];
      g.time = 10;
      c.reset();
      c.observe();
      e.x += 0.05;
      g.time += 0.02;
      c.observe();
      const walk = c.pose(e).state;
      e.shotAt = g.time;
      const fire = c.pose(e).state;
      e.reloadUntil = g.time + 1;
      const reload = c.pose(e).state;
      e.hit = g.time;
      const hit = c.pose(e).state;
      e.hp = 0;
      c.observe();
      const down = c.pose(e).state,
        visible = c.defeatedVisible(e);
      g.time += 1;
      const expired = !c.defeatedVisible(e);
      e.hp = e.maxHp;
      c.observe();
      const revived = c.observed.get(e.id).deathAt === null;
      g.time = 2;
      c.observe();
      const reset = c.lastTime === 2;
      g.render();
      const frozen = JSON.stringify(c.pose(e));
      g.render();
      const pause = frozen === JSON.stringify(c.pose(e));
      return { walk, fire, reload, hit, down, visible, expired, revived, reset, pause };
    });
    assert.deepEqual(behavior, {
      walk: "walk",
      fire: "fire",
      reload: "reload",
      hit: "hit",
      down: "down",
      visible: true,
      expired: true,
      revived: true,
      reset: true,
      pause: true,
    });
    const rendering = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.reset();
      g.$(".mf-modal").hidden = true;
      g.player.x = 3.5;
      g.player.y = 2.5;
      g.player.a = 0;
      g.crates = [];
      for (const e of g.enemies) e.hp = 0;
      const e = g.enemies[0];
      e.hp = e.maxHp;
      e.x = 5.5;
      e.y = 2.5;
      e.a = Math.PI;
      g.characters.reset();
      g.characters.observe();
      let calls = 0;
      const original = g.characters.sprite.bind(g.characters);
      g.characters.sprite = (...args) => {
        calls++;
        return original(...args);
      };
      g.depth.fill(0.5);
      g.drawEnemies();
      const occluded = calls === 0;
      g.depth.fill(100);
      g.drawEnemies();
      const visible = calls === 1;
      g.characters.sprite = original;
      g.render();
      const times = [];
      for (let i = 0; i < 40; i++) {
        g.time += 1 / 60;
        const start = performance.now();
        g.render();
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      return { occluded, visible, p50: times[20], p95: times[38] };
    });
    assert.equal(rendering.occluded, true);
    assert.equal(rendering.visible, true);
    await page.screenshot({ path: `/tmp/outpost-character-${mobile ? "mobile" : "desktop"}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reduced = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        e = g.enemies[0];
      g.characters.observe();
      g.time += 0.8;
      return g.characters.pose(e).frame;
    });
    assert.equal(reduced, 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ mobile, ...result, behavior, rendering, reduced }));
    await page.close();
  }
} finally {
  await browser.close();
}
