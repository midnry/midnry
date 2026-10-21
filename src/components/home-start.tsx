import { Link } from "@tanstack/react-router";
import { getApp } from "@/lib/catalog";
import { GOALS } from "@/lib/goals";
import { accessLabel } from "@/lib/plans";
import { AppMark } from "@/components/app-mark";
import { cn } from "@/components/ui";
import { ArrowLink, SECTION_GAP, SectionHeader } from "@/components/home-section";

/** Three free apps people reach for first: one benefit each, one next action. */
const PICKS: { slug: string; benefit: string; action: string }[] = [
  { slug: "tasks", benefit: "Type “pay rent every 25th” and Remind sets the date and the repeat for you.", action: "Try the Remind demo" },
  { slug: "invoice", benefit: "List the work and the tax. The total is worked out, ready to print or save as a PDF.", action: "Try the Invoice demo" },
  { slug: "cycle", benefit: "Log each period and see when the next one should start.", action: "See how Cycle works" },
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

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {PICKS.map(({ slug, benefit, action }) => {
          const app = getApp(slug);
          if (!app) return null;
          return (
            <li key={slug}>
              <Link
                to="/discover/$slug"
                params={{ slug }}
                className="group flex h-full flex-col rounded-3xl bg-card p-5 shadow-line sm:p-6 motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <AppMark slug={app.slug} name={app.name} className="size-12" />
                  <div className="min-w-0">
                    <h3 className="font-display text-heading">{app.name}</h3>
                    <AccessBadge tier={app.tier} className="mt-1" />
                  </div>
                </div>
                <p className="mt-4 flex-1 text-pretty text-ink-soft">{benefit}</p>
                <ArrowLink className="mt-5 text-sm text-pine">{action}</ArrowLink>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-10">
        <h3 className="text-sm font-semibold text-ink-soft" id="goals-heading">
          Or start from what you want to get done
        </h3>
        <ul className="mt-3 flex flex-wrap gap-2" aria-labelledby="goals-heading">
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
        <p className="mt-4 text-sm text-muted">
          Not sure where to start? Two quick questions suggest an app.{" "}
          <Link to="/apps" hash="finder" className="inline-flex min-h-11 items-center font-semibold text-pine">
            <ArrowLink>Help me choose</ArrowLink>
          </Link>
        </p>
      </div>
    </section>
  );
}
