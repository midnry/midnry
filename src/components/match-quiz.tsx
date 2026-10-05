import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SECTIONS, genreLabel, isSection, type SectionId } from "@/lib/sections";
import { APPS } from "@/lib/catalog";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, TextArea, TextInput, cn } from "@/components/ui";

const KEY = "midnry.match";

// What fills someone's days. Several can be true at once, and none of them is an
// age or a job title. It only decides which ideas are shown first.
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

// Each task points at the section whose apps do that job. The first section is
// the best fit; any others are a good second place to look.
type Task = { id: string; group: GroupId; label: string; sections: SectionId[] };

const TASKS: Task[] = [
  { id: "health-study", group: "study", label: "Health or nursing studies: doses, anatomy, cases", sections: ["medicine"] },
  { id: "calc", group: "study", label: "Maths, physics, or engineering calculations", sections: ["engineering", "science"] },
  { id: "lab", group: "study", label: "Lab reports, science formulas, or graphs", sections: ["science"] },
  { id: "law-study", group: "study", label: "Law cases, citations, or practice questions", sections: ["law"] },
  { id: "biz-study", group: "study", label: "Business, economics, or accounting coursework", sections: ["accounting"] },
  { id: "code-learn", group: "study", label: "Understanding code, or finding a bug", sections: ["computing"] },
  { id: "essay", group: "study", label: "Essays, sources, or summing up long reading", sections: ["arts"] },
  { id: "focus", group: "study", label: "Staying focused and on top of tasks", sections: ["computing", "developers"] },

  { id: "teach", group: "work", label: "Lesson plans, quizzes, or report comments", sections: ["teaching"] },
  { id: "care-work", group: "work", label: "Patient notes, shifts, or checking a dose", sections: ["clinic"] },
  { id: "ship-code", group: "work", label: "Writing code: JSON, regex, or a README", sections: ["developers"] },
  { id: "outreach", group: "work", label: "Emails, ads, proposals, or a year of posts", sections: ["marketing"] },
  { id: "job-hunt", group: "work", label: "A resume or job applications", sections: ["freelance"] },
  { id: "accounts", group: "work", label: "Tax, budgets, or reconciling accounts", sections: ["books"] },
  { id: "legal", group: "work", label: "Contracts, clauses, or formal letters", sections: ["practice"] },
  { id: "creative", group: "work", label: "Design briefs, colours, or video", sections: ["creatives"] },

  { id: "invoice", group: "business", label: "Invoices, quotes, or client terms", sections: ["freelance", "creatives"] },
  { id: "stock", group: "business", label: "Stock, prices, and profit", sections: ["retail"] },
  { id: "food", group: "business", label: "A menu, or what a dish costs to make", sections: ["kitchen"] },
  { id: "bookings", group: "business", label: "Bookings, a product catalog, or captions", sections: ["beauty"] },
  { id: "online", group: "business", label: "Online orders, listings, or WhatsApp replies", sections: ["sellers"] },
  { id: "farm", group: "business", label: "Harvest, crop prices, or farm sales", sections: ["agro"] },

  { id: "health", group: "everyday", label: "Medicines, appointments, or how I have been feeling", sections: ["elder-health"] },
  { id: "period", group: "everyday", label: "Tracking my period", sections: ["medicine"] },
  { id: "habits", group: "everyday", label: "Building daily habits", sections: ["elder-health"] },
  { id: "scam", group: "everyday", label: "Checking whether a message is a scam", sections: ["safety"] },
  { id: "family", group: "everyday", label: "Staying in touch: voice notes, photos, or calls", sections: ["family"] },
  { id: "money", group: "everyday", label: "Household money: bills, savings, or splitting costs", sections: ["elder-money", "books"] },
  { id: "hobby", group: "everyday", label: "Cooking, reading aloud, or writing down memories", sections: ["hobbies"] },
];

type Saved = { name: string; sections: SectionId[]; picked: string[] };

function firstName(displayName: string | null): string {
  const raw = displayName?.trim() ?? "";
  if (!raw || raw.toLowerCase() === "dev user") return "";
  return raw.split(/\s+/)[0] ?? "";
}

function appsIn(section: SectionId): string[] {
  return APPS.filter((app) => app.genre === section).map((app) => app.name);
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const STOP = new Set(["about", "and", "for", "from", "have", "help", "into", "just", "like", "more", "need", "some", "that", "the", "them", "this", "what", "when", "with", "want", "would", "your"]);

// Words someone typed, matched against each section's name, description, and apps.
function fromWords(text: string): Map<SectionId, number> {
  const words = [...new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? [])].filter((word) => !STOP.has(word));
  const scores = new Map<SectionId, number>();
  if (words.length === 0) return scores;
  for (const section of SECTIONS) {
    const haystack = [
      section.label,
      section.blurb,
      ...APPS.filter((app) => app.genre === section.id).flatMap((app) => [app.name, app.blurb]),
    ]
      .join(" ")
      .toLowerCase();
    const hits = words.filter((word) => new RegExp(`\\b${word}`).test(haystack)).length;
    if (hits > 0) scores.set(section.id, hits);
  }
  return scores;
}

type Match = { section: SectionId; because: string[] };

function rank(picked: string[], extra: string): Match[] {
  const score = new Map<SectionId, number>();
  const because = new Map<SectionId, string[]>();
  for (const task of TASKS.filter((item) => picked.includes(item.id))) {
    task.sections.forEach((section, index) => {
      score.set(section, (score.get(section) ?? 0) + (index === 0 ? 3 : 1));
      if (index === 0) because.set(section, [...(because.get(section) ?? []), task.label]);
    });
  }
  const typed = extra.trim();
  for (const [section, hits] of fromWords(typed)) {
    score.set(section, (score.get(section) ?? 0) + Math.min(hits, 3));
    if (!because.get(section)?.length) because.set(section, [`You wrote “${typed.length > 60 ? `${typed.slice(0, 57)}…` : typed}”`]);
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || SECTIONS.findIndex((s) => s.id === a[0]) - SECTIONS.findIndex((s) => s.id === b[0]))
    .slice(0, 3)
    .map(([section]) => ({ section, because: because.get(section) ?? [] }));
}

function readSaved(): Saved | null {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return null;
    if (isSection(stored)) return { name: "", sections: [stored], picked: [] };
    const parsed = JSON.parse(stored) as Partial<Saved> & { section?: string };
    const name = typeof parsed.name === "string" ? parsed.name : "";
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections.filter((item): item is SectionId => typeof item === "string" && isSection(item)).slice(0, 3)
      : typeof parsed.section === "string" && isSection(parsed.section)
        ? [parsed.section]
        : [];
    const picked = Array.isArray(parsed.picked) ? parsed.picked.filter((id) => TASKS.some((task) => task.id === id)) : [];
    return sections.length > 0 ? { name, sections, picked } : null;
  } catch {
    return null;
  }
}

type Step = "name" | "life" | "tasks" | "result";

export function MatchQuiz() {
  const { user, isPending } = useCurrentUserState();
  const knownName = firstName(user?.displayName ?? null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("life");
  const [name, setName] = useState("");
  const [lives, setLives] = useState<LifeId[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    setSaved(readSaved());
  }, []);

  if (isPending) return null;

  const called = (name.trim() || knownName || saved?.name || "").trim();
  const order: Step[] = knownName ? ["life", "tasks"] : ["name", "life", "tasks"];
  const matches = rank(picked, extra);

  function begin() {
    setName(saved?.name || knownName);
    setLives([]);
    setPicked(saved?.picked ?? []);
    setExtra("");
    setStep(knownName ? "life" : "name");
    setOpen(true);
  }

  function back() {
    const index = step === "result" ? order.length : order.indexOf(step);
    if (index <= 0) setOpen(false);
    else setStep(order[index - 1]);
  }

  function finish() {
    setStep("result");
    if (matches.length === 0) return;
    const next: Saved = { name: called, sections: matches.map((match) => match.section), picked };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable; the result still shows */
    }
    setSaved(next);
  }

  return (
    <section className="rounded-2xl bg-card p-5 shadow-line sm:p-8">
      <p className="text-sm text-muted">Find your place on Midnry</p>
      <h2 className="mt-2 font-display text-3xl tracking-tight text-balance">
        {called ? `${called}, what can we help with?` : "What can we help with?"}
      </h2>
      {!open ? (
        <>
          <p className="mt-3 max-w-xl text-pretty text-muted">
            {saved
              ? `${saved.name ? `${saved.name}, last time` : "Last time"} we suggested ${listOf(saved.sections.map(genreLabel))}.`
              : "Two quick questions about your days and what you want to get done. There are no wrong answers, and you can pick more than one."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button tone="primary" onClick={begin}>
              {saved ? "Answer again" : "Start"}
            </Button>
            {saved
              ? saved.sections.map((section) => (
                  <Link
                    key={section}
                    to="/sections/$genre"
                    params={{ genre: section }}
                    className="inline-flex min-h-11 items-center text-sm underline"
                  >
                    Open {genreLabel(section)}
                  </Link>
                ))
              : null}
          </div>
        </>
      ) : (
        <div className="mt-6">
          {step !== "result" ? (
            <p className="text-sm text-muted">
              {order.indexOf(step) + 1} of {order.length}
            </p>
          ) : null}

          {step === "name" ? (
            <NameStep name={name} onChange={setName} onNext={() => setStep("life")} />
          ) : null}

          {step === "life" ? (
            <LifeStep
              lives={lives}
              onToggle={(id) => setLives((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))}
              onNext={() => setStep("tasks")}
            />
          ) : null}

          {step === "tasks" ? (
            <TaskStep
              lives={lives}
              picked={picked}
              extra={extra}
              onToggle={(id) => setPicked((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))}
              onExtra={setExtra}
              onNext={finish}
            />
          ) : null}

          {step === "result" ? <Result matches={matches} signedIn={Boolean(user)} onRetry={() => setStep("tasks")} /> : null}

          <div className="mt-6 flex gap-4 text-sm text-muted">
            {step !== "result" ? (
              <button type="button" className="min-h-11" onClick={back}>
                {order.indexOf(step) === 0 ? "Close" : "Back"}
              </button>
            ) : (
              <button type="button" className="min-h-11" onClick={() => setOpen(false)}>
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function NameStep({ name, onChange, onNext }: { name: string; onChange: (value: string) => void; onNext: () => void }) {
  return (
    <form
      className="mt-3 max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <label className="block font-display text-2xl tracking-tight" htmlFor="match-name">
        What should we call you?
      </label>
      <p className="mt-1 text-sm text-muted">Optional. Any name or nickname works.</p>
      <TextInput id="match-name" className="mt-4" value={name} placeholder="Your name" onChange={(event) => onChange(event.target.value)} />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button tone="primary" type="submit">
          {name.trim() ? "Continue" : "Skip"}
        </Button>
      </div>
    </form>
  );
}

function Option({ on, onClick, label, detail }: { on: boolean; onClick: () => void; label: string; detail?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
        on ? "bg-pine text-paper" : "bg-paper hover:bg-paper-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border text-xs",
          on ? "border-paper bg-paper text-pine" : "border-line",
        )}
      >
        {on ? "✓" : ""}
      </span>
      <span>
        <span className="block font-medium">{label}</span>
        {detail ? <span className={cn("mt-0.5 block text-sm", on ? "opacity-85" : "text-muted")}>{detail}</span> : null}
      </span>
    </button>
  );
}

function LifeStep({ lives, onToggle, onNext }: { lives: LifeId[]; onToggle: (id: LifeId) => void; onNext: () => void }) {
  return (
    <div className="mt-3">
      <p className="font-display text-2xl tracking-tight text-balance">What fills most of your days right now?</p>
      <p className="mt-1 text-sm text-muted">Pick all that apply. This only changes which ideas we show first.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {LIVES.map((item) => (
          <Option key={item.id} on={lives.includes(item.id)} onClick={() => onToggle(item.id)} label={item.label} detail={item.detail} />
        ))}
      </div>
      <Button tone="primary" className="mt-5" onClick={onNext}>
        {lives.length > 0 ? "Continue" : "Skip"}
      </Button>
    </div>
  );
}

function TaskStep({
  lives,
  picked,
  extra,
  onToggle,
  onExtra,
  onNext,
}: {
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
    <div className="mt-3">
      <p className="font-display text-2xl tracking-tight text-balance">What would you like a hand with?</p>
      <p className="mt-1 text-sm text-muted">Pick as many as you like.</p>
      {shown.map((group) => (
        <fieldset key={group.id} className="mt-5">
          <legend className="text-sm font-medium text-muted">{group.label}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TASKS.filter((task) => task.group === group.id).map((task) => (
              <Option key={task.id} on={picked.includes(task.id)} onClick={() => onToggle(task.id)} label={task.label} />
            ))}
          </div>
        </fieldset>
      ))}
      {rest.length > 0 && !showAll ? (
        <button type="button" className="mt-4 min-h-11 text-sm underline" onClick={() => setShowAll(true)}>
          Show more ideas ({listOf(rest.map((group) => group.label.toLowerCase()))})
        </button>
      ) : null}
      <label className="mt-5 block">
        <span className="text-sm font-medium text-muted">Something else? Describe it in your own words.</span>
        <TextArea
          value={extra}
          onChange={(event) => onExtra(event.target.value.slice(0, 200))}
          placeholder="For example: keep track of my small shop's sales"
          rows={2}
          className="mt-2 min-h-16"
        />
      </label>
      <Button tone="primary" className="mt-5" onClick={onNext} disabled={!ready}>
        See my suggestions
      </Button>
    </div>
  );
}

function Result({ matches, signedIn, onRetry }: { matches: Match[]; signedIn: boolean; onRetry: () => void }) {
  if (matches.length === 0) {
    return (
      <div className="mt-3 max-w-xl">
        <p className="font-display text-2xl tracking-tight text-balance">We could not find a close match for that.</p>
        <p className="mt-2 text-pretty text-muted">
          Midnry may not have the right tool for it yet. You can browse every section on the desk, or try different words.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button tone="primary" onClick={onRetry}>
            Try again
          </Button>
          <Link to="/" className="inline-flex min-h-11 items-center text-sm underline">
            Browse every section
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <p className="font-display text-2xl tracking-tight text-balance">
        Here is where to start.
      </p>
      <p className="mt-1 text-sm text-muted">
        {matches.length === 1 ? "The best fit for what you picked." : "Best fit first. Every section stays open to you."}
      </p>
      <ol className="mt-4 grid gap-3">
        {matches.map((match, index) => {
          const apps = appsIn(match.section);
          return (
            <li key={match.section} className={cn("rounded-2xl p-4", index === 0 ? "bg-paper shadow-line" : "bg-paper")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{genreLabel(match.section)}</p>
                  {apps.length > 0 ? <p className="mt-0.5 text-sm text-muted">Apps: {listOf(apps)}</p> : null}
                </div>
                <Link
                  to="/sections/$genre"
                  params={{ genre: match.section }}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center rounded-full px-5 text-sm font-medium",
                    index === 0 ? "bg-pine text-paper" : "bg-card shadow-line",
                  )}
                >
                  Open
                </Link>
              </div>
              {match.because.length > 0 ? (
                <p className="mt-2 text-sm text-pretty">
                  <span className="text-muted">From your answers: </span>
                  {listOf(match.because)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      {!signedIn ? (
        <div className="mt-5 rounded-2xl bg-pine/10 p-4">
          <p className="font-medium">Ready to try them?</p>
          <p className="mt-1 text-sm text-muted">Create a free account. Three apps in every section are free, no card needed.</p>
          <Link
            to="/login"
            search={{ next: `/sections/${matches[0].section}`, intent: "register" }}
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-pine px-5 text-sm font-medium text-paper"
          >
            Get started free
          </Link>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <button type="button" className="min-h-11 underline" onClick={onRetry}>
          Change my answers
        </button>
        <Link to="/" className="inline-flex min-h-11 items-center underline">
          Browse every section
        </Link>
      </div>
    </div>
  );
}
