import test from "node:test";
import assert from "node:assert/strict";
import { Arena, MAPS, WEAPONS } from "../public/games/outpost-sim.js";
const setup = (weapon = "carbine", distance = 2) => {
  // Raw weapon mechanics on plain free-for-all rules: Last Signal's pacing
  // (start shield, lives, reduced damage) is covered in outpost-sim.test.mjs.
  const a = new Arena({ mode: "versus", weapon, random: () => 0.5 });
  a.level = a.level.map((row, y) =>
    row.map((v, x) => (x === 0 || y === 0 || x === 15 || y === 15 ? 1 : 0)),
  );
  a.crates = [];
  const p = a.entities[0],
    target = a.entities[1];
  p.x = 3;
  p.y = 8;
  p.a = 0;
  target.x = 3 + distance;
  target.y = 8;
  target.bot = false;
  target.hp = target.maxHp = 1000;
  for (const e of a.entities.slice(2)) e.hp = 0;
  return { a, p, target };
};
const advance = (a, seconds) => {
  for (let t = 0; t < seconds; t += 0.025) a.advance(0.025);
};
test("five distinct arenas: sealed walls, connected lanes, valid spawns and safe centers", () => {
  const combatMaps = Object.keys(MAPS).filter((id) => !["breakwater", "medevac"].includes(id));
  assert.equal(combatMaps.length, 5);
  const layouts = new Set();
  for (const mapId of combatMaps)
    for (const mode of ["training", "signal", "duo"]) {
      const a = new Arena({ mapId, mode, random: () => 0.5 }),
        n = a.level.length;
      layouts.add(JSON.stringify(a.level));
      assert.ok(
        a.level[0].every(Boolean) &&
          a.level[n - 1].every(Boolean) &&
          a.level.every((r) => r[0] && r[n - 1]),
      );
      assert.ok(
        a.entities.every((e) => a.canMove(e.x, e.y)),
        mapId + " spawn",
      );
      if (mode !== "training") {
        assert.ok(!a.wall(a.zone.cx, a.zone.cy));
        assert.ok(
          a.entities.every((e) => a.pathTo(e, { x: a.zone.cx, y: a.zone.cy }).length > 0),
          mapId + " route",
        );
      }
      a.time = 200;
      a.updateZone();
      assert.ok(!a.outsideSafe({ x: a.zone.cx, y: a.zone.cy }));
      const reachable = new Set(),
        queue = [[1, 1]];
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i],
          k = y * n + x;
        if (reachable.has(k) || a.wall(x + 0.5, y + 0.5)) continue;
        reachable.add(k);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          if (x + dx > 0 && y + dy > 0 && x + dx < n - 1 && y + dy < n - 1)
            queue.push([x + dx, y + dy]);
      }
      assert.equal(
        reachable.size,
        a.level.flat().filter((v) => !v).length,
        mapId + " disconnected room",
      );
    }
  assert.ok(layouts.size >= 5);
});
test("Last Signal arenas are large, spread their spawns and scale supply crates with area", () => {
  const sizes = { outpost: 28, skyport: 36, estate: 32 };
  for (const [mapId, size] of Object.entries(sizes)) {
    const a = new Arena({ mapId, mode: "signal", random: () => 0.5 }),
      open = a.level.flat().filter((v) => !v).length;
    assert.equal(a.level.length, size, mapId);
    assert.equal(a.entities.length, 8);
    for (const e of a.entities) {
      const others = a.entities.filter((o) => o !== e);
      assert.ok(
        Math.min(...others.map((o) => Math.hypot(o.x - e.x, o.y - e.y))) >= 8,
        mapId + " spawn gap",
      );
      assert.ok(Math.min(e.x, e.y, size - e.x, size - e.y) < 3, mapId + " spawn on the edge");
    }
    // Every listed crate is placed (none dropped onto a wall or a spawn).
    assert.equal(a.crates.length, MAPS[mapId].crates.length, mapId + " crates");
    // Before the enlargement the sparsest arena (Skyport) had one crate per ~40 open tiles.
    assert.ok(a.crates.length >= open / 40, mapId + " crate density");
    for (const t of [0, 60, 120, 160]) {
      a.time = t;
      a.updateZone();
      assert.ok(!a.wall(a.zone.cx, a.zone.cy), mapId + " zone centre");
      const e = a.entities[0];
      a.redeploy(e);
      assert.ok(a.canMove(e.x, e.y) && !a.outsideSafe(e), mapId + " redeploy at " + t);
    }
  }
  // The academy and practice drills keep the classic 16 × 16 Dust Outpost yard.
  assert.equal(new Arena({ mapId: "outpost", mode: "training" }).level.length, 16);
});
test("all eleven loadouts shoot, reload to their own magazine and serialize effects", () => {
  assert.equal(Object.keys(WEAPONS).length, 11);
  for (const weapon of Object.keys(WEAPONS)) {
    const { a, p } = setup(weapon);
    a.shoot(p);
    assert.equal(p.ammo, WEAPONS[weapon].mag - 1, weapon);
    const clone = Arena.restore(JSON.parse(JSON.stringify(a.snapshot())));
    assert.equal(clone.entities[0].weapon, weapon);
    a.reload(p);
    advance(a, 1.5);
    assert.equal(p.ammo, WEAPONS[weapon].mag, weapon + " reload");
  }
});
test("all main attack styles damage a foe in their effective range", () => {
  for (const weapon of Object.keys(WEAPONS)) {
    const { a, p, target } = setup(
      weapon,
      weapon === "brawler" ? 1 : weapon === "demo" ? 7 : weapon === "shard" ? 3 : 2,
    );
    a.shoot(p);
    advance(a, 1.2);
    assert.ok(target.hp < 1000, weapon + " attack damage");
  }
});
test("snapshot restoration preserves ongoing bursts", () => {
  const { a, p } = setup("twin", 3);
  a.shoot(p);
  const before = JSON.stringify(a.snapshot());
  const restored = Arena.restore(JSON.parse(before));
  advance(a, 0.3);
  advance(restored, 0.3);
  assert.deepEqual(a.snapshot(), restored.snapshot());
});
test("shotgun falloff and accurate three-shot burst", () => {
  const close = setup("scatter", 0.8),
    far = setup("scatter", 5);
  close.a.shoot(close.p);
  far.a.shoot(far.p);
  assert.ok(1000 - close.target.hp > 1000 - far.target.hp);
  const b = setup("twin", 3);
  b.a.shoot(b.p);
  advance(b.a, 0.3);
  assert.equal(b.p.ammo, 15);
  assert.equal(b.target.hp, 955);
});
test("poison ticks reduce healing; melee restores health only on a foe hit", () => {
  const v = setup("venom", 2);
  v.a.shoot(v.p);
  advance(v.a, 0.3);
  assert.ok(v.target.poisonUntil > v.a.time);
  const hp = v.target.hp;
  advance(v.a, 0.7);
  assert.ok(v.target.hp < hp);
  v.target.hp = 500;
  v.a.heal(v.target, 100);
  assert.equal(v.target.hp, 535);
  const b = setup("brawler", 1);
  b.p.hp = 40;
  b.a.shoot(b.p);
  assert.ok(b.p.hp > 40);
  assert.ok(b.target.hp < 1000);
  b.a.mode = "duo";
  b.target.team = b.p.team;
  b.p.hp = 40;
  b.a.time = 1;
  b.a.shoot(b.p);
  assert.equal(b.p.hp, 40);
});
test("rockets impact cover; lobbed twin fuses cross cover without hitscan damage", () => {
  const r = setup("rocket", 5);
  r.a.level[8][5] = 2;
  r.a.shoot(r.p);
  assert.equal(r.target.hp, 1000);
  advance(r.a, 1);
  assert.equal(r.target.hp, 1000);
  assert.equal(r.a.projectiles.length, 0);
  assert.equal(r.a.level[8][5], 2);
  const d = setup("demo", 7);
  d.a.level[8][5] = 2;
  d.a.shoot(d.p);
  assert.equal(d.a.projectiles.length, 2);
  assert.equal(d.target.hp, 1000);
  advance(d.a, 1);
  assert.ok(d.target.hp < 1000);
});
test("every charged ability consumes charge and rejects an uncharged activation", () => {
  for (const weapon of Object.keys(WEAPONS)) {
    const { a, p } = setup(weapon, 2);
    assert.equal(a.super(p), false);
    p.charge = 100;
    assert.equal(a.super(p), true, weapon);
    assert.ok(p.charge < 100, weapon);
    advance(a, 0.2);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  }
});
test("cloak breaks on fire or proximity; bramble slows foes and excludes partners", () => {
  const v = setup("veil", 4);
  v.p.charge = 100;
  v.a.super(v.p);
  assert.ok(v.p.cloakedUntil > v.a.time);
  v.a.shoot(v.p);
  assert.equal(v.p.cloakedUntil, 0);
  v.p.charge = 100;
  v.a.super(v.p);
  v.target.x = v.p.x + 0.8;
  advance(v.a, 0.025);
  assert.equal(v.p.cloakedUntil, 0);
  const b = setup("shard", 4);
  b.p.charge = 100;
  b.a.super(b.p);
  const f = b.a.fields[0];
  b.target.x = f.x;
  b.target.y = f.y;
  advance(b.a, 0.1);
  assert.ok(b.target.hp < 1000 && b.target.slowUntil > b.a.time);
  b.a.mode = "duo";
  b.target.team = b.p.team;
  const hp = b.target.hp;
  advance(b.a, 0.1);
  assert.equal(b.target.hp, hp);
});
test("cover breaking leaves sealed borders; vault landing and dash cannot land inside walls", () => {
  const d = setup("demo", 7);
  d.a.level[8][9] = 2;
  d.p.charge = 100;
  d.a.super(d.p);
  advance(d.a, 1.2);
  assert.equal(d.a.level[8][9], 0);
  assert.ok(d.a.level[0].every(Boolean));
  for (const weapon of ["breach", "brawler", "venom", "reaper"]) {
    const { a, p } = setup(weapon);
    a.level[8][5] = 2;
    p.charge = 100;
    a.super(p);
    assert.ok(a.canMove(p.x, p.y), weapon);
  }
});
test("damage snapshots carry loss, source direction and hit confirmations", () => {
  const { a, p, target } = setup();
  a.shoot(p);
  assert.equal(target.damageSeq, 1);
  assert.equal(target.damageTotal, 40);
  assert.equal(target.damageAngle, Math.PI);
  assert.equal(p.hitSeq, 1);
  assert.equal(p.hitDamage, 40);
  assert.equal(p.charge, 24);
});
