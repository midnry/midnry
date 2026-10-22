/**
 * Layout measurements shared by the plan drawings: reachability, walking
 * distances from the loading pad, longest straight street and how exposed a
 * typical spot is (cells in line of sight within the normal 7-tile sight).
 * `seeThrough` lists solid tile types that block walking but not sight
 * (the proposed water tile 7).
 */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function walkDistances(level, from) {
  const h = level.length, w = level[0].length, dist = new Map();
  const start = [Math.floor(from.x), Math.floor(from.y)];
  const key = (x, y) => y * w + x;
  dist.set(key(...start), 0);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i], d = dist.get(key(x, y));
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || level[ny][nx] !== 0 || dist.has(key(nx, ny))) continue;
      dist.set(key(nx, ny), d + 1);
      queue.push([nx, ny]);
    }
  }
  return { get: (p) => dist.get(key(Math.floor(p.x), Math.floor(p.y))), all: dist };
}

function clearLine(level, ax, ay, bx, by, seeThrough) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.1);
  for (let i = 1; i < n; i++) {
    const t = level[Math.floor(ay + (dy * i) / n)]?.[Math.floor(ax + (dx * i) / n)];
    if (t && !seeThrough.includes(t)) return false;
  }
  return true;
}

export function layoutStats(map, { sight = 7, seeThrough = [] } = {}) {
  const level = map.level, h = level.length, w = level[0].length;
  const floor = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (level[y][x] === 0) floor.push([x, y]);
  const fromPad = walkDistances(level, map.loading);
  const supplyWalk = map.supplies.map((s) => fromPad.get(s));
  const stationWalk = map.stations.map((s) => fromPad.get(s));
  let longest = 0;
  for (let y = 0; y < h; y++) { let run = 0; for (let x = 0; x < w; x++) { run = level[y][x] === 0 ? run + 1 : 0; longest = Math.max(longest, run); } }
  for (let x = 0; x < w; x++) { let run = 0; for (let y = 0; y < h; y++) { run = level[y][x] === 0 ? run + 1 : 0; longest = Math.max(longest, run); } }
  // Exposure: average number of floor cells a person standing on a floor
  // cell can see within normal sight range (line of sight on the grid).
  let seen = 0;
  for (const [x, y] of floor) {
    for (const [u, v] of floor) {
      if ((u === x && v === y) || Math.hypot(u - x, v - y) > sight) continue;
      if (clearLine(level, x + 0.5, y + 0.5, u + 0.5, v + 0.5, seeThrough)) seen++;
    }
  }
  const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  return {
    size: w,
    floor: floor.length,
    reachable: fromPad.all.size === floor.length,
    supplyWalkAvg: avg(supplyWalk),
    supplyWalkMax: Math.max(...supplyWalk),
    stationWalkAvg: avg(stationWalk),
    farthest: Math.max(...fromPad.all.values()),
    longestStraight: longest,
    exposure: seen / floor.length,
  };
}
