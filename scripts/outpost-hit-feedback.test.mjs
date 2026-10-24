import test from "node:test";
import assert from "node:assert/strict";
import {
  TIMING,
  ARC_SPAN,
  MAX_ARCS,
  motionStill,
  stackHit,
  markStyle,
  killTag,
  bearingOf,
  newDamage,
  mergeArc,
  liveArcs,
  arcStyle,
  pulseStyle,
} from "../public/games/outpost-hit-feedback.js";
import { Arena } from "../public/games/outpost-sim.js";

const close = (a, b, why = "") => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b} ${why}`);

test("hits close together add up into one number; a pause starts a new one", () => {
  let mark = stackHit(null, 24, 1000);
  assert.equal(mark.amount, 24);
  assert.equal(mark.until, 1000 + TIMING.hit);
  mark = stackHit(mark, 18, 1200);
  assert.equal(mark.amount, 42, "within the stacking window");
  assert.equal(mark.popAt, 1000, "a refresh does not pop again");
  assert.equal(mark.until, 1200 + TIMING.hit, "the timer is refreshed");
  mark = stackHit(mark, 9, 1200 + TIMING.stack + 1);
  assert.equal(mark.amount, 9, "a later hit starts over");
  assert.equal(mark.popAt, 1200 + TIMING.stack + 1);
});

test("a kill pops, lasts longer and keeps its look while plain hits land", () => {
  let mark = stackHit(null, 30, 1000);
  mark = stackHit(mark, 0, 1000, "ELIMINATED · SENTRY 3");
  assert.equal(mark.amount, 30, "the killing hit's number stays");
  assert.equal(mark.kill, "ELIMINATED · SENTRY 3");
  assert.equal(mark.until, 1000 + TIMING.kill);
  assert.equal(mark.popAt, 1000);
  mark = stackHit(mark, 12, 1100);
  assert.equal(mark.kill, "ELIMINATED · SENTRY 3", "a plain hit does not drop the kill look");
  assert.equal(mark.until, 1000 + TIMING.kill, "nor does it shorten it");
  assert.equal(mark.amount, 42);
  assert.ok(TIMING.kill <= 600, "nothing sits by the crosshair longer than ~600 ms");
});

test("the marker pops from 1.25 to 1 over 120 ms, fades out, and is still when motion is off", () => {
  const mark = stackHit(null, 10, 0);
  close(markStyle(mark, 0).scale, 1.25);
  close(markStyle(mark, TIMING.pop / 2).scale, 1.125);
  close(markStyle(mark, TIMING.pop).scale, 1);
  assert.equal(markStyle(mark, 10).opacity, 1);
  close(markStyle(mark, TIMING.hit - TIMING.fade / 2).opacity, 0.5);
  assert.equal(markStyle(mark, TIMING.hit), null, "gone at the end");
  const still = markStyle(mark, 0, true);
  assert.deepEqual(still, { opacity: 1, scale: 1 }, "no pop, no fade");
  assert.equal(markStyle(mark, TIMING.hit - 1, true).opacity, 1, "instant hide instead of a fade");
  const kill = stackHit(null, 10, 0, "ELIMINATED");
  close(markStyle(kill, TIMING.pop).scale, 1.3, "the kill variant is larger");
  assert.equal(motionStill(0, false), true, "camera motion off");
  assert.equal(motionStill(1, true), true, "system reduce motion");
  assert.equal(motionStill(0.4, false), false, "reduced camera motion keeps the small pop");
  assert.equal(motionStill(undefined, false), false);
});

test("the kill tag names the victim and tells a down from an elimination", () => {
  assert.equal(killTag({ seq: 3, name: "Sentry 2", down: false }, 3), "ELIMINATED · SENTRY 2");
  assert.equal(killTag({ seq: 3, name: "Sentry 2", down: true }, 3), "DOWN · SENTRY 2");
  assert.equal(killTag({ seq: 2, name: "Sentry 2", down: true }, 3), "ELIMINATED", "a stale record is ignored");
  assert.equal(killTag(undefined, 1), "ELIMINATED", "older servers send no record");
  assert.equal(killTag({ seq: 1, name: "A very long operator name indeed" }, 1).length <= 32, true);
});

test("bearings: ahead is up, facing + 90° is the right of the screen, facing − 90° the left", () => {
  const a = 0.7;
  close(bearingOf(a, a), 0);
  close(bearingOf(a + Math.PI / 2, a), 90);
  close(bearingOf(a - Math.PI / 2, a), 270);
  close(bearingOf(a + Math.PI, a), 180);
  // The arc is drawn from 3 o'clock, so an attacker ahead turns it back by 90° + half the span.
  close(arcStyle({ phi: a, at: 0 }, 0, a).rotate, -90 - ARC_SPAN / 2);
  close(arcStyle({ phi: a - Math.PI / 2, at: 0 }, 0, a).rotate, 270 - 90 - ARC_SPAN / 2);
});

test("new damage reads damageFrom, falls back to damageAngle, and marks hazards", () => {
  const player = { x: 5, y: 5, a: 0, damageSeq: 3, damageAngle: 1, damageFrom: [
    { x: 8, y: 5, at: 1, seq: 1 },
    { x: 5, y: 8, at: 2, seq: 2 },
    { x: null, y: null, at: 3, seq: 3 },
  ] };
  const fresh = newDamage(player, 1);
  assert.equal(fresh.length, 2, "only entries after the last seen sequence");
  close(fresh[0].phi, Math.PI / 2);
  assert.equal(fresh[1].phi, null, "a hazard has no direction");
  assert.deepEqual(newDamage({ x: 0, y: 0, damageAngle: 2.5 }, 0), [{ phi: 2.5 }], "no list: the last angle");
  assert.deepEqual(newDamage({ x: 0, y: 0, damageAngle: null }, 0), [{ phi: null }], "no attacker: a pulse");
  assert.deepEqual(newDamage({ x: 0, y: 0, damageFrom: [], damageAngle: 1.2 }, 0), [{ phi: 1.2 }]);
});

test("arcs merge when the same attacker keeps firing, expire, and never exceed the pool", () => {
  const arcs = [];
  mergeArc(arcs, 1.0, 0);
  mergeArc(arcs, 1.0 + (5 * Math.PI) / 180, 100);
  assert.equal(arcs.length, 1, "a burst from one direction is one arc");
  assert.equal(arcs[0].at, 100, "refreshed");
  mergeArc(arcs, 1.0 + Math.PI, 100);
  assert.equal(arcs.length, 2, "an attacker behind adds a second arc");
  assert.equal(liveArcs(arcs, 100 + TIMING.arc - 1).length, 2);
  assert.equal(liveArcs(arcs, 100 + TIMING.arc).length, 0);
  for (let i = 0; i < 10; i++) mergeArc(arcs, i, 200);
  assert.ok(arcs.length <= MAX_ARCS);
  close(arcStyle({ phi: 0, at: 0 }, TIMING.arc / 2, 0).opacity, 0.5);
  assert.equal(arcStyle({ phi: 0, at: 0 }, TIMING.arc / 2, 0, true).opacity, 1, "still: no fade");
});

test("the hazard pulse fades over 0.7 s and grows slightly, or holds still", () => {
  close(pulseStyle(0, 0).opacity, 0.6);
  close(pulseStyle(0, TIMING.pulse / 2).opacity, 0.3);
  close(pulseStyle(0, TIMING.pulse / 2).scale, 1.04);
  assert.equal(pulseStyle(0, TIMING.pulse), null);
  assert.deepEqual(pulseStyle(0, 100, true), { opacity: 0.6, scale: 1 });
  assert.equal(pulseStyle(null, 100), null);
});

test("the simulation records where damage came from without changing damage", () => {
  const arena = new Arena({ mode: "signal", random: () => 0.5 });
  const me = arena.entities[0],
    bot = arena.entities.find((e) => e.bot);
  arena.time = 20;
  me.shieldUntil = 0;
  Object.assign(bot, { x: me.x + 2, y: me.y });
  const hp = me.hp;
  arena.damage(me, 10, bot);
  assert.ok(me.hp < hp, "damage still lands");
  assert.equal(me.damageFrom.length, 1);
  assert.equal(me.damageFrom[0].x, bot.x);
  assert.equal(me.damageFrom[0].seq, me.damageSeq);
  arena.damage(me, 1, null);
  assert.equal(me.damageFrom[1].x, null, "haze has no attacker");
  arena.damage(me, 1, me);
  assert.equal(me.damageFrom[2].x, null, "nor does your own blast");
  for (let i = 0; i < 10; i++) arena.damage(me, 0.5, bot);
  assert.equal(me.damageFrom.length, 6, "capped so snapshots stay small");
  assert.equal(me.damageFrom.at(-1).seq, me.damageSeq);
});

test("the simulation names who went down for the attacker's kill confirmation", () => {
  const arena = new Arena({ mode: "signal", random: () => 0.5 });
  const me = arena.entities[0],
    bot = arena.entities.find((e) => e.bot);
  arena.time = 20;
  bot.shieldUntil = 0;
  bot.lives = 1;
  arena.damage(bot, 1000, me);
  assert.equal(me.kills, 1);
  assert.deepEqual(me.lastKill, { seq: 1, name: bot.name, down: true, at: 20 });
  const other = arena.entities.find((e) => e.bot && e !== bot);
  other.shieldUntil = 0;
  other.lives = 0;
  arena.damage(other, 1000, me);
  assert.equal(me.lastKill.down, false, "no lives left: eliminated");
  assert.equal(me.lastKill.seq, 2);
  const duo = new Arena({ mode: "duo", random: () => 0.5 });
  const rival = duo.entities.find((e) => e.team !== duo.entities[0].team);
  duo.damage(rival, 1000, duo.entities[0]);
  assert.equal(duo.entities[0].lastKill.down, false, "only Last Signal has lives");
});
