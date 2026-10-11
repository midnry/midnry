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
