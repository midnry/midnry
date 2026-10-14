import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { TRANSPORT_MAP } from "../public/games/outpost-protocol-map.js";
import { contributionsOf, recordContribution } from "../public/games/outpost-mission-progress.js";
import { awardMatch, profileOf } from "../public/games/outpost-progression.js";
import { visibleWorldCells, WorldVisibility } from "./outpost-military/world-visibility.js";
import * as THREE from "three";
import { batchStaticByMaterial } from "./outpost-military/static-batches.js";

const fresh = () =>
  new ProtocolArena({
    interactiveTasks: true,
    humans: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}` })),
    rolePreference: "operator",
    random: () => 0.4,
  });
const tick = (a, s, input = {}) => {
  for (let t = 0; t < s - 1e-8; t += 0.05) a.advance(Math.min(0.05, s - t), input);
};
const send = (a, e, op, target, value, other = {}) =>
  a.advance(0.05, {
    [e.id]: { ...other, protocolAction: { seq: a.privateFor(e).actionSeq + 1, op, target, value } },
  });
const at = (e, p) => Object.assign(e, { x: p.x, y: p.y });
const begin = (a, e) => {
  const c = a.context(e);
  assert.ok(c);
  send(a, e, "task-begin", c.target);
  assert.ok(a.privateFor(e).channel?.challenge);
  return a.privateFor(e).channel.challenge;
};
const solve = (a, e) => {
  const game = a.privateFor(e).channel.challenge;
  while (game.index < game.steps.length) {
    tick(a, Math.max(0.05, game.nextAt - a.time + 0.05));
    send(a, e, "task-step", game.id, game.steps[game.index].answer);
  }
  const channel = a.privateFor(e).channel;
  if (channel) tick(a, Math.max(0, channel.duration - channel.progress) + 0.1);
};
const flight = () => {
  const a = fresh(),
    e = a.entities[0];
  for (const i of a.protocol.mission.manifest) i.loaded = i.required;
  at(e, a.protocol.mission.loading);
  assert.equal(a.departMission(e), true);
  return a;
};

test("equipment work cannot be completed by holding, forged progress or rapid replay", () => {
  const a = fresh(),
    e = a.entities[0],
    stock = a.protocol.mission.supplyStock[0];
  at(e, stock);
  tick(a, 5, { [e.id]: { interact: true, completed: true, contributions: { supplies: 13 } } });
  const game = a.privateFor(e).channel.challenge;
  assert.equal(a.privateFor(e).cargo, null);
  send(a, e, "task-step", game.id, "invalid");
  assert.equal(game.index, 0);
  send(a, e, "task-step", game.id, game.steps[0].answer);
  assert.equal(game.index, 0);
  tick(a, 0.4);
  send(a, e, "task-step", game.id, game.steps[0].answer);
  assert.equal(game.index, 1);
  send(a, e, "task-step", game.id, game.steps[1].answer);
  assert.equal(game.index, 1);
  solve(a, e);
  assert.equal(a.privateFor(e).cargo.supplyId, stock.supplyId);
  assert.equal(
    a.privateFor(e).contributions.supplies,
    0,
    "credit is earned at loading, not collection",
  );
  at(e, a.protocol.mission.loading);
  tick(a, 3.1, { [e.id]: { interact: true } });
  assert.equal(a.privateFor(e).contributions.supplies, 1);
});
test("short check sequences still require the full equipment cycle", () => {
  const a = fresh(),
    e = a.entities[0];
  at(e, a.protocol.mission.supplyStock[0]);
  const game = begin(a, e);
  for (const step of game.steps) {
    tick(a, 0.45);
    send(a, e, "task-step", game.id, step.answer);
  }
  assert.equal(a.privateFor(e).cargo, null);
  tick(a, 4);
  assert.ok(a.privateFor(e).cargo);
});
test("remote starts, wrong challenge IDs and another player's answers are rejected", () => {
  const a = fresh(),
    e = a.entities[0],
    other = a.entities.find((o) => o.team === 0 && o.id !== e.id),
    s = a.protocol.mission.supplyStock[0];
  send(a, e, "task-begin", s.id);
  assert.equal(a.privateFor(e).channel, null);
  at(e, s);
  const game = begin(a, e);
  tick(a, 0.4);
  send(a, other, "task-step", game.id, game.steps[0].answer);
  assert.equal(game.index, 0);
  send(a, e, "task-step", "forged-id", game.steps[0].answer);
  assert.equal(game.index, 0);
  const own = protocolView(a.snapshot(), e.id),
    theirs = protocolView(a.snapshot(), other.id);
  assert.equal(own.protocol.self.channel.challenge.id, game.id);
  assert.equal(theirs.protocol.self.channel, null);
  assert.equal(JSON.stringify(theirs).includes(game.id), false);
  assert.equal(JSON.stringify(own).includes('"answer"'), false);
  assert.equal(own.protocol.players, undefined);
});
test("movement, damage, expiry and a meeting invalidate an equipment check", () => {
  for (const cause of ["movement", "damage", "expiry", "meeting"]) {
    const a = fresh(),
      e = a.entities[0];
    at(e, a.protocol.mission.supplyStock[0]);
    const game = begin(a, e);
    tick(a, 0.4);
    if (cause === "movement")
      send(a, e, "task-step", game.id, game.steps[0].answer, { forward: 1 });
    if (cause === "damage") {
      e.damageSeq++;
      send(a, e, "task-step", game.id, game.steps[0].answer);
    }
    if (cause === "expiry") {
      game.deadline = a.time - 0.1;
      send(a, e, "task-step", game.id, game.steps[0].answer);
    }
    if (cause === "meeting") {
      at(e, a.protocol.emergency);
      send(a, e, "meeting");
    }
    assert.equal(a.privateFor(e).channel, null, cause);
    assert.equal(a.privateFor(e).cargo, null);
  }
});
test("cancellation requires the matching challenge, does not consume supplies", () => {
  const a = fresh(),
    e = a.entities[0],
    s = a.protocol.mission.supplyStock[0];
  at(e, s);
  const stock = s.stock,
    game = begin(a, e);
  send(a, e, "task-cancel", "other");
  assert.ok(a.privateFor(e).channel);
  send(a, e, "task-cancel", game.id);
  tick(a, 1);
  assert.equal(a.privateFor(e).channel, null);
  assert.equal(s.stock, stock);
});
test("oxygen gauge and landing checks validate choices and record real flight duties", () => {
  const a = flight(),
    e = a.entities[0],
    tasks = a.protocol.mission.flightTasks;
  for (const task of tasks) {
    at(e, task);
    const game = begin(a, e);
    solve(a, e);
    assert.equal(task.done, true);
  }
  assert.equal(a.privateFor(e).contributions.checks, 3);
});
test("fake packing maintains identical work posture but does not load the manifest", () => {
  const a = fresh(),
    e = a.entities.find((e) => e.team === 1);
  const stock = a.protocol.mission.supplyStock.find((s) => {
    at(e, s);
    return a.context(e)?.kind === "collect";
  });
  assert.ok(stock);
  at(e, stock);
  const before = stock.stock;
  begin(a, e);
  tick(a, 0.1);
  assert.equal(e.crouching, true);
  solve(a, e);
  assert.equal(stock.stock, before);
  assert.equal(a.privateFor(e).cargo.fake, true);
  at(e, a.protocol.mission.loading);
  tick(a, 3.1, { [e.id]: { interact: true } });
  assert.equal(
    a.protocol.mission.manifest.reduce((n, i) => n + i.loaded, 0),
    0,
  );
  assert.equal(a.privateFor(e).contributions.cover, 1);
  assert.equal(a.privateFor(e).contributions.supplies, 0);
});
test("bots solve their own check through the same action validator", () => {
  const a = fresh(),
    e = a.entities[0];
  e.bot = true;
  at(e, a.protocol.mission.supplyStock[0]);
  a.privateFor(e).botGoal = a.protocol.mission.supplyStock[0];
  begin(a, e);
  tick(a, 5);
  assert.ok(a.privateFor(e).cargo);
  assert.ok(a.privateFor(e).actionSeq >= 2);
});
test("smart operator bots finish the entire interactive medical mission", () => {
  const a = new ProtocolArena({ humans: [], interactiveTasks: true, random: () => 0.4 });
  for (const e of a.entities)
    if (e.team === 1) {
      e.hp = 0;
      e.departed = true;
    }
  tick(a, 440);
  assert.equal(a.winner, 0);
  assert.equal(a.protocol.mission.phase, "delivered");
  assert.equal(a.protocol.taskDone, 13);
  assert.ok(a.protocol.mission.patients.some((p) => p.rescued));
});
test("delivery rescues remaining patients and credits only the acting operator", () => {
  const a = flight(),
    e = a.entities[0],
    mission = a.protocol.mission;
  for (const task of mission.flightTasks) task.done = true;
  mission.vehicle.arrived = true;
  at(e, TRANSPORT_MAP.cargo);
  // Cargo interaction position comes from the shared transport map.
  const context = a.context(e);
  assert.equal(context.kind, "deliver");
  begin(a, e);
  solve(a, e);
  assert.equal(a.state, "ended");
  assert.equal(a.winner, 0);
  assert.equal(a.privateFor(e).contributions.patients, 4);
});
test("old saved rooms retain held tasks and new challenges survive authoritative restore", () => {
  const a = new ProtocolArena({ rolePreference: "operator" });
  for (const e of a.entities) e.bot = false;
  const e = a.entities[0];
  at(e, a.protocol.mission.supplyStock[0]);
  tick(a, 4.6, { [e.id]: { interact: true } });
  assert.ok(a.privateFor(e).cargo);
  const b = fresh(),
    p = b.entities[0];
  at(p, b.protocol.mission.supplyStock[0]);
  const game = begin(b, p);
  const restored = ProtocolArena.restore(b.snapshot());
  assert.equal(restored.privateFor(restored.entities[0]).channel.challenge.id, game.id);
});
test("contribution events deduplicate, cap totals, and serialize only for their owner", () => {
  const a = fresh(),
    e = a.entities[0],
    p = a.privateFor(e);
  recordContribution(p, "supplies", "crate");
  recordContribution(p, "supplies", "crate");
  assert.equal(p.contributions.supplies, 1);
  recordContribution(p, "supplies", "big", 999);
  assert.equal(p.contributions.supplies, 13);
  recordContribution(p, "pilotSeconds", null, 0.05);
  assert.equal(p.contributions.pilotSeconds, 0.05);
  recordContribution(p, "supplies", "bad", Infinity);
  assert.equal(p.contributions.supplies, 13);
  assert.equal(protocolView(a.snapshot(), e.id).protocol.self.contributions.supplies, 13);
  assert.equal(
    protocolView(a.snapshot(), a.entities[1].id).protocol.self.contributions.supplies,
    0,
  );
  assert.deepEqual(contributionsOf({ supplies: -1, checks: Infinity }), contributionsOf());
});
test("mission rewards recognize deliveries and rescues, preserve saves, and award once", () => {
  const old = profileOf({
    version: 1,
    xp: 210,
    skin: "copper",
    rounds: ["old"],
    milestones: ["explorer"],
  });
  assert.equal(old.skin, "copper");
  assert.equal(old.version, 2);
  assert.equal(old.xp, 210);
  const result = {
    id: "mission",
    mode: "protocol",
    role: "operator",
    seconds: 60,
    won: true,
    weapon: "carbine",
    rescued: 4,
    contributions: { supplies: 13, checks: 3, patients: 4, repairs: 1 },
  };
  const earned = awardMatch(old, result);
  assert.equal(earned.profile.career.supplies, 13);
  assert.ok(earned.bonuses.includes("Lifeline rescuer"));
  assert.equal(awardMatch(earned.profile, result).xp, 0);
  const idle = awardMatch(
    {},
    { ...result, id: "idle", won: false, rescued: 0, contributions: {}, kills: 99, damage: 99999 },
  );
  assert.equal(idle.xp, 40);
});
test("world visibility retains facing walls and door edges but excludes sealed far rooms", () => {
  const grid = Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 20 }, (_, x) =>
      x === 0 || y === 0 || x === 19 || y === 19 || x === 7 ? 1 : 0,
    ),
  );
  const cells = visibleWorldCells(grid, 3.5, 10.5, 0, 1.8);
  assert.ok(cells.has(10 * 20 + 7));
  assert.ok(cells.has(10 * 20 + 8));
  assert.equal(cells.has(10 * 20 + 14), false);
  grid[10][7] = 0;
  assert.ok(visibleWorldCells(grid, 3.5, 10.5, 0, 1.8).has(10 * 20 + 14));
  grid[10][7] = 1;
  assert.ok(
    visibleWorldCells(grid, 3.5, 10.5, 0, 1.8, (x, y) => x === 7 && y === 10).has(10 * 20 + 14),
  );
});
test("static visibility restores hidden objects when changing rooms and preserves dynamic screens", () => {
  const grid = Array.from({ length: 20 }, () =>
    Array.from({ length: 20 }, (_, x) => (x === 7 ? 1 : 0)),
  );
  const world = new THREE.Group(),
    material = new THREE.MeshBasicMaterial(),
    geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(43, 1, 31);
  world.add(mesh);
  const screen = mesh.clone();
  screen.userData = { noBatch: true };
  world.add(screen);
  const r = {
    g: { level: grid, arena: { mapId: "breakwater" } },
    world,
    camera: { fov: 70, aspect: 1.6 },
    protocolPropTile: () => false,
    transportWindowTile: () => false,
    transportHiddenWall: () => false,
  };
  const visibility = new WorldVisibility(r);
  visibility.update({ x: 3.5, y: 10.5, a: 0 }, 0, 1000);
  assert.equal(mesh.layers.isEnabled(0), false);
  assert.equal(mesh.layers.isEnabled(1), true);
  assert.equal(mesh.visible, true);
  assert.equal(screen.visible, true);
  visibility.update({ x: 14.5, y: 10.5, a: 0 }, 0, 1100);
  assert.equal(mesh.layers.isEnabled(0), true);
  geo.dispose();
  material.dispose();
});
test("spatial material batches preserve transformed geometry, UVs and dynamic fixtures", () => {
  const root = new THREE.Group(),
    material = new THREE.MeshStandardMaterial();
  root.position.set(2, 0, 3);
  const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material),
    b = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), material);
  a.position.set(1, 0, 1);
  b.position.set(4, 0, 1);
  root.add(a, b);
  const screen = a.clone();
  screen.userData.noBatch = true;
  root.add(screen);
  const far = b.clone();
  far.position.x = 40;
  root.add(far);
  const originalUV = [...a.geometry.attributes.uv.array, ...b.geometry.attributes.uv.array];
  batchStaticByMaterial(root);
  assert.equal(root.children.length, 3);
  assert.ok(root.children.includes(screen));
  assert.ok(root.children.includes(far));
  const batch = root.children.find((m) => m.userData.ownedGeometry);
  assert.ok(batch);
  assert.equal(
    batch.geometry.attributes.position.count,
    a.geometry.attributes.position.count + b.geometry.attributes.position.count,
  );
  assert.deepEqual([...batch.geometry.attributes.uv.array], originalUV);
  assert.equal(batch.geometry.boundingBox.min.x, 0.5);
  assert.equal(batch.geometry.boundingBox.max.x, 5);
  batch.geometry.dispose();
  a.geometry.dispose();
  b.geometry.dispose();
  material.dispose();
});
