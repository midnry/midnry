// Settings: the Camera motion choice (Accessibility) and the touch button
// size / opacity sliders (Look). Each is shown, saved on the device and
// applied (engine.cameraMotion, renderer scale, CSS variables on the HUD).
//   node scripts/qa/settings-motion.mjs [width]   (dev server on :8080)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 390),
  M = W < 700;
mkdirSync("screenshots/qa/settings", { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
await p.addInitScript(() => localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true })));
const errs = [],
  fails = [];
const ok = (c, m) => (console.log(`${c ? "PASS" : "FAIL"} ${m}`), c || fails.push(m));
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-modal.mf-lobby") && document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, { timeout: 240000 });
await p.locator('[data-go="settings"]:visible').first().click({ timeout: 60000 });
await p.waitForTimeout(600);
const motion = p.locator(".mf-cameramotion");
await motion.scrollIntoViewIfNeeded().catch(() => {});
// Tabbed settings: open the tab that holds it if it is not visible yet.
if (!(await motion.isVisible())) {
  for (const tab of await p.locator(".mf-settingsnav button").all()) {
    await tab.click();
    await p.waitForTimeout(250);
    if (await motion.isVisible()) break;
  }
}
ok(await motion.isVisible(), "Camera motion choice is shown in Settings");
ok((await motion.inputValue()) === "full", "it starts at Full");
await motion.scrollIntoViewIfNeeded();
await p.screenshot({ path: `screenshots/qa/settings/camera-motion-${W}.png` });
await motion.selectOption("off");
const after = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  return { saved: JSON.parse(localStorage.getItem("midnry-outpost-accessibility") || "{}").cameraMotion, engine: g.cameraMotion, scale: g.military.cameraMotionScale() };
});
ok(after.saved === "off" && after.engine === "off" && after.scale === 0, `Off is saved and applied (${JSON.stringify(after)})`);
await motion.selectOption("reduced");
ok((await p.evaluate(() => document.querySelector("midnry-fps").engine.military.cameraMotionScale())) === 0.4, "Reduced scales camera motion to 0.4");
// Touch button size and opacity (Look settings).
const size = p.locator('input[type=range][data-look="buttons"]'),
  alpha = p.locator('input[type=range][data-look="buttonAlpha"]');
if (!(await size.isVisible())) {
  for (const tab of await p.locator(".mf-settingsnav button").all()) {
    await tab.click();
    await p.waitForTimeout(250);
    if (await size.isVisible()) break;
  }
}
ok((await size.isVisible()) && (await alpha.isVisible()), "Touch button size and opacity sliders are shown");
await size.fill("1.2");
await alpha.fill("0.6");
const vars = await p.evaluate(() => {
  const shell = document.querySelector(".mf-shell") || document.querySelector("midnry-fps").engine.shell;
  return { btn: shell.style.getPropertyValue("--mf-btn"), alpha: shell.style.getPropertyValue("--mf-btn-alpha"), saved: JSON.parse(localStorage.getItem("midnry-outpost-look") || "{}") };
});
ok(vars.btn === "1.2" && vars.alpha === "0.6" && vars.saved.buttons === 1.2 && vars.saved.buttonAlpha === 0.6, `size and opacity applied and saved (${JSON.stringify(vars)})`);
await size.scrollIntoViewIfNeeded();
await p.screenshot({ path: `screenshots/qa/settings/touch-buttons-${W}.png` });
ok(errs.length === 0, `no page errors ${errs.join(" | ")}`);
await b.close();
console.log(fails.length ? `${fails.length} FAILED` : "ALL PASS");
process.exit(fails.length ? 1 : 0);
