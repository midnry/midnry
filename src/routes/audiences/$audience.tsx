import { createFileRoute, Link } from "@tanstack/react-router";
import { AUDIENCES, isAudience, sectionsIn } from "@/lib/sections";
import { Shell } from "@/components/shell";
import { useDesk } from "@/components/desk-list";
import { AppMark } from "@/components/app-mark";

export const Route = createFileRoute("/audiences/$audience")({
  head: ({ params }) => ({
    meta: [{ title: `${AUDIENCES.find((item) => item.id === params.audience)?.label ?? "Section"} — Midnry` }],
  }),
  component: AudiencePage,
});

function AudiencePage() {
  const { audience } = Route.useParams();
  const known = isAudience(audience);
  const { items } = useDesk();
  const group = known ? AUDIENCES.find((item) => item.id === audience) : undefined;
  const sections = known ? sectionsIn(audience) : [];

  return (
    <Shell>
      <Link to="/" className="text-sm text-muted hover:text-ink">
        Back to the desk
      </Link>
      {group ? (
        <>
          <h1 className="mt-4 font-display text-5xl tracking-tight">{group.label}</h1>
          <p className="mt-2 max-w-xl text-pretty text-muted">{group.blurb} Each section includes three apps.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => {
              const apps = items.filter((item) => item.genre === section.id);
              return (
                <li key={section.id}>
                  <Link
                    to="/sections/$genre"
                    params={{ genre: section.id }}
                    preload="intent"
                    className="group flex h-full flex-col rounded-2xl bg-card p-5 shadow-line"
                  >
                    <span className="flex">
                      {apps.slice(0, 3).map((app) => (
                        <AppMark key={app.slug} slug={app.slug} name={app.name} className="-ml-2 size-10 first:ml-0 ring-2 ring-card" />
                      ))}
                    </span>
                    <span className="mt-5 font-display text-3xl tracking-tight group-hover:underline">{section.label}</span>
                    <span className="mt-1 text-sm text-muted">{section.blurb}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <h1 className="mt-4 font-display text-5xl tracking-tight">That group is not on the desk.</h1>
      )}
    </Shell>
  );
}
