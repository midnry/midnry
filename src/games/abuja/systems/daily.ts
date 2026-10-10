import { addStat, clamp, naira } from "./rules";
import type { GameState } from "./types";

// Coming back each day: a gift for every real day you open the game, bigger
// the longer your streak (it resets if you miss a day), and one challenge a
// week with its own reward. Dates are the player's own calendar days, so this
// lives in the save and follows a signed-in player across devices.

export type Daily = { last: string; streak: number; best: number };
export type WeeklyId = "earn" | "rep" | "explore" | "skills";
export type Weekly = { week: string; id: WeeklyId; start: { money: number; rep: number; skills: number }; districts: string[]; claimed: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = (now = new Date()) => dayKey(now);
const yesterdayKey = (now = new Date()) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

/** The Monday that starts this week, as the week's name. */
export function weekKey(now = new Date()): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return dayKey(monday);
}

/** How big rewards are at each stage of life: pocket money for a child, real money for an adult. */
function band(s: GameState): "kid" | "campus" | "adult" {
  if (s.chapter === "primary" || s.chapter === "secondary") return "kid";
  if (s.chapter === "university" || s.chapter === "nysc") return "campus";
  return "adult";
}
const SCALE = { kid: 1, campus: 5, adult: 20 } as const;

/** The seven-day ladder (child amounts; scaled up by stage). Day 7 is the big one. */
export const LADDER = [500, 700, 1000, 1200, 1500, 2000, 5000];

export function rewardFor(s: GameState, streakDay: number): number {
  return LADDER[(streakDay - 1) % LADDER.length]! * SCALE[band(s)];
}

export const dailyDue = (s: GameState, now = new Date()) => s.daily?.last !== todayKey(now);

/** The streak you'd be on if you claimed now. */
export function nextStreak(s: GameState, now = new Date()): number {
  const d = s.daily;
  if (!d) return 1;
  if (d.last === todayKey(now)) return d.streak;
  return d.last === yesterdayKey(now) ? d.streak + 1 : 1;
}

export function claimDaily(s: GameState, now = new Date()): string {
  if (!dailyDue(s, now)) return "You've already collected today's gift. Come back tomorrow.";
  const streak = nextStreak(s, now);
  const amount = rewardFor(s, streak);
  s.daily = { last: todayKey(now), streak, best: Math.max(streak, s.daily?.best ?? 0) };
  addStat(s, "money", amount);
  const week = streak % 7 === 0;
  if (week) {
    addStat(s, "reputation", 3);
    s.stats.energy = clamp(s.stats.energy + 10);
  }
  return `🎁 Day ${streak} gift: ${naira(amount)}${week ? ", +3 reputation and a burst of energy. A full week!" : "."}${streak > 1 ? ` ${streak}-day streak 🔥` : ""}`;
}

// ── The weekly challenge ─────────────────────────────────────────────────────

export const CHALLENGES: Record<WeeklyId, { icon: string; title: (s: GameState) => string; goal: (s: GameState) => number; reward: number; cityOnly?: boolean }> = {
  earn: { icon: "💰", title: (s) => `Grow your money by ${naira(EARN[band(s)])}`, goal: (s) => EARN[band(s)], reward: 2000 },
  rep: { icon: "⭐", title: () => "Raise your reputation by 5", goal: () => 5, reward: 1500 },
  explore: { icon: "🗺️", title: () => "Visit 5 different districts of Abuja", goal: () => 5, reward: 1500, cityOnly: true },
  skills: { icon: "📚", title: () => "Improve your skills by 6 points in total", goal: () => 6, reward: 1500 },
};
const EARN = { kid: 3000, campus: 25000, adult: 150_000 } as const;

const skillTotal = (s: GameState) => Object.values(s.skills).reduce((a, b) => a + b, 0);

function pick(s: GameState, week: string): WeeklyId {
  const ids = (Object.keys(CHALLENGES) as WeeklyId[]).filter((id) => !CHALLENGES[id].cityOnly || !s.chapter);
  let h = 0;
  for (const ch of week) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ids[h % ids.length]!;
}

/** This week's challenge, started fresh on Monday from where you stand. */
export function weekly(s: GameState, now = new Date()): Weekly {
  const week = weekKey(now);
  if (s.weekly?.week !== week) {
    s.weekly = { week, id: pick(s, week), start: { money: s.stats.money, rep: s.stats.reputation, skills: skillTotal(s) }, districts: [], claimed: false };
  }
  return s.weekly;
}

/** Read-only progress for the screen (does not start a new week). */
export function weeklyProgress(s: GameState): { done: number; goal: number } | null {
  const w = s.weekly;
  if (!w) return null;
  const goal = CHALLENGES[w.id].goal(s);
  const done =
    w.id === "earn" ? s.stats.money - w.start.money : w.id === "rep" ? s.stats.reputation - w.start.rep : w.id === "skills" ? skillTotal(s) - w.start.skills : w.districts.length;
  return { done: Math.max(0, Math.min(goal, Math.round(done))), goal };
}

/** Remember the districts you reach this week (for the explore challenge). */
export function visited(s: GameState, district: string) {
  const w = s.weekly;
  if (!w || w.id !== "explore" || !district || w.districts.includes(district)) return;
  w.districts.push(district);
}

export function claimWeekly(s: GameState): string {
  const w = s.weekly;
  const p = weeklyProgress(s);
  if (!w || !p || w.claimed) return "";
  if (p.done < p.goal) return "Not done yet. Keep going.";
  w.claimed = true;
  const amount = CHALLENGES[w.id].reward * SCALE[band(s)];
  addStat(s, "money", amount);
  addStat(s, "reputation", 3);
  return `🏆 Weekly challenge done: ${naira(amount)} and +3 reputation. A new one starts on Monday.`;
}
