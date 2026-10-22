import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, createArena, restoreArena } from "../public/games/outpost-protocol.js";
import { TOWN_MAP, PROTOCOL_MAP, PROTOCOL_BASES, baseOf } from "../public/games/outpost-protocol-map.js";
import { MAPS } from "../public/games/outpost-sim.js";

const tick = (a, s, input = {}) => {
  for (let t = 0; t < s; t += 1 / 20) a.advance(1 / 20, input);
};
const floor = (map, p) => map.level[Math.floor(p.y)]?.[Math.floor(p.x)] === 0;
const tile = (p) => `${Math.floor(p.x)},${Math.floor(p.y)}`;

test("Calder Quay is the Blackout base; Breakwater stays available by name", () => {
  assert.equal(baseOf().id, "town");
  assert.equal(baseOf("breakwater"), PROTOCOL_MAP);
  assert.deepEqual(Object.keys(PROTOCOL_BASES).sort(), ["breakwater", "town"]);
  assert.equal(MAPS.town.protocolOnly, true);
  const town = createArena({ mode: "protocol", mapId: "town", humans: [] });
  assert.equal(town.mapId, "town");
  assert.equal(town.base(), TOWN_MAP);
  assert.equal(town.level.length, 30);
  // An online snapshot keeps its base.
  assert.equal(restoreArena(JSON.parse(JSON.stringify(town.snapshot()))).base(), TOWN_MAP);
  // Rooms saved before bases existed restore as Breakwater.
  const old = JSON.parse(JSON.stringify(createArena({ mode: "protocol", humans: [] }).snapshot()));
  delete old.protocol.base;
  assert.equal(restoreArena(old).base(), PROTOCOL_MAP);
});

test("every Breakwater objective has a place in the town, on reachable open ground", () => {
  const key = (list) => list.map((s) => `${s.id}:${s.kind ?? s.supplyId}`).sort();
  assert.deepEqual(key(TOWN_MAP.stations), key(PROTOCOL_MAP.stations));
  for (const k of ["sites", "vents", "supplies", "spawns"]) assert.equal(TOWN_MAP[k].length, PROTOCOL_MAP[k].length, k);
  const stock = (m) => m.supplies.reduce((a, s) => ({ ...a, [s.supplyId]: (a[s.supplyId] || 0) + s.stock }), {});
  assert.deepEqual(stock(TOWN_MAP), stock(PROTOCOL_MAP));
  const points = [...TOWN_MAP.stations, ...TOWN_MAP.sites, ...TOWN_MAP.vents, ...TOWN_MAP.supplies, TOWN_MAP.loading, TOWN_MAP.emergency, ...TOWN_MAP.spawns.map(([x, y]) => ({ x, y }))];
  for (const p of points) assert.ok(floor(TOWN_MAP, p), `${p.id ?? "spawn"} on open ground`);
  const stations = new Set(TOWN_MAP.stations.map(tile));
  for (const s of TOWN_MAP.sites) assert.ok(!stations.has(tile(s)), `${s.id} not on a task panel`);
  for (const v of TOWN_MAP.vents) for (const l of v.links) assert.ok(TOWN_MAP.vents.find((o) => o.id === l).links.includes(v.id), `${v.id} ↔ ${l}`);
  // Bots can walk to every objective from the helipad.
  const a = createArena({ mode: "protocol", mapId: "town", humans: [] });
  const from = { x: TOWN_MAP.loading.x, y: TOWN_MAP.loading.y };
  for (const p of points) assert.ok(a.pathTo(from, p).length > 0 || tile(from) === tile(p), `route to ${p.id ?? p.x + "," + p.y}`);
});

test("smart operator bots finish the whole medical mission from the town", () => {
  const a = new ProtocolArena({ base: "town", humans: [], interactiveTasks: true, random: () => 0.4 });
  for (const e of a.entities) if (e.team === 1) e.bot = false;
  tick(a, 520);
  assert.equal(a.winner, 0);
  assert.equal(a.protocol.mission.phase, "delivered");
  assert.ok(a.protocol.mission.patients.some((p) => p.rescued));
});

test("town rounds end with a result on several seeds (infiltrators active too)", () => {
  for (let seed = 1; seed <= 6; seed++) {
    let s = seed * 7919;
    const random = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000;
    const a = new ProtocolArena({ base: "town", humans: [], interactiveTasks: true, variety: true, random });
    tick(a, 900);
    assert.equal(a.state, "ended", `seed ${seed} still running`);
  }
});

test("online players learn the base; nobody walks or swims across the canal in Blackout", async () => {
  const { protocolView } = await import("../public/games/outpost-protocol.js");
  const a = createArena({ mode: "protocol", mapId: "town", humans: [{ id: "h", team: 0 }] });
  const view = protocolView(JSON.parse(JSON.stringify(a.snapshot())), "h");
  assert.equal(view.protocol.base, "town");
  assert.equal(restoreArena(view).base(), TOWN_MAP);
  const h = a.entities.find((e) => e.id === "h");
  Object.assign(h, { x: 6.5, y: 18.5 });
  assert.equal(a.level[19][6], 6);
  a.move(h, 0, 1);
  assert.ok(h.y < 19, "water stops a Blackout player");
});
