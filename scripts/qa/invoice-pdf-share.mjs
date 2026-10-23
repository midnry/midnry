// Invoice "Share PDF" in a real browser against a dev server (QA_BASE, e.g.
// http://127.0.0.1:8093). Headless Chromium has no share sheet, so the share
// sheet is SIMULATED: navigator.share / navigator.canShare are replaced with
// page.addInitScript stubs for four cases:
//   (a) SIMULATED share success     → status stays Draft until "Mark as sent";
//   (b) SIMULATED cancel (AbortError) → nothing changes, nothing downloaded;
//   (c) SIMULATED NotAllowedError    → falls back: real download + real copy;
//   (d) SIMULATED unsupported        → no share/canShare: real download + copy.
// What is real here: the PDF built in the page (the shared file's bytes and
// the downloaded file are both read back with unpdf), the clipboard text
// (read back from Chromium's clipboard), the saved status (read from the
// server), the button states and the layout at 1280×900 and 390×844.
// Signs up a fresh synthetic @example.test account. Synthetic data only.
// Usage: QA_BASE=http://127.0.0.1:8093 node scripts/qa/invoice-pdf-share.mjs [outdir]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { extractText, getDocumentProxy } from "unpdf";
import { BASE, TARGET } from "./target.mjs";

if (TARGET !== "dev server") throw new Error("This check seeds documents through /src imports; run it against a dev server.");
const OUT = process.argv[2] || "screenshots/qa/invoice-pdf-share";
mkdirSync(OUT, { recursive: true });
let passes = 0;
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (cond) passes++;
  else fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ACCOUNT = { email: `qa-pdf-share-${Date.now()}@example.test`, password: "pdf-share-qa-pass-1" };

// A UTF-8 locale, as on real devices: under the sandbox's POSIX locale Chromium
// names any download with a non-ASCII name (the "–" here) just "download".
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", env: { ...process.env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8" } });

{
  const ctx = await browser.newContext();
  const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { ...ACCOUNT, name: "QA PDF Share", ageConfirmed: true } });
  if (!up.ok()) throw new Error(`sign-up failed: ${up.status()} ${await up.text()}`);
  await ctx.close();
}

/** Replaces navigator.share/canShare (SIMULATED share sheet) and records what the page shares. */
function stubShare(mode) {
  window.__shareCalls = [];
  const define = (name, value) => Object.defineProperty(Navigator.prototype, name, { value, configurable: true, writable: true });
  if (mode === "unsupported") {
    define("share", undefined);
    define("canShare", undefined);
    return;
  }
  define("canShare", (data) => Boolean(data && Array.isArray(data.files) && data.files.every((f) => f.type === "application/pdf")));
  define("share", async (data) => {
    const files = [];
    for (const file of data.files || []) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      files.push({ name: file.name, type: file.type, size: file.size, base64: btoa(binary) });
    }
    window.__shareCalls.push({ title: data.title, text: data.text, files });
    if (mode === "abort") throw new DOMException("Share canceled", "AbortError");
    if (mode === "notallowed") throw new DOMException("The request is not allowed by the user agent", "NotAllowedError");
  });
}

async function newCtx(mode, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await ctx.addInitScript(stubShare, mode);
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${mode} ${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${mode} ${page.url()}: ${m.text()}`);
    });
  });
  const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: ACCOUNT });
  if (!r.ok()) throw new Error(`sign-in failed: ${r.status()}`);
  return ctx;
}

async function seed(page, doc) {
  const res = await page.evaluate(async (payload) => {
    const m = await import("/src/lib/cove.functions.ts");
    const current = await m.loadDoc({ data: "invoice" });
    return m.saveDoc({ data: { slug: "invoice", payload, baseRevision: current.ok ? current.revision : 0 } });
  }, JSON.stringify(doc));
  if (!res.ok) throw new Error(`seed: ${JSON.stringify(res)}`);
}
async function loadInvoice(page) {
  const res = await page.evaluate(async () => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: "invoice" });
  });
  return res.ok && res.payload ? JSON.parse(res.payload).invoices?.[0] : null;
}
async function waitInvoice(page, test, what, timeout = 20000) {
  const end = Date.now() + timeout;
  let inv = null;
  while (Date.now() < end) {
    inv = await loadInvoice(page);
    if (inv && test(inv)) return inv;
    await page.waitForTimeout(400);
  }
  ok(false, `saved: ${what} (got ${JSON.stringify(inv && { status: inv.status, sentOn: inv.sentOn })})`);
  return inv;
}
async function pdfText(bytes) {
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: true });
  return text.normalize("NFC").replace(/\s+/g, " ");
}

const PAYMENT = "Bank: Example Bank\nAccount name: Synthetic Studio Ltd\nAccount number: 0123456789";
const NOW = new Date().toISOString();
const DOC = {
  v: 2,
  invoices: [
    {
      id: "qa-inv-1",
      number: "INV-0042",
      from: "Synthetic Studio\nLagos",
      to: "Okafor Foods\nbilling@okafor.example\n12 Marina, Lagos",
      clientId: undefined,
      issued: "2026-10-20",
      due: "2026-11-03",
      currency: "NGN",
      notes: "Thank you for your business.",
      taxPercent: "7.5",
      lines: [
        { id: "a", description: "Logo design", qty: "1", rate: "150000" },
        { id: "b", description: "Business cards (box)", qty: "3", rate: "12500.50" },
      ],
      status: "draft",
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  quotes: [],
  proposals: [],
  clients: [],
  from: "Synthetic Studio\nLagos",
  payment: PAYMENT,
  currency: "NGN",
  openId: "qa-inv-1",
  imported: { quote: true, proposal: true },
};
const NAME = "Invoice INV-0042 – Okafor Foods.pdf";
const EXPECT = ["INV-0042", "Okafor Foods", "Logo design", "Business cards (box)", "₦150,000.00", "₦37,501.50", "₦187,501.50", "Tax 7.5%", "Total ₦201,564.11", "How to pay", "Account number: 0123456789", "Thank you for your business."];
const checkPdf = async (bytes, label) => {
  const text = await pdfText(bytes);
  const missing = EXPECT.filter((part) => !text.includes(part));
  ok(missing.length === 0, `${label}: PDF text has number, client, lines, ₦ total and How to pay${missing.length ? ` (missing ${missing.join(", ")})` : ""}`);
  ok(Buffer.from(bytes).subarray(0, 5).toString() === "%PDF-", `${label}: file starts with %PDF-`);
};

const VIEWS = [
  { tag: "desktop", viewport: { width: 1280, height: 900 }, mobile: false },
  { tag: "phone", viewport: { width: 390, height: 844 }, mobile: true },
];
const MODES = [
  ["success", "(a) SIMULATED share success"],
  ["abort", "(b) SIMULATED cancel (AbortError)"],
  ["notallowed", "(c) SIMULATED NotAllowedError"],
  ["unsupported", "(d) SIMULATED unsupported browser"],
];

for (const view of VIEWS) {
  for (const [mode, title] of MODES) {
    const label = `${view.tag} ${title}`;
    console.log(`\n── ${label} ──`);
    const ctx = await newCtx(mode, view.viewport, view.mobile);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });
    await seed(page, DOC);
    await page.goto(`${BASE}/apps/invoice`, { waitUntil: "networkidle", timeout: 120000 });
    const shareBtn = page.getByRole("button", { name: "Share PDF" });
    await shareBtn.waitFor({ timeout: 30000 });
    await page.locator("article.invoice-sheet").getByText("₦201,564.11").waitFor({ timeout: 30000 });
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const statusSelect = page.getByRole("combobox", { name: /^Status/ });
    ok((await statusSelect.inputValue()) === "draft", `${label}: starts as Draft`);
    ok(await shareBtn.isEnabled(), `${label}: Share PDF is enabled for a valid invoice`);

    if (mode === "success" && view.tag === "desktop") {
      // Same rule as Print: an invoice with errors cannot be shared, and says why.
      const rate = page.getByLabel("Rate 1");
      await rate.fill("abc");
      await page.waitForTimeout(300);
      ok(await shareBtn.isDisabled(), `${label}: Share PDF is disabled when a field has an error`);
      const described = await shareBtn.getAttribute("aria-describedby");
      const reason = described ? await page.locator(`#${described}`).innerText() : "";
      ok(/Fix the highlighted field/.test(reason), `${label}: the disabled button points to the reason ("${reason}")`);
      await page.screenshot({ path: `${OUT}/${view.tag}-0-blocked.png`, fullPage: false });
      await rate.fill("150000");
      await page.locator("article.invoice-sheet").getByText("₦201,564.11").waitFor({ timeout: 10000 });
      ok(await shareBtn.isEnabled(), `${label}: enabled again once fixed`);
      await waitInvoice(page, (inv) => inv.lines[0].rate === "150000", "rate restored");
    }

    await page.evaluate(() => navigator.clipboard.writeText("(clipboard before Share PDF)"));
    let download = null;
    const downloadPromise = page.waitForEvent("download", { timeout: 20000 }).then(
      (d) => (download = d),
      () => null,
    );
    await shareBtn.click();
    const note = page.locator("[data-share-note]");
    await note.waitFor({ state: "attached", timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("[data-share-note]")?.getAttribute("data-share-note"), null, { timeout: 30000 });
    if (mode === "success" || mode === "abort") await page.waitForTimeout(1500);
    else await downloadPromise;
    const noteText = (await note.innerText()).replace(/\s+/g, " ").trim();
    const calls = await page.evaluate(() => window.__shareCalls);
    console.log(`  note: "${noteText}"`);
    await note.scrollIntoViewIfNeeded();
    ok(!/deliver/i.test(noteText), `${label}: wording never says delivered`);

    if (mode === "success") {
      ok(calls.length === 1, `${label}: navigator.share called once`);
      const call = calls[0];
      ok(call?.files?.length === 1 && call.files[0].name === NAME && call.files[0].type === "application/pdf", `${label}: one file "${call?.files?.[0]?.name}"`);
      ok(call?.title === "Invoice INV-0042", `${label}: title "${call?.title}"`);
      ok(/Total: ₦201,564\.11/.test(call?.text || "") && /How to pay/.test(call?.text || ""), `${label}: text is the WhatsApp summary`);
      if (call?.files?.[0]) await checkPdf(Buffer.from(call.files[0].base64, "base64"), `${label} shared file`);
      ok(download === null, `${label}: nothing downloaded`);
      ok(/Shared\./.test(noteText) && /Did you send it\?/.test(noteText), `${label}: says "Shared. Did you send it?"`);
      ok((await page.getByRole("button", { name: "Mark as sent" }).count()) === 1, `${label}: "Mark as sent" offered`);
      ok((await statusSelect.inputValue()) === "draft", `${label}: status still Draft on screen after sharing`);
      const saved = await loadInvoice(page);
      ok(saved?.status === "draft" && !saved?.sentOn, `${label}: saved status still draft, no sentOn (${saved?.status})`);
      await page.screenshot({ path: `${OUT}/${view.tag}-a-shared-offer.png`, fullPage: false });
      await page.locator("[data-share-note]").screenshot({ path: `${OUT}/${view.tag}-a-shared-offer-note.png` });
      await page.getByRole("button", { name: "Mark as sent" }).click();
      await waitInvoice(page, (inv) => inv.status === "sent" && inv.sentOn === today, `status sent, sentOn ${today}`);
      ok((await statusSelect.inputValue()) === "sent", `${label}: "Mark as sent" sets Sent`);
      const marked = (await note.innerText()).replace(/\s+/g, " ");
      ok(marked.includes(`Marked as sent ${today}.`), `${label}: says "Marked as sent ${today}."`);
      await page.screenshot({ path: `${OUT}/${view.tag}-a-marked-sent.png`, fullPage: false });
      await page.getByRole("button", { name: "Undo" }).click();
      await waitInvoice(page, (inv) => inv.status === "draft" && !inv.sentOn, "Undo puts back draft with no sentOn");
      ok((await statusSelect.inputValue()) === "draft", `${label}: Undo puts it back to Draft`);
    } else if (mode === "abort") {
      ok(calls.length === 1, `${label}: navigator.share called once`);
      ok(download === null, `${label}: nothing downloaded`);
      ok(noteText.startsWith("Not shared."), `${label}: only a quiet "Not shared."`);
      ok((await page.getByRole("button", { name: "Mark as sent" }).count()) === 0, `${label}: no "Mark as sent" offered`);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
      ok(clip === "(clipboard before Share PDF)", `${label}: nothing copied`);
      const saved = await loadInvoice(page);
      ok(saved?.status === "draft" && !saved?.sentOn, `${label}: saved status unchanged`);
      await page.screenshot({ path: `${OUT}/${view.tag}-b-cancelled.png`, fullPage: false });
    } else {
      ok(calls.length === (mode === "notallowed" ? 1 : 0), `${label}: navigator.share called ${calls.length} time(s)`);
      ok(download != null, `${label}: a file was downloaded`);
      if (download) {
        ok(download.suggestedFilename() === NAME, `${label}: file name "${download.suggestedFilename()}"`);
        const path = await download.path();
        await checkPdf(readFileSync(path), `${label} downloaded file`);
      }
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      ok(/^Invoice INV-0042 from Synthetic Studio/.test(clip) && /Total: ₦201,564\.11 \(due 2026-11-03\)/.test(clip) && clip.includes("Account number: 0123456789"), `${label}: WhatsApp message copied`);
      ok(noteText.includes("PDF downloaded and message copied. Attach the PDF in WhatsApp or email."), `${label}: says the PDF was downloaded and message copied`);
      if (mode === "notallowed") ok(noteText.startsWith("This browser did not allow sharing."), `${label}: says why it fell back`);
      ok((await statusSelect.inputValue()) === "draft", `${label}: status still Draft`);
      const saved = await loadInvoice(page);
      ok(saved?.status === "draft" && !saved?.sentOn, `${label}: saved status unchanged`);
      ok((await page.getByRole("button", { name: "Mark as sent" }).count()) === 1, `${label}: "Mark as sent" is offered, not applied`);
      await page.screenshot({ path: `${OUT}/${view.tag}-${mode === "notallowed" ? "c-notallowed" : "d-unsupported"}.png`, fullPage: false });
    }
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label}: no horizontal overflow`);
    await ctx.close();
  }
}

await browser.close();
console.log(`\nAccount used: ${ACCOUNT.email} (synthetic, local dev database)`);
if (errors.length) console.log("Page errors:\n" + errors.join("\n"));
ok(errors.length === 0, "no page errors");
console.log(`\n${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
