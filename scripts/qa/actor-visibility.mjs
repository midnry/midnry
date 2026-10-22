// Actor visibility regression check: every rival whose body is inside the
// camera view, with no full-height wall in between, must be drawn — at the
// screen edges, at distance, on a laptop and a phone, hip-fire and aiming down
// the sights. Also records render scale, draw calls and LOD swaps, and takes
// screenshots (edge, distance, scoped) → screenshots/qa/visibility.
//   node scripts/qa/actor-visibility.mjs [tag] [width] [height]
// Exit code 1 when any in-view rival is hidden.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const TAG = process.argv[2] || "after",
  W = Number(process.argv[3] || 1280),
  H = Number(process.argv[4] || (W < 500 ? 844 : 720)),
  M = W < 500 || H < 500,
  MAP = process.env.MAP || "skyport";
const OUT = "screenshots/qa/visibility";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M, deviceScaleFactor: M ? 3 : 1 });
ctx.setDefaultTimeout(240000);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-series", "single");
});
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 300000, polling: 1000 });
await p.evaluate((map) => {
  const g = document.querySelector("midnry-fps").engine;
  cancelAnimationFrame(g.frame);
  g.frame = 0;
  g.lockMouse = () => {};
  g.mode = "signal";
  g.seriesKind = "single";
  const random = Math.random,
    index = ["outpost", "skyport", "estate"].indexOf(map);
  Math.random = () => (index + 0.5) / 3;
  g.series = null;
  g.reset();
  g.start();
  Math.random = random;
  for (const e of g.arena.entities) e.bot = false;
  g.arena.countdown = 0;
}, MAP);
// Let the arena's art finish loading (a few manual frames, long polling).
await p.waitForFunction(
  () => {
    const g = document.querySelector("midnry-fps").engine;
    // The page's render runs the round's loading screen and world build.
    g.render();
    return (
      document.querySelector(".mf-transition")?.hidden !== false &&
      g.military.arenaStyle?.readyFor?.(g.arena.mapId) !== false &&
      g.military.characterAssets?.size > 0
    );
  },
  null,
  { timeout: 300000, polling: 2000 },
);
const SPOTS = Number(process.env.SPOTS || 4),
  HEADINGS = Number(process.env.HEADINGS || 4);
const run = (ads) =>
  p.evaluate(({ ads, SPOTS, HEADINGS }) => {
    const g = document.querySelector("midnry-fps").engine,
      r = g.military,
      a = g.arena,
      level = a.level,
      n = level.length,
      me = g.player,
      bots = a.entities.filter((e) => e !== me);
    // Walls-only line of sight (crates and barriers are lower than eye height).
    const walls = Object.create(Object.getPrototypeOf(a));
    walls.level = level;
    walls.crates = [];
    const open = (x, y) => level[Math.floor(y)]?.[Math.floor(x)] === 0;
    const freeOfCrates = (x, y) => !a.crates.some((c) => c.hp > 0 && Math.hypot(c.x - x, c.y - y) < 0.8);
    const Vec = r.camera.position.constructor;
    const render = () => {
      me.ads = ads;
      r.adsBlend = ads ? 1 : 0;
      g.time += 0.02;
      // The renderer itself (the page's frame loop is stopped).
      r.render();
    };
    // Player spots with long sightlines: the zone centre and open tiles.
    const spots = [];
    for (let y = 2; y < n - 2; y += 3)
      for (let x = 2; x < n - 2; x += 3)
        if (open(x + 0.5, y + 0.5) && freeOfCrates(x + 0.5, y + 0.5)) spots.push({ x: x + 0.5, y: y + 0.5 });
    spots.sort((p, q) => Math.hypot(p.x - n / 2, p.y - n / 2) - Math.hypot(q.x - n / 2, q.y - n / 2));
    const results = { debug: null, checked: 0, hidden: [], hiddenBehindCrate: 0, maxDistance: 0, stats: null };
    const fractions = [-1.03, -0.95, -0.8, -0.5, -0.2, 0, 0.2, 0.5, 0.8, 0.95, 1.03];
    const distances = [1.2, 2, 3.5, 5, 7, 9, 12, 16, 20, 26, 32];
    for (const spot of spots.slice(0, SPOTS))
      for (let heading = 0; heading < HEADINGS; heading++) {
        Object.assign(me, { x: spot.x, y: spot.y, a: (heading * Math.PI) / 2 + 0.3, hp: me.maxHp });
        g.cameraPitch = 0;
        render();
        const hfov = 2 * Math.atan(Math.tan((r.camera.fov * Math.PI) / 360) * r.camera.aspect);
        const candidates = [];
        for (const f of fractions)
          for (const d of distances) {
            const ang = me.a + (f * hfov) / 2,
              x = me.x + Math.cos(ang) * d,
              y = me.y + Math.sin(ang) * d;
            if (x < 1 || y < 1 || x > n - 1 || y > n - 1 || !open(x, y) || !a.canMove(x, y, 0.3)) continue;
            if (!walls.visible(me, { x, y })) continue;
            candidates.push({ x, y, d, f });
          }
        for (let i = 0; i < candidates.length; i += bots.length) {
          const batch = candidates.slice(i, i + bots.length);
          bots.forEach((e, k) => {
            const c = batch[k];
            Object.assign(e, c ? { x: c.x, y: c.y, a: me.a + Math.PI, hp: e.maxHp } : { x: 1.5, y: 1.5, hp: 0 });
          });
          render();
          r.camera.updateMatrixWorld(true);
          batch.forEach((c, k) => {
            const e = bots[k],
              actor = r.actors.get(e.id);
            // Is any part of the body (±0.3 m sideways, feet to head) on screen?
            const side = new Vec(-Math.sin(me.a), 0, Math.cos(me.a));
            let onScreen = false;
            for (const s of [-0.3, 0, 0.3])
              for (const h of [0.2, 0.9, 1.7]) {
                const v = new Vec(c.x * 3 + side.x * s, h, c.y * 3 + side.z * s).project(r.camera);
                if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z < 1) onScreen = true;
              }
            if (!onScreen) return;
            results.checked++;
            results.maxDistance = Math.max(results.maxDistance, c.d);
            // Drawn = the root is shown and at least one of its meshes is on.
            let meshes = 0;
            if (actor?.root.visible) actor.root.traverseVisible((o) => o.isMesh && meshes++);
            const drawn = meshes > 0;
            if (!drawn) {
              const crate = !a.visible(me, e);
              if (crate) results.hiddenBehindCrate++;
              results.hidden.push({ d: +c.d.toFixed(1), f: c.f, crate });
              if (results.hidden.length === 1)
                results.debug = { cam: g.camera().id, death: !!g.deathSequence, me: [me.x, me.y, me.a, me.hp], e: [e.id, e.x, e.y, e.hp], root: actor?.root.visible, has: !!actor, far: actor?.farDetail, detail: actor?.detailMeshes?.map((m) => m.name + '|' + m.userData.operatorLOD + '|' + m.visible + '|' + (m.parent ? m.parent.name : 'noparent')), inScene: (() => { let o = actor?.root; while (o?.parent) o = o.parent; return o === r.scene; })(), visibleMeshes: (() => { const v = []; actor?.root.traverseVisible((o) => o.isMesh && v.push(o.name)); return v.length; })() };
            }
          });
        }
      }
    results.stats = { ...r.actorStats, drawCalls: r.renderer.info.render.calls };
    return results;
  }, { ads, SPOTS, HEADINGS });
const summary = { tag: TAG, viewport: `${W}x${H}`, map: MAP };
summary.hip = await run(false);
summary.ads = await run(true);
// Measurements: render buffer, LOD distance, a timed frame.
summary.render = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine,
    r = g.military,
    canvas = r.renderer.domElement,
    t0 = performance.now();
  for (let i = 0; i < 5; i++) {
    g.time += 0.02;
    g.military.render();
  }
  r.renderer.getContext().finish();
  return {
    buffer: [canvas.width, canvas.height],
    css: [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)],
    dpr: devicePixelRatio,
    budgetScale: g.budget?.scale,
    frameMs: +((performance.now() - t0) / 5).toFixed(1),
    drawCalls: r.renderer.info.render.calls,
    lodTiles: r.actorLodDistance?.() ?? (r.mobileDevice ? 3.8 : 6),
    far: r.camera.far,
  };
});
// Screenshots: rivals at the left/right edges, a line into the distance, scoped.
const shot = async (name, ads) => {
  await p.evaluate((ads) => {
    const g = document.querySelector("midnry-fps").engine,
      r = g.military,
      a = g.arena,
      me = g.player,
      n = a.level.length,
      bots = a.entities.filter((e) => e !== me);
    const walls = Object.create(Object.getPrototypeOf(a));
    walls.level = a.level;
    walls.crates = [];
    // Best spot/heading: the longest clear line from open tiles.
    let best = null;
    for (let y = 2; y < n - 2; y++)
      for (let x = 2; x < n - 2; x++)
        for (let h = 0; h < 8; h++) {
          if (a.level[y][x]) continue;
          const ang = (h * Math.PI) / 4,
            d = walls.cast(x + 0.5, y + 0.5, Math.cos(ang), Math.sin(ang), 60).distance;
          if (!best || d > best.d) best = { x: x + 0.5, y: y + 0.5, a: ang, d };
        }
    Object.assign(me, best, { hp: me.maxHp });
    me.ads = ads;
    r.adsBlend = ads ? 1 : 0;
    g.cameraPitch = 0;
    g.time += 0.02;
    g.military.render();
    const hfov = 2 * Math.atan(Math.tan((r.camera.fov * Math.PI) / 360) * r.camera.aspect);
    const spots = [
      [-0.93, 3], [0.93, 3], [-0.85, 6], [0.85, 6],
      [0, best.d * 0.35], [0.1, best.d * 0.55], [-0.1, best.d * 0.75],
    ];
    bots.forEach((e, k) => {
      const [f, d] = spots[k % spots.length],
        ang = me.a + (f * hfov) / 2;
      let x = me.x + Math.cos(ang) * d,
        y = me.y + Math.sin(ang) * d;
      if (!a.canMove(x, y, 0.3)) [x, y] = [me.x + Math.cos(me.a) * d, me.y + Math.sin(me.a) * d];
      Object.assign(e, { x, y, a: me.a + Math.PI, hp: e.maxHp });
    });
    for (let i = 0; i < 3; i++) {
      g.time += 0.02;
      g.military.render();
    }
  }, ads);
  await p.screenshot({ path: `${OUT}/${TAG}-${name}-${W}x${H}.png` });
};
await shot("edges-distance", false);
if (!M) await shot("scoped", true);
summary.errors = errs.slice(0, 5);
console.log(JSON.stringify(summary, null, 1));
writeFileSync(`${OUT}/${TAG}-${W}x${H}.json`, JSON.stringify(summary, null, 1));
await b.close();
if (summary.hip.hidden.length || summary.ads.hidden.length) process.exit(1);
