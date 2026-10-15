import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile, isMobile: mobile });
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 60000 });
    await page.evaluate(() => { const g = document.querySelector("midnry-fps").engine; cancelAnimationFrame(g.frame); g.lockMouse = () => {}; });
    await page.getByRole("button", { name: "START SOLO", exact: false }).click();
    if (mobile) {
      await page.getByRole("button", { name: "Toggle sprint" }).click();
      await page.evaluate(() => { document.querySelector("midnry-fps").engine.touch.y = -1; });
      await page.getByRole("button", { name: "Slide while sprinting" }).dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch" });
    } else {
      await page.keyboard.down("Shift"); await page.keyboard.down("w"); await page.keyboard.press("c");
    }
    assert(await page.evaluate(() => document.querySelector("midnry-fps").engine.controls().slide));
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      // Use a clear lane to inspect the presentation without a nearby wall.
      g.player.x = 3.5; g.player.y = 2.5; g.player.a = 0;
      g.update(0.04); g.render();
    });
    assert(await page.evaluate(() => { const g = document.querySelector("midnry-fps").engine; return g.player.slideUntil > g.time; }));
    assert.equal(await page.locator(".mf-movement").innerText(), "SLIDING");
    if (!mobile) { await page.keyboard.up("w"); await page.keyboard.up("Shift"); }
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.arena.damage(g.player, 500, g.enemies[0]); g.checkResult();
      if (!g.deathSequence) throw new Error("Death sequence missing");
      if (!g.$(".mf-results").hidden) throw new Error("Results appeared before death animation");
      g.updateDeath(g.deathSequence.at + g.deathSequence.duration * 0.65); g.render();
    });
    assert(await page.locator(".mf-death").isVisible());
    assert.equal(await page.locator(".mf-results").isVisible(), false);
    assert(await page.evaluate(() => document.querySelector("midnry-fps").engine.military.camera.position.y < 1));
    if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.QA_SCREENSHOTS}/outpost-death-${mobile ? "mobile" : "desktop"}.png` });
    await page.evaluate(() => { const g = document.querySelector("midnry-fps").engine; g.updateDeath(g.deathSequence.at + g.deathSequence.duration + 1); });
    assert(await page.locator(".mf-results").isVisible());
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.state), "ended");
    await page.getByRole("button", { name: "REMATCH", exact: false }).click();
    assert.equal(await page.locator(".mf-results").isVisible(), false);
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.deathSequence), null);
    await page.evaluate(() => document.querySelector("midnry-fps").engine.render());
    if (mobile && process.env.QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.QA_SCREENSHOTS}/outpost-movement-mobile.png` });
    assert.deepEqual(errors, []); await page.close();
  }
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(base + "/games/outpost-zero.html?renderer=classic");
  await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.loading === false);
  await page.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine; cancelAnimationFrame(g.frame); g.lockMouse = () => {};
    g.mode = "duo"; g.reset(); g.start(); g.player.hp = 0;
    g.updateDeath(performance.now());
    if (g.deathSequence.duration !== 350) throw Error("Reduced-motion duration missing");
    g.updateDeath(g.deathSequence.at + 351);
    if (g.state === "ended" || !g.running || !g.$(".mf-results").hidden) throw Error("Living Duo partner should be spectated after death");
  });
  await page.close();
  console.log("Desktop/touch sprint and slide, delayed death results, camera collapse, replay reset, classic reduced-motion death and Duo spectating passed.");
} finally { await browser.close(); }
