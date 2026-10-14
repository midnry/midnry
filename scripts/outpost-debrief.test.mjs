import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import {
  awardMatch,
  calendarKeys,
  dailyChallenges,
  weeklyChallenge,
  DAILY_CHALLENGES,
  DAILY_XP,
} from "../public/games/outpost-progression.js";

const tick = (a, s, inputs = {}) => {
  for (let t = 0; t < s - 1e-8; t += 0.05) a.advance(Math.min(0.05, s - t), inputs);
};
const send = (a, e, op, target, value) =>
  a.advance(0.05, { [e.id]: { protocolAction: { seq: a.privateFor(e).actionSeq + 1, op, target, value } } });
const fresh = () => {
  const a = new ProtocolArena({
    humans: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `P${i}` })),
    random: () => 0.4,
  });
  for (const e of a.entities) e.bot = false;
  return a;
};

test("the timeline keeps secrets until the round ends, then tells all", () => {
  const a = fresh();
  const inf = a.entities.find((e) => e.team === 1),
    victim = a.entities.find((e) => e.team === 0);
  tick(a, 15.1);
  Object.assign(inf, { x: 3.5, y: 5.5 });
  Object.assign(victim, { x: 3.5, y: 6.3 });
  send(a, inf, "eliminate", victim.id);
  send(a, inf, "sabotage", "power");
  assert.equal(victim.hp, 0);
  const during = protocolView(a.snapshot(), victim.id).protocol;
  assert.equal(during.timeline, undefined, "no timeline mid-round");
  assert.equal(during.awards, undefined);
  for (const e of a.entities.filter((e) => e.team === 1)) e.hp = 0;
  a.checkResult();
  assert.equal(a.state, "ended");
  const after = protocolView(a.snapshot(), victim.id).protocol;
  const texts = after.timeline.map((t) => t.text).join(" | ");
  assert.match(texts, new RegExp(`${inf.name} eliminated ${victim.name}`));
  assert.match(texts, new RegExp(`${inf.name} cut the power`));
  assert.ok(after.timeline.every((t) => Number.isInteger(t.t)));
});

test("awards name standout players and votes count toward the detective award", () => {
  const a = fresh();
  const infs = a.entities.filter((e) => e.team === 1),
    ops = a.entities.filter((e) => e.team === 0);
  const sleuth = ops[0];
  a.privateFor(ops[1]).contributions.supplies = 5;
  a.privateFor(ops[2]).contributions.pilotSeconds = 12;
  // A meeting where the sleuth votes for an infiltrator.
  Object.assign(sleuth, { x: a.protocol.emergency.x, y: a.protocol.emergency.y });
  send(a, sleuth, "meeting");
  tick(a, 15.1);
  send(a, sleuth, "vote", infs[0].id);
  tick(a, 15.1);
  for (const e of infs) e.hp = 0;
  a.checkResult();
  const awards = Object.fromEntries(a.protocol.awards.map((x) => [x.id, x]));
  assert.equal(awards.detective.playerId, sleuth.id);
  assert.equal(awards.quartermaster.playerId, ops[1].id);
  assert.equal(awards.pilot.playerId, ops[2].id);
  assert.ok(awards.liar, "an infiltrator always gets a shot at best liar");
  assert.equal(protocolView(a.snapshot(), sleuth.id).protocol.self.correctVotes, 1);
  for (const award of a.protocol.awards) assert.match(award.color, /^#[0-9a-f]{6}$/);
});

test("daily challenges: three a day, same for everyone, reset with the calendar", () => {
  const day = calendarKeys(new Date(2026, 9, 14));
  assert.deepEqual(day, { day: "2026-10-14", week: "2026-W42" });
  assert.equal(calendarKeys(new Date(2027, 0, 1)).week, "2026-W53");
  const picks = dailyChallenges(day.day);
  assert.equal(new Set(picks.map((c) => c.id)).size, 3);
  assert.deepEqual(dailyChallenges(day.day), picks);
  const seen = new Set();
  for (let d = 1; d <= 28; d++) for (const c of dailyChallenges(`2026-11-${String(d).padStart(2, "0")}`)) seen.add(c.id);
  assert.ok(seen.size >= DAILY_CHALLENGES.length - 1, "the pool rotates");
  assert.ok(weeklyChallenge(day.week).goal > 1);
});

test("challenge progress builds over rounds, pays once and resets next day", () => {
  const day = { day: "2026-10-14", week: "2026-W42" };
  const supply = dailyChallenges(day.day).find((c) => c.id === "supplies-8");
  assert.ok(supply, "this test expects the supplies challenge on 2026-10-14");
  const round = (id, extra = {}) => ({
    id, mode: "protocol", role: "operator", won: false, seconds: 200, contributions: { supplies: 5 }, ...day, ...extra,
  });
  let r = awardMatch({}, round("a"));
  assert.equal(r.profile.challenges.daily["supplies-8"], 5);
  assert.ok(!r.bonuses.some((b) => b.includes("medical supplies")));
  r = awardMatch(r.profile, round("b"));
  assert.ok(r.bonuses.some((b) => b.includes(`Load 8 medical supplies (+${DAILY_XP} XP)`)));
  r = awardMatch(r.profile, round("c"));
  assert.ok(!r.bonuses.some((b) => b.includes("medical supplies")), "pays once");
  r = awardMatch(r.profile, round("d", { day: "2026-10-15" }));
  assert.equal(r.profile.challenges.day, "2026-10-15");
  assert.equal(r.profile.record.operator.played, 4);
});
