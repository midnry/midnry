import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { localToday } from "@/lib/remind/parse";
import { cn } from "@/components/ui";

/**
 * Shared pieces for the sample-data demos on the homepage and product pages.
 * The demos run the apps' real logic in the browser on made-up data. Nothing
 * is sent anywhere and nothing is saved.
 */

export const SAMPLE_NOTE = "Sample data. Try it, nothing is saved.";

/** Today's date on this device, once the page is running in the browser (null while it loads). */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(localToday()), []);
  return today;
}

/**
 * Lets a demo say "the visitor just did something" (typed, added a line, ticked a task),
 * so a product page can offer the next step. A no-op where nobody listens (the homepage).
 */
const DemoTouchContext = createContext<() => void>(() => {});
export const DemoTouchProvider = DemoTouchContext.Provider;
export function useDemoTouch(): () => void {
  return useContext(DemoTouchContext);
}

/**
 * A polite, screen-reader-only summary of a demo's result (the task, a total).
 * It waits until the value settles, and says nothing until the visitor has changed something.
 */
export function LiveSummary({ text, active }: { text: string; active: boolean }) {
  const [said, setSaid] = useState("");
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setSaid(text), 700);
    return () => window.clearTimeout(id);
  }, [text, active]);
  return (
    <p className="sr-only" aria-live="polite" data-demo-live>
      {said}
    </p>
  );
}

/** True when the visitor asked their device for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function SampleBadge({ className }: { className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-full bg-paper-2 px-3 py-1.5 text-xs font-medium text-ink-soft", className)}>
      <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-pine" aria-hidden>
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7.2v3.6M8 4.9v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {SAMPLE_NOTE}
    </p>
  );
}

/** "1 · Type it" / "2 · See the result": the two halves of every demo. */
export function Step({ n, title, children, className }: { n: 1 | 2; title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="flex items-center gap-2.5 text-sm font-medium text-ink-soft">
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", n === 1 ? "bg-paper-2 text-ink" : "bg-pine text-paper")} aria-hidden>
          {n}
        </span>
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** The arrow between the input half and the result half: down on phones, right on wide screens. */
export function FlowArrow() {
  return (
    <div className="flex items-center justify-center lg:flex-col" aria-hidden>
      <span className="h-px flex-1 bg-line lg:h-auto lg:w-px" />
      <span className="mx-3 grid size-9 place-items-center rounded-full bg-card text-pine shadow-line lg:mx-0 lg:my-3">
        <svg viewBox="0 0 20 20" className="size-4 rotate-90 lg:rotate-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10h12M11 5l5 5-5 5" />
        </svg>
      </span>
      <span className="h-px flex-1 bg-line lg:h-auto lg:w-px" />
    </div>
  );
}

/** Two halves with the arrow between them. */
export function DemoGrid({ input, result }: { input: ReactNode; result: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-8">
      {input}
      <FlowArrow />
      {result}
    </div>
  );
}

export const demoInput =
  "h-11 w-full min-w-0 rounded-xl border border-line bg-paper px-3 text-base text-ink outline-none placeholder:text-muted focus-visible:border-pine focus-visible:ring-3 focus-visible:ring-pine/25";
