// Red Haze edge and disaster fades: the haze curtain from inside the safe zone
// (near and far), from outside it, and a sandstorm / storm half rolled in.
//   node scripts/qa/signal-haze.mjs [width]   (390 = phone)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] ?? 1280),
  M = W < 500,
  H = M ? 844 : 720;
const OUT = "screenshots/qa/haze";
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
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(800);
const shot = async (name, pick, setup) => {
  const info = await p.evaluate(
    ({ pick, setup }) => {
      const g = document.querySelector("midnry-fps").engine;
      if (
        g.arena.mapId !== { 0.1: "outpost", 0.5: "skyport", 0.9: "estate" }[pick] ||
        g.state !== "playing"
      ) {
        const r = Math.random;
        Math.random = () => pick;
        g.reset();
        Math.random = r;
        g.start();
      }
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      const a = g.arena;
      for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 1e9 });
      const out = new Function("g", "a", setup)(g, a);
      a.updateZone();
      g.updateHUD(true);
      for (let i = 0; i < 4; i++) g.render();
      return out;
    },
    { pick, setup },
  );
  await p.screenshot({ path: `${OUT}/${name}-${W}.png` });
  console.log(name, JSON.stringify(info));
};
await p.click(".mf-start", { timeout: 60000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {
  timeout: 180000,
});
await p.waitForTimeout(3000);
// Dust Outpost with the zone part-closed: half = 13 - ... at 60 s.
// Stand `dist` tiles inside the zone edge at a spot with a clear view of it.
const face = (
  dist,
) => `a.time=a.zone.delay+60;a.updateZone();const z=a.zone;a.disaster.startAt=1e9;a.disaster.warnAt=1e9;
  for(let x=z.cx-z.half+1;x<z.cx+z.half-1;x+=0.5){const y=z.cy+z.half-${dist};if(a.canMove(x,y)&&a.visible({x,y},{x,y:z.cy+z.half+0.6})){Object.assign(g.player,{x,y,a:Math.PI/2});break;}}
  g.viewPitch=0;return {half:z.half.toFixed(1),x:g.player.x,y:g.player.y};`;
await shot("haze-near", 0.1, face(2));
await shot("haze-far", 0.1, face(7));
await shot(
  "haze-outside",
  0.1,
  `a.time=a.zone.delay+60;a.updateZone();const z=a.zone;Object.assign(g.player,{x:z.cx,y:z.cy+z.half+1.5,a:-Math.PI/2});g.viewPitch=0;return {}`,
);
await shot(
  "sand-half",
  0.1,
  `const d=a.disaster;d.warnAt=30;d.startAt=40;d.endAt=65;a.time=d.startAt-0.5;Object.assign(g.player,{x:a.zone.cx,y:a.zone.cy+3,a:Math.PI/2});return {k:g.military.hazards.fade().toFixed(2)}`,
);
await shot(
  "sand-full",
  0.1,
  `const d=a.disaster;a.time=d.startAt+5;return {k:g.military.hazards.fade().toFixed(2)}`,
);
await shot(
  "storm-half",
  0.5,
  `const d=a.disaster;d.warnAt=30;d.startAt=40;d.endAt=62;a.time=d.startAt-0.5;Object.assign(g.player,{x:18,y:18,a:Math.PI/2});g.viewPitch=0.2;const h=g.military.hazards;h.nextSheet=performance.now()+1e6;return {k:h.fade().toFixed(2)}`,
);
console.log("errors", errs);
await b.close();
