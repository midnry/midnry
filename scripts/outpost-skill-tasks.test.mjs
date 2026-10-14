import test from "node:test";
import assert from "node:assert/strict";
import { createTaskGame, taskStep, taskGameView } from "../public/games/outpost-task-games.js";
import { ProtocolArena } from "../public/games/outpost-protocol.js";

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const mission = () => new ProtocolArena({ humans: [], interactiveTasks: true }).protocol.mission;
const game = (kind, target, seed = 1) =>
  createTaskGame({ kind, target }, mission(), "g", 0, seeded(seed));

test("the needle accepts a stop inside the band and re-deals after a miss", () => {
  const g = game("repair-cargo", "cargo");
  const step = g.steps[0];
  assert.equal(step.kind, "needle");
  const { from, to } = step.zone;
  assert.ok(to - from <= 18 && from >= 0 && to <= 100);
  const outside = String(from > 20 ? from - 5 : to + 5);
  assert.equal(taskStep(g, outside, 1, seeded(9)), false);
  assert.notDeepEqual(g.steps[0].zone, step.zone, "a miss moves the band");
  assert.ok(g.nextAt >= 2.2, "a miss costs over a second");
  assert.equal(taskStep(g, g.steps[0].answer, 1.5), false, "too soon after a miss");
  const z = g.steps[0].zone;
  assert.equal(taskStep(g, String(z.from + 0.5), 2.3), true);
  assert.equal(g.index, 1);
});

test("memory codes are only visible while flashing, then must be typed", () => {
  const g = game("flight-task", "landing");
  const step = g.steps[0];
  assert.equal(step.kind, "code");
  assert.match(step.code, /^\d{4}$/);
  assert.equal(taskGameView(g, 1).code, step.code);
  assert.equal(taskGameView(g, step.revealUntil + 0.01).code, null);
  assert.equal(taskGameView(g, step.revealUntil + 0.01).length, 4);
  assert.equal(taskStep(g, "0000" === step.code ? "1111" : "0000", 3), false);
  const fresh = g.steps[0];
  assert.ok(fresh.revealUntil > 3, "a new code flashes after a miss");
  assert.equal(taskStep(g, fresh.code, 4.5), true);
});

test("wire sequences use four colours and must be repeated exactly", () => {
  const g = game("repair", "power");
  const step = g.steps[0];
  assert.equal(step.kind, "sequence");
  assert.match(step.seq, /^[rgby]{4}$/);
  assert.equal(taskGameView(g, 0.5).seq, step.seq);
  assert.equal(taskGameView(g, 9).seq, null);
  assert.equal(taskStep(g, step.seq.split("").reverse().join("") === step.seq ? "rrrr" : step.seq.split("").reverse().join(""), 3), false);
  assert.equal(taskStep(g, g.steps[0].seq, 4.5), true);
});

test("triage asks for the patient with the lowest vitals", () => {
  const m = mission();
  m.patients[2].hp = 12;
  const g = createTaskGame({ kind: "deliver", target: "cargo" }, m, "d", 0, seeded(3));
  const step = g.steps[0];
  const right = step.options.find((o) => o.id === step.answer);
  assert.match(right.label, /Specialist Vega · 12%/);
});

test("collecting rotates between the needle and a batch code", () => {
  const kinds = new Set();
  const m = mission();
  for (let seed = 1; seed <= 20; seed++)
    kinds.add(createTaskGame({ kind: "collect", target: m.supplyStock[0].id }, m, "c", 0, seeded(seed)).steps[0].kind);
  assert.deepEqual([...kinds].sort(), ["code", "needle"]);
});
