import { addDays } from "@/lib/remind/dates";
import { INBOX, type Comment, type Doc, type Filter, type Priority } from "@/lib/remind/model";
import type { Recur } from "@/lib/remind/recur";
import type { SharedProject } from "@/lib/remind.functions";

/** One task as the screen sees it, whether it lives in your list or a shared project. */
export type Item = {
  key: string;
  id: string;
  /** Shared project id, or null for your own tasks. */
  shared: string | null;
  /** Your project id, or "shared:<id>". */
  projectKey: string;
  sectionId: string;
  parentId: string;
  title: string;
  notes: string;
  priority: Priority;
  due: string;
  time: string;
  recur: Recur;
  done: boolean;
  doneAt: string;
  createdAt: string;
  labels: string[];
  assigneeId: string;
  comments: Comment[];
};

export type ItemPatch = Partial<
  Pick<Item, "title" | "notes" | "priority" | "due" | "time" | "recur" | "done" | "doneAt" | "sectionId" | "parentId" | "labels" | "assigneeId" | "projectKey">
>;

export type View =
  | { kind: "inbox" }
  | { kind: "today" }
  | { kind: "upcoming" }
  | { kind: "assigned" }
  | { kind: "done" }
  | { kind: "stats" }
  | { kind: "settings" }
  | { kind: "project"; id: string }
  | { kind: "label"; name: string }
  | { kind: "filter"; id: string };

export const sharedKey = (id: string) => `shared:${id}`;

export function toItems(doc: Doc, shared: SharedProject[]): Item[] {
  const labelName = new Map(doc.labels.map((label) => [label.id, label.name]));
  const mine: Item[] = doc.tasks.map((task) => ({
    key: `p:${task.id}`,
    id: task.id,
    shared: null,
    projectKey: task.projectId,
    sectionId: task.sectionId,
    parentId: task.parentId,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    due: task.due,
    time: task.time,
    recur: task.recur,
    done: task.done,
    doneAt: task.doneAt,
    createdAt: task.createdAt,
    labels: task.labelIds.map((id) => labelName.get(id) ?? "").filter(Boolean),
    assigneeId: "",
    comments: task.comments,
  }));
  const theirs: Item[] = shared.flatMap((project) =>
    project.doc.tasks.map((task) => ({
      key: `s:${project.id}:${task.id}`,
      id: task.id,
      shared: project.id,
      projectKey: sharedKey(project.id),
      sectionId: task.sectionId,
      parentId: task.parentId,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      due: task.due,
      time: task.time,
      recur: task.recur,
      done: task.done,
      doneAt: task.doneAt,
      createdAt: task.createdAt,
      labels: task.labels,
      assigneeId: task.assigneeId,
      comments: task.comments,
    })),
  );
  return [...mine, ...theirs];
}

/** Shared tasks only show in your day views when they're yours or nobody's. */
export function isMineToDo(item: Item, me: string): boolean {
  return !item.shared || !item.assigneeId || item.assigneeId === me;
}

export function sameLabel(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function matchesFilter(item: Item, filter: Filter, today: string, me: string): boolean {
  if (item.done) return false;
  if (filter.priorities.length && !filter.priorities.includes(item.priority)) return false;
  if (filter.labels.length && !filter.labels.some((label) => item.labels.some((own) => sameLabel(own, label)))) return false;
  if (filter.projects.length && !filter.projects.includes(item.projectKey)) return false;
  if (filter.assignee === "me" && !(item.shared && item.assigneeId === me)) return false;
  if (filter.assignee === "unassigned" && !(item.shared && !item.assigneeId)) return false;
  if (filter.query && !`${item.title} ${item.notes}`.toLowerCase().includes(filter.query.toLowerCase())) return false;
  switch (filter.due) {
    case "overdue":
      return Boolean(item.due) && item.due < today;
    case "today":
      return Boolean(item.due) && item.due <= today;
    case "week":
      return Boolean(item.due) && item.due <= addDays(today, 7);
    case "dated":
      return Boolean(item.due);
    case "none":
      return !item.due;
    default:
      return true;
  }
}

export function byWhen(a: Item, b: Item): number {
  if (a.due !== b.due) return !a.due ? 1 : !b.due ? -1 : a.due.localeCompare(b.due);
  if (a.time !== b.time) return !a.time ? 1 : !b.time ? -1 : a.time.localeCompare(b.time);
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.createdAt.localeCompare(b.createdAt);
}

export const PRIORITY_STYLE: Record<Priority, { ring: string; text: string; fill: string; name: string }> = {
  1: { ring: "border-red-600", text: "text-red-700", fill: "bg-red-600", name: "Priority 1" },
  2: { ring: "border-orange-500", text: "text-orange-700", fill: "bg-orange-500", name: "Priority 2" },
  3: { ring: "border-blue-600", text: "text-blue-700", fill: "bg-blue-600", name: "Priority 3" },
  4: { ring: "border-line", text: "text-muted", fill: "bg-muted", name: "Priority 4" },
};

export function projectLabel(doc: Doc, shared: SharedProject[], key: string): string {
  if (key.startsWith("shared:")) return shared.find((project) => sharedKey(project.id) === key)?.name ?? "Shared project";
  if (key === INBOX) return "Inbox";
  return doc.projects.find((project) => project.id === key)?.name ?? "Inbox";
}
