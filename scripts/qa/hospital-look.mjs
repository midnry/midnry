// Blackout Protocol, Act III: fast-forward an offline Lifeline Run to the
// landing, then look at the field hospital (landing zone, ward, carrying a
// crate with its prompt), treat everyone and read the graded ending.
//   node scripts/qa/hospital-look.mjs [width]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame, play } from "./lobby-helpers.mjs";
const W = Number(process.argv[2] || 1280),
  M = W < 500;
const OUT = "screenshots/qa/hospital";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await b.newContext({ viewport: { width: W, height: M ? 844 : 720 }, isMobile: M, hasTouch: M });
ctx.setDefaultTimeout(180000);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => {
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  localStorage.setItem("midnry-outpost-practice", "done");
});
// MOD=night-shift (etc.) fixes the match modifier; default: a daylight round.
await p.addInitScript((mod) => localStorage.setItem("midnry-outpost-modifier", mod), process.env.MOD || "rush");
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.militaryLoaded, null, { timeout: 240000, polling: 1000 });
await pickGame(p, "protocol");
await play(p);
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.state === "playing", null, { timeout: 120000, polling: 1000 });
// Close the role briefing if shown.
await p.evaluate(() => document.querySelector(".mf-protocol-brief")?.close?.());
// Fast-forward: loaded manifest, take off, duties done, arrived, land.
await p.evaluate(async () => {
  const g = document.querySelector("midnry-fps").engine,
    a = g.arena,
    me = a.entities.find((e) => e.id === g.selfId);
  for (const e of a.entities) e.bot = false;
  a.privateFor(me).role = "operator";
  me.team = 0;
  for (const item of a.protocol.mission.manifest) item.loaded = item.required;
  Object.assign(me, { x: a.protocol.mission.loading.x, y: a.protocol.mission.loading.y });
  a.departMission(me);
  for (const t of a.protocol.mission.flightTasks) t.done = true;
  a.protocol.mission.vehicle.arrived = true;
  const { enterHospital } = await import("/games/outpost-hospital.js");
  enterHospital(a);
});
await p.waitForFunction(() => document.querySelector("midnry-fps").engine.military?.mapKey === "hospital" || document.querySelector("midnry-fps").engine.arena.mapId === "hospital", null, { polling: 1000 });
await p.waitForTimeout(8000);
const look = (x, y, a, pitch = 0) =>
  p.evaluate(
    ([x, y, a, pitch]) => {
      const g = document.querySelector("midnry-fps").engine,
        me = g.arena.entities.find((e) => e.id === g.selfId);
      Object.assign(me, { x, y, a });
      g.viewPitch = pitch;
    },
    [x, y, a, pitch],
  );
// Landing zone: from the ward path, looking back at the medevac and its cargo.
await look(9.5, 12.5, Math.PI + 0.25);
await p.waitForTimeout(3000);
await p.screenshot({ path: `${OUT}/landing-zone-${W}.png` });
// Carry a crate: stand at the ramp and unload.
const ramp = { x: 6.5, y: 10.5 };
await look(ramp.x, ramp.y, Math.PI);
await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  for (let t = 0; t < 3.2; t += 0.05) g.arena.advance(0.05, { [g.selfId]: { interact: true } });
});
const carrying = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine;
  return g.arena.privateFor(g.arena.entities.find((e) => e.id === g.selfId)).cargo?.name || null;
});
// The ward: look across the beds.
await look(16.5, 14.5, -Math.PI / 2 - 0.2);
await p.waitForTimeout(3000);
await p.screenshot({ path: `${OUT}/ward-${W}.png` });
// At a bed that needs the carried crate: the treat prompt.
const prompt = await p.evaluate(() => {
  const g = document.querySelector("midnry-fps").engine,
    a = g.arena,
    me = a.entities.find((e) => e.id === g.selfId),
    cargo = a.privateFor(me).cargo,
    pt = a.protocol.mission.patients.find((x) => x.needs.includes(cargo.supplyId));
  const bed = { "bed-1": [13.5, 10.5], "bed-2": [15.5, 10.5], "bed-3": [17.5, 10.5], "bed-4": [19.5, 12.5] }[pt.bed];
  Object.assign(me, { x: bed[0], y: bed[1] + 0.9, a: -Math.PI / 2 });
  return pt.name;
});
await p.waitForTimeout(2500);
const promptText = await p.evaluate(() => document.querySelector(".mf-protocol-context")?.innerText || document.querySelector("[class*=context]")?.innerText || "");
await p.screenshot({ path: `${OUT}/treat-prompt-${W}.png` });
// Treat everyone through the rules, then read the ending.
const end = await p.evaluate(async () => {
  const g = document.querySelector("midnry-fps").engine,
    a = g.arena,
    me = a.entities.find((e) => e.id === g.selfId),
    { HOSPITAL_MAP } = await import("/games/outpost-protocol-map.js"),
    { patientNeeds } = await import("/games/outpost-hospital.js");
  const hold = (s) => { for (let t = 0; t < s; t += 0.05) a.advance(0.05, { [me.id]: { interact: true } }); };
  for (let i = 0; i < 40 && a.state !== "ended"; i++) {
    const pl = a.privateFor(me);
    if (!pl.cargo) { Object.assign(me, { x: HOSPITAL_MAP.ramp.x, y: HOSPITAL_MAP.ramp.y }); hold(3.2); }
    if (!pl.cargo) break;
    const pt = a.protocol.mission.patients.find((x) => x.hp > 0 && !x.rescued && patientNeeds(x).includes(pl.cargo.supplyId));
    if (!pt) break;
    const bed = HOSPITAL_MAP.beds.find((bd) => bd.id === pt.bed);
    Object.assign(me, { x: bed.x, y: bed.y });
    hold(4.2);
  }
  return { state: a.state, winner: a.winner, ending: a.protocol.ending, reason: a.protocol.resultReason };
});
await p.waitForTimeout(4000);
await p.screenshot({ path: `${OUT}/ending-${W}.png` });
const result = { carrying, prompt, promptText, end, errors: errs };
console.log(JSON.stringify(result, null, 1));
await b.close();
if (!carrying || end.winner !== 0 || !end.ending?.title || errs.length) process.exit(1);
