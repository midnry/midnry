import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { SPECIALTIES } from "../public/games/outpost-specialties.js";

const make = () => new ProtocolArena({ humans: [{ id: "me", name: "Me" }], rolePreference: "operator", random: () => 0.29 });
const give = (a, e, id) => Object.assign(a.privateFor(e), { specialty: id, abilityUses: Number.isFinite(SPECIALTIES[id].uses) ? SPECIALTIES[id].uses : 99, abilityReadyAt: 0 });

test("every player gets a specialty that fits their side, and sees only their own", () => {
  const a = make();
  for (const e of a.entities) assert.equal(SPECIALTIES[a.privateFor(e).specialty].team, e.team);
  const crew = a.entities.filter((e) => e.team === 0).map((e) => a.privateFor(e).specialty);
  for (const id of ["medic", "engineer", "security"]) assert.ok(crew.includes(id));
  const view = protocolView(a.snapshot(), "me");
  assert.equal(view.protocol.self.specialty.id, a.privateFor(a.entities.find((e) => e.id === "me")).specialty);
  assert.equal(JSON.stringify(view).includes('"forger"') && a.privateFor(a.entities.find((e) => e.id === "me")).specialty !== "forger", false);
});

test("medic examines a body, security checks the camera, engineer hears where sabotage came from", () => {
  const a = make(),
    me = a.entities.find((e) => e.id === "me"),
    killer = a.entities.find((e) => e.team === 1),
    victim = a.entities.find((e) => e.team === 0 && e !== me);
  a.time = 30;
  for (const e of a.entities) Object.assign(e, { x: 25.5, y: 26.5 });
  Object.assign(victim, { x: 4.5, y: 4.5 });
  Object.assign(killer, { x: 5.2, y: 4.5 });
  a.privateFor(killer).killReadyAt = 0;
  a.eliminate(killer, victim.id);
  a.time = 52;
  give(a, me, "medic");
  Object.assign(me, { x: 4.5, y: 5.4 });
  assert.equal(a.useAbility(me), true);
  assert.match(a.privateFor(me).clues.at(-1).text, /died about 20 seconds/);
  give(a, me, "security");
  assert.equal(a.useAbility(me), true);
  assert.match(a.privateFor(me).clues.at(-1).text, /^Camera, /);
  assert.equal(a.useAbility(me), false, "cooldown");
  give(a, me, "engineer");
  a.privateFor(killer).sabotageReadyAt = 0;
  a.action(killer, { seq: 1, op: "sabotage", target: "power" });
  assert.match(a.privateFor(me).clues.at(-1).text, /^Engineer alert: the power was cut from /);
});

test("a forger frames two operators once; a ghost leaves no footprints", () => {
  const a = make(),
    me = a.entities.find((e) => e.id === "me"),
    spy = a.entities.find((e) => e.team === 1);
  a.time = 70;
  give(a, spy, "forger");
  assert.equal(a.useAbility(spy), true);
  const fake = a.privateFor(me).clues.find((c) => c.kind === "smudge");
  assert.ok(fake && !fake.text.includes(spy.colorName));
  assert.equal(a.useAbility(spy), false, "one use");
  give(a, spy, "ghost");
  const victim = a.entities.find((e) => e.team === 0 && e !== me);
  Object.assign(victim, { x: 4.5, y: 4.5 });
  Object.assign(spy, { x: 5.2, y: 4.5 });
  a.privateFor(spy).killReadyAt = 0;
  a.eliminate(spy, victim.id);
  spy.x += 1;
  a.updateClues();
  assert.equal(a.protocol.bodies.at(-1).trail.length, 1);
});
