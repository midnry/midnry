import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, PROTOCOL_RULES, protocolView } from "../public/games/outpost-protocol.js";

const make = (role) =>
  new ProtocolArena({ humans: [{ id: "me", name: "Me" }], rolePreference: role, random: () => 0.3 });
const send = (a, e, op, target, value) =>
  a.action(e, { seq: a.privateFor(e).actionSeq + 1, op, target, value });
function solve(a, me) {
  const game = a.privateFor(me).channel.challenge;
  while (game.index < game.steps.length) {
    a.time = Math.max(a.time, game.nextAt);
    send(a, me, "task-step", game.id, game.steps[game.index].answer);
  }
}

test("living players cannot use remote support; eliminated operators steady the weakest patient", () => {
  const a = make("operator"),
    me = a.entities.find((e) => e.id === "me");
  a.time = 30;
  send(a, me, "ghost-begin");
  assert.equal(a.privateFor(me).channel, null);
  assert.equal(protocolView(a.snapshot(), "me").protocol.self.ghost, undefined);
  me.hp = 0;
  const ghost = protocolView(a.snapshot(), "me").protocol.self.ghost;
  assert.deepEqual(ghost, { readyAt: 0, done: 0, limit: PROTOCOL_RULES.ghostLimit, help: "patients" });
  send(a, me, "ghost-begin");
  const channel = a.privateFor(me).channel;
  assert.equal(channel.kind, "ghost");
  assert.equal(channel.challenge.steps.length, 2);
  assert.notEqual(channel.challenge.steps[0].kind, channel.challenge.steps[1].kind);
  // The challenge is visible to the ghost, so the usual check window opens.
  assert.equal(protocolView(a.snapshot(), "me").protocol.self.channel.kind, "ghost");
  const weakest = [...a.protocol.mission.patients].sort((x, y) => x.hp - y.hp)[0];
  const before = weakest.hp;
  solve(a, me);
  assert.equal(weakest.hp, before + PROTOCOL_RULES.ghostHeal);
  assert.equal(a.privateFor(me).channel, null);
  assert.equal(a.privateFor(me).contributions.remote, 1);
  // Cooldown, then a limit.
  send(a, me, "ghost-begin");
  assert.equal(a.privateFor(me).channel, null);
  for (let i = 1; i < PROTOCOL_RULES.ghostLimit; i++) {
    a.time += PROTOCOL_RULES.ghostCooldown;
    send(a, me, "ghost-begin");
    solve(a, me);
  }
  a.time += PROTOCOL_RULES.ghostCooldown;
  send(a, me, "ghost-begin");
  assert.equal(a.privateFor(me).channel, null);
  assert.equal(a.privateFor(me).ghostDone, PROTOCOL_RULES.ghostLimit);
});

test("a caught infiltrator recharges a living partner's attack, and nothing when alone", () => {
  const a = make("infiltrator"),
    me = a.entities.find((e) => e.id === "me"),
    partner = a.entities.find((e) => e.team === 1 && e !== me);
  a.time = 30;
  me.hp = 0;
  a.privateFor(partner).killReadyAt = 50;
  send(a, me, "ghost-begin");
  solve(a, me);
  assert.equal(a.privateFor(partner).killReadyAt, 50 - PROTOCOL_RULES.ghostRecharge);
  partner.hp = 0;
  a.time += PROTOCOL_RULES.ghostCooldown;
  assert.equal(protocolView(a.snapshot(), "me").protocol.self.ghost.help, null);
  send(a, me, "ghost-begin");
  assert.equal(a.privateFor(me).channel, null);
});

test("remote support stops for assemblies, and players who left cannot use it", () => {
  const a = make("operator"),
    me = a.entities.find((e) => e.id === "me"),
    caller = a.entities.find((e) => e !== me && e.team === 0);
  a.time = 30;
  me.hp = 0;
  send(a, me, "ghost-begin");
  a.startMeeting(caller, "Emergency assembly");
  assert.equal(a.privateFor(me).channel, null);
  send(a, me, "ghost-begin");
  assert.equal(a.privateFor(me).channel, null);
  const b = make("operator"),
    gone = b.entities.find((e) => e.id === "me");
  b.time = 30;
  b.detach("me");
  send(b, gone, "ghost-begin");
  assert.equal(b.privateFor(gone).channel, null);
});
