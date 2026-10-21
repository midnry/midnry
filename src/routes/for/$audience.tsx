import { createFileRoute, Link } from "@tanstack/react-router";
import { TAGS, isTag } from "@/lib/sections";
import { Shell } from "@/components/shell";
import { EverydayRow, TaggedApps } from "@/components/desk-list";

const AUDIENCE_PAGES = TAGS.filter((tag) => tag.id !== "everyday");

export const Route = createFileRoute("/for/$audience")({
  head: ({ params }) => ({
    meta: [{ title: `${AUDIENCE_PAGES.find((tag) => tag.id === params.audience)?.label ?? "Apps"} — Midnry` }],
  }),
  component: AudienceAppsPage,
});

function AudienceAppsPage() {
  const { audience } = Route.useParams();
  const tag = isTag(audience) && audience !== "everyday" ? TAGS.find((item) => item.id === audience) : undefined;

  return (
    <Shell>
      <Link to="/apps" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-muted hover:text-ink">
        <span aria-hidden className="mr-1">←</span> All apps
      </Link>
      {tag ? (
        <>
          <h1 className="mt-2 font-display text-5xl tracking-tight">{tag.label}</h1>
          <p className="mt-2 max-w-xl text-pretty text-muted">{tag.blurb}</p>
          <TaggedApps tag={tag.id} label={tag.label} />
          <EverydayRow exclude={tag.id} />
        </>
      ) : (
        <>
          <h1 className="mt-2 font-display text-4xl tracking-tight">We couldn’t find that page.</h1>
          <p className="mt-3 text-muted">Browse every app instead.</p>
          <Link to="/apps" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
            Go to Apps
          </Link>
        </>
      )}
    </Shell>
  );
}
