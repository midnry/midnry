import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, PLAYER_COLORS, protocolView } from "../public/games/outpost-protocol.js";

test("every seat has its own colour and its own shape, and players can see both", () => {
  assert.equal(new Set(PLAYER_COLORS.map((c) => c.mark)).size, PLAYER_COLORS.length);
  const a = new ProtocolArena({ humans: [{ id: "me", name: "Me" }], random: () => 0.3 });
  const view = protocolView(a.snapshot(), "me");
  assert.equal(new Set(view.entities.map((e) => e.mark)).size, 8);
  for (const e of view.entities) {
    const seat = PLAYER_COLORS.find((c) => c.hex === e.color);
    assert.equal(e.mark, seat.mark);
    assert.equal(e.colorName, seat.name);
  }
});
