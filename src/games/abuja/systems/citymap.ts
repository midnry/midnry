import { DISTRICTS, HOMES, MAPS, PLACES, WORLD } from "./data";
import type { MapRect } from "./types";

// The city's physical layout: roads and the buildings you can't walk through.
// Built the same way every time, so the map, collisions and task targets agree.

export const ROADS = { xs: [500, 800, 1000, 1500, 1600], ys: [500, 600, 1000, 1100] };
const ROAD_CLEAR = 46;

/** Jabi Lake: drawn as an ellipse, walled off by a slightly smaller box. */
export const LAKE = { x: 210, y: 800, rx: 160, ry: 115 };
const LAKE_SOLID: MapRect = { x: LAKE.x - 140, y: LAKE.y - 92, w: 280, h: 184, kind: "water" };

function near(x: number, y: number, px: number, py: number, r: number): boolean {
  return Math.abs(x - px) < r && Math.abs(y - py) < r;
}

let cache: MapRect[] | null = null;

export function citySolids(): MapRect[] {
  if (cache) return cache;
  const out: MapRect[] = [];
  const homes = Object.values(HOMES).map((id) => PLACES.find((p) => p.id === id)!);
  for (const d of DISTRICTS) {
    let n = 0;
    for (let bx = d.x + 40; bx + 80 < d.x + d.w - 20; bx += 125) {
      for (let by = d.y + 70; by + 70 < d.y + d.h - 20; by += 125) {
        n += 1;
        const cx = bx + 40;
        const cy = by + 35;
        if (ROADS.xs.some((x) => Math.abs(cx - x) < 40 + ROAD_CLEAR)) continue;
        if (ROADS.ys.some((y) => Math.abs(cy - y) < 35 + ROAD_CLEAR)) continue;
        if (PLACES.some((p) => near(cx, cy, p.x, p.y + 40, 160))) continue;
        if (homes.some((p) => near(cx, cy, p.x, p.y + 95, 170))) continue;
        if (near(cx, cy, LAKE.x, LAKE.y, LAKE.rx + 70)) continue;
        if ((n * 7 + d.x) % 5 === 0) continue; // open plots and courtyards
        out.push({ x: bx, y: by, w: 80, h: 70, color: d.color });
      }
    }
  }
  out.push(LAKE_SOLID);
  cache = out;
  return out;
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
