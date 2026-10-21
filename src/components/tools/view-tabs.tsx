import { cn } from "@/components/ui";

/** A row of views inside one app (Ledger · Budget · Pocket, Sales · Price log). */
export function ViewTabs<T extends string>({
  label,
  views,
  value,
  onChange,
  className,
}: {
  label: string;
  views: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex max-w-full flex-wrap gap-1 rounded-full bg-paper-2 p-1", className)}>
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={view.id === value}
          data-view={view.id}
          className={cn(
            "min-h-10 rounded-full px-4 text-sm font-medium transition-colors",
            view.id === value ? "bg-card text-ink shadow-line" : "text-muted hover:text-ink",
          )}
          onClick={() => onChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
