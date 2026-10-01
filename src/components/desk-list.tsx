import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { APPS, GENRES, genreLabel, tierLabel, type GenreId } from "@/lib/catalog";
import { canOpenApp } from "@/lib/access";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { useRole } from "@/components/role";
import { listPublished, type PublishedApp } from "@/lib/community.functions";
import { SaveButton } from "@/components/spotlight";
import { AppMark } from "@/components/app-mark";
import { cn } from "@/components/ui";

type DeskItem = {
  slug: string;
  name: string;
  blurb: string;
  genre: GenreId;
  tier: "free" | "pass";
};

type DeskView = "list" | "grid";

const VIEW_KEY = "midnry.desk.view";

export function DeskList() {
  const { user, isPending } = useCurrentUserState();
  const { account, loading } = useAccount();
  const { isAdmin, ready: roleReady } = useRole();
  const known = !!user && !isPending && !loading && roleReady;
  const [added, setAdded] = useState<PublishedApp[]>([]);
  const [view, setView] = useState<DeskView>("list");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_KEY);
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  useEffect(() => {
    let cancel = false;
    listPublished()
      .then((rows) => {
        if (!cancel) setAdded(rows);
      })
      .catch(() => {
        if (!cancel) setAdded([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  function choose(next: DeskView) {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  const items: DeskItem[] = [
    ...APPS.map((app) => ({
      slug: app.slug,
      name: app.name,
      blurb: app.blurb,
      genre: app.genre,
      tier: app.tier,
    })),
    ...added.map((app) => ({
      slug: app.slug,
      name: app.name,
      blurb: app.blurb,
      genre: app.genre,
      tier: "pass" as const,
    })),
  ];

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <div className="inline-flex rounded-full bg-card p-1 shadow-line" role="group" aria-label="Desk layout">
          <ViewButton label="List" pressed={view === "list"} onClick={() => choose("list")}>
            <ListIcon />
          </ViewButton>
          <ViewButton label="Grid" pressed={view === "grid"} onClick={() => choose("grid")}>
            <GridIcon />
          </ViewButton>
        </div>
      </div>
      {GENRES.map((genre) => {
        const group = items.filter((item) => item.genre === genre.id);
        if (group.length === 0) return null;
        return (
          <section key={genre.id}>
            <h3 className="font-display text-2xl tracking-tight">{genreLabel(genre.id)}</h3>
            {view === "grid" ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((app) => {
                  const status = appStatus(app, known, account?.hasPass ?? false, isAdmin);
                  return (
                    <li key={app.slug} className="flex rounded-2xl bg-card shadow-line">
                      <Link
                        to="/apps/$slug"
                        params={{ slug: app.slug }}
                        preload="intent"
                        className="group flex min-w-0 flex-1 flex-col gap-3 p-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <AppMark slug={app.slug} name={app.name} className="size-12" />
                          <Status app={app} status={status} />
                        </span>
                        <span>
                          <span className="block font-medium group-hover:underline">{app.name}</span>
                          <span className="mt-1 block text-sm text-pretty text-muted">{app.blurb}</span>
                        </span>
                      </Link>
                      <span className="pr-2 pt-2">
                        <SaveButton slug={app.slug} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ol className="mt-2">
                {group.map((app, index) => {
                  const status = appStatus(app, known, account?.hasPass ?? false, isAdmin);
                  return (
                    <li key={app.slug} className="flex items-stretch gap-2 border-t border-line last:border-b">
                      <Link
                        to="/apps/$slug"
                        params={{ slug: app.slug }}
                        preload="intent"
                        className="group flex min-w-0 flex-1 gap-4 py-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                      >
                        <span className="w-8 pt-0.5 font-display text-muted tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex min-w-0 flex-1 gap-3">
                          <AppMark slug={app.slug} name={app.name} className="mt-0.5" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="font-medium group-hover:underline">{app.name}</span>
                              <Status app={app} status={status} />
                            </span>
                            <span className="mt-1 block text-sm text-pretty text-muted">{app.blurb}</span>
                          </span>
                        </span>
                      </Link>
                      <SaveButton slug={app.slug} />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

function appStatus(app: DeskItem, known: boolean, hasPass: boolean, isAdmin: boolean) {
  const unlocked = canOpenApp(app, hasPass, isAdmin);
  return {
    open: known && unlocked,
    locked: known && app.tier === "pass" && !unlocked,
  };
}

function Status({ app, status }: { app: DeskItem; status: { open: boolean; locked: boolean } }) {
  return (
    <span className={app.tier === "pass" ? "text-sm text-pine" : "text-sm text-muted"}>
      {tierLabel(app.tier)}
      {status.open ? " · Open" : ""}
      {status.locked ? " · Locked" : ""}
    </span>
  );
}

function ViewButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full",
        pressed ? "bg-pine text-paper" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path d="M8 7h11M8 12h11M8 17h11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
