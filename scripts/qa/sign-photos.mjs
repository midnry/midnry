import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const S = "screenshots/qa/clash"; mkdirSync(S,{recursive:true});
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
await p.addInitScript(() => { let seed = 12345; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })); localStorage.setItem("midnry-outpost-modifier","rush"); localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset:"balanced", options: { adaptive: false } })); });
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await play(p); await p.waitForTimeout(3000);
const signs = await p.evaluate(() => {
  [...document.querySelectorAll("button")].find((x) => /Understood/.test(x.textContent))?.click();
  const g = document.querySelector("midnry-fps").engine; cancelAnimationFrame(g.frame); g.frame = 0; g.loop = () => {};
  document.querySelector(".mf-hud, .mf-protocol-hud")?.style.setProperty("display","none");
  const r = g.military, out = [];
  const SG = r.geo("protocol-sign",()=>null), mats = r.protocolSignMaterials || new Set();
  r.scene.traverse(o => { if (o.isMesh && (o.geometry === SG || mats.has(o.material)) && o.geometry.parameters?.width) {
    o.updateWorldMatrix(true,false); const e=o.matrixWorld.elements;
    out.push({ map: g.arena.mapId || g.mapId, x: e[12], y: e[13], z: e[14], nx: e[8], nz: e[10], w: o.geometry.parameters.width, h: o.geometry.parameters.height, title: o.material.map?.name || o.material.name });
  }});
  window.__signs = out; return out;
});
console.log("signs", signs.length);
let i=0;
for (const s of signs) {
  const len=Math.hypot(s.nx,s.nz)||1, d = Math.max(2.2, s.w*1.1);
  await p.evaluate(({s,len,d}) => { const g = document.querySelector("midnry-fps").engine;
    const cx=(s.x+s.nx/len*d)/3, cz=(s.z+s.nz/len*d)/3;
    Object.assign(g.player,{x:cx,y:cz,a:Math.atan2(-s.nz,-s.nx)}); g.viewPitch=Math.atan2(s.y-1.6,d)*1.0;
    for (const e of g.arena.entities) if (e.id!==g.selfId) Object.assign(e,{x:1.5,y:1.5});
    const me=g.arena.entities.find(e=>e.id===g.selfId); if(me) Object.assign(me,{x:cx,y:cz,a:g.player.a});
    g.protocolCache=null; g.military.frameProtocolArena=null; for (let k=0;k<3;k++){ g.time+=.05; g.render(); } }, {s,len,d});
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${S}/s${String(i).padStart(2,"0")}.png` }); i++;
}
console.log(JSON.stringify(signs.map((s,i)=>i+":"+s.title?.slice(0,40)+" "+s.w+"x"+s.h+" y="+s.y.toFixed(2))));
await b.close();
