/**
 * The invoice as a PDF file, made on the device (nothing is uploaded), for
 * "Share PDF" in the Invoice app. It shows what the on-screen sheet shows
 * (BillSheet in src/components/tools/client-work-parts.tsx): number, dates,
 * From, Bill to, each line with quantity, rate and amount, subtotal, tax,
 * total, How to pay and notes. Sums come from the same check (invoice-math).
 *
 * Text is drawn with the embedded Nunito pieces Apply already uses
 * (src/lib/apply/resume-fonts.ts), so "₦" (in the Latin-extended piece) and
 * accented names keep every letter.
 *
 * Kept free of the browser so scripts/invoice-pdf.test.mjs can run it in Node.
 */
import { PDFDocument, rgb, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { embedFaces, runsOf, widthOf, type Face, type FontBytes, type Run } from "@/lib/apply/resume-pdf";
import { roundingNote, toMajor, type InvoiceCheck } from "@/lib/invoice-math";
import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/format";
import type { InvoiceStatus, Line } from "@/lib/client-work";

export type InvoicePdfInput = {
  number: string;
  issued: string;
  due: string;
  from: string;
  to: string;
  lines: readonly Line[];
  check: InvoiceCheck;
  currency: CurrencyCode;
  /** How to pay (bank details or a payment link). */
  payment: string;
  notes: string;
  status: InvoiceStatus;
  paidOn?: string;
};

export type InvoicePdf = { bytes: Uint8Array; missing: string[] };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT = PAGE_W - MARGIN;
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.4, 0.43, 0.48);
const RULE = rgb(0.85, 0.86, 0.88);
const PINE = rgb(0.12, 0.4, 0.3);

const QTY_W = 48;
const RATE_W = 100;
const AMOUNT_W = 110;
const GAP = 10;
const DESC_W = CONTENT_W - QTY_W - RATE_W - AMOUNT_W - GAP * 3;

/** Printable text: one form of each accented letter, no control characters. */
function clean(text: string): string {
  return text.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[^\P{Cc}\n]/gu, " ");
}

function currencyName(code: CurrencyCode): string {
  return CURRENCIES.find((item) => item.code === code)?.label.replace(/^\S+\s/, "") ?? code;
}

export async function buildInvoicePdf(input: InvoicePdfInput, fonts: FontBytes): Promise<InvoicePdf> {
  const { check, currency } = input;
  if (!check.valid || check.totalMinor == null || check.subtotalMinor == null || check.taxMinor == null) {
    throw new Error("Fix the invoice before making the PDF.");
  }
  const money = (minor: number | null) => (minor == null ? "—" : formatMoney(toMajor(minor, currency), currency));

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Invoice ${input.number.trim()}`.trim());
  doc.setCreator("Midnry Invoice");
  const regular = await embedFaces(doc, fonts.regular);
  const bold = await embedFaces(doc, fonts.bold);
  const missing = new Set<string>();

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  /** Top of the next thing to draw. */
  let y = PAGE_H - MARGIN;
  let onNewPage: (() => void) | null = null;

  const runs = (text: string, faces: Face[]) => runsOf(text, faces, missing);
  const draw = (line: Run[], x: number, top: number, size: number, color: RGB) => {
    let at = x;
    for (const run of line) {
      page.drawText(run.text, { x: at, y: top - size, size, font: run.face.pdf, color });
      at += run.face.pdf.widthOfTextAtSize(run.text, size);
    }
  };
  const drawRight = (text: string, right: number, top: number, size: number, faces: Face[], color: RGB) => {
    const line = runs(text, faces);
    draw(line, right - widthOf(line, size), top, size, color);
  };
  /** Lines of text no wider than `width`; a word longer than a line is broken. */
  const wrap = (source: string, width: number, size: number, faces: Face[]): Run[][] => {
    const fits = (text: string) => widthOf(runsOf(text, faces, new Set()), size) <= width;
    const out: string[] = [];
    for (const paragraph of clean(source).split("\n")) {
      const words = paragraph.split(/[^\S\n]+/).filter(Boolean);
      if (!words.length) {
        out.push("");
        continue;
      }
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (fits(next)) {
          line = next;
          continue;
        }
        if (line) out.push(line);
        line = "";
        let piece = "";
        for (const char of word) {
          if (piece && !fits(piece + char)) {
            out.push(piece);
            piece = "";
          }
          piece += char;
        }
        line = piece;
      }
      out.push(line);
    }
    while (out.length && !out.at(-1)) out.pop();
    return out.map((item) => runs(item, faces));
  };
  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    onNewPage?.();
  };
  const ensure = (height: number) => {
    if (y - height < MARGIN) newPage();
  };
  /** A block of wrapped text across the given width, moving to a new page as needed. */
  const block = (text: string, x: number, width: number, size: number, faces: Face[], color: RGB, leading = 1.4) => {
    for (const line of wrap(text, width, size, faces)) {
      ensure(size * leading);
      draw(line, x, y, size, color);
      y -= size * leading;
    }
  };

  // Heading: "Invoice", the number, a Paid stamp; dates on the right.
  const top = y;
  draw(runs("Invoice", regular), MARGIN, y, 10, MUTED);
  y -= 16;
  const numberLines = wrap(input.number.trim() || "—", CONTENT_W * 0.55, 24, bold);
  for (const line of numberLines) {
    draw(line, MARGIN, y, 24, INK);
    y -= 29;
  }
  if (input.status === "paid") {
    y -= 2;
    draw(runs(`PAID${input.paidOn ? ` ${input.paidOn}` : ""}`, bold), MARGIN, y, 11, PINE);
    y -= 16;
  }
  let right = top;
  const dates: [string, string, boolean][] = [["Issued", input.issued, false]];
  if (input.due.trim()) dates.push(["Due", input.due, true]);
  for (const [label, value, strong] of dates) {
    drawRight(`${label} ${value.trim() || "—"}`, RIGHT, right, 10, strong ? bold : regular, strong ? INK : MUTED);
    right -= 15;
  }
  y = Math.min(y, right) - 20;

  // From and Bill to, side by side.
  const colW = (CONTENT_W - 24) / 2;
  const fromLines = wrap(input.from.trim() || "—", colW, 10.5, regular);
  const toLines = wrap(input.to.trim() || "—", colW, 10.5, regular);
  ensure(16 + Math.min(Math.max(fromLines.length, toLines.length), 6) * 14.5);
  draw(runs("From", regular), MARGIN, y, 9.5, MUTED);
  draw(runs("Bill to", regular), MARGIN + colW + 24, y, 9.5, MUTED);
  y -= 16;
  for (let i = 0; i < Math.max(fromLines.length, toLines.length); i++) {
    ensure(14.5);
    if (fromLines[i]) draw(fromLines[i], MARGIN, y, 10.5, INK);
    if (toLines[i]) draw(toLines[i], MARGIN + colW + 24, y, 10.5, INK);
    y -= 14.5;
  }
  y -= 18;

  // The lines, with the column heading repeated on every page.
  const qtyRight = MARGIN + DESC_W + GAP + QTY_W;
  const rateRight = qtyRight + GAP + RATE_W;
  const tableHead = () => {
    draw(runs("Description", regular), MARGIN, y, 9.5, MUTED);
    drawRight("Qty", qtyRight, y, 9.5, regular, MUTED);
    drawRight("Rate", rateRight, y, 9.5, regular, MUTED);
    drawRight("Amount", RIGHT, y, 9.5, regular, MUTED);
    y -= 15;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT, y }, thickness: 0.75, color: RULE });
    y -= 7;
  };
  ensure(60);
  tableHead();
  onNewPage = tableHead;
  input.lines.forEach((line, index) => {
    const lineCheck = check.lines[index];
    if (!lineCheck || lineCheck.empty) return;
    const desc = wrap(line.description.trim() || "—", DESC_W, 10.5, regular);
    const height = desc.length * 14 + 8;
    ensure(height);
    const rowTop = y;
    // Description first, so copied or read-out text keeps the sheet's order.
    for (const part of desc) {
      draw(part, MARGIN, y, 10.5, INK);
      y -= 14;
    }
    drawRight(line.qty.trim(), qtyRight, rowTop, 10.5, regular, INK);
    drawRight(money(lineCheck.rateMinor), rateRight, rowTop, 10.5, regular, INK);
    drawRight(money(lineCheck.amountMinor), RIGHT, rowTop, 10.5, regular, INK);
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT, y }, thickness: 0.5, color: RULE });
    y -= 6;
  });
  onNewPage = null;

  // Subtotal, tax and total on the right.
  y -= 6;
  ensure(62);
  const labelX = RIGHT - 230;
  const sums: [string, string, boolean][] = [
    ["Subtotal", money(check.subtotalMinor), false],
    [`Tax ${check.taxPercent ?? "0"}%`, money(check.taxMinor), false],
    ["Total", money(check.totalMinor), true],
  ];
  for (const [label, value, strong] of sums) {
    if (strong) y -= 4;
    const size = strong ? 13 : 10.5;
    draw(runs(label, strong ? bold : regular), labelX, y, size, strong ? INK : MUTED);
    drawRight(value, RIGHT, y, size, strong ? bold : regular, INK);
    y -= size + 6;
  }

  if (input.payment.trim()) {
    y -= 16;
    ensure(32);
    draw(runs("How to pay", bold), MARGIN, y, 11, INK);
    y -= 16;
    block(input.payment.trim(), MARGIN, CONTENT_W, 10.5, regular, INK);
  }
  if (input.notes.trim()) {
    y -= 14;
    block(input.notes.trim(), MARGIN, CONTENT_W, 10.5, regular, MUTED);
  }
  y -= 16;
  block(`Amounts in ${currencyName(currency)} (${currency}). ${roundingNote(currency)}`, MARGIN, CONTENT_W, 8.5, regular, MUTED);

  return { bytes: await doc.save(), missing: [...missing] };
}
