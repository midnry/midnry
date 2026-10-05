import { isIsoDate, isTime } from "./dates.ts";
import { cleanRecur, type Recur } from "./recur.ts";
import { cleanStats, EMPTY_STATS, type Stats } from "./stats.ts";

export type Priority = 1 | 2 | 3 | 4;

export type Comment = { id: string; authorId: string; authorName: string; body: string; at: string };

type TaskBase = {
  id: string;
  title: string;
  notes: string;
  sectionId: string;
  parentId: string;
  priority: Priority;
  due: string;
  time: string;
  recur: Recur;
  done: boolean;
  doneAt: string;
  createdAt: string;
  comments: Comment[];
};

/** A task in your own list. Labels point at your own labels. */
export type Task = TaskBase & { projectId: string; labelIds: string[] };

/** A task in a shared project. Labels are plain names everyone sees. */
export type SharedTask = TaskBase & { labels: string[]; assigneeId: string; createdBy: string };

export type Project = { id: string; name: string };
export type Section = { id: string; projectId: string; name: string };
export type Label = { id: string; name: string };

export type DueFilter = "any" | "overdue" | "today" | "week" | "dated" | "none";
export type Filter = {
  id: string;
  name: string;
  priorities: Priority[];
  labels: string[];
  due: DueFilter;
  /** Personal project ids, or "shared:<id>". Empty means every project. */
  projects: string[];
  assignee: "any" | "me" | "unassigned";
  query: string;
};

export type Doc = {
  projects: Project[];
  sections: Section[];
  labels: Label[];
  filters: Filter[];
  tasks: Task[];
  stats: Stats;
  /** Show browser alerts for timed tasks while Remind is open. */
  alerts: boolean;
};

export type SharedDoc = { sections: { id: string; name: string }[]; tasks: SharedTask[] };

export const INBOX = "inbox";
export const LIMITS = { tasks: 500, sharedTasks: 500, projects: 40, sections: 80, labels: 40, filters: 20, comments: 50 };
export const EMPTY_DOC: Doc = {
  projects: [{ id: INBOX, name: "Inbox" }],
  sections: [],
  labels: [],
  filters: [],
  tasks: [],
  stats: EMPTY_STATS,
  alerts: false,
};

type Loose = Record<string, unknown>;

export function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function list(value: unknown): Loose[] {
  return Array.isArray(value) ? value.filter((item): item is Loose => Boolean(item) && typeof item === "object") : [];
}

export function asPriority(value: unknown): Priority {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : 4;
}

function isoStamp(value: unknown): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value.slice(0, 30) : "";
}

export function cleanComments(value: unknown): Comment[] {
  return list(value)
    .map((item) => ({
      id: clip(item.id, 40),
      authorId: clip(item.authorId, 64),
      authorName: clip(item.authorName, 60) || "Someone",
      body: typeof item.body === "string" ? item.body.trim().slice(0, 1000) : "",
      at: isoStamp(item.at),
    }))
    .filter((item) => item.id && item.body)
    .slice(-LIMITS.comments);
}

function cleanBase(item: Loose): TaskBase {
  return {
    id: clip(item.id, 40),
    title: clip(item.title, 200),
    notes: typeof item.notes === "string" ? item.notes.slice(0, 2000) : "",
    sectionId: clip(item.sectionId, 40),
    parentId: clip(item.parentId, 40),
    priority: asPriority(item.priority),
    due: isIsoDate(item.due) ? item.due : "",
    time: isIsoDate(item.due) && isTime(item.time) ? (item.time as string) : "",
    recur: cleanRecur(item.recur),
    done: Boolean(item.done),
    doneAt: isoStamp(item.doneAt),
    createdAt: isoStamp(item.createdAt),
    comments: cleanComments(item.comments),
  };
}

function dropOrphans<T extends { id: string; parentId: string }>(tasks: T[]): T[] {
  const ids = new Set(tasks.map((task) => task.id));
  return tasks.map((task) => (task.parentId && !ids.has(task.parentId) ? { ...task, parentId: "" } : task));
}

export function cleanFilter(item: Loose): Filter | null {
  const id = clip(item.id, 40);
  const name = clip(item.name, 40);
  if (!id || !name) return null;
  const due = ["any", "overdue", "today", "week", "dated", "none"].includes(item.due as string) ? (item.due as DueFilter) : "any";
  const assignee = item.assignee === "me" || item.assignee === "unassigned" ? item.assignee : "any";
  return {
    id,
    name,
    priorities: Array.isArray(item.priorities) ? [...new Set(item.priorities.map(asPriority))] : [],
    labels: Array.isArray(item.labels) ? item.labels.map((label) => clip(label, 32)).filter(Boolean).slice(0, 10) : [],
    due,
    projects: Array.isArray(item.projects) ? item.projects.map((project) => clip(project, 60)).filter(Boolean).slice(0, 20) : [],
    assignee,
    query: clip(item.query, 80),
  };
}

export function cleanDoc(raw: unknown): Doc {
  const source = raw && typeof raw === "object" ? (raw as Loose) : {};
  const projects = list(source.projects)
    .map((item) => ({ id: clip(item.id, 40), name: clip(item.name, 60) }))
    .filter((item) => item.id && item.name)
    .slice(0, LIMITS.projects);
  if (!projects.some((item) => item.id === INBOX)) projects.unshift({ id: INBOX, name: "Inbox" });
  const projectIds = new Set(projects.map((item) => item.id));
  const sections = list(source.sections)
    .map((item) => ({ id: clip(item.id, 40), projectId: clip(item.projectId, 40), name: clip(item.name, 60) }))
    .filter((item) => item.id && item.name && projectIds.has(item.projectId))
    .slice(0, LIMITS.sections);
  const labels = list(source.labels)
    .map((item) => ({ id: clip(item.id, 40), name: clip(item.name, 32) }))
    .filter((item) => item.id && item.name)
    .slice(0, LIMITS.labels);
  const labelIds = new Set(labels.map((item) => item.id));
  const tasks = list(source.tasks)
    .map((item): Task => {
      const base = cleanBase(item);
      const projectId = projectIds.has(clip(item.projectId, 40)) ? clip(item.projectId, 40) : INBOX;
      const section = sections.find((entry) => entry.id === base.sectionId);
      return {
        ...base,
        projectId,
        sectionId: section?.projectId === projectId ? base.sectionId : "",
        labelIds: Array.isArray(item.labelIds)
          ? [...new Set(item.labelIds.map((id) => clip(id, 40)))].filter((id) => labelIds.has(id)).slice(0, 10)
          : [],
      };
    })
    .filter((item) => item.id && item.title)
    .slice(0, LIMITS.tasks);
  return {
    projects,
    sections,
    labels,
    filters: list(source.filters)
      .map(cleanFilter)
      .filter((item): item is Filter => item !== null)
      .slice(0, LIMITS.filters),
    tasks: dropOrphans(tasks),
    stats: cleanStats(source.stats),
    alerts: Boolean(source.alerts),
  };
}

export function cleanSharedTask(item: Loose, sectionIds: Set<string>): SharedTask | null {
  const base = cleanBase(item);
  if (!base.id || !base.title) return null;
  return {
    ...base,
    sectionId: sectionIds.has(base.sectionId) ? base.sectionId : "",
    labels: Array.isArray(item.labels)
      ? [...new Set(item.labels.map((label) => clip(label, 32)).filter(Boolean))].slice(0, 10)
      : [],
    assigneeId: clip(item.assigneeId, 64),
    createdBy: clip(item.createdBy, 64),
  };
}

export function cleanSharedDoc(raw: unknown): SharedDoc {
  const source = raw && typeof raw === "object" ? (raw as Loose) : {};
  const sections = list(source.sections)
    .map((item) => ({ id: clip(item.id, 40), name: clip(item.name, 60) }))
    .filter((item) => item.id && item.name)
    .slice(0, LIMITS.sections);
  const sectionIds = new Set(sections.map((item) => item.id));
  const tasks = list(source.tasks)
    .map((item) => cleanSharedTask(item, sectionIds))
    .filter((item): item is SharedTask => item !== null)
    .slice(0, LIMITS.sharedTasks);
  return { sections, tasks: dropOrphans(tasks) };
}

/** Ids of a task and everything nested under it. */
export function withDescendants<T extends { id: string; parentId: string }>(tasks: T[], id: string): Set<string> {
  const drop = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const task of tasks) {
      if (task.parentId && drop.has(task.parentId) && !drop.has(task.id)) {
        drop.add(task.id);
        grew = true;
      }
    }
  }
  return drop;
}
