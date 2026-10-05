import { cn } from "@/components/ui";

export function AppGuide({
  features,
  guide,
  className,
  collapsed,
}: {
  features: readonly string[];
  guide: readonly string[];
  className?: string;
  /** Show as a closed "Features and how to use" panel, for when the app is open below it. */
  collapsed?: boolean;
}) {
  if (features.length === 0 && guide.length === 0) return null;
  if (collapsed) {
    return (
      <details className={cn("group mt-4 rounded-2xl bg-card shadow-line", className)}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Features and how to use
          <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <AppGuide features={features} guide={guide} className="mt-0 px-5 pb-5 [&>section]:bg-paper [&>section]:shadow-none" />
      </details>
    );
  }
  return (
    <div className={cn("mt-6 grid gap-4 md:grid-cols-2", className)}>
      {features.length > 0 ? (
        <section className="rounded-2xl bg-card p-5 shadow-line">
          <h2 className="font-medium">Features</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {guide.length > 0 ? (
        <section className="rounded-2xl bg-card p-5 shadow-line">
          <h2 className="font-medium">How to use</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {guide.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
