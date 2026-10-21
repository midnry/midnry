import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { CREATOR_POOL_PERCENT, MAX_APPS_PER_OWNER } from "@/lib/revenue";

const EMAIL = "hello@midnry.com";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Terms — Midnry" },
      { name: "description", content: "The terms for using Midnry: accounts, Midnry Pass, apps people add, games and fair use." },
    ],
  }),
  component: TermsPage,
});

/** Something only the owner can supply. Shown highlighted until the draft is approved. */
function Owner({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-950 ring-1 ring-amber-300 box-decoration-clone">
      [Owner to confirm: {children}]
    </mark>
  );
}

const SECTIONS = [
  ["using", "Using Midnry"],
  ["accounts", "Accounts"],
  ["pass", "Midnry Pass and payments"],
  ["apps", "Apps people add"],
  ["games", "Games"],
  ["use", "Acceptable use"],
  ["content", "Content you create"],
  ["availability", "Availability and changes"],
  ["liability", "Liability"],
  ["ending", "Ending your account"],
  ["contact", "Contact"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = SECTIONS.find(([key]) => key === id)?.[1];
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8">
      <h2 className="font-display text-3xl tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-pretty">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-muted">{children}</ul>;
}

const inline = "underline underline-offset-4 hover:text-pine";

function TermsPage() {
  return (
    <Shell>
      <article className="max-w-2xl break-words">
        <p
          role="note"
          className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <strong>Draft — awaiting approval.</strong> Highlighted items are for the owner to confirm before this page goes
          live.
        </p>
        <h1 className="font-display text-5xl tracking-tight">Terms</h1>
        <p className="mt-3 text-sm text-muted">Last updated: 21 October 2026</p>
        <p className="mt-5 text-pretty text-muted">
          These terms cover midnry.com, its apps and its games. By using Midnry you agree to them. Midnry is run by{" "}
          <Owner>legal name of the business</Owner>. How Midnry handles your information is on the{" "}
          <Link to="/privacy" className={inline}>
            Privacy
          </Link>{" "}
          page.
        </p>

        <nav aria-label="On this page" className="mt-8 rounded-2xl bg-card p-5 shadow-line">
          <p className="text-sm font-medium text-muted">On this page</p>
          <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {SECTIONS.map(([id, title]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-9 items-center hover:text-pine">
                  {title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          <Section id="using">
            <p>
              Midnry is a desk of small web apps, plus games. Some apps are free with an account. The rest, and apps
              other people add, open with Midnry Pass.
            </p>
            <p>
              Who can use Midnry: <Owner>minimum age</Owner>. Abuja Hustle is for adults 18 and over.
            </p>
            <p>Some apps are aids, not professional advice:</p>
            <List>
              <li>Cycle's dates are estimates. They are not medical advice and not birth control.</li>
              <li>
                Text written by AI can be wrong. Check names, facts and figures before you use it. Contract summaries are
                not legal advice.
              </li>
            </List>
          </Section>

          <Section id="accounts">
            <List>
              <li>You can sign up with an email and password, or with Google.</li>
              <li>
                Keep your password and backup codes safe. You're responsible for what happens on your account. You can
                turn on{" "}
                <Link to="/account" hash="security" className={inline}>
                  two-step verification
                </Link>{" "}
                for extra protection.
              </li>
              <li>Use an email address you can read. Payments and Remind emails use it.</li>
            </List>
          </Section>

          <Section id="pass">
            <Sub title="Midnry Pass">
              <List>
                <li>
                  Midnry Pass costs {PASS_PRICE_LABEL} (US dollars) a month, charged to your card through Paystack. It
                  opens once Paystack confirms the payment.
                </li>
                <li>It renews every month until you cancel.</li>
                <li>
                  You can cancel renewal on{" "}
                  <Link to="/billing" className={inline}>
                    Billing
                  </Link>{" "}
                  at any time. You keep the pass until the end of the period you've already paid for, and you can turn
                  renewal back on before then. You can update your card from the same page.
                </li>
                <li>
                  Refunds: <Owner>refund policy for Midnry Pass</Owner>
                </li>
                <li>
                  Price changes: <Owner>how much notice is given before the price changes</Owner>
                </li>
              </List>
            </Sub>
            <Sub title="Outpost Zero store">
              <List>
                <li>
                  The store sells optional weapon finishes, which change how your weapon looks. Each is a one-time
                  purchase, priced in naira or US dollars and paid through Paystack. Purchases belong to the account that
                  bought them.
                </li>
                <li>One finish comes with Midnry Pass and can be used while the pass is active.</li>
                <li>
                  Refunds: <Owner>refund policy for store items</Owner>
                </li>
              </List>
            </Sub>
          </Section>

          <Section id="apps">
            <List>
              <li>
                Signed-in members can add an app on the{" "}
                <Link to="/submit" className={inline}>
                  Add
                </Link>{" "}
                page: one HTML file of up to 80 KB, with a name, a one-line description, features and steps. Each member
                can add up to {MAX_APPS_PER_OWNER} apps.
              </li>
              <li>
                Each upload stays off the desk until the admin opens it in a sandbox and approves it. The admin can turn
                it down with a note. Updates are reviewed too, and the approved version stays up until the update is
                approved.
              </li>
              <li>
                Approved apps open for Midnry Pass members. They run in a sandbox, so they can't read accounts or change
                Midnry.
              </li>
              <li>
                Approved apps share {CREATOR_POOL_PERCENT}% of the month's active Midnry Pass subscriptions, split by how
                often each app is opened. One person counts once per app per day, and opening your own app doesn't count.
                The{" "}
                <Link to="/earnings" className={inline}>
                  Earnings
                </Link>{" "}
                page shows your share.
              </li>
              <li>
                Payouts: <Owner>how and when creator earnings are paid, and any minimum</Owner>
              </li>
              <li>
                Only add an app you have the right to share. It must not harm people's devices, collect their personal
                information, or break the law.
              </li>
              <li>
                <Owner>the permission makers give Midnry to host and show their app, and whether Midnry can take an approved app off the desk</Owner>
              </li>
            </List>
          </Section>

          <Section id="games">
            <Sub title="Outpost Zero">
              <List>
                <li>Free to play. You can play one match on a device without an account, then you need to sign in.</li>
                <li>
                  Online rooms put you with other players. The name you choose is shown to them, and on the daily
                  leaderboard if you share a score.
                </li>
                <li>
                  Nearby voice is optional and push-to-talk. Treat other players with respect, in voice and in names.
                </li>
              </List>
            </Sub>
            <Sub title="Abuja Hustle">
              <List>
                <li>
                  A satire for adults 18 and over. It deals with money, debt, crime, relationships, pregnancy, death and
                  violence. It is fiction.
                </li>
                <li>
                  If you share a finished life to the Hall of Fame, its in-game name and numbers are public. Results that
                  look edited are turned away.
                </li>
              </List>
            </Sub>
          </Section>

          <Section id="use">
            <p>When you use Midnry, don't:</p>
            <List>
              <li>break the law, or use Midnry to harm, harass, threaten or deceive anyone;</li>
              <li>try to get into other people's accounts, or into parts of Midnry you aren't meant to reach;</li>
              <li>overload the site, get around limits (such as the daily AI writing limit), or cheat in games;</li>
              <li>upload harmful code, or content you don't have the right to share;</li>
              <li>use AI writing to make spam or to mislead people.</li>
            </List>
            <p>
              Midnry may limit or suspend an account that breaks these rules.{" "}
              <Owner>how suspensions are decided and whether people are told first</Owner>
            </p>
          </Section>

          <Section id="content">
            <List>
              <li>
                What you write and save in apps stays yours. You let Midnry store it and show it back to you, and to the
                people you share it with, such as members of a shared Remind project, so the apps work.
              </li>
              <li>
                Text written by AI is yours to check and use. You're responsible for what you send or publish.
              </li>
              <li>Feedback you send, such as through Abuja Hustle's Feedback box, may be used to improve Midnry.</li>
            </List>
          </Section>

          <Section id="availability">
            <List>
              <li>
                Midnry is a small service. Apps, games and features may change, be added or be removed, and the site may
                sometimes be down or have payments paused.
              </li>
              <li>
                When these terms change, this page is updated and the date at the top changes.{" "}
                <Owner>how people are told about changes</Owner>
              </li>
            </List>
          </Section>

          <Section id="liability">
            <p>
              Midnry is provided as it is, and you use it at your own risk. <Owner>liability wording, ideally checked by a lawyer</Owner>
            </p>
            <p>
              The law that applies to these terms: <Owner>country whose law applies</Owner>
            </p>
          </Section>

          <Section id="ending">
            <List>
              <li>
                You can stop using Midnry at any time. If you have Midnry Pass, cancel renewal on{" "}
                <Link to="/billing" className={inline}>
                  Billing
                </Link>{" "}
                first.
              </li>
              <li>
                There's no delete-account button yet. To close your account, email{" "}
                <a href={`mailto:${EMAIL}`} className={inline}>
                  {EMAIL}
                </a>{" "}
                from the address on the account.
              </li>
              <li>
                <Owner>what happens to saved data, unused pass time and store items when an account is closed</Owner>
              </li>
            </List>
          </Section>

          <Section id="contact">
            <p>
              Questions about these terms go to{" "}
              <a href={`mailto:${EMAIL}`} className={inline}>
                {EMAIL}
              </a>
              . See also{" "}
              <Link to="/contact" className={inline}>
                Contact
              </Link>
              .
            </p>
          </Section>
        </div>
      </article>
    </Shell>
  );
}
