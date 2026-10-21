import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
const S = "screenshots/qa/signal";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const W of [1280, 390]) {
const M = W < 500, H = M ? 844 : 720;
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal"); await p.waitForTimeout(1500);
await play(p); await p.waitForTimeout(4000);
// Keep bots away and the player alive so movement is measured cleanly.
await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; window.__g = g; for (const e of g.arena.entities) if (e.id !== g.selfId) e.hp = 1e6; setInterval(()=>{ for (const e of g.arena.entities) if (e.id!==g.selfId){ e.x=1.5; e.y=1.5; } g.player.hp=Math.max(g.player.hp,50); },50); });
const buttons = await p.evaluate(() => ["mf-sprint","mf-slide"].map(c => { const el=document.querySelector("."+c); const r=el?.getBoundingClientRect(); return c+": "+(el && r.width>0 && getComputedStyle(el).display!=="none" && getComputedStyle(el).visibility!=="hidden" ? `visible ${Math.round(r.width)}x${Math.round(r.height)}` : "hidden"); }).join(", "));
console.log(W, "mode", await p.evaluate(()=>__g.mode), "| buttons", buttons);
const pos = () => p.evaluate(() => { const e=__g.arena.entities.find(x=>x.id===__g.selfId); return {x:e.x,y:e.y,t:__g.arena.time,sprinting:!!e.sprinting,sliding:(e.slideUntil||0)>__g.arena.time}; });
const dist = (a,b)=>(Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1e-3,b.t-a.t)).toFixed(2)+"/s";
if (!M) {
  await p.mouse.click(640, 360);
  let a = await pos(); await p.keyboard.down("w"); await p.waitForTimeout(1000); let b2 = await pos(); await p.keyboard.up("w");
  console.log(" walk 1s:", dist(a,b2), "tiles");
  await p.waitForTimeout(400);
  a = await pos(); await p.keyboard.down("Shift"); await p.keyboard.down("w"); await p.waitForTimeout(500); const mid = await pos(); await p.waitForTimeout(500); b2 = await pos();
  console.log(" sprint 1s:", dist(a,b2), "tiles, sprinting flag:", mid.sprinting);
  await p.keyboard.press("c"); let s; for(let k=0;k<20;k++){ s=await pos(); if(s.sliding) break; await p.waitForTimeout(50); } await p.screenshot({ path: `${S}/slide-${W}.png` });
  await p.waitForTimeout(600); const s2 = await pos();
  await p.keyboard.up("w"); await p.keyboard.up("Shift");
  console.log(" slide pressed: sliding flag", s.sliding, "| moved during slide", dist(s,s2));
} else {
  const self = () => p.evaluate(()=>{ const e=__g.arena.entities.find(x=>x.id===__g.selfId); return {x:e.x,y:e.y,sprinting:!!e.sprinting,sliding:(e.slideUntil||0)>__g.arena.time, t:__g.arena.time, run: document.querySelector(".mf-stick").classList.contains("mf-run")}; });
  const speed = async () => { const a=await self(); await p.waitForTimeout(1200); const b2=await self(); return (Math.hypot(b2.x-a.x,b2.y-a.y)/Math.max(1e-3,b2.t-a.t)).toFixed(2)+" tiles/s, run="+b2.run+", sprinting="+b2.sprinting; };
  const box = await p.locator(".mf-stick").boundingBox(); const cx=box.x+box.width/2, cy=box.y+box.height/2;
  const cdp = await p.context().newCDPSession(p);
  const tp = (x,y,id=1)=>({x,y,id,radiusX:5,radiusY:5,force:1});
  const move = (dx,dy)=>cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[tp(cx+dx,cy+dy)]});
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[tp(cx,cy)]});
  await move(0,-40); await p.waitForTimeout(300); console.log(" half push forward:", await speed());
  await move(0,-62); await p.waitForTimeout(300); console.log(" full push forward:", await speed());
  await p.screenshot({ path: `${S}/run-${W}.png` });
  const lb = await p.locator(".mf-slide").boundingBox();
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[tp(cx,cy-62),tp(lb.x+lb.width/2,lb.y+lb.height/2,3)]});
  let slid=false; for(let k=0;k<20;k++){ const s=await self(); if(s.sliding){slid=true;break;} await p.waitForTimeout(50); }
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[tp(cx,cy-62)]});
  console.log(" SLIDE while running:", slid);
  await p.waitForTimeout(800);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]}); await p.waitForTimeout(1500); console.log(" idle:", await speed()); await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[tp(cx,cy)]}); await move(62,0); await p.waitForTimeout(300); console.log(" full push sideways:", await speed());
  await move(0,62); await p.waitForTimeout(300); console.log(" full push backwards:", await speed());
  await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]}); await p.waitForTimeout(300);
  console.log(" released:", await speed(), "| sprint button:", await p.evaluate(()=>getComputedStyle(document.querySelector(".mf-sprint")).display));
}
console.log(" errors", errs);
await p.close();
}
await b.close();
