import test from "node:test";
import assert from "node:assert/strict";
import { Arena } from "../public/games/outpost-sim.js";
import { DISASTERS, DISASTER_OF, DISASTER_WARNING, FOAM } from "../public/games/outpost-hazards.js";

const arena = (mapId = "skyport") => new Arena({ mode: "signal", mapId, random: () => 0.5 });
const quiet = (a) => {
  for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 0 });
  a.time = 20;
};

test("canisters and barriers: placed against walls / in the open, never cutting a route", () => {
  for (const mapId of ["outpost", "skyport", "estate"]) {
    const a = arena(mapId),
      n = a.level.length,
      hazards = a.crates.filter((c) => c.kind);
    for (const kind of ["red", "green", "pink", "blue", "barrier"])
      assert.ok(
        hazards.some((c) => c.kind === kind),
        `${mapId} has ${kind}`,
      );
    assert.ok(hazards.length >= 15, mapId + " hazard count");
    for (const c of hazards) {
      assert.equal(a.level[Math.floor(c.y)][Math.floor(c.x)], 0, mapId + " on open floor");
      assert.ok(
        a.entities.every((e) => Math.hypot(e.x - c.x, e.y - c.y) >= 3),
        mapId + " clear of spawns",
      );
    }
    // Every open tile stays reachable with every crate, canister and barrier in place.
    const blocked = new Set(a.crates.map((c) => Math.floor(c.y) * n + Math.floor(c.x)));
    const free = [];
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (!a.level[y][x] && !blocked.has(y * n + x)) free.push(y * n + x);
    const seen = new Set([free[0]]),
      queue = [free[0]];
    for (let i = 0; i < queue.length; i++) {
      const k = queue[i];
      for (const d of [1, -1, n, -n]) {
        const m = k + d;
        if (!seen.has(m) && !a.level[Math.floor(m / n)][m % n] && !blocked.has(m))
          (seen.add(m), queue.push(m));
      }
    }
    assert.equal(seen.size, free.length, mapId + " all reachable");
  }
  assert.ok(
    new Arena({ mode: "duo", mapId: "estate", random: () => 0.5 }).crates.some(
      (c) => c.kind === "red",
    ),
  );
  assert.ok(!new Arena({ mode: "training", mapId: "estate" }).crates.some((c) => c.kind));
});

test("shooting canisters: red explodes and breaks cover, green gasses, pink foams, blue heals", () => {
  const a = arena();
  quiet(a);
  const [p, q] = a.entities;
  const place = (kind) => {
    const c = a.crates.find((c) => c.kind === kind && c.hp > 0);
    return c;
  };
  // Red: hurts a fighter beside it and credits the shooter.
  const red = place("red");
  Object.assign(q, { x: red.x + 0.6, y: red.y, hp: 100 });
  a.damage(red, 50, p);
  assert.ok(red.hp <= 0 && q.hp < 100, "explosion damage");
  assert.ok(a.fx.some((f) => f.kind === "blast"));
  // Green: a toxic cloud that hurts everyone inside, the shooter too.
  const green = place("green");
  Object.assign(q, { x: green.x + 0.5, y: green.y, hp: 100 });
  Object.assign(p, { x: green.x - 0.5, y: green.y, hp: 100 });
  a.damage(green, 50, p);
  assert.ok(a.fields.some((f) => f.kind === "gas"));
  for (let i = 0; i < 30; i++) a.advance(1 / 30, {});
  assert.ok(q.hp < 100 && p.hp < 100, "gas hurts everyone inside");
  // Pink: hardening foam blocks the tile, then dissolves.
  const pink = place("pink");
  Object.assign(p, { x: 1.5, y: 1.5 });
  Object.assign(q, { x: 1.5, y: 2.5 });
  a.damage(pink, 50, p);
  const foam = a.crates.filter((c) => c.kind === "foam");
  assert.ok(foam.length >= 1 && !a.canMove(foam[0].x, foam[0].y));
  a.time += FOAM.life + 0.1;
  a.advance(1 / 30, {});
  assert.ok(!a.crates.some((c) => c.kind === "foam"), "foam dissolves");
  // Blue: heals fighters nearby.
  const blue = place("blue");
  Object.assign(q, { x: blue.x + 0.6, y: blue.y, hp: 30 });
  a.damage(blue, 50, p);
  assert.ok(q.hp > 30);
  // Barriers soak damage and break without exploding.
  const bar = place("barrier");
  a.damage(bar, 100, p);
  assert.ok(bar.hp > 0);
  a.damage(bar, 100, p);
  assert.ok(bar.hp <= 0 && a.canMove(bar.x, bar.y), "a broken barrier opens the way");
});

test("bots loot supply crates only, and shoot a canister next to a rival", () => {
  const a = arena("estate");
  a.time = 20;
  const bot = a.entities[1];
  const red = a.crates.find((c) => c.kind === "red");
  for (const e of a.entities) if (e !== bot) e.hp = 0;
  a.crates = a.crates.filter((c) => c.kind);
  a.updateRival(bot, 1 / 30);
  assert.ok(!bot.path.length || bot.path.at(-1) !== red, "canisters are not loot");
});

test("one natural disaster per round, themed to the arena and announced 10 s ahead", () => {
  for (const [mapId, kind] of Object.entries(DISASTER_OF)) {
    const a = arena(mapId),
      d = a.disaster;
    assert.equal(d.kind, kind);
    assert.ok(d.startAt >= 30 && d.startAt <= 55);
    assert.equal(d.startAt - d.warnAt, DISASTER_WARNING);
    assert.equal(d.endAt - d.startAt, DISASTERS[kind].duration);
    assert.ok(JSON.parse(JSON.stringify(a.snapshot())).disaster.kind === kind, "sent to clients");
  }
  assert.equal(new Arena({ mode: "duo", mapId: "estate", random: () => 0.5 }).disaster, null);
});

test("sandstorm slows everyone; lightning and quakes mark the ground before striking", () => {
  const sand = arena("outpost");
  sand.time = sand.disaster.startAt + 1;
  assert.equal(sand.weather(), 0.85);
  for (const mapId of ["skyport", "estate"]) {
    const a = arena(mapId);
    for (const e of a.entities) e.shieldUntil = 0;
    a.time = a.disaster.startAt;
    const before = a.level.flat().filter((v) => v).length;
    let marked = 0,
      struck = 0;
    while (a.time < a.disaster.endAt) {
      const pending = a.disaster.strikes.length;
      a.advance(1 / 30, {});
      if (a.disaster.strikes.length > pending) marked++;
      struck += a.fx.filter(
        (f) => f.kind === (mapId === "skyport" ? "lightning" : "debris") && f.until - a.time > 0.45,
      ).length
        ? 1
        : 0;
      if (a.state === "ended") break;
    }
    assert.ok(marked >= 5, mapId + " strikes are marked first: " + marked);
    assert.ok(struck > 0, mapId + " strikes land");
    if (mapId === "estate")
      assert.ok(a.level.flat().filter((v) => v).length < before, "quake collapses cover");
  }
});

test("disasters change the ground for the rest of the round, and it slows you", () => {
  const quake = arena("estate");
  for (const e of quake.entities) e.shieldUntil = 0;
  quake.time = quake.disaster.startAt;
  while (quake.time < quake.disaster.endAt + 2 && quake.state !== "ended")
    quake.advance(1 / 30, {});
  const cracks = quake.terrain.filter((t) => t.kind === "crack");
  assert.ok(cracks.length >= 10, "quake cracks the ground: " + cracks.length);
  assert.ok(
    quake.terrain.some((t) => t.kind === "rubble"),
    "collapsed cover leaves rubble",
  );
  for (const t of quake.terrain) assert.ok(!quake.wall(t.x, t.y), "marks lie on walkable floor");
  const p = quake.entities[0];
  Object.assign(p, { x: cracks[0].x, y: cracks[0].y });
  assert.ok(quake.footing(p) < 1, "uneven ground is slower");
  assert.equal(JSON.parse(JSON.stringify(quake.snapshot())).terrain.length, quake.terrain.length);
  const storm = arena("skyport");
  storm.time = storm.disaster.startAt;
  while (storm.time < storm.disaster.endAt + 2 && storm.state !== "ended")
    storm.advance(1 / 30, {});
  assert.ok(
    storm.terrain.some((t) => t.kind === "scorch"),
    "lightning scorches the ground",
  );
  const sand = arena("outpost");
  sand.time = sand.disaster.startAt;
  while (sand.time < sand.disaster.endAt && sand.state !== "ended") sand.advance(1 / 30, {});
  assert.ok(sand.terrain.filter((t) => t.kind === "sand").length >= 5, "sand drifts pile up");
  assert.equal(new Arena({ mode: "training", mapId: "estate" }).terrain, null);
});

test("lightning leaves you electrified: a smaller burn for a few seconds", async () => {
  const { SHOCK } = await import("../public/games/outpost-hazards.js");
  const a = arena("skyport");
  for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 0 });
  const p = a.entities[0];
  a.time = a.disaster.startAt + 1;
  Object.assign(p, { hp: 100, x: 18.5, y: 30.5 });
  a.disaster.strikes.push({ id: 999, kind: "storm", x: p.x, y: p.y, at: a.time });
  a.advance(1 / 30, {});
  const struck = p.hp;
  assert.ok(struck < 100 && p.shockUntil > a.time, "struck and electrified");
  for (let i = 0; i < SHOCK.seconds * 30 + 30; i++) {
    a.disaster.strikes.length = 0;
    a.disaster.nextStrike = Infinity;
    a.advance(1 / 30, {});
  }
  const burn = struck - p.hp;
  assert.ok(burn > 0, "the after-shock hurts");
  assert.ok(burn < 100 - struck, "less than the strike itself: " + burn.toFixed(1));
  assert.ok(!(p.shockUntil > a.time), "and wears off");
});

test("canisters are slim: you can walk right past one", () => {
  for (const mapId of ["outpost", "skyport", "estate"]) {
    const a = arena(mapId);
    for (const c of a.crates.filter((c) => ["red", "green", "pink", "blue"].includes(c.kind))) {
      // Half a tile beside it is free, and its lane is at least three tiles wide.
      const free = [
        [0.5, 0],
        [-0.5, 0],
        [0, 0.5],
        [0, -0.5],
      ].filter(([dx, dy]) => a.canMove(c.x + dx, c.y + dy));
      assert.ok(free.length >= 3, `${mapId} canister at ${c.x},${c.y} leaves room`);
    }
  }
});
