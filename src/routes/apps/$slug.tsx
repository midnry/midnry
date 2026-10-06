import { useEffect } from "react";
import { recordUse } from "@/lib/admin.functions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getApp, includedNames, tierLabel } from "@/lib/catalog";
import { canOpenApp, PASS_PRICE_LABEL } from "@/lib/access";
import { Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { useRole } from "@/components/role";
import { buttonClass, Skeleton } from "@/components/ui";
import { CommunityPage } from "@/components/community-app";
import { ToolView } from "@/components/tools";
import { SaveButton } from "@/components/spotlight";
import { AppMark } from "@/components/app-mark";
import { AppGuide } from "@/components/app-guide";
import { AppShowcase } from "@/components/showcase";

export const Route = createFileRoute("/apps/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${getApp(params.slug)?.name ?? "App"} — Midnry` }],
  }),
  component: AppPage,
});

function AppPage() {
  const { slug } = Route.useParams();
  const app = getApp(slug);
  const { user, isPending } = useCurrentUserState();
  const { account, loading } = useAccount();
  const { isAdmin, ready: roleReady } = useRole();
  const signedIn = Boolean(user);

  // Count one use per person, per app, per day for the admin's stats.
  useEffect(() => {
    if (!signedIn || !app) return;
    void recordUse({ data: app.slug }).catch(() => {});
  }, [signedIn, app]);

  if (!app) return <CommunityPage slug={slug} />;

  if (isPending || (user && app.tier === "pass" && (loading || !roleReady))) {
    return (
      <Shell>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-48" />
        <Skeleton className="mt-6 h-48 w-full" />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="no-print flex items-start justify-between gap-4">
        <p className="text-sm text-muted">
          <Link to="/apps" className="hover:text-ink">
            Desk
          </Link>
          <span aria-hidden> / </span>
          <span className={app.tier === "pass" ? "text-pine" : undefined}>{tierLabel(app.tier)}</span>
        </p>
        {user ? <SaveButton slug={app.slug} /> : null}
      </div>

      {!user ? (
        <div className="mt-2">
          <AppShowcase app={app} />
        </div>
      ) : !canOpenApp(app, account?.hasPass ?? false, isAdmin) ? (
        <LockedGate name={app.name} blurb={app.blurb} slug={app.slug} features={app.features} guide={app.guide} />
      ) : (
        <ToolView slug={app.slug} />
      )}
    </Shell>
  );
}

function LockedGate({
  name,
  blurb,
  slug,
  features,
  guide,
}: {
  name: string;
  blurb: string;
  slug: string;
  features: readonly string[];
  guide: readonly string[];
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <AppMark slug={slug} name={name} className="size-14" />
        <h1 className="font-display text-5xl tracking-tight">{name}</h1>
      </div>
      <p className="mt-3 text-pretty text-muted">{blurb}</p>
      <AppGuide features={features} guide={guide} />
      <p className="mt-4 text-pretty">
        Your account includes {includedNames()}. {name} opens with Midnry Pass —{" "}
        {PASS_PRICE_LABEL} a month, charged to your card.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to="/billing" className={buttonClass({ tone: "primary" })}>
          Start Midnry Pass
        </Link>
        <Link to="/apps" className={buttonClass({ tone: "quiet" })}>
          Back to the desk
        </Link>
      </div>
    </div>
  );
}
