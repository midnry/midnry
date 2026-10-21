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
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Graphics preset").selectOption("high");
    assert.ok(
      await page.getByRole("dialog", { name: "Apply graphics changes?", exact: true }).isVisible(),
    );
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.academy.preset),
      "balanced",
    );
    assert.equal(await page.evaluate(() => localStorage.getItem("midnry-outpost-graphics")), null);
    await page.locator('.mf-confirm button[value="cancel"]').click();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    assert.equal(await page.getByLabel("Graphics preset").inputValue(), "balanced");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("data-preset")), "");
    await page.getByLabel("Graphics preset").selectOption("high");
    await page.locator(".mf-confirmapply").click();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.academy.preset),
      "high",
    );
    const before = await page.evaluate(() => localStorage.getItem("midnry-outpost-graphics"));
    await page.locator('[data-option="shadows"]').uncheck();
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    assert.equal(await page.locator('[data-option="shadows"]').isChecked(), true);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("midnry-outpost-graphics")),
      before,
    );
    await page.locator('[data-option="shadows"]').uncheck();
    await page.locator(".mf-confirmapply").click();
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    assert.equal(
      await page.evaluate(
        () => document.querySelector("midnry-fps").engine.academy.options.shadows,
      ),
      false,
    );
    await page.getByRole("button", { name: "Done", exact: true }).click();
    const savedProfile = JSON.stringify({
      version: 1,
      xp: 240,
      skin: "copper",
      matches: 2,
      wins: 1,
      rounds: [],
      weapons: ["carbine"],
      milestones: [],
    });
    await page.evaluate(
      (value) => localStorage.setItem("midnry-outpost-profile", value),
      savedProfile,
    );
    await page.reload();
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.academy.preset),
      "high",
    );
    await page.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
    await page.evaluate(() => document.querySelector("midnry-fps").engine.pause());
    await page.getByRole("button", { name: "Exit Game", exact: true }).click();
    const time = await page.evaluate(() => document.querySelector("midnry-fps").engine.time);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.time), time);
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.ui.pendingConfirmation === null,
    );
    assert.equal(new URL(page.url()).pathname, "/games/outpost-zero.html");
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.abort.signal.aborted),
      false,
    );
    await page.getByRole("button", { name: "Exit Game", exact: true }).click();
    await page.locator(".mf-confirmapply").click();
    await page.waitForURL(base + "/");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("midnry-outpost-profile")),
      savedProfile,
    );
    assert.deepEqual(errors, []);
    console.log(
      `${mobile ? "Mobile" : "Desktop"}: graphics apply/cancel/Escape/persistence and standalone exit passed`,
    );
    await page.close();
  }
  // The site wrapper accepts exit messages only from its own iframe.
  const host = await browser.newPage(),
    guest = await browser.newPage();
  await host.goto(base + "/games/outpost-zero");
  await host.evaluate(() => window.postMessage({ type: "midnry-outpost-exit" }, location.origin));
  await host.waitForTimeout(100);
  assert.equal(new URL(host.url()).pathname, "/games/outpost-zero");
  const game = host.frameLocator('iframe[title="Outpost Zero first-person shooter"]');
  await game.locator('[data-mode="duo"]').click();
  await game.locator(".mf-onlinechoice").click();
  await game.locator(".mf-create").click();
  await game.locator(".mf-roomcode").waitFor({ state: "visible" });
  const code = await game.locator(".mf-roomcode").innerText();
  await guest.goto(base + "/games/outpost-zero.html?room=" + code);
  await guest.locator(".mf-join").click();
  await guest.waitForFunction(
    () => document.querySelector("midnry-fps").engine.online?.members.length === 2,
  );
  await game.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
  await guest.waitForFunction(
    () => document.querySelector("midnry-fps").engine.online?.phase === "playing",
  );
  await game.getByRole("button", { name: "Open game menu" }).click();
  await game.locator(".mf-exit").click();
  assert.match(await game.locator(".mf-confirm p").innerText(), /forfeits/);
  await game.locator('.mf-confirm button[value="cancel"]').click();
  const departedHost = await guest.evaluate(
    () => document.querySelector("midnry-fps").engine.online.host,
  );
  // A keepalive response may arrive after the initiating document is gone.
  // The remaining client's authoritative state verifies the completed forfeit.
  const left = host.waitForRequest(
    (r) => r.url().endsWith("/api/games/outpost") && r.postDataJSON()?.op === "leave",
  );
  await game.locator(".mf-exit").click();
  await game.locator(".mf-confirmapply").click();
  await left;
  await host.waitForURL(base + "/");
  await guest.waitForFunction(() => {
    const g = document.querySelector("midnry-fps").engine;
    return g.online.host === g.selfId && g.online.members.length === 1;
  });
  assert.ok(
    await guest.evaluate((id) => {
      const e = document.querySelector("midnry-fps").engine.arena.entities.find((e) => e.id === id);
      return e.departed && e.hp === 0;
    }, departedHost),
  );
  await guest.evaluate(() => document.querySelector("midnry-fps").engine.leaveOnline());
  console.log("Embedded exit, message source validation, online forfeit and host transfer passed");
} finally {
  await browser.close();
}
