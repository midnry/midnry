import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppFrame } from "@/components/app-frame";
import { buttonClass, Skeleton } from "@/components/ui";
import { SaveButton } from "@/components/spotlight";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PASS_PRICE_LABEL } from "@/lib/access";
import { genreLabel } from "@/lib/catalog";
import { openApp, peekApp, type OpenResult, type PublishedApp } from "@/lib/community.functions";

export function CommunityPage({ slug }: { slug: string }) {
  const { user, isPending } = useCurrentUserState();
  const [peek, setPeek] = useState<PublishedApp | null | undefined>(undefined);
  const [opened, setOpened] = useState<OpenResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancel = false;
    peekApp({ data: slug })
      .then((row) => {
        if (!cancel) setPeek(row);
      })
      .catch(() => {
        if (!cancel) setPeek(null);
      });
    return () => {
      cancel = true;
    };
  }, [slug]);

  useEffect(() => {
    if (isPending || !user) return;
    let cancel = false;
    setOpened(null);
    setFailed(false);
    openApp({ data: slug })
      .then((result) => {
        if (!cancel) setOpened(result);
      })
      .catch(() => {
        if (!cancel) setFailed(true);
      });
    return () => {
      cancel = true;
    };
  }, [slug, user?.id, isPending]);

  if (peek === undefined || isPending || (user && !opened && !failed)) {
    return (
      <Shell>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-48" />
        <Skeleton className="mt-6 h-72 w-full" />
      </Shell>
    );
  }

  if (failed || (user && opened?.state === "missing") || (!user && !peek)) {
    return (
      <Shell>
        <h1 className="font-display text-4xl tracking-tight">That app is not on the desk.</h1>
        <Link to="/apps" className="mt-6 inline-flex min-h-11 items-center text-sm underline">
          Back to the desk
        </Link>
      </Shell>
    );
  }

  const name = opened && opened.state !== "missing" ? opened.name : (peek?.name ?? "App");
  const blurb = opened && opened.state !== "missing" ? opened.blurb : (peek?.blurb ?? "");

  return (
    <Shell>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted">
          <Link to="/apps" className="hover:text-ink">
            Desk
          </Link>
          <span aria-hidden> / </span>
          <span>{opened?.state === "ready" ? genreLabel(opened.genre) : peek ? genreLabel(peek.genre) : "Pass"}</span>
        </p>
        {user && peek ? <SaveButton slug={slug} /> : null}
      </div>
      <h1 className="mt-4 font-display text-5xl tracking-tight">{name}</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">{blurb}</p>

      {!user ? (
        <div className="mt-6 max-w-xl">
          <p>This tool is part of Midnry Pass, {PASS_PRICE_LABEL} a month. Sign in to open it.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" search={{ next: `/apps/${slug}`, intent: "register" }} className={buttonClass({ tone: "primary" })}>
              Create an account
            </Link>
            <Link to="/login" search={{ next: `/apps/${slug}`, intent: "sign-in" }} className={buttonClass({ tone: "quiet" })}>
              Sign in
            </Link>
          </div>
        </div>
      ) : opened?.state === "locked" ? (
        <div className="mt-6 max-w-xl">
          <p>
            Your account includes Scratch, Pulse, and Split. {name} opens with Midnry Pass — {PASS_PRICE_LABEL} a month.
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
      ) : opened?.state === "ready" ? (
        <div className="mt-8">
          {opened.unpublished ? (
            <p className="mb-4 max-w-xl text-sm text-pretty text-muted">
              This copy is not on the desk. It runs in a sandbox so it cannot touch the rest of Midnry.
            </p>
          ) : null}
          {opened.pendingUpdate ? (
            <p className="mb-4 text-sm text-pine">A new version is waiting for review. Visitors still see the approved one.</p>
          ) : null}
          <AppFrame html={opened.html} title={opened.name} />
        </div>
      ) : null}
    </Shell>
  );
}
