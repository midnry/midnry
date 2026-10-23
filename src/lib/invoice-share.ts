/**
 * "Share PDF" in the Invoice app: what happens when the person presses it.
 * Kept free of React and of the PDF library so scripts/invoice-pdf.test.mjs
 * can check every path in Node.
 *
 *  - Where the browser can share files (most phones), the share sheet opens
 *    with the PDF and the WhatsApp message.
 *  - Where it cannot (e.g. Firefox on a computer), or sharing fails, the PDF
 *    is downloaded and the message copied instead, and the person is told.
 *  - Cancelling the share sheet changes nothing.
 *
 * Sharing is not sending: the share sheet only says the file was handed to
 * another app, not that the client got it. So nothing here changes the
 * invoice. The person is asked "Did you send it?" and only their press of
 * "Mark as sent" sets the status (markSentPatch), with an Undo.
 */
import { parseClientText, type Invoice } from "@/lib/client-work";

/** "Invoice INV-0002 – Okafor Foods.pdf", safe as a file name on phones and computers. */
export function invoicePdfName(number: string, to: string): string {
  const safe = (text: string) =>
    text
      .normalize("NFC")
      .replace(/[\\/:*?"<>|\p{Cc}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[.\s]+|[.\s]+$/g, "");
  const name = safe(number);
  const client = safe(parseClientText(to).name);
  const base = `Invoice${name ? ` ${name}` : ""}${client ? ` – ${client}` : ""}`;
  // Most systems allow 255 bytes; 100 letters stays well under that.
  const chars = [...base];
  return `${chars.length > 100 ? chars.slice(0, 100).join("").trim() : base}.pdf`;
}

/** The parts of `navigator` used here; a stub in tests. */
export type ShareNavigator = {
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
};

export type SendRoute = "shared" | "cancelled" | "fallback";

export type SendResult = {
  route: SendRoute;
  /** What to tell the person, in plain words. */
  message: string;
  /** Offer "Did you send it? Mark as sent". It never changes the invoice by itself. */
  offerMarkSent: boolean;
  /** The PDF was downloaded (fallback only). */
  downloaded: boolean;
  /** The WhatsApp message was copied (fallback only). */
  copied: boolean;
};

export const FALLBACK_DONE = "PDF downloaded and message copied. Attach the PDF in WhatsApp or email.";
export const FALLBACK_NO_COPY = "PDF downloaded. Use Copy for WhatsApp for the message, then attach the PDF in WhatsApp or email.";
export const SHARED = "Shared.";
export const NOT_SHARED = "Not shared.";

/** True when this browser says it can share this file. */
export function canShareFiles(nav: ShareNavigator | undefined, file: File): boolean {
  if (!nav || typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] }) === true;
  } catch {
    return false;
  }
}

function errorName(error: unknown): string {
  return error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
}

/** Why sharing did not work, in a few words, for the fallback message. */
export function shareFailureReason(error: unknown): string {
  switch (errorName(error)) {
    case "NotAllowedError":
      return "This browser did not allow sharing.";
    case "TypeError":
    case "DataError":
      return "This browser could not share the file.";
    default:
      return "Sharing did not work.";
  }
}

/**
 * Share the invoice PDF, or download it and copy the message.
 * `makeFile` builds the PDF; any error from it is passed on to the caller.
 */
export async function sendInvoicePdf(input: {
  nav: ShareNavigator | undefined;
  makeFile: () => Promise<File>;
  title: string;
  text: string;
  /** Only a draft is offered "Mark as sent"; a sent or paid invoice is left alone. */
  status: Invoice["status"];
  download: (file: File) => void;
  copy: (text: string) => Promise<void>;
}): Promise<SendResult> {
  const offer = input.status === "draft";
  const tryCopy = () => input.copy(input.text).then(
    () => true,
    () => false,
  );
  const fallback = async (file: File | null, reason: string, copiedFirst?: boolean): Promise<SendResult> => {
    const copied = copiedFirst ?? (await tryCopy());
    input.download(file ?? (await input.makeFile()));
    const done = copied ? FALLBACK_DONE : FALLBACK_NO_COPY;
    return { route: "fallback", message: reason ? `${reason} ${done}` : done, offerMarkSent: offer, downloaded: true, copied };
  };

  // A small stand-in file answers "can this browser share a PDF?" before the
  // real one is built, so the message is copied while the press still counts.
  const probe = new File([new Uint8Array(0)], "invoice.pdf", { type: "application/pdf" });
  if (!canShareFiles(input.nav, probe)) {
    const copied = await tryCopy();
    return fallback(null, "", copied);
  }
  const file = await input.makeFile();
  if (!canShareFiles(input.nav, file)) return fallback(file, "");
  try {
    await input.nav!.share!({ files: [file], title: input.title, text: input.text });
  } catch (error) {
    if (errorName(error) === "AbortError") {
      return { route: "cancelled", message: NOT_SHARED, offerMarkSent: false, downloaded: false, copied: false };
    }
    return fallback(file, shareFailureReason(error));
  }
  return { route: "shared", message: SHARED, offerMarkSent: offer, downloaded: false, copied: false };
}

/** What "Mark as sent" changes: status Sent, sent today. Null when it is not a draft. */
export function markSentPatch(invoice: Pick<Invoice, "status">, today: string): Pick<Invoice, "status" | "sentOn"> | null {
  return invoice.status === "draft" ? { status: "sent", sentOn: today } : null;
}

/** What Undo puts back after "Mark as sent". */
export function undoMarkSentPatch(before: Pick<Invoice, "status" | "sentOn">): Pick<Invoice, "status" | "sentOn"> {
  return { status: before.status, sentOn: before.sentOn };
}
