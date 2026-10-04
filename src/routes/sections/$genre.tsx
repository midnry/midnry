import { createFileRoute, Link } from "@tanstack/react-router";
import { genreLabel, isSection } from "@/lib/sections";
import { Shell } from "@/components/shell";
import { AppGroup, DeskViewToggle, useDesk } from "@/components/desk-list";

export const Route = createFileRoute("/sections/$genre")({
  head: ({ params }) => ({
    meta: [{ title: `${isSection(params.genre) ? genreLabel(params.genre) : "Section"} — Midnry` }],
  }),
  component: SectionPage,
});

function SectionPage() {
  const { genre } = Route.useParams();
  const { items, view, choose, known, hasPass, isAdmin } = useDesk();
  const knownGenre = isSection(genre);
  const group = knownGenre ? items.filter((item) => item.genre === genre) : [];

  return (
    <Shell>
      <Link to="/" className="text-sm text-muted hover:text-ink">
        Back to the desk
      </Link>
      {knownGenre ? (
        <>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-5xl tracking-tight">{genreLabel(genre)}</h1>
              <p className="mt-2 text-sm text-muted">
                {group.length} {group.length === 1 ? "app" : "apps"} in this section.
              </p>
            </div>
            <DeskViewToggle view={view} onChange={choose} />
          </div>
          {group.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Nothing is in this section yet.</p>
          ) : (
            <AppGroup apps={group} view={view} known={known} hasPass={hasPass} isAdmin={isAdmin} />
          )}
        </>
      ) : (
        <h1 className="mt-4 font-display text-5xl tracking-tight">That section is not on the desk.</h1>
      )}
    </Shell>
  );
}
