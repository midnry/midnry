import { getSql } from "@/lib/db";
import { escapeHtml, layout, sendEmail, siteUrl } from "@/lib/email.server";
import { prettyDate, prettyTime } from "@/lib/remind/dates";
import { hasPassAccess, openDatedTasks, type OpenTask } from "@/lib/remind/collect.server";

// Remind's scheduled email: reminders when a timed task is due (Midnry Pass)
// and a morning summary (free). Run by pinging /api/remind/tick every few
// minutes; it does real work at most once a minute.

const DUE_WINDOW_MINUTES = 30;
const DIGEST_FROM = 7 * 60;
const DIGEST_UNTIL = 12 * 60;
const MAX_USERS_PER_TICK = 500;
const MAX_EMAILS_PER_TICK = 80;

type Sql = Awaited<ReturnType<typeof getSql>>;

/** The date and minute of the day in a time zone. */
export function localNow(tz: string, now = new Date()): { date: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  } catch {
    return localNow("UTC", now);
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/api/remind/unsubscribe/${token}`;
}

function footer(token: string, why: string): string {
  return `${escapeHtml(why)} <a href="${escapeHtml(`${siteUrl()}/apps/tasks`)}" style="color:#5c6e84">Change email settings</a> or <a href="${escapeHtml(unsubscribeUrl(token))}" style="color:#5c6e84">unsubscribe</a>.`;
}

function taskLine(task: OpenTask, today: string, showDate: boolean): { html: string; text: string } {
  const when = [showDate ? prettyDate(task.due, today) : "", task.time ? prettyTime(task.time) : ""].filter(Boolean).join(", ");
  const color = task.priority === 1 ? "#dc2626" : task.priority === 2 ? "#ea580c" : task.priority === 3 ? "#2563eb" : "#94a3b8";
  const meta = [when, task.where].filter(Boolean).join(" · ");
  return {
    html: `<tr><td style="padding:8px 0;border-top:1px solid #e6eef8"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${color};margin-right:8px"></span><strong>${escapeHtml(task.title)}</strong><br><span style="font-size:13px;color:#5c6e84;padding-left:18px">${escapeHtml(meta)}</span></td></tr>`,
    text: `- ${task.title}${meta ? ` (${meta})` : ""}`,
  };
}

function sortTasks(a: OpenTask, b: OpenTask): number {
  if (a.due !== b.due) return a.due.localeCompare(b.due);
  if (a.time !== b.time) return !a.time ? 1 : !b.time ? -1 : a.time.localeCompare(b.time);
  return a.priority - b.priority;
}

export function dueEmail(tasks: OpenTask[], today: string, token: string) {
  const sorted = [...tasks].sort(sortTasks);
  const lines = sorted.map((task) => taskLine(task, today, false));
  const subject = sorted.length === 1 ? `Reminder: ${sorted[0].title}` : `Reminder: ${sorted.length} tasks due now`;
  const heading = sorted.length === 1 ? `${sorted[0].title} is due${sorted[0].time ? ` at ${prettyTime(sorted[0].time)}` : ""}` : `${sorted.length} tasks are due now`;
  return {
    subject,
    html: layout({
      heading,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines.map((line) => line.html).join("")}</table>`,
      button: { label: "Open Remind", url: `${siteUrl()}/apps/tasks` },
      footer: footer(token, "You get these because you turned on task reminders in Midnry Remind."),
    }),
    text: `${heading}\n\n${lines.map((line) => line.text).join("\n")}\n\nOpen Remind: ${siteUrl()}/apps/tasks\nUnsubscribe: ${unsubscribeUrl(token)}`,
  };
}

export function digestEmail(tasks: OpenTask[], today: string, token: string, name: string) {
  const overdue = tasks.filter((task) => task.due < today).sort(sortTasks);
  const dueToday = tasks.filter((task) => task.due === today).sort(sortTasks);
  const section = (title: string, list: OpenTask[], showDate: boolean, tone: string) => {
    if (!list.length) return { html: "", text: "" };
    const shown = list.slice(0, 15);
    const lines = shown.map((task) => taskLine(task, today, showDate));
    const more = list.length > shown.length ? `<p style="font-size:13px;color:#5c6e84">And ${list.length - shown.length} more.</p>` : "";
    return {
      html: `<p style="margin:16px 0 4px;font-weight:600;color:${tone}">${escapeHtml(title)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines.map((line) => line.html).join("")}</table>${more}`,
      text: `${title}\n${lines.map((line) => line.text).join("\n")}`,
    };
  };
  const todayPart = section(`Today (${dueToday.length})`, dueToday, false, "#102033");
  const latePart = section(`Overdue (${overdue.length})`, overdue, true, "#b42318");
  const subject = `Today: ${dueToday.length} ${dueToday.length === 1 ? "task" : "tasks"}${overdue.length ? `, ${overdue.length} overdue` : ""}`;
  const greeting = name ? `Good morning, ${name.split(" ")[0]}` : "Good morning";
  return {
    subject,
    html: layout({
      heading: greeting,
      body: `<p style="margin:0 0 4px">Here's your day in Remind.</p>${todayPart.html}${latePart.html}`,
      button: { label: "Open today's list", url: `${siteUrl()}/apps/tasks` },
      footer: footer(token, "You get this because you turned on the morning summary in Midnry Remind."),
    }),
    text: `${greeting}. Here's your day in Remind.\n\n${[todayPart.text, latePart.text].filter(Boolean).join("\n\n")}\n\nOpen Remind: ${siteUrl()}/apps/tasks\nUnsubscribe: ${unsubscribeUrl(token)}`,
  };
}

/** Claim send keys; returns only the ones nobody claimed before. */
async function claim(sql: Sql, userId: string, keys: string[]): Promise<string[]> {
  const won: string[] = [];
  for (const key of keys) {
    const rows = await sql<{ key: string }>`
      insert into remind_email_sent (key, user_id) values (${key}, ${userId})
      on conflict do nothing
      returning key
    `;
    if (rows[0]) won.push(key);
  }
  return won;
}

async function release(sql: Sql, keys: string[]): Promise<void> {
  for (const key of keys) await sql`delete from remind_email_sent where key = ${key}`;
}

export type TickResult = { ran: boolean; users: number; sent: number; failed: number };

export async function runTick(now = new Date()): Promise<TickResult> {
  const sql = await getSql();
  const started = await sql<{ id: number }>`
    insert into remind_tick (id, last_run) values (1, now())
    on conflict (id) do update set last_run = now()
    where remind_tick.last_run < now() - interval '50 seconds'
    returning id
  `;
  if (!started[0]) return { ran: false, users: 0, sent: 0, failed: 0 };

  const people = await sql<{ user_id: string; digest: boolean; due: boolean; tz: string; unsub_token: string; email: string | null; name: string | null }>`
    select p.user_id, p.digest, p.due, p.tz, p.unsub_token, u.email, u.name
    from remind_email_prefs p
    join "user" u on u.id = p.user_id
    where (p.digest or p.due) and u.email is not null
    limit ${MAX_USERS_PER_TICK}
  `;
  let sent = 0;
  let failed = 0;
  for (const person of people) {
    if (sent + failed >= MAX_EMAILS_PER_TICK) break;
    const { date, minutes } = localNow(person.tz, now);
    const wantsDue = person.due;
    const wantsDigest = person.digest && minutes >= DIGEST_FROM && minutes < DIGEST_UNTIL;
    if (!wantsDue && !wantsDigest) continue;
    const tasks = await openDatedTasks(person.user_id);

    if (wantsDue && (await hasPassAccess(person.user_id))) {
      const dueNow = tasks.filter((task) => task.due === date && task.time && minutes >= minutesOf(task.time) && minutes - minutesOf(task.time) <= DUE_WINDOW_MINUTES);
      const keyOf = (task: OpenTask) => `due:${person.user_id}:${task.uid}:${date}:${task.time}`;
      const won = new Set(await claim(sql, person.user_id, dueNow.map(keyOf)));
      const fresh = dueNow.filter((task) => won.has(keyOf(task)));
      if (fresh.length) {
        const email = dueEmail(fresh, date, person.unsub_token);
        const result = await sendEmail({ to: person.email as string, ...email, unsubscribeUrl: unsubscribeUrl(person.unsub_token) });
        if (result.ok) sent += 1;
        else {
          failed += 1;
          await release(sql, [...won]);
        }
      }
    }

    if (wantsDigest) {
      const key = `digest:${person.user_id}:${date}`;
      const won = await claim(sql, person.user_id, [key]);
      const relevant = tasks.filter((task) => task.due <= date);
      if (won.length && relevant.length) {
        const email = digestEmail(relevant, date, person.unsub_token, person.name ?? "");
        const result = await sendEmail({ to: person.email as string, ...email, unsubscribeUrl: unsubscribeUrl(person.unsub_token) });
        if (result.ok) sent += 1;
        else {
          failed += 1;
          await release(sql, won);
        }
      }
    }
  }
  if (now.getUTCMinutes() === 0) await sql`delete from remind_email_sent where sent_at < now() - interval '40 days'`;
  return { ran: true, users: people.length, sent, failed };
}

export async function sendInviteEmail(input: { to: string; inviterName: string; projectName: string; hasAccount: boolean }) {
  const join = input.hasAccount ? `${siteUrl()}/apps/tasks` : `${siteUrl()}/login?intent=register&next=${encodeURIComponent("/apps/tasks")}`;
  const heading = `${input.inviterName} invited you to “${input.projectName}”`;
  const steps = input.hasAccount
    ? "Open Remind on Midnry and tap Join to start working on it together."
    : `Create a free Midnry account with this email address (${input.to}), then open Remind and tap Join.`;
  return sendEmail({
    to: input.to,
    subject: `${input.inviterName} invited you to “${input.projectName}” on Midnry`,
    html: layout({
      heading,
      body: `<p style="margin:0 0 12px">It's a shared project in Midnry Remind, a simple to-do and reminders app. You can see the tasks, pick some up, and comment.</p><p style="margin:0">${escapeHtml(steps)}</p>`,
      button: { label: input.hasAccount ? "Open Remind" : "Join Midnry free", url: join },
      footer: "You got this because someone typed your email address into Midnry Remind. If you weren't expecting it, you can ignore it.",
    }),
    text: `${heading}\n\n${steps}\n\n${join}`,
  });
}

export async function sendTestEmail(to: string, token: string) {
  return sendEmail({
    to,
    subject: "Your Midnry Remind emails are working",
    html: layout({
      heading: "Email is set up",
      body: `<p style="margin:0">This is a test from Midnry Remind. Reminders and your morning summary will come from this address.</p>`,
      button: { label: "Open Remind", url: `${siteUrl()}/apps/tasks` },
      footer: footer(token, "You asked for this test email."),
    }),
    text: `This is a test from Midnry Remind.\n\n${siteUrl()}/apps/tasks`,
    unsubscribeUrl: unsubscribeUrl(token),
  });
}
