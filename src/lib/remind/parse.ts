import { addDays, addMonths, isoOf, parseIso, weekdayOf } from "./dates.ts";
import { firstOnOrAfter, type Recur } from "./recur.ts";

// Turns "Call mum tomorrow at 6pm p1 @home #Family every week" into a task.
// Recognised pieces are removed from the title; anything unrecognised stays.

export type Parsed = {
  title: string;
  due: string;
  time: string;
  priority: 1 | 2 | 3 | 4 | null;
  labels: string[];
  project: string;
  recur: Recur;
};

const WEEKDAYS: Record<string, number> = {
  mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6, sun: 7, sunday: 7,
};
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};
const DAY = "(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:s|nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)";
const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const UNIT: Record<string, "d" | "w" | "m" | "y"> = { day: "d", days: "d", week: "w", weeks: "w", month: "m", months: "m", year: "y", years: "y" };

function safeDate(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return isoOf(date);
}

/** The next date on or after today with this ISO weekday. */
function nextWeekday(today: string, weekday: number, skipToday = false): string {
  let cursor = skipToday ? addDays(today, 1) : today;
  while (weekdayOf(cursor) !== weekday) cursor = addDays(cursor, 1);
  return cursor;
}

function to24(hour: number, minute: number, meridiem: string | undefined): string {
  let h = hour;
  if (meridiem) {
    const pm = meridiem.toLowerCase().startsWith("p");
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  }
  if (h > 23 || minute > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseTask(input: string, today: string): Parsed {
  let text = ` ${input.replace(/\s+/g, " ").trim()} `;
  const out: Parsed = { title: "", due: "", time: "", priority: null, labels: [], project: "", recur: "none" };

  const take = (pattern: RegExp, handle: (match: RegExpExecArray) => boolean | void) => {
    const re = new RegExp(pattern.source, pattern.flags.includes("i") ? pattern.flags : `${pattern.flags}i`);
    const match = re.exec(text);
    if (!match) return false;
    if (handle(match) === false) return false;
    text = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
    return true;
  };

  // Priority: p1 … p4, or "!1" … "!4".
  take(/\s(?:p|!)([1-4])(?=\s)/, (m) => {
    out.priority = Number(m[1]) as 1 | 2 | 3 | 4;
  });

  // Labels: @home @urgent (several allowed).
  for (let i = 0; i < 8; i += 1) {
    if (
      !take(/\s@([\p{L}\p{N}_-]{1,32})(?=\s)/u, (m) => {
        if (!out.labels.some((label) => label.toLowerCase() === m[1].toLowerCase())) out.labels.push(m[1]);
      })
    )
      break;
  }

  // Project: #Work
  take(/\s#([\p{L}\p{N}_-]{1,60})(?=\s)/u, (m) => {
    out.project = m[1];
  });

  // Repeats.
  void (take(/\s(?:every\s+weekday|every\s+work\s?day|weekdays)(?=\s)/, () => {
    out.recur = "weekdays";
  }) ||
    take(new RegExp(`\\s(?:every|each)\\s+${DAY}(?:\\s*(?:,|and|&)\\s*${DAY})?(?:\\s*(?:,|and|&)\\s*${DAY})?(?=\\s)`, "i"), (m) => {
      const days = [m[1], m[2], m[3]].filter(Boolean).map((name) => WEEKDAYS[name.toLowerCase()]);
      out.recur = `on:${[...new Set(days)].sort().join(",")}`;
    }) ||
    take(/\s(?:every|each)\s+(\d{1,3})\s+(days?|weeks?|months?|years?)(?=\s)/, (m) => {
      const n = Number(m[1]);
      if (n < 1 || n > 365) return false;
      const unit = UNIT[m[2].toLowerCase()];
      out.recur = n === 1 ? { d: "day", w: "week", m: "month", y: "year" }[unit] : `every:${n}:${unit}`;
    }) ||
    take(/\s(?:every|each)\s+(\d{1,2})(?:st|nd|rd|th)(?:\s+of\s+the\s+month)?(?=\s)/, (m) => {
      const day = Number(m[1]);
      if (day < 1 || day > 31) return false;
      out.recur = `monthday:${day}`;
    }) ||
    take(/\s(?:every\s+day|daily|every\s+morning|every\s+night|every\s+evening)(?=\s)/, () => {
      out.recur = "day";
    }) ||
    take(/\s(?:every\s+week|weekly)(?=\s)/, () => {
      out.recur = "week";
    }) ||
    take(/\s(?:every\s+other\s+week|fortnightly|biweekly)(?=\s)/, () => {
      out.recur = "every:2:w";
    }) ||
    take(/\s(?:every\s+month|monthly)(?=\s)/, () => {
      out.recur = "month";
    }) ||
    take(/\s(?:every\s+year|yearly|annually)(?=\s)/, () => {
      out.recur = "year";
    }));

  // Times: "at 6pm", "6:30 pm", "18:00", "noon", "midnight".
  void (take(/\s(?:at\s+|@\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\s)/, (m) => {
    const time = to24(Number(m[1]), Number(m[2] ?? 0), m[3]);
    if (!time || Number(m[1]) > 12 || Number(m[1]) < 1) return false;
    out.time = time;
  }) ||
    take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (m) => {
      out.time = to24(Number(m[1]), Number(m[2]), undefined);
    }) ||
    take(/\s(?:at\s+)?noon(?=\s)/, () => {
      out.time = "12:00";
    }) ||
    take(/\s(?:at\s+)?midnight(?=\s)/, () => {
      out.time = "00:00";
    }));

  // Dates.
  const setDue = (iso: string) => {
    if (!iso) return false;
    out.due = iso;
    return true;
  };
  void (take(/\s(\d{4})-(\d{2})-(\d{2})(?=\s)/, (m) => setDue(safeDate(Number(m[1]), Number(m[2]), Number(m[3])))) ||
    take(new RegExp(`\\s(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}(?:\\s+(\\d{4}))?(?=\\s)`, "i"), (m) =>
      setDue(dateFor(today, Number(m[1]), MONTHS[m[2].toLowerCase()], m[3])),
    ) ||
    take(new RegExp(`\\s(?:on\\s+)?${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?=\\s)`, "i"), (m) =>
      setDue(dateFor(today, Number(m[2]), MONTHS[m[1].toLowerCase()], m[3])),
    ) ||
    // Day/month as written in Nigeria and the UK: 12/10 is 12 October.
    take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, (m) => {
      const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined;
      return setDue(dateFor(today, Number(m[1]), Number(m[2]), year === undefined ? undefined : String(year)));
    }) ||
    take(/\s(?:today|tod)(?=\s)/, () => setDue(today)) ||
    take(/\s(?:tonight|this\s+evening)(?=\s)/, () => {
      if (!out.time) out.time = "20:00";
      return setDue(today);
    }) ||
    take(/\s(?:day\s+after\s+tomorrow)(?=\s)/, () => setDue(addDays(today, 2))) ||
    take(/\s(?:tomorrow|tmrw?|tmr)(?=\s)/, () => setDue(addDays(today, 1))) ||
    take(/\s(?:in\s+)?(\d{1,3})\s+(days?|weeks?|months?)(?:\s+time)?(?=\s)/, (m) => {
      if (!/\sin\s/i.test(m[0]) && !/time/i.test(m[0])) return false;
      const n = Number(m[1]);
      const unit = m[2].toLowerCase();
      if (unit.startsWith("day")) return setDue(addDays(today, n));
      if (unit.startsWith("week")) return setDue(addDays(today, 7 * n));
      return setDue(addMonths(today, n));
    }) ||
    take(/\snext\s+week(?=\s)/, () => setDue(nextWeekday(today, 1, true))) ||
    take(/\snext\s+month(?=\s)/, () => setDue(`${addMonths(`${today.slice(0, 7)}-01`, 1)}`)) ||
    take(/\s(?:this\s+)?weekend(?=\s)/, () => setDue(nextWeekday(today, 6))) ||
    take(new RegExp(`\\s(next\\s+|this\\s+|on\\s+)?${DAY}(?=\\s)`, "i"), (m) => {
      const weekday = WEEKDAYS[m[2].toLowerCase()];
      return setDue(nextWeekday(today, weekday, m[1]?.trim().toLowerCase() === "next"));
    }));

  // Part-of-day words set a time when none was given.
  if (!out.time) {
    void (take(/\s(?:in\s+the\s+)?morning(?=\s)/, () => {
      out.time = "09:00";
    }) ||
      take(/\s(?:in\s+the\s+)?afternoon(?=\s)/, () => {
        out.time = "15:00";
      }) ||
      take(/\s(?:in\s+the\s+)?evening(?=\s)/, () => {
        out.time = "18:00";
      }));
  }

  if (out.recur !== "none" && !out.due) out.due = firstOnOrAfter(out.recur, today);
  else if (out.recur !== "none" && out.due) out.due = firstOnOrAfter(out.recur, out.due);
  if (out.time && !out.due) out.due = today;

  out.title = text.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim().replace(/^(?:on|at|by)\s+|\s+(?:on|at|by)$/gi, "").trim();
  return out;
}

/** Day + month (+ optional year). Without a year, the next time that date comes round. */
function dateFor(today: string, day: number, month: number, year?: string): string {
  if (!month) return "";
  if (year) return safeDate(Number(year), month, day);
  const thisYear = Number(today.slice(0, 4));
  const candidate = safeDate(thisYear, month, day);
  if (candidate && candidate >= today) return candidate;
  return safeDate(thisYear + 1, month, day);
}

/** Today in the browser's own time zone. */
export function localToday(): string {
  return isoOf(new Date());
}

export { parseIso };
