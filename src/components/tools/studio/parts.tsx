import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { MODES, MODE_GROUPS, TONES, STYLE_MAX, styleIsSet, type HouseStyle, type Mode, type Tone } from "@/lib/studio";
import type { Field } from "@/lib/kits";

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

/** Prints the text alone (the browser's dialog also offers "Save as PDF"). */
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

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The 15 modes: grouped buttons on wider screens, one menu on a phone. */
export function ModePicker({ mode, counts, onChange }: { mode: Mode; counts: Record<string, number>; onChange: (mode: Mode) => void }) {
  return (
    <div>
      <label className="block text-sm sm:hidden">
        <span className="mb-1 block text-muted">Mode</span>
        <select className={fieldClass} value={mode.slug} onChange={(event) => onChange(MODES.find((item) => item.slug === event.target.value) ?? mode)} data-mode-select>
          {MODE_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {MODES.filter((item) => item.group === group).map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                  {counts[item.slug] ? ` (${counts[item.slug]})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="hidden gap-x-6 gap-y-3 sm:flex sm:flex-wrap" role="group" aria-label="Mode">
        {MODE_GROUPS.map((group) => (
          <div key={group} className="min-w-0">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {MODES.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  aria-pressed={item.slug === mode.slug}
                  data-mode={item.view}
                  onClick={() => onChange(item)}
                  className={cn(
                    "min-h-10 rounded-full px-3.5 text-sm font-medium transition-colors",
                    item.slug === mode.slug ? "bg-pine text-paper" : "bg-card text-ink shadow-line hover:bg-paper-2",
                  )}
                >
                  {item.name}
                  {counts[item.slug] ? <span className={cn("ml-1.5 tabular-nums", item.slug === mode.slug ? "text-paper/80" : "text-muted")}>{counts[item.slug]}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Fields({ fields, values, onChange }: { fields: Field[]; values: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.id} className={cn("min-w-0 text-sm", field.kind === "area" && "sm:col-span-2")}>
          <span className="mb-1 block text-muted">{field.label}</span>
          {field.kind === "area" ? (
            <TextArea value={values[field.id] ?? ""} placeholder={field.placeholder} rows={5} onChange={(event) => onChange({ ...values, [field.id]: event.target.value })} />
          ) : (
            <TextInput
              type={field.kind === "number" ? "number" : "text"}
              inputMode={field.kind === "number" ? "decimal" : undefined}
              value={values[field.id] ?? ""}
              placeholder={field.placeholder}
              onChange={(event) => onChange({ ...values, [field.id]: event.target.value })}
            />
          )}
        </label>
      ))}
    </div>
  );
}

/** A Pass extra the person can't use yet: what it does, and where the Pass is. */
export function PassLock({ what, name, className }: { what: string; name: string; className?: string }) {
  return (
    <p className={cn("text-sm text-pretty text-muted", className)} data-locked={name}>
      {what} comes with{" "}
      <Link to="/billing" className="font-medium text-ink underline underline-offset-2">
        Midnry Pass
      </Link>
      . Everything else here stays free.
    </p>
  );
}

/** The saved house style (Pass): tone, words to use or avoid, and a sign-off. */
export function HouseStylePanel({
  open,
  style,
  onSave,
}: {
  open: boolean;
  style: HouseStyle;
  onSave: (style: HouseStyle) => Promise<boolean>;
}) {
  const [form, setForm] = useState(style);
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(style), [style]);
  const changed = JSON.stringify(form) !== JSON.stringify(style);
  return (
    <section className="rounded-2xl bg-card p-4 shadow-line sm:p-5" aria-labelledby="house-style" data-house-style={open ? "open" : "locked"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="house-style" className="font-medium">
          House style
        </h2>
        <span className="text-xs text-muted">{open ? (styleIsSet(style) ? "Applied to every AI draft" : "Not set") : "Midnry Pass"}</span>
      </div>
      <p className="mt-1 text-sm text-pretty text-muted">
        Your tone, words to use or avoid, and a sign-off, saved once. Every AI draft follows it, and every draft is checked for the words you avoid.
      </p>
      {open ? (
        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            void onSave(form).finally(() => setBusy(false));
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-muted">Tone</span>
            <select className={fieldClass} value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value as Tone })}>
              {TONES.map((tone) => (
                <option key={tone.id} value={tone.id}>
                  {tone.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Words to use, separated by commas</span>
            <TextInput value={form.use} maxLength={STYLE_MAX} placeholder="our customers, handmade" onChange={(event) => setForm({ ...form, use: event.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Words to avoid, separated by commas</span>
            <TextInput value={form.avoid} maxLength={STYLE_MAX} placeholder="cheap, guaranteed" onChange={(event) => setForm({ ...form, avoid: event.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Sign-off for emails and letters</span>
            <TextInput value={form.signoff} maxLength={STYLE_MAX} placeholder="Kind regards, Ada" onChange={(event) => setForm({ ...form, signoff: event.target.value })} />
          </label>
          <div>
            <Button type="submit" tone="primary" disabled={busy || !changed}>
              {busy ? "Saving…" : "Save house style"}
            </Button>
          </div>
        </form>
      ) : (
        <PassLock what="A saved house style" name="style" className="mt-3" />
      )}
    </section>
  );
}
