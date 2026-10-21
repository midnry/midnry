import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
const S = "screenshots/qa";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [w,h] of [[1280,720],[390,844]]) {
const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w<500, hasTouch: w<500 })).newPage();
const errors=[]; p.on("pageerror",e=>errors.push(e.message)); p.on("console",m=>m.type()==="error"&&errors.push(m.text()));
await p.addInitScript(() => { let seed = 12345; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })); });
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await play(p); await p.waitForTimeout(2500);
await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Understood/.test(x.textContent))?.click());
await p.waitForTimeout(3000);
const base = await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; return g.player.a; });
for (const [name, off] of [["ahead",0],["right",-Math.PI/2],["behind",Math.PI],["left",Math.PI/2]]) {
  // Face so that the route's first step lies in the named direction.
  const r = await p.evaluate(async (off) => {
    const g = document.querySelector("midnry-fps").engine, nav=g.navigation, pl=g.player;
    const t = nav.route.path.find(q=>Math.hypot(q.x-pl.x,q.y-pl.y)>.5) || nav.route.goal;
    const a = Math.atan2(t.y-pl.y,t.x-pl.x) + off;
    pl.a = a; const me=g.arena.entities.find(e=>e.id===g.selfId); if(me) me.a=a;
    nav.nextUpdate=0; await new Promise(r=>setTimeout(r,400)); g.protocolUI.update(true);
    await new Promise(r=>setTimeout(r,300));
    return getComputedStyle(g.protocolUI.context).getPropertyValue("--mf-navturn")+" a="+pl.a.toFixed(2);
  }, off);
  console.log(w, name, r);
  await p.waitForTimeout(2000); await p.screenshot({ path: `${S}/arrow-${name}-${w}.png` });
  console.log("  after shot", await p.evaluate(()=>{const g=document.querySelector("midnry-fps").engine;return getComputedStyle(g.protocolUI.context).getPropertyValue("--mf-navturn")+" a="+g.player.a.toFixed(2)+" before="+getComputedStyle(g.protocolUI.context,"::before").transform+" arrow="+getComputedStyle(g.navigation.arrow).transform}));
}
console.log("trail visible:", await p.evaluate(()=>document.querySelector("midnry-fps").engine.military?.groundTrail?.root.visible), "errors", errors);
await p.close();
}
await b.close();
