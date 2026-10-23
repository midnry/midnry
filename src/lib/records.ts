/**
 * Small helpers for the record apps (Bills, Visits, Shifts): readable dates,
 * clock times, shift hours, and the plain-words line "Add to Remind" types
 * into Remind's add box (Remind's own parser, src/lib/remind/parse.ts, reads it).
 * Rows are saved as strings; old rows may hold free text, so every helper
 * accepts anything and falls back quietly.
 */
import { parseNumberInput } from "@/lib/number-input";

export type RecordRow = Record<string, string | undefined>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-25" → "25 Nov 2026". Anything that is not a real ISO date gives "". */
export function prettyDay(value: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim());
  if (!match) return "";
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Minutes after midnight from "07:00", "7", "7am", "7:30 pm", "19.30". Null when it can't be read. */
export function parseClock(value: string | undefined): number | null {
  const match = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i.exec((value ?? "").trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase().replace(/\./g, "");
  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (meridiem === "pm") hour += 12;
  } else if (hour > 23) return null;
  return hour * 60 + minute;
}

/** "07:00" → "7am", "19:30" → "7:30pm", "00:00" → "12am". "" when it can't be read. */
export function clockWords(value: string | undefined): string {
  const minutes = parseClock(value);
  if (minutes == null) return "";
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${hour < 12 ? "am" : "pm"}`;
}

/** Hours between a start and an end time. An end at or before the start runs past midnight (a night shift). */
export function shiftHours(start: string | undefined, end: string | undefined): number | null {
  const from = parseClock(start);
  const to = parseClock(end);
  if (from == null || to == null) return null;
  // Start = end is an empty shift (0 h), not a 24-hour one; an end before the start is a night shift.
  const minutes = to >= from ? to - from : to + 24 * 60 - from;
  return Math.round((minutes / 60) * 100) / 100;
}

/** 12 → "12 h", 7.5 → "7.5 h", 8.25 → "8.25 h". */
export function hoursLabel(hours: number): string {
  return `${Math.round(hours * 100) / 100} h`;
}

/** Monday to Sunday of the week holding `today` (ISO dates). */
export function weekOf(today: string): { from: string; to: string } {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const back = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date.getTime() - back * 86_400_000);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

/** Total hours, and hours in the week of `today`, for a list of shift rows. Rows without readable times count as 0. */
export function shiftTotals(rows: readonly RecordRow[], today: string): { total: number; week: number; counted: number } {
  const { from, to } = weekOf(today);
  let total = 0;
  let week = 0;
  let counted = 0;
  for (const row of rows) {
    const hours = shiftHours(row.start, row.end);
    if (hours == null) continue;
    counted += 1;
    total += hours;
    const date = (row.date ?? "").trim();
    if (prettyDay(date) && date >= from && date <= to) week += hours;
  }
  return { total: Math.round(total * 100) / 100, week: Math.round(week * 100) / 100, counted };
}

/** Apps that offer "Add to Remind" on each row. */
export const REMIND_APPS = ["bill-watch", "visits", "shifts"] as const;

/** Keep Remind's own markers (#project, @label) out of copied text. */
function plain(value: string | undefined): string {
  return (value ?? "").replace(/[#@]/g, " ").replace(/\s+/g, " ").trim();
}

function dayOfMonth(value: string): number | null {
  const match = /^(\d{1,2})(?:st|nd|rd|th)?$/i.exec(value.trim());
  const day = match ? Number(match[1]) : NaN;
  return day >= 1 && day <= 31 ? day : null;
}

function ordinal(day: number): string {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  return `${day}${["th", "st", "nd", "rd"][day % 10] ?? "th"}`;
}

function amountText(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  // Read with the shared number format: "12,000" and "₦12,000" are 12,000;
  // "7,5" is not a number and is copied as typed.
  const parsed = parseNumberInput(raw);
  return parsed.ok ? parsed.value.toLocaleString("en", { maximumFractionDigits: 2 }) : plain(raw);
}

/**
 * The line "Add to Remind" puts in Remind's add box, in Remind's plain-words
 * style. The person reads it and presses Add; nothing is created for them.
 *  Bills:  "Pay Electricity bill (12,000) on 25 Nov 2026" (an old "1st" → "every 1st")
 *  Visits: "Visit Dr Bello at General Hospital on 24 Oct 2026 at 10am"
 *  Shifts: "Shift at Ward 3 on 24 Oct 2026 at 7am until 7pm"
 */
export function remindText(slug: string, row: RecordRow): string {
  if (slug === "bill-watch") {
    const name = plain(row.name);
    const what = !name ? "Pay a bill" : /\bbill\b/i.test(name) ? `Pay ${name}` : `Pay ${name} bill`;
    const amount = amountText(row.amount);
    const day = prettyDay(row.dueOn);
    const old = plain(row.due);
    const monthDay = old ? dayOfMonth(old) : null;
    const when = day ? ` on ${day}` : monthDay ? ` every ${ordinal(monthDay)}` : old ? ` ${old}` : "";
    return `${what}${amount ? ` (${amount})` : ""}${when}`;
  }
  if (slug === "visits") {
    const who = plain(row.who);
    const where = plain(row.where);
    const what = who ? `Visit ${who}${where ? ` at ${where}` : ""}` : where ? `Visit ${where}` : "Visit";
    const day = prettyDay(row.date);
    const time = clockWords(row.time);
    const old = plain(row.when);
    const when = day ? ` on ${day}${time ? ` at ${time}` : ""}` : time ? ` at ${time}${old ? ` ${old}` : ""}` : old ? ` ${old}` : "";
    return `${what}${when}`;
  }
  if (slug === "shifts") {
    const where = plain(row.where);
    const day = prettyDay(row.date);
    const date = day ? ` on ${day}` : plain(row.date) ? ` ${plain(row.date)}` : "";
    const start = clockWords(row.start);
    const end = clockWords(row.end);
    return `Shift${where ? ` at ${where}` : ""}${date}${start ? ` at ${start}` : ""}${start && end ? ` until ${end}` : ""}`;
  }
  return "";
}
