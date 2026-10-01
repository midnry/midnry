import { useAppDoc } from "@/components/use-app-doc";
import { Button, Field, TextArea, TextInput } from "@/components/ui";
import { formatDollars } from "@/lib/format";
import { nid, todayISO, ToolFrame, ToolStatus } from "@/components/tools/shared";

type Line = { id: string; description: string; qty: string; rate: string };
type InvoiceDoc = {
  from: string;
  to: string;
  number: string;
  issued: string;
  notes: string;
  taxPercent: string;
  lines: Line[];
};

const FALLBACK: InvoiceDoc = {
  from: "",
  to: "",
  number: "0001",
  issued: todayISO(),
  notes: "",
  taxPercent: "0",
  lines: [{ id: "line-1", description: "", qty: "1", rate: "" }],
};

function asInvoice(value: InvoiceDoc): InvoiceDoc {
  const lines = Array.isArray(value.lines)
    ? value.lines
        .filter(
          (line): line is Line =>
            !!line &&
            typeof line.id === "string" &&
            typeof line.description === "string" &&
            typeof line.qty === "string" &&
            typeof line.rate === "string",
        )
        .slice(0, 30)
    : [];
  return {
    from: typeof value.from === "string" ? value.from : "",
    to: typeof value.to === "string" ? value.to : "",
    number: typeof value.number === "string" ? value.number : "0001",
    issued: typeof value.issued === "string" ? value.issued : todayISO(),
    notes: typeof value.notes === "string" ? value.notes : "",
    taxPercent: typeof value.taxPercent === "string" ? value.taxPercent : "0",
    lines: lines.length > 0 ? lines : FALLBACK.lines,
  };
}

function lineTotal(line: Line): number | null {
  if (!/^\d+(\.\d+)?$/.test(line.qty.trim()) || !/^\d+(\.\d{1,2})?$/.test(line.rate.trim())) return null;
  const qty = Number(line.qty);
  const rate = Number(line.rate);
  if (!Number.isFinite(qty) || !Number.isFinite(rate) || qty < 0 || rate < 0) return null;
  return qty * rate;
}

export function InvoiceTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc("invoice", FALLBACK);
  const invoice = asInvoice(data);

  function patch(next: Partial<InvoiceDoc>) {
    setData({ ...invoice, ...next });
  }

  const subtotal = invoice.lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0);
  const taxRate = /^\d+(\.\d+)?$/.test(invoice.taxPercent.trim()) ? Number(invoice.taxPercent) : 0;
  const safeTax = Number.isFinite(taxRate) && taxRate >= 0 && taxRate <= 100 ? taxRate : 0;
  const tax = subtotal * (safeTax / 100);
  const total = subtotal + tax;

  return (
    <ToolFrame slug="invoice" saveState={saveState} hideOnPrint>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <form className="no-print space-y-4" onSubmit={(event) => event.preventDefault()}>
            <Field label="From">
              <TextArea
                value={invoice.from}
                onChange={(event) => patch({ from: event.target.value })}
                className="min-h-24"
                maxLength={240}
              />
            </Field>
            <Field label="Bill to">
              <TextArea
                value={invoice.to}
                onChange={(event) => patch({ to: event.target.value })}
                className="min-h-24"
                maxLength={240}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Invoice number">
                <TextInput
                  value={invoice.number}
                  onChange={(event) => patch({ number: event.target.value })}
                  maxLength={24}
                />
              </Field>
              <Field label="Issued">
                <TextInput
                  type="date"
                  value={invoice.issued}
                  onChange={(event) => patch({ issued: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Tax percent">
              <TextInput
                inputMode="decimal"
                value={invoice.taxPercent}
                onChange={(event) => patch({ taxPercent: event.target.value })}
              />
            </Field>
            <div className="space-y-3">
              <p className="text-sm font-medium">Line items</p>
              {invoice.lines.map((line, index) => (
                <div key={line.id} className="grid gap-2 sm:grid-cols-[1fr_5rem_6rem_auto]">
                  <TextInput
                    value={line.description}
                    aria-label={`Description ${index + 1}`}
                    placeholder="Description"
                    maxLength={120}
                    onChange={(event) =>
                      patch({
                        lines: invoice.lines.map((item) =>
                          item.id === line.id ? { ...item, description: event.target.value } : item,
                        ),
                      })
                    }
                  />
                  <TextInput
                    inputMode="decimal"
                    value={line.qty}
                    aria-label={`Quantity ${index + 1}`}
                    placeholder="Qty"
                    onChange={(event) =>
                      patch({
                        lines: invoice.lines.map((item) =>
                          item.id === line.id ? { ...item, qty: event.target.value } : item,
                        ),
                      })
                    }
                  />
                  <TextInput
                    inputMode="decimal"
                    value={line.rate}
                    aria-label={`Rate ${index + 1}`}
                    placeholder="Rate"
                    onChange={(event) =>
                      patch({
                        lines: invoice.lines.map((item) =>
                          item.id === line.id ? { ...item, rate: event.target.value } : item,
                        ),
                      })
                    }
                  />
                  <Button
                    tone="quiet"
                    disabled={invoice.lines.length <= 1}
                    onClick={() => patch({ lines: invoice.lines.filter((item) => item.id !== line.id) })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                tone="quiet"
                disabled={invoice.lines.length >= 30}
                onClick={() =>
                  patch({
                    lines: [...invoice.lines, { id: nid(), description: "", qty: "1", rate: "" }],
                  })
                }
              >
                Add a line
              </Button>
            </div>
            <Field label="Notes">
              <TextArea
                value={invoice.notes}
                onChange={(event) => patch({ notes: event.target.value })}
                className="min-h-20"
                maxLength={400}
              />
            </Field>
            <Button tone="primary" onClick={() => window.print()}>
              Print
            </Button>
          </form>

          <article className="invoice-sheet rounded-3xl bg-card p-6 shadow-line sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Invoice</p>
                <p className="font-display text-4xl tracking-tight">{invoice.number || "—"}</p>
              </div>
              <p className="text-sm text-muted">{invoice.issued || "No date"}</p>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted">From</p>
                <p className="mt-1 whitespace-pre-wrap">{invoice.from.trim() || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Bill to</p>
                <p className="mt-1 whitespace-pre-wrap">{invoice.to.trim() || "—"}</p>
              </div>
            </div>
            <table className="mt-8 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => {
                  const amount = lineTotal(line);
                  return (
                    <tr key={line.id} className="border-b border-line">
                      <td className="py-2 pr-3">{line.description.trim() || "—"}</td>
                      <td className="py-2 text-right tabular-nums">{line.qty || "—"}</td>
                      <td className="py-2 text-right tabular-nums">
                        {line.rate.trim() ? formatDollars(Number(line.rate)) : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {amount == null ? "—" : formatDollars(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatDollars(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Tax {safeTax}%</dt>
                <dd className="tabular-nums">{formatDollars(tax)}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-2 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatDollars(total)}</dd>
              </div>
            </dl>
            {invoice.notes.trim() ? (
              <p className="mt-6 whitespace-pre-wrap text-sm text-muted">{invoice.notes.trim()}</p>
            ) : null}
          </article>
        </div>
      </ToolStatus>
    </ToolFrame>
  );
}
