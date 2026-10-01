import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getEarnings } from "@/lib/community.functions";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { CREATOR_POOL_PERCENT } from "@/lib/revenue";
import { formatUsd } from "@/lib/format";
import { Skeleton } from "@/components/ui";

type Earnings = Awaited<ReturnType<typeof getEarnings>>;

export const Route = createFileRoute("/earnings")({
  head: () => ({ meta: [{ title: "Earnings — Midnry" }] }),
  component: EarningsPage,
});

function EarningsPage() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Earnings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    getEarnings()
      .then((next) => {
        if (!cancel) setData(next);
      })
      .catch(() => {
        if (!cancel) setFailed(true);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  if (isPending || (user && !data && !failed)) {
    return (
      <Shell>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-40 w-full max-w-xl" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn to="/login" />;

  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">Earnings</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">
        {CREATOR_POOL_PERCENT}% of active Midnry Pass subscriptions ({PASS_PRICE_LABEL} each) is the creator pool
        this month. Your share is that pool times your opens, divided by every approved app’s opens. One person
        counts once per app per day. Opening your own app does not count.
      </p>
      {failed || !data ? (
        <p className="mt-8 text-sm text-fail">Could not load earnings.</p>
      ) : (
        <>
          <p className="mt-8 font-display text-6xl tabular-nums tracking-tight">{formatUsd(data.cents)}</p>
          <p className="mt-2 text-sm text-muted">
            Pool {formatUsd(data.poolCents)} from {data.activePasses}{" "}
            {data.activePasses === 1 ? "pass" : "passes"} · {data.totalUses} counted{" "}
            {data.totalUses === 1 ? "open" : "opens"} this month
          </p>
          {data.apps.length === 0 ? (
            <p className="mt-8 max-w-xl text-sm text-pretty text-muted">
              Nothing of yours is live yet. Submit an app, then wait for approval.
            </p>
          ) : (
            <ul className="mt-8 max-w-xl">
              {data.apps.map((app) => (
                <li key={app.id} className="flex items-baseline justify-between gap-3 border-t border-line py-3 last:border-b">
                  <span>
                    <span className="font-medium">{app.name}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {app.uses} {app.uses === 1 ? "open" : "opens"}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatUsd(app.cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Link to="/submit" className="mt-8 inline-flex min-h-11 items-center text-sm underline">
        Add or update an app
      </Link>
    </Shell>
  );
}
