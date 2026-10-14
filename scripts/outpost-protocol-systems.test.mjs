import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView, restoreArena } from "../public/games/outpost-protocol.js";
import { beginCombat, LAST_STAND } from "../public/games/outpost-protocol-combat.js";
import { TRANSPORT_MAP } from "../public/games/outpost-protocol-map.js";
import { weaponOf } from "../public/games/outpost-content.js";
const fresh = () =>
  new ProtocolArena({
    humans: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `Patrol ${i}` })),
    rolePreference: "operator",
    random: () => 0.4,
  });
const tick = (a, seconds, inputs = {}) => {
  for (let left = seconds; left > 1e-8; left -= 0.05) a.advance(Math.min(left, 0.05), inputs);
};
const at = (e, p) => Object.assign(e, { x: p.x, y: p.y });
const send = (a, e, op, target) =>
  a.advance(0.05, {
    [e.id]: { protocolAction: { seq: a.privateFor(e).actionSeq + 1, op, target } },
  });
const transport = () => {
  const a = fresh(),
    e = a.entities[0];
  for (const item of a.protocol.mission.manifest) item.loaded = item.required;
  at(e, a.protocol.mission.loading);
  assert.equal(a.departMission(e), true);
  return a;
};
const prepare = (a, e) => {
  for (const task of a.protocol.mission.flightTasks) {
    at(e, task);
    tick(a, task.duration + 0.1, { [e.id]: { interact: true } });
    assert.equal(task.done, true);
  }
};

test("aircraft duties require nearby uninterrupted operator holds; forged/fake work cannot complete them", () => {
  const a = transport(),
    e = a.entities[0],
    infil = a.entities.find((e) => e.team === 1),
    task = a.protocol.mission.flightTasks[0];
  tick(a, 7, { [e.id]: { interact: true, flightTasks: [{ ...task, done: true }] } });
  assert.equal(task.done, false);
  at(e, task);
  tick(a, 2, { [e.id]: { interact: true } });
  tick(a, 0.1);
  tick(a, 3, { [e.id]: { interact: true } });
  assert.equal(task.done, false);
  at(infil, task);
  tick(a, 6, { [infil.id]: { interact: true } });
  assert.equal(task.done, false);
  prepare(a, e);
  assert.equal(a.flightTasksComplete(), true);
  assert.equal(a.protocol.mission.vehicle.autopilot, true);
});
test("arrival and cargo alone cannot finish rescue; prepared aircraft and a real aid hold can", () => {
  const a = transport(),
    e = a.entities[0],
    m = a.protocol.mission;
  m.vehicle.progress = m.vehicle.duration - 0.1;
  at(e, TRANSPORT_MAP.cargo);
  tick(a, 5, { [e.id]: { interact: true } });
  assert.equal(a.winner, null);
  prepare(a, e);
  at(e, TRANSPORT_MAP.cargo);
  tick(a, 4.6, { [e.id]: { interact: true } });
  assert.equal(a.winner, 0);
});
test("oxygen/radio duties wait for repaired systems; cargo sabotage unsecures the trauma packs", () => {
  const a = transport(),
    e = a.entities[0],
    infil = a.entities.find((e) => e.team === 1),
    m = a.protocol.mission;
  a.protocol.sabotage.powerUntil = 100;
  at(e, m.flightTasks[0]);
  tick(a, 5.2, { [e.id]: { interact: true } });
  assert.equal(m.flightTasks[0].done, false);
  a.protocol.sabotage.powerUntil = 0;
  prepare(a, e);
  at(infil, TRANSPORT_MAP.cargo);
  a.privateFor(infil).sabotageReadyAt = 0;
  tick(a, 4.6, { [infil.id]: { interact: true } });
  assert.ok(m.vehicle.cargoDamage > 0);
  assert.equal(m.flightTasks.find((t) => t.id === "trauma").done, false);
  at(e, TRANSPORT_MAP.cargo);
  tick(a, 6.1, { [e.id]: { interact: true } });
  assert.equal(m.vehicle.cargoDamage, 0);
  prepare(a, e);
});
test("autopilot stays healthy during routine duties and an uninterrupted flight", () => {
  const a = transport(),
    m = a.protocol.mission;
  prepare(a, a.entities[0]);
  tick(a, 130);
  assert.equal(m.vehicle.autopilot, true);
  assert.equal(m.vehicle.disabledAt, null);
  assert.equal(m.vehicle.arrived, true);
  assert.equal(a.winner, null);
});
test("majority vote starts a six-versus-one fight without killing the accused or revealing roles", () => {
  const a = fresh(),
    caller = a.entities[0],
    target = a.entities[1];
  a.entities[7].hp = 0;
  const teams = a.entities.map((e) => e.team);
  at(caller, a.protocol.emergency);
  send(a, caller, "meeting");
  tick(a, 15.1);
  for (const e of a.entities.slice(0, 4)) send(a, e, "vote", target.id);
  tick(a, 15.1);
  assert.equal(a.protocol.phase, "combat");
  assert.equal(target.hp, 100);
  assert.equal(a.protocol.combat.participants.length, 7);
  assert.deepEqual(
    a.entities.map((e) => e.team),
    teams,
  );
  const view = protocolView(a.snapshot(), caller.id);
  assert.equal(view.protocol.combat.targetId, target.id);
  assert.ok(view.entities.filter((e) => e.id !== caller.id).every((e) => e.team === -1));
  assert.equal(view.protocol.revealedRoles, undefined);
  assert.equal(view.protocol.players, undefined);
});
test("a plurality, an abstention, a tie or a Skip majority cannot initiate a fight", () => {
  for (const votes of [
    ["target"],
    ["target", "target", "other"],
    ["target", "target", "target", "target", "skip", "skip", "skip", "skip"],
    ["skip", "skip", "skip", "skip", "skip"],
  ]) {
    const a = fresh(),
      caller = a.entities[0];
    at(caller, a.protocol.emergency);
    send(a, caller, "meeting");
    tick(a, 15.1);
    votes.forEach((v, i) =>
      send(
        a,
        a.entities[i],
        "vote",
        v === "target" ? a.entities[1].id : v === "other" ? a.entities[2].id : "skip",
      ),
    );
    tick(a, 15.1);
    assert.equal(a.protocol.phase, "roam");
    assert.equal(a.protocol.combat, null);
  }
});
test("Last Stand gates firearms until preparation ends, respects walls, blocks friendly damage and uses reload", () => {
  const a = fresh(),
    shooter = a.entities[0],
    target = a.entities.find((e) => e.team === 1),
    mate = a.entities.find((e) => e !== shooter && e !== target);
  beginCombat(a, target);
  at(shooter, { x: 3.5, y: 5.5 });
  at(target, { x: 6.5, y: 5.5 });
  at(mate, { x: 4.5, y: 5.5 });
  shooter.a = 0;
  for (const e of a.entities) if (![shooter, target, mate].includes(e)) at(e, { x: 14.5, y: 14.5 });
  tick(a, 4, { [shooter.id]: { fire: true, forward: 1 } });
  assert.equal(shooter.x, 3.5);
  assert.equal(shooter.ammo, weaponOf("carbine").mag);
  tick(a, 2, { [shooter.id]: { fire: true } });
  assert.equal(mate.hp, 100);
  assert.equal(target.hp, 100);
  at(mate, { x: 2.5, y: 2.5 });
  at(target, { x: 3.5, y: 23.5 });
  shooter.a = Math.PI / 2;
  tick(a, 1, { [shooter.id]: { fire: true } });
  assert.equal(target.hp, 100);
  shooter.ammo = 0;
  tick(a, 1.6, { [shooter.id]: { reload: true } });
  assert.equal(shooter.ammo, weaponOf("carbine").mag);
  at(target, { x: 6.5, y: 5.5 });
  shooter.a = 0;
  tick(a, 2, { [shooter.id]: { fire: true } });
  assert.equal(target.hp, 0);
  assert.equal(a.protocol.phase, "roam");
  assert.equal(shooter.ammo, 0);
  const hp = mate.hp;
  a.damage(mate, 200, shooter);
  assert.equal(mate.hp, hp);
});
test("an accused survivor who defeats the whole patrol decides the round for their side", () => {
  for (const pick of [(a) => a.entities.find((e) => e.team === 0), (a) => a.entities.find((e) => e.team === 1)]) {
    const a = fresh(),
      target = pick(a);
    beginCombat(a, target);
    tick(a, LAST_STAND.preparation + 0.1);
    for (const e of a.entities) if (e !== target) a.damage(e, 100, target);
    tick(a, 0.1);
    assert.equal(target.hp, 100);
    assert.equal(a.state, "ended");
    assert.equal(a.winner, target.team);
  }
});
test("Last Stand announces the removed player's role unless the host hides it", () => {
  for (const reveal of [true, false]) {
    const a = new ProtocolArena({ humans: [], random: () => 0.4, revealRoles: reveal });
    const target = a.entities.find((e) => e.team === 1);
    beginCombat(a, target);
    tick(a, LAST_STAND.preparation + LAST_STAND.duration + 0.1);
    tick(a, 0.1);
    assert.equal(a.state, "playing");
    const view = protocolView(a.snapshot(), a.entities.find((e) => e.team === 0).id).protocol;
    if (reveal) {
      assert.match(a.protocol.combat.result, /WAS an infiltrator/);
      assert.equal(view.revealed[target.id], "infiltrator");
      assert.deepEqual(view.combat.revealed, { id: target.id, infiltrator: true });
    } else {
      assert.match(a.protocol.combat.result, /classified/);
      assert.deepEqual(view.revealed, {});
      assert.equal(view.combat.revealed, null);
    }
  }
});
test("combat bots use public combat sides and resolve through actual gunfire", () => {
  const a = fresh(),
    target = a.entities[0];
  for (const e of a.entities) e.bot = true;
  for (const [i, e] of a.entities.entries())
    at(e, { x: 3.5 + (i % 4), y: 3.5 + Math.floor(i / 4) });
  beginCombat(a, target);
  tick(a, 25);
  assert.notEqual(a.protocol.phase, "combat");
  assert.ok(a.entities.some((e) => e.damageTotal > 0));
  assert.equal(target.hp, 0);
  assert.ok(a.entities.some((e) => e.kills > 0));
});
test("disconnects and expiry finish combat, preserve role secrecy and cannot soft-lock the mission", () => {
  for (const disconnect of [false, true]) {
    const a = fresh(),
      target = a.entities.find((e) => e.team === 1);
    beginCombat(a, target);
    if (disconnect) a.detach(target.id);
    else tick(a, LAST_STAND.preparation + LAST_STAND.duration + 0.1);
    tick(a, 0.1);
    assert.equal(a.protocol.phase, "roam");
    assert.equal(target.hp, 0);
    assert.equal(a.winner, null);
    assert.equal(protocolView(a.snapshot(), a.entities[0].id).protocol.revealedRoles, undefined);
  }
});
test("combat and flight-task snapshots restore deterministically without accepting a recipient as authoritative", () => {
  const a = transport();
  prepare(a, a.entities[0]);
  beginCombat(a, a.entities[1]);
  tick(a, 6);
  const copy = restoreArena(JSON.parse(JSON.stringify(a.snapshot())));
  tick(a, 2);
  tick(copy, 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(copy.snapshot())),
    JSON.parse(JSON.stringify(a.snapshot())),
  );
  const recipient = restoreArena(protocolView(a.snapshot(), a.entities[0].id)),
    original = JSON.stringify(recipient.snapshot());
  tick(recipient, 3, { p0: { fire: true, interact: true } });
  assert.equal(JSON.stringify(recipient.snapshot()), original);
});
