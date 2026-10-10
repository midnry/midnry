import { addLog, addStat, clamp, naira } from "./rules";
import { babyName } from "./family";
import { withoutBankCheck } from "./bank";
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

export type EmekaStage = "none" | "friends" | "crush" | "dating" | "engaged" | "married";
export type Emeka = {
  stage: EmekaStage;
  rel: number;
  met: number;
  since?: number;
  beats: number;
  lastAllowance: number;
  turnedDown?: boolean;
  asks?: number;
  ignored?: boolean;
  /** The grown-up story: his parents, his mum's test, the introduction, the ring, the wedding. */
  parentsMet?: boolean;
  mumApproved?: boolean;
  /** Day of the last try at his mum's test (one try a week). */
  mumTried?: number;
  introduced?: boolean;
  /** Day the wedding happened. */
  wedDay?: number;
};

/** Together in any form: dating, engaged or married. */
export const together = (e: Emeka | undefined) => !!e && (e.stage === "dating" || e.stage === "engaged" || e.stage === "married");

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
  if (s.emeka?.stage === "married") return 400_000;
  return b === "school" ? 3_000 : b === "campus" ? 25_000 : 150_000;
}

/** Anyone else who asks him out: all he wants to know is where Eunice is. */
const ASK_EUNICE = [
  "Emeka barely hears you. \"Sorry, have you seen Eunice? Tall, laughs loud, the best person in any room?\"",
  "\"That's sweet, but... have you seen Eunice today? She was supposed to be here.\"",
  "Emeka smiles kindly and looks past you. \"Has Eunice passed this way? Tell her I'm looking for her.\"",
  "\"You're nice. But I'm waiting for Eunice. Have you seen her? Anybody?\"",
  "He checks his phone again. \"Eunice hasn't replied. You haven't seen her, have you?\"",
];
/** Small talk with him always wanders back to her. */
const EUNICE_ASIDES = [
  " Then: \"By the way, have you seen Eunice?\"",
  " He asks if you've seen Eunice around. Twice.",
  " \"If you see Eunice, tell her I said hi.\"",
];
/** Calling yourself Eunice to fool him. */
const CHEAP_COPY = "Emeka looks you up and down. \"Eunice? You? Please. You're a cheap copy.\" He turns his back and doesn't look at you again.";
const IGNORED = ["Emeka looks straight through you.", "Emeka puts in his earphones as you walk up.", "\"Cheap copy,\" Emeka mutters, and walks off."];

/** Named Eunice, but not her: someone trying to fool him. */
const impostor = (s: GameState) => s.name.trim().toLowerCase() === NAME && !isHisOne(s);


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
  if (together(e)) return "You're already together.";
  if (e.ignored) return IGNORED[Math.floor(Math.random() * IGNORED.length)]!;
  if (impostor(s)) {
    e.ignored = true;
    e.stage = "none";
    e.rel = 0;
    return CHEAP_COPY;
  }
  if (!isHisOne(s)) {
    e.turnedDown = true;
    e.stage = "friends";
    e.asks = (e.asks ?? 0) + 1;
    return ASK_EUNICE[(e.asks - 1) % ASK_EUNICE.length]!;
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
  if (e.ignored) return IGNORED[Math.floor(Math.random() * IGNORED.length)]!;
  const line = actLine(s, a);
  // With anyone but her, the conversation keeps drifting back to Eunice.
  return !isHisOne(s) && Math.random() < 0.5 ? `${line}${EUNICE_ASIDES[Math.floor(Math.random() * EUNICE_ASIDES.length)]}` : line;
}

function actLine(s: GameState, a: EmekaAct): string {
  const e = emeka(s);
  const dating = together(e);
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
  if (!e || !together(e) || !isHisOne(s)) return null;
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

// ── The grown-up story (only for her) ───────────────────────────────────────
// Dinner with his parents in Asokoro, his mother's quiet test, the families'
// introduction, a proposal, and the wedding of the year, which Emeka pays for.

export type StoryStep = "parents" | "mum" | "intro" | "proposal" | "wedding" | null;

/** The next step of the story, if one is open right now. */
export function nextStep(s: GameState): StoryStep {
  const e = s.emeka;
  if (!e || !isHisOne(s) || band(s) !== "adult" || !together(e)) return null;
  if (e.stage === "married") return null;
  if (!e.parentsMet) return e.rel >= 60 ? "parents" : null;
  if (!e.mumApproved) return "mum";
  if (!e.introduced) return "intro";
  if (e.stage === "dating") return e.rel >= 80 ? "proposal" : null;
  return "wedding";
}

/** What the next step needs, for the panel. */
export function stepHint(s: GameState): string {
  const e = s.emeka;
  if (!e || !isHisOne(s) || !together(e) || e.stage === "married") return "";
  if (band(s) !== "adult") return "The rest of your story together starts when you're both grown up.";
  if (!e.parentsMet && e.rel < 60) return "Spend more time together. He wants you to meet his parents when you're closer.";
  if (e.stage === "dating" && e.introduced && e.rel < 80) return "Keep going on dates. He's saving up the courage (and the ring).";
  return "";
}

export const STEP_LABEL: Record<Exclude<StoryStep, null>, string> = {
  parents: "🏛️ Dinner with his parents in Asokoro",
  mum: "⚖️ Tea with his mother, the retired judge",
  intro: "🤝 The introduction: his family visits yours",
  proposal: "💍 Emeka has something to ask you",
  wedding: "👑 The wedding of the year",
};

/** Dinner with Chief and Justice (Mrs) D. */
export function meetParents(s: GameState): string {
  const e = emeka(s);
  if (nextStep(s) !== "parents") return "";
  e.parentsMet = true;
  e.rel = clamp(e.rel + 8);
  addStat(s, "network", 4);
  addLog(s, "Met Emeka's parents in Asokoro.");
  return "A gate the size of a house, a dining table for twenty, and a fish so big it has its own plate. His father, Chief D, talks about ships and laughs at his own jokes. His mother, the retired judge, says very little and watches everything. As you leave she says, \"Come for tea next week. Just the two of us.\"";
}

/** His mother's questions: answer two of three well to win her over. */
export const MUM_TEST: { q: string; options: string[]; answer: number }[] = [
  { q: "An elderly aunt walks into the parlour while you're on your phone. You…", options: ["Keep scrolling, she didn't see you", "Stand up, greet her properly and offer your seat", "Wave and say 'Hi aunty'"], answer: 1 },
  { q: "\"Emeka says he'll cook tonight. What do you think of that?\"", options: ["\"A man should never be in the kitchen.\"", "\"Then I'll sit and watch.\"", "\"We'll cook together. He makes the stew, I make sure it's edible.\""], answer: 2 },
  { q: "\"And what do you want for your own life?\"", options: ["\"Whatever Emeka wants.\"", "\"To build something of my own, and to build a home with him.\"", "\"To travel the world on his card.\""], answer: 1 },
];

export function mumTest(s: GameState, correct: number): string {
  const e = emeka(s);
  if (nextStep(s) !== "mum") return "";
  if (e.mumTried !== undefined && s.day - e.mumTried < 7) return "She said next week. Judges don't like being rushed.";
  e.mumTried = s.day;
  if (correct >= 2) {
    e.mumApproved = true;
    e.rel = clamp(e.rel + 6);
    addLog(s, "Won over Emeka's mother.");
    return "Justice (Mrs) D sets down her cup. \"You'll do. More than do.\" That evening Emeka calls, almost shouting: \"What did you SAY to her? She's never said that about anybody.\"";
  }
  addStat(s, "stress", 6);
  return "She smiles politely and asks the driver to take you home. \"Come back next week,\" she says. You're not sure if that's a good sign.";
}

/** The families meet. Emeka's side arrives in a convoy. */
export function introduction(s: GameState): string {
  const e = emeka(s);
  if (nextStep(s) !== "intro") return "";
  e.introduced = true;
  e.rel = clamp(e.rel + 6);
  addStat(s, "reputation", 4);
  if (s.parents) s.parents.bond = clamp(s.parents.bond + 10);
  addLog(s, "The introduction: Emeka's family visited yours.");
  return "Four black jeeps on your parents' street. Chief D brings kola nuts, wine and a speech nobody asked for. Your dad pretends to be hard to impress for exactly six minutes. Your mum has already chosen the aso-ebi colours. Emeka paid for everything, including the canopy.";
}

/** He proposes. */
export function propose(s: GameState): string {
  const e = emeka(s);
  if (nextStep(s) !== "proposal") return "";
  e.stage = "engaged";
  e.rel = clamp(e.rel + 10);
  addStat(s, "stress", -15);
  addLog(s, "Engaged to Emeka D.");
  return "💍 A rooftop in Maitama, the whole city lit up below. Emeka is shaking. \"Eunice, I've known since the meat pies. Will you marry me?\" You say yes before he finishes the question.";
}

/** The wedding of the year. Emeka pays; the guests spray. */
export function wedding(s: GameState): string {
  const e = emeka(s);
  if (nextStep(s) !== "wedding") return "";
  e.stage = "married";
  e.wedDay = s.day;
  e.rel = 100;
  const sprayed = 2_000_000 + Math.round(s.stats.network * 40_000);
  withoutBankCheck(() => addStat(s, "money", sprayed));
  addStat(s, "reputation", 15);
  addStat(s, "network", 10);
  addStat(s, "stress", -20);
  addLog(s, "Married Emeka D at the wedding of the year.");
  return `👑 Two thousand guests at Eagle Square, a live band, drones overhead and aso-ebi as far as the eye can see. Emeka paid for all of it. The guests sprayed ${naira(sprayed)} and it's all yours. Instaflex can talk about nothing else.`;
}

/** Married life, weekly: maybe a baby. */
export function weeklyEmeka(s: GameState): string | null {
  const e = s.emeka;
  if (!e || e.stage !== "married" || !isHisOne(s)) return null;
  const kids = s.children.filter((c) => c.with === "emeka");
  if (kids.length >= 3 || Math.random() > 0.08) return null;
  const gender = Math.random() < 0.5 ? "female" : "male";
  const name = babyName(gender, s.children.map((c) => c.name));
  s.children.push({ name, born: s.day, with: "emeka", gender, grades: 50 });
  addLog(s, `${name} was born to you and Emeka.`);
  return `👶 ${name} is born! Emeka cries more than the baby. Chief D announces it on the radio.`;
}
