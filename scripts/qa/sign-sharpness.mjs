// Close-up of a wall sign on a phone, at full resolution and at the lowest
// automatic resolution (what a busy phone falls to), head-on and at an angle.
// Prints the 3D buffer size for each → screenshots/qa/visibility.
//   node scripts/qa/sign-sharpness.mjs [tag] [width] [height]
import { chromium } from "playwright";
import { play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const TAG = process.argv[2] || "after",
  W = Number(process.argv[3] || 390),
  H = Number(process.argv[4] || 844),
  M = W < 500 || H < 500;
const OUT = "screenshots/qa/visibility";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M, deviceScaleFactor: M ? 3 : 1 })).newPage();
p.setDefaultTimeout(240000);
await p.addInitScript(() => {
  let seed = 12345;
  Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-modifier", "rush");
  localStorage.setItem("midnry-outpost-mode", "protocol");
});
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 300000, polling: 1000 });
await play(p, { timeout: 120000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000, polling: 1000 });
await p.waitForFunction(() => document.querySelector(".mf-transition")?.hidden !== false, null, { timeout: 120000, polling: 1000 });
const sign = await p.evaluate(() => {
  [...document.querySelectorAll("button")].find((x) => /Understood/.test(x.textContent))?.click();
  const g = document.querySelector("midnry-fps").engine;
  cancelAnimationFrame(g.frame);
  g.frame = 0;
  g.loop = () => {};
  const r = g.military,
    mats = r.protocolSignMaterials || new Set(),
    out = [];
  r.scene.traverse((o) => {
    if (o.isMesh && mats.has(o.material) && o.geometry.parameters?.width > 0.9) {
      o.updateWorldMatrix(true, false);
      const e = o.matrixWorld.elements;
      out.push({ x: e[12], y: e[13], z: e[14], nx: e[8], nz: e[10], w: o.geometry.parameters.width, title: o.material.map?.name || "" });
    }
  });
  return out.find((s) => /Sign \//.test(s.title)) || out[0];
});
const view = async (name, { angle = 0, low = false }) => {
  const info = await p.evaluate(
    async ({ s, angle, low }) => {
      // The lowest scale the automatic resolution can reach (0.5 before).
      const floor = (await import("/games/outpost-academy.js")).MIN_BUDGET_SCALE ?? 0.5;
      const g = document.querySelector("midnry-fps").engine,
        len = Math.hypot(s.nx, s.nz) || 1,
        d = 2.5,
        nx = s.nx / len,
        nz = s.nz / len,
        // Rotate the viewpoint around the sign by `angle`.
        vx = nx * Math.cos(angle) - nz * Math.sin(angle),
        vz = nx * Math.sin(angle) + nz * Math.cos(angle),
        cx = (s.x + vx * d) / 3,
        cz = (s.z + vz * d) / 3;
      g.budget.scale = low ? floor : 1;
      g.resize();
      Object.assign(g.player, { x: cx, y: cz, a: Math.atan2(-vz, -vx) });
      g.viewPitch = Math.atan2(s.y - 1.6, d);
      for (const e of g.arena.entities) if (e.id !== g.selfId) Object.assign(e, { x: 1.5, y: 1.5 });
      g.protocolCache = null;
      g.military.frameProtocolArena = null;
      for (let k = 0; k < 3; k++) {
        g.time += 0.05;
        g.render();
      }
      const c = g.military.renderer.domElement;
      return { buffer: [c.width, c.height], scale: g.budget.scale, title: s.title };
    },
    { s: sign, angle, low },
  );
  await p.screenshot({ path: `${OUT}/${TAG}-sign-${name}-${W}x${H}.png` });
  return info;
};
const result = {
  full: await view("full", {}),
  lowest: await view("lowest", { low: true }),
  angledLowest: await view("angled-lowest", { angle: 0.9, low: true }),
};
console.log(JSON.stringify(result));
await b.close();
