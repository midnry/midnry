import type { GameState } from "../types";
import { cookRecipe, kitFor, mainSkill, missingKit } from "./cook";
import { equipment, stats } from "./equipment";
import { ingredient, TIERS } from "./ingredients";
import { addLot, have, inflationAt, kitchen, own, price, SOURCES, uid } from "./kitchen";
import { recipe } from "./recipes";
import type { Catering, Dish, FoodTag, Kitchen, MenuItem, Owned, Performance, RecipeDef, Review, Staff, StaffRole, Tier, Venue } from "./types";

// Food businesses. From a roadside stall to fine dining: pick a format and a
// district, fit out the kitchen, write a menu, hire people and run services.
// A service is a simulation: customers come (by district, price, rating, time
// of day and word of mouth), the kitchen cooks what's ordered from the stock
// it has, slow kitchens make people wait and walk out, and everyone who eats
// leaves a verdict that builds what the place is known for.

export type VenueType = {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  /** Fit-out and deposit to open. */
  cost: number;
  rent: number;
  /** Guests seated at once; 0 means takeaway or delivery only. */
  seats: number;
  /** Customers in an ordinary service. */
  footfall: number;
  /** How pricey people expect it to be, against a recipe's usual price. */
  priceLevel: number;
  courses: RecipeDef["course"][];
  /** What its customers come for. */
  likes: FoodTag[];
  /** Kitchen grid. */
  grid: { w: number; h: number };
  starter: string[];
  /** Busy times: morning, afternoon, evening, night. */
  hours: [number, number, number, number];
  /** Delivery only. */
  delivery?: boolean;
  /** Can move between districts. */
  mobile?: boolean;
  /** Waiters bring food to tables (otherwise people order at a counter). */
  table?: boolean;
  requires?: { reputation?: number; management?: number; cooking?: number };
};

const ALL: RecipeDef["course"][] = ["main", "side", "breakfast", "snack", "soup", "dessert", "baked", "drink"];

export const VENUE_TYPES: VenueType[] = [
  { id: "street_stall", name: "Street food stall", icon: "🍢", blurb: "A table, a canopy and a pot. Cheap to start, cheap to eat.", cost: 60000, rent: 5000, seats: 0, footfall: 18, priceLevel: 0.7, courses: ["main", "snack", "side", "drink", "breakfast"], likes: ["street", "cheap", "local", "spicy"], grid: { w: 3, h: 2 }, starter: ["pot", "frying_pan", "knife", "cutting_board", "kerosene_stove"], hours: [0.9, 1.2, 1.1, 0.5] },
  { id: "food_truck", name: "Food truck", icon: "🚚", blurb: "A kitchen on wheels. Park where the crowds are; move when they do.", cost: 2500000, rent: 15000, seats: 0, footfall: 46, priceLevel: 0.9, courses: ["main", "snack", "side", "drink", "dessert"], likes: ["fast", "street", "foreign"], grid: { w: 4, h: 2 }, starter: ["flat_top", "com_fryer", "prep_table", "com_fridge"], hours: [0.6, 1.3, 1.2, 0.8], mobile: true },
  { id: "juice_bar", name: "Juice and smoothie bar", icon: "🥤", blurb: "Fresh juice, smoothies and zobo. Healthy, colourful, low effort.", cost: 900000, rent: 20000, seats: 6, footfall: 30, priceLevel: 1, courses: ["drink", "snack"], likes: ["healthy", "drink", "sweet"], grid: { w: 3, h: 2 }, starter: ["juice_machine", "com_blender", "com_fridge", "prep_table"], hours: [1.2, 1.3, 0.8, 0.3] },
  { id: "cafe", name: "Café", icon: "☕", blurb: "Coffee, pastries and breakfast. Laptops and long conversations.", cost: 3500000, rent: 45000, seats: 16, footfall: 42, priceLevel: 1.15, courses: ["drink", "breakfast", "baked", "dessert", "snack"], likes: ["drink", "baked", "sweet", "breakfast", "foreign"], grid: { w: 4, h: 3 }, starter: ["com_coffee", "com_oven", "com_fridge", "prep_table", "pass"], hours: [1.5, 1.1, 0.7, 0.2] },
  { id: "bakery", name: "Bakery", icon: "🥖", blurb: "Bread at dawn, cakes by noon. Ovens never cool.", cost: 3000000, rent: 35000, seats: 4, footfall: 44, priceLevel: 0.95, courses: ["baked", "dessert", "snack", "breakfast", "drink"], likes: ["baked", "sweet", "breakfast"], grid: { w: 4, h: 3 }, starter: ["com_oven", "dough_mixer", "prep_table", "display_fridge"], hours: [1.6, 1.0, 0.6, 0.2] },
  { id: "dessert", table: true, name: "Dessert shop", icon: "🍰", blurb: "Cakes, ice cream and anything sweet. Date-night favourite.", cost: 2800000, rent: 35000, seats: 12, footfall: 34, priceLevel: 1.2, courses: ["dessert", "baked", "drink"], likes: ["sweet", "dessert", "baked"], grid: { w: 4, h: 2 }, starter: ["com_oven", "com_mixer", "display_fridge", "com_freezer"], hours: [0.4, 1.0, 1.4, 0.8] },
  { id: "fast_food", name: "Fast-food joint", icon: "🍔", blurb: "Burgers, chicken and chips. Volume, speed and consistency.", cost: 6000000, rent: 70000, seats: 30, footfall: 70, priceLevel: 0.95, courses: ["main", "side", "snack", "drink"], likes: ["fast", "meat", "foreign"], grid: { w: 5, h: 3 }, starter: ["com_fryer", "flat_top", "com_fridge", "com_freezer", "prep_table", "food_warmer"], hours: [0.5, 1.3, 1.3, 0.7] },
  { id: "pizzeria", table: true, name: "Pizzeria", icon: "🍕", blurb: "Pizza, pasta and delivery boxes stacked to the ceiling.", cost: 5000000, rent: 55000, seats: 24, footfall: 50, priceLevel: 1.1, courses: ["main", "side", "dessert", "drink"], likes: ["foreign", "comfort", "fast"], grid: { w: 5, h: 3 }, starter: ["pizza_oven", "dough_mixer", "com_stove", "com_fridge", "prep_table"], hours: [0.3, 1.1, 1.4, 0.9] },
  { id: "bar", table: true, name: "Bar and grill", icon: "🍻", blurb: "Cold drinks, pepper soup and suya till late.", cost: 4500000, rent: 60000, seats: 30, footfall: 48, priceLevel: 1.05, courses: ["main", "soup", "snack", "drink", "side"], likes: ["spicy", "meat", "drink", "street"], grid: { w: 5, h: 3 }, starter: ["bar_station", "bbq_pit", "com_stove", "com_fridge", "ice_machine"], hours: [0.2, 0.7, 1.4, 1.5] },
  { id: "restaurant", table: true, name: "Restaurant", icon: "🍽️", blurb: "A proper dining room: menus, waiters and a busy kitchen.", cost: 9000000, rent: 120000, seats: 40, footfall: 60, priceLevel: 1.25, courses: ["main", "soup", "side", "dessert", "drink", "snack"], likes: ["local", "comfort", "foreign", "meat"], grid: { w: 6, h: 4 }, starter: ["com_stove", "com_oven", "com_fridge", "com_freezer", "prep_table", "dry_store", "pass", "com_sink"], hours: [0.3, 1.2, 1.4, 0.6], requires: { reputation: 20 } },
  { id: "fine_dining", table: true, name: "Fine dining", icon: "🥂", blurb: "Tasting menus, white tablecloths and critics who can end you.", cost: 30000000, rent: 400000, seats: 28, footfall: 30, priceLevel: 3, courses: ["main", "soup", "dessert", "drink", "side"], likes: ["luxury", "foreign", "dessert"], grid: { w: 6, h: 4 }, starter: ["combi_oven", "com_stove", "walkin_fridge", "prep_table", "pass", "dishwasher", "dry_store"], hours: [0.1, 0.7, 1.6, 0.8], requires: { reputation: 45, cooking: 50 } },
  { id: "hotel", table: true, name: "Hotel restaurant", icon: "🏨", blurb: "Breakfast buffets, room service and conference lunches. Never closes.", cost: 45000000, rent: 600000, seats: 70, footfall: 85, priceLevel: 2, courses: ALL, likes: ["luxury", "foreign", "breakfast", "local"], grid: { w: 7, h: 4 }, starter: ["combi_oven", "com_stove", "com_oven", "walkin_fridge", "walkin_freezer", "prep_table", "prep_table", "pass", "dishwasher", "com_coffee"], hours: [1.4, 1.1, 1.3, 0.7], requires: { reputation: 55, management: 40 } },
  { id: "cloud_kitchen", name: "Cloud kitchen", icon: "📦", blurb: "No dining room, no walk-ins. Delivery apps only.", cost: 2000000, rent: 30000, seats: 0, footfall: 40, priceLevel: 1, courses: ["main", "side", "soup", "dessert", "drink", "snack"], likes: ["fast", "comfort", "local"], grid: { w: 4, h: 3 }, starter: ["com_stove", "com_fryer", "com_fridge", "prep_table"], hours: [0.4, 1.2, 1.5, 1.0], delivery: true },
  { id: "meal_prep", name: "Meal-prep service", icon: "🥗", blurb: "Weekly boxes of healthy meals for busy professionals.", cost: 1500000, rent: 25000, seats: 0, footfall: 30, priceLevel: 1.1, courses: ["main", "soup", "breakfast", "drink"], likes: ["healthy", "breakfast"], grid: { w: 4, h: 2 }, starter: ["com_stove", "com_fridge", "prep_table", "steam_oven"], hours: [1, 1, 1, 0.3], delivery: true },
  { id: "catering", name: "Catering company", icon: "🍱", blurb: "Weddings, owambes and office lunches. Big orders, tight deadlines.", cost: 2500000, rent: 30000, seats: 0, footfall: 0, priceLevel: 1, courses: ALL, likes: ["local", "comfort"], grid: { w: 5, h: 3 }, starter: ["com_stove", "com_stove", "com_fridge", "prep_table", "food_warmer"], hours: [0, 0, 0, 0] },
];

export const venueType = (id: string) => VENUE_TYPES.find((t) => t.id === id);

export const districtName = (id: string) => (id === "cbd" ? "the CBD" : `${id[0]!.toUpperCase()}${id.slice(1)}`);

/** How busy and how rich each district is. */
export const DISTRICT_FOOT: Record<string, { foot: number; wealth: number }> = {
  cbd: { foot: 1.3, wealth: 1.35 },
  wuse: { foot: 1.35, wealth: 1.15 },
  maitama: { foot: 1.0, wealth: 1.6 },
  asokoro: { foot: 0.85, wealth: 1.6 },
  jabi: { foot: 1.15, wealth: 1.25 },
  garki: { foot: 1.15, wealth: 1.0 },
  gwarinpa: { foot: 1.0, wealth: 1.1 },
  kubwa: { foot: 0.95, wealth: 0.75 },
  nyanya: { foot: 1.05, wealth: 0.7 },
  lugbe: { foot: 0.9, wealth: 0.75 },
};

const COOK_ROLES: StaffRole[] = ["head_chef", "sous_chef", "line_cook", "baker", "pastry_chef"];

export const ROLE_INFO: Record<StaffRole, { label: string; pay: number; blurb: string }> = {
  head_chef: { label: "Head chef", pay: 90000, blurb: "Runs the kitchen. Big lift to quality." },
  sous_chef: { label: "Sous chef", pay: 60000, blurb: "Second in command. Cooks and keeps standards." },
  line_cook: { label: "Line cook", pay: 35000, blurb: "Cooks orders fast." },
  prep_cook: { label: "Prep cook", pay: 22000, blurb: "Chops and prepares: the cooks go faster." },
  baker: { label: "Baker", pay: 40000, blurb: "Bread and baked goods." },
  pastry_chef: { label: "Pastry chef", pay: 60000, blurb: "Desserts and pastries, beautifully." },
  dishwasher: { label: "Dishwasher", pay: 18000, blurb: "Keeps plates and the kitchen clean." },
  barista: { label: "Barista", pay: 28000, blurb: "Coffee and drinks." },
  server: { label: "Server", pay: 22000, blurb: "Seats and serves guests. Better service, better reviews." },
  manager: { label: "Manager", pay: 80000, blurb: "Runs services while you're away and keeps costs down." },
  driver: { label: "Delivery rider", pay: 25000, blurb: "Your own deliveries: lower commission than the apps." },
};

const FIRST = ["Chidi", "Aisha", "Emeka", "Ngozi", "Musa", "Funmi", "Tunde", "Zainab", "Ifeanyi", "Blessing", "Yusuf", "Kemi", "Uche", "Hauwa", "Segun", "Amina", "Obinna", "Halima", "Femi", "Grace"];
const LAST = ["Okeke", "Bello", "Adeyemi", "Ibrahim", "Eze", "Lawal", "Okafor", "Danjuma", "Nwosu", "Abubakar", "Ogunleye", "Musa"];

function seeded(seed: number) {
  let x = seed % 2147483647 || 1;
  return () => {
    x = (x * 48271) % 2147483647;
    return x / 2147483647;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Math.abs(h);
}

/** People looking for work this week. The same list all week. */
export function candidates(s: GameState, v: Venue): Staff[] {
  const week = Math.floor(s.day / 7);
  const rnd = seeded(hash(`${v.id}-${week}`));
  const roles: StaffRole[] = ["line_cook", "server", "head_chef", "prep_cook", "dishwasher", "barista", "sous_chef", "baker", "pastry_chef", "manager", "driver"];
  const out: Staff[] = [];
  for (let i = 0; i < 6; i++) {
    const role = roles[Math.floor(rnd() * roles.length)]!;
    const skill = Math.round(20 + rnd() * 65);
    const stat = () => Math.round(Math.max(15, Math.min(95, skill + (rnd() - 0.5) * 40)));
    out.push({
      id: `cand-${week}-${i}`,
      name: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      role,
      skill,
      speed: stat(),
      accuracy: stat(),
      clean: stat(),
      stress: 10,
      creativity: stat(),
      reliability: stat(),
      exp: Math.round(rnd() * 8),
      salary: Math.round((ROLE_INFO[role].pay * (0.6 + skill / 100)) / 500) * 500,
    });
  }
  return out.filter((c) => !v.staff.some((x) => x.id === c.id));
}

// ── Layout ───────────────────────────────────────────────────────────────────

const FLOW: NonNullable<ReturnType<typeof equipment>>["station"][] = ["cold", "prep", "cook", "plate"];

/** 0–100: how well the stations follow the flow cold → prep → cook → plate (and wash nearby). */
export function layoutScore(v: Venue): number {
  const t = venueType(v.type);
  if (!t) return 50;
  const at = (station: string) =>
    v.equipment.filter((o) => o.cell != null && equipment(o.def)?.station === station).map((o) => ({ x: o.cell! % t.grid.w, y: Math.floor(o.cell! / t.grid.w) }));
  let penalty = 0;
  for (let i = 0; i < FLOW.length - 1; i++) {
    const a = at(FLOW[i]!);
    const b = at(FLOW[i + 1]!);
    if (!a.length || !b.length) continue;
    let best = 99;
    for (const p of a) for (const q of b) best = Math.min(best, Math.abs(p.x - q.x) + Math.abs(p.y - q.y));
    penalty += Math.max(0, best - 1) * 9;
  }
  const wash = at("wash");
  const cook = [...at("cook"), ...at("plate")];
  if (wash.length && cook.length) {
    let best = 99;
    for (const p of wash) for (const q of cook) best = Math.min(best, Math.abs(p.x - q.x) + Math.abs(p.y - q.y));
    penalty += Math.max(0, best - 2) * 4;
  }
  return Math.max(10, 100 - penalty);
}

/** Put a piece of kit in the first free cell, if it's a station. */
export function placeKit(v: Venue, o: Owned): boolean {
  const t = venueType(v.type);
  if (!t || !equipment(o.def)?.station) return true;
  const taken = new Set(v.equipment.filter((x) => x !== o && x.cell != null).map((x) => x.cell!));
  for (let c = 0; c < t.grid.w * t.grid.h; c++) {
    if (!taken.has(c)) {
      o.cell = c;
      return true;
    }
  }
  return false;
}

export function moveKit(v: Venue, uidValue: string, cell: number): void {
  const t = venueType(v.type);
  const o = v.equipment.find((x) => x.uid === uidValue);
  if (!t || !o || cell < 0 || cell >= t.grid.w * t.grid.h) return;
  const other = v.equipment.find((x) => x.cell === cell && x !== o);
  if (other) other.cell = o.cell;
  o.cell = cell;
}

// ── Opening ──────────────────────────────────────────────────────────────────

export function canOpen(s: GameState, typeId: string): string | null {
  const t = venueType(typeId);
  if (!t) return "Unknown business.";
  const k = kitchen(s);
  if (t.requires?.reputation && s.stats.reputation < t.requires.reputation) return `Needs reputation ${t.requires.reputation}.`;
  if (t.requires?.cooking && k.skills.cooking < t.requires.cooking) return `Needs cooking skill ${t.requires.cooking}.`;
  if (t.requires?.management && k.skills.management < t.requires.management) return `Needs kitchen management ${t.requires.management}.`;
  if (k.venues.length >= 4) return "You already run four food businesses. That's enough for anyone.";
  if (s.stats.money < t.cost) return `Needs ₦${t.cost.toLocaleString("en")} to open.`;
  return null;
}

export function openVenue(s: GameState, typeId: string, district: string, name: string): string {
  const why = canOpen(s, typeId);
  if (why) return why;
  const t = venueType(typeId)!;
  const k = kitchen(s);
  s.stats.money -= t.cost;
  const v: Venue = {
    id: uid("v"),
    type: t.id,
    name: name.trim().slice(0, 36) || `${s.name}'s ${t.name}`,
    district,
    opened: s.day,
    equipment: [],
    menu: [],
    staff: [],
    stock: [],
    clean: 100,
    rating: 55,
    known: {},
    reviews: [],
    delivery: Boolean(t.delivery),
    portion: 1,
    autoStock: true,
    services: 0,
    ledger: [],
    week: { revenue: 0, cost: 0 },
    closedUntil: 0,
    inspections: [],
  };
  for (const id of t.starter) {
    const o = own(id, "basic");
    if (!equipment(id)?.tiers.basic) o.tier = "pro";
    v.equipment.push(o);
    placeKit(v, o);
  }
  // Start with what you know that fits.
  for (const r of Object.keys(k.recipes)) {
    const def = recipe(r);
    if (!def || v.menu.length >= 4 || !t.courses.includes(def.course) || missingKit(v.equipment, def).length) continue;
    v.menu.push(menuItem(def, t, district, s.day));
  }
  k.venues.push(v);
  return `${t.icon} ${v.name} is open for business in ${districtName(district)}! Set your menu, hire staff and run your first service.`;
}

/** What customers expect to pay for a dish here, today. */
export function fairPrice(r: RecipeDef, t: VenueType, district: string, day = 0): number {
  return Math.round((r.value * t.priceLevel * (DISTRICT_FOOT[district]?.wealth ?? 1) * inflationAt(day)) / 50) * 50;
}

function menuItem(r: RecipeDef, t: VenueType, district: string, day: number): MenuItem {
  return { recipe: r.id, price: fairPrice(r, t, district, day), tier: "standard", active: true, sold: 0, avg: 0 };
}

export function addToMenu(s: GameState, vid: string, recipeId: string, custom?: string): string {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  const t = v && venueType(v.type);
  const r = recipe(recipeId);
  if (!v || !t || !r) return "";
  if (!k.recipes[recipeId]) return "You don't know that recipe.";
  if (!t.courses.includes(r.course)) return `A ${t.name.toLowerCase()} doesn't sell that.`;
  if (v.menu.some((m) => m.recipe === recipeId && m.custom === custom)) return "It's already on the menu.";
  if (v.menu.length >= 12) return "Twelve dishes is plenty. Take something off first.";
  v.menu.push({ ...menuItem(r, t, v.district, s.day), custom });
  return `${r.name} added to the menu.`;
}

// ── Stock ────────────────────────────────────────────────────────────────────

const SUPPLIER = SOURCES.find((x) => x.id === "sani")!;

/** Buy what the menu needs, wholesale: `plan` is portions per menu item, or a head count spread evenly. Returns the cost. */
export function restock(s: GameState, v: Venue, plan: number | Map<MenuItem, number>): { cost: number; short: string[] } {
  const items = v.menu.filter((m) => m.active);
  if (!items.length) return { cost: 0, short: [] };
  const want = new Map<string, { qty: number; tier: Tier }>();
  for (const m of items) {
    const r = recipe(m.recipe);
    if (!r) continue;
    const portions = typeof plan === "number" ? Math.ceil(plan / items.length) : (plan.get(m) ?? 0);
    const batches = Math.ceil(portions / r.serves);
    for (const n of r.needs) {
      const cur = want.get(n.id) ?? { qty: 0, tier: m.tier === "homegrown" ? "standard" : m.tier };
      cur.qty += n.qty * batches;
      want.set(n.id, cur);
    }
  }
  let cost = 0;
  const short: string[] = [];
  for (const [id, w] of want) {
    const need = w.qty - have(v.stock, id, w.qty);
    if (need <= 0) continue;
    const tier = SUPPLIER.tiers.includes(w.tier) ? w.tier : "standard";
    const each = price(s, id, tier, SUPPLIER);
    if (s.stats.money < each * need) {
      short.push(ingredient(id)?.name ?? id);
      continue;
    }
    s.stats.money -= each * need;
    cost += each * need;
    addLot(s, v.stock, v.equipment, id, tier, need, null);
  }
  return { cost, short };
}

// ── Running a service ────────────────────────────────────────────────────────

export const SLOT_NAMES = ["Breakfast", "Lunch", "Dinner", "Late night"] as const;

export type ServiceReport = {
  ok: boolean;
  text: string;
  label?: string;
  customers?: number;
  served?: number;
  walkouts?: number;
  delivery?: number;
  revenue?: number;
  cost?: number;
  waste?: number;
  quality?: number;
  wait?: number;
  stars?: number;
  items?: { name: string; sold: number; quality: number; ran_out: boolean }[];
  reviews?: Review[];
  notes?: string[];
};

const WHO = ["Adaeze", "Kunle", "Hadiza", "Tobi", "Mr. Eze", "Fatima", "Dayo", "Chioma", "Ahmed", "Ruth", "Gbenga", "Bisi", "A food blogger", "A corper", "Two office workers"];

function staffPerf(r: RecipeDef, skill: number, season: Performance["season"]): Performance {
  const roll = () => Math.max(20, Math.min(100, Math.round(40 + skill * 0.55 + (Math.random() - 0.5) * 20)));
  const noise = Math.max(0.3, 2.2 - skill / 40);
  const j = (x: number) => Math.max(0, Math.min(10, x + (Math.random() - 0.5) * 2 * noise));
  return {
    prep: r.steps.filter((x) => x.kind === "prep").map(roll),
    cook: r.steps.filter((x) => x.kind === "cook").map(roll),
    season: { spice: j(season.spice), salt: j(season.salt), sweet: j(season.sweet), sour: j(season.sour) },
    plate: roll(),
    quick: true,
  };
}

function batchEnergy(kit: Owned[], r: RecipeDef): number {
  let e = 0;
  for (const step of r.steps) {
    const o = kitFor(kit, step);
    if (o) e += stats(o.def, o.tier)?.energy ?? 0;
  }
  return e;
}

/**
 * Run one service: lunch, dinner or whatever time it is. `you` means you're
 * there working it (your skill cooks and your presence lifts the staff).
 */
export function runService(s: GameState, vid: string, you: boolean, opts: { festival?: boolean } = {}): ServiceReport {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  const t = v && venueType(v.type);
  if (!v || !t) return { ok: false, text: "" };
  if (t.id === "catering") return { ok: false, text: "A catering company works by contract. Take a catering job instead." };
  if (v.closedUntil > s.day) return { ok: false, text: `Closed by the health inspectors until day ${v.closedUntil}.` };
  const slot = Math.min(3, s.slot);
  const label = `${SLOT_NAMES[slot]}, day ${s.day}`;
  if (v.ledger.some((l) => l.label === label)) return { ok: false, text: "You've already run this service. Come back for the next one." };
  const present = v.staff.filter((x) => Math.random() > (100 - x.reliability) / 400);
  const absent = v.staff.length - present.length;
  const cooks = present.filter((x) => COOK_ROLES.includes(x.role));
  if (!cooks.length && !you) return { ok: false, text: "Nobody's here to cook. Hire a cook, or work the service yourself." };
  if (!you && !present.some((x) => x.role === "manager" || x.role === "head_chef")) return { ok: false, text: "Without a manager or head chef in, you need to be there yourself." };

  const items = v.menu.filter((m) => {
    const r = recipe(m.recipe);
    return m.active && r && k.recipes[r.id] && !missingKit(v.equipment, r).length;
  });
  if (!items.length) return { ok: false, text: "Nothing on the menu can be cooked here. Add dishes you know, and the kit to cook them." };

  // ── Demand ──
  const place = DISTRICT_FOOT[v.district] ?? { foot: 1, wealth: 1 };
  const weekend = s.day % 7 >= 5 ? 1.25 : 1;
  const prices = items.reduce((sum, m) => sum + m.price / Math.max(1, fairPrice(recipe(m.recipe)!, t, v.district, s.day)), 0) / items.length;
  const priceF = Math.max(0.35, Math.min(1.35, 1.55 - 0.55 * prices));
  const ratingF = 0.45 + v.rating / 90;
  const signature = k.customs.filter((c) => c.signature && items.some((m) => m.custom === c.id || m.recipe === c.base));
  const fame = 1 + Math.min(0.4, signature.reduce((sum, c) => sum + c.fame, 0) / 300) + Math.min(0.3, s.stats.reputation / 400);
  const marketing = (s.flags[`promo_${v.id}`] as number | undefined) && (s.flags[`promo_${v.id}`] as number) >= s.day ? 1.35 : 1;
  const fest = opts.festival ? 2.2 : 1;
  const portionF = 0.9 + (v.portion - 1) * 0.6;
  let demand = Math.round(t.footfall * t.hours[slot]! * weekend * place.foot * ratingF * priceF * fame * marketing * fest * portionF * (0.8 + Math.random() * 0.4));
  let deliveryDemand = 0;
  if (t.delivery) {
    deliveryDemand = demand;
    demand = 0;
  } else if (v.delivery) deliveryDemand = Math.round(demand * 0.35);
  const total = demand + deliveryDemand;

  // ── Capacity ──
  const layoutF = 0.8 + layoutScore(v) / 500;
  const kitSpeed =
    v.equipment.filter((o) => !o.broken && equipment(o.def)?.station === "cook").reduce((sum, o) => sum + (stats(o.def, o.tier)?.speed ?? 60) * (stats(o.def, o.tier)?.capacity ?? 1), 0) / 60;
  const cookPower =
    cooks.reduce((sum, c) => sum + 0.5 + (c.skill * 0.4 + c.speed * 0.6) / 100, 0) + (you ? 0.75 + (k.skills.cooking * 0.5 + k.skills.knife * 0.5) / 100 : 0);
  const prep = present.filter((x) => x.role === "prep_cook").length * 0.3 + (present.some((x) => x.role === "head_chef") ? 0.2 : 0);
  const throughput = Math.round((cookPower + prep) * 20 * layoutF * Math.min(1.5, 0.7 + kitSpeed / 8));
  const servers = present.filter((x) => x.role === "server").length;
  const tableService = Boolean(t.table);
  const serveCap = tableService ? servers * 22 + (you ? 8 : 0) + (present.some((x) => x.role === "manager") ? 6 : 0) + 6 : 999;
  const seatCap = t.seats > 0 ? (t.seats + v.equipment.reduce((sum, o) => sum + (equipment(o.def)?.seats ?? 0), 0)) * 2 : 999;
  const roomFor = Math.min(seatCap, serveCap) + deliveryDemand;

  // ── Stock and cooking ──
  let cost = 0;
  let restockCost = 0;
  const notes: string[] = [];
  if (absent) notes.push(`${absent} staff didn't show up.`);
  // Orders by item: what fits the place and its price.
  const weights = items.map((m) => {
    const r = recipe(m.recipe)!;
    const fit = 1 + r.tags.filter((x) => t.likes.includes(x)).length * 0.35;
    const value = fairPrice(r, t, v.district, s.day) / Math.max(50, m.price);
    return fit * Math.max(0.3, Math.min(2, value)) * (m.custom ? 1.15 : 1);
  });
  const wsum = weights.reduce((a, b) => a + b, 0);
  const plan = new Map(items.map((m, i) => [m, Math.round((Math.min(total, throughput, roomFor) * weights[i]!) / wsum)] as const));
  if (v.autoStock) {
    const bought = restock(s, v, plan);
    restockCost = bought.cost;
    if (bought.short.length) notes.push(`Couldn't afford to restock: ${bought.short.slice(0, 3).join(", ")}.`);
  }
  const headSkill = Math.max(...cooks.map((c) => c.skill), you ? k.skills[mainSkill(recipe(items[0]!.recipe)!)] : 0);
  const sold: { item: MenuItem; r: RecipeDef; ordered: number; made: number; quality: number; ranOut: boolean }[] = [];
  let energy = 0;
  // Value of the stock cooked, for the books (what you paid for it, roughly).
  let used = 0;
  for (let i = 0; i < items.length; i++) {
    const m = items[i]!;
    const r = recipe(m.recipe)!;
    const ordered = plan.get(m) ?? 0;
    const custom = m.custom ? k.customs.find((c) => c.id === m.custom) : undefined;
    let made = 0;
    let qsum = 0;
    let ranOut = false;
    const specialist = cooks.find((c) => (r.course === "baked" && c.role === "baker") || (r.course === "dessert" && c.role === "pastry_chef"));
    const skill = Math.min(100, (specialist ? specialist.skill + 8 : headSkill) + (you ? 4 : 0) - (present.some((x) => x.role === "head_chef") ? 0 : 3));
    while (made < ordered) {
      const res: { ok: boolean; text: string; dish?: Dish; notes?: string[] } = cookRecipe(s, v.id, r.id, staffPerf(r, skill, custom?.flavor ?? r.target), { custom: m.custom, tier: m.tier, staffSkill: skill });
      for (const n of res.notes ?? []) if (n.includes("broke")) notes.push(n.replace("Your", "The"));
      if (!res.ok || !res.dish) {
        if (res.text.startsWith("Missing")) ranOut = true;
        else notes.push(`Had to stop making ${r.name.toLowerCase()}: ${res.text.toLowerCase()}`);
        break;
      }
      made += r.serves;
      qsum += res.dish.scores.overall * r.serves;
      energy += batchEnergy(v.equipment, r);
      for (const n of r.needs) used += Math.round((ingredient(n.id)?.price ?? 0) * TIERS[m.tier === "homegrown" ? "standard" : m.tier].price * n.qty * 0.85 * inflationAt(s.day));
    }
    sold.push({ item: m, r, ordered, made, quality: made ? Math.round(qsum / made) : 0, ranOut });
  }
  cost += energy;
  if (restockCost) notes.push(`Restocked from the wholesaler for ₦${restockCost.toLocaleString("en")}.`);

  // ── Who gets fed ──
  const cooked = sold.reduce((a, x) => a + x.made, 0);
  const served = Math.min(total, cooked, throughput, roomFor);
  const sellable = sold.map((x) => Math.min(x.ordered, x.made));
  const sellSum = sellable.reduce((a, b) => a + b, 0) || 1;
  const deliveredShare = total ? deliveryDemand / total : 0;
  const commission = present.some((p) => p.role === "driver") ? 0.1 : 0.22;
  let revenue = 0;
  let qualitySum = 0;
  let waste = 0;
  const lines: { name: string; sold: number; quality: number; ran_out: boolean }[] = [];
  sold.forEach((x, i) => {
    const portions = Math.min(x.made, Math.round((sellable[i]! * served) / sellSum));
    waste += x.made - portions;
    revenue += Math.round(portions * x.item.price * (1 - deliveredShare * commission));
    qualitySum += x.quality * portions;
    if (portions) {
      x.item.avg = Math.round((x.item.avg * x.item.sold + x.quality * portions) / (x.item.sold + portions));
      x.item.sold += portions;
    }
    if (x.item.custom) {
      const c = k.customs.find((cc) => cc.id === x.item.custom);
      if (c) {
        c.sold += portions;
        c.fame += Math.round((portions * Math.max(0, x.quality - 55)) / 40);
      }
    }
    lines.push({ name: x.item.custom ? (k.customs.find((c) => c.id === x.item.custom)?.name ?? x.r.name) : x.r.name, sold: portions, quality: x.quality, ran_out: x.ranOut });
    if (x.ranOut) notes.push(`Ran out of ${x.r.name.toLowerCase()}.`);
  });
  // Bigger portions use more of everything.
  cost += Math.round(used * v.portion);
  if (waste) notes.push(`${waste} cooked portions went unsold.`);
  const quality = served ? Math.round(qualitySum / Math.max(1, served)) : 0;
  const walkouts = Math.max(0, total - served);
  const load = total / Math.max(1, throughput);
  const wait = Math.round(6 + Math.min(1.2, Math.max(0, load - 0.8)) * 25 + (tableService && servers === 0 ? 10 : 0));
  if (wait > 30) notes.push(`Customers waited ${wait} minutes on average.`);
  if (walkouts > total * 0.25 && total) notes.push(`${walkouts} people gave up and left.`);

  // ── How they felt ──
  const value = prices <= 0.85 ? 12 : prices <= 1.1 ? 4 : prices <= 1.35 ? -6 : -16;
  const cleanF = v.clean >= 70 ? 4 : v.clean >= 45 ? -2 : -12;
  const serviceF = tableService ? Math.min(8, servers * 3) - (servers === 0 ? 8 : 0) : 0;
  const waitF = -Math.max(0, wait - 15) * 0.6;
  const portionF2 = (v.portion - 1) * 25;
  const sat = Math.max(0, Math.min(100, quality * 0.7 + 20 + value + cleanF + serviceF + waitF + portionF2 + (you ? 2 : 0)));
  const stars = served ? Math.max(1, Math.min(5, Math.round((1 + sat / 25) * 10) / 10)) : 0;
  if (served) v.rating = Math.round(v.rating * 0.8 + sat * 0.2);

  // What the place becomes known for.
  const bump = (key: string, n = 1) => (v.known[key] = (v.known[key] ?? 0) + n);
  const best = [...sold].sort((a, b) => b.quality * b.made - a.quality * a.made)[0];
  if (best && best.quality >= 72) bump(`dish:${best.item.custom ?? best.r.id}`, 2);
  if (prices <= 0.85) bump("cheap");
  if (prices >= 1.4) bump("pricey");
  if (wait > 30) bump("slow");
  if (wait <= 12 && served) bump("fast");
  if (v.clean >= 85) bump("clean");
  if (v.clean < 40) bump("dirty");
  if (quality >= 78) bump("delicious");
  if (v.portion >= 1.2) bump("big");
  if (v.portion <= 0.85) bump("small");

  const reviews: Review[] = [];
  const nReviews = served ? 1 + (Math.random() < 0.5 ? 1 : 0) : 0;
  for (let i = 0; i < nReviews; i++) {
    const st = Math.max(1, Math.min(5, Math.round(stars + (Math.random() - 0.5) * 1.6)));
    reviews.push({ day: s.day, stars: st, who: WHO[Math.floor(Math.random() * WHO.length)]!, text: reviewText(st, { wait, prices, clean: v.clean, best: best?.r.name ?? "", portion: v.portion, quality }) });
  }
  v.reviews = [...reviews, ...v.reviews].slice(0, 30);

  // Kitchen and staff wear.
  const washers = present.filter((x) => x.role === "dishwasher").length;
  const managed = present.some((x) => x.role === "manager") || you;
  const washKit = v.equipment.some((o) => !o.broken && equipment(o.def)?.station === "wash");
  v.clean = Math.max(0, Math.min(100, v.clean - served / 15 + (you ? 10 : 0) + Math.min(12, present.length * 3) + washers * 8 + (washKit ? 5 : 0)));
  for (const st of present) {
    st.exp += 1;
    st.skill = Math.min(95, st.skill + 0.35 * (1 - st.skill / 110));
    const strain = load > 1.5 ? 4 : load > 1.1 ? 2 : -2;
    st.stress = Math.max(0, Math.min(100, st.stress + (managed ? Math.ceil(strain / 2) : strain)));
  }
  if (you) {
    k.skills.management = Math.min(100, k.skills.management + 1.2 * (1 - k.skills.management / 120));
    k.skills.cooking = Math.min(100, k.skills.cooking + 0.4);
  } else k.skills.management = Math.min(100, k.skills.management + 0.3);

  v.services += 1;
  v.week.revenue += revenue;
  v.week.cost += cost;
  v.ledger = [{ day: s.day, label, revenue, cost, customers: served, walkouts, waste }, ...v.ledger].slice(0, 14);
  s.stats.money += revenue;
  const profit = revenue - cost;
  const text = `${t.icon} ${label}: ${served} served${walkouts ? `, ${walkouts} walked out` : ""}. Takings ₦${revenue.toLocaleString("en")}, costs ₦${cost.toLocaleString("en")} (${profit >= 0 ? "profit" : "loss"} ₦${Math.abs(profit).toLocaleString("en")}). ${stars ? `${stars}★` : ""}`;
  return { ok: true, text, label, customers: total, served, walkouts, delivery: deliveryDemand, revenue, cost, waste, quality, wait, stars, items: lines, reviews, notes };
}

function reviewText(stars: number, x: { wait: number; prices: number; clean: number; best: string; portion: number; quality: number }): string {
  const good: string[] = [];
  const bad: string[] = [];
  if (x.quality >= 78) good.push(`The ${x.best.toLowerCase()} was outstanding.`);
  else if (x.quality >= 60) good.push(`Solid ${x.best.toLowerCase()}.`);
  else bad.push("The food was nothing special.");
  if (x.wait > 30) bad.push(`Waited ${x.wait} minutes. Unacceptable.`);
  else if (x.wait <= 12) good.push("Quick service.");
  if (x.prices <= 0.85) good.push("Very affordable.");
  if (x.prices >= 1.4) bad.push("Way too expensive for what you get.");
  if (x.clean < 40) bad.push("The place was dirty. I saw a cockroach.");
  else if (x.clean >= 85) good.push("Spotless.");
  if (x.portion >= 1.2) good.push("Generous portions!");
  if (x.portion <= 0.85) bad.push("Tiny portions.");
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
  if (stars >= 4) return [pick(good) ?? "Lovely.", pick(good.filter((g) => g !== good[0])) ?? "Will come back."].join(" ");
  if (stars <= 2) return [pick(bad) ?? "Disappointing.", "Won't be back."].join(" ");
  return [pick(good) ?? "Okay.", pick(bad) ?? "Room for improvement."].join(" ");
}

/** What the place is known for, best first. */
export function knownFor(v: Venue): string[] {
  const LABEL: Record<string, string> = {
    cheap: "Cheap eats",
    pricey: "Overpriced",
    slow: "Slow service",
    fast: "Fast service",
    clean: "Spotless",
    dirty: "Dirty",
    delicious: "Delicious food",
    big: "Big portions",
    small: "Small portions",
  };
  return Object.entries(v.known)
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => {
      if (key.startsWith("dish:")) {
        const id = key.slice(5);
        const custom = id.startsWith("c") ? undefined : recipe(id);
        return `Best ${(custom?.name ?? id).toLowerCase()} in ${districtName(v.district)}`;
      }
      return LABEL[key] ?? key;
    });
}

// ── Staff ────────────────────────────────────────────────────────────────────

export function hire(s: GameState, vid: string, candidateId: string): string {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  if (!v) return "";
  const c = candidates(s, v).find((x) => x.id === candidateId);
  if (!c) return "";
  if (v.staff.length >= 14) return "Your team is full.";
  v.staff.push({ ...c, id: uid("st") });
  s.flags[`hired_${candidateId}`] = true;
  return `${c.name} joins as ${ROLE_INFO[c.role].label.toLowerCase()} for ₦${c.salary.toLocaleString("en")} a week.`;
}

export function fire(s: GameState, vid: string, staffId: string): string {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  const st = v?.staff.find((x) => x.id === staffId);
  if (!v || !st) return "";
  v.staff = v.staff.filter((x) => x.id !== staffId);
  const severance = Math.round(st.salary / 2);
  s.stats.money -= severance;
  return `You let ${st.name} go, with ₦${severance.toLocaleString("en")} for the week.`;
}

// ── Nightly and weekly ───────────────────────────────────────────────────────

/** Managed venues run dinner on their own each day you don't. */
export function nightlyVenues(s: GameState): string[] {
  const k = s.kitchen;
  if (!k) return [];
  const out: string[] = [];
  for (const v of k.venues) {
    const day = s.day - 1;
    if (v.ledger.some((l) => l.day === day) || v.type === "catering") continue;
    if (!v.staff.some((x) => x.role === "manager") || !v.staff.some((x) => COOK_ROLES.includes(x.role))) continue;
    const before = s.day;
    const slot = s.slot;
    s.day = day;
    s.slot = 2;
    const r = runService(s, v.id, false);
    s.day = before;
    s.slot = slot;
    if (r.ok) out.push(`🏪 ${v.name} ran dinner without you: ${r.served} served, ₦${(r.revenue ?? 0).toLocaleString("en")} in.`);
  }
  return out;
}

export function weeklyVenues(s: GameState): string[] {
  const k = s.kitchen;
  if (!k) return [];
  const out: string[] = [];
  for (const v of k.venues) {
    const t = venueType(v.type);
    if (!t) continue;
    const manager = v.staff.some((x) => x.role === "manager");
    const wages = v.staff.reduce((sum, x) => sum + x.salary, 0);
    const bills = Math.round((t.rent + wages) * (manager ? 0.95 : 1));
    s.stats.money -= bills;
    v.week.cost += bills;
    out.push(`🏪 ${v.name}: week's takings ₦${v.week.revenue.toLocaleString("en")}, costs ₦${v.week.cost.toLocaleString("en")} (rent and wages ₦${bills.toLocaleString("en")}).`);
    v.week = { revenue: 0, cost: 0 };
    // Staff who've had enough.
    for (const st of [...v.staff]) {
      if (st.stress >= 85 && Math.random() < 0.35) {
        v.staff = v.staff.filter((x) => x !== st);
        out.push(`😤 ${st.name} quit ${v.name}: "I'm tired of this kitchen."`);
      } else st.stress = Math.max(0, st.stress - 25);
    }
    // Health inspectors.
    if (Math.random() < 0.35 && v.services > 0) {
      if (v.clean < 45) {
        const fine = Math.round(50000 + (t.cost / 100) * (1 - v.clean / 45));
        s.stats.money -= fine;
        v.closedUntil = s.day + 2;
        v.rating = Math.max(0, v.rating - 8);
        v.inspections = [{ day: s.day, passed: false, note: `Failed: dirty kitchen. Fined ₦${fine.toLocaleString("en")} and closed for 2 days.` }, ...v.inspections].slice(0, 8);
        out.push(`🚫 Health inspectors closed ${v.name} for two days and fined you ₦${fine.toLocaleString("en")}. Clean it up.`);
      } else {
        v.rating = Math.min(100, v.rating + 1);
        v.inspections = [{ day: s.day, passed: true, note: v.clean >= 80 ? "Passed with top marks." : "Passed." }, ...v.inspections].slice(0, 8);
        out.push(`✅ ${v.name} passed a surprise health inspection.`);
      }
    }
  }
  out.push(...weeklyFoodEvents(s));
  return out;
}

export function deepClean(s: GameState, vid: string): string {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  const t = v && venueType(v.type);
  if (!v || !t) return "";
  const cost = Math.round(5000 + t.cost / 400);
  if (s.stats.money < cost) return `A deep clean costs ₦${cost.toLocaleString("en")}.`;
  s.stats.money -= cost;
  v.clean = 100;
  for (const o of v.equipment) o.clean = 100;
  return `Cleaners scrub ${v.name} top to bottom for ₦${cost.toLocaleString("en")}. Spotless.`;
}

export function promote(s: GameState, vid: string): string {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  if (!v) return "";
  const cost = 25000 + Math.round((venueType(v.type)?.cost ?? 0) / 200);
  if (s.stats.money < cost) return `A promotion campaign costs ₦${cost.toLocaleString("en")}.`;
  s.stats.money -= cost;
  s.flags[`promo_${v.id}`] = s.day + 6;
  v.week.cost += cost;
  return `📣 Flyers, Instagram ads and a food blogger visit: more customers at ${v.name} for a week. ₦${cost.toLocaleString("en")}.`;
}

export function sellVenue(s: GameState, vid: string): string {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  const t = v && venueType(v.type);
  if (!v || !t) return "";
  const value = Math.round(t.cost * (0.35 + v.rating / 250));
  k.venues = k.venues.filter((x) => x.id !== vid);
  s.stats.money += value;
  return `You sell ${v.name} for ₦${value.toLocaleString("en")}.`;
}

export function moveTruck(s: GameState, vid: string, district: string): string {
  const k = kitchen(s);
  const v = k.venues.find((x) => x.id === vid);
  if (!v || !venueType(v.type)?.mobile || !DISTRICT_FOOT[district]) return "";
  const cost = 4000;
  if (s.stats.money < cost) return "You need ₦4,000 for fuel.";
  s.stats.money -= cost;
  v.district = district;
  return `🚚 You drive the truck to ${districtName(district)}. ₦4,000 of fuel.`;
}

// ── Catering ─────────────────────────────────────────────────────────────────

const GIGS = [
  { title: "Owambe in Asokoro", guests: [80, 200], courses: ["main", "drink"] as const, pay: 2600 },
  { title: "Office lunch, CBD", guests: [20, 50], courses: ["main"] as const, pay: 3000 },
  { title: "Wedding reception, Maitama", guests: [150, 300], courses: ["main", "dessert", "drink"] as const, pay: 4200 },
  { title: "Child's birthday party, Gwarinpa", guests: [25, 60], courses: ["main", "dessert"] as const, pay: 2200 },
  { title: "Church harvest, Garki", guests: [60, 150], courses: ["main", "drink"] as const, pay: 1800 },
  { title: "Embassy cocktail evening", guests: [40, 90], courses: ["main", "dessert", "drink"] as const, pay: 6500 },
];

function rollGigs(s: GameState, k: Kitchen) {
  k.catering = k.catering.filter((c) => c.deadline >= s.day && (c.accepted || c.deadline - s.day >= 2));
  const has = k.venues.length > 0;
  if (!has || k.catering.filter((c) => !c.accepted).length >= 3) return [];
  const caterer = k.venues.some((v) => v.type === "catering");
  const n = caterer ? 2 : Math.random() < 0.5 ? 1 : 0;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const g = GIGS[Math.floor(Math.random() * GIGS.length)]!;
    const guests = Math.round((g.guests[0] + Math.random() * (g.guests[1] - g.guests[0])) / (caterer ? 1 : 3) / 5) * 5 || 10;
    const c: Catering = {
      id: uid("cat"),
      title: g.title,
      guests,
      needs: g.courses.map((course) => ({ course, qty: guests })),
      pay: Math.round((guests * g.pay * g.courses.length * (0.85 + s.stats.reputation / 200)) / 1000) * 1000,
      deadline: s.day + 4 + Math.floor(Math.random() * 4),
      accepted: false,
      ready: {},
      quality: 0,
    };
    k.catering.push(c);
    out.push(`🍱 Catering request: ${c.title} for ${guests} guests, ₦${c.pay.toLocaleString("en")}.`);
  }
  return out;
}

export function acceptCatering(s: GameState, id: string): string {
  const k = kitchen(s);
  const c = k.catering.find((x) => x.id === id);
  if (!c || c.accepted) return "";
  c.accepted = true;
  return `Accepted: ${c.title}. Have ${c.needs.map((n) => `${n.qty} ${n.course}s`).join(", ")} ready by day ${c.deadline}.`;
}

/** Cook a batch for a catering job at one of your venues: as many portions of one recipe as the stock allows. */
export function cookForCatering(s: GameState, id: string, vid: string, recipeId: string): string {
  const k = kitchen(s);
  const c = k.catering.find((x) => x.id === id);
  const v = k.venues.find((x) => x.id === vid);
  const r = recipe(recipeId);
  if (!c || !v || !r || !c.accepted) return "";
  const course = r.course === "drink" ? "drink" : r.course === "dessert" || r.course === "baked" ? "dessert" : "main";
  const need = c.needs.find((n) => n.course === course);
  if (!need) return `They didn't ask for any ${course === "main" ? "main dishes" : `${course}s`}.`;
  const cooks = v.staff.filter((x) => COOK_ROLES.includes(x.role));
  const skill = Math.max(k.skills[mainSkill(r)], ...cooks.map((x) => x.skill)) + Math.min(10, cooks.length * 2);
  let made = 0;
  let q = 0;
  const target = need.qty - (c.ready[course] ?? 0);
  while (made < target) {
    const res: { ok: boolean; dish?: Dish } = cookRecipe(s, v.id, r.id, staffPerf(r, skill, r.target), { staffSkill: skill });
    if (!res.ok || !res.dish) break;
    made += r.serves;
    q += res.dish.scores.overall * r.serves;
  }
  if (!made) {
    const bought = restock(s, { ...v, menu: [{ recipe: r.id, price: 0, tier: "standard", active: true, sold: 0, avg: 0 }] }, Math.min(target, 60));
    return bought.cost ? `Bought ingredients for ₦${bought.cost.toLocaleString("en")}. Cook again.` : `${v.name} doesn't have the ingredients or kit for ${r.name.toLowerCase()}.`;
  }
  const before = c.ready[course] ?? 0;
  c.ready[course] = Math.min(need.qty, before + made);
  const total = Object.values(c.ready).reduce((a, b) => a + b, 0);
  c.quality = Math.round((c.quality * (total - made) + q) / Math.max(1, total));
  return `Cooked ${made} portions of ${r.name.toLowerCase()} (${Math.round(q / made)}/100). ${course}: ${c.ready[course]}/${need.qty}.`;
}

export function deliverCatering(s: GameState, id: string): string {
  const k = kitchen(s);
  const c = k.catering.find((x) => x.id === id);
  if (!c || !c.accepted) return "";
  const done = c.needs.every((n) => (c.ready[n.course] ?? 0) >= n.qty);
  if (!done) return "It's not all ready yet.";
  const pay = Math.round(c.pay * (0.6 + c.quality / 250));
  s.stats.money += pay;
  s.stats.reputation = Math.min(100, s.stats.reputation + (c.quality >= 70 ? 3 : c.quality >= 50 ? 1 : -2));
  k.catering = k.catering.filter((x) => x.id !== id);
  return c.quality >= 70
    ? `🎉 ${c.title}: the guests rave about the food. Paid ₦${pay.toLocaleString("en")} with a bonus, and they'll tell their friends.`
    : c.quality >= 50
      ? `${c.title}: delivered on time. Paid ₦${pay.toLocaleString("en")}.`
      : `${c.title}: the client complains about the food and pays only ₦${pay.toLocaleString("en")}.`;
}

/** Missed catering deadlines hurt. */
export function lateCatering(s: GameState): string[] {
  const k = s.kitchen;
  if (!k) return [];
  const out: string[] = [];
  for (const c of k.catering) {
    if (c.accepted && c.deadline < s.day) {
      s.stats.reputation = Math.max(0, s.stats.reputation - 5);
      out.push(`😡 You missed the catering job "${c.title}". The client is telling everyone.`);
    }
  }
  k.catering = k.catering.filter((c) => !(c.accepted && c.deadline < s.day));
  return out;
}

// ── Festivals and competitions ───────────────────────────────────────────────

const THEMES: { theme: string; title: string; match: (d: Dish) => boolean }[] = [
  { theme: "jollof", title: "Abuja Jollof Wars", match: (d) => d.recipe.includes("jollof") },
  { theme: "dessert", title: "Sweet Tooth Showdown", match: (d) => d.tags.includes("dessert") || d.tags.includes("sweet") },
  { theme: "fusion", title: "Fusion Kitchen Challenge", match: (d) => recipe(d.recipe)?.cuisine === "Fusion" || Boolean(d.signature) },
  { theme: "soup", title: "Soup Pot Championship", match: (d) => recipe(d.recipe)?.course === "soup" },
  { theme: "street", title: "Street Food Throwdown", match: (d) => d.tags.includes("street") },
  { theme: "baking", title: "Great Abuja Bake-Off", match: (d) => d.tags.includes("baked") },
];

function weeklyFoodEvents(s: GameState): string[] {
  const k = s.kitchen;
  if (!k) return [];
  const out = rollGigs(s, k);
  k.events = k.events.filter((e) => e.day >= s.day - 1 && !e.done);
  if (k.events.length < 2 && Math.random() < 0.6) {
    if (Math.random() < 0.5) {
      const th = THEMES[Math.floor(Math.random() * THEMES.length)]!;
      const day = s.day + 2 + Math.floor(Math.random() * 4);
      k.events.push({ id: uid("ev"), kind: "competition", title: th.title, day, theme: th.theme, prize: 150000 + Math.floor(Math.random() * 6) * 50000, done: false });
      out.push(`🏆 ${th.title} on day ${day}. Bring a ${th.theme} dish to the Culinary Academy.`);
    } else {
      const day = s.day + 2 + Math.floor(Math.random() * 4);
      k.events.push({ id: uid("ev"), kind: "festival", title: "Abuja Food Festival, Millennium Park", day, prize: 0, done: false });
      out.push(`🎪 Abuja Food Festival on day ${day}: crowds all day. Sell your food there.`);
    }
  }
  return out;
}

/** Enter a competition with a dish you've cooked. Judges taste blind. */
export function enterCompetition(s: GameState, eventId: string, dishId: string): string {
  const k = kitchen(s);
  const e = k.events.find((x) => x.id === eventId);
  const d = k.leftovers.find((x) => x.id === dishId);
  if (!e || !d || e.kind !== "competition" || e.done) return "";
  if (e.day !== s.day) return `The competition is on day ${e.day}.`;
  const th = THEMES.find((x) => x.theme === e.theme);
  const fits = th ? th.match(d) : true;
  const creativity = (d.signature ? 8 : 0) + (recipe(d.recipe)?.cuisine === "Fusion" ? 6 : 0) + k.skills.creation / 12;
  const judge = d.scores.taste * 0.5 + d.scores.presentation * 0.25 + d.scores.texture * 0.15 + creativity + (fits ? 10 : -25) + (Math.random() - 0.5) * 12;
  const rivals = [62, 70, 76, 80].map((x) => x + (Math.random() - 0.5) * 14);
  const place = 1 + rivals.filter((r) => r > judge).length;
  e.done = true;
  d.portions -= 1;
  if (d.portions <= 0) k.leftovers = k.leftovers.filter((x) => x.id !== dishId);
  if (!fits) return `The judges frown: "This isn't a ${e.theme} dish." You place ${place}th of 5.`;
  if (place === 1) {
    s.stats.money += e.prize;
    s.stats.reputation = Math.min(100, s.stats.reputation + 6);
    const secret = ["sushi", "mocktail"].find((r) => !k.recipes[r]);
    const prize = secret && Math.random() < 0.6 && learn2(k, secret) ? ` One of the judges is so impressed they teach you their ${recipe(secret)?.name.toLowerCase()} recipe.` : "";
    for (const v of k.venues) v.rating = Math.min(100, v.rating + 4);
    return `🏆 You WIN ${e.title}! ₦${e.prize.toLocaleString("en")}, a trophy and your name in the papers.${prize}`;
  }
  if (place <= 3) {
    const prize = Math.round(e.prize / (place === 2 ? 3 : 6));
    s.stats.money += prize;
    s.stats.reputation = Math.min(100, s.stats.reputation + 2);
    return `🥈 ${place === 2 ? "Second" : "Third"} place at ${e.title}. ₦${prize.toLocaleString("en")} and a handshake from the judges.`;
  }
  return `You place ${place}th of 5 at ${e.title}. The judges say your ${d.name.toLowerCase()} "needs more confidence".`;
}

function learn2(k: Kitchen, id: string): boolean {
  if (k.recipes[id]) return false;
  k.recipes[id] = { level: "known", cooked: 0, best: 0, total: 0 };
  return true;
}

/** Sell cooked food at the festival: from your leftovers, or run a festival service at one of your venues. */
export function sellAtFestival(s: GameState, eventId: string): string {
  const k = kitchen(s);
  const e = k.events.find((x) => x.id === eventId);
  if (!e || e.kind !== "festival" || e.done) return "";
  if (e.day !== s.day) return `The festival is on day ${e.day}.`;
  const portions = k.leftovers.reduce((a, d) => a + d.portions, 0);
  if (!portions) return "Bring food! Cook at home first; everything you've cooked goes on the stall.";
  let revenue = 0;
  let qsum = 0;
  for (const d of k.leftovers) {
    const r = recipe(d.recipe);
    const each = Math.round(((r?.value ?? 800) * (0.7 + d.scores.overall / 150)) / 50) * 50;
    revenue += each * d.portions;
    qsum += d.scores.overall * d.portions;
  }
  const fee = 15000;
  const q = Math.round(qsum / portions);
  k.leftovers = [];
  e.done = true;
  s.stats.money += revenue - fee;
  s.stats.reputation = Math.min(100, s.stats.reputation + (q >= 70 ? 3 : 1));
  s.stats.network = Math.min(100, s.stats.network + 2);
  return `🎪 You sell out ${portions} portions at the festival: ₦${revenue.toLocaleString("en")} minus the ₦${fee.toLocaleString("en")} stall fee. ${q >= 70 ? "People keep asking where your shop is." : "A fun day."}`;
}

export { COOK_ROLES };
