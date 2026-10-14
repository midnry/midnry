/** Capture the actual current renderer for loading art; no invented models or
 * retired loadouts. WebP encoding keeps the optional slideshow inexpensive. */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "midnry-outpost-graphics",
      JSON.stringify({ preset: "performance", options: { adaptive: false } }),
    ),
  );
  await page.goto(base + "/games/outpost-zero.html");
  try {
    await page.waitForFunction(
      () => document.querySelector("midnry-fps")?.engine?.militaryLoaded,
      null,
      { timeout: 120000 },
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        errors,
        state: await page.evaluate(() => {
          const g = document.querySelector("midnry-fps")?.engine;
          return {
            loading: g?.loading,
            error: g?.militaryError,
            report: g?.compatibilityReport?.summary,
          };
        }),
      }),
    );
    throw error;
  }
  await page.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    g.lockMouse = () => {};
    const { PRESETS } = await import("/games/outpost-academy.js");
    g.academy.preset = "balanced";
    g.academy.options = { ...PRESETS.balanced, width: 1080, adaptive: false };
    g.resize();
    g.start();
    g.protocolUI.brief.close();
    for (const e of g.arena.entities) {
      e.bot = false;
      if (e.id !== g.selfId) Object.assign(e, { x: 21.5, y: 7.5 });
    }
  });
  for (const scene of ["blackout-base", "blackout-patrol", "blackout-aircraft"]) {
    const data = await page.evaluate((scene) => {
      const g = document.querySelector("midnry-fps").engine,
        r = g.military;
      if (scene === "blackout-base") Object.assign(g.player, { x: 14.5, y: 14.5, a: -Math.PI / 2 });
      if (scene === "blackout-patrol") {
        Object.assign(g.player, { x: 3.5, y: 5.5, a: 0 });
        const actor = g.arena.entities.find((e) => e.id !== g.selfId);
        Object.assign(actor, { x: 4.7, y: 5.5, a: Math.PI });
      }
      if (scene === "blackout-aircraft") {
        for (const item of g.arena.protocol.mission.manifest) item.loaded = item.required;
        const p = g.arena.protocol.mission.loading;
        Object.assign(g.player, { x: p.x, y: p.y });
        g.arena.departMission(g.player);
        g.mapId = g.arena.mapId;
        Object.assign(g.player, { x: 8.5, y: 2.5, a: -Math.PI / 2 });
        g.arena.protocol.mission.vehicle.progress = 60;
      }
      g.protocolCache = null;
      r.frameProtocolArena = null;
      r.naturalLighting.initialized = false;
      g.protocolUI.update(true);
      g.render();
      g.render();
      return r.renderer.domElement.toDataURL("image/webp", 0.88);
    }, scene);
    const bytes = Buffer.from(data.split(",")[1], "base64");
    writeFileSync("public/games/loading/" + scene + ".webp", bytes);
    console.log(scene + ": " + bytes.length + " bytes");
  }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
