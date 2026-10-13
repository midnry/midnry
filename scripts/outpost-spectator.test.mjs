import test from "node:test";
import assert from "node:assert/strict";
import { SpectatorSelection } from "../public/games/outpost-spectator.js";
import { ProtocolArena, protocolView, restoreArena } from "../public/games/outpost-protocol.js";

const patrol = () => [
  { id: "self", hp: 0 }, { id: "dead", hp: 0 },
  { id: "departed", hp: 100, departed: true },
  { id: "a", hp: 100, x: 4, a: 0.2, pitch: 0.3 },
  { id: "b", hp: 65, x: 8, a: -0.1, pitch: -0.4 },
  { id: "c", hp: 100 },
];
test("spectator cycles both directions and wraps across surviving, present participants only", () => {
  const s = new SpectatorSelection(), entities = patrol();
  assert.equal(s.target(entities, "self").id, "a");
  assert.equal(s.cycle(entities, "self", -1).id, "c");
  assert.equal(s.cycle(entities, "self", 1).id, "a");
  assert.equal(s.cycle(entities, "self", 1).id, "b");
  assert.equal(s.cycle(entities, "self", 1).id, "c");
  assert.equal(s.cycle(entities, "self", 1).id, "a");
});
test("spectator resolves new snapshot objects and immediately leaves dead/disconnected targets", () => {
  const s = new SpectatorSelection(), entities = patrol();
  s.cycle(entities, "self", 1);
  const snapshot = structuredClone(entities);
  const updated = snapshot.find((e) => e.id === "b");
  Object.assign(updated, { x: 12, a: 1.5, pitch: 0.7 });
  assert.equal(s.target(snapshot, "self"), updated);
  updated.hp = 0;
  assert.equal(s.target(snapshot, "self").id, "a");
  snapshot.find((e) => e.id === "a").departed = true;
  assert.equal(s.target(snapshot, "self").id, "c");
  snapshot.pop();
  assert.equal(s.target(snapshot, "self"), null);
  assert.equal(s.cycle(snapshot, "self", -1), null);
});
test("a sole survivor is stable; round reset removes the previous selection", () => {
  const s = new SpectatorSelection(), entities = [{ id: "a", hp: 100 }];
  assert.equal(s.cycle(entities, "self", 1).id, "a");
  assert.equal(s.cycle(entities, "self", -1).id, "a");
  s.reset();
  assert.equal(s.targetId, null);
});
test("spectator selection preserves simulation and recipient privacy across online restores", () => {
  const arena = new ProtocolArena({ rolePreference: "operator", random: () => 0.4 });
  const self = arena.entities[0];
  self.hp = 0;
  const authoritative = JSON.stringify(arena.snapshot());
  const recipient = protocolView(arena.snapshot(), self.id);
  const before = JSON.stringify(recipient);
  const s = new SpectatorSelection();
  for (let i = 0; i < 9; i++) s.cycle(recipient.entities, self.id, i % 2 ? -1 : 1);
  assert.equal(JSON.stringify(recipient), before);
  assert.equal(JSON.stringify(arena.snapshot()), authoritative);
  assert.equal(recipient.protocol.players, undefined);
  assert.equal(recipient.protocol.roles, undefined);
  assert.equal(recipient.protocol.self.role, "operator");
  const restored = restoreArena(recipient);
  assert.equal(s.target(restored.entities, self.id).id, s.targetId);
  assert.equal(restored.protocol.self.role, "operator");
  assert.equal(restored.protocol.players, undefined);
});
