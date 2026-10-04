import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { genreLabel, isSection, type AudienceId, type SectionId } from "@/lib/sections";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button, TextInput } from "@/components/ui";

const KEY = "midnry.match";

type Choice = { label: string; detail: string; section: SectionId };
type Saved = { name: string; section: SectionId; said: string };

const PATHS: Record<AudienceId, { ask: string; choices: Choice[] }> = {
  students: {
    ask: "What is actually due?",
    choices: [
      { label: "A patient, a dose, or anatomy", detail: "You have clinical work in front of you.", section: "medicine" },
      { label: "A unit, a formula, or a circuit", detail: "The work is a calculation.", section: "engineering" },
      { label: "A case, a citation, or a past question", detail: "You are reading law, not writing a brief for a client.", section: "law" },
      { label: "Ratios, a statement, or break-even", detail: "The assignment is about the numbers of a business.", section: "accounting" },
      { label: "Code I do not understand, or a bug", detail: "You need the program explained before you change it.", section: "computing" },
      { label: "An essay, a source, or a long reading", detail: "The page is the work.", section: "arts" },
      { label: "A lab, a formula, or a graph", detail: "You have results and you need them written or drawn.", section: "science" },
    ],
  },
  professionals: {
    ask: "What is the job asking for this week?",
    choices: [
      { label: "A lesson, a quiz, or a report comment", detail: "Someone is waiting on what you prepared for class.", section: "teaching" },
      { label: "A shift, a note, or a dose to check", detail: "The work is on the ward or in the clinic.", section: "clinic" },
      { label: "Code that has to ship", detail: "You need a pattern, clean JSON, or a README.", section: "developers" },
      { label: "A person I still have to write to", detail: "The next step is an email, an ad, or a proposal.", section: "marketing" },
      { label: "Tax, a reconciliation, or a budget", detail: "The books are the job.", section: "books" },
      { label: "A contract, a clause, or a letter", detail: "Someone needs a document, not a slogan.", section: "practice" },
      { label: "A brief, a direction, or client terms", detail: "The work starts before the making.", section: "creatives" },
    ],
  },
  owners: {
    ask: "What is the business waiting on?",
    choices: [
      { label: "What is on the shelf, and what it should cost", detail: "You sell from a shop.", section: "retail" },
      { label: "The menu, and what a plate costs", detail: "The food is the business.", section: "kitchen" },
      { label: "Bookings, products, and what to post", detail: "People buy a look, a service, or a time.", section: "beauty" },
      { label: "An invoice, a quote, or terms", detail: "You sell your time.", section: "freelance" },
      { label: "Orders, and what to reply on WhatsApp", detail: "The sale happens in a chat.", section: "sellers" },
      { label: "Yield, the price, or who bought", detail: "The business is on the farm.", section: "agro" },
    ],
  },
  seniors: {
    ask: "What would make today easier?",
    choices: [
      { label: "Medicines, a visit, or how I have been feeling", detail: "Health is the thing you do not want to lose track of.", section: "elder-health" },
      { label: "A message that does not feel right", detail: "You want to check it before you answer or forward it.", section: "safety" },
      { label: "A voice note, a photo, or a call", detail: "The point is reaching someone.", section: "family" },
      { label: "Bills, or what I can put aside", detail: "The money should be plain.", section: "elder-money" },
      { label: "Cooking, reading aloud, or writing a memory", detail: "This one is for you, not for a deadline.", section: "hobbies" },
    ],
  },
};

const SITUATIONS: { id: AudienceId; label: string; detail: string }[] = [
  { id: "students", label: "I am in school, and something is due", detail: "A course, a ward, a lab, or a paper." },
  { id: "professionals", label: "I already do this for work", detail: "The job has a task attached to it." },
  { id: "owners", label: "I run the business", detail: "Customers, stock, or a price." },
  { id: "seniors", label: "I want this simpler, for me or someone older", detail: "Larger type. One job at a time." },
];

function firstName(displayName: string | null): string {
  const raw = displayName?.trim() ?? "";
  if (!raw || raw.toLowerCase() === "dev user") return "";
  return raw.split(/\s+/)[0] ?? "";
}

export function MatchQuiz() {
  const { user, isPending } = useCurrentUserState();
  const knownName = firstName(user?.displayName ?? null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<AudienceId | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Saved;
      if (parsed && typeof parsed.name === "string" && isSection(parsed.section) && typeof parsed.said === "string") {
        setSaved(parsed);
      }
    } catch {
      if (isSection(stored)) setSaved({ name: "", section: stored, said: "" });
    }
  }, []);

  if (isPending || !user) return null;

  const called = (name.trim() || knownName || saved?.name || "").trim();
  const path = audience ? PATHS[audience] : null;
  const steps = called && knownName ? 2 : 3;

  function begin() {
    setName(saved?.name || knownName);
    setAudience(null);
    setStep(knownName ? 1 : 0);
    setOpen(true);
  }

  function finish(choice: Choice) {
    const next = { name: called, section: choice.section, said: choice.detail };
    localStorage.setItem(KEY, JSON.stringify(next));
    setSaved(next);
    setOpen(false);
  }

  return (
    <section className="rounded-2xl bg-card p-5 shadow-line sm:p-8">
      <p className="text-sm text-muted">For you, after you sign in</p>
      <h2 className="mt-2 font-display text-3xl tracking-tight text-balance">
        {called ? `${called}, where should this open?` : "Where should this open?"}
      </h2>
      {!open ? (
        <>
          <p className="mt-3 max-w-xl text-pretty text-muted">
            {saved
              ? `${saved.name ? `${saved.name}, last time` : "Last time"} this pointed you at ${genreLabel(saved.section)}.${saved.said ? ` ${saved.said}` : ""}`
              : "Three short questions. Not a tour of the menu. It asks what is in front of you, then opens that section."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button tone="primary" onClick={begin}>
              {saved ? "Ask me again" : "Start"}
            </Button>
            {saved ? (
              <Link to="/sections/$genre" params={{ genre: saved.section }} className="inline-flex min-h-11 items-center text-sm underline">
                Open {genreLabel(saved.section)}
              </Link>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted">{knownName ? step : step + 1} of {steps}</p>
          {step === 0 ? (
            <NameStep name={name} onChange={setName} onNext={() => name.trim() && setStep(1)} />
          ) : null}
          {step === 1 ? (
            <SituationStep
              onPick={(id) => {
                setAudience(id);
                setStep(2);
              }}
            />
          ) : null}
          {step === 2 && path ? <WorkStep ask={path.ask} choices={path.choices} onPick={finish} /> : null}
          <button
            type="button"
            className="mt-6 text-sm text-muted"
            onClick={() => {
              if (step <= (knownName ? 1 : 0)) setOpen(false);
              else setStep((value) => value - 1);
            }}
          >
            {step <= (knownName ? 1 : 0) ? "Close" : "Back"}
          </button>
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
        What should I call you?
      </label>
      <TextInput id="match-name" className="mt-4" value={name} placeholder="Your name" onChange={(event) => onChange(event.target.value)} />
      <Button tone="primary" className="mt-4" disabled={!name.trim()}>
        Continue
      </Button>
    </form>
  );
}

function SituationStep({ onPick }: { onPick: (id: AudienceId) => void }) {
  return (
    <div className="mt-3">
      <p className="font-display text-2xl tracking-tight">Which of these is true today?</p>
      <div className="mt-4 grid gap-2">
        {SITUATIONS.map((item) => (
          <button key={item.id} type="button" className="rounded-2xl bg-paper px-4 py-4 text-left" onClick={() => onPick(item.id)}>
            <span className="block font-medium">{item.label}</span>
            <span className="mt-1 block text-sm text-muted">{item.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkStep({ ask, choices, onPick }: { ask: string; choices: Choice[]; onPick: (choice: Choice) => void }) {
  const [picked, setPicked] = useState<Choice | null>(null);
  if (picked) {
    return (
      <div className="mt-3 max-w-xl">
        <p className="font-display text-2xl tracking-tight text-balance">Start with {genreLabel(picked.section)}.</p>
        <p className="mt-3 text-pretty text-muted">{picked.detail} The three apps in that section are included with your account.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button tone="primary" onClick={() => onPick(picked)}>
            Keep this
          </Button>
          <Button tone="quiet" onClick={() => setPicked(null)}>
            That is not it
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <p className="font-display text-2xl tracking-tight">{ask}</p>
      <div className="mt-4 grid gap-2">
        {choices.map((choice) => (
          <button key={choice.section} type="button" className="rounded-2xl bg-paper px-4 py-4 text-left" onClick={() => setPicked(choice)}>
            <span className="block font-medium">{choice.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
