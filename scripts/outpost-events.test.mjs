import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { EVENT_KINDS, nextEvent } from "../public/games/outpost-events.js";
import { sightRange } from "../public/games/outpost-variety.js";

const make = (variety = true) =>
  new ProtocolArena({ humans: [{ id: "me", name: "Me" }], rolePreference: "operator", variety, random: () => 0.29 });
const force = (a, kind) => {
  const p = a.protocol;
  p.events.push({ id: `event-test-${kind}`, kind, active: true, startedAt: a.time, until: a.time + EVENT_KINDS[kind].duration, x: 12.5, y: 15.5, room: "Atrium" });
  if (kind === "sandstorm") p.sandstormUntil = a.time + EVENT_KINDS[kind].duration;
  return p.events.at(-1);
};

test("events only run with variety on, and never repeat back to back", () => {
  assert.equal(make(false).protocol.nextEventAt, Infinity);
  const a = make();
  assert.ok(a.protocol.nextEventAt >= 80 && a.protocol.nextEventAt <= 110);
  a.time = a.protocol.nextEventAt + 0.1;
  a.updateEvents();
  assert.equal(a.protocol.events.length, 1);
  assert.ok(a.protocol.nextEventAt > a.time + 70);
  let seq = 0.1;
  const random = () => (seq = (seq * 7.3 + 0.17) % 1);
  let last = null;
  for (let i = 0; i < 40; i++) {
    const { kind } = nextEvent(random, last);
    assert.notEqual(kind, last);
    last = kind;
  }
});

test("putting out a fire saves the stores; letting it burn hurts every patient", () => {
  const a = make(),
    me = a.entities.find((e) => e.id === "me"),
    patients = a.protocol.mission.patients;
  const before = patients.map((p) => p.hp);
  const fire = force(a, "fire");
  a.resolveEvent(me, fire.id);
  assert.equal(fire.outcome, "handled");
  assert.deepEqual(patients.map((p) => p.hp), before);
  const fire2 = force(a, "fire");
  a.time = fire2.until + 1;
  a.updateEvents();
  assert.equal(fire2.outcome, "expired");
  patients.forEach((p, i) => assert.ok(p.hp <= before[i] - 8 || p.hp === 1));
});

test("the screen shows where to handle an event and the sandstorm cuts sight", () => {
  const a = make(),
    me = a.entities.find((e) => e.id === "me");
  const drop = force(a, "drop");
  Object.assign(me, { x: drop.x + 0.4, y: drop.y });
  assert.equal(a.context(me)?.kind, "event");
  const view = protocolView(a.snapshot(), "me");
  assert.deepEqual(Object.keys(view.protocol.events[0]).sort(), ["id", "kind", "room", "until", "x", "y"]);
  force(a, "sandstorm");
  assert.ok(sightRange(a.protocol, a.time) <= 4);
  a.time += 41;
  assert.ok(sightRange(a.protocol, a.time) > 4);
});
