import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { toast } from "sonner";
import { draftText } from "@/lib/draft.functions";
import { chatReady } from "@/lib/chat.functions";
import { getKit, type Field, type Kit, type Line } from "@/lib/kits";
import type { SectionId } from "@/lib/sections";

const SENIOR: SectionId[] = ["elder-health", "safety", "family", "elder-money", "hobbies"];

export function KitTool({ slug }: { slug: string }) {
  const kit = getKit(slug);
  if (!kit) return null;
  const large = SENIOR.includes(kit.section);
  return (
    <ToolFrame slug={slug}>
      <div className={cn(large && "text-lg")}>
        {kit.note ? <p className="mb-4 max-w-2xl text-sm text-pretty text-muted">{kit.note}</p> : null}
        <KitBody kit={kit} />
      </div>
    </ToolFrame>
  );
}

function KitBody({ kit }: { kit: Kit }) {
  switch (kit.kind) {
    case "calc":
      return <Calc kit={kit} />;
    case "template":
      return <Template kit={kit} />;
    case "tracker":
      return <Tracker kit={kit} />;
    case "cards":
      return <Cards kit={kit} />;
    case "quiz":
      return <Quiz kit={kit} />;
    case "draft":
      return <Draft kit={kit} />;
    case "cite":
      return <Cite mode={kit.mode} />;
    case "list":
      return <SearchList items={kit.items} />;
    case "units":
      return <Units />;
    case "ohm":
      return <Ohm />;
    case "regex":
      return <RegexTool />;
    case "json":
      return <JsonTool />;
    case "algo":
      return <Algo />;
    case "plot":
      return <Plot />;
    case "solver":
      return <Solver />;
    case "qr":
      return <QrTool />;
    case "tax":
      return <Tax />;
    case "voice":
      return <Voice />;
    case "photo":
      return <Photo />;
    case "speak":
      return <Speak />;
    case "steps":
      return <Steps steps={kit.steps} />;
    case "scam":
      return <Scam rumors={kit.slug === "rumor-check"} />;
    case "mood":
      return <Mood slug={kit.slug} />;
    case "ratios":
      return <Ratios />;
    case "even":
      return <BreakEven />;
    case "reconcile":
      return <Reconcile />;
    default:
      return null;
  }
}

function Lines({ lines, copy = true }: { lines: Line[]; copy?: boolean }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-4 sm:col-span-full">
      <dl className="grid gap-3 sm:grid-cols-2">
        {lines.map((line) => (
          <div key={line.label} className="rounded-2xl bg-card p-4 shadow-line">
            <dt className="text-sm text-muted">{line.label}</dt>
            <dd className="mt-1 text-lg font-medium tabular-nums">{line.value}</dd>
          </div>
        ))}
      </dl>
      {copy ? <CopyButton className="mt-3" text={lines.map((line) => `${line.label}: ${line.value}`).join("\n")} label="Copy results" /> : null}
    </div>
  );
}

function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
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

function Calc({ kit }: { kit: Extract<Kit, { kind: "calc" }> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <div>
      <Fields fields={kit.fields} values={values} onChange={setValues} />
      <Lines lines={kit.run(values)} />
    </div>
  );
}

function Fields({
  fields,
  values,
  onChange,
}: {
  fields: Field[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.id} className={cn("text-sm", field.kind === "area" && "sm:col-span-2")}>
          <span className="mb-1 block text-muted">{field.label}</span>
          {field.id === "side" ? (
            <select
              className={fieldClass}
              value={/income/i.test(values.side ?? "") ? "income" : /cost/i.test(values.side ?? "") ? "cost" : ""}
              onChange={(event) => onChange({ ...values, side: event.target.value })}
            >
              <option value="">Choose</option>
              <option value="income">Income (money in)</option>
              <option value="cost">Cost (money out)</option>
            </select>
          ) : field.kind === "area" ? (
            <TextArea
              value={values[field.id] ?? ""}
              placeholder={field.placeholder}
              rows={5}
              onChange={(event) => onChange({ ...values, [field.id]: event.target.value })}
            />
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

function Template({ kit }: { kit: Extract<Kit, { kind: "template" }> }) {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc(kit.slug, { values: {} as Record<string, string> });
  const values = data.values ?? {};
  const revenue = Number(values.revenue);
  const cogs = Number(values.cogs);
  const expenses = Number(values.expenses);
  const showStatement = kit.slug === "statements" && [revenue, cogs, expenses].every((item) => Number.isFinite(item));
  const statement: Line[] = showStatement
    ? [
        { label: "Gross profit", value: money(revenue - cogs) },
        { label: "Net", value: money(revenue - cogs - expenses) },
        { label: "Net margin", value: revenue > 0 ? `${Math.round(((revenue - cogs - expenses) / revenue) * 1000) / 10}%` : "—" },
      ]
    : [];
  const text = [
    kit.name,
    "",
    ...kit.parts.filter((part) => values[part.id]?.trim()).map((part) => `${part.label}\n${values[part.id].trim()}\n`),
    ...statement.map((line) => `${line.label}: ${line.value}`),
  ]
    .join("\n")
    .trim();
  const filled = kit.parts.some((part) => values[part.id]?.trim());
  return (
    <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
      <Fields fields={kit.parts} values={values} onChange={(next) => setData({ values: next })} />
      {showStatement ? <Lines lines={statement} copy={false} /> : null}
      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        <CopyButton text={filled ? text : ""} label="Copy as text" />
        <Button tone="quiet" disabled={!filled} onClick={() => printText(kit.name, text)}>
          Print
        </Button>
        <ConfirmButton label="Clear" question="Clear every field?" disabled={!filled} onConfirm={() => setData({ values: {} })} />
        <span className="text-sm text-muted">{saveLabel(saveState)}</span>
      </div>
    </ToolStatus>
  );
}

function ConfirmButton({ label, question, disabled, onConfirm }: { label: string; question: string; disabled?: boolean; onConfirm: () => void }) {
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

function printText(title: string, text: string) {
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

function money(value: number): string {
  return Number.isFinite(value) ? (Math.round(value * 100) / 100).toLocaleString("en", { maximumFractionDigits: 2 }) : "—";
}

function Tracker({ kit }: { kit: Extract<Kit, { kind: "tracker" }> }) {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc(kit.slug, {
    rows: [] as Record<string, string>[],
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const hasSide = kit.fields.some((field) => field.id === "side");
  const hasAmount = kit.fields.some((field) => field.id === "amount");
  const income = rows.filter((row) => /income/i.test(row.side || "")).reduce((total, row) => total + (Number(row.amount) || 0), 0);
  const cost = rows.filter((row) => /cost/i.test(row.side || "")).reduce((total, row) => total + (Number(row.amount) || 0), 0);
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const lowCount = rows.filter(isLow).length;
  const needle = query.trim().toLowerCase();
  const shown = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !needle || Object.values(row).join(" ").toLowerCase().includes(needle))
    .reverse();
  const canSave = Object.values(draft).some((item) => item?.trim());

  function save() {
    if (!canSave) return;
    const clean = Object.fromEntries(kit.fields.map((field) => [field.id, (draft[field.id] ?? "").trim()]));
    if (editing != null) setData({ rows: rows.map((row, index) => (index === editing ? clean : row)) });
    else setData({ rows: [...rows, clean] });
    setDraft({});
    setEditing(null);
  }

  function remove(index: number) {
    const before = rows;
    setData({ rows: rows.filter((_, item) => item !== index) });
    if (editing === index) {
      setEditing(null);
      setDraft({});
    }
    toast("Removed", { action: { label: "Undo", onClick: () => setData({ rows: before }) } });
  }

  function exportCsv() {
    const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const csv = [kit.fields.map((field) => cell(field.label)).join(","), ...rows.map((row) => kit.fields.map((field) => cell(row[field.id] ?? "")).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${kit.slug}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
      <form
        ref={formRef}
        className="rounded-2xl bg-card p-4 shadow-line"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <p className="mb-3 font-medium">{editing != null ? "Edit entry" : "New entry"}</p>
        <Fields fields={kit.fields} values={draft} onChange={setDraft} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button tone="primary" type="submit" disabled={!canSave}>
            {editing != null ? "Save changes" : "Add"}
          </Button>
          {editing != null ? (
            <Button
              tone="quiet"
              onClick={() => {
                setEditing(null);
                setDraft({});
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      {hasSide ? (
        <Lines
          copy={false}
          lines={[
            { label: "Money in", value: money(income) },
            { label: "Money out", value: money(cost) },
            { label: "Left", value: money(income - cost) },
          ]}
        />
      ) : hasAmount && rows.length > 0 ? (
        <Lines copy={false} lines={[{ label: "Total", value: money(total) }]} />
      ) : null}
      {lowCount > 0 ? (
        <p className="mt-4 rounded-2xl bg-pine/10 p-3 text-sm font-medium">
          {lowCount === 1 ? "1 item is" : `${lowCount} items are`} running low.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <p className="mr-auto font-medium">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </p>
          {rows.length > 4 ? (
            <TextInput className="w-full sm:w-56" value={query} placeholder="Search entries" onChange={(event) => setQuery(event.target.value)} />
          ) : null}
          <Button tone="quiet" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Nothing here yet. Your first entry will show up here, saved to your account.</p>
      )}
      <ul className="mt-3 space-y-2">
        {shown.map(({ row, index }) => (
          <li
            key={`${index}-${Object.values(row).join("|")}`}
            className={cn("rounded-2xl bg-card p-4 shadow-line", editing === index && "ring-2 ring-pine")}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {kit.fields
                  .filter((field) => row[field.id]?.trim())
                  .map((field) => (
                    <div key={field.id} className="contents">
                      <dt className="text-muted">{field.label}</dt>
                      <dd className="min-w-0 break-words whitespace-pre-wrap">
                        {field.id === "side" ? (/income/i.test(row.side) ? "Income" : /cost/i.test(row.side) ? "Cost" : row.side) : row[field.id]}
                      </dd>
                    </div>
                  ))}
              </dl>
              <div className="flex shrink-0 items-center gap-1">
                {isLow(row) ? <span className="rounded-full bg-pine px-2 py-0.5 text-xs font-medium text-paper">Low</span> : null}
                <button
                  type="button"
                  className="min-h-9 rounded-full px-3 text-sm text-muted hover:bg-paper-2"
                  onClick={() => {
                    setEditing(index);
                    setDraft(row);
                    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Edit
                </button>
                <button type="button" className="min-h-9 rounded-full px-3 text-sm text-fail hover:bg-paper-2" onClick={() => remove(index)}>
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {needle && shown.length === 0 ? <p className="mt-3 text-sm text-muted">No entries match “{query.trim()}”.</p> : null}
      <p className="mt-3 text-sm text-muted">{saveLabel(saveState)}</p>
    </ToolStatus>
  );
}

function isLow(row: Record<string, string>): boolean {
  if (!row.low?.trim() || !row.qty?.trim()) return false;
  const qty = Number(row.qty);
  const low = Number(row.low);
  return Number.isFinite(qty) && Number.isFinite(low) && qty <= low;
}

function Cards({ kit }: { kit: Extract<Kit, { kind: "cards" }> }) {
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState(false);
  const [order, setOrder] = useState(kit.deck.map((_, item) => item));
  const [known, setKnown] = useState<number[]>([]);
  const position = order[index] ?? 0;
  const card = kit.deck[position];
  const total = order.length;

  function go(step: number) {
    setFlip(false);
    setIndex((value) => (value + step + total) % total);
  }

  function shuffle(list: number[]) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlip((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (total === 0) return <p className="text-muted">You have gone through every card.</p>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>
          Card {index + 1} of {total}
        </span>
        <span>{known.length > 0 ? `${known.length} known` : ""}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-pine transition-[width]" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <button
        type="button"
        onClick={() => setFlip((value) => !value)}
        aria-label={flip ? "Show the front" : "Show the answer"}
        className={cn("min-h-48 w-full rounded-2xl p-6 text-left shadow-line transition-colors", flip ? "bg-pine text-paper" : "bg-card")}
      >
        <span className={cn("text-sm", flip ? "opacity-80" : "text-muted")}>{flip ? "Answer" : "Question"}</span>
        <span className="mt-3 block text-xl text-pretty">{flip ? card?.back : card?.front}</span>
        <span className={cn("mt-4 block text-xs", flip ? "opacity-70" : "text-muted")}>Tap to {flip ? "see the question" : "reveal the answer"}</span>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="quiet" onClick={() => go(-1)}>
          Previous
        </Button>
        <Button tone="primary" onClick={() => go(1)}>
          Next
        </Button>
        {flip ? (
          <Button
            tone="quiet"
            onClick={() => {
              setKnown((list) => (list.includes(position) ? list : [...list, position]));
              go(1);
            }}
          >
            I knew this
          </Button>
        ) : null}
        <Button
          tone="quiet"
          onClick={() => {
            setOrder(shuffle(order));
            setIndex(0);
            setFlip(false);
          }}
        >
          Shuffle
        </Button>
        {known.length > 0 && known.length < kit.deck.length ? (
          <Button
            tone="quiet"
            onClick={() => {
              setOrder(shuffle(kit.deck.map((_, item) => item).filter((item) => !known.includes(item))));
              setIndex(0);
              setFlip(false);
            }}
          >
            Practise the rest
          </Button>
        ) : null}
      </div>
      <p className="mt-3 hidden text-xs text-muted sm:block">Keys: Space flips, arrows move.</p>
    </div>
  );
}

function Quiz({ kit }: { kit: Extract<Kit, { kind: "quiz" }> }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const total = kit.questions.length;
  const question = kit.questions[index];
  const score = answers.filter((answer, item) => answer === kit.questions[item]?.answer).length;

  function restart() {
    setIndex(0);
    setPicked(null);
    setAnswers([]);
  }

  if (!question) {
    const missed = kit.questions.map((item, at) => ({ item, at })).filter(({ item, at }) => answers[at] !== item.answer);
    return (
      <div>
        <div className="rounded-2xl bg-card p-5 shadow-line">
          <p className="text-sm text-muted">Your score</p>
          <p className="mt-1 font-display text-4xl tracking-tight">
            {score} of {total}
          </p>
          <p className="mt-2 text-muted">
            {score === total ? "Every answer right." : score >= total * 0.7 ? "Strong. Review the ones you missed." : "Keep going. Review the answers below, then try again."}
          </p>
        </div>
        {missed.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {missed.map(({ item }) => (
              <li key={item.q} className="rounded-2xl bg-card p-4 shadow-line">
                <p className="font-medium">{item.q}</p>
                <p className="mt-1 text-sm">Answer: {item.options[item.answer]}</p>
                <p className="mt-1 text-sm text-muted">{item.why}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <Button tone="primary" className="mt-4" onClick={restart}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>Score {score}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-pine transition-[width]" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <p className="text-lg font-medium text-pretty">{question.q}</p>
      <div className="mt-3 grid gap-2">
        {question.options.map((option, optionIndex) => {
          const right = picked != null && optionIndex === question.answer;
          const wrong = picked === optionIndex && optionIndex !== question.answer;
          return (
            <button
              key={option}
              type="button"
              disabled={picked != null}
              className={cn(
                "rounded-2xl px-4 py-3 text-left shadow-line transition-colors",
                right ? "bg-pine text-paper" : wrong ? "bg-fail text-white" : "bg-card",
                picked == null && "hover:bg-paper-2",
                picked != null && !right && !wrong && "opacity-60",
              )}
              onClick={() => {
                setPicked(optionIndex);
                setAnswers((list) => [...list, optionIndex]);
              }}
            >
              {option}
              {right ? " ✓" : wrong ? " ✗" : ""}
            </button>
          );
        })}
      </div>
      {picked != null ? (
        <p className="mt-3 text-sm text-pretty" role="status">
          <span className="font-medium">{picked === question.answer ? "Correct. " : "Not quite. "}</span>
          <span className="text-muted">{question.why}</span>
        </p>
      ) : null}
      {picked != null ? (
        <Button
          tone="primary"
          className="mt-3"
          onClick={() => {
            setPicked(null);
            setIndex((value) => value + 1);
          }}
        >
          {index + 1 === total ? "See my score" : "Next question"}
        </Button>
      ) : null}
    </div>
  );
}

function Draft({ kit }: { kit: Extract<Kit, { kind: "draft" }> }) {
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverKey, setServerKey] = useState<boolean | null>(null);
  const [ownKey, setOwnKey] = useState(false);

  useEffect(() => {
    let cancel = false;
    chatReady()
      .then((result) => !cancel && setServerKey(result.configured))
      .catch(() => !cancel && setServerKey(false));
    return () => {
      cancel = true;
    };
  }, []);

  const needsKey = serverKey === false;
  const canRun = prompt.trim() && !busy && (!needsKey || apiKey.trim());

  function run() {
    if (!canRun) return;
    setBusy(true);
    setError("");
    void draftText({ data: { system: kit.system, prompt, apiKey: apiKey.trim() || undefined } })
      .then((result) => {
        if (result.ok) setText(result.text);
        else setError(needsKey || apiKey ? result.error : "Writing help is unavailable right now. Try again in a moment.");
      })
      .catch(() => setError("Could not reach the writing service. Check your connection and try again."))
      .finally(() => setBusy(false));
  }

  return (
    <div>
      <TextArea
        value={prompt}
        placeholder={kit.placeholder}
        rows={6}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) run();
        }}
      />
      {needsKey || ownKey ? (
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-muted">
            {needsKey ? "Writing help needs an xAI API key. It is used for this request only and is not saved." : "Your xAI API key"}
          </span>
          <TextInput type="password" autoComplete="off" value={apiKey} placeholder="xai-…" onChange={(event) => setApiKey(event.target.value)} />
        </label>
      ) : serverKey ? (
        <button type="button" className="mt-2 text-xs text-muted underline" onClick={() => setOwnKey(true)}>
          Use my own API key
        </button>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button tone="primary" disabled={!canRun} onClick={run}>
          {busy ? "Writing…" : text ? "Write again" : "Write it"}
        </Button>
        {prompt ? (
          <Button
            tone="quiet"
            onClick={() => {
              setPrompt("");
              setText("");
              setError("");
            }}
          >
            Start over
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-fail">
          {error}
        </p>
      ) : null}
      {busy && !text ? <div className="mt-4 h-32 animate-pulse rounded-2xl bg-paper-2" /> : null}
      {text ? (
        <div className={cn("mt-4", busy && "opacity-60")}>
          <TextArea value={text} rows={Math.min(18, Math.max(6, text.split("\n").length + 1))} onChange={(event) => setText(event.target.value)} />
          <p className="mt-1 text-xs text-muted">You can edit this before copying. Check facts and figures before you use it.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyButton text={text} />
            <Button tone="quiet" onClick={() => printText(kit.name, text)}>
              Print
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Cite({ mode }: { mode: "paper" | "legal" }) {
  const [values, setValues] = useState<Record<string, string>>({ style: "APA" });
  const [list, setList] = useState<string[]>([]);
  const fields: Field[] =
    mode === "legal"
      ? [f("parties", "Parties", "Ade v Bello"), f("year", "Year", "2024"), f("report", "Report", "[2024] 5 NWLR")]
      : [f("author", "Author", "Adebayo, T."), f("year", "Year", "2024"), f("title", "Title"), f("source", "Source"), f("url", "Link or DOI, optional")];
  const url = values.url?.trim() ? ` ${values.url.trim()}` : "";
  const line =
    mode === "legal"
      ? `${values.parties || "Parties"} ${values.report || ""} ${values.year ? `(${values.year})` : ""}`.replace(/\s+/g, " ").trim()
      : values.style === "MLA"
        ? `${values.author || "Author"}. "${values.title || "Title"}." ${values.source || "Source"}, ${values.year || "n.d."}.${url}`
        : values.style === "Chicago"
          ? `${values.author || "Author"}. ${values.year || "n.d."}. ${values.title || "Title"}. ${values.source || "Source"}.${url}`
          : `${values.author || "Author"} (${values.year || "n.d."}). ${values.title || "Title"}. ${values.source || "Source"}.${url}`;
  const ready = mode === "legal" ? Boolean(values.parties?.trim()) : Boolean(values.author?.trim() && values.title?.trim());
  const sorted = [...list].sort((a, b) => a.localeCompare(b));
  return (
    <div>
      {mode === "paper" ? (
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-muted">Style</span>
          <select className={fieldClass} value={values.style} onChange={(event) => setValues({ ...values, style: event.target.value })}>
            <option>APA</option>
            <option>MLA</option>
            <option>Chicago</option>
          </select>
        </label>
      ) : null}
      <Fields fields={fields} values={values} onChange={(next) => setValues({ ...values, ...next })} />
      <p className="mt-4 rounded-2xl bg-card p-4 shadow-line">{line}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={ready ? line : ""} />
        <Button
          tone="quiet"
          disabled={!ready || list.includes(line)}
          onClick={() => {
            setList((items) => [...items, line]);
            setValues({ style: values.style });
          }}
        >
          Add to my list
        </Button>
      </div>
      {list.length > 0 ? (
        <div className="mt-6">
          <p className="font-medium">{mode === "legal" ? "Table of cases" : "Reference list"} (A to Z)</p>
          <ol className="mt-2 space-y-2">
            {sorted.map((item) => (
              <li key={item} className="flex items-start justify-between gap-3 rounded-2xl bg-card p-3 text-sm shadow-line">
                <span className="min-w-0 break-words">{item}</span>
                <button type="button" className="shrink-0 text-muted" onClick={() => setList((items) => items.filter((entry) => entry !== item))}>
                  Remove
                </button>
              </li>
            ))}
          </ol>
          <CopyButton className="mt-3" text={sorted.join("\n")} label="Copy the whole list" />
        </div>
      ) : null}
    </div>
  );
}

function f(id: string, label: string, placeholder?: string): Field {
  return { id, label, placeholder };
}

function SearchList({ items }: { items: { title: string; body: string }[] }) {
  const [query, setQuery] = useState("");
  const shown = items.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <TextInput value={query} placeholder="Search" onChange={(event) => setQuery(event.target.value)} />
      <ul className="mt-4 space-y-3">
        {shown.map((item) => (
          <li key={item.title} className="rounded-2xl bg-card p-4 shadow-line">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-pretty text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const UNIT_TABLES: Record<string, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  mass: { kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.45359237, oz: 0.028349523125 },
  volume: { L: 1, mL: 0.001, "m³": 1000, gal: 3.785411784, "fl oz": 0.0295735295625, cup: 0.25, tbsp: 0.015, tsp: 0.005 },
  area: { "m²": 1, "km²": 1000000, ha: 10000, acre: 4046.8564224, "ft²": 0.09290304 },
  speed: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, knot: 0.514444 },
};

function Units() {
  const firstTwo = (group: string): [string, string] => {
    if (group === "temperature") return ["C", "F"];
    const keys = Object.keys(UNIT_TABLES[group] ?? {});
    return [keys[0] ?? "", keys[1] ?? keys[0] ?? ""];
  };
  const [group, setGroup] = useState("length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("cm");
  const [value, setValue] = useState("1");
  const result = useMemo(() => {
    const input = Number(value);
    if (!value.trim() || !Number.isFinite(input)) return "";
    let out: number;
    if (group === "temperature") {
      const c = from === "C" ? input : from === "F" ? ((input - 32) * 5) / 9 : input - 273.15;
      out = to === "C" ? c : to === "F" ? (c * 9) / 5 + 32 : c + 273.15;
    } else {
      const table = UNIT_TABLES[group];
      if (!table?.[from] || !table[to]) return "";
      out = (input * table[from]) / table[to];
    }
    return Number(out.toPrecision(8)).toLocaleString("en", { maximumFractionDigits: 6 });
  }, [from, group, to, value]);
  const choices = group === "temperature" ? ["C", "F", "K"] : Object.keys(UNIT_TABLES[group] ?? {});
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block text-muted">Measure</span>
        <select
          className={fieldClass}
          value={group}
          onChange={(event) => {
            const [a, b] = firstTwo(event.target.value);
            setGroup(event.target.value);
            setFrom(a);
            setTo(b);
          }}
        >
          <option value="length">Length</option>
          <option value="mass">Mass</option>
          <option value="volume">Volume</option>
          <option value="area">Area</option>
          <option value="speed">Speed</option>
          <option value="temperature">Temperature</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted">Value</span>
        <TextInput inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <Select label="From" value={from} options={choices} onChange={setFrom} />
      <Select label="To" value={to} options={choices} onChange={setTo} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-line sm:col-span-2">
        <p className="mr-auto text-lg font-medium tabular-nums">
          {result ? `${value} ${from} = ${result} ${to}` : "Enter a number to convert."}
        </p>
        <Button
          tone="quiet"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          Swap
        </Button>
        <CopyButton text={result} />
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Ohm() {
  const [v, setV] = useState("");
  const [i, setI] = useState("");
  const [r, setR] = useState("");
  const blank = [v, i, r].filter((item) => item.trim() === "").length;
  let line = "Leave exactly one of V, I, or R blank.";
  if (blank === 1) {
    const voltage = Number(v);
    const current = Number(i);
    const resistance = Number(r);
    if (!v.trim() && Number.isFinite(current) && Number.isFinite(resistance)) line = `${Math.round(current * resistance * 100) / 100} V`;
    if (!i.trim() && resistance !== 0 && Number.isFinite(voltage) && Number.isFinite(resistance)) line = `${Math.round((voltage / resistance) * 100) / 100} A`;
    if (!r.trim() && current !== 0 && Number.isFinite(voltage) && Number.isFinite(current)) line = `${Math.round((voltage / current) * 100) / 100} Ω`;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <FieldBox label="Voltage (V)" value={v} onChange={setV} />
      <FieldBox label="Current (A)" value={i} onChange={setI} />
      <FieldBox label="Resistance (Ω)" value={r} onChange={setR} />
      <p className="sm:col-span-3 font-medium">{line}</p>
    </div>
  );
}

function FieldBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <TextInput value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RegexTool() {
  const [pattern, setPattern] = useState("\\d+");
  const [flags, setFlags] = useState("g");
  const [sample, setSample] = useState("Order 14 and 3.");
  let message = "";
  try {
    const found = sample.match(new RegExp(pattern, flags)) ?? [];
    message = found.length ? found.join(", ") : "No match.";
  } catch (error) {
    message = error instanceof Error ? error.message : "Bad pattern.";
  }
  return (
    <div className="grid gap-3">
      <FieldBox label="Pattern" value={pattern} onChange={setPattern} />
      <FieldBox label="Flags" value={flags} onChange={setFlags} />
      <TextArea value={sample} onChange={(event) => setSample(event.target.value)} />
      <p>{message}</p>
    </div>
  );
}

function JsonTool() {
  const [raw, setRaw] = useState('{"ok":true}');
  const [out, setOut] = useState("");
  return (
    <div>
      <TextArea value={raw} onChange={(event) => setRaw(event.target.value)} />
      <div className="mt-3 flex gap-2">
        <Button tone="primary" onClick={() => { try { setOut(JSON.stringify(JSON.parse(raw), null, 2)); } catch (error) { setOut(error instanceof Error ? error.message : "Invalid JSON"); } }}>Format</Button>
        <Button tone="quiet" onClick={() => { try { setOut(JSON.stringify(JSON.parse(raw))); } catch (error) { setOut(error instanceof Error ? error.message : "Invalid JSON"); } }}>Minify</Button>
      </div>
      {out ? <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-2xl bg-card p-4 shadow-line">{out}</pre> : null}
    </div>
  );
}

function Algo() {
  const [text, setText] = useState("5 1 4 2");
  const [steps, setSteps] = useState<number[][]>([]);
  const [at, setAt] = useState(0);
  function build() {
    const list = text.split(/[\s,]+/).map(Number).filter((item) => Number.isFinite(item)).slice(0, 12);
    const frames = [list.slice()];
    const arr = list.slice();
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = 0; j < arr.length - i - 1; j += 1) {
        if (arr[j] > arr[j + 1]) {
          const hold = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = hold;
          frames.push(arr.slice());
        }
      }
    }
    setSteps(frames);
    setAt(0);
  }
  const frame = steps[at] ?? [];
  return (
    <div>
      <FieldBox label="Numbers" value={text} onChange={setText} />
      <div className="mt-3 flex gap-2">
        <Button tone="primary" onClick={build}>Start</Button>
        <Button tone="quiet" onClick={() => setAt((value) => Math.min(steps.length - 1, value + 1))} disabled={at >= steps.length - 1}>Step</Button>
      </div>
      <p className="mt-4 font-medium">{frame.join("  ") || "Press start."}</p>
    </div>
  );
}

function Plot() {
  const [text, setText] = useState("0, 1\n1, 3\n2, 2\n3, 5");
  const ref = useRef<HTMLCanvasElement>(null);
  const points = text.split("\n").map((line) => line.split(",").map((item) => Number(item.trim()))).filter((pair) => pair.length >= 2 && pair.every((item) => Number.isFinite(item)));
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 2;
    if (points.length === 0) return;
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const xOf = (x: number) => 24 + ((x - minX) / (maxX - minX || 1)) * (canvas.width - 40);
    const yOf = (y: number) => canvas.height - 24 - ((y - minY) / (maxY - minY || 1)) * (canvas.height - 40);
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = xOf(point[0]);
      const y = yOf(point[1]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [text]);
  return (
    <div>
      <TextArea value={text} onChange={(event) => setText(event.target.value)} />
      <canvas ref={ref} width={640} height={280} className="mt-4 w-full rounded-2xl bg-card shadow-line" />
    </div>
  );
}

function Solver() {
  const [which, setWhich] = useState("speed");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const left = Number(a);
  const right = Number(b);
  let line = "Enter both numbers.";
  if (Number.isFinite(left) && Number.isFinite(right) && right !== 0) {
    if (which === "speed") line = `${Math.round((left / right) * 100) / 100} (distance ÷ time)`;
    if (which === "density") line = `${Math.round((left / right) * 100) / 100} (mass ÷ volume)`;
    if (which === "molarity") line = `${Math.round((left / right) * 100) / 100} mol/L`;
  }
  if (which === "force" && Number.isFinite(left) && Number.isFinite(right)) line = `${Math.round(left * right * 100) / 100} (mass × acceleration)`;
  return (
    <div className="grid gap-3">
      <Select label="Formula" value={which} options={["speed", "density", "force", "molarity"]} onChange={setWhich} />
      <FieldBox label={which === "force" ? "Mass" : which === "speed" ? "Distance" : which === "density" ? "Mass" : "Moles"} value={a} onChange={setA} />
      <FieldBox label={which === "force" ? "Acceleration" : which === "molarity" ? "Litres" : which === "speed" ? "Time" : "Volume"} value={b} onChange={setB} />
      <p className="font-medium">{line}</p>
    </div>
  );
}

function QrTool() {
  const [link, setLink] = useState("https://");
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <FieldBox label="Link" value={link} onChange={setLink} />
      <Button
        tone="primary"
        className="mt-3"
        onClick={() => {
          setError("");
          void import("qrcode")
            .then((mod) => mod.default.toDataURL(link, { margin: 1, width: 320 }))
            .then(setSrc)
            .catch(() => setError("Could not make a code from that."));
        }}
      >
        Make code
      </Button>
      {error ? <p className="mt-3 text-sm text-fail">{error}</p> : null}
      {src ? <img src={src} alt="QR code" className="mt-4 size-64 rounded-2xl bg-card p-3 shadow-line" /> : null}
    </div>
  );
}

function Tax() {
  const [pay, setPay] = useState("3000000");
  const [rent, setRent] = useState("0");
  const [sale, setSale] = useState("100000");
  const income = Number(pay);
  const relief = Math.min(Math.max(Number(rent) || 0, 0) * 0.2, 500000);
  const chargeable = Math.max(0, (Number.isFinite(income) ? income : 0) - relief);
  const bands: [number, number][] = [
    [800000, 0],
    [2200000, 0.15],
    [9000000, 0.18],
    [13000000, 0.21],
    [25000000, 0.23],
    [Number.POSITIVE_INFINITY, 0.25],
  ];
  let left = chargeable;
  let tax = 0;
  if (Number.isFinite(income) && income <= 70000 * 12) tax = 0;
  else {
    for (const [width, rate] of bands) {
      const slice = Math.min(left, width);
      tax += slice * rate;
      left -= slice;
      if (left <= 0) break;
    }
  }
  const vat = (Number(sale) || 0) * 0.075;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldBox label="Annual pay (₦)" value={pay} onChange={setPay} />
        <FieldBox label="Annual rent, optional (₦)" value={rent} onChange={setRent} />
        <FieldBox label="Amount for VAT (₦)" value={sale} onChange={setSale} />
      </div>
      <Lines lines={[{ label: "PAYE estimate", value: `₦${Math.round(tax).toLocaleString("en")}` }, { label: "VAT at 7.5%", value: `₦${Math.round(vat).toLocaleString("en")}` }]} />
    </div>
  );
}

function Voice() {
  const [url, setUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record audio. Try Chrome, Safari, or Firefox.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = () => {
          if (url) URL.revokeObjectURL(url);
          setUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
          stream.getTracks().forEach((track) => track.stop());
          setRecording(false);
        };
        recorder.start();
        rec.current = recorder;
        setSeconds(0);
        setRecording(true);
      })
      .catch(() => setError("The microphone is blocked. Allow microphone access for this site in your browser settings, then try again."));
  }

  const ext = rec.current?.mimeType.includes("mp4") ? "m4a" : "webm";
  return (
    <div className="flex flex-col items-start gap-3">
      {recording ? (
        <Button tone="primary" className="min-h-14 px-8 text-lg" onClick={() => rec.current?.stop()}>
          ■ Stop ({Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")})
        </Button>
      ) : (
        <Button tone="primary" className="min-h-14 px-8 text-lg" onClick={start}>
          ● {url ? "Record again" : "Record"}
        </Button>
      )}
      {recording ? <p className="text-muted">Recording… speak now.</p> : null}
      {error ? (
        <p role="alert" className="text-fail">
          {error}
        </p>
      ) : null}
      {url && !recording ? <audio controls src={url} className="w-full" /> : null}
      {url && !recording ? (
        <a className="inline-flex min-h-11 items-center underline" href={url} download={`voice-note.${ext}`}>
          Save the recording
        </a>
      ) : null}
    </div>
  );
}

function Photo() {
  const [src, setSrc] = useState("");
  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < frame.data.length; i += 4) {
              for (let channel = 0; channel < 3; channel += 1) {
                const value = frame.data[i + channel] - 128;
                frame.data[i + channel] = Math.max(0, Math.min(255, 128 + value * 1.25));
              }
            }
            ctx.putImageData(frame, 0, 0);
            setSrc(canvas.toDataURL("image/jpeg", 0.9));
          };
          image.src = URL.createObjectURL(file);
        }}
      />
      {src ? <img src={src} alt="Clearer copy" className="mt-4 max-h-96 rounded-2xl" /> : null}
      {src ? <a className="mt-3 inline-flex text-sm underline" href={src} download="clearer.jpg">Download</a> : null}
    </div>
  );
}

function Speak() {
  const [text, setText] = useState("The Lord is my shepherd; I shall not want.");
  const [rate, setRate] = useState(0.9);
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);
  return (
    <div>
      <TextArea value={text} onChange={(event) => setText(event.target.value)} className="min-h-48 text-2xl" />
      {supported ? (
        <>
          <label className="mt-3 flex max-w-sm items-center gap-3">
            <span className="shrink-0 text-muted">Speed</span>
            <input type="range" min={0.6} max={1.4} step={0.1} value={rate} onChange={(event) => setRate(Number(event.target.value))} className="w-full accent-pine" />
            <span className="w-10 text-right tabular-nums">{rate.toFixed(1)}×</span>
          </label>
          <div className="mt-3 flex gap-2">
            <Button
              tone="primary"
              className="min-h-14 px-8 text-lg"
              disabled={!text.trim()}
              onClick={() => {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = rate;
                utterance.onend = () => setSpeaking(false);
                utterance.onerror = () => setSpeaking(false);
                setSpeaking(true);
                window.speechSynthesis.speak(utterance);
              }}
            >
              {speaking ? "Reading…" : "Read aloud"}
            </Button>
            <Button
              tone="quiet"
              className="min-h-14 px-8 text-lg"
              onClick={() => {
                window.speechSynthesis.cancel();
                setSpeaking(false);
              }}
            >
              Stop
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-muted">This browser cannot read text aloud. Try Chrome, Safari, or Edge.</p>
      )}
    </div>
  );
}

function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {steps.map((item, itemIndex) => (
          <Button key={item.title} tone={itemIndex === index ? "primary" : "quiet"} onClick={() => setIndex(itemIndex)}>{item.title}</Button>
        ))}
      </div>
      <p className="mt-4 text-xl text-pretty">{step?.body}</p>
    </div>
  );
}

function Scam({ rumors }: { rumors: boolean }) {
  const [text, setText] = useState("");
  const lower = text.toLowerCase();
  const checks: [RegExp, string][] = [
    [/\b(urgent(ly)?|immediately|right now|act (fast|now)|last chance|within \d+ (hours?|minutes?)|expires? today)\b/, "It pushes you to act quickly. Real banks and family can wait while you check."],
    [/\b(gift ?cards?|bitcoin|crypto|usdt|wire (the )?money|western union|send money|transfer (the )?(money|fee))\b/, "It asks you to send money in a way that is hard to get back."],
    [/\b(otp|one[- ]time (code|password|pin)|verification code|pin|password|bvn|cvv)\b/, "It asks for a code, PIN, or password. No real company asks for these by message."],
    [/https?:\/\/|www\.|bit\.ly|tinyurl|wa\.me|t\.me/, "It contains a link. Do not open it unless you typed the address yourself."],
    [/\b(you (have )?won|winner|prize|lottery|inheritance|congratulations|claim your)\b/, "It offers a prize or money you did not expect."],
    [/\b(account (has been|will be|is) (blocked|suspended|closed|locked)|unusual activity|verify your account)\b/, "It threatens your account to scare you into acting."],
    [/\b(new number|lost my phone|changed my number|it'?s me,? (mum|mom|dad))\b/, "It says it is someone you know on a new number. Call their old number to check."],
    [/\b(keep (this|it) (secret|between us)|don'?t tell (anyone|your))\b/, "It asks you to keep it secret. Scammers do not want you to ask anyone."],
  ];
  const hits = checks.filter(([pattern]) => pattern.test(lower)).map(([, note]) => note);
  const level = hits.length >= 2 ? "high" : hits.length === 1 ? "some" : "none";
  return (
    <div>
      <TextArea value={text} rows={6} placeholder={rumors ? "Paste the claim" : "Paste the message you received"} onChange={(event) => setText(event.target.value)} />
      {rumors ? (
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>Who said it, and can you open that source yourself?</li>
          <li>Do the date and the place match?</li>
          <li>Is a trusted news site or official page saying the same thing?</li>
          <li>If it asks you to forward it, wait.</li>
        </ul>
      ) : null}
      {text.trim() ? (
        <div
          role="status"
          className={cn(
            "mt-4 rounded-2xl p-4 font-medium",
            level === "high" ? "bg-fail text-white" : level === "some" ? "bg-pine/15" : "bg-card shadow-line",
          )}
        >
          {level === "high"
            ? "This looks like a scam. Do not reply, pay, or open links."
            : level === "some"
              ? "Be careful. One warning sign was found."
              : "No common warning signs found. That does not prove it is safe. If unsure, ask someone you trust."}
        </div>
      ) : null}
      <ul className="mt-3 space-y-2">
        {hits.map((hit) => (
          <li key={hit} className="rounded-2xl bg-card p-4 shadow-line">
            {hit}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mood({ slug }: { slug: string }) {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc(slug, {
    colors: ["#1d4ed8", "#102033", "#f4f7fb", "#e6eef8", "#5c6e84", "#ffffff"],
    words: "",
  });
  return (
    <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
      <div className="flex flex-wrap gap-3">
        {data.colors.map((color, index) => (
          <input
            key={index}
            type="color"
            value={color}
            aria-label={`Colour ${index + 1}`}
            onChange={(event) => {
              const colors = data.colors.slice();
              colors[index] = event.target.value;
              setData({ ...data, colors });
            }}
          />
        ))}
      </div>
      <TextArea className="mt-4" value={data.words} placeholder="Words for the direction" onChange={(event) => setData({ ...data, words: event.target.value })} />
      <p className="mt-3 text-sm text-muted">{saveLabel(saveState)}</p>
    </ToolStatus>
  );
}

function Ratios() {
  const [current, setCurrent] = useState("");
  const [liability, setLiability] = useState("");
  const [stock, setStock] = useState("");
  const [debt, setDebt] = useState("");
  const [equity, setEquity] = useState("");
  const assets = Number(current);
  const owed = Number(liability);
  const inventory = Number(stock);
  const d = Number(debt);
  const e = Number(equity);
  const lines: Line[] = [];
  if (owed > 0 && Number.isFinite(assets)) lines.push({ label: "Current", value: String(Math.round((assets / owed) * 100) / 100) });
  if (owed > 0 && Number.isFinite(assets) && Number.isFinite(inventory)) lines.push({ label: "Quick", value: String(Math.round(((assets - inventory) / owed) * 100) / 100) });
  if (e > 0 && Number.isFinite(d)) lines.push({ label: "Debt / equity", value: String(Math.round((d / e) * 100) / 100) });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FieldBox label="Current assets" value={current} onChange={setCurrent} />
      <FieldBox label="Current liabilities" value={liability} onChange={setLiability} />
      <FieldBox label="Stock" value={stock} onChange={setStock} />
      <FieldBox label="Debt" value={debt} onChange={setDebt} />
      <FieldBox label="Equity" value={equity} onChange={setEquity} />
      <Lines lines={lines.length ? lines : [{ label: "Result", value: "Enter assets and liabilities." }]} />
    </div>
  );
}

function BreakEven() {
  const [fixed, setFixed] = useState("");
  const [price, setPrice] = useState("");
  const [variable, setVariable] = useState("");
  const fCost = Number(fixed);
  const p = Number(price);
  const v = Number(variable);
  const gap = p - v;
  const lines: Line[] = gap > 0 && fCost >= 0
    ? [{ label: "Units to sell", value: Math.ceil(fCost / gap).toLocaleString("en") }, { label: "Sales needed", value: money(Math.ceil(fCost / gap) * p) }, { label: "Profit per unit", value: money(gap) }]
    : [{ label: "Result", value: "Price has to be above the cost of one unit." }];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <FieldBox label="Fixed costs" value={fixed} onChange={setFixed} />
      <FieldBox label="Price" value={price} onChange={setPrice} />
      <FieldBox label="Cost per unit" value={variable} onChange={setVariable} />
      <Lines lines={lines} />
    </div>
  );
}

function Reconcile() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const a = amounts(left);
  const b = amounts(right);
  const onlyA = unmatched(a, b);
  const onlyB = unmatched(b, a);
  const gap = Math.round((sum(a) - sum(b)) * 100) / 100;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block text-muted">Your records (one amount per line)</span>
        <TextArea rows={8} value={left} placeholder={"12,500\n3,000\n780.50"} onChange={(event) => setLeft(event.target.value)} />
        <span className="mt-1 block text-xs text-muted">
          {a.length} amounts · total {money(sum(a))}
        </span>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted">Bank or statement (one amount per line)</span>
        <TextArea rows={8} value={right} placeholder={"12,500\n780.50"} onChange={(event) => setRight(event.target.value)} />
        <span className="mt-1 block text-xs text-muted">
          {b.length} amounts · total {money(sum(b))}
        </span>
      </label>
      {a.length || b.length ? (
        <>
          <p className={cn("rounded-2xl p-4 font-medium sm:col-span-2", gap === 0 && !onlyA.length && !onlyB.length ? "bg-pine text-paper" : "bg-card shadow-line")}>
            {gap === 0 && !onlyA.length && !onlyB.length ? "Both sides match." : `The totals differ by ${money(Math.abs(gap))}.`}
          </p>
          <Lines
            lines={[
              { label: "Only in your records", value: onlyA.map(money).join(", ") || "None" },
              { label: "Only on the statement", value: onlyB.map(money).join(", ") || "None" },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

function amounts(text: string): number[] {
  return text
    .split(/\n/)
    .map((line) => line.replace(/[₦$£€,\s]/g, ""))
    .filter((line) => line !== "")
    .map(Number)
    .filter((item) => Number.isFinite(item));
}

function sum(values: number[]): number {
  return values.reduce((total, item) => total + item, 0);
}
function unmatched(source: number[], other: number[]): number[] {
  const pool = other.slice();
  return source.filter((item) => {
    const index = pool.indexOf(item);
    if (index === -1) return true;
    pool.splice(index, 1);
    return false;
  });
}

function saveLabel(state: string): string {
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "error") return "Could not save";
  return "";
}
