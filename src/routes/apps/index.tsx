import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { AllApps, AppSearch, DeskList } from "@/components/desk-list";
import { FinderLink, GoalCards } from "@/components/goal-cards";
import { MatchQuiz } from "@/components/match-quiz";
import { Favorites } from "@/components/spotlight";
import { FREE_APPS, PASS_APPS } from "@/lib/plans";
import { PASS_PRICE_LABEL } from "@/lib/access";

/** `q` keeps a search in the address, so leaving for a product page and coming back keeps it. */
type AppsSearch = { q?: string };

export const Route = createFileRoute("/apps/")({
  validateSearch: (search: Record<string, unknown>): AppsSearch => {
    const raw = typeof search.q === "string" ? search.q : typeof search.q === "number" ? String(search.q) : "";
    const q = raw.slice(0, 80);
    return q.trim() ? { q } : {};
  },
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

/** How long typing settles before the address bar catches up. */
const URL_DELAY = 250;

function AppsPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/apps/" });
  const [query, setQuery] = useState(q ?? "");
  // The last value this page wrote to the address: anything else (back, forward, a link) came from outside.
  const written = useRef(q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [finderStart, setFinderStart] = useState(0);

  useEffect(() => {
    const next = q ?? "";
    if (next !== written.current) {
      written.current = next;
      clearTimeout(timer.current);
      setQuery(next);
    }
  }, [q]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function writeUrl(value: string) {
    const next = value.trim() ? value : "";
    if (next === written.current) return;
    written.current = next;
    void navigate({ search: next ? { q: next } : {}, replace: true, resetScroll: false });
  }

  function change(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    // Clearing is a deliberate step: update the address at once. Typing waits for a pause.
    if (!value.trim()) writeUrl("");
    else timer.current = setTimeout(() => writeUrl(value), URL_DELAY);
  }

  function helpMeChoose() {
    clearTimeout(timer.current);
    setQuery("");
    written.current = "";
    void navigate({ search: {}, hash: "finder", replace: true, resetScroll: false });
    setFinderStart((n) => n + 1);
  }

  const searching = query.trim().length > 0;

  return (
    <Shell>
      <header className="max-w-3xl">
        <h1 className="font-display text-5xl tracking-tight text-balance sm:text-6xl">Find the app for the job.</h1>
        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted">
          Browser apps for school, work, business and home. {FREE_APPS.length} are free with an account; Midnry Pass adds{" "}
          {PASS_APPS.length} more for {PASS_PRICE_LABEL} a month.
        </p>
      </header>
      <AppSearch className="mt-8" fieldClassName="max-w-2xl" query={query} onQueryChange={change} onHelpChoose={helpMeChoose} />

      {/* While a search is active, browsing steps aside so the results stand on their own. */}
      {searching ? null : (
        <div data-browse>
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
            <MatchQuiz startSignal={finderStart} />
          </div>

          <div className="mt-16">
            <DeskList />
          </div>

          <div className="mt-16">
            <AllApps />
          </div>
        </div>
      )}
    </Shell>
  );
}
