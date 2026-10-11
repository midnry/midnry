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
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
    { width: 844, height: 390 },
  ]) {
    const mobile = viewport.width < 900;
    const page = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/games/outpost-zero.html");
    for (const name of ["Play Solo", "Play Duo", "Play Online"])
      assert.ok(await page.getByRole("button", { name, exact: true }).isVisible());
    assert.equal(await page.locator(".mf-network").isVisible(), false);
    // Larger accessible text may require scrolling in compact windows.
    // The primary action must remain reachable without horizontal scrolling.
    await page.locator(".mf-start").scrollIntoViewIfNeeded();
    assert.ok(
      await page.locator(".mf-start").evaluate((e) => {
        const r = e.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight;
      }),
    );
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: `/workspace/screenshots/outpost-ui-${viewport.width}x${viewport.height}.png`,
    });
    const illustrations = await page.evaluate(async () => {
      const g = document.querySelector("midnry-fps").engine,
        maps = new Set(),
        weapons = new Set();
      for (const option of g.$(".mf-mapselect").options) {
        g.mapId = option.value;
        g.updateKit();
        maps.add(g.$(".mf-mappreview").toDataURL());
      }
      for (const option of g.$(".mf-weaponselect").options) {
        g.weapon = option.value;
        g.updateKit();
        weapons.add(g.$(".mf-weaponpreview").toDataURL());
      }
      g.mapId = "outpost";
      g.weapon = "carbine";
      g.reset();
      return { maps: maps.size, weapons: weapons.size };
    });
    assert.deepEqual(illustrations, { maps: 5, weapons: 11 });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "Settings", exact: true });
    assert.ok(await settings.getByLabel("Bot difficulty").isVisible());
    assert.ok(await settings.getByLabel("Sound volume").isVisible());
    assert.ok(await settings.getByLabel("Graphics preset").isVisible());
    await settings.getByLabel("Graphics preset").selectOption("performance");
    await page.locator(".mf-confirmapply").click();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    await settings.getByLabel("Bot difficulty").selectOption("easy");
    assert.ok(await settings.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
    await page.screenshot({
      path: `/workspace/screenshots/outpost-settings-${viewport.width}x${viewport.height}.png`,
    });
    await page.keyboard.press("Escape");
    assert.equal(await settings.isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement.className), "mf-graphics");
    await page.getByRole("button", { name: "Play Online", exact: true }).click();
    assert.ok(await page.locator(".mf-network").isVisible());
    assert.equal(await page.evaluate(() => document.activeElement.className), "mf-codeinput");
    await page.getByRole("button", { name: "Play Solo", exact: true }).click();
    assert.equal(await page.locator(".mf-network").isVisible(), false);
    await page.getByRole("button", { name: "Play Duo", exact: true }).focus();
    await page.keyboard.press("Space");
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.mode),
      "duo",
    );
    await page.evaluate(() => {
      document.querySelector("midnry-fps").engine.lockMouse = () => {};
    });
    await page.locator(".mf-start").click();
    await page.keyboard.press("p");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const time = await page.evaluate(() => document.querySelector("midnry-fps").engine.time);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.time), time);
    await page.keyboard.press("Escape");
    await page.locator(".mf-start").click();
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.running),
      true,
    );
    if (mobile)
      for (const selector of [".mf-fire", ".mf-reload"])
        assert.ok(
          await page.locator(selector).evaluate((e) => e.clientWidth >= 44 && e.clientHeight >= 44),
        );
    await page.goto(base + "/games/outpost-zero.html?room=ABC234");
    assert.ok(await page.locator(".mf-network").isVisible());
    assert.equal(await page.locator(".mf-codeinput").inputValue(), "ABC234");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${viewport.width}x${viewport.height}: play choices, 16 previews, unified settings, keyboard, pause/resume and invite passed`,
    );
  }
} finally {
  await browser.close();
}
