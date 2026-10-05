import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppGroup, DeskViewToggle, useDesk } from "@/components/desk-list";

export const Route = createFileRoute("/everyday")({
  head: () => ({ meta: [{ title: "Everyday — Midnry" }] }),
  component: EverydayPage,
});

function EverydayPage() {
  const { items, view, choose, known, hasPass, isAdmin } = useDesk();
  const apps = items.filter((item) => item.audiences.includes("everyday"));

  return (
    <Shell>
      <Link to="/apps" className="text-sm text-muted hover:text-ink">
        Back to the desk
      </Link>
      <h1 className="mt-4 font-display text-5xl tracking-tight">Everyday</h1>
      <p className="mt-2 max-w-xl text-pretty text-muted">
        Tools anyone can use: Cycle, converters, QR codes, money and health logs, and more.
      </p>
      <div className="mt-6 flex items-end justify-between gap-4">
        <p className="text-sm text-muted">{apps.length} apps</p>
        <DeskViewToggle view={view} onChange={choose} />
      </div>
      <AppGroup apps={apps} view={view} known={known} hasPass={hasPass} isAdmin={isAdmin} />
    </Shell>
  );
}
