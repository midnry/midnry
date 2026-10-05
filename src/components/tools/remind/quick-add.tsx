import { useMemo, useState, type FormEvent } from "react";
import { parseTask, type Parsed } from "@/lib/remind/parse";
import { prettyDate, prettyTime } from "@/lib/remind/dates";
import { recurLabel } from "@/lib/remind/recur";
import { Button, cn } from "@/components/ui";
import { PRIORITY_STYLE } from "./items";

const EXAMPLES = [
  "Call mum tomorrow at 6pm @home",
  "Pay rent every 25th p1",
  "Gym every mon and thu 7am",
  "Submit report friday p2 #Work",
  "Water the plants every 3 days",
];

export function QuickAdd({
  today,
  projects,
  defaultProject,
  defaultDue,
  onAdd,
}: {
  today: string;
  /** Project names you can send a task to with #Name, by key. */
  projects: { key: string; name: string }[];
  defaultProject: string;
  defaultDue: string;
  onAdd: (parsed: Parsed, projectKey: string, newProject: string) => void;
}) {
  const [text, setText] = useState("");
  const [example] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  const parsed = useMemo(() => parseTask(text, today), [text, today]);
  const match = parsed.project
    ? projects.find((project) => project.name.replace(/\s+/g, "").toLowerCase() === parsed.project.toLowerCase())
    : undefined;
  const due = parsed.due || defaultDue;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!parsed.title) return;
    onAdd({ ...parsed, due }, match?.key ?? defaultProject, parsed.project && !match ? parsed.project : "");
    setText("");
  }

  const chips: { label: string; tone?: string }[] = [];
  if (due) chips.push({ label: `${prettyDate(due, today)}${parsed.time ? `, ${prettyTime(parsed.time)}` : ""}` });
  else if (parsed.time) chips.push({ label: prettyTime(parsed.time) });
  if (parsed.recur !== "none") chips.push({ label: recurLabel(parsed.recur) });
  if (parsed.priority) chips.push({ label: `P${parsed.priority}`, tone: PRIORITY_STYLE[parsed.priority].text });
  for (const label of parsed.labels) chips.push({ label: `@${label}` });
  if (parsed.project) chips.push({ label: match ? `#${match.name}` : `New project: ${parsed.project}` });

  return (
    <form onSubmit={submit} className="rounded-2xl bg-card p-3 shadow-line">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="remind-quick-add">
          Add a task
        </label>
        <input
          id="remind-quick-add"
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 300))}
          placeholder={`Add a task, e.g. "${example}"`}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 text-base outline-none placeholder:text-muted focus-visible:border-pine"
        />
        <Button type="submit" tone="primary" disabled={!parsed.title}>
          Add
        </Button>
      </div>
      {text.trim() ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm" aria-live="polite">
          <span className="text-muted">{parsed.title ? `“${parsed.title}”` : "Add a few words for the task"}</span>
          {chips.map((chip) => (
            <span key={chip.label} className={cn("rounded-full bg-paper-2 px-2.5 py-0.5", chip.tone)}>
              {chip.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Type naturally: dates (tomorrow, fri, 12 Oct), times (6pm), repeats (every Tuesday), p1–p4, @label, #project.
        </p>
      )}
    </form>
  );
}
