import { addDays, addMonths, isIsoDate, parseIso, weekdayOf } from "./dates.ts";

// A repeat rule stored as a short string so old Tasks data keeps working:
//   "none" | "day" | "week" | "month" | "year"   (every 1 of each)
//   "every:N:d|w|m|y"                             (every N days/weeks/months/years)
//   "weekdays"                                    (Monday to Friday)
//   "on:1,4"                                      (these weekdays, 1 = Monday … 7 = Sunday)
//   "monthday:15"                                 (this day of every month)
export type Recur = string;

type Unit = "d" | "w" | "m" | "y";
type Rule =
  | { kind: "none" }
  | { kind: "every"; n: number; unit: Unit }
  | { kind: "weekdays" }
  | { kind: "on"; days: number[] }
  | { kind: "monthday"; day: number };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const UNIT_NAMES: Record<Unit, [string, string]> = {
  d: ["day", "days"],
  w: ["week", "weeks"],
  m: ["month", "months"],
  y: ["year", "years"],
};

export function parseRule(spec: unknown): Rule {
  if (typeof spec !== "string") return { kind: "none" };
  if (spec === "day") return { kind: "every", n: 1, unit: "d" };
  if (spec === "week") return { kind: "every", n: 1, unit: "w" };
  if (spec === "month") return { kind: "every", n: 1, unit: "m" };
  if (spec === "year") return { kind: "every", n: 1, unit: "y" };
  if (spec === "weekdays") return { kind: "weekdays" };
  let match = /^every:(\d{1,3}):([dwmy])$/.exec(spec);
  if (match) {
    const n = Number(match[1]);
    if (n >= 1 && n <= 365) return { kind: "every", n, unit: match[2] as Unit };
  }
  match = /^on:([1-7](?:,[1-7]){0,6})$/.exec(spec);
  if (match) {
    const days = [...new Set(match[1].split(",").map(Number))].sort();
    return { kind: "on", days };
  }
  match = /^monthday:(\d{1,2})$/.exec(spec);
  if (match) {
    const day = Number(match[1]);
    if (day >= 1 && day <= 31) return { kind: "monthday", day };
  }
  return { kind: "none" };
}

/** A clean, canonical spec ("none" for anything unknown). */
export function cleanRecur(spec: unknown): Recur {
  const rule = parseRule(spec);
  switch (rule.kind) {
    case "none":
      return "none";
    case "weekdays":
      return "weekdays";
    case "on":
      return `on:${rule.days.join(",")}`;
    case "monthday":
      return `monthday:${rule.day}`;
    case "every":
      if (rule.n === 1) return { d: "day", w: "week", m: "month", y: "year" }[rule.unit];
      return `every:${rule.n}:${rule.unit}`;
  }
}

export function recurLabel(spec: Recur): string {
  const rule = parseRule(spec);
  switch (rule.kind) {
    case "none":
      return "Does not repeat";
    case "weekdays":
      return "Every weekday";
    case "on":
      if (rule.days.length === 7) return "Every day";
      return `Every ${rule.days.map((day) => DAY_NAMES[day - 1]).join(" and ")}`;
    case "monthday":
      return `Every month on the ${ordinal(rule.day)}`;
    case "every": {
      const [one, many] = UNIT_NAMES[rule.unit];
      return rule.n === 1 ? `Every ${one}` : `Every ${rule.n} ${many}`;
    }
  }
}

function ordinal(n: number): string {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function monthdayIn(yearMonth: string, day: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${yearMonth}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

function step(iso: string, n: number, unit: Unit): string {
  if (unit === "d") return addDays(iso, n);
  if (unit === "w") return addDays(iso, 7 * n);
  if (unit === "m") return addMonths(iso, n);
  return addMonths(iso, 12 * n);
}

/** The first date on or after `from` that the rule lands on. */
export function firstOnOrAfter(spec: Recur, from: string): string {
  const rule = parseRule(spec);
  if (rule.kind === "weekdays") {
    let cursor = from;
    while (weekdayOf(cursor) > 5) cursor = addDays(cursor, 1);
    return cursor;
  }
  if (rule.kind === "on") {
    let cursor = from;
    for (let i = 0; i < 7 && !rule.days.includes(weekdayOf(cursor)); i += 1) cursor = addDays(cursor, 1);
    return cursor;
  }
  if (rule.kind === "monthday") {
    const here = monthdayIn(from.slice(0, 7), rule.day);
    return here >= from ? here : monthdayIn(addMonths(`${from.slice(0, 7)}-01`, 1).slice(0, 7), rule.day);
  }
  return from;
}

/**
 * The next due date after completing a repeating task: strictly after `today`
 * and after the current due date. Interval rules keep their anchor (a task due
 * every 2 weeks from a Monday stays on Mondays).
 */
export function nextDue(due: string, spec: Recur, today: string): string {
  const rule = parseRule(spec);
  const base = isIsoDate(due) ? due : today;
  if (rule.kind === "none") return base;
  if (rule.kind === "every") {
    let cursor = base;
    for (let i = 0; i < 2000; i += 1) {
      cursor = step(cursor, rule.n, rule.unit);
      if (cursor > today) return cursor;
    }
    return cursor;
  }
  const after = base > today ? base : today;
  return firstOnOrAfter(spec, addDays(after, 1));
}

/** All due dates of a repeating task between `from` and `to` (inclusive). */
export function occurrences(due: string, spec: Recur, from: string, to: string, limit = 60): string[] {
  const out: string[] = [];
  if (!isIsoDate(due)) return out;
  if (parseRule(spec).kind === "none") return due >= from && due <= to ? [due] : out;
  let cursor = due;
  for (let i = 0; i < 2000 && cursor <= to && out.length < limit; i += 1) {
    if (cursor >= from) out.push(cursor);
    cursor = nextDue(cursor, spec, cursor);
  }
  return out;
}

/** An iCalendar RRULE for the rule, or "" when it does not repeat. */
export function toRRule(spec: Recur, due: string): string {
  const rule = parseRule(spec);
  const codes = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  switch (rule.kind) {
    case "none":
      return "";
    case "weekdays":
      return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
    case "on":
      return `FREQ=WEEKLY;BYDAY=${rule.days.map((day) => codes[day - 1]).join(",")}`;
    case "monthday":
      return `FREQ=MONTHLY;BYMONTHDAY=${rule.day}`;
    case "every": {
      const freq = { d: "DAILY", w: "WEEKLY", m: "MONTHLY", y: "YEARLY" }[rule.unit];
      const anchor = rule.unit === "m" && isIsoDate(due) ? `;BYMONTHDAY=${parseIso(due).getDate()}` : "";
      return `FREQ=${freq}${rule.n > 1 ? `;INTERVAL=${rule.n}` : ""}${anchor}`;
    }
  }
}

export const RECUR_PRESETS: { spec: Recur; label: string }[] = [
  { spec: "none", label: "Does not repeat" },
  { spec: "day", label: "Every day" },
  { spec: "weekdays", label: "Every weekday" },
  { spec: "week", label: "Every week" },
  { spec: "every:2:w", label: "Every 2 weeks" },
  { spec: "month", label: "Every month" },
  { spec: "year", label: "Every year" },
];
