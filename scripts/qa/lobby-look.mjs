// Home lobby: "PLAY / OFFLINE" over the chosen game's name, the operator on a
// lit platform with name labels under the pads and "+" on empty ones, the
// operator card on the left, the Play card (Bots / Friends, game, room,
// Start match) bottom right; on phones one column with a bottom tab bar.
// Checks the unchosen state, the picker sheet (open, pick, close), dragging
// to turn the operator, Friends (create a room: code, ping chip, room sheet)
// and Start match starting the chosen game.
//   node scripts/qa/lobby-look.mjs [width]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] || 1280),
  M = W < 500;
const OUT = "screenshots/qa/lobby";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const p = await (await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M })).newPage();
// The first-match quick start cards are checked in feedback-ux.mjs; skip them here.
await p.addInitScript(() => localStorage.setItem("midnry-outpost-quickstart", JSON.stringify({ signal: true, protocol: true })));
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-modal.mf-lobby") && document.querySelector("midnry-fps").engine.military?.lobby?.actor, null, {
  timeout: 240000,
});
await p.waitForTimeout(1500);
const look = () =>
  p.evaluate(() => {
    const box = (s) => {
      const e = document.querySelector(s);
      if (!e || e.hidden || !e.offsetParent) return null;
      const r = e.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    };
    const g = document.querySelector("midnry-fps").engine;
    return {
      state: g.state,
      mode: g.mode,
      title: document.querySelector(".mf-modetitle")?.textContent,
      lobbyTitle: document.querySelector(".mf-lobbytitle")?.textContent,
      operator: document.querySelector(".mf-opname")?.textContent,
      pads: [...document.querySelectorAll(".mf-padname")].filter((e) => !e.hidden && e.textContent).map((e) => e.textContent),
      room: box(".mf-roomline") && document.querySelector(".mf-roomid")?.textContent,
      ping: box(".mf-ping"),
      tabbar: getComputedStyle(document.querySelector(".mf-hometop nav")).position === "fixed",
      play: document.querySelector(".mf-modeplay")?.textContent,
      modeCard: box(".mf-modecard"),
      opcard: box(".mf-opcard"),
      squad: [...document.querySelectorAll(".mf-squad [data-invite]")].map((e) => {
        const r = e.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y)];
      }),
      picker: document.querySelector(".mf-modal").classList.contains("mf-picking"),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
const result = { fresh: await look() };
await p.screenshot({ path: `${OUT}/lobby-unchosen-${W}.png` });
// Play without a game opens the picker sheet.
await p.click(".mf-modeplay");
await p.waitForTimeout(800);
result.afterPlay = await look();
await p.screenshot({ path: `${OUT}/picker-${W}.png` });
await p.click(".mf-gamepick [data-mode=signal]");
await p.waitForTimeout(900);
if ((await look()).picker) await p.click(".mf-pickerclose");
await p.waitForTimeout(600);
result.chosen = await look();
// Drag to turn the operator.
const spin0 = await p.evaluate(() => document.querySelector("midnry-fps").engine.military.lobby.actor.root.rotation.y);
await p.mouse.move(W / 2, 300);
await p.mouse.down();
await p.mouse.move(W / 2 + 120, 300, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(100);
result.turned = Math.abs((await p.evaluate(() => document.querySelector("midnry-fps").engine.military.lobby.actor.root.rotation.y)) - spin0) > 0.2;
await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/lobby-signal-${W}.png` });
result.signal = await look();
// Friends: the big button creates a room; the card shows its code.
await p.click('[data-playwith="online"]');
await p.waitForTimeout(500);
await p.click(".mf-modeplay");
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.online?.code, null, { timeout: 60000, polling: 1000 });
await p.waitForTimeout(2500);
result.friends = await look();
await p.screenshot({ path: `${OUT}/lobby-friends-${W}.png` });
await p.click(".mf-roominvite");
await p.waitForTimeout(500);
result.roomSheet = await p.evaluate(() => document.querySelector(".mf-modal").classList.contains("mf-roomopen") && !!document.querySelector(".mf-roomsheet .mf-copyinvite"));
await p.screenshot({ path: `${OUT}/room-sheet-${W}.png` });
await p.keyboard.press("Escape");
await p.waitForTimeout(300);
await p.click(".mf-modeplay");
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000 });
result.started = await look();
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok =
  result.fresh.modeCard &&
  result.fresh.squad.length === 2 &&
  result.afterPlay.picker &&
  result.afterPlay.state === "fresh" &&
  !result.chosen.picker &&
  /last signal/i.test(result.chosen.title) &&
  /play\s*\/\s*offline\s*last signal/i.test(result.signal.lobbyTitle) &&
  result.signal.pads.length === 1 &&
  /play\s*\/\s*online/i.test(result.friends.lobbyTitle) &&
  /^[A-Z0-9]{6}$/.test(result.friends.room || "") &&
  result.friends.ping &&
  result.roomSheet &&
  result.fresh.tabbar === M &&
  result.turned &&
  result.started.mode === "signal" &&
  !result.fresh.overflow &&
  !errs.length;
if (!ok) process.exit(1);
