import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, Field, fieldClass, TextInput } from "@/components/ui";
import { formatCents, guessCurrency, isCurrency, type CurrencyCode } from "@/lib/format";
import { CurrencyPicker, nid, parseCents, todayISO, ToolFrame, ToolStatus } from "@/components/tools/shared";

const CATEGORIES = ["Food", "Transit", "Home", "Bills", "Health", "Shopping", "Family", "Fun", "Work", "Other"] as const;

type Entry = {
  id: string;
  label: string;
  cents: number;
  category: string;
  date: string;
};

type LedgerDoc = { entries: Entry[]; currency?: CurrencyCode; budget?: string };

const FALLBACK: LedgerDoc = { entries: [] };

function asEntries(value: unknown): Entry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is Entry =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as Entry).id === "string" &&
        typeof (entry as Entry).label === "string" &&
        typeof (entry as Entry).cents === "number" &&
        typeof (entry as Entry).category === "string" &&
        typeof (entry as Entry).date === "string",
    )
    .slice(0, 500);
}

export function LedgerTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("ledger", FALLBACK);
  const entries = asEntries(data.entries);
  const currency = isCurrency(data.currency) ? data.currency : guessCurrency();
  const formatUsd = (cents: number) => formatCents(cents, currency);
  const budgetCents = parseCents(data.budget ?? "");
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [editing, setEditing] = useState<string | null>(null);

  function save(next: Partial<LedgerDoc>) {
    setData({ entries, currency: data.currency, budget: data.budget, ...next });
  }
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [date, setDate] = useState(() => todayISO());
  const [error, setError] = useState<string | null>(null);

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });
  const thisMonth = month === todayISO().slice(0, 7);
  function shift(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  function exportCsv() {
    const rows = [["Date", "What", "Category", "Amount"], ...entries.map((entry) => [entry.date, entry.label, entry.category, (entry.cents / 100).toFixed(2)])];
    const csv = rows.map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ledger.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const monthEntries = entries.filter((entry) => entry.date.startsWith(month));
  const monthTotal = monthEntries.reduce((sum, entry) => sum + entry.cents, 0);
  const bars = CATEGORIES.map((name) => ({
    name,
    cents: monthEntries.filter((entry) => entry.category === name).reduce((sum, entry) => sum + entry.cents, 0),
  })).filter((row) => row.cents > 0);
  const max = Math.max(...bars.map((row) => row.cents), 1);

  function add(event: FormEvent) {
    event.preventDefault();
    const cents = parseCents(amount);
    if (!label.trim()) {
      setError("Add a short description.");
      return;
    }
    if (cents == null) {
      setError("Enter an amount like 12.50.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a date.");
      return;
    }
    setError(null);
    if (editing) {
      save({ entries: entries.map((entry) => (entry.id === editing ? { ...entry, label: label.trim(), cents, category, date } : entry)) });
      setEditing(null);
    } else {
      save({ entries: [{ id: nid(), label: label.trim(), cents, category, date }, ...entries].slice(0, 500) });
    }
    setLabel("");
    setAmount("");
    setMonth(date.slice(0, 7));
  }

  return (
    <ToolFrame slug="ledger" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="min-w-0">
            <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
              <Field label="What">
                <TextInput value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} />
              </Field>
              <Field label="Amount">
                <TextInput
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="12.50"
                />
              </Field>
              <Field label="Category">
                <select
                  className={fieldClass}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                {error ? (
                  <p role="alert" className="mb-3 text-sm text-fail">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" tone="primary">
                    {editing ? "Save changes" : "Add expense"}
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
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Button tone="quiet" onClick={() => shift(-1)} aria-label="Previous month">
                ←
              </Button>
              <p className="min-w-36 text-center font-medium">{monthLabel}</p>
              <Button tone="quiet" onClick={() => shift(1)} disabled={thisMonth} aria-label="Next month">
                →
              </Button>
              {entries.length > 0 ? (
                <Button tone="quiet" className="ml-auto" onClick={exportCsv}>
                  Export CSV
                </Button>
              ) : null}
            </div>
            {monthEntries.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{entries.length === 0 ? "Nothing logged yet. Add your first expense above." : `Nothing logged in ${monthLabel}.`}</p>
            ) : (
              <ul className="mt-4">
                {[...monthEntries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 border-t border-line py-3 last:border-b"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium break-words">{entry.label}</span>
                      <span className="block text-sm text-muted">
                        {entry.category} · <span className="whitespace-nowrap">{entry.date}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end sm:flex-row sm:items-center sm:gap-3">
                      <span className="tabular-nums">{formatUsd(entry.cents)}</span>
                      <span className="-mr-2 flex sm:mr-0 sm:gap-3">
                        <button
                          type="button"
                          className="min-h-9 rounded-full px-2 text-sm text-muted hover:bg-paper-2"
                          onClick={() => {
                            setEditing(entry.id);
                            setLabel(entry.label);
                            setAmount((entry.cents / 100).toFixed(2));
                            setCategory(entry.category);
                            setDate(entry.date);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="min-h-9 rounded-full px-2 text-sm text-fail hover:bg-paper-2"
                          onClick={() => {
                            const before = entries;
                            save({ entries: entries.filter((item) => item.id !== entry.id) });
                            toast("Expense removed", { action: { label: "Undo", onClick: () => save({ entries: before }) } });
                          }}
                        >
                          Remove
                        </button>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="h-fit rounded-3xl bg-card p-6 shadow-line">
            <p className="text-sm text-muted">{thisMonth ? "This month" : monthLabel}</p>
            <p className="mt-2 font-display text-5xl tabular-nums tracking-tight">{formatUsd(monthTotal)}</p>
            {budgetCents ? (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                  <div
                    className={`h-full rounded-full ${monthTotal > budgetCents ? "bg-fail" : "bg-pine"}`}
                    style={{ width: `${Math.min(100, (monthTotal / budgetCents) * 100)}%` }}
                  />
                </div>
                <p className={`mt-2 text-sm ${monthTotal > budgetCents ? "font-medium text-fail" : "text-muted"}`}>
                  {monthTotal > budgetCents
                    ? `${formatUsd(monthTotal - budgetCents)} over your ${formatUsd(budgetCents)} budget`
                    : `${formatUsd(budgetCents - monthTotal)} left of ${formatUsd(budgetCents)}`}
                </p>
              </div>
            ) : null}
            {bars.length === 0 ? (
              <p className="mt-6 text-sm text-muted">Categories show up once this month has an expense.</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {bars.map((row) => (
                  <li key={row.name}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span>{row.name}</span>
                      <span className="tabular-nums text-muted">{formatUsd(row.cents)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                      <div
                        className="h-full rounded-full bg-pine"
                        style={{ width: `${Math.max(4, (row.cents / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 grid gap-3 border-t border-line pt-4">
              <Field label="Monthly budget (optional)">
                <TextInput inputMode="decimal" value={data.budget ?? ""} placeholder="e.g. 150000" onChange={(event) => save({ budget: event.target.value })} />
              </Field>
              <CurrencyPicker value={currency} onChange={(code) => save({ currency: code })} />
            </div>
          </aside>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
