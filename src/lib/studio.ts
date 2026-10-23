/**
 * Writing studio (docs/phase3-plan.md, D3, D4 and D9; approved by the owner).
 *
 * One free app ("write") holds the 15 AI writing modes that used to be separate
 * apps. Kept free of React and of the database so the rules can be tested on
 * their own (scripts/studio.test.mjs):
 *  - MODES: each old app is a mode, with its old slug, fields (src/lib/writers)
 *    and AI rules (AI_SPECS in ai-write.server.ts, keyed by the same old slug,
 *    so the AI prompts and the shared daily allowance are unchanged).
 *  - Drafts: what you typed, an optional Source material box, and the text that
 *    was written (it used to be lost on leaving). Stored one row per draft
 *    (migrations/0024_writing_drafts.sql), never silently dropped.
 *  - History caps: free keeps up to FREE_HISTORY drafts per mode, Midnry Pass up
 *    to PASS_HISTORY. At the cap a new draft is refused with a clear message;
 *    nothing is deleted for you. SOAP notes keep a history only when turned on.
 *  - Pass extras (D4): longer history, Word (.docx) download, a saved house
 *    style. Same rule as every Pass feature: canOpenApp({ tier: "pass" }).
 *  - Import: each old app's saved boxes ({ values }) are copied in once as a
 *    draft titled "<Mode> (brought in)". The old documents are only read.
 *
 * Scratch (a Pass notepad) stays a separate app (D9).
 */
import { canOpenApp } from "@/lib/access";
import { valuesOf } from "@/lib/merges";
import { WRITERS, type Piece } from "@/lib/writers";

export const STUDIO_SLUG = "write";
export const STUDIO_NAME = "Writing studio";

export type ModeGroup = "Business" | "Teaching" | "Study" | "Professional" | "Developers";
export const MODE_GROUPS: readonly ModeGroup[] = ["Business", "Teaching", "Study", "Professional", "Developers"];

export type Mode = {
  /** The old app's slug: the AI rules, the quick writer and the old saved document all use it. */
  slug: string;
  /** ?view= on /apps/write, and the old link's target. */
  view: string;
  name: string;
  group: ModeGroup;
  blurb: string;
  /** Shown above the boxes, as the old app showed it. */
  note?: string;
  guide: readonly string[];
  /** Download extension: README is Markdown. */
  ext: "txt" | "md";
};

/** The 15 modes, grouped as in the plan. Text carried over from the old apps (src/lib/kits.ts). */
export const MODES: readonly Mode[] = [
  {
    slug: "cold-email",
    view: "outreach",
    name: "Outreach",
    group: "Business",
    blurb: "A short email from who you are and why you are writing.",
    guide: [
      "Add your name, what you do, and who you're writing to (for example: Ruth, event planner).",
      "Say what you can do for them, and why them if you know. Short phrases are fine.",
      "Pick one of three emails, or try another wording. Edit it, then send it yourself.",
    ],
    ext: "txt",
  },
  {
    slug: "ad-copy",
    view: "ads",
    name: "Ads",
    group: "Business",
    blurb: "Three short lines for one offer.",
    guide: ["Describe the product, who it is for, and the main benefit.", "Pick one of three ad lines, or try another wording.", "Edit it so every claim is true."],
    ext: "txt",
  },
  {
    slug: "captions",
    view: "captions",
    name: "Captions",
    group: "Business",
    blurb: "A caption from the product and the point of the photo.",
    guide: ["Say the product and what the photo shows.", "Pick one of three captions, with hashtags.", "Post the one that is true."],
    ext: "txt",
  },
  {
    slug: "listing",
    view: "listing",
    name: "Listing",
    group: "Business",
    blurb: "A product description from the facts you have.",
    guide: ["Enter the real facts: material, size, colour, and what is included.", "Copy the title and the description.", "Delete anything that is not true."],
    ext: "txt",
  },
  {
    slug: "letters",
    view: "letters",
    name: "Letters",
    group: "Business",
    blurb: "A formal letter from the points you list.",
    guide: ["Enter who it is from, who it is to, and the subject.", "Add what happened and what you are asking for.", "Put it on your own letterhead and check the facts."],
    ext: "txt",
  },
  {
    slug: "lesson",
    view: "lesson",
    name: "Lesson",
    group: "Teaching",
    blurb: "Objective, starter, main task, and a check. For one class.",
    guide: [
      "Enter the subject, topic, class, and lesson length.",
      "Press Write it for a timed plan with a starter, main task, and check.",
      "Try another wording for different activities, then edit it to your class.",
    ],
    ext: "txt",
  },
  {
    slug: "remarks",
    view: "remarks",
    name: "Remarks",
    group: "Teaching",
    blurb: "A report-card sentence from a name and two notes.",
    note: "Learners' first names are kept in your saved drafts. Delete a draft when you no longer need it.",
    guide: ["Enter the learner's first name.", "Add one strength and one next step.", "Pick one of three sentences and edit it so it sounds like you."],
    ext: "txt",
  },
  {
    slug: "outliner",
    view: "outline",
    name: "Outline",
    group: "Study",
    blurb: "A thesis and three parts for an essay. It outlines; you write the essay.",
    guide: ["Write the essay question, and your answer if you have one.", "Add your main points, or let Outline suggest a structure.", "Edit the outline, then find the sources yourself."],
    ext: "txt",
  },
  {
    slug: "digest",
    view: "digest",
    name: "Digest",
    group: "Study",
    blurb: "A short summary of something you paste.",
    guide: ["Paste the passage.", "Read the summary, the key points, and the key terms.", "Try another wording for a shorter or longer summary. Check it against the original."],
    ext: "txt",
  },
  {
    slug: "explainer",
    view: "explain",
    name: "Explain",
    group: "Study",
    blurb: "Says what a snippet of code does, in plain language.",
    guide: ["Paste a short snippet of code.", "Press Write it for an overview and a line-by-line explanation.", "Copy the explanation, or edit it before you use it."],
    ext: "txt",
  },
  {
    slug: "bug-scan",
    view: "bugs",
    name: "Bugs",
    group: "Study",
    blurb: "Points at likely bugs. You still run the code.",
    guide: ["Paste the code and, if you have it, the error message.", "Read what the error means and the likely problems, with line numbers.", "Fix one thing at a time and test it yourself."],
    ext: "txt",
  },
  {
    slug: "case-brief",
    view: "case-brief",
    name: "Case brief",
    group: "Study",
    blurb: "Turns a case into facts, issue, holding, and reason. A study aid, not advice.",
    note: "A draft for study. It is not a legal opinion.",
    guide: [
      "Fill the case name, the facts, and what the court decided.",
      "Press Write it to get a brief with Facts, Issue, Holding, and Reasoning.",
      "Check every line against the judgment before you rely on it.",
    ],
    ext: "txt",
  },
  {
    slug: "contract-scan",
    view: "contract",
    name: "Contract",
    group: "Professional",
    blurb: "A plain summary of a contract you paste. Not an opinion.",
    note: "A reading aid. It is not legal advice and it can miss a clause.",
    guide: ["Paste the contract.", "Read the parties, money, dates, duties, how it ends, and terms to watch.", "Read the whole contract again before you sign anything."],
    ext: "txt",
  },
  {
    slug: "soap-note",
    view: "soap",
    name: "SOAP notes",
    group: "Professional",
    blurb: "Subjective, objective, assessment, plan. A formatter, not a record system.",
    note: "Do not put a real patient's identifying details in here.",
    guide: ["Fill the four parts without names or file numbers.", "Press Write it for a tidy SOAP note.", "Copy it into the real record system yourself."],
    ext: "txt",
  },
  {
    slug: "readme",
    view: "readme",
    name: "README",
    group: "Developers",
    blurb: "A README from the project name and what it does.",
    guide: ["Enter the project name and what it does.", "Add how to install and run it.", "Copy the Markdown and delete anything that is not true."],
    ext: "md",
  },
];

/** The old app slugs, now modes of the studio. Their saved documents are kept (merged-docs.ts, tier free). */
export const MODE_SLUGS: readonly string[] = MODES.map((mode) => mode.slug);

export function modeBySlug(slug: unknown): Mode | undefined {
  return typeof slug === "string" ? MODES.find((mode) => mode.slug === slug) : undefined;
}

export function modeByView(view: unknown): Mode | undefined {
  return typeof view === "string" ? MODES.find((mode) => mode.view === view) : undefined;
}

export const DEFAULT_MODE = MODES[0];

/** SOAP notes: history is off unless the person turns it on (patient details; plan 2.2). */
export const SOAP_SLUG = "soap-note";

// ---------------------------------------------------------------- Access and caps

/** Drafts kept per mode. At the cap a new draft is refused; nothing is ever dropped. */
export const FREE_HISTORY = 20;
export const PASS_HISTORY = 500;

/** The Pass extras (longer history, Word download, house style): Pass or admin, like every Pass feature. */
export function studioExtrasOpen(hasPass: boolean, isAdmin = false): boolean {
  return canOpenApp({ tier: "pass" }, hasPass, isAdmin);
}

/** How many drafts one mode may keep. SOAP notes keep one unless history is on. */
export function historyCap(mode: string, opts: { hasPass: boolean; isAdmin?: boolean; soapHistory?: boolean }): number {
  if (mode === SOAP_SLUG && !opts.soapHistory) return 1;
  return studioExtrasOpen(opts.hasPass, opts.isAdmin) ? PASS_HISTORY : FREE_HISTORY;
}

// ---------------------------------------------------------------- Drafts

export type WrittenBy = "ai" | "quick";

export type Draft = {
  id: string;
  /** The mode's old slug. */
  mode: string;
  title: string;
  /** True once the person typed their own title; otherwise it follows the first box. */
  titleSet: boolean;
  values: Record<string, string>;
  /** Notes, an advert or a passage to work from. Sent to the AI (up to SOURCE_TO_AI characters). */
  source: string;
  /** The written text, one piece per section (Email 1, Email 2…), editable. */
  pieces: Piece[];
  /** Who wrote `pieces`, and when (ISO). Null before anything is written. */
  by: WrittenBy | null;
  writtenAt: string | null;
  /** "Try another wording" count, so the quick writer moves on. */
  variant: number;
  /** "cold-email" when copied in from the old app. */
  from?: string;
  createdAt: string;
  updatedAt: string;
};

/** A row in the drafts list. */
export type DraftSummary = { id: string; mode: string; title: string; by: WrittenBy | null; updatedAt: string; revision: number };

/**
 * One draft's limit, in characters of JSON. A draft holds at most 20 boxes of
 * up to 15,000 characters (the AI's own cap per box), a source box of up to
 * 20,000 and the written text; in practice a long one (a pasted contract plus
 * its summary) is 15,000–40,000. 100,000 is the size a whole app document had
 * before, and keeps one person's worst case bounded.
 */
export const DRAFT_LIMIT = 100_000;
export const FIELD_MAX = 15_000;
export const SOURCE_MAX = 20_000;
/** What goes to the AI from the source box (the same cap as the long reader modes). */
export const SOURCE_TO_AI = 14_000;
export const PIECE_MAX = 30_000;
/**
 * The most pieces one draft keeps. The widest writer is Contract, whose quick
 * writer returns seven (parties, four parts, watch-for, before you sign).
 */
export const PIECES_MAX = 8;
export const TITLE_MAX = 120;

export function blankDraft(mode: string, id: string, now: string): Draft {
  return { id, mode, title: "", titleSet: false, values: {}, source: "", pieces: [], by: null, writtenAt: null, variant: 0, createdAt: now, updatedAt: now };
}

/** True when the draft holds anything worth saving. */
export function hasContent(draft: Pick<Draft, "values" | "source" | "pieces">): boolean {
  return Object.values(draft.values).some((value) => value.trim()) || Boolean(draft.source.trim()) || draft.pieces.some((piece) => piece.text.trim());
}

/** The title from the first box with text ("Ruth, event planner"), or "Outreach draft". */
export function autoTitle(mode: string, values: Record<string, string>): string {
  const writer = WRITERS[mode];
  const name = modeBySlug(mode)?.name ?? "Writing";
  for (const field of writer?.fields ?? []) {
    const line = (values[field.id] ?? "").split("\n").find((part) => part.trim());
    if (line) return clip(line.trim().replace(/\s+/g, " "), 60);
  }
  return `${name} draft`;
}

export function draftTitle(draft: Pick<Draft, "mode" | "title" | "titleSet" | "values">): string {
  return draft.titleSet && draft.title.trim() ? draft.title.trim() : autoTitle(draft.mode, draft.values);
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const ID = /^[A-Za-z0-9-]{6,64}$/;
const KEY = /^[a-z]{1,20}$/;

export type CleanResult = { ok: true; draft: Draft } | { ok: false; error: "invalid" | "too_large" };

/**
 * A draft from the browser, checked and trimmed to the limits. Unknown modes,
 * bad ids and odd shapes are refused; over-long boxes are refused, not cut, so
 * nothing is lost without the person seeing it.
 */
export function cleanDraft(input: unknown): CleanResult {
  if (!input || typeof input !== "object") return { ok: false, error: "invalid" };
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== "string" || !ID.test(raw.id) || !modeBySlug(raw.mode)) return { ok: false, error: "invalid" };
  const values: Record<string, string> = {};
  if (raw.values && typeof raw.values === "object" && !Array.isArray(raw.values)) {
    const entries = Object.entries(raw.values as Record<string, unknown>);
    if (entries.length > 20) return { ok: false, error: "invalid" };
    for (const [key, value] of entries) {
      if (!KEY.test(key) || typeof value !== "string") return { ok: false, error: "invalid" };
      if (value.length > FIELD_MAX) return { ok: false, error: "too_large" };
      if (value) values[key] = value;
    }
  }
  const source = typeof raw.source === "string" ? raw.source : "";
  if (source.length > SOURCE_MAX) return { ok: false, error: "too_large" };
  const pieces: Piece[] = [];
  if (Array.isArray(raw.pieces)) {
    if (raw.pieces.length > PIECES_MAX) return { ok: false, error: "invalid" };
    for (const piece of raw.pieces) {
      if (!piece || typeof piece.title !== "string" || typeof piece.text !== "string") return { ok: false, error: "invalid" };
      if (piece.text.length > PIECE_MAX) return { ok: false, error: "too_large" };
      pieces.push({ title: piece.title.slice(0, 60), text: piece.text });
    }
  }
  const by = raw.by === "ai" || raw.by === "quick" ? raw.by : null;
  const iso = (value: unknown) => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null);
  const now = new Date().toISOString();
  const draft: Draft = {
    id: raw.id,
    mode: raw.mode as string,
    title: typeof raw.title === "string" ? raw.title.slice(0, TITLE_MAX) : "",
    titleSet: raw.titleSet === true,
    values,
    source,
    pieces,
    by: pieces.length ? by : null,
    writtenAt: pieces.length ? iso(raw.writtenAt) : null,
    variant: Number.isInteger(raw.variant) ? Math.max(0, Math.min(50, raw.variant as number)) : 0,
    ...(typeof raw.from === "string" && modeBySlug(raw.from) ? { from: raw.from } : {}),
    createdAt: iso(raw.createdAt) ?? now,
    updatedAt: iso(raw.updatedAt) ?? now,
  };
  if (JSON.stringify(draft).length > DRAFT_LIMIT) return { ok: false, error: "too_large" };
  return { ok: true, draft };
}

/** A saved draft read back from the database; anything unreadable becomes an empty draft of its mode. */
export function parseDraft(payload: string, fallback: { id: string; mode: string; updatedAt: string }): Draft {
  try {
    const result = cleanDraft({ ...JSON.parse(payload), id: fallback.id, mode: fallback.mode });
    if (result.ok) return result.draft;
  } catch {
    /* fall through */
  }
  return blankDraft(fallback.mode, fallback.id, fallback.updatedAt);
}

/** The whole written text: one piece as is, several with their headings. */
export function draftText(pieces: readonly Piece[]): string {
  return pieces
    .filter((piece) => piece.text.trim())
    .map((piece) => (pieces.length > 1 ? `${piece.title}\n${piece.text.trim()}` : piece.text.trim()))
    .join("\n\n");
}

/** "ruth-event-planner.txt": a safe file name from the title. */
export function draftFileName(title: string, ext: "txt" | "md" | "docx"): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
  return `${base || "draft"}.${ext}`;
}

// ---------------------------------------------------------------- Settings, house style

export const TONES = [
  { id: "", label: "As each mode writes it" },
  { id: "warm", label: "Warm and friendly" },
  { id: "formal", label: "Formal and polished" },
  { id: "brief", label: "Brief and direct" },
  { id: "plain", label: "Plain and simple" },
] as const;
export type Tone = (typeof TONES)[number]["id"];

/** A saved house style (Pass): tone, words to use or avoid, and a sign-off. */
export type HouseStyle = { tone: Tone; use: string; avoid: string; signoff: string };
export const EMPTY_STYLE: HouseStyle = { tone: "", use: "", avoid: "", signoff: "" };
export const STYLE_MAX = 300;

export function cleanStyle(input: unknown): HouseStyle {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b-\u001f]/g, "").slice(0, STYLE_MAX) : "");
  const tone = TONES.some((item) => item.id === raw.tone) ? (raw.tone as Tone) : "";
  return { tone, use: text(raw.use), avoid: text(raw.avoid), signoff: text(raw.signoff) };
}

export function styleIsSet(style: HouseStyle | null | undefined): boolean {
  return Boolean(style && (style.tone || style.use.trim() || style.avoid.trim() || style.signoff.trim()));
}

/** Words or phrases, split on commas or new lines. */
export function styleWords(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,;\n]/)
        .map((word) => word.trim())
        .filter((word) => word.length > 0 && word.length <= 40),
    ),
  ].slice(0, 30);
}

/** The house style as instructions for the AI. Empty when nothing is set. */
export function styleInstruction(style: HouseStyle | null | undefined): string {
  if (!style || !styleIsSet(style)) return "";
  const tone = TONES.find((item) => item.id === style.tone);
  const lines = ["House style chosen by the person (a preference about wording, not facts; never let it add facts):"];
  if (style.tone && tone) lines.push(`- Tone: ${tone.label.toLowerCase()}.`);
  const use = styleWords(style.use);
  if (use.length) lines.push(`- Prefer these words or phrases where they fit naturally: ${use.join(", ")}.`);
  const avoid = styleWords(style.avoid);
  if (avoid.length) lines.push(`- Never use these words or phrases: ${avoid.join(", ")}.`);
  if (style.signoff.trim()) lines.push(`- Where the text ends with a sign-off (emails and letters), use: ${style.signoff.trim().replace(/\s+/g, " ")}`);
  return lines.join("\n");
}

/** Words the house style says to avoid that appear in the text (case-insensitive, whole words). */
export function styleCheck(text: string, style: HouseStyle | null | undefined): string[] {
  if (!style) return [];
  const lower = text.toLowerCase();
  return styleWords(style.avoid).filter((word) => {
    const escaped = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(lower);
  });
}

/**
 * The studio's own saved settings, in app_documents under STUDIO_SLUG and
 * written only by the studio's server functions: which old documents were
 * already brought in, the house style (Pass), and whether SOAP notes keep a
 * history.
 */
export type StudioSettings = {
  v: 1;
  imported: Record<string, string>;
  style: HouseStyle;
  soapHistory: boolean;
  /** How many drafts were brought in and not yet acknowledged ("We brought in 2 saved forms"). */
  notice: number;
};

export function parseSettings(payload: string | null | undefined): StudioSettings {
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = payload ? JSON.parse(payload) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed as Record<string, unknown>;
  } catch {
    /* empty settings */
  }
  const imported: Record<string, string> = {};
  if (raw.imported && typeof raw.imported === "object") {
    for (const [slug, when] of Object.entries(raw.imported as Record<string, unknown>)) if (modeBySlug(slug) && typeof when === "string") imported[slug] = when;
  }
  const notice = Number.isInteger(raw.notice) && (raw.notice as number) > 0 ? Math.min(raw.notice as number, 15) : 0;
  return { v: 1, imported, style: cleanStyle(raw.style), soapHistory: raw.soapHistory === true, notice };
}

// ---------------------------------------------------------------- Bringing old documents in

export type ImportPlan = {
  /** New drafts, one per old app that had saved boxes. */
  drafts: Draft[];
  /** Old slugs to mark as done (every one looked at, empty or not), so this runs once. */
  done: string[];
};

/** The id of the draft copied from an old app, so a second run can never add it twice. */
export function importedId(slug: string): string {
  return `from-${slug}`;
}

/**
 * Drafts copied from the old apps' saved documents ({ values }). Only old
 * slugs not yet marked in `imported` are looked at. Old documents are only
 * read; the caller never writes or deletes them.
 */
export function planImport(payloads: Record<string, string | null>, imported: Record<string, string>, now: string): ImportPlan {
  const drafts: Draft[] = [];
  const done: string[] = [];
  for (const mode of MODES) {
    if (Object.hasOwn(imported, mode.slug) || !Object.hasOwn(payloads, mode.slug)) continue;
    done.push(mode.slug);
    const values = valuesOf(payloads[mode.slug]);
    const kept = Object.fromEntries(Object.entries(values).filter(([key, value]) => KEY.test(key) && value.length <= FIELD_MAX).slice(0, 20));
    if (Object.keys(kept).length === 0) continue;
    drafts.push({
      ...blankDraft(mode.slug, importedId(mode.slug), now),
      title: `${mode.name} (brought in)`,
      titleSet: true,
      values: kept,
      from: mode.slug,
    });
  }
  return { drafts, done };
}

// ---------------------------------------------------------------- AI allowance wording

export type Allowance = {
  /** False when the site has no AI key: every mode uses the quick writer. */
  ai: boolean;
  /** Null for admins (no limit). */
  limit: number | null;
  left: number | null;
  hasPass: boolean;
};

/** "3 of 5 AI writes left today." */
export function allowanceLine(allowance: Allowance | null): string {
  if (!allowance) return "";
  if (!allowance.ai) return "AI writing is off right now, so Midnry's quick writer writes every mode on your device, with no limit.";
  if (allowance.limit === null) return "AI writes: no daily limit on this account.";
  const left = allowance.left ?? 0;
  if (left === 0) return `You've used today's ${allowance.limit} AI writes. Midnry's quick writer still writes every mode. AI writes reset at 1 am Nigeria time (midnight GMT).`;
  return `${left} of ${allowance.limit} AI ${allowance.limit === 1 ? "write" : "writes"} left today, shared across every mode. They reset at 1 am Nigeria time (midnight GMT).`;
}
