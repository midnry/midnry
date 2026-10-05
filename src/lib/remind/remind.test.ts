import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTask } from "./parse.ts";
import { cleanRecur, nextDue, occurrences, recurLabel, toRRule } from "./recur.ts";
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
