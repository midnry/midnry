import { createFileRoute, Link } from "@tanstack/react-router";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { Shell } from "@/components/shell";
import { DeskList } from "@/components/desk-list";
import { Favorites, TrendingTicker } from "@/components/spotlight";
import { PricingPanel } from "@/components/pricing-panel";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { MatchQuiz } from "@/components/match-quiz";
import { buttonClass, Skeleton } from "@/components/ui";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <Shell>
      <section className="max-w-3xl">
        <h1 className="font-display text-5xl tracking-tight text-balance sm:text-6xl">
          Your desk of tools, grouped for who you are.
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-lg text-muted">
          Students, professionals, business owners, and seniors. Each section includes three apps.
          Midnry Pass — {PASS_PRICE_LABEL} a month — opens the rest, including apps people add after review.
        </p>
        <HeroActions />
      </section>

      <div className="mt-10 empty:hidden">
        <MatchQuiz />
      </div>

      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl tracking-tight">The desk</h2>
          <Link to="/apps" className="text-sm text-muted hover:text-ink">
            Open the list
          </Link>
        </div>
        <DeskList />
      </section>

      <section className="mt-14">
        <TrendingTicker />
      </section>

      <section className="mt-14 empty:hidden">
        <Favorites />
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl tracking-tight text-balance">How access works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          <li>
            <p className="font-display text-muted">01</p>
            <h3 className="mt-2 font-medium">Register</h3>
            <p className="mt-1 text-sm text-pretty text-muted">
              An account is the door. Email, Google, or X.
            </p>
          </li>
          <li>
            <p className="font-display text-muted">02</p>
            <h3 className="mt-2 font-medium">Three in each section</h3>
            <p className="mt-1 text-sm text-pretty text-muted">
              Every section includes three apps with your account.
            </p>
          </li>
          <li>
            <p className="font-display text-muted">03</p>
            <h3 className="mt-2 font-medium">Pass for the rest</h3>
            <p className="mt-1 text-sm text-pretty text-muted">
              {PASS_PRICE_LABEL} a month opens the rest of the desk, including apps added by members.
            </p>
          </li>
        </ol>
      </section>

      <section className="mt-16 max-w-xl">
        <h2 className="font-display text-3xl tracking-tight text-balance">Add your own</h2>
        <p className="mt-3 text-pretty text-muted">
          Upload one HTML file. It does not go on the desk until an admin runs it in a sandbox and approves it.
          Approved apps share 70% of Midnry Pass, split by how often each one is opened.
        </p>
        <Link to="/submit" className="mt-4 inline-flex min-h-11 items-center text-sm underline">
          Submit an app
        </Link>
      </section>

      <section className="mt-16">
        <h2 className="mb-6 font-display text-3xl tracking-tight">Pricing</h2>
        <PricingPanel />
        <p className="mt-4 max-w-2xl text-sm text-pretty text-muted">
          Midnry Pass is {PASS_PRICE_LABEL} a month, charged to a card through Paystack. Cancel anytime and
          access stays through the date already paid. The three apps in each section stay open either way.
        </p>
      </section>
    </Shell>
  );
}

function HeroActions() {
  const { user, isPending } = useCurrentUserState();
  const { account, loading } = useAccount();
  if (isPending || (user && loading)) {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-11 w-full rounded-full sm:w-44" />
        <Skeleton className="h-11 w-full rounded-full sm:w-40" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/login"
          search={{ next: "/apps", intent: "register" }}
          className={buttonClass({ tone: "primary" })}
        >
          Create an account
        </Link>
        <Link to="/apps" className={buttonClass({ tone: "quiet" })}>
          Browse the desk
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Link to="/apps" className={buttonClass({ tone: "primary" })}>
        Open the desk
      </Link>
      <Link to="/billing" className={buttonClass({ tone: "quiet" })}>
        {account?.hasPass ? "Pass is active" : `Midnry Pass · ${PASS_PRICE_LABEL}`}
      </Link>
    </div>
  );
}
