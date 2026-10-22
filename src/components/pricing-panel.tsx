import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { BILLING_FACTS, FREE_APPS, FREE_LABEL, PASS_APPS, PASS_EXTRAS, PASS_FEATURES, PASS_LABEL } from "@/lib/plans";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { buttonClass, cn, Skeleton } from "@/components/ui";

function Tick({ light }: { light?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("mt-0.5 size-5 shrink-0", light ? "text-paper" : "text-pine")} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.14" />
      <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Point({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <li className="flex gap-3">
      <Tick light={light} />
      <span className="text-pretty">{children}</span>
    </li>
  );
}

/** The two plans side by side, with the action that fits whoever is looking. */
export function PricingPanel() {
  const { user, isPending } = useCurrentUserState();
  const { account, loading } = useAccount();
  const waiting = isPending || (!!user && loading);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <article aria-labelledby="plan-free" className="flex flex-col rounded-3xl bg-card p-6 shadow-line sm:p-8">
        <p className="text-sm font-medium text-muted">{FREE_LABEL}</p>
        <h2 id="plan-free" className="mt-3 font-display text-4xl tracking-tight text-balance">
          Free account
        </h2>
        <p className="mt-4 font-display text-6xl tabular-nums">$0</p>
        <p className="mt-1 text-sm text-muted">No card needed.</p>
        <ul className="mt-6 space-y-3">
          <Point>
            <strong className="font-medium">{FREE_APPS.length} apps</strong> for school, work, business and home, including Remind,
            Invoice and Cycle
          </Point>
          <Point>Each app opens as soon as your account exists</Point>
          <Point>Your work saves to your account</Point>
        </ul>
        <div className="mt-auto pt-8">
          {waiting ? (
            <Skeleton className="h-11 w-44 rounded-full" />
          ) : user ? (
            <Link to="/apps" className={buttonClass({ tone: "quiet" })}>
              Open your apps
            </Link>
          ) : (
            <Link to="/login" search={{ next: "/apps", intent: "register" }} className={buttonClass({ tone: "primary" })}>
              Create a free account
            </Link>
          )}
        </div>
      </article>

      <article aria-labelledby="plan-pass" className="flex flex-col rounded-3xl bg-pine p-6 text-paper sm:p-8">
        <p className="text-sm font-medium text-paper/90">{PASS_LABEL}</p>
        <h2 id="plan-pass" className="mt-3 font-display text-4xl tracking-tight text-balance">
          Midnry Pass
        </h2>
        <p className="mt-4 font-display text-6xl tabular-nums">
          {PASS_PRICE_LABEL}
          <span className="ml-2 font-sans text-base text-paper/90">US dollars a month</span>
        </p>
        <p className="mt-1 text-sm text-paper/90">Everything in the free account, plus:</p>
        <ul className="mt-6 space-y-3">
          <Point light>
            <strong className="font-medium">{PASS_APPS.length} more tools</strong>, like Ledger, Apply and Planner
          </Point>
          <Point light>Remind’s Pass features: {PASS_FEATURES.tasks}</Point>
          <Point light>In the Study space: {PASS_FEATURES.study}</Point>
          <Point light>In the Writing studio: {PASS_FEATURES.write}</Point>
          <Point light>Apps other makers add, once they pass review</Point>
          <Point light>
            <strong className="font-medium">{PASS_EXTRAS.outpostFinish.name}</strong>, a {PASS_EXTRAS.outpostFinish.look} weapon finish in{" "}
            {PASS_EXTRAS.outpostFinish.game} (looks only)
          </Point>
        </ul>
        <ul className="mt-6 space-y-1 border-t border-paper/25 pt-4 text-sm text-paper/90">
          {BILLING_FACTS.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          {waiting ? (
            <Skeleton className="h-11 w-40 rounded-full bg-paper/15" />
          ) : !user ? (
            <Link to="/login" search={{ next: "/billing", intent: "register" }} className={buttonClass({ tone: "paper" })}>
              Get Midnry Pass
            </Link>
          ) : account?.hasPass ? (
            <Link to="/billing" className={buttonClass({ tone: "paper" })}>
              Manage billing
            </Link>
          ) : (
            <Link to="/billing" className={buttonClass({ tone: "paper" })}>
              Get Midnry Pass
            </Link>
          )}
          {!waiting && !user ? (
            <p className="mt-3 text-sm text-paper/90">You’ll create a free account first, then pay on Paystack’s checkout page.</p>
          ) : null}
        </div>
      </article>
    </div>
  );
}
