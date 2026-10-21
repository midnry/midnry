import { useId, useState } from "react";
import { addDays, parseIso } from "@/lib/remind/dates";
import { cn } from "@/components/ui";
import { DemoGrid, Step, demoInput, useToday } from "./demo-kit";
import { SAMPLES, moneyFor, useDemoCurrency, type Money } from "./demo-currency";

/**
 * Invoice with sample line items. The sums follow the Invoice app exactly
 * (src/components/tools/invoice.tsx): quantity × rate per line, tax as a
 * percent of the subtotal, and "—" for a line that is not a number yet.
 * The sample (amounts, places, tax rate) follows the demo currency; switching
 * currency starts a fresh sample in that currency. Nothing is sent or saved.
 */

type Line = { id: string; description: string; qty: string; rate: string };

const MAX_LINES = 6;

function plain(raw: string): string {
  return raw.trim().replace(/[,\s]/g, "");
}

function lineTotal(line: Line): number | null {
  if (!/^\d+(\.\d+)?$/.test(plain(line.qty)) || !/^\d+(\.\d{1,2})?$/.test(plain(line.rate))) return null;
  const qty = Number(plain(line.qty));
  const rate = Number(plain(line.rate));
  if (!Number.isFinite(qty) || !Number.isFinite(rate) || qty < 0 || rate < 0) return null;
  return qty * rate;
}

function rateText(line: Line, money: Money): string {
  const rate = plain(line.rate);
  return rate && Number.isFinite(Number(rate)) ? money.format(Number(rate)) : "—";
}

function dayText(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function InvoiceDemo() {
  const { currency } = useDemoCurrency();
  return <InvoiceSample key={currency} money={moneyFor(currency)} />;
}

function InvoiceSample({ money }: { money: Money }) {
  const ids = useId();
  const today = useToday();
  const sample = SAMPLES[money.code].invoice;
  const [lines, setLines] = useState<Line[]>(() => sample.lines.map((line, index) => ({ id: `l${index + 1}`, ...line })));
  const [client, setClient] = useState(sample.client);
  const [taxPercent, setTaxPercent] = useState(sample.taxPercent);
  const [count, setCount] = useState(sample.lines.length);
  // Flash the total only after the visitor changes something, not on load.
  const [edited, setEdited] = useState(false);

  const subtotal = lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0);
  const taxRate = /^\d+(\.\d+)?$/.test(taxPercent.trim()) ? Number(taxPercent) : 0;
  const safeTax = Number.isFinite(taxRate) && taxRate >= 0 && taxRate <= 100 ? taxRate : 0;
  const tax = subtotal * (safeTax / 100);
  const total = subtotal + tax;

  function edit(id: string, change: Partial<Line>) {
    setEdited(true);
    setLines((all) => all.map((line) => (line.id === id ? { ...line, ...change } : line)));
  }

  return (
    <DemoGrid
      input={
        <Step n={1} title="Add what you did">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Bill to</span>
            <input value={client} onChange={(event) => setClient(event.target.value.slice(0, 80))} className={demoInput} />
          </label>
          <fieldset className="mt-5">
            <legend className="text-sm text-muted">Line items</legend>
            <div className="mt-1.5 hidden grid-cols-[minmax(0,1fr)_4rem_6.5rem_2.75rem] gap-2 text-xs text-muted sm:grid" aria-hidden>
              <span>Description</span>
              <span>Qty</span>
              <span>Rate ({money.symbol})</span>
            </div>
            <ul className="mt-1.5 space-y-3 sm:space-y-2">
              {lines.map((line, index) => (
                <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_2.75rem] gap-2 sm:grid-cols-[minmax(0,1fr)_4rem_6.5rem_2.75rem]">
                  <input
                    aria-label={`Description, line ${index + 1}`}
                    value={line.description}
                    placeholder="Description"
                    onChange={(event) => edit(line.id, { description: event.target.value.slice(0, 60) })}
                    className={cn(demoInput, "col-span-3 sm:col-span-1")}
                  />
                  <input
                    aria-label={`Quantity, line ${index + 1}`}
                    inputMode="decimal"
                    value={line.qty}
                    placeholder="Qty"
                    onChange={(event) => edit(line.id, { qty: event.target.value.slice(0, 8) })}
                    className={cn(demoInput, "tabular-nums")}
                  />
                  <input
                    aria-label={`Rate in ${money.name}, line ${index + 1}`}
                    inputMode="decimal"
                    value={line.rate}
                    placeholder="Rate"
                    onChange={(event) => edit(line.id, { rate: event.target.value.slice(0, 12) })}
                    className={cn(demoInput, "tabular-nums")}
                  />
                  <button
                    type="button"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={lines.length <= 1}
                    onClick={() => {
                      setEdited(true);
                      setLines((all) => all.filter((item) => item.id !== line.id));
                    }}
                    className="grid size-11 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-ink disabled:opacity-40"
                  >
                    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <path d="M5 5l10 10M15 5L5 15" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <button
              type="button"
              disabled={lines.length >= MAX_LINES}
              onClick={() => {
                const next = count + 1;
                setCount(next);
                setLines((all) => [...all, { id: `l${next}`, description: "", qty: "1", rate: "" }]);
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-card px-4 text-sm font-medium text-ink shadow-line hover:bg-paper-2 disabled:opacity-50"
            >
              <span aria-hidden>+</span> Add a line
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm text-muted" htmlFor={`${ids}-tax`}>
              Tax %
              <input
                id={`${ids}-tax`}
                inputMode="decimal"
                value={taxPercent}
                onChange={(event) => {
                  setEdited(true);
                  setTaxPercent(event.target.value.slice(0, 5));
                }}
                className={cn(demoInput, "w-20 tabular-nums")}
              />
            </label>
          </div>
        </Step>
      }
      result={
        <Step n={2} title="Get a finished invoice">
          <article aria-label="Finished invoice, sample" className="rounded-2xl border border-line bg-card p-5 shadow-[0_18px_40px_-28px_rgba(16,32,51,0.45)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Invoice</p>
                <p className="font-display text-3xl tracking-tight">0001</p>
              </div>
              <div className="text-right text-sm text-muted">
                <p>Issued {today ? dayText(today) : "—"}</p>
                <p className="font-medium text-ink">Due {today ? dayText(addDays(today, 14)) : "—"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-muted">From</p>
                <p className="mt-0.5 whitespace-pre-line break-words">{sample.from}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted">Bill to</p>
                <p className="mt-0.5 break-words">{client.trim() || "—"}</p>
              </div>
            </div>
            <table className="mt-5 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 font-medium">Description</th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">Qty</th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const amount = lineTotal(line);
                  return (
                    <tr key={line.id} className="border-b border-line align-top">
                      <td className="py-2 pr-3">
                        <span className="break-words">{line.description.trim() || "—"}</span>
                        <span className="block text-xs text-muted tabular-nums sm:hidden">
                          {line.qty || "—"} × {rateText(line, money)}
                        </span>
                      </td>
                      <td className="hidden py-2 text-right tabular-nums sm:table-cell">{line.qty || "—"}</td>
                      <td className="hidden py-2 pl-2 text-right whitespace-nowrap tabular-nums sm:table-cell">{rateText(line, money)}</td>
                      <td className="py-2 pl-2 text-right whitespace-nowrap tabular-nums">{amount == null ? "—" : money.format(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{money.format(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Tax {safeTax}%</dt>
                <dd className="tabular-nums">{money.format(tax)}</dd>
              </div>
              <div key={total} className={cn("-mx-2 flex items-baseline justify-between gap-4 rounded-lg px-2 pt-2 pb-1", edited && "anim-flash")}>
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-2xl tracking-tight tabular-nums">{money.format(total)}</dd>
              </div>
            </dl>
          </article>
          <p className="mt-3 text-sm text-muted">In the app you print it, or save it as a PDF to send by email or WhatsApp.</p>
        </Step>
      }
    />
  );
}
