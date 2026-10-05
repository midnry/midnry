import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AppSearch, DeskList } from "@/components/desk-list";
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
        Pick who you are, or browse by subject. Most apps are free with an account.
      </p>
      <AppSearch className="mt-6 max-w-2xl" />
      <div className="mt-10 empty:hidden">
        <Favorites />
      </div>
      <div className="mt-10 empty:hidden">
        <MatchQuiz />
      </div>
      <div className="mt-10 space-y-14">
        <DeskList />
        <TrendingTicker />
      </div>
    </Shell>
  );
}
