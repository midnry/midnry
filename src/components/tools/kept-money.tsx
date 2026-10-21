import { Link } from "@tanstack/react-router";
import { Button, buttonClass, Skeleton } from "@/components/ui";
import { downloadText, useMergedDocs, viewParam } from "@/components/use-merged-docs";
import { rowsCsv, rowsOf, sideOf, amountCents, type MoneySource, type Row } from "@/lib/merges";
import { PASS_PRICE_LABEL } from "@/lib/access";

const SOURCES: readonly { id: MoneySource; name: string }[] = [
  { id: "budget", name: "Budget" },
  { id: "pocket", name: "Pocket" },
];

const COLUMNS = [
  { id: "name", label: "What" },
  { id: "amount", label: "Amount" },
  { id: "side", label: "Income or cost" },
];

function total(rows: Row[], side: "in" | "out"): number {
  return rows.filter((row) => sideOf(row) === side).reduce((sum, row) => sum + (amountCents(row.amount) ?? 0), 0);
}

function plain(cents: number): string {
  return (cents / 100).toLocaleString("en", { maximumFractionDigits: 2 });
}

/**
 * For people without the Pass who used the free Budget or Pocket apps before
 * they became views inside Ledger: their saved entries, read-only, with a CSV
 * export. Nothing is changed or deleted. `view` is the old link they came from.
 */
export function KeptMoneyData({ view = viewParam() ?? undefined }: { view?: string }) {
  const old = useMergedDocs(SOURCES.map((source) => source.id));
  const order = view === "pocket" ? [...SOURCES].reverse() : SOURCES;
  const came = SOURCES.find((source) => source.id === view);
  if (!old.ready) return <Skeleton className="mt-6 h-40 w-full" />;
  const kept = order.map((source) => ({ ...source, rows: rowsOf(old.payloads[source.id]) })).filter((source) => source.rows.length > 0);
  if (kept.length === 0 && !came) return null;
  return (
    <section className="mt-6 rounded-3xl bg-card p-5 shadow-line" data-kept-money>
      <h2 className="font-display text-3xl tracking-tight">{kept.length > 0 ? "Your saved entries are safe" : `${came?.name} is now part of Ledger`}</h2>
      <p className="mt-2 max-w-2xl text-pretty text-muted">
        {came ? `${came.name} is now a view inside Ledger, ` : "Budget and Pocket are now views inside Ledger, "}
        which is included with Midnry Pass ({PASS_PRICE_LABEL} a month).{" "}
        {kept.length > 0
          ? "Everything you saved is kept: you can read it and export it here any time, for free. With the Pass you can bring it into Ledger in one click and keep adding to it."
          : "You had nothing saved there, so nothing is waiting for you."}
      </p>
      {old.failed ? <p className="mt-3 text-sm text-fail">Could not load your saved entries. Refresh and try again; nothing was deleted.</p> : null}
      {kept.map((source) => {
        const income = total(source.rows, "in");
        const cost = total(source.rows, "out");
        return (
          <div key={source.id} className="mt-6" data-kept={source.id}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mr-auto text-lg font-medium">
                {source.name}: {source.rows.length} {source.rows.length === 1 ? "entry" : "entries"} <span className="text-sm font-normal text-muted">(read-only)</span>
              </h3>
              <Button tone="quiet" onClick={() => downloadText(`${source.id}.csv`, rowsCsv(COLUMNS, source.rows))}>
                Export {source.name} CSV
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted">
              Money in {plain(income)} · Money out {plain(cost)} · Left {plain(income - cost)}
            </p>
            <ul className="mt-3">
              {source.rows.map((row, index) => (
                <li key={index} className="flex items-center justify-between gap-3 border-t border-line py-2 last:border-b">
                  <span className="min-w-0 flex-1 break-words">{row.name || "—"}</span>
                  <span className="text-sm text-muted">{sideOf(row) === "in" ? "Income" : sideOf(row) === "out" ? "Cost" : row.side || ""}</span>
                  <span className="tabular-nums">{row.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to="/billing" className={buttonClass({ tone: "primary" })}>
          See Midnry Pass
        </Link>
      </div>
    </section>
  );
}
