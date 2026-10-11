import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const html = readFileSync(new URL("../public/games/outpost-zero.html", import.meta.url), "utf8");
const sim = readFileSync(new URL("../public/games/outpost-sim.js", import.meta.url), "utf8");
const content = readFileSync(
  new URL("../public/games/outpost-content.js", import.meta.url),
  "utf8",
);
const academy = readFileSync(
  new URL("../public/games/outpost-academy.js", import.meta.url),
  "utf8",
);
const art = readFileSync(new URL("../public/games/outpost-art.js", import.meta.url), "utf8");
const retention = readFileSync(
  new URL("../public/games/outpost-retention.js", import.meta.url),
  "utf8",
);
const progression = readFileSync(
  new URL("../public/games/outpost-progression.js", import.meta.url),
  "utf8",
);
const screenshotDir = fileURLToPath(new URL("../screenshots/", import.meta.url));
mkdirSync(screenshotDir, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const results = [];
    for (const mobile of [false, true]) {
      const page = await browser.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        hasTouch: mobile,
        isMobile: mobile,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("http://outpost.test/**", (route) =>
        route.fulfill({
          contentType: route.request().url().endsWith(".js") ? "text/javascript" : "text/html",
          body: route.request().url().endsWith("outpost-sim.js")
            ? sim
            : route.request().url().endsWith("outpost-content.js")
              ? content
              : route.request().url().endsWith("outpost-academy.js")
                ? academy
                : route.request().url().endsWith("outpost-art.js")
                  ? art
                  : route.request().url().endsWith("outpost-retention.js")
                    ? retention
                    : route.request().url().endsWith("outpost-progression.js")
                      ? progression
                      : html,
        }),
      );
      await page.goto("http://outpost.test/");
      await page.getByRole("button", { name: "LAST SIGNAL · SOLO", exact: true }).click();
      const rules = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        const ok = (x, msg) => {
          if (!x) throw Error(msg);
        };
        ok(g.mode === "signal" && g.combatants().length === 8, "eight-combatant setup");
        ok(new Set(g.combatants().map((e) => e.x + "," + e.y)).size === 8, "distinct spawns");
        ok(
          g.combatants().every((e) => g.canMove(e.x, e.y)),
          "walkable spawns",
        );
        ok(!g.wall(8, 8), "walkable final zone");
        g.running = true;
        g.state = "playing";
        const p = g.player,
          crate = g.crates.find((c) => c.x === 5.5 && c.y === 5.5),
          bot = g.enemies[0];
        p.x = 5.5;
        p.y = 6.8;
        p.a = -Math.PI / 2;
        bot.x = 5.5;
        bot.y = 4.5;
        g.enemies.slice(1).forEach((e) => (e.hp = 0));
        ok(!g.canMove(crate.x, crate.y), "crate collision");
        g.time = 0.2;
        g.shoot();
        ok(crate.hp === 40 && bot.hp === 100, "crate blocks enemy shot");
        g.time = 0.4;
        g.shoot();
        ok(
          crate.hp === 0 && g.cores.length === 1 && bot.hp === 100,
          "crate destruction drops one core",
        );
        g.damage(crate, 100, p);
        ok(g.cores.length === 1, "no duplicate drops");
        p.x = crate.x;
        p.y = crate.y;
        p.hp = 50;
        g.collectCores(p);
        ok(
          p.cores === 1 &&
            p.hp === 75 &&
            p.maxHp === 125 &&
            p.damage === 48 &&
            g.cores.length === 0,
          "permanent core health and damage",
        );
        g.cores.push({ x: p.x, y: p.y });
        g.collectCores(p);
        ok(p.cores === 2 && p.maxHp === 150 && p.hp === 100 && p.damage === 56, "stacking cores");
        g.reset();
        g.running = true;
        g.state = "playing";
        g.player.x = 3.5;
        g.player.y = 3.5;
        g.player.a = 0;
        const behind = g.enemies[0];
        behind.x = 6.5;
        behind.y = 3.5;
        g.enemies.slice(1).forEach((e) => (e.hp = 0));
        g.shoot();
        ok(behind.hp === 100, "walls block enemy shots");
        g.reset();
        g.running = true;
        g.state = "playing";
        g.player.x = 2.5;
        g.player.y = 13.5;
        const a = g.enemies[0],
          b = g.enemies[1];
        a.x = 10;
        a.y = 13.5;
        b.x = 12;
        b.y = 13.5;
        g.enemies.slice(2).forEach((e) => (e.hp = 0));
        a.attack = 0;
        g.time = 2;
        g.updateRival(a, 0.01);
        ok(b.hp < 100 && g.player.hp === 100, "bots fight each other");
        g.cores = [{ x: a.x, y: a.y }];
        g.collectCores(a);
        ok(a.cores === 1 && a.maxHp === 125 && a.damage === 24, "bot core boost");
        const path = g.pathTo({ x: 3.5, y: 3.5 }, { x: 6.5, y: 3.5 });
        ok(path.length > 0 && path.every((v) => !g.wall(v.x, v.y)), "path around cover");
        g.reset();
        const e = g.player;
        e.x = 13.5;
        e.y = 13.5;
        g.time = 11;
        g.updateZone();
        g.applyHaze(e, 1);
        ok(e.hp === 100 && g.zone.half === 7, "hazard grace period");
        g.time = 92;
        g.updateZone();
        ok(g.zone.half < 7 && g.zone.half > 0.6, "shrinking zone");
        let hp = e.hp;
        g.applyHaze(e, 1);
        const first = hp - e.hp;
        hp = e.hp;
        g.applyHaze(e, 1);
        ok(hp - e.hp > first, "exposure damage increases");
        e.x = 8;
        e.y = 8;
        g.applyHaze(e, 1);
        ok(e.exposure === 0, "safe zone clears exposure");
        g.time = 300;
        g.updateZone();
        ok(Math.abs(g.zone.half - 0.6) < 1e-8 && !g.outsideSafe(e), "minimum safe zone");
        e.x = 13;
        e.y = 13;
        hp = e.hp;
        g.applyHaze(e, 1);
        ok(hp - e.hp > first, "late haze damage increases");
        g.reset();
        g.running = true;
        g.state = "playing";
        g.enemies.forEach((e) => (e.hp = 0));
        g.checkResult();
        ok(
          g.state === "ended" &&
            !g.running &&
            g.$(".mf-toast").textContent === "LAST SIGNAL: YOURS",
          "last survivor victory",
        );
        g.reset();
        g.running = true;
        g.state = "playing";
        g.player.hp = 0;
        g.checkResult();
        ok(
          g.state === "ended" && !g.running && g.$(".mf-toast").textContent === "SIGNAL LOST",
          "player elimination",
        );
        g.reset();
        ok(
          g.player.cores === 0 && g.player.maxHp === 100 && g.player.damage === 40 && g.time === 0,
          "replay clears powers and timers",
        );
        return {
          spawn: true,
          crateCollision: true,
          crateDrops: true,
          coreBoosts: true,
          botCompetition: true,
          botBoosts: true,
          pathfinding: true,
          wallOcclusion: true,
          haze: true,
          winLoss: true,
          replay: true,
        };
      });
      await page.getByRole("button", { name: "DEPLOY" }).click();
      if (mobile) await page.getByRole("button", { name: "Fire weapon" }).tap();
      else await page.keyboard.press("Space");
      assert(
        (await page.evaluate(() => document.querySelector("midnry-fps").engine.ammo)) < 24,
        "quick fire input",
      );
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.player.x = 3.5;
        g.player.y = 13.5;
        g.player.a = -0.18;
        g.time = 62;
        g.updateZone();
        g.updateHUD();
        g.render();
      });
      await page.screenshot({
        path: `${screenshotDir}last-signal-${mobile ? "mobile" : "desktop"}.png`,
      });
      if (mobile) await page.getByRole("button", { name: "Pause game" }).click();
      else await page.keyboard.press("p");
      const pausedTime = await page.evaluate(
        () => document.querySelector("midnry-fps").engine.time,
      );
      await page.waitForTimeout(120);
      assert.equal(
        await page.evaluate(() => document.querySelector("midnry-fps").engine.time),
        pausedTime,
        "pause freezes time",
      );
      await page.getByRole("button", { name: "FIELD OPS", exact: true }).click();
      assert.equal(
        await page.evaluate(() => document.querySelector("midnry-fps").engine.mode),
        "training",
      );
      await page.getByRole("button", { name: "DEPLOY" }).click();
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.player.x = 5.5;
        g.player.y = 6.8;
        g.player.a = -Math.PI / 2;
        g.enemies[0].x = 5.5;
        g.enemies[0].y = 5.5;
        g.enemies.slice(1).forEach((e) => (e.hp = 0));
        for (let i = 0; i < 3; i++) {
          g.time += 0.2;
          g.shoot();
        }
        if (g.enemies[0].hp !== 0 || g.$(".mf-toast").textContent !== "CONTRACT COMPLETE")
          throw Error("training regression");
      });
      assert.deepEqual(errors, []);
      results.push({ mobile, rules, quickFire: true, pause: true, training: true, errors });
      await page.close();
    }
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
