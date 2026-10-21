import { useId, useState } from "react";
import { addDays, parseIso } from "@/lib/remind/dates";
import { cn } from "@/components/ui";
import { DemoGrid, LiveSummary, Step, demoInput, useDemoTouch, useToday } from "./demo-kit";
import { SAMPLES, moneyFor, useDemoCurrency, type Money } from "./demo-currency";
import { checkInvoice, toMajor, type LineCheck } from "@/lib/invoice-math";

/**
 * Invoice with sample line items. The sums are the Invoice app's own
 * (src/lib/invoice-math.ts): quantity × rate per line rounded to the
 * currency's smallest unit, tax as a percent of the subtotal, and no total
 * while any quantity, rate or tax is invalid.
 * The sample (amounts, places, tax rate) follows the demo currency; switching
 * currency starts a fresh sample in that currency. Nothing is sent or saved.
 */

type Line = { id: string; description: string; qty: string; rate: string };

const MAX_LINES = 6;

function rateText(check: LineCheck | undefined, money: Money): string {
  return check?.rateMinor == null ? "—" : money.format(toMajor(check.rateMinor, money.code));
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
  const [edited, setEditedState] = useState(false);
  const touch = useDemoTouch();
  const setEdited = (value: boolean) => {
    setEditedState(value);
    if (value) touch();
  };

  const check = checkInvoice(lines, taxPercent, money.code);
  const fmtMinor = (minor: number | null) => (minor == null ? "—" : money.format(toMajor(minor, money.code)));
  const problem = check.formError
    ? check.formError
    : check.errorCount > 0
      ? `Fix the ${check.errorCount === 1 ? "highlighted field" : `${check.errorCount} highlighted fields`} to see the total.`
      : null;

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
            <input
              value={client}
              onChange={(event) => {
                setEdited(true);
                setClient(event.target.value.slice(0, 80));
              }}
              className={demoInput}
            />
          </label>
          <fieldset className="mt-5">
            <legend className="text-sm text-muted">Line items</legend>
            <div className="mt-1.5 hidden grid-cols-[minmax(0,1fr)_4rem_6.5rem_2.75rem] gap-2 text-xs text-muted sm:grid" aria-hidden>
              <span>Description</span>
              <span>Qty</span>
              <span>Rate ({money.symbol})</span>
            </div>
            <p className="mt-1 text-xs text-muted sm:hidden">Each line: what you did, then quantity and rate ({money.symbol}).</p>
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
                    aria-invalid={check.lines[index]?.qtyError ? true : undefined}
                    className={cn(demoInput, "tabular-nums", check.lines[index]?.qtyError && "border-fail")}
                  />
                  <input
                    aria-label={`Rate in ${money.name}, line ${index + 1}`}
                    inputMode="decimal"
                    value={line.rate}
                    placeholder="Rate"
                    onChange={(event) => edit(line.id, { rate: event.target.value.slice(0, 12) })}
                    aria-invalid={check.lines[index]?.rateError ? true : undefined}
                    className={cn(demoInput, "tabular-nums", check.lines[index]?.rateError && "border-fail")}
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
                  {check.lines[index]?.qtyError || check.lines[index]?.rateError ? (
                    <p className="col-span-3 text-xs text-fail sm:col-span-4">
                      Line {index + 1}: {[check.lines[index]?.qtyError, check.lines[index]?.rateError].filter(Boolean).join(" ")}
                    </p>
                  ) : null}
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
                setEdited(true);
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
                  setTaxPercent(event.target.value.slice(0, 7));
                }}
                aria-invalid={check.taxError ? true : undefined}
                aria-describedby={check.taxError ? `${ids}-tax-error` : undefined}
                className={cn(demoInput, "w-20 tabular-nums", check.taxError && "border-fail")}
              />
            </label>
          </div>
          {check.taxError ? (
            <p id={`${ids}-tax-error`} className="mt-2 text-right text-xs text-fail">
              {check.taxError}
            </p>
          ) : null}
        </Step>
      }
      result={
        <Step n={2} title="Get a finished invoice">
          <LiveSummary
            active={edited}
            text={check.valid ? `Invoice total ${fmtMinor(check.totalMinor)}, including ${fmtMinor(check.taxMinor)} tax.` : `No total yet. ${problem ?? ""}`}
          />
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
                {lines.map((line, index) => {
                  const lineCheck = check.lines[index];
                  if (!lineCheck || lineCheck.empty) return null;
                  const qty = lineCheck.qtyError ? "—" : line.qty.trim();
                  return (
                    <tr key={line.id} className="border-b border-line align-top">
                      <td className="py-2 pr-3">
                        <span className="break-words">{line.description.trim() || "—"}</span>
                        <span className="block text-xs text-muted tabular-nums sm:hidden">
                          {qty} × {rateText(lineCheck, money)}
                        </span>
                      </td>
                      <td className="hidden py-2 text-right tabular-nums sm:table-cell">{qty}</td>
                      <td className="hidden py-2 pl-2 text-right whitespace-nowrap tabular-nums sm:table-cell">{rateText(lineCheck, money)}</td>
                      <td className="py-2 pl-2 text-right whitespace-nowrap tabular-nums">{fmtMinor(lineCheck.amountMinor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {check.valid ? (
              <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="tabular-nums">{fmtMinor(check.subtotalMinor)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Tax {check.taxPercent}%</dt>
                  <dd className="tabular-nums">{fmtMinor(check.taxMinor)}</dd>
                </div>
                <div key={check.totalMinor} className={cn("-mx-2 flex items-baseline justify-between gap-4 rounded-lg px-2 pt-2 pb-1", edited && "anim-flash")}>
                  <dt className="font-medium">Total</dt>
                  <dd className="font-display text-2xl tracking-tight tabular-nums">{fmtMinor(check.totalMinor)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 ml-auto max-w-xs text-right text-sm text-fail" data-testid="invoice-no-total">
                No total yet. {problem}
              </p>
            )}
          </article>
          <p className="mt-3 text-sm text-muted">In the app you print it, or save it as a PDF to send by email or WhatsApp.</p>
        </Step>
      }
    />
  );
}
