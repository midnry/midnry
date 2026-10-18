import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { suspectScores } from "../public/games/outpost-protocol-ai.js";

const arena = () => new ProtocolArena({ humans: [{ id: "me", name: "Me" }], rolePreference: "operator", random: () => 0.31 });

test("a reported body gives everyone a security log that always names the attacker", () => {
  const a = arena(),
    killer = a.entities.find((e) => e.team === 1),
    victim = a.entities.find((e) => e.team === 0 && e.id !== "me"),
    me = a.entities.find((e) => e.id === "me");
  a.time = 30;
  Object.assign(victim, { x: 4.5, y: 4.5 });
  Object.assign(killer, { x: 5.2, y: 4.5 });
  a.privateFor(killer).killReadyAt = 0;
  a.eliminate(killer, victim.id);
  const body = a.protocol.bodies[0];
  a.startMeeting(me, `${body.name}'s patrol was found`, body);
  const log = protocolView(a.snapshot(), "me").protocol.self.clues.find((c) => c.kind === "log");
  assert.ok(log, "security log arrived");
  assert.ok(log.text.includes(killer.name));
  assert.equal(log.ids, undefined, "ids stay on the server");
});

test("footprints follow the attacker and show only to players who found the body", () => {
  const a = arena(),
    killer = a.entities.find((e) => e.team === 1),
    victim = a.entities.find((e) => e.team === 0 && e.id !== "me"),
    me = a.entities.find((e) => e.id === "me");
  a.time = 30;
  for (const e of a.entities) Object.assign(e, { x: 25.5, y: 26.5 });
  Object.assign(victim, { x: 4.5, y: 4.5 });
  Object.assign(killer, { x: 5.2, y: 4.5 });
  a.privateFor(killer).killReadyAt = 0;
  a.eliminate(killer, victim.id);
  for (let i = 0; i < 6; i++) {
    killer.x += 0.4;
    a.updateClues();
  }
  const body = a.protocol.bodies[0];
  assert.ok(body.trail.length > 2);
  assert.deepEqual(protocolView(a.snapshot(), "me").protocol.bodies.find((b) => b.id === body.id)?.trail ?? [], []);
  Object.assign(me, { x: 4.5, y: 5.5 });
  a.discover(me);
  const view = protocolView(a.snapshot(), "me");
  assert.ok(view.protocol.bodies.find((b) => b.id === body.id).trail.length > 2);
  assert.ok(view.protocol.self.clues.some((c) => c.kind === "footprints"));
});

test("a sabotaged panel carries a two-colour smudge, and bots weigh both colours", () => {
  const a = arena(),
    saboteur = a.entities.find((e) => e.team === 1),
    me = a.entities.find((e) => e.id === "me");
  a.time = 40;
  a.privateFor(saboteur).sabotageReadyAt = 0;
  a.action(saboteur, { seq: 1, op: "sabotage", target: "power" });
  const smudge = a.protocol.smudges.power;
  assert.ok(smudge.colors.includes(saboteur.colorName));
  const station = a.protocol.stations.find((s) => /power|generator/.test(s.kind));
  Object.assign(me, { x: station.x, y: station.y });
  a.updateClues();
  const clue = a.privateFor(me).clues.find((c) => c.kind === "smudge");
  assert.match(clue.text, new RegExp(saboteur.colorName));
  const ctx = a.botMeetingContext(me);
  assert.ok((suspectScores(ctx).get(saboteur.id) || 0) >= 0.6);
});

test("the security log never names a lone attacker by themselves", () => {
  const a = arena(),
    killer = a.entities.find((e) => e.team === 1),
    victim = a.entities.find((e) => e.team === 0 && e.id !== "me"),
    me = a.entities.find((e) => e.id === "me");
  a.time = 30;
  for (const e of a.entities) Object.assign(e, { x: 25.5, y: 26.5 });
  Object.assign(victim, { x: 4.5, y: 4.5 });
  Object.assign(killer, { x: 5.2, y: 4.5 });
  a.privateFor(killer).killReadyAt = 0;
  a.eliminate(killer, victim.id);
  const body = a.protocol.bodies[0];
  a.startMeeting(me, "found", body);
  const log = a.privateFor(me).clues.find((c) => c.kind === "log");
  assert.ok(log.ids.length >= 3);
  assert.ok(log.ids.includes(killer.id));
});
