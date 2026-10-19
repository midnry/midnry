import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
await p.addInitScript(() => { let seed = 12345; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })); localStorage.setItem("midnry-outpost-modifier","rush"); localStorage.setItem("midnry-outpost-graphics", JSON.stringify({ preset:"balanced", options: { adaptive: false } })); });
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await p.click(".mf-start"); await p.waitForTimeout(3000);
const out = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine, r = g.military, SG = r.geo("protocol-sign",()=>null), mats = r.protocolSignMaterials || new Set(), res = [];
  const signs=[]; r.scene.traverse(o => { if (o.isMesh && (o.geometry === SG || mats.has(o.material)) && o.geometry.parameters?.width >= 1) signs.push(o); });
  r.scene.updateMatrixWorld(true);
  const V = signs[0].position.constructor; signs[0].geometry.computeBoundingBox(); const B = signs[0].geometry.boundingBox.constructor;
  const boxOf=(o,i)=>{ if(!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const b=o.geometry.boundingBox.clone();
    if (i!=null){ const m=o.matrixWorld.clone().constructor; const mm=new m(); o.getMatrixAt(i,mm); mm.premultiply(o.matrixWorld); return b.applyMatrix4(mm);} return b.applyMatrix4(o.matrixWorld); };
  const all=[]; r.scene.traverse(o=>{ if(o.isMesh && o.visible!==false) all.push(o); });
  for (const s of signs) {
    const w=s.geometry.parameters.width, h=s.geometry.parameters.height, sb=new B();
    for (const [u,v,z] of [[-.5,-.5,0],[.5,.5,0],[-.5,.5,.5],[.5,-.5,.5]]) sb.expandByPoint(new V(u*w,v*h,z).applyMatrix4(s.matrixWorld));
    const hits=[];
    for (const o of all) { if (o===s || mats.has(o.material) || o.parent===s.parent) continue;
      const n = o.isInstancedMesh ? o.count : 1;
      for (let i=0;i<Math.min(n,400);i++){ const b=boxOf(o,o.isInstancedMesh?i:null); const sz=new V(); b.getSize(sz);
        if ([sz.x,sz.y,sz.z].filter(d=>d>2.5).length>=2 && Math.min(sz.x,sz.y,sz.z)>0.5) continue;
        if (b.intersectsBox(sb)) hits.push(`${o.name||o.type}${o.isInstancedMesh?"#"+i:""} [${o.material?.name||""}] size ${sz.x.toFixed(2)}x${sz.y.toFixed(2)}x${sz.z.toFixed(2)} y ${b.min.y.toFixed(2)}-${b.max.y.toFixed(2)}`); }
    }
    if (hits.length) res.push({ sign: s.material.map?.name, at: [s.matrixWorld.elements[12].toFixed(1), s.matrixWorld.elements[13].toFixed(2), s.matrixWorld.elements[14].toFixed(1)], hits: hits.slice(0,8) });
  }
  return {signs: signs.length, res};
});
console.log(JSON.stringify(out,null,1));
await b.close();
