import { Link } from "@tanstack/react-router";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { FREE_APPS, FREE_LABEL, PASS_APPS, PASS_LABEL } from "@/lib/plans";
import { buttonClass, cn } from "@/components/ui";
import { SECTION_GAP, SectionHeader } from "@/components/home-section";

/**
 * Free vs Midnry Pass in one look. Counts come from the catalogue
 * (src/lib/plans.ts); the full lists and billing details live on /pricing.
 */
export function PlansSection() {
  return (
    <section className={SECTION_GAP} aria-labelledby="plans-heading">
      <SectionHeader id="plans-heading" eyebrow="Free and Midnry Pass" title="Most of it is free. Pass adds the rest." />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-card p-6 shadow-line sm:p-7">
          <p className="text-sm font-medium text-ok">{FREE_LABEL}</p>
          <p className="mt-2 font-display text-title">{FREE_APPS.length} apps</p>
          <p className="mt-2 text-pretty text-muted">Create an account and they are yours. No card needed.</p>
        </div>
        <div className="rounded-3xl bg-ink p-6 text-paper shadow-line sm:p-7">
          <p className="text-sm font-medium text-paper/80">{PASS_LABEL}</p>
          <p className="mt-2 font-display text-title">
            {PASS_PRICE_LABEL}
            <span className="font-sans text-lg text-paper/75"> a month</span>
          </p>
          <p className="mt-2 text-pretty text-paper/80">Everything free, plus {PASS_APPS.length} more tools and extras, like more features in Remind.</p>
        </div>
      </div>
      <Link to="/pricing" className={cn(buttonClass({ tone: "quiet" }), "mt-5")}>
        Compare Free and Pass
      </Link>
    </section>
  );
}
