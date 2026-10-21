import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { PricingPanel } from "@/components/pricing-panel";
import { AppMark } from "@/components/app-mark";
import { isGeneral } from "@/components/desk-list";
import { AUDIENCES, audienceOf, sectionOf } from "@/lib/sections";
import { pitchFor } from "@/lib/pitches";
import { BILLING_FACTS, FREE_APPS, FREE_LABEL, PASS_APPS, PASS_EXTRAS, PASS_FEATURES, PASS_LABEL, PLAN_SUMMARY } from "@/lib/plans";
import type { AppDef } from "@/lib/catalog";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [{ title: "Pricing — Midnry" }, { name: "description", content: PLAN_SUMMARY }],
  }),
  component: PricingPage,
});

const GROUP_TITLES: Record<string, string> = {
  students: "For students",
  professionals: "For professionals",
  owners: "For business owners",
  seniors: "For home, health and family",
};

/** Free apps grouped by who they help, general tools first. */
function freeGroups(): { id: string; title: string; apps: AppDef[] }[] {
  const general = FREE_APPS.filter(isGeneral);
  const rest = FREE_APPS.filter((app) => !isGeneral(app));
  return [
    { id: "anyone", title: "For anyone", apps: general },
    ...AUDIENCES.map((audience) => ({
      id: audience.id,
      title: GROUP_TITLES[audience.id] ?? audience.label,
      apps: rest.filter((app) => audienceOf(sectionOf(app.genre) ?? "") === audience.id),
    })),
  ].filter((group) => group.apps.length > 0);
}

/** One app as a line: what it does, linking to its product page. */
function AppLine({ app }: { app: AppDef }) {
  return (
    <li>
      <Link
        to="/discover/$slug"
        params={{ slug: app.slug }}
        preload="intent"
        className="group flex min-h-11 gap-3 rounded-xl p-2 -mx-2 hover:bg-paper-2/60 outline-none focus-visible:outline-2 focus-visible:outline-pine"
      >
        <AppMark slug={app.slug} name={app.name} className="mt-0.5 size-9" />
        <span className="min-w-0">
          <span className="block font-medium group-hover:underline">{app.name}</span>
          <span className="block text-sm text-pretty text-muted">{pitchFor(app)}</span>
        </span>
      </Link>
    </li>
  );
}

function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        {q}
        <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none">
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="pb-5 text-pretty text-muted">{children}</div>
    </details>
  );
}

function PricingPage() {
  const groups = freeGroups();
  return (
    <Shell>
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-pine">Pricing</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight text-balance sm:text-6xl">Free to start. One plan for the rest.</h1>
        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted">{PLAN_SUMMARY}</p>
      </header>

      <div className="mt-10">
        <PricingPanel />
      </div>

      <section aria-labelledby="pass-title" className="mt-20">
        <p className="text-sm font-medium text-pine">{PASS_LABEL}</p>
        <h2 id="pass-title" className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          What Midnry Pass adds
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-muted">
          {PASS_APPS.length} tools, extra features in Remind, apps other makers add after review, and a weapon finish in {PASS_EXTRAS.outpostFinish.game}.
        </p>
        <ul className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {PASS_APPS.map((app) => (
            <AppLine key={app.slug} app={app} />
          ))}
        </ul>
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-card p-5 shadow-line sm:p-6">
            <div className="flex items-center gap-3">
              <AppMark slug="tasks" name="Remind" className="size-9" />
              <h3 className="font-display text-xl tracking-tight">Remind, with the Pass</h3>
            </div>
            <p className="mt-3 text-pretty text-muted">
              Remind is free. The Pass adds {PASS_FEATURES.tasks}.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-line sm:p-6">
            <h3 className="font-display text-xl tracking-tight">Apps by other makers</h3>
            <p className="mt-3 text-pretty text-muted">
              People can add their own apps to Midnry. Each one is reviewed before it appears, and every approved app opens with the
              Pass.{" "}
              <Link to="/submit" className="font-medium text-ink underline underline-offset-4">
                Add your app
              </Link>
            </p>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-line sm:p-6 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              {/* A swatch of the finish: gold chevrons on black, as the game paints it. */}
              <svg aria-hidden viewBox="0 0 36 36" className="size-9 shrink-0 rounded-xl">
                <rect width="36" height="36" fill={PASS_EXTRAS.outpostFinish.colors[0]} />
                <path
                  d="M3 7l5 4 5-4M15 7l5 4 5-4M27 7l5 4 5-4M-3 16l5 4 5-4M9 16l5 4 5-4M21 16l5 4 5-4M33 16l5 4 5-4M3 25l5 4 5-4M15 25l5 4 5-4M27 25l5 4 5-4"
                  fill="none"
                  stroke={PASS_EXTRAS.outpostFinish.colors[1]}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="font-display text-xl tracking-tight">{PASS_EXTRAS.outpostFinish.name}, in {PASS_EXTRAS.outpostFinish.game}</h3>
            </div>
            <p className="mt-3 text-pretty text-muted">
              A {PASS_EXTRAS.outpostFinish.look} weapon finish, in your Locker for as long as the Pass is active. It changes how a weapon
              looks, never how it plays.{" "}
              <Link to="/games/outpost-zero" className="font-medium text-ink underline underline-offset-4">
                About {PASS_EXTRAS.outpostFinish.game}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="free-title" className="mt-20">
        <p className="text-sm font-medium text-muted">{FREE_LABEL}</p>
        <h2 id="free-title" className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          The {FREE_APPS.length} free apps
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-muted">Every one opens as soon as you have an account. Open a group to see what each app does.</p>
        <div className="mt-6 border-b border-line">
          {groups.map((group, index) => (
            <details key={group.id} open={index === 0} className="group border-t border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="font-display text-xl tracking-tight">{group.title}</span>
                  <span className="ml-3 text-sm text-muted">{group.apps.length} apps</span>
                </span>
                <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none">
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <ul className="grid gap-x-8 gap-y-1 pb-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.apps.map((app) => (
                  <AppLine key={app.slug} app={app} />
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-title" className="mt-20 max-w-3xl">
        <h2 id="faq-title" className="font-display text-3xl tracking-tight">
          Questions about paying
        </h2>
        <div className="mt-4 border-b border-line">
          <Question q="Do I need a card for the free apps?">No. Create an account with your email or Google and the free apps open straight away.</Question>
          <Question q="How much is Midnry Pass, and in which currency?">{BILLING_FACTS[0]}</Question>
          <Question q="When am I charged again?">{BILLING_FACTS[1]}</Question>
          <Question q="What happens if I cancel?">
            {BILLING_FACTS[2]} After that, the free apps stay open and Pass apps lock again. You can cancel from{" "}
            <Link to="/billing" className="font-medium text-ink underline underline-offset-4">
              Billing
            </Link>
            .
          </Question>
          <Question q="Who handles the payment?">
            Paystack. You enter your card on Paystack’s checkout page, and the Pass opens once Paystack confirms the payment.
          </Question>
        </div>
      </section>
    </Shell>
  );
}
