// First-person weapon look: each weapon at rest and mid-reload, laptop or phone.
//   node scripts/qa/weapon-look.mjs <tag> [width=1280] [weapons=carbine,scatter,twin,breach]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [tag = "now", width = "1280", list = "carbine,scatter,twin,breach"] = process.argv.slice(2);
const W = Number(width), M = W < 500;
const OUT = "screenshots/qa/weapons";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(800);
await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine, r = Math.random; Math.random = () => 0.1; g.reset(); Math.random = r; document.querySelector(".mf-start").click(); });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 180000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.military.weaponKit, null, { timeout: 60000 }).catch(() => console.log("NO WEAPON KIT"));
await p.waitForTimeout(3000);
for (const weapon of list.split(",")) {
  for (const reload of [0, 0.55]) {
    const info = await p.evaluate(({ weapon, reload }) => {
      const g = document.querySelector("midnry-fps").engine, arena = g.arena;
      cancelAnimationFrame(g.frame); g.frame = 0;
      for (const e of arena.entities) if (e !== g.player) Object.assign(e, { bot: false, x: 1.5, y: 1.5, hp: 1e6 });
      Object.assign(g.player, { x: 14, y: 10.5, a: 1.57, shieldUntil: 1e9, weapon });
      if (reload) g.player.reloadUntil = arena.time + 1.6 * reload; else g.player.reloadUntil = 0;
      g.lookPitch = -0.05;
      for (let i = 0; i < 4; i++) g.render();
      const rig = g.military.rig;
      let tris = 0, modelled = 0;
      rig.traverse((o) => { if (o.isMesh) { tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; if (o.userData.modelled) modelled++; } });
      return { weapon: g.military.weaponId, tris: Math.round(tris), modelled };
    }, { weapon, reload });
    await p.screenshot({ path: `${OUT}/${weapon}-${reload ? "reload" : "rest"}-${tag}-${W}.png` });
    console.log(weapon, reload ? "reload" : "rest", JSON.stringify(info));
  }
}
console.log("errors", errs);
await b.close();
