import { addDays } from "@/lib/remind/dates";

/**
 * Medicines: a list, plus a dated "taken" tick for each medicine.
 *
 * Saved shape (app document "meds"):
 *   rows:  [{ name, when, id? }]            — the list (as the old tracker saved it)
 *   taken: { "2026-10-21": { [id]: { name, at } } }
 *
 * Rows saved by the old generic tracker have no id. They get one from their
 * position ("legacy-0", …) until the next save, which stores it, so ticks
 * stay attached to the right medicine. Every other field is kept as saved.
 */

export type MedRow = { id: string; name: string; when: string } & Record<string, string>;
export type Tick = { name: string; at: string };
export type TakenLog = Record<string, Record<string, Tick>>;
export type MedsDoc = { rows: MedRow[]; taken: TakenLog };

/** Ticks older than this many days are cleared when the list is saved. */
export const KEEP_DAYS = 90;
/** Days shown in the history. */
export const HISTORY_DAYS = 30;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function asRows(value: unknown): MedRow[] {
  if (!Array.isArray(value)) return [];
  const rows: MedRow[] = [];
  value.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return;
    const raw = row as Record<string, unknown>;
    const clean: Record<string, string> = {};
    for (const [key, item] of Object.entries(raw)) if (typeof item === "string") clean[key] = item;
    rows.push({ ...clean, id: clean.id || `legacy-${index}`, name: clean.name ?? "", when: clean.when ?? "" });
  });
  return rows;
}

export function asTaken(value: unknown): TakenLog {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const log: TakenLog = {};
  for (const [day, ticks] of Object.entries(value as Record<string, unknown>)) {
    if (!ISO_DAY.test(day) || !ticks || typeof ticks !== "object") continue;
    const clean: Record<string, Tick> = {};
    for (const [id, tick] of Object.entries(ticks as Record<string, unknown>)) {
      const t = tick as Partial<Tick> | null;
      if (t && typeof t.name === "string" && typeof t.at === "string") clean[id] = { name: t.name, at: t.at };
    }
    if (Object.keys(clean).length) log[day] = clean;
  }
  return log;
}

export function asMedsDoc(value: { rows?: unknown; taken?: unknown }): MedsDoc {
  return { rows: asRows(value.rows), taken: asTaken(value.taken) };
}

/** Drop days older than KEEP_DAYS before `today`. */
export function prune(taken: TakenLog, today: string): TakenLog {
  const oldest = addDays(today, -(KEEP_DAYS - 1));
  return Object.fromEntries(Object.entries(taken).filter(([day]) => day >= oldest));
}

export function isTaken(doc: MedsDoc, id: string, day: string): Tick | null {
  return doc.taken[day]?.[id] ?? null;
}

/** Tick a medicine as taken on `day`, or un-tick it if it already is. */
export function toggleTaken(doc: MedsDoc, row: MedRow, day: string, time: string): MedsDoc {
  const dayLog = { ...(doc.taken[day] ?? {}) };
  if (dayLog[row.id]) delete dayLog[row.id];
  else dayLog[row.id] = { name: row.name, at: time };
  const taken = { ...doc.taken };
  if (Object.keys(dayLog).length) taken[day] = dayLog;
  else delete taken[day];
  return { rows: doc.rows, taken: prune(taken, day) };
}

export type HistoryDay = { day: string; ticks: Tick[] };

/** The last `days` days, newest first, each with what was ticked (by time). */
export function history(doc: MedsDoc, today: string, days = HISTORY_DAYS): HistoryDay[] {
  const out: HistoryDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDays(today, -i);
    const ticks = Object.values(doc.taken[day] ?? {}).sort((a, b) => a.at.localeCompare(b.at));
    out.push({ day, ticks });
  }
  return out;
}
