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
// The grid follows Abuja's main roads, simplified: the Kubwa Expressway (the
// pair at x 1100/1200) down the west, the Airport Road – Nnamdi Azikiwe –
// Keffi Road expressway (the pair at y 1900/2000) across the middle, and the
// avenues in between.
export const ROADS = { xs: [550, 1100, 1200, 2000, 2700, 3400, 4100, 4450], ys: [700, 1300, 1900, 2000, 2600, 3100] };
/** Road names for street signs, by line. */
export const ROAD_NAMES: Record<string, string> = {
  x550: "Gado Nasko Road", x1100: "Kubwa Expressway", x1200: "Kubwa Expressway", x2000: "Ahmadu Bello Way", x2700: "Shehu Shagari Way", x3400: "Constitution Ave", x4100: "Keffi Road", x4450: "Karu Road",
  y700: "Outer Northern Expressway", y1300: "Aminu Kano Cres", y1900: "Airport Road Expressway", y2000: "Nnamdi Azikiwe Expressway", y2600: "Ring Road I", y3100: "Ring Road II",
};
export const LAKE = { x: 1450, y: 1600, rx: 160, ry: 115 };
/** The light rail along the south edge, and its station in Garki. */
export const RAIL = { y: 3572, station: { x: 2525, y: 3572 } };

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
  kubwa: { residential: 7, commercial: 2, park: 2 },
  deidei: { commercial: 4, industrial: 4, residential: 3 },
  lugbe: { industrial: 5, residential: 5, service: 1 },
  gwarinpa: { residential: 8, commercial: 1, park: 1, service: 1 },
  jabi: { commercial: 4, residential: 3, park: 3 },
  wuye: { residential: 5, commercial: 3, civic: 2 },
  lokogoma: { residential: 7, commercial: 1, park: 1, industrial: 1 },
  katampe: { residential: 8, park: 2 },
  maitama: { residential: 5, civic: 3, park: 2 },
  utako: { commercial: 6, residential: 2, service: 1 },
  mpape: { residential: 8, commercial: 2 },
  wuse: { commercial: 6, residential: 3, service: 1 },
  cbd: { commercial: 6, civic: 4, park: 1 },
  garki: { civic: 3, commercial: 3, residential: 3, service: 1 },
  apo: { residential: 5, industrial: 3, commercial: 2 },
  threearms: { civic: 8, park: 3 },
  asokoro: { residential: 6, civic: 3, park: 1 },
  guzape: { residential: 8, park: 2 },
  karu: { residential: 7, commercial: 3 },
  nyanya: { residential: 6, commercial: 2, industrial: 2 },
};

/** Which buildings suit a zone in a district (more copies = more often). Missing: the zone's defaults. */
const DISTRICT_KINDS: Record<string, Partial<Record<Zone, string[]>>> = {
  kubwa: { residential: ["small_house", "small_house", "apartments", "big_house", "townhouse"], commercial: ["shop", "restaurant", "shop"], park: ["farm", "park"] },
  deidei: { commercial: ["shop", "shop", "supermarket", "restaurant"], industrial: ["warehouse", "construction_yard", "logistics", "warehouse"], residential: ["small_house", "small_house", "apartments"] },
  lugbe: { industrial: ["factory", "warehouse", "processing_plant", "logistics", "construction_yard"], residential: ["small_house", "small_house", "apartments", "townhouse"], service: ["substation", "waste_depot"] },
  gwarinpa: { residential: ["duplex", "duplex", "townhouse", "big_house", "apartments"], commercial: ["shop", "supermarket", "restaurant"], park: ["playground", "park"], service: ["water_tower", "school"] },
  jabi: { commercial: ["restaurant", "cafe", "office", "shop", "hotel"], residential: ["highrise_apts", "apartments", "townhouse"], park: ["park", "playground"] },
  wuye: { residential: ["townhouse", "apartments", "duplex"], commercial: ["shop", "office", "cafe"], civic: ["school", "clinic", "community"] },
  lokogoma: { residential: ["duplex", "townhouse", "small_house", "apartments"], commercial: ["shop", "supermarket"], industrial: ["construction_yard"] },
  katampe: { residential: ["villa", "villa", "big_house"], park: ["park"] },
  maitama: { residential: ["villa", "big_house", "big_house", "highrise_apts"], civic: ["government", "library"], park: ["park"] },
  utako: { commercial: ["office", "shop", "supermarket", "restaurant", "hotel"], residential: ["apartments", "townhouse"], service: ["substation"] },
  mpape: { residential: ["small_house", "small_house", "small_house", "apartments"], commercial: ["shop", "shop", "restaurant"] },
  wuse: { commercial: ["shop", "restaurant", "office", "cafe", "supermarket", "cinema", "shop", "hotel"], residential: ["apartments", "apartments", "townhouse"], service: ["substation", "clinic"] },
  cbd: { commercial: ["business_tower", "business_tower", "office", "office", "hotel", "mall"], civic: ["government", "government", "library"], park: ["park"] },
  garki: { civic: ["clinic", "school", "library", "community"], commercial: ["shop", "office", "restaurant", "cafe"], residential: ["apartments", "townhouse", "big_house"], service: ["fire_station", "substation"] },
  apo: { residential: ["small_house", "apartments", "townhouse"], industrial: ["construction_yard", "warehouse"], commercial: ["shop", "restaurant"] },
  threearms: { civic: ["government", "government", "government", "library"], park: ["park"] },
  asokoro: { residential: ["villa", "big_house", "duplex", "highrise_apts"], civic: ["government", "community", "library"], park: ["park", "playground"] },
  guzape: { residential: ["villa", "villa", "big_house", "duplex"], park: ["park"] },
  karu: { residential: ["small_house", "small_house", "apartments"], commercial: ["shop", "shop", "restaurant"] },
  nyanya: { residential: ["small_house", "small_house", "small_house", "apartments", "townhouse"], commercial: ["shop", "restaurant", "shop"], industrial: ["warehouse", "factory", "warehouse", "construction_yard"] },
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
  { def: "stadium", district: "lugbe", near: { x: 852, y: 3211 } },
  { def: "skyscraper", district: "cbd", near: { x: 3244, y: 2040 } },
  { def: "mosque", district: "cbd", near: { x: 2467, y: 2012 } },
  { def: "church", district: "cbd", near: { x: 3167, y: 2516 } },
  { def: "museum", district: "garki", near: { x: 2450, y: 3175 } },
  { def: "monument", district: "maitama", near: { x: 2700, y: 1204 } },
  { def: "hospital_bld", district: "garki", near: { x: 2100, y: 3475 } },
  { def: "power_plant", district: "nyanya", near: { x: 4722, y: 3343 } },
  { def: "solar_farm", district: "lugbe", near: { x: 138, y: 3406 } },
  { def: "water_tower", district: "kubwa", near: { x: 176, y: 312 } },
  { def: "water_tower", district: "nyanya", near: { x: 4722, y: 2006 } },
  { def: "water_tower", district: "asokoro", near: { x: 4012, y: 1560 } },
  { def: "waste_depot", district: "nyanya", near: { x: 4256, y: 3394 } },
  { def: "school", district: "nyanya", near: { x: 4567, y: 3189 } },
  { def: "school", district: "kubwa", near: { x: 264, y: 1092 } },
  { def: "fire_station", district: "cbd", near: { x: 2311, y: 2558 } },
  { def: "police", district: "nyanya", near: { x: 4256, y: 2700 } },
  { def: "substation", district: "gwarinpa", near: { x: 1910, y: 312 } },
  { def: "substation", district: "maitama", near: { x: 3283, y: 844 } },
  { def: "logistics", district: "lugbe", near: { x: 165, y: 2021 } },
  { def: "community", district: "kubwa", near: { x: 924, y: 312 } },
  { def: "clinic", district: "nyanya", near: { x: 4722, y: 2700 } },
  // The new districts' landmarks.
  { def: "government", district: "threearms", near: { x: 3750, y: 650 } },
  { def: "government", district: "threearms", near: { x: 3600, y: 1100 } },
  { def: "monument", district: "threearms", near: { x: 3900, y: 200 } },
  { def: "mosque", district: "mpape", near: { x: 3050, y: 500 } },
  { def: "church", district: "karu", near: { x: 4300, y: 900 } },
  { def: "school", district: "karu", near: { x: 4600, y: 1500 } },
  { def: "clinic", district: "mpape", near: { x: 2850, y: 200 } },
  { def: "school", district: "lokogoma", near: { x: 1650, y: 3300 } },
  { def: "police", district: "apo", near: { x: 3200, y: 2800 } },
  { def: "water_tower", district: "lokogoma", near: { x: 1250, y: 3450 } },
  { def: "substation", district: "deidei", near: { x: 300, y: 1450 } },
  { def: "mall", district: "utako", near: { x: 2200, y: 1500 } },
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
  // The signpost itself is narrow; its doormat and name need a wider strip below.
  const placeBoxes: MapRect[] = PLACES.flatMap((p) => [
    { x: p.x - 34, y: p.y - 56, w: 68, h: 60 },
    { x: p.x - 86, y: p.y - 4, w: 172, h: 76 },
  ]);
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
      const others = placeBoxes.filter((b) => !(b.x === p.x - 34 && b.y === p.y - 56) && !(b.x === p.x - 86 && b.y === p.y - 4));
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
          if (r() < 0.06) continue; // open plots
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
  // Then small plots in the gaps: a bungalow, a kiosk-shop or a pocket park where a big plot won't fit.
  const SMALL: Record<Zone, string[]> = { ...ZONE_DEFAULT, residential: ["small_house"], commercial: ["shop", "cafe"], civic: ["park"], service: ["park"], industrial: ["construction_yard"], park: ["park", "playground"] };
  const S = { w: 64, h: 56 };
  for (let y = 44; y + S.h < WORLD.height; y += S.h + 18) {
    for (let x = 14; x + S.w < WORLD.width; x += S.w + 14) {
      const rect = { x, y, w: S.w, h: S.h };
      if (!anywhere(rect)) continue;
      const d = districtOf(x + S.w / 2, y + S.h / 2);
      const r = rng(hash(`s${d}:${x}:${y}`));
      if (r() < 0.35) continue;
      const zone = weighted(rng(hash(`${d}:${Math.floor(x / 200)}:${Math.floor(y / 190)}`)), DISTRICT_ZONES[d] ?? { residential: 1 });
      const options = SMALL[zone];
      const def = building(options[Math.floor(r() * options.length)] ?? "park") ?? building("park")!;
      make(def, rect, d, hash(`s${d}${x}${y}`));
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
