/** Native desktop/touch checks against the actual self-hosted game. Fixture
 * placement removes walking time; keyboard, buttons, sliders and action queues
 * are the production controls. No JS clicks or fake task-completion flags. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
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
    await page.addInitScript(() =>
      localStorage.setItem(
        "midnry-outpost-graphics",
        JSON.stringify({ preset: "performance", options: { adaptive: false } }),
      ),
    );
    await page.goto(base + "/games/outpost-zero.html");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 120000 },
    );
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      g.lockMouse = () => {};
      g.start();
      g.protocolUI.brief.close();
      for (const e of g.arena.entities) e.bot = false;
      const s = g.arena.protocol.mission.supplyStock[0];
      Object.assign(g.player, { x: s.x, y: s.y });
      g.protocolCache = null;
      g.protocolUI.update(true);
      g.render();
      g.shell.focus();
      window.taskPump = setInterval(() => {
        if (g.running) {
          g.arena.advance(0.05, { [g.selfId]: g.controls() });
          g.protocolCache = null;
          g.protocolUI.update(true);
        }
      }, 50);
    });
    const panel = page.locator(".mf-mission-task");
    if (mobile) await page.locator(".mf-protocol-hold").tap();
    else {
      await page.keyboard.down("e");
      await panel.waitFor({ state: "visible" });
      await page.keyboard.up("e");
    }
    await panel.waitFor({ state: "visible" });
    console.log(`${mobile ? "Touch" : "Desktop"}: equipment panel opened`);
    const bounds = await panel.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= (mobile ? 391 : 1281));
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= (mobile ? 845 : 801));
    const targets = await panel
      .locator("[data-task-choice]")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          h: n.getBoundingClientRect().height,
          w: n.getBoundingClientRect().width,
        })),
      );
    assert.ok(targets.every((n) => n.h >= 44 && n.w >= 44));
    await panel.locator("[data-task-choice]").first().waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const v = document.querySelector("midnry-fps").engine.protocolUI.view;
      return v.time >= v.protocol.self.channel.challenge.nextAt;
    });
    await page.screenshot({
      path: `/workspace/screenshots/outpost-mission-task-${mobile ? "mobile" : "desktop"}.png`,
    });
    // Deliberately choose damaged packaging; the panel remains open and no
    // supply is consumed. Then follow the visible checklist through each step.
    await panel.getByRole("button", { name: "Damaged packaging", exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector("midnry-fps")
        .engine.protocolUI.view.protocol.self.channel.challenge.feedback.includes("try again"),
    );
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(() => {
        const v = document.querySelector("midnry-fps").engine.protocolUI.view;
        return v.time >= v.protocol.self.channel.challenge.nextAt;
      });
      const answer = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          c = g.arena.privateFor(g.player).channel.challenge;
        return c.steps[c.index].answer;
      });
      const button = panel.locator(`[data-task-choice="${answer}"]`);
      if (mobile) await button.tap();
      else await button.click();
      await page.waitForFunction((index) => {
        const c =
          document.querySelector("midnry-fps").engine.protocolUI.view.protocol.self.channel
            ?.challenge;
        return !c || c.index > index;
      }, i);
    }
    await panel.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(
        () => !!document.querySelector("midnry-fps").engine.protocolUI.view.protocol.self.cargo,
      ),
      true,
    );
    // Oxygen gauge uses a native range input and keyboard controls as well as
    // touch. New transport is reached using the simulation's departure path.
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        m = g.arena.protocol.mission;
      g.arena.returnCargo(g.player);
      for (const i of m.manifest) i.loaded = i.required;
      Object.assign(g.player, { x: m.loading.x, y: m.loading.y });
      g.arena.departMission(g.player);
      const t = m.flightTasks.find((t) => t.id === "oxygen");
      Object.assign(g.player, { x: t.x, y: t.y });
      g.protocolCache = null;
      g.protocolUI.update(true);
      g.render();
      g.shell.focus();
    });
    if (mobile) await page.locator(".mf-protocol-hold").tap();
    else {
      await page.keyboard.down("e");
      await panel.waitFor({ state: "visible" });
      await page.keyboard.up("e");
    }
    await panel.waitFor({ state: "visible" });
    await panel.getByRole("button", { name: "Secure supply connection", exact: true }).click();
    await panel.getByRole("slider").waitFor({ state: "visible" });
    const target = await page.evaluate(
      () =>
        document.querySelector("midnry-fps").engine.protocolUI.view.protocol.self.channel.challenge
          .range.target,
    );
    await panel.getByRole("slider").focus();
    await page.keyboard.press("Home");
    for (let i = 0; i < target; i++) await page.keyboard.press("ArrowRight");
    await panel.getByRole("button", { name: "Confirm gauge", exact: true }).click();
    await panel.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector("midnry-fps").engine.protocolUI.view.protocol.self.contributions
            .checks,
      ),
      1,
    );
    // Escape cancels a new check without pausing the whole mission.
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        t = g.arena.protocol.mission.flightTasks.find((t) => t.id === "landing");
      Object.assign(g.player, { x: t.x, y: t.y });
      g.protocolCache = null;
      g.protocolUI.update(true);
      g.shell.focus();
    });
    if (mobile) await page.locator(".mf-protocol-hold").tap();
    else {
      await page.keyboard.down("e");
      await panel.waitFor({ state: "visible" });
      await page.keyboard.up("e");
    }
    await panel.waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => !document.querySelector("midnry-fps").engine.protocolUI.view.protocol.self.channel,
    );
    assert.equal(
      await page.evaluate(() => document.querySelector("midnry-fps").engine.running),
      true,
    );
    assert.deepEqual(errors, []);
    await page.evaluate(() => clearInterval(window.taskPump));
    console.log(
      JSON.stringify({
        device: mobile ? "touch emulation" : "desktop",
        packing: true,
        wrongChoice: true,
        oxygenGauge: true,
        keyboardCancellation: true,
        controls: "native",
        errors,
      }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
