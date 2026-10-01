import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { countryName, weekLabel, type CountryId, type PlanYear, type WeekSlot } from "@/lib/ideas/calendar";
import type { WeekIdeas } from "@/lib/ideas/plan";

export type PdfPlan = {
  brand: string;
  about: string;
  country: CountryId;
  year: PlanYear;
  weeks: (WeekSlot & WeekIdeas)[];
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const TEXT_W = PAGE_W - MARGIN * 2;
const INK = rgb(0.11, 0.11, 0.11);
const MUTED = rgb(0.35, 0.35, 0.33);
const FAINT = rgb(0.45, 0.45, 0.42);

const SWAP: Record<string, string> = {
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u2022": "-",
  "\u2026": "...",
  "\u00A0": " ",
  "\u202F": " ",
};

function plain(text: string): string {
  let out = "";
  for (const char of text) {
    const swapped = SWAP[char] ?? char;
    for (const piece of swapped) {
      const code = piece.charCodeAt(0);
      if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) out += piece;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = plain(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function ideasPdfName(brand: string, year: number): string {
  const slug = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "ideas"}-ideas-${year}.pdf`;
}

export async function ideasPdf(plan: PdfPlan): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const fresh = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const need = (height: number) => {
    if (y - height < MARGIN + 20) fresh();
  };

  const write = (text: string, font: PDFFont, size: number, color: ReturnType<typeof rgb>, gap: number, indent = 0) => {
    for (const line of wrap(text, font, size, TEXT_W - indent)) {
      need(size + gap);
      page.drawText(line, { x: MARGIN + indent, y: y - size, size, font, color });
      y -= size + gap;
    }
  };

  write(plan.brand || "Idea plan", bold, 22, INK, 6);
  write(`${countryName(plan.country)}  ·  ${plan.year}`, regular, 11, MUTED, 8);
  if (plan.about) write(plan.about, regular, 10, MUTED, 6);
  y -= 8;
  need(1);
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.6,
    color: rgb(0.82, 0.8, 0.76),
  });
  y -= 16;

  for (const week of plan.weeks) {
    const block = 78;
    need(block);
    write(`Week ${week.week}  ·  ${weekLabel(week.start, week.end)}`, bold, 12, INK, 4);
    if (week.holidays.length) write(week.holidays.join(", "), regular, 9, MUTED, 5);
    write("Video", bold, 9, FAINT, 3);
    week.videos.forEach((idea, index) => write(`${index + 1}.  ${idea}`, regular, 10, INK, 3));
    y -= 4;
    write("Posts", bold, 9, FAINT, 3);
    week.posts.forEach((idea, index) => write(`${index + 1}.  ${idea}`, regular, 10, INK, 3));
    y -= 12;
  }

  const pages = doc.getPages();
  pages.forEach((item: PDFPage, index) => {
    const label = `${index + 1} / ${pages.length}`;
    item.drawText(plain(`${plan.brand}  ·  ${plan.year}`), {
      x: MARGIN,
      y: 28,
      size: 8,
      font: regular,
      color: FAINT,
    });
    item.drawText(label, {
      x: PAGE_W - MARGIN - regular.widthOfTextAtSize(label, 8),
      y: 28,
      size: 8,
      font: regular,
      color: FAINT,
    });
  });

  return doc.save();
}
