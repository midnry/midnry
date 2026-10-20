// Locker card art: each character on the lobby stage, head to knees, saved as
// screenshots/qa/char-<id>.png; scripts/assets/pack-character-cards.mjs makes
// public/games/menu/characters/<id>.webp (240x320). Needs the dev server.
//   node scripts/capture-outpost-characters.mjs [id...]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { CHARACTERS } from "../public/games/outpost-characters.js";
mkdirSync("screenshots/qa", { recursive: true });
const only = process.argv.slice(2);
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await (await b.newContext({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, { timeout: 240000 });
// Only the stage: no menu over it.
await p.addStyleTag({ content: "midnry-fps .mf-shell > :not(canvas) { visibility: hidden !important; }" });
await p.evaluate(() => (document.querySelector("midnry-fps").engine.military.lobby.cardShot = true));
const report = [];
for (const c of CHARACTERS) {
  if (only.length && !only.includes(c.id)) continue;
  await p.evaluate((id) => document.querySelector("midnry-fps").engine.chooseCharacter(id), c.id);
  await p.waitForFunction(
    (id) => {
      const g = document.querySelector("midnry-fps").engine,
        lobby = g.military.lobby;
      return lobby.key.startsWith(`${id}:true:`) && lobby.actor;
    },
    c.id,
    { timeout: 120000 },
  );
  await p.waitForTimeout(1500);
  // 3:4 card: the middle of the 600x800 stage.
  const shot = await p.screenshot({ clip: { x: 75, y: 70, width: 450, height: 600 }, type: "png" });
  writeFileSync(`screenshots/qa/char-${c.id}.png`, shot);
  report.push(c.id);
}
await b.close();
console.log(JSON.stringify({ captured: report, errors }));
