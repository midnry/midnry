import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, PROTOCOL_RULES } from "../public/games/outpost-protocol.js";

const make = () =>
  new ProtocolArena({ humans: [{ id: "me", name: "Me" }], rolePreference: "operator", random: () => 0.37 });

test("kills are spaced out so the rescue can finish", () => {
  const a = make();
  const spy = a.entities.find((e) => e.team === 1);
  assert.equal(a.privateFor(spy).killReadyAt, PROTOCOL_RULES.firstKill);
  assert.ok(PROTOCOL_RULES.firstKill >= 45 && PROTOCOL_RULES.killCooldown >= 35);
  assert.equal(a.protocol.mission.manifest.reduce((n, i) => n + i.required, 0), 9);
});

test("each quarter of the manifest loaded locks the infiltrators down", () => {
  const a = make();
  a.time = 100;
  const spy = a.entities.find((e) => e.team === 1);
  a.privateFor(spy).killReadyAt = 0;
  const first = a.protocol.mission.manifest[0];
  first.loaded = 3;
  a.checkLockdown();
  assert.equal(a.protocol.lockdowns, 1);
  assert.equal(a.privateFor(spy).killReadyAt, 100 + PROTOCOL_RULES.lockdown);
  a.time = 200;
  a.checkLockdown();
  assert.equal(a.protocol.lockdowns, 1, "the same quarter never locks twice");
});

test("nobody can be eliminated aboard the medevac", () => {
  const a = make();
  const spy = a.entities.find((e) => e.team === 1),
    target = a.entities.find((e) => e.team === 0);
  a.time = 300;
  a.privateFor(spy).killReadyAt = 0;
  a.protocol.mission.phase = "transport";
  Object.assign(spy, { x: 5.5, y: 5.5 });
  Object.assign(target, { x: 5.5, y: 6.2 });
  a.eliminate(spy, target.id);
  assert.equal(target.hp, 100);
});

test("operator bots head for take-off as soon as everything is loaded", () => {
  const a = make();
  for (const item of a.protocol.mission.manifest) item.loaded = item.required;
  a.protocol.bombs.push({ id: "charge-x", siteId: "s", room: "r", x: 1, y: 1 });
  a.protocol.detonateAt = 500;
  const bot = a.entities.find((e) => e.bot && e.team === 0);
  a.privateFor(bot).botNextThink = 0;
  a.advance(0.1, {});
  assert.deepEqual(
    [a.privateFor(bot).botGoal?.x, a.privateFor(bot).botGoal?.y],
    [a.protocol.mission.loading.x, a.protocol.mission.loading.y],
  );
});
