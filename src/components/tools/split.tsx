import { toast } from "sonner";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, Field, TextInput } from "@/components/ui";
import { formatCents, guessCurrency, isCurrency, type CurrencyCode } from "@/lib/format";
import { CurrencyPicker, parseCents, ToolFrame, ToolStatus } from "@/components/tools/shared";

type SplitDoc = { amount: string; people: string; tip: string; currency?: CurrencyCode };

const FALLBACK: SplitDoc = { amount: "", people: "2", tip: "18" };

function asSplit(value: SplitDoc): SplitDoc {
  return {
    amount: typeof value.amount === "string" ? value.amount : "",
    people: typeof value.people === "string" ? value.people : "2",
    tip: typeof value.tip === "string" ? value.tip : "18",
    currency: isCurrency(value.currency) ? value.currency : undefined,
  };
}

function peopleCount(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const count = Number(raw);
  if (count < 1 || count > 100) return null;
  return count;
}

function tipRate(raw: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(raw.trim())) return null;
  const rate = Number(raw);
  if (rate < 0 || rate > 100) return null;
  return rate;
}

export function SplitTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("split", FALLBACK);
  const split = asSplit(data);
  const currency = split.currency ?? guessCurrency();
  const formatUsd = (cents: number) => formatCents(cents, currency);
  const amount = parseCents(split.amount);
  const people = peopleCount(split.people);
  const tip = tipRate(split.tip);
  const readyMath = amount != null && people != null && tip != null;
  const tipCents = readyMath ? Math.round((amount * tip) / 100) : 0;
  const totalCents = readyMath ? amount + tipCents : 0;
  const base = readyMath ? Math.floor(totalCents / people) : 0;
  const extra = readyMath ? totalCents % people : 0;

  const summary = !readyMath
    ? ""
    : extra === 0
      ? `Each person pays ${formatUsd(base)}.`
      : `${people - extra} ${people - extra === 1 ? "person pays" : "people pay"} ${formatUsd(base)}. ${extra} ${extra === 1 ? "person pays" : "people pay"} ${formatUsd(base + 1)}.`;

  return (
    <ToolFrame slug="split" saveState={saveState}>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid max-w-3xl gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Bill amount" hint="Before tip.">
              <TextInput
                inputMode="decimal"
                value={split.amount}
                onChange={(event) => setData({ ...split, amount: event.target.value })}
                placeholder="84.20"
                aria-label="Bill amount"
              />
            </Field>
            <Field label="People" hint="Between 1 and 100.">
              <TextInput
                inputMode="numeric"
                value={split.people}
                onChange={(event) => setData({ ...split, people: event.target.value })}
                aria-label="Number of people"
              />
            </Field>
            <Field label="Tip percent">
              <TextInput
                inputMode="decimal"
                value={split.tip}
                onChange={(event) => setData({ ...split, tip: event.target.value })}
                aria-label="Tip percent"
              />
            </Field>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick tip">
              {["0", "5", "10", "15", "20"].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  aria-pressed={split.tip === rate}
                  onClick={() => setData({ ...split, tip: rate })}
                  className={`h-9 rounded-full px-3 text-sm ${split.tip === rate ? "bg-pine text-paper" : "bg-card shadow-line"}`}
                >
                  {rate === "0" ? "No tip" : `${rate}%`}
                </button>
              ))}
            </div>
            <CurrencyPicker value={currency} onChange={(code) => setData({ ...split, currency: code })} />
          </div>
          <div className="rounded-3xl bg-card p-6 shadow-line sm:p-8">
            <p className="text-sm text-muted">Each person</p>
            <p className="mt-2 font-display text-6xl tabular-nums tracking-tight">
              {readyMath ? formatUsd(extra ? base + 1 : base) : "—"}
            </p>
            <p className="mt-3 text-pretty text-sm text-muted">
              {readyMath ? summary : "Enter an amount, a headcount, and a tip."}
            </p>
            {readyMath ? (
              <dl className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Tip</dt>
                  <dd className="tabular-nums">{formatUsd(tipCents)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Total</dt>
                  <dd className="tabular-nums">{formatUsd(totalCents)}</dd>
                </div>
              </dl>
            ) : null}
            <Button
              tone="quiet"
              className="mt-6"
              disabled={!readyMath}
              onClick={() => {
                if (!summary) return;
                void navigator.clipboard.writeText(summary).then(
                  () => toast.success("Copied the split."),
                  () => toast.error("Could not copy."),
                );
              }}
            >
              Copy the split
            </Button>
          </div>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
