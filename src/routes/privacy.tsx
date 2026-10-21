import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";

const EMAIL = "hello@midnry.com";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Privacy — Midnry" },
      { name: "description", content: "What Midnry collects, why, who else handles it, and the choices you have." },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS = [
  ["collect", "What we collect"],
  ["why", "Why"],
  ["processors", "Who else processes it"],
  ["keep", "How long we keep it"],
  ["choices", "Your choices"],
  ["children", "Children"],
  ["changes", "Changes"],
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

function PrivacyPage() {
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
        <h1 className="font-display text-5xl tracking-tight">Privacy</h1>
        <p className="mt-3 text-sm text-muted">Last updated: 21 October 2026</p>
        <p className="mt-5 text-pretty text-muted">
          This page explains what Midnry collects when you use midnry.com, its apps and its games, why, and who else
          handles it. It describes what the site does today. Midnry is run by Midnry Ltd (“Midnry”, “we”).
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
          <Section id="collect">
            <Sub title="Your account">
              <List>
                <li>
                  Your name and email address, and either a password or your Google sign-in. Passwords are stored only as
                  a scrambled hash, never as readable text.
                </li>
                <li>
                  If you sign in with Google, Google shares your name, email address and profile photo with us. The sign-in
                  tokens Google returns are stored encrypted.
                </li>
                <li>
                  A profile photo, if you add one on the Account page. Photos are served from a public web address so they
                  can show on the site.
                </li>
                <li>If you turn on two-step verification: the key for your authenticator app and your backup codes.</li>
                <li>
                  Each time you sign in, a session record with your IP address and your browser's description (its “user
                  agent”), so you stay signed in.
                </li>
              </List>
            </Sub>

            <Sub title="What you save in apps">
              <p>
                Apps on the desk save your work to your account, so it's there on any device: notes, tasks, expenses,
                invoices, plans and so on. A few apps work differently, so here they are in detail.
              </p>
              <List>
                <li>
                  <strong>Cycle</strong> saves the period dates and notes you log, to your account. Midnry doesn't send them
                  to an AI service, an advertiser or anyone else.
                </li>
                <li>
                  <strong>Remind</strong> saves your tasks, projects and comments. With Midnry Pass it can also keep file
                  attachments (up to 2 MB each, 50 MB in total), shared projects and the email addresses you invite, and a
                  calendar link. Anyone with your calendar link can see the task titles, times and notes in it.
                </li>
                <li>
                  <strong>Apply</strong>: if you upload a resume, the file goes to our server only to read its text, and
                  the file isn't kept. The text, the roles you enter and the tailored versions are saved to your account.
                  The tailoring runs in your browser and isn't sent to an AI service.
                </li>
                <li>
                  <strong>Compressor</strong> re-encodes videos on your device. Videos are never uploaded.
                </li>
                <li>
                  <strong>Planner</strong> builds the plan in your browser from Midnry's own lists of ideas and holidays,
                  then saves it to your account.
                </li>
                <li>
                  <strong>AI writing.</strong> Some writing apps (such as Outreach, Captions, Letters and Contract) send
                  the text you type in them to Anthropic, which writes the reply. Their results say “Written by AI”. We
                  count how many AI writes each account uses per day, for the daily limit.
                </li>
              </List>
            </Sub>

            <Sub title="Payments">
              <List>
                <li>
                  Midnry Pass and Outpost Zero store items are paid through Paystack. You type your card details on
                  Paystack's page. Midnry never sees or stores your card number.
                </li>
                <li>
                  We keep whether your pass is active and when it renews or ends, the email used with Paystack,
                  Paystack's customer and subscription codes, and payment references. For store items: the item, the
                  price, the currency and whether it was paid.
                </li>
                <li>
                  For each Midnry Pass payment and refund: the amount, Paystack's fee, the currency, the date and the
                  payment reference, with no name or email. We use these to work out what app makers earn.
                </li>
                <li>Before paying, you confirm you're 18 or over or that a parent or guardian is paying. This is checked each time and isn't stored.</li>
              </List>
            </Sub>

            <Sub title="If you add apps and earn from them">
              <List>
                <li>
                  Your payout details: account holder name, bank name, account number and country. They're stored
                  encrypted, you see them masked, and only Midnry's admin can read them, to make the transfer.
                </li>
                <li>Your monthly earnings and the payouts made or withheld, with any reason given.</li>
                <li>
                  If your account is deleted, your payout details are deleted with it. Earnings and payout records are
                  kept for 6 years for tax and accounting, with your name and email removed.
                </li>
              </List>
            </Sub>

            <Sub title="Usage counts">
              <List>
                <li>
                  When you're signed in and open an app, we record that you used that app that day. That's one record per
                  person, per app, per day, not every click.
                </li>
                <li>
                  These counts drive the Trending list (shown as totals, never with names), the earnings split for apps
                  people add, and the admin's stats page.
                </li>
                <li>
                  Midnry's admin can see a list of accounts: name, email, when the account was made, how it signs in, the
                  last day it used an app, how many apps it has used, and whether it has the pass.
                </li>
                <li>Midnry doesn't use third-party analytics or advertising trackers.</li>
              </List>
            </Sub>

            <Sub title="Outpost Zero">
              <List>
                <li>
                  You can play one match on a device without an account. After that you need to sign in. Matches you
                  finish while signed in are saved to your account: the mode, the map, whether you won, kills, damage,
                  time played, placement, and whether you played on the website or the desktop app. Training and practice
                  aren't saved.
                </li>
                <li>
                  Online rooms: the name you choose, your team and your loadout are shown to the players in the room. Room
                  details are deleted about 20 minutes after the room goes quiet.
                </li>
                <li>
                  Nearby voice is optional. Joining voice only listens. Your microphone stays off until you turn it on,
                  and it only sends while you hold the talk button. Voice goes directly between players' browsers where
                  possible. If players can't connect directly, it may pass through a relay server operated for Midnry.
                  It's never recorded or stored. A direct connection can show your IP address to the players you talk
                  with, and a Google server helps set it up.
                </li>
                <li>
                  Daily case leaderboard: the name you choose and your score are public. You're identified by a random
                  code made on your device, which we store only in scrambled (hashed) form. No account is needed.
                </li>
                <li>XP, Locker choices and settings are kept in your browser.</li>
              </List>
            </Sub>

            <Sub title="Abuja Hustle">
              <List>
                <li>The game is for adults 18 and over, and asks before you play.</li>
                <li>Lives are saved in your browser, and to your account too when you're signed in (up to three lives).</li>
                <li>
                  Hall of Fame: if you choose to share a finished life, its in-game name, ending, net worth, age,
                  generation and background become public.
                </li>
                <li>
                  The Feedback box sends your message with where you are in the game (such as the chapter, day and money),
                  your screen size and your browser's description. It's linked to your account if you're signed in.
                </li>
                <li>
                  Anonymous play counts (lives started, chapters reached, endings, loading time) use a random code made on
                  your device, never your name or email.
                </li>
              </List>
            </Sub>

            <Sub title="Cookies and storage on your device">
              <List>
                <li>
                  Midnry's own cookies keep you signed in: a session cookie, a short-lived copy of the session, and
                  cookies used during two-step sign-in. There are no advertising cookies.
                </li>
                <li>
                  Your browser also stores preferences such as the desk view, game saves and settings, and game files
                  that help Outpost Zero and Abuja Hustle load faster.
                </li>
              </List>
            </Sub>
          </Section>

          <Section id="why">
            <List>
              <li>To run your account and keep you signed in safely.</li>
              <li>To save your work and show it back to you on any device.</li>
              <li>
                To send the emails you ask for: Remind reminders, the morning summary, test emails, and invitations to a
                shared project.
              </li>
              <li>To take payments, and to know whether you have the pass or own a store item.</li>
              <li>To show what's trending, split earnings for apps people add, and see which apps get used.</li>
              <li>To run the games (matches, rooms, voice, leaderboards) and fix the problems people report.</li>
            </List>
            <p>Midnry doesn't sell your information and doesn't show ads.</p>
          </Section>

          <Section id="processors">
            <List>
              <li>
                <strong>Render</strong> hosts the website and its database, in Oregon, USA. This means your data may be
                processed outside your country.
              </li>
              <li>
                <strong>Paystack</strong> takes payments for the pass and for store items.
              </li>
              <li>
                <strong>Resend</strong> sends Remind emails. It receives your email address and what's in the email, such
                as task titles.
              </li>
              <li>
                <strong>Anthropic</strong> writes the replies in the AI writing apps. It receives the text you type in
                those apps.
              </li>
              <li>
                <strong>Google</strong>, if you sign in with Google. Pages also load fonts from Google Fonts, and Outpost
                Zero voice uses a Google server to set up connections. These see your IP address.
              </li>
              <li>
                <strong>grok.com</strong>: pages load a small script from grok.com, part of the tool Midnry was built
                with.
              </li>
              <li>
                <strong>Voice relay.</strong> If Outpost Zero players can't connect directly, voice may pass through a relay
                server operated for Midnry. Voice is never recorded.
              </li>
              <li>
                <strong>Other people, where you choose.</strong> Players in your Outpost Zero room. People in a shared
                Remind project, who see your name, email and photo. Anyone, for names and scores on public leaderboards
                and the Hall of Fame.
              </li>
            </List>
            <p>Each of these services handles data under its own privacy policy.</p>
            <p>
              We share personal data with police, regulators or courts only when the law requires it (for example a valid
              court order), or when it's needed to prevent fraud or protect someone's safety. We share only what is
              required and, where the law allows, tell the person first. We never sell personal data.
            </p>
          </Section>

          <Section id="keep">
            <List>
              <li>
                Your account and what you save in apps: while your account is open. When you delete something inside an
                app, it's removed from what's saved.
              </li>
              <li>Sign-in sessions: about 7 days, renewed while you keep using the site.</li>
              <li>Outpost Zero online rooms: about 20 minutes after the last activity.</li>
              <li>Records of which Remind emails were sent: 40 days, then deleted.</li>
              <li>
                Usage counts, Outpost Zero match stats and daily leaderboards, Abuja Hustle play counts, AI writing
                counters and game feedback: deleted automatically after 90 days.
              </li>
              <li>
                Payment records for the pass and the store: 6 years, for tax and accounting. Your name and email are
                removed from them after your account is deleted.
              </li>
              <li>Everything else: while your account is open.</li>
              <li>
                After an account is closed, its data is kept for 30 days, so it can be restored if it was closed by
                mistake. Then it's permanently deleted, including from backups as they cycle.
              </li>
            </List>
          </Section>

          <Section id="choices">
            <List>
              <li>
                Change your name or photo, or remove the photo, on the{" "}
                <Link to="/account" className={inline}>
                  Account
                </Link>{" "}
                page.
              </li>
              <li>
                Turn on{" "}
                <Link to="/account" hash="security" className={inline}>
                  two-step verification
                </Link>
                .
              </li>
              <li>
                Turn Remind emails off in Remind's Settings, or use the unsubscribe link in any Remind email. Turn off or
                reset your calendar link at any time.
              </li>
              <li>
                Cancel Midnry Pass renewal on{" "}
                <Link to="/billing" className={inline}>
                  Billing
                </Link>
                .
              </li>
              <li>Delete things inside apps, such as a period and its notes in Cycle, or a saved life in Abuja Hustle.</li>
              <li>Keep your microphone off in Outpost Zero. Voice is off until you turn it on.</li>
              <li>
                Delete your account yourself with the Delete account button on the{" "}
                <Link to="/account" className={inline}>
                  Account
                </Link>{" "}
                page, or by emailing{" "}
                <a href={`mailto:${EMAIL}`} className={inline}>
                  {EMAIL}
                </a>
                .
              </li>
              <li>
                Ask for a copy of your data, or a correction, by emailing{" "}
                <a href={`mailto:${EMAIL}`} className={inline}>
                  {EMAIL}
                </a>{" "}
                from the address on your account. We'll reply within 30 days, and may need to confirm it's you.
              </li>
            </List>
          </Section>

          <Section id="children">
            <List>
              <li>
                You must be at least 13 to use Midnry. When you create an account you confirm you're 13 or older, or that
                you have a parent's or guardian's permission, and we record when you confirmed it. We don't ask for your
                date of birth.
              </li>
              <li>
                If you're under 18, you need a parent's or guardian's permission. Midnry Pass and store purchases need
                someone 18 or over, so a parent or guardian should make any payments.
              </li>
              <li>Abuja Hustle is for adults 18 and over, and asks your age before you play.</li>
            </List>
            <p>
              If we learn we hold personal information from a child under 13, we delete it and close the account.
              Parents can contact{" "}
              <a href={`mailto:${EMAIL}`} className={inline}>
                {EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section id="changes">
            <p>
              When what Midnry collects changes, this page is updated and the date at the top changes.
            </p>
            <p>
              We email account holders about important changes at least 30 days before they take effect, or straight
              away if the law or security requires it. If you keep using Midnry after that, you accept the changes. If
              you don't agree, you can close your account.
            </p>
          </Section>

          <Section id="contact">
            <p>
              Questions about privacy go to{" "}
              <a href={`mailto:${EMAIL}`} className={inline}>
                {EMAIL}
              </a>
              . See also{" "}
              <Link to="/contact" className={inline}>
                Contact
              </Link>{" "}
              and the{" "}
              <Link to="/terms" className={inline}>
                Terms
              </Link>
              .
            </p>
          </Section>
        </div>
      </article>
    </Shell>
  );
}
