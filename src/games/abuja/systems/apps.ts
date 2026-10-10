import { NEPO_IDS } from "./nepo";
import type { GameState } from "./types";

// Which phone apps you see, and when. A new player starts with the everyday
// ones; the rest appear when they become useful (a degree opens Bank Careers,
// a first brush with the police opens Legal, and so on), each marked "New"
// until you open it. After four weeks of adult life everything is there.

export const ALWAYS = ["missions", "wallet", "news", "social", "food", "jobs", "contacts", "map", "stats", "wardrobe", "settings", "gadgets", "bills"];

const adultDays = (s: GameState) => (s.flags.adult_day0 == null ? -1 : s.day - Number(s.flags.adult_day0));
const adult = (s: GameState) => s.age >= 18 && adultDays(s) >= 0;

const RULES: Record<string, (s: GameState) => boolean> = {
  kitchen: adult,
  linkup: adult,
  loans: adult,
  odds: adult,
  business: (s) => adult(s) && (s.stats.money >= 80_000 || Boolean(s.life?.businesses?.length) || Boolean(s.flags.cac)),
  deals: (s) => adult(s) && (adultDays(s) >= 7 || s.stats.network >= 25),
  trade: (s) => adult(s) && (s.stats.money >= 150_000 || Boolean(s.market?.positions.length) || Boolean(s.market?.history.length)),
  family: (s) => adult(s) && (s.children.length > 0 || Object.values(s.partners).some((p) => p.status !== "met" && p.status !== "ex") || adultDays(s) >= 14),
  japa: (s) => adult(s) && (Boolean(s.certs.degree) || s.stats.money >= 1_000_000 || Boolean(s.japa)),
  careers: (s) => Boolean(s.certs.degree) || Boolean(s.banking),
  legal: (s) => Boolean(s.justice?.record.length || s.justice?.case) || Boolean(s.flags.arrested) || s.stats.heat >= 25,
  connects: (s) => NEPO_IDS.some((id) => s.npcs[id]?.met),
  city: (s) => adult(s) && (s.stats.money >= 1_000_000 || Object.values(s.city?.lots ?? {}).some((l) => l.owned)),
  emeka: (s) => (s.emeka?.met ?? -1) >= 0,
};

const list = (s: GameState, key: string) => String(s.flags[key] ?? "").split(",").filter(Boolean);

/** Is this app on your phone right now? Once shown, an app stays. */
export function appVisible(s: GameState, id: string): boolean {
  if (ALWAYS.includes(id)) return true;
  // Lives started before apps unlocked step by step keep the full phone.
  if (!s.flags.apps_v && id !== "emeka") return true;
  if (list(s, "apps_seen").includes(id)) return true;
  if (id === "emeka") return RULES.emeka!(s);
  if (adultDays(s) >= 28) return true;
  return RULES[id]?.(s) ?? true;
}

/** Shown, but not opened yet: wears a "New" badge. Older saves start with nothing marked new. */
export function appIsNew(s: GameState, id: string): boolean {
  if (ALWAYS.includes(id) || !s.flags.apps_v || s.flags.apps_opened == null) return false;
  return !list(s, "apps_opened").includes(id);
}

/** Remember what the phone shows now, so apps never disappear again. */
export function rememberApps(s: GameState, ids: string[]) {
  const seen = new Set(list(s, "apps_seen"));
  // First time on this version: everything already visible counts as opened (no wall of "New").
  if (s.flags.apps_opened == null) s.flags.apps_opened = ids.join(",");
  for (const id of ids) seen.add(id);
  s.flags.apps_seen = [...seen].join(",");
}

export function markOpened(s: GameState, id: string) {
  const opened = new Set(list(s, "apps_opened"));
  opened.add(id);
  s.flags.apps_opened = [...opened].join(",");
}

/** First time you open an app: one sentence on what it's for. */
export const APP_TIPS: Record<string, string> = {
  missions: "Your goals in Abuja. Each one you finish moves you closer to financial freedom.",
  wallet: "Your money, your bank account and anything you owe, in one place.",
  news: "What's happening in Abuja. Big stories can move prices in the Trade app.",
  social: "Post, grow followers and maybe earn from them. Your reputation follows you here.",
  food: "Order food to wherever you are. Keep an eye on your Food and Water bars.",
  kitchen: "Cook at home for less than ChopNow, and one day sell what you cook.",
  bills: "Electricity and hospital bills. Unpaid bills grow and bring trouble.",
  business: "Start a business, check in on it often, and grow it level by level.",
  deals: "Negotiate rent, suppliers and salaries. Good deals save you money every week.",
  trade: "Buy and sell stocks, crypto and dollars. Prices move every day, and you can lose.",
  linkup: "Meet people, date, and maybe settle down. Partners remember how you treat them.",
  family: "Your partner, children and parents. Children need school fees; parents need you.",
  japa: "Plan a move abroad: pick a route, sit the IELTS, show your funds and apply. Leaving ends this life.",
  loans: "Quick loans with steep interest. Miss payments and they come looking for you.",
  jobs: "Find work. A steady job pays every week; side hustles pay right away.",
  careers: "Your degree opens the banks. Apply, pass the tests and climb the ladder.",
  legal: "Your record, cases and lawyers. Lay low or settle before things get worse.",
  connects: "Friends from powerful families. Their favours open doors, but each one costs friendship.",
  odds: "Sports betting. Fun with small stakes; the house usually wins.",
  emeka: "Time with Emeka D.",
  gadgets: "Buy a better phone. Better phones open better apps and look good.",
  contacts: "Everyone you know, and how they feel about you.",
  map: "Get a ride across Abuja: okada, keke, taxi or bus.",
  stats: "How your life is going: stats, skills and the moments that shaped you.",
  city: "Buy property and build on it. Tenants pay rent every week.",
  wardrobe: "Change your look. What you wear can change how people treat you.",
  settings: "Sound, look and controls.",
};

/** Show this app's tip? Only for lives started on this version, once per app. */
export const tipDue = (s: GameState, id: string) => Boolean(s.flags.apps_v) && Boolean(APP_TIPS[id]) && !list(s, "tips_seen").includes(id);

export function dismissTip(s: GameState, id: string) {
  const seen = new Set(list(s, "tips_seen"));
  seen.add(id);
  s.flags.tips_seen = [...seen].join(",");
}
