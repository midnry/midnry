import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useMergedDocs } from "@/components/use-merged-docs";
import { todayISO } from "@/components/tools/shared";
import { KIT_IMPORTS, importTemplateValues, importTrackerRows, rowsOf, valuesOf, type KitImport, type TemplateDoc, type TrackerDoc } from "@/lib/merges";

type AnyDoc = TrackerDoc & TemplateDoc;

/**
 * One-click copies from an app that was merged into this one (Prices into
 * Catalog, Crop prices into Farm sales, Terms into Agreement). The old
 * document is only read; it stays saved, unchanged, under its old name.
 */
export function KitImports<D extends AnyDoc>({
  slug,
  data,
  setData,
  labels = {},
}: {
  slug: string;
  data: D;
  setData: (next: (prev: D) => D) => void;
  labels?: Record<string, string>;
}) {
  const specs = KIT_IMPORTS[slug] ?? [];
  const old = useMergedDocs(specs.map((spec) => spec.from));
  const [kept, setKept] = useState<{ name: string; items: { field: string; old: string }[] } | null>(null);
  if (specs.length === 0 || !old.ready || old.failed) return null;
  const waiting = specs
    .map((spec) => ({ spec, payload: old.payloads[spec.from] ?? null }))
    .filter(({ spec, payload }) => !data.imported?.[spec.from] && hasData(spec, payload));
  if (waiting.length === 0 && !kept) return null;
  return (
    <div className="mb-6 grid gap-3" data-import={slug}>
      {waiting.map(({ spec, payload }) => (
        <div key={spec.from} className="rounded-2xl bg-card p-4 shadow-line">
          <p className="font-medium">{summary(spec, payload)}</p>
          <p className="mt-1 text-sm text-pretty text-muted">
            {spec.name} is now part of this app. Bringing it in copies your entries here; the {spec.name} originals stay saved, unchanged.
          </p>
          <Button
            tone="primary"
            className="mt-3"
            onClick={() => {
              const today = todayISO();
              if ("values" in spec.into) {
                const result = importTemplateValues(data, spec, valuesOf(payload), today);
                setData((prev) => ({ ...prev, ...importTemplateValues(prev, spec, valuesOf(payload), today).doc }));
                setKept(result.kept.length > 0 ? { name: spec.name, items: result.kept } : null);
                toast.success(`Copied from ${spec.name}. The original is kept.`);
              } else {
                const rows = rowsOf(payload);
                setData((prev) => ({ ...prev, ...importTrackerRows(prev, spec, rows, today) }));
                toast.success(`Copied ${rows.length} ${rows.length === 1 ? "entry" : "entries"} from ${spec.name}. The originals are kept.`);
              }
            }}
          >
            Bring my {spec.name} entries in
          </Button>
        </div>
      ))}
      {kept ? (
        <div role="status" className="rounded-2xl bg-pine/10 p-4 text-sm">
          <p className="font-medium">Copied into the empty fields. These fields already had something, so they were left as they are:</p>
          <ul className="mt-2 grid gap-1">
            {kept.items.map((item) => (
              <li key={item.field}>
                <span className="text-muted">{labels[item.field] ?? item.field}</span> in {kept.name}: <span className="break-words whitespace-pre-wrap">{item.old}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted">They are still saved in {kept.name}. Copy any you want into the form.</p>
        </div>
      ) : null}
    </div>
  );
}

function hasData(spec: KitImport, payload: string | null): boolean {
  return "values" in spec.into ? Object.keys(valuesOf(payload)).length > 0 : rowsOf(payload).length > 0;
}

function summary(spec: KitImport, payload: string | null): string {
  if ("values" in spec.into) return `You have a saved draft in ${spec.name}.`;
  const count = rowsOf(payload).length;
  return `You have ${count} ${count === 1 ? "entry" : "entries"} saved in ${spec.name}.`;
}
