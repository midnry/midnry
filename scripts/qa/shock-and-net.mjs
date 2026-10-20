// Lightning after-shock (arcs on a rival, blue edge on you) and the network
// meter in an online room (badge + panel), on a phone-sized screen.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync("screenshots/qa/shock", { recursive: true });
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
const page = async () => {
  const p = await (
    await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  ).newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() =>
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })),
  );
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await p.waitForFunction(
    () => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled,
    null,
    { timeout: 180000 },
  );
  return p;
};
let p = await page();
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(800);
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine,
    r = Math.random;
  Math.random = () => 0.5;
  g.reset();
  Math.random = r;
  document.querySelector(".mf-start").click();
});
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {
  timeout: 180000,
});
await p.waitForTimeout(3000);
console.log(
  "shock",
  await p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine,
      a = g.arena;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 0 });
    a.time = a.disaster.startAt + 1;
    const rival = a.entities[1];
    Object.assign(g.player, { x: 18.5, y: 14.8, a: Math.PI / 2 });
    Object.assign(rival, { x: 18.5, y: 16.6, a: -Math.PI / 2 });
    rival.shockUntil = a.time + 4;
    g.viewPitch = 0;
    g.updateHUD(true);
    for (let i = 0; i < 4; i++) g.render();
    return JSON.stringify({
      edge: document.querySelector(".mf-shockfx").className,
      toast: document.querySelector(".mf-toast").textContent,
      arcs: g.military.hazards.arcs?.size,
    });
  }),
);
await p.screenshot({ path: "screenshots/qa/shock/shock-390.png" });
await p.close();
// Online room: create one and look at the network meter.
p = await page();
await p.click(".mf-onlinechoice");
await p.waitForTimeout(800);
await p
  .click(".mf-create", { timeout: 60000 })
  .catch((e) => console.log("create", e.message.slice(0, 80)));
await p.waitForTimeout(12000);
console.log(
  "online",
  await p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine,
      m = g.netMeter,
      badge = document.querySelector(".mf-netbadge");
    return JSON.stringify({
      online: !!g.online,
      ready: !!g.transport?.ready,
      badge: badge.hidden ? "hidden" : badge.textContent + " " + badge.dataset.tone,
      stats: m.stats(),
    });
  }),
);
await p.evaluate(() => document.querySelector("midnry-fps").engine.netMeter.open());
await p.waitForTimeout(600);
await p.screenshot({ path: "screenshots/qa/shock/netpanel-390.png" });
console.log(
  "panel",
  await p.evaluate(() =>
    document.querySelector(".mf-netpanel").innerText.replace(/\n+/g, " | ").slice(0, 300),
  ),
);
console.log("errors", errs);
await b.close();
