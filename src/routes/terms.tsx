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
          <strong>Draft — awaiting approval.</strong> This wording is waiting for the owner's approval before this page
          goes live.
        </p>
        <h1 className="font-display text-5xl tracking-tight">Terms</h1>
        <p className="mt-3 text-sm text-muted">Last updated: 21 October 2026</p>
        <p className="mt-5 text-pretty text-muted">
          These terms cover midnry.com, its apps and its games. By using Midnry you agree to them. Midnry is run by
          Midnry Ltd (“Midnry”, “we”). How Midnry handles your information is on the{" "}
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
            <p>Who can use Midnry:</p>
            <List>
              <li>You must be at least 13 to use Midnry. When you create an account you confirm this, or that you have a parent's or guardian's permission.</li>
              <li>
                If you're under 18, you need a parent's or guardian's permission, and they should make any payments.
              </li>
              <li>Midnry Pass and store purchases need someone 18 or over, or a parent or guardian paying. You confirm this before paying.</li>
              <li>Abuja Hustle is for adults 18 and over.</li>
            </List>
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
                  at any time. Your next renewal is stopped, and you keep the pass until the end of the month you've
                  already paid for. You can turn renewal back on before then. You can update your card from the same
                  page.
                </li>
                <li>
                  Refunds: payments aren't refunded for part of a month or for unused time. There are three exceptions,
                  if you contact us within 14 days of the charge: we refund a duplicate charge, a charge made after you
                  cancelled, or a month in which Midnry was unavailable to you because of a fault on our side that we
                  couldn't fix.
                </li>
                <li>
                  Price changes: we give at least 30 days' notice by email. The new price applies from your first renewal
                  after the notice period. If you don't want to continue, cancel before then.
                </li>
                <li>None of this affects the rights you have under consumer law.</li>
              </List>
            </Sub>
            <Sub title="Outpost Zero store">
              <List>
                <li>
                  The store sells optional weapon finishes, which change how your weapon looks. They are digital
                  cosmetic items. Each is a one-time purchase, priced in naira or US dollars and paid through Paystack,
                  and is delivered to your account straight after payment. Purchases belong to the account that bought
                  them.
                </li>
                <li>One finish comes with Midnry Pass and can be used while the pass is active.</li>
                <li>
                  Refunds: all sales are final once the item is delivered. The exceptions are an item that wasn't
                  delivered, being charged twice, or a pricing error. Tell us within 14 days.
                </li>
                <li>
                  Items have no cash value and can't be transferred or sold. They end if your account is closed or the
                  game is retired. We'll give reasonable notice before a game is retired where we can.
                </li>
                <li>None of this affects the rights you have under consumer law.</li>
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
                Earnings: approved apps share {CREATOR_POOL_PERCENT}% of the month's revenue from active Midnry Pass
                subscriptions, after payment fees and refunds. Your share is that pool times your
                app's opens, divided by every approved app's opens. One person counts once per app per day, and opening
                your own app doesn't count. The{" "}
                <Link to="/earnings" className={inline}>
                  Earnings
                </Link>{" "}
                page shows your share.
              </li>
              <li>
                Payouts: earnings are paid monthly by bank transfer, by the 15th of the following month, once your
                balance reaches US$20 (₦20,000 for a Nigerian bank account). Smaller balances roll over to the next month.
              </li>
              <li>
                You must give accurate payout details, and you're responsible for your own taxes.
              </li>
              <li>
                Earnings from fake or automated opens, or from apps that break these terms, are withheld.
              </li>
              <li>
                Only add an app you have the right to share. It must not harm people's devices, collect their personal
                information, or break the law.
              </li>
              <li>
                You keep ownership of your app. You give Midnry a worldwide, non-exclusive, royalty-free licence to host,
                review, run, display and promote it while it's on Midnry.
              </li>
              <li>
                Midnry doesn't have to publish any app. We may decline, remove or suspend an app at any time, for
                breaking these terms, for security, for legal risk or for quality. We'll usually explain why.
              </li>
              <li>
                To have your app taken down, email{" "}
                <a href={`mailto:${EMAIL}`} className={inline}>
                  {EMAIL}
                </a>
                .
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
              We may limit, suspend or close an account that breaks these terms, abuses others, commits fraud or makes
              chargebacks, or puts Midnry or its users at risk. We'll normally tell you first and give the reason,
              unless we must act quickly. You can appeal by emailing{" "}
              <a href={`mailto:${EMAIL}`} className={inline}>
                {EMAIL}
              </a>{" "}
              within 30 days.
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
                When these terms change, this page is updated and the date at the top changes.
              </li>
              <li>
                We email account holders about important changes at least 30 days before they take effect, or straight
                away if the law or security requires it. If you keep using Midnry after that, you accept the changes. If
                you don't agree, you can close your account.
              </li>
            </List>
          </Section>

          <Section id="liability">
            <List>
              <li>Midnry is provided “as is” and “as available”, and you use it at your own risk.</li>
              <li>
                Apps help with everyday tasks, but they aren't professional medical, legal, financial or tax advice.
                Check important results.
              </li>
              <li>
                As far as the law allows, we aren't liable for indirect or consequential loss, lost profits or lost
                data.
              </li>
              <li>
                Our total liability to you is limited to the greater of what you paid Midnry in the 12 months before the
                claim, or ₦50,000.
              </li>
              <li>Nothing in these terms limits liability that the law doesn't allow us to limit.</li>
              <li>
                You're responsible for the content you create. If your misuse of Midnry, or an app you submit, causes
                loss to Midnry or others, you agree to cover that loss.
              </li>
            </List>
            <Sub title="Law and disputes">
              <List>
                <li>
                  These terms are governed by the laws of the Federal Republic of Nigeria. Disputes go to the courts of
                  the Federal Capital Territory, Abuja.
                </li>
                <li>
                  Before going to court, please contact us first at{" "}
                  <a href={`mailto:${EMAIL}`} className={inline}>
                    {EMAIL}
                  </a>
                  , so we can try to resolve it informally within 30 days.
                </li>
              </List>
            </Sub>
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
                To close your account, use the Delete account button on the{" "}
                <Link to="/account" className={inline}>
                  Account
                </Link>{" "}
                page, or email{" "}
                <a href={`mailto:${EMAIL}`} className={inline}>
                  {EMAIL}
                </a>{" "}
                from the address on the account.
              </li>
              <li>
                Your saved data is kept for 30 days, so the account can be restored if it was closed by mistake. Then
                it's permanently deleted.
              </li>
              <li>Unused Midnry Pass time isn't refunded, and store items are lost.</li>
              <li>
                If you made apps, earnings you're owed are still paid, as long as they reach the payout minimum and
                follow these terms.
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
