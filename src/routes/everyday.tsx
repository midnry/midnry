import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppGroup, DeskViewToggle, useDesk } from "@/components/desk-list";

export const Route = createFileRoute("/everyday")({
  head: () => ({ meta: [{ title: "Everyday apps — Midnry" }] }),
  component: EverydayPage,
});

function EverydayPage() {
  const { items, view, choose, known, signedIn, hasPass, isAdmin } = useDesk();
  const apps = items.filter((item) => item.audiences.includes("everyday"));

  return (
    <Shell>
      <Link to="/apps" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-muted hover:text-ink">
        <span aria-hidden className="mr-1">←</span> All apps
      </Link>
      <h1 className="mt-2 font-display text-5xl tracking-tight">Everyday</h1>
      <p className="mt-2 max-w-xl text-pretty text-muted">
        Tools anyone can use: reminders, a period log, converters, QR codes, money and health logs, and more.
      </p>
      <div className="mt-6 flex items-end justify-between gap-4">
        <p className="text-sm text-muted">{apps.length} apps</p>
        <DeskViewToggle view={view} onChange={choose} />
      </div>
      <AppGroup apps={apps} view={view} known={known} signedIn={signedIn} hasPass={hasPass} isAdmin={isAdmin} />
    </Shell>
  );
}
