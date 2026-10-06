import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppShowcase } from "@/components/showcase";
import { pitchFor } from "@/lib/pitches";
import { CommunityPage } from "@/components/community-app";
import { getApp } from "@/lib/catalog";

export const Route = createFileRoute("/discover/$slug")({
  head: ({ params }) => {
    const app = getApp(params.slug);
    if (!app) return { meta: [{ title: "App — Midnry" }] };
    return {
      meta: [
        { title: `${app.name}: ${pitchFor(app).replace(/\.$/, "")} — Midnry` },
        { name: "description", content: `${pitchFor(app)} ${app.blurb}`.slice(0, 300) },
      ],
    };
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  const { slug } = Route.useParams();
  const app = getApp(slug);
  // Apps added by the community don't have showcase pages yet: show their own page.
  if (!app) return <CommunityPage slug={slug} />;
  return (
    <Shell>
      <AppShowcase app={app} />
    </Shell>
  );
}
