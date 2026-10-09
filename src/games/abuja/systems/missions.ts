import { equity } from "./market";
import { FREEDOM_TARGET, netWorth, naira } from "./rules";
import type { GameState } from "./types";

// Missions: pick how you want to reach financial freedom and the game points
// you at the opportunities for it, one step at a time, with a small reward
// for each. You can switch paths; finished steps stay finished.

export type PathId = "career" | "business" | "trading" | "betting" | "influencer" | "hustle" | "connections" | "fast";

type Step = { id: string; text: string; hint: string; done: (s: GameState) => boolean; reward: number };

const bets = (s: GameState) => s.betting;
const trades = (s: GameState) => s.market?.history ?? [];

export const PATHS: Record<PathId, { name: string; icon: string; pitch: string; risk: string; steps: Step[] }> = {
  career: {
    name: "Climb the ladder", icon: "🏦", risk: "Low risk, slow and steady.",
    pitch: "A good job, promotions and a salary that grows. Banks, oil, consulting.",
    steps: [
      { id: "job", text: "Get any job", hint: "Phone → Jobs, or walk to a workplace and apply.", done: (s) => Boolean(s.job || s.banking?.job), reward: 20_000 },
      { id: "bank", text: "Get a bank job", hint: "Phone → Bank Careers, or the vacancy board at Bankers' Row (CBD).", done: (s) => Boolean(s.banking?.job), reward: 50_000 },
      { id: "promo", text: "Earn a promotion", hint: "Work well, finish training, then sit the panel in the manager's office.", done: (s) => (s.banking?.job?.grade ?? 0) >= 3 || s.job === "oil_gas" || s.job === "gov_contract", reward: 100_000 },
      { id: "save", text: "Have ₦2,000,000 in the bank", hint: "Live below your salary. Skip the owambe outfits.", done: (s) => s.stats.money >= 2_000_000, reward: 100_000 },
      { id: "worth", text: "Reach a net worth of ₦10,000,000", hint: "Invest what you save: trading, property, a side business.", done: (s) => netWorth(s) >= 10_000_000, reward: 300_000 },
    ],
  },
  business: {
    name: "Build a business", icon: "🏪", risk: "Medium risk. Your money, your sweat.",
    pitch: "Start small, grow it, open another. Food, retail, services.",
    steps: [
      { id: "start", text: "Start a business", hint: "Phone → Business. Start with what you can afford.", done: (s) => (s.life?.businesses.length ?? 0) > 0, reward: 30_000 },
      { id: "grow", text: "Grow a business to level 2", hint: "Visit it, invest in it, keep cash in it.", done: (s) => (s.life?.businesses ?? []).some((b) => b.level >= 2), reward: 80_000 },
      { id: "two", text: "Run two businesses", hint: "A second business spreads your risk.", done: (s) => (s.life?.businesses.length ?? 0) >= 2, reward: 120_000 },
      { id: "food", text: "Open a food venue or sell your cooking", hint: "Kitchen → Venues: a stall, a canteen, catering.", done: (s) => (s.kitchen?.venues.length ?? 0) > 0, reward: 80_000 },
      { id: "worth", text: "Reach a net worth of ₦10,000,000", hint: "Reinvest profits; buy property when you can.", done: (s) => netWorth(s) >= 10_000_000, reward: 300_000 },
    ],
  },
  trading: {
    name: "Trade the markets", icon: "📈", risk: "High risk. Leverage cuts both ways.",
    pitch: "Stocks, forex and crypto in the Trade app. Read the charts, manage risk.",
    steps: [
      { id: "fund", text: "Fund your trading account", hint: "Phone → Trade → deposit. Only money you can afford to lose.", done: (s) => (s.market?.balance ?? 0) > 0 || trades(s).length > 0, reward: 10_000 },
      { id: "first", text: "Close your first trade", hint: "Open a small position, then close it. Low leverage to start.", done: (s) => trades(s).length > 0, reward: 20_000 },
      { id: "profit", text: "Close three trades in profit", hint: "Cut losers fast, let winners run. Dr. Okafor has advice.", done: (s) => trades(s).filter((t) => t.pnl > 0).length >= 3, reward: 60_000 },
      { id: "million", text: "Grow your trading account to ₦1,000,000", hint: "Compound slowly. Avoid 20× leverage.", done: (s) => (s.market ? equity(s.market) : 0) >= 1_000_000, reward: 150_000 },
      { id: "worth", text: "Reach a net worth of ₦10,000,000", hint: "Take profits out; don't give them back to the market.", done: (s) => netWorth(s) >= 10_000_000, reward: 300_000 },
    ],
  },
  betting: {
    name: "Beat the bookies", icon: "⚽", risk: "Very high risk. The odds are built so the bookie wins.",
    pitch: "OddsNaija on your phone. Some people win big. Most don't. Know when to stop.",
    steps: [
      { id: "limit", text: "Set a weekly betting limit", hint: "Phone → OddsNaija → limit. Do this first.", done: (s) => bets(s)?.limit != null, reward: 10_000 },
      { id: "bet", text: "Place your first bet", hint: "Phone → OddsNaija. Small stakes.", done: (s) => (bets(s)?.bets.length ?? 0) > 0, reward: 5_000 },
      { id: "win", text: "Win a bet", hint: "Favourites pay less but win more often.", done: (s) => (bets(s)?.bets ?? []).some((b) => b.status === "won"), reward: 15_000 },
      { id: "acca", text: "Win a three-match accumulator", hint: "All three picks must come in. Rare, and it pays.", done: (s) => (bets(s)?.bets ?? []).some((b) => b.status === "won" && b.legs.length >= 3), reward: 60_000 },
      { id: "ahead", text: "Be ₦200,000 up overall", hint: "Winnings minus stakes. Most bettors never get here.", done: (s) => (bets(s)?.won ?? 0) - (bets(s)?.staked ?? 0) >= 200_000, reward: 100_000 },
    ],
  },
  influencer: {
    name: "Blow up online", icon: "📸", risk: "Medium risk. Your reputation is the product.",
    pitch: "Instaflex followers, brand deals, a name people know.",
    steps: [
      { id: "page", text: "Create your Instaflex page", hint: "Phone → Instaflex.", done: (s) => Boolean(s.social), reward: 5_000 },
      { id: "10k", text: "Reach 10,000 followers", hint: "Post often, reply to comments, collab with friends.", done: (s) => (s.social?.followers ?? 0) >= 10_000, reward: 40_000 },
      { id: "deal", text: "Sign your first brand deal", hint: "Pick brands that fit your audience. Shady ones cost followers.", done: (s) => (s.social?.deals.length ?? 0) > 0, reward: 60_000 },
      { id: "100k", text: "Reach 100,000 followers", hint: "Consistency beats virality.", done: (s) => (s.social?.followers ?? 0) >= 100_000, reward: 150_000 },
      { id: "worth", text: "Reach a net worth of ₦10,000,000", hint: "Turn the audience into a business.", done: (s) => netWorth(s) >= 10_000_000, reward: 300_000 },
    ],
  },
  hustle: {
    name: "Hustle smart", icon: "🛵", risk: "Low risk, hard work.",
    pitch: "Deliveries, rides, hawking, cooking and property. Many small streams.",
    steps: [
      { id: "gig", text: "Finish a delivery, ride or hawking shift", hint: "Phone → Jobs or the Rides app: gig work pays the same day.", done: (s) => Number(s.flags.shifts ?? 0) >= 1, reward: 10_000 },
      { id: "ten", text: "Finish ten gig shifts", hint: "Good ratings earn bonuses.", done: (s) => Number(s.flags.shifts ?? 0) >= 10, reward: 50_000 },
      { id: "car", text: "Get your licence and a car", hint: "Driving school, then buy a car: better gigs, rides of your own.", done: (s) => Boolean(s.life?.license) && s.life?.car === "owned", reward: 80_000 },
      { id: "property", text: "Buy a property in the city", hint: "Phone → City: rent pays you every week.", done: (s) => Object.values(s.city?.lots ?? {}).some((l) => l.owned), reward: 150_000 },
      { id: "worth", text: "Reach a net worth of ₦10,000,000", hint: "Stack the streams.", done: (s) => netWorth(s) >= 10_000_000, reward: 300_000 },
    ],
  },
  connections: {
    name: "It's who you know", icon: "💎", risk: "Low risk, if you keep your friends.",
    pitch: "Nepo friends open doors: referrals, contracts, tips.",
    steps: [
      { id: "meet", text: "Make a nepo friend", hint: "They hang around Jabi Lake Mall, the CBD, the tech hub, owambes.", done: (s) => Object.entries(s.npcs).some(([id, n]) => (id.startsWith("nepo_") || id === "bolaji") && n.met), reward: 20_000 },
      { id: "close", text: "Get a nepo friend to relationship 60", hint: "Hang out (it's expensive). Show up when they need you.", done: (s) => Object.entries(s.npcs).some(([id, n]) => id.startsWith("nepo_") && n.met && n.rel >= 60), reward: 60_000 },
      { id: "favour", text: "Get a favour from a nepo friend", hint: "Phone → Connects.", done: (s) => Object.keys(s.flags).some((k) => k.startsWith("nepo_fav_")), reward: 80_000 },
      { id: "topjob", text: "Land a top job through a connection", hint: "Oil & gas, a government contract, or a bank referral.", done: (s) => s.job === "oil_gas" || s.job === "gov_contract" || Boolean(s.banking?.job && s.banking.job.grade >= 4), reward: 200_000 },
      { id: "worth", text: "Reach a net worth of ₦10,000,000", hint: "Connections plus competence.", done: (s) => netWorth(s) >= 10_000_000, reward: 300_000 },
    ],
  },
  fast: {
    name: "Fast money", icon: "🎲", risk: "Extreme risk: prison, a record, losing everything.",
    pitch: "Slim's 'formats', Yahoo jobs, deals that don't ask questions. The game will let you. The EFCC will notice.",
    steps: [
      { id: "slim", text: "Get close to Slim", hint: "He hangs around. He always knows someone.", done: (s) => (s.npcs.slim?.rel ?? 0) >= 30, reward: 0 },
      { id: "job", text: "Take a fraud job", hint: "Slim calls at midnight. You don't have to answer.", done: (s) => Boolean(s.flags.fraud) || Boolean(s.justice?.record.length), reward: 0 },
      { id: "clean", text: "Get your evidence cleaned up", hint: "Phone → Legal: destroy evidence, or lay low to keep your perks.", done: (s) => (s.justice?.cleared.length ?? 0) > 0, reward: 0 },
      { id: "free", text: "Stay out of prison with ₦10,000,000", hint: "Most people on this path don't make it here.", done: (s) => netWorth(s) >= 10_000_000 && !s.justice?.prison && !(s.justice?.record ?? []).some((r) => /days|Life/.test(r.outcome)), reward: 0 },
    ],
  },
};

export const PATH_IDS = Object.keys(PATHS) as PathId[];

export type Missions = { path: PathId | null; done: string[]; since: number };

export function missions(s: GameState): Missions {
  s.missions ??= { path: null, done: [], since: s.day };
  return s.missions;
}

export function choosePath(s: GameState, path: PathId): string {
  const m = missions(s);
  m.path = path;
  m.since = s.day;
  s.flags.missions_seen = true;
  return `${PATHS[path].icon} Your path: ${PATHS[path].name}. ${PATHS[path].risk} Open Missions on your phone to see your next step.`;
}

/** The next unfinished step on your path. */
export function nextStep(s: GameState): { path: PathId; step: Step; index: number } | null {
  const path = s.missions?.path;
  if (!path) return null;
  const done = new Set(s.missions!.done);
  const i = PATHS[path].steps.findIndex((st) => !done.has(`${path}:${st.id}`));
  return i < 0 ? null : { path, step: PATHS[path].steps[i]!, index: i };
}

/** Tick off finished steps (in order) and pay rewards. Returns lines to show. */
export function checkMissions(s: GameState): string[] {
  const path = s.missions?.path;
  if (!path || s.stage !== "adult" || s.chapter) return [];
  const lines: string[] = [];
  for (let guard = 0; guard < 6; guard += 1) {
    const n = nextStep(s);
    if (!n || !n.step.done(s)) break;
    s.missions!.done.push(`${path}:${n.step.id}`);
    if (n.step.reward) s.stats.money += n.step.reward;
    lines.push(`🎯 Mission complete: ${n.step.text}${n.step.reward ? ` (+${naira(n.step.reward)})` : ""}.`);
    if (!nextStep(s)) lines.push(`🏆 You finished the ${PATHS[path].name} path! Financial freedom is ${naira(FREEDOM_TARGET)} net worth with no debt.`);
  }
  return lines;
}

/** For the Missions app. */
export const progress = (s: GameState, path: PathId) => PATHS[path].steps.filter((st) => s.missions?.done.includes(`${path}:${st.id}`)).length;