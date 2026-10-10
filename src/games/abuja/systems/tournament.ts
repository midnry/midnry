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

// ── Which sport you play: the house captain picks by strength or brains ─────

export type SportId = "football" | "tug" | "basketball" | "tennis" | "chess";
export type SportGame = "penalties" | "tug" | "basketball" | "tennis" | "chess";

export const SPORTS: Record<SportId, { name: string; icon: string; game: SportGame; reason: string; locked: string }> = {
  football: { name: "football", icon: "⚽", game: "penalties", reason: "you're strong and you don't panic under pressure", locked: "The captain wants stronger legs for football." },
  tug: { name: "tug of war", icon: "🪢", game: "tug", reason: "you're one of the strongest in your class", locked: "Not strong enough yet for the tug-of-war team." },
  basketball: { name: "basketball", icon: "🏀", game: "basketball", reason: "you're strong and you've got the reach", locked: "The basketball coach wants more strength and height." },
  tennis: { name: "tennis", icon: "🎾", game: "tennis", reason: "you've got quick hands and a cool head", locked: "Tennis needs quicker hands and a sharper head." },
  chess: { name: "chess", icon: "♟️", game: "chess", reason: "you're the sharpest mind in the house", locked: "The chess team only takes the brainiest. Study more." },
};
export const SPORT_IDS = Object.keys(SPORTS) as SportId[];

/** Strength: how healthy and tough you are (0–100). */
export const strength = (s: GameState) => Math.round((s.stats.health + s.stats.resilience) / 2);
/** Intelligence: what school and screens have taught you (0–100). */
export const intelligence = (s: GameState) => Math.min(100, Math.round(s.skills.education * 3 + s.skills.tech * 2));

/** How well you suit each sport, 0–100. */
export function fit(s: GameState, id: SportId): number {
  const str = strength(s);
  const iq = intelligence(s);
  const older = s.chapter === "secondary" ? 12 : 0;
  const v = { football: str * 0.8 + 12, tug: str, basketball: str * 0.75 + older, tennis: str * 0.45 + iq * 0.35 + 15, chess: iq }[id];
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** The captain's pick (your best sport), and every sport you're good enough to ask for. */
export function sportOptions(s: GameState): { best: SportId; options: { id: SportId; fit: number; open: boolean }[] } {
  const scored = SPORT_IDS.map((id) => ({ id, fit: fit(s, id) }));
  const best = [...scored].sort((a, b) => b.fit - a.fit)[0]!.id;
  const top = fit(s, best);
  return { best, options: scored.map((o) => ({ ...o, open: o.id === best || o.fit >= 55 || o.fit >= top - 12 })) };
}

/** The sport you're playing in this tournament: your choice, or the captain's pick. */
export function sportOf(s: GameState): SportId {
  const chosen = String(s.flags.tourney_sport ?? "") as SportId;
  return SPORTS[chosen] ? chosen : sportOptions(s).best;
}
