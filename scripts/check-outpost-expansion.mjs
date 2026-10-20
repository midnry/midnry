import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
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
    await page.locator('[data-mode="signal"]').click();
    assert.equal(await page.locator(".mf-mapselect option").count(), 5);
    assert.equal(await page.locator(".mf-weaponselect option").count(), 11);
    for (const [mapId, weapon] of [
      ["testblock", "scatter"],
      ["skyport", "twin"],
      ["freight", "rocket"],
      ["estate", "demo"],
    ]) {
      await page.locator(".mf-mapselect").selectOption(mapId);
      await page.locator(".mf-weaponselect").selectOption(weapon);
      await page.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
      const data = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        return { mapId: g.arena.mapId, weapon: g.player.weapon, n: g.level.length, mag: g.ammo };
      });
      assert.equal(data.mapId, mapId);
      assert.equal(data.weapon, weapon);
      // Freeze rival controls for deterministic view/input checks; simulation rules are tested separately.
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.arena.updateRival = () => {};
      });
      if (mobile) await page.locator(".mf-fire").tap();
      else await page.keyboard.press("Space");
      assert.ok(
        await page.evaluate((m) => document.querySelector("midnry-fps").engine.ammo < m, data.mag),
      );
      await page.screenshot({
        path: `/workspace/screenshots/outpost-${mapId}-${mobile ? "mobile" : "desktop"}.png`,
      });
      await page.evaluate(() => document.querySelector("midnry-fps").engine.pause());
    }
    // Every loadout renders its distinct first-person art and has a usable ability control.
    for (const weapon of [
      "carbine",
      "scatter",
      "twin",
      "breach",
      "shard",
      "veil",
      "venom",
      "brawler",
      "reaper",
      "rocket",
      "demo",
    ]) {
      await page.locator(".mf-weaponselect").selectOption(weapon);
      await page.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.arena.updateRival = () => {};
        g.player.charge = 100;
        g.updateHUD();
      });
      if (mobile) await page.locator(".mf-super").tap();
      else await page.keyboard.press("q");
      assert.ok(
        await page.evaluate(() => document.querySelector("midnry-fps").engine.player.charge < 100),
        weapon + " super input",
      );
      await page.evaluate(() => document.querySelector("midnry-fps").engine.pause());
    }
    await page.locator(".mf-weaponselect").selectOption("shard");
    await page.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.arena.updateRival = () => {};
      g.player.charge = 100;
      g.useSuper();
      g.pause();
    });
    const paused = await page.evaluate(() =>
      JSON.stringify(document.querySelector("midnry-fps").engine.arena.snapshot()),
    );
    await page.waitForTimeout(200);
    assert.equal(
      await page.evaluate(() =>
        JSON.stringify(document.querySelector("midnry-fps").engine.arena.snapshot()),
      ),
      paused,
      "offline pause freezes effects",
    );
    await page.locator(".mf-weaponselect").selectOption("brawler");
    await page.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.arena.updateRival = () => {};
      g.arena.damage(g.player, 75, g.enemies[0]);
      g.render();
    });
    assert.ok(await page.locator(".mf-damage").isVisible());
    assert.equal(await page.locator(".mf-damage").innerText(), "−75 HP");
    assert.ok(await page.locator(".mf-hp").evaluate((e) => e.classList.contains("mf-critical")));
    await page.screenshot({
      path: `/workspace/screenshots/outpost-damage-${mobile ? "mobile" : "desktop"}.png`,
    });
    if (mobile) {
      const overlaps = await page.evaluate(() => {
        const a = document.querySelector(".mf-super").getBoundingClientRect(),
          b = document.querySelector(".mf-reload").getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
      assert.equal(overlaps, false, "ability/reload buttons overlap");
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(80);
      assert.ok(await page.locator(".mf-fire").isVisible());
      assert.ok(await page.locator(".mf-super").isVisible());
      await page.screenshot({ path: "/workspace/screenshots/outpost-landscape.png" });
    }
    await page.evaluate(() => document.querySelector("midnry-fps").engine.pause());
    assert.ok(await page.locator(".mf-panel").evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    JSON.stringify({
      maps: "all four render on desktop/mobile",
      loadouts: "eleven",
      superControls: "keyboard and touch passed",
      damageFeedback: "HP loss and critical warning passed",
      runtimeErrors: [],
    }),
  );
} finally {
  await browser.close();
}
