import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { APPS, getApp, type AppDef } from "@/lib/catalog";
import { accessLabel } from "@/lib/plans";
import { pitchFor } from "@/lib/pitches";
import { isUnreviewed } from "@/lib/review-notes";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppMark } from "@/components/app-mark";
import { Button, TextArea, buttonClass, cn } from "@/components/ui";

const KEY = "midnry.match";

// Question 1: what fills someone's days. Several can be true at once, and none
// of them is an age or a job title. It only decides which ideas come first.
type LifeId = "study" | "job" | "self" | "sell" | "care" | "pace" | "seeking" | "other";
type GroupId = "study" | "work" | "business" | "everyday";

const LIVES: { id: LifeId; label: string; detail: string; groups: GroupId[]; reason: string; top: string[] }[] = [
  { id: "study", label: "Studying or training", detail: "School, university, a course, or an apprenticeship.", groups: ["study"], reason: "you’re studying", top: ["revise", "essay", "calc", "focus", "lab", "code-learn", "law-study"] },
  { id: "job", label: "Working a job", detail: "Employed, on shifts, or on contract.", groups: ["work"], reason: "you’re working a job", top: ["organise", "outreach", "accounts", "legal", "teach", "care-work"] },
  { id: "self", label: "Working for myself", detail: "Freelance, a side hustle, or my own business.", groups: ["business", "work"], reason: "you’re working for yourself", top: ["invoice", "spend", "outreach", "organise", "bookings", "legal"] },
  { id: "sell", label: "Selling things", detail: "A shop, online, at a market, or from a farm.", groups: ["business"], reason: "you’re selling things", top: ["stock", "online", "invoice", "spend", "food", "farm"] },
  { id: "care", label: "Looking after family or a home", detail: "Children, a partner, parents, or the house.", groups: ["everyday"], reason: "you look after family or a home", top: ["day", "money", "health", "family", "hobby", "scam"] },
  { id: "pace", label: "Retired, or taking life at my own pace", detail: "Time for health, people, and things I enjoy.", groups: ["everyday"], reason: "you’re taking life at your own pace", top: ["health", "family", "scam", "hobby", "money", "play"] },
  { id: "seeking", label: "Looking for work", detail: "Applications, a resume, or a change of field.", groups: ["work"], reason: "you’re looking for work", top: ["job-hunt", "outreach", "organise", "money", "focus", "creative"] },
  { id: "other", label: "Something else", detail: "None of these fit, and that is fine.", groups: [], reason: "", top: [] },
];

/** Where to start when the first answer was skipped or was "Something else". */
const DEFAULT_TOP = ["organise", "invoice", "spend", "job-hunt", "health", "essay"];

/** How many second-question options show before "More options". */
const SHORT_LIST = 6;

const GROUPS: { id: GroupId; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "work", label: "Work" },
  { id: "business", label: "A business" },
  { id: "everyday", label: "Everyday life" },
];

/** Results can point at the games hub as well as at apps. */
const GAMES = "games";

// Question 2: what they want a hand with. Each task lists the apps that do
// that job, best fit first. Slugs are checked against the catalogue below.
type Task = { id: string; group: GroupId; label: string; apps: string[]; /** Finishes "Because you …". */ why: string };

const TASKS: Task[] = [
  { id: "revise", group: "study", label: "Revising: flashcards and practice quizzes", apps: ["study"], why: "want to revise with flashcards and practice quizzes" },
  { id: "calc", group: "study", label: "Maths, physics, or engineering calculations", apps: ["units", "solver", "circuit", "study"], why: "want help with maths, physics, or engineering sums" },
  { id: "lab", group: "study", label: "Lab reports, science formulas, or graphs", apps: ["study", "solver", "plot"], why: "want help with lab reports and graphs" },
  { id: "law-study", group: "study", label: "Law cases or citations", apps: ["write", "study"], why: "want help with law cases and citations" },
  { id: "biz-study", group: "study", label: "Business, economics, or accounting coursework", apps: ["ratios", "statements", "breakeven"], why: "want help with business or accounting coursework" },
  { id: "code-learn", group: "study", label: "Understanding code, or finding a bug", apps: ["write", "algo"], why: "want to understand code or find a bug" },
  { id: "essay", group: "study", label: "Essays, sources, or summing up long reading", apps: ["write", "study"], why: "want help with essays and sources" },
  { id: "focus", group: "study", label: "Staying focused and on top of tasks", apps: ["tasks", "scratch"], why: "want to stay focused and on top of tasks" },

  { id: "organise", group: "work", label: "Reminders, to-dos, and planning my week", apps: ["tasks", "scratch"], why: "want to plan your week" },
  { id: "teach", group: "work", label: "Lesson plans, quizzes, or report comments", apps: ["write", "study"], why: "want help with lessons, quizzes, or report comments" },
  { id: "care-work", group: "work", label: "Patient notes or shift lists", apps: ["write", "shifts"], why: "want help with patient notes or shifts" },
  { id: "ship-code", group: "work", label: "Writing code: JSON, regex, or a README", apps: ["json-fmt", "regex", "write", "glyph"], why: "want help writing code" },
  { id: "outreach", group: "work", label: "Emails, ads, proposals, or a year of posts", apps: ["write", "invoice", "planner"], why: "want to write emails, ads, or proposals" },
  { id: "job-hunt", group: "work", label: "A resume or job applications", apps: ["apply", "write"], why: "want help with a resume or applications" },
  { id: "accounts", group: "work", label: "Budgets or reconciling accounts", apps: ["reconcile", "ledger"], why: "want help with budgets or accounts" },
  { id: "legal", group: "work", label: "Formal letters", apps: ["write"], why: "want help with formal letters" },
  { id: "creative", group: "work", label: "Design briefs, colours, or video", apps: ["creative-brief", "mood", "contrast", "compressor"], why: "want help with design briefs, colour, or video" },

  { id: "invoice", group: "business", label: "Invoices or quotes", apps: ["invoice"], why: "want to send invoices or quotes" },
  { id: "stock", group: "business", label: "Stock, prices, and profit", apps: ["stock", "catalog", "margin"], why: "want to track stock, prices, and profit" },
  { id: "food", group: "business", label: "A menu, or what a dish costs to make", apps: ["menu", "recipe-cost"], why: "want to cost a menu or a dish" },
  { id: "bookings", group: "business", label: "Bookings, a product catalog, or captions", apps: ["bookings", "catalog", "write"], why: "want to take bookings or show your products" },
  { id: "online", group: "business", label: "Online orders, listings, or WhatsApp replies", apps: ["orders", "write", "wa-replies"], why: "want to handle online orders and replies" },
  { id: "farm", group: "business", label: "Harvest, crop prices, or farm sales", apps: ["yield", "farm-sales"], why: "want to track harvests and farm sales" },
  { id: "spend", group: "business", label: "Knowing where the money goes", apps: ["ledger", "statements", "margin"], why: "want to know where the money goes" },

  { id: "day", group: "everyday", label: "Organising my day: reminders and to-dos", apps: ["tasks", "scratch"], why: "want to organise your day" },
  { id: "health", group: "everyday", label: "Medicines or appointments", apps: ["meds", "visits"], why: "want to keep track of medicines and appointments" },
  { id: "period", group: "everyday", label: "Tracking my period", apps: ["cycle"], why: "want to track your period" },
  { id: "habits", group: "everyday", label: "Building daily habits", apps: ["tasks"], why: "want to build daily habits" },
  { id: "scam", group: "everyday", label: "Checking whether a message is a scam", apps: ["scam-check", "rumor-check", "ice-card"], why: "want to check whether a message is a scam" },
  { id: "family", group: "everyday", label: "Staying in touch: voice notes, photos, or calls", apps: ["voice-note", "call-guide", "clearer"], why: "want to stay in touch with family" },
  { id: "money", group: "everyday", label: "Household money: bills, savings, or splitting costs", apps: ["ledger", "split", "bill-watch", "pension"], why: "want to manage household money" },
  { id: "hobby", group: "everyday", label: "Cooking, reading aloud, or writing down memories", apps: ["recipes", "read-aloud", "memoir"], why: "want help with cooking, reading, or memories" },
  { id: "play", group: "everyday", label: "Something to play", apps: [GAMES], why: "want something to play" },
];

const MAX_RESULTS = 5;
/** Fewer than this, and the first answer tops the list up with related apps. */
const MIN_RESULTS = 3;

type Saved = { lives: LifeId[]; picked: string[]; extra: string; results: string[] };

function firstName(displayName: string | null): string {
  const raw = displayName?.trim() ?? "";
  if (!raw || raw.toLowerCase() === "dev user") return "";
  return raw.split(/\s+/)[0] ?? "";
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const STOP = new Set(["about", "and", "for", "from", "have", "help", "into", "just", "like", "more", "need", "some", "that", "the", "them", "this", "what", "when", "with", "want", "would", "your", "keep", "make", "track"]);

// Tools not yet reviewed by a professional (src/lib/review-notes.ts) are never suggested here.
const HAYSTACK = new Map(
  APPS.filter((app) => !isUnreviewed(app.slug)).map((app) => [app.slug, [app.name, app.blurb, pitchFor(app), ...app.features].join(" ").toLowerCase()]),
);

const taskById = (id: string) => TASKS.find((task) => task.id === id);
const lifeById = (id: LifeId) => LIVES.find((item) => item.id === id);

// Words someone typed, matched against each app's name, purpose and features.
function fromWords(text: string): Map<string, number> {
  const words = [...new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? [])].filter((word) => !STOP.has(word));
  const scores = new Map<string, number>();
  if (words.length === 0) return scores;
  for (const [slug, haystack] of HAYSTACK) {
    const hits = words.filter((word) => new RegExp(`\\b${word}`).test(haystack)).length;
    if (hits > 0) scores.set(slug, hits);
  }
  return scores;
}

/**
 * The short list for question 2: the top ideas for each first answer, taken in
 * turn so several answers each get a place, best first. Ideas already picked
 * always stay visible.
 */
function shortList(lives: LifeId[], picked: string[]): string[] {
  const tops = lives.map((id) => lifeById(id)?.top ?? []).filter((top) => top.length > 0);
  const lists = tops.length > 0 ? tops : [DEFAULT_TOP];
  const order: string[] = [];
  const longest = Math.max(...lists.map((list) => list.length));
  for (let i = 0; i < longest; i += 1) {
    for (const list of lists) {
      const id = list[i];
      if (id && !order.includes(id) && taskById(id)) order.push(id);
    }
  }
  const kept = picked.filter((id) => taskById(id));
  const fill = order.filter((id) => !kept.includes(id));
  return [...kept, ...fill].slice(0, Math.max(SHORT_LIST, kept.length));
}

type Match = { slug: string; reason: string };

/** A first answer that explains this task, if one does ("you’re working for yourself"). */
function lifeFor(task: Task, lives: LifeId[]): string {
  const life = lives
    .map(lifeById)
    .find((item) => item && item.reason && (item.top.includes(task.id) || item.groups.includes(task.group)));
  return life?.reason ?? "";
}

function reasonFor(task: Task, lives: LifeId[], inferred: boolean): string {
  const life = lifeFor(task, lives);
  if (inferred) return life ? `Because ${life}. Handy if you ${task.why}.` : `A good place to start if you ${task.why}.`;
  return life ? `Because ${life} and ${task.why}.` : `Because you ${task.why}.`;
}

function rank(lives: LifeId[], picked: string[], extra: string): Match[] {
  const score = new Map<string, number>();
  const reason = new Map<string, { strength: number; text: string; again: string }>();
  const note = (slug: string, strength: number, text: string, again = text) => {
    const current = reason.get(slug);
    if (!current || strength > current.strength) reason.set(slug, { strength, text, again });
  };
  const add = (tasks: Task[], weight: number, inferred: boolean) => {
    for (const task of tasks) {
      task.apps.forEach((slug, index) => {
        const points = Math.max(3 - index, 1) * weight;
        score.set(slug, (score.get(slug) ?? 0) + points);
        note(slug, points, reasonFor(task, lives, inferred), `Another option if you ${task.why}.`);
      });
    }
  };

  const chosen = TASKS.filter((task) => picked.includes(task.id));
  add(chosen, 2, false);

  const typed = extra.trim();
  const typedHits = [...fromWords(typed).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  for (const [slug, hits] of typedHits) {
    score.set(slug, (score.get(slug) ?? 0) + Math.min(hits, 3));
    if (!reason.has(slug)) note(slug, 0, `Because you wrote “${typed.length > 60 ? `${typed.slice(0, 57)}…` : typed}”.`);
  }

  const paid = (slug: string) => (getApp(slug)?.tier === "pass" ? 1 : 0);
  const order = (slug: string) => (slug === GAMES ? -1 : APPS.findIndex((app) => app.slug === slug));
  const sorted = () =>
    [...score.entries()]
      .filter(([slug]) => slug === GAMES || (getApp(slug) && !isUnreviewed(slug)))
      // Ties: free apps first (they open with just an account), then catalogue order.
      .sort((a, b) => b[1] - a[1] || paid(a[0]) - paid(b[0]) || order(a[0]) - order(b[0]))
      .map(([slug]) => slug);

  let slugs = sorted().slice(0, MAX_RESULTS);
  // Skipped the second question, or too few matches: the first answer suggests a few more.
  // With no usable first answer and nothing else to go on, the popular starting points stand in.
  const related = lives.some((id) => (lifeById(id)?.top.length ?? 0) > 0) || (chosen.length === 0 && !typed);
  if (slugs.length < MIN_RESULTS && related) {
    const ideas = shortList(lives, []).map(taskById).filter((task): task is Task => task !== undefined && !picked.includes(task.id));
    const before = new Set(slugs);
    const extraScores = new Map<string, number>();
    for (const task of ideas.slice(0, 3)) {
      const slug = task.apps.find((item) => !before.has(item) && !extraScores.has(item) && (item === GAMES || getApp(item)));
      if (!slug) continue;
      extraScores.set(slug, 1);
      note(slug, 0.1, reasonFor(task, lives, true), `Another option if you ${task.why}.`);
    }
    slugs = [...slugs, ...extraScores.keys()].slice(0, Math.max(MIN_RESULTS, slugs.length));
  }
  // The same sentence twice reads like filler: later apps for the same need say so differently.
  const used = new Set<string>();
  return slugs.map((slug) => {
    const entry = reason.get(slug);
    if (!entry) return { slug, reason: "" };
    const text = used.has(entry.text) ? entry.again : entry.text;
    used.add(entry.text);
    return { slug, reason: text };
  });
}

function readSaved(): Saved | null {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<Saved>;
    const lives = Array.isArray(parsed.lives) ? parsed.lives.filter((id): id is LifeId => LIVES.some((item) => item.id === id)) : [];
    const picked = Array.isArray(parsed.picked) ? parsed.picked.filter((id) => TASKS.some((task) => task.id === id)) : [];
    const extra = typeof parsed.extra === "string" ? parsed.extra.slice(0, 200) : "";
    // Earlier versions saved subject sections, not apps: work the apps out again from the answers.
    const results = Array.isArray(parsed.results)
      ? parsed.results.filter((slug): slug is string => typeof slug === "string" && (slug === GAMES || (Boolean(getApp(slug)) && !isUnreviewed(slug))))
      : rank(lives, picked, extra).map((match) => match.slug);
    return results.length > 0 ? { lives, picked, extra, results } : null;
  } catch {
    return null;
  }
}

type Step = "life" | "tasks" | "result";

/**
 * "Help me choose": two quick questions, then a few apps that fit, each with
 * the reason it fits, its access label, and a link to its product page.
 * Answers stay in this browser.
 */
export function MatchQuiz({ startSignal = 0 }: { /** Bump to start the questions from elsewhere on the page. */ startSignal?: number } = {}) {
  const { user } = useCurrentUserState();
  const name = firstName(user?.displayName ?? null);
  const hash = useRouterState({ select: (state) => state.location.hash });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("life");
  const [lives, setLives] = useState<LifeId[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [skipped, setSkipped] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLElement>(null);
  const moved = useRef(false);
  const savedRef = useRef<Saved | null>(null);

  useEffect(() => {
    const value = readSaved();
    savedRef.current = value;
    setSaved(value);
  }, []);

  // Someone followed a "Help me choose" link, or asked from the search: start the questions for them.
  useEffect(() => {
    if (hash === "finder" && !open) begin(true);
    // begin only reads state; run once per arrival on #finder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const lastSignal = useRef(startSignal);
  useEffect(() => {
    if (startSignal === lastSignal.current) return;
    lastSignal.current = startSignal;
    begin(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  // Move keyboard and screen reader focus to each new question.
  useEffect(() => {
    if (!moved.current || !open) return;
    heading.current?.focus({ preventScroll: true });
    const top = section.current?.getBoundingClientRect().top ?? 0;
    const head = heading.current?.getBoundingClientRect();
    // Keep the new question in view without jumping if it already is.
    if (head && (head.top < 64 || head.top > window.innerHeight * 0.6)) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: window.scrollY + Math.min(top, head.top) - 80, behavior: reduce ? "auto" : "smooth" });
    }
  }, [step, open]);

  const matches = rank(lives, skipped ? [] : picked, skipped ? "" : extra);

  function go(next: Step) {
    moved.current = true;
    setStep(next);
  }

  function begin(fromLink = false) {
    const last = savedRef.current;
    setLives(last?.lives ?? []);
    setPicked(last?.picked ?? []);
    setExtra(last?.extra ?? "");
    setSkipped(false);
    moved.current = fromLink;
    setStep("life");
    setOpen(true);
  }

  function close() {
    moved.current = false;
    setOpen(false);
  }

  function finish(skip: boolean) {
    setSkipped(skip);
    go("result");
    const found = rank(lives, skip ? [] : picked, skip ? "" : extra);
    if (found.length === 0) return;
    const next: Saved = { lives, picked: skip ? [] : picked, extra: skip ? "" : extra.trim(), results: found.map((match) => match.slug) };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable; the result still shows */
    }
    savedRef.current = next;
    setSaved(next);
  }

  const number = step === "life" ? 1 : 2;

  return (
    <section ref={section} id="finder" aria-labelledby="finder-title" className="scroll-mt-20 rounded-3xl bg-card p-5 shadow-line sm:p-8">
      <p className="text-sm font-medium text-pine">Help me choose</p>
      <h2 id="finder-title" className="mt-2 font-display text-3xl tracking-tight text-balance sm:text-4xl">
        {name ? `${name}, not sure where to start?` : "Not sure where to start?"}
      </h2>
      {!open ? (
        <>
          <p className="mt-3 max-w-xl text-pretty text-muted">
            {saved
              ? `Last time we suggested ${listOf(saved.results.map((slug) => (slug === GAMES ? "the games" : (getApp(slug)?.name ?? slug))))}.`
              : "Answer two quick questions about your days and what you want to get done, and we’ll suggest a few apps that fit. Your answers stay in this browser."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button tone="primary" onClick={() => begin(true)}>
              {saved ? "Answer again" : "Start the two questions"}
            </Button>
            {saved
              ? saved.results.slice(0, 3).map((slug) => (
                  <ResultLink key={slug} slug={slug} className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
                    {slug === GAMES ? "See the games" : `See ${getApp(slug)?.name ?? slug}`}
                  </ResultLink>
                ))
              : null}
          </div>
        </>
      ) : (
        <div className="mt-6">
          {step !== "result" ? (
            <div className="flex items-center gap-3" aria-hidden>
              <span className="text-sm text-muted tabular-nums">Question {number} of 2</span>
              <span className="flex gap-1.5">
                <span className="h-1.5 w-8 rounded-full bg-pine" />
                <span className={cn("h-1.5 w-8 rounded-full", number === 2 ? "bg-pine" : "bg-paper-2")} />
              </span>
            </div>
          ) : null}

          {step === "life" ? (
            <LifeStep
              heading={heading}
              lives={lives}
              onToggle={(id) => setLives((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))}
              onNext={() => go("tasks")}
            />
          ) : null}

          {step === "tasks" ? (
            <TaskStep
              heading={heading}
              lives={lives}
              picked={picked}
              extra={extra}
              onToggle={(id) => setPicked((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))}
              onExtra={setExtra}
              onNext={() => finish(false)}
              onSkip={() => finish(true)}
            />
          ) : null}

          {step === "result" ? (
            <Result heading={heading} matches={matches} signedIn={Boolean(user)} onRetry={() => go("life")} />
          ) : null}

          <div className="mt-6 flex flex-wrap gap-x-5 border-t border-line pt-3 text-sm">
            {step === "tasks" ? (
              <button type="button" className="inline-flex min-h-11 items-center gap-1 text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => go("life")}>
                <span aria-hidden>←</span> Back
              </button>
            ) : null}
            <button type="button" className="inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-ink hover:underline" onClick={close}>
              {step === "result" ? "Done" : "Close"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ResultLink({ slug, className, children }: { slug: string; className?: string; children: React.ReactNode }) {
  if (slug === GAMES) {
    return (
      <Link to="/games" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/discover/$slug" params={{ slug }} preload="intent" className={className}>
      {children}
    </Link>
  );
}

function Option({ on, onClick, label, detail }: { on: boolean; onClick: () => void; label: string; detail?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors motion-reduce:transition-none",
        on ? "bg-pine text-paper" : "bg-paper hover:bg-paper-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border text-xs",
          on ? "border-paper bg-paper text-pine" : "border-muted/50",
        )}
      >
        {on ? "✓" : ""}
      </span>
      <span>
        <span className="block font-medium">{label}</span>
        {detail ? <span className={cn("mt-0.5 block text-sm", on ? "text-paper/90" : "text-muted")}>{detail}</span> : null}
      </span>
    </button>
  );
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

function StepHeading({ heading, children }: { heading: HeadingRef; children: React.ReactNode }) {
  return (
    <h3 ref={heading} tabIndex={-1} className="mt-4 scroll-mt-24 font-display text-2xl tracking-tight text-balance outline-none">
      {children}
    </h3>
  );
}

function LifeStep({ heading, lives, onToggle, onNext }: { heading: HeadingRef; lives: LifeId[]; onToggle: (id: LifeId) => void; onNext: () => void }) {
  return (
    <div>
      <StepHeading heading={heading}>What fills most of your days right now?</StepHeading>
      <p className="mt-1 text-sm text-muted">Pick any that fit. This only changes which ideas we show first.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="What fills your days">
        {LIVES.map((item) => (
          <Option key={item.id} on={lives.includes(item.id)} onClick={() => onToggle(item.id)} label={item.label} detail={item.detail} />
        ))}
      </div>
      <Button tone="primary" className="mt-5" onClick={onNext}>
        {lives.length > 0 ? "Next question" : "Skip this one"}
      </Button>
    </div>
  );
}

function TaskStep({
  heading,
  lives,
  picked,
  extra,
  onToggle,
  onExtra,
  onNext,
  onSkip,
}: {
  heading: HeadingRef;
  lives: LifeId[];
  picked: string[];
  extra: string;
  onToggle: (id: string) => void;
  onExtra: (value: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  // Fix the short list when the question opens, so ticking an option never reshuffles it.
  const [short] = useState(() => shortList(lives, picked));
  const lead = GROUPS.filter((group) => lives.some((life) => lifeById(life)?.groups.includes(group.id)));
  const groups = [...lead, ...GROUPS.filter((group) => !lead.includes(group))];
  const [more, setMore] = useState(false);
  const moreId = useId();
  const restCount = TASKS.filter((task) => !short.includes(task.id)).length;
  const ready = picked.length > 0 || extra.trim().length > 0;
  const named = lives.map(lifeById).filter((item) => item && item.reason);

  return (
    <div>
      <StepHeading heading={heading}>What would you like a hand with?</StepHeading>
      <p className="mt-1 text-sm text-pretty text-muted">
        {named.length > 0 ? "Ideas for your answers first. " : "Some popular ideas first. "}
        Pick as many as you like, or describe it in your own words.
      </p>
      <fieldset className="mt-5" data-short-list>
        <legend className="text-sm font-medium text-ink-soft">{named.length > 0 ? "Suggested for you" : "Popular"}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {short.map((id) => {
            const task = taskById(id) as Task;
            return <Option key={id} on={picked.includes(id)} onClick={() => onToggle(id)} label={task.label} />;
          })}
        </div>
      </fieldset>
      {restCount > 0 ? (
        <button
          type="button"
          aria-expanded={more}
          aria-controls={moreId}
          onClick={() => setMore((value) => !value)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-paper px-4 text-sm font-medium hover:bg-paper-2"
        >
          {more ? "Fewer options" : `More options (${restCount})`}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className={cn("size-4 transition-transform motion-reduce:transition-none", more && "rotate-180")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      ) : null}
      <div id={moreId} hidden={!more} data-more-options>
        {more
          ? groups.map((group) => {
              const tasks = TASKS.filter((task) => task.group === group.id && !short.includes(task.id));
              if (tasks.length === 0) return null;
              return (
                <fieldset key={group.id} className="mt-5">
                  <legend className="text-sm font-medium text-ink-soft">{group.label}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {tasks.map((task) => (
                      <Option key={task.id} on={picked.includes(task.id)} onClick={() => onToggle(task.id)} label={task.label} />
                    ))}
                  </div>
                </fieldset>
              );
            })
          : null}
      </div>
      <label className="mt-6 block">
        <span className="text-sm font-medium text-ink-soft">Something else? Describe it in your own words.</span>
        <TextArea
          value={extra}
          onChange={(event) => onExtra(event.target.value.slice(0, 200))}
          placeholder="For example: keep track of my small shop's sales"
          rows={2}
          className="mt-2 min-h-16"
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button tone="primary" onClick={onNext} disabled={!ready}>
          Show my suggestions
        </Button>
        <Button tone="quiet" onClick={onSkip}>
          Skip this one
        </Button>
      </div>
      {!ready ? <p className="mt-2 text-sm text-muted">Pick at least one, write a few words, or skip to see ideas from your first answer.</p> : null}
    </div>
  );
}

function ResultCard({ match, best, signedIn }: { match: Match; best: boolean; signedIn: boolean }) {
  if (match.slug === GAMES) {
    return (
      <li className="rounded-2xl bg-[#0b1220] p-4 text-[#f4f7fb] sm:p-5" data-result="games">
        <div className="flex flex-wrap items-center gap-3">
          <img src="/abuja-hustle-v2-192.png" alt="" width={44} height={44} className="size-11 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl tracking-tight">Games</p>
            <p className="text-sm text-[#c4d3e8]">Abuja Hustle and Outpost Zero. Free to play.</p>
            {match.reason ? <p className="mt-1 text-sm text-pretty text-[#c4d3e8]">{match.reason}</p> : null}
          </div>
          <Link to="/games" className={cn(buttonClass({ tone: "paper" }), "shrink-0")}>
            See the games <span aria-hidden>→</span>
          </Link>
        </div>
      </li>
    );
  }
  const app = getApp(match.slug) as AppDef;
  return (
    <li className={cn("rounded-2xl bg-paper p-4 sm:p-5", best && "ring-2 ring-pine/40")} data-result={app.slug}>
      <div className="flex gap-3 sm:gap-4">
        <AppMark slug={app.slug} name={app.name} className="size-11 sm:size-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-display text-xl tracking-tight">{app.name}</p>
            <span
              data-access
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                app.tier === "pass" ? "bg-pine/10 text-pine dark:bg-pine/20 dark:text-ink" : "bg-paper-2 text-ink-soft",
              )}
            >
              {accessLabel(app.tier)}
            </span>
            {best ? <span className="text-xs font-medium text-pine">Best fit</span> : null}
          </div>
          {match.reason ? (
            <p className="mt-1.5 font-medium text-pretty" data-reason>
              {match.reason}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-pretty text-muted">{pitchFor(app)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              to="/discover/$slug"
              params={{ slug: app.slug }}
              preload="intent"
              className={best ? buttonClass({ tone: "primary" }) : "inline-flex min-h-11 items-center gap-1 text-sm font-medium text-pine underline-offset-4 hover:underline"}
            >
              See how {app.name} works <span aria-hidden>→</span>
            </Link>
            {signedIn ? (
              <Link to="/apps/$slug" params={{ slug: app.slug }} className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
                Open {app.name}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function Result({ heading, matches, signedIn, onRetry }: { heading: HeadingRef; matches: Match[]; signedIn: boolean; onRetry: () => void }) {
  if (matches.length === 0) {
    return (
      <div className="max-w-xl">
        <StepHeading heading={heading}>We couldn’t find a close match for that.</StepHeading>
        <p className="mt-2 text-pretty text-muted">
          Midnry may not have the right tool for it yet. Try different words, or look through every app.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button tone="primary" onClick={onRetry}>
            Change my answers
          </Button>
          <Link to="/apps" hash="all" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
            Browse all apps
          </Link>
        </div>
      </div>
    );
  }
  const free = matches.some((match) => getApp(match.slug)?.tier === "free");
  const pass = matches.some((match) => getApp(match.slug)?.tier === "pass");
  return (
    <div>
      <StepHeading heading={heading}>Here’s where to start.</StepHeading>
      <p className="mt-1 text-sm text-muted">
        {matches.length === 1 ? "The best fit for your answers." : `${matches.length} apps, best fit first. Each one opens its own page, so you can see how it works before you sign up.`}
      </p>
      <ol className="mt-4 grid gap-3">
        {matches.map((match, index) => (
          <ResultCard key={match.slug} match={match} best={index === 0} signedIn={signedIn} />
        ))}
      </ol>
      {!signedIn && (free || pass) ? (
        <div className="mt-5 rounded-2xl bg-pine/10 p-4 sm:p-5">
          <p className="font-medium">{free ? "Free apps open as soon as you have an account." : "These are part of Midnry Pass."}</p>
          <p className="mt-1 text-sm text-pretty text-muted">
            {free
              ? "Create one with your email or Google. No card needed."
              : "Create a free account first, then add the Pass when you’re ready."}
            {free && pass ? " Apps marked Midnry Pass need the Pass." : ""}
          </p>
          <Link to="/login" search={{ next: "/apps", intent: "register" }} className={cn(buttonClass({ tone: "primary" }), "mt-3")}>
            Create a free account
          </Link>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-x-5 text-sm">
        <button type="button" className="min-h-11 font-medium underline underline-offset-4" onClick={onRetry}>
          Change my answers
        </button>
        <Link to="/apps" hash="all" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
          Browse all apps
        </Link>
      </div>
    </div>
  );
}
