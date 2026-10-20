import test from "node:test";
import assert from "node:assert/strict";
import { Arena } from "../public/games/outpost-sim.js";
import {
  Series,
  SERIES_MAPS,
  PLACEMENT_POINTS,
  seriesKindOf,
  standingsHTML,
} from "../public/games/outpost-series.js";

const round = (series, seed) => {
  let s = seed;
  const random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const a = new Arena({
    mode: "signal",
    mapId: series.mapFor(),
    humans: [{ id: "player", team: 0, name: "Ada" }],
    random,
  });
  a.entities.find((e) => e.id === "player").hp = 0; // out at once: the rest is played to its end
  a.entities.find((e) => e.id === "player").lives = 0;
  return series.record(a, "player");
};

test("series kinds: first to three wins, five-round cap, no-limit marathon", () => {
  assert.equal(seriesKindOf("nope"), "single");
  const s = new Series("series", 1);
  assert.equal(s.mapFor(1), SERIES_MAPS[1]);
  assert.equal(s.mapFor(2), SERIES_MAPS[2]);
  assert.equal(s.mapFor(3), SERIES_MAPS[0], "arenas rotate");
  let n = 0;
  while (!s.done) round(s, 1000 + n++ * 7919);
  assert.ok(s.rounds.length <= 5);
  const top = s.standings();
  assert.ok(top[0].wins === 3 || s.rounds.length === 5);
  assert.equal(s.champion, top[0]);
  assert.equal(round(s, 99), null, "a finished series records nothing more");
  const m = new Series("marathon");
  n = 0;
  while (!m.done) round(m, 5000 + n++ * 7919);
  assert.equal(m.standings()[0].wins, 3);
});

test("series rounds are played to the end, scored and ranked by wins, points, kills", () => {
  const s = new Series("series");
  const r = round(s, 4242);
  assert.ok(r.winner && r.winner !== "player", "bots finish the round after the player is out");
  assert.equal(round(s, 4242) && s.rounds.length, 2);
  const totalPoints = PLACEMENT_POINTS.slice(1).reduce((a, b) => a + b, 0) * 2;
  assert.equal(
    s.standings().reduce((sum, row) => sum + row.points, 0),
    totalPoints,
    "every place 1–8 awarded once per round",
  );
  const rows = s.standings();
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1],
      b = rows[i];
    assert.ok(
      a.wins > b.wins ||
        (a.wins === b.wins &&
          (a.points > b.points || (a.points === b.points && a.kills >= b.kills))),
    );
  }
  assert.equal(s.table.player.name, "You");
  // The same round is never counted twice.
  const again = new Series("series"),
    a = new Arena({ mode: "signal", random: () => 0.5 });
  again.record(a, "player");
  again.record(a, "player");
  assert.equal(again.rounds.length, 1);
  assert.match(standingsHTML(s, "player"), /class="mf-you"/);
  assert.doesNotMatch(
    standingsHTML(
      {
        ...s,
        standings: () => [{ id: "x", name: "<b>", wins: 0, points: 0, kills: 0 }],
        rule: s.rule,
      },
      "p",
    ),
    /<b>/,
  );
});
