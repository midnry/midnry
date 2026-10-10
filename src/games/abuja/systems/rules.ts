import { NPCS, POSTING_STATES } from "./data";
import { drink, feed, offense, wash } from "./life";
import { answerEfcc, bankCredit, frozenAmount, withoutBankCheck } from "./bank";
import { bizWorth } from "./business";
import { equity, shock } from "./market";
import { learn } from "./cooking/cook";
import { recipe } from "./cooking/recipes";
import { forget, remember, sinceWhen } from "./memory";
import { report } from "./news";
import { partnerName, pregnancyText, romanceEffect } from "./romance";
import type { Cond, Effect, GameState, SkillKey, StatKey } from "./types";
import { hasCityEvent } from "./cityEvents";
import { SPORTS, bracket, houseName, rivalFor, sportOf } from "./tournament";
import { familyEffect } from "./family";

export const SLOTS = ["Morning", "Afternoon", "Evening", "Night"] as const;
export const DAYS_PER_YEAR = 28;
export const END_AGE = 45;
export const FREEDOM_TARGET = 25_000_000;
export const USD_RATE = 1550;

const ASSET_VALUES: Record<string, number> = { pos_stand: 120_000, tunde_biz: 300_000, tunde_fleet: 1_500_000, car: 2_800_000 };
export const ASSET_NAMES: Record<string, string> = {
  pos_stand: "POS stand (Nyanya)",
  tunde_biz: "Logistics business with Tunde (50%)",
  tunde_fleet: "Fleet of seven delivery bikes",
  car: "2012 Toyota Corolla (Tokunbo)",
};

const BOUNDED: StatKey[] = ["energy", "health", "stress", "resilience", "reputation", "heat", "network"];

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function rel(state: GameState, id: string): number {
  return state.npcs[id]?.rel ?? 0;
}

/**
 * What "once a day" means for talking and offers: a day in the city, but each
 * story beat while growing up (school days pass between scenes).
 */
export function beatKey(state: GameState): string | number {
  return state.chapter ? `${state.chapter}:${state.scene}` : state.day;
}

export function check(state: GameState, cond: Cond | undefined): boolean {
  if (!cond) return true;
  if (cond.any && !cond.any.some((item) => check(state, item))) return false;
  if (cond.stat) {
    const value = state.stats[cond.stat];
    if (cond.gte != null && value < cond.gte) return false;
    if (cond.lte != null && value > cond.lte) return false;
  }
  if (cond.skill) {
    const value = state.skills[cond.skill];
    if (cond.gte != null && value < cond.gte) return false;
    if (cond.lte != null && value > cond.lte) return false;
  }
  if (cond.flag) {
    const value = state.flags[cond.flag];
    if (!value) return false;
    // A counted flag (house points, discipline strikes): compare its number.
    if (!cond.stat && !cond.skill && (cond.gte != null || cond.lte != null)) {
      const n = Number(value);
      if (cond.gte != null && n < cond.gte) return false;
      if (cond.lte != null && n > cond.lte) return false;
    }
  }
  if (cond.notFlag && state.flags[cond.notFlag]) return false;
  if (cond.background && state.background !== cond.background) return false;
  if (cond.gender && state.gender !== cond.gender) return false;
  if (cond.loveGender && state.loveGender !== cond.loveGender) return false;
  if (cond.cert && !state.certs[cond.cert]) return false;
  if (cond.noCert && state.certs[cond.noCert]) return false;
  if (cond.npc && rel(state, cond.npc) < (cond.rel ?? 1)) return false;
  if (cond.job !== undefined && state.job !== cond.job) return false;
  if (cond.hasJob != null && Boolean(state.job || state.banking?.job) !== cond.hasJob) return false;
  if (cond.asset && !state.assets.includes(cond.asset)) return false;
  if (cond.noAsset && state.assets.includes(cond.noAsset)) return false;
  if (cond.powered && state.life?.power.cut) return false;
  if (cond.license != null && Boolean(state.life?.license) !== cond.license) return false;
  if (cond.cityEvent && (state.chapter || !hasCityEvent(state, cond.cityEvent))) return false;
  return true;
}

/** Money a choice spends for certain (not inside a chance), so it can be locked when unaffordable. */
export function moneyCost(effects: Effect[] | undefined): number {
  return (effects ?? []).reduce((sum, effect) => (effect.stat === "money" && (effect.add ?? 0) < 0 ? sum - (effect.add ?? 0) : sum), 0);
}

/** Whether a choice can be picked: its condition holds and the money is there. */
export function canPick(state: GameState, choice: { if?: Cond; effects?: Effect[] }): boolean {
  const cost = moneyCost(choice.effects);
  return check(state, choice.if) && (cost === 0 || state.stats.money >= cost);
}

export function lockReason(state: GameState, choice: { if?: Cond; effects?: Effect[]; lockedText?: string }): string | null {
  if (!check(state, choice.if)) return choice.lockedText ?? "Not available";
  const cost = moneyCost(choice.effects);
  if (cost > 0 && state.stats.money < cost) return `Needs ${naira(cost)}`;
  return null;
}

export function addStat(state: GameState, key: StatKey, amount: number): void {
  let delta = amount;
  // Resilience softens stress; Lapo Babies start with more of it.
  if (key === "stress" && delta > 0) delta = Math.round(delta * (1 - state.stats.resilience / 200));
  const next = state.stats[key] + delta;
  state.stats[key] = BOUNDED.includes(key) ? clamp(next) : Math.round(next);
  if (key === "money" && delta > 0) bankCredit(state, delta);
}

export function addSkill(state: GameState, key: SkillKey, amount: number): void {
  state.skills[key] = clamp(state.skills[key] + amount);
}

export function addLog(state: GameState, text: string): void {
  if (state.log.some((item) => item.text === text)) return;
  state.log.push({ age: Math.floor(state.age), text: fill(state, text) });
}

/** School prefect posts, by the flag value the story sets. */
export const PREFECTS: Record<string, string> = {
  head: "Head Boy",
  food: "Food Prefect",
  sports: "Sports Prefect",
  labour: "Labour Prefect",
  library: "Library Prefect",
  chapel: "Chapel and Mosque Prefect",
  social: "Social Prefect",
  captain: "Class Captain",
  timekeeper: "Time Keeper",
};

export function prefectTitle(state: GameState): string {
  const role = String(state.flags.prefect ?? "");
  if (role === "head") return state.gender === "female" ? "Head Girl" : "Head Boy";
  return PREFECTS[role] ?? "prefect";
}

/** What each strike means, by where you are: the class teacher, the vice principal, Student Affairs or the NYSC officials. */
const STRIKE_LINES: Record<string, string[]> = {
  primary: [
    "",
    "Your name goes into the class teacher's book. One more and your parents are called in.",
    "Second strike. The headmistress knows your name now, and she is not smiling.",
    "",
    "Final warning from the headmistress. One more thing and you are out of this school.",
  ],
  secondary: [
    "",
    "Your name goes into the black book. One more and your parents get a letter.",
    "Second strike. The vice principal now knows your face, and not in a good way.",
    "",
    "You're on your final warning. One more thing and you are out of this school.",
  ],
  university: [
    "",
    "Student Affairs opens a file on you. One more and it goes to the disciplinary committee.",
    "Second strike. A letter from the Student Disciplinary Committee asks you to 'appear in person'.",
    "",
    "Final warning from the Dean of Students. One more thing and you are expelled.",
  ],
  nysc: [
    "",
    "Your name goes into the camp commandant's book. One more and you will be queried.",
    "Second strike. The Local Government Inspector now knows your face, and your file is getting thick.",
    "",
    "Final warning from the State Coordinator. One more thing and your service is cancelled.",
  ],
};

/**
 * Discipline at school, university and NYSC: strikes add up through a chapter. The third gets you
 * suspended and the fifth expelled; the story takes a detour through those
 * scenes (see disciplineDetour in the engine).
 */
export function discipline(state: GameState, n: number, toasts: string[]): void {
  if (!state.chapter || state.stage === "adult") return;
  const before = Number(state.flags.strikes ?? 0);
  const after = Math.max(0, before + n);
  state.flags.strikes = after;
  if (n <= 0) return;
  const ch = state.chapter;
  if (after >= 5 && !state.flags[`expelled_${ch}`]) state.flags.discipline_due = "expelled";
  else if (after >= 3 && !state.flags[`suspended_${ch}`]) state.flags.discipline_due = "suspended";
  else {
    const lines = STRIKE_LINES[state.stage] ?? STRIKE_LINES[ch] ?? STRIKE_LINES.secondary!;
    if (lines[after]) toasts.push(lines[after]!);
  }
}

/** Apply effects in order. Returns toast lines raised by the effects. */
export function apply(state: GameState, effects: Effect[] | undefined, toasts: string[] = []): string[] {
  for (const effect of effects ?? []) {
    if (effect.chance != null) {
      apply(state, Math.random() < effect.chance ? effect.then : effect.else, toasts);
      continue;
    }
    if (effect.stat) {
      if (effect.cash) withoutBankCheck(() => addStat(state, effect.stat!, effect.add ?? 0));
      else addStat(state, effect.stat, effect.add ?? 0);
    }
    if (effect.skill) addSkill(state, effect.skill, effect.add ?? 0);
    if (effect.flag && effect.add != null && !effect.stat && !effect.skill) state.flags[effect.flag] = Number(state.flags[effect.flag] ?? 0) + effect.add;
    else if (effect.flag) state.flags[effect.flag] = effect.set ?? true;
    if (effect.discipline) discipline(state, effect.discipline, toasts);
    if (effect.suspend) {
      // On the spot: suspended now, or if already suspended at this school, two more strikes.
      const ch = state.chapter ?? "";
      if (state.flags[`suspended_${ch}`]) discipline(state, 2, toasts);
      else discipline(state, Math.max(1, 3 - Number(state.flags.strikes ?? 0)), toasts);
    }
    if (effect.npc) {
      const current = state.npcs[effect.npc] ?? { rel: 0, met: false, lastSeen: state.day };
      state.npcs[effect.npc] = { rel: clamp(current.rel + (effect.rel ?? 0)), met: true, lastSeen: state.day };
      if (!current.met) remember(state, effect.npc, { what: sinceWhen(state), tone: "warm", weight: 3 });
    }
    if (effect.npc && effect.remember) remember(state, effect.npc, effect.remember);
    if (effect.npc && effect.forget) forget(state, effect.npc, effect.forget);
    if (effect.story) {
      state.flags.story_next = effect.story.event;
      state.flags.story_day = state.day + (effect.story.days ?? 1);
    }
    if (effect.news) report(state, { ...effect.news, headline: fill(state, effect.news.headline), body: fill(state, effect.news.body) });
    if (effect.cert) state.certs[effect.cert] = true;
    if (effect.asset && !state.assets.includes(effect.asset)) state.assets.push(effect.asset);
    if (effect.removeAsset) state.assets = state.assets.filter((item) => item !== effect.removeAsset);
    if (effect.job !== undefined) state.job = effect.job;
    if (effect.age) state.age += effect.age;
    if (effect.escort) state.flags.escort = true;
    if (effect.ending) state.ending = effect.ending;
    if (effect.market) shock(state, effect.market);
    if (effect.romance) toasts.push(...romanceEffect(state, effect.romance));
    if (effect.family) toasts.push(...familyEffect(state, effect.family));
    if (effect.food) feed(state, effect.food);
    if (effect.water) drink(state, effect.water);
    if (effect.wash) wash(state);
    if (effect.offense) toasts.push(offense(state, effect.offense));
    if (effect.efcc) toasts.push(...answerEfcc(state, effect.efcc));
    if (effect.recipe && learn(state, effect.recipe)) toasts.push(`📖 New recipe: ${recipe(effect.recipe)?.name}. Find it in your kitchen.`);
    if (effect.log) addLog(state, effect.log);
    if (effect.toast) toasts.push(fill(state, effect.toast));
  }
  return toasts;
}

export function npcName(state: GameState, id: string): string {
  const def = NPCS.find((item) => item.id === id);
  if (!def) return id;
  return def.nameByGender?.[state.loveGender] ?? def.name;
}

/** Fill {name}, {love}, {state} and friends in story text. */
export function fill(state: GameState, text: string): string {
  const posted = POSTING_STATES.find((item) => item.name === state.postingState);
  const eventIndex = Number(state.flags.posting_event ?? 0);
  return text
    .replace(/\{name\}/g, state.name)
    .replace(/\{house\}/g, houseName(bracket(state).mine))
    .replace(/\{sport\}/g, SPORTS[sportOf(state)].name)
    .replace(/\{sport_icon\}/g, SPORTS[sportOf(state)].icon)
    .replace(/\{semi_rival\}/g, houseName(rivalFor(state, "semi")))
    .replace(/\{final_rival\}/g, houseName(rivalFor(state, "final")))
    .replace(/\{third_rival\}/g, houseName(rivalFor(state, "third")))
    .replace(/\{love\}/g, npcName(state, "love"))
    .replace(/\{pcrush\}/g, npcName(state, "pcrush"))
    .replace(/\{scrush\}/g, npcName(state, "scrush"))
    .replace(/\{headrole\}/g, state.gender === "female" ? "Head Girl" : "Head Boy")
    .replace(/\{prefect\}/g, prefectTitle(state))
    .replace(/\{state\}/g, state.postingState ?? "")
    .replace(/\{state_blurb\}/g, posted?.blurb ?? "")
    .replace(/\{state_event\}/g, posted?.events[eventIndex]?.text ?? "")
    .replace(/\{partner\}/g, state.eventCtx?.partner ? partnerName(state, state.eventCtx.partner) : "your partner")
    .replace(/\{amount\}/g, (state.eventCtx?.amount ?? 0).toLocaleString("en"))
    .replace(/\{child\}/g, state.eventCtx?.child ?? "your child")
    .replace(/\{reason\}/g, state.eventCtx?.reason ?? "Things are hard at home")
    .replace(/\{parent\}/g, state.eventCtx?.parent === "dad" ? "father" : "mother")
    .replace(/\{asset\}/g, state.eventCtx?.asset ?? "a stock")
    .replace(/\{pregnancy_text\}/g, pregnancyText(state));
}

/** Everything owed: loans, plus hospital bills. */
export function debt(state: GameState): number {
  return state.loans.reduce((sum, loan) => sum + loan.owed, 0) + (state.life?.hospitalBill ?? 0);
}

export function netWorth(state: GameState): number {
  const assets = state.assets.reduce((sum, id) => sum + (ASSET_VALUES[id] ?? 0), 0);
  const trading = state.market ? equity(state.market) : 0;
  return Math.round(state.stats.money + frozenAmount(state) + bizWorth(state) + state.stats.usd * USD_RATE + assets + trading - debt(state));
}

export function naira(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}m`;
  return `${sign}₦${abs.toLocaleString("en")}`;
}

export function rollStars(): number {
  const r = Math.random();
  return r < 0.3 ? 1 : r < 0.55 ? 2 : r < 0.75 ? 3 : r < 0.92 ? 4 : 5;
}

export const FIXER_PRICE: Record<number, number> = { 1: 15000, 2: 25000, 3: 50000, 4: 90000, 5: 160000 };
export const FIXER_SUCCESS: Record<number, number> = { 1: 0, 2: 0, 3: 0.55, 4: 0.8, 5: 0.92 };
