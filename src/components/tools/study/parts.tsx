import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, cn } from "@/components/ui";
import { reviewNote } from "@/lib/review-notes";
import { todayISO } from "@/components/tools/shared";
import { STARTER_NOTES, type Stamp } from "@/lib/study";

export function stamp(): Stamp {
  return { now: new Date().toISOString(), today: todayISO() };
}

export function makeId(): string {
  return crypto.randomUUID();
}

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      tone="quiet"
      className={className}
      disabled={!text.trim()}
      onClick={() => {
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1600);
          })
          .catch(() => toast.error("Could not copy. Select the text and copy it instead."));
      }}
    >
      {done ? "Copied" : label}
    </Button>
  );
}

/** A button that asks once before it does something that can't be undone. */
export function ConfirmButton({ label, question, disabled, onConfirm }: { label: string; question: string; disabled?: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button tone="quiet" disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={question}>
      <span className="text-muted">{question}</span>
      <Button
        tone="primary"
        onClick={() => {
          onConfirm();
          setAsking(false);
        }}
      >
        Yes, {label.toLowerCase()}
      </Button>
      <Button tone="quiet" onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </span>
  );
}

export function printText(title: string, text: string) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return frame.remove();
  const safe = (value: string) => value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] ?? char);
  doc.open();
  doc.write(
    `<!doctype html><title>${safe(title)}</title><body style="font:14px/1.6 system-ui,sans-serif;margin:32px;color:#111"><pre style="white-space:pre-wrap;font:inherit">${safe(text)}</pre></body>`,
  );
  doc.close();
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(() => frame.remove(), 1000);
}

/** The "not professionally reviewed yet" note of a starter set (or a copy of one). */
export function ReviewNote({ from, className }: { from?: string; className?: string }) {
  const note = from ? reviewNote(from) : undefined;
  const caution = from ? STARTER_NOTES[from] : undefined;
  if (!note && !caution) return null;
  return (
    <div className={cn("rounded-2xl bg-paper-2 px-4 py-3 text-sm text-pretty", className)}>
      {note ? <p data-review-note>{note}</p> : null}
      {caution ? <p className={cn("text-muted", note && "mt-1")}>{caution}</p> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-card p-4 shadow-line sm:p-5", className)}>{children}</div>;
}

export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm text-muted hover:text-ink">
      <span aria-hidden className="mr-1">
        ←
      </span>
      {label}
    </button>
  );
}

export function prettyDate(day: string | null | undefined): string {
  if (!day) return "";
  const date = new Date(day.length === 10 ? `${day}T12:00:00` : day);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
