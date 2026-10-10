import { shock } from "./market";
import { DAYS_PER_YEAR } from "./rules";
import { monthOf, rainSurge, weatherOf } from "./weather";
import type { RideMode } from "./rides";
import type { GameState } from "./types";

// Things happening across Abuja that everyone feels: fuel scarcity, Detty
// December, Christmas travel, Ramadan, flooded roads after a storm, election
// day and whatever the city is talking about today. Like the weather they
// follow from the day (and the time of day for floods), so the save holds
// nothing but the one-off market shock from today's viral story.
//
// A game year is 28 days, so a month is two or three days.

export type CityEventId = "fuel" | "detty" | "christmas" | "ramadan" | "flood" | "election" | "viral";

export type CityEvent = {
  id: CityEventId;
  icon: string;
  name: string;
  /** One line for the chip on screen. */
  line: string;
  headline: string;
  body: string;
  /** Multipliers on what things cost while it lasts. */
  fuel?: number;
  fare?: number;
  food?: number;
  /** No vehicles on the roads at all (election day). */
  noRides?: boolean;
  /** Low-lying districts where rides cost more (floods). */
  wetDistricts?: string[];
};

function roll(n: number, salt: number): number {
  let h = (n * 2654435761 + salt * 2246822519) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const dayOfYear = (day: number) => (((day - 1) % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
const yearOf = (day: number) => Math.floor((day - 1) / DAYS_PER_YEAR);
/** The last day of the game year (the end of December). */
const isYearEnd = (day: number) => dayOfYear(day) === DAYS_PER_YEAR - 1;

/** Fuel scarcity comes in spells of three days, about one day in twelve. */
function fuelScarcity(day: number): boolean {
  const block = Math.floor((day - 1) / 3);
  return block > 0 && roll(block, 11) < 0.08;
}

/** Area council elections: the first February day of every other year. */
function electionDay(day: number): boolean {
  return yearOf(day) % 2 === 1 && monthOf(day) === 1 && monthOf(day - 1) === 0;
}

const LOW_LYING = ["lugbe", "kubwa", "gwarinpa", "karu", "nyanya", "deidei"];

/** What the city is talking about today, and what it does to the markets. */
export const VIRAL: { headline: string; body: string; icon: string; line: string; moves: { asset: string; pct: number }[]; food?: number }[] = [
  {
    icon: "🍅",
    headline: "Tomato scarcity: a basket now costs as much as rent",
    body: "Traders at Wuse and Kubwa markets blame the 'tomato ebola' blight up north. Jollof is now a luxury good.",
    line: "Tomato scarcity: food costs more",
    moves: [{ asset: "AGRO", pct: 9 }],
    food: 1.25,
  },
  {
    icon: "💵",
    headline: "Naira slides again at the parallel market",
    body: "Bureau de change operators in Wuse Zone 4 say the dollar is 'running'. Importers are holding their breath.",
    line: "Naira slides: dollar up",
    moves: [{ asset: "USDNGN", pct: 6 }],
  },
  {
    icon: "🪙",
    headline: "NaijaCoin pumps after a celebrity tweet",
    body: "A musician with 9 million followers called NaijaCoin 'the future'. His lawyers later said he was hacked.",
    line: "NaijaCoin pumps",
    moves: [{ asset: "NAIJ", pct: 18 }, { asset: "JOLLOF", pct: 25 }],
  },
  {
    icon: "🛢️",
    headline: "Pipeline repairs finished early, oil output up",
    body: "Delta Crest Oil says production is back to full. Analysts expect a strong quarter.",
    line: "Oil output up",
    moves: [{ asset: "DCOIL", pct: 8 }],
  },
  {
    icon: "📉",
    headline: "Konnect Telecom fined for 'unsolicited' SMS",
    body: "The regulator says customers were charged for horoscope messages they never asked for. Shares fall.",
    line: "Telecom fined: shares fall",
    moves: [{ asset: "TELCO", pct: -9 }],
  },
  {
    icon: "🏦",
    headline: "Zuma Capital Bank posts record profit",
    body: "The bank credits 'digital transformation' and charges on every transfer. Customers credit something else.",
    line: "Bank profits: shares up",
    moves: [{ asset: "UCB", pct: 7 }],
  },
  {
    icon: "🐸",
    headline: "JollofInu crashes after its founder 'japas'",
    body: "The meme coin's founder posted a photo from an airport lounge, then deleted every account.",
    line: "JollofInu crashes",
    moves: [{ asset: "JOLLOF", pct: -35 }],
  },
];

/** Today's viral story, if the city has one (about three days in ten). */
export function viralStory(day: number) {
  if (roll(day, 23) > 0.3) return null;
  return VIRAL[Math.floor(roll(day, 29) * VIRAL.length)]!;
}

/** Everything happening across Abuja right now, most important first. */
export function cityEvents(day: number, slot: number): CityEvent[] {
  const out: CityEvent[] = [];
  const month = monthOf(day);
  if (electionDay(day)) {
    out.push({
      id: "election",
      icon: "🗳️",
      name: "Election day",
      line: "Restriction of movement: no rides today",
      headline: "Area council elections: restriction of movement in force",
      body: "Police say no vehicles on the roads until voting closes. Politicians' 'logistics' teams have been seen at every polling unit with envelopes.",
      noRides: true,
    });
  }
  if (fuelScarcity(day)) {
    out.push({
      id: "fuel",
      icon: "⛽",
      name: "Fuel scarcity",
      line: "Fuel ×2.5, fares up",
      headline: "Fuel scarcity grips Abuja: queues stretch for kilometres",
      body: "Filling stations along the Airport Road have locked their gates. Black-market jerrycans are going for double the pump price. Taxi drivers have 'adjusted' their fares.",
      fuel: 2.5,
      fare: 1.4,
    });
  }
  if (month === 11) {
    out.push({
      id: "detty",
      icon: "🎉",
      name: "Detty December",
      line: "Parties everywhere, prices up",
      headline: "Detty December: Abuja's party season is here",
      body: "Owambes every weekend, concerts at Eagle Square and the diaspora are back with dollars. Everything costs more, especially small chops.",
      food: 1.15,
      fare: 1.15,
    });
  }
  if (isYearEnd(day)) {
    out.push({
      id: "christmas",
      icon: "🎄",
      name: "Christmas",
      line: "Everyone's travelling: fares up",
      headline: "Christmas: motor parks overflow as Abuja heads home",
      body: "Jabi and Utako motor parks are packed with people going to the village. Fares have doubled. Those staying in town are filling the churches and the suya spots.",
      fare: 1.6,
    });
  }
  if (month === 2) {
    out.push({
      id: "ramadan",
      icon: "🌙",
      name: "Ramadan",
      line: "Fasting month: food costs a little more",
      headline: "Ramadan Kareem: the fasting month begins",
      body: "Food sellers in Garki and Wuse open late for iftar. The National Mosque is full every evening, and so are the iftar tables.",
      food: 1.1,
    });
  }
  if ([0, 1, 2, 3].some((s) => s <= slot && weatherOf(day, s).sky === "storm")) {
    out.push({
      id: "flood",
      icon: "🌊",
      name: "Flooded roads",
      line: "Floods in Lugbe, Kubwa, Gwarinpa: rides cost more",
      headline: "Flash floods after the storm",
      body: "Gutters overflowed in Lugbe, Kubwa and Gwarinpa. Drivers are charging extra to go anywhere near the water, and some won't go at all.",
      wetDistricts: LOW_LYING,
    });
  }
  const viral = viralStory(day);
  if (viral) out.push({ id: "viral", icon: viral.icon, name: "Trending", line: viral.line, headline: viral.headline, body: viral.body, food: viral.food });
  return out;
}

export const eventsNow = (s: GameState) => (s.chapter ? [] : cityEvents(s.day, s.slot));
export const hasCityEvent = (s: GameState, id: string) => cityEvents(s.day, s.slot).some((e) => e.id === id);

/** The fare multiplier for a ride: rain, fuel scarcity, holidays, floods where you're going. Buses only feel fuel. */
export function fareSurge(s: GameState, mode: RideMode, toDistrict?: string): number {
  let m = rainSurge(weatherOf(s.day, s.slot));
  for (const e of eventsNow(s)) {
    if (e.fare) m *= mode === "bus" ? 1 + (e.fare - 1) / 2 : e.fare;
    if (e.wetDistricts && toDistrict && e.wetDistricts.includes(toDistrict) && mode !== "bus") m *= 1.5;
  }
  return m;
}

export const fuelSurge = (s: GameState) => eventsNow(s).reduce((m, e) => m * (e.fuel ?? 1), 1);
export const foodSurge = (s: GameState) => eventsNow(s).reduce((m, e) => m * (e.food ?? 1), 1);
/** Why you can't take a ride right now, if you can't. */
export const rideStop = (s: GameState) => (eventsNow(s).some((e) => e.noRides) ? "🗳️ Election day: restriction of movement. No okadas, kekes, taxis or buses until voting closes. You'll have to walk." : null);

/** Once a day: today's viral story moves the markets (the city talks, prices react). */
export function applyViral(s: GameState): void {
  const v = viralStory(s.day);
  if (!v || s.flags.viral_day === s.day) return;
  s.flags.viral_day = s.day;
  shock(s, v.moves);
}
