import { addDays, prettyDate } from "./dates.ts";

/** Upcoming shows the next two weeks (the same window as the Upcoming view in the app). */
const UPCOMING_DAYS = 13;

/**
 * Why a task that is open in the detail panel no longer belongs to the view it
 * was opened from, in plain words. The app keeps the task on screen with this
 * note instead of dropping the row (and the open editor) mid-edit.
 */
export function movedNote(
  view: { kind: string; name?: string },
  task: { done: boolean; due: string; projectName: string },
  today: string,
): string {
  if (view.kind === "done") return task.done ? "No longer in Completed." : "Marked not done. It's back in your list.";
  if (task.done) return "Finished. It's now in Completed.";
  const inProject = `It's in ${task.projectName}.`;
  switch (view.kind) {
    case "today":
      if (!task.due) return `No date now. ${inProject}`;
      if (task.due > today) return task.due <= addDays(today, UPCOMING_DAYS) ? `Moved to Upcoming (${prettyDate(task.due, today)}).` : `Now due ${prettyDate(task.due, today)}.`;
      return "No longer in Today.";
    case "upcoming":
      if (!task.due) return `No date now. ${inProject}`;
      if (task.due > addDays(today, UPCOMING_DAYS)) return `Now due ${prettyDate(task.due, today)}.`;
      return "No longer in Upcoming.";
    case "inbox":
      return task.projectName === "Inbox" ? "No longer in the Inbox." : `Moved to ${task.projectName}.`;
    case "project":
      return `Moved to ${task.projectName}.`;
    case "label":
      return `Label @${view.name ?? ""} removed. ${inProject}`;
    case "filter":
      return "No longer matches this filter.";
    case "assigned":
      return "No longer assigned to you.";
    default:
      return "No longer in this view.";
  }
}
