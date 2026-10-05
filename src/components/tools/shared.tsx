import type { ReactNode } from "react";
import { getApp } from "@/lib/catalog";
import { Skeleton, cn, fieldClass } from "@/components/ui";
import { AppMark } from "@/components/app-mark";
import { AppGuide } from "@/components/app-guide";
import type { SaveState } from "@/components/use-app-doc";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";


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
        {saveState ? <SaveMark state={saveState} /> : null}
      </div>
      <AppGuide features={app?.features ?? []} guide={app?.guide ?? []} className={hideOnPrint ? "no-print" : undefined} />
      <div className="mt-8">{children}</div>
    </div>
  );
}

function SaveMark({ state }: { state: SaveState }) {
  const label =
    state === "saving" ? "Saving…" : state === "saved" ? "Saved to your account" : state === "error" ? "Not saved" : "Saved with your account";
  return (
    <p className="text-sm text-muted" aria-live="polite">
      {label}
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

export function parseCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$₦£€₵₹,\s]|KSh|R(?=\d)/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isFinite(cents) || cents > 100_000_000_00) return null;
  return cents;
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
