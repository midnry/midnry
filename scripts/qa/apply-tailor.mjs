// Apply against a pasted job advert, in a real browser against the local dev
// server (sh scripts/qa/dev-up.sh). Signs in as the local QA admin, which
// opens Pass tools (see scripts/qa/apps-phase1.mjs). Synthetic data only.
//  1. An old saved document (before adverts) still shows and downloads as saved,
//  2. paste an advert, prepare, see "Covered" and "Not found",
//  3. revert one change, edit the tailored text, reload: all kept,
//  4. the PDF (read back with unpdf) and the text file have the edited
//     version, with the accented name,
//  5. phone 390×844: tabs between original and tailored, no sideways scroll,
//  6. no page errors.
// Usage: node scripts/qa/apply-tailor.mjs [outdir]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { extractText, getDocumentProxy } from "unpdf";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/apply";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ADMIN = "qa-admin@example.test";

const ADVERT = `Frontend Engineer

Requirements
- 5+ years of experience building web applications
- Strong TypeScript and React skills
- Experience with design systems and accessibility
- Unit tests with Jest
- Experience with GraphQL APIs
- Bachelor's degree in Computer Science or a related field

Nice to have
- Kubernetes
- Storybook

You will own the patient booking flow end to end and partner with designers on the patient booking flow every week.`;

const NAME = "Adébáyọ̀ José Müller";
const RESUME = `${NAME}
ada@example.test | +44 7700 900123

Summary
Frontend developer who ships accessible web apps.

Experience
Lead Developer, Shopco (Mar 2019 - Present)
- Ran weekly team meetings and hiring loops
- Organised the office move
- Built a React and TypeScript design system used by 6 teams
- Added accessibility audits to every release

Developer, Webby (2016 - 2019)
- Wrote marketing pages in jQuery
- Introduced Jest unit tests across the codebase

Skills
Skills: jQuery, Photoshop, React, TypeScript, Jest

Education
BSc Computer Science, University of Lagos`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signIn(ctx) {
  for (const password of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) return;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password } });
    if (r.ok()) return;
  }
  throw new Error("Could not sign in as the local QA admin");
}

async function newCtx(viewport = { width: 1280, height: 900 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
  await signIn(ctx);
  return ctx;
}

async function seed(page, doc) {
  const res = await page.evaluate(async (payload) => {
    const m = await import("/src/lib/cove.functions.ts");
    // Saves need the current revision (a revision-less save is refused once the row has one).
    const current = await m.loadDoc({ data: "apply" });
    return m.saveDoc({ data: { slug: "apply", payload, baseRevision: current.ok ? current.revision : 0 } });
  }, JSON.stringify(doc));
  if (!res.ok) throw new Error(`seed: ${JSON.stringify(res)}`);
}
async function load(page) {
  const res = await page.evaluate(async () => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: "apply" });
  });
  return res.ok && res.payload ? JSON.parse(res.payload) : null;
}
async function open(page) {
  await page.goto(`${BASE}/apps/apply`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: "Prepare applications" }).waitFor({ timeout: 60000 });
}
/** Visible within a few seconds (the page may still be rendering). */
async function seen(locator) {
  try {
    await locator.waitFor({ state: "visible", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}
async function saved(page) {
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
}
async function pdfText(download) {
  const bytes = new Uint8Array(readFileSync(await download.path()));
  const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
  return text.normalize("NFC");
}

const ctx = await newCtx();
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });

// ── 1. An old document ──────────────────────────────────────────────────────
const OLD = { rolesText: "Designer", resume: RESUME, packs: [{ role: "Designer", note: "Synthetic old note.", resume: `Designer | Old\n${RESUME}`, submitted: true }] };
{
  await seed(page, OLD);
  await open(page);
  const card = page.locator("article", { hasText: "Synthetic old note." });
  await card.waitFor({ timeout: 30000 });
  ok(await card.getByText("Prepared before job adverts.").isVisible(), "an old pack shows as saved, with a hint to prepare again");
  ok(await card.getByRole("checkbox", { name: "I submitted this" }).isChecked(), "its “submitted” tick is kept");
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), card.getByRole("button", { name: "Download text" }).click()]);
  ok(readFileSync(await download.path(), "utf8") === OLD.packs[0].resume, "its text download is the saved text, unchanged");
  ok(JSON.stringify(await load(page)) === JSON.stringify(OLD), "opening Apply does not rewrite the old document");
  await page.screenshot({ path: `${OUT}/old-document.png`, fullPage: true });
}

// ── 2. Paste an advert ──────────────────────────────────────────────────────
let card;
{
  await page.getByRole("textbox", { name: "Roles" }).fill("Frontend Engineer");
  await page.getByRole("button", { name: /Frontend Engineer.*Add advert/ }).click();
  await page.getByRole("textbox", { name: "Job advert for Frontend Engineer" }).fill(ADVERT);
  await page.getByRole("textbox", { name: "Resume text" }).fill(RESUME);
  await page.getByRole("button", { name: "Prepare applications" }).click();
  card = page.locator("article", { has: page.getByRole("heading", { name: "Frontend Engineer" }) });
  await card.getByText("Matched against the job advert").waitFor({ timeout: 30000 });
  const covered = card.getByRole("region", { name: "Covered in your resume" });
  const missing = card.getByRole("region", { name: "Not found in your resume" });
  for (const term of ["React", "TypeScript", "Jest", "accessibility", "Bachelor’s degree in Computer Science", "5+ years of experience building web applications"]) {
    ok(await seen(covered.getByText(term, { exact: false }).first()), `covered: ${term}`);
  }
  for (const term of ["GraphQL", "Kubernetes", "Storybook", "patient booking flow"]) ok(await seen(missing.getByText(term, { exact: false }).first()), `not found: ${term}`);
  ok(await seen(missing.getByText("nice to have").first()), "nice-to-have gaps are labelled");
  const tailored = card.locator('[data-pane="tailored"]');
  ok(await seen(tailored.getByText("Frontend Engineer | ", { exact: false })), "the tailored version has the headline");
  ok(!(await tailored.textContent()).includes("GraphQL"), "a missing skill is not added");
  await saved(page);
  await page.screenshot({ path: `${OUT}/advert-matched.png`, fullPage: true });
}

// ── 3. Revert one change, edit, reload ──────────────────────────────────────
const EXTRA = "Available from January. Referee: Zoë Ångström.";
{
  const revert = card.getByRole("button", { name: /^Revert: Moved up 2 places in Experience \(accessibility\)/ });
  await revert.click();
  await card.getByRole("button", { name: /^Restore: Moved up 2 places in Experience \(accessibility\)/ }).waitFor();
  const lines = (await card.locator('[data-pane="tailored"]').innerText()).split("\n").map((l) => l.trim());
  const at = (text) => lines.findIndex((l) => l.startsWith(text));
  ok(at("- Built a React") < at("- Ran weekly") && at("- Organised the office move") < at("- Added accessibility audits"), "the reverted bullet is back in its own place; the other move stays");
  await saved(page);
  await page.screenshot({ path: `${OUT}/reverted.png`, fullPage: true });

  await card.getByRole("button", { name: "Edit text" }).click();
  const box = card.getByRole("textbox", { name: "Tailored resume for Frontend Engineer" });
  const current = await box.inputValue();
  await box.fill(`${current}\n\n${EXTRA}`);
  await card.getByRole("button", { name: "Done editing" }).click();
  ok(await card.getByText("You edited the text by hand").isVisible(), "edited: says changes pause until edits are discarded");
  ok(await card.getByRole("button", { name: /^Revert: Added a headline/ }).isDisabled(), "accept/revert is paused while edited");
  await saved(page);
  await page.reload({ waitUntil: "networkidle" });
  card = page.locator("article", { has: page.getByRole("heading", { name: "Frontend Engineer" }) });
  await card.getByText(EXTRA).waitFor({ timeout: 30000 });
  const doc = await load(page);
  const pack = doc.packs.find((p) => p.role === "Frontend Engineer");
  ok(pack?.v === 2 && pack.advert === ADVERT.trim() && pack.edited === true, "the advert and the edit are saved with the role");
  ok(pack?.reverted?.length === 1 && pack.reverted[0].startsWith("move:"), `the revert is saved (${pack?.reverted})`);
  ok(pack?.resume.endsWith(EXTRA), "the saved export text is the edited text");
  ok(await page.getByRole("button", { name: "Frontend Engineer Advert added" }).isVisible(), "the form shows the saved advert");
  await page.screenshot({ path: `${OUT}/edited.png`, fullPage: true });

  // ── 4. Exports ──
  const [pdf] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), card.getByRole("button", { name: "Download PDF" }).click()]);
  const text = await pdfText(pdf);
  ok(text.includes(NAME.normalize("NFC")), `the PDF keeps “${NAME}”`);
  ok(text.includes("Zoë Ångström"), "the PDF has the hand edit, accents included");
  ok(text.includes("Frontend Engineer | "), "the PDF has the headline");
  const flat = text.replace(/\s+/g, " ");
  ok(flat.indexOf("Organised the office move") < flat.indexOf("Added accessibility audits") && flat.indexOf("Built a React") < flat.indexOf("Ran weekly"), "the PDF has the reverted order");
  ok(!flat.includes("GraphQL") && !flat.includes("Kubernetes"), "the PDF adds no missing skill");
  const [txt] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), card.getByRole("button", { name: "Download text" }).click()]);
  ok(readFileSync(await txt.path(), "utf8") === pack.resume, "the text download is the edited version");

  await card.getByRole("button", { name: "Discard edits" }).click();
  await card.getByText(EXTRA).waitFor({ state: "detached" });
  ok(await card.getByRole("button", { name: /^Revert: Added a headline/ }).isEnabled(), "discarding edits brings back accept/revert");
  ok(await card.getByRole("button", { name: /^Restore: Moved up 2 places/ }).isVisible(), "and keeps the revert");
  await saved(page);
}

// ── 5. Phone ────────────────────────────────────────────────────────────────
{
  const phone = await newCtx({ width: 390, height: 844 }, true);
  const p = await phone.newPage();
  await open(p);
  const c = p.locator("article", { has: p.getByRole("heading", { name: "Frontend Engineer" }) });
  await c.getByText("Covered in your resume").waitFor({ timeout: 30000 });
  const overflow = async () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok((await overflow()) <= 0, `phone: no sideways scroll (${await overflow()}px)`);
  const original = c.locator('[data-pane="original"]');
  const tailored = c.locator('[data-pane="tailored"]');
  ok((await tailored.isVisible()) && !(await original.isVisible()), "phone: one version at a time, tailored first");
  await c.getByRole("tab", { name: "Original" }).click();
  ok((await original.isVisible()) && !(await tailored.isVisible()), "phone: the Original tab shows the original");
  await c.scrollIntoViewIfNeeded();
  await original.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/phone-original.png` });
  await c.getByRole("tab", { name: "Tailored" }).click();
  await c.getByRole("button", { name: "Edit text" }).click();
  ok((await overflow()) <= 0, "phone: editing does not overflow");
  await tailored.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/phone-edit.png` });
  await c.getByRole("region", { name: "Not found in your resume" }).scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/phone-coverage.png` });
  const small = await p.evaluate(() =>
    [...document.querySelectorAll("article button, article a, article [role=tab]")]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .filter((el) => el.getBoundingClientRect().height < 40)
      .map((el) => el.textContent?.trim()),
  );
  ok(small.length === 0, `phone: buttons are at least 40px tall (${small.join(", ")})`);
  await phone.close();
}

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
