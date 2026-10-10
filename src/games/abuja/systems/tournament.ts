import type { GameState } from "./types";

// The interhouse football tournament: four houses, knockout. Semi-finals pair
// Red with Blue and Green with Yellow; the winners meet in the final and the
// losers play for third. Your matches are penalty shootouts you play; the
// other semi-final is decided by the luck of the draw (the same for a given
// life and school, so the bracket never changes when you look again).

export const HOUSES: Record<string, { name: string; color: string }> = {
  red: { name: "Red House", color: "#ef4444" },
  blue: { name: "Blue House", color: "#3b82f6" },
  green: { name: "Green House", color: "#22c55e" },
  yellow: { name: "Yellow House", color: "#eab308" },
};
const ORDER = ["red", "blue", "green", "yellow"];

export type Result = "won" | "lost" | undefined;
export type Bracket = {
  mine: string;
  semiRival: string;
  /** The other semi-final: its two houses, and who comes through. */
  other: [string, string];
  otherWinner: string;
  otherLoser: string;
  semi: Result;
  final: Result;
  third: Result;
  /** Who wins the final when you're not in it. */
  neutralChampion: string;
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function bracket(s: GameState): Bracket {
  const mine = ORDER.includes(String(s.flags.house)) ? String(s.flags.house) : "red";
  const i = ORDER.indexOf(mine);
  const semiRival = ORDER[i % 2 === 0 ? i + 1 : i - 1]!;
  const other = ORDER.filter((h) => h !== mine && h !== semiRival) as [string, string];
  const pick = hash(`${s.name}:${s.chapter}:${s.age}`) % 2;
  const res = (key: string): Result => (s.flags[key] === "won" || s.flags[key] === "lost" ? (s.flags[key] as Result) : undefined);
  const otherWinner = other[pick]!;
  const neutralChampion = (hash(`${s.name}:${s.age}:final`) % 2 ? semiRival : otherWinner)!;
  return { mine, semiRival, other, otherWinner, otherLoser: other[1 - pick]!, semi: res("tourney_semi"), final: res("tourney_final"), third: res("tourney_third"), neutralChampion };
}

/** Who you face in a round: the semi-final, the final or the match for third. */
export function rivalFor(s: GameState, round: "semi" | "final" | "third"): string {
  const b = bracket(s);
  return round === "semi" ? b.semiRival : round === "final" ? b.otherWinner : b.otherLoser;
}

export const houseName = (id: string) => HOUSES[id]?.name ?? "the other house";
