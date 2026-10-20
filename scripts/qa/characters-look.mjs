// Locker characters: the card grid (laptop + phone), choosing Ronin puts her in
// the lobby, and Last Signal dresses you and the bots as characters.
//   node scripts/qa/characters-look.mjs [width]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280),
  M = W < 500;
const OUT = "screenshots/qa/characters";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, { timeout: 240000 });
const result = {};
await p.evaluate(() => document.querySelector("midnry-fps").engine.retention.locker());
await p.waitForSelector(".mf-charcard img");
await p.waitForTimeout(800);
result.cards = await p.locator(".mf-charcard").count();
await p.screenshot({ path: `${OUT}/locker-${W}.png` });
await p.click('[data-character="ronin"]');
result.equipped = await p.locator('[data-character="ronin"] small').innerText();
result.saved = await p.evaluate(() => localStorage.getItem("midnry-outpost-character"));
result.overflow = await p.evaluate(() => document.querySelector(".mf-locker").scrollWidth > document.querySelector(".mf-locker").clientWidth);
await p.evaluate(() => document.querySelector(".mf-locker").close());
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.military.lobby.key.startsWith("ronin:true:"), null, { timeout: 120000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/lobby-ronin-${W}.png` });
// Last Signal: you are Ronin; the bots are other characters.
await pickGame(p, "signal", { timeout: 60000 });
await play(p, { timeout: 60000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000 });
await p.waitForFunction(
  () => {
    const r = document.querySelector("midnry-fps").engine.military;
    return [...r.actors.values()].filter((a) => a.character).length >= 5;
  },
  null,
  { timeout: 180000 },
);
result.actors = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  return [...g.military.actors.entries()].map(([id, a]) => `${id}:${a.character || "operator"}`);
});
// A look at a few of them: a third-person camera on a bot.
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine,
    me = g.arena.entities.find((e) => e.id === g.selfId),
    bots = g.arena.entities.filter((e) => e !== me).slice(0, 3);
  bots.forEach((bot, i) => Object.assign(bot, { x: me.x + Math.cos(me.a) * 3 + (i - 1) * 1.1, y: me.y + Math.sin(me.a) * 3 + (i - 1) * 0.2, a: me.a + Math.PI }));
  g.running = false;
});
await p.waitForTimeout(3000);
await p.screenshot({ path: `${OUT}/match-${W}.png` });
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok = result.cards === 12 && /equipped/i.test(result.equipped) && result.saved === "ronin" && !result.overflow && result.actors.some((a) => !a.endsWith(":operator")) && !errs.length;
if (!ok) process.exit(1);
