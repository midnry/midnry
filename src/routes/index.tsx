import { createFileRoute, Link } from "@tanstack/react-router";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { FREE_APPS } from "@/lib/plans";
import { Shell } from "@/components/shell";
import { Favorites } from "@/components/spotlight";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { buttonClass, cn } from "@/components/ui";
import { ProductDemo } from "@/components/demos/product-demo";
import { StartHere } from "@/components/home-start";
import { GamesSection } from "@/components/home-games";
import { PlansSection } from "@/components/home-plans";
import { ClosingSection, TrustSection } from "@/components/home-trust";

export const Route = createFileRoute("/")({
  component: Home,
});

/**
 * The homepage, one purpose per section:
 * the promise and a hands-on demo, where to start, games, Free vs Pass,
 * plain facts, and one last action.
 */
function Home() {
  const { user } = useCurrentUserState();
  return (
    <Shell>
      <section aria-labelledby="hero-heading">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <h1 id="hero-heading" className="font-display text-hero text-balance">
            Simple tools for everyday life.
          </h1>
          <div className="lg:pb-2">
            <p className="text-lede text-pretty text-ink-soft">
              Organise your tasks, create invoices and understand your spending. Small, focused apps that work in your browser, on your phone or your computer.
            </p>
            <HeroActions />
          </div>
        </div>
        <ProductDemo className="mt-8 sm:mt-10" />
      </section>

      <section className="mt-16 empty:hidden">
        <Favorites />
      </section>

      <StartHere />
      <GamesSection />
      <PlansSection />
      <TrustSection />
      <ClosingSection signedIn={Boolean(user)} />
    </Shell>
  );
}

/** One primary action. New visitors explore the apps; signed-in visitors open theirs. Sign-in lives in the header. */
function HeroActions() {
  const { user } = useCurrentUserState();
  const { account } = useAccount();
  return (
    <>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link to="/apps" className={cn(buttonClass({ tone: "primary" }), "min-h-12 px-6 text-base")}>
          {user ? "Open your apps" : "Explore the apps"}
        </Link>
        {user ? (
          <Link to="/billing" className={buttonClass({ tone: "quiet" })}>
            {account?.hasPass ? "Midnry Pass is active" : `Midnry Pass · ${PASS_PRICE_LABEL} a month`}
          </Link>
        ) : null}
      </div>
      <p className="mt-4 text-sm text-pretty text-muted">
        {FREE_APPS.length} apps are free with an account. No card needed.
      </p>
    </>
  );
}
