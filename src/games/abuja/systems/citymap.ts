import { DISTRICTS, HOMES, MAPS, PLACES, WORLD } from "./data";
import type { MapRect } from "./types";

// The city's physical layout: roads and the buildings you can't walk through.
// Built the same way every time, so the map, collisions and task targets agree.

import { LAKE, ROADS, lotSolids } from "./city/layout";

export { LAKE, ROADS };

/** Jabi Lake: drawn as an ellipse, walled off by a slightly smaller box. */
// Two halves, with a gap for the footbridge across the middle.
const LAKE_SOLIDS: MapRect[] = [
  { x: LAKE.x - 140, y: LAKE.y - 92, w: 280, h: 78, kind: "water" },
  { x: LAKE.x - 140, y: LAKE.y + 14, w: 280, h: 78, kind: "water" },
];

let cache: MapRect[] | null = null;

/** Everything you can't walk through in the city: buildings on their lots, and the lake. */
export function citySolids(): MapRect[] {
  if (cache) return cache;
  cache = [...lotSolids(), ...LAKE_SOLIDS];
  return cache;
}

/** Fences with a gap become two solids. */
export function expandSolids(solids: MapRect[]): MapRect[] {
  return solids.flatMap((s) =>
    s.gapFrom != null && s.gapTo != null
      ? [
          { ...s, w: s.gapFrom - s.x, gapFrom: undefined, gapTo: undefined },
          { ...s, x: s.gapTo, w: s.x + s.w - s.gapTo, gapFrom: undefined, gapTo: undefined },
        ]
      : [s],
  );
}

export function solidsFor(mapId: string): MapRect[] {
  if (mapId === "city") return citySolids();
  return expandSolids(MAPS[mapId]?.solids ?? []);
}

export function sizeOf(mapId: string): { width: number; height: number } {
  if (mapId === "city") return WORLD;
  const m = MAPS[mapId];
  return { width: m?.width ?? 1600, height: m?.height ?? 1100 };
}

export function blocked(x: number, y: number, r: number, solids: MapRect[]): boolean {
  return solids.some((s) => x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h);
}

/** A walkable point near (x, y), searching outward if it lands in a building. */
export function freePoint(x: number, y: number, solids: MapRect[]): { x: number; y: number } {
  for (let r = 0; r < 300; r += 20) {
    for (let a = 0; a < 8; a += 1) {
      const px = x + Math.cos((a / 8) * Math.PI * 2) * r;
      const py = y + Math.sin((a / 8) * Math.PI * 2) * r;
      if (!blocked(px, py, 18, solids)) return { x: Math.round(px), y: Math.round(py) };
    }
  }
  return { x, y };
}

type Pt = { x: number; y: number };

/** The nearest point on any road. */
function onRoad(p: Pt): Pt {
  let best: Pt = { x: ROADS.xs[0]!, y: p.y };
  let bestD = Infinity;
  for (const x of ROADS.xs) {
    const d = Math.abs(p.x - x);
    if (d < bestD) [best, bestD] = [{ x, y: Math.max(0, Math.min(WORLD.height, p.y)) }, d];
  }
  for (const y of ROADS.ys) {
    const d = Math.abs(p.y - y);
    if (d < bestD) [best, bestD] = [{ x: Math.max(0, Math.min(WORLD.width, p.x)), y }, d];
  }
  return best;
}

/**
 * A drive from one spot to another along the roads: out to the nearest road,
 * along the road grid by the shortest way, and in to the destination.
 */
export function roadRoute(from: Pt, to: Pt): Pt[] {
  const a = onRoad(from);
  const b = onRoad(to);
  const nodes: Pt[] = [a, b];
  for (const x of ROADS.xs) for (const y of ROADS.ys) nodes.push({ x, y });
  const key = (p: Pt) => `${p.x},${p.y}`;
  const edges = new Map<string, { to: number; cost: number }[]>();
  const link = (i: number, j: number) => {
    const cost = Math.abs(nodes[i]!.x - nodes[j]!.x) + Math.abs(nodes[i]!.y - nodes[j]!.y);
    edges.set(String(i), [...(edges.get(String(i)) ?? []), { to: j, cost }]);
    edges.set(String(j), [...(edges.get(String(j)) ?? []), { to: i, cost }]);
  };
  // Connect neighbours along each road.
  for (const x of ROADS.xs) {
    const on = nodes.map((p, i) => ({ p, i })).filter(({ p }) => p.x === x).sort((m, n) => m.p.y - n.p.y);
    for (let k = 1; k < on.length; k += 1) link(on[k - 1]!.i, on[k]!.i);
  }
  for (const y of ROADS.ys) {
    const on = nodes.map((p, i) => ({ p, i })).filter(({ p }) => p.y === y).sort((m, n) => m.p.x - n.p.x);
    for (let k = 1; k < on.length; k += 1) link(on[k - 1]!.i, on[k]!.i);
  }
  // Dijkstra from a (0) to b (1); the graph is tiny.
  const dist = nodes.map(() => Infinity);
  const prev = nodes.map(() => -1);
  const done = nodes.map(() => false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i += 1) if (!done[i] && (u === -1 || dist[i]! < dist[u]!)) u = i;
    if (u === -1 || dist[u] === Infinity || u === 1) break;
    done[u] = true;
    for (const e of edges.get(String(u)) ?? []) {
      if (dist[u]! + e.cost < dist[e.to]!) {
        dist[e.to] = dist[u]! + e.cost;
        prev[e.to] = u;
      }
    }
  }
  const path: Pt[] = [];
  for (let i = 1; i !== -1; i = prev[i]!) path.unshift(nodes[i]!);
  if (path[0] && key(path[0]) !== key(a)) path.unshift(a);
  const out = [from, ...path, to];
  // Drop repeats and points that sit on a straight line.
  return out.filter((p, i) => {
    const q = out[i - 1];
    const r = out[i + 1];
    if (q && Math.hypot(p.x - q.x, p.y - q.y) < 1) return false;
    if (q && r && ((q.x === p.x && p.x === r.x) || (q.y === p.y && p.y === r.y))) return false;
    return true;
  });
}

/** Length of a route in map pixels. */
export function routeLength(route: Pt[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) total += Math.hypot(route[i]!.x - route[i - 1]!.x, route[i]!.y - route[i - 1]!.y);
  return total;
}
