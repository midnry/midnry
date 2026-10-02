import { useMemo, useState, type FormEvent } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { nid, ToolFrame, ToolStatus } from "@/components/tools/shared";

type Recur = "none" | "day" | "week" | "month" | "year";
type Priority = 1 | 2 | 3 | 4;
type Project = { id: string; name: string };
type Section = { id: string; projectId: string; name: string };
type Label = { id: string; name: string };
type Task = {
  id: string;
  title: string;
  notes: string;
  projectId: string;
  sectionId: string;
  parentId: string;
  priority: Priority;
  labelIds: string[];
  due: string;
  recur: Recur;
  done: boolean;
};
type Doc = { projects: Project[]; sections: Section[]; labels: Label[]; tasks: Task[] };
type View =
  | { kind: "inbox" }
  | { kind: "today" }
  | { kind: "upcoming" }
  | { kind: "done" }
  | { kind: "project"; id: string }
  | { kind: "label"; id: string };
type Layout = "list" | "board" | "month";

const INBOX = "inbox";
const MAX_TASKS = 250;
const RECURS: Recur[] = ["none", "day", "week", "month", "year"];
const FALLBACK: Doc = { projects: [{ id: INBOX, name: "Inbox" }], sections: [], labels: [], tasks: [] };

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asPriority(value: unknown): Priority {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : 4;
}

function asRecur(value: unknown): Recur {
  return typeof value === "string" && RECURS.includes(value as Recur) ? (value as Recur) : "none";
}

function asDoc(raw: Doc): Doc {
  const projects = Array.isArray(raw.projects)
    ? raw.projects
        .map((item) => ({ id: clip(item?.id, 40), name: clip(item?.name, 60) }))
        .filter((item) => item.id && item.name)
        .slice(0, 24)
    : [];
  if (!projects.some((item) => item.id === INBOX)) projects.unshift({ id: INBOX, name: "Inbox" });
  const projectIds = new Set(projects.map((item) => item.id));
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .map((item) => ({
          id: clip(item?.id, 40),
          projectId: clip(item?.projectId, 40),
          name: clip(item?.name, 60),
        }))
        .filter((item) => item.id && item.name && projectIds.has(item.projectId))
        .slice(0, 60)
    : [];
  const labels = Array.isArray(raw.labels)
    ? raw.labels
        .map((item) => ({ id: clip(item?.id, 40), name: clip(item?.name, 32) }))
        .filter((item) => item.id && item.name)
        .slice(0, 24)
    : [];
  const labelIds = new Set(labels.map((item) => item.id));
  const sectionIds = new Set(sections.map((item) => item.id));
  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks
        .map((item) => {
          const projectId = projectIds.has(clip(item?.projectId, 40)) ? clip(item?.projectId, 40) : INBOX;
          const sectionId = sectionIds.has(clip(item?.sectionId, 40)) ? clip(item?.sectionId, 40) : "";
          return {
            id: clip(item?.id, 40),
            title: clip(item?.title, 160),
            notes: typeof item?.notes === "string" ? item.notes.slice(0, 500) : "",
            projectId,
            sectionId: sections.find((section) => section.id === sectionId)?.projectId === projectId ? sectionId : "",
            parentId: clip(item?.parentId, 40),
            priority: asPriority(item?.priority),
            labelIds: Array.isArray(item?.labelIds)
              ? item.labelIds.map((id) => clip(id, 40)).filter((id) => labelIds.has(id)).slice(0, 8)
              : [],
            due: /^\d{4}-\d{2}-\d{2}$/.test(clip(item?.due, 10)) ? clip(item?.due, 10) : "",
            recur: asRecur(item?.recur),
            done: Boolean(item?.done),
          };
        })
        .filter((item) => item.id && item.title)
        .slice(0, MAX_TASKS)
    : [];
  const ids = new Set(tasks.map((item) => item.id));
  return {
    projects,
    sections,
    labels,
    tasks: tasks.map((item) => ({ ...item, parentId: ids.has(item.parentId) ? item.parentId : "" })),
  };
}

function isoOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return isoOf(date);
}

function nextDue(iso: string, recur: Recur, today: string): string {
  let cursor = iso || today;
  for (let i = 0; i < 400; i += 1) {
    const date = parseIso(cursor);
    if (recur === "day") date.setDate(date.getDate() + 1);
    else if (recur === "week") date.setDate(date.getDate() + 7);
    else if (recur === "month") date.setMonth(date.getMonth() + 1);
    else date.setFullYear(date.getFullYear() + 1);
    cursor = isoOf(date);
    if (cursor > today) return cursor;
  }
  return cursor;
}

function pretty(iso: string, today: string): string {
  if (!iso) return "";
  if (iso < today) return "Overdue";
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  const date = parseIso(iso);
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function recurLabel(recur: Recur): string {
  if (recur === "day") return "Every day";
  if (recur === "week") return "Every week";
  if (recur === "month") return "Every month";
  if (recur === "year") return "Every year";
  return "Does not repeat";
}

export function TasksTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("tasks", FALLBACK);
  const doc = asDoc(data);
  const today = todayIso();
  const [view, setView] = useState<View>({ kind: "inbox" });
  const [layout, setLayout] = useState<Layout>("list");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | 0>(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", due: "", priority: 4 as Priority, recur: "none" as Recur, projectId: INBOX, sectionId: "" });
  const [projectName, setProjectName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => today.slice(0, 7));

  function commit(next: Doc) {
    setData(next);
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || doc.tasks.length >= MAX_TASKS) return;
    const projectId = doc.projects.some((item) => item.id === draft.projectId) ? draft.projectId : INBOX;
    const section = doc.sections.find((item) => item.id === draft.sectionId && item.projectId === projectId);
    commit({
      ...doc,
      tasks: [
        ...doc.tasks,
        {
          id: nid(),
          title: title.slice(0, 160),
          notes: "",
          projectId,
          sectionId: section?.id ?? "",
          parentId: "",
          priority: draft.priority,
          labelIds: [],
          due: draft.due,
          recur: draft.recur,
          done: false,
        },
      ],
    });
    setDraft((current) => ({ ...current, title: "" }));
  }

  function patch(id: string, change: Partial<Task>) {
    commit({ ...doc, tasks: doc.tasks.map((task) => (task.id === id ? { ...task, ...change } : task)) });
  }

  function toggle(task: Task) {
    if (!task.done && task.recur !== "none") {
      patch(task.id, { done: false, due: nextDue(task.due, task.recur, today) });
      return;
    }
    patch(task.id, { done: !task.done });
  }

  function removeTask(id: string) {
    const drop = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const task of doc.tasks) {
        if (task.parentId && drop.has(task.parentId) && !drop.has(task.id)) {
          drop.add(task.id);
          grew = true;
        }
      }
    }
    commit({ ...doc, tasks: doc.tasks.filter((task) => !drop.has(task.id)) });
    if (openId && drop.has(openId)) setOpenId(null);
  }

  function addProject(event: FormEvent) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name || doc.projects.length >= 24) return;
    const id = nid();
    commit({ ...doc, projects: [...doc.projects, { id, name: name.slice(0, 60) }] });
    setProjectName("");
    setView({ kind: "project", id });
    setDraft((current) => ({ ...current, projectId: id, sectionId: "" }));
  }

  function addSection(event: FormEvent) {
    event.preventDefault();
    if (view.kind !== "project") return;
    const name = sectionName.trim();
    if (!name || doc.sections.length >= 60) return;
    commit({ ...doc, sections: [...doc.sections, { id: nid(), projectId: view.id, name: name.slice(0, 60) }] });
    setSectionName("");
  }

  function addLabel(event: FormEvent) {
    event.preventDefault();
    const name = labelName.trim();
    if (!name || doc.labels.length >= 24) return;
    commit({ ...doc, labels: [...doc.labels, { id: nid(), name: name.slice(0, 32) }] });
    setLabelName("");
  }

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    return doc.tasks.filter((task) => {
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (needle && !`${task.title} ${task.notes}`.toLowerCase().includes(needle)) return false;
      if (view.kind === "done") return task.done;
      if (task.done) return false;
      if (view.kind === "inbox") return task.projectId === INBOX;
      if (view.kind === "today") return Boolean(task.due) && task.due <= today;
      if (view.kind === "upcoming") return Boolean(task.due) && task.due <= addDays(today, 7);
      if (view.kind === "project") return task.projectId === view.id;
      return task.labelIds.includes(view.id);
    });
  }, [doc.tasks, needle, priorityFilter, today, view]);

  const topLevel = visible.filter((task) => !task.parentId || !visible.some((item) => item.id === task.parentId));

  function openProject(id: string) {
    setView({ kind: "project", id });
    setDraft((current) => ({ ...current, projectId: id, sectionId: "" }));
  }

  const title =
    view.kind === "inbox"
      ? "Inbox"
      : view.kind === "today"
        ? "Today"
        : view.kind === "upcoming"
          ? "Upcoming"
          : view.kind === "done"
            ? "Completed"
            : view.kind === "project"
              ? (doc.projects.find((item) => item.id === view.id)?.name ?? "Project")
              : (doc.labels.find((item) => item.id === view.id)?.name ?? "Label");

  return (
    <ToolFrame slug="tasks" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="flex flex-col gap-4">
            <nav className="flex flex-col gap-1">
              <NavButton active={view.kind === "inbox"} onClick={() => setView({ kind: "inbox" })}>
                Inbox
              </NavButton>
              <NavButton active={view.kind === "today"} onClick={() => setView({ kind: "today" })}>
                Today
              </NavButton>
              <NavButton active={view.kind === "upcoming"} onClick={() => setView({ kind: "upcoming" })}>
                Upcoming
              </NavButton>
              <NavButton active={view.kind === "done"} onClick={() => setView({ kind: "done" })}>
                Completed
              </NavButton>
            </nav>
            <div>
              <p className="px-3 text-xs font-medium text-muted">Projects</p>
              <div className="mt-1 flex flex-col gap-1">
                {doc.projects
                  .filter((item) => item.id !== INBOX)
                  .map((project) => (
                    <NavButton key={project.id} active={view.kind === "project" && view.id === project.id} onClick={() => openProject(project.id)}>
                      {project.name}
                    </NavButton>
                  ))}
              </div>
              <form onSubmit={addProject} className="mt-2 flex gap-2">
                <TextInput value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New project" aria-label="New project" />
              </form>
            </div>
            <div>
              <p className="px-3 text-xs font-medium text-muted">Labels</p>
              <div className="mt-1 flex flex-col gap-1">
                {doc.labels.map((label) => (
                  <NavButton key={label.id} active={view.kind === "label" && view.id === label.id} onClick={() => setView({ kind: "label", id: label.id })}>
                    {label.name}
                  </NavButton>
                ))}
              </div>
              <form onSubmit={addLabel} className="mt-2">
                <TextInput value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="New label" aria-label="New label" />
              </form>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-3xl tracking-tight">{title}</h2>
                {view.kind === "project" && view.id !== INBOX ? (
                  <button
                    type="button"
                    className="text-sm text-muted hover:text-ink"
                    onClick={() => {
                      const id = view.id;
                      commit({
                        ...doc,
                        projects: doc.projects.filter((item) => item.id !== id),
                        sections: doc.sections.filter((item) => item.projectId !== id),
                        tasks: doc.tasks.map((task) => (task.projectId === id ? { ...task, projectId: INBOX, sectionId: "" } : task)),
                      });
                      setView({ kind: "inbox" });
                    }}
                  >
                    Delete project
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["list", "board", "month"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={layout === item}
                    onClick={() => setLayout(item)}
                    className={cn("h-9 rounded-full px-3 text-sm capitalize", layout === item ? "bg-pine text-paper" : "bg-card shadow-line")}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={addTask} className="mt-4 flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-line">
              <TextInput
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="Add a task"
                aria-label="Task title"
              />
              <div className="grid gap-2 sm:grid-cols-5">
                <select className={fieldClass} value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value, sectionId: "" })} aria-label="Project">
                  {doc.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select className={fieldClass} value={draft.sectionId} onChange={(event) => setDraft({ ...draft, sectionId: event.target.value })} aria-label="Section">
                  <option value="">No section</option>
                  {doc.sections
                    .filter((section) => section.projectId === draft.projectId)
                    .map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                </select>
                <input className={fieldClass} type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} aria-label="Due date" />
                <select className={fieldClass} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) as Priority })} aria-label="Priority">
                  <option value={1}>P1</option>
                  <option value={2}>P2</option>
                  <option value={3}>P3</option>
                  <option value={4}>P4</option>
                </select>
                <select className={fieldClass} value={draft.recur} onChange={(event) => setDraft({ ...draft, recur: event.target.value as Recur })} aria-label="Repeat">
                  {RECURS.map((recur) => (
                    <option key={recur} value={recur}>
                      {recurLabel(recur)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <Button type="submit" tone="primary">
                  Add task
                </Button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" className="max-w-xs" />
              <select className={cn(fieldClass, "max-w-36")} value={priorityFilter} onChange={(event) => setPriorityFilter(Number(event.target.value) as Priority | 0)} aria-label="Filter by priority">
                <option value={0}>Any priority</option>
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
                <option value={4}>P4</option>
              </select>
            </div>

            {view.kind === "project" ? (
              <form onSubmit={addSection} className="mt-3 flex max-w-sm gap-2">
                <TextInput value={sectionName} onChange={(event) => setSectionName(event.target.value)} placeholder="New section" aria-label="New section" />
                <Button type="submit" tone="quiet">
                  Add
                </Button>
              </form>
            ) : null}

            {layout === "month" ? (
              <Month
                cursor={monthCursor}
                tasks={doc.tasks.filter((task) => !task.done && task.due)}
                onPrev={() => setMonthCursor(shiftMonth(monthCursor, -1))}
                onNext={() => setMonthCursor(shiftMonth(monthCursor, 1))}
                onOpen={(id) => setOpenId(id)}
              />
            ) : layout === "board" ? (
              <Board
                doc={doc}
                tasks={topLevel}
                view={view}
                today={today}
                onToggle={toggle}
                onOpen={setOpenId}
                onMove={(taskId, change) => patch(taskId, change)}
              />
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {topLevel.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    doc={doc}
                    today={today}
                    open={openId === task.id}
                    children={doc.tasks.filter((item) => item.parentId === task.id)}
                    onToggle={toggle}
                    onOpen={() => setOpenId(openId === task.id ? null : task.id)}
                    onPatch={patch}
                    onRemove={removeTask}
                    onAddChild={(title) => {
                      if (doc.tasks.length >= MAX_TASKS) return;
                      commit({
                        ...doc,
                        tasks: [
                          ...doc.tasks,
                          {
                            id: nid(),
                            title: title.slice(0, 160),
                            notes: "",
                            projectId: task.projectId,
                            sectionId: task.sectionId,
                            parentId: task.id,
                            priority: task.priority,
                            labelIds: [],
                            due: "",
                            recur: "none",
                            done: false,
                          },
                        ],
                      });
                    }}
                  />
                ))}
                {topLevel.length === 0 ? <li className="py-6 text-sm text-muted">Nothing here.</li> : null}
              </ul>
            )}
            {layout !== "list" && openId ? (
              <Opened
                doc={doc}
                id={openId}
                today={today}
                onToggle={toggle}
                onPatch={patch}
                onRemove={removeTask}
                onClose={() => setOpenId(null)}
                onAddChild={(parent, childTitle) => {
                  if (!childTitle || doc.tasks.length >= MAX_TASKS) return;
                  commit({
                    ...doc,
                    tasks: [
                      ...doc.tasks,
                      {
                        id: nid(),
                        title: childTitle.slice(0, 160),
                        notes: "",
                        projectId: parent.projectId,
                        sectionId: parent.sectionId,
                        parentId: parent.id,
                        priority: parent.priority,
                        labelIds: [],
                        due: "",
                        recur: "none",
                        done: false,
                      },
                    ],
                  });
                }}
              />
            ) : null}
          </div>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}

function Opened({
  doc,
  id,
  today,
  onToggle,
  onPatch,
  onRemove,
  onClose,
  onAddChild,
}: {
  doc: Doc;
  id: string;
  today: string;
  onToggle: (task: Task) => void;
  onPatch: (id: string, change: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onAddChild: (parent: Task, title: string) => void;
}) {
  const task = doc.tasks.find((item) => item.id === id);
  if (!task) return null;
  return (
    <div className="mt-4 rounded-2xl bg-card px-4 shadow-line">
      <TaskRow
        task={task}
        doc={doc}
        today={today}
        open
        children={doc.tasks.filter((item) => item.parentId === task.id)}
        onToggle={onToggle}
        onOpen={onClose}
        onPatch={onPatch}
        onRemove={onRemove}
        onAddChild={(title) => onAddChild(task, title)}
      />
    </div>
  );
}

function todayIso(): string {
  return isoOf(new Date());
}

function shiftMonth(cursor: string, delta: number): string {
  const [year, month] = cursor.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full px-3 py-2 text-left text-sm", active ? "bg-pine text-paper" : "hover:bg-card")}>
      {children}
    </button>
  );
}

function TaskRow({
  task,
  doc,
  today,
  open,
  children,
  onToggle,
  onOpen,
  onPatch,
  onRemove,
  onAddChild,
}: {
  task: Task;
  doc: Doc;
  today: string;
  open: boolean;
  children: Task[];
  onToggle: (task: Task) => void;
  onOpen: () => void;
  onPatch: (id: string, change: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onAddChild: (title: string) => void;
}) {
  const [child, setChild] = useState("");
  const due = pretty(task.due, today);
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 size-4" checked={task.done} onChange={() => onToggle(task)} aria-label={`Complete ${task.title}`} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className={cn("block", task.done && "text-muted line-through")}>{task.title}</span>
          <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
            <span className={task.priority === 1 ? "text-fail" : task.priority === 2 ? "text-pine" : undefined}>P{task.priority}</span>
            {due ? <span className={task.due < today ? "text-fail" : undefined}>{due}</span> : null}
            {task.recur !== "none" ? <span>{recurLabel(task.recur)}</span> : null}
            {task.labelIds.map((id) => (
              <span key={id}>{doc.labels.find((label) => label.id === id)?.name}</span>
            ))}
          </span>
        </button>
      </div>
      {children.length > 0 ? (
        <ul className="mt-2 ml-7 space-y-2">
          {children.map((childTask) => (
            <li key={childTask.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={childTask.done} onChange={() => onToggle(childTask)} aria-label={`Complete ${childTask.title}`} />
              <span className={cn(childTask.done && "text-muted line-through")}>{childTask.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <div className="mt-3 ml-7 grid gap-2">
          <TextArea value={task.notes} onChange={(event) => onPatch(task.id, { notes: event.target.value.slice(0, 500) })} placeholder="Description" rows={3} className="min-h-20" />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={fieldClass} value={task.projectId} onChange={(event) => onPatch(task.id, { projectId: event.target.value, sectionId: "" })} aria-label="Move to project">
              {doc.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select className={fieldClass} value={task.sectionId} onChange={(event) => onPatch(task.id, { sectionId: event.target.value })} aria-label="Section">
              <option value="">No section</option>
              {doc.sections
                .filter((section) => section.projectId === task.projectId)
                .map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
            </select>
            <input className={fieldClass} type="date" value={task.due} onChange={(event) => onPatch(task.id, { due: event.target.value })} aria-label="Due date" />
            <select className={fieldClass} value={task.recur} onChange={(event) => onPatch(task.id, { recur: event.target.value as Recur })} aria-label="Repeat">
              {RECURS.map((recur) => (
                <option key={recur} value={recur}>
                  {recurLabel(recur)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4] as const).map((priority) => (
              <button key={priority} type="button" aria-pressed={task.priority === priority} onClick={() => onPatch(task.id, { priority })} className={cn("h-9 rounded-full px-3 text-sm", task.priority === priority ? "bg-pine text-paper" : "bg-card shadow-line")}>
                P{priority}
              </button>
            ))}
            {doc.labels.map((label) => {
              const on = task.labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onPatch(task.id, {
                      labelIds: on ? task.labelIds.filter((id) => id !== label.id) : [...task.labelIds, label.id].slice(0, 8),
                    })
                  }
                  className={cn("h-9 rounded-full px-3 text-sm", on ? "bg-pine text-paper" : "bg-card shadow-line")}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const title = child.trim();
              if (!title) return;
              onAddChild(title);
              setChild("");
            }}
          >
            <TextInput value={child} onChange={(event) => setChild(event.target.value)} placeholder="Add a subtask" aria-label="Subtask" />
          </form>
          <div className="flex gap-2">
            <Button tone="quiet" onClick={() => onRemove(task.id)}>
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Board({
  doc,
  tasks,
  view,
  today,
  onToggle,
  onOpen,
  onMove,
}: {
  doc: Doc;
  tasks: Task[];
  view: View;
  today: string;
  onToggle: (task: Task) => void;
  onOpen: (id: string) => void;
  onMove: (taskId: string, change: Partial<Task>) => void;
}) {
  const projectId = view.kind === "project" ? view.id : "";
  const columns =
    projectId && doc.sections.some((section) => section.projectId === projectId)
      ? [
          { id: "", name: "No section", projectId },
          ...doc.sections.filter((section) => section.projectId === projectId).map((section) => ({ id: section.id, name: section.name, projectId })),
        ]
      : ([1, 2, 3, 4] as const).map((priority) => ({ id: String(priority), name: `P${priority}`, projectId: "" }));
  const bySection = Boolean(projectId && doc.sections.some((section) => section.projectId === projectId));

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => {
        const cards = tasks.filter((task) => (bySection ? task.sectionId === column.id && task.projectId === projectId : String(task.priority) === column.id));
        return (
          <section
            key={column.name + column.id}
            className="rounded-2xl bg-paper-2 p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const taskId = event.dataTransfer.getData("text/plain");
              if (!taskId) return;
              if (bySection) onMove(taskId, { sectionId: column.id, projectId, parentId: "" });
              else onMove(taskId, { priority: Number(column.id) as Priority });
            }}
          >
            <h3 className="px-1 text-sm font-medium">{column.name}</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {cards.map((task) => (
                <li key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)} className="rounded-xl bg-card p-3 shadow-line">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 size-4" checked={task.done} onChange={() => onToggle(task)} aria-label={`Complete ${task.title}`} />
                    <button type="button" onClick={() => onOpen(task.id)} className="text-left text-sm">
                      {task.title}
                      {task.due ? <span className={cn("mt-1 block text-xs", task.due < today ? "text-fail" : "text-muted")}>{pretty(task.due, today)}</span> : null}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Month({
  cursor,
  tasks,
  onPrev,
  onNext,
  onOpen,
}: {
  cursor: string;
  tasks: Task[];
  onPrev: () => void;
  onNext: () => void;
  onOpen: (id: string) => void;
}) {
  const [year, month] = cursor.split("-").map(Number);
  const first = new Date(year, (month || 1) - 1, 1);
  const start = new Date(first);
  const weekday = start.getDay();
  start.setDate(1 - (weekday === 0 ? 6 : weekday - 1));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const label = first.toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <Button tone="quiet" onClick={onPrev}>
          Previous
        </Button>
        <p className="font-medium">{label}</p>
        <Button tone="quiet" onClick={onNext}>
          Next
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="px-1 py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const iso = isoOf(date);
          const inMonth = date.getMonth() === first.getMonth();
          const items = tasks.filter((task) => task.due === iso).slice(0, 3);
          return (
            <div key={iso} className={cn("min-h-20 rounded-xl bg-card p-1 shadow-line", !inMonth && "opacity-40")}>
              <p className="text-xs text-muted">{date.getDate()}</p>
              {items.map((task) => (
                <button key={task.id} type="button" onClick={() => onOpen(task.id)} className="mt-1 block w-full truncate rounded bg-paper-2 px-1 text-left text-xs">
                  {task.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
