import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppShowcase } from "@/components/showcase";
import { pitchFor } from "@/lib/pitches";
import { CommunityPage } from "@/components/community-app";
import { aliasOf } from "@/lib/app-aliases";
import { isPassView, PASS_VIEWS, viewParam } from "@/lib/remind/pass-views";
import { getApp } from "@/lib/catalog";
import { modeByView } from "@/lib/studio";

export const Route = createFileRoute("/discover/$slug")({
  // ?view= names the part of the app an old link pointed at (set by the redirect below).
  validateSearch: (search: Record<string, unknown>): { view?: string } => {
    const view = viewParam(search.view);
    return view ? { view } : {};
  },
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
  const { view } = Route.useSearch();
  const app = getApp(slug);
  // Apps added by the community don't have showcase pages yet: show their own page.
  if (!app) return <CommunityPage slug={slug} />;
  // Arrived from an old Board, Pulse or Habits link: say where it went.
  const merged = slug === "tasks" && isPassView(view) ? PASS_VIEWS[view] : undefined;
  // Arrived from an old writing app's link (Outreach, Captions…): it is a Writing studio mode now.
  const writingMode = slug === "write" ? modeByView(view) : undefined;
  return (
    <Shell>
      {merged && view ? (
        <p className="mb-4 rounded-2xl bg-pine/10 p-4 text-sm text-pretty" data-merged-note>
          {merged.name} is now part of Remind, included with Midnry Pass. Anything you saved is still there.{" "}
          <Link to="/apps/$slug" params={{ slug: "tasks" }} search={{ view }} className="font-medium underline underline-offset-2">
            Open {merged.name} in Remind
          </Link>
        </p>
      ) : null}
      {writingMode && view ? (
        <p className="mb-4 rounded-2xl bg-pine/10 p-4 text-sm text-pretty" data-merged-note>
          {writingMode.name} is now a mode of the Writing studio, still free. What you typed in it is brought in as a draft.{" "}
          <Link to="/apps/$slug" params={{ slug: "write" }} search={{ view }} className="font-medium underline underline-offset-2">
            Open {writingMode.name}
          </Link>
        </p>
      ) : null}
      <AppShowcase app={app} />
    </Shell>
  );
}
