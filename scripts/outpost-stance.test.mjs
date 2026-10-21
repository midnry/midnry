import test from "node:test";
import assert from "node:assert/strict";
import { Arena } from "../public/games/outpost-sim.js";
import { ADS, JUMP, PRONE_SETTLE, STANCE, pitchTo, verticalHit } from "../public/games/outpost-stance.js";

// A quiet Last Signal round: nobody moves unless told, no shields, no disasters.
const quiet = () => {
  const a = new Arena({ mode: "signal", mapId: "skyport", random: () => 0.5 });
  for (const e of a.entities) Object.assign(e, { bot: false, shieldUntil: 0 });
  a.disaster = null;
  a.time = 20;
  return a;
};
const step = (a, seconds, inputs = {}) => {
  for (let t = 0; t < seconds; t += 0.05) a.advance(0.05, typeof inputs === "function" ? inputs() : inputs);
};
// An open lane on Skyport: a row with clear floor for a few tiles.
const lane = (a, length = 7) => {
  for (let y = 2; y < a.level.length - 2; y++)
    for (let x = 2; x < a.level.length - length - 2; x++) {
      let clear = true;
      for (let i = 0; i <= length && clear; i++) clear = a.canMove(x + i + 0.5, y + 0.5, 0.3);
      if (clear) return { x: x + 0.5, y: y + 0.5 };
    }
  throw new Error("no lane");
};

test("height decides hits: prone and crouched fighters need lower aim; a jumper needs higher", () => {
  const me = { stance: "stand" },
    prone = { stance: "prone" },
    crouch = { stance: "crouch" },
    d = 5;
  assert.equal(verticalHit(me, { stance: "stand" }, 0, d, 0), true);
  assert.equal(verticalHit(me, prone, 0, d, 0), false);
  assert.equal(verticalHit(me, prone, pitchTo(me, prone, d, 0), d, 0), true);
  assert.equal(verticalHit(me, crouch, pitchTo(me, crouch, d, 0), d, 0), true);
  // A smaller window: the same small aim error misses prone, hits standing.
  const error = 0.3 / d;
  assert.equal(verticalHit(me, { stance: "stand" }, error, d, 0), true);
  assert.equal(verticalHit(me, prone, pitchTo(me, prone, d, 0) + error, d, 0), false);
  // Mid-jump the target rises.
  const jumper = { stance: "stand", jumpAt: 0 };
  assert.ok(pitchTo(me, jumper, d, JUMP.duration / 2) > 0);
  // Two prone fighters level with each other aim straight.
  assert.ok(Math.abs(pitchTo(prone, prone, d, 0)) < 0.01);
});

test("crouching and lying prone slow you; sprinting stands you up", () => {
  const a = quiet(),
    me = a.entities[0];
  const start = lane(a, 8);
  const run = (stance, sprint = false) => {
    Object.assign(me, start, { a: 0 });
    me.stance = "stand";
    step(a, 1, { [me.id]: { forward: 1, stance, sprint } });
    return me.x - start.x;
  };
  const stand = run("stand"),
    crouch = run("crouch"),
    prone = run("prone");
  assert.ok(crouch < stand * 0.7 && crouch > stand * 0.5, `crouch ${crouch} vs ${stand}`);
  assert.ok(prone < stand * 0.4, `prone ${prone} vs ${stand}`);
  run("prone", true);
  assert.equal(me.stance, "stand");
  assert.equal(me.sprinting, true);
});

test("a jump clears a sandbag barrier that blocks walking", () => {
  const a = quiet(),
    me = a.entities[0],
    start = lane(a, 5);
  a.crates = [{ id: "crate-test", kind: "barrier", x: start.x + 1.4, y: start.y, hp: 200, maxHp: 200, until: 1e9 }];
  Object.assign(me, start, { a: 0 });
  step(a, 1.2, { [me.id]: { forward: 1 } });
  assert.ok(me.x < start.x + 1.2, "walking is blocked by the barrier");
  Object.assign(me, start, { a: 0 });
  let first = true;
  step(a, 1.6, () => {
    const input = { [me.id]: { forward: 1, jump: first } };
    first = false;
    return input;
  });
  assert.ok(me.x > start.x + 1.9, `jumped over: ${me.x - start.x}`);
  // One press, one jump: holding the key does not bunny-hop.
  const at = me.jumpAt;
  step(a, 1.2, { [me.id]: { jump: true } });
  assert.ok(me.jumpAt === at || me.jumpAt - at >= JUMP.duration + JUMP.cooldown - 1e-9);
});

test("getting down takes a moment before a prone fighter can shoot", () => {
  const a = quiet(),
    me = a.entities[0];
  step(a, 0.05, { [me.id]: { stance: "prone" } });
  const ammo = me.ammo;
  a.shoot(me);
  assert.equal(me.ammo, ammo);
  step(a, PRONE_SETTLE + 0.05, { [me.id]: { stance: "prone" } });
  a.shoot(me);
  assert.equal(me.ammo, ammo - 1);
});

test("bots notice a prone fighter only up close, and aim low to hit one", () => {
  const a = quiet(),
    me = a.entities[0],
    bot = a.entities[1];
  for (const e of a.entities.slice(2)) e.hp = 0;
  const start = lane(a, 9);
  Object.assign(bot, start, { bot: true, a: 0, attack: 0, shieldUntil: 0 });
  Object.assign(me, { x: start.x + 9, y: start.y, stance: "prone", stanceAt: 0, shotAt: -10, hp: 100 });
  const hp = me.hp;
  step(a, 2);
  assert.equal(me.hp, hp, "a prone fighter 9 tiles away is not spotted");
  // Up close the bot sees them and lowers its aim.
  Object.assign(me, { x: start.x + 3, y: start.y });
  step(a, 3);
  assert.ok(me.hp < hp, "a bot hits a prone fighter at close range");
  assert.ok(bot.pitch < 0);
});

test("bots take cover low when hurt and keep a stance for a moment", () => {
  const a = quiet(),
    bot = a.entities[1];
  // Everyone else is out of sight (the round must not end).
  for (const e of a.entities) if (e !== bot) e.cloakedUntil = 1e9;
  Object.assign(bot, { bot: true, hp: bot.maxHp * 0.3, retreating: true });
  a.time = 2; // before the Red Haze closes in (outside it, bots stand and run)
  step(a, 0.6);
  assert.notEqual(bot.stance, "stand");
  assert.ok(STANCE[bot.stance]);
  // Healed, it gets back up (after holding the stance for a moment).
  bot.hp = bot.maxHp;
  step(a, 2);
  assert.equal(bot.stance, "stand");
});

test("aiming down the sights slows you, tightens spread and cancels sprinting; fists cannot aim", () => {
  const a = quiet(),
    me = a.entities[0];
  const start = lane(a, 8);
  const run = (input) => {
    Object.assign(me, start, { a: 0, stance: "stand" });
    step(a, 1, { [me.id]: { forward: 1, ...input } });
    return me.x - start.x;
  };
  const walk = run({}),
    aimed = run({ ads: true });
  assert.ok(Math.abs(aimed / walk - ADS.speed) < 0.08, `aimed ${aimed} vs ${walk}`);
  assert.equal(me.ads, true);
  // Sprinting drops the sights.
  run({ ads: true, sprint: true });
  assert.equal(me.ads, false);
  assert.equal(me.sprinting, true);
  // Spread: a tighter blast lands more pellets on a fighter a few tiles ahead.
  const foe = a.entities[1];
  const blast = (ads) => {
    Object.assign(me, start, { a: 0, ads, pitch: 0, stance: "stand" });
    Object.assign(foe, { x: start.x + 2.5, y: start.y, hp: 1000, maxHp: 1000, shieldUntil: 0, stance: "stand" });
    a.pellets(me, { ...a.weaponFor?.(me), kind: "shotgun", damage: 10, spread: 0.32, pellets: 5, range: 6 });
    return 1000 - foe.hp;
  };
  const hip = blast(false),
    ads = blast(true);
  assert.ok(ads > hip, `aimed blast ${ads} vs hip ${hip}`);
  // Fists have no sights.
  me.weapon = "brawler";
  run({ ads: true });
  assert.equal(me.ads, false);
});
