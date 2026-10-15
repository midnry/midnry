import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { shareSummary, headline, whatsappUrl } from "../public/games/outpost-share.js";

test("the brag fits the player's side of the round", () => {
  assert.match(headline({ won: true, role: "operator", correctVotes: 1 }), /caught the infiltrator/);
  assert.match(headline({ won: true, role: "infiltrator", kills: 3 }), /fooled everyone.*took down 3/);
  assert.match(headline({ won: false, role: "operator" }), /got us this time/);
  assert.match(headline({ won: false, role: "infiltrator" }), /caught me/);
});

test("the card is built from the player's own results, and only after the round", () => {
  const a = new ProtocolArena({ humans: [{ id: "me", name: "Eunice" }], rolePreference: "operator", random: () => 0.3 });
  a.privateFor(a.entities[0]).correctVotes = 2;
  a.finish(0, "Every infiltrator has been stopped. The rescue is safe.");
  const card = shareSummary(protocolView(a.snapshot(), "me"), "me");
  assert.equal(card.won, true);
  assert.equal(card.role, "operator");
  assert.equal(card.name, "Eunice");
  assert.equal(card.mark, a.entities.find((e) => e.id === "me").mark);
  assert.match(card.headline, /with 2 votes/);
  assert.deepEqual(card.stats[0], ["Infiltrator votes", 2]);
  assert.match(card.text, /https:\/\/www\.midnry\.com\/games\/outpost-zero$/);
  assert.match(whatsappUrl(card), /^https:\/\/wa\.me\/\?text=/);
});
