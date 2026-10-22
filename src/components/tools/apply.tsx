import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, TextArea, cn, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { ViewTabs } from "@/components/tools/view-tabs";
import { useAppDoc } from "@/components/use-app-doc";
import { extractResume } from "@/lib/apply.functions";
import {
  FALLBACK,
  MAX_ADVERT,
  MAX_RESUME,
  advertsOf,
  discardEdits,
  editText,
  isReviewable,
  normalizeDoc,
  planFor,
  preparePacks,
  roleKey,
  rolesFrom,
  setChange,
  setSubmitted,
  type ApplyDoc,
  type Pack,
} from "@/lib/apply/doc";
import { composeLines, describeChange, type Coverage, type TailorPlan } from "@/lib/apply/tailor";
import { DOC_WARN_SHARE, docLimit } from "@/lib/doc-limits";

type SetDoc = (next: (prev: ApplyDoc) => ApplyDoc) => void;

function fileName(role: string): string {
  const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "resume"}-resume`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function downloadPdf(role: string, text: string): Promise<string[]> {
  // Loaded only now: the PDF library and the font files are not part of the page.
  const [{ buildResumePdf }, { loadResumeFonts }] = await Promise.all([
    import("@/lib/apply/resume-pdf"),
    import("@/lib/apply/resume-fonts"),
  ]);
  const { bytes, missing } = await buildResumePdf(role, text, await loadResumeFonts());
  save(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${fileName(role)}.pdf`);
  return missing;
}

export function ApplyTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<ApplyDoc>("apply", FALLBACK);
  const doc = useMemo(() => normalizeDoc(data), [data]);
  const [form, setForm] = useState<{ rolesText: string; resume: string; adverts: Record<string, string> }>({
    rolesText: "",
    resume: "",
    adverts: {},
  });
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openAdverts, setOpenAdverts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ready || hydrated) return;
    const adverts = advertsOf(doc);
    setForm({ rolesText: doc.rolesText, resume: doc.resume, adverts });
    setOpenAdverts(new Set(Object.keys(adverts)));
    setHydrated(true);
  }, [ready, hydrated, doc]);

  const setDoc: SetDoc = (next) => setData((prev) => next(normalizeDoc(prev)));
  const roles = rolesFrom(form.rolesText);
  const size = useMemo(() => JSON.stringify(doc).length, [doc]);
  const limit = docLimit("apply");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".txt") || lower.endsWith(".md")) {
      const text = await file.text();
      setForm((current) => ({ ...current, resume: text.slice(0, MAX_RESUME) }));
      return;
    }
    if (!lower.endsWith(".pdf")) {
      setError("Upload a PDF or a text file.");
      return;
    }
    setBusy("Reading the resume…");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await extractResume({ data: { filename: file.name, data: toBase64(bytes) } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm((current) => ({ ...current, resume: result.text }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t read that file.");
    } finally {
      setBusy(null);
    }
  }

  function prepare(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (roles.length === 0) {
      setError("Add at least one role, one per line.");
      return;
    }
    if (form.resume.trim().length < 40) {
      setError("Add your resume first: upload a PDF or paste it.");
      return;
    }
    setError(null);
    setDoc((prev) => preparePacks(prev, form));
  }

  return (
    <ToolFrame slug="apply" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="flex flex-col gap-6">
          <p className="max-w-xl text-sm text-pretty text-muted">
            LinkedIn does not let another site sign in and send applications. Apply tailors your resume for each
            role, then opens that search so you can submit the file yourself. The matching runs in your browser.
          </p>
          <form className="flex max-w-xl flex-col gap-3" onSubmit={prepare}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Roles</span>
              <TextArea
                value={form.rolesText}
                onChange={(event) => setForm({ ...form, rolesText: event.target.value })}
                rows={4}
                required
                placeholder={"Product designer\nFrontend engineer"}
                className="min-h-28"
              />
              <span className="mt-1.5 block text-sm text-muted">One role per line. Up to six.</span>
            </label>
            {roles.length ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Job adverts (optional)</span>
                <span className="text-sm text-pretty text-muted">
                  Paste the advert for a role to match your resume against that vacancy. Without one, Apply uses the
                  usual keywords for the role name.
                </span>
                {roles.map((role) => {
                  const key = roleKey(role);
                  const advert = form.adverts[key] ?? "";
                  const open = openAdverts.has(key);
                  return (
                    <div key={key} className="rounded-xl bg-card p-3 shadow-line">
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm"
                        aria-expanded={open}
                        onClick={() =>
                          setOpenAdverts((current) => {
                            const next = new Set(current);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })
                        }
                      >
                        <span className="min-w-0 truncate font-medium">{role}</span>
                        <span className="shrink-0 text-muted">{advert.trim() ? "Advert added" : open ? "Hide" : "Add advert"}</span>
                      </button>
                      {open ? (
                        <label className="mt-2 block">
                          <span className="sr-only">Job advert for {role}</span>
                          <TextArea
                            aria-label={`Job advert for ${role}`}
                            value={advert}
                            maxLength={MAX_ADVERT}
                            rows={6}
                            placeholder="Paste the job advert text here."
                            className="min-h-36 text-sm"
                            onChange={(event) =>
                              setForm((current) => ({ ...current, adverts: { ...current.adverts, [key]: event.target.value } }))
                            }
                          />
                          <span className="mt-1 block text-xs text-muted">
                            {advert.length.toLocaleString()} / {MAX_ADVERT.toLocaleString()} characters
                          </span>
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Resume</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className={fieldClass}
                onChange={(event) => {
                  void onFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <TextArea
              aria-label="Resume text"
              value={form.resume}
              onChange={(event) => setForm({ ...form, resume: event.target.value })}
              rows={8}
              required
              placeholder="Or paste the resume here."
              className="min-h-48"
            />
            <Button type="submit" tone="primary" disabled={busy !== null}>
              {busy ?? "Prepare applications"}
            </Button>
          </form>
          {error ? <p className="text-sm text-fail">{error}</p> : null}
          {size > limit * DOC_WARN_SHARE ? (
            <p className="max-w-xl text-sm text-fail" role="status">
              Your saved applications are {Math.round((size / limit) * 100)}% of the space Apply has. Shorten an
              advert or remove a role to keep saving.
            </p>
          ) : null}
          {doc.packs.map((pack) =>
            isReviewable(pack) ? (
              <PackCard key={pack.role} doc={doc} pack={pack} setDoc={setDoc} />
            ) : (
              <LegacyPackCard key={pack.role} pack={pack} setDoc={setDoc} />
            ),
          )}
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}

function Exports({ pack, setDoc }: { pack: Pack; setDoc: SetDoc }) {
  const [pdfBusy, setPdfBusy] = useState(false);
  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          className="inline-flex min-h-11 items-center rounded-full bg-pine px-5 text-sm font-medium text-paper"
          href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(pack.role)}`}
          target="_blank"
          rel="noreferrer"
        >
          Open on LinkedIn
        </a>
        <Button
          tone="quiet"
          disabled={pdfBusy}
          onClick={() => {
            setPdfBusy(true);
            void downloadPdf(pack.role, pack.resume)
              .then((missing) => {
                if (missing.length) {
                  toast(`Some characters are not in the PDF font: ${missing.slice(0, 8).join(" ")}`, {
                    description: "They show as blanks in the PDF. “Download text” keeps every character.",
                  });
                }
              })
              .catch((caught: unknown) => toast.error(caught instanceof Error ? caught.message : "Could not make the PDF."))
              .finally(() => setPdfBusy(false));
          }}
        >
          {pdfBusy ? "Making the PDF…" : "Download PDF"}
        </Button>
        <Button tone="quiet" onClick={() => save(new Blob([pack.resume], { type: "text/plain" }), `${fileName(pack.role)}.txt`)}>
          Download text
        </Button>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={pack.submitted}
          onChange={(event) => setDoc((prev) => setSubmitted(prev, pack.role, event.target.checked))}
        />
        I submitted this
      </label>
    </>
  );
}

function LegacyPackCard({ pack, setDoc }: { pack: Pack; setDoc: SetDoc }) {
  return (
    <article className="max-w-xl rounded-2xl bg-card p-4 shadow-line">
      <h3 className="font-medium">{pack.role}</h3>
      <p className="mt-1 text-sm text-muted">{pack.note}</p>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{pack.resume}</pre>
      <p className="mt-3 text-sm text-muted">
        Prepared before job adverts. Prepare again to add the advert and review each change.
      </p>
      <Exports pack={pack} setDoc={setDoc} />
    </article>
  );
}

function CoverageList({ title, items, empty, tone }: { title: string; items: Coverage[]; empty: string; tone: "ok" | "gap" }) {
  return (
    <section aria-label={title} className="min-w-0 rounded-xl bg-paper p-3">
      <h4 className="text-sm font-medium">
        {title} <span className="text-muted">({items.length})</span>
      </h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key} className="min-w-0 text-sm">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className={cn("font-medium", tone === "ok" ? "text-ok" : "text-ink")}>
                  {tone === "ok" ? "✓ " : "○ "}
                  {item.label}
                </span>
                <span className="text-xs text-muted">
                  {KIND_LABEL[item.kind]}
                  {item.required ? "" : " · nice to have"}
                </span>
              </span>
              {item.evidence ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted [overflow-wrap:anywhere]">{item.evidence}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const KIND_LABEL: Record<Coverage["kind"], string> = {
  skill: "skill",
  tool: "tool",
  qualification: "qualification",
  years: "experience",
  phrase: "repeated in the advert",
};

function PackCard({ doc, pack, setDoc }: { doc: ApplyDoc; pack: Pack; setDoc: SetDoc }) {
  const plan = useMemo(() => planFor(doc, pack), [doc.resume, pack.role, pack.advert]); // eslint-disable-line react-hooks/exhaustive-deps
  const reverted = pack.reverted ?? [];
  const lines = useMemo(() => composeLines(plan, reverted), [plan, reverted.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<"original" | "tailored">("tailored");
  const [editing, setEditing] = useState(false);
  const off = new Set(reverted);
  const kept = (id: string) => !off.has(id);
  const edited = pack.edited === true;
  const titleId = `pack-${roleKey(pack.role).replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <article aria-labelledby={titleId} className="min-w-0 rounded-2xl bg-card p-4 shadow-line">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={titleId} className="font-medium">
          {pack.role}
        </h3>
        <span className="text-xs text-muted">{plan.fromAdvert ? "Matched against the job advert" : "Matched against the role name"}</span>
      </div>
      <p className="mt-1 text-sm text-pretty text-muted">{pack.note}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CoverageList title="Covered in your resume" items={plan.covered} empty="None of the advert’s terms were found." tone="ok" />
        <CoverageList
          title="Not found in your resume"
          items={plan.missing}
          empty="Your resume mentions everything Apply found in the advert."
          tone="gap"
        />
      </div>
      {plan.missing.length ? (
        <p className="mt-2 text-xs text-pretty text-muted">
          Apply never adds these for you. If one is true, add it to your resume in your own words.
        </p>
      ) : null}

      <section aria-label="Changes" className="mt-5">
        <h4 className="text-sm font-medium">Changes</h4>
        {edited ? (
          <p className="mt-1 text-sm text-muted">You edited the text by hand, so it is exported as you wrote it. Discard your edits to accept or revert changes again.</p>
        ) : (
          <p className="mt-1 text-sm text-muted">Nothing is reworded or added: lines only move, and the headline uses words from your resume.</p>
        )}
        <ul className="mt-2 flex flex-col gap-2">
          {plan.changes.map((change) => {
            const on = kept(change.id);
            const description = describeChange(change, plan);
            return (
              <li key={change.id} className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line p-2.5", !on && "opacity-70")}>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="text-sm">
                    {description}
                    {on ? null : <span className="text-muted"> · reverted</span>}
                  </p>
                  <p className="truncate text-xs text-muted" title={change.text}>
                    {change.text.trim()}
                  </p>
                </div>
                <Button
                  tone="quiet"
                  className="min-h-10 px-4"
                  disabled={edited}
                  aria-pressed={!on}
                  aria-label={`${on ? "Revert" : "Restore"}: ${description}`}
                  onClick={() => setDoc((prev) => setChange(prev, pack.role, change.id, !on))}
                >
                  {on ? "Revert" : "Restore"}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Compare" className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium">Original and tailored</h4>
          <ViewTabs
            label="Version"
            className="md:hidden"
            views={[
              { id: "original", label: "Original" },
              { id: "tailored", label: "Tailored" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div className={cn("min-w-0", tab === "original" ? "block" : "hidden md:block")} data-pane="original">
            <p className="mb-1 text-xs font-medium text-muted">Original</p>
            <div className="max-h-[28rem] overflow-auto rounded-xl bg-paper p-3 text-sm leading-relaxed">
              {plan.original.map((text, index) => {
                const change = !edited ? plan.changes.find((item) => item.kind !== "headline" && item.line === index && kept(item.id)) : undefined;
                return (
                  <Line key={index} text={text} mark={change ? (change.kind === "move" ? "moves up" : "reordered") : undefined} />
                );
              })}
            </div>
          </div>
          <div className={cn("min-w-0", tab === "tailored" ? "block" : "hidden md:block")} data-pane="tailored">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted">Tailored{edited ? " · edited by you" : ""}</p>
              <div className="flex flex-wrap gap-2">
                {editing ? (
                  <Button tone="quiet" className="min-h-10 px-4" onClick={() => setEditing(false)}>
                    Done editing
                  </Button>
                ) : (
                  <Button tone="quiet" className="min-h-10 px-4" onClick={() => setEditing(true)}>
                    Edit text
                  </Button>
                )}
                {edited ? (
                  <Button
                    tone="quiet"
                    className="min-h-10 px-4"
                    onClick={() => {
                      setEditing(false);
                      setDoc((prev) => discardEdits(prev, pack.role));
                    }}
                  >
                    Discard edits
                  </Button>
                ) : null}
              </div>
            </div>
            {editing ? (
              <TextArea
                aria-label={`Tailored resume for ${pack.role}`}
                value={pack.resume}
                rows={18}
                className="min-h-[28rem] text-sm leading-relaxed"
                onChange={(event) => {
                  const value = event.target.value;
                  setDoc((prev) => editText(prev, pack.role, value));
                }}
              />
            ) : edited ? (
              <div className="max-h-[28rem] overflow-auto rounded-xl bg-paper p-3 text-sm leading-relaxed">
                {pack.resume.split("\n").map((text, index) => (
                  <Line key={index} text={text} />
                ))}
              </div>
            ) : (
              <TailoredPane lines={lines} plan={plan} />
            )}
          </div>
        </div>
      </section>

      <Exports pack={pack} setDoc={setDoc} />
    </article>
  );
}

function TailoredPane({ lines, plan }: { lines: ReturnType<typeof composeLines>; plan: TailorPlan }) {
  return (
    <div className="max-h-[28rem] overflow-auto rounded-xl bg-paper p-3 text-sm leading-relaxed">
      {lines.map((line, index) => {
        const change = line.change ? plan.changes.find((item) => item.id === line.change) : undefined;
        const mark = change?.kind === "headline" ? "added" : change?.kind === "move" ? "moved up" : change ? "reordered" : undefined;
        return <Line key={index} text={line.text} mark={mark} strong={change?.kind === "headline"} />;
      })}
    </div>
  );
}

function Line({ text, mark, strong }: { text: string; mark?: string; strong?: boolean }) {
  if (!text.trim()) return <div className="h-3" aria-hidden />;
  return (
    <div
      className={cn(
        "-mx-1 rounded px-1 whitespace-pre-wrap [overflow-wrap:anywhere]",
        mark && "bg-pine/10 shadow-[inset_2px_0_0_var(--color-pine)]",
        strong && "font-medium",
      )}
    >
      {text}
      {mark ? <span className="ml-2 align-middle text-[0.7rem] font-medium whitespace-nowrap text-pine">{mark}</span> : null}
    </div>
  );
}
