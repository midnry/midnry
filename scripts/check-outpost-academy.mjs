import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/games/outpost-zero.html");
    await page.getByRole("button", { name: "Field Guide", exact: true }).click();
    assert.equal(await page.locator(".mf-mapdiagram").count(), 5);
    assert.equal(await page.locator(".mf-guidegrid article").count(), 16);
    assert.equal(
      await page.locator(".mf-book").evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      true,
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-guide-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.getByRole("button", { name: "BACK", exact: true }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Graphics preset").selectOption("high");
    await page.locator(".mf-confirmapply").click();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    assert.equal(
      await page.evaluate(
        () => document.querySelector("midnry-fps").engine.academy.options.texture,
      ),
      512,
    );
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.reload();
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.academy.preset),
      "high",
    );
    await page.evaluate(() => {
      document.querySelector("midnry-fps").engine.lockMouse = () => {};
    });
    await page.getByRole("button", { name: "Tutorial", exact: true }).click();
    await page.evaluate(() => {
      if (document.pointerLockElement) document.exitPointerLock();
    });
    await page.locator(".mf-shell").focus();
    if (mobile) {
      const box = await page.locator(".mf-stick").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + 5);
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step !== 0,
      );
      await page.mouse.up();
    } else {
      await page.keyboard.down("w");
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step !== 0,
      );
      await page.keyboard.up("w");
    }
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.academy.step === 1,
    );
    // Stationary target directly ahead; exercise the actual firing input and damage rules.
    if (mobile) {
      const fire = await page.locator(".mf-fire").boundingBox();
      await page.mouse.move(fire.x + fire.width / 2, fire.y + fire.height / 2);
      await page.mouse.down();
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step === 2,
      );
      await page.mouse.up();
    } else {
      await page.keyboard.down(" ");
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step === 2,
      );
      await page.keyboard.up(" ");
    }
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.academy.step === 2,
    );
    if (mobile) await page.locator(".mf-reload").click();
    else await page.keyboard.press("r");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.academy.step === 3,
    );
    if (mobile) {
      const fire = await page.locator(".mf-fire").boundingBox();
      await page.mouse.move(fire.x + fire.width / 2, fire.y + fire.height / 2);
      await page.mouse.down();
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step === 4,
      );
      await page.mouse.up();
    } else {
      await page.keyboard.down(" ");
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step === 4,
      );
      await page.keyboard.up(" ");
    }
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.academy.step === 4,
    );
    if (mobile) {
      const box = await page.locator(".mf-stick").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + 5);
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step === 5,
      );
      await page.mouse.up();
    } else {
      await page.keyboard.down("w");
      await page.waitForFunction(
        () => document.querySelector("midnry-fps").engine.academy.step === 5,
      );
      await page.keyboard.up("w");
    }
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.academy.step === 5,
    );
    if (mobile) await page.locator(".mf-super").click();
    else await page.keyboard.press("q");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.academy.step === 6,
    );
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.player.cores),
      1,
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-tutorial-${mobile ? "mobile" : "desktop"}.png`,
    });
    await page.getByRole("button", { name: "FINISH →", exact: true }).click();
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.academy.active),
      false,
    );
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.enemies.length),
      7,
    );
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.player.charge),
      0,
    );
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Graphics preset").selectOption("performance");
    await page.locator(".mf-confirmapply").click();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.screenshot({
      path: `/workspace/screenshots/outpost-performance-${mobile ? "mobile" : "desktop"}.png`,
    });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        mobile,
        tutorial: "all actions completed",
        guide: "5 maps / 11 weapons",
        presets: "saved / high / performance",
        errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
