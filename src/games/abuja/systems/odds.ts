import type { Effect } from "./types";

// Showing the dice: a choice that rolls (an effect with `chance`) says so
// before you pick it, as a risk ("30% risk") when the roll brings trouble or a
// chance ("40% chance") when it brings something good.

const BAD_FLAGS = /arrest|caught|fired|scam|fraud|expel|suspend|record|robbed/i;

function bad(effects: Effect[] | undefined): number {
  let score = 0;
  for (const e of effects ?? []) {
    if (e.discipline && e.discipline > 0) score += 2;
    if (e.suspend || e.escort) score += 2;
    if (e.ending === "jail" || e.ending === "cut") score += 3;
    if (e.stat === "money" && (e.add ?? 0) < 0) score += 1;
    if (e.stat === "heat" && (e.add ?? 0) > 0) score += 1;
    if (e.stat === "health" && (e.add ?? 0) < 0) score += 1;
    if ((e.stat === "reputation" || e.stat === "network") && (e.add ?? 0) < 0) score += 1;
    if (e.stat === "stress" && (e.add ?? 0) > 3) score += 1;
    if (e.npc && (e.rel ?? 0) < 0) score += 1;
    if (e.flag && BAD_FLAGS.test(e.flag) && e.set !== false) score += 2;
    if (e.offense || e.efcc || (e.efccCase ?? 0) > 0) score += 2;
  }
  return score;
}

function good(effects: Effect[] | undefined): number {
  let score = 0;
  for (const e of effects ?? []) {
    if (e.stat === "money" && (e.add ?? 0) > 0) score += 1;
    if ((e.stat === "reputation" || e.stat === "network" || e.stat === "health") && (e.add ?? 0) > 0) score += 1;
    if (e.skill && (e.add ?? 0) > 0) score += 1;
    if (e.npc && (e.rel ?? 0) > 0) score += 1;
    if (e.cert || e.job) score += 2;
  }
  return score;
}

export type Odds = { pct: number; risk: boolean };

/** The first dice roll in a choice's effects, as a risk or a chance; null when nothing is left to luck. */
export function choiceOdds(effects: Effect[] | undefined): Odds | null {
  const roll = (effects ?? []).find((e) => e.chance != null && e.chance > 0 && e.chance < 1);
  if (!roll) return null;
  const pct = Math.round(roll.chance! * 100);
  const thenBad = bad(roll.then) - good(roll.then);
  const elseBad = bad(roll.else) - good(roll.else);
  // The roll is a risk when its "then" is the worse side; otherwise, the chance of the good side.
  if (thenBad > 0 && thenBad >= elseBad) return { pct, risk: true };
  if (elseBad > 0 && elseBad > thenBad) return { pct: 100 - pct, risk: true };
  if (good(roll.then) > 0) return { pct, risk: false };
  return null;
}

export const oddsText = (o: Odds) => (o.risk ? `🎲 ${o.pct}% risk` : `🎲 ${o.pct}% chance`);
