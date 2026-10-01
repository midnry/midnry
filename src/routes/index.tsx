import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/catalog";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { Shell } from "@/components/shell";
import { DeskList } from "@/components/desk-list";
import { Spotlight } from "@/components/spotlight";
import { PricingPanel } from "@/components/pricing-panel";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { buttonClass, Skeleton } from "@/components/ui";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <Shell>
      <section className="max-w-3xl">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" width={28} height={28} className="size-7" />
          <p className="text-sm font-medium text-pine">{APP_NAME}</p>
        </div>
        <h1 className="mt-3 font-display text-5xl tracking-tight text-balance sm:text-6xl">
          A desk of tools, grouped by genre. Three come with your account.
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-lg text-muted">
          Midnry hosts a small desk of tools. Register once and Scratch, Pulse, and Split stay open.
          The rest is Midnry Pass — {PASS_PRICE_LABEL} a month — including apps people add after review.
        </p>
        <HeroActions />
      </section>

      <section className="mt-14">
        <Spotlight />
      </section>

      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl tracking-tight">The desk</h2>
          <Link to="/apps" className="text-sm text-muted hover:text-ink">
            Open the list
          </Link>
        </div>
        <DeskList />
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
            <h3 className="mt-2 font-medium">Use the three</h3>
            <p className="mt-1 text-sm text-pretty text-muted">
              Scratch, Pulse, and Split are included with every account.
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
          access stays through the date already paid. The three included tools stay open either way.
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
