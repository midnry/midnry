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
      <Link to="/apps" className="text-sm text-muted hover:text-ink">
        Back to the desk
      </Link>
      {tag ? (
        <>
          <h1 className="mt-4 font-display text-5xl tracking-tight">{tag.label}</h1>
          <p className="mt-2 max-w-xl text-pretty text-muted">{tag.blurb}</p>
          <TaggedApps tag={tag.id} label={tag.label} />
          <EverydayRow exclude={tag.id} />
        </>
      ) : (
        <h1 className="mt-4 font-display text-5xl tracking-tight">That page is not on the desk.</h1>
      )}
    </Shell>
  );
}
