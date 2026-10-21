import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { APPS } from "@/lib/catalog";
import { buttonClass, cn } from "@/components/ui";
import { SECTION_GAP, SectionHeader } from "@/components/home-section";

/**
 * Facts a visitor can rely on, each checked in the code:
 * - apps save to the signed-in account (src/lib/cove.functions.ts, app_documents by user),
 * - Pass is paid by card through Paystack and canceling keeps access to the end of the
 *   paid month (src/lib/plans.ts BILLING_FACTS),
 * - two-step verification lives on the account page (src/components/two-factor.tsx),
 * - Compressor re-encodes on the device (src/components/tools/compressor.tsx).
 */
const FACTS: { title: string; text: ReactNode; icon: ReactNode }[] = [
  {
    title: "Works in your browser",
    text: "On phones, tablets and computers. Nothing to install.",
    icon: <path d="M4 6.5h16v10H4zM9 20h6M12 16.5V20" />,
  },
  {
    title: "Saved to your account",
    text: "Your tasks, invoices, periods and notes are saved to your Midnry account, so they are there when you sign in on another device.",
    icon: <path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9.5 4.25 4.25 0 0 0 7 18z" />,
  },
  {
    title: "Paid through Paystack",
    text: "Midnry Pass is charged to a card through Paystack and renews each month.",
    icon: <path d="M3.5 7h17v10h-17zM3.5 10.5h17M7 14.5h4" />,
  },
  {
    title: "Cancel any time",
    text: "Canceling stops the renewal. Your access stays until the end of the month you paid for.",
    icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2" />,
  },
  {
    title: "Two-step verification",
    text: (
      <>
        You can add a code from an authenticator app to your sign-in, in your{" "}
        <Link to="/security" className="text-ink underline underline-offset-4">
          account security
        </Link>{" "}
        settings.
      </>
    ),
    icon: <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6zM9 12l2 2 4-4" />,
  },
  {
    title: "Some files never leave your device",
    text: "Compressor shrinks a video on your phone or computer. The video is not uploaded.",
    icon: <path d="M6 4.5h8l4 4V19.5H6zM14 4.5v4h4M12 11v6M9.5 14.5 12 17l2.5-2.5" />,
  },
];

export function TrustSection() {
  return (
    <section className={SECTION_GAP} aria-labelledby="trust-heading">
      <SectionHeader id="trust-heading" eyebrow="Good to know" title="How Midnry works, plainly" />
      <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {FACTS.map((fact) => (
          <li key={fact.title} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-pine/10 text-pine" aria-hidden>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {fact.icon}
              </svg>
            </span>
            <div>
              <h3 className="font-medium">{fact.title}</h3>
              <p className="mt-1 text-sm text-pretty text-muted">{fact.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The last word on the page: one clear action, then the invitation to app makers. */
export function ClosingSection({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <section
        className={`${SECTION_GAP} relative overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_top_left,#2b5fe6,#0b1f3d_72%)] px-6 py-12 text-white sm:px-12 sm:py-16`}
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

      <section className="mt-10 flex flex-col gap-4 rounded-3xl border border-dashed border-line p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" aria-labelledby="makers-heading">
        <div className="max-w-lg">
          <h2 id="makers-heading" className="font-display text-heading">
            Made an app? Add it to Midnry.
          </h2>
          <p className="mt-1 text-sm text-pretty text-muted">Upload it, we review it, and once it's on the desk you earn a share of Midnry Pass.</p>
        </div>
        <Link to="/submit" className={buttonClass({ tone: "quiet" })}>
          Add your app
        </Link>
      </section>
    </>
  );
}
