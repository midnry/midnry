import test from "node:test";
import assert from "node:assert/strict";
import { Arena, DIFFICULTIES } from "../public/games/outpost-sim.js";
import {
  awardMatch,
  profileOf,
  outfitUnlocked,
  OUTFIT_ORDER,
} from "../public/games/outpost-progression.js";
import { OUTFITS } from "../public/games/outpost-content.js";
const result = {
  id: "round-one",
  won: false,
  seconds: 30,
  weapon: "carbine",
  kills: 2,
  damage: 150,
  cores: 2,
};

test("XP counts completed combat and ignores repeated, practice and short-loss rounds", () => {
  const first = awardMatch({}, result);
  assert.equal(first.xp, 73);
  assert.equal(first.profile.matches, 1);
  assert.equal(awardMatch(first.profile, result).xp, 0);
  assert.equal(awardMatch({}, { ...result, practice: true }).xp, 0);
  assert.equal(awardMatch({}, { ...result, seconds: 14 }).xp, 0);
  assert.equal(awardMatch({}, { ...result, seconds: 1, won: true }).xp, 113);
});
test("cosmetic challenges award once and locked finishes cannot be selected", () => {
  let p = {};
  for (let i = 0; i < 3; i++)
    p = awardMatch(p, {
      ...result,
      id: `round-${i}`,
      weapon: ["carbine", "rocket", "scatter"][i],
    }).profile;
  // Retired loadout modes no longer award "explorer"; playing both sides does.
  assert.equal(p.xp, 269);
  assert.deepEqual(p.milestones, ["first-three"]);
  assert.equal(awardMatch(p, { ...result, id: "four" }).xp, 73);
  assert.equal(profileOf({ ...p, skin: "glacier" }).skin, "standard");
  assert.equal(profileOf({ ...p, skin: "copper" }).skin, "copper");
  assert.equal(profileOf(null).xp, 0);
});
test("playing both sides earns explorer; outfits unlock one per level", () => {
  const mission = { mode: "protocol", won: true, seconds: 300, contributions: {} };
  let p = awardMatch({}, { ...mission, id: "op", role: "operator" }).profile;
  assert.ok(!p.milestones.includes("explorer"));
  p = awardMatch(p, { ...mission, id: "op2", role: "operator" }).profile;
  assert.ok(!p.milestones.includes("explorer"));
  p = awardMatch(p, { ...mission, id: "inf", role: "infiltrator" }).profile;
  assert.ok(p.milestones.includes("explorer"));
  assert.deepEqual(profileOf(p).roles.sort(), ["infiltrator", "operator"]);
  assert.ok(outfitUnlocked({ xp: 0 }, "ranger"));
  assert.ok(!outfitUnlocked({ xp: 0 }, "medic"));
  assert.ok(outfitUnlocked({ xp: 150 }, "medic"));
  assert.ok(!outfitUnlocked({ xp: 1349 }, "shadow"));
  assert.ok(outfitUnlocked({ xp: 1350 }, "shadow"));
  assert.ok(!outfitUnlocked({ xp: 99999 }, "not-an-outfit"));
  assert.equal(OUTFIT_ORDER.length, new Set(OUTFIT_ORDER).size);
  assert.deepEqual([...OUTFIT_ORDER].sort(), Object.keys(OUTFITS).sort());
});
test("actual combat damage excludes crates, overkill and teammates", () => {
  const a = new Arena({ mode: "duo" }),
    p = a.entities[0];
  a.damage(a.crates[0], 999, p);
  a.damage(
    a.entities.find((e) => e.id !== p.id && e.team === p.team),
    999,
    p,
  );
  assert.equal(p.damageDealt, 0);
  a.damage(
    a.entities.find((e) => e.team !== p.team),
    999,
    p,
  );
  assert.equal(p.damageDealt, 100);
  a.damage(p, 999, p);
  assert.equal(p.kills, 1);
  assert.equal(p.damageDealt, 100);
});
test("cumulative cores survive death while match upgrades reset", () => {
  const a = new Arena({ mode: "duo" }),
    p = a.entities[0];
  a.cores.push({ x: p.x, y: p.y });
  a.collectCores(p);
  assert.equal(p.coresCollected, 1);
  a.damage(p, 999);
  a.time = 8;
  a.respawn(p);
  assert.equal(p.cores, 0);
  assert.equal(p.coresCollected, 1);
});
test("Duo ranks wiped teams and credits a dead winning partner", () => {
  const a = new Arena({ mode: "duo" });
  for (const t of [3, 2, 1]) {
    for (const e of a.entities.filter((e) => e.team === t)) a.damage(e, 999);
    if (t === 1) a.damage(a.entities[0], 999);
    a.checkResult();
    assert.ok(a.entities.filter((e) => e.team === t).every((e) => e.placement === t + 1));
  }
  assert.equal(a.winner, 0);
  assert.ok(a.entities.filter((e) => e.team === 0).every((e) => e.placement === 1));
});
test("rematch countdown blocks combat and timers; snapshots retain round identity", () => {
  const a = new Arena({ mode: "signal", difficulty: "hard", countdown: 2 }),
    p = a.entities[0];
  const before = a.snapshot();
  p.charge = 100;
  assert.equal(a.shoot(p), false);
  assert.equal(a.super(p), false);
  assert.equal(a.reload(p), false);
  a.advance(1, { [p.id]: { forward: 1, fire: true } });
  assert.equal(a.time, 0);
  assert.equal(p.x, before.entities[0].x);
  assert.equal(p.ammo, before.entities[0].ammo);
  const restored = Arena.restore(a.snapshot());
  assert.equal(restored.countdown, 1);
  assert.equal(restored.difficulty, "hard");
  assert.equal(restored.roundId, a.roundId);
  restored.advance(1);
  restored.advance(0.05);
  assert.equal(restored.time, 0.05);
  assert.notEqual(new Arena().roundId, a.roundId);
});
test("difficulty changes AI movement and reaction, not health or damage", () => {
  const distances = [],
    delays = [];
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const a = new Arena({ difficulty, random: () => 0.5 }),
      p = a.entities[0],
      bot = a.entities[1];
    p.x = 8.5;
    p.y = 8.5;
    bot.x = 8.5;
    bot.y = 5.5;
    bot.weapon = "carbine";
    bot.attack = 0;
    a.time = 1;
    a.visible = () => true;
    a.move = (e, dx, dy) => {
      distances.push(Math.hypot(dx, dy));
    };
    a.updateRival(bot, 0.1);
    delays.push(bot.attack - a.time);
    assert.equal(bot.maxHp, 120);
    assert.equal(bot.damage, 16);
  }
  assert.ok(distances[0] < distances[1] && distances[1] < distances[2]);
  assert.ok(delays[0] > delays[1] && delays[1] > delays[2]);
});
