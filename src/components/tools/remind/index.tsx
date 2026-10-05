import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { ToolFrame, ToolStatus, nid } from "@/components/tools/shared";
import { Button, TextInput, cn } from "@/components/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addDays, isoOf, prettyDate } from "@/lib/remind/dates";
import { cleanDoc, EMPTY_DOC, INBOX, withDescendants, type Doc, type Filter, type Task } from "@/lib/remind/model";
import type { Parsed } from "@/lib/remind/parse";
import { nextDue } from "@/lib/remind/recur";
import { recordCompletion } from "@/lib/remind/stats";
import {
  answerInvite,
  createShared,
  deleteFile,
  deleteTaskFiles,
  getFile,
  listFiles,
  loadShared,
  sharedChange,
  uploadFile,
  type FileMeta,
  type SharedOp,
  type SharedProject,
  type Invitation,
} from "@/lib/remind.functions";
import { byWhen, isMineToDo, matchesFilter, projectLabel, sameLabel, sharedKey, toItems, type Item, type ItemPatch, type View } from "./items";
import { QuickAdd } from "./quick-add";
import { TaskRow, type RowActions, type RowContext } from "./task-row";
import { Productivity } from "./productivity";
import { CalendarLink, EmailSettings, FilterEditor, PeoplePanel } from "./panels";
import { Board, Month } from "./layouts";

type Layout = "list" | "board" | "month";
type SharedState = { canShare: boolean; projects: SharedProject[]; invitations: Invitation[] };

const today0 = () => isoOf(new Date());

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Your labels by name, creating any that don't exist yet. */
function withLabels(doc: Doc, names: string[]): { doc: Doc; ids: string[] } {
  let labels = doc.labels;
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/^@/, "").slice(0, 32);
    if (!name) continue;
    let label = labels.find((entry) => sameLabel(entry.name, name));
    if (!label && labels.length < 40) {
      label = { id: nid(), name };
      labels = [...labels, label];
    }
    if (label && !ids.includes(label.id)) ids.push(label.id);
  }
  return { doc: { ...doc, labels }, ids };
}

function patchPersonal(doc: Doc, id: string, change: ItemPatch): Doc {
  let next = doc;
  let labelIds: string[] | undefined;
  if (change.labels) {
    const result = withLabels(doc, change.labels);
    next = result.doc;
    labelIds = result.ids;
  }
  return {
    ...next,
    tasks: next.tasks.map((task) => {
      if (task.id !== id) return task;
      const updated: Task = { ...task };
      if (change.title !== undefined) updated.title = change.title;
      if (change.notes !== undefined) updated.notes = change.notes;
      if (change.priority !== undefined) updated.priority = change.priority;
      if (change.due !== undefined) updated.due = change.due;
      if (change.time !== undefined) updated.time = change.time;
      if (change.recur !== undefined) updated.recur = change.recur;
      if (change.done !== undefined) updated.done = change.done;
      if (change.doneAt !== undefined) updated.doneAt = change.doneAt;
      if (change.sectionId !== undefined) updated.sectionId = change.sectionId;
      if (change.parentId !== undefined) updated.parentId = change.parentId;
      if (change.projectKey !== undefined && !change.projectKey.startsWith("shared:")) {
        updated.projectId = change.projectKey;
        updated.sectionId = "";
      }
      if (labelIds) updated.labelIds = labelIds;
      return updated;
    }),
  };
}

function sharedPatch(change: ItemPatch): Record<string, unknown> {
  const out: Record<string, unknown> = { ...change };
  delete out.projectKey;
  return out;
}

export function RemindTool() {
  const { user } = useCurrentUserState();
  const me = user?.id ?? "";
  const myName = user?.displayName || "You";
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<Doc>("tasks", EMPTY_DOC);
  const doc = useMemo(() => cleanDoc(data), [data]);
  const docRef = useRef(doc);
  docRef.current = doc;
  const [today, setToday] = useState(today0);
  const [shared, setShared] = useState<SharedState>({ canShare: false, projects: [], invitations: [] });
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [view, setView] = useState<View>({ kind: "today" });
  const [layout, setLayout] = useState<Layout>("list");
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<Filter | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [newShared, setNewShared] = useState("");
  const [newSection, setNewSection] = useState("");

  const commit = useCallback((next: Doc) => setData(next), [setData]);

  const refreshShared = useCallback(async () => {
    try {
      setShared(await loadShared());
    } catch {
      /* keep what we have */
    }
  }, []);

  useEffect(() => {
    if (!ready || blocked || loadError) return;
    void refreshShared();
    listFiles()
      .then(setFiles)
      .catch(() => setFiles([]));
    const timer = window.setInterval(() => {
      setToday(today0());
      if (document.visibilityState === "visible") void refreshShared();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [ready, blocked, loadError, refreshShared]);

  const items = useMemo(() => toItems(doc, shared.projects), [doc, shared.projects]);

  // Alerts for timed tasks while Remind is open.
  const alerted = useRef(new Set<string>());
  useEffect(() => {
    if (!doc.alerts || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const check = () => {
      const now = new Date();
      const day = isoOf(now);
      const minutes = now.getHours() * 60 + now.getMinutes();
      for (const item of items) {
        if (item.done || item.due !== day || !item.time || !isMineToDo(item, me)) continue;
        const [h, m] = item.time.split(":").map(Number);
        const at = h * 60 + m;
        const key = `${item.key}:${day}:${item.time}`;
        if (minutes >= at && minutes - at <= 10 && !alerted.current.has(key)) {
          alerted.current.add(key);
          new Notification(item.title, { body: `Due now · Midnry Remind`, tag: key });
        }
      }
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [doc.alerts, items, me]);

  // ── Shared changes ─────────────────────────────────────────────────────────

  const runShared = useCallback(
    async (projectId: string, op: SharedOp, optimistic?: (project: SharedProject) => SharedProject) => {
      if (optimistic) {
        setShared((current) => ({ ...current, projects: current.projects.map((project) => (project.id === projectId ? optimistic(project) : project)) }));
      }
      try {
        const result = await sharedChange({ data: { projectId, op } });
        setShared((current) => ({
          ...current,
          projects: current.projects.map((project) => (project.id === projectId ? { ...project, doc: result.doc, version: result.version } : project)),
        }));
      } catch (error) {
        toast.error(errorText(error, "That change didn't save."));
        void refreshShared();
      }
    },
    [refreshShared],
  );

  function award(base: Doc, priority: number, delta: 1 | -1): Doc {
    const { stats, earned } = recordCompletion(base.stats, today, priority, delta);
    if (delta === 1 && earned > 0) toast.success(`+${earned} points`, { duration: 1500 });
    return { ...base, stats };
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function patch(item: Item, change: ItemPatch) {
    if (change.projectKey !== undefined && change.projectKey !== item.projectKey) {
      const crossing = Boolean(item.shared) !== change.projectKey.startsWith("shared:") || (item.shared && change.projectKey !== item.projectKey);
      if (crossing) {
        void move(item, change.projectKey);
        return;
      }
    }
    if (item.shared) {
      const fields = sharedPatch(change);
      void runShared(item.shared, { type: "patchTask", id: item.id, patch: fields }, (project) => ({
        ...project,
        doc: { ...project.doc, tasks: project.doc.tasks.map((task) => (task.id === item.id ? { ...task, ...fields } : task)) },
      }));
      return;
    }
    commit(patchPersonal(docRef.current, item.id, change));
  }

  function toggle(item: Item) {
    const nowIso = new Date().toISOString();
    let change: ItemPatch;
    let delta: 1 | -1;
    if (item.done) {
      change = { done: false, doneAt: "" };
      delta = -1;
    } else if (item.recur !== "none") {
      change = { due: nextDue(item.due, item.recur, today) };
      delta = 1;
      toast(`Next: ${prettyDate(change.due as string, today)}`, { duration: 1500 });
    } else {
      change = { done: true, doneAt: nowIso };
      delta = 1;
    }
    if (item.shared) {
      commit(award(docRef.current, item.priority, delta));
      patch(item, change);
    } else {
      commit(award(patchPersonal(docRef.current, item.id, change), item.priority, delta));
    }
  }

  function remove(item: Item) {
    const scope: { id: string; parentId: string }[] = item.shared ? (shared.projects.find((project) => project.id === item.shared)?.doc.tasks ?? []) : doc.tasks;
    const drop = withDescendants(scope, item.id);
    if (item.shared) {
      void runShared(item.shared, { type: "removeTask", id: item.id }, (project) => ({
        ...project,
        doc: { ...project.doc, tasks: project.doc.tasks.filter((task) => !drop.has(task.id)) },
      }));
    } else {
      commit({ ...docRef.current, tasks: docRef.current.tasks.filter((task) => !drop.has(task.id)) });
    }
    if (files.some((file) => drop.has(file.taskId))) {
      setFiles((current) => current.filter((file) => !drop.has(file.taskId)));
      void deleteTaskFiles({ data: [...drop] }).catch(() => undefined);
    }
    if (openKey === item.key) setOpenKey(null);
  }

  function newPersonalTask(fields: Partial<Task> & { title: string; projectId: string }): Task {
    return {
      id: nid(),
      notes: "",
      sectionId: "",
      parentId: "",
      priority: 4,
      due: "",
      time: "",
      recur: "none",
      done: false,
      doneAt: "",
      createdAt: new Date().toISOString(),
      comments: [],
      labelIds: [],
      ...fields,
    };
  }

  function addChild(item: Item, title: string) {
    if (item.shared) {
      void runShared(item.shared, { type: "addTask", task: { title, parentId: item.id, sectionId: item.sectionId, priority: item.priority } });
      return;
    }
    const base = docRef.current;
    if (base.tasks.length >= 500) return toast.error("You've reached 500 tasks. Delete some finished ones first.");
    commit({ ...base, tasks: [...base.tasks, newPersonalTask({ title, projectId: item.projectKey, sectionId: item.sectionId, parentId: item.id, priority: item.priority })] });
  }

  function addComment(item: Item, body: string) {
    if (item.shared) {
      void runShared(item.shared, { type: "addComment", taskId: item.id, body });
      return;
    }
    const comment = { id: nid(), authorId: me, authorName: myName, body, at: new Date().toISOString() };
    commit({ ...docRef.current, tasks: docRef.current.tasks.map((task) => (task.id === item.id ? { ...task, comments: [...task.comments, comment].slice(-50) } : task)) });
  }

  function removeComment(item: Item, commentId: string) {
    if (item.shared) {
      void runShared(item.shared, { type: "removeComment", taskId: item.id, commentId });
      return;
    }
    commit({ ...docRef.current, tasks: docRef.current.tasks.map((task) => (task.id === item.id ? { ...task, comments: task.comments.filter((entry) => entry.id !== commentId) } : task)) });
  }

  async function upload(item: Item, file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Files can be up to 2 MB.");
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("That file couldn't be read."));
        reader.readAsDataURL(file);
      });
      const meta = await uploadFile({
        data: { taskId: item.id, projectId: item.shared, name: file.name, mime: file.type || "application/octet-stream", data: dataUrl.slice(dataUrl.indexOf(",") + 1) },
      });
      setFiles((current) => [...current, meta]);
      toast.success("File attached.");
    } catch (error) {
      toast.error(errorText(error, "Couldn't attach that file."));
    }
  }

  async function download(file: FileMeta) {
    try {
      const result = await getFile({ data: file.id });
      if (!result) throw new Error("That file is gone.");
      const bytes = Uint8Array.from(atob(result.data), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: result.mime }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      toast.error(errorText(error, "Couldn't open that file."));
    }
  }

  async function removeFile(file: FileMeta) {
    try {
      await deleteFile({ data: file.id });
      setFiles((current) => current.filter((entry) => entry.id !== file.id));
    } catch (error) {
      toast.error(errorText(error, "Couldn't remove that file."));
    }
  }

  /** Move a task (and its sub-tasks) between your list and a shared project. */
  async function move(item: Item, toKey: string) {
    const fromTasks: { id: string; parentId: string }[] = item.shared ? (shared.projects.find((project) => project.id === item.shared)?.doc.tasks ?? []) : doc.tasks;
    const ids = withDescendants(fromTasks, item.id);
    const moving = items.filter((entry) => entry.shared === item.shared && ids.has(entry.id));
    const ordered = [item, ...moving.filter((entry) => entry.id !== item.id)];
    try {
      if (toKey.startsWith("shared:")) {
        const target = toKey.slice("shared:".length);
        for (const entry of ordered) {
          await sharedChange({
            data: {
              projectId: target,
              op: {
                type: "addTask",
                task: {
                  id: entry.id,
                  title: entry.title,
                  notes: entry.notes,
                  parentId: entry.id === item.id ? "" : entry.parentId,
                  priority: entry.priority,
                  due: entry.due,
                  time: entry.time,
                  recur: entry.recur,
                  done: entry.done,
                  doneAt: entry.doneAt,
                  labels: entry.labels,
                  comments: entry.comments,
                  createdAt: entry.createdAt,
                },
              },
            },
          });
        }
      } else {
        let next = docRef.current;
        for (const entry of ordered) {
          const result = withLabels(next, entry.labels);
          next = {
            ...result.doc,
            tasks: [
              ...result.doc.tasks,
              newPersonalTask({
                id: entry.id,
                title: entry.title,
                notes: entry.notes,
                projectId: toKey,
                parentId: entry.id === item.id ? "" : entry.parentId,
                priority: entry.priority,
                due: entry.due,
                time: entry.time,
                recur: entry.recur,
                done: entry.done,
                doneAt: entry.doneAt,
                labelIds: result.ids,
                comments: entry.comments,
                createdAt: entry.createdAt,
              }),
            ],
          };
        }
        commit(next);
      }
      if (item.shared) await sharedChange({ data: { projectId: item.shared, op: { type: "removeTask", id: item.id } } });
      else commit({ ...docRef.current, tasks: docRef.current.tasks.filter((task) => !ids.has(task.id)) });
      await refreshShared();
      toast.success(`Moved to ${projectLabel(doc, shared.projects, toKey)}.`);
    } catch (error) {
      toast.error(errorText(error, "Couldn't move that task."));
      void refreshShared();
    }
  }

  function addFromQuick(parsed: Parsed, projectKey: string, createProject: string) {
    let base = docRef.current;
    let key = projectKey;
    if (createProject) {
      const id = nid();
      base = { ...base, projects: [...base.projects, { id, name: createProject.slice(0, 60) }] };
      key = id;
    }
    if (key.startsWith("shared:")) {
      if (base !== docRef.current) commit(base);
      void runShared(key.slice("shared:".length), {
        type: "addTask",
        task: { title: parsed.title, due: parsed.due, time: parsed.time, recur: parsed.recur, priority: parsed.priority ?? 4, labels: parsed.labels },
      });
      return;
    }
    if (base.tasks.length >= 500) {
      toast.error("You've reached 500 tasks. Delete some finished ones first.");
      return;
    }
    const result = withLabels(base, parsed.labels);
    commit({
      ...result.doc,
      tasks: [
        ...result.doc.tasks,
        newPersonalTask({
          title: parsed.title,
          projectId: key,
          due: parsed.due,
          time: parsed.time,
          recur: parsed.recur,
          priority: parsed.priority ?? 4,
          labelIds: result.ids,
        }),
      ],
    });
    if (parsed.due && view.kind === "today" && parsed.due > today) toast(`Added for ${prettyDate(parsed.due, today)}.`);
  }

  // ── Projects ───────────────────────────────────────────────────────────────

  function addPersonalProject(event: FormEvent) {
    event.preventDefault();
    const name = newProject.trim().slice(0, 60);
    if (!name) return;
    if (doc.projects.length >= 40) return toast.error("Forty projects is the limit.");
    const id = nid();
    commit({ ...doc, projects: [...doc.projects, { id, name }] });
    setNewProject("");
    go({ kind: "project", id });
  }

  async function addSharedProject(event: FormEvent) {
    event.preventDefault();
    const name = newShared.trim();
    if (!name) return;
    try {
      const { id } = await createShared({ data: { name } });
      setNewShared("");
      await refreshShared();
      go({ kind: "project", id: sharedKey(id) });
      setShowPeople(true);
    } catch (error) {
      toast.error(errorText(error, "Couldn't create it."));
    }
  }

  async function shareProject(projectId: string) {
    const project = doc.projects.find((entry) => entry.id === projectId);
    if (!project) return;
    const tasks = items.filter((item) => !item.shared && item.projectKey === projectId);
    const sections = doc.sections.filter((section) => section.projectId === projectId);
    try {
      const { id } = await createShared({
        data: {
          name: project.name,
          doc: {
            sections: sections.map((section) => ({ id: section.id, name: section.name })),
            tasks: tasks.map((task) => ({ ...task, labels: task.labels, assigneeId: "", createdBy: me })),
          },
        },
      });
      const moved = new Set(tasks.map((task) => task.id));
      commit({
        ...docRef.current,
        projects: docRef.current.projects.filter((entry) => entry.id !== projectId),
        sections: docRef.current.sections.filter((section) => section.projectId !== projectId),
        tasks: docRef.current.tasks.filter((task) => !moved.has(task.id)),
      });
      await refreshShared();
      go({ kind: "project", id: sharedKey(id) });
      setShowPeople(true);
      toast.success("Project shared. Invite people below.");
    } catch (error) {
      toast.error(errorText(error, "Couldn't share it."));
    }
  }

  function deletePersonalProject(projectId: string) {
    commit({
      ...doc,
      projects: doc.projects.filter((entry) => entry.id !== projectId),
      sections: doc.sections.filter((section) => section.projectId !== projectId),
      tasks: doc.tasks.map((task) => (task.projectId === projectId ? { ...task, projectId: INBOX, sectionId: "" } : task)),
    });
    go({ kind: "inbox" });
    toast("Project deleted. Its tasks moved to the Inbox.");
  }

  function addSection(event: FormEvent) {
    event.preventDefault();
    if (view.kind !== "project") return;
    const name = newSection.trim().slice(0, 60);
    if (!name) return;
    if (view.id.startsWith("shared:")) void runShared(view.id.slice(7), { type: "addSection", name });
    else commit({ ...doc, sections: [...doc.sections, { id: nid(), projectId: view.id, name }] });
    setNewSection("");
  }

  function removeSection(projectKey: string, sectionId: string) {
    if (projectKey.startsWith("shared:")) void runShared(projectKey.slice(7), { type: "removeSection", id: sectionId });
    else
      commit({
        ...doc,
        sections: doc.sections.filter((section) => section.id !== sectionId),
        tasks: doc.tasks.map((task) => (task.sectionId === sectionId ? { ...task, sectionId: "" } : task)),
      });
  }

  function go(next: View) {
    setView(next);
    setOpenKey(null);
    setMenuOpen(false);
    setEditingFilter(null);
    setShowPeople(false);
  }

  // ── What to show ───────────────────────────────────────────────────────────

  const projectOptions = [
    ...doc.projects.map((project) => ({ key: project.id, name: project.name })),
    ...shared.projects.map((project) => ({ key: sharedKey(project.id), name: `${project.name} (shared)` })),
  ];
  const labelNames = [...new Set([...doc.labels.map((label) => label.name), ...shared.projects.flatMap((project) => project.doc.tasks.flatMap((task) => task.labels))])];
  const sectionsOf = (key: string) =>
    key.startsWith("shared:")
      ? (shared.projects.find((project) => sharedKey(project.id) === key)?.doc.sections ?? [])
      : doc.sections.filter((section) => section.projectId === key).map((section) => ({ id: section.id, name: section.name }));
  const currentShared = view.kind === "project" && view.id.startsWith("shared:") ? shared.projects.find((project) => sharedKey(project.id) === view.id) : undefined;
  const currentFilter = view.kind === "filter" ? doc.filters.find((filter) => filter.id === view.id) : undefined;

  const needle = query.trim().toLowerCase();
  const visible = items
    .filter((item) => {
      if (needle && !`${item.title} ${item.notes}`.toLowerCase().includes(needle)) return false;
      switch (view.kind) {
        case "inbox":
          return !item.done && !item.shared && item.projectKey === INBOX;
        case "today":
          return !item.done && Boolean(item.due) && item.due <= today && isMineToDo(item, me);
        case "upcoming":
          return !item.done && Boolean(item.due) && item.due <= addDays(today, 13) && isMineToDo(item, me);
        case "assigned":
          return !item.done && Boolean(item.shared) && item.assigneeId === me;
        case "done":
          return item.done;
        case "project":
          return !item.done && item.projectKey === view.id;
        case "label":
          return !item.done && item.labels.some((label) => sameLabel(label, view.name));
        case "filter":
          return currentFilter ? matchesFilter(item, currentFilter, today, me) : false;
        default:
          return false;
      }
    })
    .sort(view.kind === "done" ? (a, b) => b.doneAt.localeCompare(a.doneAt) : byWhen);
  const shownKeys = new Set(visible.map((item) => `${item.shared ?? ""}:${item.id}`));
  const topLevel = visible.filter((item) => !item.parentId || !shownKeys.has(`${item.shared ?? ""}:${item.parentId}`)).slice(0, view.kind === "done" ? 150 : 1000);
  const kidsOf = (item: Item) => items.filter((entry) => entry.shared === item.shared && entry.parentId === item.id).sort(byWhen);

  const counts = {
    inbox: items.filter((item) => !item.done && !item.shared && item.projectKey === INBOX && !item.parentId).length,
    today: items.filter((item) => !item.done && item.due && item.due <= today && isMineToDo(item, me)).length,
    assigned: items.filter((item) => !item.done && item.shared && item.assigneeId === me).length,
  };

  const title =
    view.kind === "inbox"
      ? "Inbox"
      : view.kind === "today"
        ? "Today"
        : view.kind === "upcoming"
          ? "Upcoming"
          : view.kind === "assigned"
            ? "Assigned to me"
            : view.kind === "done"
              ? "Completed"
              : view.kind === "stats"
                ? "Productivity"
                : view.kind === "settings"
                  ? "Settings"
                  : view.kind === "project"
                    ? projectLabel(doc, shared.projects, view.id)
                    : view.kind === "label"
                      ? `@${view.name}`
                      : (currentFilter?.name ?? "Filter");

  const ctx: RowContext = {
    today,
    me,
    canShare: shared.canShare,
    projects: projectOptions,
    sectionsOf,
    membersOf: (id) => shared.projects.find((project) => project.id === id)?.members ?? [],
    labelNames,
    files,
    projectName: (key) => projectLabel(doc, shared.projects, key),
  };
  const actions: RowActions = { toggle, patch, remove, addChild, addComment, removeComment, upload, download, removeFile };
  const showProject = view.kind !== "project" && view.kind !== "inbox";
  const listView = !["stats", "settings"].includes(view.kind);
  const defaultProject = view.kind === "project" ? view.id : INBOX;
  const defaultDue = view.kind === "today" ? today : "";

  const renderRows = (rows: Item[]) => (
    <ul className="divide-y divide-line">
      {rows.map((item) => (
        <TaskRow
          key={item.key}
          item={item}
          kids={kidsOf(item)}
          ctx={ctx}
          actions={actions}
          open={openKey === item.key}
          onOpen={() => setOpenKey(openKey === item.key ? null : item.key)}
          showProject={showProject}
        />
      ))}
    </ul>
  );

  function grouped(): ReactNode {
    if (topLevel.length === 0) {
      return <Empty view={view} />;
    }
    if (view.kind === "today" || view.kind === "upcoming") {
      const overdue = topLevel.filter((item) => item.due < today);
      const days = [...new Set(topLevel.filter((item) => item.due >= today).map((item) => item.due))].sort();
      return (
        <>
          {overdue.length ? <Group title="Overdue" tone="text-fail">{renderRows(overdue)}</Group> : null}
          {days.map((day) => (
            <Group key={day} title={prettyDate(day, today)}>
              {renderRows(topLevel.filter((item) => item.due === day))}
            </Group>
          ))}
        </>
      );
    }
    if (view.kind === "project") {
      const sections = sectionsOf(view.id);
      const loose = topLevel.filter((item) => !item.sectionId || !sections.some((section) => section.id === item.sectionId));
      return (
        <>
          {loose.length ? renderRows(loose) : null}
          {sections.map((section) => (
            <Group
              key={section.id}
              title={section.name}
              action={
                <button type="button" className="min-h-11 px-2 text-xs text-muted hover:text-fail" onClick={() => removeSection(view.id, section.id)}>
                  Remove section
                </button>
              }
            >
              {renderRows(topLevel.filter((item) => item.sectionId === section.id))}
            </Group>
          ))}
        </>
      );
    }
    return renderRows(topLevel);
  }

  const openItem = openKey ? items.find((item) => item.key === openKey) : undefined;

  return (
    <ToolFrame slug="tasks" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
          <button
            type="button"
            className="flex min-h-11 items-center justify-between rounded-2xl bg-card px-4 text-left shadow-line lg:hidden"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="font-medium">☰ {title}</span>
            <span className="text-sm text-muted">{menuOpen ? "Close" : "Menu"}</span>
          </button>

          <aside className={cn("flex-col gap-5 lg:flex", menuOpen ? "flex" : "hidden")}>
            <nav className="flex flex-col gap-0.5">
              <Nav active={view.kind === "today"} onClick={() => go({ kind: "today" })} count={counts.today}>
                Today
              </Nav>
              <Nav active={view.kind === "upcoming"} onClick={() => go({ kind: "upcoming" })}>
                Upcoming
              </Nav>
              <Nav active={view.kind === "inbox"} onClick={() => go({ kind: "inbox" })} count={counts.inbox}>
                Inbox
              </Nav>
              {shared.projects.length ? (
                <Nav active={view.kind === "assigned"} onClick={() => go({ kind: "assigned" })} count={counts.assigned}>
                  Assigned to me
                </Nav>
              ) : null}
              <Nav active={view.kind === "done"} onClick={() => go({ kind: "done" })}>
                Completed
              </Nav>
              <Nav active={view.kind === "stats"} onClick={() => go({ kind: "stats" })}>
                Productivity · {doc.stats.points} pts
              </Nav>
            </nav>

            <SideGroup title="My projects">
              {doc.projects
                .filter((project) => project.id !== INBOX)
                .map((project) => (
                  <Nav key={project.id} active={view.kind === "project" && view.id === project.id} onClick={() => go({ kind: "project", id: project.id })}>
                    {project.name}
                  </Nav>
                ))}
              <form onSubmit={addPersonalProject}>
                <TextInput value={newProject} onChange={(event) => setNewProject(event.target.value)} placeholder="+ New project" aria-label="New project" className="h-10" />
              </form>
            </SideGroup>

            <SideGroup title="Shared projects">
              {shared.projects.map((project) => (
                <Nav key={project.id} active={view.kind === "project" && view.id === sharedKey(project.id)} onClick={() => go({ kind: "project", id: sharedKey(project.id) })}>
                  {`👥 ${project.name}`}
                </Nav>
              ))}
              {shared.canShare ? (
                <form onSubmit={(event) => void addSharedProject(event)}>
                  <TextInput value={newShared} onChange={(event) => setNewShared(event.target.value)} placeholder="+ New shared project" aria-label="New shared project" className="h-10" />
                </form>
              ) : (
                <p className="px-3 text-xs text-muted">
                  Share projects with{" "}
                  <Link to="/billing" className="underline underline-offset-2">
                    Midnry Pass
                  </Link>
                  .
                </p>
              )}
            </SideGroup>

            <SideGroup title="Filters">
              {doc.filters.map((filter) => (
                <Nav key={filter.id} active={view.kind === "filter" && view.id === filter.id} onClick={() => go({ kind: "filter", id: filter.id })}>
                  {filter.name}
                </Nav>
              ))}
              <button
                type="button"
                className="min-h-10 rounded-full px-3 text-left text-sm text-muted hover:bg-card hover:text-ink"
                onClick={() => {
                  go({ kind: "today" });
                  setEditingFilter({ id: nid(), name: "", priorities: [], labels: [], due: "any", projects: [], assignee: "any", query: "" });
                }}
              >
                + New filter
              </button>
            </SideGroup>

            {labelNames.length ? (
              <SideGroup title="Labels">
                {labelNames.map((name) => (
                  <Nav key={name} active={view.kind === "label" && sameLabel(view.name, name)} onClick={() => go({ kind: "label", name })}>
                    {`@${name}`}
                  </Nav>
                ))}
              </SideGroup>
            ) : null}

            <Nav active={view.kind === "settings"} onClick={() => go({ kind: "settings" })}>
              Settings and calendar
            </Nav>
          </aside>

          <div className="min-w-0">
            {shared.invitations.map((invite) => (
              <div key={invite.projectId} className="mb-4 flex flex-col gap-3 rounded-2xl bg-pine/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  <strong>{invite.invitedBy}</strong> invited you to the shared project <strong>{invite.projectName}</strong>.
                </p>
                <div className="flex gap-2">
                  <Button
                    tone="primary"
                    onClick={() =>
                      void answerInvite({ data: { projectId: invite.projectId, accept: true } })
                        .then(refreshShared)
                        .then(() => {
                          go({ kind: "project", id: sharedKey(invite.projectId) });
                          toast.success(`You joined ${invite.projectName}.`);
                        })
                        .catch((error: unknown) => toast.error(errorText(error, "Couldn't join.")))
                    }
                  >
                    Join
                  </Button>
                  <Button tone="quiet" onClick={() => void answerInvite({ data: { projectId: invite.projectId, accept: false } }).then(refreshShared)}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 break-words font-display text-3xl tracking-tight">{title}</h2>
              {listView ? (
                <div className="flex gap-1 rounded-full bg-card p-1 shadow-line" role="group" aria-label="Layout">
                  {(["list", "board", "month"] as const).map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      aria-pressed={layout === entry}
                      onClick={() => setLayout(entry)}
                      className={cn("h-9 rounded-full px-3 text-sm capitalize", layout === entry ? "bg-pine text-paper" : "text-muted hover:text-ink")}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {view.kind === "project" ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {currentShared ? (
                  <>
                    <span className="flex -space-x-2" aria-hidden>
                      {currentShared.members.slice(0, 5).map((member) =>
                        member.image ? (
                          <img key={member.userId} src={member.image} alt="" className="size-7 rounded-full object-cover ring-2 ring-paper" />
                        ) : (
                          <span key={member.userId} className="grid size-7 place-items-center rounded-full bg-pine/15 text-xs font-medium text-pine ring-2 ring-paper">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        ),
                      )}
                    </span>
                    <Button tone="quiet" className="min-h-9" onClick={() => setShowPeople((open) => !open)}>
                      {showPeople ? "Hide people" : `People (${currentShared.members.length})`}
                    </Button>
                  </>
                ) : view.id !== INBOX ? (
                  <>
                    <Button tone="quiet" className="min-h-9" onClick={() => (shared.canShare ? void shareProject(view.id) : toast("Sharing projects needs Midnry Pass."))}>
                      Share
                    </Button>
                    <Button tone="quiet" className="min-h-9" onClick={() => deletePersonalProject(view.id)}>
                      Delete project
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}

            {currentShared && showPeople ? (
              <PeoplePanel
                project={currentShared}
                me={me}
                canShare={shared.canShare}
                onChanged={refreshShared}
                onGone={() => go({ kind: "today" })}
              />
            ) : null}

            {editingFilter ? (
              <FilterEditor
                initial={editingFilter}
                labels={labelNames}
                projects={projectOptions}
                hasShared={shared.projects.length > 0}
                onCancel={() => setEditingFilter(null)}
                onSave={(filter) => {
                  const exists = doc.filters.some((entry) => entry.id === filter.id);
                  commit({ ...doc, filters: exists ? doc.filters.map((entry) => (entry.id === filter.id ? filter : entry)) : [...doc.filters, filter].slice(0, 20) });
                  setEditingFilter(null);
                  setView({ kind: "filter", id: filter.id });
                }}
                onDelete={
                  doc.filters.some((entry) => entry.id === editingFilter.id)
                    ? () => {
                        commit({ ...doc, filters: doc.filters.filter((entry) => entry.id !== editingFilter.id) });
                        go({ kind: "today" });
                      }
                    : undefined
                }
              />
            ) : null}

            {view.kind === "stats" ? (
              <Productivity
                stats={doc.stats}
                today={today}
                onGoals={(daily, weekly) =>
                  commit({
                    ...doc,
                    stats: { ...doc.stats, dailyGoal: Math.min(50, Math.max(1, Math.round(daily) || 1)), weeklyGoal: Math.min(300, Math.max(1, Math.round(weekly) || 1)) },
                  })
                }
              />
            ) : view.kind === "settings" ? (
              <div className="mt-4 space-y-4">
                <EmailSettings />
                <CalendarLink />
                <section className="rounded-2xl bg-card p-5 shadow-line">
                  <h3 className="font-medium">Alerts while Remind is open</h3>
                  <p className="mt-1 text-sm text-pretty text-muted">
                    Get a pop-up when a task with a time is due, while this page is open in your browser. For reminders when Midnry is closed, turn on email above or use the calendar link.
                  </p>
                  <Button
                    tone={doc.alerts ? "quiet" : "primary"}
                    className="mt-3"
                    onClick={() => {
                      if (doc.alerts) return commit({ ...doc, alerts: false });
                      if (typeof Notification === "undefined") return toast.error("This browser can't show alerts.");
                      void Notification.requestPermission().then((permission) => {
                        if (permission === "granted") commit({ ...docRef.current, alerts: true });
                        else toast.error("Alerts are blocked. Allow notifications for this site in your browser settings.");
                      });
                    }}
                  >
                    {doc.alerts ? "Turn alerts off" : "Turn alerts on"}
                  </Button>
                </section>
              </div>
            ) : (
              <>
                {view.kind !== "done" && view.kind !== "assigned" ? (
                  <div className="mt-4">
                    <QuickAdd today={today} projects={projectOptions.map((project) => ({ key: project.key, name: project.name.replace(/ \(shared\)$/, "") }))} defaultProject={defaultProject} defaultDue={defaultDue} onAdd={addFromQuick} />
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search tasks" className="h-10 max-w-xs" />
                  {view.kind === "filter" && currentFilter ? (
                    <Button tone="quiet" className="min-h-10" onClick={() => setEditingFilter(currentFilter)}>
                      Edit filter
                    </Button>
                  ) : null}
                  {view.kind === "project" ? (
                    <form onSubmit={addSection} className="flex gap-2">
                      <TextInput value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="+ Section" aria-label="New section" className="h-10 w-40" />
                    </form>
                  ) : null}
                </div>

                {layout === "board" ? (
                  <>
                    <Board
                      items={topLevel}
                      sections={view.kind === "project" ? sectionsOf(view.id) : null}
                      today={today}
                      onToggle={toggle}
                      onOpen={setOpenKey}
                      onMove={patch}
                    />
                    {openItem ? <div className="mt-4 rounded-2xl bg-card px-4 shadow-line">{renderRows([openItem])}</div> : null}
                  </>
                ) : layout === "month" ? (
                  <>
                    <Month items={view.kind === "today" || view.kind === "upcoming" ? items.filter((item) => isMineToDo(item, me)) : visible} today={today} onOpen={setOpenKey} />
                    {openItem ? <div className="mt-4 rounded-2xl bg-card px-4 shadow-line">{renderRows([openItem])}</div> : null}
                  </>
                ) : (
                  <div className="mt-4">{grouped()}</div>
                )}
              </>
            )}
          </div>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}

function Nav({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-10 items-center justify-between gap-2 rounded-full px-3 text-left text-sm", active ? "bg-pine text-paper" : "hover:bg-card")}
    >
      <span className="min-w-0 truncate">{children}</span>
      {count ? <span className={cn("text-xs", active ? "opacity-80" : "text-muted")}>{count}</span> : null}
    </button>
  );
}

function SideGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 text-xs font-medium text-muted">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function Group({ title, tone, action, children }: { title: string; tone?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-1">
        <h3 className={cn("text-sm font-medium", tone)}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ view }: { view: View }) {
  const text =
    view.kind === "today"
      ? "Nothing due today. Add a task above, or enjoy the free time."
      : view.kind === "upcoming"
        ? "Nothing in the next two weeks."
        : view.kind === "done"
          ? "Finished tasks show up here."
          : view.kind === "assigned"
            ? "Nobody has given you a task yet."
            : "No tasks here yet. Add one above.";
  return <p className="py-8 text-center text-sm text-muted">{text}</p>;
}
