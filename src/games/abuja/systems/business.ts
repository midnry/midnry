import { life, lifeOf } from "./life";
import type { Business, GameState } from "./types";

// Businesses you build yourself: start small, grow it level by level, and
// only after weeks of real effort can you reach the big leagues.

export type BizDef = {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  /** Money to start it. Each later level costs more. */
  start: number;
  /** Profit per week at level 1, low and high. */
  weekly: [number, number];
  /** What you need before you can start it, shown on the app. */
  needs: { text: string; ok: (s: GameState) => boolean }[];
};

const MAX_LEVEL = 3;
/** Weeks a business must have run before it can grow to the next level. */
const WEEKS_PER_LEVEL = 3;

const has = (s: GameState, id: string, level = 1, weeks = 0) =>
  lifeOf(s).businesses.some((b) => b.id === id && b.level >= level && s.day - b.since >= weeks * 7);

export const BUSINESSES: BizDef[] = [
  {
    id: "mama_put",
    name: "Mama Put canteen",
    icon: "🍛",
    blurb: "Rice, beans and stew for drivers and traders. Small money, every day.",
    start: 80_000,
    weekly: [12_000, 30_000],
    needs: [],
  },
  {
    id: "minimart",
    name: "Mini-mart",
    icon: "🏪",
    blurb: "Provisions, drinks and toiletries in a shop on a busy street.",
    start: 600_000,
    weekly: [45_000, 110_000],
    needs: [
      { text: "Registered with CAC", ok: (s) => Boolean(s.flags.cac) },
      { text: "Trade 25", ok: (s) => s.skills.trade >= 25 },
    ],
  },
  {
    id: "logistics",
    name: "Logistics company",
    icon: "🚚",
    blurb: "Vans and bikes moving goods across Abuja for shops and online sellers.",
    start: 3_000_000,
    weekly: [180_000, 420_000],
    needs: [
      { text: "Registered with CAC", ok: (s) => Boolean(s.flags.cac) },
      { text: "A mini-mart grown to level 2", ok: (s) => has(s, "minimart", 2) },
      { text: "Hustle 40", ok: (s) => s.skills.hustle >= 40 },
      { text: "Network 40", ok: (s) => s.stats.network >= 40 },
    ],
  },
  {
    id: "real_estate",
    name: "Real estate developer",
    icon: "🏗️",
    blurb: "Land in Lugbe, blocks of flats in Gwarinpa. Big money, bigger risks, and every permit is a battle.",
    start: 20_000_000,
    weekly: [900_000, 2_400_000],
    needs: [
      { text: "Registered with CAC", ok: (s) => Boolean(s.flags.cac) },
      { text: "A logistics company at level 3, running 8+ weeks", ok: (s) => has(s, "logistics", 3, 8) },
      { text: "Network 65", ok: (s) => s.stats.network >= 65 },
      { text: "Reputation 60", ok: (s) => s.stats.reputation >= 60 },
    ],
  },
];

export const bizDef = (id: string) => BUSINESSES.find((b) => b.id === id);

export function upgradeCost(def: BizDef, level: number): number {
  return Math.round(def.start * (0.8 + level * 0.7));
}

/** What the business is worth if you sold it, for net worth. */
export function bizValue(b: Business): number {
  const def = bizDef(b.id);
  return def ? Math.round(def.start * (0.6 + 0.5 * (b.level - 1))) + b.cash : b.cash;
}

export function bizWorth(s: GameState): number {
  return (s.life?.businesses ?? []).reduce((sum, b) => sum + bizValue(b), 0);
}

export function canStart(s: GameState, def: BizDef): string | null {
  if (lifeOf(s).businesses.some((b) => b.id === def.id)) return "You already run one.";
  const missing = def.needs.filter((n) => !n.ok(s));
  if (missing.length) return `Needs: ${missing.map((n) => n.text).join(", ")}`;
  if (s.stats.money < def.start) return `Needs ₦${def.start.toLocaleString("en")} to start`;
  return null;
}

export function startBusiness(s: GameState, id: string): string {
  const def = bizDef(id);
  if (!def) return "";
  const why = canStart(s, def);
  if (why) return why;
  s.stats.money -= def.start;
  life(s).businesses.push({ id, level: 1, since: s.day, cash: 0, lastVisit: s.day });
  s.stats.network = Math.min(100, s.stats.network + 2);
  return `${def.icon} Your ${def.name} is open for business. Check in on it often: businesses left alone do badly.`;
}

export function growWhy(s: GameState, b: Business): string | null {
  const def = bizDef(b.id);
  if (!def) return "Unknown business";
  if (b.level >= MAX_LEVEL) return "It's as big as it gets.";
  const weeks = Math.floor((s.day - b.since) / 7);
  const need = b.level * WEEKS_PER_LEVEL;
  if (weeks < need) return `Run it for ${need} weeks first (${weeks} so far)`;
  if (s.stats.reputation < 20 + b.level * 15) return `Needs Reputation ${20 + b.level * 15}`;
  const cost = upgradeCost(def, b.level);
  if (s.stats.money + b.cash < cost) return `Needs ₦${cost.toLocaleString("en")}`;
  return null;
}

export function growBusiness(s: GameState, id: string): string {
  const b = lifeOf(s).businesses.find((x) => x.id === id);
  const def = bizDef(id);
  if (!b || !def) return "";
  const why = growWhy(s, b);
  if (why) return why;
  let cost = upgradeCost(def, b.level);
  const fromCash = Math.min(b.cash, cost);
  b.cash -= fromCash;
  cost -= fromCash;
  s.stats.money -= cost;
  b.level += 1;
  s.stats.network = Math.min(100, s.stats.network + 3);
  s.stats.reputation = Math.min(100, s.stats.reputation + 2);
  return `${def.icon} Your ${def.name} grows to level ${b.level}. More staff, more customers, more wahala.`;
}

/** Check in: keeps staff honest and customers happy. Costs a slot of your day. */
export function visitBusiness(s: GameState, id: string): string {
  const b = life(s).businesses.find((x) => x.id === id);
  const def = bizDef(id);
  if (!b || !def) return "";
  b.lastVisit = s.day;
  s.skills.trade = Math.min(100, s.skills.trade + 1);
  s.skills.hustle = Math.min(100, s.skills.hustle + 1);
  return `You check the books at your ${def.name}, sort out a supplier and remind the staff who the oga is.`;
}

export function collect(s: GameState, id: string): number {
  const b = life(s).businesses.find((x) => x.id === id);
  if (!b || b.cash <= 0) return 0;
  const cash = b.cash;
  b.cash = 0;
  return cash;
}

/** Each week: profit (or loss) for every business, and the occasional disaster. */
export function weeklyBusiness(s: GameState): string[] {
  const out: string[] = [];
  for (const b of life(s).businesses) {
    const def = bizDef(b.id);
    if (!def) continue;
    const [lo, hi] = def.weekly;
    const skill = 1 + Math.min(0.4, (s.skills.trade + s.skills.hustle) / 500);
    let profit = Math.round((lo + Math.random() * (hi - lo)) * (1 + (b.level - 1) * 0.9) * skill);
    const away = s.day - b.lastVisit;
    if (away > 14) profit = -Math.round(lo * 0.5 * b.level);
    else if (away > 7) profit = Math.round(profit * 0.4);
    const roll = Math.random();
    if (roll < 0.04) {
      profit = -Math.round(def.start * 0.15);
      out.push(`${def.icon} Thieves broke into your ${def.name}. Losses: ₦${(-profit).toLocaleString("en")}.`);
    } else if (roll < 0.07) {
      profit = -Math.round(def.start * 0.08);
      out.push(`${def.icon} AMAC task force sealed your ${def.name} for 'permits'. Losses: ₦${(-profit).toLocaleString("en")}.`);
    } else if (away > 14) out.push(`${def.icon} Nobody has seen you at your ${def.name} for weeks. Staff are stealing. Loss this week.`);
    else out.push(`${def.icon} ${def.name}: ${profit >= 0 ? "+" : "-"}₦${Math.abs(profit).toLocaleString("en")} this week${away > 7 ? " (you haven't checked in lately)" : ""}.`);
    b.cash += profit;
    if (b.cash < -def.start) {
      out.push(`${def.icon} Your ${def.name} has collapsed under its debts. It's gone.`);
      b.level = 0;
    }
  }
  life(s).businesses = life(s).businesses.filter((b) => b.level > 0);
  return out;
}
