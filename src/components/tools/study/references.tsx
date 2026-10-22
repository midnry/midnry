import { useState } from "react";
import { Button, TextInput, fieldClass } from "@/components/ui";
import { downloadText } from "@/components/use-merged-docs";
import { LIMITS, formatReference, isRefStyle, refFields, referenceReady, referencesText, sortedReferences, type RefStyle, type StudyDoc } from "@/lib/study";
import { ConfirmButton, CopyButton, Panel, makeId, plural, stamp } from "@/components/tools/study/parts";

const STYLES: { id: RefStyle; label: string }[] = [
  { id: "APA", label: "APA" },
  { id: "MLA", label: "MLA" },
  { id: "Chicago", label: "Chicago (notes style)" },
  { id: "Law", label: "Law report (Nigerian style)" },
];

/** The References tab: one tool for APA, MLA, Chicago and law reports. The list is saved, A to Z. */
export function ReferencesView({ doc, commit, initialStyle }: { doc: StudyDoc; commit: (change: (doc: StudyDoc) => StudyDoc) => void; initialStyle?: RefStyle }) {
  const [style, setStyle] = useState<RefStyle>(initialStyle ?? "APA");
  const [values, setValues] = useState<Record<string, string>>({});
  const fields = refFields(style);
  const line = formatReference(style, values);
  const ready = referenceReady(style, values);
  const papers = sortedReferences(doc.references.filter((ref) => ref.style !== "Law"));
  const cases = sortedReferences(doc.references.filter((ref) => ref.style === "Law"));
  const already = doc.references.some((ref) => formatReference(ref.style, ref.fields) === line);
  const full = doc.references.length >= LIMITS.references;
  const all = referencesText(doc.references);

  function add() {
    const kept = Object.fromEntries(fields.map((field) => [field.id, (values[field.id] ?? "").trim()]).filter(([, value]) => value));
    commit((d) => ({ ...d, references: [...d.references, { id: makeId(), style, fields: kept, createdAt: stamp().now }] }));
    setValues({});
  }

  function remove(id: string) {
    commit((d) => ({ ...d, references: d.references.filter((ref) => ref.id !== id) }));
  }

  return (
    <div>
      <h2 className="font-display text-3xl tracking-tight">References</h2>
      <p className="mt-1 text-sm text-muted">Fill the boxes, check the line, then add it to your list. Your list is saved with your account. Check the punctuation against your department's guide.</p>
      <Panel className="mt-4">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Style</span>
          <select
            className={fieldClass}
            value={style}
            onChange={(event) => {
              if (isRefStyle(event.target.value)) setStyle(event.target.value);
            }}
          >
            {STYLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={`${style}-${field.id}`} className="min-w-0 text-sm">
              <span className="mb-1 block text-muted">{field.label}</span>
              <TextInput value={values[field.id] ?? ""} placeholder={field.placeholder} maxLength={1000} onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} />
            </label>
          ))}
        </div>
        <p className="mt-4 rounded-2xl bg-paper-2 p-4 break-words" data-reference-preview>
          {line}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button disabled={!ready || already || full} onClick={add}>
            Add to my list
          </Button>
          <CopyButton text={ready ? line : ""} />
          {already ? <span className="text-sm text-muted">Already in your list.</span> : null}
          {full ? <span className="text-sm text-fail">Your list holds {LIMITS.references} references.</span> : null}
        </div>
      </Panel>

      {doc.references.length > 0 ? (
        <section className="mt-8" aria-labelledby="reference-list">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 id="reference-list" className="font-display text-2xl tracking-tight">
              Your list <span className="text-base text-muted">({plural(doc.references.length, "reference")}, A to Z)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={all} label="Copy the whole list" />
              <Button tone="quiet" onClick={() => downloadText("references.txt", `${all}\n`, "text/plain")}>
                Download .txt
              </Button>
            </div>
          </div>
          {[
            { label: "References", items: papers },
            { label: "Table of cases", items: cases },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.label} className="mt-4">
                <p className="font-medium">{group.label}</p>
                <ol className="mt-2 space-y-2" data-reference-list>
                  {group.items.map(({ ref, text }) => (
                    <li key={ref.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-card p-3 text-sm shadow-line">
                      <span className="min-w-0 flex-1 basis-56 break-words">{text}</span>
                      <span className="max-w-full">
                        <ConfirmButton label="Remove" question="Remove it?" onConfirm={() => remove(ref.id)} />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">Your list is empty. References you add stay here when you leave.</p>
      )}
    </div>
  );
}
