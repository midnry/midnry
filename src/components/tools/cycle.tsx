import { useMemo, useState } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea, cn, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";

type Flow = "" | "spotting" | "light" | "medium" | "heavy";
type Discharge = "" | "dry" | "sticky" | "creamy" | "watery" | "egg";
type Sex = "" | "protected" | "unprotected";
type DayLog = {
  date: string;
  flow: Flow;
  symptoms: string[];
  moods: string[];
  discharge: Discharge;
  sex: Sex;
  pill: boolean;
  notes: string;
};
type Doc = { cycleLength: number; periodLength: number; logs: DayLog[] };

const FLOWS: { id: Flow; label: string }[] = [
  { id: "", label: "No flow" },
  { id: "spotting", label: "Spotting" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "heavy", label: "Heavy" },
];
const SYMPTOMS = ["Cramps", "Headache", "Backache", "Bloating", "Tender breasts", "Acne", "Fatigue", "Nausea", "Cravings", "Insomnia"];
const MOODS = ["Calm", "Happy", "Sad", "Anxious", "Irritable", "Sensitive", "Energetic"];
const DISCHARGE: { id: Discharge; label: string }[] = [
  { id: "", label: "None" },
  { id: "dry", label: "Dry" },
  { id: "sticky", label: "Sticky" },
  { id: "creamy", label: "Creamy" },
  { id: "watery", label: "Watery" },
  { id: "egg", label: "Egg white" },
];
const SEX: { id: Sex; label: string }[] = [
  { id: "", label: "Not logged" },
  { id: "protected", label: "Protected" },
  { id: "unprotected", label: "Unprotected" },
];
const FALLBACK: Doc = { cycleLength: 28, periodLength: 5, logs: [] };

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
function pretty(iso: string): string {
  return parseIso(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}
function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}
function isFlow(value: unknown): value is Flow {
  return value === "" || value === "spotting" || value === "light" || value === "medium" || value === "heavy";
}
function isDischarge(value: unknown): value is Discharge {
  return value === "" || value === "dry" || value === "sticky" || value === "creamy" || value === "watery" || value === "egg";
}
function isSex(value: unknown): value is Sex {
  return value === "" || value === "protected" || value === "unprotected";
}

function asDoc(raw: Doc): Doc {
  const logs = Array.isArray(raw.logs)
    ? raw.logs
        .map((item) => {
          const date = typeof item?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : "";
          const symptoms = Array.isArray(item?.symptoms)
            ? item.symptoms.filter((name): name is string => SYMPTOMS.includes(String(name))).slice(0, 10)
            : [];
          const moods = Array.isArray(item?.moods)
            ? item.moods.filter((name): name is string => MOODS.includes(String(name))).slice(0, 8)
            : [];
          return {
            date,
            flow: isFlow(item?.flow) ? item.flow : "",
            symptoms,
            moods,
            discharge: isDischarge(item?.discharge) ? item.discharge : "",
            sex: isSex(item?.sex) ? item.sex : "",
            pill: Boolean(item?.pill),
            notes: typeof item?.notes === "string" ? item.notes.slice(0, 240) : "",
          };
        })
        .filter((item) => item.date)
        .slice(-500)
    : [];
  return {
    cycleLength: clamp(raw.cycleLength, 15, 60, 28),
    periodLength: clamp(raw.periodLength, 1, 12, 5),
    logs,
  };
}

function periodDays(logs: DayLog[]): Set<string> {
  return new Set(logs.filter((log) => log.flow).map((log) => log.date));
}

function periodStarts(days: Set<string>): string[] {
  return [...days].filter((day) => !days.has(addDays(day, -1))).sort();
}

function average(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  return clamp(values.reduce((sum, value) => sum + value, 0) / values.length, 1, 90, fallback);
}

function predict(doc: Doc, today: string) {
  const days = periodDays(doc.logs);
  const starts = periodStarts(days);
  const gaps = starts
    .slice(1)
    .map((start, index) => diffDays(starts[index], start))
    .filter((gap) => gap >= 15 && gap <= 60);
  const lengths = starts.map((start) => {
    let count = 0;
    let cursor = start;
    while (days.has(cursor) && count < 14) {
      count += 1;
      cursor = addDays(cursor, 1);
    }
    return count;
  });
  const cycle = average(gaps, doc.cycleLength);
  const period = average(lengths.filter((length) => length > 0), doc.periodLength);
  const last = [...starts].reverse().find((start) => start <= today) ?? starts[starts.length - 1] ?? "";
  const next = last ? addDays(last, cycle) : "";
  const ovulation = next ? addDays(next, -14) : "";
  const fertileStart = ovulation ? addDays(ovulation, -5) : "";
  const fertileEnd = ovulation ? addDays(ovulation, 1) : "";
  const cycleDay = last && today >= last ? diffDays(last, today) + 1 : 0;
  const late = Boolean(next && today > next && !days.has(today));
  return { cycle, period, last, next, ovulation, fertileStart, fertileEnd, cycleDay, late, logged: starts.length };
}

export function CycleTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("cycle", FALLBACK);
  const doc = asDoc(data);
  const today = isoOf(new Date());
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [seed, setSeed] = useState("");
  const estimate = useMemo(() => predict(doc, today), [doc, today]);
  const byDate = new Map(doc.logs.map((log) => [log.date, log]));
  const active = byDate.get(selected);

  function commit(next: Doc) {
    setData(next);
  }

  function write(date: string, change: Partial<DayLog>) {
    const current = byDate.get(date) ?? {
      date,
      flow: "" as Flow,
      symptoms: [],
      moods: [],
      discharge: "" as Discharge,
      sex: "" as Sex,
      pill: false,
      notes: "",
    };
    const log = { ...current, ...change, date };
    const empty = !log.flow && log.symptoms.length === 0 && log.moods.length === 0 && !log.discharge && !log.sex && !log.pill && !log.notes.trim();
    commit({
      ...doc,
      logs: empty ? doc.logs.filter((item) => item.date !== date) : [...doc.logs.filter((item) => item.date !== date), log],
    });
  }

  function seedPeriod() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(seed)) return;
    const next = { ...doc, logs: [...doc.logs] };
    for (let i = 0; i < doc.periodLength; i += 1) {
      const date = addDays(seed, i);
      if (next.logs.some((log) => log.date === date && log.flow)) continue;
      const existing = next.logs.find((log) => log.date === date);
      const log: DayLog = existing
        ? { ...existing, flow: existing.flow || "medium" }
        : { date, flow: "medium", symptoms: [], moods: [], discharge: "", sex: "", pill: false, notes: "" };
      next.logs = [...next.logs.filter((item) => item.date !== date), log];
    }
    commit(next);
    setSelected(seed);
    setCursor(seed.slice(0, 7));
    setSeed("");
  }

  const [year, month] = cursor.split("-").map(Number);
  const first = new Date(year, (month || 1) - 1, 1);
  const start = new Date(first);
  const weekday = start.getDay();
  start.setDate(1 - (weekday === 0 ? 6 : weekday - 1));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return isoOf(date);
  });
  const periodSet = periodDays(doc.logs);

  return (
    <ToolFrame slug="cycle" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <p className="max-w-2xl text-sm text-pretty text-muted">
          Estimates come from your logs. They are not medical advice, and not a form of birth control.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Cycle day" value={estimate.cycleDay ? String(estimate.cycleDay) : "—"} />
          <Stat
            label={estimate.late ? "Period late" : "Next period"}
            value={estimate.next ? (estimate.late ? `${diffDays(estimate.next, today)} days` : pretty(estimate.next)) : "Log a period"}
          />
          <Stat label="Ovulation" value={estimate.ovulation ? pretty(estimate.ovulation) : "—"} />
          <Stat
            label="Fertile window"
            value={estimate.fertileStart ? `${pretty(estimate.fertileStart)} – ${pretty(estimate.fertileEnd)}` : "—"}
          />
        </dl>
        <p className="mt-3 text-sm text-muted">
          Average cycle {estimate.cycle} days · average period {estimate.period} days
          {estimate.logged < 2 ? " · using your typical lengths until two cycles are logged" : ""}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Last period started</span>
            <input className={fieldClass} type="date" value={seed} onChange={(event) => setSeed(event.target.value)} />
          </label>
          <Button tone="primary" onClick={seedPeriod} disabled={!seed}>
            Mark those days
          </Button>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Typical cycle</span>
            <input
              className={cn(fieldClass, "w-24")}
              type="number"
              min={15}
              max={60}
              value={doc.cycleLength}
              onChange={(event) => commit({ ...doc, cycleLength: clamp(Number(event.target.value), 15, 60, 28) })}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Typical period</span>
            <input
              className={cn(fieldClass, "w-24")}
              type="number"
              min={1}
              max={12}
              value={doc.periodLength}
              onChange={(event) => commit({ ...doc, periodLength: clamp(Number(event.target.value), 1, 12, 5) })}
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button tone="quiet" onClick={() => setCursor(shiftMonth(cursor, -1))}>
            Previous
          </Button>
          <p className="font-medium">{first.toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
          <Button tone="quiet" onClick={() => setCursor(shiftMonth(cursor, 1))}>
            Next
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-xs text-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="px-1">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((iso) => {
            const inMonth = iso.slice(0, 7) === cursor;
            const logged = periodSet.has(iso);
            const predicted =
              estimate.next &&
              iso >= estimate.next &&
              iso < addDays(estimate.next, estimate.period) &&
              !logged;
            const fertile = estimate.fertileStart && iso >= estimate.fertileStart && iso <= estimate.fertileEnd;
            const ovulation = iso === estimate.ovulation;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={cn(
                  "min-h-12 rounded-xl px-1 py-1 text-left text-sm",
                  logged && "bg-pine text-paper",
                  predicted && !logged && "bg-pine/15",
                  fertile && !logged && !predicted && "bg-paper-2",
                  selected === iso && "ring-2 ring-pine",
                  !inMonth && "opacity-40",
                )}
              >
                <span className="block text-xs">{Number(iso.slice(8))}</span>
                {ovulation ? <span className="text-[10px]">ovulation</span> : null}
                {iso === today ? <span className="block text-[10px]">today</span> : null}
              </button>
            );
          })}
        </div>

        <section className="mt-6 rounded-2xl bg-card p-4 shadow-line">
          <h2 className="font-medium">{pretty(selected)}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {FLOWS.map((flow) => (
              <Chip key={flow.label} on={(active?.flow ?? "") === flow.id} onClick={() => write(selected, { flow: flow.id })}>
                {flow.label}
              </Chip>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Symptoms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SYMPTOMS.map((name) => (
              <Chip
                key={name}
                on={Boolean(active?.symptoms.includes(name))}
                onClick={() =>
                  write(selected, {
                    symptoms: active?.symptoms.includes(name)
                      ? active.symptoms.filter((item) => item !== name)
                      : [...(active?.symptoms ?? []), name],
                  })
                }
              >
                {name}
              </Chip>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Mood</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOODS.map((name) => (
              <Chip
                key={name}
                on={Boolean(active?.moods.includes(name))}
                onClick={() =>
                  write(selected, {
                    moods: active?.moods.includes(name)
                      ? active.moods.filter((item) => item !== name)
                      : [...(active?.moods ?? []), name],
                  })
                }
              >
                {name}
              </Chip>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted">Discharge</span>
              <select
                className={fieldClass}
                value={active?.discharge ?? ""}
                onChange={(event) => write(selected, { discharge: event.target.value as Discharge })}
              >
                {DISCHARGE.map((item) => (
                  <option key={item.label} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Sex</span>
              <select className={fieldClass} value={active?.sex ?? ""} onChange={(event) => write(selected, { sex: event.target.value as Sex })}>
                {SEX.map((item) => (
                  <option key={item.label} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={Boolean(active?.pill)} onChange={(event) => write(selected, { pill: event.target.checked })} />
            Pill taken
          </label>
          <TextArea
            value={active?.notes ?? ""}
            onChange={(event) => write(selected, { notes: event.target.value.slice(0, 240) })}
            placeholder="Note"
            rows={3}
            className="mt-3 min-h-20"
          />
        </section>
      </ToolStatus>
    </ToolFrame>
  );
}

function shiftMonth(cursor: string, delta: number): string {
  const [year, month] = cursor.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-line">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("h-9 rounded-full px-3 text-sm", on ? "bg-pine text-paper" : "bg-card shadow-line")}>
      {children}
    </button>
  );
}
