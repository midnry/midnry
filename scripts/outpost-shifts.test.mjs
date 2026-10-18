import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView } from "../public/games/outpost-protocol.js";
import { dailyKey, dailyRandom, dailyScore, shiftChoice } from "../public/games/outpost-shifts.js";

const make = (shift, random = () => 0.31) =>
  new ProtocolArena({ humans: [{ id: "me", name: "Me" }], rolePreference: "operator", variety: true, shift, random });

test("a quick shift has five players, one infiltrator, seven supplies and a shorter flight", () => {
  const full = make("full"),
    quick = make("quick");
  assert.equal(full.entities.length, 8);
  assert.equal(quick.entities.length, 5);
  assert.equal(quick.entities.filter((e) => e.team === 1).length, 1);
  assert.ok(quick.entities.some((e) => e.id === "me" && e.team === 0));
  const total = (a) => a.protocol.mission.manifest.reduce((n, item) => n + item.required, 0);
  assert.ok(total(quick) <= 8 && total(full) >= 13);
  assert.ok(quick.protocol.mission.vehicle.duration < full.protocol.mission.vehicle.duration);
  assert.ok(quick.protocol.nextEventAt < 80);
  assert.equal(protocolView(quick.snapshot(), "me").protocol.match.shift, "quick");
  assert.equal(shiftChoice("nonsense"), "full");
});

test("the daily case is identical for everyone on the same day", () => {
  const key = dailyKey(new Date("2026-10-18T09:00:00Z"));
  assert.equal(key, "2026-10-18");
  const a = make("daily", dailyRandom(key)),
    b = make("daily", dailyRandom(key)),
    c = make("daily", dailyRandom("2026-10-19"));
  const setup = (x) =>
    JSON.stringify([
      x.entities.map((e) => [e.name, e.team, e.x, e.y]),
      x.protocol.match.modifier,
      x.protocol.match.twist,
      x.protocol.mission.supplyStock.map((s) => [s.id, s.stock]),
    ]);
  assert.equal(setup(a), setup(b));
  assert.notEqual(setup(a), setup(c));
});

test("daily score rewards solving quickly and voting right", () => {
  const fast = dailyScore({ won: true, seconds: 150, correctVotes: 1, crewAlive: 4, rescued: 4 });
  const slow = dailyScore({ won: true, seconds: 420, correctVotes: 0, crewAlive: 2, rescued: 4 });
  const lost = dailyScore({ won: false, seconds: 200, correctVotes: 1, crewAlive: 1, rescued: 0 });
  assert.ok(fast > slow && slow > lost);
  assert.ok(fast <= 1000 && lost <= 300);
});

test("quick shifts never roll Lone wolf, since they already have one infiltrator", () => {
  for (let k = 0; k < 40; k++) {
    let s = k * 104729 + 7;
    const random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    assert.notEqual(make("quick", random).protocol.match.modifier, "lone-wolf");
  }
  assert.notEqual(new ProtocolArena({ humans: [{ id: "me" }], variety: true, shift: "quick", modifier: "lone-wolf" }).protocol.match.modifier, "lone-wolf");
});
