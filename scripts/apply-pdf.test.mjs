// Apply's resume PDF keeps accented and non-Latin letters: the text is drawn
// with embedded Nunito pieces (src/lib/apply/resume-pdf.ts) and read back
// with unpdf. Synthetic names only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { extractText, getDocumentProxy } from "unpdf";

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { buildResumePdf } = await jiti.import("../src/lib/apply/resume-pdf.ts");

// The same pieces src/lib/apply/resume-fonts.ts loads in the browser.
const fontsSource = readFileSync(new URL("../src/lib/apply/resume-fonts.ts", import.meta.url), "utf8");
const files = [...fontsSource.matchAll(/from "@fontsource\/nunito\/files\/([\w-]+\.woff)\?url"/g)].map((m) => m[1]);
const load = (weight) =>
  files.filter((file) => file.includes(`-${weight}-`)).map((file) => new Uint8Array(readFileSync(new URL(`../node_modules/@fontsource/nunito/files/${file}`, import.meta.url))));
const fonts = { regular: load(400), bold: load(700) };

async function textOf(bytes) {
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: true });
  return text.normalize("NFC");
}

const NAMES = ["Adébáyọ̀ Ọlá", "José Müller", "Łukasz Żółć"];

test("the browser loads five pieces per weight, each a WOFF in the package", () => {
  assert.equal(fonts.regular.length, 5);
  assert.equal(fonts.bold.length, 5);
});

test("accented and non-Latin names survive in the PDF text", async () => {
  const resume = `${NAMES.join("\n")}\nИван Петров, Lagos\n\nSummary\nBuilt things.`;
  const { bytes, missing } = await buildResumePdf(`Designer for ${NAMES[0]}`, resume, fonts);
  assert.deepEqual(missing, []);
  const text = await textOf(bytes);
  for (const name of NAMES) assert.ok(text.includes(name.normalize("NFC")), `${name} in ${JSON.stringify(text)}`);
  assert.ok(text.includes("Иван Петров"));
  assert.ok(text.includes(`Designer for ${NAMES[0]}`.normalize("NFC")), "the bold title too");
});

test("long text wraps across pages without losing words", async () => {
  const line = `${NAMES.join(" ")} `.repeat(400);
  const { bytes } = await buildResumePdf("Role", line, fonts);
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  assert.ok(pdf.numPages >= 2, `${pdf.numPages} pages`);
  const text = (await textOf(bytes)).replace(/\s+/g, " ");
  assert.equal(text.split("Łukasz Żółć").length - 1, 400);
});

test("characters no piece covers are reported, not silently dropped", async () => {
  const { missing } = await buildResumePdf("Role", "Name 中文", fonts);
  assert.deepEqual(missing.sort(), ["中", "文"].sort());
});
