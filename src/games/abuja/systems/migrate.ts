import { DISTRICTS } from "./data";
import { citySolids, freePoint } from "./citymap";
import { building } from "./city/catalog";
import { cityLots } from "./city/layout";
import oldLots from "../data/oldlots-v1.json";
import type { GameState } from "./types";

// Saves from before the city was redrawn to match Abuja (map version 1): move
// the player, and any property they own, to the same spot in the new city.

/** District rectangles on the old map. */
const OLD: Record<string, [number, number, number, number]> = {
  kubwa: [0, 0, 500, 500],
  gwarinpa: [500, 0, 500, 500],
  maitama: [1000, 0, 600, 500],
  asokoro: [1600, 0, 800, 600],
  jabi: [0, 500, 800, 600],
  wuse: [800, 500, 700, 500],
  cbd: [1500, 600, 900, 500],
  garki: [800, 1000, 700, 800],
  lugbe: [0, 1100, 800, 700],
  nyanya: [1500, 1100, 900, 700],
};

export const MAP_VERSION = 2;

/** A point on the old map, at the same place within its district on the new one. */
function movePoint(x: number, y: number): { x: number; y: number; district: string } {
  const id = Object.keys(OLD).find((k) => {
    const [ox, oy, ow, oh] = OLD[k]!;
    return x >= ox && x < ox + ow && y >= oy && y < oy + oh;
  }) ?? "wuse";
  const [ox, oy, ow, oh] = OLD[id]!;
  const d = DISTRICTS.find((n) => n.id === id)!;
  return { x: d.x + ((x - ox) / ow) * d.w, y: d.y + ((y - oy) / oh) * d.h, district: id };
}

export function migrateSave(s: GameState): GameState {
  if ((s.mapVersion ?? 1) >= MAP_VERSION) return s;
  if (s.pos) {
    const p = movePoint(s.pos.x, s.pos.y);
    s.pos = freePoint(Math.round(p.x), Math.round(p.y), citySolids());
  }
  // Property: the building of the same kind nearest to where it stood.
  if (s.city?.lots) {
    const lots = cityLots();
    const taken = new Set<string>();
    const moved: typeof s.city.lots = {};
    for (const [id, own] of Object.entries(s.city.lots)) {
      if (id.startsWith("P_")) {
        moved[id] = own;
        continue;
      }
      const old = (oldLots as unknown as Record<string, [string, string, number, number]>)[id];
      if (!old) continue;
      const [def, district, cx, cy] = old;
      const at = movePoint(cx, cy);
      const zone = building(def)?.zone;
      const pick = (ok: (l: (typeof lots)[number]) => boolean) =>
        lots.filter((l) => !l.place && !taken.has(l.id) && ok(l)).sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y))[0];
      const lot = pick((l) => l.def === (own.def ?? def) && l.district === district) ?? pick((l) => l.def === def && l.district === district) ?? pick((l) => l.district === district && building(l.def)?.zone === zone) ?? pick((l) => building(l.def)?.zone === zone);
      if (!lot) continue;
      taken.add(lot.id);
      // A rebuild carries over as the new building on the new plot.
      moved[lot.id] = { ...own, def: own.def && own.def !== lot.def ? own.def : undefined };
    }
    s.city.lots = moved;
  }
  // A job in progress was laid out on the old streets: start it fresh.
  s.task = null;
  s.mapVersion = MAP_VERSION;
  return s;
}
