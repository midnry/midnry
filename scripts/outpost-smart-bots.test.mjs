import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena } from "../public/games/outpost-protocol.js";
import { PROTOCOL_MAP } from "../public/games/outpost-protocol-map.js";
import { chooseSuspect, crewInDanger, hiddenInfiltrators, nearBody } from "../public/games/outpost-protocol-ai.js";

const people = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({ id, name: id.toUpperCase() + "ay", hp: 100 }));
const ctx = (over = {}) => ({
  self: { id: "a" },
  player: { role: "operator", observations: [], caseEvidence: [], contacts: [] },
  allies: [],
  time: 100,
  room: "Armory",
  entities: people.map((p) => ({ ...p })),
  meeting: { id: "m1", votes: {}, messages: [] },
  infiltratorCount: 2,
  revealed: {},
  ...over,
});

test("hidden infiltrator count uses only exposed roles; danger when one loss could hand over the base", () => {
  assert.equal(hiddenInfiltrators(ctx({ revealed: { b: "infiltrator", c: "operator" } })), 1);
  assert.equal(crewInDanger(ctx()), false);
  const few = ctx({ entities: people.map((p, i) => ({ ...p, hp: i < 5 ? 100 : 0 })) });
  assert.equal(crewInDanger(few), true);
});

test("a bot that saw someone in the body's room says so, and others weigh the sighting", () => {
  const witness = ctx({
    reportedBody: { name: "Hay", room: "Hangar" },
    player: { role: "operator", contacts: [{ id: "c", at: 80, room: "Hangar" }] },
  });
  const line = nearBody(witness);
  assert.match(line, /I saw Cay near the body/);
  // Its own sighting plus one other voice is enough to vote.
  const listener = ctx({
    reportedBody: { name: "Hay", room: "Hangar" },
    player: { role: "operator", contacts: [{ id: "c", at: 90, room: "Hangar" }] },
    meeting: { id: "m1", votes: {}, messages: [{ id: 1, sender: "d", text: line }] },
  });
  assert.equal(chooseSuspect(listener), "c");
  // Seen elsewhere with this bot just now: an alibi, so a lone rumour is not enough.
  const alibi = ctx({
    reportedBody: { name: "Hay", room: "Hangar" },
    player: { role: "operator", contacts: [{ id: "c", at: 95, room: "Armory" }] },
    meeting: { id: "m1", votes: {}, messages: [{ id: 1, sender: "d", text: line }] },
  });
  assert.equal(chooseSuspect(alibi), "skip");
});

test("a weak lead is skipped normally but acted on when the crew is in danger", () => {
  const lead = { meeting: { id: "m1", votes: { d: "c" }, messages: [{ id: 1, sender: "e", text: "I saw Cay near the body, suspicious: in Hangar 3 seconds before the report." }] } };
  assert.equal(chooseSuspect(ctx(lead)), "skip");
  const few = people.map((p, i) => ({ ...p, hp: i < 5 ? 100 : 0 }));
  assert.equal(chooseSuspect(ctx({ ...lead, entities: few })), "c");
});

test("infiltrator bots pile onto the crew's favourite target and never vote for a partner", () => {
  const inf = { role: "infiltrator", observations: [], caseEvidence: [], contacts: [] };
  assert.equal(chooseSuspect(ctx({ player: inf, allies: ["b"], meeting: { id: "m", messages: [], votes: { c: "d", e: "d", f: "b" } } })), "d");
  assert.equal(chooseSuspect(ctx({ player: inf, allies: ["b"], meeting: { id: "m", messages: [], votes: { c: "b" } } })), "skip");
});

const arena = () =>
  new ProtocolArena({ humans: [{ id: "p0", name: "Me" }], rolePreference: "operator", random: () => 0.4 });

test("operator bots sweep the public access covers once a charge is announced", () => {
  const a = arena();
  // One designated operator bot sweeps; the rest keep moving supplies.
  const [op, other] = a.entities.filter((e) => e.bot && e.team === 0);
  assert.equal(a.botSearchCover(op), null);
  a.protocol.bombs.push({ id: "charge-x", siteId: "s", room: "r", x: 1, y: 1 });
  const cover = a.botSearchCover(op);
  assert.ok(PROTOCOL_MAP.sites.some((s) => s.id === cover.id));
  // Nearby covers count as checked; the bot moves on to another one.
  Object.assign(op, { x: cover.x, y: cover.y });
  assert.notEqual(a.botSearchCover(op).id, cover.id);
  assert.equal(a.botSearchCover(other), null);
});

test("an infiltrator bot takes a witnessed kill only when it wins the match", () => {
  const a = arena();
  const ops = a.entities.filter((e) => e.team === 0);
  assert.equal(a.finishingKill(), false);
  for (const e of ops.slice(0, 3)) e.hp = 0;
  assert.equal(a.finishingKill(), true);
});

test("an infiltrator bot with a ready attack stalks an operator it saw alone", () => {
  const a = arena();
  const inf = a.entities.find((e) => e.team === 1 && e.bot);
  const player = a.privateFor(inf);
  a.time = 40;
  player.killReadyAt = 0;
  const lone = a.entities.find((e) => e.team === 0);
  for (const e of a.entities) if (e !== inf && e !== lone) Object.assign(e, { x: 30, y: 30 });
  Object.assign(inf, { x: 3.5, y: 5.5 });
  Object.assign(lone, { x: 5.5, y: 5.5 });
  player.contacts = [{ id: lone.id, at: 35, room: "x" }];
  assert.equal(a.botPrey(inf)?.id, lone.id);
  player.killReadyAt = 99;
  assert.equal(a.botPrey(inf), null);
});
