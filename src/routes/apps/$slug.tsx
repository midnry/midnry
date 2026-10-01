import { createFileRoute, Link } from "@tanstack/react-router";
import { getApp, tierLabel } from "@/lib/catalog";
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
        <SignedOutGate name={app.name} blurb={app.blurb} tier={app.tier} slug={app.slug} />
      ) : !canOpenApp(app, account?.hasPass ?? false, isAdmin) ? (
        <LockedGate name={app.name} blurb={app.blurb} slug={app.slug} />
      ) : (
        <ToolView slug={app.slug} />
      )}
    </Shell>
  );
}

function SignedOutGate({
  name,
  blurb,
  tier,
  slug,
}: {
  name: string;
  blurb: string;
  tier: "free" | "pass";
  slug: string;
}) {
  return (
    <div className="mt-6 max-w-xl">
      <div className="flex items-center gap-4">
        <AppMark slug={slug} name={name} className="size-14" />
        <h1 className="font-display text-5xl tracking-tight">{name}</h1>
      </div>
      <p className="mt-3 text-pretty text-muted">{blurb}</p>
      <p className="mt-4 text-pretty">
        {tier === "free"
          ? "This one is included with every account. Sign in or register to open it."
          : `This tool is part of Midnry Pass, ${PASS_PRICE_LABEL} a month, charged to a card. Sign in, then subscribe to open it.`}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/login"
          search={{ next: `/apps/${slug}`, intent: "register" }}
          className={buttonClass({ tone: "primary" })}
        >
          Create an account
        </Link>
        <Link
          to="/login"
          search={{ next: `/apps/${slug}`, intent: "sign-in" }}
          className={buttonClass({ tone: "quiet" })}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

function LockedGate({ name, blurb, slug }: { name: string; blurb: string; slug: string }) {
  return (
    <div className="mt-6 max-w-xl">
      <div className="flex items-center gap-4">
        <AppMark slug={slug} name={name} className="size-14" />
        <h1 className="font-display text-5xl tracking-tight">{name}</h1>
      </div>
      <p className="mt-3 text-pretty text-muted">{blurb}</p>
      <p className="mt-4 text-pretty">
        Your account includes Scratch, Pulse, and Split. {name} opens with Midnry Pass —{" "}
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
