import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppShowcase } from "@/components/showcase";
import { pitchFor } from "@/lib/pitches";
import { CommunityPage } from "@/components/community-app";
import { aliasOf } from "@/lib/app-aliases";
import { getApp } from "@/lib/catalog";

export const Route = createFileRoute("/discover/$slug")({
  // A merged app's old link goes to the app that now holds it.
  beforeLoad: ({ params }) => {
    const alias = aliasOf(params.slug);
    if (alias) throw redirect({ to: "/discover/$slug", params: { slug: alias.to }, search: alias.view ? { view: alias.view } : {}, statusCode: 301 });
  },
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
