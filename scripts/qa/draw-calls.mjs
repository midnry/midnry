import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.env.OUT || "screenshots/qa/load";
mkdirSync(OUT, { recursive: true });
const only = process.argv[2] ? process.argv[2].split(",") : null;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function open(modifier = "rush") {
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await p.addInitScript((m) => { let seed = 12345; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); localStorage.setItem("midnry-outpost-modifier", m); localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })); localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset: "balanced", options: { adaptive: false } })); }, modifier);
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 180000 });
  await p.evaluate(async () => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame); g.frame = 0; g.lockMouse = () => {};
    const { PRESETS } = await import("/games/outpost-academy.js");
    g.academy.preset = "balanced";
    g.academy.options = { ...PRESETS.balanced, width: 1600, adaptive: false };
    g.resize(); g.start(); g.protocolUI.brief.close();
    for (const e of g.arena.entities) { e.bot = false; if (e.id !== g.selfId) Object.assign(e, { x: 26.5, y: 1.5 }); }
    const r = g.military;
    Object.defineProperty(r.rig, "visible", { get: () => false, set() {} });
  });
  return p;
}
async function capture(p, name, setup) {
  if (only && !only.includes(name)) return;
  const data = await p.evaluate(({ setup }) => {
    const g = document.querySelector("midnry-fps").engine, r = g.military, a = g.arena;
    new Function("g", "a", setup)(g, a);
    g.protocolCache = null; r.frameProtocolArena = null;
    if (r.naturalLighting) r.naturalLighting.initialized = false;
    g.protocolUI.update(true);
    for (let i = 0; i < 4; i++) { g.time += 0.05; g.render(); }
    r.lastShadowAt = 0; const R = r.renderer, sm = R.shadowMap.render; let sh = 0; R.shadowMap.render = function (...a) { const b = R.info.render.calls; sm.apply(this, a); sh += R.info.render.calls - b; }; g.render(); R.shadowMap.render = sm;
    const cats = {}; r.scene.traverseVisible((o) => { if (!o.isMesh) return; let n = o, actor = false; while (n) { if ([...r.actors.values()].some((a) => a.root === n)) { actor = true; break; } n = n.parent; } const k = actor ? "actors" : o.isInstancedMesh ? "instanced" : o.userData.noBatch ? "noBatch" : "other"; cats[k] = (cats[k] || 0) + 1; }); window.__cats = JSON.stringify(cats) + " shadow=" + sh;
    window.__calls = r.renderer.info.render.calls + "c " + Math.round(r.renderer.info.render.triangles / 1000) + "k";
    return r.renderer.domElement.toDataURL("image/webp", 0.9);
  }, { setup });
  const bytes = Buffer.from(data.split(",")[1], "base64");
  writeFileSync(`${OUT}/${name}.webp`, bytes);
  console.log(name, await p.evaluate(() => window.__calls + " " + window.__cats));
}
const place = (moves) => moves.map(([i, x, y, ang]) => `Object.assign(a.entities.filter(e=>e.id!==g.selfId)[${i}], {x:${x}, y:${y}, a:${ang}});`).join("");
let p = await open();
await capture(p, "road", `Object.assign(g.player,{x:1.5,y:26.5,a:0}); g.viewPitch=0.1; ${place([[0, 6.0, 26.4, Math.PI], [1, 9.0, 26.6, Math.PI]])}`);
await capture(p, "gate", `Object.assign(g.player,{x:13.5,y:22.2,a:Math.PI/2}); g.viewPitch=0.04; ${place([[0, 13.2, 24.6, -Math.PI / 2], [1, 14.2, 25.4, -Math.PI / 2]])}`);
await capture(p, "hangar", `Object.assign(g.player,{x:19.6,y:15.2,a:0.95}); g.viewPitch=-0.02; ${place([[0, 21.2, 17.6, 2.2], [1, 22.3, 18.9, 3.6]])}`);
await capture(p, "passage", `Object.assign(g.player,{x:2.4,y:10.6,a:0}); g.viewPitch=0.02; ${place([[0, 6.5, 10.3, Math.PI], [1, 8.0, 11.2, Math.PI], [2, 11.5, 10.7, Math.PI]])}`);
await capture(p, "stores", `Object.assign(g.player,{x:14.5,y:14.8,a:-Math.PI/2}); g.viewPitch=-0.02; ${place([[0, 14.2, 12.6, Math.PI / 2]])}`);
await capture(p, "patrol", `Object.assign(g.player,{x:3.5,y:5.5,a:0}); g.viewPitch=0; ${place([[0, 5.0, 5.3, Math.PI], [1, 5.6, 5.9, Math.PI * 1.1], [2, 6.4, 5.4, Math.PI]])}`);
await capture(p, "fire", `a.protocol.events.push({id:"ev-shot",kind:"fire",active:true,startedAt:a.time,until:a.time+40,x:6.5,y:13.5,room:"Barracks"}); Object.assign(g.player,{x:6.5,y:15.8,a:-Math.PI/2}); g.viewPitch=0.02; ${place([[0, 7.2, 14.6, -Math.PI / 2]])}`);
await capture(p, "medevac", `const m=a.protocol.mission; for(const i of m.manifest) i.loaded=i.required; Object.assign(g.player,{x:m.loading.x,y:m.loading.y}); a.departMission(g.player); g.mapId=a.mapId; Object.assign(g.player,{x:8.5,y:2.5,a:-Math.PI/2}); m.vehicle.progress=60;`);
await p.close();
p = await open("night-shift");
await capture(p, "night", `Object.assign(g.player,{x:1.5,y:26.5,a:0}); g.viewPitch=0.12; ${place([[0, 7.5, 26.4, Math.PI]])}`);
await capture(p, "night-gate", `Object.assign(g.player,{x:1.5,y:21.2,a:Math.PI/2}); g.viewPitch=0.1;`);
await b.close();
