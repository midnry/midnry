import { addLog, addStat, clamp, DAYS_PER_YEAR, naira, tell } from "./rules";
import { withoutBankCheck } from "./bank";
import type { GameState } from "./types";

// Family life once you're an adult: your children grow up (a game year is 28
// days), go to the school you can afford, bring home results, and one day
// leave home and send money back; your parents get older, ask for help (the
// black tax), and need you more as the years go by.

export type SchoolTier = "public" | "private" | "international";
export type Child = {
  name: string;
  born: number;
  with: string;
  gender?: "female" | "male";
  school?: SchoolTier;
  /** How they're doing at school, 0–100. */
  grades?: number;
  /** Grown up and moved out. */
  grown?: boolean;
  /** Milestones already marked, so each happens once. */
  marks?: string[];
};
export type Parent = { alive: boolean; health: number };
export type Parents = { mum: Parent; dad: Parent; bond: number; lastAsk: number };

export const SCHOOLS: Record<SchoolTier, { name: string; term: number; boost: number; blurb: string }> = {
  public: { name: "Government school", term: 8_000, boost: 0, blurb: "Crowded classes, striking teachers, and the kids who come out of it can survive anything." },
  private: { name: "Private school", term: 180_000, boost: 2, blurb: "Small classes, extra lessons, a school bus and a uniform with a crest." },
  international: { name: "International school", term: 1_500_000, boost: 4, blurb: "British curriculum, a swimming pool and classmates whose parents are on the news." },
};

/** Three terms a game year of four weeks: what one week of fees costs. */
export const weeklyFees = (tier: SchoolTier) => Math.round((SCHOOLS[tier].term * 3) / 4);

export const childAge = (s: GameState, c: Child) => Math.floor((s.day - c.born) / DAYS_PER_YEAR);
const GIRL_NAMES = ["Chidera", "Amina", "Zara", "Fatima", "Ruth", "Adaeze", "Temitope", "Hauwa", "Ifunanya", "Simisola"];
const BOY_NAMES = ["Tobi", "Kelechi", "David", "Ebuka", "Ibrahim", "Chinedu", "Musa", "Olumide", "Emeka", "Yusuf"];
const GIRLS = new Set(GIRL_NAMES);
/** A name for a new baby, not already used by a brother or sister. */
export function babyName(gender: "female" | "male", taken: string[]): string {
  const pool = (gender === "female" ? GIRL_NAMES : BOY_NAMES).filter((n) => !taken.includes(n));
  return pool[Math.floor(Math.random() * pool.length)] ?? (gender === "female" ? "Ada" : "Obi");
}
export const childGender = (c: Child): "female" | "male" => c.gender ?? (GIRLS.has(c.name) ? "female" : "male");
export const childStage = (age: number) => (age < 3 ? "baby" : age < 6 ? "toddler" : age < 12 ? "primary" : age < 18 ? "secondary" : "grown");

// ── Parents ──────────────────────────────────────────────────────────────────

export function parents(s: GameState): Parents {
  s.parents ??= { mum: { alive: true, health: 80 }, dad: { alive: true, health: 70 }, bond: 60, lastAsk: s.day };
  return s.parents;
}
export const parentAge = (s: GameState, who: "mum" | "dad") => Math.floor(s.age + (who === "mum" ? 27 : 31));

const ASKS = [
  "The roof in the village is leaking again",
  "Your dad's blood pressure drugs have finished",
  "Your mum's church is building a new hall and every family must contribute",
  "Rent is due on their flat and the landlord is shouting",
  "Your cousin's school fees, because 'you are the one who made it'",
  "A wedding in the family and they need aso-ebi for everyone",
];

/** Weekly: who needs what. Returns an event id to fire, if any. */
export function weeklyFamily(s: GameState): string | null {
  const p = parents(s);
  const lines: string[] = [];
  // Children: fees, results and growing up.
  for (const c of s.children) {
    if (c.grown) continue;
    const age = childAge(s, c);
    c.marks ??= [];
    if (age >= 3 && !c.school) {
      s.eventCtx = { child: c.name };
      return "child_school";
    }
    if (c.school && age < 18) {
      const fee = weeklyFees(c.school);
      addStat(s, "money", -fee);
      c.grades = clamp((c.grades ?? 50) + SCHOOLS[c.school].boost + Math.round((Math.random() - 0.5) * 6));
      if (fee > 1000) lines.push(`${c.name}'s school fees: ${naira(fee)}.`);
    }
    if (age >= 11 && !c.marks.includes("results") && (c.grades ?? 50) >= 70) {
      c.marks.push("results");
      addStat(s, "reputation", 3);
      lines.push(`🏅 ${c.name} came first in class. You put the report card on the fridge and post it on Instaflex.`);
    }
    if (age >= 17 && !c.marks.includes("waec")) {
      c.marks.push("waec");
      const good = (c.grades ?? 50) >= 55;
      addLog(s, good ? `${c.name} passed WAEC and got into university.` : `${c.name} struggled with WAEC and is resitting.`);
      lines.push(good ? `🎓 ${c.name} passed WAEC with flying colours and got into university!` : `${c.name} didn't do well in WAEC and will resit next year.`);
    }
    if (age >= 18 && !c.grown) {
      c.grown = true;
      addLog(s, `${c.name} grew up and moved out.`);
      lines.push(`🏡 ${c.name} is ${age} and moves out to start their own life. The house is quiet.`);
    }
  }
  // Grown children who did well send money home.
  const helpers = s.children.filter((c) => c.grown && (c.grades ?? 50) >= 60);
  if (helpers.length) {
    const gift = helpers.length * 40_000;
    withoutBankCheck(() => addStat(s, "money", gift));
    lines.push(`💸 ${helpers.map((c) => c.name).join(" and ")} sent ${naira(gift)} "for you and Mummy/Daddy".`);
  }
  // Parents get older.
  for (const who of ["mum", "dad"] as const) {
    const par = p[who];
    if (!par.alive) continue;
    const age = parentAge(s, who);
    par.health = clamp(par.health - (age > 70 ? 3 : age > 60 ? 2 : 1) + (p.bond > 70 ? 1 : 0));
    if (par.health <= 5 || (age > 75 && Math.random() < 0.04)) {
      par.alive = false;
      addStat(s, "stress", 25);
      addStat(s, "money", -Math.min(Math.max(0, s.stats.money), 400_000));
      addLog(s, `Lost ${who === "mum" ? "Mum" : "Dad"} at ${age}.`);
      s.eventCtx = { parent: who };
      tell(s, ...lines);
      return "parent_passing";
    }
  }
  tell(s, ...lines);
  // The black tax: about every other week, more as they get older.
  const living = p.mum.alive || p.dad.alive;
  if (living && s.day - p.lastAsk >= 7 && Math.random() < 0.45) {
    p.lastAsk = s.day;
    const older = Math.max(parentAge(s, "mum"), parentAge(s, "dad"));
    const amount = Math.round(((older > 65 ? 60_000 : 30_000) + Math.random() * 40_000) / 5000) * 5000;
    s.eventCtx = { amount, reason: ASKS[Math.floor(Math.random() * ASKS.length)] };
    return "parents_ask";
  }
  return null;
}

/** Answer your parents: send it all, send half, or say no. */
export function answerParents(s: GameState, how: "all" | "half" | "no"): string {
  const p = parents(s);
  const amount = s.eventCtx.amount ?? 0;
  if (how === "no") {
    p.bond = clamp(p.bond - 10);
    addStat(s, "stress", 6);
    return "\"We understand,\" says Mum, in the voice that means she doesn't. The family WhatsApp group goes quiet for a day.";
  }
  const sent = how === "all" ? amount : Math.round(amount / 2);
  if (s.stats.money < sent) return `You don't have ${naira(sent)} to send.`;
  addStat(s, "money", -sent);
  p.bond = clamp(p.bond + (how === "all" ? 8 : 3));
  addStat(s, "reputation", how === "all" ? 2 : 1);
  if (p.mum.alive) p.mum.health = clamp(p.mum.health + (how === "all" ? 3 : 1));
  if (p.dad.alive) p.dad.health = clamp(p.dad.health + (how === "all" ? 3 : 1));
  return how === "all" ? `You send ${naira(sent)}. A long voice note of prayers arrives within a minute.` : `You send ${naira(sent)}. "God will provide the rest," says Dad.`;
}

/** Visit them: costs a time slot, mends things. */
export function visitParents(s: GameState): string {
  const p = parents(s);
  if (!p.mum.alive && !p.dad.alive) return "";
  p.bond = clamp(p.bond + 6);
  addStat(s, "stress", -8);
  if (p.mum.alive) p.mum.health = clamp(p.mum.health + 2);
  if (p.dad.alive) p.dad.health = clamp(p.dad.health + 2);
  return "You spend the afternoon with your parents. Jollof, old photos, and advice you didn't ask for. You leave lighter.";
}

// ── Children ─────────────────────────────────────────────────────────────────

export function chooseSchool(s: GameState, name: string, tier: SchoolTier): string {
  const c = s.children.find((x) => x.name === name);
  if (!c) return "";
  const first = !c.school;
  c.school = tier;
  c.grades ??= 50;
  return first
    ? `${c.name} starts at a ${SCHOOLS[tier].name.toLowerCase()}. ${tier === "public" ? "Fees are small." : `${naira(SCHOOLS[tier].term)} a term.`}`
    : `${c.name} moves to a ${SCHOOLS[tier].name.toLowerCase()}.`;
}

/** Help with homework: a time slot of yours for better grades. */
export function homework(s: GameState, name: string): string {
  const c = s.children.find((x) => x.name === name);
  if (!c || c.grown) return "";
  c.grades = clamp((c.grades ?? 50) + 5);
  addStat(s, "stress", -3);
  return `You sit with ${c.name} over long division and a spelling list. They roll their eyes, then get every question right.`;
}

// ── A new generation ─────────────────────────────────────────────────────────

/** What your heir inherits: what you owned, after the estate takes its share. */
export const inheritance = (netWorth: number) => Math.max(0, Math.round((netWorth * 0.6) / 1000) * 1000);

/** Effects from family event cards (`family` in an effect). */
export function familyEffect(s: GameState, name: string): string[] {
  const child = s.children.find((c) => c.name === s.eventCtx.child);
  if (name.startsWith("school_") && child) return [chooseSchool(s, child.name, name.slice(7) as SchoolTier)];
  if (name === "parents_all" || name === "parents_half" || name === "parents_no") return [answerParents(s, name.slice(8) as "all" | "half" | "no")];
  if (name === "funeral_big" || name === "funeral_small") {
    const big = name === "funeral_big";
    const price = big ? 1_200_000 : 250_000;
    const paid = Math.min(Math.max(0, s.stats.money), price);
    addStat(s, "money", -paid);
    addStat(s, "reputation", big ? 6 : 0);
    addStat(s, "network", big ? 4 : 0);
    return [big ? "Canopies, a live band and a thousand guests in white. The whole village says it was a burial befitting." : "A small, quiet burial with the people who mattered. It is enough."];
  }
  return [];
}
