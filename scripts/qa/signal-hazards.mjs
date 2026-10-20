// Last Signal hazards and disasters: canisters / sandbags in view, a red
// canister exploding, the disaster warning banner, and each disaster while
// it is on (sandstorm, lightning storm with marked ground, earthquake).
//   node scripts/qa/signal-hazards.mjs [width]   (390 = phone; MAPS=skyport for one arena)
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] ?? 1280),
  M = W < 500,
  H = M ? 844 : 720;
const OUT = "screenshots/qa/hazards";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const p = await (
  await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })
).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + (e.stack || e.message).slice(0, 500)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem(
    "midnry-outpost-graphics",
    JSON.stringify({ preset: "balanced", options: { adaptive: false } }),
  );
});
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await p.waitForFunction(
  () => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled,
  null,
  { timeout: 180000 },
);
await pickGame(p, "signal", { timeout: 60000 });
await p.waitForTimeout(1000);
await play(p, { timeout: 60000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {
  timeout: 180000,
});
await p.waitForTimeout(3000);
const frame = (setup) =>
  p.evaluate(async (setup) => {
    const g = document.querySelector("midnry-fps").engine,
      a = g.arena;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    for (const e of a.entities) {
      e.bot = false;
      e.shieldUntil = 1e9;
    }
    const out = new Function("g", "a", setup)(g, a);
    g.updateHUD(true);
    for (let i = 0; i < 3; i++) g.render();
    const banner = document.querySelector(".mf-disaster");
    return {
      out,
      banner: banner.hidden ? null : banner.textContent,
      weather: document.querySelector(".mf-weatherfx").className,
      calls: g.military.renderer.info.render.calls,
    };
  }, setup);
// Face the nearest canister from 3 tiles away.
const face = `const c=a.crates.filter(c=>c.kind&&c.kind!=='barrier'&&c.hp>0).sort((p,q)=>Math.hypot(p.x-g.player.x,p.y-g.player.y)-Math.hypot(q.x-g.player.x,q.y-g.player.y))[0];
 let best=null;for(let k=0;k<16;k++){const ang=k*Math.PI/8,x=c.x+Math.cos(ang)*3,y=c.y+Math.sin(ang)*3;if(a.canMove(x,y)&&a.visible({x,y},c)){best={x,y,a:ang+Math.PI};break;}}
 if(best)Object.assign(g.player,best);g.viewPitch=-0.12;return c.kind+' at '+c.x+','+c.y;`;
const only = process.env.MAPS?.split(",");
for (const [pick, mapId] of [
  [0.1, "outpost"],
  [0.5, "skyport"],
  [0.9, "estate"],
]) {
  if (only && !only.includes(mapId)) continue;
  await p.evaluate((pick) => {
    const g = document.querySelector("midnry-fps").engine,
      r = Math.random;
    Math.random = () => pick;
    g.reset();
    Math.random = r;
    g.start();
  }, pick);
  await p.waitForTimeout(2500);
  console.log(mapId, "canister", JSON.stringify(await frame(face)));
  await p.screenshot({ path: `${OUT}/${mapId}-canister-${W}.png` });
  if (mapId === "outpost") {
    console.log(
      mapId,
      "boom",
      JSON.stringify(
        await frame(
          `const c=a.crates.filter(c=>c.kind&&c.kind!=='barrier'&&c.hp>0).sort((p,q)=>Math.hypot(p.x-g.player.x,p.y-g.player.y)-Math.hypot(q.x-g.player.x,q.y-g.player.y))[0]; c.kind='red'; a.time+=0.02; a.damage(c,99,g.player); a.time+=0.1; return a.fx.map(f=>f.kind).join(',');`,
        ),
      ),
    );
    await p.screenshot({ path: `${OUT}/${mapId}-explosion-${W}.png` });
  }
  console.log(
    mapId,
    "warning",
    JSON.stringify(await frame(`a.time=a.disaster.warnAt+3;return a.disaster.kind;`)),
  );
  await p.screenshot({ path: `${OUT}/${mapId}-warning-${W}.png` });
  console.log(
    mapId,
    "on",
    JSON.stringify(
      await frame(
        `a.time=a.disaster.startAt+0.5;for(let i=0;i<70;i++)a.advance(1/30,{});g.player.a+=0.4;const s=a.disaster.strikes[0];if(s&&a.disaster.kind!=='sandstorm'){Object.assign(g.player,{x:s.x-2.2,y:s.y,a:0});g.viewPitch=-0.25;}return {strikes:a.disaster.strikes.length,fx:a.fx.map(f=>f.kind).join(',')};`,
      ),
    ),
  );
  await p.screenshot({ path: `${OUT}/${mapId}-disaster-${W}.png` });
  // After the disaster: what it left on the ground.
  console.log(
    mapId,
    "after",
    JSON.stringify(
      await frame(`const d=a.disaster;while(a.time<d.endAt+0.5&&a.state!=="ended")a.advance(1/30,{});for(const e of a.entities)e.hp=e.hp||1;
 const kinds={};for(const t of a.terrain)kinds[t.kind]=(kinds[t.kind]||0)+1;
 const want={outpost:"sand",skyport:"scorch",estate:"crack"}[a.mapId];const t=a.terrain.find(t=>t.kind===want)||a.terrain[0];
 if(t){for(let k=0;k<16;k++){const ang=k*Math.PI/8,x=t.x+Math.cos(ang)*2.6,y=t.y+Math.sin(ang)*2.6;if(a.canMove(x,y)&&a.visible({x,y},t)){Object.assign(g.player,{x,y,a:ang+Math.PI});break;}}}
 g.viewPitch=-0.35;g.time=a.time;return kinds;`),
    ),
  );
  await p.screenshot({ path: `${OUT}/${mapId}-after-${W}.png` });
}
console.log("errors", errs);
await b.close();
