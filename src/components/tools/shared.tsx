import type { ReactNode } from "react";
import { getApp } from "@/lib/catalog";
import { Skeleton, cn, fieldClass } from "@/components/ui";
import { AppMark } from "@/components/app-mark";
import { AppGuide } from "@/components/app-guide";
import { SAVE_MESSAGES, type SaveState } from "@/components/use-app-doc";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";
import { checkCents } from "@/lib/number-input";
import { ResolveButton } from "@/components/doc-recovery-panel";


export function nid(): string {
  return crypto.randomUUID();
}

export function ToolFrame({
  slug,
  saveState,
  hideOnPrint,
  children,
}: {
  slug: string;
  saveState?: SaveState;
  hideOnPrint?: boolean;
  children: ReactNode;
}) {
  const app = getApp(slug);
  return (
    <div className="mt-4">
      <div className={cn("flex flex-wrap items-end justify-between gap-3", hideOnPrint && "no-print")}>
        <div className="flex max-w-2xl items-center gap-4">
          <AppMark slug={slug} name={app?.name} className="size-14" />
          <div>
            <h1 className="font-display text-5xl tracking-tight">{app?.name}</h1>
            <p className="mt-2 text-pretty text-muted">{app?.blurb}</p>
          </div>
        </div>
        {saveState ? <SaveMark state={saveState} slug={slug} /> : null}
      </div>
      <AppGuide features={app?.features ?? []} guide={app?.guide ?? []} className={hideOnPrint ? "no-print" : undefined} collapsed />
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function saveStateLabel(state: SaveState): string {
  switch (state) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved to your account";
    case "error":
      return "Not saved";
    case "retrying":
      return SAVE_MESSAGES.retrying;
    case "conflict":
      return SAVE_MESSAGES.conflict;
    case "refresh":
      return SAVE_MESSAGES.refresh;
    case "too-large":
      return SAVE_MESSAGES.tooLarge;
    default:
      return "Saved with your account";
  }
}

export function SaveMark({ state, slug }: { state: SaveState; slug?: string }) {
  const problem = state === "retrying" || state === "conflict" || state === "refresh" || state === "too-large" || state === "error";
  return (
    <p className={cn("text-sm", problem ? "max-w-xs font-medium text-fail" : "text-muted")} aria-live="polite">
      {saveStateLabel(state)} <ResolveButton slug={slug} />
    </p>
  );
}

export function ToolStatus({
  ready,
  loadError,
  blocked,
  children,
}: {
  ready: boolean;
  loadError: boolean;
  blocked: boolean;
  children: ReactNode;
}) {
  if (!ready) return <Skeleton className="h-72 w-full" />;
  if (blocked) return <p className="max-w-xl text-pretty">Midnry Pass is required to use this tool.</p>;
  if (loadError) {
    return (
      <p className="max-w-xl text-pretty text-fail">Could not load your saved copy. Refresh and try again.</p>
    );
  }
  return children;
}

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * A typed amount in cents, or null. The number format is the shared one in
 * src/lib/number-input.ts: "1,500.50" and "₦1,500" are fine, "7,5" is not.
 * Use checkCents for the reason, to show "Use a dot for decimals".
 */
export function parseCents(raw: string): number | null {
  const result = checkCents(raw);
  return result.ok ? result.cents : null;
}

export function CurrencyPicker({ value, onChange, className }: { value: CurrencyCode; onChange: (code: CurrencyCode) => void; className?: string }) {
  return (
    <label className={cn("text-sm", className)}>
      <span className="mb-1 block text-muted">Currency</span>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value as CurrencyCode)}>
        {CURRENCIES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
