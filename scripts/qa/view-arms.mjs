// Photographs the first-person arms and weapon in a Last Signal round with
// the HUD hidden: checks that the Locker character and weapon you chose
// carry into the match, and that the sleeve's cut end shows no dark shard
// on a phone's tall view (93° vertical field of view).
//   node scripts/qa/view-arms.mjs [character=operator] [weapon=carbine] [width=390]
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const [character = "operator", weapon = "carbine", width = "390"] = process.argv.slice(2);
const W = Number(width), M = W < 500, H = M ? 844 : 720;
mkdirSync("screenshots/qa/arms", { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
await p.addInitScript(({ character, weapon }) => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-character", character);
  localStorage.setItem("midnry-outpost-weapon", weapon);
}, { character, weapon });
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await pickGame(p, "signal", { timeout: 60000 });
await p.waitForTimeout(1000);
await play(p, { timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.running, null, { timeout: 120000 });
// Keep the player alive while the character loads (the headless renderer is slow).
await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; g.player.shieldUntil = 1e9; for (const e of g.arena.entities) if (e !== g.player) Object.assign(e, { bot: false, x: 1.5, y: 1.5 }); });
// Give the chosen character time to load and reach the arms.
await p.waitForFunction((id) => { const r = document.querySelector("midnry-fps").engine.military; return id === "operator" || (r.characterAssets?.has(id) && r.weaponHands !== r.soldier); }, character, { timeout: 300000 }).catch(() => {});
await p.waitForTimeout(2000);
await p.addStyleTag({ content: ".mf-touch, .mf-top, .mf-bottom, .mf-cross, .mf-toast, .mf-sig-status, .mf-sig-shield, .mf-sig-haze, .mf-super { visibility: hidden !important }" });
const info = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine, r = g.military;
  cancelAnimationFrame(g.frame); g.frame = 0;
  for (let i = 0; i < 3; i++) g.render();
  const arms = r.weaponHands === r.soldier ? "operator" : g.character;
  return { chosen: { character: g.character, weapon: g.weapon }, inMatch: { weapon: g.player?.weapon, arms }, fov: +r.weaponCamera.fov.toFixed(1) };
});
await p.screenshot({ path: `screenshots/qa/arms/${character}-${weapon}-${W}.png` });
console.log(JSON.stringify(info));
const ok = info.inMatch.weapon === weapon && info.inMatch.arms === character;
console.log(ok ? "PASS chosen character and weapon are in the match" : "FAIL the match does not show the chosen loadout");
console.log("errors", errs);
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
