import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView, restoreArena } from "../public/games/outpost-protocol.js";
import { rememberObservation, accusationTargets } from "../public/games/outpost-protocol-ai.js";
const names = ["Mercer", "Hale", "Voss", "Sato", "Quinn", "Rook", "Mara", "Ash"];
const fresh = () =>
  new ProtocolArena({
    humans: names.map((name, i) => ({ id: "p" + i, name })),
    rolePreference: "operator",
    random: () => 0.4,
  });
const tick = (a, n) => {
  for (let t = 0; t < n - 1e-8; t += 0.05) a.advance(0.05);
};
const send = (a, e, op, target, value) =>
  a.action(e, { seq: a.privateFor(e).actionSeq + 1, op, target, value });
const event = (kind, id, at = 0) => ({
  kind,
  actorId: id,
  subjectId: null,
  at,
  room: "Operations",
});
function scene() {
  const a = fresh(),
    killer = a.entities.find((e) => e.team === 1),
    victim = a.entities.find((e) => e.team === 0),
    witness = a.entities.find((e) => e.team === 0 && e !== victim);
  a.time = 20;
  Object.assign(killer, { x: 3.5, y: 5.5 });
  Object.assign(victim, { x: 3.5, y: 6.5 });
  Object.assign(witness, { x: 4.5, y: 5.5 });
  a.privateFor(killer).killReadyAt = 0;
  a.eliminate(killer, victim.id);
  return { a, killer, victim, witness };
}
test("witnessed kills survive task spam and delayed reports; attack testimony names the victim", () => {
  const { a, killer, victim, witness } = scene(),
    p = a.privateFor(witness);
  assert.ok(p.caseEvidence.some((e) => e.kind === "eliminate"));
  for (let i = 0; i < 60; i++) rememberObservation(p, event("task", killer.id, a.time + i));
  rememberObservation(
    p,
    event("vent", a.entities.find((e) => e !== killer && e !== witness && e.hp > 0).id, 200),
  );
  a.time = 220;
  assert.equal(a.suspicion(witness), killer.id);
  witness.bot = true;
  a.startMeeting(witness, "Body reported", a.protocol.bodies[0]);
  tick(a, 4);
  const text = a.protocol.meeting.messages.find((m) => m.sender === witness.id)?.text;
  assert.ok(text.includes(killer.name));
  assert.ok(text.includes(victim.name));
  assert.match(text, /attack a patrol/);
  assert.equal(
    a.suspicion(witness),
    killer.id,
    "doing routine work cannot clear a witnessed killer",
  );
});
test("unseen attacks and private roles never become bot evidence or recipient data", () => {
  const { a, killer } = scene(),
    blind = a.entities.find(
      (e) => e.hp > 0 && e.team === 0 && a.privateFor(e).caseEvidence.length === 0,
    );
  assert.ok(blind);
  assert.equal(a.suspicion(blind), "skip");
  a.startMeeting(blind, "Body reported: " + a.protocol.bodies[0].name, a.protocol.bodies[0]);
  assert.equal(a.botMeetingContext(blind).reportedBody.killerId, undefined);
  const ctx = a.botMeetingContext(blind);
  assert.ok(ctx.entities.every((e) => !Object.hasOwn(e, "team") && !Object.hasOwn(e, "role")));
  const view = protocolView(a.snapshot(), blind.id);
  assert.equal(view.protocol.players, undefined);
  assert.equal(view.protocol.self.caseEvidence, undefined);
  assert.equal(view.protocol.self.contacts, undefined);
  assert.equal(view.protocol.self.botDialogue, undefined);
  assert.equal(a.suspicion(blind), "skip");
});
test("corroborated public witness claims influence votes; repeated rumours from one speaker do not", () => {
  const a = fresh(),
    listener = a.entities[0],
    target = a.entities.find((e) => e !== listener && e.hp > 0),
    speakers = a.entities.filter((e) => e !== listener && e !== target).slice(0, 2);
  a.startMeeting(listener, "Radio assembly");
  const m = a.protocol.meeting;
  m.messages.push({
    id: 1,
    sender: speakers[0].id,
    name: speakers[0].name,
    text: `I saw ${target.name} attack a patrol in Operations.`,
  });
  assert.equal(a.suspicion(listener), "skip");
  m.messages.push({ ...m.messages[0], id: 2 });
  assert.equal(a.suspicion(listener), "skip");
  m.messages.push({
    id: 3,
    sender: speakers[1].id,
    name: speakers[1].name,
    text: `I saw ${target.name} attack a patrol in Operations.`,
  });
  assert.equal(a.suspicion(listener), target.id);
});
test("infiltrators give cover stories, answer accusations and protect their known partner", () => {
  const a = fresh(),
    impostor = a.entities.find((e) => e.team === 1),
    caller = a.entities.find((e) => e.team === 0);
  for (const p of a.protocol.mission.patients) p.decay = 0;
  a.time = 20;
  impostor.bot = true;
  a.startMeeting(caller, "Radio assembly");
  tick(a, 9);
  const opening = a.protocol.meeting.messages.find((m) => m.sender === impostor.id);
  assert.ok(opening);
  send(
    a,
    caller,
    "chat",
    undefined,
    `${impostor.name}, I saw you attack a patrol. Explain your alibi.`,
  );
  const accusation = a.protocol.meeting.messages.at(-1);
  tick(a, 4);
  const responses = a.protocol.meeting.messages.filter((m) => m.sender === impostor.id);
  assert.ok(responses.length >= 2);
  assert.ok(
    responses.some((m) => /accusation is wrong|not what happened|did not attack/i.test(m.text)),
  );
  assert.ok(a.privateFor(impostor).botDialogue.replied.includes(accusation.id));
  assert.ok(responses.length <= 3, "conversation budget keeps radio readable");
  const partner = a.entities.find((e) => e.team === 1 && e !== impostor);
  assert.ok(responses.every((m) => !m.text.includes(partner.name)));
  const restored = restoreArena(JSON.parse(JSON.stringify(a.snapshot())));
  tick(a, 2);
  tick(restored, 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(restored.snapshot())),
    JSON.parse(JSON.stringify(a.snapshot())),
  );
});
test("working radios call meetings anywhere; jamming, cooldowns, deaths and wired fallback are validated", () => {
  const a = fresh(),
    caller = a.entities[0];
  Object.assign(caller, { x: 14.5, y: 14.5 });
  send(a, caller, "meeting");
  assert.equal(a.protocol.phase, "discussion");
  assert.equal(a.privateFor(caller).emergenciesLeft, 0);
  const b = fresh(),
    c = b.entities[0];
  Object.assign(c, { x: 14.5, y: 14.5 });
  b.protocol.sabotage.commsUntil = 40;
  send(b, c, "meeting");
  assert.equal(b.protocol.phase, "roam");
  assert.equal(b.privateFor(c).emergenciesLeft, 1);
  Object.assign(c, { x: b.protocol.emergency.x, y: b.protocol.emergency.y });
  send(b, c, "meeting");
  assert.equal(b.protocol.phase, "discussion");
  const d = fresh(),
    dead = d.entities[0];
  dead.hp = 0;
  send(d, dead, "meeting");
  assert.equal(d.protocol.phase, "roam");
  const cooling = fresh(),
    e = cooling.entities[0];
  cooling.protocol.emergencyReadyAt = 20;
  send(cooling, e, "meeting");
  assert.equal(cooling.protocol.phase, "roam");
});

test("accusations identify the named suspect rather than the victim or a reply's addressee", () => {
  const entities = fresh().entities;
  for (const text of ["I saw Hale attack Voss.", "Hale is the impostor.", "Vote for Hale."])
    assert.deepEqual(accusationTargets(text, entities), ["p1"]);
  assert.deepEqual(
    accusationTargets("Hale, that is not what happened. Ask Sato where they were.", entities),
    ["p3"],
  );
  const ambiguous = [...entities, { id: "duplicate", name: "Hale", hp: 100 }];
  assert.deepEqual(accusationTargets("Hale is the killer.", ambiguous), []);
});

test("bots retain their discussion budget when public radio history is full", () => {
  const a = fresh(),
    bot = a.entities[1],
    caller = a.entities[0];
  a.startMeeting(caller, "Emergency assembly");
  const meeting = a.protocol.meeting;
  for (let i = 0; i < 48; i++)
    meeting.messages.push({
      id: a.protocol.nextId++,
      sender: caller.id,
      name: caller.name,
      text: `${bot.name}, explain your alibi.`,
    });
  bot.bot = true;
  tick(a, 12);
  assert.equal(a.privateFor(bot).botDialogue.sent, 4);
  assert.equal(meeting.messages.filter((m) => m.sender === bot.id).length, 4);
  assert.equal(meeting.messages.length, 48);
});
