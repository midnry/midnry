import test from "node:test";
import assert from "node:assert/strict";
import { Arena } from "../public/games/outpost-sim.js";
import { battleIntensity } from "../public/games/outpost-music.js";

test("battle music builds with the round: calm, closing in, fighting for it", () => {
  const a = new Arena({
    mode: "signal",
    mapId: "skyport",
    humans: [{ id: "player", team: 0 }],
    random: () => 0.5,
  });
  const g = { arena: a, player: a.entities.find((e) => e.id === "player") };
  a.time = 5;
  assert.equal(battleIntensity(g), 0, "early round is calm");
  a.time = a.disaster.warnAt + 1;
  assert.equal(battleIntensity(g), 1, "a disaster warning raises it");
  a.time = a.disaster.startAt + 1;
  assert.equal(battleIntensity(g), 2, "a disaster in progress is a fight");
  a.time = 5;
  for (const e of a.entities.slice(1, 4)) e.hp = 0;
  assert.equal(battleIntensity(g), 1, "five left: closing in");
  for (const e of a.entities.slice(4, 6)) e.hp = 0;
  assert.equal(battleIntensity(g), 2, "final three");
  for (const e of a.entities) e.hp = e.maxHp;
  g.player.lives = 0;
  assert.equal(battleIntensity(g), 2, "your last life");
});
