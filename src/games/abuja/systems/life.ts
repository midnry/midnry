import type { GameState, Life } from "./types";

// Everyday life in Abuja: food, water, clean clothes and the small rules that
// come with them. Saves made before these existed have no `life`; it is filled
// in with sensible defaults the first time it is needed.

/** Clothes look dirty this many days after the last wash. */
export const DIRTY_AFTER = 2;

export function freshLife(day: number): Life {
  return {
    food: 80,
    water: 80,
    washed: day,
    credits: [],
    frozen: null,
    hospitalBill: 0,
    injury: null,
    power: { owed: 0, cut: false },
    license: false,
    car: null,
    carUntil: 0,
    driving: false,
    efcc: null,
    businesses: [],
    offenses: 0,
  };
}

/** The life block, created on first use. Call inside `update` only. */
export function life(s: GameState): Life {
  if (!s.life) s.life = freshLife(s.day);
  // Fields added after the first release of `life`.
  s.life.businesses ??= [];
  s.life.offenses ??= 0;
  return s.life;
}

/** Read-only view for the UI: defaults when an old save has no `life` yet. */
export function lifeOf(s: GameState): Life {
  return s.life ?? freshLife(s.day);
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function feed(s: GameState, amount: number) {
  const l = life(s);
  l.food = clamp(l.food + amount);
}

export function drink(s: GameState, amount: number) {
  const l = life(s);
  l.water = clamp(l.water + amount);
}

export function wash(s: GameState) {
  life(s).washed = s.day;
}

export function isDirty(s: GameState): boolean {
  if (s.chapter || s.stage !== "adult") return false;
  return s.day - lifeOf(s).washed >= DIRTY_AFTER;
}

/** Days since the clothes were washed, for the wardrobe and HUD. */
export function daysUnwashed(s: GameState): number {
  return Math.max(0, s.day - lifeOf(s).washed);
}

/** How full and how watered: words for the HUD and warnings. */
export function hungerWord(food: number): string {
  return food <= 0 ? "Starving" : food < 20 ? "Very hungry" : food < 45 ? "Hungry" : food < 75 ? "Fine" : "Full";
}

export function thirstWord(water: number): string {
  return water <= 0 ? "Dehydrated" : water < 20 ? "Very thirsty" : water < 45 ? "Thirsty" : water < 75 ? "Fine" : "Refreshed";
}

/**
 * Time passing during the day: each slot burns food and water. Running on
 * empty costs energy and health. Returns warnings for the toast.
 */
export function burn(s: GameState, slots: number): string[] {
  if (slots <= 0 || s.chapter) return [];
  const l = life(s);
  const before = { food: l.food, water: l.water };
  l.food = clamp(l.food - 9 * slots);
  l.water = clamp(l.water - 13 * slots);
  const out: string[] = [];
  if (l.food <= 0) {
    s.stats.health = clamp(s.stats.health - 5 * slots);
    s.stats.energy = clamp(s.stats.energy - 6 * slots);
    out.push("You're starving. Your hands shake. Eat something now. 🍲");
  } else if (l.food < 25 && before.food >= 25) out.push("Your stomach is growling. Time to eat. 🍲");
  if (l.water <= 0) {
    s.stats.health = clamp(s.stats.health - 7 * slots);
    s.stats.energy = clamp(s.stats.energy - 6 * slots);
    out.push("You're dehydrated. Your head is pounding. Drink water now. 💧");
  } else if (l.water < 25 && before.water >= 25) out.push("Your throat is dry. Buy some pure water. 💧");
  return out;
}

/** Overnight: you wake up hungry and thirsty. */
export function overnight(s: GameState): string[] {
  if (s.chapter) return [];
  const l = life(s);
  l.food = clamp(l.food - 15);
  l.water = clamp(l.water - 18);
  const out: string[] = [];
  if (l.food < 20) {
    s.stats.health = clamp(s.stats.health - 4);
    out.push("You went to bed hungry and woke up weak.");
  }
  if (l.water < 20) {
    s.stats.health = clamp(s.stats.health - 4);
    out.push("You woke up with a dry mouth and a headache.");
  }
  return out;
}

// ── Reputation ───────────────────────────────────────────────────────────────

/** How much reputation each kind of bad behaviour costs when people see it. */
export const OFFENSES: Record<string, { rep: number; line: string }> = {
  dirty: { rep: 2, line: "People notice your dirty clothes. Reputation -2." },
  steal: { rep: 12, line: "Caught stealing. Word travels fast in Abuja. Reputation -12." },
  insult: { rep: 4, line: "Insulting people in public is not a good look. Reputation -4." },
  fraud: { rep: 10, line: "Your name is now linked to fraud. Reputation -10." },
  bribe: { rep: 3, line: "Someone filmed you settling the officer. Reputation -3." },
  noshow: { rep: 3, line: "You didn't show up. People remember. Reputation -3." },
  fight: { rep: 6, line: "You fought in public. Reputation -6." },
};

/** Reputation loss for being seen doing something bad. Returns the line to show. */
export function offense(s: GameState, kind: string): string {
  const o = OFFENSES[kind] ?? { rep: 3, line: "That didn't look good. Reputation -3." };
  s.stats.reputation = clamp(s.stats.reputation - o.rep);
  life(s).offenses += 1;
  return o.line;
}

// ── Food delivery ────────────────────────────────────────────────────────────

export type Meal = { id: string; name: string; icon: string; price: number; food: number; water: number; from: string };

export const DELIVERY_FEE = 800;

export const MENU: Meal[] = [
  { id: "jollof", name: "Jollof rice & chicken", icon: "🍗", price: 4500, food: 60, water: 0, from: "Mama Cass Kitchen" },
  { id: "amala", name: "Amala, ewedu & assorted", icon: "🍲", price: 3500, food: 55, water: 0, from: "Iya Basira Buka" },
  { id: "suya", name: "Suya with onions", icon: "🍢", price: 3000, food: 35, water: 0, from: "Mallam Sani Suya" },
  { id: "shawarma", name: "Chicken shawarma", icon: "🌯", price: 4000, food: 45, water: 0, from: "Shawarma Spot, Wuse 2" },
  { id: "pounded", name: "Pounded yam & egusi", icon: "🥣", price: 5000, food: 70, water: 0, from: "Calabar Kitchen" },
  { id: "water", name: "Bottled water (pack of 6)", icon: "💧", price: 1500, food: 0, water: 70, from: "Shoprite" },
  { id: "chapman", name: "Chapman", icon: "🍹", price: 2500, food: 5, water: 40, from: "Jabi Lake Mall" },
  { id: "zobo", name: "Zobo (two bottles)", icon: "🧃", price: 1200, food: 0, water: 45, from: "Mama Zobo" },
];
