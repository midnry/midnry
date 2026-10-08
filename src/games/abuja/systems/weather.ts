import { DAYS_PER_YEAR } from "./rules";

// Abuja's weather. The rains come from April to October (heaviest July to
// September), the dry season from November to March, and the harmattan
// blows dusty haze down from the Sahara from December to February. A game
// year is 28 days, so a month is two or three days. The weather follows from
// the day and the time of day, so it needs nothing in the save.

export type Season = "rainy" | "dry" | "harmattan";
export type Sky = "sunny" | "cloudy" | "rain" | "storm" | "haze";
export type Weather = { month: number; season: Season; sky: Sky; label: string; icon: string; wet: boolean };

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The month of a game day: day 1 is the first of January. */
export function monthOf(day: number): number {
  const d = (((day - 1) % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  return Math.floor((d * 12) / DAYS_PER_YEAR);
}

export function seasonOf(day: number): Season {
  const m = monthOf(day);
  if (m === 11 || m <= 1) return "harmattan";
  if (m >= 3 && m <= 9) return "rainy";
  return "dry";
}

/** A steady pseudo-random number for a day and a salt, so the same day always has the same weather. */
function roll(day: number, salt: number): number {
  let h = (day * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** How likely rain is on a day in each month (January first): none in the dry months, most in August. */
const RAIN_CHANCE = [0, 0, 0.05, 0.25, 0.45, 0.55, 0.65, 0.75, 0.7, 0.45, 0.08, 0];

export function weatherOf(day: number, slot: number): Weather {
  const month = monthOf(day);
  const season = seasonOf(day);
  const base = { month, season };
  if (season === "harmattan") {
    // Dusty haze most days, thickest in the morning.
    const hazy = roll(day, 1) < 0.75;
    return hazy
      ? { ...base, sky: "haze", label: slot === 0 ? "Harmattan haze, cold morning" : "Harmattan haze", icon: "🌫️", wet: false }
      : { ...base, sky: "sunny", label: "Dry and dusty", icon: "☀️", wet: false };
  }
  const rainyDay = roll(day, 2) < RAIN_CHANCE[month]!;
  // Rain in Abuja mostly falls in the afternoon and evening, often as a storm.
  const when = Math.floor(roll(day, 3) * 3) + 1;
  if (rainyDay && (slot === when || (slot === when + 1 && roll(day, 4) < 0.5))) {
    const storm = month >= 5 && month <= 8 && roll(day, 5) < 0.4;
    return storm ? { ...base, sky: "storm", label: "Thunderstorm", icon: "⛈️", wet: true } : { ...base, sky: "rain", label: "Rain", icon: "🌧️", wet: true };
  }
  if (rainyDay || (season === "rainy" && roll(day, 6) < 0.35)) return { ...base, sky: "cloudy", label: season === "rainy" ? "Cloudy, rain about" : "Cloudy", icon: "⛅", wet: false };
  return { ...base, sky: "sunny", label: season === "dry" ? "Hot and sunny" : "Sunny", icon: "☀️", wet: false };
}

export const SEASON_NAMES: Record<Season, string> = { rainy: "Rainy season", dry: "Dry season", harmattan: "Harmattan" };

/** Taxis charge more in the rain; okada and keke riders too, if they'll go at all. */
export function rainSurge(w: Weather): number {
  return w.sky === "storm" ? 1.5 : w.sky === "rain" ? 1.25 : 1;
}
