import { createFileRoute, Link } from "@tanstack/react-router";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { Shell } from "@/components/shell";
import { AppSearch, DeskList } from "@/components/desk-list";
import { Favorites } from "@/components/spotlight";
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
      <section className="max-w-2xl">
        <h1 className="font-display text-5xl tracking-tight text-balance sm:text-6xl">
          Simple tools for everyday life.
        </h1>
        <p className="mt-4 max-w-lg text-pretty text-lg text-muted">
          Free apps for school, work, business and home. Pick where you fit to start.
        </p>
        <HeroActions />
      </section>

      <section className="mt-10 empty:hidden">
        <Favorites />
      </section>

      <div className="mt-10 empty:hidden">
        <MatchQuiz />
      </div>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-3xl tracking-tight">Where do you fit?</h2>
        <AppSearch className="mb-6 max-w-2xl" />
        <DeskList />
      </section>

      <section className="mt-12 flex flex-col gap-5 overflow-hidden rounded-3xl bg-[#051a10] p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <img
          src="/abuja-hustle-192.png"
          alt=""
          width={96}
          height={96}
          className="size-24 shrink-0 rounded-3xl shadow-lg ring-1 ring-white/15"
        />
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-green-400 uppercase">New game · 18+</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">Abuja Hustle</h2>
          <p className="mt-2 max-w-xl text-pretty text-emerald-50/80">
            A satirical life sim. Grow up in Abuja without privilege, dodge QuickKash, outwork the Nepo Babies, and chase
            financial freedom. Plays on your phone or computer.
          </p>
          <Link
            to="/games/abuja-hustle"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-500"
          >
            Play Abuja Hustle
          </Link>
        </div>
      </section>

      <section className="mt-12 rounded-3xl bg-card p-6 shadow-line sm:p-8">
        <ul className="grid gap-4 text-sm sm:grid-cols-3">
          <li>
            <p className="font-medium">Free to start</p>
            <p className="mt-1 text-muted">Three apps in every section, free with an account.</p>
          </li>
          <li>
            <p className="font-medium">No card needed</p>
            <p className="mt-1 text-muted">Sign up with your email or Google.</p>
          </li>
          <li>
            <p className="font-medium">{PASS_PRICE_LABEL} a month for more</p>
            <p className="mt-1 text-muted">
              Midnry Pass unlocks everything.{" "}
              <Link to="/pricing" className="text-ink underline underline-offset-4">
                See pricing
              </Link>
            </p>
          </li>
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-4 rounded-3xl border border-dashed border-line p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-lg">
          <h2 className="font-display text-2xl tracking-tight">Made an app? Add it to Midnry.</h2>
          <p className="mt-1 text-sm text-pretty text-muted">
            Upload it, we review it, and once it's on the desk you earn a share of Midnry Pass.
          </p>
        </div>
        <Link to="/submit" className={buttonClass({ tone: "quiet" })}>
          Add your app
        </Link>
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
          Get started free
        </Link>
        <Link to="/apps" className={buttonClass({ tone: "quiet" })}>
          Look around first
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
