import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { buttonClass } from "@/components/ui";

const EMAIL = "hello@midnry.com";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Midnry" },
      { name: "description", content: "How to reach Midnry: one email address for help, billing questions and security reports." },
    ],
  }),
  component: ContactPage,
});

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-line sm:p-8">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-pretty text-muted">{children}</div>
    </section>
  );
}

const inline = "text-ink underline underline-offset-4 hover:text-pine";

function ContactPage() {
  return (
    <Shell>
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl tracking-tight text-balance">Contact</h1>
        <p className="mt-4 text-pretty text-muted">
          Midnry has one address for everything: help with an app or a game, billing, your account, and security.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a href={`mailto:${EMAIL}`} className={buttonClass({ tone: "primary" })}>
            Email {EMAIL}
          </a>
        </div>

        <div className="mt-10 space-y-6">
          <Block title="What to include">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>The email address on your Midnry account.</li>
              <li>The app or game, for example Remind, Cycle or Outpost Zero.</li>
              <li>What happened: what you did, what you expected, and what you saw instead.</li>
              <li>Your device and browser, if something looks broken.</li>
            </ul>
            <p>Never send your password, a two-step code, a backup code or a card number. Midnry will never ask for them.</p>
            <p>
              Playing Abuja Hustle? The Feedback box in the game's pause menu sends your note along with where you are in
              the game, which helps with bugs.
            </p>
          </Block>

          <Block title="Billing">
            <p>
              Midnry Pass is billed through Paystack. To cancel renewal, turn it back on or update your card, go to{" "}
              <Link to="/billing" className={inline}>
                Billing
              </Link>
              . Canceling keeps the pass until the end of the period you've paid for.
            </p>
            <p>For a question about a charge, email us with the date and amount, and the email you paid with.</p>
          </Block>

          <Block title="Your data and your account">
            <p>
              You can delete your account yourself with the Delete account button on the{" "}
              <Link to="/account" className={inline}>
                Account
              </Link>{" "}
              page, or by emailing us.
            </p>
            <p>
              To ask for a copy of your data or a correction, email us from the address on the account. We'll reply
              within 30 days, and may need to confirm it's you. See the{" "}
              <Link to="/privacy" className={inline}>
                Privacy
              </Link>{" "}
              page for what Midnry keeps.
            </p>
          </Block>

          <Block title="Security">
            <p>
              If you've found a security problem, email {EMAIL} with “Security” in the subject and the steps to see it.
              Please don't access other people's data while checking.
            </p>
            <p>
              To protect your own account, turn on{" "}
              <Link to="/account" hash="security" className={inline}>
                two-step verification
              </Link>
              .
            </p>
          </Block>
        </div>

        <p className="mt-8 text-sm text-muted">
          <Link to="/privacy" className={inline}>
            Privacy
          </Link>
          <span aria-hidden> · </span>
          <Link to="/terms" className={inline}>
            Terms
          </Link>
        </p>
      </div>
    </Shell>
  );
}
