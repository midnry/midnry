// Release checks for the 2026-10-23 batch, through the app's own screens only, so
// it runs against a production build (QA_TARGET=build) as well as the dev server.
// Synthetic accounts and data only. Writes one JSON line per check (commit,
// target, viewport, pass/fail, detail) to <outdir>/results.jsonl.
// Covers: Invoice (how to pay, PDF text, WhatsApp copy, number clash, declined
// quote, phone total), Ledger (₦0, Money in, dated Add, phone summary),
// Writing studio Contract (saved and reopened, 7 parts), Apply (PDF and text
// exports with the headline above Experience), Compressor (practice clip to a
// real MP4 file), checkout against the local Paystack stand-in (not Paystack),
// and the AI and email fallbacks when no key is configured.
// Usage: node scripts/qa/release-check.mjs [outdir] [mobile]
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import { extractText, getDocumentProxy } from "unpdf";
import { BASE, TARGET } from "./target.mjs";

const OUT = process.argv[2] || "screenshots/qa/release-check";
const MOBILE = process.argv[3] === "mobile";
const TAG = MOBILE ? "-mobile" : "";
mkdirSync(OUT, { recursive: true });
const COMMIT = execSync("git rev-parse --short HEAD").toString().trim();
const VIEW = MOBILE ? "390x844 touch (phone-sized Chromium, not a real phone)" : "1280x900 Chromium";
const fails = [];
function ok(cond, check, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"} ${check}${detail ? ` (${detail})` : ""}`);
  if (!cond) fails.push(check);
  appendFileSync(`${OUT}/results.jsonl`, JSON.stringify({ check, result: cond ? "pass" : "fail", detail, commit: COMMIT, target: TARGET, base: BASE, viewport: VIEW, at: new Date().toISOString() }) + "\n");
}
console.log(`target: ${TARGET} at ${BASE}, commit ${COMMIT}, ${VIEW}`);
const errors = [];
const headers = { origin: BASE };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const stamp = Date.now().toString(36);

async function newContext(account) {
  const ctx = await browser.newContext({
    ...(MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } }),
    acceptDownloads: true,
    locale: "en-NG",
  });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { ...account, ageConfirmed: true } });
    if (up.ok()) return ctx;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: account });
    if (r.ok()) return ctx;
    if (r.status() !== 429) throw new Error(`sign-in ${account.email}: ${r.status()}`);
    await new Promise((resolve) => setTimeout(resolve, 12000));
  }
  throw new Error(`sign-in ${account.email}: rate limited`);
}
const ADMIN = { email: "qa-admin@example.test", password: "payouts-qa-pass-1", name: "QA Admin" };
const FREE = { email: `qa-release-${stamp}@example.test`, password: "release-pass-1", name: "QA Release" };
async function open(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
}
async function pdfText(bytes) {
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: true });
  return text.normalize("NFC");
}
async function downloadBytes(page, click) {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }), click()]);
  return { name: download.suggestedFilename(), bytes: readFileSync(await download.path()) };
}

// ── Invoice (free account, fresh data) ─────────────────────────────────────
{
  const ctx = await newContext(FREE);
  const page = await ctx.newPage();
  await open(page, "/apps/invoice");
  await page.getByLabel("Invoice number").waitFor({ timeout: 60000 });
  await page.getByLabel("From").fill("Synthetic Studio Ltd\n12 Allen Avenue, Ikeja");
  await page.getByLabel("Currency").selectOption("NGN");
  await page.getByLabel("Bill to").fill("Amaka Okafor\nOkafor Foods");
  await page.getByLabel("Description 1").fill("Logo design");
  await page.getByLabel("Quantity 1").fill("2");
  await page.getByLabel("Rate 1").fill("50,000");
  await page.getByLabel("Tax percent").fill("7.5");
  await page.getByLabel("Due").fill("2026-11-15");
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
  const sheet = page.locator("article.invoice-sheet");
  const total = await sheet.locator("[data-total]").first().innerText();
  ok(total === "₦107,500.00", "Invoice total with 7.5% tax", total);
  if (MOBILE) {
    await page.getByLabel("Rate 1").focus();
    const bar = page.locator("[data-mobile-total]");
    const box = await bar.boundingBox();
    ok(Boolean(box) && box.y >= 0 && box.y + box.height <= 844 && (await bar.innerText()).includes("₦107,500.00"), "Invoice phone: total stays on screen while typing a line");
  }
  ok(await page.locator("[data-payment-hint]").isVisible(), "Invoice: without bank details the editor says where to add them");
  await page.getByRole("button", { name: "All invoices" }).click();
  await page.getByText("Numbering and your details").click();
  await page.getByLabel("How to pay").fill("Bank: Example Bank\nAccount name: Synthetic Studio Ltd\nAccount number: 0123456789");
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
  await page.reload({ waitUntil: "networkidle" });
  // Invoice reopens where you left off (here the list); open invoice 0001 from it if needed.
  if (!(await page.getByLabel("Invoice number").isVisible({ timeout: 5000 }).catch(() => false))) {
    await page.getByRole("button", { name: /Open invoice 0001|0001/ }).first().click();
  }
  await page.getByLabel("Invoice number").waitFor({ timeout: 30000 });
  ok((await sheet.locator("[data-payment]").innerText()).includes("0123456789"), "Invoice: How to pay saved, reopened and printed on the sheet");
  await page.getByRole("button", { name: "Copy for WhatsApp" }).click();
  await page.waitForTimeout(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(clip.includes("Invoice 0001 from Synthetic Studio Ltd") && clip.includes("Total: ₦107,500.00 (due 2026-11-15)") && clip.includes("Account number: 0123456789"), "Invoice: Copy for WhatsApp text", clip.split("\n")[0]);
  await page.emulateMedia({ media: "print" });
  const pdf = await pdfText(await page.pdf({ format: "A4", printBackground: true }));
  await page.emulateMedia({ media: "screen" });
  ok(pdf.includes("Logo design") && pdf.includes("107,500.00") && pdf.includes("How to pay") && pdf.includes("0123456789") && !pdf.includes("Copy for WhatsApp"), "Invoice: printed PDF has the lines, total and how to pay, no editing controls");
  await page.getByRole("button", { name: "New invoice" }).first().click();
  await page.getByLabel("Invoice number").waitFor();
  await page.getByLabel("Invoice number").fill("0001");
  ok(await page.getByText("Another invoice already uses this number.").isVisible(), "Invoice: a duplicate number is flagged");
  await page.getByLabel("Invoice number").fill("0002");
  ok((await page.getByLabel("Notes").inputValue()) === "", "Invoice: a new invoice starts with empty notes once How to pay is set");
  await page.getByRole("tab", { name: /^Quotes/ }).click();
  await page.getByRole("button", { name: "New quote" }).click();
  await page.getByLabel("Quote number").waitFor();
  await page.getByLabel("For", { exact: true }).fill("Nwosu Pharmacy");
  await page.getByLabel("Description 1").fill("Website");
  await page.getByLabel("Quantity 1").fill("1");
  await page.getByLabel("Rate 1").fill("150000");
  await page.getByLabel("Quote status").selectOption("declined");
  ok(await page.getByRole("button", { name: "Convert to invoice" }).isDisabled(), "Invoice: a declined quote cannot be converted");
  await page.screenshot({ path: `${OUT}/invoice${TAG}.png`, fullPage: MOBILE });

  // AI and email fallbacks (no keys on this server): the free account sees honest messages.
  await open(page, "/apps/write?view=letters");
  await page.getByLabel("Your name and address").waitFor({ timeout: 60000 });
  const studioText = await page.locator("body").innerText();
  ok(/AI writing is off right now|AI writes left|AI write/i.test(studioText), "Writing studio: shows the AI status (no key here: the quick-writer message)", (studioText.match(/AI writing is off right now[^.]*\./) ?? ["AI status shown"])[0]);
  await open(page, "/apps/tasks?view=settings");
  const testEmail = page.getByRole("button", { name: "Send me a test email" });
  await testEmail.waitFor({ timeout: 60000 }).catch(() => {});
  if (await testEmail.isVisible()) {
    await testEmail.click();
    // No email key on this server: the app must say nothing was sent, not pretend it was.
    const said = await page.getByText(/Email isn't connected on this copy of the site, so nothing was sent\.|Test email sent|didn't send/).first().innerText({ timeout: 20000 }).catch(() => "no message");
    ok(/isn't connected/.test(said), "Remind: with no email key, the test email says nothing was sent", said.slice(0, 90));
  } else {
    ok(false, "Remind: test email button shown in Settings", "not found");
  }

  // Checkout through the local Paystack stand-in (exercises Midnry's side only).
  await open(page, "/billing");
  const adult = page.locator("#adult-confirm");
  if (await adult.count()) await adult.check();
  const start = page.getByRole("button", { name: /Get Midnry Pass/ });
  await start.waitFor({ timeout: 30000 });
  await start.click();
  await page.waitForURL(/127\.0\.0\.1:8099\/pay\//, { timeout: 30000 });
  await page.getByRole("button", { name: "Pay" }).click();
  await page.waitForURL(/\/billing/, { timeout: 60000 });
  await page.getByText("Midnry Pass is active").first().waitFor({ timeout: 60000 }).catch(() => {});
  await open(page, "/apps/ledger");
  const unlocked = await page.getByLabel("What").first().isVisible({ timeout: 30000 }).catch(() => false);
  ok(unlocked, "Checkout (stand-in, not Paystack): paying opens a Pass app");
  await ctx.close();
}

// ── Pass apps (admin account) ─────────────────────────────────────────────
{
  const ctx = await newContext(ADMIN);
  const page = await ctx.newPage();
  // Ledger
  await open(page, "/apps/ledger");
  await page.getByLabel("What").first().waitFor({ timeout: 60000 });
  for (const [what, amount] of [["Market: rice, oil", "12,500"], ["Danfo", "1500"], ["Ikeja Electric", "20000"]]) {
    await page.getByLabel("What").first().fill(what);
    await page.getByLabel("Amount").first().fill(amount);
    await page.getByRole("button", { name: /^Add expense/ }).click();
  }
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
  await page.getByLabel("What").first().fill("Zero");
  await page.getByLabel("Amount").first().fill("0");
  await page.getByRole("button", { name: /^Add expense/ }).click();
  ok(await page.getByText("Enter an amount above zero.").isVisible(), "Ledger: ₦0 refused");
  await page.getByLabel("Date").first().fill("2026-09-25");
  ok((await page.getByRole("button", { name: /^Add expense/ }).innerText()).includes("25 Sep 2026"), "Ledger: a back-dated entry is named on the Add button");
  await page.getByLabel("Money in or out").selectOption("in");
  ok((await page.getByLabel("Category").inputValue()) === "Income" && (await page.getByLabel("Category").isDisabled()), "Ledger: Money in fixes the category");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Ikeja Electric").first().waitFor({ timeout: 30000 });
  ok(true, "Ledger: entries saved and reopened");
  if (MOBILE) {
    const summary = page.locator('[data-month-summary="phone"]');
    ok((await summary.boundingBox()).y < (await page.getByLabel("What").first().boundingBox()).y, "Ledger phone: month summary above the form");
  }
  const csv = await downloadBytes(page, () => page.getByRole("button", { name: "Export CSV" }).first().click());
  ok(csv.bytes.toString("utf8").includes('"Market: rice, oil"'), "Ledger: CSV export has the entries", csv.name);

  // Writing studio: Contract
  await open(page, "/apps/write?view=contract");
  const contract = page.getByLabel("Contract text");
  await contract.waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "New draft" }).click().catch(() => {});
  await contract.fill("This Agreement is made between Synthetic Studio Ltd and Nwosu Pharmacy (the Client). The Client shall pay a fee of ₦250,000 within 14 days of the invoice. The term starts on 1 November 2026 and runs for 6 months. Either party may terminate with 30 days written notice. The Studio must provide three design revisions.");
  await page.getByRole("button", { name: "Write it" }).click();
  await page.getByRole("region", { name: "Written text" }).getByText("Before you sign").waitFor({ timeout: 60000 });
  await page.locator('[data-save="saved"]').waitFor({ timeout: 30000 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Written text" }).getByText("Before you sign").waitFor({ timeout: 60000 });
  ok((await page.getByRole("region", { name: "Written text" }).getByLabel(/, editable$/).count()) === 7, "Writing studio: Contract summary saved and reopened with all 7 parts");

  // Apply: exports
  await open(page, "/apps/apply");
  await page.getByLabel("Roles").waitFor({ timeout: 60000 });
  await page.getByLabel("Roles").fill("Frontend Engineer");
  await page.getByLabel("Resume text").fill(["Chidinma Ọkafọ", "Lagos · +234 803 000 0000 · chidinma@example.test", "Experience", "Senior Developer, Synthetic Studio Ltd (2021 - Present)", "Built booking tools in React and TypeScript.", "Education", "B.Sc. Computer Science, University of Lagos (2017)"].join("\n"));
  await page.getByRole("button", { name: "Prepare applications" }).click();
  const card = page.locator("article", { hasText: "Frontend Engineer" }).first();
  await card.getByRole("button", { name: "Download text" }).waitFor({ timeout: 60000 });
  const txt = (await downloadBytes(page, () => card.getByRole("button", { name: "Download text" }).click())).bytes.toString("utf8");
  const lines = txt.split("\n").map((line) => line.trim()).filter(Boolean);
  const h = lines.findIndex((line) => line.startsWith("Frontend Engineer"));
  ok(h > 0 && h < lines.indexOf("Experience"), "Apply: text export has the headline above Experience", `line ${h + 1}`);
  const pdf = await pdfText((await downloadBytes(page, () => card.getByRole("button", { name: "Download PDF" }).click())).bytes);
  ok(pdf.includes("Chidinma Ọkafọ") && pdf.indexOf("Frontend Engineer") < pdf.indexOf("Experience"), "Apply: PDF export keeps accented names and the headline above Experience");

  // Compressor
  await open(page, "/apps/compressor");
  await page.getByRole("button", { name: "Use a practice clip" }).click();
  const go = page.getByRole("button", { name: "Compress to MP4" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Compress to MP4") && !b.disabled), null, { timeout: 120000 });
  await go.click();
  const download = page.getByRole("button", { name: "Download", exact: true });
  const done = await download.waitFor({ timeout: 180000 }).then(() => true, () => false);
  if (done) {
    const file = await downloadBytes(page, () => download.click());
    ok(file.bytes.length > 1000 && file.bytes.subarray(4, 8).toString("latin1") === "ftyp", "Compressor: practice clip becomes a real MP4 file", `${file.name}, ${file.bytes.length} bytes`);
  } else {
    ok(false, "Compressor: practice clip becomes a real MP4 file", (await page.locator("body").innerText()).match(/Couldn.t[^\n]*/)?.[0] ?? "no result");
  }
  await ctx.close();
}

ok(errors.length === 0, "No page errors", errors.slice(0, 3).join(" | "));
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
