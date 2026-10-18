/** Shared Daily case leaderboard. Each device has a random anonymous token
 * (only its hash is stored by the server); the server keeps that device's
 * best score for the day and recomputes it from the run's numbers. Every
 * call fails quietly offline: the local best score still shows. */
import { dailyKey } from "./outpost-shifts.js";

const ENDPOINT = "/api/games/outpost-daily";
const TOKEN_KEY = "midnry-outpost-device";

export function deviceToken() {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!/^[a-f0-9]{32}$/.test(token || "")) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

let cached = null;

async function call(body) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, token: deviceToken() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Leaderboard unavailable.");
  cached = { day: data.day, at: Date.now(), board: data };
  return data;
}

/** Today's board, reusing a recent copy. */
export function fetchBoard(day = dailyKey(), maxAge = 60000) {
  if (cached && cached.day === day && Date.now() - cached.at < maxAge) return Promise.resolve(cached.board);
  return call({ op: "board", day });
}

/** Post a finished daily run; resolves to the updated board. */
export const submitDaily = (day, name, run) => call({ op: "submit", day, name, ...run });

export const cachedBoard = (day = dailyKey()) => (cached?.day === day ? cached.board : null);
