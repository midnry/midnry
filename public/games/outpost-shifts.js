/** Shift lengths for offline Lifeline Run, and the daily case: one seeded
 * Quick shift that is the same for every player on a given (UTC) day. */
export const SHIFTS = Object.freeze({
  full: { id: "full", name: "Full shift", copy: "8 players · 2 infiltrators · about 6 minutes" },
  quick: { id: "quick", name: "Quick shift", copy: "5 players · 1 infiltrator · about 4 minutes" },
  daily: { id: "daily", name: "Daily case", copy: "Today's Quick shift, the same for everyone. You are an operator." },
});

/** Quick-shift rules applied by the simulation. */
export const QUICK = Object.freeze({
  seats: 5,
  infiltrators: 1,
  flightScale: 0.6,
  maxEvents: 2,
  firstEvent: 45,
});

export const shiftChoice = (value) => (SHIFTS[value] ? value : "full");

/** "2026-10-18" for the case everyone shares today. */
export const dailyKey = (date = new Date()) => date.toISOString().slice(0, 10);

/** A seeded random stream for one day's case. */
export function dailyRandom(key) {
  let h = 2166136261;
  for (const ch of `outpost-daily-${key}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Score out of 1000: winning is worth most, then speed, catching the
 * infiltrator with your own vote, and keeping the crew alive.
 */
export function dailyScore({ won, seconds, correctVotes = 0, crewAlive = 0, rescued = 0 }) {
  if (!won) return Math.min(300, correctVotes * 120 + rescued * 30 + crewAlive * 10);
  const speed = Math.max(0, 250 - Math.max(0, seconds - 120) * 0.7);
  return Math.round(Math.min(1000, 450 + speed + Math.min(1, correctVotes) * 150 + crewAlive * 25 + rescued * 10));
}

export const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
