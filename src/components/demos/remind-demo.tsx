import { useEffect, useId, useMemo, useRef, useState } from "react";
import { parseTask, type Parsed } from "@/lib/remind/parse";
import { prettyDate, prettyTime } from "@/lib/remind/dates";
import { nextDue, recurLabel } from "@/lib/remind/recur";
import { pointsFor } from "@/lib/remind/stats";
import { PRIORITY_STYLE } from "@/components/tools/remind/items";
import { cn } from "@/components/ui";
import { DemoGrid, Step, demoInput, useReducedMotion, useToday } from "./demo-kit";

/**
 * Remind's quick-add box with sample text. It runs the app's own parser
 * (src/lib/remind/parse.ts) on whatever the visitor types, in the browser.
 * Nothing is sent or saved.
 */

const SAMPLE = "Pay rent every 25th at 9am p1 #Home";
const EXAMPLES = [SAMPLE, "Call mum tomorrow at 6pm @family", "Gym every mon and thu 7am", "Water the plants every 3 days"];

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

export function RemindDemo() {
  const inputId = useId();
  const today = useToday();
  const reduced = useReducedMotion();
  const [text, setText] = useState(SAMPLE);
  const [done, setDone] = useState(false);
  const [announce, setAnnounce] = useState("");
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
    }, 34);
  }

  const parsed = useMemo(() => (today ? parseTask(text, today) : null), [text, today]);
  const words = parsed ? markWords(text, parsed.title) : [];
  const priority = parsed?.priority ?? 4;
  const style = PRIORITY_STYLE[priority];

  // A short spoken summary once the text settles, for screen readers.
  useEffect(() => {
    if (!parsed || !today) return;
    const id = window.setTimeout(() => {
      if (!parsed.title) return setAnnounce("Add a few words for the task.");
      const parts = [parsed.title, whenText(parsed, today), parsed.recur !== "none" ? recurLabel(parsed.recur) : "", parsed.priority ? `priority ${parsed.priority}` : ""];
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
      ]
    : [];

  return (
    <DemoGrid
      input={
        <Step n={1} title="Type it the way you'd say it">
          <label htmlFor={inputId} className="sr-only">
            Type a reminder
          </label>
          <input
            id={inputId}
            value={text}
            onChange={(event) => {
              stopTyping();
              setDone(false);
              setText(event.target.value.slice(0, 120));
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. Call mum tomorrow at 6pm"
            className={cn(demoInput, "h-14 rounded-2xl px-4 sm:text-lg")}
          />
          {/* The sentence again, with the words Remind understood highlighted. */}
          <p className="mt-3 flex min-h-8 flex-wrap gap-x-1.5 gap-y-1 text-base leading-7" aria-hidden>
            {words.map((item, index) => (
              <span key={`${index}-${item.word}`} className={cn("rounded-md px-1", item.picked ? "bg-pine/12 font-medium text-pine" : "text-ink")}>
                {item.word}
              </span>
            ))}
          </p>
          <p className="mt-2 text-sm text-muted">
            <span className="rounded bg-pine/12 px-1 font-medium text-pine">Highlighted</span> words become the date, time, repeat, priority (p1–p4), @labels and #project.
          </p>
          <div className="mt-5">
            <p className="text-sm font-medium text-ink-soft">Try another</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.filter((example) => example !== text).map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => play(example)}
                  className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-left text-sm text-ink shadow-line hover:bg-paper-2 motion-safe:transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </Step>
      }
      result={
        <Step n={2} title="Remind sets it up">
          <p className="sr-only" aria-live="polite">
            {announce}
          </p>
          {!parsed || !today ? (
            <div className="h-72 animate-pulse rounded-2xl bg-paper-2" />
          ) : (
            <>
              {/* The task as it shows in your list. */}
              <div className="rounded-2xl bg-paper p-4 sm:p-5">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{parsed.due ? prettyDate(parsed.due, today) : "Inbox"}</p>
                <div className="mt-2 flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`${done ? "Mark not done" : "Complete"}: ${parsed.title || "task"}`}
                    disabled={!parsed.title}
                    onClick={() => setDone((value) => !value)}
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
                    <p className={cn("break-words text-lg leading-snug", done && "text-muted line-through")}>{parsed.title || <span className="text-muted">Add a few words for the task</span>}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                      {parsed.due ? <span className={parsed.due === today ? "text-pine" : undefined}>{whenText(parsed, today)}</span> : null}
                      {parsed.recur !== "none" ? <span>↻ {recurLabel(parsed.recur)}</span> : null}
                      {parsed.labels.map((label) => (
                        <span key={label}>@{label}</span>
                      ))}
                      <span>{parsed.project ? `#${parsed.project}` : "Inbox"}</span>
                    </p>
                  </div>
                </div>
                <p className={cn("mt-3 border-t border-line pt-3 text-sm", done ? "anim-rise font-medium text-ok" : "text-muted")}>
                  {done
                    ? `+${pointsFor(priority)} Midnry ${pointsFor(priority) === 1 ? "Point" : "Points"}${parsed.recur !== "none" && parsed.due ? `. Next: ${prettyDate(nextDue(parsed.due, parsed.recur, today), today)}` : ""}`
                    : "Tick the circle to finish it."}
                </p>
              </div>

              {/* What Remind understood, piece by piece. */}
              <dl className="mt-4 divide-y divide-line rounded-2xl border border-line">
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
            </>
          )}
        </Step>
      }
    />
  );
}
