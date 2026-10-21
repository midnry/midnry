/**
 * Nunito font pieces for the resume PDF, fetched only when someone downloads
 * a PDF (this module is imported lazily). WOFF, not WOFF2: the PDF font
 * subsetter cannot rebuild WOFF2 glyph tables. About 75 KB per weight.
 */
import latin400 from "@fontsource/nunito/files/nunito-latin-400-normal.woff?url";
import latinExt400 from "@fontsource/nunito/files/nunito-latin-ext-400-normal.woff?url";
import vietnamese400 from "@fontsource/nunito/files/nunito-vietnamese-400-normal.woff?url";
import cyrillic400 from "@fontsource/nunito/files/nunito-cyrillic-400-normal.woff?url";
import cyrillicExt400 from "@fontsource/nunito/files/nunito-cyrillic-ext-400-normal.woff?url";
import latin700 from "@fontsource/nunito/files/nunito-latin-700-normal.woff?url";
import latinExt700 from "@fontsource/nunito/files/nunito-latin-ext-700-normal.woff?url";
import vietnamese700 from "@fontsource/nunito/files/nunito-vietnamese-700-normal.woff?url";
import cyrillic700 from "@fontsource/nunito/files/nunito-cyrillic-700-normal.woff?url";
import cyrillicExt700 from "@fontsource/nunito/files/nunito-cyrillic-ext-700-normal.woff?url";
import type { FontBytes } from "@/lib/apply/resume-pdf";

const REGULAR = [latin400, latinExt400, vietnamese400, cyrillic400, cyrillicExt400];
const BOLD = [latin700, latinExt700, vietnamese700, cyrillic700, cyrillicExt700];

async function fetchAll(urls: string[]): Promise<Uint8Array[]> {
  return Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Could not load the PDF font. Check your connection and try again.");
      return new Uint8Array(await res.arrayBuffer());
    }),
  );
}

let cached: Promise<FontBytes> | null = null;

export function loadResumeFonts(): Promise<FontBytes> {
  cached ??= Promise.all([fetchAll(REGULAR), fetchAll(BOLD)])
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((error: unknown) => {
      cached = null;
      throw error;
    });
  return cached;
}
