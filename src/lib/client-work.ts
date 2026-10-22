/**
 * Client work: the data behind the Invoice app, which now holds invoices,
 * quotes, simple proposals and saved clients in one saved document
 * (app_documents, slug "invoice").
 *
 * Kept free of React so the rules can be tested on their own
 * (scripts/invoice-workflow.test.mjs):
 *  - normalizeDoc reads both the new shape and the old single-invoice shape.
 *    The old invoice becomes the first invoice in the archive, and a copy of
 *    the old fields is kept under `legacy`, so nothing is lost.
 *  - importKitDocs copies the old Quote and Proposal app documents in. Those
 *    documents are only read, never changed or deleted.
 *  - Sums always come from invoice-math (checkInvoice), the same rules the
 *    homepage demo uses: each line rounded half-up to the currency's smallest
 *    unit, tax on the subtotal, no total while any input is invalid.
 */
import { checkInvoice, minorDigits, type InvoiceCheck } from "@/lib/invoice-math";
import { parseNumberInput } from "@/lib/number-input";
import { isCurrency, type CurrencyCode } from "@/lib/format";

export type Line = { id: string; description: string; qty: string; rate: string };
export type InvoiceStatus = "draft" | "sent" | "paid";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

type Bill = {
  id: string;
  number: string;
  from: string;
  to: string;
  clientId?: string;
  issued: string;
  currency?: CurrencyCode;
  notes: string;
  taxPercent: string;
  lines: Line[];
  createdAt: string;
  updatedAt: string;
};

export type Invoice = Bill & {
  due: string;
  status: InvoiceStatus;
  sentOn?: string;
  paidOn?: string;
  /** The quote this invoice was made from. */
  quoteId?: string;
};

export type Quote = Bill & {
  validUntil: string;
  status: QuoteStatus;
  /** The invoice made from this quote. */
  invoiceId?: string;
  /** The proposal this quote was made from. */
  proposalId?: string;
};

export type Proposal = {
  id: string;
  title: string;
  to: string;
  clientId?: string;
  problem: string;
  work: string;
  price: string;
  next: string;
  /** The quote made from this proposal. */
  quoteId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Client = { id: string; name: string; email: string; address: string; createdAt: string };

/** Numbers are `prefix` + the counter padded to `pad` digits, e.g. INV-0007. */
export type Numbering = { prefix: string; next: number; pad: number };

export type ClientWorkDoc = {
  v: 2;
  /** Your details, reused on every new invoice and quote. */
  from: string;
  /** The currency you chose last; new documents start in it. */
  currency?: CurrencyCode;
  numbering: Numbering;
  quoteNumbering: Numbering;
  invoices: Invoice[];
  quotes: Quote[];
  proposals: Proposal[];
  clients: Client[];
  /** Old app documents already copied in (they are never changed). */
  imported: { quote?: boolean; proposal?: boolean };
  /** The document open last time, so the app reopens where you left off. */
  openId?: string;
  /** The old single-invoice document, kept as it was. */
  legacy?: Record<string, unknown>;
};

export const MAX_LINES = 30;
export const LEGACY_INVOICE_ID = "invoice-1";
export const LEGACY_CLIENT_ID = "client-1";
export const KIT_QUOTE_ID = "quote-from-quote-app";
export const KIT_PROPOSAL_ID = "proposal-from-proposal-app";

const DEFAULT_NUMBERING: Numbering = { prefix: "", next: 1, pad: 4 };
const DEFAULT_QUOTE_NUMBERING: Numbering = { prefix: "Q-", next: 1, pad: 4 };

export function emptyDoc(): ClientWorkDoc {
  return {
    v: 2,
    from: "",
    numbering: { ...DEFAULT_NUMBERING },
    quoteNumbering: { ...DEFAULT_QUOTE_NUMBERING },
    invoices: [],
    quotes: [],
    proposals: [],
    clients: [],
    imported: {},
  };
}

/* ── reading saved data ─────────────────────────────────────────────────── */

type Raw = Record<string, unknown>;

function isObj(value: unknown): value is Raw {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function optStr(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function emptyLine(id: string): Line {
  return { id, description: "", qty: "1", rate: "" };
}

function readLines(value: unknown, idBase: string): Line[] {
  const lines = Array.isArray(value)
    ? value.filter(isObj).map((line, index) => ({
        id: str(line.id) || `${idBase}-line-${index + 1}`,
        description: str(line.description),
        qty: str(line.qty, "1"),
        rate: str(line.rate),
      }))
    : [];
  return lines.length > 0 ? lines : [emptyLine(`${idBase}-line-1`)];
}

function readNumbering(value: unknown, fallback: Numbering): Numbering {
  if (!isObj(value)) return { ...fallback };
  const next = Number(value.next);
  const pad = Number(value.pad);
  return {
    prefix: str(value.prefix, fallback.prefix).slice(0, 12),
    next: Number.isInteger(next) && next >= 1 ? next : fallback.next,
    pad: Number.isInteger(pad) && pad >= 1 && pad <= 8 ? pad : fallback.pad,
  };
}

function readBill(raw: Raw, index: number, kind: string): Bill {
  const id = str(raw.id) || `${kind}-${index + 1}`;
  const issued = str(raw.issued);
  return {
    id,
    number: str(raw.number),
    from: str(raw.from),
    to: str(raw.to),
    clientId: optStr(raw.clientId),
    issued,
    currency: isCurrency(raw.currency) ? raw.currency : undefined,
    notes: str(raw.notes),
    taxPercent: str(raw.taxPercent, "0"),
    lines: readLines(raw.lines, id),
    createdAt: str(raw.createdAt) || issued,
    updatedAt: str(raw.updatedAt) || str(raw.createdAt) || issued,
  };
}

function readInvoice(raw: Raw, index: number): Invoice {
  return {
    ...readBill(raw, index, "invoice"),
    due: str(raw.due),
    status: oneOf(raw.status, ["draft", "sent", "paid"] as const, "draft"),
    sentOn: optStr(raw.sentOn),
    paidOn: optStr(raw.paidOn),
    quoteId: optStr(raw.quoteId),
  };
}

function readQuote(raw: Raw, index: number): Quote {
  return {
    ...readBill(raw, index, "quote"),
    validUntil: str(raw.validUntil),
    status: oneOf(raw.status, ["draft", "sent", "accepted", "declined"] as const, "draft"),
    invoiceId: optStr(raw.invoiceId),
    proposalId: optStr(raw.proposalId),
  };
}

function readProposal(raw: Raw, index: number): Proposal {
  const createdAt = str(raw.createdAt);
  return {
    id: str(raw.id) || `proposal-${index + 1}`,
    title: str(raw.title),
    to: str(raw.to),
    clientId: optStr(raw.clientId),
    problem: str(raw.problem),
    work: str(raw.work),
    price: str(raw.price),
    next: str(raw.next),
    quoteId: optStr(raw.quoteId),
    createdAt,
    updatedAt: str(raw.updatedAt) || createdAt,
  };
}

function readClient(raw: Raw, index: number): Client {
  return {
    id: str(raw.id) || `client-${index + 1}`,
    name: str(raw.name),
    email: str(raw.email),
    address: str(raw.address),
    createdAt: str(raw.createdAt),
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

/** True when a saved document is the old one-invoice shape. */
export function isLegacyInvoice(raw: unknown): raw is Raw {
  if (!isObj(raw) || raw.v === 2) return false;
  return Array.isArray(raw.lines) || ["from", "to", "number", "notes", "issued", "due", "taxPercent"].some((key) => typeof raw[key] === "string");
}

/** Split a typed "Bill to" block into a client: first line the name, an email if there is one, the rest the address. */
export function parseClientText(text: string): { name: string; email: string; address: string } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const emailLine = lines.find((line) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line));
  const rest = lines.filter((line) => line !== emailLine);
  return { name: rest[0] ?? "", email: emailLine ?? "", address: rest.slice(1).join("\n") };
}

/** The "Bill to" block for a saved client. */
export function clientBlock(client: Pick<Client, "name" | "email" | "address">): string {
  return [client.name.trim(), client.email.trim(), client.address.trim()].filter(Boolean).join("\n");
}

/** Numbering that continues from an existing number, e.g. "INV-0041" → prefix INV-, next 42. */
export function numberingFrom(number: string, fallback: Numbering = DEFAULT_NUMBERING): Numbering {
  const match = number.trim().match(/^(.*?)(\d+)$/);
  if (!match) return { ...fallback };
  return { prefix: match[1].slice(0, 12), next: Number(match[2]) + 1, pad: Math.min(8, Math.max(1, match[2].length)) };
}

/** The old single invoice, as the first invoice of the archive. Same input, same result. */
function migrateLegacy(raw: Raw): ClientWorkDoc {
  const doc = emptyDoc();
  const issued = str(raw.issued);
  const to = str(raw.to);
  const number = str(raw.number, "0001");
  const invoice: Invoice = {
    id: LEGACY_INVOICE_ID,
    number,
    from: str(raw.from),
    to,
    issued,
    due: str(raw.due),
    currency: isCurrency(raw.currency) ? raw.currency : undefined,
    notes: str(raw.notes),
    taxPercent: str(raw.taxPercent, "0"),
    lines: readLines(raw.lines, LEGACY_INVOICE_ID),
    status: "draft",
    createdAt: issued,
    updatedAt: issued,
  };
  const client = parseClientText(to);
  if (client.name) {
    doc.clients.push({ id: LEGACY_CLIENT_ID, ...client, createdAt: issued });
    invoice.clientId = LEGACY_CLIENT_ID;
  }
  doc.invoices.push(invoice);
  doc.from = invoice.from;
  doc.currency = invoice.currency;
  doc.numbering = numberingFrom(number);
  doc.openId = LEGACY_INVOICE_ID;
  doc.legacy = { ...raw };
  return doc;
}

/** Any saved value (new shape, old single invoice, nothing) as a ClientWorkDoc. */
export function normalizeDoc(raw: unknown): ClientWorkDoc {
  if (isLegacyInvoice(raw)) return migrateLegacy(raw);
  if (!isObj(raw) || raw.v !== 2) return emptyDoc();
  const imported = isObj(raw.imported) ? raw.imported : {};
  return {
    v: 2,
    from: str(raw.from),
    currency: isCurrency(raw.currency) ? raw.currency : undefined,
    numbering: readNumbering(raw.numbering, DEFAULT_NUMBERING),
    quoteNumbering: readNumbering(raw.quoteNumbering, DEFAULT_QUOTE_NUMBERING),
    invoices: uniqueById(Array.isArray(raw.invoices) ? raw.invoices.filter(isObj).map(readInvoice) : []),
    quotes: uniqueById(Array.isArray(raw.quotes) ? raw.quotes.filter(isObj).map(readQuote) : []),
    proposals: uniqueById(Array.isArray(raw.proposals) ? raw.proposals.filter(isObj).map(readProposal) : []),
    clients: uniqueById(Array.isArray(raw.clients) ? raw.clients.filter(isObj).map(readClient) : []),
    imported: { quote: imported.quote === true || undefined, proposal: imported.proposal === true || undefined },
    openId: optStr(raw.openId),
    legacy: isObj(raw.legacy) ? raw.legacy : undefined,
  };
}

/* ── numbering ──────────────────────────────────────────────────────────── */

/**
 * The next free number: the counter, or one past the highest number already
 * used with the same prefix, whichever is larger. Never repeats a number.
 */
export function nextNumber(numbering: Numbering, existing: readonly string[]): string {
  let n = Math.max(1, numbering.next);
  for (const number of existing) {
    if (!number.startsWith(numbering.prefix)) continue;
    const rest = number.slice(numbering.prefix.length);
    if (/^\d{1,12}$/.test(rest)) n = Math.max(n, Number(rest) + 1);
  }
  return numbering.prefix + String(n).padStart(numbering.pad, "0");
}

/** Move the counter past a number that has just been used. */
export function bumpNumbering(numbering: Numbering, used: string): Numbering {
  if (!used.startsWith(numbering.prefix)) return numbering;
  const rest = used.slice(numbering.prefix.length);
  if (!/^\d{1,12}$/.test(rest)) return numbering;
  return { ...numbering, next: Math.max(numbering.next, Number(rest) + 1) };
}

/* ── status ─────────────────────────────────────────────────────────────── */

export type InvoiceState = "draft" | "sent" | "paid" | "overdue";
export type QuoteState = QuoteStatus | "expired" | "invoiced";

/** Paid stays paid. Otherwise, a due date before today makes it overdue. */
export function invoiceState(invoice: Pick<Invoice, "status" | "due">, today: string): InvoiceState {
  if (invoice.status === "paid") return "paid";
  if (invoice.due && /^\d{4}-\d{2}-\d{2}$/.test(invoice.due) && invoice.due < today) return "overdue";
  return invoice.status;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86_400_000) : 0;
}

export function quoteState(quote: Pick<Quote, "status" | "validUntil" | "invoiceId">, today: string, invoiceExists = true): QuoteState {
  if (quote.invoiceId && invoiceExists) return "invoiced";
  if ((quote.status === "draft" || quote.status === "sent") && quote.validUntil && quote.validUntil < today) return "expired";
  return quote.status;
}

export const STATE_LABEL: Record<InvoiceState | QuoteState, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  invoiced: "Invoiced",
};

/* ── sums ───────────────────────────────────────────────────────────────── */

export function billCurrency(bill: { currency?: CurrencyCode }, doc: Pick<ClientWorkDoc, "currency">, guessed: CurrencyCode): CurrencyCode {
  return bill.currency ?? doc.currency ?? guessed;
}

/** The shared invoice maths, for an invoice or a quote. */
export function billCheck(bill: Pick<Bill, "lines" | "taxPercent">, currency: CurrencyCode): InvoiceCheck {
  return checkInvoice(bill.lines, bill.taxPercent, currency);
}

/** A minor-unit amount as plain text with the currency's decimals, e.g. 150000 → "1500.00". */
export function plainAmount(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  const negative = minor < 0;
  const text = String(Math.abs(minor)).padStart(digits + 1, "0");
  const whole = digits > 0 ? text.slice(0, -digits) : text;
  const frac = digits > 0 ? `.${text.slice(-digits)}` : "";
  return `${negative ? "-" : ""}${whole}${frac}`;
}

/* ── search ─────────────────────────────────────────────────────────────── */

function amountTexts(minor: number | null, currency: string): string[] {
  if (minor == null) return [];
  const plain = plainAmount(minor, currency);
  const [whole, frac] = plain.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const out = [plain, `${grouped}${frac ? `.${frac}` : ""}`];
  if (!frac || /^0+$/.test(frac)) out.push(whole, grouped);
  return out;
}

/**
 * Search by client, number or amount. Every word of the query must match.
 * Amounts match with or without thousands commas and currency symbols.
 */
export function matchesSearch(
  bill: Pick<Bill, "number" | "to" | "clientId" | "lines" | "taxPercent">,
  query: string,
  context: { clients: readonly Client[]; currency: CurrencyCode },
): boolean {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const client = bill.clientId ? context.clients.find((item) => item.id === bill.clientId) : undefined;
  const check = billCheck(bill, context.currency);
  const hay = [bill.number, bill.to, client?.name ?? "", client?.email ?? "", ...amountTexts(check.totalMinor, context.currency), ...amountTexts(check.subtotalMinor, context.currency)]
    .join("\n")
    .toLowerCase();
  const bare = hay.replace(/,/g, "");
  return words.every((word) => {
    const w = word.replace(/^[₦$£€₵₹]|^ksh|^r(?=\d)/, "");
    if (!w) return true;
    return hay.includes(w) || bare.includes(w.replace(/,/g, ""));
  });
}

/* ── making and changing documents ──────────────────────────────────────── */

export type Stamp = { id: () => string; today: string; now: string };

function latest<T extends { createdAt: string }>(items: readonly T[]): T | undefined {
  return items.reduce<T | undefined>((best, item) => (!best || item.createdAt >= best.createdAt ? item : best), undefined);
}

function addDaysIso(iso: string, days: number): string {
  const time = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(time)) return "";
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10);
}

/** A blank invoice with the next number, your details, and the tax and notes of your latest invoice. Not yet added. */
export function draftInvoice(doc: ClientWorkDoc, stamp: Stamp, client?: Client): Invoice {
  const last = latest(doc.invoices);
  const id = stamp.id();
  return {
    id,
    number: nextNumber(doc.numbering, doc.invoices.map((item) => item.number)),
    from: doc.from || last?.from || "",
    to: client ? clientBlock(client) : "",
    clientId: client?.id,
    issued: stamp.today,
    due: "",
    currency: doc.currency,
    notes: last?.notes ?? "",
    taxPercent: last?.taxPercent ?? "0",
    lines: [emptyLine(stamp.id())],
    status: "draft",
    createdAt: stamp.now,
    updatedAt: stamp.now,
  };
}

export function draftQuote(doc: ClientWorkDoc, stamp: Stamp, client?: Client): Quote {
  // The copied Quote-app quote carries a note about the copy; new quotes should not inherit it.
  const last = latest(doc.quotes.filter((item) => item.id !== KIT_QUOTE_ID));
  const id = stamp.id();
  return {
    id,
    number: nextNumber(doc.quoteNumbering, doc.quotes.map((item) => item.number)),
    from: doc.from || last?.from || latest(doc.invoices)?.from || "",
    to: client ? clientBlock(client) : "",
    clientId: client?.id,
    issued: stamp.today,
    validUntil: addDaysIso(stamp.today, 30),
    currency: doc.currency,
    notes: last?.notes ?? "",
    taxPercent: last?.taxPercent ?? latest(doc.invoices)?.taxPercent ?? "0",
    lines: [emptyLine(stamp.id())],
    status: "draft",
    createdAt: stamp.now,
    updatedAt: stamp.now,
  };
}

export function draftProposal(stamp: Stamp, client?: Client): Proposal {
  return {
    id: stamp.id(),
    title: "",
    to: client ? clientBlock(client) : "",
    clientId: client?.id,
    problem: "",
    work: "",
    price: "",
    next: "",
    createdAt: stamp.now,
    updatedAt: stamp.now,
  };
}

/** Add or replace an invoice, keeping the counter ahead of its number. */
export function putInvoice(doc: ClientWorkDoc, invoice: Invoice): ClientWorkDoc {
  const exists = doc.invoices.some((item) => item.id === invoice.id);
  return {
    ...doc,
    invoices: exists ? doc.invoices.map((item) => (item.id === invoice.id ? invoice : item)) : [...doc.invoices, invoice],
    numbering: bumpNumbering(doc.numbering, invoice.number),
    from: invoice.from || doc.from,
  };
}

export function putQuote(doc: ClientWorkDoc, quote: Quote): ClientWorkDoc {
  const exists = doc.quotes.some((item) => item.id === quote.id);
  return {
    ...doc,
    quotes: exists ? doc.quotes.map((item) => (item.id === quote.id ? quote : item)) : [...doc.quotes, quote],
    quoteNumbering: bumpNumbering(doc.quoteNumbering, quote.number),
    from: quote.from || doc.from,
  };
}

export function putProposal(doc: ClientWorkDoc, proposal: Proposal): ClientWorkDoc {
  const exists = doc.proposals.some((item) => item.id === proposal.id);
  return { ...doc, proposals: exists ? doc.proposals.map((item) => (item.id === proposal.id ? proposal : item)) : [...doc.proposals, proposal] };
}

/** Change an invoice's status. Paid records the date paid (today unless given). */
export function setInvoiceStatus(invoice: Invoice, status: InvoiceStatus, stamp: Pick<Stamp, "today" | "now">, paidOn?: string): Invoice {
  return {
    ...invoice,
    status,
    sentOn: status === "sent" || status === "paid" ? (invoice.sentOn ?? (status === "sent" ? stamp.today : undefined)) : invoice.sentOn,
    paidOn: status === "paid" ? (paidOn ?? invoice.paidOn ?? stamp.today) : undefined,
    updatedAt: stamp.now,
  };
}

function copyLines(lines: readonly Line[], stamp: Stamp): Line[] {
  return lines.map((line) => ({ ...line, id: stamp.id() }));
}

/** A copy with a new number and today's date, as a draft. The due date keeps the same gap. */
export function duplicateInvoice(doc: ClientWorkDoc, id: string, stamp: Stamp): { doc: ClientWorkDoc; invoice: Invoice } | null {
  const source = doc.invoices.find((item) => item.id === id);
  if (!source) return null;
  const gap = source.issued && source.due ? daysBetween(source.issued, source.due) : null;
  const invoice: Invoice = {
    ...source,
    id: stamp.id(),
    number: nextNumber(doc.numbering, doc.invoices.map((item) => item.number)),
    issued: stamp.today,
    due: gap != null && gap >= 0 ? addDaysIso(stamp.today, gap) : "",
    status: "draft",
    sentOn: undefined,
    paidOn: undefined,
    quoteId: undefined,
    lines: copyLines(source.lines, stamp),
    createdAt: stamp.now,
    updatedAt: stamp.now,
  };
  return { doc: putInvoice(doc, invoice), invoice };
}

export function duplicateQuote(doc: ClientWorkDoc, id: string, stamp: Stamp): { doc: ClientWorkDoc; quote: Quote } | null {
  const source = doc.quotes.find((item) => item.id === id);
  if (!source) return null;
  const gap = source.issued && source.validUntil ? daysBetween(source.issued, source.validUntil) : null;
  const quote: Quote = {
    ...source,
    id: stamp.id(),
    number: nextNumber(doc.quoteNumbering, doc.quotes.map((item) => item.number)),
    issued: stamp.today,
    validUntil: gap != null && gap >= 0 ? addDaysIso(stamp.today, gap) : "",
    status: "draft",
    invoiceId: undefined,
    proposalId: undefined,
    lines: copyLines(source.lines, stamp),
    createdAt: stamp.now,
    updatedAt: stamp.now,
  };
  return { doc: putQuote(doc, quote), quote };
}

/**
 * Turn a quote into an invoice: client, lines, tax, currency and notes are
 * copied, and the two are linked both ways. A quote that already has its
 * invoice gives that invoice back rather than making a second one.
 */
export function quoteToInvoice(doc: ClientWorkDoc, quoteId: string, stamp: Stamp): { doc: ClientWorkDoc; invoice: Invoice; created: boolean } | null {
  const quote = doc.quotes.find((item) => item.id === quoteId);
  if (!quote) return null;
  const existing = quote.invoiceId ? doc.invoices.find((item) => item.id === quote.invoiceId) : undefined;
  if (existing) return { doc, invoice: existing, created: false };
  const invoice: Invoice = {
    id: stamp.id(),
    number: nextNumber(doc.numbering, doc.invoices.map((item) => item.number)),
    from: quote.from || doc.from,
    to: quote.to,
    clientId: quote.clientId,
    issued: stamp.today,
    due: "",
    currency: quote.currency ?? doc.currency,
    notes: quote.notes,
    taxPercent: quote.taxPercent,
    lines: copyLines(quote.lines, stamp),
    status: "draft",
    quoteId: quote.id,
    createdAt: stamp.now,
    updatedAt: stamp.now,
  };
  const linked: Quote = { ...quote, invoiceId: invoice.id, status: quote.status === "declined" ? quote.status : "accepted", updatedAt: stamp.now };
  return { doc: putQuote(putInvoice(doc, invoice), linked), invoice, created: true };
}

/** Split a proposal's work into quote lines (one per line of text); a single line takes the price when it is a plain amount. */
export function proposalToQuote(doc: ClientWorkDoc, proposalId: string, stamp: Stamp): { doc: ClientWorkDoc; quote: Quote; created: boolean } | null {
  const proposal = doc.proposals.find((item) => item.id === proposalId);
  if (!proposal) return null;
  const existing = proposal.quoteId ? doc.quotes.find((item) => item.id === proposal.quoteId) : undefined;
  if (existing) return { doc, quote: existing, created: false };
  const items = proposal.work
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_LINES);
  const parsedLines = items.map((text) => parseKitLine(text) ?? { description: text.slice(0, 120), qty: "1", rate: "" });
  const price = amountOf(proposal.price);
  if (parsedLines.length === 1 && !parsedLines[0].rate && price) parsedLines[0].rate = price;
  if (parsedLines.length === 0) parsedLines.push({ description: (proposal.title || "Work as proposed").slice(0, 120), qty: "1", rate: price ?? "" });
  const draft = draftQuote(doc, stamp);
  const quote: Quote = {
    ...draft,
    to: proposal.to,
    clientId: proposal.clientId,
    lines: parsedLines.map((line) => ({ id: stamp.id(), ...line })),
    notes: proposal.next.trim() ? proposal.next.trim() : draft.notes,
    proposalId: proposal.id,
  };
  const linked: Proposal = { ...proposal, quoteId: quote.id, updatedAt: stamp.now };
  return { doc: putProposal(putQuote(doc, quote), linked), quote, created: true };
}

/** Find a saved client by name (any case), or add one. */
export function upsertClient(doc: ClientWorkDoc, fields: { name: string; email: string; address: string }, stamp: Stamp): { doc: ClientWorkDoc; client: Client } | null {
  const name = fields.name.trim();
  if (!name) return null;
  const found = doc.clients.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
  if (found) {
    const merged = { ...found, email: found.email || fields.email.trim(), address: found.address || fields.address.trim() };
    return { doc: { ...doc, clients: doc.clients.map((item) => (item.id === found.id ? merged : item)) }, client: merged };
  }
  const client: Client = { id: stamp.id(), name, email: fields.email.trim(), address: fields.address.trim(), createdAt: stamp.now };
  return { doc: { ...doc, clients: [...doc.clients, client] }, client };
}

export function clientName(doc: Pick<ClientWorkDoc, "clients">, bill: { clientId?: string; to: string }): string {
  const client = bill.clientId ? doc.clients.find((item) => item.id === bill.clientId) : undefined;
  return client?.name || parseClientText(bill.to).name || "";
}

/* ── importing the old Quote and Proposal apps ──────────────────────────── */

const CURRENCY_MARK = String.raw`(?:[₦$£€₵₹]|KSh|NGN|USD|GBP|EUR|GHS|KES|ZAR|CAD|INR|N(?=\d))?`;

/** "12500" or "₦12,500.00" as "12500" / "12500.00", or null. At most two decimals. */
export function amountOf(text: string): string | null {
  // The shared number format (src/lib/number-input.ts): "7,5" is not 75.
  const parsed = parseNumberInput(text, { maxDecimals: 2 });
  return parsed.ok ? parsed.text : null;
}

/**
 * One line of the old Quote app's free text ("Logo design - ₦50,000",
 * "Pages: 3 x 20000") as a structured line, or null when it has no price.
 */
export function parseKitLine(text: string): { description: string; qty: string; rate: string } | null {
  const clean = text.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, "").trim();
  const times = clean.match(new RegExp(String.raw`^(.*?)[\s:–—-]*(\d+(?:\.\d+)?)\s*[x×*]\s*(${CURRENCY_MARK}\s*[\d,]+(?:\.\d+)?)$`, "i"));
  if (times) {
    const rate = amountOf(times[3]);
    if (rate) return { description: times[1].trim().slice(0, 120), qty: times[2], rate };
  }
  const tail = clean.match(new RegExp(String.raw`^(.*?)[\s:=–—-]+(${CURRENCY_MARK}\s*[\d,]+(?:\.\d+)?)$`, "i"));
  if (tail && tail[1].trim()) {
    const rate = amountOf(tail[2]);
    if (rate) return { description: tail[1].trim().replace(/[\s:=–—-]+$/, "").slice(0, 120), qty: "1", rate };
  }
  return null;
}

function kitValues(raw: unknown): Record<string, string> | null {
  if (!isObj(raw) || !isObj(raw.values)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw.values)) if (typeof value === "string") out[key] = value;
  return Object.values(out).some((value) => value.trim()) ? out : null;
}

function withClient(doc: ClientWorkDoc, text: string, stamp: Stamp): { doc: ClientWorkDoc; clientId?: string } {
  const parsed = parseClientText(text);
  const result = parsed.name ? upsertClient(doc, parsed, stamp) : null;
  return result ? { doc: result.doc, clientId: result.client.id } : { doc };
}

/**
 * Copy the old Quote and Proposal app documents in, once. `null` means the
 * document could not be read (try again next time); `undefined`/empty means
 * there was nothing to copy. The old documents themselves are not touched.
 */
export function importKitDocs(
  doc: ClientWorkDoc,
  sources: { quote?: unknown; proposal?: unknown },
  stamp: Stamp,
): { doc: ClientWorkDoc; changed: boolean } {
  let next = doc;
  let changed = false;

  if ("quote" in sources && sources.quote !== null && !doc.imported.quote) {
    const values = kitValues(sources.quote);
    if (values && !next.quotes.some((item) => item.id === KIT_QUOTE_ID)) {
      const client = withClient(next, values.client ?? "", stamp);
      next = client.doc;
      const lines: Line[] = [];
      for (const row of (values.lines ?? "").split(/\r?\n/)) {
        if (!row.trim()) continue;
        const line = lines.length < MAX_LINES ? parseKitLine(row) : null;
        if (line) lines.push({ id: `${KIT_QUOTE_ID}-line-${lines.length + 1}`, ...line });
      }
      const total = amountOf(values.total ?? "");
      if (lines.length === 0 && total) lines.push({ id: `${KIT_QUOTE_ID}-line-1`, description: "Work as quoted", qty: "1", rate: total });
      if (lines.length === 0) lines.push(emptyLine(`${KIT_QUOTE_ID}-line-1`));
      const until = (values.until ?? "").trim();
      const notes = [
        "Copied from your Quote app. What you typed there:",
        values.lines?.trim() ? values.lines.trim() : "",
        until && !/^\d{4}-\d{2}-\d{2}$/.test(until) ? `Holds until: ${until}` : "",
        values.total?.trim() ? `Total you wrote: ${values.total.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const quote: Quote = {
        id: KIT_QUOTE_ID,
        number: nextNumber(next.quoteNumbering, next.quotes.map((item) => item.number)),
        from: next.from,
        to: values.client?.trim() ?? "",
        clientId: client.clientId,
        issued: stamp.today,
        validUntil: /^\d{4}-\d{2}-\d{2}$/.test(until) ? until : "",
        currency: next.currency,
        notes,
        taxPercent: "0",
        lines,
        status: "draft",
        createdAt: stamp.now,
        updatedAt: stamp.now,
      };
      next = putQuote(next, quote);
    }
    next = { ...next, imported: { ...next.imported, quote: true } };
    changed = changed || values != null;
  }

  if ("proposal" in sources && sources.proposal !== null && !doc.imported.proposal) {
    const values = kitValues(sources.proposal);
    if (values && !next.proposals.some((item) => item.id === KIT_PROPOSAL_ID)) {
      const client = withClient(next, values.client ?? "", stamp);
      next = client.doc;
      const name = parseClientText(values.client ?? "").name;
      next = putProposal(next, {
        id: KIT_PROPOSAL_ID,
        title: name ? `Proposal for ${name}` : "Proposal",
        to: values.client?.trim() ?? "",
        clientId: client.clientId,
        problem: values.problem ?? "",
        work: values.work ?? "",
        price: values.price ?? "",
        next: values.next ?? "",
        createdAt: stamp.now,
        updatedAt: stamp.now,
      });
    }
    next = { ...next, imported: { ...next.imported, proposal: true } };
    changed = changed || values != null;
  }

  return { doc: next, changed };
}

/** Rough size of the saved document, for the warning before the limit. */
export function docSize(doc: ClientWorkDoc): number {
  return JSON.stringify(doc).length;
}
