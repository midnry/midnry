import { useEffect, useId, useMemo, useRef, useState } from "react";
import { parseTask, type Parsed } from "@/lib/remind/parse";
import { parseIso, prettyDate, prettyTime } from "@/lib/remind/dates";
import { nextDue, recurLabel } from "@/lib/remind/recur";
import { pointsFor } from "@/lib/remind/stats";
import { PRIORITY_STYLE } from "@/components/tools/remind/items";
import { cn } from "@/components/ui";
import { demoInput, useDemoTouch, useReducedMotion, useToday } from "./demo-kit";

/**
 * Remind's quick-add box with sample text. It runs the app's own parser
 * (src/lib/remind/parse.ts) on whatever the visitor types, in the browser.
 * Nothing is sent or saved.
 *
 * The default view is deliberately small: the sentence, the one task it
 * becomes, and a few plain examples. Priorities, projects, labels and the
 * piece-by-piece breakdown sit behind "Explore more features".
 */

const SAMPLE = "Call mum tomorrow at 6pm";
/** Plain sentences: a date and a time, nothing to learn. */
const EXAMPLES = [SAMPLE, "Dentist on Friday at 10am", "Gym every Monday at 7am"];
/** The richer syntax, shown inside the disclosure. */
const MORE_EXAMPLES = ["Pay rent every 25th at 9am p1 #Home", "Call mum tomorrow at 6pm @family", "Gym every mon and thu 7am p2", "Water the plants every 3 days"];

/** Which words of the sentence Remind picked up (everything that is not left in the title). */
function markWords(input: string, title: string): { word: string; picked: boolean }[] {
  const norm = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const kept = title.split(/\s+/).map(norm).filter(Boolean);
  let next = 0;
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const key = norm(word);
      if (!key) return { word, picked: false };
      if (next < kept.length && key === kept[next]) {
        next += 1;
        return { word, picked: false };
      }
      return { word, picked: true };
    });
}

function whenText(parsed: Parsed, today: string): string {
  if (!parsed.due) return "";
  return `${prettyDate(parsed.due, today)}${parsed.time ? `, ${prettyTime(parsed.time)}` : ""}`;
}

/** The calendar date, so "Tomorrow" also reads as "Thu 22 Oct". */
function calendarDate(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function RemindDemo() {
  const inputId = useId();
  const today = useToday();
  const reduced = useReducedMotion();
  const touch = useDemoTouch();
  const [text, setText] = useState(SAMPLE);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState("");
  const changed = useRef(false);
  const timer = useRef<number | null>(null);

  function stopTyping() {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }
  useEffect(() => stopTyping, []);

  /** Fill the box with an example: typed out letter by letter, or all at once for reduced motion. */
  function play(target: string) {
    stopTyping();
    changed.current = true;
    touch();
    setDone(false);
    if (reduced) {
      setText(target);
      return;
    }
    let shown = 0;
    setText("");
    timer.current = window.setInterval(() => {
      shown += 1;
      setText(target.slice(0, shown));
      if (shown >= target.length) stopTyping();
    }, 28);
  }

  const parsed = useMemo(() => (today ? parseTask(text, today) : null), [text, today]);
  const words = parsed ? markWords(text, parsed.title) : [];
  const priority = parsed?.priority ?? 4;
  const style = PRIORITY_STYLE[priority];
  const points = pointsFor(priority);

  // A short spoken summary once the text settles, for screen readers. Silent until the visitor changes something.
  useEffect(() => {
    if (!parsed || !today || !changed.current) return;
    const id = window.setTimeout(() => {
      if (!parsed.title) return setAnnounce("Add a few words for the task.");
      const parts = [parsed.title, whenText(parsed, today) || "no date", parsed.recur !== "none" ? recurLabel(parsed.recur) : "", parsed.priority ? `priority ${parsed.priority}` : ""];
      setAnnounce(`Task: ${parts.filter(Boolean).join(", ")}.`);
    }, 700);
    return () => window.clearTimeout(id);
  }, [parsed, today]);

  const rows: { term: string; value: string; set: boolean; dot?: string }[] = parsed
    ? [
        { term: "When", value: whenText(parsed, today ?? "") || "No date", set: Boolean(parsed.due) },
        { term: "Repeats", value: recurLabel(parsed.recur), set: parsed.recur !== "none" },
        { term: "Priority", value: parsed.priority ? style.name : "Priority 4 (the default)", set: Boolean(parsed.priority), dot: style.fill },
        { term: "Project", value: parsed.project ? `#${parsed.project}` : "Inbox", set: Boolean(parsed.project) },
        { term: "Labels", value: parsed.labels.length ? parsed.labels.map((label) => `@${label}`).join(" ") : "None", set: parsed.labels.length > 0 },
        {
          term: "Points",
          value: done
            ? `+${points} earned${parsed.recur !== "none" && parsed.due ? `. Next: ${prettyDate(nextDue(parsed.due, parsed.recur, today ?? ""), today ?? "")}` : ""}`
            : `+${points} when you finish it`,
          set: done,
        },
      ]
    : [];

  const exampleButton =
    "inline-flex min-h-11 items-center rounded-full bg-card px-4 text-left text-sm text-ink shadow-line hover:bg-paper-2 motion-safe:transition-colors";

  return (
    <div>
      <p className="sr-only" aria-live="polite" data-demo-live>
        {announce}
      </p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-4">
        {/* 1. The sentence. */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <label htmlFor={inputId} className="sr-only">
            Type a reminder
          </label>
          <input
            id={inputId}
            value={text}
            onChange={(event) => {
              stopTyping();
              changed.current = true;
              touch();
              setDone(false);
              setText(event.target.value.slice(0, 120));
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. Call mum tomorrow at 6pm"
            className={cn(demoInput, "h-14 rounded-2xl px-4 text-lg")}
          />
        </div>

        {/* 2. The task it becomes. */}
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {!parsed || !today ? (
            <div className="h-[5.5rem] animate-pulse rounded-2xl bg-paper-2" />
          ) : (
            <div className="rounded-2xl border border-line bg-paper px-4 py-3.5 sm:px-5" data-demo-task>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={`${done ? "Mark not done" : "Complete"}: ${parsed.title || "task"}`}
                  disabled={!parsed.title}
                  onClick={() => {
                    touch();
                    setDone((value) => !value);
                  }}
                  className="-m-2.5 grid size-11 shrink-0 place-items-center disabled:opacity-50"
                >
                  <span
                    className={cn(
                      "grid size-5 place-items-center rounded-full border-2 text-[11px] leading-none text-paper motion-safe:transition-colors",
                      style.ring,
                      done ? `${style.fill} border-transparent` : priority < 4 ? "bg-card" : "border-muted bg-card",
                    )}
                  >
                    {done ? "✓" : ""}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-lg leading-snug break-words", done && "text-muted line-through")}>
                    {parsed.title || <span className="text-muted">Add a few words for the task</span>}
                  </p>
                  {parsed.due ? (
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      <span key={whenText(parsed, today)} className="anim-rise inline-flex items-center gap-1.5 font-semibold text-pine" data-demo-when>
                        <svg viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                          <rect x="3.5" y="4.5" width="13" height="12" rx="2.5" />
                          <path d="M3.5 8.5h13M7 3v3M13 3v3" />
                        </svg>
                        {whenText(parsed, today)}
                      </span>
                      <span className="text-muted">{calendarDate(parsed.due)}</span>
                      {parsed.recur !== "none" ? <span className="text-muted">· ↻ {recurLabel(parsed.recur)}</span> : null}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">No date yet. Try adding “tomorrow at 6pm”.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. An invitation to try another. */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:col-start-1 lg:row-start-2">
          <span className="mr-1 text-sm text-muted">Try another:</span>
          {EXAMPLES.filter((example) => example !== text).slice(0, 2).map((example) => (
            <button key={example} type="button" onClick={() => play(example)} className={exampleButton}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Everything else Remind understands, for the curious. */}
      <details className="group mt-4 rounded-2xl border border-line" data-demo-more>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2 text-sm font-semibold text-ink hover:bg-paper-2/60 [&::-webkit-details-marker]:hidden">
          Explore more features
          <span className="flex items-center gap-2 font-normal text-muted">
            <span className="hidden sm:inline">Repeats, priorities, projects and labels</span>
            <svg viewBox="0 0 20 20" className="size-4 shrink-0 motion-safe:transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 7.5l5 5 5-5" />
            </svg>
          </span>
        </summary>
        <div className="grid gap-6 border-t border-line p-4 sm:p-5 lg:grid-cols-2 lg:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-soft">What Remind picked up</p>
            {/* The sentence again, with the words Remind understood highlighted. */}
            <p className="mt-2 flex min-h-8 flex-wrap gap-x-1.5 gap-y-1 text-base leading-7" aria-hidden>
              {words.map((item, index) => (
                <span key={`${index}-${item.word}`} className={cn("rounded-md px-1", item.picked ? "bg-pine/12 font-medium text-pine" : "text-ink")}>
                  {item.word}
                </span>
              ))}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              <li>
                <span className="font-medium text-ink">every Monday</span>, <span className="font-medium text-ink">every 25th</span>, <span className="font-medium text-ink">every 3 days</span> repeat it
              </li>
              <li>
                <span className="font-medium text-ink">p1</span> to <span className="font-medium text-ink">p4</span> set the priority (p1 is the most urgent)
              </li>
              <li>
                <span className="font-medium text-ink">#Home</span> files it in a project, <span className="font-medium text-ink">@family</span> adds a label
              </li>
            </ul>
            <p className="mt-4 text-sm font-medium text-ink-soft">Try a fuller one</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MORE_EXAMPLES.filter((example) => example !== text).map((example) => (
                <button key={example} type="button" onClick={() => play(example)} className={exampleButton}>
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* What Remind understood, piece by piece. */}
          <dl className="h-fit divide-y divide-line rounded-2xl border border-line" aria-label="Task details">
            {rows.map((row) => (
              <div key={row.term} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="text-muted">{row.term}</dt>
                <dd key={row.value} className={cn("flex min-w-0 items-center gap-2 text-right", row.set ? "anim-rise font-medium text-ink" : "text-muted")}>
                  {row.dot && row.set ? <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", row.dot)} /> : null}
                  <span className="truncate">{row.value}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </div>
  );
}
