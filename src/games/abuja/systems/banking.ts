import careersJson from "../data/banking/careers.json";
import rosterJson from "../data/banking/banks.json";
import contentJson from "../data/banking/content.json";
import sourcesJson from "../data/banking/sources.json";
import type { GameState } from "./types";

// Banking careers: find a vacancy, apply, pass assessments and interviews,
// train, work, get paid, use benefits, get reviewed, and get promoted or move
// banks. Employer names are fictional. Every number is a simulation value from
// data/banking/careers.json; published facts live in data/banking/sources.json.

// ── Data ─────────────────────────────────────────────────────────────────────

export type InfoLabel = "published" | "model" | "simulation";
export const LABELS: Record<InfoLabel, string> = { published: "Published information", model: "General career model", simulation: "Game simulation" };

export type Category = "commercial" | "noninterest" | "merchant" | "microfinance" | "development";
export type TrackId = "ops" | "cs" | "rm" | "credit" | "risk" | "tech" | "lead";
export type RouteId = "graduate" | "internship" | "experienced" | "specialist" | "agency";
export type StageId = "application" | "online_assessment" | "physical_assessment" | "document_verification" | "hr_discussion" | "panel_interview" | "executive_interview" | "practical_task" | "medical";
export type TaskKind = "request" | "reconcile" | "kyc" | "credit" | "software" | "supervise";

export type Bank = {
  id: string;
  name: string;
  category: Category;
  archetype: string;
  color: string;
  process: string;
  programme: string;
  culture: string;
  perk: string;
  signature: string;
  motto?: string;
  reference: { inspiredBy: string; status: string; note?: string; sources: string[]; verifiedOn: string; needsVerification: boolean };
};
type Grade = { id: string; name: string; pay: number; minDays: number; skill: number; courses: string[]; scope: string };
type Track = { id: TrackId; name: string; icon: string; goal: string; tasks: TaskKind[]; weights: Partial<Record<Metric, number>>; titles: string[] };
type Route = { id: RouteId; name: string; needs: { degree?: boolean; nysc?: boolean; months?: number; skill?: number }; startGrade: string; contract: "direct" | "agency"; tracks?: TrackId[]; about: string };
type Process = { label: InfoLabel; source?: string; stages: StageId[]; training: { published?: string; sessions: number } };
type Archetype = { name: string; pay: number; intake: number; difficulty: number; vacancy: number; tracks: TrackId[]; pace: string; about: string; finance?: string };

const C = careersJson as unknown as {
  grades: { ladder: Grade[]; appointments: { roles: { id: string; name: string; pay: number; fromGrade?: string; fromAppointment?: string; chance: number; needs: { rating: number; conduct: number; skill: number; network: number } }[] } };
  tracks: { list: Track[] };
  routes: { list: Route[] };
  processes: Record<string, Process>;
  stages: Record<StageId, { name: string; icon: string; wait: number }>;
  courses: { list: { id: string; name: string }[] };
  benefits: { list: { id: string; name: string; about: string; [k: string]: unknown }[] };
  archetypes: { list: Record<string, Archetype> };
  balance: {
    payCycleDays: number; reviewEveryDays: number; rejectCooldownDays: number; workdaysExpected: number; noticeDays: number;
    trainingStipendShare: number; agencyPayShare: number; agencyConvertAfterReviews: number; payRiseByRating: Record<string, number>;
    promotionRating: number; promotionConduct: number; dismissConduct: number; lateralGradeBonus: number;
  };
};
export const BANKS = (rosterJson as unknown as { banks: Bank[] }).banks;
export const EXCLUDED = (rosterJson as unknown as { excluded: { name: string; why: string }[] }).excluded;
export const GRADES = C.grades.ladder;
export const APPOINTMENTS = C.grades.appointments.roles;
export const TRACKS = C.tracks.list;
export const ROUTES = C.routes.list;
export const PROCESSES = C.processes;
export const STAGES = C.stages;
export const COURSES = C.courses.list;
export const BENEFITS = C.benefits.list;
export const ARCHETYPES = C.archetypes.list;
export const BAL = C.balance;
export const CONTENT = contentJson as unknown as {
  aptitude: { q: string; a: string[]; k: number }[];
  interview: { q: string; a: { t: string; s: number; c?: number }[] }[];
  practical: Record<TrackId, string>;
  training: { q: string; a: string[]; k: number }[];
  requests: { who: string; ask: string; a: { t: string; acc: number; sat: number; con: number; sale?: number; missell?: boolean }[] }[];
  tickets: { t: string; a: string[]; k: number }[];
  supervision: { t: string; a: { t: string; ok: number; con?: number }[] }[];
  signatureQuestions: Record<string, { q: string; a: { t: string; s: number; c?: number }[] }>;
};

/** The interview question only this employer asks. */
export function employerQuestion(b: Bank) {
  const q = CONTENT.signatureQuestions[b.signature];
  return q ? { q: q.q.replace(/\{bank\}/g, b.name), a: q.a } : undefined;
}
export const SOURCES = (sourcesJson as unknown as { sources: Record<string, { title: string; url: string; date?: string; verifiedOn: string; facts?: string[]; caveat?: string }> }).sources;

export const bankById = (id: string) => BANKS.find((b) => b.id === id);
export const archOf = (b: Bank) => ARCHETYPES[b.archetype]!;
export const trackById = (id: string) => TRACKS.find((t) => t.id === id)!;
export const routeById = (id: string) => ROUTES.find((r) => r.id === id)!;
export const gradeIndex = (id: string) => GRADES.findIndex((g) => g.id === id);
export const CATEGORY_NAMES: Record<Category, string> = { commercial: "Commercial banks", noninterest: "Non-interest banks", merchant: "Merchant banks", microfinance: "Microfinance banks", development: "Development finance institutions" };

/** What each employer's signature does in play: the thing that makes working there different. */
export const SIGNATURES: Record<string, { label: string; learn?: number; vacancy?: number; bonus?: number; payRise?: number; pension?: number; stress?: number; weights?: Partial<Record<Metric, number>>; tasks?: TaskKind[]; allowance?: number }> = {
  learning: { label: "Training-heavy: each training session counts double towards courses", learn: 2 },
  stability: { label: "Steady: smaller swings, +1% on pay reviews, fewer vacancies", payRise: 0.01, vacancy: -0.1 },
  digital: { label: "Digital-first: more systems work, faster learning", learn: 1.3, tasks: ["software"] },
  pan_african: { label: "Pan-African: relationship and trade work, faster learning in RM", learn: 1.2 },
  sales: { label: "Business-development culture: higher bonuses, sales weigh more (never above compliance)", bonus: 1.5, weights: { sales: 0.1 }, stress: 2 },
  growth: { label: "Growing: more vacancies and promotion slots", vacancy: 0.2 },
  service: { label: "Service-first: customer satisfaction weighs more", weights: { satisfaction: 0.1 } },
  sectors: { label: "Sector focus: mission-driven projects, faster learning", learn: 1.2 },
  wealth: { label: "Wealth roots: bigger pension top-up", pension: 0.05 },
  global: { label: "Global standards: tougher interviews, more compliance work", weights: { conduct: 0.1 }, tasks: ["kyc"] },
  merger: { label: "Newly merged: lots of openings, more stress", vacancy: 0.25, stress: 3 },
  ethics: { label: "Non-interest: conduct weighs more; staff financing is Murabaha", weights: { conduct: 0.1 } },
  field: { label: "Field work: more customer visits, field allowance, more tiring", allowance: 0.08, stress: 2 },
  projects: { label: "Project appraisal: credit analysis is the core skill", tasks: ["credit"], weights: { accuracy: 0.1 } },
};

// ── State ────────────────────────────────────────────────────────────────────

export type Metric = "accuracy" | "satisfaction" | "productivity" | "learning" | "conduct" | "sales";
export type BankApp = { id: string; bank: string; route: RouteId; track: TrackId; stage: number; status: "active" | "offer" | "rejected" | "withdrawn"; readyDay: number; scores: number[]; feedback?: string; applied: number; grade: number };
export type StaffFinance = { id: string; kind: "loan" | "murabaha"; item: string; principal: number; owed: number; perCycle: number };
export type Check = { label: string; ok: boolean; detail: string };
export type Review = { day: number; rating: number; payRise: number; bonus: number; checks: Check[]; eligible: boolean; notes: string[] };
export type BankJob = {
  bank: string;
  route: RouteId;
  contract: "direct" | "agency";
  track: TrackId;
  grade: number;
  appointment?: string;
  started: number;
  gradeSince: number;
  salary: number;
  training: { needed: number; done: number } | null;
  m: Record<Metric, number>;
  workdays: number;
  lastWorkDay: number;
  nextPayDay: number;
  nextReviewDay: number;
  ratings: number[];
  courses: string[];
  leaveLeft: number;
  finance: StaffFinance[];
  promoReady: boolean;
  notice?: { until: number; to?: string };
  queries: number;
};
export type Banking = { apps: BankApp[]; cooldown: Record<string, number>; job: BankJob | null; history: { bank: string; title: string; grade: string; from: number; to: number; why: string }[]; pension: number; skills: Partial<Record<TrackId, number>>; review?: Review; earned: number; offerAppt?: string };

export function banking(s: GameState): Banking {
  s.banking ??= { apps: [], cooldown: {}, job: null, history: [], pension: 0, skills: {}, earned: 0 };
  return s.banking;
}

const r = Math.random;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const roundTo = (n: number, step = 500) => Math.round(n / step) * step;
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en")}`;

/** A stable number in [0, 1) for a key, so vacancies don't reshuffle on every render. */
function seeded(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 2246822519);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ── Skills and titles ────────────────────────────────────────────────────────

/** Your skill in a track: banking experience, or what your general skills give you to start. */
export function trackSkill(s: GameState, t: TrackId): number {
  const sk = s.skills;
  const base: Record<TrackId, number> = {
    ops: (sk.education + sk.trade) / 3,
    cs: (sk.hustle + s.stats.network) / 3,
    rm: (sk.trade + sk.hustle + s.stats.network) / 4,
    credit: (sk.education + sk.trading) / 3,
    risk: sk.education / 2.5,
    tech: sk.tech / 1.5,
    lead: (s.stats.network + s.stats.reputation) / 4,
  };
  return Math.round(Math.max(banking(s).skills[t] ?? 0, Math.min(40, base[t])));
}

export function titleOf(job: BankJob): string {
  if (job.appointment) return APPOINTMENTS.find((a) => a.id === job.appointment)?.name ?? "Executive";
  return trackById(job.track).titles[job.grade] ?? GRADES[job.grade]!.name;
}

export function signature(b: Bank) {
  return SIGNATURES[b.signature] ?? { label: "" };
}

/** Pay for a grade at an employer (simulation). */
export function payFor(b: Bank, grade: number, contract: "direct" | "agency"): number {
  const base = GRADES[grade]!.pay * archOf(b).pay;
  return roundTo(contract === "agency" ? base * BAL.agencyPayShare : base);
}

// ── Vacancies ────────────────────────────────────────────────────────────────

export type Vacancy = { id: string; bank: string; route: RouteId; track: TrackId; grade: number; closes: number };

/** This week's openings across the roster. Seeded by week so the board is stable for a few days. */
export function vacancies(s: GameState): Vacancy[] {
  const week = Math.floor(s.day / 4);
  const out: Vacancy[] = [];
  for (const b of BANKS) {
    const a = archOf(b);
    const chance = clamp(a.vacancy + (signature(b).vacancy ?? 0), 0.05, 0.95);
    for (let i = 0; i < 2; i += 1) {
      if (seeded(`${b.id}:${week}:${i}`) > chance) continue;
      const roll = seeded(`${b.id}:${week}:${i}:route`);
      let route: RouteId = roll < 0.35 ? "graduate" : roll < 0.5 ? "internship" : roll < 0.75 ? "experienced" : roll < 0.88 ? "specialist" : "agency";
      if (b.category === "merchant" && route === "agency") route = "specialist";
      const allowed = (routeById(route).tracks ?? a.tracks).filter((t) => a.tracks.includes(t));
      const track = allowed[Math.floor(seeded(`${b.id}:${week}:${i}:track`) * allowed.length)] ?? a.tracks[0]!;
      const grade = gradeIndex(routeById(route).startGrade);
      out.push({ id: `${b.id}-${week}-${i}`, bank: b.id, route, track, grade, closes: week * 4 + 4 });
    }
  }
  return out;
}

/** Why you can't apply for this opening, or null. */
export function cannotApply(s: GameState, v: Vacancy): string | null {
  const bk = banking(s);
  const route = routeById(v.route);
  if (s.stage !== "adult" || s.chapter) return "Finish growing up first.";
  if ((bk.cooldown[v.bank] ?? 0) > s.day) return `You can reapply here from day ${bk.cooldown[v.bank]}. Use the time to improve.`;
  if (bk.apps.some((a) => a.bank === v.bank && (a.status === "active" || a.status === "offer"))) return "You already have an application here.";
  if (bk.job?.bank === v.bank) return "You already work here. Look at promotions in Career instead.";
  if (route.needs.degree && !s.certs.degree) return "Needs a degree.";
  if (route.needs.nysc && !s.certs.nysc) return "Needs an NYSC discharge (or exemption) certificate.";
  if (route.needs.months && !bankingDays(s)) return "Needs banking experience.";
  if (route.needs.skill && trackSkill(s, v.track) < route.needs.skill) return `Needs ${trackById(v.track).name} skill ${route.needs.skill} (you have ${trackSkill(s, v.track)}).`;
  if (v.route === "graduate" && bankingDays(s) > 60) return "Graduate programmes are for new entrants. Try an experienced role.";
  return null;
}

/** Days of banking work so far, across employers. */
export function bankingDays(s: GameState): number {
  const bk = banking(s);
  const past = bk.history.reduce((n, h) => n + (h.to - h.from), 0);
  return past + (bk.job ? s.day - bk.job.started : 0);
}

// ── Recruitment ──────────────────────────────────────────────────────────────

export function processOf(app: { bank: string; route: RouteId }): Process {
  const b = bankById(app.bank)!;
  if (app.route === "graduate") return PROCESSES[b.process] ?? PROCESSES.generic_graduate!;
  return PROCESSES[app.route] ?? PROCESSES.generic_graduate!;
}

export function stageOf(app: BankApp): StageId | null {
  return processOf(app).stages[app.stage] ?? null;
}

/** How hard an employer is to get into (simulation): 0.45 easy to 0.85 very selective. */
export function difficulty(b: Bank, route: RouteId): number {
  const d = archOf(b).difficulty + (b.signature === "global" ? 0.05 : 0);
  return route === "internship" || route === "agency" ? d - 0.15 : d;
}

/** Score needed to pass an interactive stage (0..1). */
export function passMark(b: Bank, route: RouteId, stage: StageId): number {
  const d = difficulty(b, route);
  const bump = stage === "executive_interview" ? 0.08 : stage === "physical_assessment" ? 0.04 : 0;
  return clamp(0.35 + d * 0.4 + bump, 0.4, 0.85);
}

export function apply(s: GameState, v: Vacancy): string {
  const why = cannotApply(s, v);
  if (why) return why;
  const bk = banking(s);
  const b = bankById(v.bank)!;
  // Experienced hires can come in a grade up.
  const grade = v.route === "experienced" && bk.job ? Math.min(GRADES.length - 1, Math.max(v.grade, bk.job.grade + BAL.lateralGradeBonus)) : v.grade;
  const app: BankApp = { id: `${v.id}-${bk.apps.length}`, bank: v.bank, route: v.route, track: v.track, stage: 0, status: "active", readyDay: s.day, scores: [], applied: s.day, grade };
  bk.apps.unshift(app);
  if (bk.apps.length > 20) bk.apps.length = 20;
  // A referral from a well-connected friend skips the paper screen and the assessments.
  if (s.flags.bank_referral) {
    s.flags.bank_referral = false;
    const at = processOf(app).stages.findIndex((st) => /interview|hr_discussion/.test(st));
    if (at > 0) {
      app.stage = at - 1;
      return `Referred! ${advance(s, app)}`;
    }
  }
  // The application itself is screened on paper.
  const paper = clamp(0.3 + s.skills.education / 120 + trackSkill(s, v.track) / 200 + s.stats.reputation / 400 + (s.flags.fake_degree ? 0.1 : 0), 0, 1);
  if (paper < difficulty(b, v.route) - 0.25 && r() < 0.6) return reject(s, app, "Your application didn't make the shortlist. Build your education and track skills, then apply again.");
  return advance(s, app);
}

function reject(s: GameState, app: BankApp, feedback: string): string {
  const bk = banking(s);
  app.status = "rejected";
  app.feedback = feedback;
  bk.cooldown[app.bank] = s.day + BAL.rejectCooldownDays;
  return `${bankById(app.bank)!.name}: not this time. ${feedback}`;
}

/** Move to the next stage, running automatic stages on the way. */
function advance(s: GameState, app: BankApp): string {
  app.stage += 1;
  const next = stageOf(app);
  if (!next) {
    app.status = "offer";
    return `🎉 ${bankById(app.bank)!.name} has made you an offer! Open Careers to accept.`;
  }
  app.readyDay = s.day + (STAGES[next]?.wait ?? 1);
  return `${bankById(app.bank)!.name}: you're through to the ${STAGES[next]!.name.toLowerCase()} (from day ${app.readyDay}).`;
}

/** Stages that run without a mini-game. */
export function autoStage(st: StageId): boolean {
  return st === "document_verification" || st === "medical";
}

/** Run an automatic stage (documents, medical). */
export function runAutoStage(s: GameState, appId: string): string {
  const app = banking(s).apps.find((a) => a.id === appId);
  const st = app && stageOf(app);
  if (!app || !st || !autoStage(st) || app.status !== "active") return "";
  if (s.day < app.readyDay) return `Come back on day ${app.readyDay}.`;
  if (st === "document_verification") {
    if (s.flags.fake_degree) {
      s.stats.heat = clamp(s.stats.heat + 15);
      s.stats.reputation = clamp(s.stats.reputation - 8);
      return reject(s, app, "Your degree certificate failed verification with the university. The bank has reported it.");
    }
    if (routeById(app.route).needs.degree && !s.certs.waec) return reject(s, app, "Your O-level results (WAEC/NECO) couldn't be verified. You'll need them for this route.");
    app.scores.push(1);
    return advance(s, app);
  }
  // Medical: unwell isn't a rejection; come back when better.
  if (s.stats.health < 45) {
    app.readyDay = s.day + 2;
    return "The doctor says you're not fit enough today. Rest, see a doctor, and come back in two days.";
  }
  app.scores.push(1);
  return advance(s, app);
}

/** The result of an interactive stage: score 0..1, conduct shown in answers. */
export function submitStage(s: GameState, appId: string, score: number, conduct = 0): string {
  const app = banking(s).apps.find((a) => a.id === appId);
  const st = app && stageOf(app);
  if (!app || !st || app.status !== "active" || autoStage(st)) return "";
  if (s.day < app.readyDay) return `This stage opens on day ${app.readyDay}.`;
  const b = bankById(app.bank)!;
  app.scores.push(score);
  s.stats.energy = clamp(s.stats.energy - 8);
  s.stats.stress = clamp(s.stats.stress + 3);
  if (conduct < -10) return reject(s, app, "Some of your answers raised integrity concerns. Banks weigh honesty above everything.");
  const mark = passMark(b, app.route, st);
  if (score < mark) {
    const fb: Record<string, string> = {
      online_assessment: "Your assessment score was below the cut-off. Practise numerical and verbal reasoning.",
      physical_assessment: "Your in-person assessment was below the cut-off. Practise timed reasoning tests.",
      hr_discussion: "HR felt your answers lacked clarity. Prepare short, specific stories about what you've done.",
      panel_interview: "The panel wanted stronger examples and more knowledge of the role.",
      executive_interview: "The executive wasn't convinced you understand the bank's direction. Research the employer before you go.",
      practical_task: `The practical task showed gaps in ${trackById(app.track).name}. Build that skill and try again.`,
    };
    return reject(s, app, `${fb[st] ?? "You didn't pass this stage."} (Score ${Math.round(score * 100)}%, needed ${Math.round(mark * 100)}%: simulation values.)`);
  }
  return advance(s, app);
}

export function withdraw(s: GameState, appId: string) {
  const app = banking(s).apps.find((a) => a.id === appId);
  if (app && (app.status === "active" || app.status === "offer")) app.status = "withdrawn";
}

/** Accept an offer: start training or work. Leaving a current bank triggers notice and settles staff finance. */
export function acceptOffer(s: GameState, appId: string): string {
  const bk = banking(s);
  const app = bk.apps.find((a) => a.id === appId);
  if (!app || app.status !== "offer") return "";
  const b = bankById(app.bank)!;
  const lines: string[] = [];
  if (bk.job) lines.push(leave(s, `Moved to ${b.name}`));
  // Any other job ends too.
  if (s.job) {
    lines.push("You resign from your old job.");
    s.job = null;
  }
  const route = routeById(app.route);
  const contract = route.contract;
  const sessions = processOf(app).training.sessions;
  const grade = app.grade;
  bk.job = {
    bank: b.id,
    route: app.route,
    contract,
    track: app.track,
    grade,
    started: s.day,
    gradeSince: s.day,
    salary: payFor(b, grade, contract),
    training: sessions > 1 ? { needed: sessions, done: 0 } : null,
    m: { accuracy: 60, satisfaction: 60, productivity: 60, learning: 50, conduct: 80, sales: 40 },
    workdays: 0,
    lastWorkDay: 0,
    nextPayDay: s.day + BAL.payCycleDays,
    nextReviewDay: s.day + BAL.reviewEveryDays,
    ratings: [],
    courses: [],
    leaveLeft: leaveDays(contract, grade),
    finance: [],
    promoReady: false,
    queries: 0,
  };
  bk.skills[app.track] = Math.max(bk.skills[app.track] ?? 0, trackSkill(s, app.track));
  for (const a of bk.apps) if (a.id !== app.id && a.status === "offer") a.status = "withdrawn";
  app.status = "withdrawn";
  const job = bk.job;
  lines.push(
    job.training
      ? `Welcome to ${b.name}! Your training starts now: ${job.training.needed} sessions at the ${b.programme} (training room). You're paid a training stipend meanwhile.`
      : `Welcome to ${b.name}! You start as ${titleOf(job)} (${GRADES[grade]!.name}).`,
  );
  if (contract === "agency") lines.push("You're employed through a staffing agency, not the bank directly. Strong reviews can earn a direct contract.");
  return lines.join(" ");
}

function leaveDays(contract: "direct" | "agency", grade: number) {
  const b = BENEFITS.find((x) => x.id === "leave") as unknown as { days: Record<string, number>; perGrade: number };
  return Math.floor(b.days[contract]! + grade * b.perGrade);
}

/** Leave your bank: final pay settles staff finance; what's left becomes a normal loan. */
export function leave(s: GameState, why: string): string {
  const bk = banking(s);
  const job = bk.job;
  if (!job) return "";
  const b = bankById(job.bank)!;
  bk.history.unshift({ bank: job.bank, title: titleOf(job), grade: GRADES[job.grade]!.name, from: job.started, to: s.day, why });
  const owed = job.finance.reduce((n, f) => n + f.owed, 0);
  const lines = [`You leave ${b.name}.`];
  if (owed > 0) {
    const pay = Math.min(owed, Math.max(0, s.stats.money));
    s.stats.money -= pay;
    const rest = owed - pay;
    if (rest > 0) {
      s.loans.push({ id: `staff-${s.day}`, principal: rest, owed: rest, weekly: Math.ceil(rest / 8), nextDue: s.day + 7, missed: 0 });
      lines.push(`Your staff finance balance (${naira(owed)}) falls due: you pay ${naira(pay)} now and the rest (${naira(rest)}) becomes a regular loan with weekly repayments.`);
    } else lines.push(`Your staff finance balance (${naira(owed)}) is settled from your savings.`);
  }
  bk.job = null;
  return lines.join(" ");
}

export function resign(s: GameState): string {
  return leave(s, "Resigned");
}

// ── Training ─────────────────────────────────────────────────────────────────

/** A training session: pass the quiz (2 of 3) to count it. Also used for promotion courses once working. */
export function finishTraining(s: GameState, correct: number, of: number): string {
  const job = banking(s).job;
  if (!job) return "";
  const b = bankById(job.bank)!;
  const sig = signature(b);
  s.stats.energy = clamp(s.stats.energy - 12);
  const passed = correct >= Math.ceil(of * 0.66);
  job.m.learning = clamp(job.m.learning + (passed ? 8 : 2) * (sig.learn ?? 1));
  bumpSkill(s, job.track, passed ? 2 : 1);
  if (job.training) {
    if (!passed) return `Session not passed (${correct}/${of}). Revise and try again; the trainers keep a seat for you.`;
    job.training.done += 1;
    if (job.training.done >= job.training.needed) {
      job.training = null;
      job.salary = payFor(b, job.grade, job.contract);
      job.nextReviewDay = s.day + BAL.reviewEveryDays;
      job.courses.push("induction");
      return `🎓 You've completed the ${b.programme}! You're now confirmed as ${titleOf(job)}. Full salary from your next payday.`;
    }
    return `Training session passed (${job.training.done}/${job.training.needed}).`;
  }
  // Courses for promotion: each pass completes the next course your grade needs.
  if (!passed) return `Course module not passed (${correct}/${of}). Try again another day.`;
  const next = nextCourses(job);
  const credit = sig.learn && sig.learn >= 2 ? 2 : 1;
  const done = next.slice(0, credit);
  job.courses.push(...done);
  return done.length ? `Course completed: ${done.map((c) => COURSES.find((x) => x.id === c)?.name).join(", ")}.` : "Refresher done. You're up to date with your courses.";
}

/** Courses still needed for the next grade. */
export function nextCourses(job: BankJob): string[] {
  const next = GRADES[job.grade + 1];
  return next ? next.courses.filter((c) => !job.courses.includes(c)) : [];
}

function bumpSkill(s: GameState, t: TrackId, n: number) {
  const bk = banking(s);
  bk.skills[t] = clamp((bk.skills[t] ?? trackSkill(s, t)) + n);
}

// ── Work ─────────────────────────────────────────────────────────────────────

export type TaskResult = { kind: TaskKind; accuracy: number; satisfaction: number; productivity: number; conduct: number; sales: number; missell?: boolean };

/** Today's tasks for your track and employer. */
export function todaysTasks(job: BankJob, seed: number): TaskKind[] {
  const t = trackById(job.track);
  const extra = signature(bankById(job.bank)!).tasks ?? [];
  const pool = [...t.tasks, ...extra];
  return [0, 1, 2].map((i) => pool[Math.floor(seeded(`${seed}:${i}`) * pool.length)]!);
}

/** End of a workday: fold task results into your metrics. */
export function finishWorkday(s: GameState, results: TaskResult[]): string {
  const job = banking(s).job;
  if (!job || job.training || !results.length) return "";
  const b = bankById(job.bank)!;
  const sig = signature(b);
  const avg = (k: keyof TaskResult) => results.reduce((n, x) => n + Number(x[k] ?? 0), 0) / results.length;
  const ema = (old: number, v: number) => Math.round(old * 0.7 + v * 0.3);
  job.m.accuracy = ema(job.m.accuracy, avg("accuracy"));
  job.m.satisfaction = ema(job.m.satisfaction, avg("satisfaction"));
  job.m.productivity = ema(job.m.productivity, avg("productivity"));
  job.m.learning = clamp(job.m.learning + 1);
  // Sales only count when they were suitable: mis-selling scores nothing and costs conduct.
  const missold = results.filter((x) => x.missell).length;
  const goodSales = results.filter((x) => !x.missell).reduce((n, x) => n + x.sales, 0);
  job.m.sales = ema(job.m.sales, clamp(40 + goodSales * 20));
  job.m.conduct = clamp(job.m.conduct + avg("conduct") / 10 - missold * 8);
  job.workdays += 1;
  job.lastWorkDay = s.day;
  bumpSkill(s, job.track, 1);
  const pace = archOf(b).pace;
  s.stats.stress = clamp(s.stats.stress + (pace === "intense" ? 8 : pace === "fast" || pace === "busy" ? 6 : 4) + (sig.stress ?? 0));
  const lines = [`Workday done at ${b.name}. Accuracy ${job.m.accuracy}, satisfaction ${job.m.satisfaction}, conduct ${job.m.conduct}.`];
  if (missold) {
    job.queries += 1;
    lines.push(`Compliance flagged ${missold > 1 ? "sales" : "a sale"} as unsuitable for the customer. It won't count towards your targets, and it's on your record.`);
  }
  if (job.m.conduct < BAL.dismissConduct) lines.push(dismiss(s, "Your conduct record has fallen below the bank's standard."));
  return lines.join(" ");
}

function dismiss(s: GameState, why: string): string {
  const line = leave(s, `Dismissed: ${why}`);
  s.stats.reputation = clamp(s.stats.reputation - 6);
  return `${why} You've been let go. ${line}`;
}

/** Take a paid day of leave: rest, and it counts as a workday. */
export function takeLeave(s: GameState): string {
  const job = banking(s).job;
  if (!job || job.training) return "";
  if (job.leaveLeft <= 0) return "You have no leave days left this review cycle.";
  job.leaveLeft -= 1;
  job.workdays += 1;
  job.lastWorkDay = s.day;
  s.stats.stress = clamp(s.stats.stress - 18);
  s.stats.energy = clamp(s.stats.energy + 20);
  return `A paid day off. You sleep in, see your people and come back lighter. (${job.leaveLeft} leave days left.)`;
}

// ── Benefits and staff finance ───────────────────────────────────────────────

export const nonInterest = (job: BankJob) => archOf(bankById(job.bank)!).finance === "murabaha";

/** The share of hospital bills your employer's health plan covers. */
export function hmoCover(s: GameState): number {
  const job = s.banking?.job;
  if (!job) return 0;
  const b = BENEFITS.find((x) => x.id === "health") as unknown as { cover: Record<string, number> };
  return b.cover[job.contract] ?? 0;
}

export function financeLimit(job: BankJob): number {
  const f = BENEFITS.find((x) => x.id === "finance") as unknown as { multiple: number; perGrade: number; agency: boolean };
  if (job.contract === "agency" || job.training) return 0;
  return roundTo(job.salary * (f.multiple + job.grade * f.perGrade), 1000);
}

export const FINANCE_ITEMS = ["Car", "Generator and solar kit", "Home appliances", "Rent advance", "Laptop", "School fees"];

/** Repayment per pay cycle for an amount (simulation terms). */
export function financeTerms(job: BankJob, amount: number) {
  const f = BENEFITS.find((x) => x.id === "finance") as unknown as { rate: number; markup: number; cycles: number; maxShare: number };
  const charge = nonInterest(job) ? f.markup : f.rate;
  const total = Math.round(amount * (1 + charge));
  const perCycle = Math.ceil(total / f.cycles);
  const already = job.finance.reduce((n, x) => n + x.perCycle, 0);
  const cap = Math.floor(netPayBeforeFinance(job) * f.maxShare);
  return { total, perCycle, cycles: f.cycles, charge, affordable: already + perCycle <= cap, cap, already };
}

/** Take staff finance: a staff loan, or a Murabaha sale at a non-interest bank. */
export function takeFinance(s: GameState, amount: number, item: string): string {
  const job = banking(s).job;
  if (!job) return "";
  const limit = financeLimit(job);
  if (!limit) return job.training ? "Staff finance opens once you're confirmed after training." : "Agency staff aren't eligible for staff finance.";
  const used = job.finance.reduce((n, x) => n + x.principal, 0);
  if (amount <= 0 || amount + used > limit) return `Your limit is ${naira(limit)} (${naira(Math.max(0, limit - used))} left).`;
  const t = financeTerms(job, amount);
  if (!t.affordable) return `Declined: repayments would be over ${Math.round(t.cap / Math.max(1, netPayBeforeFinance(job)) * 100)}% of your pay. You can afford up to ${naira(Math.max(0, t.cap - t.already))} per pay cycle.`;
  const mura = nonInterest(job);
  job.finance.push({ id: `f${s.day}-${job.finance.length}`, kind: mura ? "murabaha" : "loan", item, principal: amount, owed: t.total, perCycle: t.perCycle });
  if (mura) return `Murabaha agreed: the bank buys your ${item.toLowerCase()} for ${naira(amount)} and sells it to you for ${naira(t.total)} (an agreed profit, no interest), paid ${naira(t.perCycle)} per pay cycle from your salary.`;
  s.stats.money += amount;
  return `Staff loan approved: ${naira(amount)} for ${item.toLowerCase()}. You repay ${naira(t.perCycle)} per pay cycle (${naira(t.total)} in total).`;
}

function allowanceShare(job: BankJob): number {
  const a = BENEFITS.find((x) => x.id === "allowance") as unknown as { fromGrade: string; share: number };
  const sig = signature(bankById(job.bank)!);
  return (job.grade >= gradeIndex(a.fromGrade) ? a.share : 0) + (sig.allowance ?? 0);
}

/** Pay before staff-finance deductions, after pension. */
export function netPayBeforeFinance(job: BankJob): number {
  const gross = grossPay(job);
  const p = BENEFITS.find((x) => x.id === "pension") as unknown as { employee: number };
  return Math.round(gross * (1 - p.employee));
}

export function grossPay(job: BankJob): number {
  const stipend = job.training ? BAL.trainingStipendShare : 1;
  return Math.round(job.salary * stipend * (1 + (job.training ? 0 : allowanceShare(job))));
}

/** Benefits you have now, and which unlock later. */
export function benefitList(job: BankJob): { name: string; status: string; on: boolean }[] {
  const b = bankById(job.bank)!;
  const out: { name: string; status: string; on: boolean }[] = [];
  const g = GRADES[job.grade]!;
  const p = BENEFITS.find((x) => x.id === "pension") as unknown as { employer: number; employee: number };
  const sig = signature(b);
  out.push({ name: "Salary", status: `${naira(grossPay(job))} per pay cycle${job.training ? " (training stipend)" : ""}`, on: true });
  out.push({ name: "Training", status: job.training ? `${b.programme}: ${job.training.done}/${job.training.needed} sessions` : `${job.courses.length} courses done`, on: true });
  out.push({ name: "Healthcare (HMO)", status: `${Math.round((hmoCover({ banking: { job } } as unknown as GameState)) * 100)}% of hospital bills`, on: true });
  out.push({ name: "Leave", status: `${job.leaveLeft} paid days left this cycle`, on: true });
  out.push({ name: "Retirement contributions", status: `Employer ${Math.round((p.employer + (sig.pension ?? 0)) * 100)}% + you ${Math.round(p.employee * 100)}% of pay, into your pension`, on: true });
  out.push({ name: "Performance bonus", status: job.contract === "agency" ? "Not on agency contracts" : "After a good review", on: job.contract !== "agency" });
  out.push({ name: nonInterest(job) ? "Staff financing (Murabaha)" : "Staff loan", status: financeLimit(job) ? `Up to ${naira(financeLimit(job))}` : job.training ? "After training" : "Not on agency contracts", on: Boolean(financeLimit(job)) });
  const dep = BENEFITS.find((x) => x.id === "dependants") as unknown as { fromGrade: string };
  out.push({ name: "Dependant cover", status: job.grade >= gradeIndex(dep.fromGrade) ? "Your children are covered" : `From ${GRADES[gradeIndex(dep.fromGrade)]!.name}`, on: job.grade >= gradeIndex(dep.fromGrade) });
  const al = BENEFITS.find((x) => x.id === "allowance") as unknown as { fromGrade: string };
  out.push({ name: "Senior allowance (fictional)", status: job.grade >= gradeIndex(al.fromGrade) ? "Paid with salary" : `From ${GRADES[gradeIndex(al.fromGrade)]!.name}`, on: job.grade >= gradeIndex(al.fromGrade) });
  out.push({ name: `Employer perk: ${b.perk}`, status: sig.label, on: true });
  void g;
  return out;
}

// ── Pay, reviews and promotion (run each night) ──────────────────────────────

/** Nightly: payday, performance review, notice periods. Returns lines for the morning toast. */
export function nightlyBanking(s: GameState): string[] {
  const bk = s.banking;
  const job = bk?.job;
  if (!bk || !job) return [];
  const lines: string[] = [];
  const b = bankById(job.bank)!;
  if (s.day >= job.nextPayDay) {
    job.nextPayDay += BAL.payCycleDays;
    const gross = grossPay(job);
    const p = BENEFITS.find((x) => x.id === "pension") as unknown as { employer: number; employee: number };
    const sig = signature(b);
    const pension = Math.round(gross * (p.employee + p.employer + (sig.pension ?? 0)));
    let net = Math.round(gross * (1 - p.employee));
    let repaid = 0;
    for (const f of job.finance) {
      const due = Math.min(f.perCycle, f.owed);
      f.owed -= due;
      repaid += due;
    }
    job.finance = job.finance.filter((f) => f.owed > 0);
    net -= repaid;
    s.stats.money += net;
    bk.pension += pension;
    bk.earned += net;
    lines.push(`💳 ${job.training ? "Training stipend" : "Salary"} from ${b.name}: ${naira(net)}${repaid ? ` after ${naira(repaid)} staff finance` : ""} (pension +${naira(pension)}).`);
    // Not showing up: a query, and conduct suffers.
    if (!job.training && job.workdays < BAL.workdaysExpected - 1) {
      job.queries += 1;
      job.m.conduct = clamp(job.m.conduct - 10);
      lines.push(`HR has issued you a query: only ${job.workdays} workdays this pay cycle.`);
      if (job.m.conduct < BAL.dismissConduct) lines.push(dismiss(s, "Repeated absence."));
    }
    if (bk.job) bk.job.workdays = 0;
  }
  if (bk.job && !bk.job.training && s.day >= bk.job.nextReviewDay) lines.push(...review(s));
  return lines;
}

/** Overall rating 1–5 from your track's weighted metrics (simulation). */
export function rating(job: BankJob): number {
  const t = trackById(job.track);
  const sig = signature(bankById(job.bank)!);
  const w: Partial<Record<Metric, number>> = { ...t.weights };
  for (const [k, v] of Object.entries(sig.weights ?? {})) w[k as Metric] = (w[k as Metric] ?? 0) + v!;
  const total = Object.values(w).reduce((n, v) => n + v!, 0);
  let score = 0;
  for (const [k, v] of Object.entries(w)) score += (job.m[k as Metric] ?? 50) * v!;
  score /= total;
  // Conduct is a gate: no one is rated highly with a poor conduct record.
  if (job.m.conduct < 60) score = Math.min(score, 55);
  return Math.round(clamp(1 + (score - 30) / 15, 1, 5) * 10) / 10;
}

/** Promotion readiness: each requirement and whether you meet it. */
export function promotionChecks(s: GameState, job: BankJob): Check[] {
  const next = GRADES[job.grade + 1];
  if (!next) return [{ label: "Top of the ladder", ok: false, detail: "You're at the highest grade. Executive roles are board appointments." }];
  const last = job.ratings[job.ratings.length - 1] ?? 0;
  const skill = trackSkill(s, job.track);
  const days = s.day - job.gradeSince;
  const missing = nextCourses(job);
  const mgmt = next.scope === "manager" || next.scope === "senior";
  return [
    { label: "Performance", ok: last >= BAL.promotionRating, detail: `Last rating ${last || "–"} (needs ${BAL.promotionRating})` },
    { label: `${trackById(job.track).name} skill`, ok: skill >= next.skill, detail: `${skill} (needs ${next.skill})` },
    { label: "Training", ok: missing.length === 0, detail: missing.length ? `Still to do: ${missing.map((c) => COURSES.find((x) => x.id === c)?.name).join(", ")}` : "All courses done" },
    { label: "Conduct", ok: job.m.conduct >= BAL.promotionConduct, detail: `${job.m.conduct} (needs ${BAL.promotionConduct})` },
    { label: "Time in grade", ok: days >= next.minDays, detail: `${days} days (needs ${next.minDays})` },
    { label: "Readiness", ok: !mgmt || job.track === "lead" || job.m.satisfaction >= 55, detail: mgmt ? (job.track === "lead" ? "Leadership track" : "Specialist progression: no team required, but stakeholders must rate you") : "Not a management grade" },
  ];
}

function review(s: GameState): string[] {
  const bk = banking(s);
  const job = bk.job!;
  const b = bankById(job.bank)!;
  const sig = signature(b);
  job.nextReviewDay = s.day + BAL.reviewEveryDays;
  const rt = rating(job);
  job.ratings.push(rt);
  if (job.ratings.length > 8) job.ratings.shift();
  const band = String(Math.max(1, Math.min(5, Math.round(rt))));
  // Pay review: separate from promotion.
  const rise = (BAL.payRiseByRating[band] ?? 0) + (Number(band) >= 3 ? sig.payRise ?? 0 : 0);
  job.salary = roundTo(job.salary * (1 + rise));
  // Bonus.
  const bon = BENEFITS.find((x) => x.id === "bonus") as unknown as { byRating: Record<string, number> };
  const bonus = job.contract === "direct" ? roundTo(job.salary * (bon.byRating[band] ?? 0) * (sig.bonus ?? 1)) : 0;
  if (bonus) {
    s.stats.money += bonus;
    bk.earned += bonus;
  }
  job.leaveLeft = leaveDays(job.contract, job.grade);
  const checks = promotionChecks(s, job);
  const eligible = checks.every((c) => c.ok);
  job.promoReady = eligible;
  const notes: string[] = [];
  // Agency staff with strong reviews can go direct.
  if (job.contract === "agency" && job.ratings.slice(-BAL.agencyConvertAfterReviews).filter((x) => x >= 4).length >= BAL.agencyConvertAfterReviews) {
    job.contract = "direct";
    job.salary = payFor(b, job.grade, "direct");
    notes.push("Your strong reviews earned you a direct contract with the bank!");
  }
  // A rare board appointment, separate from promotion.
  const appt = APPOINTMENTS.find((a) => (a.fromGrade && !job.appointment && GRADES[job.grade]!.id === a.fromGrade) || (a.fromAppointment && job.appointment === a.fromAppointment));
  if (appt && rt >= appt.needs.rating && job.m.conduct >= appt.needs.conduct && trackSkill(s, job.track) >= appt.needs.skill && s.stats.network >= appt.needs.network && r() < appt.chance) {
    bk.offerAppt = appt.id;
    notes.push(`The board has shortlisted you for ${appt.name}. See Career to respond.`);
  }
  bk.review = { day: s.day, rating: rt, payRise: rise, bonus, checks, eligible, notes };
  const lines = [`📋 Performance review at ${b.name}: rated ${rt}/5. Pay review: ${rise ? `+${Math.round(rise * 100)}%` : "no change"}.${bonus ? ` Bonus ${naira(bonus)}.` : ""}`];
  lines.push(eligible ? "You're eligible for promotion: go to the manager's office for a promotion panel." : "Not eligible for promotion yet: see Career for what's missing.");
  lines.push(...notes);
  return lines;
}

/** The promotion panel: eligibility, a short interview, and whether a slot is open. */
export function promotionPanel(s: GameState, score: number): string {
  const bk = banking(s);
  const job = bk.job;
  if (!job || !job.promoReady) return "You're not eligible for promotion yet.";
  const b = bankById(job.bank)!;
  job.promoReady = false;
  if (score < 0.55) return "The panel wants to see more before promoting you. Keep it up and you'll be eligible again after your next review.";
  const slot = clamp(archOf(b).vacancy + (signature(b).vacancy ?? 0) + 0.25, 0.1, 0.95);
  if (r() > slot) return `The panel agrees you're ready, but there's no ${GRADES[job.grade + 1]!.name} vacancy this cycle. You stay eligible for the next one.`;
  const from = titleOf(job);
  job.grade += 1;
  job.gradeSince = s.day;
  job.salary = Math.max(job.salary, payFor(b, job.grade, job.contract));
  job.leaveLeft = leaveDays(job.contract, job.grade);
  bk.review = undefined;
  const role = titleOf(job) === from ? `Your job title stays ${from}: grade and title are separate.` : `Your new title is ${titleOf(job)} (was ${from}).`;
  return `🎉 Promoted to ${GRADES[job.grade]!.name}! ${role} New salary ${naira(grossPay(job))} per pay cycle (game simulation).`;
}

export function respondAppointment(s: GameState, accept: boolean): string {
  const bk = banking(s);
  const appt = APPOINTMENTS.find((a) => a.id === bk.offerAppt);
  bk.offerAppt = undefined;
  if (!appt || !bk.job) return "";
  if (!accept) return `You decline the ${appt.name} shortlist for now.`;
  if (r() > 0.6) return `The board chose another candidate for ${appt.name}. Being shortlisted is an honour in itself.`;
  bk.job.appointment = appt.id;
  bk.job.salary = roundTo(appt.pay * archOf(bankById(bk.job.bank)!).pay);
  return `🏛️ The board appoints you ${appt.name} of ${bankById(bk.job.bank)!.name}!`;
}

/** A label for every numeric line in the career screen. */
export const SIM_NOTE = "Game simulation value";
export const DISCLAIMER = "Independent simulation. Employer names are fictional and the game has no affiliation with any bank. Salaries, benefits, chances and timelines are game values, not real data.";
