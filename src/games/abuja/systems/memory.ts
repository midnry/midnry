import type { GameState } from "./types";

// People remember you. Each person keeps a handful of memories of what you
// did: kind things, hurtful things, things you owe them, and big story
// moments. Small things fade after a few weeks; big ones stay for good. When
// you talk to them, they bring up what's on their mind.

export type Tone = "warm" | "hurt" | "debt" | "story";

export type Memory = {
  day: number;
  /** What happened, for your contacts list ("You insulted them in public"). */
  what: string;
  /** What they say about it when you meet ("I haven't forgotten…"), if anything. */
  say?: string;
  tone: Tone;
  /** 1 small, 2 big, 3 never forgotten. */
  weight: 1 | 2 | 3;
  /** The last day they brought it up. */
  said?: number;
};

/** How long a memory lasts, in days, by its weight. */
const LASTS = { 1: 21, 2: 70, 3: Infinity } as const;
const MAX = 6;

export const TONE_ICON: Record<Tone, string> = { warm: "💛", hurt: "💢", debt: "🧾", story: "📌" };

export function memoriesOf(s: GameState, who: string): Memory[] {
  return s.memories?.[who] ?? [];
}

/** Remember something about you. The same memory again refreshes it rather than piling up. */
export function remember(s: GameState, who: string, m: Omit<Memory, "day" | "said">): void {
  s.memories ??= {};
  const list = (s.memories[who] ??= []);
  const same = list.find((x) => x.what === m.what);
  if (same) {
    same.day = s.day;
    same.weight = Math.max(same.weight, m.weight) as Memory["weight"];
    if (m.say) same.say = m.say;
    return;
  }
  list.push({ ...m, day: s.day });
  if (list.length > MAX) {
    // Forget the least important, oldest memory.
    list.sort((a, b) => b.weight - a.weight || b.day - a.day);
    list.length = MAX;
  }
}

/** Let go of a memory, for when you make things right. */
export function forget(s: GameState, who: string, what: string): void {
  const list = s.memories?.[who];
  if (list) s.memories![who] = list.filter((m) => m.what !== what);
}

/** Nightly: small memories fade. */
export function fadeMemories(s: GameState): void {
  if (!s.memories) return;
  for (const [who, list] of Object.entries(s.memories)) {
    const kept = list.filter((m) => s.day - m.day <= LASTS[m.weight]);
    if (kept.length) s.memories[who] = kept;
    else delete s.memories[who];
  }
}

/**
 * What's on their mind when you meet: the weightiest memory they haven't
 * brought up in the last five days, or null. Read-only, so it's safe to call
 * while rendering; `recalled` marks it said.
 */
export function onTheirMind(s: GameState, who: string): Memory | null {
  const fresh = memoriesOf(s, who).filter((m) => m.say && m.day !== s.day && (m.said == null || m.said === s.day || s.day - m.said >= 5));
  fresh.sort((a, b) => b.weight - a.weight || b.day - a.day);
  return fresh[0] ?? null;
}

export function recalled(s: GameState, who: string): void {
  const m = onTheirMind(s, who);
  if (m) m.said = s.day;
}

/** How you know someone, for the memory of meeting them. */
export function sinceWhen(s: GameState): string {
  if (s.stage === "primary") return "You've known each other since primary school";
  if (s.stage === "secondary") return "You've known each other since secondary school";
  if (s.stage === "university") return "You met at university";
  if (s.stage === "nysc") return "You met during NYSC";
  return "You met in Abuja";
}

/** How long ago, in words. */
export function ago(s: GameState, day: number): string {
  const d = s.day - day;
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "last week";
  if (d < 28) return `${Math.floor(d / 7)} weeks ago`;
  return "a while back";
}
