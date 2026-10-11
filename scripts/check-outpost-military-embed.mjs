import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/games/outpost-zero");
  const iframe = await page.waitForSelector('iframe[src*="outpost-zero.html"]');
  const frame = await iframe.contentFrame();
  await frame.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {
    timeout: 60000,
  });
  assert.match(await iframe.getAttribute("src"), /renderer=military/);
  await frame.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.military.renderer.domElement.dispatchEvent(
      new Event("webglcontextlost", { cancelable: true }),
    );
    if (g.militaryLoaded) throw Error("GPU loss did not select fallback");
    g.render();
    g.destroy();
  });
  assert.deepEqual(errors, []);
  await page.goto(base + "/games/outpost-zero.html");
  await page.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.characters);
  assert.equal(
    await page.evaluate(() => !!document.querySelector("midnry-fps").engine.military),
    false,
  );
  console.log("Embedded 3D page, GPU loss fallback, teardown, and original renderer passed.");
} finally {
  await browser.close();
}
