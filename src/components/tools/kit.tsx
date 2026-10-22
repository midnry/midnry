import { useEffect, useMemo, useRef, useState } from "react";
import { SAVE_MESSAGES, useAppDoc, type SaveState } from "@/components/use-app-doc";
import { Button, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { getKit, type Field, type Kit, type Line, type QrSection as QrSpec } from "@/lib/kits";
import { compareLists, type BadLine } from "@/lib/reconcile";
import type { SectionId } from "@/lib/sections";
import { rowsCsv, type TemplateDoc, type TrackerDoc } from "@/lib/merges";
import { downloadText, setViewParam, viewParam } from "@/components/use-merged-docs";
import { ViewTabs } from "@/components/tools/view-tabs";
import { KitImports } from "@/components/tools/kit-import";
import { checkJson, formatJson, problemExcerpt } from "@/lib/json-tools";
import { bubbleFrames } from "@/lib/kits";
import { reviewNote } from "@/lib/review-notes";
import { REMIND_APPS, hoursLabel, prettyDay, remindText, shiftHours, shiftTotals } from "@/lib/records";
import { CLAIM_QUESTIONS, SCAM_FOOTNOTE, scamHeadline, scamSigns } from "@/lib/scam-signs";
import { isoOf } from "@/lib/remind/dates";

const SENIOR: SectionId[] = ["elder-health", "safety", "family", "elder-money", "hobbies"];

export function KitTool({ slug }: { slug: string }) {
  const kit = getKit(slug);
  if (!kit) return null;
  const large = SENIOR.includes(kit.section);
  const review = reviewNote(kit.slug);
  return (
    <ToolFrame slug={slug}>
      <div className={cn(large && "text-lg")}>
        {review ? (
          <p className="mb-3 max-w-2xl rounded-2xl bg-paper-2 px-4 py-3 text-sm text-pretty" data-review-note>
            {review}
          </p>
        ) : null}
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
      return kit.slug === "rumor-check" ? <Claims /> : <Scam />;
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
      {fields.filter((field) => !field.legacy || values[field.id]?.trim()).map((field) => (
        <label key={field.id} className={cn("min-w-0 text-sm", field.kind === "area" && "sm:col-span-2")}>
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
              type={field.kind === "number" || field.kind === "date" || field.kind === "time" ? field.kind : "text"}
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
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<TemplateDoc & { values: Record<string, string> }>(kit.slug, { values: {} });
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
      <KitImports slug={kit.slug} data={data} setData={setData} labels={Object.fromEntries(kit.parts.map((part) => [part.id, part.label]))} />
      <Fields fields={kit.parts} values={values} onChange={(next) => setData((prev) => ({ ...prev, values: next }))} />
      {showStatement ? <Lines lines={statement} copy={false} /> : null}
      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        <CopyButton text={filled ? text : ""} label="Copy as text" />
        <Button tone="quiet" disabled={!filled} onClick={() => printText(kit.name, text)}>
          Print
        </Button>
        <ConfirmButton label="Clear" question="Clear every field?" disabled={!filled} onConfirm={() => setData((prev) => ({ ...prev, values: {} }))} />
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

type TrackerRows = Record<string, string>[];

function asRows(value: unknown): TrackerRows {
  return Array.isArray(value) ? (value as TrackerRows) : [];
}

/**
 * A saved list (or several, for a tracker with views), plus an optional QR
 * section. The document is { rows, views: { [id]: rows }, qrLink, imported };
 * every change keeps the parts it does not touch.
 */
function Tracker({ kit }: { kit: Extract<Kit, { kind: "tracker" }> }) {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<TrackerDoc>(kit.slug, { rows: [] });
  const views = kit.views ?? [];
  const [viewId, setViewId] = useState(() => {
    const asked = viewParam();
    return views.find((view) => view.id === asked)?.id ?? views[0]?.id ?? "";
  });
  const view = views.find((item) => item.id === viewId);
  const extra = view?.fields ? view : undefined;
  const rows = extra ? asRows(data.views?.[extra.id]) : asRows(data.rows);
  const setRows = (next: TrackerRows) =>
    setData((prev) => (extra ? { ...prev, views: { ...(prev.views ?? {}), [extra.id]: next } } : { ...prev, rows: next }));
  return (
    <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
      <KitImports slug={kit.slug} data={data} setData={setData} />
      {views.length > 0 ? (
        <div className="mb-4">
          <ViewTabs
            label={`${kit.name} views`}
            views={views}
            value={viewId}
            onChange={(id) => {
              setViewId(id);
              setViewParam(id === views[0]?.id ? null : id);
            }}
          />
          {view?.blurb ? <p className="mt-3 max-w-2xl text-sm text-pretty text-muted">{view.blurb}</p> : null}
        </div>
      ) : null}
      <TrackerList
        key={viewId}
        fields={extra?.fields ?? kit.fields}
        rows={rows}
        setRows={setRows}
        saveState={saveState}
        title={view ? `${kit.name}: ${view.label}` : kit.name}
        slug={kit.slug}
        csvName={extra ? `${kit.slug}-${extra.id}.csv` : `${kit.slug}.csv`}
      />
      {kit.qr ? <QrSection section={kit.qr} link={typeof data.qrLink === "string" ? data.qrLink : ""} onLink={(qrLink) => setData((prev) => ({ ...prev, qrLink }))} /> : null}
    </ToolStatus>
  );
}

function TrackerList({
  fields,
  rows,
  setRows,
  saveState,
  title,
  slug,
  csvName,
}: {
  fields: Field[];
  rows: TrackerRows;
  setRows: (next: TrackerRows) => void;
  saveState: SaveState;
  title: string;
  slug: string;
  csvName: string;
}) {
  const toRemind = (REMIND_APPS as readonly string[]).includes(slug);
  const isShifts = slug === "shifts";
  const shiftSum = isShifts ? shiftTotals(rows, isoOf(new Date())) : null;
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const hasSide = fields.some((field) => field.id === "side");
  const hasAmount = fields.some((field) => field.id === "amount");
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
    // Keep fields the form does not show (an old copy may carry more), so an edit never drops data.
    const clean = { ...(editing != null ? rows[editing] : {}), ...Object.fromEntries(fields.map((field) => [field.id, (draft[field.id] ?? "").trim()])) };
    if (editing != null) setRows(rows.map((row, index) => (index === editing ? clean : row)));
    else setRows([...rows, clean]);
    setDraft({});
    setEditing(null);
  }

  function remove(index: number) {
    const before = rows;
    setRows(rows.filter((_, item) => item !== index));
    if (editing === index) {
      setEditing(null);
      setDraft({});
    }
    toast("Removed", { action: { label: "Undo", onClick: () => setRows(before) } });
  }

  function exportCsv() {
    downloadText(csvName, rowsCsv(fields, rows));
  }

  const listText = [
    title,
    "",
    ...rows.map((row) =>
      fields
        .filter((field) => row[field.id]?.trim())
        .map((field) => row[field.id].trim())
        .join(" — "),
    ),
  ].join("\n");

  return (
    <>
      <form
        ref={formRef}
        className="rounded-2xl bg-card p-4 shadow-line"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <p className="mb-3 font-medium">{editing != null ? "Edit entry" : "New entry"}</p>
        <Fields fields={fields} values={draft} onChange={setDraft} />
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
      ) : shiftSum && shiftSum.counted > 0 ? (
        <Lines
          copy={false}
          lines={[
            { label: "Hours this week", value: hoursLabel(shiftSum.week) },
            { label: "Hours in this list", value: hoursLabel(shiftSum.total) },
          ]}
        />
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
          <CopyButton text={listText} label="Copy list" />
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
              <dl className="grid min-w-0 flex-1 basis-56 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {fields
                  .filter((field) => row[field.id]?.trim())
                  .map((field) => (
                    <div key={field.id} className="contents">
                      <dt className="text-muted">{field.label}</dt>
                      <dd className="min-w-0 break-words whitespace-pre-wrap">
                        {field.id === "side"
                          ? /income/i.test(row.side)
                            ? "Income"
                            : /cost/i.test(row.side)
                              ? "Cost"
                              : row.side
                          : field.kind === "date"
                            ? prettyDay(row[field.id]) || row[field.id]
                            : row[field.id]}
                      </dd>
                    </div>
                  ))}
                {isShifts && shiftHours(row.start, row.end) != null ? (
                  <div className="contents">
                    <dt className="text-muted">Hours</dt>
                    <dd data-shift-hours>{hoursLabel(shiftHours(row.start, row.end) ?? 0)}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {isLow(row) ? <span className="rounded-full bg-pine px-2 py-0.5 text-xs font-medium text-paper">Low</span> : null}
                {toRemind ? (
                  <Link
                    to="/apps/$slug"
                    params={{ slug: "tasks" }}
                    search={{ add: remindText(slug, row) }}
                    className="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium text-pine hover:bg-paper-2"
                    data-add-to-remind
                  >
                    Add to Remind
                  </Link>
                ) : null}
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
    </>
  );
}

function isLow(row: Record<string, string>): boolean {
  if (!row.low?.trim() || !row.qty?.trim()) return false;
  const qty = Number(row.qty);
  const low = Number(row.low);
  return Number.isFinite(qty) && Number.isFinite(low) && qty <= low;
}

// The AI writing apps are now modes of the Writing studio (src/components/tools/studio).

// Flashcards, quizzes and citations (Anatomy, Cases, Drill, Citations, Cite) are part of the
// Study space now (src/components/tools/study), with saved progress, scores and reference lists.

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

/** The free JSON check: format and validate, with the line and column of the first error. Glyph (Pass) does more. */
function JsonTool() {
  const [raw, setRaw] = useState('{"ok":true}');
  const [result, setResult] = useState<{ kind: "formatted" | "valid"; text: string } | { kind: "error"; message: string; where: string; line: string; caret: string } | null>(null);
  function run(format: boolean) {
    const check = checkJson(raw);
    if (!check.ok) {
      const { line, caret } = problemExcerpt(raw, check.problem);
      setResult({ kind: "error", message: check.problem.message, where: `Line ${check.problem.line}, column ${check.problem.column}`, line, caret });
      return;
    }
    if (format) {
      const text = formatJson(check.value);
      setRaw(text);
      setResult({ kind: "formatted", text });
    } else setResult({ kind: "valid", text: "" });
  }
  return (
    <div>
      <TextArea
        value={raw}
        spellCheck={false}
        aria-label="JSON"
        className="font-mono text-sm"
        onChange={(event) => {
          setRaw(event.target.value);
          setResult(null);
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="primary" onClick={() => run(true)}>
          Format
        </Button>
        <Button tone="quiet" onClick={() => run(false)}>
          Check
        </Button>
        <CopyButton text={raw} />
      </div>
      {result?.kind === "error" ? (
        <div role="alert" className="mt-4 rounded-2xl bg-card p-4 shadow-line" data-json-error>
          <p className="font-medium text-fail">{result.where}</p>
          <p className="mt-1 text-pretty">{result.message}</p>
          <pre className="mt-3 overflow-x-auto font-mono text-sm">
            {result.line}
            {"\n"}
            <span className="text-fail">{result.caret}</span>
          </pre>
        </div>
      ) : result ? (
        <p role="status" className="mt-4 text-sm text-pine" data-json-ok>
          {result.kind === "formatted" ? "Valid JSON. Formatted." : "Valid JSON."}
        </p>
      ) : null}
      <p className="mt-6 text-sm text-pretty text-muted">
        Need a tree view, the path of a value, minify, sorted keys or large files?{" "}
        <Link to="/apps/$slug" params={{ slug: "glyph" }} className="underline underline-offset-2">
          Glyph
        </Link>{" "}
        does that, with Midnry Pass.
      </p>
    </div>
  );
}

function Algo() {
  const [text, setText] = useState("5 1 4 2");
  const [steps, setSteps] = useState<ReturnType<typeof bubbleFrames>>([]);
  const [at, setAt] = useState(0);
  function build() {
    setSteps(bubbleFrames(text.split(/[\s,]+/).filter(Boolean).map(Number).filter((item) => Number.isFinite(item))));
    setAt(0);
  }
  const frame = steps[at];
  const done = steps.length > 0 && at === steps.length - 1;
  return (
    <div>
      <FieldBox label="Numbers" value={text} onChange={setText} />
      <div className="mt-3 flex gap-2">
        <Button tone="primary" onClick={build}>Start</Button>
        <Button tone="quiet" onClick={() => setAt((value) => Math.min(steps.length - 1, value + 1))} disabled={at >= steps.length - 1}>Step</Button>
      </div>
      <p className="mt-4 font-medium">{frame ? frame.list.join("  ") : "Press start."}</p>
      {frame ? (
        <p className="mt-1 text-sm text-muted" data-algo-count>
          {done ? "Sorted. " : ""}
          {frame.comparisons} {frame.comparisons === 1 ? "comparison" : "comparisons"}, {frame.swaps} {frame.swaps === 1 ? "swap" : "swaps"} so far.
        </p>
      ) : null}
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

/** Menu's QR code: it encodes a link the person already has. Nothing is hosted or checked. */
function QrSection({ section, link, onLink }: { section: QrSpec; link: string; onLink: (link: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(link || "https://");
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (viewParam() === "qr") ref.current?.scrollIntoView({ block: "start" });
  }, []);
  function make() {
    const trimmed = value.trim();
    setError("");
    setSrc("");
    if (!/^https?:\/\/\S+\.\S+/i.test(trimmed)) {
      setError("Paste a full link that starts with https://");
      return;
    }
    onLink(trimmed);
    void import("qrcode")
      .then((mod) => mod.default.toDataURL(trimmed, { margin: 1, width: 640 }))
      .then(setSrc)
      .catch(() => setError("Could not make a code from that."));
  }
  return (
    <section ref={ref} id="qr" className="mt-10 scroll-mt-24 rounded-2xl bg-card p-4 shadow-line" data-qr-section>
      <h2 className="font-display text-2xl tracking-tight">{section.title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-pretty text-muted">{section.blurb}</p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          make();
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block text-muted">Menu link</span>
          <input className={fieldClass} inputMode="url" value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <Button tone="primary" type="submit">
          Make code
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-fail">{error}</p> : null}
      {src ? (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <img src={src} alt={`QR code for ${value.trim()}`} className="size-56 rounded-2xl bg-paper p-3 shadow-line" />
          <a href={src} download="menu-qr.png" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
            Save the image
          </a>
        </div>
      ) : null}
    </section>
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
        className="block w-full max-w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-paper-2 file:px-4 file:py-2 file:text-sm file:font-medium"
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

/** Scam check: the warning signs found, what each means and what to do. A checklist, never a verdict. */
function Scam() {
  const [text, setText] = useState("");
  const signs = scamSigns(text);
  return (
    <div>
      <TextArea value={text} rows={6} placeholder="Paste the message you received" aria-label="The message" onChange={(event) => setText(event.target.value)} />
      {text.trim() ? (
        <section className="mt-4" aria-live="polite" data-scam-result>
          <h2 className="rounded-2xl bg-card p-4 font-medium shadow-line" role="status">
            {scamHeadline(signs.length)}
          </h2>
          {signs.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {signs.map((sign) => (
                <li key={sign.id} className="rounded-2xl bg-card p-4 shadow-line" data-scam-sign={sign.id}>
                  <p className="font-medium">{sign.label}</p>
                  <p className="mt-1 text-pretty text-muted">{sign.meaning}</p>
                  <p className="mt-1 text-pretty">
                    <span className="font-medium">What to do: </span>
                    {sign.todo}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-sm text-pretty text-muted">{SCAM_FOOTNOTE}</p>
        </section>
      ) : null}
    </div>
  );
}

/** Claims: questions to ask before forwarding something. No scam signs, no verdict. */
function Claims() {
  return (
    <ul className="list-disc space-y-2 pl-5" data-claim-questions>
      {CLAIM_QUESTIONS.map((question) => (
        <li key={question}>{question}</li>
      ))}
    </ul>
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
  const result = compareLists(left, right);
  const cents = (value: number) => money(value / 100);
  const list = (items: { cents: number; line: number }[]) => (items.length ? items.map((item) => `${cents(item.cents)} (line ${item.line})`).join(", ") : "None");
  const hasInput = result.left.amounts.length + result.right.amounts.length + result.left.bad.length + result.right.bad.length > 0;
  const clean = result.gap === 0 && !result.onlyLeft.length && !result.onlyRight.length && !result.left.bad.length && !result.right.bad.length;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block text-muted">Your records (one amount per line)</span>
        <TextArea rows={8} value={left} placeholder={"12,500\n3,000\n780.50"} onChange={(event) => setLeft(event.target.value)} />
        <span className="mt-1 block text-xs text-muted">
          {result.left.amounts.length} amounts · total {cents(result.leftTotal)}
        </span>
        <BadLines side="your records" lines={result.left.bad} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted">Bank or statement (one amount per line)</span>
        <TextArea rows={8} value={right} placeholder={"12,500\n780.50"} onChange={(event) => setRight(event.target.value)} />
        <span className="mt-1 block text-xs text-muted">
          {result.right.amounts.length} amounts · total {cents(result.rightTotal)}
        </span>
        <BadLines side="the statement" lines={result.right.bad} />
      </label>
      {hasInput ? (
        <>
          <p className={cn("rounded-2xl p-4 font-medium sm:col-span-2", clean ? "bg-pine text-paper" : "bg-card shadow-line")}>
            {clean
              ? "Every amount appears in both lists, and the totals agree. This compares amounts only, not dates or payees."
              : result.gap === 0
                ? "The totals agree, but not every line pairs up."
                : `The totals differ by ${cents(Math.abs(result.gap))}.`}
          </p>
          <Lines
            copy={false}
            lines={[
              { label: `Amounts that appear in both lists (${result.both.length})`, value: result.both.length ? result.both.map((pair) => cents(pair.cents)).join(", ") : "None" },
              { label: `Only in your records (${result.onlyLeft.length})`, value: list(result.onlyLeft) },
              { label: `Only on the statement (${result.onlyRight.length})`, value: list(result.onlyRight) },
              { label: "Lines that could not be read", value: String(result.left.bad.length + result.right.bad.length) },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

function BadLines({ side, lines }: { side: string; lines: BadLine[] }) {
  if (!lines.length) return null;
  return (
    <span role="status" className="mt-2 block rounded-xl bg-card p-3 text-sm text-fail shadow-line">
      <span className="block font-medium">
        {lines.length === 1 ? "1 line" : `${lines.length} lines`} in {side} could not be read and {lines.length === 1 ? "is" : "are"} not counted:
      </span>
      {lines.slice(0, 12).map((line) => (
        <span key={line.line} className="block">
          Line {line.line}: “{line.text.length > 40 ? `${line.text.slice(0, 40)}…` : line.text}” {line.reason}.
        </span>
      ))}
      {lines.length > 12 ? <span className="block">And {lines.length - 12} more.</span> : null}
    </span>
  );
}


function saveLabel(state: SaveState): string {
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "error") return "Could not save";
  if (state === "retrying") return SAVE_MESSAGES.retrying;
  if (state === "conflict") return SAVE_MESSAGES.conflict;
  if (state === "too-large") return SAVE_MESSAGES.tooLarge;
  return "";
}
