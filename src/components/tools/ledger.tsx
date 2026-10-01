import { useState, type FormEvent } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, Field, fieldClass, TextInput } from "@/components/ui";
import { formatUsd } from "@/lib/format";
import { nid, parseCents, todayISO, ToolFrame, ToolStatus } from "@/components/tools/shared";

const CATEGORIES = ["Food", "Transit", "Home", "Work", "Other"] as const;

type Entry = {
  id: string;
  label: string;
  cents: number;
  category: string;
  date: string;
};

type LedgerDoc = { entries: Entry[] };

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
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [date, setDate] = useState(() => todayISO());
  const [error, setError] = useState<string | null>(null);

  const month = todayISO().slice(0, 7);
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
    setData({
      entries: [
        { id: nid(), label: label.trim(), cents, category, date },
        ...entries,
      ].slice(0, 500),
    });
    setLabel("");
    setAmount("");
  }

  return (
    <ToolFrame slug="ledger" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
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
                <Button type="submit" tone="primary">
                  Add expense
                </Button>
              </div>
            </form>
            {entries.length === 0 ? (
              <p className="mt-8 text-sm text-muted">Nothing logged yet.</p>
            ) : (
              <ul className="mt-8">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 border-t border-line py-3 last:border-b"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{entry.label}</span>
                      <span className="text-sm text-muted">
                        {entry.category} · {entry.date}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{formatUsd(entry.cents)}</span>
                      <Button
                        tone="quiet"
                        onClick={() => setData({ entries: entries.filter((item) => item.id !== entry.id) })}
                      >
                        Remove
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="h-fit rounded-3xl bg-card p-6 shadow-line">
            <p className="text-sm text-muted">This month</p>
            <p className="mt-2 font-display text-5xl tabular-nums tracking-tight">{formatUsd(monthTotal)}</p>
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
          </aside>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
