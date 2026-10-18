import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { suspectScores, nextStatement, roamLine } from "../public/games/outpost-protocol-ai.js";

const people = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() + "ay", hp: 100 }));
const ctx = (over = {}) => ({
  self: { id: "a" },
  player: { role: "operator", observations: [], caseEvidence: [], contacts: [], botDialogue: { opened: true, sent: 1, replied: [] } },
  allies: [],
  time: 100,
  room: "Armory",
  entities: people.map((p) => ({ ...p })),
  meeting: { id: "m1", votes: {}, messages: [] },
  rooms: ["Armory", "Hangar"],
  ...over,
});

test("bots fill the radio during play, and nothing gets through jammed comms", () => {
  const a = new ProtocolArena({ humans: [{ id: "me", name: "Me" }], random: () => 0.37 });
  for (let i = 0; i < 400; i++) a.advance(0.1, {});
  const view = protocolView(a.snapshot(), "me");
  assert.ok(view.protocol.chatter.length >= 1, "someone spoke");
  assert.ok(view.protocol.chatter.every((c) => typeof c.text === "string" && c.text.length > 3));
  const before = a.protocol.chatter.length;
  a.protocol.sabotage.commsUntil = a.time + 100;
  a.radio(a.entities[1], "hello");
  assert.equal(a.protocol.chatter.length, before);
});

test("a bot calls out a human who keeps following it", () => {
  const a = new ProtocolArena({ humans: [{ id: "me", name: "Shadow" }], random: () => 0.37 });
  const bot = a.entities.find((e) => e.bot);
  a.privateFor(bot).shadowedBy = { me: 13 };
  a.protocol.nextChatterAt = 0;
  a.time = 30;
  a.botChatter();
  assert.match(a.protocol.chatter.at(-1).text, /Shadow, why are you following me\?/);
});

test("a vouch lowers suspicion; a plain question gets an alibi, not a denial", () => {
  const base = { messages: [{ id: 1, sender: "d", text: "I suspect Bay. Bay, where were you?" }], votes: {}, id: "m" };
  const accused = suspectScores(ctx({ meeting: base })).get("b");
  const vouched = suspectScores(ctx({ meeting: { ...base, messages: [...base.messages, { id: 2, sender: "c", text: "Bay was with me. Bay is clear." }] } })).get("b");
  assert.ok(vouched < accused);
  const reply = nextStatement(ctx({ self: { id: "b" }, meeting: { id: "m", votes: {}, messages: [{ id: 3, sender: "a", text: "Bay, where were you?" }] } }));
  assert.match(reply.text, /^I was in /);
  assert.equal(reply.replyTo, 3);
});

test("radio lines fit the moment", () => {
  assert.match(roamLine(ctx({ sabotage: "power", firstPowerCall: true }), () => 0.1), /Power|Lights/);
  assert.match(roamLine(ctx({ patientsCritical: true }), () => 0.1), /patients|losing/i);
  const sighting = roamLine(ctx({ player: { role: "operator", contacts: [{ id: "c", at: 95, room: "Hangar" }] } }), () => 0.5);
  assert.match(sighting, /Cay just went through Hangar/);
});
