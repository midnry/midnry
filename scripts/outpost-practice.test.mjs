import test from "node:test";
import assert from "node:assert/strict";
import { PracticeMission, PRACTICE_STEPS } from "../public/games/outpost-practice.js";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { TRANSPORT_MAP } from "../public/games/outpost-protocol-map.js";

function tick(m, seconds = 0.05, extra = {}) {
  for (let t = 0; t < seconds - 1e-8; t += 0.05) {
    m.arena.advance(0.05, { player: m.input(extra) });
    m.update();
  }
}
function action(m, op, target, value) {
  const seq = m.arena.privateFor(m.player).actionSeq + 1;
  tick(m, 0.05, { protocolAction: { seq, op, target, value } });
}
function equipment(m) {
  tick(m, 0.05, { interact: true });
  const c = m.arena.privateFor(m.player).channel;
  assert.ok(c?.challenge);
  while (c.challenge.index < c.challenge.steps.length) {
    tick(m, 0.45);
    const step = c.challenge.steps[c.challenge.index];
    action(m, "task-step", c.challenge.id, step.answer);
  }
  tick(m, c.duration + 0.1);
}
test("practice uses actual packing, loading, defusing, reporting, voting and pilot validators", () => {
  const m = new PracticeMission();
  tick(m, 1);
  assert.equal(m.step.id, "pack", "time alone cannot complete a drill");
  m.place(m.stock);
  equipment(m);
  assert.equal(m.step.id, "load");
  assert.equal(m.arena.privateFor(m.player).contributions.supplies, 0);
  m.place(m.arena.protocol.mission.loading);
  tick(m, 3.1, { interact: true });
  assert.equal(m.step.id, "defuse");
  const bomb = m.arena.protocol.bombs[0];
  m.place(bomb);
  tick(m, 6.1, { interact: true });
  assert.equal(m.step.id, "report");
  assert.equal(m.arena.privateFor(m.player).contributions.defuses, 1);
  action(m, "report", "training-body");
  assert.equal(m.step.id, "vote");
  tick(m, 15.1);
  assert.equal(m.arena.protocol.phase, "vote");
  action(m, "vote", "skip");
  tick(m, 15.1);
  assert.equal(m.step.id, "board");
  m.place(m.arena.protocol.mission.loading);
  tick(m, 3.1, { interact: true });
  assert.equal(m.step.id, "oxygen");
  assert.equal(m.arena.mapId, "medevac");
  m.place(m.arena.protocol.mission.flightTasks.find((t) => t.id === "oxygen"));
  equipment(m);
  assert.equal(m.step.id, "pilot");
  assert.equal(m.arena.protocol.mission.vehicle.autopilot, false);
  action(m, "autopilot");
  assert.equal(m.complete, false, "autopilot cannot restore itself without a pilot");
  m.place(TRANSPORT_MAP.helm);
  action(m, "helm");
  tick(m, 1.3, { vehicleInput: { pitch: 1, steer: -1 } });
  tick(m, 3.2, { vehicleInput: { pitch: 0, steer: 0 } });
  assert.equal(m.arena.protocol.mission.vehicle.underControl, true);
  action(m, "autopilot");
  assert.equal(m.complete, true);
  assert.equal(m.arena.privateFor(m.player).contributions.recoveries, 1);
});
test("every drill can restart independently; fatal flight failure remains retryable", () => {
  for (let i = 0; i < PRACTICE_STEPS.length; i++) {
    const m = new PracticeMission(i);
    assert.equal(m.step, PRACTICE_STEPS[i]);
    assert.ok(m.player.hp > 0);
    assert.equal(m.arena.privateFor(m.player).role, "operator");
    assert.equal(m.complete, false);
  }
  const m = new PracticeMission(7);
  tick(m, 19);
  assert.equal(m.failed, true);
  const retry = new PracticeMission(7);
  assert.equal(retry.failed, false);
  assert.ok(retry.arena.protocol.mission.vehicle.recoveryDeadline > retry.arena.time);
});
test("practice fixtures do not change normal arenas or recipient privacy", () => {
  const real = new ProtocolArena({ rolePreference: "operator" }),
    before = JSON.stringify(real.snapshot());
  const practice = new PracticeMission(2);
  assert.equal(JSON.stringify(real.snapshot()), before);
  assert.equal(
    real.protocol.mission.manifest.reduce((s, i) => s + i.required, 0),
    9,
  );
  assert.ok(real.entities.some((e) => e.bot));
  const view = protocolView(practice.arena.snapshot(), "player");
  assert.equal(view.protocol.players, undefined);
  assert.deepEqual(view.protocol.sites, []);
  assert.equal(view.protocol.revealedRoles, undefined);
});
test("missing the vote opens a retry instead of leaving an impossible drill", () => {
  const m = new PracticeMission(4);
  tick(m, 31);
  assert.equal(m.failed, true);
  assert.match(m.failureReason, /before you voted/);
  const retry = new PracticeMission(4);
  assert.equal(retry.arena.protocol.phase, "discussion");
});
test("training departure stays locked until reporting and voting are finished", () => {
  const m = new PracticeMission(2);
  m.place(m.arena.protocol.mission.loading);
  tick(m, 4, { interact: true });
  assert.equal(m.arena.mapId, "breakwater");
  assert.equal(m.step.id, "defuse");
  const board = new PracticeMission(5);
  tick(board, 3.1, { interact: true });
  assert.equal(board.arena.mapId, "medevac");
  assert.equal(board.step.id, "oxygen");
});
test("the infiltrator track teaches cover, elimination, hatches, sabotage and charges on real validators", () => {
  const m = new PracticeMission(0, "infiltrator");
  assert.equal(m.arena.privateFor(m.player).role, "infiltrator");
  tick(m, 1);
  assert.equal(m.step.id, "fake", "time alone cannot complete a drill");
  // Fake a cover assignment at the station the drill pointed to.
  const self = m.arena.privateFor(m.player),
    task = self.tasks.find((t) => !t.done),
    station = m.arena.protocol.stations.find((s) => s.id === task.stationId);
  m.place(m.near(station, 0.8));
  tick(m, 4.7, { interact: true });
  assert.equal(m.step.id, "eliminate");
  action(m, "eliminate", m.target);
  assert.equal(m.step.id, "vent");
  const from = m.arena.protocol.vents.find((v) => v.id === m.ventFrom);
  action(m, "vent", from.links[0]);
  assert.equal(m.step.id, "sabotage");
  action(m, "sabotage", "power");
  assert.equal(m.step.id, "plant");
  const site = m.arena.protocol.sites[0];
  m.place(site);
  tick(m, 8.1, { interact: true });
  const code = m.arena.privateFor(m.player).channel?.code;
  assert.match(code, /^\d{3}$/);
  action(m, "wire", undefined, code);
  assert.equal(m.complete, true);
  assert.equal(m.arena.state, "playing", "practice never ends the round by itself");
});
