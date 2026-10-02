import { cn } from "@/components/ui";

export function AppGuide({
  features,
  guide,
  className,
}: {
  features: readonly string[];
  guide: readonly string[];
  className?: string;
}) {
  if (features.length === 0 && guide.length === 0) return null;
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
