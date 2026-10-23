import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { downloadText, setViewParam, useMergedDocs, viewParam } from "@/components/use-merged-docs";
import { Button, Field, fieldClass, TextInput, cn } from "@/components/ui";
import { formatCents, guessCurrency, isCurrency, type CurrencyCode } from "@/lib/format";
import { asEntries, isIncome, ledgerCsv, ledgerRoom, type LedgerEntry } from "@/lib/ledger";
import { ledgerImport, ledgerPending, rowsOf, type MoneySource } from "@/lib/merges";
import { CurrencyPicker, nid, parseCents, todayISO, ToolFrame, ToolStatus } from "@/components/tools/shared";
import { checkCents } from "@/lib/number-input";
import { ViewTabs } from "@/components/tools/view-tabs";

const CATEGORIES = ["Food", "Transit", "Home", "Bills", "Health", "Shopping", "Family", "Fun", "Work", "Income", "Other"] as const;

type Entry = LedgerEntry;

type LedgerDoc = { entries: Entry[]; currency?: CurrencyCode; budget?: string };

const FALLBACK: LedgerDoc = { entries: [] };

const FULL_MESSAGE = "Your ledger is full, so this was not added. Nothing was deleted. Export a CSV copy, then remove old entries to make room.";

export type LedgerView = "ledger" | "budget" | "pocket";

export const LEDGER_VIEWS: readonly { id: LedgerView; label: string }[] = [
  { id: "ledger", label: "Ledger" },
  { id: "budget", label: "Budget" },
  { id: "pocket", label: "Pocket" },
];

function isView(value: unknown): value is LedgerView {
  return LEDGER_VIEWS.some((view) => view.id === value);
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

function sums(entries: Entry[]) {
  const income = entries.filter(isIncome).reduce((sum, entry) => sum + entry.cents, 0);
  const spent = entries.filter((entry) => !isIncome(entry)).reduce((sum, entry) => sum + entry.cents, 0);
  return { income, spent, left: income - spent };
}

export function LedgerTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("ledger", FALLBACK);
  const entries = asEntries(data.entries);
  const currency = isCurrency(data.currency) ? data.currency : guessCurrency();
  const money = (cents: number) => formatCents(cents, currency);
  const [view, setViewState] = useState<LedgerView>(() => {
    const asked = viewParam();
    return isView(asked) ? asked : "ledger";
  });
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));

  function setView(next: LedgerView) {
    setViewState(next);
    setViewParam(next === "ledger" ? null : next);
  }

  function save(next: Partial<LedgerDoc>) {
    setData({ entries, currency: data.currency, budget: data.budget, ...next });
  }

  /** Adds entries, unless that would pass the size limit. Returns an error to show, or null. */
  function addEntries(added: Entry[]): string | null {
    const next = [...added, ...entries];
    if (ledgerRoom({ ...data, entries: next }).full) return FULL_MESSAGE;
    save({ entries: next });
    return null;
  }

  function exportCsv() {
    downloadText("ledger.csv", ledgerCsv(entries));
  }

  return (
    <ToolFrame slug="ledger" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <ViewTabs label="Ledger views" views={LEDGER_VIEWS} value={view} onChange={setView} className="mb-6" />
        <MoneyImport entries={entries} onAdd={addEntries} />
        {view === "ledger" ? (
          <FullLedger
            entries={entries}
            data={data}
            save={save}
            money={money}
            currency={currency}
            month={month}
            setMonth={setMonth}
            exportCsv={exportCsv}
          />
        ) : view === "budget" ? (
          <BudgetView entries={entries} data={data} save={save} addEntries={addEntries} money={money} month={month} setMonth={setMonth} exportCsv={exportCsv} />
        ) : (
          <PocketView entries={entries} addEntries={addEntries} save={save} money={money} />
        )}
      </ToolStatus>
    </ToolFrame>
  );
}

// ------------------------------------------------------------------ import

const SOURCE_NAMES: Record<MoneySource, string> = { budget: "Budget", pocket: "Pocket" };

/** One-click copies of the old Budget and Pocket entries. The originals stay saved where they were. */
function MoneyImport({ entries, onAdd }: { entries: Entry[]; onAdd: (added: Entry[]) => string | null }) {
  const old = useMergedDocs(["budget", "pocket"]);
  const [done, setDone] = useState<Partial<Record<MoneySource, number>>>({});
  if (!old.ready || old.failed) return null;
  const sources = (["budget", "pocket"] as const)
    .map((source) => {
      const rows = rowsOf(old.payloads[source]);
      return { source, rows, pending: ledgerPending(source, rows, entries) };
    })
    .filter((item) => item.rows.length > 0 && (item.pending > 0 || done[item.source] != null));
  if (sources.length === 0) return null;
  return (
    <div className="mb-6 grid gap-3" data-import="ledger">
      {sources.map(({ source, rows, pending }) => {
        const name = SOURCE_NAMES[source];
        if (pending === 0) {
          return (
            <p key={source} role="status" className="rounded-2xl bg-pine/10 p-4 text-sm">
              Copied {done[source]} {done[source] === 1 ? "entry" : "entries"} from {name} into Ledger. Your {name} entries are still saved, unchanged.
            </p>
          );
        }
        return (
          <div key={source} className="rounded-2xl bg-card p-4 shadow-line">
            <p className="font-medium">
              You have {rows.length} {rows.length === 1 ? "entry" : "entries"} saved in {name}, which is now a view inside Ledger.
            </p>
            <p className="mt-1 text-sm text-pretty text-muted">
              Bringing them in copies {pending === 1 ? "it" : `the ${pending} not yet copied`} into Ledger, dated today. The {name} originals are kept as they are.
            </p>
            <Button
              tone="primary"
              className="mt-3"
              onClick={() => {
                const result = ledgerImport(source, rows, entries, todayISO(), nid);
                if (result.entries.length === 0) return;
                const error = onAdd(result.entries);
                if (error) {
                  toast.error(error);
                  return;
                }
                setDone((prev) => ({ ...prev, [source]: result.entries.length }));
                toast.success(`Copied ${result.entries.length} from ${name}. The originals are kept.`);
              }}
            >
              Bring my {name} entries into Ledger
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ shared bits

function MonthNav({ month, setMonth, children }: { month: string; setMonth: (month: string) => void; children?: ReactNode }) {
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });
  const thisMonth = month === todayISO().slice(0, 7);
  function shift(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button tone="quiet" onClick={() => shift(-1)} aria-label="Previous month">
        ←
      </Button>
      <p className="min-w-36 text-center font-medium">{monthLabel}</p>
      <Button tone="quiet" onClick={() => shift(1)} disabled={thisMonth} aria-label="Next month">
        →
      </Button>
      {children}
    </div>
  );
}

/** "25 Sep 2026", for the Add button when the date is not today. */
function shortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(match[3])} ${months[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
}

function monthName(month: string): string {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });
}

function BudgetBar({ spent, budgetCents, money }: { spent: number; budgetCents: number; money: (cents: number) => string }) {
  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-paper-2">
        <div className={`h-full rounded-full ${spent > budgetCents ? "bg-fail" : "bg-pine"}`} style={{ width: `${Math.min(100, (spent / budgetCents) * 100)}%` }} />
      </div>
      <p className={`mt-2 text-sm ${spent > budgetCents ? "font-medium text-fail" : "text-muted"}`}>
        {spent > budgetCents ? `${money(spent - budgetCents)} over your ${money(budgetCents)} budget` : `${money(budgetCents - spent)} left of ${money(budgetCents)}`}
      </p>
    </div>
  );
}

function RemoveButton({ entry, entries, save, className }: { entry: Entry; entries: Entry[]; save: (next: Partial<LedgerDoc>) => void; className?: string }) {
  return (
    <button
      type="button"
      className={cn("min-h-11 rounded-full px-2 text-sm text-fail hover:bg-paper-2", className)}
      onClick={() => {
        const before = entries;
        save({ entries: entries.filter((item) => item.id !== entry.id) });
        toast("Entry removed", { action: { label: "Undo", onClick: () => save({ entries: before }) } });
      }}
    >
      Remove
    </button>
  );
}

type ViewProps = {
  entries: Entry[];
  data: LedgerDoc;
  save: (next: Partial<LedgerDoc>) => void;
  money: (cents: number) => string;
  month: string;
  setMonth: (month: string) => void;
  exportCsv: () => void;
};

// ------------------------------------------------------------------ full ledger

function FullLedger({ entries, data, save, money, currency, month, setMonth, exportCsv }: ViewProps & { currency: CurrencyCode }) {
  const budgetCents = parseCents(data.budget ?? "");
  const budgetCheck = checkCents(data.budget ?? "");
  // A typed budget that cannot be read says so, instead of quietly showing no bar.
  const budgetHint = budgetCheck.ok || !data.budget?.trim() ? null : (budgetCheck.hint ?? "Enter a budget like 150000.");
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [flow, setFlow] = useState<"out" | "in">("out");
  const [date, setDate] = useState(() => todayISO());
  const [error, setError] = useState<string | null>(null);

  const monthLabel = monthName(month);
  const thisMonth = month === todayISO().slice(0, 7);
  const monthEntries = entries.filter((entry) => monthOf(entry.date) === month);
  const totals = sums(monthEntries);
  const bars = CATEGORIES.map((name) => ({
    name,
    cents: monthEntries.filter((entry) => !isIncome(entry) && entry.category === name).reduce((sum, entry) => sum + entry.cents, 0),
  })).filter((row) => row.cents > 0);
  const max = Math.max(...bars.map((row) => row.cents), 1);
  const room = useMemo(() => ledgerRoom(data), [data]);

  function add(event: FormEvent) {
    event.preventDefault();
    const checked = checkCents(amount);
    if (!label.trim()) {
      setError("Add a short description.");
      return;
    }
    if (!checked.ok) {
      setError(checked.hint ?? "Enter an amount like 12.50.");
      return;
    }
    const cents = checked.cents;
    if (cents === 0) {
      setError("Enter an amount above zero.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a date.");
      return;
    }
    setError(null);
    // Money in is its own kind of entry, not a spending category.
    const fields = { label: label.trim(), cents, category: flow === "in" ? "Income" : category, date, ...(flow === "in" ? { flow: "in" as const } : {}) };
    if (editing) {
      const next = entries.map((entry) => {
        if (entry.id !== editing) return entry;
        const { flow: _old, ...rest } = entry;
        return { ...rest, ...fields };
      });
      if (ledgerRoom({ ...data, entries: next }).full) {
        setError(FULL_MESSAGE);
        return;
      }
      save({ entries: next });
      setEditing(null);
    } else {
      const next = [{ id: nid(), ...fields }, ...entries];
      if (ledgerRoom({ ...data, entries: next }).full) {
        setError(FULL_MESSAGE);
        return;
      }
      save({ entries: next });
    }
    setLabel("");
    setAmount("");
    setMonth(date.slice(0, 7));
  }

  const today = todayISO();
  const dateLabel = date && date !== today ? ` on ${shortDate(date)}` : "";
  const summary = (
    <>
      <p className="text-sm text-muted">{thisMonth ? "Spent this month" : `Spent in ${monthLabel}`}</p>
      <p className="mt-2 font-display text-5xl tabular-nums tracking-tight">{money(totals.spent)}</p>
      {totals.income > 0 ? <p className="mt-2 text-sm text-muted">Money in: {money(totals.income)}</p> : null}
      {budgetCents ? <BudgetBar spent={totals.spent} budgetCents={budgetCents} money={money} /> : null}
    </>
  );
  const breakdown = (
    <>
      {bars.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Categories show up once this month has an expense.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {bars.map((row) => (
            <li key={row.name}>
              <div className="mb-1.5 flex justify-between gap-3 text-sm">
                <span>{row.name}</span>
                <span className="tabular-nums text-muted">{money(row.cents)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full rounded-full bg-pine" style={{ width: `${Math.max(4, (row.cents / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 grid gap-3 border-t border-line pt-4">
        <Field label="Monthly budget (optional)">
          <TextInput inputMode="decimal" value={data.budget ?? ""} placeholder="e.g. 150000" onChange={(event) => save({ budget: event.target.value })} />
        </Field>
        {budgetHint ? (
          <p className="text-sm text-fail" role="alert">
            {budgetHint}
          </p>
        ) : null}
        <CurrencyPicker value={currency} onChange={(code) => save({ currency: code })} />
      </div>
    </>
  );
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      {/* On a phone the month's total and bars come first, above the form, instead of under every entry. */}
      <section aria-label="This month" className="rounded-3xl bg-card p-5 shadow-line lg:hidden" data-month-summary="phone">
        {summary}
        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Where the month went, budget and currency</summary>
          {breakdown}
        </details>
      </section>
      <div className="min-w-0">
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
          <Field label="What">
            <TextInput value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} />
          </Field>
          <Field label="Amount">
            <TextInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12.50" />
          </Field>
          <Field label="Category">
            <select className={fieldClass} value={flow === "in" ? "Income" : category} disabled={flow === "in"} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.filter((name) => (flow === "in" ? name === "Income" : name !== "Income")).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Money in or out">
            <select className={fieldClass} value={flow} onChange={(event) => setFlow(event.target.value === "in" ? "in" : "out")}>
              <option value="out">Money out (an expense)</option>
              <option value="in">Money in (income)</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            {error ? (
              <p role="alert" className="mb-3 text-sm text-fail">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" tone="primary">
                {editing ? "Save changes" : `${flow === "in" ? "Add income" : "Add expense"}${dateLabel}`}
              </Button>
              {editing ? (
                <Button
                  tone="quiet"
                  onClick={() => {
                    setEditing(null);
                    setLabel("");
                    setAmount("");
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </form>
        {room.nearlyFull ? (
          <div role="status" className="mt-6 rounded-2xl bg-card p-4 text-sm shadow-line">
            <p className="font-medium">
              {room.full ? "Your ledger is full." : "Your ledger is nearly full."} It holds {entries.length.toLocaleString("en")} entries ({Math.min(100, Math.round((room.size / room.limit) * 100))}% of the space).
            </p>
            <p className="mt-1 text-muted">Nothing is deleted for you. Export a CSV copy, then remove old entries to make room.</p>
            <Button tone="quiet" className="mt-3" onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
        ) : null}
        <div className="mt-8">
          <MonthNav month={month} setMonth={setMonth}>
            {entries.length > 0 ? (
              <Button tone="quiet" className="ml-auto" onClick={exportCsv}>
                Export CSV
              </Button>
            ) : null}
          </MonthNav>
        </div>
        {monthEntries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{entries.length === 0 ? "Nothing logged yet. Add your first expense above." : `Nothing logged in ${monthLabel}.`}</p>
        ) : (
          <ul className="mt-4">
            {[...monthEntries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 border-t border-line py-3 last:border-b">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">{entry.label}</span>
                    <span className="block text-sm text-muted">
                      {isIncome(entry) ? "Money in" : entry.category} · <span className="whitespace-nowrap">{entry.date}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end sm:flex-row sm:items-center sm:gap-3">
                    <span className={cn("tabular-nums", isIncome(entry) && "text-pine")}>
                      {isIncome(entry) ? "+" : ""}
                      {money(entry.cents)}
                    </span>
                    <span className="-mr-2 flex sm:mr-0 sm:gap-3">
                      <button
                        type="button"
                        className="min-h-11 rounded-full px-2 text-sm text-muted hover:bg-paper-2"
                        onClick={() => {
                          setEditing(entry.id);
                          setLabel(entry.label);
                          setAmount((entry.cents / 100).toFixed(2));
                          setCategory(entry.category);
                          setFlow(isIncome(entry) ? "in" : "out");
                          setDate(entry.date);
                        }}
                      >
                        Edit
                      </button>
                      <RemoveButton entry={entry} entries={entries} save={save} />
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
      <aside className="hidden h-fit rounded-3xl bg-card p-6 shadow-line lg:block" data-month-summary="laptop">
        {summary}
        {breakdown}
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ budget

function QuickAdd({
  addEntries,
  large,
  onAdded,
}: {
  addEntries: (added: Entry[]) => string | null;
  large?: boolean;
  onAdded?: (entry: Entry) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(flow: "in" | "out") {
    const checked = checkCents(amount);
    if (!label.trim()) return setError("Write what it was.");
    if (!checked.ok) return setError(checked.hint ?? "Enter an amount like 500 or 12.50.");
    const cents = checked.cents;
    const entry: Entry = { id: nid(), label: label.trim().slice(0, 80), cents, category: flow === "in" ? "Income" : "Other", date: todayISO(), ...(flow === "in" ? { flow: "in" as const } : {}) };
    const problem = addEntries([entry]);
    if (problem) return setError(problem);
    setError(null);
    setLabel("");
    setAmount("");
    onAdded?.(entry);
  }

  return (
    <form
      className={cn("grid gap-4 rounded-2xl bg-card p-4 shadow-line sm:grid-cols-2", large && "text-lg")}
      onSubmit={(event) => {
        event.preventDefault();
        add("out");
      }}
    >
      <Field label="What">
        <TextInput className={cn(large && "h-14 text-lg")} value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} placeholder={large ? "Market" : "Salary, rent…"} />
      </Field>
      <Field label="Amount">
        <TextInput className={cn(large && "h-14 text-lg")} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="500" />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-fail sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button tone="primary" className={cn(large && "min-h-14 flex-1 text-lg")} onClick={() => add("in")}>
          + Money in
        </Button>
        <Button type="submit" tone="quiet" className={cn(large && "min-h-14 flex-1 text-lg")}>
          − Money out
        </Button>
      </div>
    </form>
  );
}

function Stat({ label, value, tone, large }: { label: string; value: string; tone?: "good" | "bad"; large?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-line" data-stat={label}>
      <p className={cn("text-muted", large ? "text-lg" : "text-sm")}>{label}</p>
      <p className={cn("mt-1 font-display tabular-nums tracking-tight", large ? "text-5xl sm:text-6xl" : "text-3xl", tone === "bad" && "text-fail", tone === "good" && "text-pine")}>{value}</p>
    </div>
  );
}

function BudgetView({ entries, data, save, addEntries, money, month, setMonth, exportCsv }: ViewProps & { addEntries: (added: Entry[]) => string | null }) {
  const monthEntries = entries.filter((entry) => monthOf(entry.date) === month);
  const totals = sums(monthEntries);
  const budgetCents = parseCents(data.budget ?? "");
  const incomeLines = monthEntries.filter(isIncome);
  const costLines = monthEntries.filter((entry) => !isIncome(entry));
  return (
    <div className="grid gap-6" data-ledger-view="budget">
      <p className="max-w-2xl text-pretty text-muted">Income against costs for the month, and how much of your monthly budget is left. Every line here is also in the full ledger.</p>
      <QuickAdd addEntries={addEntries} onAdded={(entry) => setMonth(monthOf(entry.date))} />
      <MonthNav month={month} setMonth={setMonth}>
        {entries.length > 0 ? (
          <Button tone="quiet" className="ml-auto" onClick={exportCsv}>
            Export CSV
          </Button>
        ) : null}
      </MonthNav>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Income" value={money(totals.income)} />
        <Stat label="Costs" value={money(totals.spent)} />
        <Stat label="Left" value={money(totals.left)} tone={totals.left < 0 ? "bad" : "good"} />
      </div>
      <div className="rounded-2xl bg-card p-4 shadow-line">
        <Field label="Monthly budget for costs (optional)">
          <TextInput inputMode="decimal" value={data.budget ?? ""} placeholder="e.g. 150000" onChange={(event) => save({ budget: event.target.value })} />
        </Field>
        {budgetCents ? <BudgetBar spent={totals.spent} budgetCents={budgetCents} money={money} /> : null}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { title: "Income", lines: incomeLines },
          { title: "Costs", lines: costLines },
        ].map((column) => (
          <section key={column.title} className="min-w-0">
            <h2 className="font-medium">
              {column.title} in {monthName(month)}
            </h2>
            {column.lines.length === 0 ? (
              <p className="mt-2 text-sm text-muted">None yet.</p>
            ) : (
              <ul className="mt-2">
                {column.lines.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 border-t border-line py-2 last:border-b">
                    <span className="min-w-0 flex-1 break-words">{entry.label}</span>
                    <span className="tabular-nums">{money(entry.cents)}</span>
                    <RemoveButton entry={entry} entries={entries} save={save} className="-mr-2" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pocket

function PocketView({ entries, addEntries, save, money }: { entries: Entry[]; addEntries: (added: Entry[]) => string | null; save: (next: Partial<LedgerDoc>) => void; money: (cents: number) => string }) {
  const month = todayISO().slice(0, 7);
  const totals = sums(entries.filter((entry) => monthOf(entry.date) === month));
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return (
    <div className="grid gap-6 text-lg" data-ledger-view="pocket">
      <p className="text-muted">Money in, money out, and what is left this month.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat large label="Money in" value={money(totals.income)} />
        <Stat large label="Money out" value={money(totals.spent)} />
        <Stat large label="Left" value={money(totals.left)} tone={totals.left < 0 ? "bad" : "good"} />
      </div>
      <QuickAdd large addEntries={addEntries} />
      {recent.length > 0 ? (
        <section>
          <h2 className="font-medium">Latest</h2>
          <ul className="mt-2">
            {recent.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 border-t border-line py-3 last:border-b">
                <span className="min-w-0 flex-1 break-words">{entry.label}</span>
                <span className={cn("tabular-nums", isIncome(entry) && "text-pine")}>
                  {isIncome(entry) ? "+" : "−"}
                  {money(entry.cents)}
                </span>
                <RemoveButton entry={entry} entries={entries} save={save} className="-mr-2 text-base" />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-muted">Nothing here yet. Add money in or money out above.</p>
      )}
    </div>
  );
}
