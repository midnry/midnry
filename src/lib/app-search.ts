/**
 * App search: what people type, matched against what each app does.
 *
 * Pure and deterministic, so it can be tested without a browser
 * (scripts/app-search.test.mjs). The component (src/components/desk-list.tsx)
 * builds an index once and calls `searchIndex` on every keystroke.
 *
 * Ranking, best first, per search word:
 *   exact name > name prefix > merged name / curated synonym > pitch / blurb > labels / features / guide.
 * Words of 5+ letters that match nothing at all get a small typo allowance.
 */
import { APPS, type AppDef } from "@/lib/catalog";
import { APP_ALIASES } from "@/lib/app-aliases";
import { GENERAL_APPS } from "@/lib/audience-tags";
import { GOALS } from "@/lib/goals";
import { getKit } from "@/lib/kits";
import { pitchFor } from "@/lib/pitches";
import { genreLabel, sectionOf, tagLabel } from "@/lib/sections";

// ---------------------------------------------------------------- Curated words

/**
 * Apps that were merged into another one. Searching the old name finds the
 * app that holds it now, with `note` shown on the result. Keyed by the old
 * slug in APP_ALIASES (a test checks the two agree).
 */
export type MergedName = { to: string; terms: readonly string[]; note: string };

export const MERGED_NAMES: Record<string, MergedName> = {
  quote: { to: "invoice", terms: ["quote", "quotation"], note: "Quotes are part of Invoice" },
  proposal: { to: "invoice", terms: ["proposal"], note: "Proposals are part of Invoice" },
  budget: { to: "ledger", terms: ["budget"], note: "Budget is part of Ledger" },
  pocket: { to: "ledger", terms: ["pocket"], note: "Pocket is part of Ledger" },
  board: { to: "tasks", terms: ["board", "kanban"], note: "Board is part of Remind" },
  pulse: { to: "tasks", terms: ["pulse", "focus timer", "pomodoro", "timer"], note: "The Focus timer (Pulse) is part of Remind" },
  habits: { to: "tasks", terms: ["habit", "habit tracker"], note: "Habits are part of Remind" },
  "client-terms": { to: "service-terms", terms: ["terms", "client terms"], note: "Client terms are part of Agreement" },
  "price-list": { to: "catalog", terms: ["price list", "prices"], note: "Prices are part of Catalog" },
  produce: { to: "farm-sales", terms: ["crop prices", "produce"], note: "Crop prices are part of Farm sales" },
  "qr-menu": { to: "menu", terms: ["qr menu", "qr"], note: "QR menu is part of Menu" },
  anatomy: { to: "study", terms: ["anatomy"], note: "The Anatomy deck is part of the Study space" },
  "clinic-quiz": { to: "study", terms: ["cases", "clinic quiz", "clinical cases"], note: "Cases is part of the Study space" },
  "law-drill": { to: "study", terms: ["drill", "law drill", "law questions"], note: "Drill is part of the Study space" },
  "quiz-maker": { to: "study", terms: ["quiz", "quiz maker", "make a quiz"], note: "Quiz is part of the Study space" },
  "lab-notes": { to: "study", terms: ["lab", "lab notes", "lab report", "lab write-up"], note: "Lab is part of the Study space" },
  citations: { to: "study", terms: ["citations", "citation", "reference list", "bibliography"], note: "Citations is part of the Study space" },
  "legal-cite": { to: "study", terms: ["cite", "case citation", "law citation"], note: "Cite is part of the Study space" },
  "formula-sheet": { to: "study", terms: ["formulas", "formula", "formula sheet"], note: "Formulas is part of the Study space" },
  // The 15 AI writing apps are modes of the Writing studio.
  "cold-email": { to: "write", terms: ["outreach", "cold email", "first email", "sales email"], note: "Outreach is part of Writing studio" },
  "ad-copy": { to: "write", terms: ["ads", "ad copy", "advert", "advertisement"], note: "Ads is part of Writing studio" },
  captions: { to: "write", terms: ["caption", "captions", "instagram caption"], note: "Captions is part of Writing studio" },
  listing: { to: "write", terms: ["listing", "product description"], note: "Listing is part of Writing studio" },
  letters: { to: "write", terms: ["letter", "letters", "formal letter", "complaint letter"], note: "Letters is part of Writing studio" },
  lesson: { to: "write", terms: ["lesson", "lesson plan", "lesson note"], note: "Lesson is part of Writing studio" },
  remarks: { to: "write", terms: ["remarks", "report card", "report comment", "report comments"], note: "Remarks is part of Writing studio" },
  outliner: { to: "write", terms: ["outline", "essay outline", "essay plan"], note: "Outline is part of Writing studio" },
  digest: { to: "write", terms: ["digest", "summary", "summarise", "summarize"], note: "Digest is part of Writing studio" },
  explainer: { to: "write", terms: ["explain", "explain code", "explainer"], note: "Explain is part of Writing studio" },
  "bug-scan": { to: "write", terms: ["bugs", "bug", "debug", "error message"], note: "Bugs is part of Writing studio" },
  "case-brief": { to: "write", terms: ["case brief", "case briefs"], note: "Case brief is part of Writing studio" },
  // Contract is not reviewed by a lawyer yet (review-notes.ts): found by its old name, never ahead of Agreement for "contract".
  "contract-scan": { to: "write", terms: ["contract summary", "contract scan", "contract reader"], note: "Contract is part of Writing studio" },
  "soap-note": { to: "write", terms: ["soap", "soap note", "soap notes", "patient notes"], note: "SOAP notes are part of Writing studio" },
  readme: { to: "write", terms: ["readme", "read me"], note: "README is part of Writing studio" },
};

/**
 * Everyday words, and the apps they should find, most relevant first.
 * Kept here rather than in the catalogue so catalogue text stays plain.
 */
export type SynonymGroup = { terms: readonly string[]; apps: readonly string[] };

export const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  {
    terms: ["invoice", "invoicing", "billing", "bill client", "receipt", "quote", "quotation", "estimate", "proposal", "payment", "get paid", "client", "freelance"],
    apps: ["invoice", "service-terms", "catalog", "ledger", "orders", "clauses"],
  },
  { terms: ["bill", "utility", "due"], apps: ["bill-watch", "split", "invoice", "ledger"] },
  {
    terms: ["budget", "budgeting", "expense", "spending", "spend", "money", "finance", "cash", "income", "cost", "costs", "personal finance"],
    apps: ["ledger", "bill-watch", "split", "pension"],
  },
  { terms: ["todo", "reminder", "task", "checklist", "agenda", "organise", "organize", "productivity", "routine", "deadline"], apps: ["tasks"] },
  { terms: ["schedule", "calendar", "appointment", "rota", "roster"], apps: ["tasks", "bookings", "visits", "shifts", "planner"] },
  { terms: ["cv", "resume", "résumé", "job", "application", "career", "linkedin", "cover letter", "hiring"], apps: ["apply", "write"] },
  { terms: ["json", "format", "formatter", "beautify", "prettify", "validate", "validator", "minify", "lint"], apps: ["json-fmt", "glyph"] },
  { terms: ["period", "menstrual", "menstruation", "ovulation", "fertility", "pms"], apps: ["cycle"] },
  { terms: ["qr", "qr code", "qrcode", "barcode"], apps: ["menu"] },
  { terms: ["recipe", "cook", "cooking", "food", "meal", "dish", "ingredient"], apps: ["recipes", "recipe-cost", "menu"] },
  { terms: ["note", "notepad", "memo", "jot"], apps: ["scratch", "write", "study", "memoir"] },
  { terms: ["contract", "agreement", "terms", "nda", "legal", "clause"], apps: ["service-terms", "write", "clauses"] },
  { terms: ["tax", "vat", "paye"], apps: ["paye"] },
  // "case brief" is Case brief's old name (a Writing studio mode, MERGED_NAMES), so it isn't repeated here.
  { terms: ["brief", "creative brief", "design brief"], apps: ["write", "creative-brief"] },
  { terms: ["price", "pricing", "price list"], apps: ["catalog", "menu", "farm-sales", "margin"] },
  { terms: ["inventory", "stock"], apps: ["stock"] },
  { terms: ["shop", "store", "sell", "seller", "ecommerce"], apps: ["orders", "write", "stock", "catalog", "wa-replies"] },
  { terms: ["medicine", "medication", "pill", "drug", "dosage"], apps: ["meds", "dose", "dose-ref"] },
  { terms: ["doctor", "clinic", "hospital"], apps: ["visits", "symptom-log", "meds"] },
  { terms: ["tip", "split bill", "share bill"], apps: ["split"] },
  { terms: ["video", "compress", "mp4", "shrink"], apps: ["compressor"] },
  { terms: ["colour", "color", "accessibility", "wcag", "palette"], apps: ["contrast", "mood"] },
  { terms: ["social media", "instagram", "tiktok", "content calendar", "post"], apps: ["planner", "write"] },
  { terms: ["email", "outreach", "cold email", "pitch"], apps: ["write"] },
  {
    terms: ["write", "writer", "writing", "draft", "copywriting", "copy", "ai writer", "ai writing", "essay", "summary", "explain", "letter", "lesson plan", "report card"],
    apps: ["write"],
  },
  { terms: ["scam", "fraud", "phishing", "fake"], apps: ["scam-check", "rumor-check"] },
  { terms: ["emergency", "ice", "sos"], apps: ["ice-card"] },
  {
    terms: ["flashcard", "flash card", "flashcards", "revision", "revise", "exam", "study", "studying", "quiz", "test myself", "practice questions", "spaced repetition", "anki"],
    apps: ["study"],
  },
  { terms: ["citation", "reference", "references", "bibliography", "apa", "mla", "chicago", "harvard", "works cited"], apps: ["study"] },
  { terms: ["formula", "formulas", "equation sheet", "physics", "engineering"], apps: ["study", "solver", "circuit", "units"] },
  { terms: ["pension", "retire", "retirement", "invest", "interest"], apps: ["pension"] },
  { terms: ["convert", "converter", "conversion"], apps: ["units"] },
  { terms: ["math", "maths", "equation", "graph"], apps: ["solver", "plot"] },
  { terms: ["whatsapp"], apps: ["wa-replies", "call-guide"] },
];

/** Words that carry no meaning on their own in a search ("send an invoice"). */
const STOPWORDS = new Set(["a", "an", "the", "and", "or", "for", "of", "to", "my", "me", "i", "in", "on", "with", "app", "apps", "tool", "tools"]);

// ---------------------------------------------------------------- Words

function fold(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Words people write apart or hyphenated that mean one thing ("to-do", "e-mail"). */
const JOINED: readonly [RegExp, string][] = [
  [/\bto[\s-]+do(s?)\b/g, "todo$1"],
  [/\be-mail/g, "email"],
];

/** Lower case, accents off, split on anything that isn't a letter or digit. */
export function tokens(text: string): string[] {
  return JOINED.reduce((out, [pattern, joined]) => out.replace(pattern, joined), fold(text))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

/** A light stem, so "invoices", "invoicing" and "invoice" meet. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && /(ss|x|z|ch|sh)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** The meaningful words of a query, in order (stopwords dropped unless that leaves nothing). */
export function searchWords(query: string): string[] {
  const all = tokens(query.slice(0, 80));
  const kept = all.filter((word) => !STOPWORDS.has(word));
  return kept.length ? kept : all;
}

/** Edit distance with adjacent swaps (Damerau, optimal string alignment), stopping early past `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) rows.push([i]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, rows[i - 2][j - 2] + 1);
      rows[i][j] = value;
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/** Typos are only forgiven on words of this length or more, so short queries stay precise. */
export const FUZZY_MIN = 5;

function allowedTypos(word: string): number {
  if (word.length < FUZZY_MIN) return 0;
  return word.length >= 9 ? 2 : 1;
}

// ---------------------------------------------------------------- Index

/** What search reads about one app. Community apps have only a name, blurb and pitch. */
export type SearchInput = {
  slug: string;
  name: string;
  pitch: string;
  blurb: string;
  features?: readonly string[];
  guide?: readonly string[];
  /** Section, audience, goal and in-app view labels. */
  labels?: readonly string[];
};

/** How a word matched, best first. Points are far apart so one tier never ties the next. */
const TIER = {
  nameWord: 100,
  namePrefix: 80,
  merged: 70,
  synonym: 60,
  pitch: 40,
  detail: 20,
} as const;
type Tier = keyof typeof TIER;

/** Typos lose this many points against the same match spelled right. */
const TYPO_COST = 15;
/** A whole query that is the app's name. */
const EXACT_NAME = 200;

type Phrase = { words: string[]; text: string };

type Entry = {
  input: SearchInput;
  nameKey: string;
  nameStems: string[];
  pitchStems: Set<string>;
  blurbStems: Set<string>;
  detailStems: Set<string>;
  /** Stem → a readable form of it, for "Matches: …". */
  display: Map<string, string>;
  merged: { phrase: Phrase; old: string }[];
  synonyms: { phrase: Phrase; rank: number }[];
};

export type SearchIndex = { entries: Entry[]; vocabulary: string[] };

function phrase(text: string): Phrase {
  return { words: tokens(text).map(stem), text };
}

function stemsOf(texts: readonly string[], display: Map<string, string>): Set<string> {
  const out = new Set<string>();
  for (const text of texts) {
    for (const word of tokens(text)) {
      const s = stem(word);
      out.add(s);
      if (!display.has(s)) display.set(s, word);
    }
  }
  return out;
}

export function createSearchIndex(items: readonly SearchInput[]): SearchIndex {
  const vocabulary = new Set<string>();
  const entries = items.map((input): Entry => {
    const display = new Map<string, string>();
    const nameStems = tokens(input.name).map(stem);
    tokens(input.name).forEach((word, i) => display.set(nameStems[i], word));
    const pitchStems = stemsOf([input.pitch], display);
    const blurbStems = stemsOf([input.blurb], display);
    const detailStems = stemsOf([...(input.features ?? []), ...(input.guide ?? []), ...(input.labels ?? [])], display);
    const merged = Object.entries(MERGED_NAMES)
      .filter(([, item]) => item.to === input.slug)
      .flatMap(([old, item]) => item.terms.map((term) => ({ phrase: phrase(term), old })));
    const synonyms = SYNONYM_GROUPS.flatMap((group) => {
      const rank = group.apps.indexOf(input.slug);
      return rank < 0 ? [] : group.terms.map((term) => ({ phrase: phrase(term), rank }));
    });
    for (const set of [nameStems, pitchStems, blurbStems, detailStems]) for (const s of set) vocabulary.add(s);
    for (const item of [...merged, ...synonyms]) for (const s of item.phrase.words) vocabulary.add(s);
    return { input, nameKey: tokens(input.name).map(stem).join(" "), nameStems, pitchStems, blurbStems, detailStems, display, merged, synonyms };
  });
  return { entries, vocabulary: [...vocabulary].sort() };
}

// ---------------------------------------------------------------- Matching

type WordHit = { tier: Tier; points: number; shown: string; typo: boolean };

/** Does a query stem meet a text stem? Exactly, or as the start of a longer word once it's long enough. */
function meets(query: string, text: string, prefixFrom: number): boolean {
  return text === query || (query.length >= prefixFrom && text.startsWith(query));
}

function anyMeets(query: string, stems: Iterable<string>, prefixFrom: number): string | undefined {
  for (const s of stems) if (meets(query, s, prefixFrom)) return s;
  return undefined;
}

/** Positions of `phrase` in the query stems (all of its words, in order). */
function phraseAt(query: string[], p: Phrase, prefixFrom: number): number {
  if (p.words.length === 0 || p.words.length > query.length) return -1;
  for (let start = 0; start + p.words.length <= query.length; start++) {
    if (p.words.every((word, k) => meets(query[start + k], word, prefixFrom))) return start;
  }
  return -1;
}

function better(a: WordHit | undefined, b: WordHit): WordHit {
  return !a || b.points > a.points ? b : a;
}

type AppHit = { hits: (WordHit | undefined)[]; note?: string };

function matchEntry(entry: Entry, stems: string[], typoOk: boolean[]): AppHit {
  const hits: (WordHit | undefined)[] = stems.map(() => undefined);
  let note: string | undefined;
  const set = (i: number, tier: Tier, shown: string, typo: boolean, bonus = 0) => {
    hits[i] = better(hits[i], { tier, points: TIER[tier] + bonus - (typo ? TYPO_COST : 0), shown, typo });
  };

  stems.forEach((q, i) => {
    const show = (s: string) => entry.display.get(s) ?? s;
    // Name: a whole word of the name, or the start of one.
    if (entry.nameStems.includes(q)) set(i, "nameWord", show(q), false);
    else {
      const prefix = anyMeets(q, entry.nameStems, 2);
      if (prefix) set(i, "namePrefix", show(prefix), false);
    }
    const inPitch = anyMeets(q, entry.pitchStems, 3);
    if (inPitch) set(i, "pitch", show(inPitch), false, 2);
    const inBlurb = anyMeets(q, entry.blurbStems, 3);
    if (inBlurb) set(i, "pitch", show(inBlurb), false);
    const inDetail = anyMeets(q, entry.detailStems, 3);
    if (inDetail) set(i, "detail", show(inDetail), false);
  });

  // Merged names and synonyms can be phrases ("focus timer", "price list").
  // The note names the old app whose longest name matched ("contract summary" → Contract, not Digest).
  let noteWords = 0;
  for (const item of entry.merged) {
    const at = phraseAt(stems, item.phrase, 4);
    if (at < 0) continue;
    for (let k = 0; k < item.phrase.words.length; k++) set(at + k, "merged", item.phrase.text, false);
    if (item.phrase.words.length > noteWords) {
      note = MERGED_NAMES[item.old].note;
      noteWords = item.phrase.words.length;
    }
  }
  for (const item of entry.synonyms) {
    const at = phraseAt(stems, item.phrase, 4);
    if (at < 0) continue;
    // Earlier apps in a group are more relevant; the bonus stays well under a tier's gap.
    for (let k = 0; k < item.phrase.words.length; k++) set(at + k, "synonym", item.phrase.text, false, Math.max(0, 8 - item.rank));
  }

  // Typos, only for words nothing matched exactly anywhere.
  stems.forEach((q, i) => {
    if (!typoOk[i] || hits[i]) return;
    const max = allowedTypos(q);
    const close = (s: string) => s.length >= 4 && editDistance(q, s, max) <= max;
    const nameHit = entry.nameStems.find(close);
    if (nameHit) {
      set(i, "nameWord", entry.display.get(nameHit) ?? nameHit, true);
      return;
    }
    for (const item of entry.merged) {
      if (item.phrase.words.length === 1 && close(item.phrase.words[0])) {
        set(i, "merged", item.phrase.text, true);
        note ??= MERGED_NAMES[item.old].note;
      }
    }
    for (const item of entry.synonyms) {
      if (item.phrase.words.length === 1 && close(item.phrase.words[0])) set(i, "synonym", item.phrase.text, true, Math.max(0, 8 - item.rank));
    }
    for (const [stems2, tier] of [
      [entry.pitchStems, "pitch"],
      [entry.blurbStems, "pitch"],
      [entry.detailStems, "detail"],
    ] as const) {
      for (const s of stems2) if (close(s)) set(i, tier, entry.display.get(s) ?? s, true);
    }
  });
  return { hits, note };
}

export type SearchHit = {
  slug: string;
  name: string;
  /** How many of the search words this app matched. */
  matched: number;
  points: number;
  /** "Quotes are part of Invoice", when the search named an app that was merged into this one. */
  note?: string;
  /** "Matches: quote", when the reason isn't plain from the name or pitch on the card. */
  why?: string;
};

export type SearchOutcome = {
  words: string[];
  hits: SearchHit[];
  /** True when no app matched every word, so these are the closest matches. */
  partial: boolean;
};

function compareText(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

export function searchIndex(index: SearchIndex, query: string): SearchOutcome {
  const words = searchWords(query);
  if (words.length === 0) return { words, hits: [], partial: false };
  const stems = words.map(stem);
  const queryKey = stems.join(" ");

  // A word gets typo help only when nothing anywhere has it, spelled as typed.
  const typoOk = stems.map(
    (q) =>
      allowedTypos(q) > 0 &&
      !index.vocabulary.some((s) => meets(q, s, 3)),
  );

  const scored: SearchHit[] = [];
  for (const entry of index.entries) {
    const { hits, note } = matchEntry(entry, stems, typoOk);
    const found = hits.filter((hit): hit is WordHit => Boolean(hit));
    if (found.length === 0) continue;
    let points = found.reduce((sum, hit) => sum + hit.points, 0);
    if (entry.nameKey === queryKey) points += EXACT_NAME;
    // The card shows the name and the pitch; a word found in neither gets a short reason.
    const plain = (i: number) => !hits[i]?.typo && (anyMeets(stems[i], entry.nameStems, 2) !== undefined || anyMeets(stems[i], entry.pitchStems, 3) !== undefined);
    const hidden = hits.filter((hit, i): hit is WordHit => Boolean(hit) && !plain(i));
    const shown = [...new Set(hidden.map((hit) => hit.shown.toLowerCase()))];
    const nameTypo = found.some((hit) => hit.typo && (hit.tier === "nameWord" || hit.tier === "namePrefix"));
    const why = note || shown.length === 0 || (nameTypo && hidden.length === 1) ? undefined : `Matches: ${shown.join(", ")}`;
    scored.push({ slug: entry.input.slug, name: entry.input.name, matched: found.length, points, note, why });
  }

  const every = scored.filter((hit) => hit.matched === words.length);
  const partial = every.length === 0 && scored.length > 0;
  const hits = (partial ? scored : every).sort(
    (a, b) => b.matched - a.matched || b.points - a.points || compareText(a.name, b.name) || compareText(a.slug, b.slug),
  );
  return { words, hits, partial };
}

/** One-off search, for tests and small callers. */
export function searchApps(items: readonly SearchInput[], query: string): SearchOutcome {
  return searchIndex(createSearchIndex(items), query);
}

// ---------------------------------------------------------------- Catalogue apps

/** Everything search reads about a catalogue app: pitch, blurb, features, guide and labels. */
export function catalogSearchInput(app: AppDef): SearchInput {
  const kit = getKit(app.slug);
  const views = kit && kit.kind === "tracker" ? [...(kit.views ?? []).map((view) => view.label), kit.qr?.title ?? ""] : [];
  const section = sectionOf(app.genre);
  return {
    slug: app.slug,
    name: app.name,
    pitch: pitchFor(app),
    blurb: app.blurb,
    features: app.features,
    guide: app.guide,
    labels: [
      ...views,
      GENERAL_APPS.has(app.slug) || !section ? "" : genreLabel(section),
      ...app.audiences.map(tagLabel),
      ...GOALS.filter((goal) => goal.target === app.slug).map((goal) => goal.label),
    ].filter(Boolean),
  };
}

export function catalogSearchInputs(): SearchInput[] {
  return APPS.map(catalogSearchInput);
}

/** Old slugs (APP_ALIASES) with no merged-name entry, or pointing somewhere else. Empty when all is well. */
export function mergedNameProblems(): string[] {
  const problems: string[] = [];
  for (const [old, alias] of Object.entries(APP_ALIASES)) {
    const merged = MERGED_NAMES[old];
    if (!merged) problems.push(`${old}: no merged name`);
    else if (merged.to !== alias.to) problems.push(`${old}: goes to ${merged.to}, alias says ${alias.to}`);
  }
  for (const old of Object.keys(MERGED_NAMES)) if (!Object.hasOwn(APP_ALIASES, old)) problems.push(`${old}: not an alias`);
  return problems;
}
