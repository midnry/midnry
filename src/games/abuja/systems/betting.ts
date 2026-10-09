import { clamp, naira } from "./rules";
import type { GameState } from "./types";

// OddsNaija: fictional football, real house edge. Each day has a few matches
// with odds that pay a little less than the true chances (the bookie's
// margin), so over time most players lose. Bets settle overnight.

export type Pick = "home" | "draw" | "away";
export type Fixture = { id: string; home: string; away: string; p: Record<Pick, number>; odds: Record<Pick, number> };
export type Bet = { id: string; day: number; stake: number; legs: { fixture: string; pick: Pick; odds: number; label: string }[]; status: "open" | "won" | "lost"; payout: number };
export type Betting = { bets: Bet[]; staked: number; won: number; limit: number | null; week: number; weekStaked: number; streak: number };

const CLUBS = ["Wuse United", "Garki Stars", "Kubwa Rovers", "Lagos Lions", "Enugu City", "Kaduna Falcons", "Jos Highlanders", "Ibadan Warriors", "Benin Royals", "Calabar Marines", "Owerri Eagles", "Maiduguri Desert FC"];
/** The bookie's margin: odds pay this much less than fair. */
const MARGIN = 0.12;
export const MIN_STAKE = 500;

export function betting(s: GameState): Betting {
  s.betting ??= { bets: [], staked: 0, won: 0, limit: null, week: 0, weekStaked: 0, streak: 0 };
  return s.betting;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Today's matches: the same all day. */
export function fixtures(day: number): Fixture[] {
  const r = seeded(`odds:${day}`);
  const clubs = [...CLUBS].sort(() => r() - 0.5);
  const out: Fixture[] = [];
  for (let i = 0; i < 4; i += 1) {
    const strength = r() * 0.5 - 0.25;
    const draw = 0.22 + r() * 0.08;
    const home = clamp(0.45 + strength, 0.12, 0.7) * (1 - draw) / 0.78;
    const away = 1 - draw - home;
    const p = { home, draw, away };
    const odds = Object.fromEntries((Object.keys(p) as Pick[]).map((k) => [k, Math.max(1.05, +(1 / (p[k] * (1 + MARGIN))).toFixed(2))])) as Record<Pick, number>;
    out.push({ id: `${day}-${i}`, home: clubs[i * 2]!, away: clubs[i * 2 + 1]!, p, odds });
  }
  return out;
}

const pickLabel = (f: Fixture, k: Pick) => (k === "home" ? `${f.home} to win` : k === "away" ? `${f.away} to win` : "Draw");

/** Place a bet: one pick, or an accumulator of up to three. */
export function placeBet(s: GameState, picks: { fixture: string; pick: Pick }[], stake: number): string {
  const b = betting(s);
  if (s.chapter || s.stage !== "adult") return "You're too young to bet.";
  if (!picks.length) return "Pick at least one result.";
  if (stake < MIN_STAKE) return `The minimum stake is ${naira(MIN_STAKE)}.`;
  if (stake > s.stats.money) return "You don't have that much.";
  const week = Math.floor(s.day / 7);
  if (b.week !== week) {
    b.week = week;
    b.weekStaked = 0;
  }
  if (b.limit !== null && b.weekStaked + stake > b.limit) return `That would break your weekly limit of ${naira(b.limit)}. You set it for a reason.`;
  const today = fixtures(s.day);
  const legs = picks.map((p) => {
    const f = today.find((x) => x.id === p.fixture)!;
    return { fixture: f.id, pick: p.pick, odds: f.odds[p.pick], label: `${f.home} v ${f.away}: ${pickLabel(f, p.pick)}` };
  });
  s.stats.money -= stake;
  b.staked += stake;
  b.weekStaked += stake;
  const odds = legs.reduce((n, l) => n * l.odds, 1);
  b.bets.unshift({ id: `${s.day}-${b.bets.length}`, day: s.day, stake, legs, status: "open", payout: Math.round(stake * odds) });
  if (b.bets.length > 30) b.bets.length = 30;
  return `Bet placed: ${naira(stake)} at ${odds.toFixed(2)}. Potential win ${naira(Math.round(stake * odds))}. Results tonight.`;
}

export function setLimit(s: GameState, limit: number | null): string {
  betting(s).limit = limit;
  return limit === null ? "Weekly limit removed." : `Weekly betting limit set to ${naira(limit)}.`;
}

/** Overnight: play the matches and settle open bets. */
export function settleBets(s: GameState): string | null {
  const b = s.betting;
  if (!b?.bets.some((x) => x.status === "open")) return null;
  const results = new Map<string, Pick>();
  const lines: string[] = [];
  for (const bet of b.bets.filter((x) => x.status === "open")) {
    let won = true;
    for (const leg of bet.legs) {
      if (!results.has(leg.fixture)) {
        const f = fixtures(Number(leg.fixture.split("-")[0])).find((x) => x.id === leg.fixture);
        const r = Math.random();
        results.set(leg.fixture, !f ? "draw" : r < f.p.home ? "home" : r < f.p.home + f.p.draw ? "draw" : "away");
      }
      if (results.get(leg.fixture) !== leg.pick) won = false;
    }
    bet.status = won ? "won" : "lost";
    if (won) {
      s.stats.money += bet.payout;
      b.won += bet.payout;
      b.streak = 0;
      lines.push(`⚽ Bet won! +${naira(bet.payout)}.`);
    } else {
      b.streak += 1;
      lines.push(`⚽ Bet lost (${naira(bet.stake)}).`);
    }
  }
  if (b.streak >= 4) {
    s.stats.stress = clamp(s.stats.stress + 6);
    lines.push("Four losses in a row. The urge to 'win it back' is exactly how the bookie wins.");
  }
  return lines.join(" ");
}
