import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { APPS, getApp, type AppDef } from "@/lib/catalog";
import { accessLabel } from "@/lib/plans";
import { pitchFor } from "@/lib/pitches";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppMark } from "@/components/app-mark";
import { Button, TextArea, buttonClass, cn } from "@/components/ui";

const KEY = "midnry.match";

// Question 1: what fills someone's days. Several can be true at once, and none
// of them is an age or a job title. It only decides which ideas come first.
type LifeId = "study" | "job" | "self" | "sell" | "care" | "pace" | "seeking" | "other";
type GroupId = "study" | "work" | "business" | "everyday";

const LIVES: { id: LifeId; label: string; detail: string; groups: GroupId[] }[] = [
  { id: "study", label: "Studying or training", detail: "School, university, a course, or an apprenticeship.", groups: ["study"] },
  { id: "job", label: "Working a job", detail: "Employed, on shifts, or on contract.", groups: ["work"] },
  { id: "self", label: "Working for myself", detail: "Freelance, a side hustle, or my own business.", groups: ["business", "work"] },
  { id: "sell", label: "Selling things", detail: "A shop, online, at a market, or from a farm.", groups: ["business"] },
  { id: "care", label: "Looking after family or a home", detail: "Children, a partner, parents, or the house.", groups: ["everyday"] },
  { id: "pace", label: "Retired, or taking life at my own pace", detail: "Time for health, people, and things I enjoy.", groups: ["everyday"] },
  { id: "seeking", label: "Looking for work", detail: "Applications, a resume, or a change of field.", groups: ["work"] },
  { id: "other", label: "Something else", detail: "None of these fit, and that is fine.", groups: [] },
];

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
type Task = { id: string; group: GroupId; label: string; apps: string[] };

const TASKS: Task[] = [
  { id: "health-study", group: "study", label: "Health or nursing studies: doses, anatomy, cases", apps: ["dose", "anatomy", "clinic-quiz"] },
  { id: "calc", group: "study", label: "Maths, physics, or engineering calculations", apps: ["units", "formula-sheet", "solver", "circuit"] },
  { id: "lab", group: "study", label: "Lab reports, science formulas, or graphs", apps: ["lab-notes", "solver", "plot"] },
  { id: "law-study", group: "study", label: "Law cases, citations, or practice questions", apps: ["case-brief", "legal-cite", "law-drill"] },
  { id: "biz-study", group: "study", label: "Business, economics, or accounting coursework", apps: ["ratios", "statements", "breakeven"] },
  { id: "code-learn", group: "study", label: "Understanding code, or finding a bug", apps: ["explainer", "bug-scan", "algo"] },
  { id: "essay", group: "study", label: "Essays, sources, or summing up long reading", apps: ["outliner", "citations", "digest"] },
  { id: "focus", group: "study", label: "Staying focused and on top of tasks", apps: ["tasks", "pulse", "habits"] },

  { id: "organise", group: "work", label: "Reminders, to-dos, and planning my week", apps: ["tasks", "board", "scratch"] },
  { id: "teach", group: "work", label: "Lesson plans, quizzes, or report comments", apps: ["lesson", "quiz-maker", "remarks"] },
  { id: "care-work", group: "work", label: "Patient notes, shifts, or checking a dose", apps: ["soap-note", "shifts", "dose-ref"] },
  { id: "ship-code", group: "work", label: "Writing code: JSON, regex, or a README", apps: ["json-fmt", "regex", "readme", "glyph"] },
  { id: "outreach", group: "work", label: "Emails, ads, proposals, or a year of posts", apps: ["cold-email", "ad-copy", "proposal", "planner"] },
  { id: "job-hunt", group: "work", label: "A resume or job applications", apps: ["apply", "letters"] },
  { id: "accounts", group: "work", label: "Tax, budgets, or reconciling accounts", apps: ["paye", "reconcile", "budget"] },
  { id: "legal", group: "work", label: "Contracts, clauses, or formal letters", apps: ["contract-scan", "clauses", "letters"] },
  { id: "creative", group: "work", label: "Design briefs, colours, or video", apps: ["creative-brief", "mood", "contrast", "compressor"] },

  { id: "invoice", group: "business", label: "Invoices, quotes, or client terms", apps: ["invoice", "quote", "client-terms", "service-terms"] },
  { id: "stock", group: "business", label: "Stock, prices, and profit", apps: ["stock", "price-list", "margin"] },
  { id: "food", group: "business", label: "A menu, or what a dish costs to make", apps: ["menu", "recipe-cost", "qr-menu"] },
  { id: "bookings", group: "business", label: "Bookings, a product catalog, or captions", apps: ["bookings", "catalog", "captions"] },
  { id: "online", group: "business", label: "Online orders, listings, or WhatsApp replies", apps: ["orders", "listing", "wa-replies"] },
  { id: "farm", group: "business", label: "Harvest, crop prices, or farm sales", apps: ["yield", "produce", "farm-sales"] },
  { id: "spend", group: "business", label: "Knowing where the money goes", apps: ["ledger", "statements", "margin"] },

  { id: "day", group: "everyday", label: "Organising my day: reminders and to-dos", apps: ["tasks", "scratch", "habits"] },
  { id: "health", group: "everyday", label: "Medicines, appointments, or how I have been feeling", apps: ["meds", "visits", "symptom-log"] },
  { id: "period", group: "everyday", label: "Tracking my period", apps: ["cycle"] },
  { id: "habits", group: "everyday", label: "Building daily habits", apps: ["habits", "tasks"] },
  { id: "scam", group: "everyday", label: "Checking whether a message is a scam", apps: ["scam-check", "rumor-check", "ice-card"] },
  { id: "family", group: "everyday", label: "Staying in touch: voice notes, photos, or calls", apps: ["voice-note", "call-guide", "clearer"] },
  { id: "money", group: "everyday", label: "Household money: bills, savings, or splitting costs", apps: ["budget", "ledger", "split", "bill-watch", "pocket"] },
  { id: "hobby", group: "everyday", label: "Cooking, reading aloud, or writing down memories", apps: ["recipes", "read-aloud", "memoir"] },
  { id: "play", group: "everyday", label: "Something to play", apps: [GAMES] },
];

const MAX_RESULTS = 5;

type Saved = { picked: string[]; extra: string; results: string[] };

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

const HAYSTACK = new Map(
  APPS.map((app) => [app.slug, [app.name, app.blurb, pitchFor(app), ...app.features].join(" ").toLowerCase()]),
);

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

type Match = { slug: string; because: string[] };

function rank(picked: string[], extra: string): Match[] {
  const score = new Map<string, number>();
  const because = new Map<string, string[]>();
  for (const task of TASKS.filter((item) => picked.includes(item.id))) {
    task.apps.forEach((slug, index) => {
      score.set(slug, (score.get(slug) ?? 0) + Math.max(3 - index, 1));
      because.set(slug, [...(because.get(slug) ?? []), task.label]);
    });
  }
  const typed = extra.trim();
  const typedHits = [...fromWords(typed).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  for (const [slug, hits] of typedHits) {
    score.set(slug, (score.get(slug) ?? 0) + Math.min(hits, 3));
    if (!because.get(slug)?.length) because.set(slug, [`You wrote “${typed.length > 60 ? `${typed.slice(0, 57)}…` : typed}”`]);
  }
  const paid = (slug: string) => (getApp(slug)?.tier === "pass" ? 1 : 0);
  const order = (slug: string) => (slug === GAMES ? -1 : APPS.findIndex((app) => app.slug === slug));
  return [...score.entries()]
    .filter(([slug]) => slug === GAMES || getApp(slug))
    // Ties: free apps first (they open with just an account), then catalogue order.
    .sort((a, b) => b[1] - a[1] || paid(a[0]) - paid(b[0]) || order(a[0]) - order(b[0]))
    .slice(0, MAX_RESULTS)
    .map(([slug]) => ({ slug, because: because.get(slug) ?? [] }));
}

function readSaved(): Saved | null {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<Saved>;
    const picked = Array.isArray(parsed.picked) ? parsed.picked.filter((id) => TASKS.some((task) => task.id === id)) : [];
    const extra = typeof parsed.extra === "string" ? parsed.extra.slice(0, 200) : "";
    // Earlier versions saved subject sections, not apps: work the apps out again from the answers.
    const results = Array.isArray(parsed.results)
      ? parsed.results.filter((slug): slug is string => typeof slug === "string" && (slug === GAMES || Boolean(getApp(slug))))
      : rank(picked, extra).map((match) => match.slug);
    return results.length > 0 ? { picked, extra, results } : null;
  } catch {
    return null;
  }
}

type Step = "life" | "tasks" | "result";

/**
 * "Help me choose": two questions, then the apps that fit, each linking to its
 * product page with the site's access label. Answers stay in this browser.
 */
export function MatchQuiz() {
  const { user } = useCurrentUserState();
  const name = firstName(user?.displayName ?? null);
  const hash = useRouterState({ select: (state) => state.location.hash });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("life");
  const [lives, setLives] = useState<LifeId[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    setSaved(readSaved());
  }, []);

  // Someone followed a "Help me choose" link: start the questions for them.
  useEffect(() => {
    if (hash === "finder" && !open) begin();
    // begin only reads state; run once per arrival on #finder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  // Move keyboard and screen reader focus to each new question.
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
  }, [step, open]);

  const matches = rank(picked, extra);

  function go(next: Step) {
    moved.current = true;
    setStep(next);
  }

  function begin() {
    setLives([]);
    setPicked(saved?.picked ?? []);
    setExtra(saved?.extra ?? "");
    moved.current = false;
    setStep("life");
    setOpen(true);
  }

  function close() {
    moved.current = false;
    setOpen(false);
  }

  function finish() {
    go("result");
    if (matches.length === 0) return;
    const next: Saved = { picked, extra: extra.trim(), results: matches.map((match) => match.slug) };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable; the result still shows */
    }
    setSaved(next);
  }

  const number = step === "life" ? 1 : 2;

  return (
    <section id="finder" aria-labelledby="finder-title" className="scroll-mt-20 rounded-3xl bg-card p-5 shadow-line sm:p-8">
      <p className="text-sm font-medium text-pine">Help me choose</p>
      <h2 id="finder-title" className="mt-2 font-display text-3xl tracking-tight text-balance sm:text-4xl">
        {name ? `${name}, not sure where to start?` : "Not sure where to start?"}
      </h2>
      {!open ? (
        <>
          <p className="mt-3 max-w-xl text-pretty text-muted">
            {saved
              ? `Last time we suggested ${listOf(saved.results.map((slug) => (slug === GAMES ? "the games" : (getApp(slug)?.name ?? slug))))}.`
              : "Answer two quick questions about your days and what you want to get done, and we’ll suggest the apps that fit. Your answers stay in this browser."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button tone="primary" onClick={begin}>
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
              onNext={finish}
            />
          ) : null}

          {step === "result" ? <Result heading={heading} matches={matches} signedIn={Boolean(user)} onRetry={() => go("tasks")} /> : null}

          <div className="mt-6 flex gap-4 text-sm">
            {step === "tasks" ? (
              <button type="button" className="min-h-11 text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => go("life")}>
                Back
              </button>
            ) : null}
            <button type="button" className="min-h-11 text-muted underline-offset-4 hover:text-ink hover:underline" onClick={close}>
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
        "flex min-h-11 items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
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
    <h3 ref={heading} tabIndex={-1} className="mt-4 font-display text-2xl tracking-tight text-balance outline-none">
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
}: {
  heading: HeadingRef;
  lives: LifeId[];
  picked: string[];
  extra: string;
  onToggle: (id: string) => void;
  onExtra: (value: string) => void;
  onNext: () => void;
}) {
  const first = GROUPS.filter((group) => lives.some((life) => LIVES.find((item) => item.id === life)?.groups.includes(group.id)));
  const lead = first.length > 0 ? first : GROUPS;
  const rest = GROUPS.filter((group) => !lead.includes(group));
  const [showAll, setShowAll] = useState(rest.some((group) => TASKS.some((task) => task.group === group.id && picked.includes(task.id))));
  const shown = showAll ? [...lead, ...rest] : lead;
  const ready = picked.length > 0 || extra.trim().length > 0;

  return (
    <div>
      <StepHeading heading={heading}>What would you like a hand with?</StepHeading>
      <p className="mt-1 text-sm text-muted">Pick as many as you like, or describe it in your own words.</p>
      {shown.map((group) => (
        <fieldset key={group.id} className="mt-5">
          <legend className="text-sm font-medium text-ink-soft">{group.label}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TASKS.filter((task) => task.group === group.id).map((task) => (
              <Option key={task.id} on={picked.includes(task.id)} onClick={() => onToggle(task.id)} label={task.label} />
            ))}
          </div>
        </fieldset>
      ))}
      {rest.length > 0 && !showAll ? (
        <button type="button" className="mt-4 min-h-11 text-sm font-medium underline underline-offset-4" onClick={() => setShowAll(true)}>
          Show more ideas ({listOf(rest.map((group) => group.label.toLowerCase()))})
        </button>
      ) : null}
      <label className="mt-5 block">
        <span className="text-sm font-medium text-ink-soft">Something else? Describe it in your own words.</span>
        <TextArea
          value={extra}
          onChange={(event) => onExtra(event.target.value.slice(0, 200))}
          placeholder="For example: keep track of my small shop's sales"
          rows={2}
          className="mt-2 min-h-16"
        />
      </label>
      <Button tone="primary" className="mt-5" onClick={onNext} disabled={!ready}>
        Show my suggestions
      </Button>
      {!ready ? <p className="mt-2 text-sm text-muted">Pick at least one, or write a few words.</p> : null}
    </div>
  );
}

function ResultCard({ match, best, signedIn }: { match: Match; best: boolean; signedIn: boolean }) {
  if (match.slug === GAMES) {
    return (
      <li className="rounded-2xl bg-[#0b1220] p-4 text-[#f4f7fb] sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <img src="/abuja-hustle-v2-192.png" alt="" width={44} height={44} className="size-11 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl tracking-tight">Games</p>
            <p className="text-sm text-[#c4d3e8]">Abuja Hustle and Outpost Zero. Free to play.</p>
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
    <li className={cn("rounded-2xl p-4 sm:p-5", best ? "bg-paper shadow-line" : "bg-paper")}>
      <div className="flex gap-3">
        <AppMark slug={app.slug} name={app.name} className="size-11" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-display text-xl tracking-tight">{app.name}</p>
            <span className={app.tier === "pass" ? "text-sm font-medium text-pine" : "text-sm text-muted"}>{accessLabel(app.tier)}</span>
          </div>
          <p className="mt-1 text-pretty">{pitchFor(app)}</p>
          {match.because.length > 0 ? (
            <p className="mt-1.5 text-sm text-pretty text-muted">Because you picked: {listOf(match.because.map((reason) => reason.toLowerCase().startsWith("you wrote") ? reason : `“${reason}”`))}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              to="/discover/$slug"
              params={{ slug: app.slug }}
              preload="intent"
              className={best ? buttonClass({ tone: "primary" }) : "inline-flex min-h-11 items-center text-sm font-medium text-pine underline-offset-4 hover:underline"}
            >
              See how it works <span aria-hidden>→</span>
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
        {matches.length === 1 ? "The best fit for what you picked." : "Best fit first. Each one opens its own page, so you can see how it works before you sign up."}
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
