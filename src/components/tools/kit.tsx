import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { ToolFrame, ToolStatus } from "@/components/tools/shared";
import { draftText } from "@/lib/draft.functions";
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

function Lines({ lines }: { lines: Line[] }) {
  if (lines.length === 0) return null;
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      {lines.map((line) => (
        <div key={line.label} className="rounded-2xl bg-card p-4 shadow-line">
          <dt className="text-sm text-muted">{line.label}</dt>
          <dd className="mt-1 font-medium">{line.value}</dd>
        </div>
      ))}
    </dl>
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
          {field.kind === "area" ? (
            <TextArea
              value={values[field.id] ?? ""}
              placeholder={field.placeholder}
              rows={5}
              onChange={(event) => onChange({ ...values, [field.id]: event.target.value })}
            />
          ) : (
            <TextInput
              type={field.kind === "number" ? "number" : "text"}
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
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc(`kit:${kit.slug}`, { values: {} as Record<string, string> });
  const values = data.values ?? {};
  const revenue = Number(values.revenue);
  const cogs = Number(values.cogs);
  const expenses = Number(values.expenses);
  const showStatement = kit.slug === "statements" && [revenue, cogs, expenses].every((item) => Number.isFinite(item));
  return (
    <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
      <Fields fields={kit.parts} values={values} onChange={(next) => setData({ values: next })} />
      {showStatement ? (
        <Lines
          lines={[
            { label: "Gross profit", value: (revenue - cogs).toLocaleString("en") },
            { label: "Net", value: (revenue - cogs - expenses).toLocaleString("en") },
          ]}
        />
      ) : null}
      <p className="mt-3 text-sm text-muted">{saveLabel(saveState)}</p>
    </ToolStatus>
  );
}

function Tracker({ kit }: { kit: Extract<Kit, { kind: "tracker" }> }) {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc(`kit:${kit.slug}`, {
    rows: [] as Record<string, string>[],
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const income = rows.filter((row) => /income/i.test(row.side || "")).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const cost = rows.filter((row) => /cost/i.test(row.side || "")).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const hasSide = kit.fields.some((field) => field.id === "side");
  return (
    <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
      <Fields fields={kit.fields} values={draft} onChange={setDraft} />
      <Button
        tone="primary"
        className="mt-3"
        onClick={() => {
          if (!Object.values(draft).some((item) => item.trim())) return;
          setData({ rows: [...rows, draft] });
          setDraft({});
        }}
      >
        Add
      </Button>
      {hasSide ? <Lines lines={[{ label: "In", value: income.toLocaleString("en") }, { label: "Out", value: cost.toLocaleString("en") }, { label: "Left", value: (income - cost).toLocaleString("en") }]} /> : null}
      <ul className="mt-4 space-y-2">
        {rows.map((row, index) => {
          const low = row.low != null && row.qty != null && Number(row.qty) <= Number(row.low);
          return (
            <li key={`${index}-${row.item || row.name || row.buyer || ""}`} className="flex items-start justify-between gap-3 rounded-2xl bg-card p-4 shadow-line">
              <span>
                {Object.entries(row).map(([key, value]) => (
                  <span key={key} className="mr-3">
                    {value}
                  </span>
                ))}
                {low ? <span className="text-pine">Low</span> : null}
              </span>
              <button type="button" className="text-sm text-muted" onClick={() => setData({ rows: rows.filter((_, item) => item !== index) })}>
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">{saveLabel(saveState)}</p>
    </ToolStatus>
  );
}

function Cards({ kit }: { kit: Extract<Kit, { kind: "cards" }> }) {
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState(false);
  const [order, setOrder] = useState(kit.deck.map((_, item) => item));
  const card = kit.deck[order[index] ?? 0];
  return (
    <div>
      <button type="button" onClick={() => setFlip((value) => !value)} className="min-h-40 w-full rounded-2xl bg-card p-6 text-left shadow-line">
        <span className="text-sm text-muted">{flip ? "Back" : "Front"}</span>
        <span className="mt-3 block text-xl">{flip ? card?.back : card?.front}</span>
      </button>
      <div className="mt-3 flex gap-2">
        <Button
          tone="quiet"
          onClick={() => {
            setFlip(false);
            setIndex((value) => (value + 1) % order.length);
          }}
        >
          Next
        </Button>
        <Button
          tone="quiet"
          onClick={() => {
            setOrder([...order].sort(() => Math.random() - 0.5));
            setIndex(0);
            setFlip(false);
          }}
        >
          Shuffle
        </Button>
      </div>
    </div>
  );
}

function Quiz({ kit }: { kit: Extract<Kit, { kind: "quiz" }> }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const question = kit.questions[index];
  if (!question) return <p>Score {score} of {kit.questions.length}.</p>;
  return (
    <div>
      <p className="font-medium">{question.q}</p>
      <div className="mt-3 grid gap-2">
        {question.options.map((option, optionIndex) => (
          <button
            key={option}
            type="button"
            className="rounded-2xl bg-card px-4 py-3 text-left shadow-line"
            onClick={() => {
              if (picked != null) return;
              setPicked(optionIndex);
              if (optionIndex === question.answer) setScore((value) => value + 1);
            }}
          >
            {option}
          </button>
        ))}
      </div>
      {picked != null ? <p className="mt-3 text-sm text-muted">{question.why}</p> : null}
      {picked != null ? (
        <Button
          tone="primary"
          className="mt-3"
          onClick={() => {
            setPicked(null);
            setIndex((value) => value + 1);
          }}
        >
          {index + 1 === kit.questions.length ? "Finish" : "Next"}
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
  return (
    <div>
      <TextArea value={prompt} placeholder={kit.placeholder} onChange={(event) => setPrompt(event.target.value)} />
      <TextInput className="mt-3" value={apiKey} placeholder="xAI key, if the server does not have one" onChange={(event) => setApiKey(event.target.value)} />
      <Button
        tone="primary"
        className="mt-3"
        disabled={busy || !prompt.trim()}
        onClick={() => {
          setBusy(true);
          setError("");
          void draftText({ data: { system: kit.system, prompt, apiKey: apiKey || undefined } })
            .then((result) => {
              if (result.ok) setText(result.text);
              else setError(result.error);
            })
            .catch(() => setError("Could not draft that."))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Working" : "Draft"}
      </Button>
      {error ? <p className="mt-3 text-sm text-fail">{error}</p> : null}
      {text ? <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-card p-4 shadow-line">{text}</pre> : null}
    </div>
  );
}

function Cite({ mode }: { mode: "paper" | "legal" }) {
  const [values, setValues] = useState<Record<string, string>>({ style: "APA" });
  const fields: Field[] =
    mode === "legal"
      ? [f("parties", "Parties", "Ade v Bello"), f("year", "Year", "2024"), f("report", "Report", "[2024] 5 NWLR")]
      : [f("author", "Author", "Adebayo, T."), f("year", "Year", "2024"), f("title", "Title"), f("source", "Source")];
  const line =
    mode === "legal"
      ? `${values.parties || "Parties"} ${values.report || ""} ${values.year ? `(${values.year})` : ""}`.trim()
      : values.style === "MLA"
        ? `${values.author || "Author"}. "${values.title || "Title"}." ${values.source || "Source"}, ${values.year || "n.d."}.`
        : values.style === "Chicago"
          ? `${values.author || "Author"}. ${values.year || "n.d."}. ${values.title || "Title"}. ${values.source || "Source"}.`
          : `${values.author || "Author"} (${values.year || "n.d."}). ${values.title || "Title"}. ${values.source || "Source"}.`;
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

function Units() {
  const tables: Record<string, Record<string, number>> = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254 },
    mass: { kg: 1, g: 0.001, lb: 0.453592 },
    volume: { L: 1, mL: 0.001 },
  };
  const [group, setGroup] = useState("length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("cm");
  const [value, setValue] = useState("1");
  const units = Object.keys(tables[group] ?? {});
  const result = useMemo(() => {
    if (group === "temperature") {
      const input = Number(value);
      if (!Number.isFinite(input)) return "—";
      const c = from === "C" ? input : from === "F" ? ((input - 32) * 5) / 9 : input - 273.15;
      const out = to === "C" ? c : to === "F" ? (c * 9) / 5 + 32 : c + 273.15;
      return String(Math.round(out * 1000) / 1000);
    }
    const table = tables[group];
    const input = Number(value);
    if (!table || !Number.isFinite(input)) return "—";
    return String(Math.round((input * table[from]) / table[to] * 1000) / 1000);
  }, [from, group, to, value]);
  const choices = group === "temperature" ? ["C", "F", "K"] : units;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block text-muted">Measure</span>
        <select className={fieldClass} value={group} onChange={(event) => { setGroup(event.target.value); setFrom(event.target.value === "temperature" ? "C" : "m"); setTo(event.target.value === "temperature" ? "F" : "cm"); }}>
          <option value="length">Length</option>
          <option value="mass">Mass</option>
          <option value="volume">Volume</option>
          <option value="temperature">Temperature</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted">Value</span>
        <TextInput value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <Select label="From" value={from} options={choices} onChange={setFrom} />
      <Select label="To" value={to} options={choices} onChange={setTo} />
      <p className="sm:col-span-2 font-medium">{result}</p>
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
  const rec = useRef<MediaRecorder | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <Button
        tone="primary"
        onClick={() => {
          void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            recorder.ondataavailable = (event) => chunks.push(event.data);
            recorder.onstop = () => {
              setUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
              stream.getTracks().forEach((track) => track.stop());
            };
            recorder.start();
            rec.current = recorder;
          });
        }}
      >
        Record
      </Button>
      <Button tone="quiet" onClick={() => rec.current?.stop()}>Stop</Button>
      {url ? <audio controls src={url} className="w-full" /> : null}
      {url ? <a className="text-sm underline" href={url} download="message.webm">Download</a> : null}
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
  return (
    <div>
      <TextArea value={text} onChange={(event) => setText(event.target.value)} className="min-h-48 text-2xl" />
      <div className="mt-3 flex gap-2">
        <Button tone="primary" onClick={() => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }}>Speak</Button>
        <Button tone="quiet" onClick={() => window.speechSynthesis.cancel()}>Stop</Button>
      </div>
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
    [/urgent|immediately|now|last chance|act fast/, "It pushes you to act quickly."],
    [/gift card|bitcoin|crypto|wire|otp|one-time|password|code/, "It asks for money, a code, or a password."],
    [/https?:\/\/|bit\.ly|wa\.me/, "It contains a link. Open it only if you know the site."],
    [/won|prize|inheritance|congratulations/, "It offers a prize you did not enter."],
    [/bank|account (has been|will be) (blocked|closed)/, "It threatens an account."],
  ];
  const hits = checks.filter(([pattern]) => pattern.test(lower)).map(([, note]) => note);
  return (
    <div>
      <TextArea value={text} placeholder={rumors ? "Paste the claim" : "Paste the message"} onChange={(event) => setText(event.target.value)} />
      {rumors ? (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          <li>Who said it, and can you open that source yourself?</li>
          <li>Does the date and the place match?</li>
          <li>If it asks you to forward it, wait.</li>
        </ul>
      ) : null}
      <ul className="mt-4 space-y-2">
        {text.trim() && hits.length === 0 ? <li>No common signs in this text. That does not make it safe.</li> : null}
        {hits.map((hit) => (
          <li key={hit} className="rounded-2xl bg-card p-4 shadow-line">{hit}</li>
        ))}
      </ul>
    </div>
  );
}

function Mood({ slug }: { slug: string }) {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc(`kit:${slug}`, {
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
    ? [{ label: "Units", value: String(Math.ceil(fCost / gap)) }, { label: "Sales", value: String(Math.ceil(fCost / gap) * p) }]
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
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm"><span className="mb-1 block text-muted">Yours</span><TextArea value={left} onChange={(event) => setLeft(event.target.value)} /></label>
      <label className="text-sm"><span className="mb-1 block text-muted">Theirs</span><TextArea value={right} onChange={(event) => setRight(event.target.value)} /></label>
      <Lines lines={[
        { label: "Only yours", value: onlyA.join(", ") || "None" },
        { label: "Only theirs", value: onlyB.join(", ") || "None" },
        { label: "Difference of totals", value: String(Math.round((sum(a) - sum(b)) * 100) / 100) },
      ]} />
    </div>
  );
}

function amounts(text: string): number[] {
  return text.split(/\n/).map((line) => Number(line.trim())).filter((item) => Number.isFinite(item));
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
