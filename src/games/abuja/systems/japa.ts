import { addLog, addStat, naira } from "./rules";
import type { GameState } from "./types";

// Japa: leaving Nigeria, step by step. Pick a route, sit the IELTS, show your
// proof of funds, pay the application fee and wait. A clean record, a good job
// and money in the bank help; a criminal record and police heat hurt. The
// agents who promise "no IELTS, no wahala" usually take the money and vanish.

export type RouteId = "study" | "skilled" | "care" | "visit" | "agent";
export type Japa = {
  route: RouteId | null;
  /** Best IELTS band so far, times ten (65 = 6.5). */
  ielts: number;
  status: "none" | "applied" | "approved" | "refused" | "scammed";
  decisionDay: number;
  /** For the scam: when Uncle Dayo stops picking up. */
  tries: number;
};

export const ROUTES: Record<RouteId, { name: string; city: string; icon: string; blurb: string; degree: boolean; ielts: number; funds: number; fee: number; ticket: number; base: number }> = {
  study: { name: "Master's degree (study visa)", city: "Leeds, United Kingdom", icon: "🎓", blurb: "A one-year master's, then two years to find work. Tuition deposit included in the fee.", degree: true, ielts: 65, funds: 12_000_000, fee: 8_500_000, ticket: 1_400_000, base: 0.8 },
  skilled: { name: "Skilled worker (permanent residence)", city: "Toronto, Canada", icon: "🍁", blurb: "Points for your degree, your English and your work experience. Slow, but you land as a permanent resident.", degree: true, ielts: 70, funds: 15_000_000, fee: 1_200_000, ticket: 1_800_000, base: 0.7 },
  care: { name: "Care worker (health & care visa)", city: "Manchester, United Kingdom", icon: "🩺", blurb: "Hard work in a care home, a sponsor who holds your visa, and a way in without a degree.", degree: false, ielts: 60, funds: 3_000_000, fee: 2_500_000, ticket: 1_400_000, base: 0.65 },
  visit: { name: "Visitor visa, and stay", city: "Houston, United States", icon: "🗽", blurb: "Go on holiday, never come back. The interview officer has heard every story before.", degree: false, ielts: 0, funds: 8_000_000, fee: 250_000, ticket: 2_200_000, base: 0.22 },
  agent: { name: "Uncle Dayo Travels (\"no IELTS, no wahala\")", city: "somewhere in Europe", icon: "🧳", blurb: "₦3.5m and he 'handles everything'. His office is a kiosk with a printer and a picture of the Eiffel Tower.", degree: false, ielts: 0, funds: 0, fee: 3_500_000, ticket: 0, base: 0.2 },
};

export function japa(s: GameState): Japa {
  s.japa ??= { route: null, ielts: 0, status: "none", decisionDay: 0, tries: 0 };
  return s.japa;
}

export const IELTS_FEE = 280_000;
export const bandText = (b: number) => (b ? (b / 10).toFixed(1) : "Not taken");

/** What a route still needs from you. */
export function missing(s: GameState, id: RouteId): string[] {
  const r = ROUTES[id];
  const j = japa(s);
  const out: string[] = [];
  if (r.degree && !s.certs.degree) out.push("A degree");
  if (r.ielts && j.ielts < r.ielts) out.push(`IELTS ${bandText(r.ielts)} (you have ${bandText(j.ielts)})`);
  if (s.stats.money < r.funds + r.fee) out.push(`${naira(r.funds + r.fee)} in the bank (proof of funds ${naira(r.funds)} plus the ${naira(r.fee)} fee)`);
  return out;
}

/** How likely the embassy is to say yes. */
export function chance(s: GameState, id: RouteId): number {
  const r = ROUTES[id];
  if (id === "agent") return r.base;
  let p = r.base;
  if (s.job || s.banking?.job) p += 0.08;
  if (Object.values(s.partners).some((x) => x.status === "married")) p += 0.04;
  if (s.assets.length) p += 0.04;
  if (japa(s).ielts >= r.ielts + 10) p += 0.05;
  if ((s.justice?.record?.length ?? 0) > 0) p -= 0.35;
  if (s.stats.heat >= 40) p -= 0.15;
  return Math.max(0.05, Math.min(0.95, p));
}

export function apply(s: GameState, id: RouteId): string {
  const j = japa(s);
  const r = ROUTES[id];
  if (j.status === "applied") return "Your application is already with the embassy. Wait for the decision.";
  if (j.status === "approved") return "Your visa is already approved. Buy your ticket.";
  const need = missing(s, id);
  if (need.length) return `Not yet. You still need: ${need.join("; ")}.`;
  addStat(s, "money", -r.fee);
  j.route = id;
  j.status = "applied";
  j.decisionDay = s.day + (id === "agent" ? 4 : id === "visit" ? 3 : 6 + Math.floor(Math.random() * 4));
  addLog(s, `Applied to japa: ${r.name}.`);
  return id === "agent"
    ? `Uncle Dayo counts the ${naira(r.fee)} twice, puts it in a Ghana-must-go bag and says, "Two weeks maximum. Start packing."`
    : `Biometrics done, passport submitted, ${naira(r.fee)} paid. The decision should come in about ${j.decisionDay - s.day} days. Do not refresh the tracking page every hour. (You will.)`;
}

/** Each morning: has the decision come? */
export function nightlyJapa(s: GameState): string | null {
  const j = s.japa;
  if (!j || j.status !== "applied" || s.day < j.decisionDay || !j.route) return null;
  const r = ROUTES[j.route];
  const yes = Math.random() < chance(s, j.route);
  if (j.route === "agent") {
    if (!yes) {
      j.status = "scammed";
      addStat(s, "stress", 25);
      addLog(s, `Lost ${naira(r.fee)} to a fake travel agent.`);
      return `📵 Uncle Dayo's number is switched off. His kiosk is now selling recharge cards. Your ${naira(r.fee)} is gone.`;
    }
    j.status = "approved";
    return "✉️ Uncle Dayo calls at midnight: \"Your papers are ready. Don't ask questions.\" A passport with your photo and someone else's visa. Risky. Very risky.";
  }
  j.status = yes ? "approved" : "refused";
  if (yes) {
    addLog(s, `Visa approved: ${r.name}.`);
    return `🎉 Your passport is back with a visa in it! ${r.name}. Buy your ticket when you're ready to go.`;
  }
  addLog(s, `Visa refused: ${r.name}.`);
  addStat(s, "stress", 15);
  return `❌ Refused. "The officer is not satisfied that you will…" You stop reading. The ${naira(r.fee)} is not refunded. You can apply again.`;
}

/** The last step: the ticket, the goodbyes, the airport. Returns true if you're leaving. */
export function leave(s: GameState): string {
  const j = japa(s);
  if (j.status !== "approved" || !j.route) return "";
  const r = ROUTES[j.route];
  if (s.stats.money < r.ticket) return `The flight is ${naira(r.ticket)}. Save up a little more.`;
  addStat(s, "money", -r.ticket);
  addLog(s, j.route === "agent" ? `Left Nigeria on papers from Uncle Dayo, heading for ${r.city}.` : `Japa'd to ${r.city}.`);
  return `✈️ ${r.city}.`;
}

export function reset(s: GameState) {
  const j = japa(s);
  if (j.status === "refused" || j.status === "scammed") {
    j.status = "none";
    j.route = null;
  }
}

// ── The IELTS: eight questions, banded 4.5 to 9.0 ───────────────────────────

export const IELTS: { q: string; options: string[]; answer: number }[] = [
  { q: "Choose the correct sentence.", options: ["She don't like rice.", "She doesn't like rice.", "She not like rice."], answer: 1 },
  { q: "\"I ___ in Abuja since 2015.\"", options: ["live", "am living", "have lived", "lived"], answer: 2 },
  { q: "Which word means 'to postpone'?", options: ["to bring forward", "to put off", "to put on", "to take over"], answer: 1 },
  { q: "\"If I ___ rich, I would buy a house in Maitama.\"", options: ["am", "was being", "were", "will be"], answer: 2 },
  { q: "Choose the correct spelling.", options: ["accomodation", "accommodation", "acommodation"], answer: 1 },
  { q: "\"The meeting has been ___ until Friday.\"", options: ["delayed", "differed", "deferred to be", "late"], answer: 0 },
  { q: "What does 'reluctant' mean?", options: ["eager", "unwilling", "late", "loud"], answer: 1 },
  { q: "\"Neither the manager nor the staff ___ happy.\"", options: ["was", "were", "is being", "are been"], answer: 1 },
  { q: "Pick the formal way to start an email to a stranger.", options: ["Hey boss,", "Dear Sir or Madam,", "Wetin dey,", "Hi dear,"], answer: 1 },
  { q: "\"By next year, I ___ my degree.\"", options: ["will finish", "will have finished", "finish", "am finishing"], answer: 1 },
  { q: "Which is a synonym of 'abundant'?", options: ["scarce", "plentiful", "expensive", "abandoned"], answer: 1 },
  { q: "\"He apologised ___ being late.\"", options: ["for", "of", "about to", "on"], answer: 0 },
  { q: "In 'The results were inconclusive', inconclusive means…", options: ["very clear", "not decisive", "excellent", "delayed"], answer: 1 },
  { q: "Choose the correct plural.", options: ["informations", "an information", "information", "informationes"], answer: 2 },
];

/** A test is eight questions picked from the pool. */
export function ieltsPaper(seed = Math.random()): number[] {
  const idx = IELTS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = Math.floor(((seed * 9301 + i * 49297) % 233280) / 233280 * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx.slice(0, 8);
}

export function sitIelts(s: GameState, correct: number): string {
  if (s.stats.money < IELTS_FEE) return `The test costs ${naira(IELTS_FEE)}.`;
  addStat(s, "money", -IELTS_FEE);
  const bonus = s.skills.education >= 40 ? 5 : 0;
  const band = Math.min(90, 45 + correct * 5 + bonus);
  const j = japa(s);
  const better = band > j.ielts;
  j.ielts = Math.max(j.ielts, band);
  addStat(s, "stress", 4);
  return `Your IELTS result: band ${bandText(band)}.${better ? "" : ` Your best is still ${bandText(j.ielts)}.`}`;
}
