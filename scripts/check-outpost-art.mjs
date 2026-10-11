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
    const positions = {
      outpost: [3.5, 4.5, Math.PI],
      testblock: [4.5, 2.5, 2.8],
      skyport: [8.5, 10.5, Math.PI],
      freight: [8.5, 10.5, Math.PI],
      estate: [12.5, 11.5, 0],
    };
    for (const [id, position] of Object.entries(positions)) {
      await page.locator(".mf-mapselect").selectOption(id);
      const result = await page.evaluate(
        ({ position }) => {
          const g = document.querySelector("midnry-fps").engine;
          g.$(".mf-modal").hidden = true;
          g.player.x = position[0];
          g.player.y = position[1];
          g.player.a = position[2];
          g.art.observe();
          g.render();
          const before = JSON.stringify(g.arena.snapshot());
          const sprite = g.art.scenery(g.art.extras()[0]);
          g.render();
          return {
            extras: g.art.extras().length,
            sprite: sprite.width,
            unchanged: before === JSON.stringify(g.arena.snapshot()),
            inside: g.art.interior({ id: g.arena.mapId }, g.player),
            walkable: g.canMove(g.player.x, g.player.y),
          };
        },
        { position },
      );
      assert(result.extras >= 3);
      assert(result.sprite >= 128);
      assert(result.unchanged);
      assert(result.walkable);
      await page.screenshot({
        path: `/workspace/screenshots/outpost-art-${id}-${mobile ? "mobile" : "desktop"}.png`,
      });
      await page.evaluate(
        () => (document.querySelector("midnry-fps").engine.$(".mf-modal").hidden = false),
      );
    }
    const effects = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.mapId = "outpost";
      g.mode = "signal";
      g.reset();
      g.art.observe();
      const foe = g.enemies[0];
      g.arena.damage(foe, 20, g.player);
      g.art.observe();
      const hitParticles = g.art.particles.length;
      const tile = g.level
        .flatMap((row, y) => row.map((v, x) => ({ v, x, y })))
        .find((e) => e.v && e.x > 0 && e.y > 0 && e.x < 15 && e.y < 15);
      g.arena.breakCover(tile.x + 0.5, tile.y + 0.5, 0.7);
      g.art.observe();
      const debris = g.art.particles.length > hitParticles;
      const before = g.arena.snapshot();
      g.render();
      const cosmetic = JSON.stringify(before) === JSON.stringify(g.arena.snapshot());
      g.player.x = 2.5;
      g.player.y = 2.5;
      g.player.a = Math.PI;
      g.player.pitch = 0;
      g.arena.shoot(g.player);
      g.art.observe();
      const marks = g.art.marks.length,
        shells = g.art.weaponParticles.some((p) => p.kind === "shell"),
        smoke = g.art.weaponParticles.some((p) => p.kind === "smoke");
      g.arena.reload(g.player);
      g.render();
      const saved = g.art.weaponSaved;
      g.academy.preset = "performance";
      for (let i = 0; i < 40; i++) g.art.burst(2, 2, 0.4, "#fff", 50);
      const bounded = g.art.particles.length <= 80;
      const state = JSON.stringify({ particles: g.art.particles, marks: g.art.marks });
      g.pause();
      g.render();
      const pause = state === JSON.stringify({ particles: g.art.particles, marks: g.art.marks });
      g.reset();
      return {
        hitParticles,
        debris,
        cosmetic,
        marks,
        shells,
        smoke,
        saved,
        bounded,
        pause,
        reset: g.art.particles.length === 0 && g.art.marks.length === 0,
      };
    });
    assert(effects.hitParticles > 0);
    for (const key of ["debris", "cosmetic", "shells", "smoke", "bounded", "pause", "reset"])
      assert(effects[key], key);
    assert(effects.marks > 0);
    assert.equal(effects.saved, false);
    const reloads = await page.evaluate(async () => {
      const { WEAPONS } = await import("/games/outpost-content.js");
      const g = document.querySelector("midnry-fps").engine;
      let count = 0;
      for (const w of Object.values(WEAPONS)) {
        g.player.weapon = w.id;
        g.player.ammo = w.mag - 1;
        g.player.reloadUntil = 0;
        g.arena.reload(g.player);
        g.arena.time += 0.7;
        g.render();
        const matrix = g.ctx.getTransform();
        if (matrix.a !== 1 || matrix.d !== 1 || matrix.e !== 0 || matrix.f !== 0)
          throw Error("Weapon transform leaked");
        count++;
      }
      g.reset();
      return count;
    });
    assert.equal(reloads, 11);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.art.motion.matches),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        mobile,
        maps: "five decorated",
        effects,
        reducedMotion: true,
        reloads,
        errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
