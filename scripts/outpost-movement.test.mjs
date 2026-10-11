import test from "node:test";
import assert from "node:assert/strict";
import { Arena } from "../public/games/outpost-sim.js";
function setup() {
  const a = new Arena({ mode: "training", random: () => 0.5 });
  a.level = Array.from({ length: 12 }, (_, y) => Array.from({ length: 12 }, (_, x) => x === 0 || y === 0 || x === 11 || y === 11 ? 1 : 0));
  a.crates = [];
  const p = a.entities[0];
  p.x = 2; p.y = 5; p.a = 0;
  a.entities.slice(1).forEach((e) => { e.bot = false; e.x = 9; e.y = 9; });
  return { a, p };
}
const step = (a, p, input, count = 10) => {
  for (let i = 0; i < count; i++) a.advance(0.04, { [p.id]: input });
};
test("sprinting is faster than walking, and strafing keeps left/right orientation", () => {
  const walk = setup(), run = setup();
  step(walk.a, walk.p, { forward: 1 });
  step(run.a, run.p, { forward: 1, sprint: true });
  assert.ok(run.p.x > walk.p.x + 0.5);
  assert.equal(run.p.sprinting, true);
  const left = setup(), right = setup();
  step(left.a, left.p, { forward: 1, strafe: -1 });
  step(right.a, right.p, { forward: 1, strafe: 1 });
  assert.ok(left.p.y < 5 && right.p.y > 5);
});
test("slide requires a forward sprint, locks momentum direction and expires", () => {
  const { a, p } = setup();
  step(a, p, { forward: 1, slide: true }, 1);
  assert.equal(p.slideUntil, 0);
  step(a, p, { forward: 1, sprint: true, slide: false }, 1);
  step(a, p, { forward: 1, sprint: true, slide: true }, 1);
  assert.ok(p.slideUntil > a.time);
  const y = p.y;
  step(a, p, { aim: Math.PI / 2 }, 5);
  assert.equal(p.y, y);
  assert.ok(p.x > 3);
  step(a, p, {}, 20);
  assert.ok(p.slideUntil < a.time);
  const x = p.x;
  step(a, p, {}, 5);
  assert.equal(p.x, x);
});
test("held slide cannot chain, cooldown blocks a second slide, walls stop momentum", () => {
  const { a, p } = setup();
  step(a, p, { forward: 1, sprint: true, slide: true }, 1);
  const until = p.slideUntil;
  step(a, p, { forward: 1, sprint: true, slide: true }, 42);
  assert.equal(p.slideUntil, until);
  const b = setup();
  step(b.a, b.p, { forward: 1, sprint: true, slide: true }, 1);
  const cooldownUntil = b.p.slideUntil;
  step(b.a, b.p, {}, 20);
  step(b.a, b.p, { forward: 1, sprint: true, slide: true }, 1);
  assert.equal(b.p.slideUntil, cooldownUntil);
  const wall = setup(); wall.p.x = 10.5;
  step(wall.a, wall.p, { forward: 1, sprint: true, slide: true }, 20);
  assert.ok(wall.p.x < 11);
  assert.ok(wall.a.canMove(wall.p.x, wall.p.y));
});
test("snapshots preserve slide momentum and dead players cannot move", () => {
  const { a, p } = setup();
  step(a, p, { forward: 1, sprint: true, slide: true }, 1);
  const restored = Arena.restore(JSON.parse(JSON.stringify(a.snapshot())));
  const rp = restored.entities[0];
  step(a, p, {}, 5); step(restored, rp, {}, 5);
  assert.equal(p.x, rp.x); assert.equal(p.slideUntil, rp.slideUntil);
  rp.hp = 0; const x = rp.x;
  step(restored, rp, { forward: 1, sprint: true, slide: true }, 5);
  assert.equal(rp.x, x);
});
