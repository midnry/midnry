import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const cases =
    process.argv[3] === "--smoke"
      ? ["tablet-landscape", "startup-recovery"]
      : [
          "tablet-landscape",
          "tablet-portrait",
          "phone",
          "desktop",
          "no-float",
          "startup-recovery",
          "no-webgl",
        ];
  for (const scenario of cases) {
    const portrait = scenario === "tablet-portrait";
    const page = await browser.newPage({
      viewport:
        scenario === "phone"
          ? { width: 390, height: 844 }
          : portrait
            ? { width: 768, height: 1024 }
            : { width: 1024, height: 768 },
      hasTouch: scenario !== "desktop",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(
      ({ scenario }) => {
        if (scenario !== "desktop") {
          Object.defineProperty(navigator, "platform", { value: "MacIntel" });
          Object.defineProperty(navigator, "maxTouchPoints", { value: 5 });
        }
        if (scenario === "no-float") {
          const original = WebGL2RenderingContext.prototype.getExtension;
          WebGL2RenderingContext.prototype.getExtension = function (name) {
            return ["EXT_color_buffer_float", "EXT_color_buffer_half_float"].includes(name)
              ? null
              : original.call(this, name);
          };
        }
        if (["startup-recovery", "no-webgl"].includes(scenario)) {
          const original = HTMLCanvasElement.prototype.getContext;
          let attempts = 0;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            if (type === "webgl2" && (scenario === "no-webgl" || ++attempts <= 2)) return null;
            return original.call(this, type, ...args);
          };
        }
      },
      { scenario },
    );
    await page.goto(base + "/games/outpost-zero.html?renderer=military");
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.loading === false,
      null,
      { timeout: 90000 },
    );
    if (scenario === "no-webgl") {
      assert.equal(await page.evaluate(() => document.querySelector("midnry-fps").engine.compatibilityReport.status), "unsupported");
      assert.equal(await page.locator(".mf-start").isDisabled(), true);
      assert((await page.locator(".mf-render-status").textContent()).includes("WebGL 2"));
    } else {
      const state = await page.evaluate(() => {
        const g = document.querySelector("midnry-fps").engine,
          r = g.military;
        if (!r) throw Error(g.rendererError || "No cinematic renderer");
        cancelAnimationFrame(g.frame);
        const before = JSON.stringify(g.arena.snapshot());
        g.render();
        return {
          loaded: g.militaryLoaded,
          profile: r.profile,
          ao: !!r.ao,
          halfFloat: r.profile.halfFloat,
          composer: !!r.composer,
          soldier: !!r.soldier,
          assets: r.assetErrors,
          pure: before === JSON.stringify(g.arena.snapshot()),
          canvases: g.shell.querySelectorAll(".mf-webgl").length,
        };
      });
      assert(state.loaded && state.soldier && state.pure);
      assert.deepEqual(state.assets, []);
      assert.equal(state.canvases, 1);
      if (scenario !== "desktop") {
        assert.equal(state.ao, false);
        assert(state.profile.maxShadowSize <= 1024);
      }
      if (scenario === "no-float") assert.equal(state.halfFloat, false);
      if (scenario === "startup-recovery") {
        assert(state.profile.safeMode);
        assert.equal(state.composer, false);
      }
      if (scenario.startsWith("tablet")) {
        await page.evaluate(() => {
          const g = document.querySelector("midnry-fps").engine;
          g.$(".mf-modal").hidden = true;
          g.player.x = 3.5;
          g.player.y = 2.5;
          g.player.a = 0;
          g.viewPitch = 0;
          g.enemies.forEach((e, i) => {
            e.x = 5.5 + i * 0.4;
            e.y = 2.8 + i * 0.3;
            e.hp = 100;
          });
          g.render();
        });
        await page.screenshot({ path: `/workspace/screenshots/outpost-ipad-${scenario}.png` });
      }
      if (portrait) {
        await page.evaluate(() =>
          document
            .querySelector("midnry-fps")
            .engine.military.renderer.getContext()
            .getExtension("WEBGL_lose_context")
            .loseContext(),
        );
        await page.waitForFunction(
          () => {
            const g = document.querySelector("midnry-fps").engine;
            return g.militaryLoaded && !g.loading && g.military?.profile.safeMode;
          },
          null,
          { timeout: 90000 },
        );
        assert.equal(await page.locator(".mf-tag").textContent(), "TACTICAL 3D / CINEMATIC");
        assert.equal(await page.locator(".mf-webgl").count(), 1);
        console.log("Actual GPU context loss recovered into cinematic 3D");
      }
    }
    assert.deepEqual(errors, []);
    console.log("PASS", scenario);
    await page.close();
  }
} finally {
  await browser.close();
}
