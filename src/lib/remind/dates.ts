// Local calendar dates as "YYYY-MM-DD". No time zones: a date is the day the
// person sees on their own device.

export function isoOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return isoOf(date);
}

export function addMonths(iso: string, months: number): string {
  const date = parseIso(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, last));
  return isoOf(date);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function weekdayOf(iso: string): number {
  const day = parseIso(iso).getDay();
  return day === 0 ? 7 : day;
}

/** The Monday that starts the week containing `iso`. */
export function weekStart(iso: string): string {
  return addDays(iso, 1 - weekdayOf(iso));
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseIso(value).getTime());
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function prettyTime(time: string): string {
  if (!isTime(time)) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

export function prettyDate(iso: string, today: string): string {
  if (!iso) return "";
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  const date = parseIso(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  if (iso > today && iso <= addDays(today, 6)) return date.toLocaleDateString("en", { weekday: "long" });
  return date.toLocaleDateString("en", sameYear ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}
