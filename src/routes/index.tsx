import { createFileRoute, Link } from "@tanstack/react-router";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { Shell } from "@/components/shell";
import { AppSearch } from "@/components/desk-list";
import { AppMark } from "@/components/app-mark";
import { APPS, getApp } from "@/lib/catalog";
import { pitchFor } from "@/lib/pitches";
import { Favorites } from "@/components/spotlight";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
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
          Free apps for school, work, business and home. Start with our favourites below, or explore them all.
        </p>
        <HeroActions />
      </section>

      <FeaturedSix />

      <section className="mt-10 rounded-3xl bg-card p-6 shadow-line sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Looking for something else?</h2>
            <p className="mt-1 text-sm text-pretty text-muted">
              There are {APPS.length} apps on the desk for school, work, business and home. Search them, or browse by where you fit.
            </p>
          </div>
          <Link to="/apps" className={buttonClass({ tone: "primary" })}>
            Explore all {APPS.length} apps
          </Link>
        </div>
        <AppSearch className="mt-5 max-w-2xl" />
      </section>

      <section className="mt-10 empty:hidden">
        <Favorites />
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

/** The five most useful everyday apps, in the words people would use for them. */
const PICKS: { slug: string; tint: string }[] = [
  { slug: "tasks", tint: "from-sky-500/15" },
  { slug: "apply", tint: "from-indigo-500/15" },
  { slug: "cycle", tint: "from-pink-500/15" },
  { slug: "ledger", tint: "from-emerald-500/15" },
  { slug: "invoice", tint: "from-amber-500/15" },
];

function FeaturedSix() {
  return (
    <section className="mt-12" aria-labelledby="featured-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id="featured-heading" className="font-display text-3xl tracking-tight">
            Start with these
          </h2>
          <p className="mt-1 text-sm text-muted">Our five most useful apps, and a game.</p>
        </div>
        <Link to="/apps" className="hidden shrink-0 text-sm font-medium text-ink underline underline-offset-4 sm:inline">
          See all apps
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PICKS.map(({ slug, tint }) => {
          const app = getApp(slug);
          if (!app) return null;
          return (
            <Link
              key={slug}
              to="/discover/$slug"
              params={{ slug }}
              className={`group flex flex-col rounded-3xl bg-card bg-gradient-to-br ${tint} to-transparent p-5 shadow-line transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2`}
            >
              <div className="flex items-center gap-3">
                <AppMark slug={app.slug} name={app.name} className="size-12 shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-xl tracking-tight">{app.name}</p>
                  <p className="text-xs text-muted">{app.tier === "free" ? "Free with an account" : "Midnry Pass"}</p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-pretty text-muted">{pitchFor(app)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink">
                Learn more <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          );
        })}
        <Link
          to="/discover/abuja-hustle"
          className="group flex flex-col rounded-3xl bg-[radial-gradient(ellipse_at_top_left,#11265c,#05070c_70%)] p-5 text-white shadow-line transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex items-center gap-3">
            <img src="/abuja-hustle-192.png" alt="" className="size-12 shrink-0 rounded-2xl" />
            <div className="min-w-0">
              <p className="font-display text-xl tracking-tight">Abuja Hustle</p>
              <p className="text-xs font-semibold tracking-widest text-sky-300 uppercase">New game · 18+</p>
            </div>
          </div>
          <p className="mt-3 flex-1 text-sm text-pretty text-slate-200">
            A life sim. Grow up in Abuja without privilege, dodge QuickKash, and chase financial freedom.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-300">
            See the game <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </Link>
      </div>
    </section>
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
