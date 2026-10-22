import { useId, useState, type FormEvent } from "react";
import { addDays, parseIso } from "@/lib/remind/dates";
import { checkCents } from "@/lib/number-input";
import { cn } from "@/components/ui";
import { DemoGrid, LiveSummary, Step, demoInput, useDemoTouch, useToday } from "./demo-kit";
import { SAMPLES, moneyFor, useDemoCurrency, type Money } from "./demo-currency";

/**
 * Ledger with a sample month of spending. Like the Ledger app
 * (src/components/tools/ledger.tsx): the same categories, amounts read with
 * the same rule, the month's total, an optional budget, and one bar per
 * category scaled to the biggest. The sample month follows the demo
 * currency; switching currency starts a fresh month in that currency.
 * Nothing is sent or saved.
 */

const CATEGORIES = ["Food", "Transit", "Home", "Bills", "Health", "Shopping", "Family", "Fun", "Work", "Other"] as const;
type Entry = { id: string; label: string; cents: number; category: string; daysAgo: number };

const MAX_ENTRIES = 12;

export function LedgerDemo() {
  const { currency } = useDemoCurrency();
  return <LedgerSample key={currency} money={moneyFor(currency)} />;
}

function LedgerSample({ money: currency }: { money: Money }) {
  const ids = useId();
  const today = useToday();
  const sample = SAMPLES[currency.code].ledger;
  const BUDGET_CENTS = sample.budget * 100;
  const [entries, setEntries] = useState<Entry[]>(() =>
    sample.entries.map(({ amount, ...entry }, index) => ({ id: `e${index + 1}`, cents: Math.round(amount * 100), ...entry })),
  );
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food");
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(sample.entries.length);
  const [changed, setChanged] = useState(false);
  const touch = useDemoTouch();
  const markChanged = () => {
    setChanged(true);
    touch();
  };

  const total = entries.reduce((sum, entry) => sum + entry.cents, 0);
  const bars = CATEGORIES.map((name) => ({
    name,
    cents: entries.filter((entry) => entry.category === name).reduce((sum, entry) => sum + entry.cents, 0),
  })).filter((row) => row.cents > 0);
  const max = Math.max(...bars.map((row) => row.cents), 1);
  const over = total > BUDGET_CENTS;
  const money = (cents: number) => currency.format(cents / 100);

  // Sample dates stay inside the current month.
  const monthStart = today ? `${today.slice(0, 7)}-01` : "";
  const dateOf = (entry: Entry) => {
    if (!today) return "";
    const iso = addDays(today, -entry.daysAgo);
    return parseIso(iso < monthStart ? monthStart : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const monthLabel = today ? parseIso(today).toLocaleDateString("en", { month: "long", year: "numeric" }) : "This month";

  function add(event: FormEvent) {
    event.preventDefault();
    const checked = checkCents(amount);
    if (!label.trim()) return setError("Add a short description.");
    if (!checked.ok) return setError(checked.hint ?? `Enter an amount like ${sample.example}.`);
    const cents = checked.cents;
    if (entries.length >= MAX_ENTRIES) return setError(`The sample keeps ${MAX_ENTRIES} lines. Remove one first.`);
    setError(null);
    const next = count + 1;
    setCount(next);
    markChanged();
    setEntries((all) => [{ id: `e${next}`, label: label.trim().slice(0, 60), cents, category, daysAgo: 0 }, ...all]);
    setLabel("");
    setAmount("");
  }

  return (
    <DemoGrid
      input={
        <Step n={1} title="Log what you spend">
          <form onSubmit={add} className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" noValidate>
            <label className="col-span-2 sm:col-span-1">
              <span className="sr-only">What</span>
              <input value={label} onChange={(event) => { touch(); setLabel(event.target.value); }} placeholder="What, e.g. Fuel" className={demoInput} aria-describedby={error ? `${ids}-error` : undefined} />
            </label>
            <label>
              <span className="sr-only">Amount in {currency.name}</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder={`${currency.symbol} Amount`} className={cn(demoInput, "tabular-nums")} aria-describedby={error ? `${ids}-error` : undefined} />
            </label>
            <label>
              <span className="sr-only">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={cn(demoInput, "pr-2")}>
                {CATEGORIES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full bg-pine px-5 text-sm font-medium text-paper hover:opacity-90 sm:col-span-1">
              Add
            </button>
          </form>
          {error ? (
            <p id={`${ids}-error`} role="alert" className="mt-2 text-sm text-fail">
              {error}
            </p>
          ) : null}
          <ul className="mt-4 border-b border-line" aria-label="Sample expenses">
            {entries.map((entry) => (
              <li key={entry.id} className="anim-rise flex items-center gap-2 border-t border-line py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium sm:text-base">{entry.label}</span>
                  <span className="block text-xs text-muted">
                    {entry.category}
                    {today ? ` · ${dateOf(entry)}` : ""}
                  </span>
                </span>
                <span className="text-sm whitespace-nowrap tabular-nums sm:text-base">{money(entry.cents)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${entry.label}`}
                  onClick={() => {
                    markChanged();
                    setEntries((all) => all.filter((item) => item.id !== entry.id));
                  }}
                  className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-ink"
                >
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          {entries.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing logged. Add an expense above.</p> : null}
        </Step>
      }
      result={
        <Step n={2} title="See where the month went">
          <LiveSummary
            active={changed}
            text={`${monthLabel} total ${money(total)}. ${over ? `${money(total - BUDGET_CENTS)} over budget` : `${money(BUDGET_CENTS - total)} left of the budget`}.`}
          />
          <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <p className="text-sm text-muted">{monthLabel}</p>
            <p className="mt-1 font-display text-4xl tracking-tight tabular-nums sm:text-5xl">{money(total)}</p>
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                <div
                  className={cn("h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-calm", over ? "bg-fail" : "bg-pine")}
                  style={{ width: `${Math.min(100, (total / BUDGET_CENTS) * 100)}%` }}
                />
              </div>
              <p className={cn("mt-2 text-sm", over ? "font-medium text-fail" : "text-muted")}>
                {over ? `${money(total - BUDGET_CENTS)} over your ${money(BUDGET_CENTS)} budget` : `${money(BUDGET_CENTS - total)} left of ${money(BUDGET_CENTS)}`}
              </p>
            </div>
            {bars.length === 0 ? (
              <p className="mt-6 text-sm text-muted">Categories show up once the month has an expense.</p>
            ) : (
              <ul className="mt-6 space-y-3.5">
                {bars.map((row) => (
                  <li key={row.name}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span>{row.name}</span>
                      <span className="text-muted tabular-nums">{money(row.cents)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                      <div
                        className="h-full rounded-full bg-pine motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-calm"
                        style={{ width: `${Math.max(4, (row.cents / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Step>
      }
    />
  );
}
