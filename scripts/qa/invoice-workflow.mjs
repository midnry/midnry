// Invoice as a client-work tool, in a real browser against the local dev
// server (sh scripts/qa/dev-up.sh). Signs in as the local QA account and
// seeds synthetic documents through the app's own server functions:
//  - an old single-invoice document, and old Quote and Proposal app documents,
//    which must load as the first invoice and be copied in (originals untouched);
//  - old links /apps/quote and /discover/proposal land on Invoice's views;
//  - the acceptance scenario: a freelancer creates a quote, converts it into
//    invoice A and prints it, creates invoice B, reloads, finds both with
//    search, and marks A paid, with nothing lost or overwritten;
//  - delete with undo, and phones at 390×844 and 360×740 with no overflow;
//  - no page errors.
// Usage: node scripts/qa/invoice-workflow.mjs [outdir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/invoice-workflow";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ACCOUNT = "qa-admin@example.test";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signIn(ctx) {
  for (const password of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ACCOUNT, password, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) return;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ACCOUNT, password } });
    if (r.ok()) return;
  }
  throw new Error("Could not sign in as the local QA account");
}

async function newCtx(viewport = { width: 1280, height: 900 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
  await signIn(ctx);
  return ctx;
}

async function seed(page, slug, doc) {
  const res = await page.evaluate(async ({ slug, payload }) => {
    const m = await import("/src/lib/cove.functions.ts");
    // Saves need the current revision (a revision-less save is refused once the row has one).
    const current = await m.loadDoc({ data: slug });
    return m.saveDoc({ data: { slug, payload, baseRevision: current.ok ? current.revision : 0 } });
  }, { slug, payload: JSON.stringify(doc) });
  if (!res.ok) throw new Error(`seed ${slug}: ${JSON.stringify(res)}`);
}
async function load(page, slug) {
  const res = await page.evaluate(async (slug) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: slug });
  }, slug);
  return res.ok && res.payload ? JSON.parse(res.payload) : null;
}
/** Wait until the saved invoice document satisfies `test`. */
async function waitDoc(page, test, what, timeout = 20000) {
  const end = Date.now() + timeout;
  let doc = null;
  while (Date.now() < end) {
    doc = await load(page, "invoice");
    if (doc && test(doc)) return doc;
    await page.waitForTimeout(500);
  }
  ok(false, `saved: ${what}`);
  return doc;
}
async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

const today = new Date().toISOString().slice(0, 10);
const OLD_INVOICE = {
  from: "Synthetic Studio",
  to: "Old Client Ltd\nold@example.test",
  number: "0007",
  issued: "2026-10-01",
  due: "",
  notes: "",
  currency: "USD",
  taxPercent: "7.5",
  lines: [
    { id: "l1", description: "Design", qty: "3", rate: "33.33" },
    { id: "l2", description: "Delivery", qty: "1.5", rate: "0.07" },
  ],
};
const OLD_QUOTE = { values: { client: "Kit Quote Client", lines: "Logo - 40000\nCards: 2 x 5000", until: "2026-12-31", total: "50000" } };
const OLD_PROPOSAL = { values: { client: "Kit Proposal Client", problem: "Needs a shop page", work: "Shop page - 90000", price: "90000", next: "Call Friday" } };

const ctx = await newCtx();
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });

// ── 1. Old data: single invoice + Quote and Proposal app documents ─────────
await seed(page, "invoice", OLD_INVOICE);
await seed(page, "quote", OLD_QUOTE);
await seed(page, "proposal", OLD_PROPOSAL);
await page.goto(`${BASE}/apps/invoice`, { waitUntil: "networkidle", timeout: 120000 });
const sheet = page.locator("article.invoice-sheet");
await sheet.getByText("$107.61").waitFor({ timeout: 30000 });
ok(await page.getByLabel("Invoice number").inputValue() === "0007", "the old single invoice opens as the first invoice, number kept");
ok(await page.getByRole("button", { name: "Print or save as PDF" }).isEnabled(), "its total shows and it can be printed");
await page.locator("[data-notice]").waitFor({ timeout: 20000 });
ok(/copied in here/.test(await page.locator("[data-notice]").innerText()), "a notice says the old quote and proposal were copied in");
let saved = await waitDoc(page, (d) => d.v === 2 && d.quotes?.length === 1 && d.proposals?.length === 1, "migrated document with the imported quote and proposal");
ok(saved?.invoices?.length === 1 && saved.invoices[0].number === "0007" && saved.invoices[0].lines.length === 2, "old invoice is the first archived invoice");
ok(saved?.legacy?.number === "0007" && saved.legacy.from === "Synthetic Studio", "a copy of the old document is kept under legacy");
ok(saved?.quotes?.[0]?.lines?.length === 2 && saved.quotes[0].notes.includes("Logo - 40000"), "old quote: lines structured, original text kept");
ok(saved?.proposals?.[0]?.next === "Call Friday", "old proposal copied");
ok(JSON.stringify(await load(page, "quote")) === JSON.stringify(OLD_QUOTE), "the old Quote document is untouched");
ok(JSON.stringify(await load(page, "proposal")) === JSON.stringify(OLD_PROPOSAL), "the old Proposal document is untouched");
await page.screenshot({ path: `${OUT}/01-migrated-invoice.png`, fullPage: true });

// Reloading does not import twice.
await page.reload({ waitUntil: "networkidle" });
await sheet.getByText("$107.61").waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
saved = await load(page, "invoice");
ok(saved.quotes.length === 1 && saved.proposals.length === 1, "reloading does not copy them in again");

// ── 2. Old links ───────────────────────────────────────────────────────────
await page.goto(`${BASE}/apps/quote`, { waitUntil: "networkidle", timeout: 120000 });
ok(/\/apps\/invoice\?view=quotes$/.test(page.url()), `/apps/quote redirects to Invoice's quotes (${page.url()})`);
await page.locator("[data-quote-row]").first().waitFor({ timeout: 20000 });
ok((await page.getByRole("tab", { name: /^Quotes/ }).getAttribute("aria-selected")) === "true", "the Quotes view is open");
ok((await page.locator("[data-quote-row]").count()) === 1, "the copied quote is listed");
await page.screenshot({ path: `${OUT}/02-alias-quotes.png`, fullPage: true });
await page.goto(`${BASE}/discover/proposal`, { waitUntil: "networkidle", timeout: 120000 });
ok(/\/discover\/invoice\?view=proposals$/.test(page.url()), `/discover/proposal redirects to Invoice's page (${page.url()})`);
ok(await page.getByRole("heading", { name: "Invoice", exact: true }).first().isVisible().catch(() => false) || (await page.getByText("Invoice").first().isVisible()), "the Invoice product page shows");
await page.goto(`${BASE}/apps/proposal`, { waitUntil: "networkidle", timeout: 120000 });
ok(/\/apps\/invoice\?view=proposals$/.test(page.url()), "/apps/proposal redirects to Invoice's proposals");
await page.locator("[data-proposal-row]").first().waitFor({ timeout: 20000 });
ok((await page.locator("[data-proposal-row]").count()) === 1, "the copied proposal is listed");

// ── 3. Acceptance: quote → invoice A (print) → invoice B → reload → search → A paid ──
await page.getByRole("tab", { name: /^Quotes/ }).click();
await page.getByRole("button", { name: "New quote" }).click();
await page.getByLabel("Quote number").waitFor();
const quoteNumber = await page.getByLabel("Quote number").inputValue();
ok(quoteNumber === "Q-0002", `new quote is numbered after the copied one (${quoteNumber})`);
await page.getByLabel("For", { exact: true }).fill("Freelance Client QA\nqa-client@example.test\n1 Test Street");
await page.getByLabel("Description 1").fill("Website build");
await page.getByLabel("Quantity 1").fill("2");
await page.getByLabel("Rate 1").fill("1500");
await page.getByLabel("Tax percent").fill("0");
await sheet.getByText("$3,000.00").first().waitFor();
ok(true, "quote totals with the shared maths ($3,000.00)");
await page.getByRole("button", { name: /^Save “Freelance Client QA” as a client/ }).click();
await waitDoc(page, (d) => d.clients.some((c) => c.name === "Freelance Client QA" && c.email === "qa-client@example.test"), "client saved from the quote");
await page.getByRole("button", { name: "Convert to invoice" }).click();
await page.getByLabel("Invoice number").waitFor();
const numberA = await page.getByLabel("Invoice number").inputValue();
ok(numberA === "0008", `invoice A continues the numbering (${numberA})`);
ok((await page.getByLabel("Description 1").inputValue()) === "Website build" && (await page.getByLabel("Quantity 1").inputValue()) === "2", "lines copied without retyping");
ok((await page.getByLabel("Bill to").inputValue()).startsWith("Freelance Client QA"), "client copied");
await sheet.getByText("$3,000.00").first().waitFor();
// Print: the button calls the browser print, and the print view shows only the page.
await page.evaluate(() => {
  window.__printed = 0;
  window.print = () => {
    window.__printed += 1;
  };
});
await page.getByRole("button", { name: "Print or save as PDF" }).click();
ok((await page.evaluate(() => window.__printed)) === 1, "Print or save as PDF opens the print window");
await page.emulateMedia({ media: "print" });
ok(await sheet.isVisible(), "print view: the invoice page is visible");
ok(((await sheet.boundingBox())?.width ?? 0) > 900, "print view: the page uses the full width");
ok(!(await sheet.innerText()).includes("Copied from your Quote app"), "a new quote does not inherit the note of the copied old quote");
ok(!(await page.locator("form[aria-label^='Invoice']").isVisible()), "print view: the form is hidden");
ok(!(await page.getByRole("tablist").isVisible()), "print view: the tabs are hidden");
ok(!(await page.locator("header").first().isVisible()), "print view: the site header is hidden");
const printText = await sheet.innerText();
ok(printText.includes(numberA) && printText.includes("Website build") && printText.includes("$3,000.00") && /Amounts in US dollar \(USD\)/.test(printText), "print view: number, line, total and currency are legible");
await page.screenshot({ path: `${OUT}/03-invoice-a-print.png`, fullPage: true });
await page.emulateMedia({ media: null });

saved = await waitDoc(page, (d) => d.invoices.some((i) => i.number === numberA), "invoice A");
const idA = saved.invoices.find((i) => i.number === numberA).id;
const quoteSaved = saved.quotes.find((q) => q.number === quoteNumber);
ok(quoteSaved?.invoiceId === idA && saved.invoices.find((i) => i.id === idA).quoteId === quoteSaved.id, "quote and invoice A are linked");

await page.getByRole("button", { name: "New invoice" }).click();
await page.waitForFunction((a) => document.querySelector("input[maxlength='24']")?.value !== a, numberA);
const numberB = await page.getByLabel("Invoice number").inputValue();
ok(numberB === "0009", `invoice B gets the next number (${numberB})`);
await page.getByLabel("Saved client").selectOption({ label: "Old Client Ltd" });
ok((await page.getByLabel("Bill to").inputValue()).startsWith("Old Client Ltd"), "a saved client fills Bill to");
await page.getByLabel("Description 1").fill("Consulting");
await page.getByLabel("Rate 1").fill("250");
await page.getByLabel("Tax percent").fill("0");
await page.getByLabel("Due").fill("2020-01-31");
saved = await waitDoc(page, (d) => d.invoices.some((i) => i.number === numberB && i.lines[0].rate === "250" && i.due === "2020-01-31"), "invoice B");
ok(saved.invoices.length === 3, "invoice B was added; the old invoice and A are still there");

await page.reload({ waitUntil: "networkidle" });
await page.getByLabel("Invoice number").waitFor({ timeout: 30000 });
ok((await page.getByLabel("Invoice number").inputValue()) === numberB, "after reload the last invoice reopens");
await page.getByRole("tab", { name: /^Invoices/ }).click();
await page.locator("[data-invoice-row]").first().waitFor();
ok((await page.locator("[data-invoice-row]").count()) === 3, "the archive lists all three invoices");
ok((await page.locator(`[data-invoice-row="${numberB}"] [data-state]`).getAttribute("data-state")) === "overdue", "B is overdue (due date passed)");
const search = page.getByLabel("Search invoices");
for (const [q, want] of [
  ["freelance", [numberA]],
  ["Old Client", ["0009", "0007"]],
  ["3,000", [numberA]],
  ["250", [numberB]],
  [numberB, [numberB]],
]) {
  await search.fill(q);
  await page.waitForTimeout(150);
  const got = await page.locator("[data-invoice-row]").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-invoice-row")));
  ok(JSON.stringify(got.sort()) === JSON.stringify([...want].sort()), `search “${q}” finds ${want.join(", ")} (got ${got.join(", ")})`);
}
await search.fill("");
await page.screenshot({ path: `${OUT}/04-archive.png`, fullPage: true });
await page.getByRole("button", { name: `Mark invoice ${numberA} paid` }).click();
await page.locator(`[data-invoice-row="${numberA}"] [data-state="paid"]`).waitFor();
saved = await waitDoc(page, (d) => d.invoices.find((i) => i.id === idA)?.status === "paid", "A marked paid");
const A = saved.invoices.find((i) => i.id === idA);
ok(A.paidOn === today || A.paidOn?.length === 10, `A is paid with a date (${A.paidOn})`);
ok(A.lines[0].description === "Website build" && saved.invoices.length === 3 && saved.quotes.length === 2 && saved.proposals.length === 1, "nothing lost: 3 invoices, 2 quotes, 1 proposal");
ok(saved.invoices.find((i) => i.number === "0007").lines.length === 2 && saved.legacy?.number === "0007", "the migrated invoice and its legacy copy are intact");
await page.getByRole("button", { name: `Open invoice ${numberA}`, exact: false }).click();
await page.locator("[data-paid-stamp]").waitFor();
ok(true, "the paid invoice shows a Paid stamp");
await page.screenshot({ path: `${OUT}/05-invoice-a-paid.png`, fullPage: true });

// ── 4. Delete with undo, duplicate ────────────────────────────────────────
await page.getByRole("tab", { name: /^Invoices/ }).click();
await page.getByRole("button", { name: `Delete invoice ${numberB}` }).click();
await page.getByRole("button", { name: `Yes, delete invoice ${numberB}` }).click();
await waitDoc(page, (d) => d.invoices.length === 2, "B deleted");
await page.locator("[data-undo]").getByRole("button", { name: "Undo" }).click();
saved = await waitDoc(page, (d) => d.invoices.length === 3 && d.invoices.some((i) => i.number === numberB && i.lines[0].description === "Consulting"), "B restored by undo");
ok(saved.invoices.length === 3, "undo brings the deleted invoice back intact");
await page.getByRole("button", { name: `Duplicate invoice ${numberA}` }).click();
await page.getByLabel("Invoice number").waitFor();
ok((await page.getByLabel("Invoice number").inputValue()) === "0010", "duplicate gets a new number");
saved = await waitDoc(page, (d) => d.invoices.length === 4, "duplicate saved");
ok(saved.invoices.find((i) => i.id === idA).status === "paid", "the original stays paid");

// ── 5. Phones ─────────────────────────────────────────────────────────────
for (const [w, h] of [
  [390, 844],
  [360, 740],
]) {
  const mctx = await newCtx({ width: w, height: h }, true);
  const mp = await mctx.newPage();
  await mp.goto(`${BASE}/apps/invoice?view=invoices`, { waitUntil: "networkidle", timeout: 120000 });
  await mp.locator("[data-invoice-row]").first().waitFor({ timeout: 30000 });
  ok(await noOverflow(mp), `${w}×${h}: archive has no horizontal overflow`);
  await mp.screenshot({ path: `${OUT}/06-phone-${w}-archive.png`, fullPage: true });
  await mp.getByRole("button", { name: `Open invoice ${numberA}`, exact: false }).click();
  await mp.locator("article.invoice-sheet").waitFor();
  ok(await noOverflow(mp), `${w}×${h}: invoice editor and page have no horizontal overflow`);
  await mp.screenshot({ path: `${OUT}/07-phone-${w}-invoice.png`, fullPage: true });
  await mp.emulateMedia({ media: "print" });
  ok(await noOverflow(mp), `${w}×${h}: print view has no horizontal overflow`);
  await mp.screenshot({ path: `${OUT}/08-phone-${w}-print.png`, fullPage: true });
  await mp.emulateMedia({ media: null });
  await mp.getByRole("tab", { name: /^Quotes/ }).click();
  await mp.locator("[data-quote-row]").first().waitFor();
  ok(await noOverflow(mp), `${w}×${h}: quotes have no horizontal overflow`);
  await mp.getByRole("tab", { name: /^Clients/ }).click();
  await mp.locator("[data-client-row]").first().waitFor();
  ok(await noOverflow(mp), `${w}×${h}: clients have no horizontal overflow`);
  await mctx.close();
}

// ── 6. A brand-new person gets a blank invoice straight away ──────────────
await seed(page, "invoice", {});
await page.goto(`${BASE}/apps/invoice`, { waitUntil: "networkidle", timeout: 120000 });
await page.getByLabel("Invoice number").waitFor({ timeout: 30000 });
ok((await page.getByLabel("Invoice number").inputValue()) === "0001", "first visit: a blank invoice 0001 is ready to fill");
await page.screenshot({ path: `${OUT}/09-first-invoice.png`, fullPage: true });
// Leave the QA account as the scenario finished: restore what was there.
await seed(page, "invoice", saved);

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
