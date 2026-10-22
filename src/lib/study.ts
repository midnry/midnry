/**
 * Study space: the data behind the free Study space app (docs/phase3-plan.md,
 * section 2.3, decisions D5 and D6). One saved document per person
 * (app_documents, slug "study") holds their decks, quizzes, references, lab
 * write-ups, own formulas, review progress and quiz scores.
 *
 * It brings together eight study apps that left the catalogue: Anatomy, Cases,
 * Drill, Quiz, Lab, Citations, Cite and Formulas. Their old links redirect here
 * (src/lib/app-aliases.ts). Only Lab and Quiz ever saved anything; those two
 * documents are copied in once by `importOldDocs` and are never changed or
 * deleted (they stay readable through src/lib/merged-docs.ts).
 *
 * Kept free of React so the rules can be tested on their own
 * (scripts/study.test.mjs): spaced review, quiz scoring, references, copying
 * old documents in, and cleaning shared decks and quizzes.
 */
import { legalCitation } from "@/lib/kits";

/* ── shapes ─────────────────────────────────────────────────────────────── */

export type Card = { id: string; front: string; back: string };
export type Deck = {
  id: string;
  title: string;
  cards: Card[];
  /** A starter set this deck was copied from ("anatomy"), so its review note follows the copy. */
  from?: string;
  /** "shared": copied in from someone's share link. */
  source?: "shared";
  createdAt: string;
  updatedAt: string;
};

export type Question = { id: string; q: string; options: string[]; answer: number; why: string };
export type Quiz = {
  id: string;
  title: string;
  questions: Question[];
  /** Free text kept exactly as written (the old Quiz app's one big box). */
  notes: string;
  from?: string;
  source?: "shared";
  createdAt: string;
  updatedAt: string;
};

/** Spaced review: which box a card is in and the day it is next due (YYYY-MM-DD). */
export type CardState = { box: number; due: string; seen: number; last: string };
export type Attempt = { id: string; quizId: string; score: number; total: number; at: string };

export type RefStyle = "APA" | "MLA" | "Chicago" | "Law";
export type Reference = { id: string; style: RefStyle; fields: Record<string, string>; createdAt: string };

export type LabNote = {
  id: string;
  title: string;
  aim: string;
  method: string;
  results: string;
  end: string;
  /** "lab-notes" when it was copied in from the old Lab app. */
  from?: string;
  createdAt: string;
  updatedAt: string;
};

export type Formula = { id: string; title: string; body: string };

/** Old app documents already looked at (copied in, or there was nothing to copy). */
export type Imported = { "lab-notes"?: boolean; "quiz-maker"?: boolean };

export type StudyDoc = {
  v: 1;
  decks: Deck[];
  quizzes: Quiz[];
  /** deck id (own deck id, or "starter:<id>") → card id → state. */
  progress: Record<string, Record<string, CardState>>;
  attempts: Attempt[];
  references: Reference[];
  notes: LabNote[];
  formulas: Formula[];
  imported: Imported;
};

export type Stamp = { now: string; today: string };
export type MakeId = () => string;

export const LIMITS = {
  decks: 200,
  cards: 500,
  quizzes: 200,
  questions: 200,
  options: 6,
  references: 1000,
  notes: 200,
  formulas: 300,
  /** Scores kept per quiz; older attempts are summarised by the best score. */
  attemptsPerQuiz: 20,
  title: 120,
  text: 4000,
  long: 20000,
} as const;

export const STUDY_SLUG = "study";

/** The eight apps that moved in here (their old slugs). */
export const STUDY_OLD_SLUGS = ["anatomy", "clinic-quiz", "law-drill", "quiz-maker", "lab-notes", "citations", "legal-cite", "formula-sheet"] as const;
/** Old apps that saved a document, which the Study space copies in once. */
export const STUDY_OLD_DOCS = ["lab-notes", "quiz-maker"] as const;

export type StudyView = "cards" | "practice" | "references" | "notes";
export const STUDY_VIEWS: readonly { id: StudyView; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "practice", label: "Practice" },
  { id: "references", label: "References" },
  { id: "notes", label: "Notes" },
];

export function isStudyView(value: unknown): value is StudyView {
  return STUDY_VIEWS.some((view) => view.id === value);
}

export function emptyStudy(): StudyDoc {
  return { v: 1, decks: [], quizzes: [], progress: {}, attempts: [], references: [], notes: [], formulas: [], imported: {} };
}

/* ── starter sets (from the old Anatomy, Cases, Drill and Formulas apps) ── */

export type StarterDeck = { id: string; title: string; subject: string; cards: Card[] };
export type StarterQuiz = { id: string; title: string; subject: string; questions: Question[] };

const card = (id: string, front: string, back: string): Card => ({ id, front, back });
const question = (id: string, q: string, options: string[], answer: number, why: string): Question => ({ id, q, options, answer, why });

/**
 * Sample study sets. The medical and legal ones have not been checked by a
 * professional (src/lib/review-notes.ts keys them by their old app slug), so
 * the Study space shows that note with them and never features them.
 */
export const STARTER_DECKS: readonly StarterDeck[] = [
  {
    id: "anatomy",
    title: "Anatomy",
    subject: "Medicine & Nursing",
    cards: [
      card("a1", "Left ventricle", "Pumps blood into the aorta and around the body."),
      card("a2", "Right atrium", "Receives venous blood from the venae cavae."),
      card("a3", "Femur", "Thigh bone. The longest bone in the body."),
      card("a4", "Diaphragm", "The main muscle of quiet breathing. It separates chest and abdomen."),
      card("a5", "Nephron", "The filtering unit of the kidney."),
      card("a6", "Liver", "Makes bile, stores glycogen, and processes many drugs."),
      card("a7", "Trachea", "The airway from larynx to the bronchi."),
      card("a8", "Deltoid", "Shoulder muscle that abducts the arm."),
    ],
  },
];

export const STARTER_QUIZZES: readonly StarterQuiz[] = [
  {
    id: "clinic-quiz",
    title: "Cases",
    subject: "Medicine & Nursing",
    questions: [
      question("c1", "An adult with crushing chest pain, sweating, and pain into the left arm. What do you do first?", ["Send them home with an antacid", "Treat it as a possible heart attack and get emergency care", "Start antibiotics", "Book a routine clinic in a month"], 1, "That pattern is an emergency until a clinician says otherwise."),
      question("c2", "A child with a fever and a stiff neck. The safer first step is:", ["Urgent assessment for meningitis", "Herbal steam only", "Wait three days", "A sleeping tablet"], 0, "Fever plus neck stiffness needs urgent clinical review."),
      question("c3", "Before giving a drug, which check is the point of the five rights?", ["The brand logo", "Patient, drug, dose, route, and time", "The colour of the cup", "The ward nickname"], 1, "Those five checks are the usual last look before a dose."),
      question("c4", "A wound that is red, hot, and spreading after two days suggests:", ["Healing as expected", "Possible infection that needs review", "A need for more sugar", "Dehydration only"], 1, "Spreading redness and heat are signs to get the wound seen."),
    ],
  },
  {
    id: "law-drill",
    title: "Drill",
    subject: "Law",
    questions: [
      question("d1", "A shop labels a phone at ₦80,000. A customer says 'I accept'. In basic contract study, the label is usually:", ["An offer that binds the shop at once", "An invitation to treat", "A deed", "A crime"], 1, "A price tag is usually an invitation to treat. The customer's words are the offer."),
      question("d2", "Consideration, in simple terms, is:", ["A judge's mood", "Something of value each side gives", "The court fee only", "A witness signature"], 1, "Each side gives something. A bare promise with nothing in return is the usual problem."),
      question("d3", "Which is the safer note in a student brief?", ["Quote the holding you actually read", "Invent a page number", "Add a case you have not opened", "Change the year so it looks newer"], 0, "Only cite what you have read. Invented pins are misconduct."),
      question("d4", "Ratio decidendi means:", ["A remark that was not necessary to the result", "The reason that was necessary to the decision", "The court reporter's name", "The losing party's costs"], 1, "The ratio is the reason required for the decision. Other comments are obiter."),
    ],
  },
];

/** The starter formula sheet (from the old Formulas app). Your own formulas go below it. */
export const STARTER_FORMULAS: readonly Formula[] = [
  { id: "f1", title: "Ohm's law", body: "V = I R. Voltage in volts, current in amps, resistance in ohms." },
  { id: "f2", title: "Stress", body: "σ = F / A. Force over area." },
  { id: "f3", title: "Strain", body: "ε = ΔL / L. Change in length over original length." },
  { id: "f4", title: "Power", body: "P = V I = I² R." },
  { id: "f5", title: "Density", body: "ρ = m / V." },
  { id: "f6", title: "Kinetic energy", body: "KE = ½ m v²." },
  { id: "f7", title: "Moment", body: "M = F d. Force times the perpendicular distance." },
  { id: "f8", title: "Efficiency", body: "η = output / input. Often written as a percent." },
];

/** The old apps' own cautions, shown with the starter set (and copies of it). */
export const STARTER_NOTES: Readonly<Record<string, string>> = {
  "clinic-quiz": "Study questions only. Do not use them to treat anyone.",
  "law-drill": "Practice only. Laws differ, and this is not advice.",
};

export const STARTER_IDS: ReadonlySet<string> = new Set([...STARTER_DECKS.map((d) => d.id), ...STARTER_QUIZZES.map((q) => q.id)]);

/** Label used on every starter set until a professional has reviewed it (plan 2.3). */
export const SAMPLE_LABEL = "Sample study questions";

export function starterDeck(id: string): StarterDeck | undefined {
  return STARTER_DECKS.find((deck) => deck.id === id);
}
export function starterQuiz(id: string): StarterQuiz | undefined {
  return STARTER_QUIZZES.find((quiz) => quiz.id === id);
}
/** Progress key of a starter deck, so it never clashes with an own deck's id. */
export function starterKey(id: string): string {
  return `starter:${id}`;
}

/* ── reading saved data ─────────────────────────────────────────────────── */

type Raw = Record<string, unknown>;

function isObj(value: unknown): value is Raw {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function str(value: unknown, max: number = LIMITS.text): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}
function list(value: unknown): Raw[] {
  return Array.isArray(value) ? value.filter(isObj) : [];
}
function isDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function fromOf(value: unknown): string | undefined {
  return typeof value === "string" && (STARTER_IDS.has(value) || value === "lab-notes" || value === "quiz-maker") ? value : undefined;
}

function readCard(raw: Raw, index: number): Card {
  return { id: str(raw.id, 80) || `card-${index + 1}`, front: str(raw.front), back: str(raw.back) };
}

export function readDeck(raw: Raw, index = 0): Deck {
  const createdAt = str(raw.createdAt, 40);
  const ids = new Set<string>();
  const cards = list(raw.cards)
    .slice(0, LIMITS.cards)
    .map(readCard)
    .map((item, i) => {
      const id = ids.has(item.id) ? `${item.id}-${i + 1}` : item.id;
      ids.add(id);
      return { ...item, id };
    });
  return {
    id: str(raw.id, 80) || `deck-${index + 1}`,
    title: str(raw.title, LIMITS.title),
    cards,
    ...(fromOf(raw.from) ? { from: fromOf(raw.from) } : {}),
    ...(raw.source === "shared" ? { source: "shared" as const } : {}),
    createdAt,
    updatedAt: str(raw.updatedAt, 40) || createdAt,
  };
}

function readQuestion(raw: Raw, index: number): Question {
  const options = (Array.isArray(raw.options) ? raw.options : []).slice(0, LIMITS.options).map((item) => str(item, 1000));
  while (options.length < 2) options.push("");
  const answer = Number(raw.answer);
  return {
    id: str(raw.id, 80) || `q-${index + 1}`,
    q: str(raw.q),
    options,
    answer: Number.isInteger(answer) && answer >= 0 && answer < options.length ? answer : 0,
    why: str(raw.why),
  };
}

export function readQuiz(raw: Raw, index = 0): Quiz {
  const createdAt = str(raw.createdAt, 40);
  return {
    id: str(raw.id, 80) || `quiz-${index + 1}`,
    title: str(raw.title, LIMITS.title),
    questions: list(raw.questions).slice(0, LIMITS.questions).map(readQuestion),
    notes: str(raw.notes, LIMITS.long),
    ...(fromOf(raw.from) ? { from: fromOf(raw.from) } : {}),
    ...(raw.source === "shared" ? { source: "shared" as const } : {}),
    createdAt,
    updatedAt: str(raw.updatedAt, 40) || createdAt,
  };
}

const REF_STYLES: readonly RefStyle[] = ["APA", "MLA", "Chicago", "Law"];
export function isRefStyle(value: unknown): value is RefStyle {
  return REF_STYLES.includes(value as RefStyle);
}

function readFields(value: unknown): Record<string, string> {
  if (!isObj(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, item]) => /^[a-z]{1,20}$/.test(key) && typeof item === "string")
      .map(([key, item]) => [key, (item as string).slice(0, 1000)]),
  );
}

/** Reads any saved Study space document, keeping what it can and filling the rest. */
export function normalizeStudy(raw: unknown): StudyDoc {
  if (!isObj(raw)) return emptyStudy();
  const progress: StudyDoc["progress"] = {};
  if (isObj(raw.progress)) {
    for (const [deckId, cards] of Object.entries(raw.progress)) {
      if (!isObj(cards)) continue;
      const states: Record<string, CardState> = {};
      for (const [cardId, state] of Object.entries(cards)) {
        if (!isObj(state) || !isDay(state.due)) continue;
        const box = Number(state.box);
        states[cardId] = {
          box: Number.isInteger(box) ? Math.min(Math.max(box, 0), INTERVALS.length - 1) : 0,
          due: state.due,
          seen: Math.max(0, Math.floor(Number(state.seen) || 0)),
          last: isDay(state.last) ? state.last : state.due,
        };
      }
      progress[deckId] = states;
    }
  }
  const imported: Imported = {};
  if (isObj(raw.imported)) {
    if (raw.imported["lab-notes"] === true) imported["lab-notes"] = true;
    if (raw.imported["quiz-maker"] === true) imported["quiz-maker"] = true;
  }
  return {
    v: 1,
    decks: list(raw.decks).slice(0, LIMITS.decks).map(readDeck),
    quizzes: list(raw.quizzes).slice(0, LIMITS.quizzes).map(readQuiz),
    progress,
    attempts: list(raw.attempts)
      .map((item) => ({
        id: str(item.id, 80),
        quizId: str(item.quizId, 80),
        score: Math.max(0, Math.floor(Number(item.score) || 0)),
        total: Math.max(0, Math.floor(Number(item.total) || 0)),
        at: str(item.at, 40),
      }))
      .filter((item) => item.id && item.quizId && item.total > 0 && item.score <= item.total),
    references: list(raw.references)
      .slice(0, LIMITS.references)
      .map((item, index) => ({
        id: str(item.id, 80) || `ref-${index + 1}`,
        style: isRefStyle(item.style) ? item.style : "APA",
        fields: readFields(item.fields),
        createdAt: str(item.createdAt, 40),
      })),
    notes: list(raw.notes)
      .slice(0, LIMITS.notes)
      .map((item, index) => {
        const createdAt = str(item.createdAt, 40);
        return {
          id: str(item.id, 80) || `note-${index + 1}`,
          title: str(item.title, LIMITS.title),
          aim: str(item.aim, LIMITS.long),
          method: str(item.method, LIMITS.long),
          results: str(item.results, LIMITS.long),
          end: str(item.end, LIMITS.long),
          ...(fromOf(item.from) ? { from: fromOf(item.from) } : {}),
          createdAt,
          updatedAt: str(item.updatedAt, 40) || createdAt,
        };
      }),
    formulas: list(raw.formulas)
      .slice(0, LIMITS.formulas)
      .map((item, index) => ({ id: str(item.id, 80) || `formula-${index + 1}`, title: str(item.title, LIMITS.title), body: str(item.body) })),
    imported,
  };
}

/* ── spaced review ──────────────────────────────────────────────────────── */

/**
 * A simple Leitner schedule. "I knew it" moves a card up one box and it comes
 * back after that box's gap; "Again" puts it back in box 0, due today, so it is
 * shown again in this session.
 */
export const INTERVALS = [0, 1, 3, 7, 14, 30] as const;

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function reviewCard(state: CardState | undefined, result: "known" | "again", today: string): CardState {
  const seen = (state?.seen ?? 0) + 1;
  if (result === "again") return { box: 0, due: today, seen, last: today };
  const box = Math.min((state?.box ?? 0) + 1, INTERVALS.length - 1);
  return { box, due: addDays(today, INTERVALS[box]), seen, last: today };
}

export function isDue(state: CardState | undefined, today: string): boolean {
  return !state || state.due <= today;
}

/**
 * The cards to review today: ones you missed first, then ones that came due
 * (oldest first), then cards never seen, in deck order.
 */
export function dueCards(cards: readonly Card[], states: Record<string, CardState> | undefined, today: string): Card[] {
  const s = states ?? {};
  const missed = cards.filter((c) => s[c.id] && s[c.id].box === 0 && s[c.id].due <= today);
  const due = cards
    .filter((c) => s[c.id] && s[c.id].box > 0 && s[c.id].due <= today)
    .sort((a, b) => (s[a.id].due < s[b.id].due ? -1 : s[a.id].due > s[b.id].due ? 1 : 0));
  const fresh = cards.filter((c) => !s[c.id]);
  return [...missed, ...due, ...fresh];
}

export type DeckStats = { total: number; due: number; known: number; fresh: number; nextDue: string | null };

export function deckStats(cards: readonly Card[], states: Record<string, CardState> | undefined, today: string): DeckStats {
  const s = states ?? {};
  let due = 0;
  let known = 0;
  let fresh = 0;
  let nextDue: string | null = null;
  for (const c of cards) {
    const state = s[c.id];
    if (!state) fresh += 1;
    if (isDue(state, today)) due += 1;
    else if (!nextDue || state!.due < nextDue) nextDue = state!.due;
    if (state && state.box > 0) known += 1;
  }
  return { total: cards.length, due, known, fresh, nextDue };
}

/** Saves one answer in the review: a new progress map, the rest untouched. */
export function recordReview(doc: StudyDoc, deckKey: string, cardId: string, result: "known" | "again", today: string): StudyDoc {
  const states = doc.progress[deckKey] ?? {};
  return { ...doc, progress: { ...doc.progress, [deckKey]: { ...states, [cardId]: reviewCard(states[cardId], result, today) } } };
}

/** Forget the review history of one deck (the cards stay). */
export function resetProgress(doc: StudyDoc, deckKey: string): StudyDoc {
  const progress = { ...doc.progress };
  delete progress[deckKey];
  return { ...doc, progress };
}

/* ── quizzes ────────────────────────────────────────────────────────────── */

/** What is missing from a question before it can be played, or null when it is ready. */
export function questionProblem(item: Question): string | null {
  if (!item.q.trim()) return "Write the question.";
  const filled = item.options.filter((option) => option.trim()).length;
  if (filled < 2) return "Add at least two choices.";
  if (!item.options[item.answer]?.trim()) return "Pick the right answer.";
  return null;
}

/** The questions that can be played, with empty choices left out (the right answer follows its choice). */
export function playable(questions: readonly Question[]): Question[] {
  return questions
    .filter((item) => questionProblem(item) === null)
    .map((item) => {
      const kept = item.options.map((option, index) => ({ option: option.trim(), index })).filter((entry) => entry.option);
      return { ...item, q: item.q.trim(), options: kept.map((entry) => entry.option), answer: kept.findIndex((entry) => entry.index === item.answer), why: item.why.trim() };
    });
}

export type Score = { score: number; total: number; percent: number; missed: number[] };

/** One point for each right answer; unanswered questions count as wrong. */
export function scoreQuiz(questions: readonly Question[], answers: readonly (number | null | undefined)[]): Score {
  const missed: number[] = [];
  let score = 0;
  questions.forEach((item, index) => {
    if (answers[index] === item.answer) score += 1;
    else missed.push(index);
  });
  const total = questions.length;
  return { score, total, percent: total ? Math.round((score / total) * 100) : 0, missed };
}

/** Saves a finished attempt, keeping the latest LIMITS.attemptsPerQuiz for that quiz. */
export function recordAttempt(doc: StudyDoc, quizId: string, result: Score, now: string, makeId: MakeId): StudyDoc {
  if (result.total === 0) return doc;
  const attempt: Attempt = { id: makeId(), quizId, score: result.score, total: result.total, at: now };
  const all = [...doc.attempts, attempt];
  const mine = all.filter((item) => item.quizId === quizId);
  // Older attempts make room, but the best score is always kept.
  const best = scoreSummary(mine, quizId).best;
  const drop = new Set(mine.slice(0, Math.max(0, mine.length - LIMITS.attemptsPerQuiz)).map((item) => item.id));
  if (best) drop.delete(best.id);
  return { ...doc, attempts: all.filter((item) => !drop.has(item.id)) };
}

export type ScoreSummary = { last: Attempt | null; best: Attempt | null; count: number };

export function scoreSummary(attempts: readonly Attempt[], quizId: string): ScoreSummary {
  const mine = attempts.filter((item) => item.quizId === quizId);
  const rate = (a: Attempt) => a.score / a.total;
  const best = mine.reduce<Attempt | null>((top, item) => (!top || rate(item) > rate(top) ? item : top), null);
  return { last: mine[mine.length - 1] ?? null, best, count: mine.length };
}

/** A quiz as plain text, for copying or printing; answers and reasons optional. */
export function quizText(title: string, questions: readonly Question[], notes = "", withAnswers = true): string {
  const letters = "ABCDEF";
  const body = questions
    .filter((item) => item.q.trim())
    .map((item, index) => {
      const options = item.options.map((option, at) => (option.trim() ? `   ${letters[at]}. ${option.trim()}` : "")).filter(Boolean);
      const answer = withAnswers && item.options[item.answer]?.trim() ? [`   Answer: ${letters[item.answer]}. ${item.options[item.answer].trim()}${item.why.trim() ? ` (${item.why.trim()})` : ""}`] : [];
      return [`${index + 1}. ${item.q.trim()}`, ...options, ...answer].join("\n");
    });
  return [title.trim() || "Quiz", "", ...body.flatMap((block) => [block, ""]), notes.trim()].join("\n").trim();
}

export function deckText(title: string, cards: readonly Card[]): string {
  return [title.trim() || "Deck", "", ...cards.filter((c) => c.front.trim() || c.back.trim()).map((c) => `${c.front.trim()}\n   ${c.back.trim()}`)].join("\n").trim();
}

/* ── references ─────────────────────────────────────────────────────────── */

export type RefField = { id: string; label: string; placeholder?: string };

export const REF_FIELDS: Record<"paper" | "law", RefField[]> = {
  paper: [
    { id: "author", label: "Author", placeholder: "Adebayo, T." },
    { id: "year", label: "Year", placeholder: "2024" },
    { id: "title", label: "Title" },
    { id: "source", label: "Source" },
    { id: "url", label: "Link or DOI, optional" },
  ],
  law: [
    { id: "parties", label: "Parties", placeholder: "Ade v Bello" },
    { id: "year", label: "Year", placeholder: "2024" },
    { id: "volume", label: "Volume", placeholder: "5" },
    { id: "report", label: "Report", placeholder: "NWLR" },
    { id: "part", label: "Part", placeholder: "1925" },
    { id: "page", label: "Page", placeholder: "1" },
    { id: "court", label: "Court, optional", placeholder: "SC" },
  ],
};

export function refFields(style: RefStyle): RefField[] {
  return style === "Law" ? REF_FIELDS.law : REF_FIELDS.paper;
}

/** One reference line: APA, MLA or a notes-style Chicago line, or a Nigerian law report citation. */
export function formatReference(style: RefStyle, fields: Record<string, string | undefined>): string {
  if (style === "Law") return legalCitation(fields);
  const v = (id: string) => (fields[id] ?? "").trim();
  const url = v("url") ? ` ${v("url")}` : "";
  const author = v("author") || "Author";
  const year = v("year") || "n.d.";
  const title = v("title") || "Title";
  const source = v("source") || "Source";
  if (style === "MLA") return `${author}. "${title}." ${source}, ${year}.${url}`;
  if (style === "Chicago") return `${author}. ${year}. ${title}. ${source}.${url}`;
  return `${author} (${year}). ${title}. ${source}.${url}`;
}

/** Enough is filled to add the reference to the list. */
export function referenceReady(style: RefStyle, fields: Record<string, string | undefined>): boolean {
  const v = (id: string) => Boolean(fields[id]?.trim());
  return style === "Law" ? v("parties") : v("author") && v("title");
}

/** The saved list, A to Z by the line it prints. */
export function sortedReferences(references: readonly Reference[]): { ref: Reference; text: string }[] {
  return references
    .map((ref) => ({ ref, text: formatReference(ref.style, ref.fields) }))
    .sort((a, b) => a.text.localeCompare(b.text, "en", { sensitivity: "base" }) || a.ref.id.localeCompare(b.ref.id));
}

export function referencesText(references: readonly Reference[]): string {
  const papers = sortedReferences(references.filter((ref) => ref.style !== "Law")).map((item) => item.text);
  const cases = sortedReferences(references.filter((ref) => ref.style === "Law")).map((item) => item.text);
  return [...(papers.length ? ["References", "", ...papers] : []), ...(papers.length && cases.length ? [""] : []), ...(cases.length ? ["Table of cases", "", ...cases] : [])].join("\n");
}

/* ── lab notes ──────────────────────────────────────────────────────────── */

export const LAB_PARTS: readonly { id: "aim" | "method" | "results" | "end"; label: string }[] = [
  { id: "aim", label: "Aim" },
  { id: "method", label: "Method" },
  { id: "results", label: "Results" },
  { id: "end", label: "Conclusion" },
];

export function noteText(note: LabNote): string {
  return [note.title.trim() || "Lab write-up", "", ...LAB_PARTS.filter((part) => note[part.id].trim()).map((part) => `${part.label}\n${note[part.id].trim()}\n`)].join("\n").trim();
}

export function newNote(stamp: Stamp, makeId: MakeId, title = ""): LabNote {
  return { id: makeId(), title, aim: "", method: "", results: "", end: "", createdAt: stamp.now, updatedAt: stamp.now };
}

export function newDeck(stamp: Stamp, makeId: MakeId, title = ""): Deck {
  return { id: makeId(), title, cards: [], createdAt: stamp.now, updatedAt: stamp.now };
}

export function newQuestion(makeId: MakeId): Question {
  return { id: makeId(), q: "", options: ["", "", "", ""], answer: 0, why: "" };
}

export function newQuiz(stamp: Stamp, makeId: MakeId, title = ""): Quiz {
  return { id: makeId(), title, questions: [newQuestion(makeId)], notes: "", createdAt: stamp.now, updatedAt: stamp.now };
}

/** An editable copy of a starter deck or quiz, which keeps the starter's review note. */
export function copyStarterDeck(starter: StarterDeck, stamp: Stamp, makeId: MakeId): Deck {
  return { id: makeId(), title: `${starter.title} (my copy)`, cards: starter.cards.map((c) => ({ ...c, id: makeId() })), from: starter.id, createdAt: stamp.now, updatedAt: stamp.now };
}

export function copyStarterQuiz(starter: StarterQuiz, stamp: Stamp, makeId: MakeId): Quiz {
  return {
    id: makeId(),
    title: `${starter.title} (my copy)`,
    questions: starter.questions.map((item) => ({ ...item, options: [...item.options], id: makeId() })),
    notes: "",
    from: starter.id,
    createdAt: stamp.now,
    updatedAt: stamp.now,
  };
}

/* ── copying the old Lab and Quiz documents in ──────────────────────────── */

/**
 * `sources[slug]` is the parsed old document, `undefined` when the person has
 * none, or `null` when it could not be read (then it is tried again next time).
 * Each old document is looked at once (`imported`), and a copy is marked with
 * `from`, so nothing is ever added twice. The old documents are only read.
 */
export function importOldDocs(
  doc: StudyDoc,
  sources: { "lab-notes"?: unknown; "quiz-maker"?: unknown },
  stamp: Stamp,
  makeId: MakeId,
): { doc: StudyDoc; changed: boolean; copied: ("lab-notes" | "quiz-maker")[] } {
  let next = doc;
  const copied: ("lab-notes" | "quiz-maker")[] = [];
  const values = (raw: unknown): Record<string, string> => {
    const v = isObj(raw) && isObj(raw.values) ? raw.values : {};
    return Object.fromEntries(Object.entries(v).filter(([, item]) => typeof item === "string" && item.trim()).map(([key, item]) => [key, item as string]));
  };

  if (!doc.imported["lab-notes"] && Object.hasOwn(sources, "lab-notes") && sources["lab-notes"] !== null) {
    const v = values(sources["lab-notes"]);
    const filled = ["title", "aim", "method", "results", "end"].some((key) => v[key]);
    if (filled && !next.notes.some((note) => note.from === "lab-notes")) {
      const note: LabNote = {
        ...newNote(stamp, makeId),
        title: (v.title || "Lab write-up (brought in)").slice(0, LIMITS.title),
        aim: v.aim ?? "",
        method: v.method ?? "",
        results: v.results ?? "",
        end: v.end ?? "",
        from: "lab-notes",
      };
      next = { ...next, notes: [note, ...next.notes] };
      copied.push("lab-notes");
    }
    next = { ...next, imported: { ...next.imported, "lab-notes": true } };
  }

  if (!doc.imported["quiz-maker"] && Object.hasOwn(sources, "quiz-maker") && sources["quiz-maker"] !== null) {
    const v = values(sources["quiz-maker"]);
    if ((v.topic || v.questions) && !next.quizzes.some((quiz) => quiz.from === "quiz-maker")) {
      // The text is kept exactly as written; it is not split into questions.
      const quiz: Quiz = {
        ...newQuiz(stamp, makeId),
        title: (v.topic ? `${v.topic} (brought in)` : "Quiz (brought in)").slice(0, LIMITS.title),
        questions: [],
        notes: (v.questions ?? "").slice(0, LIMITS.long),
        from: "quiz-maker",
      };
      next = { ...next, quizzes: [quiz, ...next.quizzes] };
      copied.push("quiz-maker");
    }
    next = { ...next, imported: { ...next.imported, "quiz-maker": true } };
  }

  return { doc: next, changed: next !== doc, copied };
}

/* ── sharing (Midnry Pass) ──────────────────────────────────────────────── */

export type ShareKind = "deck" | "quiz";
export type SharedItem = { kind: "deck"; item: Deck } | { kind: "quiz"; item: Quiz };

/** Share tokens: 32 URL-safe characters (192 random bits). */
export const SHARE_TOKEN = /^[A-Za-z0-9_-]{32}$/;
/** A shared deck or quiz, as JSON, may be at most this long. */
export const SHARE_MAX_CHARS = 300_000;
export const MAX_SHARES = 50;

export function isShareToken(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN.test(value);
}

/**
 * What a share link holds: the deck or quiz only (no progress, no scores, no
 * dates), cleaned with the same rules as a saved document. Throws when there
 * is nothing to share.
 */
export function cleanShared(kind: unknown, raw: unknown): SharedItem {
  if (!isObj(raw)) throw new Error("Nothing to share");
  if (kind === "deck") {
    const deck = readDeck(raw);
    const cards = deck.cards.filter((c) => c.front.trim() || c.back.trim());
    if (cards.length === 0) throw new Error("Add a card before you share this deck.");
    return { kind, item: { id: deck.id, title: deck.title.trim() || "Untitled deck", cards, ...(deck.from ? { from: deck.from } : {}), createdAt: "", updatedAt: "" } };
  }
  if (kind === "quiz") {
    const quiz = readQuiz(raw);
    const questions = playable(quiz.questions);
    if (questions.length === 0 && !quiz.notes.trim()) throw new Error("Add a question before you share this quiz.");
    return { kind, item: { id: quiz.id, title: quiz.title.trim() || "Untitled quiz", questions, notes: quiz.notes, ...(quiz.from ? { from: quiz.from } : {}), createdAt: "", updatedAt: "" } };
  }
  throw new Error("Nothing to share");
}

/** Copies a shared deck or quiz into your own space, with new ids. */
export function copyShared(doc: StudyDoc, shared: SharedItem, stamp: Stamp, makeId: MakeId): { doc: StudyDoc; id: string } {
  if (shared.kind === "deck") {
    const deck: Deck = { ...shared.item, id: makeId(), cards: shared.item.cards.map((c) => ({ ...c, id: makeId() })), source: "shared", createdAt: stamp.now, updatedAt: stamp.now };
    if (doc.decks.length >= LIMITS.decks) throw new Error(`You have ${LIMITS.decks} decks. Delete one to make room.`);
    return { doc: { ...doc, decks: [deck, ...doc.decks] }, id: deck.id };
  }
  const quiz: Quiz = { ...shared.item, id: makeId(), questions: shared.item.questions.map((item) => ({ ...item, options: [...item.options], id: makeId() })), source: "shared", createdAt: stamp.now, updatedAt: stamp.now };
  if (doc.quizzes.length >= LIMITS.quizzes) throw new Error(`You have ${LIMITS.quizzes} quizzes. Delete one to make room.`);
  return { doc: { ...doc, quizzes: [quiz, ...doc.quizzes] }, id: quiz.id };
}

/** A new share token from a secure random source. */
export function newShareToken(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The old app a copied-in write-up or quiz came from ("Lab", "Quiz"), for labels; undefined otherwise. */
export function broughtIn(from: string | undefined): "Lab" | "Quiz" | undefined {
  return from === STUDY_OLD_DOCS[0] ? "Lab" : from === STUDY_OLD_DOCS[1] ? "Quiz" : undefined;
}
