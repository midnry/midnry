import { addDays, isIsoDate, weekStart } from "./dates.ts";

// Productivity: completions per day, Midnry Points, goals and streaks.

export type Stats = {
  /** Tasks completed on each local date. Kept for the last 400 days. */
  days: Record<string, number>;
  points: number;
  /** Dates the daily-goal bonus was already paid. */
  goalDays: string[];
  dailyGoal: number;
  weeklyGoal: number;
};

export const GOAL_BONUS = 5;
const KEEP_DAYS = 400;

export const EMPTY_STATS: Stats = { days: {}, points: 0, goalDays: [], dailyGoal: 5, weeklyGoal: 25 };

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function cleanStats(raw: unknown): Stats {
  const source = raw && typeof raw === "object" ? (raw as Partial<Stats>) : {};
  const days: Record<string, number> = {};
  if (source.days && typeof source.days === "object") {
    const entries = Object.entries(source.days)
      .filter(([iso, n]) => isIsoDate(iso) && Number(n) > 0)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, KEEP_DAYS);
    for (const [iso, n] of entries) days[iso] = clampInt(n, 0, 10_000, 0);
  }
  return {
    days,
    points: clampInt(source.points, 0, 10_000_000, 0),
    goalDays: Array.isArray(source.goalDays) ? source.goalDays.filter(isIsoDate).slice(-KEEP_DAYS) : [],
    dailyGoal: clampInt(source.dailyGoal, 1, 50, 5),
    weeklyGoal: clampInt(source.weeklyGoal, 1, 300, 25),
  };
}

/** Points for finishing one task: P1 = 4, P2 = 3, P3 = 2, P4 = 1. */
export function pointsFor(priority: number): number {
  return 5 - Math.min(4, Math.max(1, Math.round(priority) || 4));
}

/** Record a completion (or undo one with `delta = -1`). Returns the new stats and points earned. */
export function recordCompletion(stats: Stats, today: string, priority: number, delta: 1 | -1): { stats: Stats; earned: number } {
  const days = { ...stats.days };
  const before = days[today] ?? 0;
  const after = Math.max(0, before + delta);
  if (after === 0) delete days[today];
  else days[today] = after;

  let earned = delta * pointsFor(priority);
  const goalDays = [...stats.goalDays];
  if (delta === 1 && after >= stats.dailyGoal && !goalDays.includes(today)) {
    goalDays.push(today);
    earned += GOAL_BONUS;
  }
  return {
    stats: { ...stats, days, goalDays: goalDays.slice(-KEEP_DAYS), points: Math.max(0, stats.points + earned) },
    earned,
  };
}

export function weekTotal(stats: Stats, anyDayInWeek: string): number {
  const start = weekStart(anyDayInWeek);
  let total = 0;
  for (let i = 0; i < 7; i += 1) total += stats.days[addDays(start, i)] ?? 0;
  return total;
}

/** Days in a row that met the daily goal, ending today (or yesterday if today isn't done yet). */
export function dailyStreak(stats: Stats, today: string): number {
  const met = (iso: string) => (stats.days[iso] ?? 0) >= stats.dailyGoal;
  let cursor = met(today) ? today : addDays(today, -1);
  let streak = 0;
  while (met(cursor) && streak < KEEP_DAYS) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Weeks in a row that met the weekly goal, ending this week (or last week if this one isn't done yet). */
export function weeklyStreak(stats: Stats, today: string): number {
  const met = (iso: string) => weekTotal(stats, iso) >= stats.weeklyGoal;
  let cursor = met(today) ? weekStart(today) : addDays(weekStart(today), -7);
  let streak = 0;
  while (met(cursor) && streak < 60) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function longestDailyStreak(stats: Stats): number {
  const met = Object.keys(stats.days)
    .filter((iso) => (stats.days[iso] ?? 0) >= stats.dailyGoal)
    .sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const iso of met) {
    run = prev && addDays(prev, 1) === iso ? run + 1 : 1;
    best = Math.max(best, run);
    prev = iso;
  }
  return best;
}

export const LEVELS = [
  { name: "Starter", from: 0 },
  { name: "Getting going", from: 50 },
  { name: "Steady", from: 150 },
  { name: "Focused", from: 400 },
  { name: "Achiever", from: 1000 },
  { name: "Expert", from: 2500 },
  { name: "Master", from: 5000 },
  { name: "Legend", from: 10000 },
] as const;

export function levelOf(points: number): { name: string; index: number; next: number | null; progress: number } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (points >= LEVELS[i].from) index = i;
  const next = LEVELS[index + 1]?.from ?? null;
  const from = LEVELS[index].from;
  return {
    name: LEVELS[index].name,
    index,
    next,
    progress: next === null ? 1 : Math.min(1, (points - from) / (next - from)),
  };
}
