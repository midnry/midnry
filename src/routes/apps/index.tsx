import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { DeskList } from "@/components/desk-list";
import { MatchQuiz } from "@/components/match-quiz";
import { Favorites, TrendingTicker } from "@/components/spotlight";

export const Route = createFileRoute("/apps/")({
  component: AppsPage,
});

function AppsPage() {
  return (
    <Shell>
      <h1 className="font-display text-5xl tracking-tight">The desk</h1>
      <p className="mt-3 max-w-xl text-pretty text-muted">
        Four groups. Each section inside them includes three apps. The rest opens with Midnry Pass.
      </p>
      <div className="mt-8 empty:hidden">
        <MatchQuiz />
      </div>
      <div className="mt-10 space-y-14">
        <DeskList />
        <TrendingTicker />
        <Favorites />
      </div>
    </Shell>
  );
}
