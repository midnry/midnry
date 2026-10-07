import { DISTRICTS, HOMES, PEOPLE, PLACES, WORLD } from "../data";
import type { MapRect } from "../types";
import { BUILDINGS, building, type BuildingDef, type Zone } from "./catalog";

// Where every building stands. The city is laid out the same way on every
// device, from the district map: each district gets a mix of zones in
// clusters (so a street of houses, then a run of shops, then a factory
// estate), each zone gets buildings that suit the district (villas in
// Maitama, bungalows in Nyanya), landmarks find the first spot big enough,
// and each place you can visit gets a building behind its signpost.

/** Main roads: kept here so the city layout and the map agree. */
export const ROADS = { xs: [500, 800, 1000, 1500, 1600], ys: [500, 600, 1000, 1100] };
export const LAKE = { x: 210, y: 800, rx: 160, ry: 115 };
/** The light rail along the south edge, and its station. */
export const RAIL = { y: 1772, station: { x: 1180, y: 1772 } };

const CELL = { w: 100, h: 95 };
const GAP = { w: 16, h: 23 };

export type Lot = {
  id: string;
  def: string;
  zone: Zone;
  district: string;
  /** Footprint on the map. */
  x: number;
  y: number;
  w: number;
  h: number;
  floors: number;
  palette: number;
  seed: number;
  /** Walk-through ground (parks, farms) or a solid building. */
  solid: boolean;
  /** The place this building belongs to, if it's a place you can visit. */
  place?: string;
};

/** Which zones each district mixes, and how much of each. */
const DISTRICT_ZONES: Record<string, Partial<Record<Zone, number>>> = {
  maitama: { residential: 5, civic: 3, park: 2 },
  asokoro: { residential: 6, civic: 3, park: 1 },
  cbd: { commercial: 6, civic: 3, park: 1 },
  wuse: { commercial: 6, residential: 3, service: 1 },
  garki: { civic: 3, commercial: 3, residential: 3, service: 1 },
  jabi: { commercial: 4, residential: 3, park: 3 },
  gwarinpa: { residential: 8, commercial: 1, park: 1, service: 1 },
  kubwa: { residential: 5, commercial: 2, park: 3 },
  nyanya: { residential: 6, commercial: 2, industrial: 2 },
  lugbe: { industrial: 6, residential: 3, service: 1 },
};

/** Which buildings suit a zone in a district (more copies = more often). Missing: the zone's defaults. */
const DISTRICT_KINDS: Record<string, Partial<Record<Zone, string[]>>> = {
  maitama: { residential: ["villa", "big_house", "big_house", "highrise_apts"], civic: ["government", "library"], park: ["park"] },
  asokoro: { residential: ["villa", "big_house", "duplex"], civic: ["government", "police"], park: ["park"] },
  cbd: { commercial: ["business_tower", "business_tower", "office", "office", "hotel", "mall"], civic: ["government", "government", "library"], park: ["park"] },
  wuse: { commercial: ["shop", "restaurant", "office", "cafe", "supermarket", "cinema", "shop", "hotel"], residential: ["apartments", "apartments", "townhouse"], service: ["substation", "clinic"] },
  garki: { civic: ["clinic", "school", "police", "library", "community"], commercial: ["shop", "office", "restaurant", "cafe"], residential: ["apartments", "townhouse", "big_house"], service: ["fire_station", "substation"] },
  jabi: { commercial: ["restaurant", "cafe", "office", "shop", "hotel"], residential: ["highrise_apts", "apartments", "townhouse"], park: ["park", "playground"] },
  gwarinpa: { residential: ["duplex", "duplex", "townhouse", "big_house", "apartments"], commercial: ["shop", "supermarket", "restaurant"], park: ["playground", "park"], service: ["water_tower", "school"] },
  kubwa: { residential: ["small_house", "small_house", "apartments", "big_house"], commercial: ["shop", "restaurant"], park: ["farm", "farm", "park"] },
  nyanya: { residential: ["small_house", "small_house", "small_house", "apartments", "townhouse"], commercial: ["shop", "restaurant", "shop"], industrial: ["warehouse", "factory", "warehouse", "construction_yard"] },
  lugbe: { industrial: ["factory", "warehouse", "processing_plant", "logistics", "construction_yard"], residential: ["small_house", "apartments"], service: ["substation", "waste_depot"] },
};

const ZONE_DEFAULT: Record<Zone, string[]> = {
  residential: ["small_house", "big_house", "duplex", "townhouse", "apartments"],
  commercial: ["shop", "restaurant", "cafe", "office"],
  industrial: ["warehouse", "factory"],
  civic: ["clinic", "school", "police", "library", "community"],
  service: ["substation", "water_tower", "fire_station"],
  park: ["park", "playground"],
  water: [],
  road: [],
  rail: [],
};

/** Landmarks and city utilities: where they'd like to be. */
const FIXED: { def: string; district: string; near?: { x: number; y: number } }[] = [
  { def: "stadium", district: "lugbe", near: { x: 620, y: 1640 } },
  { def: "skyscraper", district: "cbd", near: { x: 2300, y: 700 } },
  { def: "mosque", district: "cbd", near: { x: 1800, y: 680 } },
  { def: "church", district: "cbd", near: { x: 2250, y: 1040 } },
  { def: "museum", district: "garki", near: { x: 1250, y: 1460 } },
  { def: "monument", district: "maitama", near: { x: 1300, y: 420 } },
  { def: "hospital_bld", district: "garki", near: { x: 900, y: 1700 } },
  { def: "power_plant", district: "nyanya", near: { x: 2300, y: 1700 } },
  { def: "solar_farm", district: "lugbe", near: { x: 100, y: 1720 } },
  { def: "water_tower", district: "kubwa", near: { x: 80, y: 120 } },
  { def: "water_tower", district: "nyanya", near: { x: 2300, y: 1180 } },
  { def: "water_tower", district: "asokoro", near: { x: 2300, y: 120 } },
  { def: "waste_depot", district: "nyanya", near: { x: 1700, y: 1720 } },
  { def: "school", district: "nyanya", near: { x: 2100, y: 1640 } },
  { def: "school", district: "kubwa", near: { x: 120, y: 420 } },
  { def: "fire_station", district: "cbd", near: { x: 1700, y: 1070 } },
  { def: "police", district: "nyanya", near: { x: 1700, y: 1450 } },
  { def: "substation", district: "gwarinpa", near: { x: 950, y: 120 } },
  { def: "substation", district: "maitama", near: { x: 1550, y: 120 } },
  { def: "logistics", district: "lugbe", near: { x: 120, y: 1150 } },
  { def: "community", district: "kubwa", near: { x: 420, y: 120 } },
  { def: "clinic", district: "nyanya", near: { x: 2300, y: 1450 } },
];

/** What each place you can visit looks like. */
const PLACE_ART: Record<string, { def: string; label?: string; cells?: [number, number] }> = {
  home_nyanya: { def: "small_house" },
  home_gwarinpa: { def: "apartments" },
  laundry_gwarinpa: { def: "shop", label: "DRY CLEANERS" },
  laundry_nyanya: { def: "shop", label: "LAUNDRY" },
  pos_junction: { def: "shop", label: "POS" },
  culinary_academy: { def: "school", label: "CULINARY ACADEMY" },
  quickkash: { def: "office", label: "QUICKKASH" },
  tech_hub: { def: "office", label: "TECH HUB" },
  okafor_office: { def: "office", label: "CONSULTING" },
  wuse_plaza: { def: "mall", label: "WUSE PLAZA" },
  garki_hub: { def: "warehouse" },
  cac_office: { def: "government", label: "CAC" },
  hospital: { def: "hospital_bld", label: "GENERAL HOSPITAL" },
  driving_school: { def: "school", label: "DRIVING SCHOOL" },
  cbd_bank: { def: "business_tower", label: "UNION BANK" },
  cbd_tower: { def: "business_tower" },
  ministry: { def: "government", label: "MINISTRY" },
  visa_agent: { def: "office", label: "VISA & TRAVEL" },
  telecom_office: { def: "office", label: "TELECOM" },
  jabi_mall: { def: "mall", label: "JABI LAKE MALL" },
  efcc_hq: { def: "police", label: "EFCC" },
  tunde_place: { def: "small_house" },
  slim_lab: { def: "warehouse" },
  car_mart: { def: "logistics" },
  bolaji_house: { def: "villa" },
  oil_hq: { def: "business_tower", label: "DELTA CREST" },
  asokoro_owambe: { def: "hotel", label: "EVENT HALL" },
};

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function rng(seed: number) {
  let s = (seed % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function weighted<T extends string>(r: () => number, weights: Partial<Record<T, number>>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [k, w] of entries) {
    x -= w;
    if (x <= 0) return k;
  }
  return entries[0]![0];
}

/** The district a point is in. */
function districtOf(x: number, y: number): string {
  return DISTRICTS.find((d) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h)?.id ?? "wuse";
}

const overlaps = (a: MapRect, b: MapRect, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** Every lot in the city, built once. */
let cache: Lot[] | null = null;

export function cityLots(): Lot[] {
  if (cache) return cache;
  const lots: Lot[] = [];
  const taken: MapRect[] = [];
  const roadClear = (r: MapRect) => !ROADS.xs.some((x) => r.x < x + 44 && x - 44 < r.x + r.w) && !ROADS.ys.some((y) => r.y < y + 44 && y - 44 < r.y + r.h);
  const lakeClear = (r: MapRect) => Math.hypot((r.x + r.w / 2 - LAKE.x) / (LAKE.rx + 70 + r.w / 2), (r.y + r.h / 2 - LAKE.y) / (LAKE.ry + 70 + r.h / 2)) > 1;
  const railClear = (r: MapRect) => r.y + r.h < RAIL.y - 26;
  const inDistrict = (r: MapRect, d: (typeof DISTRICTS)[number]) => r.x >= d.x + 12 && r.y >= d.y + 48 && r.x + r.w <= d.x + d.w - 12 && r.y + r.h <= d.y + d.h - 12;
  // Signposts, their mats and labels, and the people around them.
  const placeBoxes: MapRect[] = PLACES.map((p) => ({ x: p.x - 92, y: p.y - 60, w: 184, h: 150 }));
  // People who stand by a place or a spot in the city keep a little space.
  for (const person of PEOPLE) {
    if (person.map !== "city") continue;
    const at = person.place ? PLACES.find((pl) => pl.id === person.place) : undefined;
    const px = at ? at.x + (person.dx ?? 0) : person.x;
    const py = at ? at.y + (person.dy ?? 40) : person.y;
    if (px != null && py != null) placeBoxes.push({ x: px - 30, y: py - 50, w: 60, h: 80 });
  }
  const homeIds = new Set(Object.values(HOMES));
  const free = (r: MapRect, d: (typeof DISTRICTS)[number]) => inDistrict(r, d) && roadClear(r) && lakeClear(r) && railClear(r) && !placeBoxes.some((b) => overlaps(r, b)) && !taken.some((t) => overlaps(r, t, 8));
  const make = (def: BuildingDef, r: MapRect, d: string, seed: number, place?: string): Lot => {
    const rr = rng(seed);
    const [lo, hi] = def.floors;
    const lot: Lot = {
      id: place ? `P_${place}` : `L${r.x}_${r.y}`,
      def: def.id,
      zone: def.zone,
      district: d,
      ...r,
      floors: lo + Math.floor(rr() * (hi - lo + 1)),
      palette: Math.floor(rr() * def.palette.length),
      seed,
      solid: def.category !== "park",
      place,
    };
    lots.push(lot);
    taken.push({ x: r.x, y: r.y - 10, w: r.w, h: r.h + 10 });
    return lot;
  };

  // Buildings behind each place's signpost.
  for (const p of PLACES) {
    const art = PLACE_ART[p.id];
    const def = art && building(art.def);
    if (!def) continue;
    const d = DISTRICTS.find((x) => x.id === p.district);
    if (!d) continue;
    const w = def.cells[0] * CELL.w - GAP.w;
    const h = Math.min(78, def.cells[1] * CELL.h - GAP.h);
    for (const dx of [0, -50, 50, -100, 100]) {
      const r = { x: Math.round(p.x - w / 2 + dx), y: p.y - 62 - h, w, h };
      const others = placeBoxes.filter((b) => !(b.x === p.x - 92 && b.y === p.y - 60));
      if (inDistrict(r, d) && roadClear(r) && lakeClear(r) && !others.some((b) => overlaps(r, b)) && !taken.some((t) => overlaps(r, t, 6))) {
        const lot = make(def, r, d.id, hash(p.id), p.id);
        (lot as Lot & { label?: string }).label = art.label;
        break;
      }
    }
    if (homeIds.has(p.id)) placeBoxes.push({ x: p.x - 100, y: p.y - 150, w: 200, h: 240 });
  }

  // Landmarks and utilities: the nearest free spot to where they'd like to be.
  const anywhere = (r: MapRect) => r.x >= 12 && r.y >= 40 && r.x + r.w <= WORLD.width - 12 && roadClear(r) && lakeClear(r) && railClear(r) && !placeBoxes.some((b) => overlaps(r, b)) && !taken.some((t) => overlaps(r, t, 8));
  for (const f of FIXED) {
    const def = building(f.def)!;
    const w = def.cells[0] * CELL.w - GAP.w;
    const h = def.cells[1] * CELL.h - GAP.h;
    const d0 = DISTRICTS.find((x) => x.id === f.district)!;
    const at = f.near ?? { x: d0.x + d0.w / 2, y: d0.y + d0.h / 2 };
    let best: MapRect | null = null;
    let bestD = 420;
    for (let x = Math.max(12, at.x - 420); x + w <= Math.min(WORLD.width - 12, at.x + 420); x += 8) {
      for (let y = Math.max(40, at.y - 420); y + h <= Math.min(WORLD.height - 12, at.y + 420); y += 8) {
        const r = { x, y, w, h };
        const dist = Math.hypot(x + w / 2 - at.x, y + h / 2 - at.y);
        if (dist < bestD && anywhere(r)) {
          best = r;
          bestD = dist;
        }
      }
    }
    if (best) make(def, best, districtOf(best.x + best.w / 2, best.y + best.h / 2), hash(`${f.def}${f.district}`));
  }

  // Everything else: plots in rows inside every city block (the land between the main roads), zoned in clusters.
  const spans = (cuts: number[], size: number) => {
    const edges = [0, ...cuts.flatMap((c) => [c - 44, c + 44]), size];
    const out: [number, number][] = [];
    for (let i = 0; i < edges.length; i += 2) if (edges[i + 1]! - edges[i]! > 90) out.push([edges[i]!, edges[i + 1]!]);
    return out;
  };
  for (const [x0, x1] of spans(ROADS.xs, WORLD.width)) {
    for (const [y0, y1] of spans(ROADS.ys, WORLD.height)) {
      const cols = Math.floor((x1 - x0 - 8) / CELL.w);
      const rows = Math.floor((y1 - y0 - 8) / CELL.h);
      const ox = x0 + (x1 - x0 - cols * CELL.w) / 2 + GAP.w / 2;
      const oy = y0 + (y1 - y0 - rows * CELL.h) / 2 + GAP.h / 2;
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const x = Math.round(ox + gx * CELL.w);
          const y = Math.round(oy + gy * CELL.h);
          const d = districtOf(x + CELL.w / 2, y + CELL.h / 2);
          const mix = DISTRICT_ZONES[d] ?? { residential: 1 };
          // A zone per 2×2 block of plots, so neighbourhoods hang together.
          const zr = rng(hash(`${d}:${Math.floor(x / 200)}:${Math.floor(y / 190)}`));
          const zone = weighted(zr, mix);
          const r = rng(hash(`${d}:${x}:${y}`));
          if (r() < 0.1) continue; // open plots
          const options = DISTRICT_KINDS[d]?.[zone] ?? ZONE_DEFAULT[zone];
          const pickDef = building(options[Math.floor(r() * options.length)]!) ?? building("small_house")!;
          const tryDefs = [pickDef, ...options.map((id) => building(id)!).filter((b) => b.cells[0] === 1 && b.cells[1] === 1)];
          for (const def of tryDefs) {
            const rect = { x, y, w: def.cells[0] * CELL.w - GAP.w, h: def.cells[1] * CELL.h - GAP.h };
            if (rect.x + rect.w <= x1 && rect.y + rect.h <= y1 && anywhere(rect)) {
              make(def, rect, d, hash(`${d}${x}${y}`));
              break;
            }
          }
        }
      }
    }
  }
  cache = lots;
  return lots;
}

/** The solid part of each lot: the footprint of its building. */
export function lotSolids(): MapRect[] {
  return cityLots()
    .filter((l) => l.solid)
    .map((l) => ({ x: l.x, y: l.y + l.h * 0.3, w: l.w, h: l.h * 0.7 }));
}

export const lotDef = (l: Lot) => building(l.def)!;
export const lotLabel = (l: Lot) => (l as Lot & { label?: string }).label;

/** The lot at a point (for taps and the map). */
export function lotAt(x: number, y: number): Lot | undefined {
  return cityLots().find((l) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h);
}

/** Where you stand to use a building: the middle of its front. */
export const lotDoor = (l: Lot) => ({ x: l.x + l.w / 2, y: l.y + l.h + 10 });

export { BUILDINGS };
