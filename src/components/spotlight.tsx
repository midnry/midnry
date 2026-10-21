import { Link } from "@tanstack/react-router";
import { getApp, tierLabel } from "@/lib/catalog";
import { pitchFor } from "@/lib/pitches";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { type SpotApp } from "@/lib/spotlight.functions";
import { useFavorites } from "@/components/favorites";
import { Skeleton, cn } from "@/components/ui";
import { AppMark } from "@/components/app-mark";
import { toast } from "sonner";

export function Favorites() {
  const { user, isPending } = useCurrentUserState();
  const { favorites } = useFavorites();
  if (isPending || !user) return null;

  return (
    <section>
      <h2 className="font-display text-3xl tracking-tight">Your saved apps</h2>
      <p className="mt-1 text-sm text-muted">Only you see this list.</p>
      {favorites === null ? (
        <Skeleton className="mt-4 h-16 w-full" />
      ) : favorites.length === 0 ? (
        <p className="mt-4 text-sm text-pretty text-muted">Tap the bookmark on any app card and it stays here.</p>
      ) : (
        <AppRows items={favorites} />
      )}
    </section>
  );
}

/** Saved apps as quiet rows: what each one does, and whether it is free or part of the Pass. */
function AppRows({ items }: { items: SpotApp[] }) {
  return (
    <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
      {items.map((app) => {
        const built = getApp(app.slug);
        return (
          <li key={app.slug} className="flex items-stretch gap-2 border-t border-line">
            <Link
              to="/apps/$slug"
              params={{ slug: app.slug }}
              preload="intent"
              className="group flex min-w-0 flex-1 gap-3 py-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine"
            >
              <AppMark slug={app.slug} name={app.name} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium group-hover:underline">{app.name}</span>
                  <span className={app.tier === "pass" ? "text-sm text-pine" : "text-sm text-muted"}>{tierLabel(app.tier)}</span>
                </span>
                <span className="mt-1 line-clamp-2 block text-sm text-pretty text-muted">{built ? pitchFor(built) : app.blurb}</span>
              </span>
            </Link>
            <SaveButton slug={app.slug} name={app.name} />
          </li>
        );
      })}
    </ul>
  );
}

export function SaveButton({ slug, name }: { slug: string; name?: string }) {
  const { user, isPending } = useCurrentUserState();
  const { favorites, saved, toggle } = useFavorites();
  if (isPending || !user || favorites === null) return null;
  const on = saved(slug);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={name ? (on ? `Saved: ${name}` : `Save ${name}`) : on ? "Saved" : "Save"}
      title={on ? "Saved. Select to remove." : "Save to your list"}
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
