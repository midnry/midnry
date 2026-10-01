import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { APPS, GENRES, genreLabel, tierLabel, type GenreId } from "@/lib/catalog";
import { canOpenApp } from "@/lib/access";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccount } from "@/components/account";
import { listPublished, type PublishedApp } from "@/lib/community.functions";
import { SaveButton } from "@/components/spotlight";

type DeskItem = {
  slug: string;
  name: string;
  blurb: string;
  genre: GenreId;
  tier: "free" | "pass";
};

export function DeskList() {
  const { user, isPending } = useCurrentUserState();
  const { account, loading } = useAccount();
  const known = !!user && !isPending && !loading;
  const [added, setAdded] = useState<PublishedApp[]>([]);

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
      {GENRES.map((genre) => {
        const group = items.filter((item) => item.genre === genre.id);
        if (group.length === 0) return null;
        return (
          <section key={genre.id}>
            <h3 className="font-display text-2xl tracking-tight">{genreLabel(genre.id)}</h3>
            <ol className="mt-2">
              {group.map((app, index) => {
                const open = known && (app.tier === "free" || (account?.hasPass ?? false));
                const locked = known && app.tier === "pass" && !canOpenApp({ ...app, genre: app.genre }, account?.hasPass ?? false);
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
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium group-hover:underline">{app.name}</span>
                          <span className={app.tier === "pass" ? "text-sm text-pine" : "text-sm text-muted"}>
                            {tierLabel(app.tier)}
                            {open ? " · Open" : ""}
                            {locked ? " · Locked" : ""}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-pretty text-muted">{app.blurb}</span>
                      </span>
                    </Link>
                    <SaveButton slug={app.slug} />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
