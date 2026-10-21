import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextInput, cn } from "@/components/ui";
import { getKit } from "@/lib/kits";
import { asMedsDoc, history, HISTORY_DAYS, isTaken, KEEP_DAYS, prune, toggleTaken, type MedRow, type MedsDoc } from "@/lib/meds";
import { parseIso } from "@/lib/remind/dates";
import { nid, todayISO, ToolFrame, ToolStatus } from "@/components/tools/shared";

type SavedDoc = { rows: unknown; taken?: unknown };

const FALLBACK: SavedDoc = { rows: [] };

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function dayName(iso: string, today: string): string {
  const label = parseIso(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  if (iso === today) return `Today, ${label}`;
  return label;
}

/** Medicines: a large list with a tick for today and the last 30 days. */
export function MedsTool() {
  const kit = getKit("meds");
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<SavedDoc>("meds", FALLBACK);
  const doc = asMedsDoc(data);
  const [today, setToday] = useState(() => todayISO());
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Keep "today" right if the page stays open past midnight.
  useEffect(() => {
    const tick = () => setToday(todayISO());
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  function save(next: MedsDoc) {
    // Keep any other saved fields; store row ids so ticks stay attached.
    setData({ ...data, rows: next.rows, taken: prune(next.taken, today) });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Write the name of the medicine.");
      return;
    }
    setError(null);
    if (editing) {
      save({ ...doc, rows: doc.rows.map((row) => (row.id === editing ? { ...row, name: cleanName, when: when.trim() } : row)) });
    } else {
      save({ ...doc, rows: [...doc.rows, { id: nid(), name: cleanName, when: when.trim() } as MedRow] });
    }
    setEditing(null);
    setName("");
    setWhen("");
  }

  function remove(row: MedRow) {
    const before = doc;
    save({ ...doc, rows: doc.rows.filter((item) => item.id !== row.id) });
    if (editing === row.id) {
      setEditing(null);
      setName("");
      setWhen("");
    }
    toast(`${row.name || "Medicine"} removed`, { action: { label: "Undo", onClick: () => save(before) } });
  }

  function exportCsv() {
    const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const csv = [["Medicine", "When"], ...doc.rows.map((row) => [row.name, row.when])].map((row) => row.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "meds.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const takenToday = doc.rows.filter((row) => isTaken(doc, row.id, today)).length;
  const days = history(doc, today);

  return (
    <ToolFrame slug="meds" saveState={saveState}>
      <div className="text-lg">
        {kit?.note ? <p className="mb-4 max-w-2xl text-sm text-pretty text-muted">{kit.note}</p> : null}
        <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
          <section aria-labelledby="meds-today">
            <h2 id="meds-today" className="font-display text-3xl tracking-tight">
              {dayName(today, today)}
            </h2>
            {doc.rows.length > 0 ? (
              <p className="mt-1 text-muted">
                {takenToday} of {doc.rows.length} taken today. Press a medicine when you have taken it. Press it again to undo.
              </p>
            ) : (
              <p className="mt-1 text-muted">Add your first medicine below. It will show here with a button to tick it.</p>
            )}
            <ul className="mt-4 space-y-3">
              {doc.rows.map((row) => {
                const tick = isTaken(doc, row.id, today);
                return (
                  <li key={row.id} className={cn("rounded-2xl bg-card p-3 shadow-line", editing === row.id && "ring-2 ring-pine")}>
                    <button
                      type="button"
                      aria-pressed={tick ? true : false}
                      onClick={() => save(toggleTaken(doc, row, today, nowTime()))}
                      className={cn(
                        "flex min-h-16 w-full items-center gap-4 rounded-xl px-3 py-2 text-left",
                        tick ? "bg-pine text-paper" : "bg-paper hover:bg-paper-2",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-full border-2 text-2xl font-bold",
                          tick ? "border-paper" : "border-line bg-card",
                        )}
                      >
                        {tick ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xl font-medium break-words">{row.name || "Medicine"}</span>
                        <span className={cn("block text-base", tick ? "text-paper" : "text-muted")}>
                          {row.when ? `${row.when} · ` : ""}
                          {tick ? `Taken today at ${tick.at}` : "Not taken yet today"}
                        </span>
                      </span>
                    </button>
                    <div className="mt-2 flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        className="min-h-11 rounded-full px-4 text-base text-muted hover:bg-paper-2"
                        onClick={() => {
                          setEditing(row.id);
                          setName(row.name);
                          setWhen(row.when);
                          formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="min-h-11 rounded-full px-4 text-base text-fail hover:bg-paper-2" onClick={() => remove(row)}>
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <form ref={formRef} onSubmit={submit} className="mt-8 rounded-2xl bg-card p-4 shadow-line">
            <p className="mb-3 font-medium">{editing ? "Change this medicine" : "Add a medicine"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-base text-muted">Medicine</span>
                <TextInput className="h-14 text-lg" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-base text-muted">When</span>
                <TextInput className="h-14 text-lg" value={when} maxLength={60} placeholder="Morning" onChange={(event) => setWhen(event.target.value)} />
              </label>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-base text-fail">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button tone="primary" type="submit" className="min-h-12 px-6 text-lg">
                {editing ? "Save changes" : "Add medicine"}
              </Button>
              {editing ? (
                <Button
                  tone="quiet"
                  className="min-h-12 px-6 text-lg"
                  onClick={() => {
                    setEditing(null);
                    setName("");
                    setWhen("");
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              {doc.rows.length > 0 && !editing ? (
                <Button tone="quiet" className="min-h-12 px-6 text-lg sm:ml-auto" onClick={exportCsv}>
                  Export list
                </Button>
              ) : null}
            </div>
          </form>

          {doc.rows.length > 0 ? (
            <details className="mt-8 rounded-2xl bg-card p-4 shadow-line">
              <summary className="min-h-11 cursor-pointer py-2 font-medium">The last {HISTORY_DAYS} days</summary>
              <p className="mt-1 text-base text-muted">What was ticked each day. Ticks older than {KEEP_DAYS} days are cleared.</p>
              <ul className="mt-3 divide-y divide-line">
                {days.map((day) => (
                  <li key={day.day} className="py-3">
                    <p className="font-medium">{dayName(day.day, today)}</p>
                    <p className="text-base text-muted">
                      {day.ticks.length ? day.ticks.map((tick) => `${tick.name} at ${tick.at}`).join(", ") : "Nothing ticked"}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </ToolStatus>
      </div>
    </ToolFrame>
  );
}
