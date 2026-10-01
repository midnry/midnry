import { Link } from "@tanstack/react-router";
import { APPS } from "@/lib/catalog";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { buttonClass, cn, Skeleton } from "@/components/ui";

export function PricingPanel() {
  const { user, isPending } = useCurrentUserState();
  const { account, loading } = useAccount();
  const waiting = isPending || (!!user && loading);
  const included = APPS.filter((app) => app.tier === "free");
  const paid = APPS.filter((app) => app.tier === "pass");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <article className="rounded-3xl bg-card p-6 shadow-line sm:p-8">
        <p className="text-sm text-muted">Account</p>
        <h2 className="mt-3 font-display text-4xl tracking-tight text-balance">The three defaults</h2>
        <p className="mt-4 font-display text-5xl tabular-nums">$0</p>
        <p className="mt-1 text-sm text-muted">Scratch, Pulse, and Split. No card.</p>
        <ul className="mt-6 space-y-2 text-sm">
          {included.map((app) => (
            <li key={app.slug}>{app.name}</li>
          ))}
        </ul>
        <div className="mt-8">
          {waiting ? (
            <Skeleton className="h-11 w-44 rounded-full" />
          ) : user ? (
            <Link to="/apps" className={buttonClass({ tone: "primary" })}>
              Open the desk
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ next: "/apps", intent: "register" }}
              className={buttonClass({ tone: "primary" })}
            >
              Create an account
            </Link>
          )}
        </div>
      </article>

      <article className="rounded-3xl bg-pine p-6 text-paper sm:p-8">
        <p className="text-sm text-paper/70">Midnry Pass</p>
        <h2 className="mt-3 font-display text-4xl tracking-tight text-balance">The rest of the desk</h2>
        <p className="mt-4 font-display text-5xl tabular-nums">
          {PASS_PRICE_LABEL}
          <span className="ml-2 font-sans text-base text-paper/70">/ month</span>
        </p>
        <p className="mt-1 text-sm text-paper/70">The whole desk. Cancel anytime.</p>
        <ul className="mt-6 space-y-2 text-sm">
          <li>Scratch, Pulse, and Split</li>
          {paid.map((app) => (
            <li key={app.slug}>{app.name}</li>
          ))}
          <li>Apps people add, after review</li>
        </ul>
        <div className="mt-8">
          {waiting ? (
            <Skeleton className="h-11 w-40 rounded-full bg-paper/15" />
          ) : !user ? (
            <Link
              to="/login"
              search={{ next: "/billing", intent: "register" }}
              className={cn(buttonClass({ tone: "paper" }))}
            >
              Start for {PASS_PRICE_LABEL}
            </Link>
          ) : account?.hasPass ? (
            <Link to="/billing" className={buttonClass({ tone: "paper" })}>
              Manage billing
            </Link>
          ) : (
            <Link to="/billing" className={buttonClass({ tone: "paper" })}>
              Start for {PASS_PRICE_LABEL}
            </Link>
          )}
        </div>
      </article>
    </div>
  );
}
