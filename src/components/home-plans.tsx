import { Link } from "@tanstack/react-router";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { FREE_APPS, FREE_LABEL, PASS_APPS, PASS_FEATURES, PASS_LABEL } from "@/lib/plans";
import { ArrowLink, SECTION_GAP, SectionHeader } from "@/components/home-section";

/**
 * Free and Midnry Pass, by what the apps do. Every app named here is in the
 * catalogue with that tier (src/lib/catalog.ts and src/lib/kits.ts).
 */
const FREE_GROUPS: { what: string; apps: string }[] = [
  { what: "Organise your day", apps: "Remind for tasks and reminders" },
  { what: "Get paid", apps: "Invoice, Quote and Proposal" },
  { what: "Keep track of money", apps: "Budget, Pocket, Bills and a Nigeria tax estimate" },
  { what: "Health", apps: "Cycle, a medicines list, visits and a symptom diary" },
  { what: "Run a small business", apps: "Stock, Orders, Sales and a price list" },
  { what: "Study and work", apps: "Citations, lab reports, unit conversions and more" },
];

const PASS_GROUPS: { what: string; apps: string }[] = [
  { what: "Understand your spending", apps: "Ledger, plus Split for sharing a bill" },
  { what: "Apply for jobs", apps: "Apply tailors your CV for each role" },
  { what: "Plan your posts", apps: "Planner maps out a year of social media" },
  { what: "Stay focused", apps: "Pulse, Habits, Board and Scratch notes" },
  { what: "Make and check", apps: "Compressor, Contrast and Glyph" },
];

function Group({ what, apps, inverted = false }: { what: string; apps: string; inverted?: boolean }) {
  return (
    <li className="py-3">
      <p className={inverted ? "font-medium text-paper" : "font-medium text-ink"}>{what}</p>
      <p className={inverted ? "mt-0.5 text-sm text-pretty text-paper/75" : "mt-0.5 text-sm text-pretty text-muted"}>{apps}</p>
    </li>
  );
}

export function PlansSection() {
  return (
    <section className={SECTION_GAP} aria-labelledby="plans-heading">
      <SectionHeader
        id="plans-heading"
        eyebrow="Free and Midnry Pass"
        title="Most of it is free. Pass adds the rest."
        action={
          <Link to="/pricing" className="inline-flex min-h-11 items-center text-sm text-ink">
            <ArrowLink>See pricing</ArrowLink>
          </Link>
        }
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl bg-card p-6 shadow-line sm:p-8">
          <p className="text-sm font-medium text-ok">{FREE_LABEL}</p>
          <p className="mt-2 font-display text-title">{FREE_APPS.length} apps</p>
          <p className="mt-2 text-pretty text-muted">Create an account and they are yours. No card needed.</p>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {FREE_GROUPS.map((group) => (
              <Group key={group.what} {...group} />
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-ink p-6 text-paper shadow-line sm:p-8">
          <p className="text-sm font-medium text-paper/80">{PASS_LABEL}</p>
          <p className="mt-2 font-display text-title">
            {PASS_PRICE_LABEL}
            <span className="font-sans text-lg text-paper/75"> a month</span>
          </p>
          <p className="mt-2 text-pretty text-paper/80">
            Everything free, plus {PASS_APPS.length} more tools and the apps other makers add after review.
          </p>
          <ul className="mt-5 divide-y divide-paper/15 border-t border-paper/15">
            {PASS_GROUPS.map((group) => (
              <Group key={group.what} {...group} inverted />
            ))}
            <Group inverted what="More in Remind" apps={`${PASS_FEATURES.tasks[0].toUpperCase()}${PASS_FEATURES.tasks.slice(1)}`} />
          </ul>
        </div>
      </div>
    </section>
  );
}
