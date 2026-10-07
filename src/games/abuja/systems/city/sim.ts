import type { GameState } from "../types";
import { BUILDINGS, building, type BuildingDef, type Service, type Zone } from "./catalog";
import { cityLots, type Lot } from "./layout";

// The city as a system. Utilities reach buildings within range of a power
// substation, a water tower and a waste depot; industry dirties the air
// nearby; parks and landmarks make an area nicer. All of that moves property
// values and rents, and decides whether a building can open. You can buy
// property, collect rent, upgrade it, and redevelop it into another building
// of the same zone.

/** What you've changed in the city: what you own, upgrades and rebuilds. Missing in older saves. */
export type CityState = {
  lots: Record<string, { def?: string; level: number; owned: boolean; bought?: number; price?: number }>;
  /** Rent collected so far, for the Life app. */
  rentTotal: number;
};

export function cityState(s: GameState): CityState {
  s.city ??= { lots: {}, rentTotal: 0 };
  return s.city;
}

/** The lots with your changes applied. */
let lotsMemo: { key: string; lots: Lot[] } | null = null;

export function lotsFor(s: GameState | null): Lot[] {
  const over = s?.city?.lots ?? {};
  const key = JSON.stringify(over);
  if (lotsMemo?.key === key) return lotsMemo.lots;
  const lots = cityLots().map((l) => {
    const o = over[l.id];
    if (!o?.def || o.def === l.def) return l;
    const def = building(o.def)!;
    return { ...l, def: o.def, floors: def.floors[1], palette: 0 };
  });
  lotsMemo = { key, lots };
  return lots;
}

export type LotInfo = {
  lot: Lot;
  def: BuildingDef;
  level: number;
  owned: boolean;
  open: boolean;
  power: boolean;
  water: boolean;
  waste: boolean;
  services: Service[];
  /** 0–10. */
  pollution: number;
  attract: number;
  residents: number;
  jobs: number;
  visitors: number;
  value: number;
  /** Weekly rent if you own and let it (residential and commercial). */
  rent: number;
  revenue: number;
  costs: number;
  /** One-line verdict on the area. */
  area: string;
};

const SERVICES: Service[] = ["power", "water", "waste", "health", "safety", "fire", "education", "culture", "transit"];

type Grid = { supply: number; demand: number; outage: number };

let gridCache: { key: string; grid: Grid } | null = null;

/** Power supply against demand: if the city uses more than it makes, there are outages. */
export function powerGrid(s: GameState | null): Grid {
  const lots = lotsFor(s);
  const key = lots.map((l) => l.def).join(",");
  if (gridCache?.key === key) return gridCache.grid;
  let supply = 0;
  let demand = 0;
  for (const l of lots) {
    const d = building(l.def)!;
    for (const p of d.provides ?? []) if (p.service === "power") supply += p.amount ?? 0;
    demand += d.power;
  }
  const grid = { supply, demand, outage: demand > supply ? Math.min(0.8, (demand - supply) / demand) : 0 };
  gridCache = { key, grid };
  return grid;
}

const dist = (a: Lot, b: Lot) => Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));

/** Everything about one building right now. */
export function lotInfo(s: GameState | null, id: string): LotInfo | null {
  const lots = lotsFor(s);
  const lot = lots.find((l) => l.id === id);
  if (!lot) return null;
  const def = building(lot.def)!;
  const own = s?.city?.lots[id];
  const level = own?.level ?? 1;
  const reach = new Set<Service>();
  let pollution = 0;
  let attract = 0;
  for (const other of lots) {
    const od = building(other.def)!;
    const d = dist(lot, other);
    for (const p of od.provides ?? []) if (d <= p.radius) reach.add(p.service);
    if (other !== lot && od.pollution) pollution += od.pollution * 0.55 * Math.max(0, 1 - d / 420);
    if (od.attract) attract += od.attract * 0.6 * Math.max(0, 1 - d / 520);
  }
  pollution = Math.min(10, pollution + (def.pollution ?? 0) * 0.5);
  attract = Math.min(10, attract);
  const grid = powerGrid(s);
  // The grid drops some areas at night when demand is high.
  const blackout = grid.outage > 0 && ((lot.seed % 100) / 100 < grid.outage) && (s?.slot ?? 0) >= 2;
  const power = def.power === 0 || (reach.has("power") && !blackout);
  const water = def.water === 0 || reach.has("water");
  const waste = reach.has("waste");
  const services = SERVICES.filter((x) => reach.has(x));
  const slot = Math.min(3, s?.slot ?? 0);
  const open = def.hours ? slot >= def.hours[0] && slot <= def.hours[1] && (power || def.category === "park") : true;
  const floors = lot.floors;
  const residents = Math.round((def.residents ?? 0) * floors * (1 + (level - 1) * 0.3));
  const jobs = Math.round((def.jobs ?? 0) * (1 + (level - 1) * 0.25));
  const busy = [0.7, 1, 1.2, 0.5][slot]!;
  const visitors = open ? Math.round((def.visitors ?? 0) * busy * (1 + attract * 0.05)) : 0;
  const inflation = 1 + 0.12 * ((s?.day ?? 0) / 28);
  const bonus = 1 + attract * 0.035 - pollution * 0.035 + services.length * 0.015 - (power ? 0 : 0.12) - (water ? 0 : 0.12) - (waste ? 0 : 0.05);
  const value = def.value ? Math.round((def.value * (1 + (level - 1) * 0.18) * Math.max(0.4, bonus) * inflation) / 10000) * 10000 : 0;
  const rent = def.category === "residential" || def.category === "commercial" ? Math.round((value * 0.0016) / 500) * 500 : 0;
  const revenue = Math.round((def.revenue ?? 0) * (1 + (level - 1) * 0.3) * Math.max(0.5, 1 + attract * 0.04) * (power ? 1 : 0.6));
  const costs = Math.round((def.costs ?? 0) * (1 + (level - 1) * 0.2));
  const area =
    pollution >= 5
      ? "Smoky and noisy: industry nearby."
      : attract >= 5
        ? "A sought-after area: parks and landmarks nearby."
        : !power
          ? "No reliable power here right now."
          : !water
            ? "No mains water: residents buy from water vendors."
            : services.includes("health") && services.includes("safety")
              ? "Well served: clinics and police close by."
              : "An ordinary part of town.";
  return { lot, def, level, owned: Boolean(own?.owned), open, power, water, waste, services, pollution: +pollution.toFixed(1), attract: +attract.toFixed(1), residents, jobs, visitors, value, rent, revenue, costs, area };
}

// ── Owning property ─────────────────────────────────────────────────────────

export function buyLot(s: GameState, id: string): string {
  const info = lotInfo(s, id);
  if (!info) return "";
  if (!info.def.forSale) return "That isn't for sale.";
  if (info.owned) return "You already own it.";
  if (info.lot.place) return "That one isn't for sale.";
  if (s.stats.money < info.value) return `It costs ₦${info.value.toLocaleString("en")}.`;
  s.stats.money -= info.value;
  const c = cityState(s);
  c.lots[id] = { ...(c.lots[id] ?? { level: 1 }), owned: true, bought: s.day, price: info.value };
  return `🔑 You bought the ${info.def.name.toLowerCase()} for ₦${info.value.toLocaleString("en")}. Tenants pay about ₦${info.rent.toLocaleString("en")} a week.`;
}

export function sellLot(s: GameState, id: string): string {
  const info = lotInfo(s, id);
  if (!info?.owned) return "";
  const price = Math.round(info.value * 0.92);
  s.stats.money += price;
  const c = cityState(s);
  c.lots[id] = { ...c.lots[id]!, owned: false };
  return `You sold the ${info.def.name.toLowerCase()} for ₦${price.toLocaleString("en")} (after agent fees).`;
}

export const upgradeCost = (info: LotInfo) => Math.round((info.value * 0.22) / 10000) * 10000;

export function upgradeLot(s: GameState, id: string): string {
  const info = lotInfo(s, id);
  if (!info?.owned) return "";
  const max = info.def.levels ?? 1;
  if (info.level >= max + 1) return "It's as good as it gets.";
  const cost = upgradeCost(info);
  if (s.stats.money < cost) return `The upgrade costs ₦${cost.toLocaleString("en")}.`;
  s.stats.money -= cost;
  cityState(s).lots[id]!.level = info.level + 1;
  return `🛠️ Renovated: new finishes, a borehole and solar backup. It's now level ${info.level + 1}, worth more and earning more.`;
}

/** Buildings you could put on this plot instead: same zone, same size. */
export function redevelopOptions(s: GameState, id: string): BuildingDef[] {
  const info = lotInfo(s, id);
  if (!info?.owned) return [];
  return BUILDINGS.filter((b) => b.zone === info.def.zone && b.id !== info.def.id && b.cells[0] === info.def.cells[0] && b.cells[1] === info.def.cells[1] && b.category !== "landmark" && b.category !== "utility");
}

export const redevelopCost = (def: BuildingDef, day: number) => Math.round((def.value * 0.65 * (1 + 0.12 * (day / 28))) / 10000) * 10000;

export function redevelop(s: GameState, id: string, defId: string): string {
  const opt = redevelopOptions(s, id).find((b) => b.id === defId);
  if (!opt) return "";
  const cost = redevelopCost(opt, s.day);
  if (s.stats.money < cost) return `Building it costs ₦${cost.toLocaleString("en")}.`;
  s.stats.money -= cost;
  const c = cityState(s);
  c.lots[id] = { ...c.lots[id]!, def: opt.id, level: 1 };
  return `🏗️ The old building comes down and a new ${opt.name.toLowerCase()} goes up. ₦${cost.toLocaleString("en")}.`;
}

/** Weekly: rent from everything you own, less upkeep. */
export function weeklyRent(s: GameState): string[] {
  const c = s.city;
  if (!c) return [];
  let rent = 0;
  let upkeep = 0;
  let count = 0;
  for (const [id, o] of Object.entries(c.lots)) {
    if (!o.owned) continue;
    const info = lotInfo(s, id);
    if (!info) continue;
    count += 1;
    // Tenants pay less where there's no power or water, and some weeks a unit stands empty.
    const occupancy = Math.max(0.4, Math.min(1, 0.85 + info.attract * 0.03 - info.pollution * 0.03 - (info.power ? 0 : 0.15) - (info.water ? 0 : 0.1)));
    rent += Math.round(info.rent * occupancy);
    upkeep += Math.round(info.value * 0.0003);
  }
  if (!count) return [];
  s.stats.money += rent - upkeep;
  c.rentTotal += rent;
  return [`🔑 Your ${count} propert${count > 1 ? "ies" : "y"}: ₦${rent.toLocaleString("en")} rent in, ₦${upkeep.toLocaleString("en")} upkeep.`];
}

/** City-wide numbers for the map and the Life app. */
export function cityStats(s: GameState | null) {
  const lots = lotsFor(s);
  const by: Partial<Record<Zone, number>> = {};
  let residents = 0;
  let jobs = 0;
  for (const l of lots) {
    const d = building(l.def)!;
    by[d.zone] = (by[d.zone] ?? 0) + 1;
    residents += (d.residents ?? 0) * l.floors;
    jobs += d.jobs ?? 0;
  }
  const grid = powerGrid(s);
  return { lots: lots.length, by, residents, jobs, power: grid };
}
