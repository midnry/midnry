import test from "node:test";
import assert from "node:assert/strict";
import { Arena, WEAPONS, OUTFITS, outfitOf } from "../public/games/outpost-sim.js";
const randomGenerator = () => {
  let seed = 23791;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
};
test("all outfits are available, distinct, cosmetic and retained in snapshots and respawns", () => {
  assert.ok(Object.keys(OUTFITS).length >= 10);
  assert.equal(
    new Set(Object.values(OUTFITS).map((o) => o.gear)).size,
    Object.keys(OUTFITS).length,
  );
  for (const id of Object.keys(OUTFITS)) {
    const arena = new Arena({ mode: "duo", outfit: id, random: () => 0.5 }),
      p = arena.entities[0];
    assert.equal(p.outfit, id);
    assert.equal(p.maxHp, 100);
    assert.equal(p.damage, 40);
    const copy = Arena.restore(JSON.parse(JSON.stringify(arena.snapshot())));
    assert.equal(copy.entities[0].outfit, id);
    arena.damage(p, 1000);
    arena.time = 8;
    arena.respawn(p);
    assert.equal(p.outfit, id);
    assert.equal(p.hp, 100);
  }
  assert.equal(outfitOf("__proto__").id, "ranger");
  assert.equal(new Arena({ outfit: "invalid" }).entities[0].outfit, "ranger");
});
test("AI draw distinct weapons and uniforms from the full pools in every game mode", () => {
  for (const mode of ["training", "signal", "duo"]) {
    const weapons = new Set(),
      outfits = new Set(),
      random = randomGenerator();
    for (let match = 0; match < 30; match++) {
      const arena = new Arena({ mode, random }),
        bots = arena.entities.filter((e) => e.bot);
      assert.equal(new Set(bots.map((e) => e.weapon)).size, bots.length);
      assert.equal(new Set(bots.map((e) => e.outfit)).size, bots.length);
      for (const bot of bots) {
        weapons.add(bot.weapon);
        outfits.add(bot.outfit);
        assert.equal(bot.ammo, WEAPONS[bot.weapon].mag);
      }
    }
    assert.equal(weapons.size, Object.keys(WEAPONS).length);
    assert.equal(outfits.size, Object.keys(OUTFITS).length);
  }
});
test("online human uniforms override bot choices and older snapshots get a safe default", () => {
  const a = new Arena({
    mode: "duo",
    humans: [
      { id: "a", team: 0, weapon: "rocket", outfit: "hazard" },
      { id: "b", team: 0, weapon: "veil", outfit: "medic" },
    ],
  });
  const restored = Arena.restore(JSON.parse(JSON.stringify(a.snapshot())));
  assert.deepEqual(
    restored.entities.slice(0, 2).map((e) => [e.weapon, e.outfit]),
    [
      ["rocket", "hazard"],
      ["veil", "medic"],
    ],
  );
  const old = a.snapshot();
  old.entities.forEach((e) => delete e.outfit);
  assert.ok(Arena.restore(old).entities.every((e) => e.outfit === "ranger"));
});
test("training AI fire their equipped weapons, consuming ammunition and reloading", () => {
  for (const id of Object.keys(WEAPONS)) {
    const arena = new Arena({ mode: "training", random: () => 0.5 }),
      p = arena.entities[0],
      bot = arena.entities[1];
    arena.entities = [p, bot];
    p.x = 8.5;
    p.y = 8.5;
    bot.x = 7.5;
    bot.y = 8.5;
    bot.weapon = id;
    bot.ammo = WEAPONS[id].mag;
    bot.attack = 0;
    arena.time = 3;
    arena.visible = () => true;
    arena.updateRival(bot, 0.1);
    assert.equal(bot.ammo, WEAPONS[id].mag - 1, id);
    assert.equal(bot.shotAt, 3, id);
    bot.burst = null;
    bot.ammo = 0;
    bot.shotAt = -10;
    bot.attack = 0;
    arena.updateRival(bot, 0.1);
    assert.equal(bot.reloadUntil, 4.4, id);
  }
});
