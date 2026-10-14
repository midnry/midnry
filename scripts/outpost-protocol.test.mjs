import test from "node:test";
import assert from "node:assert/strict";
import { Arena } from "../public/games/outpost-sim.js";
import { PROTOCOL_MAP, TRANSPORT_MAP } from "../public/games/outpost-protocol-map.js";
import {
  ProtocolArena,
  createArena,
  restoreArena,
  protocolView,
  PROTOCOL_RULES,
} from "../public/games/outpost-protocol.js";

const humans = Array.from({ length: 8 }, (_, i) => ({
  id: i ? `human-${i}` : "player",
  name: `Patrol ${i}`,
  team: i % 4,
}));
const fresh = (rolePreference = "operator") =>
  new ProtocolArena({ humans, rolePreference, random: () => 0.4 });
const tick = (arena, seconds, inputs = {}) => {
  for (let left = seconds; left > 1e-8; left -= 0.05) arena.advance(Math.min(left, 0.05), inputs);
};
const privatePlayer = (arena, e) => arena.protocol.players[e.id];
const infiltrator = (arena) => arena.entities.find((e) => e.team === 1);
const operator = (arena) => arena.entities.find((e) => e.team === 0);
const send = (arena, entity, op, target, value, extras = {}) => {
  arena.advance(0.05, {
    [entity.id]: {
      ...extras,
      protocolAction: { seq: privatePlayer(arena, entity).actionSeq + 1, op, target, value },
    },
  });
};
const position = (entity, point) => {
  entity.x = point.x;
  entity.y = point.y;
};
const distinctSites = () => [
  ...new Map(PROTOCOL_MAP.sites.map((site) => [site.room, site])).values(),
];
const plant = (arena, entity, site) => {
  position(entity, site);
  tick(arena, 8.05, { [entity.id]: { interact: true } });
  const channel = privatePlayer(arena, entity).channel;
  assert.equal(channel?.kind, "wire");
  assert.match(channel.code, /^\d{3}$/);
  send(arena, entity, "wire", undefined, channel.code);
};
const plantThree = (arena) => {
  const e = infiltrator(arena);
  for (const site of distinctSites().slice(0, 3)) plant(arena, e, site);
  return e;
};

const collect = (arena, entity, stock) => {
  position(entity, stock);
  tick(arena, 4.55, { [entity.id]: { interact: true } });
  assert.equal(privatePlayer(arena, entity).cargo?.supplyId, stock.supplyId);
};
const load = (arena, entity) => {
  position(entity, arena.protocol.mission.loading);
  tick(arena, 3.05, { [entity.id]: { interact: true } });
  assert.equal(privatePlayer(arena, entity).cargo, null);
};
const transport = () => {
  const arena = fresh(),
    e = operator(arena);
  for (const item of arena.protocol.mission.manifest) item.loaded = item.required;
  position(e, arena.protocol.mission.loading);
  tick(arena, 3.05, { [e.id]: { interact: true } });
  assert.equal(arena.mapId, TRANSPORT_MAP.id);
  assert.equal(arena.protocol.mission.phase, "transport");
  // These legacy flight-physics fixtures begin after cabin preparation.
  // The systems suite separately validates real, uninterrupted duty holds.
  for (const task of arena.protocol.mission.flightTasks) task.done = true;
  return arena;
};
const sabotageAircraft = (arena) => {
  const infil = infiltrator(arena);
  tick(arena, 15.1);
  position(infil, TRANSPORT_MAP.avionics);
  tick(arena, 6.05, { [infil.id]: { interact: true } });
  assert.equal(arena.protocol.mission.vehicle.autopilot, false);
  return infil;
};

test("factory keeps combat modes and protocol always uses the sealed dedicated base", () => {
  const ordinary = createArena({ mode: "training", random: () => 0.4 });
  assert.equal(ordinary instanceof ProtocolArena, false);
  assert.equal(ordinary instanceof Arena, true);
  const arena = createArena({
    mode: "protocol",
    mapId: "freight",
    weapon: "rocket",
    random: () => 0.4,
  });
  assert.equal(arena instanceof ProtocolArena, true);
  assert.equal(arena.mapId, "breakwater");
  assert.equal(arena.entities.length, 8);
  assert.equal(arena.entities.filter((e) => e.team === 1).length, 2);
  assert.equal(arena.entities.filter((e) => e.team === 0).length, 6);
  assert.equal(arena.protocol.taskTotal, 13);
  assert.ok(arena.entities.every((e) => e.weapon === "carbine" && !arena.wall(e.x, e.y)));
  assert.ok(arena.level[0].every(Boolean) && arena.level.at(-1).every(Boolean));
  assert.deepEqual(arena.crates, []);
});

test("offline role preferences work; no preference does not privilege the host", () => {
  assert.equal(fresh("operator").entities[0].team, 0);
  assert.equal(fresh("infiltrator").entities[0].team, 1);
  const hostRoles = new Set();
  for (let seed = 1; seed < 30; seed++) {
    let state = seed;
    const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 0x100000000;
    hostRoles.add(new ProtocolArena({ humans, random }).entities[0].team);
  }
  assert.deepEqual([...hostRoles].sort(), [0, 1]);
  const collided = new ProtocolArena({ humans: [{ id: "bot1", team: 0 }], random: () => 0.4 });
  assert.equal(new Set(collided.entities.map((e) => e.id)).size, 8);
  assert.equal(collided.entities.filter((e) => e.team === 1).length, 2);
});

test("firearms, supers, pickups and poison-zone damage cannot bypass protocol rules", () => {
  const arena = fresh(),
    e = operator(arena),
    before = arena.entities.map((entity) => entity.hp);
  e.charge = 100;
  tick(arena, 5, { [e.id]: { fire: true, super: true, reload: true } });
  arena.shoot(e);
  arena.super(e);
  arena.damage(e, 100);
  arena.applyHaze(e, 10);
  assert.deepEqual(
    arena.entities.map((entity) => entity.hp),
    before,
  );
  assert.deepEqual(arena.projectiles, []);
  assert.deepEqual(arena.cores, []);
  assert.equal(arena.state, "playing");
});

test("planting requires an uninterrupted stationary installation and a local arming puzzle", () => {
  const arena = fresh(),
    e = infiltrator(arena),
    site = distinctSites()[0];
  position(e, site);
  tick(arena, 4, { [e.id]: { interact: true } });
  assert.equal(privatePlayer(arena, e).channel.kind, "plant");
  arena.advance(0.05, { [e.id]: { interact: false } });
  assert.equal(privatePlayer(arena, e).channel, null);
  tick(arena, 4, { [e.id]: { interact: true } });
  arena.advance(0.05, { [e.id]: { interact: true, forward: 0.1 } });
  assert.equal(privatePlayer(arena, e).channel, null);
  position(e, site);
  tick(arena, 8.05, { [e.id]: { interact: true } });
  const wire = privatePlayer(arena, e).channel;
  assert.equal(wire.kind, "wire");
  tick(arena, 0.2); // Typing on mobile does not require retaining the hold.
  assert.equal(privatePlayer(arena, e).channel.kind, "wire");
  send(arena, e, "wire", undefined, "wrong");
  assert.equal(privatePlayer(arena, e).channel, null);
  assert.equal(arena.protocol.bombs.length, 0);
  plant(arena, e, site);
  assert.equal(arena.protocol.bombs.length, 1);
  assert.equal(arena.protocol.detonateAt, null);
});

test("arming expires, movement or damage interrupts, and forged completions fail", () => {
  const arena = fresh(),
    e = infiltrator(arena),
    site = distinctSites()[0];
  position(e, site);
  send(arena, e, "wire", site.id, "123");
  assert.equal(arena.protocol.bombs.length, 0);
  tick(arena, 8.05, { [e.id]: { interact: true } });
  const code = privatePlayer(arena, e).channel.code;
  send(arena, e, "wire", undefined, code, { forward: 0.1 });
  assert.equal(arena.protocol.bombs.length, 0);
  assert.equal(privatePlayer(arena, e).channel, null);
  position(e, site);
  tick(arena, 8.05, { [e.id]: { interact: true } });
  tick(arena, 20.1);
  assert.equal(privatePlayer(arena, e).channel, null);
  tick(arena, 2, { [e.id]: { interact: true } });
  e.damageSeq++;
  arena.advance(0.05, { [e.id]: { interact: true } });
  assert.equal(privatePlayer(arena, e).channel, null);
  assert.equal(arena.protocol.bombs.length, 0);
});

test("only three distinct rooms arm the linked fuse; fourth and duplicate-room charges are rejected", () => {
  const arena = fresh(),
    e = infiltrator(arena),
    sites = distinctSites();
  plant(arena, e, sites[0]);
  const sameRoom = PROTOCOL_MAP.sites.find((s) => s.room === sites[0].room && s.id !== sites[0].id);
  position(e, sameRoom);
  tick(arena, 8.1, { [e.id]: { interact: true } });
  assert.notEqual(privatePlayer(arena, e).channel?.kind, "wire");
  assert.equal(arena.protocol.bombs.length, 1);
  for (const site of sites.slice(1, 3)) plant(arena, e, site);
  assert.equal(arena.protocol.bombs.length, 3);
  assert.equal(new Set(arena.protocol.bombs.map((b) => b.room)).size, 3);
  assert.ok(Math.abs(arena.protocol.detonateAt - arena.time - 75) < 0.001);
  position(e, sites[3]);
  tick(arena, 8.1, { [e.id]: { interact: true } });
  assert.equal(arena.protocol.bombs.length, 3);
});

test("simultaneous installations reserve distinct rooms and cannot overfill charge slots", () => {
  const arena = fresh(),
    [a, b] = arena.entities.filter((e) => e.team === 1);
  const room = distinctSites()[0].room,
    sites = PROTOCOL_MAP.sites.filter((site) => site.room === room);
  position(a, sites[0]);
  position(b, sites[1]);
  tick(arena, 8.05, { [a.id]: { interact: true }, [b.id]: { interact: true } });
  assert.equal(privatePlayer(arena, a).channel?.kind, "wire");
  assert.notEqual(privatePlayer(arena, b).channel?.kind, "wire");
  send(arena, a, "wire", undefined, privatePlayer(arena, a).channel.code);
  assert.equal(arena.protocol.bombs.length, 1);
});

test("operator discovery is local and respects walls; defuse interrupts and clears the linked fuse", () => {
  const arena = fresh(),
    infil = plantThree(arena),
    e = operator(arena),
    bomb = arena.protocol.bombs[0];
  const far = PROTOCOL_MAP.stations.find((s) => s.room === "generators");
  position(e, far);
  assert.equal(protocolView(arena.snapshot(), e.id).protocol.bombs.length, 0);
  const armory = arena.protocol.bombs.find((b) => b.room === "armory");
  position(e, { x: 10.5, y: armory.y });
  assert.equal(arena.visible(e, armory), false);
  assert.equal(
    protocolView(arena.snapshot(), e.id).protocol.bombs.some((b) => b.id === armory.id),
    false,
  );
  position(e, bomb);
  assert.equal(
    protocolView(arena.snapshot(), e.id).protocol.bombs.some((b) => b.id === bomb.id),
    true,
  );
  tick(arena, 3, { [e.id]: { interact: true } });
  tick(arena, 0.05);
  assert.equal(privatePlayer(arena, e).channel, null);
  assert.equal(arena.protocol.bombs.length, 3);
  tick(arena, 6.05, { [e.id]: { interact: true } });
  assert.equal(arena.protocol.bombs.length, 2);
  assert.equal(arena.protocol.detonateAt, null);
  plant(
    arena,
    infil,
    PROTOCOL_MAP.sites.find((s) => s.id === bomb.siteId),
  );
  assert.equal(arena.protocol.bombs.length, 3);
  assert.ok(Math.abs(arena.protocol.detonateAt - arena.time - 75) < 0.001);
});

test("legacy assignments and infiltrator cover collection never advance the medical manifest", () => {
  const arena = fresh(),
    e = operator(arena),
    infil = infiltrator(arena);
  const task = privatePlayer(arena, e).tasks[0],
    site = arena.protocol.stations.find((s) => s.id === task.stationId);
  position(e, site);
  tick(arena, 4.6, { [e.id]: { interact: true } });
  assert.equal(task.done, false);
  assert.equal(arena.protocol.taskDone, 0);
  tick(arena, 5, { [e.id]: { interact: true } });
  assert.equal(arena.protocol.taskDone, 0);
  const coverTask = privatePlayer(arena, infil).tasks.find((task) => {
    const station = arena.protocol.stations.find((s) => s.id === task.stationId);
    return !arena.protocol.sites.some((socket) => arena.near(station, socket, 1.4));
  });
  assert.ok(coverTask);
  position(
    infil,
    arena.protocol.stations.find((s) => s.id === coverTask.stationId),
  );
  tick(arena, 4.6, { [infil.id]: { interact: true } });
  assert.equal(arena.protocol.taskDone, 0);
  assert.equal(arena.state, "playing");
});

test("elimination is infiltrator-only, short range, line-of-sight and cooldown limited", () => {
  const arena = fresh(),
    e = infiltrator(arena),
    target = operator(arena);
  tick(arena, 12.1);
  position(e, { x: 3.5, y: 5.5 });
  position(target, { x: 3.5, y: 6.5 });
  send(arena, target, "eliminate", e.id);
  assert.equal(e.hp, 100);
  send(arena, e, "eliminate", target.id);
  assert.equal(target.hp, 0);
  assert.equal(arena.protocol.bodies.length, 1);
  const next = arena.entities.find((other) => other !== target && other.team === 0);
  position(next, { x: 3.5, y: 6.5 });
  send(arena, e, "eliminate", next.id);
  assert.equal(next.hp, 100);
  tick(arena, 25.1);
  position(e, { x: 15.5, y: 3.5 });
  position(next, { x: 17.5, y: 3.5 });
  send(arena, e, "eliminate", next.id);
  assert.equal(next.hp, 100);
  assert.equal(arena.state, "playing");
});

test("lost operators can observe but cannot collect supplies, complete assignments, report, vote or chat", () => {
  const arena = fresh(),
    e = operator(arena),
    infil = infiltrator(arena);
  tick(arena, 12.1);
  position(e, { x: 3.5, y: 6.5 });
  position(infil, { x: 3.5, y: 5.5 });
  send(arena, infil, "eliminate", e.id);
  const task = privatePlayer(arena, e).tasks[0];
  position(
    e,
    arena.protocol.stations.find((s) => s.id === task.stationId),
  );
  tick(arena, 4.6, { [e.id]: { interact: true } });
  assert.equal(task.done, false);
  assert.equal(privatePlayer(arena, e).cargo, null);
  position(e, arena.protocol.bodies[0]);
  send(arena, e, "report", arena.protocol.bodies[0].id);
  assert.equal(arena.protocol.phase, "roam");
  position(e, arena.protocol.emergency);
  send(arena, e, "meeting");
  assert.equal(arena.protocol.phase, "roam");
  const live = arena.entities.find((a) => a.team === 0 && a.hp > 0);
  position(live, arena.protocol.emergency);
  send(arena, live, "meeting");
  send(arena, e, "chat", undefined, "Ghost leaked evidence");
  assert.equal(arena.protocol.meeting.messages.length, 0);
  tick(arena, 15.1);
  send(arena, e, "vote", infil.id);
  assert.equal(Object.hasOwn(arena.protocol.meeting.votes, e.id), false);
});

test("radio assemblies freeze movement, plants, sabotage timers and the detonation countdown", () => {
  const arena = fresh(),
    infil = plantThree(arena),
    e = operator(arena);
  send(arena, infil, "sabotage", "power");
  position(e, arena.protocol.emergency);
  send(arena, e, "meeting");
  const old = {
    x: e.x,
    y: e.y,
    fuse: arena.protocol.detonateAt - arena.time,
    power: arena.protocol.sabotage.powerUntil - arena.time,
  };
  tick(arena, 10, { [e.id]: { forward: 1, interact: true, fire: true } });
  assert.equal(arena.protocol.phase, "discussion");
  assert.equal(e.x, old.x);
  assert.equal(e.y, old.y);
  assert.ok(Math.abs(arena.protocol.detonateAt - arena.time - old.fuse) < 1e-6);
  assert.ok(Math.abs(arena.protocol.sabotage.powerUntil - arena.time - old.power) < 1e-6);
  assert.ok(Object.values(arena.protocol.players).every((p) => p.channel === null));
});

test("vote is immutable, skip/ties protect patrols, majority starts Last Stand without revealing allegiance", () => {
  const arena = fresh(),
    e = operator(arena),
    suspect = arena.entities.find((x) => x !== e && x.team === 0);
  position(e, arena.protocol.emergency);
  send(arena, e, "meeting");
  tick(arena, 15.1);
  send(arena, e, "vote", suspect.id);
  send(arena, e, "vote", "skip");
  assert.equal(arena.protocol.meeting.votes[e.id], suspect.id);
  for (const voter of arena.entities.filter((x) => x !== e).slice(0, 4))
    send(arena, voter, "vote", suspect.id);
  for (const voter of arena.entities.filter((x) => x !== e).slice(4))
    send(arena, voter, "vote", "skip");
  tick(arena, 15.1);
  assert.equal(suspect.hp, 100);
  assert.equal(arena.protocol.phase, "combat");
  const view = protocolView(arena.snapshot(), e.id);
  assert.equal(view.protocol.revealedRoles, undefined);
  assert.match(view.protocol.meeting.result, /classified/);
  const tied = fresh(),
    caller = operator(tied),
    target = infiltrator(tied);
  position(caller, tied.protocol.emergency);
  send(tied, caller, "meeting");
  tick(tied, 15.1);
  for (const voter of tied.entities.slice(0, 4)) send(tied, voter, "vote", target.id);
  for (const voter of tied.entities.slice(4)) send(tied, voter, "vote", "skip");
  tick(tied, 15.1);
  assert.equal(target.hp, 100);
});

test("discussion is bounded, alive-only, rate limited and stores plain text without executable markup", () => {
  const arena = fresh(),
    e = operator(arena);
  position(e, arena.protocol.emergency);
  send(arena, e, "meeting");
  send(arena, e, "chat", undefined, " <img src=x onerror=alert(1)>\n" + "a".repeat(220));
  send(arena, e, "chat", undefined, "Second packet");
  assert.equal(arena.protocol.meeting.messages.length, 1);
  assert.equal(arena.protocol.meeting.messages[0].text.length, 180);
  assert.equal(arena.protocol.meeting.messages[0].text.includes("\n"), false);
  tick(arena, 1);
  send(arena, e, "chat", undefined, "Patrol clear.");
  assert.equal(arena.protocol.meeting.messages.length, 2);
  tick(arena, 14);
  send(arena, e, "chat", undefined, "No discussion in voting");
  assert.equal(arena.protocol.meeting.messages.length, 2);
});

test("power/comms sabotage requires an infiltrator; local operator repair restores systems", () => {
  const arena = fresh(),
    e = operator(arena),
    infil = infiltrator(arena);
  tick(arena, 15.1);
  send(arena, e, "sabotage", "power");
  assert.equal(arena.protocol.sabotage.powerUntil, 0);
  send(arena, infil, "sabotage", "power");
  assert.ok(arena.protocol.sabotage.powerUntil > arena.time);
  send(arena, infil, "sabotage", "comms");
  assert.equal(arena.protocol.sabotage.commsUntil, 0);
  position(
    e,
    arena.protocol.stations.find((s) => s.kind === "power"),
  );
  tick(arena, 5.1, { [e.id]: { interact: true } });
  assert.equal(arena.protocol.sabotage.powerUntil, 0);
  tick(arena, 30.1);
  send(arena, infil, "sabotage", "comms");
  const task = privatePlayer(arena, e).tasks[0];
  position(
    e,
    arena.protocol.stations.find((s) => s.id === task.stationId),
  );
  const context = arena.context(e);
  assert.notEqual(context?.kind, "task");
  position(
    e,
    arena.protocol.stations.find((s) => s.kind === "comms"),
  );
  tick(arena, 5.1, { [e.id]: { interact: true } });
  assert.equal(arena.protocol.sabotage.commsUntil, 0);
});

test("maintenance ducts require proximity, linked destinations, infiltrator role and cooldown", () => {
  const arena = fresh(),
    e = infiltrator(arena),
    crew = operator(arena),
    source = PROTOCOL_MAP.vents[0];
  const target = PROTOCOL_MAP.vents.find((v) => v.id === source.links[0]);
  send(arena, e, "vent", target.id);
  assert.notEqual(e.x, target.x);
  position(crew, source);
  send(arena, crew, "vent", target.id);
  assert.equal(crew.x, source.x);
  position(e, source);
  send(arena, e, "vent", target.id);
  assert.equal(e.x, target.x);
  assert.equal(e.y, target.y);
  send(arena, e, "vent", source.id);
  assert.equal(e.x, target.x);
  tick(arena, 10.1);
  send(arena, e, "vent", source.id);
  assert.equal(e.x, source.x);
});

test("one-shot sequence deduplication persists through JSON restore and invalid actions stay consumed", () => {
  const arena = fresh(),
    e = operator(arena);
  const input = { [e.id]: { protocolAction: { seq: 7, op: "meeting" } } };
  arena.protocol.sabotage.commsUntil=40;
  arena.advance(0.05, input); // Jammed radio and too far from wired console: intention consumed.
  position(e, arena.protocol.emergency);
  tick(arena, 1, input);
  assert.equal(arena.protocol.phase, "roam");
  const restored = restoreArena(JSON.parse(JSON.stringify(arena.snapshot())));
  tick(restored, 1, input);
  assert.equal(restored.protocol.phase, "roam");
  send(
    restored,
    restored.entities.find((x) => x.id === e.id),
    "meeting",
  );
  assert.equal(restored.protocol.phase, "discussion");
  assert.equal(protocolView(restored.snapshot(), e.id).protocol.self.lastActionSeq, 8);
});

test("recipient snapshots redact hidden roles, channels, AI goals, charge owners and unseen bodies", () => {
  const arena = fresh(),
    e = operator(arena),
    infil = infiltrator(arena);
  position(
    e,
    PROTOCOL_MAP.stations.find((s) => s.room === "generators"),
  );
  const site = distinctSites()[0];
  position(infil, site);
  tick(arena, 8.05, { [infil.id]: { interact: true } });
  const code = privatePlayer(arena, infil).channel.code;
  infil.role = "DO_NOT_LEAK_ROLE";
  infil.privateCode = "DO_NOT_LEAK_CODE";
  const before = JSON.stringify(arena.snapshot());
  const view = protocolView(arena.snapshot(), e.id);
  assert.equal(JSON.stringify(arena.snapshot()), before);
  assert.equal(view.protocol.players, undefined);
  assert.equal(view.protocol.authoritative, undefined);
  assert.equal(view.protocol.sites.length, 0);
  assert.equal(view.protocol.vents.length, 0);
  assert.equal(view.protocol.self.allies, undefined);
  assert.ok(
    view.entities
      .filter((x) => x.id !== e.id)
      .every((x) => x.team === -1 && x.path.length === 0 && x.kills === 0),
  );
  assert.equal(JSON.stringify(view).includes("DO_NOT_LEAK"), false);
  assert.equal(JSON.stringify(view).includes(`"code":"${code}"`), false);
  const own = protocolView(arena.snapshot(), infil.id);
  assert.equal(own.protocol.self.channel.code, code);
  assert.equal(own.protocol.self.allies.length, 1);
  send(arena, infil, "wire", undefined, code);
  assert.equal(protocolView(arena.snapshot(), e.id).protocol.bombs.length, 0);
  const enemyView = protocolView(arena.snapshot(), infil.id);
  assert.equal(enemyView.protocol.bombs[0].ownerId, undefined);
  view.protocol.self.tasks[0].done = true;
  assert.equal(privatePlayer(arena, e).tasks[0].done, false);
});

test("restored public views are presentation-only and cannot invent authoritative unknown roles", () => {
  const arena = fresh(),
    e = operator(arena);
  const publicData = protocolView(arena.snapshot(), e.id);
  const restored = restoreArena(JSON.parse(JSON.stringify(publicData)));
  const before = JSON.stringify(restored.snapshot());
  tick(restored, 10, { [e.id]: { fire: true, forward: 1, interact: true } });
  restored.detach(e.id);
  restored.updateMedical(100, {});
  assert.equal(
    restored.departMission(restored.entities.find((entity) => entity.id === e.id)),
    false,
  );
  assert.equal(JSON.stringify(restored.snapshot()), before);
  const forged = JSON.parse(JSON.stringify(publicData));
  forged.protocol.authoritative = true;
  forged.protocol.players = { [e.id]: { role: "operator", tasks: [] } };
  assert.equal(restoreArena(forged).presentationOnly, true);
});

test("remembered bodies do not reveal a hidden carrier or track unseen dragging", () => {
  const arena = fresh(),
    infil = infiltrator(arena),
    victim = operator(arena);
  const witness = arena.entities.find((e) => e.team === 0 && e !== victim);
  tick(arena, 12.1);
  position(infil, { x: 3.5, y: 5.5 });
  position(victim, { x: 3.5, y: 6.5 });
  position(witness, { x: 4.5, y: 5.5 });
  send(arena, infil, "eliminate", victim.id);
  const body = arena.protocol.bodies[0];
  const memory = protocolView(arena.snapshot(), witness.id).protocol.bodies[0];
  position(witness, { x: 6.5, y: 23.5 });
  position(infil, body);
  send(arena, infil, "drag", body.id);
  position(infil, { x: 7.5, y: 3.5 });
  tick(arena, 0.1);
  assert.equal(body.carriedBy, infil.id);
  const remembered = protocolView(arena.snapshot(), witness.id).protocol.bodies[0];
  assert.equal(remembered.carriedBy, null);
  assert.equal(remembered.x, memory.x);
  assert.equal(remembered.y, memory.y);
  assert.notEqual(remembered.x, body.x);
});

test("crew loss follows medical conditions; stopping every infiltrator wins; assignments and time cannot auto-win", () => {
  const eliminated = fresh();
  for (const e of eliminated.entities.filter((x) => x.team === 0)) e.hp = 0;
  eliminated.checkResult();
  assert.equal(eliminated.state, "ended");
  assert.equal(eliminated.winner, 1);
  const detonated = fresh();
  plantThree(detonated);
  tick(detonated, 75.1);
  assert.equal(detonated.state, "ended");
  assert.equal(detonated.winner, 1);
  assert.equal(
    Object.keys(protocolView(detonated.snapshot(), "player").protocol.revealedRoles).length,
    8,
  );
  const tasks = fresh();
  for (const p of Object.values(tasks.protocol.players))
    if (p.role === "operator") for (const t of p.tasks) t.done = true;
  tasks.checkResult();
  assert.equal(tasks.winner, null);
  const detained = fresh();
  for (const e of detained.entities.filter((x) => x.team === 1)) e.hp = 0;
  detained.checkResult();
  assert.equal(detained.winner, 0);
  assert.match(detained.protocol.resultReason, /every infiltrator/i);
  const parity = fresh();
  for (const e of parity.entities.filter((x) => x.team === 0).slice(0, 4)) e.hp = 0;
  parity.checkResult();
  assert.equal(parity.winner, 1);
  assert.match(parity.protocol.resultReason, /match the remaining crew/i);
  const expired = fresh();
  for (const patient of expired.protocol.mission.patients) patient.decay = 0;
  // Nobody acts: there is no round timer to hand either side a win.
  for (const e of expired.entities) e.bot = false;
  tick(expired, 600.1);
  assert.equal(expired.winner, null);
});

test("bot votes use witnessed actions rather than secret authoritative roles", () => {
  const arena = fresh(),
    infil = infiltrator(arena),
    victim = operator(arena);
  const witness = arena.entities.find((e) => e !== victim && e.team === 0);
  assert.ok(arena.entities.every((e) => arena.suspicion(e) === "skip"));
  tick(arena, 12.1);
  position(infil, { x: 3.5, y: 5.5 });
  position(victim, { x: 3.5, y: 6.5 });
  position(witness, { x: 4.5, y: 5.5 });
  send(arena, infil, "eliminate", victim.id);
  assert.equal(arena.suspicion(witness), infil.id);
  const uninformed = arena.entities.find(
    (e) =>
      e !== witness && e !== victim && e !== infil && !privatePlayer(arena, e).observations.length,
  );
  assert.ok(uninformed);
  assert.equal(arena.suspicion(uninformed), "skip");
  witness.bot = true;
  position(witness, { x: 3.5, y: 6.5 });
  arena.botAction(witness, "report", arena.protocol.bodies[0].id);
  tick(arena, 24);
  assert.equal(arena.protocol.meeting.votes[witness.id], infil.id);
  assert.ok(
    arena.protocol.meeting.messages.some(
      (m) => m.sender === witness.id && m.text.includes("attack a patrol"),
    ),
  );
});

test("bot patrol navigation loads medical supplies and persisted simulation resumes deterministically", () => {
  const arena = new ProtocolArena({ rolePreference: "operator", random: () => 0.4 });
  tick(arena, 60);
  assert.ok(arena.protocol.taskDone > 0);
  assert.ok(arena.entities.every((e) => arena.canMove(e.x, e.y)));
  const restored = restoreArena(JSON.parse(JSON.stringify(arena.snapshot())));
  assert.equal(restored.presentationOnly, false);
  tick(arena, 15);
  tick(restored, 15);
  assert.deepEqual(
    JSON.parse(JSON.stringify(restored.snapshot())),
    JSON.parse(JSON.stringify(arena.snapshot())),
  );
  assert.equal(PROTOCOL_RULES.plantDuration, 8);
});

test("infiltrator bots navigate, install and solve their own arming channels through normal validators", () => {
  const arena = new ProtocolArena({ humans, random: () => 0.4 });
  for (const e of arena.entities) {
    if (e.team === 1) e.bot = true;
    else position(e, { x: 3.5, y: 5.5 });
  }
  tick(arena, 160);
  assert.equal(arena.state, "ended");
  assert.equal(arena.winner, 1);
  assert.equal(arena.protocol.bombs.length, 3);
  assert.equal(new Set(arena.protocol.bombs.map((b) => b.room)).size, 3);
  assert.ok(arena.time >= 8 * 3 + 75);
  assert.ok(
    arena.entities
      .filter((e) => e.team === 1)
      .every((e) => privatePlayer(arena, e).channel === null),
  );
});

test("known infiltrator partners are excluded from their bot's accusation evidence only", () => {
  const arena = fresh(),
    [a, b] = arena.entities.filter((e) => e.team === 1),
    crew = operator(arena);
  const evidence = { kind: "plant", actorId: b.id, subjectId: null, at: 0, room: "Command" };
  privatePlayer(arena, a).observations.push(evidence);
  privatePlayer(arena, crew).observations.push(evidence);
  assert.equal(arena.suspicion(a), "skip");
  assert.equal(arena.suspicion(crew), b.id);
});

test("full medical mission gathers every required item, boards the aircraft and rescues living patients", () => {
  const arena = fresh(),
    crew = operator(arena),
    mission = arena.protocol.mission;
  for (const stock of mission.supplyStock) {
    while (stock.stock > 0) {
      collect(arena, crew, stock);
      load(arena, crew);
    }
  }
  assert.equal(arena.protocol.taskDone, 13);
  assert.ok(mission.manifest.every((item) => item.loaded === item.required));
  assert.equal(arena.state, "playing"); // Loaded cargo alone cannot win.
  const roundId = arena.roundId,
    roles = arena.entities.map((e) => e.team);
  tick(arena, 3.05, { [crew.id]: { interact: true } });
  assert.equal(arena.mapId, "medevac");
  assert.equal(mission.phase, "transport");
  assert.equal(arena.roundId, roundId);
  assert.deepEqual(
    arena.entities.map((e) => e.team),
    roles,
  );
  assert.ok(arena.entities.every((e) => arena.canMove(e.x, e.y)));
  for (const task of mission.flightTasks) {
    position(crew, task);
    tick(arena, task.duration + 0.05, { [crew.id]: { interact: true } });
  }
  assert.ok(mission.flightTasks.every((task) => task.done));
  tick(arena, 120.1);
  assert.equal(mission.vehicle.arrived, true);
  assert.equal(arena.state, "playing"); // Arrival still needs an aid delivery.
  position(crew, TRANSPORT_MAP.cargo);
  tick(arena, 4.55, { [crew.id]: { interact: true } });
  assert.equal(mission.phase, "delivered");
  assert.equal(arena.winner, 0);
  assert.equal(mission.patients.filter((patient) => patient.rescued).length, 4);
});

test("medical holds interrupt on release/movement and one carry slot cannot farm supplies", () => {
  const arena = fresh(),
    e = operator(arena),
    stock = arena.protocol.mission.supplyStock[0];
  position(e, stock);
  tick(arena, 2, { [e.id]: { interact: true } });
  tick(arena, 0.05);
  assert.equal(privatePlayer(arena, e).channel, null);
  assert.equal(stock.stock, 2);
  tick(arena, 2, { [e.id]: { interact: true } });
  tick(arena, 0.05, { [e.id]: { interact: true, forward: 1 } });
  assert.equal(stock.stock, 2);
  assert.equal(privatePlayer(arena, e).cargo, null);
  collect(arena, e, stock);
  const cargo = privatePlayer(arena, e).cargo;
  tick(arena, 15, { [e.id]: { interact: true, cargo: { supplyId: "surgical" }, progress: 999 } });
  assert.equal(stock.stock, 1);
  assert.equal(privatePlayer(arena, e).cargo, cargo);
  load(arena, e);
  assert.equal(
    arena.protocol.mission.manifest.find((item) => item.id === stock.supplyId).loaded,
    1,
  );
  tick(arena, 15, { [e.id]: { interact: true } });
  assert.equal(arena.protocol.taskDone, 1);
});

test("infiltrator pretend collection/loading does not consume stock or change the manifest", () => {
  const arena = fresh(),
    e = infiltrator(arena),
    stock = arena.protocol.mission.supplyStock[0];
  const original = stock.stock;
  collect(arena, e, stock);
  assert.equal(privatePlayer(arena, e).cargo.fake, true);
  assert.equal(stock.stock, original);
  load(arena, e);
  assert.equal(arena.protocol.taskDone, 0);
  assert.ok(arena.protocol.mission.manifest.every((item) => item.loaded === 0));
});

test("death and departure restore carried stock deterministically and never strand mission supplies", () => {
  const arena = fresh(),
    victim = operator(arena),
    enemy = infiltrator(arena),
    stock = arena.protocol.mission.supplyStock[0];
  collect(arena, victim, stock);
  tick(arena, 12.1);
  position(enemy, { x: victim.x, y: victim.y + 1 });
  send(arena, enemy, "eliminate", victim.id);
  assert.equal(victim.hp, 0);
  assert.equal(privatePlayer(arena, victim).cargo, null);
  assert.equal(stock.stock, 2);
  const other = arena.entities.find((e) => e.team === 0 && e.hp > 0);
  collect(arena, other, stock);
  arena.detach(other.id);
  assert.equal(privatePlayer(arena, other).cargo, null);
  assert.equal(stock.stock, 2);
});

test("aircraft departure requires complete real manifest, crew role, location and hold", () => {
  const arena = fresh(),
    crew = operator(arena),
    infil = infiltrator(arena);
  position(crew, arena.protocol.mission.loading);
  tick(arena, 5, { [crew.id]: { interact: true } });
  assert.equal(arena.protocol.mission.phase, "base");
  for (const item of arena.protocol.mission.manifest) item.loaded = item.required;
  position(infil, arena.protocol.mission.loading);
  tick(arena, 5, { [infil.id]: { interact: true } });
  assert.equal(arena.protocol.mission.phase, "base");
  tick(arena, 2, { [crew.id]: { interact: true } });
  tick(arena, 0.05);
  assert.equal(arena.protocol.mission.phase, "base");
  tick(arena, 3.05, { [crew.id]: { interact: true } });
  assert.equal(arena.protocol.mission.phase, "transport");
});

test("departure abandons base bombs and resets body/visibility state without changing cooldowns or roles", () => {
  const arena = fresh(),
    infil = plantThree(arena),
    crew = operator(arena);
  arena.protocol.bodies.push({
    id: "old-body",
    victimId: "old",
    name: "Old",
    x: 3.5,
    y: 5.5,
    reported: false,
  });
  privatePlayer(arena, crew).bodyMemory["old-body"] = { x: 3.5, y: 5.5 };
  const cooldown = privatePlayer(arena, infil).killReadyAt,
    role = privatePlayer(arena, infil).role;
  for (const item of arena.protocol.mission.manifest) item.loaded = item.required;
  position(crew, arena.protocol.mission.loading);
  tick(arena, 3.05, { [crew.id]: { interact: true } });
  assert.equal(arena.protocol.bombs.length, 0);
  assert.equal(arena.protocol.detonateAt, null);
  assert.equal(arena.protocol.bodies.length, 0);
  assert.deepEqual(privatePlayer(arena, crew).bodyMemory, {});
  assert.equal(privatePlayer(arena, infil).killReadyAt, cooldown);
  assert.equal(privatePlayer(arena, infil).role, role);
  assert.equal(arena.protocol.sites.length, 0);
});

test("patient vitals and the flight pause during discussion and vote", () => {
  const arena = transport(),
    e = operator(arena),
    mission = arena.protocol.mission;
  position(e, arena.protocol.emergency);
  send(arena, e, "meeting");
  const hp = mission.patients[0].hp,
    progress = mission.vehicle.progress;
  tick(arena, 20);
  assert.equal(arena.protocol.phase, "vote");
  assert.equal(mission.patients[0].hp, hp);
  assert.equal(mission.vehicle.progress, progress);
});

test("all patients dead or all operators lost defeats the medical mission", () => {
  const patients = fresh();
  for (const patient of patients.protocol.mission.patients) patient.hp = 0.001;
  tick(patients, 0.1);
  assert.equal(patients.winner, 1);
  const crew = fresh();
  for (const e of crew.entities.filter((e) => e.team === 0)) crew.detach(e.id);
  assert.equal(crew.winner, 1);
  // Losing operators reaches parity with the infiltrators before the last one goes.
  assert.match(crew.protocol.resultReason, /last rescue operator|match the remaining crew/i);
});

test("autopilot sabotage requires a nearby infiltrator and a stationary six-second hold", () => {
  const arena = transport(),
    crew = operator(arena),
    enemy = infiltrator(arena);
  tick(arena, 15.1);
  position(crew, TRANSPORT_MAP.avionics);
  tick(arena, 7, { [crew.id]: { interact: true } });
  assert.equal(arena.protocol.mission.vehicle.autopilot, true);
  send(arena, enemy, "disable-autopilot", TRANSPORT_MAP.avionics.id);
  assert.equal(arena.protocol.mission.vehicle.autopilot, true);
  position(enemy, TRANSPORT_MAP.avionics);
  tick(arena, 5, { [enemy.id]: { interact: true } });
  tick(arena, 0.05);
  assert.equal(arena.protocol.mission.vehicle.autopilot, true);
  tick(arena, 6.05, { [enemy.id]: { interact: true } });
  const v = arena.protocol.mission.vehicle;
  assert.equal(v.autopilot, false);
  assert.equal(v.underControl, false);
  assert.ok(v.recoveryDeadline > arena.time);
  assert.equal(v.pilotId, null);
});

test("disabled autopilot needs a real crew takeover, corrective axes and three stable seconds before restoration", () => {
  const arena = transport(),
    enemy = sabotageAircraft(arena),
    pilot = operator(arena),
    v = arena.protocol.mission.vehicle;
  send(arena, pilot, "autopilot");
  assert.equal(v.autopilot, false);
  position(enemy, TRANSPORT_MAP.helm);
  send(arena, enemy, "helm");
  assert.equal(v.pilotId, null);
  position(pilot, TRANSPORT_MAP.helm);
  send(arena, pilot, "helm");
  assert.equal(v.pilotId, pilot.id);
  send(arena, pilot, "autopilot");
  assert.equal(v.autopilot, false);
  const x = pilot.x,
    y = pilot.y,
    progress = v.progress;
  tick(arena, 1.5, {
    [pilot.id]: { forward: 1, strafe: 1, sprint: true, vehicleInput: { pitch: 1, steer: -1 } },
  });
  assert.equal(pilot.x, x);
  assert.equal(pilot.y, y);
  assert.equal(v.underControl, false);
  tick(arena, 3.1, { [pilot.id]: { vehicleInput: { pitch: 0, steer: 0 } } });
  assert.equal(v.underControl, true);
  assert.equal(v.recoveryDeadline, null);
  assert.ok(v.progress > progress);
  tick(arena, 22);
  assert.equal(arena.state, "playing"); // Valid stable manual flight is permitted.
  const other = arena.entities.find((e) => e !== pilot && e.team === 0);
  send(arena, other, "autopilot");
  assert.equal(v.autopilot, false);
  send(arena, pilot, "autopilot");
  assert.equal(v.autopilot, true);
  send(arena, pilot, "release-helm");
  assert.equal(v.pilotId, null);
});

test("foreign and nonfinite vehicle inputs cannot control aircraft and extreme real controls can crash it", () => {
  const arena = transport(),
    enemy = sabotageAircraft(arena),
    pilot = operator(arena),
    v = arena.protocol.mission.vehicle;
  const before = v.altitude;
  tick(arena, 1, { [enemy.id]: { vehicleInput: { pitch: 999, steer: -999 } } });
  assert.ok(v.altitude < before);
  position(pilot, TRANSPORT_MAP.helm);
  send(arena, pilot, "helm");
  tick(arena, 0.1, { [pilot.id]: { vehicleInput: { pitch: NaN, steer: Infinity } } });
  assert.ok(Number.isFinite(v.altitude) && Number.isFinite(v.heading));
  tick(arena, 4, { [pilot.id]: { vehicleInput: { pitch: 999, steer: 0 } } });
  assert.equal(arena.winner, 1);
  assert.match(arena.protocol.resultReason, /crashed/);
});

test("unrecovered aircraft crashes at its deadline; departure or death of a manual pilot requires another takeover", () => {
  const crashed = transport();
  sabotageAircraft(crashed);
  tick(crashed, 18.1);
  assert.equal(crashed.winner, 1);
  assert.ok(crashed.entities.filter((e) => e.team === 0).every((e) => e.hp === 0));
  const released = transport(),
    pilot = operator(released),
    v = released.protocol.mission.vehicle;
  position(pilot, TRANSPORT_MAP.helm);
  send(released, pilot, "helm");
  tick(released, 3.1);
  assert.equal(v.underControl, true);
  send(released, pilot, "release-helm");
  assert.equal(v.pilotId, null);
  assert.equal(v.underControl, false);
  assert.ok(v.recoveryDeadline > released.time);
  const detached = transport(),
    owner = operator(detached);
  position(owner, TRANSPORT_MAP.helm);
  send(detached, owner, "helm");
  detached.detach(owner.id);
  assert.equal(detached.protocol.mission.vehicle.pilotId, null);
  assert.ok(detached.protocol.mission.vehicle.recoveryDeadline > detached.time);
});

test("manual flight blocks new radio assemblies even after stabilization", () => {
  const arena = transport(),
    pilot = operator(arena),
    other = arena.entities.find((e) => e !== pilot && e.team === 0);
  position(pilot, TRANSPORT_MAP.helm);
  send(arena, pilot, "helm");
  tick(arena, 3.1);
  position(other, arena.protocol.emergency);
  send(arena, other, "meeting");
  assert.equal(arena.protocol.phase, "roam");
  assert.equal(privatePlayer(arena, other).emergenciesLeft, 1);
  send(arena, pilot, "autopilot");
  send(arena, other, "meeting");
  assert.equal(arena.protocol.phase, "discussion");
});

test("damaged cargo requires crew repair before delivery; remaining living patients can still be rescued", () => {
  const arena = transport(),
    enemy = infiltrator(arena),
    crew = operator(arena),
    v = arena.protocol.mission.vehicle;
  tick(arena, 15.1);
  position(enemy, TRANSPORT_MAP.cargo);
  tick(arena, 4.55, { [enemy.id]: { interact: true } });
  assert.equal(v.cargoDamage, 20);
  tick(arena, 120);
  assert.equal(v.arrived, true);
  position(crew, TRANSPORT_MAP.cargo);
  assert.equal(arena.context(crew).kind, "repair-cargo");
  tick(arena, 5, { [crew.id]: { interact: true } });
  tick(arena, 0.05);
  assert.equal(v.cargoDamage, 20);
  tick(arena, 6.05, { [crew.id]: { interact: true } });
  assert.equal(v.cargoDamage, 0);
  const trauma = arena.protocol.mission.flightTasks.find((task) => task.id === "trauma");
  position(crew, trauma);
  tick(arena, trauma.duration + 0.05, { [crew.id]: { interact: true } });
  position(crew, TRANSPORT_MAP.cargo);
  for (const patient of arena.protocol.mission.patients.slice(0, 3)) patient.hp = 0;
  tick(arena, 4.55, { [crew.id]: { interact: true } });
  assert.equal(arena.winner, 0);
  assert.equal(arena.protocol.mission.patients.filter((patient) => patient.rescued).length, 1);
});

test("medical recipient snapshots expose mission progress while stripping private cargo, owners and nested extras", () => {
  const arena = fresh(),
    crew = operator(arena),
    other = arena.entities.find((e) => e !== crew && e.team === 0);
  collect(arena, crew, arena.protocol.mission.supplyStock[0]);
  privatePlayer(arena, other).cargo = {
    supplyId: "surgical",
    name: "PRIVATE_OTHER_CARGO",
    sourceId: "PRIVATE_SOURCE",
  };
  privatePlayer(arena, other).botGoal = { private: "PRIVATE_BOT_GOAL" };
  const mission = arena.protocol.mission;
  mission.privateRoles = "PRIVATE_MISSION";
  mission.vehicle.privateRole = "PRIVATE_VEHICLE";
  mission.patients[0].privateHint = "PRIVATE_PATIENT";
  mission.manifest[0].privateOwner = "PRIVATE_MANIFEST";
  mission.supplyStock[0].privateOwner = "PRIVATE_STOCK";
  const before = JSON.stringify(arena.snapshot()),
    view = protocolView(arena.snapshot(), crew.id);
  assert.equal(JSON.stringify(arena.snapshot()), before);
  assert.equal(JSON.stringify(view).includes("PRIVATE_"), false);
  assert.equal(view.protocol.self.cargo.supplyId, "trauma");
  assert.equal(view.protocol.self.cargo.sourceId, undefined);
  assert.equal(view.protocol.mission.manifest.length, 4);
  assert.equal(view.protocol.mission.patients.length, 4);
  view.protocol.mission.manifest[0].loaded = 100;
  assert.equal(mission.manifest[0].loaded, 0);
});

test("operator bots legally gather/load/depart and deliver without legacy instant victory", () => {
  const arena = new ProtocolArena({ humans: [], random: () => 0.4 });
  // A secured crew-only patrol still has to complete the actual medical run.
  // Infiltrators stay aboard but idle: stopping them would end the round early.
  for (const e of arena.entities) if (e.team === 1) e.bot = false;
  tick(arena, 440);
  assert.equal(arena.winner, 0);
  assert.equal(arena.protocol.mission.phase, "delivered");
  assert.equal(arena.protocol.taskDone, 13);
  assert.ok(arena.protocol.mission.patients.some((patient) => patient.rescued));
});

test("bot operators recover a sabotaged aircraft through helm/axes/stabilization/restoration", () => {
  const arena = transport(),
    crew = operator(arena);
  sabotageAircraft(arena);
  crew.bot = true;
  position(crew, { x: 8.5, y: 5.5 });
  tick(arena, 12);
  assert.equal(arena.state, "playing");
  assert.equal(arena.protocol.mission.vehicle.autopilot, true);
  assert.equal(arena.protocol.mission.vehicle.recoveryDeadline, null);
});

test("medical transport physics and private cargo resume identically after authoritative JSON restore", () => {
  const arena = transport(),
    crew = operator(arena);
  sabotageAircraft(arena);
  position(crew, TRANSPORT_MAP.helm);
  send(arena, crew, "helm");
  const inputs = { [crew.id]: { vehicleInput: { pitch: 1, steer: -1 } } };
  tick(arena, 0.7, inputs);
  const restored = restoreArena(JSON.parse(JSON.stringify(arena.snapshot())));
  tick(arena, 0.6, inputs);
  tick(restored, 0.6, inputs);
  tick(arena, 3.1);
  tick(restored, 3.1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(arena.snapshot())),
    JSON.parse(JSON.stringify(restored.snapshot())),
  );
});
