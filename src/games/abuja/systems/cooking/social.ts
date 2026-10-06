import { partnerName } from "../romance";
import type { GameState } from "../types";
import { learn } from "./cook";
import { ingredient } from "./ingredients";
import { equipment } from "./equipment";
import { kitchen } from "./kitchen";
import { recipe } from "./recipes";
import type { Dish, FoodTag, IngredientDef } from "./types";

// Cooking for people. Everyone has tastes: what they love, what they can't
// stand, how much pepper they can take, and sometimes an allergy. Feed them
// well and they warm to you; feed them badly (or feed them peanuts when they
// can't have them) and they remember.

export type Palate = {
  likes: FoodTag[];
  dislikes: FoodTag[];
  /** Pepper they enjoy, 0–10. */
  spice: number;
  favourite?: string;
  allergy?: IngredientDef["allergen"];
  vegetarian?: boolean;
  /** One line about how they eat, shown in the guest list. */
  note: string;
};

const PALATES: Record<string, Palate> = {
  tunde: { likes: ["local", "comfort", "meat", "spicy"], dislikes: ["healthy"], spice: 7, favourite: "jollof", note: "Eats anything with pepper. Jollof is his religion." },
  slim: { likes: ["street", "fast", "meat"], dislikes: ["healthy", "vegetarian"], spice: 6, favourite: "suya", note: "Fast, greasy, meaty. Calls salad 'grass'." },
  okafor: { likes: ["healthy", "local"], dislikes: ["fast", "cheap"], spice: 5, favourite: "efo_riro", allergy: "shellfish", note: "Healthy home cooking. Allergic to shellfish." },
  bolaji: { likes: ["foreign", "luxury", "dessert"], dislikes: ["street", "cheap"], spice: 2, favourite: "sushi", allergy: "nuts", note: "Fancy food only, mild pepper. Nut allergy." },
  love: { likes: ["local", "sweet", "dessert", "comfort"], dislikes: ["fast"], spice: 6, favourite: "jollof", note: "Loves home-cooked Nigerian food and anything sweet after." },
  uncle: { likes: ["meat", "local", "comfort", "spicy"], dislikes: ["foreign", "healthy"], spice: 8, favourite: "pepper_soup", note: "Pepper soup and a cold drink. Suspicious of 'oyinbo food'." },
  prophet: { likes: ["luxury", "meat"], dislikes: ["cheap"], spice: 5, note: "Says the Lord told him to eat well." },
};

const KIDS: Palate = { likes: ["sweet", "fast", "comfort", "baked"], dislikes: ["spicy", "healthy"], spice: 2, note: "Sweet things, chicken, nothing too peppery." };

const TAGS: FoodTag[] = ["spicy", "sweet", "healthy", "fast", "seafood", "meat", "dessert", "luxury", "local", "foreign", "comfort", "baked", "street"];

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Math.abs(h);
}

/** Someone's tastes: written for story characters, rolled (but fixed) for everyone else. */
export function palate(id: string): Palate {
  if (id === "kids") return KIDS;
  if (PALATES[id]) return PALATES[id];
  const h = hash(id);
  const like = [TAGS[h % TAGS.length]!, TAGS[(h >> 4) % TAGS.length]!];
  const dislike = TAGS.filter((t) => !like.includes(t))[(h >> 8) % (TAGS.length - 2)]!;
  const allergens: (IngredientDef["allergen"] | undefined)[] = [undefined, undefined, undefined, undefined, "nuts", "shellfish", "dairy", "gluten"];
  const allergy = allergens[(h >> 12) % allergens.length];
  const vegetarian = (h >> 16) % 11 === 0;
  const spice = (h >> 20) % 9;
  const words = [like.map((t) => t).join(" and "), dislike ? `not a fan of ${dislike}` : "", spice >= 7 ? "loves pepper" : spice <= 2 ? "mild pepper only" : "", vegetarian ? "vegetarian" : "", allergy ? `${allergy} allergy` : ""];
  return { likes: [...new Set(like)], dislikes: dislike ? [dislike] : [], spice, allergy, vegetarian, note: `Likes ${words.filter(Boolean).join(", ")}.` };
}

/** Allergens in a dish, from its recipe's ingredients. */
export function allergens(d: Dish): Set<string> {
  const r = recipe(d.recipe);
  const out = new Set<string>();
  for (const n of r?.needs ?? []) {
    const a = ingredient(n.id)?.allergen;
    if (a) out.add(a);
  }
  return out;
}

export type Verdict = { score: number; line: string; allergic: boolean };

/** What someone thinks of a dish, 0–100, and what they say. */
export function verdict(d: Dish, who: string, name: string): Verdict {
  const p = palate(who);
  if (p.allergy && allergens(d).has(p.allergy)) {
    return { score: 0, allergic: true, line: `${name} takes a bite, then stops. Their lips start to swell. ${cap(p.allergy)} allergy. You spend the evening at the pharmacy.` };
  }
  let score = d.scores.overall;
  const liked = d.tags.filter((t) => p.likes.includes(t)).length;
  const hated = d.tags.filter((t) => p.dislikes.includes(t)).length;
  score += Math.min(16, liked * 8) - hated * 10;
  score -= Math.abs(d.flavor.spice - p.spice) * 3;
  if (p.favourite && d.recipe === p.favourite) score += 12;
  if (d.signature) score += 4;
  if (p.vegetarian && (d.tags.includes("meat") || d.tags.includes("seafood"))) {
    return { score: 15, allergic: false, line: `${name} quietly pushes the meat to the side of the plate. They're vegetarian. You didn't ask.` };
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const spiceNote = d.flavor.spice - p.spice >= 4 ? " Too much pepper for them: they're sweating." : p.spice - d.flavor.spice >= 4 ? " They reach for the pepper sauce." : "";
  const fav = p.favourite && d.recipe === p.favourite && score >= 70 ? " Their favourite, done right." : "";
  const words =
    score >= 88
      ? `"Who taught you to cook like this?!" ${name} goes back for more.`
      : score >= 72
        ? `${name} clears the plate. "This is sweet o."`
        : score >= 55
          ? `${name} eats it all. "Not bad at all."`
          : score >= 35
            ? `${name} eats politely and says it's "interesting".`
            : `${name} takes three bites and says they had a late lunch.`;
  return { score, allergic: false, line: `${words}${fav}${spiceNote}` };
}

function cap(s: string) {
  return s[0]!.toUpperCase() + s.slice(1);
}

export type Guest = { id: string; name: string; kind: "friend" | "partner" | "family" };

const FRIENDS = ["tunde", "slim", "okafor", "bolaji", "uncle"];

/** People you could cook for: friends you've met and anyone you're seeing. Not twice in a day. */
export function guestList(s: GameState): (Guest & { palate: Palate; fedToday: boolean })[] {
  const out: (Guest & { palate: Palate; fedToday: boolean })[] = [];
  for (const id of FRIENDS) {
    const n = s.npcs[id];
    if (!n?.met || n.rel <= -20) continue;
    out.push({ id, name: npcName(id), kind: "friend", palate: palate(id), fedToday: s.flags[`fed_${id}`] === s.day });
  }
  for (const p of Object.values(s.partners)) {
    if (p.status === "ex" || p.status === "met") continue;
    out.push({ id: p.id, name: partnerName(s, p.id), kind: "partner", palate: palate(p.id), fedToday: s.flags[`fed_${p.id}`] === s.day });
  }
  if (s.children.length) out.push({ id: "kids", name: s.children.length > 1 ? "The kids" : s.children[0]!.name, kind: "family", palate: KIDS, fedToday: s.flags.fed_kids === s.day });
  return out;
}

const NAMES: Record<string, string> = { tunde: "Tunde", slim: "Slim", okafor: "Mrs. Okafor", bolaji: "Bolaji", uncle: "Uncle Sylvester" };
const npcName = (id: string) => NAMES[id] ?? id;

export type MealKind = "meal" | "dinner" | "romantic";

/** Seats at your table: chairs from dining tables, plus the sofa. */
export function seats(s: GameState): number {
  const k = s.kitchen;
  if (!k) return 2;
  return 2 + k.equipment.reduce((sum, o) => sum + (o.broken ? 0 : (equipment(o.def)?.seats ?? 0)), 0);
}

/** One portion each, your plate included. Returns what everyone said, and how it went overall. */
export function shareMeal(
  s: GameState,
  dishId: string,
  guests: Guest[],
  kind: MealKind,
  affect: (g: Guest, change: number) => void,
): { ok: boolean; lines: string[]; avg: number } {
  const k = kitchen(s);
  const d = k.leftovers.find((x) => x.id === dishId);
  if (!d || !guests.length) return { ok: false, lines: [], avg: 0 };
  if (d.portions < guests.length) return { ok: false, lines: [`There's only enough for ${d.portions}. Cook more or invite fewer people.`], avg: 0 };
  if (kind === "dinner" && guests.length + 1 > seats(s)) return { ok: false, lines: [`You only have seats for ${seats(s)}. Get a bigger dining table.`], avg: 0 };
  if (kind === "romantic" && (guests.length !== 1 || guests[0]!.kind !== "partner")) return { ok: false, lines: ["A romantic dinner is for two."], avg: 0 };
  const lines: string[] = [];
  let total = 0;
  for (const g of guests) {
    const v = verdict(d, g.id, g.name);
    total += v.score;
    lines.push(v.line);
    const weight = kind === "romantic" ? 1.6 : kind === "dinner" ? 1.2 : 1;
    const change = v.allergic ? -12 : Math.max(-8, Math.min(10, Math.round(((v.score - 50) / 5) * weight)));
    affect(g, change);
    const fan = (k.fans[g.id] ??= { meals: 0, best: 0, last: 0 });
    fan.meals += 1;
    fan.best = Math.max(fan.best, v.score);
    fan.last = v.score;
    s.flags[`fed_${g.id}`] = s.day;
  }
  d.portions -= guests.length;
  if (d.portions <= 0) k.leftovers = k.leftovers.filter((x) => x.id !== dishId);
  const avg = Math.round(total / guests.length);
  if (kind === "dinner") {
    s.stats.network = Math.min(100, s.stats.network + guests.filter(() => avg >= 55).length);
    if (avg >= 75) s.stats.reputation = Math.min(100, s.stats.reputation + 2);
    lines.push(avg >= 75 ? "🎉 People will talk about this dinner for weeks." : avg >= 50 ? "A nice evening. Everyone leaves fed and happy." : "The conversation was better than the food.");
  }
  if (kind === "romantic") lines.push(avg >= 75 ? "💕 Candles, good food and nowhere else to be. A night to remember." : avg >= 50 ? "A sweet evening, even if the food was just okay." : "They appreciate the effort. The food… less so.");
  s.stats.stress = Math.max(0, s.stats.stress - (kind === "meal" ? 3 : 7));
  return { ok: true, lines, avg };
}

/** Your mother still knows things you don't. Once a week. */
export function callMum(s: GameState): string {
  const k = kitchen(s);
  const week = Math.floor(s.day / 7);
  if (s.flags.mum_recipe_week === week) return "Mama already gave you a lesson this week. \"Practise what I told you first.\"";
  s.flags.mum_recipe_week = week;
  if (learn(s, "egusi")) return "📞 Mama talks you through her egusi soup, step by step, twice. \"Fry the egusi small before the water. Don't rush it.\" New recipe: Egusi soup.";
  k.skills.seasoning = Math.min(100, k.skills.seasoning + 2);
  k.skills.cooking = Math.min(100, k.skills.cooking + 1);
  const tips = [
    "\"Taste as you go. Your tongue is the recipe.\"",
    "\"Wash your meat with lime before you season it.\"",
    "\"Stock cubes are not a personality. Use real pepper.\"",
    "\"Let the stew fry until the oil floats. Patience.\"",
  ];
  return `📞 Mama: ${tips[week % tips.length]} Your seasoning improves a little.`;
}
