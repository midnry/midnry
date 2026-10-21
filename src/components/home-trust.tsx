import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { APPS } from "@/lib/catalog";
import { buttonClass, cn } from "@/components/ui";
import { ArrowLink, SECTION_GAP, SectionHeader } from "@/components/home-section";

/**
 * Facts a visitor can rely on, each checked in the code, each with a page to read more:
 * - apps save to the signed-in account (src/lib/cove.functions.ts, app_documents by user),
 * - two-step verification lives on the account page (src/components/two-factor.tsx),
 * - Pass is paid by card through Paystack and canceling keeps access to the end of the
 *   paid month (src/lib/plans.ts BILLING_FACTS).
 */
type Fact = { title: string; text: string; link: ReactNode; icon: ReactNode };

const linkClass = "inline-flex min-h-11 items-center text-sm font-semibold text-pine";

const FACTS: Fact[] = [
  {
    title: "Saved to your account",
    text: "What you add is there when you sign in on another device.",
    link: (
      <Link to="/privacy" className={linkClass}>
        <ArrowLink>Privacy</ArrowLink>
      </Link>
    ),
    icon: <path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18z" />,
  },
  {
    title: "Two-step verification",
    text: "Add a code from an authenticator app to your sign-in.",
    link: (
      <Link to="/account" hash="security" className={linkClass}>
        <ArrowLink>Security</ArrowLink>
      </Link>
    ),
    icon: <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6zM9 12l2 2 4-4" />,
  },
  {
    title: "Cancel Pass any time",
    text: "Paid by card through Paystack. Access stays to the end of the month you paid for.",
    link: (
      <Link to="/terms" className={linkClass}>
        <ArrowLink>Terms</ArrowLink>
      </Link>
    ),
    icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2" />,
  },
  {
    title: "Small, focused apps",
    text: "Made for the things you do every day, in your browser. Nothing to install.",
    link: (
      <Link to="/about" className={linkClass}>
        <ArrowLink>About Midnry</ArrowLink>
      </Link>
    ),
    icon: <path d="M4 6.5h16v10H4zM9 20h6M12 16.5V20" />,
  },
];

export function TrustSection() {
  return (
    <section className={SECTION_GAP} aria-labelledby="trust-heading">
      <SectionHeader id="trust-heading" eyebrow="Good to know" title="How Midnry works, plainly" />
      <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map((fact) => (
          <li key={fact.title} className="flex gap-4 lg:flex-col lg:gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-pine/10 text-pine" aria-hidden>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {fact.icon}
              </svg>
            </span>
            <div>
              <h3 className="font-medium">{fact.title}</h3>
              <p className="mt-1 text-sm text-pretty text-muted">{fact.text}</p>
              {fact.link}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The last word on the page: one clear action, and a quiet line for app makers. */
export function ClosingSection({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <section
        className={`${SECTION_GAP} relative overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_top_left,#2b5fe6,#0b1f3d_72%)] px-6 py-12 text-white sm:px-12 sm:py-14`}
        aria-labelledby="closing-heading"
      >
        <div className="max-w-2xl">
          <h2 id="closing-heading" className="font-display text-title text-balance">
            Find the app that makes your day simpler.
          </h2>
          <p className="mt-3 text-lede text-pretty text-white/80">
            {APPS.length} apps for school, work, business and home, ready in your browser.
          </p>
          <Link to="/apps" className={cn(buttonClass(), "mt-8 bg-white px-6 text-[#0b1f3d] hover:bg-white/90 hover:opacity-100 focus-visible:outline-white")}>
            {signedIn ? "Open your apps" : "Explore the apps"}
          </Link>
        </div>
      </section>
      <p className="mt-6 text-center text-sm text-muted">
        Made an app?{" "}
        <Link to="/submit" className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4 hover:text-pine">
          Add it to Midnry
        </Link>
      </p>
    </>
  );
}
