import type { ReactNode } from "react";
import { Button, Field, TextArea, TextInput, cn, fieldClass } from "@/components/ui";
import { CurrencyPicker, nid } from "@/components/tools/shared";
import { roundingNote, toMajor, type InvoiceCheck } from "@/lib/invoice-math";
import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/format";
import {
  MAX_LINES,
  STATE_LABEL,
  clientBlock,
  emptyLine,
  parseClientText,
  type Client,
  type InvoiceState,
  type Line,
  type QuoteState,
} from "@/lib/client-work";

const invalidClass = "border-fail focus-visible:border-fail";

export function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <span id={id} className="mt-1 block text-sm text-fail">
      {message}
    </span>
  );
}

export function StateBadge({ state }: { state: InvoiceState | QuoteState }) {
  const tone =
    state === "paid" || state === "accepted" || state === "invoiced"
      ? "bg-pine/10 text-pine"
      : state === "overdue" || state === "expired" || state === "declined"
        ? "bg-fail/10 text-fail"
        : state === "sent"
          ? "bg-paper-2 text-ink"
          : "bg-paper-2 text-muted";
  return (
    <span data-state={state} className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone)}>
      {STATE_LABEL[state]}
    </span>
  );
}

export function currencyName(code: CurrencyCode): string {
  return CURRENCIES.find((item) => item.code === code)?.label.replace(/^\S+\s/, "") ?? code;
}

/** Why printing is blocked, or null. */
export function printBlockOf(check: InvoiceCheck): string | null {
  if (check.formError) return check.formError;
  if (check.errorCount > 0) {
    return `Fix the ${check.errorCount === 1 ? "highlighted field" : `${check.errorCount} highlighted fields`} to print. No total is shown until every amount is valid.`;
  }
  return null;
}

/** Saved clients to pick from, plus the "Bill to" block itself. */
export function BillTo({
  idBase,
  label,
  to,
  clientId,
  clients,
  onChange,
  onSaveClient,
}: {
  idBase: string;
  label: string;
  to: string;
  clientId?: string;
  clients: readonly Client[];
  onChange: (next: { to: string; clientId?: string }) => void;
  onSaveClient: () => void;
}) {
  const linked = clientId ? clients.find((item) => item.id === clientId) : undefined;
  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-2">
      {clients.length > 0 ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Saved client</span>
          <select
            id={`${idBase}-client`}
            className={fieldClass}
            value={linked?.id ?? ""}
            onChange={(event) => {
              const client = clients.find((item) => item.id === event.target.value);
              onChange(client ? { to: clientBlock(client), clientId: client.id } : { to, clientId: undefined });
            }}
          >
            <option value="">{linked ? "None" : "Choose a saved client…"}</option>
            {sorted.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Field label={label}>
        <TextArea
          value={to}
          onChange={(event) => {
            const text = event.target.value;
            // Still the same client if the name line is unchanged.
            const keep = linked && parseClientText(text).name === linked.name;
            onChange({ to: text, clientId: keep ? linked.id : undefined });
          }}
          className="min-h-24"
          maxLength={400}
          placeholder={"Client name\nemail@example.com\nAddress"}
        />
      </Field>
      {!linked && parseClientText(to).name ? (
        <Button tone="quiet" onClick={onSaveClient}>
          Save “{parseClientText(to).name.slice(0, 40)}” as a client
        </Button>
      ) : null}
    </div>
  );
}

/** The line-item rows, with inline errors from the shared maths. */
export function LineEditor({
  idBase,
  lines,
  check,
  onChange,
}: {
  idBase: string;
  lines: Line[];
  check: InvoiceCheck;
  onChange: (lines: Line[]) => void;
}) {
  const set = (id: string, patch: Partial<Line>) => onChange(lines.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Line items</p>
      {lines.map((line, index) => {
        const lineCheck = check.lines[index];
        const qtyErrorId = `${idBase}-qty-error-${line.id}`;
        const rateErrorId = `${idBase}-rate-error-${line.id}`;
        return (
          <div key={line.id} data-line={index + 1}>
            <div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[1fr_5rem_6rem_auto]">
              <TextInput
                value={line.description}
                aria-label={`Description ${index + 1}`}
                placeholder="Description"
                maxLength={120}
                className="col-span-2 sm:col-span-1"
                onChange={(event) => set(line.id, { description: event.target.value })}
              />
              <TextInput
                inputMode="decimal"
                value={line.qty}
                aria-label={`Quantity ${index + 1}`}
                placeholder="Qty"
                aria-invalid={lineCheck?.qtyError ? true : undefined}
                aria-describedby={lineCheck?.qtyError ? qtyErrorId : undefined}
                className={cn(lineCheck?.qtyError && invalidClass)}
                onChange={(event) => set(line.id, { qty: event.target.value })}
              />
              <TextInput
                inputMode="decimal"
                value={line.rate}
                aria-label={`Rate ${index + 1}`}
                placeholder="Rate"
                aria-invalid={lineCheck?.rateError ? true : undefined}
                aria-describedby={lineCheck?.rateError ? rateErrorId : undefined}
                className={cn(lineCheck?.rateError && invalidClass)}
                onChange={(event) => set(line.id, { rate: event.target.value })}
              />
              <Button
                tone="quiet"
                className="col-span-2 sm:col-span-1"
                disabled={lines.length <= 1}
                aria-label={`Remove line ${index + 1}`}
                onClick={() => onChange(lines.filter((item) => item.id !== line.id))}
              >
                Remove
              </Button>
            </div>
            <FieldError id={qtyErrorId} message={lineCheck?.qtyError ? `Line ${index + 1}: ${lineCheck.qtyError}` : null} />
            <FieldError id={rateErrorId} message={lineCheck?.rateError ? `Line ${index + 1}: ${lineCheck.rateError}` : null} />
          </div>
        );
      })}
      <Button tone="quiet" disabled={lines.length >= MAX_LINES} onClick={() => onChange([...lines, emptyLine(nid())])}>
        Add a line
      </Button>
    </div>
  );
}

export function TaxField({ idBase, value, check, onChange }: { idBase: string; value: string; check: InvoiceCheck; onChange: (value: string) => void }) {
  const errorId = `${idBase}-tax-error`;
  return (
    <Field label="Tax percent">
      <TextInput
        inputMode="decimal"
        value={value}
        aria-invalid={check.taxError ? true : undefined}
        aria-describedby={check.taxError ? errorId : undefined}
        className={cn(check.taxError && invalidClass)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={errorId} message={check.taxError} />
    </Field>
  );
}

export { CurrencyPicker };

/**
 * The printable page for an invoice or a quote. On a phone, quantity and rate
 * sit under the description so the amounts never run off the screen; printed,
 * they have their own columns.
 */
export function BillSheet({
  title,
  number,
  dates,
  from,
  to,
  lines,
  check,
  currency,
  notes,
  stamp,
  printBlock,
}: {
  title: string;
  number: string;
  dates: { label: string; value: string; strong?: boolean }[];
  from: string;
  to: string;
  lines: Line[];
  check: InvoiceCheck;
  currency: CurrencyCode;
  notes: string;
  stamp?: ReactNode;
  printBlock: string | null;
}) {
  const fmtMinor = (minor: number | null) => (minor == null ? "—" : formatMoney(toMajor(minor, currency), currency));
  return (
    <article aria-label={`${title} ${number || ""} page`.replace(/\s+/g, " ").trim()} className="invoice-sheet min-w-0 rounded-3xl bg-card p-5 shadow-line sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{title}</p>
          <p className="font-display text-3xl tracking-tight break-words sm:text-4xl">{number || "—"}</p>
          {stamp}
        </div>
        <div className="text-right text-sm text-muted">
          {dates.map((item) => (
            <p key={item.label} className={item.strong ? "font-medium text-ink" : undefined}>
              {item.label} {item.value || "—"}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-sm text-muted">From</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{from.trim() || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted">{title === "Quote" ? "For" : "Bill to"}</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{to.trim() || "—"}</p>
        </div>
      </div>
      <table className="mt-8 w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 font-medium">Description</th>
            <th className="hidden w-16 py-2 text-right font-medium sm:table-cell">Qty</th>
            <th className="hidden w-32 py-2 text-right font-medium sm:table-cell">Rate</th>
            <th className="w-32 py-2 text-right font-medium sm:w-36">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const lineCheck = check.lines[index];
            if (!lineCheck || lineCheck.empty) return null;
            const qty = lineCheck.qtyError ? "—" : line.qty.trim();
            return (
              <tr key={line.id} className="border-b border-line align-top">
                <td className="py-2 pr-3 break-words">
                  {line.description.trim() || "—"}
                  <span className="block text-xs text-muted tabular-nums sm:hidden">
                    {qty} × {fmtMinor(lineCheck.rateMinor)}
                  </span>
                </td>
                <td className="hidden py-2 text-right tabular-nums sm:table-cell">{qty}</td>
                <td className="hidden py-2 text-right tabular-nums sm:table-cell">{fmtMinor(lineCheck.rateMinor)}</td>
                <td className="py-2 text-right tabular-nums">{fmtMinor(lineCheck.amountMinor)}</td>
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
          <div className="flex justify-between gap-4 pt-2 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums" data-total>
              {fmtMinor(check.totalMinor)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 ml-auto max-w-xs text-right text-sm text-fail" data-testid="invoice-no-total">
          No total yet. {printBlock}
        </p>
      )}
      {notes.trim() ? <p className="mt-6 whitespace-pre-wrap break-words text-sm text-muted">{notes.trim()}</p> : null}
      <p className="mt-6 text-xs text-muted">
        Amounts in {currencyName(currency)} ({currency}). {roundingNote(currency)}
      </p>
    </article>
  );
}
