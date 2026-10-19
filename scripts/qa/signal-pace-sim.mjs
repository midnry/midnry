import { Arena } from "../../public/games/outpost-sim.js";
const ends = [], first = [], player = [];
const per = {};
for (const mapId of ["outpost", "skyport", "estate"]) for (let n = 0; n < (Number(process.env.ROUNDS) || 25); n++) {
  let seed = 1000 + n * 7919; const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const a = new Arena({ mode: "signal", mapId, humans: [{ id: "player", team: 0 }], random });
  a.entities.find(e => e.id === "player").bot = true;
  const out = new Map(); let firstLife = null;
  const lives = new Map(a.entities.map(e => [e.id, e.lives]));
  while (a.state !== "ended" && a.time < 900) {
    a.advance(1 / 30, {});
    for (const e of a.entities) { if (e.lives < lives.get(e.id) && firstLife == null) firstLife = a.time; lives.set(e.id, e.lives); if (e.hp <= 0 && !out.has(e.id)) out.set(e.id, a.time); }
  }
  ends.push(a.time); first.push(firstLife ?? Math.min(...out.values())); player.push(out.get("player") ?? a.time);
  (per[mapId] ||= []).push(a.time);
}
const avg = (x) => (x.reduce((s, y) => s + y, 0) / x.length).toFixed(0), med = (x) => [...x].sort((p, q) => p - q)[x.length >> 1].toFixed(0);
console.log(`NEW RULES: round avg ${avg(ends)}s (median ${med(ends)}s, max ${Math.max(...ends).toFixed(0)}s) | first life lost ${avg(first)}s | typical player lasts ${avg(player)}s`);
for (const [m, v] of Object.entries(per)) console.log(`  ${m}: avg ${avg(v)}s`);
