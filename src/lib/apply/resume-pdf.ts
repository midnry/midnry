/**
 * The tailored resume as a PDF, with an embedded Unicode font (Nunito, from
 * @fontsource) so names like "Adébáyọ̀ Ọlá", "José Müller" and "Łukasz Żółć"
 * keep every letter. Nunito ships in per-script pieces (Latin, Latin
 * extended, Vietnamese, Cyrillic); each piece is embedded as a subset and
 * every character is drawn with the first piece that has it.
 *
 * Kept free of the browser so scripts/apply-pdf.test.mjs can run it in Node.
 * The page loads it, and the font files, only when someone downloads a PDF.
 */
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type FontBytes = { regular: Uint8Array[]; bold: Uint8Array[] };

type Face = { pdf: PDFFont; has: (codePoint: number) => boolean };
type Run = { text: string; face: Face };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 54;
const INK = rgb(0.1, 0.12, 0.16);

async function embedFaces(doc: PDFDocument, pieces: Uint8Array[]): Promise<Face[]> {
  const faces: Face[] = [];
  for (const bytes of pieces) {
    const info = fontkit.create(bytes as unknown as Buffer);
    const pdf = await doc.embedFont(bytes, { subset: true });
    faces.push({ pdf, has: (codePoint) => info.hasGlyphForCodePoint(codePoint) });
  }
  return faces;
}

const MARK = /\p{M}/u;

/** Split text into runs, each drawn with one font piece. */
function runsOf(text: string, faces: Face[], missing: Set<string>): Run[] {
  const runs: Run[] = [];
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 32;
    const last = runs.at(-1);
    // A combining accent stays with the letter before it when that piece has it.
    let face = MARK.test(char) && last?.face.has(codePoint) ? last.face : faces.find((item) => item.has(codePoint));
    if (!face) {
      missing.add(char);
      face = faces[0];
    }
    if (last && last.face === face) last.text += char;
    else runs.push({ text: char, face });
  }
  return runs;
}

function widthOf(runs: Run[], size: number): number {
  return runs.reduce((sum, run) => sum + run.face.pdf.widthOfTextAtSize(run.text, size), 0);
}

export type ResumePdf = { bytes: Uint8Array; missing: string[] };

export async function buildResumePdf(role: string, text: string, fonts: FontBytes): Promise<ResumePdf> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(role);
  const regular = await embedFaces(doc, fonts.regular);
  const bold = await embedFaces(doc, fonts.bold);
  const missing = new Set<string>();
  const width = PAGE_W - MARGIN * 2;
  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const write = (runs: Run[], size: number, gap: number) => {
    if (y - size < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    let x = MARGIN;
    for (const run of runs) {
      page.drawText(run.text, { x, y: y - size, size, font: run.face.pdf, color: INK });
      x += run.face.pdf.widthOfTextAtSize(run.text, size);
    }
    y -= size + gap;
  };
  const wrap = (source: string, size: number, faces: Face[]): Run[][] => {
    const words = source.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (widthOf(runsOf(next, faces, new Set()), size) <= width) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.map((item) => runsOf(item, faces, missing));
  };

  for (const line of wrap(role.normalize("NFC"), 16, bold)) write(line, 16, 8);
  for (const block of text.normalize("NFC").split("\n")) {
    // Control characters are not printable; everything else is kept.
    const plain = block.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
    if (!plain) {
      y -= 8;
      continue;
    }
    for (const line of wrap(plain, 10, regular)) write(line, 10, 3);
    y -= 3;
  }

  return { bytes: await doc.save(), missing: [...missing] };
}
