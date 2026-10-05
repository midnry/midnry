import { useState } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea, cn, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";

type Note = { id: string; body: string; written: string };
type Period = { id: string; start: string; end: string; notes: Note[] };
type Doc = { cycleLength: number; periods: Period[] };

// Earlier versions stored day logs and one note per period start. They are read once and turned into periods.
type LegacyLog = { date?: unknown; flow?: unknown; notes?: unknown };
type LegacyNote = { start?: unknown; body?: unknown };
type Raw = Partial<Doc> & { logs?: LegacyLog[]; notes?: LegacyNote[] };

const FALLBACK: Raw = { cycleLength: 28, periods: [] };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return isoOf(date);
}
function diffDays(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86400000);
}
function prettyLong(iso: string): string {
  return parseIso(iso).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function pretty(iso: string): string {
  return parseIso(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}
function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}
function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function asNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      id: typeof item?.id === "string" && item.id ? item.id : newId(),
      body: typeof item?.body === "string" ? item.body.slice(0, 2000) : "",
      written: typeof item?.written === "string" && ISO.test(item.written) ? item.written : isoOf(new Date()),
    }))
    .filter((note) => note.body.trim())
    .slice(-100);
}

function fromLegacy(raw: Raw): Period[] {
  const logs = Array.isArray(raw.logs) ? raw.logs : [];
  const days = new Set(
    logs.filter((log) => typeof log?.date === "string" && ISO.test(log.date) && log.flow).map((log) => log.date as string),
  );
  const starts = [...days].filter((day) => !days.has(addDays(day, -1))).sort();
  const periods: Period[] = starts.map((start) => {
    let end = start;
    while (days.has(addDays(end, 1))) end = addDays(end, 1);
    return { id: start, start, end, notes: [] };
  });
  const owner = (date: string) =>
    periods.find((period) => date >= period.start && date <= period.end) ??
    [...periods].reverse().find((period) => period.start <= date) ??
    periods[0];
  for (const note of Array.isArray(raw.notes) ? raw.notes : []) {
    if (typeof note?.start !== "string" || typeof note.body !== "string" || !note.body.trim()) continue;
    const period = owner(note.start);
    if (period) period.notes.push({ id: `${note.start}-period`, body: note.body.slice(0, 2000), written: note.start });
  }
  for (const log of logs) {
    if (typeof log?.date !== "string" || !ISO.test(log.date) || typeof log.notes !== "string" || !log.notes.trim()) continue;
    const period = owner(log.date);
    if (period) period.notes.push({ id: `${log.date}-day`, body: log.notes.slice(0, 2000), written: log.date });
  }
  return periods;
}

function asDoc(raw: Raw): Doc {
  const source = Array.isArray(raw.periods) && raw.periods.length > 0 ? raw.periods : fromLegacy(raw);
  const periods = source
    .map((item) => {
      const start = typeof item?.start === "string" && ISO.test(item.start) ? item.start : "";
      const end = typeof item?.end === "string" && ISO.test(item.end) && item.end >= start ? item.end : "";
      return { id: typeof item?.id === "string" && item.id ? item.id : start, start, end, notes: asNotes(item?.notes) };
    })
    .filter((period) => period.start)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(-200);
  return { cycleLength: clamp(Number(raw.cycleLength), 15, 60, 28), periods };
}

function predict(doc: Doc, today: string) {
  const starts = doc.periods.map((period) => period.start).filter((start) => start <= today);
  const gaps = starts
    .slice(1)
    .map((start, index) => diffDays(starts[index], start))
    .filter((gap) => gap >= 15 && gap <= 60);
  const fromLogs = gaps.length > 0;
  const cycle = fromLogs ? clamp(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length, 15, 60, 28) : doc.cycleLength;
  const last = starts[starts.length - 1] ?? "";
  const next = last ? addDays(last, cycle) : "";
  const daysUntil = next ? diffDays(today, next) : 0;
  return { cycle, fromLogs, last, next, daysUntil };
}

function overlaps(periods: Period[], start: string, end: string, skip?: string): Period | undefined {
  const until = end || start;
  return periods.find((period) => period.id !== skip && start <= (period.end || period.start) && until >= period.start);
}

export function CycleTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<Raw>("cycle", FALLBACK);
  const doc = asDoc(data);
  const today = isoOf(new Date());
  const estimate = predict(doc, today);

  function commit(next: Doc) {
    setData({ cycleLength: next.cycleLength, periods: next.periods });
  }

  function updatePeriod(id: string, change: (period: Period) => Period) {
    commit({ ...doc, periods: doc.periods.map((period) => (period.id === id ? change(period) : period)) });
  }

  return (
    <ToolFrame slug="cycle" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <LogForm
          today={today}
          periods={doc.periods}
          onLog={(period) => commit({ ...doc, periods: [...doc.periods, period].sort((a, b) => a.start.localeCompare(b.start)) })}
        />

        <NextPeriod estimate={estimate} />

        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl tracking-tight">Your periods</h2>
            {doc.periods.length > 0 ? <p className="text-sm text-muted">{plural(doc.periods.length, "period")} logged</p> : null}
          </div>
          {doc.periods.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-card p-4 text-sm text-pretty text-muted shadow-line">
              Nothing logged yet. Log your last period above and it will show up here, with space for notes.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {[...doc.periods].reverse().map((period, index) => (
                <PeriodCard
                  key={period.id}
                  period={period}
                  today={today}
                  defaultOpen={index === 0}
                  periods={doc.periods}
                  onChange={(change) => updatePeriod(period.id, change)}
                  onDelete={() => commit({ ...doc, periods: doc.periods.filter((item) => item.id !== period.id) })}
                />
              ))}
            </ul>
          )}
        </section>

        <details className="mt-8 rounded-2xl bg-card p-4 shadow-line">
          <summary className="cursor-pointer text-sm font-medium">Settings</summary>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-muted">Usual days from one period to the next</span>
            <input
              className={cn(fieldClass, "w-28")}
              type="number"
              min={15}
              max={60}
              value={doc.cycleLength}
              onChange={(event) => commit({ ...doc, cycleLength: clamp(Number(event.target.value), 15, 60, 28) })}
            />
          </label>
          <p className="mt-2 text-sm text-pretty text-muted">
            Used until you have logged two periods. After that, Cycle uses your own average.
          </p>
        </details>

        <p className="mt-6 max-w-2xl text-sm text-pretty text-muted">
          Your periods and notes are saved on your account. Dates are estimates, not medical advice, and not a form of birth
          control.
        </p>
      </ToolStatus>
    </ToolFrame>
  );
}

function NextPeriod({ estimate }: { estimate: ReturnType<typeof predict> }) {
  if (!estimate.next) {
    return (
      <section className="mt-6 rounded-3xl bg-card p-5 shadow-line">
        <p className="text-sm text-muted">Next period</p>
        <p className="mt-1 font-display text-2xl tracking-tight text-balance">
          Log when your last period started, and your next date will show here.
        </p>
      </section>
    );
  }
  const { daysUntil } = estimate;
  const when =
    daysUntil > 1
      ? `in ${daysUntil} days`
      : daysUntil === 1
        ? "tomorrow"
        : daysUntil === 0
          ? "today"
          : `${plural(-daysUntil, "day")} late`;
  return (
    <section className="mt-6 rounded-3xl bg-pine p-5 text-paper">
      <p className="text-sm opacity-80">Your next period should start</p>
      <p className="mt-1 font-display text-3xl tracking-tight text-balance sm:text-4xl">{prettyLong(estimate.next)}</p>
      <p className="mt-2 text-lg font-medium">{when}</p>
      <p className="mt-3 text-sm text-pretty opacity-80">
        Your last period started {prettyLong(estimate.last)}. Counted with a {estimate.cycle}-day cycle
        {estimate.fromLogs ? ", the average of the periods you logged." : ", your usual length. Log one more period to use your own average."}
      </p>
    </section>
  );
}

function LogForm({ today, periods, onLog }: { today: string; periods: Period[]; onLog: (period: Period) => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!ISO.test(start)) return setError("Pick the day your period started.");
    if (start > today) return setError("The start day can't be in the future.");
    if (end && end < start) return setError("The last day can't be before the first day.");
    const clash = overlaps(periods, start, end);
    if (clash) return setError(`That overlaps the period that started ${pretty(clash.start)}.`);
    const written = today;
    onLog({
      id: newId(),
      start,
      end: end && ISO.test(end) ? end : "",
      notes: note.trim() ? [{ id: newId(), body: note.slice(0, 2000), written }] : [],
    });
    setStart("");
    setEnd("");
    setNote("");
    setError("");
  }

  return (
    <section className="rounded-3xl bg-card p-5 shadow-line">
      <h2 className="font-display text-2xl tracking-tight">Log a period</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">First day</span>
          <input
            className={fieldClass}
            type="date"
            max={today}
            value={start}
            onChange={(event) => {
              setStart(event.target.value);
              setError("");
            }}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">
            Last day <span className="font-normal text-muted">(leave empty if it hasn't ended)</span>
          </span>
          <input
            className={fieldClass}
            type="date"
            min={start || undefined}
            value={end}
            onChange={(event) => {
              setEnd(event.target.value);
              setError("");
            }}
          />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium">
          Note <span className="font-normal text-muted">(optional)</span>
        </span>
        <TextArea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 2000))}
          placeholder="Cramps, flow, mood, anything you want to remember"
          rows={3}
          className="min-h-20"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button tone="primary" className="mt-4 w-full sm:w-auto" onClick={submit} disabled={!start}>
        Log period
      </Button>
    </section>
  );
}

function PeriodCard({
  period,
  today,
  defaultOpen,
  periods,
  onChange,
  onDelete,
}: {
  period: Period;
  today: string;
  defaultOpen: boolean;
  periods: Period[];
  onChange: (change: (period: Period) => Period) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [endError, setEndError] = useState("");
  const length = period.end ? diffDays(period.start, period.end) + 1 : 0;
  const notes = [...period.notes].reverse();

  function saveEnd() {
    if (!ISO.test(endDraft)) return;
    if (endDraft < period.start) return setEndError("The last day can't be before the first day.");
    const clash = overlaps(periods, period.start, endDraft, period.id);
    if (clash) return setEndError(`That overlaps the period that started ${pretty(clash.start)}.`);
    onChange((current) => ({ ...current, end: endDraft }));
    setEndDraft("");
    setEndError("");
  }

  function addNote() {
    if (!draft.trim()) return;
    onChange((current) => ({ ...current, notes: [...current.notes, { id: newId(), body: draft.slice(0, 2000), written: today }] }));
    setDraft("");
  }

  return (
    <li className="rounded-2xl bg-card shadow-line">
      <div className="flex items-start justify-between gap-3 p-4">
        <button type="button" className="min-w-0 flex-1 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
          <p className="font-medium">
            {pretty(period.start)}
            {period.end && period.end !== period.start ? ` – ${pretty(period.end)}` : ""}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {period.end ? plural(length, "day") : "Still going"} · {plural(period.notes.length, "note")}
            <span aria-hidden className="ml-1">
              {open ? "▴" : "▾"}
            </span>
          </p>
        </button>
        <ConfirmDelete label="Delete period" question="Delete this period and its notes?" onConfirm={onDelete} />
      </div>

      {open ? (
        <div className="border-t border-line px-4 pt-3 pb-4">
          {!period.end ? (
            <div className="mb-4 flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Ended on</span>
                <input
                  className={fieldClass}
                  type="date"
                  min={period.start}
                  value={endDraft}
                  onChange={(event) => {
                    setEndDraft(event.target.value);
                    setEndError("");
                  }}
                />
              </label>
              <Button tone="quiet" onClick={saveEnd} disabled={!endDraft}>
                Save last day
              </Button>
              {endError ? (
                <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">
                  {endError}
                </p>
              ) : null}
            </div>
          ) : null}

          <TextArea
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
            placeholder="Write a note about this period"
            rows={2}
            className="min-h-16"
          />
          <Button tone="primary" className="mt-2" onClick={addNote} disabled={!draft.trim()}>
            Add note
          </Button>

          {notes.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {notes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  onSave={(body) =>
                    onChange((current) => ({
                      ...current,
                      notes: current.notes.map((item) => (item.id === note.id ? { ...item, body } : item)),
                    }))
                  }
                  onDelete={() => onChange((current) => ({ ...current, notes: current.notes.filter((item) => item.id !== note.id) }))}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function NoteItem({ note, onSave, onDelete }: { note: Note; onSave: (body: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);

  if (editing) {
    return (
      <li className="rounded-xl bg-paper-2 p-3">
        <TextArea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} rows={3} className="min-h-20" autoFocus />
        <div className="mt-2 flex gap-2">
          <Button
            tone="primary"
            disabled={!draft.trim()}
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button
            tone="quiet"
            onClick={() => {
              setDraft(note.body);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-paper-2 p-3">
      <p className="text-sm whitespace-pre-wrap text-pretty">{note.body}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">Written {pretty(note.written)}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="min-h-9 rounded-full px-3 text-sm text-muted hover:bg-card"
            onClick={() => {
              setDraft(note.body);
              setEditing(true);
            }}
          >
            Edit
          </button>
          <ConfirmDelete label="Delete" question="Delete note?" onConfirm={onDelete} />
        </div>
      </div>
    </li>
  );
}

function ConfirmDelete({ label, question, onConfirm }: { label: string; question: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        className="min-h-9 shrink-0 rounded-full px-3 text-sm text-red-700 hover:bg-paper-2 dark:text-red-400"
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 text-sm" role="group" aria-label={question}>
      <span className="text-muted">{question}</span>
      <button type="button" className="min-h-9 rounded-full bg-red-700 px-3 font-medium text-white" onClick={onConfirm}>
        Delete
      </button>
      <button type="button" className="min-h-9 rounded-full px-3 hover:bg-paper-2" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </div>
  );
}
