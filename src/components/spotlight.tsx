import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { genreLabel, tierLabel } from "@/lib/catalog";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listTrending, type SpotApp, type TrendingApp } from "@/lib/spotlight.functions";
import { useFavorites } from "@/components/favorites";
import { Skeleton, cn } from "@/components/ui";
import { AppMark } from "@/components/app-mark";
import { toast } from "sonner";

export function Spotlight() {
  const { user, isPending } = useCurrentUserState();
  const { favorites } = useFavorites();
  const [trending, setTrending] = useState<TrendingApp[] | null>(null);

  useEffect(() => {
    let cancel = false;
    listTrending()
      .then((rows) => {
        if (!cancel) setTrending(rows);
      })
      .catch(() => {
        if (!cancel) setTrending([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      {!isPending && user ? (
        <section>
          <h2 className="font-display text-3xl tracking-tight">Favorites</h2>
          <p className="mt-1 text-sm text-muted">Only you see this list.</p>
          {favorites === null ? (
            <Skeleton className="mt-4 h-16 w-full" />
          ) : favorites.length === 0 ? (
            <p className="mt-4 text-sm text-pretty text-muted">
              Save an app from the desk and it stays here.
            </p>
          ) : (
            <AppRows items={favorites} />
          )}
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-3xl tracking-tight">Trending</h2>
        <p className="mt-1 text-sm text-muted">Opened most in the last 30 days.</p>
        {trending === null ? (
          <Skeleton className="mt-4 h-16 w-full" />
        ) : trending.length === 0 ? (
          <p className="mt-4 text-sm text-pretty text-muted">
            No app has been opened enough to trend yet.
          </p>
        ) : (
          <AppRows items={trending} />
        )}
      </section>
    </div>
  );
}

function AppRows({ items }: { items: Array<SpotApp & { uses?: number }> }) {
  return (
    <ol className="mt-2">
      {items.map((app, index) => (
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
                <span className={app.tier === "pass" ? "text-sm text-pine" : "text-sm text-muted"}>
                  {tierLabel(app.tier)}
                  {app.uses ? ` · ${app.uses} ${app.uses === 1 ? "open" : "opens"}` : ""}
                </span>
              </span>
              <span className="mt-1 block text-sm text-pretty text-muted">
                {genreLabel(app.genre)}. {app.blurb}
              </span>
              </span>
            </span>
          </Link>
          <SaveButton slug={app.slug} />
        </li>
      ))}
    </ol>
  );
}

export function SaveButton({ slug }: { slug: string }) {
  const { user, isPending } = useCurrentUserState();
  const { favorites, saved, toggle } = useFavorites();
  if (isPending || !user || favorites === null) return null;
  const on = saved(slug);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Saved" : "Save"}
      title={on ? "Saved" : "Save"}
      className={cn(
        "grid size-11 shrink-0 place-items-center self-center",
        on ? "text-pine" : "text-muted hover:text-ink",
      )}
      onClick={() => {
        void toggle(slug).catch(() => {
          toast.error("Could not update favorites.");
        });
      }}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
