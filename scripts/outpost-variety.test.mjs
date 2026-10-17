import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { PROTOCOL_MAP, MEDICAL_SUPPLIES } from "../public/games/outpost-protocol-map.js";
import {
  MODIFIERS,
  TWISTS,
  dealSupplies,
  liveSites,
  rollMatch,
  modifierChoice,
} from "../public/games/outpost-variety.js";

// A small seeded generator so every case is reproducible.
const seeded = (seed) => () => {
  // mulberry32: well mixed even for small consecutive seeds.
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const tick = (arena, seconds, inputs = {}) => {
  for (let left = seconds; left > 1e-8; left -= 0.05) arena.advance(Math.min(left, 0.05), inputs);
};
const manifest = () => MEDICAL_SUPPLIES.map((item) => ({ ...item, loaded: 0 }));
const match = (seed, extra = {}) =>
  new ProtocolArena({ humans: [], variety: true, random: seeded(seed), ...extra });

test("dealt cabinets always cover the manifest, two cases at most, one kind each", () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const spare of [0, 2]) {
      const items = manifest();
      const stock = dealSupplies(seeded(seed), PROTOCOL_MAP.supplies, items, spare);
      assert.equal(stock.length, PROTOCOL_MAP.supplies.length);
      assert.equal(new Set(stock.map((s) => s.id)).size, stock.length);
      for (const s of stock) assert.ok(s.stock >= 0 && s.stock <= 2);
      for (const item of items) {
        const total = stock.filter((s) => s.supplyId === item.id).reduce((n, s) => n + s.stock, 0);
        assert.ok(total >= item.required, `seed ${seed}: ${item.id} short`);
      }
      const total = stock.reduce((n, s) => n + s.stock, 0);
      assert.equal(total, 13 + spare);
    }
  }
});

test("layouts really change between rounds", () => {
  const layouts = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    const stock = match(seed).protocol.mission.supplyStock;
    layouts.add(stock.map((s) => `${s.id}:${s.supplyId}:${s.stock}`).join("|"));
  }
  assert.ok(layouts.size >= 15, `only ${layouts.size} distinct layouts`);
});

test("one live charge socket per room, enough rooms for three charges", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const sites = liveSites(seeded(seed), PROTOCOL_MAP.sites);
    const rooms = new Set(PROTOCOL_MAP.sites.map((s) => s.room));
    assert.equal(sites.length, rooms.size);
    assert.equal(new Set(sites.map((s) => s.room)).size, rooms.size);
    assert.ok(sites.length >= 3);
  }
});

test("every modifier and twist comes up, and a host can lock a modifier", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const roll = rollMatch(seeded(seed));
    seen.add(roll.modifier);
    seen.add(roll.twist);
  }
  for (const m of [...MODIFIERS, ...TWISTS]) assert.ok(seen.has(m.id), `${m.id} never rolled`);
  assert.equal(rollMatch(seeded(3), "rush").modifier, "rush");
  assert.equal(modifierChoice("nonsense"), "random");
  assert.equal(match(4, { modifier: "lone-wolf" }).protocol.match.modifier, "lone-wolf");
});

test("modifiers change the rules they promise", () => {
  const lone = match(5, { modifier: "lone-wolf" });
  assert.equal(lone.entities.filter((e) => e.team === 1).length, 1);
  assert.equal(lone.protocol.killCooldown, 15);
  const dark = match(6, { modifier: "blackout" });
  assert.equal(dark.protocol.sabotage.powerUntil, 45);
  assert.equal(dark.sightRange(), 2.6);
  assert.equal(match(7, { modifier: "radio-silence" }).protocol.emergencyReadyAt, 60);
  const critical = match(8, { modifier: "critical" }).protocol.mission.patients;
  assert.equal(critical.filter((p) => p.critical).length, 1);
  assert.ok(critical.find((p) => p.critical).decay > 0.3);
  const short = match(9, { modifier: "short-supplies" }).protocol.mission.supplyStock;
  assert.equal(short.reduce((n, s) => n + s.stock, 0), 13);
  const rush = match(10, { modifier: "rush" }).protocol.mission;
  assert.ok(rush.vehicle.duration < (rush.twist === "headwind" ? 150 : 120));
  assert.ok(rush.patients[0].decay > 0.22);
});

test("twists: priority cargo, headwind and mid-flight turbulence", () => {
  let priority, headwind, turbulence;
  for (let seed = 1; seed <= 60 && !(priority && headwind && turbulence); seed++) {
    const a = match(seed, { modifier: "blackout" });
    const twist = a.protocol.match.twist;
    if (twist === "priority") priority ??= a;
    if (twist === "headwind") headwind ??= a;
    if (twist === "turbulence") turbulence ??= a;
  }
  const m = priority.protocol.mission;
  assert.equal(m.manifest.find((i) => i.id === m.priority).required, MEDICAL_SUPPLIES.find((i) => i.id === m.priority).required + 1);
  assert.equal(m.supplyStock.reduce((n, s) => n + s.stock, 0), 14 + 2);
  assert.equal(headwind.protocol.mission.vehicle.duration, 150);
  // Fly the turbulence match straight to the halfway point.
  const t = turbulence;
  for (const item of t.protocol.mission.manifest) item.loaded = item.required;
  const pilot = t.entities.find((e) => e.team === 0);
  pilot.x = t.protocol.mission.loading.x;
  pilot.y = t.protocol.mission.loading.y;
  for (const e of t.entities) e.bot = false;
  assert.ok(t.departMission(pilot));
  const v = t.protocol.mission.vehicle;
  tick(t, v.duration / 2 + 0.2);
  assert.equal(v.autopilot, false);
  assert.equal(v.turbulence, true);
  assert.ok(v.recoveryDeadline - t.time > 25);
  assert.match(t.protocol.log.at(-1).text, /Turbulence/);
});

test("players see the match's modifier and twist; snapshots keep the dealt layout", () => {
  const a = match(11);
  const view = protocolView(a.snapshot(), a.entities[0].id).protocol;
  assert.deepEqual(view.match, a.protocol.match);
  assert.equal(view.mission.twist, a.protocol.match.twist);
  const restored = ProtocolArena.restore(JSON.parse(JSON.stringify(a.snapshot())));
  assert.deepEqual(restored.protocol.mission.supplyStock, a.protocol.mission.supplyStock);
});

test("smart bots still finish a varied medical run", () => {
  let wins = 0;
  for (const seed of [21, 22, 23, 24]) {
    const a = match(seed, { interactiveTasks: true, modifier: "short-supplies" });
    for (const e of a.entities) if (e.team === 1) e.bot = false;
    tick(a, 520);
    if (a.winner === 0 && a.protocol.mission.phase === "delivered") wins++;
  }
  assert.ok(wins >= 3, `bots delivered in only ${wins}/4 varied rounds`);
});

test("practice and tests keep the classic fixed round", () => {
  const a = new ProtocolArena({ humans: [], random: seeded(2) });
  assert.deepEqual(a.protocol.match, { modifier: null, twist: null });
  assert.equal(a.protocol.sites.length, PROTOCOL_MAP.sites.length);
  assert.equal(a.protocol.mission.vehicle.duration, 120);
});

test("Night shift trims sight to 5 tiles; a blackout still cuts it to 2.6", async () => {
  const { sightRange } = await import("../public/games/outpost-variety.js");
  const night = { match: { modifier: "night-shift" }, sabotage: { powerUntil: 0 } };
  assert.equal(sightRange(night, 10), 5);
  assert.equal(sightRange({ ...night, sabotage: { powerUntil: 20 } }, 10), 2.6);
  assert.equal(sightRange({ match: { modifier: "rush" }, sabotage: { powerUntil: 0 } }, 10), 7);
});
