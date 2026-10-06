import type { GameState } from "../types";
import { equipment, stats } from "./equipment";
import { ingredient, INGREDIENTS, TIERS } from "./ingredients";
import { RECIPES } from "./recipes";
import type { Dish, EquipTier, IngredientDef, Kitchen, Lot, MarketEvent, Owned, SkillId, Storage, Tier } from "./types";

// Your kitchen: what you own, what's in the cupboards, how clean it is and
// what you know. Saves from before cooking existed get a kitchen that fits
// how you live (a kerosene stove in Nyanya, a gas cooker and fridge in
// Gwarinpa) the first time it's needed.

export const SKILLS: Record<SkillId, string> = {
  cooking: "Cooking",
  baking: "Baking",
  knife: "Knife skills",
  seasoning: "Seasoning",
  grilling: "Grilling",
  presentation: "Presentation",
  creation: "Recipe creation",
  management: "Kitchen management",
  nutrition: "Nutrition",
  safety: "Food safety",
};

let uidCounter = 0;
export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export function own(def: string, tier: EquipTier = "basic"): Owned {
  return { uid: uid("e"), def, tier, condition: 100, clean: 100, broken: false };
}

function starterKit(s: GameState): Owned[] {
  const base = ["knife", "cutting_board", "pot", "wooden_spoon", "mixing_bowl", "frying_pan", "mortar", "kettle"];
  if (s.background === "lapo") return [own("kerosene_stove"), ...base.map((d) => own(d))];
  return [own("gas_cooker"), own("fridge"), own("blender"), own("saucepan"), own("cabinets"), own("dining_table"), ...base.map((d) => own(d))];
}

export function kitchen(s: GameState): Kitchen {
  if (!s.kitchen) {
    const recipes: Kitchen["recipes"] = {};
    for (const r of RECIPES) if (r.source === "basic") recipes[r.id] = { level: "known", cooked: 0, best: 0, total: 0 };
    s.kitchen = {
      version: 1,
      equipment: starterKit(s),
      pantry: [],
      leftovers: [],
      clean: 80,
      skills: { cooking: 10, baking: 3, knife: 8, seasoning: 8, grilling: 5, presentation: 3, creation: 3, management: 0, nutrition: 5, safety: 5 },
      recipes,
      customs: [],
      favorites: [],
      garden: Array.from({ length: s.background === "lapo" ? 2 : 3 }, () => ({ crop: null, planted: 0, watered: 0, growth: 0 })),
      waste: [],
      market: [],
      utilities: 0,
      venues: [],
      catering: [],
      events: [],
      fans: {},
    };
    // A starter cupboard so you can cook on day one.
    for (const [id, qty] of [["rice", 4], ["tomato", 3], ["onion", 3], ["pepper", 2], ["veg_oil", 3], ["salt", 5], ["stock", 4], ["eggs", 4], ["noodles", 2], ["cassava_flour", 3], ["tea", 2], ["sugar", 3], ["powdered_milk", 2], ["beans", 2]] as const) {
      addLot(s, s.kitchen.pantry, s.kitchen.equipment, id, "standard", qty, null);
    }
  }
  return s.kitchen;
}

/** Read-only for the UI: the kitchen if it exists. */
export const kitchenOf = (s: GameState): Kitchen | null => s.kitchen ?? null;

// ── Storage ──────────────────────────────────────────────────────────────────

const BASE_SPACE: Record<Storage, number> = { pantry: 15, fridge: 0, freezer: 0 };

export function capacity(kit: Owned[], storage: Storage, base = true): number {
  let total = base ? BASE_SPACE[storage] : 0;
  for (const o of kit) {
    const def = equipment(o.def);
    if (!def || o.broken || def.storage !== storage) continue;
    total += stats(o.def, o.tier)?.capacity ?? 0;
  }
  // A fridge-freezer: home fridges have a small freezer compartment.
  if (storage === "freezer") for (const o of kit) if (o.def === "fridge" && !o.broken) total += 5;
  return total;
}

export function used(lots: Lot[], storage: Storage): number {
  return lots.filter((l) => l.storage === storage).reduce((sum, l) => sum + l.qty * (ingredient(l.ing)?.space ?? 1), 0);
}

function shelfLife(def: IngredientDef, storage: Storage): number {
  return def.keeps[storage] ?? (storage === "pantry" ? 1 : (def.keeps.fridge ?? def.keeps.pantry ?? 1));
}

/** Best place with room: the item's ideal storage, then the fridge, then the counter. */
function placeFor(lots: Lot[], kit: Owned[], def: IngredientDef, qty: number): Storage {
  const fits = (st: Storage) => def.keeps[st] != null && used(lots, st) + qty * def.space <= capacity(kit, st);
  if (fits(def.store)) return def.store;
  if (def.store === "freezer" && fits("fridge")) return "fridge";
  if (def.store !== "pantry" && fits("fridge")) return "fridge";
  return "pantry";
}

export function rollQuality(tier: Tier): number {
  const [lo, hi] = TIERS[tier].quality;
  return Math.round(lo + Math.random() * (hi - lo));
}

/** Put a batch away. Returns where it went. */
export function addLot(s: GameState, lots: Lot[], kit: Owned[], id: string, tier: Tier, qty: number, quality: number | null, freshness = 1): Storage {
  const def = ingredient(id);
  if (!def) return "pantry";
  const storage = placeFor(lots, kit, def, qty);
  const life = shelfLife(def, storage);
  lots.push({ id: uid("l"), ing: id, tier, qty, quality: quality ?? rollQuality(tier), bought: s.day, expires: s.day + Math.max(0.5, life * freshness), storage });
  return storage;
}

/** 0–1: how fresh a batch still is. */
export function freshness(l: Lot, day: number): number {
  const def = ingredient(l.ing);
  if (!def) return 0;
  const life = shelfLife(def, l.storage);
  return Math.max(0, Math.min(1, (l.expires - day) / life));
}

/** Quality you actually get from a batch today. */
export function effective(l: Lot, day: number): number {
  return l.quality * (0.6 + 0.4 * freshness(l, day));
}

/** Move a batch to other storage (freeze meat, chill vegetables). */
export function moveLot(s: GameState, lots: Lot[], kit: Owned[], id: string, to: Storage): string {
  const l = lots.find((x) => x.id === id);
  const def = l && ingredient(l.ing);
  if (!l || !def) return "";
  if (def.keeps[to] == null) return `${def.name} doesn't keep in the ${to}.`;
  if (used(lots, to) + l.qty * def.space > capacity(kit, to)) return `No room in the ${to}.`;
  const left = freshness(l, s.day);
  l.storage = to;
  l.expires = s.day + Math.max(0.5, shelfLife(def, to) * left);
  if (to === "freezer") l.quality = Math.max(0, l.quality - 3);
  return `${def.name} moved to the ${to}.`;
}

/** Each night: spoiled food goes in the bin. Returns what was thrown away. */
export function spoil(s: GameState, lots: Lot[], dishes: Dish[] | null, log: Kitchen["waste"]): string[] {
  const out: string[] = [];
  const gone = lots.filter((l) => l.expires <= s.day);
  for (const l of gone) {
    const def = ingredient(l.ing);
    log.push({ day: s.day, what: `${l.qty} × ${def?.name ?? l.ing} (spoiled)`, value: Math.round((def?.price ?? 0) * l.qty) });
    out.push(`${def?.name ?? l.ing}`);
  }
  lots.splice(0, lots.length, ...lots.filter((l) => l.expires > s.day));
  if (dishes) {
    const off = dishes.filter((d) => d.expires <= s.day);
    for (const d of off) log.push({ day: s.day, what: `${d.portions} × ${d.name} (leftovers went off)`, value: 0 });
    out.push(...off.map((d) => `leftover ${d.name.toLowerCase()}`));
    dishes.splice(0, dishes.length, ...dishes.filter((d) => d.expires > s.day));
  }
  if (log.length > 60) log.splice(0, log.length - 60);
  return out;
}

/** Take ingredients for a recipe from storage: freshest-expiring first unless told otherwise. */
export function take(lots: Lot[], id: string, qty: number, prefer?: Tier): Lot[] {
  const matches = lots
    .filter((l) => (id.startsWith("any:") ? ingredient(l.ing)?.cat === id.slice(4) : l.ing === id) && l.qty > 0)
    .sort((a, b) => (prefer ? Number(b.tier === prefer) - Number(a.tier === prefer) : 0) || a.expires - b.expires);
  const takenLots: Lot[] = [];
  let need = qty;
  for (const l of matches) {
    if (need <= 0) break;
    const n = Math.min(need, l.qty);
    l.qty -= n;
    need -= n;
    takenLots.push({ ...l, qty: n });
  }
  lots.splice(0, lots.length, ...lots.filter((l) => l.qty > 0));
  return need > 0 ? [] : takenLots;
}

export function have(lots: Lot[], id: string, qty: number): number {
  const total = lots.filter((l) => (id.startsWith("any:") ? ingredient(l.ing)?.cat === id.slice(4) : l.ing === id)).reduce((sum, l) => sum + l.qty, 0);
  return Math.min(total, qty);
}

// ── Markets and prices ───────────────────────────────────────────────────────

export type Source = {
  id: string;
  name: string;
  place: string;
  tiers: Tier[];
  mult: number;
  /** Delivery fee if they bring it to you. */
  fee: number;
  /** Only local produce, or everything. */
  localOnly: boolean;
  blurb: string;
};

export const SOURCES: Source[] = [
  { id: "wuse", name: "Wuse Market", place: "wuse_market", tiers: ["cheap", "standard"], mult: 1, fee: 0, localOnly: false, blurb: "Everything, everywhere. Haggle and check the tomatoes." },
  { id: "kubwa", name: "Kubwa Village Market", place: "kubwa_market", tiers: ["cheap", "standard"], mult: 0.88, fee: 0, localOnly: true, blurb: "Farm produce straight from the villages. Cheapest local food." },
  { id: "shoprite", name: "Shoprite, Jabi Lake Mall", place: "jabi_mall", tiers: ["standard", "premium"], mult: 1.25, fee: 0, localOnly: false, blurb: "Imported goods, premium cuts, air conditioning." },
  { id: "sani", name: "Alhaji Sani (wholesale)", place: "kubwa_market", tiers: ["cheap", "standard", "premium"], mult: 0.85, fee: 0, localOnly: false, blurb: "Wholesale for food businesses, delivered to your kitchen. Negotiate a supplier deal for discounts." },
  { id: "chopnow", name: "ChopNow Mart (delivery)", place: "", tiers: ["standard", "premium"], mult: 1.15, fee: 700, localOnly: false, blurb: "Groceries to your door. A bit dearer." },
];

const MONTH = (day: number) => (Math.floor(day / 2.3) % 12) + 1;

export function inSeason(def: IngredientDef, day: number): boolean | null {
  if (!def.season?.length) return null;
  return def.season.includes(MONTH(day));
}

/** Food prices creep up about 12% every four weeks. */
export const inflationAt = (day: number) => 1 + 0.12 * (day / 28);

/** What one portion costs today at a source and tier. */
export function price(s: GameState, id: string, tier: Tier, source: Source): number {
  const def = ingredient(id);
  if (!def || tier === "homegrown") return 0;
  const usd = s.market?.prices.USDNGN ?? 1550;
  const agro = s.market?.prices.AGRO ?? 95;
  const inflation = inflationAt(s.day);
  const econ = def.origin === "imported" ? usd / 1550 : 0.85 + 0.15 * (agro / 95);
  const season = inSeason(def, s.day);
  const seasonal = season === null ? 1 : season ? 0.8 : 1.25;
  let event = 1;
  for (const e of s.kitchen?.market ?? []) if (e.until >= s.day) event *= e.mult[id] ?? e.mult[`cat:${def.cat}`] ?? e.mult.all ?? 1;
  const supplier = source.id === "sani" && s.life?.neg?.supplier && s.life.neg.supplier.until >= s.day ? 1 - s.life.neg.supplier.discount : 1;
  return Math.max(10, Math.round(def.price * TIERS[tier].price * source.mult * inflation * econ * seasonal * event * supplier / 10) * 10);
}

export function sells(source: Source, def: IngredientDef): boolean {
  return !source.localOnly || def.origin === "local";
}

const EVENTS: Omit<MarketEvent, "until">[] = [
  { id: "tomato", text: "Tomato scarcity: a pest wiped out farms in the North. Tomatoes cost twice as much.", mult: { tomato: 2.2, tomato_paste: 1.3 } },
  { id: "fish", text: "Fishing shortage: fish and prawns are scarce.", mult: { fish: 1.6, catfish: 1.5, prawns: 1.7, dried_fish: 1.3 } },
  { id: "yam", text: "Bumper yam harvest: yam is cheap this week.", mult: { yam: 0.65, pounded_yam: 0.8 } },
  { id: "rice", text: "Rice import restrictions: rice prices jump.", mult: { rice: 1.4, basmati: 1.5 } },
  { id: "fuel", text: "Fuel scarcity: transport costs push up all food prices.", mult: { all: 1.12 } },
  { id: "festive", text: "Festive season: chicken, turkey and goat are in demand.", mult: { chicken: 1.4, turkey: 1.5, goat: 1.3 } },
  { id: "pepper", text: "Pepper glut: ata rodo and tatashe are going cheap.", mult: { scotch_bonnet: 0.6, pepper: 0.65 } },
  { id: "dairy", text: "Dollar spike: imported dairy is dearer.", mult: { cheese: 1.35, butter: 1.3, cream: 1.3, milk: 1.15 } },
];

/** Weekly: new market news, old news fades. */
export function weeklyMarket(s: GameState): string[] {
  const k = kitchen(s);
  k.market = k.market.filter((e) => e.until >= s.day);
  if (Math.random() < 0.55) {
    const options = EVENTS.filter((e) => !k.market.some((m) => m.id === e.id));
    const e = options[Math.floor(Math.random() * options.length)];
    if (e) {
      k.market.push({ ...e, until: s.day + 7 });
      return [`🛒 Market news: ${e.text}`];
    }
  }
  return [];
}

// ── Garden ───────────────────────────────────────────────────────────────────

export const CROPS = INGREDIENTS.filter((i) => i.grow);
export const SEED_PRICE = 300;

export function plant(s: GameState, plot: number, crop: string): string {
  const k = kitchen(s);
  const p = k.garden[plot];
  const def = ingredient(crop);
  if (!p || !def?.grow) return "";
  if (p.crop) return "Something is already growing there.";
  if (s.stats.money < SEED_PRICE) return `Seeds cost ₦${SEED_PRICE}.`;
  s.stats.money -= SEED_PRICE;
  Object.assign(p, { crop, planted: s.day, watered: s.day, growth: 0 });
  return `You plant ${def.name.toLowerCase()} seeds. Water them every day.`;
}

export function water(s: GameState): string {
  const k = kitchen(s);
  const growing = k.garden.filter((p) => p.crop);
  if (!growing.length) return "Nothing is growing yet.";
  for (const p of growing) p.watered = s.day;
  return "You water the garden. The plants look happier.";
}

export function harvest(s: GameState, plot: number): string {
  const k = kitchen(s);
  const p = k.garden[plot];
  const def = p?.crop ? ingredient(p.crop) : undefined;
  if (!p || !def?.grow) return "";
  if (p.growth < def.grow.days) return `Not ready yet: ${Math.ceil(def.grow.days - p.growth)} more days.`;
  const qty = def.grow.yield;
  addLot(s, k.pantry, k.equipment, def.id, "homegrown", qty, null);
  k.skills.nutrition = Math.min(100, k.skills.nutrition + 1);
  Object.assign(p, { crop: null, planted: 0, watered: 0, growth: 0 });
  return `You harvest ${qty} portions of home-grown ${def.name.toLowerCase()}. Fresher than anything at the market.`;
}

/** Each night: watered plants grow; sometimes it rains for you. */
export function nightlyGarden(s: GameState): string[] {
  const k = s.kitchen;
  if (!k) return [];
  const rain = Math.random() < 0.3;
  const out: string[] = [];
  for (const p of k.garden) {
    if (!p.crop) continue;
    const def = ingredient(p.crop);
    if (!def?.grow) continue;
    const ok = rain || p.watered >= s.day - 1;
    const before = p.growth;
    p.growth += ok ? 1 : 0.3;
    if (before < def.grow.days && p.growth >= def.grow.days) out.push(`🌱 Your ${def.name.toLowerCase()} is ready to harvest.`);
  }
  if (rain && k.garden.some((p) => p.crop)) out.push("🌧️ It rained overnight. The garden is watered.");
  return out;
}
