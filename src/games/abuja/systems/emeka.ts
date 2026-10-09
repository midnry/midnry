import { clamp, naira } from "./rules";
import type { GameState } from "./types";

// Emeka D: a nepo-baby classmate from secondary school. Anyone can be his
// friend, but his heart is spoken for: he only says yes to one player, the
// one named Eunice who signs in with the right account. Everyone else gets a
// kind no. The account is checked by a one-way hash of the sign-in email, so
// the address itself never appears in the game's code.

/** SHA-256 of the one sign-in email Emeka will date (lower-case, trimmed). */
const HEART = "e4ecd2762674dd4bb706fe3aa4fd2d8fc49e1124691d66437d26f8194c9106d0";
const NAME = "eunice";

/** Set once per session from the signed-in account; never saved in the game state. */
let viewerHash: string | null = null;

export async function setViewerEmail(email: string | null | undefined) {
  if (!email || typeof crypto === "undefined" || !crypto.subtle) {
    viewerHash = null;
    return;
  }
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  viewerHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** For tests: pretend the viewer has this hash. */
export function setViewerHash(hash: string | null) {
  viewerHash = hash;
}

/** The only player Emeka will date. */
export function isHisOne(s: GameState): boolean {
  return s.name.trim().toLowerCase() === NAME && viewerHash === HEART;
}

export type EmekaStage = "none" | "friends" | "crush" | "dating";
export type Emeka = { stage: EmekaStage; rel: number; met: number; since?: number; beats: number; lastAllowance: number; turnedDown?: boolean };

export function emeka(s: GameState): Emeka {
  s.emeka ??= { stage: "none", rel: 0, met: -1, beats: 0, lastAllowance: -1 };
  return s.emeka;
}

export const PROFILE = {
  name: "Emeka D",
  family: "Only son of a (fictional) shipping magnate and a retired judge",
  intro:
    "A black Prado stops at the school gate and the whole assembly turns to look. The boy who climbs out is holding three meat pies, and he gives two of them away before he reaches the classroom. \"I'm Emeka. Emeka D. Is this seat taken?\"",
};

/** Age band for what romance looks like right now. */
export function band(s: GameState): "school" | "campus" | "adult" {
  if (s.chapter === "secondary" || s.stage === "secondary" || s.stage === "primary") return "school";
  if (s.chapter === "university" || s.chapter === "nysc") return "campus";
  return "adult";
}

/** He first appears early in secondary school. */
export function shouldAppear(s: GameState): boolean {
  return s.chapter === "secondary" && emeka(s).met < 0 && !s.emekaMeet;
}

export type EmekaAct = "friend" | "interest" | "ignore" | "note" | "walk" | "date" | "ask" | "hang";

export const ACTS: Record<"school" | "campus" | "adult", { id: EmekaAct; label: string }[]> = {
  school: [
    { id: "hang", label: "Share lunch at break" },
    { id: "note", label: "Pass him a note in class" },
    { id: "walk", label: "Walk around the school together" },
    { id: "date", label: "Go to the cinema on a Saturday (curfew applies)" },
  ],
  campus: [
    { id: "hang", label: "Study together at the library" },
    { id: "date", label: "Dinner at a nice spot off campus" },
  ],
  adult: [
    { id: "hang", label: "Lunch at his favourite Maitama spot" },
    { id: "date", label: "A proper date night" },
  ],
};

/** The weekly allowance he gives his girlfriend, by stage of life. */
export function allowance(s: GameState): number {
  const b = band(s);
  return b === "school" ? 3_000 : b === "campus" ? 25_000 : 150_000;
}

const REJECT = [
  "Emeka smiles, kindly. \"You're amazing, honestly. But my heart is already spoken for. Friends?\"",
  "\"I like you a lot, just not like that. There's someone I'm waiting for.\" He still saves you a meat pie.",
  "Emeka laughs, not unkindly. \"You and I are better as friends. Trust me on this one.\"",
];

/** First meeting. */
export function meet(s: GameState, how: "friend" | "interest" | "ignore"): string {
  const e = emeka(s);
  s.emekaMeet = false;
  if (how === "ignore") {
    e.met = s.day;
    e.stage = "none";
    return "You look away. Emeka shrugs and sits somewhere else. You'll see him around.";
  }
  e.met = s.day;
  e.stage = "friends";
  e.rel = 20;
  if (how === "friend") return "\"Sit,\" you say. By the end of the day you know his favourite footballer, his dog's name, and that he hates being called 'rich boy'.";
  return askOut(s);
}

/** Initiate romance: only his one says yes. */
export function askOut(s: GameState): string {
  const e = emeka(s);
  if (e.stage === "dating") return "You're already together.";
  if (!isHisOne(s)) {
    e.turnedDown = true;
    e.stage = "friends";
    return REJECT[Math.floor(Math.random() * REJECT.length)]!;
  }
  e.stage = "dating";
  e.since = s.day;
  e.rel = clamp(Math.max(e.rel, 50) + 15);
  const b = band(s);
  return b === "school"
    ? "💌 You slip him a note: \"Do you like me? Yes / No.\" He ticks Yes three times and underlines it. From now on he walks you to the gate every day, and your lunch is on him."
    : b === "campus"
      ? "💌 You tell Emeka how you feel. He grins like he's been waiting years. \"Finally. I was starting to think I'd have to say it first.\""
      : "💌 Emeka takes your hand across the table. \"I've liked you since the day I gave away those meat pies. Be my girlfriend?\" You say yes.";
}

/** Time together. Returns the line; money may change. */
export function act(s: GameState, a: EmekaAct): string {
  const e = emeka(s);
  if (e.met < 0) return "";
  if (a === "ask") return askOut(s);
  const dating = e.stage === "dating";
  const b = band(s);
  if (a === "hang") {
    e.rel = clamp(e.rel + 5);
    return b === "school" ? "You split his jollof and your puff-puff at break. He tells terrible jokes on purpose." : b === "campus" ? "Two hours at the library. You study for one of them." : "Lunch in Maitama. He insists on paying, and on dessert.";
  }
  if (a === "note") {
    e.rel = clamp(e.rel + 6);
    return dating ? "He folds your note into a tiny heart and keeps it in his blazer pocket." : "He writes back: \"Ha! You're funny.\" A friend note, for now.";
  }
  if (a === "walk") {
    e.rel = clamp(e.rel + 6);
    return dating ? "You walk the long way round the school field, holding the strap of each other's bags. A teacher pretends not to see." : "You walk around the field and talk about everything and nothing.";
  }
  // A date.
  if (!dating) {
    e.rel = clamp(e.rel + 3);
    return "You go out as friends. It's fun. He pays for everyone.";
  }
  e.rel = clamp(e.rel + 10);
  if (b === "school") {
    const strict = Math.random() < 0.5;
    return strict
      ? "The Saturday film ends at 6 and your curfew is 6:30. Emeka's driver drops you at the gate with five minutes to spare."
      : "Cinema at Jabi, popcorn, and his driver takes you home on time. Your mum says he's 'a well-brought-up boy'.";
  }
  return b === "campus" ? "Dinner off campus, then a long walk back. He tells you about his parents' expectations; you tell him about yours." : "A rooftop dinner in Wuse 2. Emeka D treats you like the only person in the room.";
}

/** Allowance from Emeka: weekly as an adult, every few story beats before then. */
export function payAllowance(s: GameState, beat = false): string | null {
  const e = s.emeka;
  if (!e || e.stage !== "dating" || !isHisOne(s)) return null;
  if (beat) {
    e.beats += 1;
    if (e.beats % 4) return null;
  } else {
    const week = Math.floor(s.day / 7);
    if (e.lastAllowance === week) return null;
    e.lastAllowance = week;
  }
  const amount = allowance(s);
  s.stats.money += amount;
  return `💸 Emeka sends your allowance: ${naira(amount)}. "For you. Don't argue."`;
}
