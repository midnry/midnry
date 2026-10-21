import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AllApps, AppSearch, DeskList } from "@/components/desk-list";
import { FinderLink, GoalCards } from "@/components/goal-cards";
import { MatchQuiz } from "@/components/match-quiz";
import { Favorites } from "@/components/spotlight";
import { FREE_APPS, PASS_APPS } from "@/lib/plans";
import { PASS_PRICE_LABEL } from "@/lib/access";

export const Route = createFileRoute("/apps/")({
  head: () => ({
    meta: [
      { title: "Apps — Midnry" },
      {
        name: "description",
        content: `Browser apps for school, work, business and home. ${FREE_APPS.length} are free with an account; Midnry Pass adds ${PASS_APPS.length} more for ${PASS_PRICE_LABEL} a month.`,
      },
    ],
  }),
  component: AppsPage,
});

function AppsPage() {
  return (
    <Shell>
      <header className="max-w-3xl">
        <h1 className="font-display text-5xl tracking-tight text-balance sm:text-6xl">Find the app for the job.</h1>
        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted">
          Browser apps for school, work, business and home. {FREE_APPS.length} are free with an account; Midnry Pass adds{" "}
          {PASS_APPS.length} more for {PASS_PRICE_LABEL} a month.
        </p>
      </header>
      <AppSearch className="mt-8 max-w-2xl" />

      <div className="mt-12 empty:hidden">
        <Favorites />
      </div>

      <section aria-labelledby="start-title" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-sm font-medium text-pine">Start here</p>
            <h2 id="start-title" className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
              What do you want to get done?
            </h2>
          </div>
          <FinderLink />
        </div>
        <GoalCards className="mt-6" />
      </section>

      <div className="mt-14">
        <MatchQuiz />
      </div>

      <div className="mt-16">
        <DeskList />
      </div>

      <div className="mt-16">
        <AllApps />
      </div>
    </Shell>
  );
}
