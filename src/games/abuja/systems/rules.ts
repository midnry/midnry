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
  if (cond.flag && !state.flags[cond.flag]) return false;
  if (cond.notFlag && state.flags[cond.notFlag]) return false;
  if (cond.background && state.background !== cond.background) return false;
  if (cond.gender && state.gender !== cond.gender) return false;
  if (cond.cert && !state.certs[cond.cert]) return false;
  if (cond.noCert && state.certs[cond.noCert]) return false;
  if (cond.npc && rel(state, cond.npc) < (cond.rel ?? 1)) return false;
  if (cond.job !== undefined && state.job !== cond.job) return false;
  if (cond.hasJob != null && Boolean(state.job) !== cond.hasJob) return false;
  if (cond.asset && !state.assets.includes(cond.asset)) return false;
  if (cond.noAsset && state.assets.includes(cond.noAsset)) return false;
  if (cond.powered && state.life?.power.cut) return false;
  if (cond.license != null && Boolean(state.life?.license) !== cond.license) return false;
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
    if (effect.flag) state.flags[effect.flag] = effect.set ?? true;
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
    .replace(/\{love\}/g, npcName(state, "love"))
    .replace(/\{state\}/g, state.postingState ?? "")
    .replace(/\{state_blurb\}/g, posted?.blurb ?? "")
    .replace(/\{state_event\}/g, posted?.events[eventIndex]?.text ?? "")
    .replace(/\{partner\}/g, state.eventCtx?.partner ? partnerName(state, state.eventCtx.partner) : "your partner")
    .replace(/\{amount\}/g, (state.eventCtx?.amount ?? 0).toLocaleString("en"))
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
