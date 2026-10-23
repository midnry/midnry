import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTask } from "./parse.ts";
import { cleanRecur, nextDue, occurrences, recurLabel, repeatPhrase, repeatPreview, snapToRepeat, toRRule } from "./recur.ts";
import { dayMonth, shortDate } from "./dates.ts";
import { EMPTY_STATS, dailyStreak, levelOf, recordCompletion, weeklyStreak } from "./stats.ts";

// 2026-10-05 is a Monday.
const TODAY = "2026-10-05";

test("parses a plain task with no extras", () => {
  const p = parseTask("Buy bread", TODAY);
  assert.deepEqual(p, { title: "Buy bread", due: "", time: "", priority: null, labels: [], project: "", recur: "none" });
});

test("parses date, time, priority, labels and project", () => {
  const p = parseTask("Call mum tomorrow at 6pm p1 @home @phone #Family", TODAY);
  assert.equal(p.title, "Call mum");
  assert.equal(p.due, "2026-10-06");
  assert.equal(p.time, "18:00");
  assert.equal(p.priority, 1);
  assert.deepEqual(p.labels, ["home", "phone"]);
  assert.equal(p.project, "Family");
});

test("parses weekdays, next week and relative dates", () => {
  assert.equal(parseTask("Gym friday", TODAY).due, "2026-10-09");
  assert.equal(parseTask("Gym monday", TODAY).due, "2026-10-05");
  assert.equal(parseTask("Gym next monday", TODAY).due, "2026-10-12");
  assert.equal(parseTask("Report next week", TODAY).due, "2026-10-12");
  assert.equal(parseTask("Renew in 3 days", TODAY).due, "2026-10-08");
  assert.equal(parseTask("Call day after tomorrow", TODAY).due, "2026-10-07");
  assert.equal(parseTask("Call day after tomorrow", TODAY).title, "Call");
  assert.equal(parseTask("Renew in 2 weeks", TODAY).due, "2026-10-19");
  assert.equal(parseTask("Pay rent 1 Nov", TODAY).due, "2026-11-01");
  assert.equal(parseTask("Pay rent Nov 1st", TODAY).due, "2026-11-01");
  assert.equal(parseTask("Birthday 12/3", TODAY).due, "2027-03-12");
  assert.equal(parseTask("Dentist 2026-12-01 at 9:30am", TODAY).time, "09:30");
});

test("parses times on their own and part-of-day words", () => {
  const p = parseTask("Standup 9:15", TODAY);
  assert.equal(p.time, "09:15");
  assert.equal(p.due, TODAY);
  assert.equal(parseTask("Read tonight", TODAY).time, "20:00");
  assert.equal(parseTask("Walk tomorrow morning", TODAY).time, "09:00");
  assert.equal(parseTask("Lunch at noon", TODAY).time, "12:00");
});

test("parses repeats and puts the first due date on the rule", () => {
  const tues = parseTask("Bins every Tuesday", TODAY);
  assert.equal(tues.recur, "on:2");
  assert.equal(tues.due, "2026-10-06");
  assert.equal(tues.title, "Bins");
  assert.equal(parseTask("Stand-up every weekday at 9am", TODAY).recur, "weekdays");
  assert.equal(parseTask("Water plants every 3 days", TODAY).recur, "every:3:d");
  assert.equal(parseTask("Rent every 25th", TODAY).recur, "monthday:25");
  assert.equal(parseTask("Rent every 25th", TODAY).due, "2026-10-25");
  assert.equal(parseTask("Review daily", TODAY).recur, "day");
  assert.equal(parseTask("Gym every mon and thu", TODAY).recur, "on:1,4");
});

test("leaves unrelated words alone", () => {
  assert.equal(parseTask("Email Mayowa about the march budget", TODAY).title, "Email Mayowa about the march budget");
  assert.equal(parseTask("Read 3 chapters", TODAY).title, "Read 3 chapters");
});

test("repeat rules move forward correctly", () => {
  assert.equal(nextDue("2026-10-05", "day", TODAY), "2026-10-06");
  assert.equal(nextDue("2026-09-28", "week", TODAY), "2026-10-12");
  assert.equal(nextDue("2026-10-05", "every:2:w", TODAY), "2026-10-19");
  assert.equal(nextDue("2026-10-09", "weekdays", "2026-10-09"), "2026-10-12");
  assert.equal(nextDue("2026-10-06", "on:2,4", "2026-10-06"), "2026-10-08");
  assert.equal(nextDue("2026-01-31", "month", "2026-01-31"), "2026-02-28");
  assert.equal(nextDue("2026-10-25", "monthday:31", "2026-10-25"), "2026-10-31");
  assert.equal(cleanRecur("bogus"), "none");
  assert.equal(recurLabel("on:2"), "Every Tuesday");
  assert.equal(toRRule("every:2:w", TODAY), "FREQ=WEEKLY;INTERVAL=2");
  assert.deepEqual(occurrences("2026-10-05", "week", "2026-10-01", "2026-10-31"), ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
});

test("points, goal bonus and streaks", () => {
  let stats = { ...EMPTY_STATS, dailyGoal: 2, weeklyGoal: 3 };
  let r = recordCompletion(stats, "2026-10-04", 1, 1);
  assert.equal(r.earned, 4);
  r = recordCompletion(r.stats, "2026-10-04", 4, 1);
  assert.equal(r.earned, 1 + 5);
  stats = r.stats;
  stats = recordCompletion(stats, TODAY, 4, 1).stats;
  assert.equal(dailyStreak(stats, TODAY), 1, "yesterday met the goal, today not yet");
  stats = recordCompletion(stats, TODAY, 4, 1).stats;
  assert.equal(dailyStreak(stats, TODAY), 2);
  assert.equal(weeklyStreak(stats, TODAY), 0, "this week has 2 of 3");
  assert.equal(weeklyStreak(stats, "2026-10-04"), 0);
  const undone = recordCompletion(stats, TODAY, 4, -1);
  assert.equal(undone.stats.days[TODAY], 1);
  assert.equal(levelOf(0).name, "Starter");
  assert.equal(levelOf(160).name, "Steady");
});

// ── Realistic phrases (R2) ───────────────────────────────────────────────────
// Friday 23 October 2026, the day of the audit.
const FRI = "2026-10-23";

type Extra = { priority?: number; labels?: string[]; project?: string; nextYear?: boolean };
type Row = [input: string, title: string, due: string, time: string, recur: string, extra?: Extra];
const PHRASES: Row[] = [
  ["Pay rent every 25th", "Pay rent", "2026-10-25", "", "monthday:25"],
  ["Pay rent every 25th p1", "Pay rent", "2026-10-25", "", "monthday:25", { priority: 1 }],
  ["Pay DSTV every 15th", "Pay DSTV", "2026-11-15", "", "monthday:15"],
  ["Pay salaries month end", "Pay salaries", "2026-10-31", "", "none"],
  ["Remit pension by end of the month", "Remit pension", "2026-10-31", "", "none"],
  ["Recharge MTN data every month end", "Recharge MTN data", "2026-10-31", "", "monthday:31"],
  ["Submit report Friday by 5", "Submit report", "2026-10-23", "17:00", "none"],
  ["Meet Tunde at 4 tomorrow", "Meet Tunde", "2026-10-24", "16:00", "none"],
  ["Meet at 3 Allen Avenue", "Meet at 3 Allen Avenue", "", "", "none"],
  ["Pick kids from school by 3pm", "Pick kids from school", "2026-10-23", "15:00", "none"],
  ["Weekend market shopping this weekend", "Weekend market shopping", "2026-10-24", "", "none"],
  ["Weekend market shopping", "Weekend market shopping", "", "", "none"],
  ["Clean the car weekend", "Clean the car", "2026-10-24", "", "none"],
  ["Monday meeting prep on thursday", "Monday meeting prep", "2026-10-29", "", "none"],
  ["Pay school fees 30/9", "Pay school fees", "2027-09-30", "", "none", { nextYear: true }],
  ["Pay school fees 30/9/2026", "Pay school fees", "2026-09-30", "", "none"],
  ["Renew passport 12/11", "Renew passport", "2026-11-12", "", "none"],
  ["Dentist 3 Nov at 10:30", "Dentist", "2026-11-03", "10:30", "none"],
  ["Visit mama in the village 24 Dec", "Visit mama in the village", "2026-12-24", "", "none"],
  ["Pay NEPA bill monthly p3", "Pay NEPA bill", "2026-10-23", "", "month", { priority: 3 }],
  ["Gym every tue and fri", "Gym", "2026-10-23", "", "on:2,5"],
  ["Gym monday every tue and fri 7am", "Gym", "2026-10-27", "07:00", "on:2,5"],
  ["Gym every mon and thu 7am", "Gym", "2026-10-26", "07:00", "on:1,4"],
  ["Team standup every weekday 9am", "Team standup", "2026-10-23", "09:00", "weekdays"],
  ["Weekly review every sunday 7pm", "Weekly review", "2026-10-25", "19:00", "on:7"],
  ["Pay house help every friday", "Pay house help", "2026-10-23", "", "on:5"],
  ["Water the plants every 3 days", "Water the plants", "2026-10-23", "", "every:3:d"],
  ["Backup laptop every 2 weeks", "Backup laptop", "2026-10-23", "", "every:2:w"],
  ["Call mum tomorrow 6pm @home", "Call mum", "2026-10-24", "18:00", "none", { labels: ["home"] }],
  ["Call Amaka tonight", "Call Amaka", "2026-10-23", "20:00", "none"],
  ["Yoga sat morning", "Yoga", "2026-10-24", "09:00", "none"],
  ["Buy fuel tomorrow morning", "Buy fuel", "2026-10-24", "09:00", "none"],
  ["Church harvest sunday 8am", "Church harvest", "2026-10-25", "08:00", "none"],
  ["Collect ankara from tailor saturday", "Collect ankara from tailor", "2026-10-24", "", "none"],
  ["Send invoice to Chidi next friday", "Send invoice to Chidi", "2026-10-30", "", "none"],
  ["Book flight to Lagos in 2 weeks", "Book flight to Lagos", "2026-11-06", "", "none"],
  ["Finish tax return next month p1 @finance", "Finish tax return", "2026-11-01", "", "none", { priority: 1, labels: ["finance"] }],
  ["Reply to landlord email !2 #Home", "Reply to landlord email", "", "", "none", { priority: 2, project: "Home" }],
  ["Renew car insurance 2026-12-01 p2", "Renew car insurance", "2026-12-01", "", "none", { priority: 2 }],
  ["Lunch at 13pm", "Lunch at 13pm", "", "", "none"],
];

test(`parses ${PHRASES.length} everyday phrases`, () => {
  assert.ok(PHRASES.length >= 30);
  for (const [input, title, due, time, recur, extra = {}] of PHRASES) {
    const p = parseTask(input, FRI);
    assert.deepEqual({ title: p.title, due: p.due, time: p.time, recur: p.recur }, { title, due, time, recur }, `"${input}"`);
    if (extra.priority !== undefined) assert.equal(p.priority, extra.priority, `"${input}" priority`);
    if (extra.labels) assert.deepEqual(p.labels, extra.labels, `"${input}" labels`);
    if (extra.project !== undefined) assert.equal(p.project, extra.project, `"${input}" project`);
    assert.equal(p.nextYear ?? false, extra.nextYear ?? false, `"${input}" nextYear`);
  }
});

test("a past day and month moves to next year and says so", () => {
  const p = parseTask("Pay school fees 30/9", FRI);
  assert.equal(p.due, "2027-09-30");
  assert.equal(p.nextYear, true);
  assert.equal(parseTask("Pay school fees 30 Sep", FRI).nextYear, true);
  assert.equal(parseTask("Pay school fees Sep 30", FRI).nextYear, true);
  // Today and later this year stay this year, with no flag.
  assert.equal(parseTask("Pay school fees 23/10", FRI).due, FRI);
  assert.equal("nextYear" in parseTask("Pay school fees 23/10", FRI), false);
  assert.equal("nextYear" in parseTask("Pay school fees 31/12", FRI), false);
  // A typed year is used as typed, even in the past.
  assert.equal("nextYear" in parseTask("Pay school fees 30/9/26", FRI), false);
  assert.equal(parseTask("Pay school fees 30/9/26", FRI).due, "2026-09-30");
  // The add box's hint ("add the year: 30 Sep 2026") parses back to this year.
  assert.equal(parseTask("Pay school fees 30 Sep 2026", FRI).due, "2026-09-30");
  assert.equal("nextYear" in parseTask("Pay school fees 30 Sep 2026", FRI), false);
});

test("a custom weekly repeat lands on its first matching day", () => {
  // Sunday 25 Oct → Tuesday 27 Oct for "every Tue and Fri".
  assert.equal(snapToRepeat("on:2,5", "2026-10-25", FRI), "2026-10-27");
  assert.equal(snapToRepeat("on:2,5", "2026-10-24", FRI), "2026-10-27");
  assert.equal(snapToRepeat("on:2,5", "2026-10-27", FRI), "2026-10-27");
  assert.equal(snapToRepeat("on:2,5", "", FRI), FRI);
  assert.equal(snapToRepeat("weekdays", "2026-10-24", FRI), "2026-10-26");
  assert.equal(snapToRepeat("monthday:25", "2026-10-26", FRI), "2026-11-25");
  // Interval repeats keep the date they were given.
  assert.equal(snapToRepeat("every:2:w", "2026-10-25", FRI), "2026-10-25");
  assert.equal(parseTask("Gym sunday every tue and fri", FRI).due, "2026-10-27");
});

test("the repeat preview reads plainly and matches the saved date", () => {
  assert.equal(repeatPreview("2026-10-27", "", "on:2,5", FRI), "Next: Tue 27 Oct, then every Tue and Fri");
  assert.equal(repeatPreview("2026-10-26", "07:00", "on:1,3,5", FRI), "Next: Mon 26 Oct, 7am, then every Mon, Wed and Fri");
  assert.equal(repeatPreview("2026-10-25", "", "monthday:25", FRI), "Next: Sun 25 Oct, then every month on the 25th");
  assert.equal(repeatPreview("2026-10-31", "", "monthday:31", FRI), "Next: Sat 31 Oct, then every month on the last day");
  assert.equal(repeatPreview("2027-01-04", "", "weekdays", FRI), "Next: Mon 4 Jan 2027, then every weekday");
  assert.equal(repeatPreview("2026-10-23", "", "every:3:d", FRI), "Next: Fri 23 Oct, then every 3 days");
  assert.equal(repeatPreview("2026-10-23", "", "none", FRI), "");
  const p = parseTask("Gym every tue and fri", "2026-10-24");
  assert.equal(repeatPreview(p.due, p.time, p.recur, "2026-10-24"), "Next: Tue 27 Oct, then every Tue and Fri");
  assert.equal(repeatPhrase("on:2"), "every Tue");
  assert.equal(recurLabel("on:2,5"), "Every Tuesday and Friday");
});

test("finishing a repeat moves it to the date the preview promised", () => {
  assert.equal(nextDue("2026-10-23", "on:2,5", FRI), "2026-10-27");
  assert.equal(shortDate(nextDue("2026-10-27", "on:2,5", "2026-10-27"), FRI), "Fri 30 Oct");
  assert.equal(nextDue("2026-10-31", "monthday:31", "2026-10-31"), "2026-11-30");
  assert.equal(toRRule("monthday:31", "2026-10-31"), "FREQ=MONTHLY;BYMONTHDAY=-1");
  assert.equal(toRRule("monthday:25", "2026-10-25"), "FREQ=MONTHLY;BYMONTHDAY=25");
  assert.equal(shortDate("2027-09-30", FRI), "Thu 30 Sep 2027");
  assert.equal(dayMonth("2026-09-30"), "30 Sep");
});
