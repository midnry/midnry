import type { GameState } from "../types";
import { equipment, stats } from "./equipment";
import { ingredient } from "./ingredients";
import { capacity, effective, freshness, have, kitchen, take, uid } from "./kitchen";
import { recipe, RECIPES } from "./recipes";
import type { Dish, Flavor, Kitchen, Knowledge, Lot, Method, Owned, Performance, RecipeDef, Scores, SkillId, Step, Tier } from "./types";

// Cooking: ingredients → prep → cook → season → plate → quality → eat or sell.
// The UI plays out the hands-on steps and hands in a Performance; quick mode
// lets your skill play them for you. Everything that matters is here.

export type Place = { pantry: Lot[]; equipment: Owned[]; clean: number; where: "home" | string };

export function placeOf(s: GameState, where: "home" | string): Place | null {
  const k = kitchen(s);
  if (where === "home") return { pantry: k.pantry, equipment: k.equipment, clean: k.clean, where };
  const v = k.venues.find((x) => x.id === where);
  return v ? { pantry: v.stock, equipment: v.equipment, clean: v.clean, where } : null;
}

// ── What you can cook ────────────────────────────────────────────────────────

const NEEDS_KIT = new Set(["chop", "pound", "grate", "peel"]);

/** The best working kit for a step, or null if you have nothing that does it. */
export function kitFor(kit: Owned[], step: Step): Owned | null {
  let best: Owned | null = null;
  let bestQ = -1;
  for (const o of kit) {
    if (o.broken) continue;
    const def = equipment(o.def);
    if (!def) continue;
    const fits = step.kind === "cook" ? def.methods?.includes(step.method) : step.kind === "prep" ? def.prep?.includes(step.action) : false;
    if (!fits) continue;
    const q = stats(o.def, o.tier)?.quality ?? 0;
    if (q > bestQ) [best, bestQ] = [o, q];
  }
  return best;
}

export function missingKit(kit: Owned[], r: RecipeDef): string[] {
  const out: string[] = [];
  for (const step of r.steps) {
    if (step.kind === "cook" && !kitFor(kit, step)) out.push(METHOD_LABEL[step.method]);
    if (step.kind === "prep" && NEEDS_KIT.has(step.action) && !kitFor(kit, step)) out.push(PREP_LABEL[step.action]);
  }
  return [...new Set(out)];
}

export function missingFood(pantry: Lot[], r: RecipeDef): { id: string; need: number; have: number }[] {
  return r.needs.map((n) => ({ id: n.id, need: n.qty, have: have(pantry, n.id, n.qty) })).filter((x) => x.have < x.need);
}

export function knows(s: GameState, id: string): Knowledge | null {
  return s.kitchen?.recipes[id] ?? null;
}

export const METHOD_LABEL: Record<Method, string> = {
  boil: "Boiling", fry: "Frying", deepfry: "Deep frying", grill: "Grilling", roast: "Roasting", bake: "Baking", steam: "Steaming",
  smoke: "Smoking", braise: "Braising", stew: "Stewing", saute: "Sautéing", simmer: "Simmering", pressure: "Pressure cooking",
  slow: "Slow cooking", sousvide: "Sous vide", ferment: "Proving / fermenting", blend: "Blending", toast: "Toasting", brew: "Brewing",
  espresso: "Espresso", juice: "Juicing", freeze: "Freezing", raw: "Raw prep",
};
export const PREP_LABEL: Record<string, string> = { chop: "Chopping (knife)", mix: "Mixing", knead: "Kneading", marinate: "Marinating", peel: "Peeling", grate: "Grating", pound: "Pounding (mortar or blender)" };

// ── Skills and knowledge ─────────────────────────────────────────────────────

function gain(k: Kitchen, skill: SkillId, amount: number) {
  k.skills[skill] = Math.min(100, Math.round((k.skills[skill] + amount * (1 - k.skills[skill] / 120)) * 10) / 10);
}

export function mainSkill(r: RecipeDef): SkillId {
  if (r.course === "baked" || (r.course === "dessert" && r.steps.some((x) => x.kind === "cook" && x.method === "bake"))) return "baking";
  if (r.steps.some((x) => x.kind === "cook" && (x.method === "grill" || x.method === "smoke"))) return "grilling";
  return "cooking";
}

const LEVEL_BONUS = { known: 0, learned: 3, improved: 6, mastered: 10 } as const;

function advance(k: Kitchen, id: string, overall: number): string | null {
  const kn = (k.recipes[id] ??= { level: "known", cooked: 0, best: 0, total: 0 });
  kn.cooked += 1;
  kn.total += overall;
  kn.best = Math.max(kn.best, overall);
  const avg = kn.total / kn.cooked;
  const before = kn.level;
  if (kn.cooked >= 15 && kn.best >= 85) kn.level = "mastered";
  else if (kn.cooked >= 8 && avg >= 60 && kn.level !== "mastered") kn.level = "improved";
  else if (kn.cooked >= 3 && kn.level === "known") kn.level = "learned";
  return kn.level !== before ? kn.level : null;
}

export function learn(s: GameState, id: string): boolean {
  const k = kitchen(s);
  if (k.recipes[id] || !recipe(id)) return false;
  k.recipes[id] = { level: "known", cooked: 0, best: 0, total: 0 };
  return true;
}

// ── Quality ──────────────────────────────────────────────────────────────────

type Taste = Pick<Flavor, "spice" | "salt" | "sweet" | "sour">;

/** 0–100: how close your seasoning is to what the dish wants. */
export function seasoningScore(chosen: Taste, target: Taste): number {
  const d = Math.sqrt((["spice", "salt", "sweet", "sour"] as const).reduce((sum, key) => sum + (chosen[key] - target[key]) ** 2, 0));
  return Math.max(0, Math.round(100 - d * 13));
}

/** What quick mode does: your skill plays the steps for you. */
export function autoPerformance(k: Kitchen, r: RecipeDef, custom?: Taste): Performance {
  const sk = k.skills;
  const roll = (skill: number) => Math.max(5, Math.min(100, Math.round(42 + skill * 0.5 + (Math.random() - 0.5) * 24)));
  const noise = Math.max(0.3, 2.5 - sk.seasoning / 30);
  const base = custom ?? r.target;
  const jitter = (v: number) => Math.max(0, Math.min(10, Math.round((v + (Math.random() - 0.5) * 2 * noise) * 2) / 2));
  return {
    prep: r.steps.filter((x) => x.kind === "prep").map(() => roll(sk.knife)),
    cook: r.steps.filter((x) => x.kind === "cook").map(() => roll(sk[mainSkill(r)])),
    season: { spice: jitter(base.spice), salt: jitter(base.salt), sweet: jitter(base.sweet), sour: jitter(base.sour) },
    plate: roll(sk.presentation),
    quick: true,
  };
}

const avg = (xs: number[], fallback = 60) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : fallback);
const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

export function scoreDish(
  s: GameState,
  r: RecipeDef,
  used: Lot[],
  kit: Owned[],
  cleanliness: number,
  perf: Performance,
  opts: { improvised?: boolean; staffSkill?: number } = {},
): { scores: Scores; burnt: boolean; notes: string[] } {
  const k = kitchen(s);
  const notes: string[] = [];
  const weight = used.reduce((sum, l) => sum + l.qty, 0) || 1;
  const ingQ = used.reduce((sum, l) => sum + effective(l, s.day) * l.qty, 0) / weight;
  const fresh = (used.reduce((sum, l) => sum + freshness(l, s.day) * l.qty, 0) / weight) * 100;
  const kitQ = avg(r.steps.map((step) => kitFor(kit, step)).filter(Boolean).map((o) => stats(o!.def, o!.tier)?.quality ?? 50), 50);
  const skill = opts.staffSkill ?? k.skills[mainSkill(r)];
  const level = k.recipes[r.id]?.level ?? "known";
  const mastery = LEVEL_BONUS[level];
  const hard = Math.max(0, r.difficulty * 16 - skill) / 3;
  const dirty = cleanliness < 50 ? (50 - cleanliness) / 4 : 0;
  const prep = avg(perf.prep, 65);
  const cookAvg = avg(perf.cook, 65);
  const burnt = perf.cook.some((x) => x < 15);
  const seasonQ = r.steps.some((x) => x.kind === "season") ? seasoningScore(perf.season, r.target) : 70;
  const extras = (r.extras ?? []).filter((e) => used.some((l) => l.ing === e)).length * 2;
  const counters = k.equipment.some((o) => o.def === "counters" && !o.broken) ? 5 : 0;

  let taste = 0.4 * ingQ + 0.33 * seasonQ + 0.15 * cookAvg + 0.12 * kitQ + mastery + extras - hard - dirty;
  let texture = 0.55 * cookAvg + 0.2 * prep + 0.25 * kitQ + mastery / 2 - hard / 2;
  const presentation = 0.6 * perf.plate + 0.3 * k.skills.presentation + 10 + counters - (burnt ? 30 : 0);
  const fryPenalty = r.steps.some((x) => x.kind === "cook" && x.method === "deepfry") ? 8 : 0;
  const premium = used.filter((l) => l.tier === "premium" || l.tier === "homegrown").length * 2;
  const nutrition = r.nutrition + premium - fryPenalty + k.skills.nutrition / 10;
  if (burnt) {
    taste *= 0.4;
    texture *= 0.35;
    notes.push("Something burnt. The smell is everywhere.");
  }
  if (opts.improvised) {
    taste -= 6;
    texture -= 4;
  }
  if (seasonQ < 50 && r.steps.some((x) => x.kind === "season")) notes.push(seasonHint(perf.season, r.target));
  if (dirty > 5) notes.push("The kitchen is dirty, and it shows in the food.");
  if (fresh < 50) notes.push("Some ingredients were past their best.");
  const scores: Scores = { taste: clamp(taste), texture: clamp(texture), presentation: clamp(presentation), freshness: clamp(fresh), nutrition: clamp(nutrition), overall: 0 };
  scores.overall = clamp(0.45 * scores.taste + 0.2 * scores.texture + 0.15 * scores.presentation + 0.12 * scores.freshness + 0.08 * scores.nutrition);
  return { scores, burnt, notes };
}

export function seasonHint(chosen: Taste, target: Taste): string {
  const keys = ["spice", "salt", "sweet", "sour"] as const;
  const worst = keys.reduce((a, b) => (Math.abs(chosen[b] - target[b]) > Math.abs(chosen[a] - target[a]) ? b : a));
  const more = chosen[worst] < target[worst];
  const words = { spice: ["more pepper", "less pepper"], salt: ["more salt", "less salt"], sweet: ["more sweetness", "less sugar"], sour: ["more tang", "less sourness"] } as const;
  return `It needs ${words[worst][more ? 0 : 1]}.`;
}

export function grade(overall: number): string {
  return overall >= 90 ? "Outstanding" : overall >= 78 ? "Delicious" : overall >= 62 ? "Good" : overall >= 45 ? "Okay" : overall >= 25 ? "Poor" : "Inedible";
}

// ── Cooking ──────────────────────────────────────────────────────────────────

export type CookResult = { ok: boolean; text: string; dish?: Dish; discovered?: string; levelUp?: string | null; burnt?: boolean; notes?: string[]; minutes?: number };

/** How long it takes, in minutes, with your kit and skill. */
export function cookMinutes(kit: Owned[], r: RecipeDef, knife: number): number {
  let total = 0;
  for (const step of r.steps) {
    if (step.kind === "cook") {
      const o = kitFor(kit, step);
      const speed = o ? (stats(o.def, o.tier)?.speed ?? 60) : 60;
      total += step.method === "ferment" ? step.minutes * 0.3 : step.minutes * (75 / speed);
    } else if (step.kind === "prep") total += Math.max(2, 8 - knife / 20);
    else total += 3;
  }
  return Math.round(total);
}

function wearKit(k: Kitchen | null, kit: Owned[], r: RecipeDef, notes: string[]): number {
  let energy = 0;
  for (const step of r.steps) {
    const o = kitFor(kit, step);
    if (!o) continue;
    const st = stats(o.def, o.tier);
    energy += st?.energy ?? 0;
    o.condition = Math.max(0, o.condition - 0.7);
    o.clean = Math.max(0, o.clean - 6);
    const p = ((100 - (st?.reliability ?? 70)) / 2200) * (1 + (100 - o.condition) / 50);
    if (Math.random() < p) {
      o.broken = true;
      notes.push(`Your ${equipment(o.def)?.name.toLowerCase() ?? "kit"} broke down. Repair or replace it.`);
    }
  }
  if (k) k.utilities += energy;
  return energy;
}

/** Cook a recipe you know. The Performance comes from the hands-on steps or quick mode. */
export function cookRecipe(s: GameState, where: "home" | string, recipeId: string, perf: Performance, opts: { custom?: string; tier?: Tier; staffSkill?: number } = {}): CookResult {
  const k = kitchen(s);
  const place = placeOf(s, where);
  const r = recipe(recipeId);
  if (!place || !r) return { ok: false, text: "" };
  if (!k.recipes[r.id]) return { ok: false, text: "You don't know this recipe yet." };
  const kitGap = missingKit(place.equipment, r);
  if (kitGap.length) return { ok: false, text: `You need equipment for: ${kitGap.join(", ")}.` };
  const short = missingFood(place.pantry, r);
  if (short.length) return { ok: false, text: `Missing: ${short.map((x) => ingredient(x.id)?.name ?? x.id).join(", ")}.` };
  const usedLots: Lot[] = [];
  for (const need of r.needs) usedLots.push(...take(place.pantry, need.id, need.qty, opts.tier));
  for (const extra of r.extras ?? []) if (have(place.pantry, extra, 1)) usedLots.push(...take(place.pantry, extra, 1, opts.tier));
  return finish(s, place, r, usedLots, perf, { custom: opts.custom, staffSkill: opts.staffSkill });
}

function finish(s: GameState, place: Place, r: RecipeDef, used: Lot[], perf: Performance, opts: { custom?: string; improvised?: boolean; staffSkill?: number; name?: string } = {}): CookResult {
  const k = kitchen(s);
  const { scores, burnt, notes } = scoreDish(s, r, used, place.equipment, place.clean, perf, opts);
  wearKit(place.where === "home" ? k : null, place.equipment, r, notes);
  // Mess: cooking dirties the kitchen, less so when you're careful.
  const mess = Math.max(1.5, 5 - k.skills.safety / 25);
  if (place.where === "home") k.clean = Math.max(0, k.clean - mess);
  else {
    const v = k.venues.find((x) => x.id === place.where);
    if (v) v.clean = Math.max(0, v.clean - mess / 2);
  }
  const custom = opts.custom ? k.customs.find((c) => c.id === opts.custom) : undefined;
  const skill = mainSkill(r);
  if (opts.staffSkill == null) {
    gain(k, skill, 1.5);
    if (perf.prep.length) gain(k, "knife", 0.8);
    if (r.steps.some((x) => x.kind === "season")) gain(k, "seasoning", 0.8);
    gain(k, "presentation", 0.6);
    if (r.tags.includes("healthy")) gain(k, "nutrition", 0.5);
    gain(k, "safety", 0.3);
    if (opts.improvised) gain(k, "creation", 2);
  }
  const levelUp = burnt || opts.improvised ? null : advance(k, r.id, scores.overall);
  const fridge = capacity(place.equipment, "fridge", false) > 0;
  const dish: Dish = {
    id: uid("d"),
    recipe: r.id,
    name: opts.name ?? (burnt ? `Burnt ${r.name.toLowerCase()}` : (custom?.name ?? r.name)),
    icon: burnt ? "🔥" : r.icon,
    portions: r.serves,
    scores,
    made: s.day,
    expires: s.day + (r.course === "drink" ? 1 : fridge ? 3 : 1),
    flavor: { ...perf.season },
    tags: r.tags,
    signature: custom?.signature ? custom.name : undefined,
  };
  if (burnt) k.waste.push({ day: s.day, what: `${r.name} (burnt)`, value: used.reduce((sum, l) => sum + (ingredient(l.ing)?.price ?? 0) * l.qty, 0) });
  if (place.where === "home") k.leftovers.push(dish);
  const minutes = cookMinutes(place.equipment, r, k.skills.knife);
  const text = burnt ? `${r.name} burnt. ${notes[0] ?? ""}` : `${dish.icon} ${dish.name}: ${grade(scores.overall)} (${scores.overall}/100). ${r.serves} portion${r.serves > 1 ? "s" : ""} ready.`;
  return { ok: true, text, dish, levelUp, burnt, notes, minutes };
}

// ── Experimenting ────────────────────────────────────────────────────────────

const STAPLES = new Set(["salt", "sugar", "stock", "veg_oil", "black_pepper", "water"]);

/** How closely a set of ingredients and a method match a recipe, 0–1. */
export function matchScore(r: RecipeDef, chosen: string[], method: Method): number {
  const a = new Set(chosen.filter((x) => !STAPLES.has(x)));
  const b = new Set(r.needs.map((x) => x.id).filter((x) => !STAPLES.has(x)));
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = new Set([...a, ...b]).size || 1;
  const methodOk = r.steps.some((x) => x.kind === "cook" && x.method === method);
  return inter / union + (methodOk ? 0.15 : -0.1);
}

/**
 * Throw things together and see what happens. A close match to a recipe
 * discovers it (including secret fusion dishes); a near miss makes a rough
 * version with a hint; anything else is an improvised dish, or a disaster.
 */
export function experiment(s: GameState, picks: { lot: string; qty: number }[], method: Method, perf: Performance): CookResult {
  const k = kitchen(s);
  const place = placeOf(s, "home")!;
  if (picks.length < 2) return { ok: false, text: "Pick at least two ingredients." };
  const heat: Step = { kind: "cook", method, temp: 0, minutes: 0, label: "" };
  if (method !== "raw" && !kitFor(place.equipment, heat)) return { ok: false, text: `You have nothing for ${METHOD_LABEL[method].toLowerCase()}.` };
  const used: Lot[] = [];
  for (const p of picks) {
    const lot = place.pantry.find((l) => l.id === p.lot);
    if (!lot) continue;
    used.push(...take(place.pantry, lot.ing, Math.min(p.qty, lot.qty)));
  }
  const ids = [...new Set(used.map((l) => l.ing))];
  const ranked = RECIPES.map((r) => ({ r, score: matchScore(r, ids, method) })).sort((x, y) => y.score - x.score);
  const best = ranked[0]!;
  gain(k, "creation", 2.5);
  const creation = k.skills.creation;
  if (best.score >= 0.72 - creation / 500) {
    const isNew = !k.recipes[best.r.id];
    if (isNew) k.recipes[best.r.id] = { level: "known", cooked: 0, best: 0, total: 0 };
    const res = finish(s, place, best.r, used, perf, { improvised: true });
    return { ...res, discovered: isNew ? best.r.id : undefined, text: isNew ? `💡 You discovered ${best.r.name}! ${res.text}` : res.text };
  }
  if (best.score >= 0.45) {
    const res = finish(s, place, best.r, used, { ...perf, cook: perf.cook.map((x) => x * 0.75) }, { improvised: true, name: `A rough ${best.r.name.toLowerCase()}` });
    const missing = best.r.needs.map((x) => x.id).filter((x) => !ids.includes(x) && !STAPLES.has(x));
    const hint = missing.length ? ` It tastes like it's missing ${ingredient(missing[0]!)?.name.toLowerCase() ?? "something"}.` : " The method doesn't feel right.";
    return { ...res, text: `${res.text} This is close to something.${hint}` };
  }
  // Improvised: name it after what's in it.
  const main = used.find((l) => ingredient(l.ing)?.cat === "protein") ?? used[0]!;
  const side = used.find((l) => ingredient(l.ing)?.cat === "grain" && l.ing !== main.ing);
  const name = `${METHOD_LABEL[method].replace(/ing$/, "ed").replace("Boiled", "Boiled").replace(/^Raw prepped$/, "Raw")} ${ingredient(main.ing)?.name.toLowerCase()}${side ? ` with ${ingredient(side.ing)?.name.toLowerCase()}` : ""}`;
  const fake: RecipeDef = {
    id: "improvised",
    name,
    icon: "🍲",
    cuisine: "Fusion",
    course: "main",
    needs: [],
    steps: [{ kind: "cook", method, temp: 0, minutes: 20, label: "" }, { kind: "season", label: "" }, { kind: "plate", label: "" }],
    target: { spice: 4, salt: 5, sweet: 2, sour: 1 },
    difficulty: 2,
    serves: Math.max(1, Math.round(used.reduce((sum, l) => sum + l.qty, 0) / 3)),
    value: 800,
    nutrition: Math.round(avg(used.map((l) => (ingredient(l.ing)?.nutrition ?? 5) * 10))),
    tags: [],
    eat: { food: 30, energy: 3 },
    source: "experiment",
  };
  const clash = Math.random() < 0.35 - creation / 400;
  const res = finish(s, place, fake, used, clash ? { ...perf, cook: perf.cook.map((x) => x * 0.5) } : perf, { improvised: true, name: clash ? `Strange ${name.toLowerCase()}` : name });
  return { ...res, text: clash ? `${res.text} The flavours fight each other. Nobody asks for seconds.` : `${res.text} Not a known dish, but edible.` };
}

// ── Custom recipes ───────────────────────────────────────────────────────────

export function saveCustom(s: GameState, base: string, name: string, flavor: Taste, signature: boolean): string {
  const k = kitchen(s);
  const r = recipe(base);
  if (!r || !k.recipes[base]) return "";
  const clean = name.trim().slice(0, 40) || `My ${r.name.toLowerCase()}`;
  if (signature) for (const c of k.customs) c.signature = false;
  k.customs.push({ id: uid("c"), base, name: clean, flavor: { ...flavor }, signature, sold: 0, fame: 0 });
  gain(k, "creation", 1.5);
  return signature ? `"${clean}" is now your signature dish.` : `Saved "${clean}" to your recipe book.`;
}

// ── Eating ───────────────────────────────────────────────────────────────────

/** Eat a portion. Better food fills you more and lifts your mood. Returns a line. */
export function eatDish(s: GameState, dishId: string, feed: (food: number, water: number) => void): string {
  const k = kitchen(s);
  const d = k.leftovers.find((x) => x.id === dishId);
  const r = d && recipe(d.recipe);
  if (!d) return "";
  const eat = r?.eat ?? { food: 30, energy: 3 };
  const q = d.scores.overall;
  feed(Math.round((eat.food ?? 0) * (0.7 + q / 333)), eat.water ?? 0);
  s.stats.energy = Math.max(0, Math.min(100, s.stats.energy + (eat.energy ?? 0) + (q >= 80 ? 3 : 0)));
  const comfort = d.tags.includes("comfort") ? 3 : 0;
  s.stats.stress = Math.max(0, Math.min(100, s.stats.stress + (eat.stress ?? 0) - comfort - (q >= 85 ? 4 : 0) + (q < 30 ? 4 : 0)));
  if (d.scores.nutrition >= 70) s.stats.health = Math.min(100, s.stats.health + 1 + (eat.health ?? 0));
  d.portions -= 1;
  if (d.portions <= 0) k.leftovers = k.leftovers.filter((x) => x.id !== dishId);
  // Dirty kitchens and old leftovers can make you sick.
  const age = s.day - d.made;
  const risk = (k.clean < 30 ? 0.12 : 0) + (age >= 2 ? 0.08 : 0) + (d.scores.freshness < 30 ? 0.1 : 0);
  if (Math.random() < risk) {
    s.stats.health = Math.max(1, s.stats.health - 15);
    s.stats.energy = Math.max(0, s.stats.energy - 20);
    return `${d.icon} You eat the ${d.name.toLowerCase()}… and spend the night running to the toilet. Food poisoning. Keep the kitchen clean and don't trust old leftovers.`;
  }
  const word = q >= 85 ? "Incredible. You close your eyes." : q >= 70 ? "Delicious." : q >= 50 ? "Not bad at all." : q >= 30 ? "It fills you up." : "You force it down.";
  return `${d.icon} ${d.name}: ${word}`;
}

// ── Kitchen care ─────────────────────────────────────────────────────────────

export function cleanKitchen(s: GameState): string {
  const k = kitchen(s);
  const dishwasher = k.equipment.some((o) => o.def === "dishwasher" && !o.broken);
  k.clean = 100;
  for (const o of k.equipment) o.clean = 100;
  k.skills.safety = Math.min(100, k.skills.safety + 1);
  return dishwasher ? "The dishwasher hums while you wipe down the counters. Spotless." : "Pots scrubbed, counters wiped, floor mopped. Spotless.";
}

export function repairCost(o: Owned): number {
  return Math.round((stats(o.def, o.tier)?.price ?? 0) * (o.broken ? 0.18 : 0.06));
}

export function repair(s: GameState, kit: Owned[], uidValue: string): string {
  const o = kit.find((x) => x.uid === uidValue);
  if (!o) return "";
  const cost = repairCost(o);
  if (s.stats.money < cost) return `The repair costs ₦${cost.toLocaleString("en")}.`;
  s.stats.money -= cost;
  const was = o.broken;
  o.broken = false;
  o.condition = was ? 80 : 100;
  return `${was ? "Repaired" : "Serviced"} your ${equipment(o.def)?.name.toLowerCase()} for ₦${cost.toLocaleString("en")}.`;
}
