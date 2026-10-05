import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { prettyDate, prettyTime } from "@/lib/remind/dates";
import { parseTask } from "@/lib/remind/parse";
import { RECUR_PRESETS, recurLabel } from "@/lib/remind/recur";
import type { Priority } from "@/lib/remind/model";
import type { FileMeta, Member } from "@/lib/remind.functions";
import { Button, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { PRIORITY_STYLE, sameLabel, type Item, type ItemPatch } from "./items";

export type RowContext = {
  today: string;
  me: string;
  canShare: boolean;
  projects: { key: string; name: string }[];
  sectionsOf: (projectKey: string) => { id: string; name: string }[];
  membersOf: (sharedId: string) => Member[];
  labelNames: string[];
  files: FileMeta[];
  projectName: (key: string) => string;
};

export type RowActions = {
  toggle: (item: Item) => void;
  patch: (item: Item, change: ItemPatch) => void;
  remove: (item: Item) => void;
  addChild: (item: Item, title: string) => void;
  addComment: (item: Item, body: string) => void;
  removeComment: (item: Item, commentId: string) => void;
  upload: (item: Item, file: File) => Promise<void>;
  download: (file: FileMeta) => void;
  removeFile: (file: FileMeta) => void;
};

function Check({ item, onToggle }: { item: Item; onToggle: () => void }) {
  const style = PRIORITY_STYLE[item.priority];
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.done}
      aria-label={`${item.done ? "Mark not done" : "Complete"}: ${item.title}`}
      onClick={onToggle}
      className="-m-2.5 grid size-11 shrink-0 place-items-center"
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full border-2 text-[11px] leading-none transition-colors",
          style.ring,
          item.done ? `${style.fill} border-transparent text-paper` : item.priority < 4 ? "bg-card" : "border-muted bg-card",
        )}
      >
        {item.done ? "✓" : ""}
      </span>
    </button>
  );
}

function Meta({ item, ctx, showProject }: { item: Item; ctx: RowContext; showProject: boolean }) {
  const parts: { text: string; tone?: string }[] = [];
  if (item.due) {
    const overdue = !item.done && item.due < ctx.today;
    parts.push({
      text: `${prettyDate(item.due, ctx.today)}${item.time ? ` ${prettyTime(item.time)}` : ""}`,
      tone: overdue ? "text-fail" : item.due === ctx.today ? "text-pine" : undefined,
    });
  }
  if (item.recur !== "none") parts.push({ text: `↻ ${recurLabel(item.recur)}` });
  for (const label of item.labels) parts.push({ text: `@${label}` });
  if (item.comments.length) parts.push({ text: `💬 ${item.comments.length}` });
  const files = ctx.files.filter((file) => file.taskId === item.id).length;
  if (files) parts.push({ text: `📎 ${files}` });
  if (item.shared && item.assigneeId) {
    const who = ctx.membersOf(item.shared).find((member) => member.userId === item.assigneeId);
    parts.push({ text: item.assigneeId === ctx.me ? "→ You" : `→ ${who?.name ?? "Someone"}` });
  }
  if (showProject) parts.push({ text: ctx.projectName(item.projectKey) });
  if (parts.length === 0) return null;
  return (
    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
      {parts.map((part, index) => (
        <span key={index} className={part.tone}>
          {part.text}
        </span>
      ))}
    </span>
  );
}

export function TaskRow({
  item,
  kids,
  ctx,
  actions,
  open,
  onOpen,
  showProject,
}: {
  item: Item;
  kids: Item[];
  ctx: RowContext;
  actions: RowActions;
  open: boolean;
  onOpen: () => void;
  showProject: boolean;
}) {
  const doneKids = kids.filter((kid) => kid.done).length;
  return (
    <li className="py-2.5">
      <div className="flex items-start gap-3">
        <span className="pt-0.5">
          <Check item={item} onToggle={() => actions.toggle(item)} />
        </span>
        <button type="button" onClick={onOpen} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className={cn("block break-words", item.done && "text-muted line-through")}>{item.title}</span>
          {item.notes && !open ? <span className="mt-0.5 line-clamp-1 block text-sm text-muted">{item.notes}</span> : null}
          <Meta item={item} ctx={ctx} showProject={showProject} />
          {kids.length > 0 ? (
            <span className="mt-0.5 block text-xs text-muted">
              {doneKids}/{kids.length} sub-tasks
            </span>
          ) : null}
        </button>
      </div>
      {kids.length > 0 && !open ? (
        <ul className="ml-8 mt-1">
          {kids.map((kid) => (
            <li key={kid.key} className="flex items-center gap-3 py-1 text-sm">
              <Check item={kid} onToggle={() => actions.toggle(kid)} />
              <span className={cn("min-w-0 break-words", kid.done && "text-muted line-through")}>{kid.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? <Detail item={item} kids={kids} ctx={ctx} actions={actions} onClose={onOpen} /> : null}
    </li>
  );
}

function Detail({ item, kids, ctx, actions, onClose }: { item: Item; kids: Item[]; ctx: RowContext; actions: RowActions; onClose: () => void }) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes);
  const [child, setChild] = useState("");
  const [comment, setComment] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [customRepeat, setCustomRepeat] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setTitle(item.title), [item.title]);
  useEffect(() => setNotes(item.notes), [item.notes]);

  const sections = ctx.sectionsOf(item.projectKey);
  const files = ctx.files.filter((file) => file.taskId === item.id);
  const repeatOptions = RECUR_PRESETS.some((preset) => preset.spec === item.recur)
    ? RECUR_PRESETS
    : [...RECUR_PRESETS, { spec: item.recur, label: recurLabel(item.recur) }];
  const allLabels = [...new Set([...ctx.labelNames, ...item.labels].map((name) => name.trim()).filter(Boolean))];
  const sameScopeProjects = ctx.projects;

  function saveText() {
    const nextTitle = title.trim();
    const change: ItemPatch = {};
    if (nextTitle && nextTitle !== item.title) change.title = nextTitle;
    if (notes !== item.notes) change.notes = notes;
    if (Object.keys(change).length) actions.patch(item, change);
  }

  function applyCustomRepeat(event: FormEvent) {
    event.preventDefault();
    const rule = parseTask(`x ${customRepeat.startsWith("every") ? customRepeat : `every ${customRepeat}`}`, ctx.today).recur;
    if (rule === "none") return;
    actions.patch(item, { recur: rule, due: item.due || ctx.today });
    setCustomRepeat("");
  }

  return (
    <div className="ml-8 mt-3 space-y-4 rounded-2xl bg-paper p-4">
      <div className="space-y-2">
        <TextInput value={title} onChange={(event) => setTitle(event.target.value.slice(0, 200))} onBlur={saveText} aria-label="Task name" />
        <TextArea
          value={notes}
          onChange={(event) => setNotes(event.target.value.slice(0, 2000))}
          onBlur={saveText}
          placeholder="Description"
          rows={3}
          className="min-h-20"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Date</span>
          <input className={fieldClass} type="date" value={item.due} onChange={(event) => actions.patch(item, { due: event.target.value, ...(event.target.value ? {} : { time: "", recur: "none" }) })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Time</span>
          <input className={fieldClass} type="time" value={item.time} onChange={(event) => actions.patch(item, { time: event.target.value, due: item.due || ctx.today })} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Repeat</span>
          <select className={fieldClass} value={item.recur} onChange={(event) => actions.patch(item, { recur: event.target.value, due: item.due || ctx.today })}>
            {repeatOptions.map((option) => (
              <option key={option.spec} value={option.spec}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <form onSubmit={applyCustomRepeat} className="flex gap-2">
        <TextInput value={customRepeat} onChange={(event) => setCustomRepeat(event.target.value)} placeholder="Custom repeat, e.g. every Tuesday" aria-label="Custom repeat" />
        <Button type="submit" tone="quiet" disabled={!customRepeat.trim()}>
          Set
        </Button>
      </form>

      <div>
        <p className="mb-1 text-sm text-muted">Priority</p>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4] as Priority[]).map((priority) => (
            <button
              key={priority}
              type="button"
              aria-pressed={item.priority === priority}
              onClick={() => actions.patch(item, { priority })}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm",
                item.priority === priority ? "bg-ink text-paper" : "bg-card shadow-line",
              )}
            >
              <span aria-hidden className={cn("size-2.5 rounded-full", PRIORITY_STYLE[priority].fill)} />P{priority}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Project</span>
          <select className={fieldClass} value={item.projectKey} onChange={(event) => actions.patch(item, { projectKey: event.target.value })}>
            {sameScopeProjects.map((project) => (
              <option key={project.key} value={project.key}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Section</span>
          <select className={fieldClass} value={item.sectionId} onChange={(event) => actions.patch(item, { sectionId: event.target.value })}>
            <option value="">No section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>
        {item.shared ? (
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">Assigned to</span>
            <select className={fieldClass} value={item.assigneeId} onChange={(event) => actions.patch(item, { assigneeId: event.target.value })}>
              <option value="">Nobody</option>
              {ctx.membersOf(item.shared).map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.userId === ctx.me ? `${member.name} (you)` : member.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div>
        <p className="mb-1 text-sm text-muted">Labels</p>
        <div className="flex flex-wrap gap-2">
          {allLabels.map((label) => {
            const on = item.labels.some((own) => sameLabel(own, label));
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => actions.patch(item, { labels: on ? item.labels.filter((own) => !sameLabel(own, label)) : [...item.labels, label] })}
                className={cn("h-9 rounded-full px-3 text-sm", on ? "bg-pine text-paper" : "bg-card shadow-line")}
              >
                @{label}
              </button>
            );
          })}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const name = newLabel.trim().replace(/^@/, "").slice(0, 32);
              if (!name || item.labels.some((own) => sameLabel(own, name))) return;
              actions.patch(item, { labels: [...item.labels, name] });
              setNewLabel("");
            }}
          >
            <TextInput value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="New label" aria-label="New label" className="h-9 w-32" />
          </form>
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm text-muted">Sub-tasks</p>
        {kids.length ? (
          <ul>
            {kids.map((kid) => (
              <li key={kid.key} className="flex items-center gap-3 py-1 text-sm">
                <Check item={kid} onToggle={() => actions.toggle(kid)} />
                <span className={cn("min-w-0 flex-1 break-words", kid.done && "text-muted line-through")}>{kid.title}</span>
                <button type="button" className="min-h-11 px-2 text-xs text-muted hover:text-fail" onClick={() => actions.remove(kid)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="mt-1"
          onSubmit={(event) => {
            event.preventDefault();
            const value = child.trim();
            if (!value) return;
            actions.addChild(item, value);
            setChild("");
          }}
        >
          <TextInput value={child} onChange={(event) => setChild(event.target.value)} placeholder="Add a sub-task" aria-label="Add a sub-task" />
        </form>
      </div>

      <div>
        <p className="mb-1 text-sm text-muted">Comments</p>
        {item.comments.length ? (
          <ul className="space-y-2">
            {item.comments.map((entry) => (
              <li key={entry.id} className="rounded-xl bg-card p-3 text-sm shadow-line">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{entry.authorId === ctx.me ? "You" : entry.authorName}</span>
                  <span className="text-xs text-muted">{entry.at ? new Date(entry.at).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : ""}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">{entry.body}</p>
                {entry.authorId === ctx.me ? (
                  <button type="button" className="mt-1 text-xs text-muted hover:text-fail" onClick={() => actions.removeComment(item, entry.id)}>
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const body = comment.trim();
            if (!body) return;
            actions.addComment(item, body);
            setComment("");
          }}
        >
          <TextInput value={comment} onChange={(event) => setComment(event.target.value.slice(0, 1000))} placeholder="Write a comment" aria-label="Write a comment" />
          <Button type="submit" tone="quiet" disabled={!comment.trim()}>
            Send
          </Button>
        </form>
      </div>

      <div>
        <p className="mb-1 text-sm text-muted">Files</p>
        {files.length ? (
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-2 text-sm">
                <button type="button" className="min-h-11 min-w-0 flex-1 truncate text-left underline underline-offset-4" onClick={() => actions.download(file)}>
                  📎 {file.name}
                </button>
                <span className="shrink-0 text-xs text-muted">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                <button type="button" className="min-h-11 shrink-0 px-2 text-xs text-muted hover:text-fail" onClick={() => actions.removeFile(file)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {ctx.canShare ? (
          <label className="mt-1 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-card px-4 text-sm shadow-line hover:bg-paper-2">
            {uploading ? "Uploading…" : "Attach a file"}
            <input
              type="file"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setUploading(true);
                void actions.upload(item, file).finally(() => setUploading(false));
              }}
            />
          </label>
        ) : (
          <p className="text-sm text-muted">
            Attach files with{" "}
            <Link to="/billing" className="text-ink underline underline-offset-4">
              Midnry Pass
            </Link>
            .
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button tone="quiet" onClick={onClose}>
          Close
        </Button>
        {confirmDelete ? (
          <>
            <Button tone="primary" className="bg-fail" onClick={() => actions.remove(item)}>
              Yes, delete{kids.length ? ` with ${kids.length} sub-tasks` : ""}
            </Button>
            <Button tone="quiet" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button tone="quiet" onClick={() => setConfirmDelete(true)}>
            Delete task
          </Button>
        )}
      </div>
    </div>
  );
}
