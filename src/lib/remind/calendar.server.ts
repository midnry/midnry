import { getSql } from "@/lib/db";
import { addDays } from "@/lib/remind/dates";
import { hasPassAccess, openDatedTasks } from "@/lib/remind/collect.server";
import type { Comment } from "@/lib/remind/model";
import { toRRule } from "@/lib/remind/recur";

type Event = { uid: string; title: string; notes: string; due: string; time: string; recur: string; where: string };

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded, as RFC 5545 asks. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

const compact = (iso: string) => iso.replace(/-/g, "");

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function lastComment(comments: Comment[]): string {
  const last = comments[comments.length - 1];
  return last ? `\n\nLatest comment from ${last.authorName}: ${last.body}` : "";
}

/** The iCalendar text for a feed token, or null when the link is not valid. */
export async function buildCalendar(token: string, origin: string): Promise<string | null> {
  const sql = await getSql();
  const feeds = await sql<{ user_id: string; tz: string }>`select user_id, tz from remind_feeds where token = ${token}`;
  const feed = feeds[0];
  if (!feed) return null;
  const events: Event[] = (await hasPassAccess(feed.user_id))
    ? (await openDatedTasks(feed.user_id)).map((task) => ({
        uid: task.uid,
        title: task.title,
        notes: task.notes + lastComment(task.comments),
        due: task.due,
        time: task.time,
        recur: task.recur,
        where: task.where,
      }))
    : [];

  const now = stamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Midnry//Remind//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Midnry Remind",
    `X-WR-TIMEZONE:${feed.tz}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events.slice(0, 1000)) {
    const rrule = toRRule(event.recur, event.due);
    lines.push("BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${now}`);
    if (event.time) {
      lines.push(`DTSTART;TZID=${feed.tz}:${compact(event.due)}T${event.time.replace(":", "")}00`, "DURATION:PT30M");
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(event.due)}`, `DTEND;VALUE=DATE:${compact(addDays(event.due, 1))}`);
    }
    if (rrule) lines.push(`RRULE:${rrule}`);
    lines.push(fold(`SUMMARY:${escape(event.title)}`));
    lines.push(fold(`DESCRIPTION:${escape(`${event.where}${event.notes ? `\n\n${event.notes}` : ""}\n\nOpen in Midnry: ${origin}/apps/tasks`)}`));
    if (event.time) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escape(event.title)}`, "TRIGGER:PT0M", "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
