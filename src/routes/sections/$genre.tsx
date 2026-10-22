import { createFileRoute, Link } from "@tanstack/react-router";
import { genreLabel, isSection } from "@/lib/sections";
import { Shell } from "@/components/shell";
import { AppGroup, DeskViewToggle, onShelf, useDesk } from "@/components/desk-list";

export const Route = createFileRoute("/sections/$genre")({
  head: ({ params }) => ({
    meta: [{ title: `${isSection(params.genre) ? genreLabel(params.genre) : "Section"} — Midnry` }],
  }),
  component: SectionPage,
});

function SectionPage() {
  const { genre } = Route.useParams();
  const { items, view, choose, known, signedIn, hasPass, isAdmin } = useDesk();
  const knownGenre = isSection(genre);
  // General tools (Remind, Cycle, Split…) are listed by who they help, not under the subject they were first filed in.
  const group = knownGenre ? items.filter((item) => onShelf(item, genre)) : [];

  return (
    <Shell>
      <Link to="/apps" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-muted hover:text-ink">
        <span aria-hidden className="mr-1">←</span> All apps
      </Link>
      {knownGenre ? (
        <>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-5xl tracking-tight">{genreLabel(genre)}</h1>
              <p className="mt-2 text-sm text-muted">
                {group.length} {group.length === 1 ? "app" : "apps"} for this subject.
              </p>
            </div>
            <DeskViewToggle view={view} onChange={choose} />
          </div>
          {group.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Nothing is in this section yet.</p>
          ) : (
            <AppGroup apps={group} view={view} known={known} signedIn={signedIn} hasPass={hasPass} isAdmin={isAdmin} />
          )}
        </>
      ) : (
        <>
          <h1 className="mt-2 font-display text-4xl tracking-tight">We couldn’t find that subject.</h1>
          <Link to="/apps" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
            Go to Apps
          </Link>
        </>
      )}
    </Shell>
  );
}
