import { parseTask } from "@/lib/remind/parse";
import { billCheck, billCurrency, clientName, daysBetween, invoiceState, type ClientWorkDoc, type Invoice } from "@/lib/client-work";
import { formatMoney, type CurrencyCode } from "@/lib/format";
import { toMajor } from "@/lib/invoice-math";

/**
 * "Needs follow-up": sent invoices that are overdue or due within a few
 * days, most overdue first. It uses the same due-date rule as the Overdue
 * badge (invoiceState): a due date before today is overdue, paid is never
 * listed. Drafts are left out because they have not been sent yet.
 */

export const DUE_SOON_DAYS = 3;

export type FollowUp = {
  invoice: Invoice;
  currency: CurrencyCode;
  totalMinor: number | null;
  name: string;
  /** Days past the due date: 3 means three days overdue, 0 due today, -2 due in two days. */
  daysLate: number;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function validIso(iso: string): boolean {
  if (!ISO.test(iso)) return false;
  const time = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === iso;
}

export function followUps(doc: Pick<ClientWorkDoc, "invoices" | "clients" | "currency">, today: string, guessed: CurrencyCode): FollowUp[] {
  if (!validIso(today)) return [];
  const out: FollowUp[] = [];
  for (const invoice of doc.invoices) {
    if (invoice.status !== "sent" || !validIso(invoice.due)) continue;
    const state = invoiceState(invoice, today);
    const daysLate = daysBetween(invoice.due, today);
    if (state !== "overdue" && daysLate < -DUE_SOON_DAYS) continue;
    const currency = billCurrency(invoice, doc, guessed);
    out.push({ invoice, currency, totalMinor: billCheck(invoice, currency).totalMinor, name: clientName(doc, invoice), daysLate });
  }
  return out.sort((a, b) => b.daysLate - a.daysLate || a.invoice.number.localeCompare(b.invoice.number));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-20" → "20 Oct 2026". */
export function longDate(iso: string): string {
  if (!validIso(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "3 days overdue", "1 day overdue", "Due today", "Due tomorrow", "Due in 2 days". */
export function lateLabel(daysLate: number): string {
  if (daysLate > 0) return `${daysLate} day${daysLate === 1 ? "" : "s"} overdue`;
  if (daysLate === 0) return "Due today";
  if (daysLate === -1) return "Due tomorrow";
  return `Due in ${-daysLate} days`;
}

function firstLine(text: string): string {
  return text.trim().split(/\r?\n/)[0]?.trim() ?? "";
}

/**
 * A polite payment reminder for one invoice, ready to paste into WhatsApp.
 * It only uses this invoice's own details and your How to pay text.
 */
export function reminderMessage(item: FollowUp, input: { from: string; payment?: string }): string {
  const { invoice, daysLate } = item;
  const total = item.totalMinor == null ? "" : ` for ${formatMoney(toMajor(item.totalMinor, item.currency), item.currency)}`;
  const number = invoice.number.trim() || "(no number)";
  const due = longDate(invoice.due);
  const when =
    daysLate > 0
      ? `was due on ${due} (${daysLate} day${daysLate === 1 ? "" : "s"} ago)`
      : daysLate === 0
        ? `is due today, ${due}`
        : `is due on ${due}`;
  const lines = [item.name ? `Hello ${item.name},` : "Hello,", "", `This is a friendly reminder that invoice ${number}${total} ${when}.`];
  lines.push(daysLate > 0 ? "If you have already paid, thank you, and please ignore this message." : "Thank you for arranging payment by then.");
  if (input.payment?.trim()) lines.push("", "How to pay:", input.payment.trim());
  const sender = firstLine(invoice.from) || firstLine(input.from);
  lines.push("", sender ? `Thank you,\n${sender}` : "Thank you.");
  return lines.join("\n");
}

const REMIND_WHEN = "tomorrow 9am";

/**
 * The text "Remind me" puts in Remind's add box. Remind reads dates, times,
 * #projects, @labels, p1–p4 and repeats out of the text, so a client name
 * like "Tomorrow Ventures" or "Lagos #1 Prints" could be cut up. Each
 * candidate is read the way Remind will read it, and the first one whose
 * title survives whole is used.
 */
export function remindText(item: Pick<FollowUp, "invoice" | "name">, today: string): string {
  const number = item.invoice.number.trim();
  const titles = [
    number && item.name ? `Follow up invoice ${number} with ${item.name}` : "",
    number ? `Follow up invoice ${number}` : "",
    "Follow up an unpaid invoice",
  ].filter(Boolean);
  for (const title of titles) {
    const text = `${title} ${REMIND_WHEN}`;
    const parsed = parseTask(text, today);
    if (parsed.title === title && parsed.time === "09:00" && parsed.recur === "none" && !parsed.project && parsed.labels.length === 0 && parsed.priority == null) return text;
  }
  return `Follow up an unpaid invoice ${REMIND_WHEN}`;
}
