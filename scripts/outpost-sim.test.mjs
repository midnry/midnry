import test from "node:test";
import assert from "node:assert/strict";
import { Arena } from "../public/games/outpost-sim.js";
const duo = () =>
  new Arena({
    mode: "duo",
    humans: [
      { id: "a", team: 0 },
      { id: "b", team: 0 },
    ],
    random: () => 0.5,
  });
test("four pairs spawn on floor; partner hits cause no damage", () => {
  const a = duo();
  assert.equal(a.entities.length, 8);
  for (let t = 0; t < 4; t++) assert.equal(a.entities.filter((e) => e.team === t).length, 2);
  assert.ok(a.entities.every((e) => a.canMove(e.x, e.y)));
  const [p, m] = a.entities;
  a.damage(m, 500, p);
  assert.equal(m.hp, 100);
  assert.equal(p.kills, 0);
});
test("death drops upgrades; exactly two teammate-dependent returns", () => {
  const a = duo(),
    [p, m] = a.entities;
  p.cores = 2;
  p.maxHp = p.hp = 150;
  p.damage = 56;
  a.damage(p, 200);
  assert.equal(a.cores.length, 2);
  assert.equal(p.respawnAt, 8);
  assert.equal(p.respawns, 1);
  a.time = 8;
  a.respawn(p);
  assert.equal(p.hp, 100);
  assert.equal(p.damage, 40);
  assert.equal(p.cores, 0);
  assert.ok(a.canMove(p.x, p.y));
  a.damage(p, 200);
  assert.equal(p.respawns, 0);
  a.time = 16;
  a.respawn(p);
  assert.equal(p.hp, 100);
  a.damage(p, 200);
  assert.equal(p.respawnAt, 0);
  assert.equal(m.hp, 100);
});
test("team wipe cancels pending return and disconnect cannot redeploy", () => {
  const a = duo(),
    [p, m] = a.entities;
  a.damage(p, 200);
  a.damage(m, 200);
  a.checkResult();
  assert.equal(p.respawnAt, 0);
  assert.equal(m.respawnAt, 0);
  const b = duo(),
    q = b.entities[0];
  b.detach(q.id);
  assert.equal(q.hp, 0);
  assert.equal(q.respawnAt, 0);
  assert.equal(q.respawns, 0);
});
test("winning pair and safe return beside cover", () => {
  const a = duo(),
    [p, m] = a.entities;
  m.x = 1.22;
  m.y = 1.22;
  a.damage(p, 200);
  a.time = 8;
  a.respawn(p);
  assert.ok(a.canMove(p.x, p.y));
  for (const e of a.entities.filter((e) => e.team !== 0)) a.damage(e, 1000);
  a.checkResult();
  assert.equal(a.state, "ended");
  assert.equal(a.winner, 0);
});
test("server snapshots survive JSON round-trip with identical rules", () => {
  const a = duo();
  a.advance(0.1, { a: { forward: 1, aim: 0 } });
  const b = Arena.restore(JSON.parse(JSON.stringify(a.snapshot())));
  a.advance(0.1);
  b.advance(0.1);
  assert.deepEqual(a.snapshot(), b.snapshot());
});
test("health recovers after five seconds without damage, never past maximum", () => {
  const a = new Arena({ mode: "signal", humans: [{ id: "p", team: 0 }], random: () => 0.5 }),
    p = a.entities.find((e) => e.id === "p");
  a.time = 20; // after the start shield
  a.damage(p, 60);
  assert.equal(p.hp, 40);
  a.time += 4;
  a.recover(p, 1);
  assert.equal(p.hp, 40, "no recovery inside the delay");
  a.time += 1.5;
  a.recover(p, 1);
  assert.ok(p.hp > 40 && p.hp <= 52.01, "recovers about 12% of maximum per second");
  a.damage(p, 5);
  const hurt = p.hp;
  a.time += 1;
  a.recover(p, 1);
  assert.equal(p.hp, hurt, "new damage restarts the delay");
  a.time += 10;
  for (let i = 0; i < 20; i++) a.recover(p, 1);
  assert.equal(p.hp, p.maxHp);
});
test("Last Signal pacing: start shield, three lives, reduced weapon damage", async () => {
  const { SIGNAL } = await import("../public/games/outpost-sim.js");
  assert.equal(SIGNAL.lives, 3);
  const a = new Arena({ mode: "signal", humans: [{ id: "p", team: 0 }], random: () => 0.5 }),
    p = a.entities.find((e) => e.id === "p"),
    rival = a.entities.find((e) => e.id !== "p");
  a.damage(p, 50, rival);
  assert.equal(p.hp, 100, "nobody can be hurt during the start shield");
  a.time = SIGNAL.shield + 0.1;
  a.damage(p, 50, rival);
  assert.equal(p.hp, 100 - 50 * SIGNAL.damage, "weapon damage is scaled");
  assert.equal(p.lives, SIGNAL.lives - 1);
  p.cores = 2;
  a.damage(p, 500, rival);
  assert.equal(p.hp, p.maxHp, "a spare life redeploys at full health");
  assert.equal(p.lives, 1);
  assert.ok(!(p.adrenalineUntil > a.time), "no rush before the last life");
  assert.equal(rival.kills, 1, "the rival still gets the elimination");
  assert.equal(a.cores.length, 2, "upgrades drop where the life was lost");
  assert.ok(a.canMove(p.x, p.y) && !a.outsideSafe(p));
  a.damage(p, 50, rival);
  assert.equal(p.hp, p.maxHp, "brief shield after redeploying");
  a.time += SIGNAL.respawnShield + 0.1;
  a.damage(p, 500, rival);
  assert.equal(p.lives, 0, "third life is the last");
  assert.equal(p.adrenalineUntil, a.time + SIGNAL.rush, "last life starts with an adrenaline rush");
  assert.ok(p.speedUntil > a.time);
  a.time += SIGNAL.respawnShield + 0.1;
  a.damage(p, 500, rival);
  assert.equal(p.hp, 0, "the last life ends your round");
  const duo = new Arena({ mode: "duo", humans: [{ id: "a", team: 0 }], random: () => 0.5 });
  assert.equal(duo.entities[0].lives, 0, "other modes are unchanged");
});
test("Last Signal last life: faster reloads in the rush, harder hits, earlier recovery", async () => {
  const { SIGNAL, REGEN_DELAY } = await import("../public/games/outpost-sim.js");
  const a = new Arena({ mode: "signal", humans: [{ id: "p", team: 0 }], random: () => 0.5 }),
    p = a.entities.find((e) => e.id === "p"),
    rival = a.entities.find((e) => e.id !== "p");
  a.time = SIGNAL.shield + 1;
  p.lives = 0;
  p.adrenalineUntil = a.time + 2;
  p.ammo = 0;
  a.reload(p);
  assert.ok(Math.abs(p.reloadUntil - a.time - 1.4 * SIGNAL.rushReload) < 1e-9);
  a.damage(rival, 50, p);
  assert.ok(Math.abs(rival.hp - (100 - 50 * SIGNAL.damage * SIGNAL.lastStand)) < 1e-9);
  rival.lives = 1;
  a.damage(p, 20, rival);
  const hurt = p.hp;
  a.time += SIGNAL.lastRegenDelay + 0.1;
  a.recover(p, 1);
  assert.ok(p.hp > hurt, "last life recovers after " + SIGNAL.lastRegenDelay + "s");
  assert.ok(SIGNAL.lastRegenDelay < REGEN_DELAY);
});
test("Last Signal bots slide out of the line of fire and heal behind cover", () => {
  const a = new Arena({ mode: "signal", mapId: "outpost", difficulty: "hard", random: () => 0.5 }),
    bot = a.entities[1],
    shooter = a.entities[2];
  a.time = 20;
  let slid = 0;
  for (let i = 0; i < 40; i++) {
    Object.assign(bot, { x: 14, y: 9.5, hp: 100, slideUntil: 0, slideCooldown: 0 });
    Object.assign(shooter, { x: 14, y: 4.5 });
    a.damage(bot, 1, shooter);
    a.dodge(bot, { dodge: 0.7 });
    if (bot.slideUntil > a.time) {
      slid++;
      assert.ok(Math.abs(bot.slideDy) < 1e-9, "slides sideways to the shot");
    }
  }
  assert.ok(slid > 10 && slid < 40, "some hits, not all, trigger a slide: " + slid);
  // A hurt bot in the open picks a tile the shooter cannot see.
  Object.assign(bot, { x: 14.5, y: 3.5, hp: 30, cover: null });
  Object.assign(shooter, { x: 14.5, y: 1.5, hp: 100 });
  const cover = a.coverFrom(bot, shooter);
  assert.ok(cover && !a.visible(shooter, cover) && a.canMove(cover.x, cover.y), "cover found");
  assert.ok(Math.hypot(cover.x - bot.x, cover.y - bot.y) <= 6);
});
