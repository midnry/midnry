import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { BrandLogo } from "@/components/brand";
import { buttonClass } from "@/components/ui";
import { APPS } from "@/lib/catalog";
import { BILLING_FACTS, FREE_APPS, PASS_APPS, PASS_PRICE_LINE } from "@/lib/plans";
import { CREATOR_POOL_PERCENT } from "@/lib/revenue";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Midnry" },
      {
        name: "description",
        content: `Midnry is a desk of ${APPS.length} browser apps for school, work, business and home, plus two free games. ${FREE_APPS.length} apps are free with an account.`,
      },
    ],
  }),
  component: AboutPage,
});

const CONTACT = "hello@midnry.com";

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-line py-5 sm:grid-cols-[14rem_1fr] sm:gap-8">
      <dt className="font-medium">{term}</dt>
      <dd className="text-pretty text-muted">{children}</dd>
    </div>
  );
}

function AboutPage() {
  return (
    <Shell>
      <header className="max-w-3xl">
        <BrandLogo variant="full" height={84} label="Midnry — a desk of web apps" className="mb-8 h-16 w-auto sm:mb-10 sm:h-21" />
        <p className="text-sm font-medium text-pine">About Midnry</p>
        <h1 className="mt-2 font-display text-5xl tracking-tight text-balance sm:text-6xl">Small, useful apps for the things you do every day.</h1>
        <p className="mt-5 max-w-2xl text-lg text-pretty text-muted">
          Midnry is a desk of {APPS.length} web apps for school, work, business and home, plus two free games. Each app does one job,
          like sending an invoice, keeping reminders or logging a period, and runs in your browser on a phone or a computer.
        </p>
      </header>

      <section aria-label="What you will find" className="mt-12 grid gap-3 md:grid-cols-3">
        <div className="flex flex-col rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-2xl tracking-tight">Apps</h2>
          <p className="mt-2 text-sm text-pretty text-muted">
            Tools for students, professionals, business owners and everyday life. {FREE_APPS.length} are free with an account;
            Midnry Pass adds {PASS_APPS.length} more.
          </p>
          <Link to="/apps" className="mt-auto inline-flex min-h-11 items-center pt-4 text-sm font-medium text-pine underline-offset-4 hover:underline">
            Browse the apps <span aria-hidden className="ml-1">→</span>
          </Link>
        </div>
        <div className="flex flex-col rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-2xl tracking-tight">Games</h2>
          <p className="mt-2 text-sm text-pretty text-muted">
            Abuja Hustle, a life sim set in Abuja for adults, and Outpost Zero, a Midnry original about a medevac rescue with hidden
            saboteurs. Both are free to play.
          </p>
          <Link to="/games" className="mt-auto inline-flex min-h-11 items-center pt-4 text-sm font-medium text-pine underline-offset-4 hover:underline">
            See the games <span aria-hidden className="ml-1">→</span>
          </Link>
        </div>
        <div className="flex flex-col rounded-2xl bg-card p-6 shadow-line">
          <h2 className="font-display text-2xl tracking-tight">Apps by other makers</h2>
          <p className="mt-2 text-sm text-pretty text-muted">
            Anyone with an account can add an app. Each one is reviewed in a sandbox before it appears, and approved apps share{" "}
            {CREATOR_POOL_PERCENT}% of Midnry Pass revenue after payment fees and refunds, shared by opens.
          </p>
          <Link to="/submit" className="mt-auto inline-flex min-h-11 items-center pt-4 text-sm font-medium text-pine underline-offset-4 hover:underline">
            Add your app <span aria-hidden className="ml-1">→</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mt-16 max-w-4xl">
        <h2 id="how-title" className="font-display text-3xl tracking-tight">
          How it works
        </h2>
        <dl className="mt-4 border-b border-line">
          <Fact term="Where it runs">In your web browser, on a phone, tablet or computer. There is nothing to install.</Fact>
          <Fact term="Your account">
            Sign up with your email or with Google. No card is needed. Apps save your work to your account, so it is there when you
            come back. A few tools, like Compressor, work on your device and upload nothing.
          </Fact>
          <Fact term="What is free">
            {FREE_APPS.length} apps, including Remind, Invoice and Cycle, are free with an account. They open as soon as the account
            exists.
          </Fact>
          <Fact term="Midnry Pass">
            {PASS_PRICE_LINE} (US dollars). It adds {PASS_APPS.length} more tools, extra features in Remind, and apps other makers add
            after review. {BILLING_FACTS[1]} {BILLING_FACTS[2]}{" "}
            <Link to="/pricing" className="font-medium text-ink underline underline-offset-4">
              See pricing
            </Link>
          </Fact>
          <Fact term="Payments">
            Card payments go through Paystack. You enter card details on Paystack’s checkout page, not on Midnry.
          </Fact>
          <Fact term="Security">
            You can turn on two-step verification with an authenticator app, with backup codes in case you lose your phone.{" "}
            <Link to="/security" className="font-medium text-ink underline underline-offset-4">
              Account security
            </Link>
          </Fact>
        </dl>
      </section>

      <section className="mt-16 flex flex-col gap-6 rounded-3xl bg-pine p-6 text-paper sm:p-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-lg">
          <h2 className="font-display text-3xl tracking-tight">Questions or ideas?</h2>
          <p className="mt-2 text-pretty text-paper/90">
            Write to{" "}
            <a href={`mailto:${CONTACT}`} className="font-medium underline underline-offset-4">
              {CONTACT}
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/apps" className={buttonClass({ tone: "paper" })}>
            Browse the apps
          </Link>
          <Link
            to="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-paper ring-1 ring-paper/50 hover:bg-paper/10"
          >
            See pricing
          </Link>
        </div>
      </section>
    </Shell>
  );
}
