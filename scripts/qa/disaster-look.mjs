// Realistic disasters: each Last Signal disaster forced on its own arena, in
// its warning and while it is on, photographed laptop + phone size.
//   node scripts/qa/disaster-look.mjs [width]   (default: 1280 then 390)
//   MAPS=skyport  only one arena;  BASE=http://127.0.0.1:8093  another server
// Sandstorm (Dust Outpost): dust wall far / close, inside the storm.
// Lightning storm (Skyport): darkening sky, charged ground, a bolt, scorch.
// Earthquake (Wreck Estate): cracking ground, collapse, reduced motion.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE || "http://127.0.0.1:8080";
const OUT = "screenshots/qa/disasters";
mkdirSync(OUT, { recursive: true });
const widths = process.argv[2] ? [Number(process.argv[2])] : [1280, 390];
const only = process.env.MAPS?.split(",");
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const errs = [];
for (const W of widths) {
  const M = W < 500,
    H = M ? 844 : 720;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(`${W} PAGEERROR ` + (e.stack || e.message).slice(0, 500)));
  p.on("console", (m) => m.type() === "error" && errs.push(`${W} ` + m.text().slice(0, 300)));
  await p.addInitScript(() => {
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
    localStorage.setItem(
      "midnry-outpost-graphics",
      JSON.stringify({ preset: "balanced", options: { adaptive: false } }),
    );
  });
  await p.goto(`${BASE}/games/outpost-zero.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(
    () => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled,
    null,
    { timeout: 180000 },
  );
  await p.click(".mf-gamepick [data-mode=signal]", { timeout: 60000 });
  await p.waitForTimeout(1000);
  await p.click(".mf-start", { timeout: 60000 });
  await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {
    timeout: 180000,
  });
  await p.waitForTimeout(3000);
  // Run `setup` with the loop stopped and bots frozen, then render `frames`
  // frames (particles move on real time between them).
  const shot = async (name, setup, frames = 6) => {
    const info = await p.evaluate(
      async ({ setup, frames }) => {
        const g = document.querySelector("midnry-fps").engine,
          a = g.arena;
        cancelAnimationFrame(g.frame);
        g.frame = 0;
        for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 1e9 });
        // Keep the Red Haze away: these photos are about the weather.
        a.zone.delay = 1e9;
        const out = new Function("g", "a", setup)(g, a);
        a.zone.delay = a.time + 240;
        a.updateZone();
        g.time = a.time;
        g.updateHUD(true);
        for (let i = 0; i < frames; i++) {
          g.render();
          await new Promise((r) => setTimeout(r, 30));
        }
        const banner = document.querySelector(".mf-disaster");
        return {
          out,
          banner: banner.hidden ? null : banner.textContent,
          weather: document.querySelector(".mf-weatherfx").className,
          calls: g.military.renderer.info.render.calls,
          tris: g.military.renderer.info.render.triangles,
        };
      },
      { setup, frames },
    );
    await p.screenshot({ path: `${OUT}/${name}-${W}.png` });
    console.log(W, name, JSON.stringify(info));
  };
  const start = (pick) =>
    p.evaluate((pick) => {
      const g = document.querySelector("midnry-fps").engine,
        r = Math.random;
      Math.random = () => pick;
      g.reset();
      Math.random = r;
      g.start();
    }, pick);
  // Stand somewhere open with a long view in direction `ang`.
  const open = `const open=(ang,want=7)=>{const n=a.level.length;let best=null;for(let y=3;y<n-3;y+=0.5)for(let x=3;x<n-3;x+=0.5){if(!a.canMove(x,y))continue;let k=0;while(k<want&&a.canMove(x+Math.cos(ang)*k,y+Math.sin(ang)*k))k+=0.5;const c=Math.hypot(x-n/2,y-n/2);const s=k*10-c;if(!best||s>best.s)best={x,y,s};}Object.assign(g.player,{x:best.x,y:best.y,a:ang});return best;};`;
  // Face a point from `dist` tiles away with a clear view.
  const face = `const face=(t,dist=2.6)=>{for(let k=0;k<32;k++){const ang=k*Math.PI/16,x=t.x+Math.cos(ang)*dist,y=t.y+Math.sin(ang)*dist;if(a.canMove(x,y)&&a.visible({x,y},t)){Object.assign(g.player,{x,y,a:ang+Math.PI});return true;}}return false;};`;
  const nosheet = `const hz=g.military.hazards;hz.nextSheet=performance.now()+1e7;hz.sheetUntil=0;`;
  const upwind = `const w=g.military.hazards?.wind||{x:1,y:0};const up=Math.atan2(-w.y,-w.x);`;
  for (const [pick, mapId] of [
    [0.1, "outpost"],
    [0.5, "skyport"],
    [0.9, "estate"],
  ]) {
    if (only && !only.includes(mapId)) continue;
    await start(pick);
    await p.waitForTimeout(2500);
    await p.emulateMedia({ reducedMotion: "no-preference" });
    if (mapId === "outpost") {
      await shot("sand-warning", `${open}${upwind}open(up,10);g.viewPitch=0.06;g.player.pitch=Math.tan(0.06);a.time=a.disaster.startAt-6;return a.disaster.kind;`);
      await shot("sand-wall", `${open}${upwind}open(up,10);g.viewPitch=0.06;g.player.pitch=Math.tan(0.06);a.time=a.disaster.startAt-1.6;return a.mapId;`);
      await shot("sand-on", `${open}${upwind}open(up+2.2,8);g.viewPitch=0;g.player.pitch=Math.tan(0);a.time=a.disaster.startAt+4;return a.mapId;`, 10);
      await shot("sand-on-down", `${open}${upwind}open(up+Math.PI,8);g.viewPitch=-0.1;g.player.pitch=Math.tan(-0.1);a.time=a.disaster.startAt+8;return a.mapId;`, 10);
    } else if (mapId === "skyport") {
      await shot("storm-warning", `${nosheet}${open}open(0.6,10);g.viewPitch=0.18;g.player.pitch=Math.tan(0.18);a.time=a.disaster.startAt-4;return a.disaster.kind;`);
      await shot(
        "storm-marked",
        `${nosheet}${face}a.time=a.disaster.startAt+0.5;let s;for(let i=0;i<120&&!(s=a.disaster.strikes.find(s=>s.at-a.time>0.5));i++)a.advance(1/30,{});for(const e of a.entities)e.hp=Math.max(e.hp,1);face(s,2.6);g.viewPitch=-0.32;g.player.pitch=Math.tan(-0.32);a.time=s.at-0.3;return {strike:s&&[s.x,s.y]};`,
        8,
      );
      await shot(
        "storm-bolt",
        `${nosheet}${face}let s;for(let i=0;i<120&&!(s=a.disaster.strikes[0]);i++)a.advance(1/30,{});for(const e of a.entities)e.hp=Math.max(e.hp,1);face(s,4.5);g.viewPitch=0.36;g.player.pitch=Math.tan(0.36);while(a.time<s.at+0.07)a.advance(1/60,{});for(const e of a.entities)e.hp=Math.max(e.hp,1);return {fx:a.fx.map(f=>f.kind).join()};`,
        3,
      );
      await shot(
        "storm-rain",
        `${nosheet}${open}open(2.4,8);g.viewPitch=-0.05;g.player.pitch=Math.tan(-0.05);a.time=a.disaster.startAt+8;a.disaster.strikes.length=0;return 1;`,
        8,
      );
      await shot(
        "storm-after",
        `${nosheet}${face}const t=a.terrain.find(t=>t.kind==='scorch');if(t)face(t,2.2);g.viewPitch=-0.42;g.player.pitch=Math.tan(-0.42);a.time=a.disaster.startAt+10;a.disaster.strikes.length=0;return !!t;`,
        6,
      );
    } else {
      await shot(
        "quake-warning",
        `${open}open(0.3,8);g.viewPitch=0;g.player.pitch=Math.tan(0);a.time=a.disaster.startAt-3;return a.disaster.kind;`,
      );
      await shot(
        "quake-marked",
        `${face}a.time=a.disaster.startAt+1;let s;for(let i=0;i<120&&!(s=a.disaster.strikes.find(s=>s.at-a.time>0.4));i++)a.advance(1/30,{});for(const e of a.entities)e.hp=Math.max(e.hp,1);face(s,2.2);g.viewPitch=-0.38;g.player.pitch=Math.tan(-0.38);a.time=s.at-0.35;return {strike:s&&[s.x,s.y]};`,
        8,
      );
      await shot(
        "quake-collapse",
        `${face}let s;for(let i=0;i<120&&!(s=a.disaster.strikes[0]);i++)a.advance(1/30,{});for(const e of a.entities)e.hp=Math.max(e.hp,1);face(s,4);g.viewPitch=-0.05;g.player.pitch=Math.tan(-0.05);while(a.time<s.at+0.25)a.advance(1/60,{});for(const e of a.entities)e.hp=Math.max(e.hp,1);return {fx:a.fx.map(f=>f.kind).join()};`,
        8,
      );
      await p.emulateMedia({ reducedMotion: "reduce" });
      await shot("quake-reduced", `a.time=Math.min(a.time+2,a.disaster.endAt-2);a.disaster.strikes.length=0;g.viewPitch=0;g.player.pitch=Math.tan(0);return 1;`, 4);
      await p.emulateMedia({ reducedMotion: "no-preference" });
      await shot(
        "quake-after",
        `${face}const d=a.disaster;while(a.time<d.endAt+0.5&&a.state!=='ended')a.advance(1/30,{});for(const e of a.entities)e.hp=Math.max(e.hp,1);const t=a.terrain.find(t=>t.kind==='crack');if(t)face(t,2.6);g.viewPitch=-0.35;g.player.pitch=Math.tan(-0.35);return a.terrain.length;`,
        6,
      );
    }
  }
  await ctx.close();
}
console.log("errors", errs);
await b.close();
process.exitCode = errs.length ? 1 : 0;
