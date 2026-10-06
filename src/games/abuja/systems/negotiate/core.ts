import { life } from "../life";
import type { GameState } from "../types";
import { DEALS, deal as dealDef, economy } from "./deals";
import { person, TRAIT_INFO, type Counterparty } from "./people";
import type { Approach, Bluff, Line, NegLife, NegRep, Negotiation, NpcMemory, Quality, Term, Trait } from "./types";

// The negotiation engine. Two stages, as in a real conversation:
//   1. Persuasion: convince them the deal is worth discussing.
//   2. Bargaining: build offers, read their reaction, trade concessions.
// Nothing is a coin flip in isolation: who they are, how they feel about you,
// your reputation, their circumstances and the market all move the odds.

// ── Memory and reputation ────────────────────────────────────────────────────

export function negLife(s: GameState): NegLife {
  const l = life(s);
  l.neg ??= {
    skill: 5,
    rep: { fair: 0, ruthless: 0, generous: 0, difficult: 0, untrustworthy: 0, business: 0 },
    npcs: {},
    opportunities: [],
    staff: null,
    supplier: null,
    rent: null,
    history: [],
    active: null,
  };
  return l.neg;
}

export function memory(s: GameState, id: string): NpcMemory {
  const n = negLife(s);
  n.npcs[id] ??= { rel: 0, deals: 0, insults: 0, bluffsCaught: 0, exploited: 0, known: [], refuseUntil: 0 };
  return n.npcs[id]!;
}

/** What people say about you as a negotiator. */
export function repLabel(rep: NegRep | undefined): { label: string; blurb: string } {
  if (!rep) return { label: "Unknown", blurb: "Nobody knows how you do business yet." };
  const total = rep.fair + rep.ruthless + rep.generous + rep.difficult + rep.untrustworthy;
  if (rep.untrustworthy >= 4 && rep.untrustworthy >= rep.fair) return { label: "Untrustworthy negotiator", blurb: "Your bluffs have been caught. People double-check everything you say." };
  if (rep.business >= 8 && rep.fair >= rep.ruthless) return { label: "Excellent businessperson", blurb: "People respect your deals. Some bring opportunities straight to you." };
  if (total < 3) return { label: "Unknown", blurb: "Nobody knows how you do business yet." };
  const top = (["ruthless", "fair", "generous", "difficult"] as const).reduce((a, b) => (rep[b] > rep[a] ? b : a));
  const map = {
    ruthless: { label: "Ruthless negotiator", blurb: "You squeeze people. Sellers start higher, expecting a fight." },
    fair: { label: "Fair negotiator", blurb: "People trust your offers and start closer to a fair price." },
    generous: { label: "Generous negotiator", blurb: "You pay well. People love dealing with you, maybe a little too much." },
    difficult: { label: "Difficult negotiator", blurb: "You haggle hard and walk out often. People pad their prices." },
  } as const;
  return map[top];
}

/** Your bargaining skill: practice, plus what trading and hustling taught you. */
export function playerSkill(s: GameState): number {
  const n = s.life?.neg;
  return Math.min(100, Math.round((n?.skill ?? 5) + s.skills.trade / 3 + s.skills.hustle / 4));
}

// ── Values ───────────────────────────────────────────────────────────────────

export function termValue(n: Pick<Negotiation, "terms">, t: Term): number {
  if (!t.included) return 0;
  if (t.amount == null) return t.value;
  if (t.pctOf) {
    const base = n.terms.find((x) => x.id === t.pctOf);
    const baseValue = base ? (base.amount ?? 0) * (base.mult ?? 1) : 0;
    return (t.amount / 100) * baseValue * (t.mult ?? 1);
  }
  return t.amount * (t.mult ?? 1);
}

/** How good the deal looks to them: what they get minus what they give, by their own values. */
export function npcUtility(n: Pick<Negotiation, "terms">): number {
  let u = 0;
  for (const t of n.terms) {
    const v = termValue(n, t) * t.npcWeight;
    u += t.side === "player" ? v : -v;
  }
  return u;
}

/** How good the deal really is for you, at market value. */
export function playerUtility(n: Pick<Negotiation, "terms">): number {
  let u = 0;
  for (const t of n.terms) {
    const v = termValue(n, t) * (t.playerWeight ?? 1);
    u += t.side === "npc" ? v : -v;
  }
  return u;
}

export function qualityOf(score: number): Quality {
  return score >= 0.15 ? "excellent" : score >= 0.05 ? "good" : score >= -0.05 ? "fair" : score >= -0.15 ? "poor" : "terrible";
}

export const QUALITY_LABEL: Record<Quality, string> = {
  excellent: "Excellent deal",
  good: "Good deal",
  fair: "Fair deal",
  poor: "Poor deal",
  terrible: "Terrible deal",
};

/** Your read of how good the current offer is for you, using your estimate of the market. */
export function estimatedQuality(n: Negotiation): Quality {
  const fudge = n.estimate - n.market;
  const subjectToYou = n.terms.some((t) => t.locked && t.side === "npc");
  // If you're receiving the main thing, a higher estimate makes deals look better to you.
  return qualityOf((playerUtility(n) + (subjectToYou ? fudge : -fudge)) / n.market);
}

/** Their visible reaction to the current offer: vague, sharper with skill. */
export function reaction(n: Negotiation, skill: number): { level: number; text: string } {
  const u = npcUtility(n);
  const gap = (n.aspiration - u) / n.market;
  // A little noise you can't see through until you're good.
  const blur = Math.max(0, 0.06 - skill / 2000) * Math.sin(n.rounds * 2.3 + n.market);
  const g = gap + blur;
  if (g <= 0.005) return { level: 4, text: "They look ready to shake hands." };
  if (g <= 0.06) return { level: 3, text: "They're close. Very close." };
  if (g <= 0.15) return { level: 2, text: "They're interested, but not there yet." };
  if (g <= 0.3) return { level: 1, text: "They're not impressed." };
  return { level: 0, text: "That's not even in the same street." };
}

// ── Starting ─────────────────────────────────────────────────────────────────

const has = (n: Negotiation, t: Trait) => n.traits.includes(t);
const say = (n: Negotiation, who: Line["who"], text: string, tone?: Line["tone"]) => {
  n.log.push({ who, text, tone });
  if (n.log.length > 60) n.log.splice(0, n.log.length - 60);
};
const rnd = (min: number, max: number) => min + Math.random() * (max - min);

/** Why you can't open this deal right now, if anything. */
export function blocked(s: GameState, dealId: string): string | null {
  const def = dealDef(dealId);
  if (!def) return "No such deal.";
  const who = person(def.npc);
  const mem = s.life?.neg?.npcs[def.npc];
  if (mem && mem.refuseUntil > s.day) return `${who?.name ?? "They"} won't see you until day ${mem.refuseUntil}.`;
  if (mem && mem.rel <= -60) return `${who?.name ?? "They"} refuses to do business with you.`;
  return def.available(s);
}

export function startNegotiation(s: GameState, dealId: string): string | null {
  const why = blocked(s, dealId);
  if (why) return why;
  const def = dealDef(dealId)!;
  const who = person(def.npc)!;
  const neg = negLife(s);
  const mem = memory(s, def.npc);
  const setup = def.setup(s);
  const M = setup.market;
  const rep = neg.rep;
  const opp = neg.opportunities.find((o) => o.deal === dealId && o.until >= s.day);
  const traits = who.traits;
  const t = (x: Trait) => (traits.includes(x) ? 1 : 0);
  const wealth = Math.max(0, Math.min(100, who.wealth + rnd(-10, 10)));
  const urgency = Math.max(0, Math.min(1, setup.urgency + rnd(-0.1, 0.1)));
  const capped = (x: number, c: number) => Math.min(c, x);

  // The least they'd accept, as surplus over a fair exchange (hidden).
  let r = 0.03 * t("greedy") + 0.02 * t("stubborn") - 0.18 * t("desperate") - 0.12 * urgency + ((wealth - 50) / 50) * 0.03;
  r += -(mem.rel / 100) * 0.08 + capped(rep.ruthless * 0.004 + rep.untrustworthy * 0.004, 0.08) - capped((rep.fair + rep.generous) * 0.003, 0.05);
  r += (setup.npcAlt ? 0.02 : 0) + mem.exploited * 0.03 - (opp?.bonus ?? 0);
  const reservation = M * r;
  // Where they open: always above a fair exchange, higher for greedy, sharp or proud people,
  // and for players known to haggle. Desperation shows in how fast they fall, not where they start.
  let spread = 0.24 + 0.08 * t("greedy") + 0.05 * t("stubborn") + 0.04 * t("proud") - 0.05 * t("desperate") + who.skill / 700;
  spread += capped(rep.difficult * 0.004 + rep.ruthless * 0.003, 0.08) - (mem.rel / 100) * 0.08;
  if (s.stats.money > M * 5) spread += 0.04; // they've sized up your wallet
  const aspiration = Math.max(reservation + M * 0.1, M * spread);

  const required = Math.max(1, Math.min(4, 2 + t("stubborn") + (t("proud") && mem.rel < 20 ? 1 : 0) - (t("friendly") && mem.rel > 20 ? 1 : 0) - t("desperate") - (opp ? 1 : 0)));
  const patience = Math.max(2, who.patience + (mem.rel > 30 ? 1 : 0) - (rep.difficult > 5 ? 1 : 0) - (mem.insults > 2 ? 1 : 0));
  const skill = playerSkill(s);
  // Your read of the market: off by up to 20%, less as you get better. Exact when there's a going rate.
  const err = setup.known ? 0 : (0.2 - Math.min(0.17, skill / 600)) * (Math.random() * 2 - 1);

  const n: Negotiation = {
    deal: dealId,
    npc: def.npc,
    title: def.title,
    stage: "persuade",
    terms: setup.terms,
    price: setup.price,
    market: M,
    estimate: Math.round(M * (1 + err)),
    reservation,
    aspiration,
    urgency,
    skill: who.skill,
    wealth,
    traits,
    npcAlt: setup.npcAlt,
    playerAlt: setup.playerAlt,
    patience,
    maxPatience: patience,
    resistance: Math.max(0, 10 - mem.rel / 3 + (rep.untrustworthy > 2 ? 10 : 0) + mem.insults * 4),
    anger: 0,
    progress: 0,
    required,
    attempts: 0,
    used: {},
    revealed: mem.known.map((k) => `trait:${k}`),
    rounds: 0,
    counter: null,
    finalClaim: null,
    claimedRival: false,
    walkedOnce: false,
    log: [],
    outcome: null,
  };
  say(n, "them", who.greeting);
  say(n, "note", setup.intro);
  if (opp) say(n, "note", opp.text, "good");
  if (mem.deals) say(n, "note", mem.rel >= 20 ? `You've done business before. ${who.name} seems glad to see you.` : mem.rel <= -20 ? `${who.name} remembers your last deal. Not fondly.` : `You've dealt with ${who.name} before.`);
  const label = repLabel(rep).label;
  if (label !== "Unknown") say(n, "note", `Word gets around: you're known as a ${label.toLowerCase()}.`);
  neg.active = n;
  return null;
}

// ── Persuasion ───────────────────────────────────────────────────────────────

export const APPROACHES: Record<Approach, { label: string; line: string; hint: string }> = {
  friendly: { label: "Be friendly", line: "\"Let's do this the way friends do business.\"", hint: "Warmth and goodwill" },
  confident: { label: "Be confident", line: "\"I know what this is worth, and I know what I can do with it.\"", hint: "Calm authority" },
  aggressive: { label: "Push hard", line: "\"Let's not waste each other's time. This is the deal.\"", hint: "Pressure. Risky." },
  logical: { label: "Make the case", line: "\"Look at the numbers with me.\"", hint: "Facts and value" },
  mutual: { label: "Mutual benefit", line: "\"This works for both of us. Here's how.\"", hint: "Shared gain" },
  urgency: { label: "Press on timing", line: "\"This won't wait. Neither will the market.\"", hint: "Works if they need it soon" },
  concession: { label: "Offer a concession", line: "\"I'll give a little ground to show I'm serious.\"", hint: "Likely to work, but costs you" },
  probe: { label: "Ask questions", line: "\"Tell me more about your situation.\"", hint: "Learn about them" },
};

/** How well an approach suits this person and moment. */
function fit(s: GameState, n: Negotiation, a: Approach): number {
  const rel = memory(s, n.npc).rel;
  let f = 0;
  const T = (t: Trait, v: number) => (has(n, t) ? v : 0);
  if (a === "friendly") f = 0.25 * +has(n, "friendly") + T("proud", 0.05) - T("practical", 0.05) - T("greedy", 0.05) - T("stubborn", 0.05) + rel / 200;
  if (a === "confident") f = T("cautious", 0.1) + T("risky", 0.1) + T("desperate", 0.1) + T("stubborn", 0.05) - T("proud", 0.05) + Math.min(0.1, (s.life?.neg?.rep.business ?? 0) * 0.01);
  if (a === "aggressive") f = T("desperate", 0.2) + T("cautious", 0.05) - T("proud", 0.35) - T("friendly", 0.15) - T("stubborn", 0.1);
  if (a === "logical") f = T("practical", 0.25) + T("cautious", 0.1) + T("greedy", 0.05) + T("proud", 0.05) - T("risky", 0.05);
  if (a === "mutual") f = T("greedy", 0.2) + T("risky", 0.15) + T("friendly", 0.1) + T("practical", 0.05);
  if (a === "urgency") f = (n.urgency - 0.4) * 0.6 + T("cautious", 0.05) - T("stubborn", 0.1);
  if (a === "concession") f = 0.25 + T("greedy", 0.1);
  return f;
}

function chance(s: GameState, n: Negotiation, a: Approach): number {
  const rep = s.life?.neg?.rep;
  const repBoost = rep ? Math.min(0.08, rep.fair * 0.01 + rep.business * 0.005) - Math.min(0.12, rep.untrustworthy * 0.02) : 0;
  const repeat = (n.used[a] ?? 0) * 0.12;
  const p = 0.55 + (playerSkill(s) - n.skill) / 250 + (s.stats.reputation - 30) / 400 + repBoost - n.resistance / 200 + fit(s, n, a) - repeat - n.anger * 0.05;
  return Math.max(0.05, Math.min(0.95, p));
}

/** A hint you can see under an approach: only for traits you've discovered. */
export function approachHint(s: GameState, n: Negotiation, a: Approach): "good" | "bad" | null {
  if (a === "probe" || playerSkill(s) < 20) return null;
  const known = n.traits.filter((t) => n.revealed.includes(`trait:${t}`));
  if (!known.length && !(a === "urgency" && n.revealed.includes("urgency"))) return null;
  const f = fit(s, { ...n, traits: known, urgency: n.revealed.includes("urgency") ? n.urgency : 0.4 }, a);
  return f >= 0.12 ? "good" : f <= -0.1 ? "bad" : null;
}

const GOOD = ["That argument seems to have worked.", "They nod slowly. You've got their attention.", "They seem interested.", "Something in their face softens."];
const BAD = ["They appear skeptical.", "They fold their arms.", "That didn't land.", "They look unconvinced."];

/** One argument. Works in both stages: in bargaining it moves their price. */
export function argue(s: GameState, a: Approach): void {
  const n = negLife(s).active;
  if (!n || n.stage === "done") return;
  if (a === "probe") return probe(s, n);
  const who = person(n.npc)!;
  const mem = memory(s, n.npc);
  const p = chance(s, n, a);
  n.used[a] = (n.used[a] ?? 0) + 1;
  n.attempts += 1;
  say(n, "you", APPROACHES[a].line);
  const roll = Math.random();
  const critFail = (a === "aggressive" ? 0.12 + (has(n, "proud") ? 0.18 : 0) : 0.03) + n.anger * 0.03;
  const M = n.market;
  if (a === "concession") n.aspiration += M * 0.03; // you gave ground: they'll ask more later
  if (roll < p * 0.25) {
    if (n.stage === "persuade") n.progress += 2;
    else n.aspiration -= M * 0.07;
    n.resistance = Math.max(0, n.resistance - 10);
    say(n, "them", reply(who, a, "great"), "good");
    say(n, "note", "That argument really worked.", "good");
  } else if (roll < p) {
    negLife(s).skill = Math.min(60, negLife(s).skill + 0.5);
    if (n.stage === "persuade") n.progress += 1;
    else n.aspiration -= M * 0.04;
    n.resistance = Math.max(0, n.resistance - 5);
    say(n, "them", reply(who, a, "good"), "good");
    say(n, "note", GOOD[(n.attempts + n.rounds) % GOOD.length]!, "good");
  } else if (roll > 1 - critFail) {
    n.anger += 1;
    n.patience -= 2;
    n.resistance += 15;
    mem.rel = Math.max(-100, mem.rel - 5);
    if (a === "aggressive" && has(n, "proud")) learn(s, n, "proud");
    say(n, "them", reply(who, a, "awful"), "bad");
    say(n, "note", "You've offended them.", "bad");
  } else {
    n.patience -= 1;
    n.resistance += a === "aggressive" ? 12 : 8;
    if (a === "urgency" && n.urgency < 0.35) say(n, "them", "\"I'm in no hurry. Are you?\"", "bad");
    else say(n, "them", reply(who, a, "bad"), "bad");
    say(n, "note", n.patience <= 1 ? "They're becoming impatient." : BAD[(n.attempts + n.rounds) % BAD.length]!, "bad");
  }
  afterArgument(s, n);
}

function reply(who: Counterparty, a: Approach, how: "great" | "good" | "bad" | "awful"): string {
  const name = who.name.split(" ").slice(-1)[0];
  const lines: Record<typeof how, string[]> = {
    great: ["\"Now you're talking sense. Okay. Let's see your numbers.\"", "\"Hmm. I like the way you think.\"", "\"You know, you're right. Go on.\""],
    good: ["\"Okay… I'm listening.\"", "\"That's fair. Continue.\"", "\"Maybe. Maybe.\""],
    bad: ["\"That's what everybody says.\"", "\"I've heard better.\"", "\"Hmm. No.\""],
    awful: [
      a === "aggressive" ? "\"Who do you think you're talking to? Lower your voice in my presence.\"" : "\"Please. Don't insult my intelligence.\"",
      `"${name} doesn't do business like that."`,
    ],
  };
  const pool = lines[how];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function afterArgument(s: GameState, n: Negotiation) {
  const who = person(n.npc)!;
  if (n.stage === "persuade") {
    if (n.progress >= n.required) {
      // Extra persuasion makes them easier to bargain with.
      n.aspiration -= n.market * 0.03 * (n.progress - n.required);
      return toBargain(n, "\"Fine. Let's talk numbers.\"");
    }
    const left = n.maxPatience + 2 - n.attempts;
    if (n.patience <= 0 || left <= 0 || (n.anger >= 2 && has(n, "proud"))) {
      if (n.progress >= Math.ceil(n.required / 2) && n.anger < 2) {
        n.aspiration += n.market * 0.05;
        n.patience = Math.max(n.patience, 2);
        return toBargain(n, "\"I'm not convinced. But show me your offer and we'll see.\"");
      }
      return end(s, n, "failed", `${who.name} has heard enough. "Let's leave it for now."`);
    }
  } else if (n.patience <= 0) {
    return end(s, n, "failed", `${who.name} stands up. "We're done here."`);
  }
}

function toBargain(n: Negotiation, line: string) {
  n.stage = "bargain";
  n.patience = Math.max(n.patience, 3) + 1;
  say(n, "them", line, "good");
  const p = n.terms.find((t) => t.id === n.price);
  if (p?.amount != null) {
    // They open with their own number.
    const opening = solvePrice(n, n.aspiration);
    if (opening != null) {
      n.counter = snapshot(n, { [n.price]: opening });
      say(n, "them", `"My price is ${money(opening, p)}."`);
    }
  }
}

function probe(s: GameState, n: Negotiation) {
  const who = person(n.npc)!;
  n.attempts += 1;
  n.used.probe = (n.used.probe ?? 0) + 1;
  say(n, "you", APPROACHES.probe.line);
  const p = 0.55 + playerSkill(s) / 200 - n.skill / 250 - (n.used.probe - 1) * 0.15;
  const hidden = n.traits.filter((t) => !n.revealed.includes(`trait:${t}`));
  if (Math.random() < p) {
    if (hidden.length) {
      const t = hidden[0]!;
      learn(s, n, t);
      say(n, "note", who.tells?.[t] ?? `They seem ${TRAIT_INFO[t].label.toLowerCase()}.`, "good");
    } else if (!n.revealed.includes("urgency")) {
      n.revealed.push("urgency");
      say(n, "note", n.urgency > 0.6 ? "You get the sense they need this done soon. Very soon." : n.urgency > 0.35 ? "They'd like to close, but they aren't desperate." : "They're in no hurry at all.", "good");
    } else if (!n.revealed.includes("wealth")) {
      n.revealed.push("wealth");
      say(n, "note", n.wealth < 35 ? "Money is clearly tight for them." : n.wealth > 70 ? "They don't need the money. They want a good deal." : "They're comfortable, not rich.", "good");
    } else {
      say(n, "note", n.npcAlt ? "They mention someone else has shown interest." : "As far as you can tell, nobody else is offering them anything.", "good");
      n.revealed.push("alt");
    }
  } else {
    say(n, "them", "\"My situation is my business.\"", "neutral");
    say(n, "note", "They give nothing away.");
  }
  if (n.stage === "persuade") afterArgument(s, n);
}

function learn(s: GameState, n: Negotiation, t: Trait) {
  if (!n.revealed.includes(`trait:${t}`)) n.revealed.push(`trait:${t}`);
  const mem = memory(s, n.npc);
  if (!mem.known.includes(t)) mem.known.push(t);
}

// ── Bargaining ───────────────────────────────────────────────────────────────

/** How much their utility changes per unit of the price term. */
function priceCoef(n: Negotiation): number {
  const p = n.terms.find((t) => t.id === n.price)!;
  let perUnit = p.mult ?? 1;
  if (p.pctOf) {
    const base = n.terms.find((t) => t.id === p.pctOf);
    perUnit = (((base?.amount ?? 0) * (base?.mult ?? 1)) / 100) * (p.mult ?? 1);
  }
  const k = perUnit * p.npcWeight;
  return p.side === "player" ? k : -k;
}

function niceRound(x: number, p: Term): number {
  const unit = p.unit === "percent" ? 0.5 : x >= 5_000_000 ? 50_000 : x >= 500_000 ? 10_000 : x >= 50_000 ? 1000 : 100;
  return Math.round(x / unit) * unit;
}

/** The price that gives them exactly `target` utility, if the price can move. */
function solvePrice(n: Negotiation, target: number): number | null {
  const p = n.terms.find((t) => t.id === n.price);
  if (!p || p.amount == null) return null;
  const k = priceCoef(n);
  if (!k) return null;
  const was = p.included;
  p.included = true;
  const raw = p.amount + (target - npcUtility(n)) / k;
  p.included = was;
  return Math.max(p.min ?? 0, Math.min(p.max ?? Infinity, niceRound(raw, p)));
}

function snapshot(n: Negotiation, override: Record<string, number> = {}, toggles: Record<string, boolean> = {}) {
  const out: Record<string, { included: boolean; amount?: number }> = {};
  for (const t of n.terms) out[t.id] = { included: toggles[t.id] ?? t.included, amount: override[t.id] ?? t.amount };
  return out;
}

function money(x: number, t?: Term): string {
  const v = `₦${Math.round(x).toLocaleString("en")}`;
  if (t?.unit === "naira/week") return `${v} a week`;
  if (t?.unit === "percent") return `${x}%`;
  if (t?.unit === "weeks") return `${x} weeks`;
  return x >= 1_000_000 ? `₦${(x / 1_000_000).toFixed(x >= 10_000_000 ? 1 : 2)} million` : v;
}

/** Apply your offer builder's terms to the negotiation (from the UI). */
export function setTerms(s: GameState, terms: { id: string; included: boolean; amount?: number }[]) {
  const n = negLife(s).active;
  if (!n || n.stage !== "bargain") return;
  for (const t of n.terms) {
    const next = terms.find((x) => x.id === t.id);
    if (!next) continue;
    if (!t.locked) t.included = next.included;
    if (t.amount != null && next.amount != null) t.amount = Math.max(t.min ?? 0, Math.min(t.max ?? Infinity, next.amount));
  }
}

export function describeOffer(n: Negotiation): string {
  const give = n.terms.filter((t) => t.side === "player" && t.included).map((t) => (t.amount != null ? `${t.label} ${money(t.amount, t)}` : t.label));
  return give.join(" + ") || "nothing";
}

/** You put an offer on the table. */
export function propose(s: GameState) {
  const n = negLife(s).active;
  if (!n || n.stage !== "bargain") return;
  const who = person(n.npc)!;
  const mem = memory(s, n.npc);
  const neg = negLife(s);
  const M = n.market;
  n.rounds += 1;
  const u = npcUtility(n);
  say(n, "you", `"I'm offering ${describeOffer(n)}."`);
  // Going back on "my final offer" costs you credibility.
  if (n.finalClaim != null && u > n.finalClaim + M * 0.01) {
    neg.rep.untrustworthy += 1;
    mem.rel = Math.max(-100, mem.rel - 3);
    n.aspiration += M * 0.03;
    n.finalClaim = null;
    say(n, "them", "\"I thought that was your final offer? Interesting.\"", "bad");
  }
  if (u >= n.aspiration - M * 0.01 || (u >= n.reservation && n.patience <= 1)) {
    say(n, "them", "\"…Okay. You have a deal.\"", "good");
    return finish(s, n);
  }
  if (u < n.reservation - M * 0.2) {
    n.anger += 1;
    mem.insults += 1;
    mem.rel = Math.max(-100, mem.rel - (has(n, "proud") ? 8 : 4));
    n.patience -= 2;
    n.aspiration += M * 0.04;
    if (has(n, "proud")) learn(s, n, "proud");
    say(n, "them", has(n, "proud") ? "\"Is that what you think of me? You insult me in my own place?\"" : "\"You can't be serious.\"", "bad");
    say(n, "note", "That offer offended them.", "bad");
    if (n.patience <= 0 || (n.anger >= 3 && has(n, "proud"))) return end(s, n, "failed", `${who.name} has had enough of your offers.`);
  } else {
    n.patience -= 1;
  }
  if (n.patience <= 0) {
    if (u >= n.reservation) {
      say(n, "them", "\"I'm tired of this. Fine. Take it.\"", "good");
      return finish(s, n);
    }
    return end(s, n, "failed", `${who.name} sighs. "We're going round in circles. Let's forget it."`);
  }
  concede(n);
  counter(s, n);
}

/** They move a little toward their limit each round. */
function concede(n: Negotiation, extra = 1) {
  let c = 0.22;
  if (has(n, "stubborn")) c = 0.12;
  else if (has(n, "desperate")) c = 0.32;
  else if (has(n, "greedy")) c = 0.15;
  else if (has(n, "cautious")) c = 0.18;
  else if (has(n, "risky")) c = 0.25;
  c = Math.max(0.05, (c + n.urgency * 0.1 - n.anger * 0.05) * extra);
  n.aspiration = n.reservation + (n.aspiration - n.reservation) * (1 - Math.min(0.8, c));
}

function counter(s: GameState, n: Negotiation) {
  const M = n.market;
  const p = n.terms.find((t) => t.id === n.price)!;
  const overrides: Record<string, number> = {};
  const toggles: Record<string, boolean> = {};
  const asks: string[] = [];
  let price = solvePrice(n, n.aspiration);
  // If moving the price can't get there, they ask for something else too.
  const short = () => {
    const saved = p.amount;
    if (price != null) p.amount = price;
    const gap = n.aspiration - npcUtility(n);
    p.amount = saved;
    return gap;
  };
  if (price == null || short() > M * 0.01) {
    const extra = n.terms
      .filter((t) => !t.locked && !t.included && t.side === "player" && t.amount == null && t.npcWeight > 0)
      .sort((a, b) => b.value * b.npcWeight - a.value * a.npcWeight)[0];
    if (extra) {
      extra.included = true;
      toggles[extra.id] = true;
      asks.push(`add ${extra.label.toLowerCase()}`);
      price = solvePrice(n, n.aspiration);
      extra.included = false;
    }
    const sweetener = n.terms.find((t) => !t.locked && t.included && t.side === "npc" && t.amount == null);
    if (sweetener && short() > M * 0.01) {
      toggles[sweetener.id] = false;
      asks.push(`without ${sweetener.label.toLowerCase()}`);
    }
  }
  if (price != null) overrides[n.price] = price;
  n.counter = snapshot(n, overrides, toggles);
  const said = price != null && p.amount != null ? (p.side === "player" ? (price > p.amount ? `${money(p.amount, p)} is too low. ${money(price, p)}` : money(price, p)) : price < p.amount ? `${money(p.amount, p)} is too much. ${money(price, p)}` : money(price, p)) : "";
  const tail = asks.length ? `${said ? " and " : ""}${asks.join(", ")}` : "";
  say(n, "them", `"${said}${tail}. That's what I'll accept."`);
  const left = n.patience;
  if (left <= 1) say(n, "note", "They're losing patience. This may be your last chance.", "bad");
  else if (has(n, "stubborn") && n.rounds >= 2 && n.revealed.includes("trait:stubborn")) say(n, "note", "They're clearly unwilling to give much more ground.");
}

/** Take their counteroffer exactly as they said it. */
export function acceptCounter(s: GameState) {
  const n = negLife(s).active;
  if (!n?.counter || n.stage !== "bargain") return;
  for (const t of n.terms) {
    const c = n.counter[t.id];
    if (!c) continue;
    if (!t.locked) t.included = c.included;
    if (c.amount != null) t.amount = c.amount;
  }
  say(n, "you", "\"Deal.\"", "good");
  finish(s, n);
}

/** Say something that may or may not be true. */
export function bluff(s: GameState, kind: Bluff) {
  const n = negLife(s).active;
  if (!n || n.stage !== "bargain") return;
  const who = person(n.npc)!;
  const neg = negLife(s);
  const mem = memory(s, n.npc);
  const M = n.market;
  const skill = playerSkill(s);
  const spot = Math.max(0.05, Math.min(0.9, 0.15 + n.skill / 150 + neg.rep.untrustworthy * 0.03 - skill / 300));
  if (kind === "rival") {
    if (n.claimedRival) return;
    n.claimedRival = true;
    say(n, "you", "\"I should tell you: I have another offer on the table.\"");
    if (n.playerAlt) {
      n.aspiration -= M * 0.06;
      say(n, "them", "\"…I see. Let's not lose this over small money.\"", "good");
      say(n, "note", "It's true, and they know it. They move.", "good");
    } else if (Math.random() < spot) {
      n.anger += 1;
      n.aspiration += M * 0.03;
      neg.rep.untrustworthy += 1;
      mem.bluffsCaught += 1;
      mem.rel = Math.max(-100, mem.rel - 5);
      say(n, "them", "\"Another offer? From who? Call them now, let me hear.\" You can't.", "bad");
      say(n, "note", "They saw through your bluff.", "bad");
    } else {
      n.aspiration -= M * (has(n, "desperate") ? 0.07 : has(n, "risky") ? 0.02 : 0.05);
      say(n, "them", "\"Hmm. Okay, okay. Let's be reasonable.\"", "good");
      say(n, "note", "They seem to believe you.", "good");
    }
  }
  if (kind === "final") {
    const u = npcUtility(n);
    n.finalClaim = u;
    say(n, "you", `"${describeOffer(n)}. That's my final offer."`);
    if (u >= n.reservation) {
      const p = 0.35 + n.urgency * 0.4 + (has(n, "desperate") ? 0.2 : 0) - (has(n, "greedy") ? 0.15 : 0) - (has(n, "stubborn") ? 0.1 : 0);
      if (Math.random() < p) {
        say(n, "them", "\"…Fine. Final. Deal.\"", "good");
        return finish(s, n);
      }
      concede(n, 2);
      counter(s, n);
    } else {
      n.patience -= 2;
      say(n, "them", "\"Then I'm afraid we have nothing more to talk about.\"", "bad");
      if (n.patience <= 0) return end(s, n, "failed", `${who.name} won't go that low.`);
    }
  }
  if (kind === "walk") {
    say(n, "you", "\"Honestly, I'm ready to walk away from this.\"");
    const need = n.urgency * 0.5 + (has(n, "desperate") ? 0.3 : 0) + (n.npcAlt ? -0.2 : 0.1) + mem.rel / 200;
    if (Math.random() < need) {
      n.aspiration = Math.max(n.reservation, n.aspiration - M * 0.08);
      say(n, "them", "\"Wait, wait. Don't be like that. Let's find a middle.\"", "good");
    } else {
      n.patience -= 1;
      say(n, "them", "\"The door is right there.\"", "bad");
    }
    counter(s, n);
    if (n.patience <= 0) return end(s, n, "failed", `${who.name} calls your bluff and ends the talk.`);
  }
}

/** Get up and leave. Sometimes they call you back. */
export function walkAway(s: GameState) {
  const n = negLife(s).active;
  if (!n || n.stage === "done") return;
  const who = person(n.npc)!;
  const mem = memory(s, n.npc);
  say(n, "you", "\"Thank you for your time.\" You stand up to leave.");
  if (n.stage === "bargain" && !n.walkedOnce) {
    n.walkedOnce = true;
    const want = n.urgency * 0.5 + (has(n, "desperate") ? 0.3 : 0) + (n.npcAlt ? -0.2 : 0.1) + mem.rel / 200 - n.anger * 0.15;
    const u = npcUtility(n);
    if (u >= n.reservation - n.market * 0.1 && Math.random() < want) {
      const best = solvePrice(n, n.reservation + n.market * 0.01);
      if (best != null) {
        n.aspiration = n.reservation + n.market * 0.01;
        n.counter = snapshot(n, { [n.price]: best });
        n.patience = 1;
        const p = n.terms.find((t) => t.id === n.price)!;
        say(n, "them", `"Wait! Come back. ${money(best, p)}. That's really my last price."`, "good");
        say(n, "note", "Walking away worked. This is likely their real limit.", "good");
        return;
      }
    }
  }
  end(s, n, "walked", `You walk out. ${who.name} doesn't stop you.`);
}

// ── Ending ───────────────────────────────────────────────────────────────────

function finish(s: GameState, n: Negotiation) {
  const neg = negLife(s);
  const mem = memory(s, n.npc);
  const def = dealDef(n.deal)!;
  const M = n.market;
  const quality = qualityOf(playerUtility(n) / M);
  // Fairness is judged at market value: what the other side gave up, not how they felt about it.
  const theirs = -playerUtility(n) / M;
  const summary = def.apply(s, n);
  neg.skill = Math.min(60, neg.skill + (quality === "excellent" || quality === "good" ? 3 : 2));
  if (quality === "excellent") neg.rep.business += 2;
  if (quality === "good") neg.rep.business += 1;
  if (theirs < -0.12) {
    neg.rep.ruthless += 1;
    if (has(n, "desperate")) {
      neg.rep.ruthless += 1;
      mem.exploited += 1;
      mem.rel = Math.max(-100, mem.rel - 6);
    }
  } else if (theirs > 0.12) {
    neg.rep.generous += 1;
    mem.rel = Math.min(100, mem.rel + 6);
  } else {
    neg.rep.fair += 1;
    mem.rel = Math.min(100, mem.rel + 4);
  }
  if (n.rounds > 5) neg.rep.difficult += 1;
  mem.deals += 1;
  mem.last = quality;
  n.stage = "done";
  n.outcome = { quality, agreed: true, summary };
  neg.history = [...neg.history, { day: s.day, deal: n.deal, npc: n.npc, quality }].slice(-30);
  spreadWord(s, n);
}

function end(s: GameState, n: Negotiation, how: "walked" | "failed", text: string) {
  const neg = negLife(s);
  const mem = memory(s, n.npc);
  say(n, "note", text, how === "failed" ? "bad" : "neutral");
  if (n.rounds > 5) neg.rep.difficult += 1;
  if (n.anger >= 2 || mem.insults >= 3) mem.refuseUntil = s.day + 7;
  else if (how === "failed") mem.refuseUntil = s.day + 1;
  neg.skill = Math.min(60, neg.skill + 1);
  n.stage = "done";
  n.outcome = { quality: "fair", agreed: false, summary: text };
  neg.history = [...neg.history, { day: s.day, deal: n.deal, npc: n.npc, quality: how }].slice(-30);
  spreadWord(s, n);
}

/** Someone who really dislikes you tells people about it. */
function spreadWord(s: GameState, n: Negotiation) {
  const mem = memory(s, n.npc);
  const who = person(n.npc)!;
  if (mem.rel <= -40 && s.flags[`badmouth_${n.npc}`] !== true) {
    s.flags[`badmouth_${n.npc}`] = true;
    s.stats.reputation = Math.max(0, s.stats.reputation - 4);
    n.log.push({ who: "note", text: `${who.name} is telling everyone in Abuja how you do business. Reputation -4.`, tone: "bad" });
  }
}

/** Close the negotiation screen. */
export function closeNegotiation(s: GameState) {
  const neg = negLife(s);
  if (neg.active && neg.active.stage !== "done") {
    neg.active.log.push({ who: "note", text: "You leave without a deal." });
    neg.history = [...neg.history, { day: s.day, deal: neg.active.deal, npc: neg.active.npc, quality: "walked" as const }].slice(-30);
  }
  neg.active = null;
}

// ── Over time ────────────────────────────────────────────────────────────────

/** Weekly: people who like you bring you opportunities; old ones expire. */
export function weeklyNegotiation(s: GameState): string[] {
  const neg = s.life?.neg;
  if (!neg) return [];
  neg.opportunities = neg.opportunities.filter((o) => o.until >= s.day);
  const out: string[] = [];
  for (const [id, mem] of Object.entries(neg.npcs)) {
    if (mem.rel < 30 || Math.random() > 0.3) continue;
    const options = DEALS.filter((d) => d.npc === id && !d.available(s));
    const d = options[Math.floor(Math.random() * options.length)];
    if (!d || neg.opportunities.some((o) => o.deal === d.id)) continue;
    const who = person(id)!;
    const text = `${who.name} reached out first: "For you, I'll make it easier this time."`;
    neg.opportunities.push({ deal: d.id, npc: id, bonus: 0.06, until: s.day + 10, text });
    out.push(`🤝 ${who.name} has a deal for you: ${d.title}. See the Deals app.`);
  }
  return out;
}

export { DEALS, economy };
