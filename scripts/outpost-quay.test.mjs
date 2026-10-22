import test from "node:test";
import assert from "node:assert/strict";
import { Arena, MAPS } from "../public/games/outpost-sim.js";
import { QUAY_PLAN, QUAY_SIZE } from "../public/games/outpost-quay.js";
import { DISASTER_OF, placeHazards } from "../public/games/outpost-hazards.js";

const arena = () => new Arena({ mapId: "quay", mode: "signal", random: () => 0.5 });
const at = (x, y) => QUAY_PLAN[y][x];

test("Calder Quay: a 30 × 30 town with Market Square at the centre the Red Haze closes on", () => {
  const a = arena();
  assert.equal(a.level.length, QUAY_SIZE);
  assert.equal(QUAY_SIZE, 30);
  assert.equal(MAPS.quay.name, "Calder Quay");
  // The haze centre is paving in the square.
  assert.equal(a.zone.cx, 15);
  assert.equal(at(14, 14), ":");
  assert.equal(at(15, 15), ":");
  a.time = 200;
  a.updateZone();
  assert.ok(!a.outsideSafe({ x: 15, y: 15 }));
});

test("the canal splits the town; the three bridges are the only ways across", () => {
  const n = QUAY_SIZE,
    walk = (block) => {
      const seen = new Set(),
        queue = [[2, 1]];
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        if (x < 1 || y < 1 || x >= n - 1 || y >= n - 1 || seen.has(y * n + x)) continue;
        if (MAPS.quay.level[y][x] || block(x, y)) continue;
        seen.add(y * n + x);
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      return seen;
    };
  // With the bridges, the south bank (Hospital Road) is reachable ...
  assert.ok(walk(() => false).has(27 * n + 15));
  // ... without them it is not.
  assert.ok(!walk((x, y) => at(x, y) === "=").has(27 * n + 15));
  const bridges = new Set();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (at(x, y) === "=") bridges.add(x < 10 ? "mill" : x < 20 ? "avenue" : "dock");
  assert.deepEqual([...bridges].sort(), ["avenue", "dock", "mill"]);
});

test("blasts open cover but never the canal", () => {
  const a = arena();
  // A canal tile on the west reach, and a park tree.
  assert.equal(a.level[19][8], 6);
  a.breakCover(8.5, 19.5, 1.2);
  assert.equal(a.level[19][8], 6, "canal stays");
  assert.equal(a.level[11][2], 4);
  a.breakCover(2.5, 11.5, 0.6);
  assert.equal(a.level[11][2], 0, "a tree can be blown away");
});

test("a harbour storm, canisters and barriers like the other arenas", () => {
  assert.equal(DISASTER_OF.quay, "storm");
  const a = arena();
  const hazards = a.crates.filter((c) => c.kind);
  assert.ok(hazards.length >= 14, `hazards ${hazards.length}`);
  // Deterministic per arena.
  assert.deepEqual(
    placeHazards(MAPS.quay.level, "quay", a.spawns || [], MAPS.quay.crates).map((h) => [h.x, h.y]),
    placeHazards(MAPS.quay.level, "quay", a.spawns || [], MAPS.quay.crates).map((h) => [h.x, h.y]),
  );
});

test("bots play out full Calder Quay rounds: someone wins, nobody gets stuck", () => {
  const lengths = [];
  for (let seed = 1; seed <= 12; seed++) {
    let s = seed * 9301;
    const random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const a = new Arena({ mapId: "quay", mode: "signal", random });
    for (const e of a.entities) e.bot = true;
    let t = 0;
    while (a.state === "playing" && t < 400) {
      a.advance(0.05);
      t += 0.05;
    }
    assert.notEqual(a.state, "playing", `seed ${seed} still running at ${t.toFixed(0)} s`);
    lengths.push(t);
  }
  const mean = lengths.reduce((x, y) => x + y) / lengths.length;
  assert.ok(mean > 45 && mean < 240, `mean round ${mean.toFixed(0)} s`);
});

test("canal water: see and shoot across it, never walk across it", () => {
  const a = arena(),
    [me, rival] = a.entities;
  for (const e of a.entities.slice(2)) e.hp = 0;
  a.crates = [];
  a.disaster = null;
  // Either bank of the west reach (canal rows 19–20), clear of planters.
  Object.assign(me, { x: 6.5, y: 18.5, a: Math.PI / 2, pitch: 0, hp: me.maxHp, shieldUntil: 0 });
  Object.assign(rival, { x: 6.5, y: 21.5, hp: rival.maxHp, shieldUntil: 0, bot: false });
  assert.equal(a.level[18][6], 0);
  assert.equal(a.level[19][6], 6);
  assert.equal(a.level[20][6], 6);
  assert.equal(a.level[21][6], 0);
  assert.equal(a.visible(me, rival), true, "sight crosses water");
  assert.equal(a.visible(rival, me), true);
  assert.ok(a.cast(6.5, 18.5, 0, 1).distance > 3, "a shot is not stopped by water");
  assert.equal(a.canMove(6.5, 19.5), false, "no wading");
  const hp = rival.hp;
  for (let i = 0; i < 20; i++) {
    me.cooldown = 0;
    a.shoot(me);
    a.advance(1 / 30);
  }
  assert.ok(rival.hp < hp, "shots land across the canal");
  // A walk to the far bank goes over a bridge.
  const path = a.pathTo(me, { x: 6.5, y: 21.5 });
  assert.ok(path.length > 0);
  assert.ok(path.some((p) => QUAY_PLAN[Math.floor(p.y)][Math.floor(p.x)] === "="), "route uses a bridge");
});

test("walls still block sight and shots in the town", () => {
  const a = arena(),
    [me, rival] = a.entities;
  // Either side of the Police Post's west wall (x 10) on row 4.
  Object.assign(me, { x: 9.5, y: 4.5 });
  Object.assign(rival, { x: 12.5, y: 4.5 });
  assert.equal(a.level[4][10], 1);
  assert.equal(a.visible(me, rival), false);
});
