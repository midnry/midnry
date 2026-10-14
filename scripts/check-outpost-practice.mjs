/** Native controls across the complete tutorial on desktop and touch. */
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
    if (process.argv.includes("--mobile-only") && !mobile) continue;
    const name = mobile ? "mobile" : "desktop",
      page = await browser.newPage({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        hasTouch: mobile,
        isMobile: mobile,
      });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
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
      g.rolePreference = "infiltrator";
      window.practiceProfile = localStorage.getItem("midnry-outpost-profile");
      window.practicePump = setInterval(() => {
        if (g.running) {
          g.update(0.05);
          g.protocolCache = null;
          g.protocolUI.update(true);
        }
      }, 50);
    });
    const click = async (locator) => {
      await locator.waitFor({ state: "visible" });
      await locator.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
      const b = await locator.boundingBox();
      if (!b)
        console.log(
          JSON.stringify(
            await page.evaluate(() => {
              const g = document.querySelector("midnry-fps").engine;
              return {
                stage: g.practice.mission.step?.id,
                phase: g.arena.protocol.phase,
                running: g.running,
                dialog: g.protocolUI.hasDialogOpen(),
                nearbyBody: g.protocolUI.nearby?.body,
                player: { x: g.player.x, y: g.player.y, hp: g.player.hp },
                reportHidden: g.$(".mf-protocol-report").hidden,
                actionHidden: g.protocolUI.actionBar.hidden,
              };
            }),
          ),
        );
      assert.ok(b);
      if (mobile) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    };
    const stage = async (id) => {
      await page.waitForFunction(
        (id) => document.querySelector("midnry-fps").engine.practice.mission?.step?.id === id,
        id,
      );
      console.log(name + ": " + id);
    };
    const place = async (kind) =>
      page.evaluate((kind) => {
        const g = document.querySelector("midnry-fps").engine,
          m = g.practice.mission;
        const point =
          kind === "stock"
            ? m.stock
            : kind === "loading"
              ? g.arena.protocol.mission.loading
              : kind === "charge"
                ? g.arena.protocol.bombs[0]
                : kind === "body"
                  ? g.arena.protocol.bodies[0]
                  : kind === "oxygen"
                    ? g.arena.protocol.mission.flightTasks.find((t) => t.id === "oxygen")
                    : g.transportMap.helm;
        Object.assign(g.player, { x: point.x, y: point.y });
        g.protocolCache = null;
        g.protocolUI.update(true);
      }, kind);
    const hold = async (seconds, locator = page.locator(".mf-protocol-hold")) => {
      if (!mobile) {
        await page.locator(".mf-shell").focus();
        await page.keyboard.down("e");
        await page.waitForTimeout(seconds * 1000);
        await page.keyboard.up("e");
      } else {
        const b = await locator.boundingBox();
        assert.ok(b);
        const cdp = await page.context().newCDPSession(page),
          p = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [p] });
        await page.waitForTimeout(seconds * 1000);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await cdp.detach();
      }
    };
    const equipment = async () => {
      const panel = page.locator(".mf-mission-task");
      if (mobile) await click(page.locator(".mf-protocol-hold"));
      else {
        await page.locator(".mf-shell").focus();
        await page.keyboard.down("e");
        await panel.waitFor({ state: "visible" });
        await page.keyboard.up("e");
      }
      await panel.waitFor({ state: "visible" });
      while (
        await page.evaluate(() => {
          const c = document
            .querySelector("midnry-fps")
            .engine.arena.privateFor(document.querySelector("midnry-fps").engine.player)
            .channel?.challenge;
          return c && c.index < c.steps.length;
        })
      ) {
        await page.waitForFunction(() => {
          const g = document.querySelector("midnry-fps").engine,
            c = g.protocolUI.view.protocol.self.channel?.challenge;
          return !c || g.time >= c.nextAt;
        });
        const step = await page.evaluate(() => {
          const g = document.querySelector("midnry-fps").engine,
            c = g.arena.privateFor(g.player).channel.challenge;
          return { index: c.index, answer: c.steps[c.index].answer, range: c.steps[c.index].range };
        });
        if (step.range) {
          const slider = panel.locator("input[type=range]");
          await slider.focus();
          await page.keyboard.press("Home");
          for (let n = 0; n < Number(step.answer); n++) await page.keyboard.press("ArrowRight");
          await click(panel.getByRole("button", { name: "Confirm gauge" }));
        } else await click(panel.locator(`[data-task-choice="${step.answer}"]`));
        await page.waitForFunction((i) => {
          const g = document.querySelector("midnry-fps").engine,
            c = g.arena.privateFor(g.player).channel?.challenge;
          return !c || c.index > i;
        }, step.index);
      }
      await panel.waitFor({ state: "hidden" });
    };
    await click(page.locator(".mf-practice-start"));
    await stage("pack");
    assert.equal(await page.locator(".mf-protocol-brief").isVisible(), false);
    await page.evaluate(() => document.querySelector("midnry-fps").engine.render());
    const bounds = await page.locator(".mf-practice-coach").boundingBox();
    assert.ok(bounds.height <= 70);
    await page.screenshot({ path: `/workspace/screenshots/outpost-practice-${name}.png` });
    await place("stock");
    await equipment();
    await stage("load");
    await place("loading");
    await hold(3.3);
    await stage("defuse");
    await place("charge");
    await hold(6.3);
    await stage("report");
    await place("body");
    if (mobile) await click(page.locator(".mf-protocol-report"));
    else {
      await page.locator(".mf-shell").focus();
      await page.keyboard.press("f");
    }
    await stage("vote");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.arena.protocol.phase === "vote",
      null,
      { timeout: 22000 },
    );
    await click(page.locator(".mf-protocol-skip"));
    await stage("board");
    await page.waitForFunction(
      () => !document.querySelector("midnry-fps").engine.protocolUI.meeting.open,
      null,
      { timeout: 10000 },
    );
    await place("loading");
    await hold(3.3);
    await stage("oxygen");
    await place("oxygen");
    await equipment();
    await stage("pilot");
    await place("helm");
    await click(page.locator(".mf-protocol-helm"));
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.protocolUI.piloting,
    );
    if (!mobile) {
      await page.locator(".mf-shell").focus();
      await page.keyboard.down("w");
      await page.keyboard.down("a");
      await page.waitForTimeout(1300);
      await page.keyboard.up("w");
      await page.keyboard.up("a");
    } else {
      const up = await page
          .locator('[data-flight-axis="pitch"][data-flight-value="1"]')
          .boundingBox(),
        left = await page
          .locator('[data-flight-axis="steer"][data-flight-value="-1"]')
          .boundingBox();
      assert.ok(up && left);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: up.x + up.width / 2, y: up.y + up.height / 2, id: 0 },
          { x: left.x + left.width / 2, y: left.y + left.height / 2, id: 1 },
        ],
      });
      await page.waitForTimeout(1300);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
    }
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.arena.protocol.mission.vehicle.underControl,
      null,
      { timeout: 6000 },
    );
    await click(page.locator(".mf-protocol-autopilot"));
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.practice.mission.complete,
    );
    assert.equal(await page.locator(".mf-practice-details").isVisible(), true);
    const done = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.retention.finish(true);
      return {
        xpSame: localStorage.getItem("midnry-outpost-profile") === window.practiceProfile,
        steps: g.practice.mission.index,
      };
    });
    assert.equal(done.xpSame, true);
    assert.equal(done.steps, 8);
    await page.screenshot({ path: `/workspace/screenshots/outpost-practice-complete-${name}.png` });
    await click(page.locator(".mf-practice-exit"));
    const exit = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      clearInterval(window.practicePump);
      return {
        active: g.practice.active,
        preference: g.rolePreference,
        manifest: g.arena.protocol.mission.manifest.reduce((s, i) => s + i.required, 0),
        bots: g.arena.entities.some((e) => e.bot),
        sameXP: localStorage.getItem("midnry-outpost-profile") === window.practiceProfile,
      };
    });
    assert.equal(exit.active, false);
    assert.equal(exit.preference, "infiltrator");
    assert.equal(exit.manifest, 13);
    assert.equal(exit.bots, true);
    assert.equal(exit.sameXP, true);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        name,
        practice: "8 native drills passed",
        noPracticeXP: true,
        normalMissionRestored: true,
        errors,
      }),
    );
    // Start the last drill as a fixture, then let the actual crash validator
    // expire its recovery timer while seated. Retry remains usable after death.
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.protocolUI.brief.close();
      g.practice.start(7);
    });
    await place("helm");
    await click(page.locator(".mf-protocol-helm"));
    await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      g.arena.protocol.mission.vehicle.recoveryDeadline = g.time + 0.1;
      g.update(0.15);
    });
    await page.waitForFunction(
      () => document.querySelector("midnry-fps").engine.practice.mission.failed,
    );
    await click(page.locator(".mf-practice-retry"));
    assert.equal(
      await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine;
        return (
          g.practice.active &&
          !g.practice.mission.failed &&
          g.player.hp > 0 &&
          g.practice.mission.step.id === "pilot"
        );
      }),
      true,
    );
    await page.evaluate(() => document.querySelector("midnry-fps").engine.practice.exit());
    console.log(name + ": crash retry passed");
    await page.close();
  }
} finally {
  await browser.close();
}
