import test from "node:test";
import assert from "node:assert/strict";
import { FrameBudget } from "../public/games/outpost-academy.js";
import { ANIMATION_FPS } from "../public/games/outpost-characters.js";
test("120Hz and 60Hz cadence report measured FPS without inventing display frames", () => {
  for (const hz of [60, 120, 144]) {
    const b = new FrameBudget();
    for (let i = 0; i < 180; i++) b.sample(3, (i * 1000) / hz, true);
    assert.ok(Math.abs(b.fps - hz) <= 1);
    assert.equal(b.target, 120);
    assert.equal(b.scale, 1);
  }
  assert.equal(ANIMATION_FPS, 24);
});
test("sustained overload lowers resolution gradually and clamps its floor", () => {
  const b = new FrameBudget();
  for (let i = 0; i < 2000; i++) b.sample(12, (i * 1000) / 120, true);
  assert.equal(b.scale, 0.5);
  for (let i = 0; i < 2000; i++) b.sample(2, 20000 + (i * 1000) / 120, true);
  assert.ok(b.scale > 0.5 && b.scale < 1);
});
test("paused games do not lower resolution; disabling adaptation restores it", () => {
  const b = new FrameBudget();
  for (let i = 0; i < 180; i++) b.sample(20, (i * 1000) / 60, false);
  assert.equal(b.scale, 1);
  for (let i = 0; i < 180; i++) b.sample(20, 4000 + (i * 1000) / 120, true);
  assert.ok(b.scale < 1);
  assert.equal(b.sample(20, 6000, true, false), true);
  assert.equal(b.scale, 1);
  const count = b.samples;
  b.sample(NaN, 7000, true);
  assert.equal(b.samples, count);
});
test("repeated slow frames trigger adaptation even when average work looks healthy", () => {
  const b = new FrameBudget();
  for (let i = 0; i < 180; i++) b.sample(3, (i * 1000) / 120, true);
  for (let i = 0; i < 60; i++) b.sample(i % 10 === 0 ? 9 : 3, 2000 + (i * 1000) / 120, true);
  assert.ok(b.work < 6.8);
  assert.ok(b.scale < 1);
});
