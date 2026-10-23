// What one home-lobby frame costs: draw calls, triangles, the render buffer
// and multisampling, at laptop and phone size (software GPU: timings are not
// meaningful here, counts are).
//   node scripts/qa/lobby-cost.mjs   (dev server on :8080)
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [w, h, dpr, m] of [[1280, 720, 1, false], [1920, 1080, 2, false], [390, 844, 3, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: m, hasTouch: m })).newPage();
  await p.addInitScript(() => localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true })));
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(() => document.querySelector(".mf-modal.mf-lobby") && document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, { timeout: 240000 });
  await p.waitForTimeout(2000);
  const out = await p.evaluate(() => {
    const r = document.querySelector("midnry-fps").engine.military,
      info = r.renderer.info;
    info.reset();
    r.renderLobby(performance.now());
    const canvas = r.renderer.domElement;
    let meshes = 0;
    r.lobby.scene.traverse((o) => (meshes += o.isMesh || o.isPoints ? 1 : 0));
    return { buffer: `${canvas.width}x${canvas.height}`, megapixels: +((canvas.width * canvas.height) / 1e6).toFixed(2), drawCalls: info.render.calls, triangles: info.render.triangles, meshes, samples: r.lobby.target?.samples ?? 0, bloom: !!r.lobby.bloom, preset: r.g.academy.preset };
  });
  console.log(`${w}x${h} @${dpr}x`, JSON.stringify(out));
  await p.close();
}
await b.close();
