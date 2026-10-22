/** Last Signal series: several rounds across the three arenas, first fighter to
 * three round wins takes first place. DOM-free so it can be tested headless. */

export const SERIES_KINDS = {
  single: {
    id: "single",
    title: "Single round",
    sub: "One round · 8 fighters",
    target: 0,
    maxRounds: 1,
  },
  series: {
    id: "series",
    title: "Series",
    sub: "First to 3 wins · max 5 rounds",
    target: 3,
    maxRounds: 5,
  },
  marathon: {
    id: "marathon",
    title: "Marathon",
    sub: "First to 3 wins · no limit",
    target: 3,
    maxRounds: Infinity,
  },
};
export const seriesKindOf = (id) => (Object.hasOwn(SERIES_KINDS, id) ? id : "single");
// Arenas rotate in this order from a random starting point.
export const SERIES_MAPS = ["outpost", "skyport", "estate", "quay"];
// Points by finishing place (index = placement). They separate fighters with
// the same number of wins before kills are compared.
export const PLACEMENT_POINTS = [0, 10, 7, 5, 4, 3, 2, 1, 0];
// A round still running after the player is out is played to its end
// without drawing it (at most this many seconds of game time).
const FAST_FORWARD_LIMIT = 600;

export class Series {
  constructor(kind, start = 0) {
    this.kind = seriesKindOf(kind);
    this.start =
      ((Math.floor(start) % SERIES_MAPS.length) + SERIES_MAPS.length) % SERIES_MAPS.length;
    this.rounds = [];
    this.table = {};
  }
  get rule() {
    return SERIES_KINDS[this.kind];
  }
  /** Round number (1-based) of the round about to be played or being played. */
  get round() {
    return this.rounds.length + 1;
  }
  mapFor(round = this.round) {
    return SERIES_MAPS[(this.start + round - 1) % SERIES_MAPS.length];
  }
  get done() {
    const rule = this.rule;
    return (
      this.rounds.length >= rule.maxRounds ||
      Object.values(this.table).some((row) => row.wins >= rule.target)
    );
  }
  /** Play out whatever is left of the round, then record it. Every fighter
   * gets placement points and kills; the round winner gets a win. */
  record(arena, selfId) {
    if (this.done || this.rounds.some((r) => r.roundId === arena.roundId)) return null;
    for (let i = 0; arena.state !== "ended" && i < FAST_FORWARD_LIMIT * 30; i++)
      arena.advance(1 / 30, {});
    const result = {
      roundId: arena.roundId,
      mapId: arena.mapId,
      winner: null,
      rows: arena.entities.map((e) => ({
        id: e.id,
        name: e.id === selfId ? "You" : e.name,
        placement: e.placement || 8,
        kills: e.kills || 0,
      })),
    };
    for (const row of result.rows) {
      const entry = (this.table[row.id] ||= {
        id: row.id,
        name: row.name,
        wins: 0,
        points: 0,
        kills: 0,
      });
      entry.name = row.name;
      entry.points += PLACEMENT_POINTS[row.placement] ?? 0;
      entry.kills += row.kills;
      if (row.placement === 1 && arena.winner != null) {
        entry.wins++;
        result.winner = row.id;
      }
    }
    this.rounds.push(result);
    return result;
  }
  /** Ranked: most wins, then most placement points, then most kills. */
  standings() {
    return Object.values(this.table).sort(
      (a, b) =>
        b.wins - a.wins || b.points - a.points || b.kills - a.kills || a.id.localeCompare(b.id),
    );
  }
  get champion() {
    return this.done ? this.standings()[0] : null;
  }
}

const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** Scoreboard markup for the round debrief. */
export function standingsHTML(series, selfId) {
  const rows = series
    .standings()
    .map(
      (row, i) =>
        `<tr${row.id === selfId ? ' class="mf-you"' : ""}><td>${i + 1}</td><th scope="row">${escape(row.name)}</th><td>${row.wins}</td><td>${row.points}</td><td>${row.kills}</td></tr>`,
    )
    .join("");
  return `<table class="mf-seriestable"><caption>${escape(series.rule.title)} standings · ${series.rule.target} wins takes first</caption><thead><tr><th scope="col">#</th><th scope="col">Fighter</th><th scope="col">Wins</th><th scope="col">Points</th><th scope="col">Kills</th></tr></thead><tbody>${rows}</tbody></table>`;
}
