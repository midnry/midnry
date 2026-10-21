import { Link } from "@tanstack/react-router";
import { getApp } from "@/lib/catalog";
import { GOALS } from "@/lib/goals";
import { accessLabel } from "@/lib/plans";
import { pitchFor } from "@/lib/pitches";
import { AppMark } from "@/components/app-mark";
import { cn } from "@/components/ui";
import { ArrowLink, SECTION_GAP, SectionHeader } from "@/components/home-section";

/** Three free apps people reach for first, with what each one is for (from the catalogue's features). */
const PICKS: { slug: string; uses: string[] }[] = [
  { slug: "tasks", uses: ["Set reminders in plain words", "Repeat them every week, month or 25th", "Earn points for what you finish"] },
  { slug: "invoice", uses: ["List the work, quantities and tax", "Get the total worked out for you", "Print it, or save it as a PDF"] },
  { slug: "cycle", uses: ["Log the first and last day of a period", "See when the next one should start", "Keep a note for each period"] },
];

export function AccessBadge({ tier, className }: { tier: "free" | "pass"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tier === "free" ? "bg-ok/10 text-ok" : "bg-pine/10 text-pine",
        className,
      )}
    >
      {accessLabel(tier)}
    </span>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden>
      <path d="M5 10.5l3 3L15 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StartHere() {
  return (
    <section className={SECTION_GAP} aria-labelledby="start-heading">
      <SectionHeader
        id="start-heading"
        eyebrow="Start here"
        title="Three apps to begin with"
        action={
          <Link to="/apps" className="inline-flex min-h-11 items-center text-sm text-ink">
            <ArrowLink>See all the apps</ArrowLink>
          </Link>
        }
      >
        Each is free with an account, and works on your phone and your computer.
      </SectionHeader>

      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {PICKS.map(({ slug, uses }) => {
          const app = getApp(slug);
          if (!app) return null;
          return (
            <li key={slug}>
              <Link
                to="/discover/$slug"
                params={{ slug }}
                className="group flex h-full flex-col rounded-3xl bg-card p-6 shadow-line motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <AppMark slug={app.slug} name={app.name} className="size-12" />
                  <div className="min-w-0">
                    <h3 className="font-display text-heading">{app.name}</h3>
                    <AccessBadge tier={app.tier} className="mt-1" />
                  </div>
                </div>
                <p className="mt-4 text-pretty text-ink-soft">{pitchFor(app)}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                  {uses.map((use) => (
                    <li key={use} className="flex gap-2">
                      <Tick />
                      {use}
                    </li>
                  ))}
                </ul>
                <ArrowLink className="mt-6 text-sm text-pine">See how {app.name} works</ArrowLink>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-12">
        <h3 className="text-sm font-semibold text-ink-soft" id="goals-heading">
          Or start from what you want to get done
        </h3>
        <ul className="mt-4 flex flex-wrap gap-2" aria-labelledby="goals-heading">
          {GOALS.map((goal) => {
            const app = goal.target === "games" ? undefined : getApp(goal.target);
            const chip =
              "inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-sm shadow-line hover:bg-paper-2 motion-safe:transition-colors";
            const body = (
              <>
                <span className="font-medium text-ink">{goal.label}</span>
                <span className="text-muted">
                  {goal.hint}
                  {app?.tier === "pass" ? " · Pass" : ""}
                </span>
              </>
            );
            return (
              <li key={goal.id}>
                {app ? (
                  <Link to="/discover/$slug" params={{ slug: app.slug }} className={chip}>
                    {body}
                  </Link>
                ) : (
                  <a href="/games" className={chip}>
                    {body}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-line p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h3 className="font-display text-heading">Not sure where to start?</h3>
          <p className="mt-1 text-pretty text-muted">Answer two quick questions and we'll suggest an app for you.</p>
        </div>
        <Link
          to="/apps"
          hash="finder"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-card px-5 text-sm font-medium text-ink shadow-line hover:bg-paper-2"
        >
          Help me choose
        </Link>
      </div>
    </section>
  );
}
