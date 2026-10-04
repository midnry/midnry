import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { DeskList } from "@/components/desk-list";
import { Favorites, TrendingTicker } from "@/components/spotlight";

export const Route = createFileRoute("/apps/")({
  component: AppsPage,
});

function AppsPage() {
  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">The desk</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">
        Included tools open as soon as you register. The rest, grouped by genre, open with a $5 monthly subscription.
      </p>
      <div className="mt-10 space-y-14">
        <DeskList />
        <TrendingTicker />
        <Favorites />
      </div>
    </Shell>
  );
}
