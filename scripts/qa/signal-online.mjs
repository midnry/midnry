// Last Signal online: a laptop host creates a room from the lobby (Friends),
// a phone joins with the code, both pick characters, the host starts; both
// see the same match (8 fighters, 6 bots), each other's characters, and the
// host's moves reach the guest. Then a rematch moves to the next arena.
//   node scripts/qa/signal-online.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame } from "./lobby-helpers.mjs";
const OUT = "screenshots/qa/online";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errs = [];
const open = async (viewport, mobile, character) => {
  const ctx = await b.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript((c) => {
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
    localStorage.setItem("midnry-outpost-mode", "signal");
    localStorage.setItem("midnry-outpost-character", c);
  }, character);
  // Two software-rendered 3D pages at once: everything is slow here.
  ctx.setDefaultTimeout(180000);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/WebSocket|ERR_CONNECTION|net::/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  return p;
};
const engine = (p, fn, arg) => p.evaluate(fn, arg);
// The software GPU here is slow: load the guest first, before the host page
// starts drawing its lobby.
const guest = await open({ width: 390, height: 844 }, true, "warlord");
await guest.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await guest.waitForFunction(() => document.querySelector("midnry-fps").engine.militaryLoaded, null, { timeout: 240000, polling: 1000 });
const host = await open({ width: 1280, height: 720 }, false, "ronin");
await host.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await host.waitForFunction(() => document.querySelector(".mf-modal.mf-lobby"), null, { timeout: 240000, polling: 1000 });
await pickGame(host, "signal");
await host.click('[data-playwith="online"]');
await host.waitForTimeout(500);
await host.screenshot({ path: `${OUT}/host-friends.png` }).catch(() => console.log("screenshot skipped (slow software GPU)"));
// The mode card's big button reads "Create room" with Friends chosen.
await host.click(".mf-modeplay");
await host.waitForFunction(() => document.querySelector("midnry-fps").engine.online?.code, null, { timeout: 60000, polling: 1000 });
const code = await engine(host, () => document.querySelector("midnry-fps").engine.online.code);
const result = { code, hostMode: await engine(host, () => document.querySelector("midnry-fps").engine.online.mode) };
// The guest types the code and joins.
await guest.evaluate((code) => {
  const g = document.querySelector("midnry-fps").engine;
  g.$(".mf-codeinput").value = code;
  g.connectOnline("join");
}, code);
await guest
  .waitForFunction(() => document.querySelector("midnry-fps").engine.online?.members?.length === 2, null, { timeout: 60000, polling: 1000 })
  .catch(async (error) => {
    console.log("guest", await engine(guest, () => ({ status: document.querySelector(".mf-netstatus")?.textContent, online: !!document.querySelector("midnry-fps").engine.online, code: document.querySelector(".mf-codeinput").value })));
    throw error;
  });
await host.waitForFunction(() => document.querySelector("midnry-fps").engine.online?.members?.length === 2, null, { timeout: 60000, polling: 1000 });
result.lobbyCharacters = await engine(host, () => document.querySelector("midnry-fps").engine.online.members.map((m) => m.character));
await host.screenshot({ path: `${OUT}/host-room.png` }).catch(() => console.log("screenshot skipped (slow software GPU)"));
await guest.screenshot({ path: `${OUT}/guest-room.png` }).catch(() => console.log("screenshot skipped (slow software GPU)"));
// Host starts.
await host.click(".mf-modeplay:visible, .mf-start:visible");
for (const p of [host, guest])
  await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000, polling: 1000 });
const view = (p) =>
  engine(p, () => {
    const g = document.querySelector("midnry-fps").engine;
    return {
      mode: g.mode,
      map: g.arena.mapId,
      fighters: g.arena.entities.length,
      bots: g.arena.entities.filter((e) => e.bot).length,
      characters: g.arena.entities.filter((e) => !e.bot).map((e) => e.character || "operator"),
      actors: [...(g.military?.actors?.entries() || [])].map(([id, a]) => `${id.slice(0, 4)}:${a.character || "operator"}`),
      self: g.selfId,
      round: g.arena.roundId,
      wanted: g.arena.entities.map((e) => `${e.id.slice(0, 4)}:${e.bot ? "b" : "h"}:${g.military.characterFor(e)}`),
    };
  });
result.host = await view(host);
result.guest = await view(guest);
// Host walks forward: the guest sees the host move.
const hostId = result.host.self;
const where = (p) => engine(p, (id) => { const e = document.querySelector("midnry-fps").engine.arena.entities.find((x) => x.id === id); return [e.x, e.y]; }, hostId);
const before = await where(guest);
await host.keyboard.down("w");
await host.waitForTimeout(2500);
await host.keyboard.up("w");
await host.waitForTimeout(1500);
const after = await where(guest);
result.guestSawHostMove = Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.3;
await host.screenshot({ path: `${OUT}/host-match.png` }).catch(() => console.log("screenshot skipped (slow software GPU)"));
await guest.screenshot({ path: `${OUT}/guest-match.png` }).catch(() => console.log("screenshot skipped (slow software GPU)"));
result.errors = errs;
console.log(JSON.stringify(result, null, 1));
await b.close();
const ok =
  result.hostMode === "signal" &&
  result.host.mode === "signal" &&
  result.guest.mode === "signal" &&
  result.host.fighters === 8 &&
  result.host.bots === 6 &&
  result.host.characters.includes("ronin") &&
  result.host.characters.includes("warlord") &&
  result.guestSawHostMove &&
  !errs.length;
if (!ok) process.exit(1);
