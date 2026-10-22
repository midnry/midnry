import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button, Skeleton, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { ToolFrame } from "@/components/tools/shared";
import { setViewParam, viewParam } from "@/components/use-merged-docs";
import { aiWrite } from "@/lib/ai-write.functions";
import { reviewNote } from "@/lib/review-notes";
import { WRITERS, type Piece } from "@/lib/writers";
import {
  DEFAULT_MODE,
  FREE_HISTORY,
  PASS_HISTORY,
  SOAP_SLUG,
  SOURCE_MAX,
  SOURCE_TO_AI,
  TITLE_MAX,
  allowanceLine,
  blankDraft,
  draftFileName,
  draftText,
  draftTitle,
  hasContent,
  historyCap,
  modeBySlug,
  modeByView,
  styleCheck,
  styleIsSet,
  type Allowance,
  type Draft,
  type DraftSummary,
  type HouseStyle,
  type Mode,
} from "@/lib/studio";
import { DOCX_TYPE } from "@/lib/studio-docx";
import {
  draftDocx,
  loadDraft,
  openStudio,
  removeDraft,
  saveDraft,
  saveStudioSettings,
  type SaveResult,
  type StudioState,
} from "@/lib/studio.functions";
import { ConfirmButton, CopyButton, Fields, HouseStylePanel, ModePicker, PassLock, downloadBlob, printText } from "@/components/tools/studio/parts";

/**
 * Writing studio: the 15 AI writing modes in one free app (src/lib/studio.ts).
 * Drafts are saved one by one on the server (studio.functions.ts) a moment
 * after each change; the AI allowance is the same shared daily count as before.
 */
export function StudioTool() {
  const [state, setState] = useState<StudioState | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    openStudio()
      .then((next) => live && setState(next))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return (
    <ToolFrame slug="write">
      {failed ? (
        <p className="max-w-xl text-pretty text-fail">Could not open your drafts. Refresh and try again.</p>
      ) : !state ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Studio initial={state} />
      )}
    </ToolFrame>
  );
}

type SaveStatus = "idle" | "waiting" | "saving" | "saved" | "error" | "conflict" | "full" | "too-large" | "gone";

type Fallback = { reason: "limit" | "busy" | "error" | "off"; limit?: number; hasPass?: boolean } | null;

const MODE_KEY = "midnry.write.mode";
const KEEPALIVE_MAX = 60_000;
const keepaliveFetch: typeof fetch = (input, init) => fetch(input, { ...init, keepalive: true });

function newId(): string {
  return crypto.randomUUID();
}

function firstMode(): Mode {
  const fromLink = modeByView(viewParam());
  if (fromLink) return fromLink;
  try {
    const kept = modeBySlug(localStorage.getItem(MODE_KEY));
    if (kept) return kept;
  } catch {
    /* no storage: the first mode */
  }
  return DEFAULT_MODE;
}

function when(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function Studio({ initial }: { initial: StudioState }) {
  const [mode, setMode] = useState<Mode>(firstMode);
  const [drafts, setDrafts] = useState<DraftSummary[]>(initial.drafts);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [allowance, setAllowance] = useState<Allowance>(initial.allowance);
  const [style, setStyle] = useState<HouseStyle>(initial.style);
  const [soapHistory, setSoapHistory] = useState(initial.soapHistory);
  const [writing, setWriting] = useState(false);
  const [missing, setMissing] = useState("");
  const [fallback, setFallback] = useState<Fallback>(null);
  const [fullNote, setFullNote] = useState("");
  const [broughtIn, setBroughtIn] = useState(initial.broughtIn);
  const extras = initial.extras;

  // Saving: one draft at a time, compare-and-set on its revision.
  const revisions = useRef(new Map<string, number>());
  const pending = useRef<Draft | null>(null);
  const timer = useRef<number | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    for (const item of initial.drafts) revisions.current.set(item.id, item.revision);
  }, [initial.drafts]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const item of drafts) out[item.mode] = (out[item.mode] ?? 0) + 1;
    return out;
  }, [drafts]);
  const listed = drafts.filter((item) => item.mode === mode.slug);
  const cap = historyCap(mode.slug, { hasPass: initial.hasPass, isAdmin: initial.isAdmin, soapHistory });

  const flush = useCallback(async (keepalive = false): Promise<void> => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) {
      await inFlight.current;
      if (!pending.current) return;
    }
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    const base = revisions.current.get(next.id) ?? 0;
    if (base === 0 && !hasContent(next)) {
      setStatus("idle");
      return;
    }
    setStatus("saving");
    const run = (async () => {
      let result: SaveResult;
      try {
        const payload = { draft: next, baseRevision: base };
        const small = JSON.stringify(payload).length <= KEEPALIVE_MAX;
        result = await saveDraft({ data: payload, ...(keepalive && small ? { fetch: keepaliveFetch } : {}) });
      } catch {
        setStatus("error");
        // Keep the change and try again shortly, unless something newer is already waiting.
        pending.current ??= next;
        timer.current = window.setTimeout(() => void flush(), 5000);
        return;
      }
      if (result.ok) {
        revisions.current.set(next.id, result.revision);
        setDrafts((list) => [result.summary, ...list.filter((item) => item.id !== next.id)]);
        setStatus(pending.current ? "waiting" : "saved");
        setFullNote("");
      } else if (result.error === "full") {
        setStatus("full");
        const name = modeBySlug(next.mode)?.name ?? "this mode";
        setFullNote(fullMessage(name, result.cap, next.mode === SOAP_SLUG && !soapHistory, extras));
      } else if (result.error === "conflict") {
        setStatus("conflict");
      } else if (result.error === "gone") {
        revisions.current.delete(next.id);
        setStatus("gone");
      } else {
        setStatus("too-large");
      }
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
    if (pending.current && timer.current === null) await flush(keepalive);
  }, [extras, soapHistory]);

  const schedule = useCallback(
    (next: Draft) => {
      pending.current = next;
      setStatus("waiting");
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  // Leaving or hiding the page during the pause: send it now.
  useEffect(() => {
    const now = () => void flush(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") now();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!pending.current) return;
      now();
      event.preventDefault();
      event.returnValue = "";
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", now);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", now);
      window.removeEventListener("beforeunload", onBeforeUnload);
      now();
    };
  }, [flush]);

  /** Opens a saved draft (by id), the newest one of the mode, or (fresh) a new blank draft. */
  const open = useCallback(
    async (target: Mode, id?: string, fresh = false) => {
      await flush();
      setMissing("");
      setFallback(null);
      setFullNote("");
      setStatus("idle");
      const pick = fresh ? undefined : (id ?? drafts.find((item) => item.mode === target.slug)?.id);
      if (!pick) {
        setDraft(blankDraft(target.slug, newId(), new Date().toISOString()));
        setLoadingDraft(false);
        return;
      }
      setLoadingDraft(true);
      try {
        const found = await loadDraft({ data: pick });
        if (found.ok) {
          revisions.current.set(found.draft.id, found.revision);
          setDraft(found.draft);
        } else {
          setDrafts((list) => list.filter((item) => item.id !== pick));
          setDraft(blankDraft(target.slug, newId(), new Date().toISOString()));
        }
      } catch {
        toast.error("Could not open that draft. Try again.");
      } finally {
        setLoadingDraft(false);
      }
    },
    // drafts is read when switching; it changes with every save, which is fine.
    [flush, drafts],
  );

  // First draft, and the mode in the address bar.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void open(mode);
  }, [open, mode]);

  function chooseMode(next: Mode) {
    if (next.slug === mode.slug) return;
    setMode(next);
    setViewParam(next.view);
    try {
      localStorage.setItem(MODE_KEY, next.slug);
    } catch {
      /* the choice still applies now */
    }
    void open(next);
  }

  useEffect(() => {
    setViewParam(mode.view);
  }, [mode.view]);

  function update(change: Partial<Draft>) {
    const current = draftRef.current;
    if (!current) return;
    const next = { ...current, ...change, updatedAt: new Date().toISOString() };
    setDraft(next);
    schedule(next);
  }

  function startNew() {
    // At the cap a new draft can't be kept, so say so now rather than after typing.
    if (listed.length >= cap) {
      setFullNote(fullMessage(mode.name, cap, mode.slug === SOAP_SLUG && !soapHistory, extras));
      return;
    }
    void open(mode, undefined, true);
  }

  async function reloadDraft() {
    if (!draft) return;
    pending.current = null;
    await open(mode, draft.id);
  }

  async function deleteCurrent() {
    if (!draft) return;
    const id = draft.id;
    pending.current = null;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    if (revisions.current.get(id)) {
      try {
        await removeDraft({ data: id });
      } catch {
        toast.error("Could not delete the draft. Try again.");
        return;
      }
    }
    revisions.current.delete(id);
    const rest = drafts.filter((item) => item.id !== id);
    setDrafts(rest);
    toast.success("Draft deleted.");
    const nextId = rest.find((item) => item.mode === mode.slug)?.id;
    setStatus("idle");
    setFullNote("");
    if (nextId) await open(mode, nextId);
    else setDraft(blankDraft(mode.slug, newId(), new Date().toISOString()));
  }

  const writer = WRITERS[mode.slug];

  async function write() {
    const current = draftRef.current;
    if (!current || !writer) return;
    const empty = writer.fields.filter((field) => writer.required.includes(field.id) && !current.values[field.id]?.trim());
    if (empty.length) {
      setMissing(`Fill in: ${empty.map((field) => field.label.replace(/,? optional$/i, "")).join(", ")}.`);
      return;
    }
    setMissing("");
    const again = current.pieces.length > 0;
    const variant = again ? current.variant + 1 : current.variant;
    const quick = () => update({ pieces: writer.run(current.values, variant), by: "quick", writtenAt: new Date().toISOString(), variant });
    // After the day's limit, or with AI off, the quick writer answers straight away (as before).
    if (!allowance.ai || (fallback && (fallback.reason === "limit" || fallback.reason === "off")) || (allowance.limit !== null && allowance.left === 0)) {
      if (allowance.ai && allowance.limit !== null && allowance.left === 0) setFallback({ reason: "limit", limit: allowance.limit, hasPass: allowance.hasPass });
      else if (!allowance.ai) setFallback({ reason: "off" });
      quick();
      return;
    }
    setWriting(true);
    try {
      const values: Record<string, string> = { ...current.values };
      if (current.source.trim()) values.source = current.source;
      const result = await aiWrite({ data: { slug: mode.slug, values, variant, style: extras && styleIsSet(style) } });
      if (result.ok) {
        setFallback(null);
        setAllowance((a) => ({ ...a, left: result.left }));
        update({ pieces: result.pieces, by: "ai", writtenAt: new Date().toISOString(), variant });
      } else {
        setFallback({ reason: result.reason, limit: result.limit, hasPass: result.hasPass });
        if (result.reason === "limit") setAllowance((a) => ({ ...a, left: 0 }));
        if (result.reason === "off") setAllowance((a) => ({ ...a, ai: false }));
        quick();
      }
    } catch {
      setFallback({ reason: "error" });
      quick();
    } finally {
      setWriting(false);
    }
  }

  async function saveStyle(next: HouseStyle): Promise<boolean> {
    try {
      const result = await saveStudioSettings({ data: { style: next } });
      if (!result.ok) {
        toast.error("A saved house style comes with Midnry Pass.");
        return false;
      }
      setStyle(result.style);
      toast.success("House style saved. Every AI draft follows it.");
      return true;
    } catch {
      toast.error("Could not save the house style. Try again.");
      return false;
    }
  }

  async function toggleSoapHistory(on: boolean) {
    try {
      const result = await saveStudioSettings({ data: { soapHistory: on } });
      if (result.ok) setSoapHistory(result.soapHistory);
    } catch {
      toast.error("Could not change that setting. Try again.");
    }
  }

  async function downloadDocx() {
    if (!draft) return;
    try {
      const result = await draftDocx({ data: { title: draftTitle(draft), pieces: draft.pieces } });
      if (!result.ok) {
        toast.error(result.error === "pass" ? "Word download comes with Midnry Pass." : "Write something first.");
        return;
      }
      const bytes = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0));
      downloadBlob(draftFileName(draftTitle(draft), "docx"), new Blob([bytes], { type: DOCX_TYPE }));
    } catch {
      toast.error("Could not make the Word file. Try again.");
    }
  }

  const text = draft ? draftText(draft.pieces) : "";
  const title = draft ? draftTitle(draft) : "";
  const avoided = draft && extras ? styleCheck(text, style) : [];
  const review = reviewNote(mode.slug);
  const filled = Boolean(draft && hasContent(draft));

  return (
    <div className="grid gap-6" data-studio data-mode-current={mode.view}>
      {broughtIn > 0 ? (
        <div role="status" className="rounded-2xl bg-pine/10 p-4 text-sm text-pretty" data-brought-in={broughtIn}>
          <p className="font-medium">
            We brought in {broughtIn} saved {broughtIn === 1 ? "form" : "forms"} from the writing apps that are now part of the Writing studio.
          </p>
          <p className="mt-1">
            Look for drafts named “(brought in)”. The originals are kept, unchanged. Those apps never saved the text they wrote, so only what you typed
            is here.{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => {
                setBroughtIn(0);
                void saveStudioSettings({ data: { dismissNotice: true } }).catch(() => {});
              }}
            >
              Dismiss
            </button>
          </p>
        </div>
      ) : null}

      <p className="text-sm text-pretty text-muted" data-allowance>
        {allowanceLine(allowance)}
        {allowance.ai && allowance.limit !== null && !allowance.hasPass ? (
          <>
            {" "}
            <Link to="/billing" className="underline underline-offset-2">
              Midnry Pass
            </Link>{" "}
            gives you 30 a day.
          </>
        ) : null}
      </p>

      <ModePicker mode={mode} counts={counts} onChange={chooseMode} />

      <div className="max-w-3xl">
        <h2 className="font-display text-3xl tracking-tight">{mode.name}</h2>
        <p className="mt-1 text-pretty text-muted">{mode.blurb}</p>
        {review ? (
          <p className="mt-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm text-pretty" data-review-note>
            {review}
          </p>
        ) : null}
        {mode.note ? <p className="mt-3 text-sm text-pretty text-muted">{mode.note}</p> : null}
        {mode.slug === SOAP_SLUG ? (
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5" checked={soapHistory} onChange={(event) => void toggleSoapHistory(event.target.checked)} data-soap-history />
            <span className="text-pretty">
              Keep a history of SOAP notes. It is off unless you turn it on, because notes can hold patient details: with it off, only one note is kept,
              and you clear it to start the next.
            </span>
          </label>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="min-w-0" aria-label="Drafts">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">Drafts</h2>
            <Button tone="quiet" className="min-h-10 px-4" onClick={startNew} data-new-draft>
              New draft
            </Button>
          </div>
          <p className="mt-1 text-xs text-pretty text-muted" data-history={`${listed.length}/${cap}`}>
            {listed.length} of {cap} {mode.name} {cap === 1 ? "draft" : "drafts"} kept
            {mode.slug === SOAP_SLUG && !soapHistory ? " (history is off)." : extras ? " with Midnry Pass." : `. Midnry Pass keeps up to ${PASS_HISTORY}.`}
          </p>
          {fullNote ? (
            <p role="alert" className="mt-2 rounded-xl bg-paper-2 p-3 text-sm text-pretty" data-full>
              {fullNote}
            </p>
          ) : null}
          {listed.length > 0 ? (
            <>
              <label className="mt-3 block text-sm lg:hidden">
                <span className="mb-1 block text-muted">Open a draft</span>
                <select className={fieldClass} value={draft?.id ?? ""} onChange={(event) => void open(mode, event.target.value)}>
                  {!listed.some((item) => item.id === draft?.id) ? <option value={draft?.id ?? ""}>New draft (not saved yet)</option> : null}
                  {listed.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {when(item.updatedAt)}
                    </option>
                  ))}
                </select>
              </label>
              <ul className="mt-3 hidden max-h-[32rem] gap-1.5 overflow-y-auto lg:grid" data-draft-list>
                {listed.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void open(mode, item.id)}
                      aria-current={item.id === draft?.id ? "true" : undefined}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-left text-sm",
                        item.id === draft?.id ? "bg-card shadow-line" : "hover:bg-paper-2",
                      )}
                    >
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="block text-xs text-muted">
                        {when(item.updatedAt)}
                        {item.by === "ai" ? " · AI" : item.by === "quick" ? " · Quick writer" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No saved {mode.name} drafts yet. What you type here is saved as a draft.</p>
          )}
        </aside>

        <div className="min-w-0">
          {loadingDraft || !draft || !writer ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="grid gap-5" data-draft-id={draft.id}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void write();
                }}
                className="grid gap-4"
              >
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Draft title</span>
                  <TextInput
                    value={draft.titleSet ? draft.title : ""}
                    placeholder={title}
                    maxLength={TITLE_MAX}
                    onChange={(event) => update({ title: event.target.value, titleSet: event.target.value.trim().length > 0 })}
                    data-draft-title
                  />
                </label>
                <Fields fields={writer.fields} values={draft.values} onChange={(values) => update({ values })} />
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Source material, optional</span>
                  <TextArea
                    value={draft.source}
                    rows={4}
                    maxLength={SOURCE_MAX}
                    placeholder="Notes, an advert, an email you are replying to, or a passage to draw on."
                    onChange={(event) => update({ source: event.target.value })}
                    data-source
                  />
                  <span className="mt-1 block text-xs text-pretty text-muted">
                    The AI reads the first {SOURCE_TO_AI.toLocaleString("en")} characters. Midnry's quick writer uses only the boxes above.
                  </span>
                </label>
                {missing ? (
                  <p role="alert" className="text-sm text-fail">
                    {missing}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button tone="primary" type="submit" disabled={writing} data-write>
                    {writing ? "Writing…" : draft.pieces.length ? (writer.variants ? "Try another wording" : "Update") : "Write it"}
                  </Button>
                  <ConfirmButton
                    label="Clear"
                    question="Clear the boxes and the text of this draft?"
                    disabled={!filled}
                    onConfirm={() => {
                      setFallback(null);
                      update({ values: {}, source: "", pieces: [], by: null, writtenAt: null, variant: 0 });
                    }}
                  />
                  <ConfirmButton label="Delete draft" question="Delete this draft for good?" disabled={!filled && !revisions.current.get(draft.id)} onConfirm={() => void deleteCurrent()} />
                  <SaveLine status={status} onReload={() => void reloadDraft()} onRetry={() => draft && schedule(draft)} />
                </div>
              </form>

              {draft.pieces.length > 0 ? (
                <section aria-label="Written text" aria-live="polite" className="grid gap-3" data-output={draft.by ?? ""}>
                  {draft.pieces.map((piece, index) => (
                    <article key={`${index}-${piece.title}`} className="rounded-2xl bg-card p-4 shadow-line">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium">{piece.title}</h3>
                        <CopyButton text={piece.text} />
                      </div>
                      <TextArea
                        aria-label={`${piece.title}, editable`}
                        className="mt-3 min-h-0 text-sm leading-relaxed"
                        rows={Math.min(24, Math.max(4, piece.text.split("\n").length + 1))}
                        value={piece.text}
                        onChange={(event) => update({ pieces: draft.pieces.map((item, i): Piece => (i === index ? { ...item, text: event.target.value } : item)) })}
                      />
                    </article>
                  ))}
                  <p className="text-xs text-pretty text-muted" data-written-by={draft.by ?? ""}>
                    {writtenNote(draft, fallback)}
                    {fallback?.reason === "limit" && !fallback.hasPass ? (
                      <>
                        {" "}
                        <Link to="/billing" className="underline underline-offset-2">
                          Midnry Pass
                        </Link>{" "}
                        gives you 30 a day.
                      </>
                    ) : null}
                  </p>
                  {avoided.length ? (
                    <p className="rounded-xl bg-paper-2 p-3 text-sm text-pretty" data-style-check>
                      Your house style says to avoid: {avoided.map((word) => `“${word}”`).join(", ")}. Edit the text before you use it.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2" data-actions>
                    {draft.pieces.length > 1 ? <CopyButton text={text} label="Copy all" /> : null}
                    <Button tone="quiet" onClick={() => printText(title, text)} disabled={!text}>
                      Print or save as PDF
                    </Button>
                    <Button
                      tone="quiet"
                      disabled={!text}
                      data-download="txt"
                      onClick={() => downloadBlob(draftFileName(title, mode.ext), new Blob([text], { type: mode.ext === "md" ? "text/markdown" : "text/plain" }))}
                    >
                      Download .{mode.ext}
                    </Button>
                    {extras ? (
                      <Button tone="quiet" disabled={!text} onClick={() => void downloadDocx()} data-download="docx">
                        Download Word (.docx)
                      </Button>
                    ) : (
                      <Button tone="quiet" disabled aria-describedby="docx-lock" data-download="docx-locked">
                        Word (.docx) · Midnry Pass
                      </Button>
                    )}
                  </div>
                  {!extras ? <PassLock what="Word (.docx) download" name="docx" className="-mt-1" /> : null}
                  <span id="docx-lock" className="sr-only">
                    Word download comes with Midnry Pass.
                  </span>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <HouseStylePanel open={extras} style={style} onSave={saveStyle} />
      <p className="text-xs text-pretty text-muted">
        Drafts are kept: up to {FREE_HISTORY} per mode free, or {PASS_HISTORY} with Midnry Pass. When a mode is full, nothing is deleted for you: delete a draft
        you no longer need to start another. AI writing sends what you type, and your source material, to Anthropic to write the draft.
      </p>
    </div>
  );
}

function fullMessage(name: string, cap: number, soapOff: boolean, extras: boolean): string {
  if (soapOff) return "History is off for SOAP notes, so one note is kept. Clear this note to start the next, or turn the history on above.";
  return `You have ${cap} saved ${name} drafts, the most ${extras ? "Midnry Pass" : "a free account"} keeps for one mode. Nothing is deleted for you: delete a draft you no longer need to start another.${extras ? "" : ` Midnry Pass keeps up to ${PASS_HISTORY}.`}`;
}

function writtenNote(draft: Draft, fallback: Fallback): string {
  const at = when(draft.writtenAt);
  if (draft.by === "ai") return `Written by AI${at ? ` on ${at}` : ""}. Check names, facts and figures before you use it.`;
  if (fallback?.reason === "limit") return `You've used today's ${fallback.limit} AI writes, so this is Midnry's quick writer. Your AI writes reset at 1 am Nigeria time (midnight GMT).`;
  if (fallback?.reason === "busy" || fallback?.reason === "error") return "AI writing isn't available right now, so this is Midnry's quick writer. Try again in a minute.";
  return `Written on your device by Midnry's quick writer${at ? ` on ${at}` : ""}. Check facts and figures before you use it.`;
}

function SaveLine({ status, onReload, onRetry }: { status: SaveStatus; onReload: () => void; onRetry: () => void }) {
  const text: Record<SaveStatus, string> = {
    idle: "",
    waiting: "Saving…",
    saving: "Saving…",
    saved: "Draft saved",
    error: "Not saved, retrying…",
    conflict: "This draft was changed in another tab or device.",
    full: "Not saved: this mode is full.",
    "too-large": "Too large to save. Shorten the source or the boxes.",
    gone: "This draft was deleted elsewhere.",
  };
  const problem = status === "error" || status === "conflict" || status === "full" || status === "too-large" || status === "gone";
  return (
    <span className={cn("text-sm", problem ? "font-medium text-fail" : "text-muted")} aria-live="polite" data-save={status}>
      {text[status]}
      {status === "conflict" ? (
        <>
          {" "}
          <button type="button" className="underline underline-offset-2" onClick={onReload}>
            Reload it
          </button>
        </>
      ) : null}
      {status === "gone" ? (
        <>
          {" "}
          <button type="button" className="underline underline-offset-2" onClick={onRetry}>
            Save it again
          </button>
        </>
      ) : null}
    </span>
  );
}

