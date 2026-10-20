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
    const page = await browser.newPage({
      viewport,
      hasTouch: viewport.width < 900,
      isMobile: viewport.width < 900,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/games/outpost-zero.html");
    const checkControls = async () => {
      const failures = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            "midnry-fps button, midnry-fps summary, midnry-fps select, midnry-fps input:not([type=checkbox])",
          ),
        ]
          .filter(
            (e) => e.getClientRects().length && !e.closest("[inert]") && !e.closest("[hidden]"),
          )
          .flatMap((e) => {
            const r = e.getBoundingClientRect();
            return r.width < 43.9 || r.height < 43.9
              ? [{ name: e.className, width: r.width, height: r.height }]
              : [];
          }),
      );
      assert.deepEqual(failures, []);
    };
    const checkContrast = async () => {
      const failures = await page.evaluate(() => {
        const rgb = (value) => value.match(/[\d.]+/g)?.map(Number);
        const lum = (color) =>
          color
            .slice(0, 3)
            .map((v) => v / 255)
            .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
            .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        return [
          ...document.querySelectorAll(
            ".mf-panel p, .mf-panel small, .mf-panel label, .mf-panel summary, .mf-panel button, .mf-settings p, .mf-settings label, .mf-settings button",
          ),
        ]
          .filter((e) => e.getClientRects().length && !e.closest("[hidden]"))
          .flatMap((e) => {
            const fg = rgb(getComputedStyle(e).color);
            let node = e,
              bg;
            while (node) {
              const c = rgb(getComputedStyle(node).backgroundColor);
              if (c && (c.length < 4 || c[3] === 1)) {
                bg = c;
                break;
              }
              node = node.parentElement;
            }
            if (!fg || !bg) return [];
            const a = lum(fg),
              b = lum(bg),
              ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            return ratio < 4.5 ? [{ name: e.className, ratio }] : [];
          });
      });
      assert.deepEqual(failures, [], "Menu text contrast must reach 4.5:1");
    };
    const checkOverflow = async (selector) =>
      assert.ok(
        await page.locator(selector).evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        selector + " horizontal overflow",
      );
    await checkControls();
    await checkContrast();
    assert.equal(await page.locator(".mf-top").evaluate((e) => e.inert), true);
    // Menu keyboard wrap and nested native dialogs must keep focus contained.
    await page.locator(".mf-controlshelp summary").focus();
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute("aria-label")),
      "Play Solo",
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-access-menu-${viewport.width}.png`,
    });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Menu text size").selectOption("2");
    await page.getByLabel("Higher UI contrast").check();
    await checkControls();
    await checkOverflow(".mf-settings");
    await checkOverflow(".mf-settingsbody");
    await checkContrast();
    assert.ok(
      await page
        .locator(".mf-settingsbody p")
        .first()
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) >= 32),
    );
    await page.screenshot({
      path: `/workspace/screenshots/outpost-access-large-${viewport.width}.png`,
    });
    await page.keyboard.press("Escape");
    await checkOverflow(".mf-panel");
    await page.getByRole("button", { name: "Field Guide", exact: true }).click();
    await checkOverflow(".mf-book");
    await checkOverflow(".mf-bookbody");
    await checkControls();
    await page.keyboard.press("Escape");
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    assert.equal(await page.getByLabel("Menu text size").inputValue(), "2");
    assert.equal(await page.getByLabel("Higher UI contrast").isChecked(), true);
    // A 200% browser default font size also reflows without the custom preference.
    await page.getByLabel("Menu text size").selectOption("1");
    await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
    await checkOverflow(".mf-settings");
    await page.keyboard.press("Escape");
    await checkOverflow(".mf-panel");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
      const g = document.querySelector("midnry-fps").engine;
      for (const [edge, value] of Object.entries({ top: 30, bottom: 34, left: 20, right: 24 }))
        g.root.style.setProperty("--mf-safe-" + edge, value + "px");
      g.lockMouse = () => {};
      g.resize();
    });
    await page.locator(".mf-start:visible, .mf-modeplay:visible").first().click();
    assert.equal(await page.locator(".mf-top").evaluate((e) => e.inert), false);
    assert.match(await page.locator(".mf-accessannounce").textContent(), /Match active/);
    const positions = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      const top = g.$(".mf-pause").getBoundingClientRect();
      const fire = g.$(".mf-fire").getBoundingClientRect();
      const reload = g.$(".mf-reload").getBoundingClientRect();
      return {
        top: top.top,
        right: innerWidth - top.right,
        fireBottom: innerHeight - fire.bottom,
        gap: fire.left - reload.right,
      };
    });
    assert.ok(positions.top >= 46 && positions.right >= 40);
    if (viewport.width < 900) assert.ok(positions.fireBottom >= 152 && positions.gap >= 10);
    const collisions = await page.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.shell.getBoundingClientRect(),
        ratio = r.width / g.w;
      const size = Math.max(g.level.length, g.hudMap.size),
        map = {
          left: r.left + (g.w - size - g.hudMap.right - 5) * ratio,
          right: r.left + (g.w - g.hudMap.right + 5) * ratio,
          top: r.top + (g.hudMap.top - 5) * ratio,
          bottom: r.top + (g.hudMap.top + size + 5) * ratio,
        };
      const overlaps = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const selectors = [
        ".mf-pause",
        ".mf-brand",
        ".mf-objective",
        ".mf-match",
        ".mf-fire",
        ".mf-reload",
      ];
      const failed = selectors.filter(
        (s) => g.$(s).getClientRects().length && overlaps(map, g.$(s).getBoundingClientRect()),
      );
      if (
        overlaps(
          g.$(".mf-brand").getBoundingClientRect(),
          g.$(".mf-objective").getBoundingClientRect(),
        )
      )
        failed.push("brand/objective");
      return failed;
    });
    assert.deepEqual(collisions, [], "Minimap and HUD must not overlap controls or text");
    await page.screenshot({
      path: `/workspace/screenshots/outpost-access-play-${viewport.width}.png`,
    });
    const pause = page.locator(".mf-pause");
    await pause.hover();
    await page.mouse.down();
    assert.notEqual(await pause.evaluate((e) => getComputedStyle(e).filter), "none");
    await page.mouse.up();
    await page.keyboard.press("p");
    assert.match(
      await page.locator(".mf-accessstatus").textContent(),
      /health.*rounds.*combatants alive/,
    );
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `${viewport.width}x${viewport.height}: 44px targets, 200% text, saved contrast, focus, safe areas, pressed feedback and readable match status passed`,
    );
  }
} finally {
  await browser.close();
}
