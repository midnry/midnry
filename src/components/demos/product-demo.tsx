import { useId, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { getApp } from "@/lib/catalog";
import { accessLabel } from "@/lib/plans";
import { AppMark } from "@/components/app-mark";
import { cn } from "@/components/ui";
import { SampleBadge } from "./demo-kit";
import { RemindDemo } from "./remind-demo";
import { InvoiceDemo } from "./invoice-demo";
import { LedgerDemo } from "./ledger-demo";

type DemoDef = { slug: string; use: string; intro: string; Demo: ComponentType };

/** The apps with a hands-on sample. Product pages for other apps use real screenshots. */
export const DEMOS: readonly DemoDef[] = [
  {
    slug: "tasks",
    use: "Plan your day",
    intro: "Remind turns a plain sentence into a task, with the date, repeat and priority already set.",
    Demo: RemindDemo,
  },
  {
    slug: "invoice",
    use: "Bill a client",
    intro: "Invoice does the sums for you and lays out a clean sheet, ready to print or save as a PDF.",
    Demo: InvoiceDemo,
  },
  {
    slug: "ledger",
    use: "Track spending",
    intro: "Ledger adds up the month, shows which category took the most and, if you set a budget, how much is left.",
    Demo: LedgerDemo,
  },
];

export function hasDemo(slug: string): boolean {
  return DEMOS.some((demo) => demo.slug === slug);
}

const FRAME = "overflow-hidden rounded-[1.75rem] bg-card shadow-[0_0_0_1px_var(--shadow-tint),0_30px_70px_-40px_rgba(16,32,51,0.45)]";

/** Homepage: Remind, Invoice and Ledger in one frame, switched with tabs (no autoplay). */
export function ProductDemo({ className }: { className?: string }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const last = DEMOS.length - 1;
    const next =
      event.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : event.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className={cn(FRAME, className)}>
      <div className="flex flex-col gap-3 border-b border-line bg-paper-2/60 px-3 pt-3 pb-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Choose an app to try" onKeyDown={onKey} className="grid grid-cols-3 gap-1 rounded-2xl bg-paper p-1 shadow-line sm:inline-grid">
          {DEMOS.map((demo, index) => {
            const app = getApp(demo.slug);
            const on = index === active;
            return (
              <button
                key={demo.slug}
                ref={(el) => {
                  tabs.current[index] = el;
                }}
                id={`${base}-tab-${demo.slug}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${base}-panel-${demo.slug}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(index)}
                className={cn(
                  "flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-2 text-left motion-safe:transition-colors sm:justify-start sm:px-3.5",
                  on ? "bg-card text-ink shadow-line" : "text-muted hover:bg-card/60 hover:text-ink",
                )}
              >
                <AppMark slug={demo.slug} name={app?.name} className="hidden size-7 sm:block" />
                <span className="min-w-0 leading-tight">
                  <span className="block text-sm font-semibold">{app?.name}</span>
                  <span className="hidden text-xs whitespace-nowrap text-muted sm:block">{demo.use}</span>
                </span>
              </button>
            );
          })}
        </div>
        <SampleBadge className="self-start lg:self-auto" />
      </div>
      {DEMOS.map((demo, index) => {
        const app = getApp(demo.slug);
        if (!app) return null;
        const on = index === active;
        return (
          <div
            key={demo.slug}
            id={`${base}-panel-${demo.slug}`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${demo.slug}`}
            hidden={!on}
            tabIndex={0}
            className="p-4 focus-visible:outline-offset-[-4px] sm:p-6 lg:p-8"
          >
            <p className="max-w-2xl text-pretty text-ink-soft sm:text-lg">{demo.intro}</p>
            <div className="mt-6">
              <demo.Demo />
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {app.name}: <span className="font-medium text-ink">{accessLabel(app.tier)}</span>
              </p>
              <Link to="/discover/$slug" params={{ slug: app.slug }} className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-pine">
                See how {app.name} works
                <span aria-hidden className="motion-safe:transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Product page: one app's sample, in the same frame. */
export function AppDemo({ slug, className }: { slug: string; className?: string }) {
  const demo = DEMOS.find((item) => item.slug === slug);
  if (!demo) return null;
  return (
    <div className={cn(FRAME, className)}>
      <div className="flex flex-col gap-3 border-b border-line bg-paper-2/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium">Try it here</p>
        <SampleBadge className="self-start sm:self-auto" />
      </div>
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="max-w-2xl text-pretty text-ink-soft sm:text-lg">{demo.intro}</p>
        <div className="mt-6">
          <demo.Demo />
        </div>
      </div>
    </div>
  );
}
