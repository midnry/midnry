import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useAppDoc } from "@/components/use-app-doc";
import { Button, Field, TextArea, TextInput, buttonClass, cn } from "@/components/ui";
import { guessCurrency, formatMoney, type CurrencyCode } from "@/lib/format";
import { toMajor } from "@/lib/invoice-math";
import { followUps, lateLabel, longDate, reminderMessage, remindText, type FollowUp } from "@/lib/invoice-follow-up";
import { DOC_WARN_SHARE, docLimit } from "@/lib/doc-limits";
import { loadMergedDoc } from "@/lib/merged-docs.functions";
import { nid, todayISO, ToolFrame, ToolStatus } from "@/components/tools/shared";
import { ViewTabs } from "@/components/tools/view-tabs";
import { setViewParam, viewParam } from "@/components/use-merged-docs";
import {
  BillSheet,
  BillTo,
  CurrencyPicker,
  LineEditor,
  MobileTotal,
  StateBadge,
  TaxField,
  printBlockOf,
} from "@/components/tools/client-work-parts";
import {
  billCheck,
  billCurrency,
  clientName,
  docSize,
  draftInvoice,
  draftProposal,
  draftQuote,
  duplicateInvoice,
  duplicateQuote,
  importKitDocs,
  invoiceShareText,
  invoiceState,
  matchesSearch,
  nextNumber,
  normalizeDoc,
  numberClash,
  parseClientText,
  proposalToQuote,
  putInvoice,
  putProposal,
  putQuote,
  quoteState,
  quoteToInvoice,
  setInvoiceStatus,
  upsertClient,
  type Client,
  type ClientWorkDoc,
  type Invoice,
  type InvoiceStatus,
  type Proposal,
  type Quote,
  type QuoteStatus,
  type Stamp,
} from "@/lib/client-work";
import { invoicePdfName, markSentPatch, sendInvoicePdf, undoMarkSentPatch, type ShareNavigator } from "@/lib/invoice-share";

/**
 * Invoice: client work in one place. Invoices (the default), quotes,
 * simple proposals and saved clients share one saved document; see
 * src/lib/client-work.ts for the data rules and src/lib/invoice-math.ts for
 * the sums. The first visit opens a blank invoice straight away; the lists,
 * statuses and settings are one tap away but never in the way.
 */

type Tab = "invoices" | "quotes" | "proposals" | "clients";
type Screen = { kind: "list"; tab: Tab } | { kind: "invoice" | "quote" | "proposal"; id: string };

const TABS: readonly { id: Tab; label: string }[] = [
  { id: "invoices", label: "Invoices" },
  { id: "quotes", label: "Quotes" },
  { id: "proposals", label: "Proposals" },
  { id: "clients", label: "Clients" },
];
const TAB_OF: Record<Screen["kind"], Tab> = { list: "invoices", invoice: "invoices", quote: "quotes", proposal: "proposals" };

function isTab(value: unknown): value is Tab {
  return TABS.some((tab) => tab.id === value);
}

function makeStamp(): Stamp {
  const now = new Date();
  return { id: nid, today: todayISO(now), now: now.toISOString() };
}

const EMPTY: Record<string, unknown> = {};

type Undo = { label: string; restore: (doc: ClientWorkDoc) => ClientWorkDoc };

function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const out = [...items];
  out.splice(Math.min(Math.max(index, 0), out.length), 0, item);
  return out;
}

function byNewest<T extends { issued?: string; createdAt: string }>(a: T, b: T): number {
  return (b.issued ?? "").localeCompare(a.issued ?? "") || b.createdAt.localeCompare(a.createdAt);
}

export function InvoiceTool() {
  const { data, setData, ready, loadError, blocked, saveState } = useAppDoc<Record<string, unknown>>("invoice", EMPTY);
  const doc = useMemo(() => normalizeDoc(data), [data]);
  const guessed = useMemo(() => guessCurrency(), []);
  const today = todayISO();
  const [screen, setScreen] = useState<Screen | null>(null);
  /** The very first invoice, shown before anything is typed; saved on the first change. */
  const [pending, setPending] = useState<Invoice | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const importTried = useRef(false);

  function commit(change: (doc: ClientWorkDoc) => ClientWorkDoc) {
    setData((prev) => change(normalizeDoc(prev)) as unknown as Record<string, unknown>);
  }

  // Where to start: ?view= (old Quote/Proposal links), else the document open last time,
  // else a blank first invoice, else the list.
  useEffect(() => {
    if (!ready || screen) return;
    const view = viewParam();
    if (isTab(view)) return setScreen({ kind: "list", tab: view });
    const open = doc.openId;
    if (open && doc.invoices.some((item) => item.id === open)) return setScreen({ kind: "invoice", id: open });
    if (open && doc.quotes.some((item) => item.id === open)) return setScreen({ kind: "quote", id: open });
    if (open && doc.proposals.some((item) => item.id === open)) return setScreen({ kind: "proposal", id: open });
    if (doc.invoices.length === 0) {
      const draft = draftInvoice(doc, makeStamp());
      setPending(draft);
      return setScreen({ kind: "invoice", id: draft.id });
    }
    setScreen({ kind: "list", tab: "invoices" });
  }, [ready, screen, doc]);

  // Copy the old Quote and Proposal app documents in, once. They are only read.
  useEffect(() => {
    if (!ready || loadError || blocked || importTried.current) return;
    if (doc.imported.quote && doc.imported.proposal) return;
    importTried.current = true;
    const read = (slug: string) =>
      loadMergedDoc({ data: slug })
        .then((res): unknown => {
          if (!res.ok) return null;
          if (!res.payload) return undefined;
          try {
            return JSON.parse(res.payload) as unknown;
          } catch {
            return undefined;
          }
        })
        .catch(() => null);
    void Promise.all([doc.imported.quote ? Promise.resolve(null) : read("quote"), doc.imported.proposal ? Promise.resolve(null) : read("proposal")]).then(
      ([quote, proposal]) => {
        const sources: { quote?: unknown; proposal?: unknown } = {};
        if (!doc.imported.quote) sources.quote = quote;
        if (!doc.imported.proposal) sources.proposal = proposal;
        let copied: string[] = [];
        commitIfChanged(sources, (names) => (copied = names));
        if (copied.length) setNotice(`Your saved ${copied.join(" and ")} ${copied.length > 1 ? "were" : "was"} copied in here. The original stays as it was.`);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loadError, blocked]);

  function commitIfChanged(sources: { quote?: unknown; proposal?: unknown }, report: (names: string[]) => void) {
    setData((prev) => {
      const before = normalizeDoc(prev);
      const result = importKitDocs(before, sources, makeStamp());
      if (!result.changed) return prev;
      const names: string[] = [];
      if (result.doc.quotes.length > before.quotes.length) names.push("quote");
      if (result.doc.proposals.length > before.proposals.length) names.push("proposal");
      report(names);
      return result.doc as unknown as Record<string, unknown>;
    });
  }

  function go(next: Screen) {
    setScreen(next);
    setViewParam(next.kind === "list" && next.tab !== "invoices" ? next.tab : null);
    if (next.kind !== "list" && doc.openId !== next.id && (next.kind !== "invoice" || next.id !== pending?.id)) {
      commit((d) => ({ ...d, openId: next.id }));
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  /* ── invoices ── */

  function patchInvoice(id: string, patch: Partial<Invoice>) {
    const stamp = makeStamp();
    commit((d) => {
      const current = d.invoices.find((item) => item.id === id) ?? (pending?.id === id ? pending : undefined);
      if (!current) return d;
      const next = putInvoice({ ...d, openId: id }, { ...current, ...patch, updatedAt: stamp.now });
      return patch.currency ? { ...next, currency: patch.currency } : next;
    });
    if (pending?.id === id) setPending(null);
  }

  function newInvoice(client?: Client) {
    let id = "";
    commit((d) => {
      const draft = draftInvoice(d, makeStamp(), client);
      id = draft.id;
      return putInvoice({ ...d, openId: draft.id }, draft);
    });
    setPending(null);
    setUndo(null);
    go({ kind: "invoice", id });
  }

  function duplicateInv(id: string) {
    let copy = "";
    commit((d) => {
      const result = duplicateInvoice(d, id, makeStamp());
      if (!result) return d;
      copy = result.invoice.id;
      return { ...result.doc, openId: copy };
    });
    if (copy) go({ kind: "invoice", id: copy });
  }

  function deleteInvoice(id: string) {
    const index = doc.invoices.findIndex((item) => item.id === id);
    const item = doc.invoices[index];
    if (!item) {
      if (pending?.id === id) setPending(null);
      go({ kind: "list", tab: "invoices" });
      return;
    }
    commit((d) => ({ ...d, invoices: d.invoices.filter((x) => x.id !== id), openId: d.openId === id ? undefined : d.openId }));
    setUndo({ label: `Invoice ${item.number || ""} deleted.`, restore: (d) => (d.invoices.some((x) => x.id === id) ? d : { ...d, invoices: insertAt(d.invoices, index, item) }) });
    if (screen?.kind === "invoice") go({ kind: "list", tab: "invoices" });
  }

  function setStatus(id: string, status: InvoiceStatus, paidOn?: string) {
    const stamp = makeStamp();
    commit((d) => {
      const current = d.invoices.find((item) => item.id === id) ?? (pending?.id === id ? pending : undefined);
      return current ? putInvoice(d, setInvoiceStatus(current, status, stamp, paidOn)) : d;
    });
    if (pending?.id === id) setPending(null);
  }

  /* ── quotes ── */

  function patchQuote(id: string, patch: Partial<Quote>) {
    const stamp = makeStamp();
    commit((d) => {
      const current = d.quotes.find((item) => item.id === id);
      if (!current) return d;
      const next = putQuote({ ...d, openId: id }, { ...current, ...patch, updatedAt: stamp.now });
      return patch.currency ? { ...next, currency: patch.currency } : next;
    });
  }

  function newQuote(client?: Client) {
    let id = "";
    commit((d) => {
      const draft = draftQuote(d, makeStamp(), client);
      id = draft.id;
      return putQuote({ ...d, openId: draft.id }, draft);
    });
    setUndo(null);
    go({ kind: "quote", id });
  }

  function duplicateQ(id: string) {
    let copy = "";
    commit((d) => {
      const result = duplicateQuote(d, id, makeStamp());
      if (!result) return d;
      copy = result.quote.id;
      return { ...result.doc, openId: copy };
    });
    if (copy) go({ kind: "quote", id: copy });
  }

  function deleteQuote(id: string) {
    const index = doc.quotes.findIndex((item) => item.id === id);
    const item = doc.quotes[index];
    if (!item) return;
    commit((d) => ({ ...d, quotes: d.quotes.filter((x) => x.id !== id), openId: d.openId === id ? undefined : d.openId }));
    setUndo({ label: `Quote ${item.number || ""} deleted.`, restore: (d) => (d.quotes.some((x) => x.id === id) ? d : { ...d, quotes: insertAt(d.quotes, index, item) }) });
    if (screen?.kind === "quote") go({ kind: "list", tab: "quotes" });
  }

  function convertQuote(id: string) {
    let invoiceId = "";
    let created = false;
    commit((d) => {
      const result = quoteToInvoice(d, id, makeStamp());
      if (!result) return d;
      invoiceId = result.invoice.id;
      created = result.created;
      return { ...result.doc, openId: invoiceId };
    });
    if (invoiceId) {
      setNotice(created ? "Invoice made from the quote. Lines, client and tax were copied; the quote is kept and linked." : null);
      go({ kind: "invoice", id: invoiceId });
    }
  }

  /* ── proposals ── */

  function patchProposal(id: string, patch: Partial<Proposal>) {
    const stamp = makeStamp();
    commit((d) => {
      const current = d.proposals.find((item) => item.id === id);
      return current ? putProposal({ ...d, openId: id }, { ...current, ...patch, updatedAt: stamp.now }) : d;
    });
  }

  function newProposal(client?: Client) {
    let id = "";
    commit((d) => {
      const draft = draftProposal(makeStamp(), client);
      id = draft.id;
      return putProposal({ ...d, openId: draft.id }, draft);
    });
    setUndo(null);
    go({ kind: "proposal", id });
  }

  function deleteProposal(id: string) {
    const index = doc.proposals.findIndex((item) => item.id === id);
    const item = doc.proposals[index];
    if (!item) return;
    commit((d) => ({ ...d, proposals: d.proposals.filter((x) => x.id !== id), openId: d.openId === id ? undefined : d.openId }));
    setUndo({ label: `Proposal “${item.title || "Untitled"}” deleted.`, restore: (d) => (d.proposals.some((x) => x.id === id) ? d : { ...d, proposals: insertAt(d.proposals, index, item) }) });
    if (screen?.kind === "proposal") go({ kind: "list", tab: "proposals" });
  }

  function proposalQuote(id: string) {
    let quoteId = "";
    commit((d) => {
      const result = proposalToQuote(d, id, makeStamp());
      if (!result) return d;
      quoteId = result.quote.id;
      return { ...result.doc, openId: quoteId };
    });
    if (quoteId) go({ kind: "quote", id: quoteId });
  }

  /* ── clients ── */

  function saveClientFrom(text: string): string | undefined {
    let id: string | undefined;
    commit((d) => {
      const result = upsertClient(d, parseClientText(text), makeStamp());
      if (!result) return d;
      id = result.client.id;
      return result.doc;
    });
    return id;
  }

  function saveClient(client: Client) {
    commit((d) => ({ ...d, clients: d.clients.some((x) => x.id === client.id) ? d.clients.map((x) => (x.id === client.id ? client : x)) : [...d.clients, client] }));
  }

  function deleteClient(id: string) {
    const index = doc.clients.findIndex((item) => item.id === id);
    const item = doc.clients[index];
    if (!item) return;
    commit((d) => ({ ...d, clients: d.clients.filter((x) => x.id !== id) }));
    setUndo({ label: `Client ${item.name} removed. Invoices and quotes keep their details.`, restore: (d) => (d.clients.some((x) => x.id === id) ? d : { ...d, clients: insertAt(d.clients, index, item) }) });
  }

  const size = useMemo(() => (ready ? docSize(doc) : 0), [ready, doc]);
  const limit = docLimit("invoice");

  const activeTab: Tab = screen ? (screen.kind === "list" ? screen.tab : TAB_OF[screen.kind]) : "invoices";
  const counts: Record<Tab, number> = { invoices: doc.invoices.length, quotes: doc.quotes.length, proposals: doc.proposals.length, clients: doc.clients.length };

  return (
    <ToolFrame slug="invoice" saveState={saveState} hideOnPrint>
      <ToolStatus ready={ready} loadError={loadError} blocked={blocked}>
        <div className="no-print mb-6 flex flex-wrap items-center gap-3">
          <ViewTabs<Tab>
            label="Client work"
            views={TABS.map((tab) => ({ id: tab.id, label: counts[tab.id] ? `${tab.label} (${counts[tab.id]})` : tab.label }))}
            value={activeTab}
            onChange={(tab) => go({ kind: "list", tab })}
          />
        </div>
        {undo ? (
          <div role="status" className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm" data-undo>
            <span>{undo.label}</span>
            <Button
              tone="quiet"
              onClick={() => {
                commit(undo.restore);
                setUndo(null);
              }}
            >
              Undo
            </Button>
            <button type="button" className="text-muted underline underline-offset-2" onClick={() => setUndo(null)}>
              Dismiss
            </button>
          </div>
        ) : null}
        {notice ? (
          <div role="status" className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-pine/10 px-4 py-3 text-sm" data-notice>
            <span>{notice}</span>
            <button type="button" className="text-muted underline underline-offset-2" onClick={() => setNotice(null)}>
              OK
            </button>
          </div>
        ) : null}
        {size > limit * DOC_WARN_SHARE ? (
          <p role="status" className="no-print mb-4 text-sm font-medium text-fail">
            Your client work is close to the saving limit ({Math.round((size / limit) * 100)}%). Delete old drafts or duplicates you no longer need.
          </p>
        ) : null}

        {!screen ? null : screen.kind === "list" && screen.tab === "invoices" ? (
          <InvoiceList
            doc={doc}
            guessed={guessed}
            today={today}
            onOpen={(id) => go({ kind: "invoice", id })}
            onNew={() => newInvoice()}
            onDuplicate={duplicateInv}
            onDelete={deleteInvoice}
            onPaid={(id) => setStatus(id, "paid")}
            onSettings={(patch) => commit((d) => ({ ...d, ...patch }))}
          />
        ) : screen.kind === "list" && screen.tab === "quotes" ? (
          <QuoteList
            doc={doc}
            guessed={guessed}
            today={today}
            onOpen={(id) => go({ kind: "quote", id })}
            onNew={() => newQuote()}
            onDuplicate={duplicateQ}
            onDelete={deleteQuote}
            onConvert={convertQuote}
            onOpenInvoice={(id) => go({ kind: "invoice", id })}
          />
        ) : screen.kind === "list" && screen.tab === "proposals" ? (
          <ProposalList doc={doc} onOpen={(id) => go({ kind: "proposal", id })} onNew={() => newProposal()} onDelete={deleteProposal} onQuote={proposalQuote} />
        ) : screen.kind === "list" ? (
          <ClientList
            doc={doc}
            onSave={saveClient}
            onDelete={deleteClient}
            onNewInvoice={(client) => newInvoice(client)}
            onNewQuote={(client) => newQuote(client)}
          />
        ) : screen.kind === "invoice" ? (
          (() => {
            const invoice = doc.invoices.find((item) => item.id === screen.id) ?? (pending?.id === screen.id ? pending : undefined);
            if (!invoice) return <Missing what="invoice" onBack={() => go({ kind: "list", tab: "invoices" })} />;
            const quote = invoice.quoteId ? doc.quotes.find((item) => item.id === invoice.quoteId) : undefined;
            return (
              <InvoiceEditor
                invoice={invoice}
                isNew={pending?.id === invoice.id}
                doc={doc}
                currency={billCurrency(invoice, doc, guessed)}
                today={today}
                quote={quote}
                onPatch={(patch) => patchInvoice(invoice.id, patch)}
                onStatus={(status, paidOn) => setStatus(invoice.id, status, paidOn)}
                onSaveClient={() => {
                  const id = saveClientFrom(invoice.to);
                  if (id) patchInvoice(invoice.id, { clientId: id });
                }}
                onBack={() => go({ kind: "list", tab: "invoices" })}
                onNew={() => newInvoice()}
                onDuplicate={() => duplicateInv(invoice.id)}
                onDelete={() => deleteInvoice(invoice.id)}
                onOpenQuote={(id) => go({ kind: "quote", id })}
              />
            );
          })()
        ) : screen.kind === "quote" ? (
          (() => {
            const quote = doc.quotes.find((item) => item.id === screen.id);
            if (!quote) return <Missing what="quote" onBack={() => go({ kind: "list", tab: "quotes" })} />;
            const invoice = quote.invoiceId ? doc.invoices.find((item) => item.id === quote.invoiceId) : undefined;
            const proposal = quote.proposalId ? doc.proposals.find((item) => item.id === quote.proposalId) : undefined;
            return (
              <QuoteEditor
                quote={quote}
                doc={doc}
                currency={billCurrency(quote, doc, guessed)}
                today={today}
                invoice={invoice}
                proposal={proposal}
                onPatch={(patch) => patchQuote(quote.id, patch)}
                onSaveClient={() => {
                  const id = saveClientFrom(quote.to);
                  if (id) patchQuote(quote.id, { clientId: id });
                }}
                onBack={() => go({ kind: "list", tab: "quotes" })}
                onConvert={() => convertQuote(quote.id)}
                onDuplicate={() => duplicateQ(quote.id)}
                onDelete={() => deleteQuote(quote.id)}
                onOpenProposal={(id) => go({ kind: "proposal", id })}
              />
            );
          })()
        ) : (
          (() => {
            const proposal = doc.proposals.find((item) => item.id === screen.id);
            if (!proposal) return <Missing what="proposal" onBack={() => go({ kind: "list", tab: "proposals" })} />;
            const quote = proposal.quoteId ? doc.quotes.find((item) => item.id === proposal.quoteId) : undefined;
            return (
              <ProposalEditor
                proposal={proposal}
                doc={doc}
                quote={quote}
                onPatch={(patch) => patchProposal(proposal.id, patch)}
                onSaveClient={() => {
                  const id = saveClientFrom(proposal.to);
                  if (id) patchProposal(proposal.id, { clientId: id });
                }}
                onBack={() => go({ kind: "list", tab: "proposals" })}
                onQuote={() => proposalQuote(proposal.id)}
                onDelete={() => deleteProposal(proposal.id)}
              />
            );
          })()
        )}
      </ToolStatus>
    </ToolFrame>
  );
}

function Missing({ what, onBack }: { what: string; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <p>This {what} is no longer here. It may have been deleted in another tab.</p>
      <Button tone="quiet" onClick={onBack}>
        Back to the list
      </Button>
    </div>
  );
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="no-print -ml-1 mb-4 inline-flex min-h-11 items-center px-1 text-sm text-muted hover:text-ink">
      ← {label}
    </button>
  );
}

/* ── editors ─────────────────────────────────────────────────────────────── */

type PdfTools = { build: typeof import("@/lib/invoice-pdf").buildInvoicePdf; fonts: import("@/lib/apply/resume-pdf").FontBytes };
let pdfTools: Promise<PdfTools> | null = null;

/** The PDF maker and its fonts, loaded only when needed (not part of the page). */
function loadPdfTools(): Promise<PdfTools> {
  pdfTools ??= Promise.all([import("@/lib/invoice-pdf"), import("@/lib/apply/resume-fonts").then((m) => m.loadResumeFonts())])
    .then(([pdf, fonts]) => ({ build: pdf.buildInvoicePdf, fonts }))
    .catch((error: unknown) => {
      pdfTools = null;
      throw error;
    });
  return pdfTools;
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** What Share PDF reported, for the invoice it was pressed on. */
type SendNote = { invoiceId: string; message: string; tone: "ok" | "quiet" | "fail"; offer: boolean; marked?: Pick<Invoice, "status" | "sentOn"> };

function InvoiceEditor({
  invoice,
  isNew,
  doc,
  currency,
  today,
  quote,
  onPatch,
  onStatus,
  onSaveClient,
  onBack,
  onNew,
  onDuplicate,
  onDelete,
  onOpenQuote,
}: {
  invoice: Invoice;
  isNew: boolean;
  doc: ClientWorkDoc;
  currency: CurrencyCode;
  today: string;
  quote?: Quote;
  onPatch: (patch: Partial<Invoice>) => void;
  onStatus: (status: InvoiceStatus, paidOn?: string) => void;
  onSaveClient: () => void;
  onBack: () => void;
  onNew: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenQuote: (id: string) => void;
}) {
  const check = billCheck(invoice, currency);
  const printBlock = printBlockOf(check);
  const state = invoiceState(invoice, today);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const clash = numberClash(doc.invoices, invoice);
  const payment = doc.payment ?? "";
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState<SendNote | null>(null);
  const note = sendNote?.invoiceId === invoice.id ? sendNote : null;
  const canSharePdf = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
  // On devices that can share files, get the PDF maker ready while the invoice
  // is on screen, so the share sheet opens straight after the press.
  useEffect(() => {
    if (!canSharePdf || printBlock) return;
    const timer = window.setTimeout(() => void loadPdfTools().catch(() => undefined), 1500);
    return () => window.clearTimeout(timer);
  }, [canSharePdf, printBlock]);
  function shareText(): string | null {
    if (!check.valid || check.totalMinor == null) return null;
    return invoiceShareText({
      number: invoice.number,
      from: invoice.from,
      to: invoice.to,
      total: formatMoney(toMajor(check.totalMinor, currency), currency),
      due: invoice.due,
      payment,
    });
  }
  async function sharePdf() {
    const text = shareText();
    if (text == null || sending) return;
    setSending(true);
    setSendNote(null);
    const id = invoice.id;
    const snapshot = { ...invoice, lines: [...invoice.lines] };
    try {
      const result = await sendInvoicePdf({
        nav: navigator as unknown as ShareNavigator,
        title: `Invoice ${snapshot.number}`.trim(),
        text,
        status: snapshot.status,
        makeFile: async () => {
          const { build, fonts } = await loadPdfTools();
          const { bytes } = await build(
            {
              number: snapshot.number,
              issued: snapshot.issued,
              due: snapshot.due,
              from: snapshot.from,
              to: snapshot.to,
              lines: snapshot.lines,
              check,
              currency,
              payment,
              notes: snapshot.notes,
              status: snapshot.status,
              paidOn: snapshot.paidOn,
            },
            fonts,
          );
          return new File([new Uint8Array(bytes)], invoicePdfName(snapshot.number, snapshot.to), { type: "application/pdf" });
        },
        download: downloadFile,
        copy: (value) => navigator.clipboard.writeText(value),
      });
      setSendNote({ invoiceId: id, message: result.message, tone: result.route === "cancelled" ? "quiet" : "ok", offer: result.offerMarkSent });
    } catch {
      setSendNote({ invoiceId: id, message: "Could not make the PDF. Check your connection and try again.", tone: "fail", offer: false });
    } finally {
      setSending(false);
    }
  }
  function markSent() {
    const patch = markSentPatch(invoice, today);
    if (!patch || !note) return;
    onPatch(patch);
    setSendNote({ ...note, message: `Marked as sent ${today}.`, offer: false, marked: { status: invoice.status, sentOn: invoice.sentOn } });
  }
  function undoMarkSent() {
    if (!note?.marked) return;
    onPatch(undoMarkSentPatch(note.marked));
    setSendNote(null);
  }
  function share() {
    const text = shareText();
    if (text == null) return;
    void navigator.clipboard.writeText(text).then(
      () => toast.success("Copied. Paste it into WhatsApp or an email, and attach the PDF."),
      () => toast.error("Could not copy. Select the invoice text instead."),
    );
  }
  return (
    <div>
      {doc.invoices.length > 0 ? <BackLink label="All invoices" onClick={onBack} /> : null}
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] print:block">
        <form className="no-print min-w-0 space-y-4" onSubmit={(event) => event.preventDefault()} aria-label={`Invoice ${invoice.number}`}>
          {!isNew ? (
            <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-paper-2 p-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Status</span>
                <select
                  className="h-11 rounded-lg border border-line bg-card px-3 text-base"
                  value={invoice.status}
                  onChange={(event) => onStatus(event.target.value as InvoiceStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              {invoice.status === "paid" ? (
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Paid on</span>
                  <TextInput type="date" className="w-auto" value={invoice.paidOn ?? ""} onChange={(event) => event.target.value && onStatus("paid", event.target.value)} />
                </label>
              ) : null}
              <StateBadge state={state} />
              {state === "overdue" ? <span className="text-sm text-fail">Due {invoice.due}</span> : null}
            </div>
          ) : null}
          {quote ? (
            <p className="text-sm text-muted">
              Made from{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => onOpenQuote(quote.id)}>
                quote {quote.number}
              </button>
              .
            </p>
          ) : null}
          <Field label="From">
            <TextArea value={invoice.from} onChange={(event) => onPatch({ from: event.target.value })} className="min-h-24" maxLength={400} />
          </Field>
          <BillTo
            idBase={`invoice-${invoice.id}`}
            label="Bill to"
            to={invoice.to}
            clientId={invoice.clientId}
            clients={doc.clients}
            onChange={(next) => onPatch(next)}
            onSaveClient={onSaveClient}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice number">
              <TextInput
                value={invoice.number}
                onChange={(event) => onPatch({ number: event.target.value })}
                maxLength={24}
                aria-invalid={clash || undefined}
                aria-describedby={clash ? "invoice-number-clash" : undefined}
              />
              {clash ? (
                <span id="invoice-number-clash" role="status" className="mt-1 block text-sm text-fail">
                  Another invoice already uses this number.
                </span>
              ) : null}
            </Field>
            <Field label="Issued">
              <TextInput type="date" value={invoice.issued} onChange={(event) => onPatch({ issued: event.target.value })} />
            </Field>
            <Field label="Due">
              <TextInput type="date" value={invoice.due} min={invoice.issued || undefined} onChange={(event) => onPatch({ due: event.target.value })} />
            </Field>
            <CurrencyPicker value={currency} onChange={(code) => onPatch({ currency: code })} />
          </div>
          <TaxField idBase="invoice" value={invoice.taxPercent} check={check} onChange={(taxPercent) => onPatch({ taxPercent })} />
          <LineEditor idBase="invoice" lines={invoice.lines} check={check} onChange={(lines) => onPatch({ lines })} />
          <Field label="Notes" hint={payment.trim() ? "For this invoice only. Your bank details print on every invoice from Numbering and your details." : undefined}>
            <TextArea value={invoice.notes} onChange={(event) => onPatch({ notes: event.target.value })} className="min-h-20" maxLength={2000} placeholder="Thanks, terms, anything for this client" />
          </Field>
          {!payment.trim() ? (
            <p className="text-sm text-muted" data-payment-hint>
              Tell clients how to pay: add your bank details once under <strong>Numbering and your details</strong> (in the Invoices list) and they print on every invoice.
            </p>
          ) : null}
          <MobileTotal label="Invoice" check={check} currency={currency} />
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" disabled={printBlock != null} aria-describedby={printBlock ? "invoice-print-block" : undefined} onClick={() => window.print()}>
              Print or save as PDF
            </Button>
            <Button
              tone="quiet"
              disabled={printBlock != null || sending}
              aria-describedby={printBlock ? "invoice-print-block" : undefined}
              onPointerEnter={() => void loadPdfTools().catch(() => undefined)}
              onClick={() => void sharePdf()}
              data-share-pdf
            >
              {sending ? "Making the PDF…" : "Share PDF"}
            </Button>
            <Button tone="quiet" disabled={printBlock != null} onClick={share}>
              Copy for WhatsApp
            </Button>
            <Button tone="quiet" onClick={onNew}>
              New invoice
            </Button>
            {!isNew ? (
              <Button tone="quiet" onClick={onDuplicate}>
                Duplicate
              </Button>
            ) : null}
            {!isNew ? (
              confirmDelete ? (
                <span className="inline-flex flex-wrap items-center gap-2" role="group" aria-label="Delete this invoice?">
                  <Button tone="primary" onClick={onDelete}>
                    Yes, delete
                  </Button>
                  <Button tone="quiet" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </Button>
                </span>
              ) : (
                <Button tone="quiet" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )
            ) : null}
          </div>
          {printBlock ? (
            <p id="invoice-print-block" role="status" className="text-sm font-medium text-fail">
              {printBlock}
            </p>
          ) : null}
          <div aria-live="polite" data-share-note={note ? (note.marked ? "marked" : note.offer && invoice.status === "draft" ? "offer" : note.tone) : undefined}>
            {note ? (
              <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm", note.tone === "fail" ? "bg-fail/10 text-fail" : note.tone === "quiet" ? "text-muted" : "bg-paper-2")}>
                <span>{note.message}</span>
                {note.offer && invoice.status === "draft" ? (
                  <>
                    <span>Did you send it?</span>
                    <Button tone="quiet" onClick={markSent}>
                      Mark as sent
                    </Button>
                  </>
                ) : null}
                {note.marked ? (
                  <Button tone="quiet" onClick={undoMarkSent}>
                    Undo
                  </Button>
                ) : null}
                <button type="button" className="text-muted underline underline-offset-2" onClick={() => setSendNote(null)}>
                  {note.offer && invoice.status === "draft" ? "Not yet" : "OK"}
                </button>
              </div>
            ) : null}
          </div>
          <p className="text-xs text-muted">Share PDF sends the invoice file and a short message to WhatsApp, email or another app. Where that is not possible, it downloads the PDF and copies the message. Copy for WhatsApp copies the message only. New invoice keeps this one and moves the number on.</p>
        </form>
        <BillSheet
          title="Invoice"
          number={invoice.number}
          dates={[
            { label: "Issued", value: invoice.issued },
            ...(invoice.due ? [{ label: "Due", value: invoice.due, strong: true }] : []),
          ]}
          from={invoice.from}
          to={invoice.to}
          lines={invoice.lines}
          check={check}
          currency={currency}
          notes={invoice.notes}
          payment={payment}
          printBlock={printBlock}
          stamp={
            invoice.status === "paid" ? (
              <p className="mt-2 inline-block rounded-full border-2 border-pine px-3 py-0.5 text-sm font-semibold uppercase tracking-wide text-pine" data-paid-stamp>
                Paid{invoice.paidOn ? ` ${invoice.paidOn}` : ""}
              </p>
            ) : null
          }
        />
      </div>
    </div>
  );
}

function QuoteEditor({
  quote,
  doc,
  currency,
  today,
  invoice,
  proposal,
  onPatch,
  onSaveClient,
  onBack,
  onConvert,
  onDuplicate,
  onDelete,
  onOpenProposal,
}: {
  quote: Quote;
  doc: ClientWorkDoc;
  currency: CurrencyCode;
  today: string;
  invoice?: Invoice;
  proposal?: Proposal;
  onPatch: (patch: Partial<Quote>) => void;
  onSaveClient: () => void;
  onBack: () => void;
  onConvert: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenProposal: (id: string) => void;
}) {
  const check = billCheck(quote, currency);
  const printBlock = printBlockOf(check);
  const state = quoteState(quote, today, Boolean(invoice));
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div>
      <BackLink label="All quotes" onClick={onBack} />
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] print:block">
        <form className="no-print min-w-0 space-y-4" onSubmit={(event) => event.preventDefault()} aria-label={`Quote ${quote.number}`}>
          <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-paper-2 p-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Quote status</span>
              <select className="h-11 rounded-lg border border-line bg-card px-3 text-base" value={quote.status} onChange={(event) => onPatch({ status: event.target.value as QuoteStatus })}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
              </select>
            </label>
            <StateBadge state={state} />
          </div>
          {proposal ? (
            <p className="text-sm text-muted">
              Made from{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => onOpenProposal(proposal.id)}>
                the proposal “{proposal.title || "Untitled"}”
              </button>
              .
            </p>
          ) : null}
          <Field label="From">
            <TextArea value={quote.from} onChange={(event) => onPatch({ from: event.target.value })} className="min-h-24" maxLength={400} />
          </Field>
          <BillTo idBase={`quote-${quote.id}`} label="For" to={quote.to} clientId={quote.clientId} clients={doc.clients} onChange={(next) => onPatch(next)} onSaveClient={onSaveClient} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quote number">
              <TextInput value={quote.number} onChange={(event) => onPatch({ number: event.target.value })} maxLength={24} />
            </Field>
            <Field label="Date">
              <TextInput type="date" value={quote.issued} onChange={(event) => onPatch({ issued: event.target.value })} />
            </Field>
            <Field label="Valid until">
              <TextInput type="date" value={quote.validUntil} min={quote.issued || undefined} onChange={(event) => onPatch({ validUntil: event.target.value })} />
            </Field>
            <CurrencyPicker value={currency} onChange={(code) => onPatch({ currency: code })} />
          </div>
          <TaxField idBase="quote" value={quote.taxPercent} check={check} onChange={(taxPercent) => onPatch({ taxPercent })} />
          <LineEditor idBase="quote" lines={quote.lines} check={check} onChange={(lines) => onPatch({ lines })} />
          <Field label="Notes">
            <TextArea value={quote.notes} onChange={(event) => onPatch({ notes: event.target.value })} className="min-h-20" maxLength={4000} placeholder="What is included, timing, terms" />
          </Field>
          <MobileTotal label="Quote" check={check} currency={currency} />
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" onClick={onConvert} disabled={!invoice && (printBlock != null || quote.status === "declined")}>
              {invoice ? `Open invoice ${invoice.number}` : "Convert to invoice"}
            </Button>
            <Button tone="quiet" disabled={printBlock != null} onClick={() => window.print()}>
              Print or save as PDF
            </Button>
            <Button tone="quiet" onClick={onDuplicate}>
              Duplicate
            </Button>
            {confirmDelete ? (
              <span className="inline-flex flex-wrap items-center gap-2" role="group" aria-label="Delete this quote?">
                <Button tone="primary" onClick={onDelete}>
                  Yes, delete
                </Button>
                <Button tone="quiet" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
              </span>
            ) : (
              <Button tone="quiet" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
          {printBlock ? (
            <p role="status" className="text-sm font-medium text-fail">
              {printBlock}
            </p>
          ) : null}
          {!invoice && quote.status === "declined" ? (
            <p role="status" className="text-sm text-muted" data-declined-note>
              A declined quote is not converted. Change its status if the client agrees after all.
            </p>
          ) : null}
          <p className="text-xs text-muted">Convert to invoice copies the client, lines, tax and notes into a new numbered invoice. The quote stays here, linked to it.</p>
        </form>
        <BillSheet
          title="Quote"
          number={quote.number}
          dates={[
            { label: "Date", value: quote.issued },
            ...(quote.validUntil ? [{ label: "Valid until", value: quote.validUntil, strong: true }] : []),
          ]}
          from={quote.from}
          to={quote.to}
          lines={quote.lines}
          check={check}
          currency={currency}
          notes={quote.notes}
          printBlock={printBlock}
        />
      </div>
    </div>
  );
}

function ProposalEditor({
  proposal,
  doc,
  quote,
  onPatch,
  onSaveClient,
  onBack,
  onQuote,
  onDelete,
}: {
  proposal: Proposal;
  doc: ClientWorkDoc;
  quote?: Quote;
  onPatch: (patch: Partial<Proposal>) => void;
  onSaveClient: () => void;
  onBack: () => void;
  onQuote: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sections: [string, string][] = [
    ["What you need", proposal.problem],
    ["The work", proposal.work],
    ["Price", proposal.price],
    ["Next step", proposal.next],
  ];
  return (
    <div>
      <BackLink label="All proposals" onClick={onBack} />
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] print:block">
        <form className="no-print min-w-0 space-y-4" onSubmit={(event) => event.preventDefault()} aria-label="Proposal">
          <Field label="Title">
            <TextInput value={proposal.title} onChange={(event) => onPatch({ title: event.target.value })} maxLength={120} placeholder="Website refresh for Ada Foods" />
          </Field>
          <BillTo idBase={`proposal-${proposal.id}`} label="Client" to={proposal.to} clientId={proposal.clientId} clients={doc.clients} onChange={(next) => onPatch(next)} onSaveClient={onSaveClient} />
          <Field label="What the client needs">
            <TextArea value={proposal.problem} onChange={(event) => onPatch({ problem: event.target.value })} className="min-h-24" maxLength={4000} />
          </Field>
          <Field label="The work" hint="One item per line. Each line becomes a line of the quote.">
            <TextArea value={proposal.work} onChange={(event) => onPatch({ work: event.target.value })} className="min-h-28" maxLength={4000} placeholder={"Design: 3 pages - 150000\nHosting set-up - 20000"} />
          </Field>
          <Field label="Price">
            <TextInput value={proposal.price} onChange={(event) => onPatch({ price: event.target.value })} maxLength={120} />
          </Field>
          <Field label="Next step">
            <TextArea value={proposal.next} onChange={(event) => onPatch({ next: event.target.value })} className="min-h-20" maxLength={2000} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" onClick={onQuote}>
              {quote ? `Open quote ${quote.number}` : "Make a quote from this"}
            </Button>
            <Button tone="quiet" onClick={() => window.print()}>
              Print or save as PDF
            </Button>
            {confirmDelete ? (
              <span className="inline-flex flex-wrap items-center gap-2" role="group" aria-label="Delete this proposal?">
                <Button tone="primary" onClick={onDelete}>
                  Yes, delete
                </Button>
                <Button tone="quiet" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
              </span>
            ) : (
              <Button tone="quiet" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </form>
        <article aria-label="Proposal page" className="invoice-sheet min-w-0 rounded-3xl bg-card p-5 shadow-line sm:p-8">
          <p className="text-sm text-muted">Proposal</p>
          <h2 className="font-display text-3xl tracking-tight break-words sm:text-4xl">{proposal.title.trim() || "Untitled proposal"}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-sm text-muted">From</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{doc.from.trim() || "—"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted">For</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{proposal.to.trim() || "—"}</p>
            </div>
          </div>
          {sections.map(([label, text]) =>
            text.trim() ? (
              <section key={label} className="mt-6">
                <h3 className="text-sm font-medium text-muted">{label}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words">{text.trim()}</p>
              </section>
            ) : null,
          )}
        </article>
      </div>
    </div>
  );
}

/* ── lists ───────────────────────────────────────────────────────────────── */

function SearchBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <TextInput type="search" aria-label={label} placeholder="Search by client, number or amount" value={value} onChange={(event) => onChange(event.target.value)} className="sm:max-w-sm" />
  );
}

function money(minor: number | null, currency: CurrencyCode): string {
  return minor == null ? "No total yet" : formatMoney(toMajor(minor, currency), currency);
}

function InvoiceList({
  doc,
  guessed,
  today,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
  onPaid,
  onSettings,
}: {
  doc: ClientWorkDoc;
  guessed: CurrencyCode;
  today: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPaid: (id: string) => void;
  onSettings: (patch: Partial<ClientWorkDoc>) => void;
}) {
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      [...doc.invoices]
        .sort(byNewest)
        .map((invoice) => {
          const currency = billCurrency(invoice, doc, guessed);
          return { invoice, currency, check: billCheck(invoice, currency), state: invoiceState(invoice, today), name: clientName(doc, invoice) };
        }),
    [doc, guessed, today],
  );
  const shown = rows.filter((row) => matchesSearch(row.invoice, query, { clients: doc.clients, currency: row.currency }));
  const unpaid = rows.filter((row) => row.state !== "paid").length;
  const overdue = rows.filter((row) => row.state === "overdue").length;
  const chase = useMemo(() => followUps(doc, today, guessed), [doc, today, guessed]);
  return (
    <section aria-label="Invoices" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox label="Search invoices" value={query} onChange={setQuery} />
        <Button tone="primary" onClick={onNew}>
          New invoice
        </Button>
      </div>
      {chase.length > 0 && !query.trim() ? <FollowUpList items={chase} doc={doc} today={today} onOpen={onOpen} onPaid={onPaid} /> : null}
      <p className="text-sm text-muted" data-summary>
        {rows.length === 0 ? "No invoices yet." : `${rows.length} invoice${rows.length === 1 ? "" : "s"} · ${unpaid} unpaid${overdue ? ` · ${overdue} overdue` : ""}`}
        {query.trim() ? ` · ${shown.length} match${shown.length === 1 ? "" : "es"} “${query.trim()}”` : ""}
      </p>
      <ul className="space-y-2">
        {shown.map(({ invoice, currency, check, state, name }) => (
          <li key={invoice.id} data-invoice-row={invoice.number} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-line sm:flex-row sm:items-center">
            <button type="button" onClick={() => onOpen(invoice.id)} className="min-w-0 flex-1 text-left" aria-label={`Open invoice ${invoice.number}${name ? ` for ${name}` : ""}`}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{invoice.number || "No number"}</span>
                <StateBadge state={state} />
              </span>
              <span className="mt-1 block truncate text-sm text-muted">
                {name || "No client yet"} · {invoice.issued || "no date"}
                {state === "paid" && invoice.paidOn ? ` · paid ${invoice.paidOn}` : invoice.due ? ` · due ${invoice.due}` : ""}
              </span>
            </button>
            <span className="tabular-nums sm:text-right">{money(check.totalMinor, currency)}</span>
            <span className="flex flex-wrap gap-2">
              {state !== "paid" ? (
                <Button tone="quiet" onClick={() => onPaid(invoice.id)} aria-label={`Mark invoice ${invoice.number} paid`}>
                  Mark paid
                </Button>
              ) : null}
              <Button tone="quiet" onClick={() => onDuplicate(invoice.id)} aria-label={`Duplicate invoice ${invoice.number}`}>
                Duplicate
              </Button>
              {asking === invoice.id ? (
                <Button tone="primary" onClick={() => onDelete(invoice.id)} aria-label={`Yes, delete invoice ${invoice.number}`}>
                  Yes, delete
                </Button>
              ) : (
                <Button tone="quiet" onClick={() => setAsking(invoice.id)} aria-label={`Delete invoice ${invoice.number}`}>
                  Delete
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 0 && shown.length === 0 ? <p className="text-sm">No invoice matches “{query.trim()}”.</p> : null}
      <details className="rounded-2xl bg-paper-2 p-4 text-sm">
        <summary className="cursor-pointer font-medium">Numbering and your details</summary>
        <NumberingSettings doc={doc} onSettings={onSettings} />
      </details>
    </section>
  );
}

/** Sent invoices that are overdue or due soon, with a ready reminder message and a link to Remind. */
function FollowUpList({
  items,
  doc,
  today,
  onOpen,
  onPaid,
}: {
  items: FollowUp[];
  doc: ClientWorkDoc;
  today: string;
  onOpen: (id: string) => void;
  onPaid: (id: string) => void;
}) {
  function copy(item: FollowUp) {
    const text = reminderMessage(item, { from: doc.from, payment: doc.payment });
    void navigator.clipboard.writeText(text).then(
      () => toast.success(`Reminder for ${item.invoice.number || "this invoice"} copied. Paste it into WhatsApp or an email.`),
      () => toast.error("Could not copy. Open the invoice and copy its details instead."),
    );
  }
  return (
    <section aria-labelledby="follow-up-title" className="rounded-2xl bg-paper-2 p-4" data-follow-up>
      <h2 id="follow-up-title" className="font-medium">
        Needs follow-up ({items.length})
      </h2>
      <p className="mt-1 text-sm text-muted">Sent invoices that are overdue or due in the next 3 days. Marking one paid removes it.</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const { invoice } = item;
          const label = invoice.number || "No number";
          return (
            <li key={invoice.id} data-follow-up-row={invoice.number} className="flex flex-col gap-3 rounded-xl bg-card p-3 shadow-line sm:flex-row sm:items-center">
              <button type="button" onClick={() => onOpen(invoice.id)} className="min-w-0 flex-1 text-left" aria-label={`Open invoice ${label}${item.name ? ` for ${item.name}` : ""}`}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{label}</span>
                  <span className={cn("text-sm font-medium", item.daysLate > 0 ? "text-fail" : "text-muted")} data-late>
                    {lateLabel(item.daysLate)}
                  </span>
                </span>
                <span className="mt-1 block break-words text-sm text-muted">
                  {item.name || "No client yet"} · {money(item.totalMinor, item.currency)} · due {longDate(invoice.due)}
                </span>
              </button>
              <span className="flex flex-wrap gap-2">
                <Button tone="quiet" onClick={() => copy(item)} aria-label={`Copy a payment reminder for invoice ${label}`} data-copy-reminder>
                  Copy reminder
                </Button>
                <Link
                  to="/apps/$slug"
                  params={{ slug: "tasks" }}
                  search={{ add: remindText(item, today) }}
                  className={buttonClass({ tone: "quiet" })}
                  aria-label={`Remind me to follow up invoice ${label}`}
                  data-remind-me
                >
                  Remind me
                </Link>
                <Button tone="quiet" onClick={() => onPaid(invoice.id)} aria-label={`Mark invoice ${label} paid`}>
                  Mark paid
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NumberingSettings({ doc, onSettings }: { doc: ClientWorkDoc; onSettings: (patch: Partial<ClientWorkDoc>) => void }) {
  const preview = nextNumber(doc.numbering, doc.invoices.map((item) => item.number));
  const quotePreview = nextNumber(doc.quoteNumbering, doc.quotes.map((item) => item.number));
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Invoice number prefix" hint={`The next invoice will be ${preview}.`}>
        <TextInput value={doc.numbering.prefix} maxLength={12} placeholder="INV-" onChange={(event) => onSettings({ numbering: { ...doc.numbering, prefix: event.target.value } })} />
      </Field>
      <Field label="Quote number prefix" hint={`The next quote will be ${quotePreview}.`}>
        <TextInput value={doc.quoteNumbering.prefix} maxLength={12} onChange={(event) => onSettings({ quoteNumbering: { ...doc.quoteNumbering, prefix: event.target.value } })} />
      </Field>
      <Field label="Start numbering at" hint="Numbers already used are never repeated.">
        <TextInput
          inputMode="numeric"
          value={String(doc.numbering.next)}
          onChange={(event) => {
            const next = Number(event.target.value.replace(/\D/g, ""));
            if (Number.isInteger(next) && next >= 1 && next < 1e9) onSettings({ numbering: { ...doc.numbering, next } });
          }}
        />
      </Field>
      <Field label="Your details (From)" hint="Used on every new invoice, quote and proposal.">
        <TextArea value={doc.from} className="min-h-20" maxLength={400} onChange={(event) => onSettings({ from: event.target.value })} />
      </Field>
      <Field label="How to pay" hint="Bank name, account name and number, or a payment link. Printed on every invoice.">
        <TextArea
          value={doc.payment ?? ""}
          className="min-h-20"
          maxLength={400}
          placeholder={"Bank: Example Bank\nAccount name: Synthetic Studio Ltd\nAccount number: 0123456789"}
          onChange={(event) => onSettings({ payment: event.target.value })}
        />
      </Field>
    </div>
  );
}

function QuoteList({
  doc,
  guessed,
  today,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
  onConvert,
  onOpenInvoice,
}: {
  doc: ClientWorkDoc;
  guessed: CurrencyCode;
  today: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
  onOpenInvoice: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const rows = [...doc.quotes].sort(byNewest).map((quote) => {
    const currency = billCurrency(quote, doc, guessed);
    const invoice = quote.invoiceId ? doc.invoices.find((item) => item.id === quote.invoiceId) : undefined;
    return { quote, currency, invoice, check: billCheck(quote, currency), state: quoteState(quote, today, Boolean(invoice)), name: clientName(doc, quote) };
  });
  const shown = rows.filter((row) => matchesSearch(row.quote, query, { clients: doc.clients, currency: row.currency }));
  return (
    <section aria-label="Quotes" className="space-y-4">
      <p className="max-w-2xl text-pretty text-sm text-muted">A quote is the price before the work. When the client agrees, convert it: the lines and client go into a new invoice.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox label="Search quotes" value={query} onChange={setQuery} />
        <Button tone="primary" onClick={onNew}>
          New quote
        </Button>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">No quotes yet.</p> : null}
      <ul className="space-y-2">
        {shown.map(({ quote, currency, invoice, check, state, name }) => (
          <li key={quote.id} data-quote-row={quote.number} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-line sm:flex-row sm:items-center">
            <button type="button" onClick={() => onOpen(quote.id)} className="min-w-0 flex-1 text-left" aria-label={`Open quote ${quote.number}${name ? ` for ${name}` : ""}`}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{quote.number || "No number"}</span>
                <StateBadge state={state} />
              </span>
              <span className="mt-1 block truncate text-sm text-muted">
                {name || "No client yet"} · {quote.issued || "no date"}
                {quote.validUntil ? ` · valid until ${quote.validUntil}` : ""}
              </span>
            </button>
            <span className="tabular-nums sm:text-right">{money(check.totalMinor, currency)}</span>
            <span className="flex flex-wrap gap-2">
              {invoice ? (
                <Button tone="quiet" onClick={() => onOpenInvoice(invoice.id)}>
                  Invoice {invoice.number}
                </Button>
              ) : (
                <Button tone="quiet" disabled={!check.valid || quote.status === "declined"} onClick={() => onConvert(quote.id)} aria-label={`Convert quote ${quote.number} to an invoice`}>
                  Convert to invoice
                </Button>
              )}
              <Button tone="quiet" onClick={() => onDuplicate(quote.id)} aria-label={`Duplicate quote ${quote.number}`}>
                Duplicate
              </Button>
              {asking === quote.id ? (
                <Button tone="primary" onClick={() => onDelete(quote.id)}>
                  Yes, delete
                </Button>
              ) : (
                <Button tone="quiet" onClick={() => setAsking(quote.id)} aria-label={`Delete quote ${quote.number}`}>
                  Delete
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 0 && shown.length === 0 ? <p className="text-sm">No quote matches “{query.trim()}”.</p> : null}
    </section>
  );
}

function ProposalList({
  doc,
  onOpen,
  onNew,
  onDelete,
  onQuote,
}: {
  doc: ClientWorkDoc;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onQuote: (id: string) => void;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  const rows = [...doc.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section aria-label="Proposals" className="space-y-4">
      <p className="max-w-2xl text-pretty text-sm text-muted">A short proposal for one job: what the client needs, the work, the price and the next step. Make a quote from it when it is agreed.</p>
      <Button tone="primary" onClick={onNew}>
        New proposal
      </Button>
      {rows.length === 0 ? <p className="text-sm text-muted">No proposals yet.</p> : null}
      <ul className="space-y-2">
        {rows.map((proposal) => {
          const quote = proposal.quoteId ? doc.quotes.find((item) => item.id === proposal.quoteId) : undefined;
          const name = clientName(doc, proposal);
          return (
            <li key={proposal.id} data-proposal-row={proposal.title} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-line sm:flex-row sm:items-center">
              <button type="button" onClick={() => onOpen(proposal.id)} className="min-w-0 flex-1 text-left" aria-label={`Open proposal ${proposal.title || "Untitled"}`}>
                <span className="block font-medium">{proposal.title || "Untitled proposal"}</span>
                <span className="mt-1 block truncate text-sm text-muted">
                  {name || "No client yet"} · {proposal.createdAt.slice(0, 10)}
                </span>
              </button>
              <span className="flex flex-wrap gap-2">
                <Button tone="quiet" onClick={() => onQuote(proposal.id)}>
                  {quote ? `Quote ${quote.number}` : "Make a quote"}
                </Button>
                {asking === proposal.id ? (
                  <Button tone="primary" onClick={() => onDelete(proposal.id)}>
                    Yes, delete
                  </Button>
                ) : (
                  <Button tone="quiet" onClick={() => setAsking(proposal.id)}>
                    Delete
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ClientList({
  doc,
  onSave,
  onDelete,
  onNewInvoice,
  onNewQuote,
}: {
  doc: ClientWorkDoc;
  onSave: (client: Client) => void;
  onDelete: (id: string) => void;
  onNewInvoice: (client: Client) => void;
  onNewQuote: (client: Client) => void;
}) {
  const [editing, setEditing] = useState<Client | null>(null);
  const rows = [...doc.clients].sort((a, b) => a.name.localeCompare(b.name));
  const blank = (): Client => ({ id: nid(), name: "", email: "", address: "", createdAt: new Date().toISOString() });
  return (
    <section aria-label="Clients" className="space-y-4">
      <p className="max-w-2xl text-pretty text-sm text-muted">Saved clients appear in the Bill to box of every invoice and quote, so you never retype them.</p>
      {editing ? (
        <ClientForm
          client={editing}
          onCancel={() => setEditing(null)}
          onSave={(client) => {
            onSave(client);
            setEditing(null);
          }}
        />
      ) : (
        <Button tone="primary" onClick={() => setEditing(blank())}>
          Add a client
        </Button>
      )}
      {rows.length === 0 ? <p className="text-sm text-muted">No saved clients yet.</p> : null}
      <ul className="space-y-2">
        {rows.map((client) => (
          <li key={client.id} data-client-row={client.name} className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-line sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{client.name}</p>
              <p className="text-sm whitespace-pre-wrap break-words text-muted">{[client.email, client.address].filter(Boolean).join("\n") || "No email or address"}</p>
            </div>
            <span className="flex flex-wrap gap-2">
              <Button tone="quiet" onClick={() => onNewInvoice(client)}>
                New invoice
              </Button>
              <Button tone="quiet" onClick={() => onNewQuote(client)}>
                New quote
              </Button>
              <Button tone="quiet" onClick={() => setEditing(client)}>
                Edit
              </Button>
              <Button tone="quiet" onClick={() => onDelete(client.id)} aria-label={`Remove client ${client.name}`}>
                Remove
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClientForm({ client, onSave, onCancel }: { client: Client; onSave: (client: Client) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(client);
  return (
    <form
      className="grid gap-3 rounded-2xl bg-paper-2 p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (draft.name.trim()) onSave({ ...draft, name: draft.name.trim(), email: draft.email.trim(), address: draft.address.trim() });
      }}
    >
      <Field label="Client name">
        <TextInput value={draft.name} required maxLength={120} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </Field>
      <Field label="Email (optional)">
        <TextInput type="email" value={draft.email} maxLength={160} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address">
          <TextArea value={draft.address} className="min-h-20" maxLength={400} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
        </Field>
      </div>
      <div className={cn("flex flex-wrap gap-2 sm:col-span-2")}>
        <Button tone="primary" type="submit" disabled={!draft.name.trim()}>
          Save client
        </Button>
        <Button tone="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

