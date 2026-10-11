import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 60000 },
    );
    console.log("Loaded equipment UI", { mobile });
    await page.getByRole("button", { name: "Field Guide", exact: true }).click();
    assert.equal(await page.locator(".mf-inspectweapon").count(), 11);
    const weapons = await page.evaluate(async () =>
      Object.keys((await import("/games/outpost-content.js")).WEAPONS),
    );
    for (const id of weapons) {
      const image = page.locator(`[data-inspect="${id}"] img`);
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((image) => image.decode());
      assert.equal(await image.evaluate((x) => x.naturalWidth), 960);
      await page.locator(`[data-inspect="${id}"]`).click();
      await page.locator(".mf-weaponinspect img").evaluate((image) => image.decode());
      assert.equal(await page.locator(".mf-weaponinspect").evaluate((x) => x.open), true);
      if (process.env.QA_SCREENSHOTS && id === "carbine")
        await page.screenshot({
          path: `${process.env.QA_SCREENSHOTS}/outpost-weapon-inspection-${mobile ? "mobile" : "desktop"}.png`,
        });
      await page.getByRole("button", { name: "Close weapon inspection" }).click();
      assert.equal(await page.locator(".mf-book").evaluate((x) => x.open), true);
    }
    await page.locator(".mf-bookclose").click();
    await page.getByRole("button", { name: "Locker", exact: true }).click();
    assert.equal(await page.locator(".mf-outfitcard").count(), 10);
    const outfits = await page.evaluate(async () =>
      Object.keys((await import("/games/outpost-content.js")).OUTFITS),
    );
    for (const id of outfits) {
      const card = page.locator(`[data-outfit="${id}"]`);
      await card.scrollIntoViewIfNeeded();
      await card.locator("img").evaluate((image) => image.decode());
      await card.click();
      assert.equal(
        await page.locator(`[data-outfit="${id}"]`).getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await page.evaluate(() => document.querySelector("midnry-fps").engine.player.outfit),
        id,
      );
      assert.equal(await page.evaluate(() => localStorage.getItem("midnry-outpost-outfit")), id);
    }
    if (process.env.QA_SCREENSHOTS) {
      await page.locator(".mf-outfitcard").first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${process.env.QA_SCREENSHOTS}/outpost-locker-${mobile ? "mobile" : "desktop"}.png`,
      });
    }
    await page.locator(".mf-lockerclose").click();
    await page.locator(".mf-outfitselect").selectOption("medic");
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.player.outfit),
      "medic",
    );
    assert.equal(await page.locator(".mf-outfitpreview").getAttribute("alt"), "Rescue Medic");
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 60000 },
    );
    assert.equal(await page.locator(".mf-outfitselect").inputValue(), "medic");
    const coverage = await page.evaluate(async () => {
      const { WEAPONS, OUTFITS } = await import("/games/outpost-content.js");
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      cancelAnimationFrame(g.frame);
      g.ui.refresh = () => {};
      const before = JSON.stringify(g.arena.snapshot());
      r.render();
      assertNoMutation();
      function assertNoMutation() {
        if (before !== JSON.stringify(g.arena.snapshot()))
          throw Error("Renderer mutated simulation");
      }
      const bot = g.enemies[0],
        ids = Object.keys(WEAPONS),
        uniforms = Object.keys(OUTFITS);
      let maximum = 0,
        baseline = 0;
      for (let pass = 0; pass < 3; pass++)
        for (let i = 0; i < ids.length; i++) {
          bot.weapon = ids[i];
          bot.outfit = uniforms[i % uniforms.length];
          r.render();
          const a = r.actors.get(bot.id);
          if (
            a.weapon !== bot.weapon ||
            a.outfit !== bot.outfit ||
            !a.equipment.children.length ||
            a.wardrobe.name !== "outfit-" + bot.outfit
          )
            throw Error("AI equipment not visible");
          if (!a.weaponAnchor) throw Error("Weapon not attached to hand");
          if (pass === 0 && i === 0) baseline = r.materials.size;
          maximum = Math.max(maximum, r.materials.size);
        }
      return { baseline, maximum, final: r.materials.size };
    });
    assert.ok(coverage.final <= coverage.baseline + 20, JSON.stringify(coverage));
    console.log("Verified 11 inspections, 10 outfits, persistence and actor equipment", {
      mobile,
      ...coverage,
    });
    if (process.env.QA_SCREENSHOTS) {
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        g.$(".mf-modal").hidden = true;
        g.player.x = 5.5;
        g.player.y = 1.2;
        g.player.a = Math.PI / 2;
        g.viewPitch = 0;
        g.enemies = g.enemies.slice(0, 3);
        g.enemies.forEach((e, i) => {
          e.x = 4.8 + i * 0.7;
          e.y = 2.8;
          e.a = -Math.PI / 2;
          e.hp = 100;
          e.weapon = ["rocket", "carbine", "reaper"][i];
          e.outfit = ["hazard", "medic", "sentinel"][i];
        });
        g.render();
      });
      await page.screenshot({
        path: `${process.env.QA_SCREENSHOTS}/outpost-equipped-ai-${mobile ? "mobile" : "desktop"}.png`,
      });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  const classic = await browser.newPage();
  await classic.goto(base + "/games/outpost-zero.html?renderer=classic");
  await classic.waitForFunction(
    () => document.querySelector("midnry-fps")?.engine?.loading === false,
  );
  await classic.locator(".mf-outfitselect").selectOption("hazard");
  assert.equal(
    await classic.evaluate(() => document.querySelector("midnry-fps").engine.player.outfit),
    "hazard",
  );
  await classic.getByRole("button", { name: "Field Guide", exact: true }).click();
  await classic.locator('[data-inspect="rocket"]').click();
  assert(await classic.locator(".mf-weaponinspect").evaluate((d) => d.open));
  await classic.close();
  console.log("Weapon manual, outfit selection, AI equipment and classic fallback passed.");
} finally {
  await browser.close();
}
