// The 2026-10-23 audit fixes, in a real browser against the local dev server
// (sh scripts/qa/dev-up.sh), as the local QA admin (opens Pass apps). Synthetic
// data only. Covers:
//  1. Invoice: How to pay prints on the sheet; a new invoice does not inherit
//     the previous notes once it is set; Copy for WhatsApp; a number clash is
//     flagged; a declined quote cannot be converted; on a phone the total stays
//     in view while typing lines.
//  2. Ledger: on a phone the month summary sits above the form; ₦0 refused;
//     Money in fixes the category; the Add button names a back-dated entry.
//  3. Dose: "7,5" shows "Use a dot for decimals" instead of a tenfold dose.
//  4. Writing studio: a Contract summary (7 pieces) is saved and reopens.
//  5. Apply: the headline sits above Experience on a resume without blank lines.
//  6. Compressor: the practice clip compresses without the "fit" error.
//  7. No page errors.
// Usage: node scripts/qa/audit-fixes.mjs [outdir] [mobile]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/audit-fixes";
const MOBILE = process.argv[3] === "mobile";
const TAG = MOBILE ? "-mobile" : "";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ADMIN = "qa-admin@example.test";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext(
  MOBILE
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true }
    : { viewport: { width: 1280, height: 900 }, acceptDownloads: true },
);
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
ctx.on("page", (page) => {
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
  });
});
for (const password of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
  const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password, name: "QA Admin", ageConfirmed: true } });
  if (up.ok()) break;
  const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password } });
  if (r.ok()) break;
}

async function seed(page, slug, doc) {
  const res = await page.evaluate(async ({ slug, payload }) => {
    const m = await import("/src/lib/cove.functions.ts");
    const current = await m.loadDoc({ data: slug });
    return m.saveDoc({ data: { slug, payload, baseRevision: current.ok ? current.revision : 0 } });
  }, { slug, payload: JSON.stringify(doc) });
  if (!res.ok) throw new Error(`seed ${slug}: ${JSON.stringify(res)}`);
}
async function open(page, slug, search = "") {
  await page.goto(`${BASE}/apps/${slug}${search}`, { waitUntil: "networkidle", timeout: 120000 });
}
const saved = (page) => page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
const inView = async (locator, page) => {
  const box = await locator.boundingBox();
  const height = page.viewportSize().height;
  return Boolean(box) && box.y >= 0 && box.y + box.height <= height;
};

const page = await ctx.newPage();

// ── 1. Invoice ──────────────────────────────────────────────────────────────
await open(page, "apps");
await seed(page, "invoice", {
  v: 2,
  from: "Synthetic Studio Ltd\n12 Allen Avenue, Ikeja",
  currency: "NGN",
  numbering: { prefix: "", next: 1, pad: 4 },
  quoteNumbering: { prefix: "Q-", next: 1, pad: 4 },
  invoices: [],
  quotes: [],
  proposals: [],
  clients: [],
  imported: {},
});
await open(page, "invoice");
await page.getByLabel("Invoice number").waitFor({ timeout: 60000 });
await page.getByLabel("Bill to").fill("Amaka Okafor\nOkafor Foods");
await page.getByLabel("Description 1").fill("Design");
await page.getByLabel("Quantity 1").fill("1");
await page.getByLabel("Rate 1").fill("100000");
await page.getByLabel("Tax percent").fill("7.5");
await page.getByLabel("Due").fill("2026-11-15");
await page.getByLabel("Notes").fill("Reply to confirm and we start Monday.");
await saved(page);
ok(await page.locator("[data-payment-hint]").isVisible(), "without bank details the editor says where to add them");
const sheet = page.locator("article.invoice-sheet");
const total = await sheet.locator("[data-total]").first().innerText();
ok(total === "₦107,500.00", `the sheet totals ₦107,500.00 (${total})`);
if (MOBILE) {
  await page.getByLabel("Rate 1").focus();
  const bar = page.locator("[data-mobile-total]");
  ok(await bar.isVisible(), "phone: a total line is shown with the form");
  ok((await bar.locator("[data-mobile-total-value]").innerText()) === total, "phone: it shows the same total as the sheet");
  ok(await inView(bar, page), "phone: the total stays on screen while a line is being typed");
  await page.screenshot({ path: `${OUT}/invoice-mobile-total.png` });
} else {
  ok(!(await page.locator("[data-mobile-total]").isVisible()), "laptop: no extra total line (the sheet is beside the form)");
}
// How to pay, under Numbering and your details (in the invoice list).
await page.getByRole("button", { name: "New invoice" }).click();
await page.getByLabel("Invoice number").waitFor();
ok((await page.getByLabel("Notes").inputValue()) === "Reply to confirm and we start Monday.", "before any How to pay block, notes still carry over (old behaviour kept)");
await page.getByRole("button", { name: "All invoices" }).click();
await page.getByText("Numbering and your details").click();
await page.getByLabel("How to pay").fill("Bank: Example Bank\nAccount name: Synthetic Studio Ltd\nAccount number: 0123456789");
await saved(page);
await page.getByRole("button", { name: /Open invoice 0001|0001/ }).first().click().catch(() => {});
await page.getByRole("button", { name: "New invoice" }).first().click();
await page.getByLabel("Invoice number").waitFor();
const number2 = await page.getByLabel("Invoice number").inputValue();
ok((await page.getByLabel("Notes").inputValue()) === "", `with How to pay set, a new invoice (${number2}) has empty notes`);
ok(!(await page.locator("[data-payment-hint]").isVisible()), "the bank-details hint is gone");
ok((await sheet.locator("[data-payment]").innerText()).includes("Account number: 0123456789"), "How to pay prints on the invoice sheet");
await page.getByLabel("Bill to").fill("Emeka Traders");
await page.getByLabel("Description 1").fill("Delivery");
await page.getByLabel("Quantity 1").fill("2");
await page.getByLabel("Rate 1").fill("5000");
await page.getByLabel("Due").fill("2026-11-30");
await saved(page);
await page.getByRole("button", { name: "Copy for WhatsApp" }).click();
await page.waitForTimeout(400);
const clip = await page.evaluate(() => navigator.clipboard.readText());
ok(clip.startsWith(`Invoice ${number2} from Synthetic Studio Ltd`) && clip.includes("To: Emeka Traders") && clip.includes("Total: ₦10,750.00 (due 2026-11-30)") && clip.includes("Account number: 0123456789"), `Copy for WhatsApp gives the summary (${clip.split("\n")[0]})`);
await page.getByLabel("Invoice number").fill("0001");
await page.getByText("Another invoice already uses this number.").waitFor({ timeout: 10000 });
ok(true, "a number already used is flagged");
await page.screenshot({ path: `${OUT}/invoice-how-to-pay${TAG}.png`, fullPage: MOBILE });
await page.getByLabel("Invoice number").fill(number2);
// A declined quote cannot be converted.
await page.getByRole("tab", { name: /^Quotes/ }).click();
await page.getByRole("button", { name: "New quote" }).click();
await page.getByLabel("Quote number").waitFor();
await page.getByLabel("For", { exact: true }).fill("Nwosu Pharmacy");
await page.getByLabel("Description 1").fill("Website");
await page.getByLabel("Quantity 1").fill("1");
await page.getByLabel("Rate 1").fill("150000");
await saved(page);
ok(await page.getByRole("button", { name: "Convert to invoice" }).isEnabled(), "a fresh quote can be converted");
await page.getByLabel("Quote status").selectOption("declined");
ok(await page.getByRole("button", { name: "Convert to invoice" }).isDisabled(), "a declined quote cannot be converted");
ok(await page.locator("[data-declined-note]").isVisible(), "and the editor says why");

// ── 2. Ledger ───────────────────────────────────────────────────────────────
const month = new Date().toISOString().slice(0, 7);
await seed(page, "ledger", {
  entries: Array.from({ length: 30 }, (_, i) => ({ id: `qa-${i}`, label: `Synthetic entry ${i + 1}`, cents: 150000 + i * 1000, category: ["Food", "Transit", "Home"][i % 3], date: `${month}-${String((i % 27) + 1).padStart(2, "0")}` })),
  currency: "NGN",
  budget: "500000",
});
await open(page, "ledger");
await page.getByLabel("What").first().waitFor({ timeout: 60000 });
const phoneSummary = page.locator('[data-month-summary="phone"]');
const laptopSummary = page.locator('[data-month-summary="laptop"]');
if (MOBILE) {
  ok(await phoneSummary.isVisible(), "phone: the month summary is shown");
  const formBox = await page.getByLabel("What").first().boundingBox();
  const sumBox = await phoneSummary.boundingBox();
  ok(sumBox.y < formBox.y, "phone: the summary sits above the form, not under the entries");
  ok((await phoneSummary.innerText()).includes("Spent this month") && (await phoneSummary.innerText()).includes("budget"), "phone: total and budget line are in it");
  await phoneSummary.getByText("Where the month went").click();
  ok(await phoneSummary.getByLabel("Monthly budget (optional)").isVisible(), "phone: the fold-out holds the bars and budget");
  await page.screenshot({ path: `${OUT}/ledger-mobile-summary.png` });
} else {
  ok(await laptopSummary.isVisible() && !(await phoneSummary.isVisible()), "laptop: the aside is used, the phone summary is hidden");
}
await page.getByLabel("What").first().fill("Zero test");
await page.getByLabel("Amount").first().fill("0");
await page.getByRole("button", { name: /^Add expense/ }).click();
ok(await page.getByText("Enter an amount above zero.").isVisible(), "₦0 is refused");
await page.getByLabel("Date").first().fill("2026-09-25");
ok((await page.getByRole("button", { name: /^Add expense/ }).innerText()).includes("on 25 Sep 2026"), "a back-dated entry is named on the Add button");
await page.getByLabel("Money in or out").selectOption("in");
ok(await page.getByLabel("Category").isDisabled() && (await page.getByLabel("Category").inputValue()) === "Income", "Money in fixes the category to Income");
await page.getByLabel("Money in or out").selectOption("out");
ok((await page.getByLabel("Category").locator("option").allInnerTexts()).every((name) => name !== "Income"), "Income is not offered as a spending category");
await page.getByLabel("Date").first().fill(`${month}-05`);
await page.getByLabel("Amount").first().fill("2500");
await page.getByRole("button", { name: /^Add expense/ }).click();
await saved(page);
await page.locator(`[data-month-summary="${MOBILE ? "phone" : "laptop"}"]`).getByLabel("Monthly budget (optional)").fill("abc");
ok(await page.locator(`[data-month-summary="${MOBILE ? "phone" : "laptop"}"]`).getByText("Enter a budget like 150000.").isVisible(), "an unreadable budget says so");

// ── 3. Dose ─────────────────────────────────────────────────────────────────
await open(page, "dose");
await page.getByLabel("Weight (kg)").waitFor({ timeout: 60000 });
ok((await page.getByLabel("Weight (kg)").getAttribute("type")) === "text" && (await page.getByLabel("Weight (kg)").getAttribute("inputmode")) === "decimal", "number boxes are text boxes with a decimal keypad");
await page.getByLabel("Weight (kg)").fill("7,5");
await page.getByLabel("mg per kg").fill("10");
await page.getByLabel("mg per mL").fill("24");
ok(await page.getByText("Use a dot for decimals, e.g. 7.5").isVisible(), "“7,5” asks for a dot instead of computing a tenfold dose");
ok((await page.getByText("750 mg").count()) === 0, "no 750 mg result");
await page.getByLabel("Weight (kg)").fill("abc");
ok(await page.getByText(/Weight \(kg\) must be a number/).isVisible(), "letters are named");
await page.getByLabel("Weight (kg)").fill("7.5");
ok(await page.getByText("75 mg").isVisible() && (await page.getByText("3.13 mL").isVisible()), "7.5 kg × 10 mg/kg = 75 mg, 3.13 mL");
await page.screenshot({ path: `${OUT}/dose${TAG}.png`, fullPage: MOBILE });

// ── 4. Writing studio: Contract ─────────────────────────────────────────────
await open(page, "write", "?view=contract");
const contract = page.getByLabel("Contract text");
await contract.waitFor({ timeout: 60000 });
await page.getByRole("button", { name: "New draft" }).click().catch(() => {});
await contract.fill(
  "This Agreement is made between Synthetic Studio Ltd and Nwosu Pharmacy (the Client). The Client shall pay a fee of ₦250,000 within 14 days of the invoice. The term starts on 1 November 2026 and runs for 6 months. Either party may terminate with 30 days written notice. The Studio must provide three design revisions. This Agreement renews automatically unless notice is given, and is governed by the laws of Nigeria.",
);
await page.getByRole("button", { name: "Write it" }).click();
const written = page.getByRole("region", { name: "Written text" });
await written.getByText("Before you sign").waitFor({ timeout: 60000 });
await page.locator('[data-save="saved"]').waitFor({ timeout: 30000 });
ok(true, "a Contract summary saves (status: Draft saved)");
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("region", { name: "Written text" }).getByText("Before you sign").waitFor({ timeout: 60000 });
ok((await page.getByRole("region", { name: "Written text" }).getByLabel(/, editable$/).count()) === 7, "after a reload all 7 pieces are still there");
await page.screenshot({ path: `${OUT}/contract${TAG}.png`, fullPage: MOBILE });

// ── 5. Apply: headline above Experience ─────────────────────────────────────
await open(page, "apply");
await page.getByLabel("Roles").waitFor({ timeout: 60000 });
await page.getByLabel("Roles").fill("Frontend Engineer");
await page.getByLabel("Resume text").fill(
  ["Amaka Okafor", "Lagos, Nigeria · +234 803 000 0000 · amaka@example.test", "Experience", "Senior Developer, Synthetic Studio Ltd (2021 - Present)", "Built booking tools in React and TypeScript for clinics.", "Education", "B.Sc. Computer Science, University of Lagos (2017)"].join("\n"),
);
await page.getByRole("button", { name: "Prepare applications" }).click();
const card = page.locator("article", { hasText: "Frontend Engineer" }).first();
await card.getByRole("button", { name: "Download text" }).waitFor({ timeout: 60000 });
const [txt] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), card.getByRole("button", { name: "Download text" }).click()]);
const text = readFileSync(await txt.path(), "utf8");
const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
const headlineAt = lines.findIndex((line) => line.startsWith("Frontend Engineer"));
const experienceAt = lines.findIndex((line) => line === "Experience");
ok(headlineAt > 0 && experienceAt > headlineAt, `the headline (line ${headlineAt + 1}) sits above Experience (line ${experienceAt + 1})`);
ok(!lines[lines.indexOf("Senior Developer, Synthetic Studio Ltd (2021 - Present)") + 1]?.startsWith("Frontend Engineer"), "and not inside the Experience section");

// ── 6. Compressor ───────────────────────────────────────────────────────────
await open(page, "compressor");
await page.getByRole("button", { name: "Use a practice clip" }).waitFor({ timeout: 60000 });
await page.getByRole("button", { name: "Use a practice clip" }).click();
await page.getByRole("button", { name: "Compress to MP4" }).waitFor({ state: "visible", timeout: 60000 });
await page.waitForFunction(() => !document.querySelector("button:disabled")?.textContent?.includes("Compress to MP4"), null, { timeout: 60000 }).catch(() => {});
await page.getByRole("button", { name: "Compress to MP4" }).click();
await page.waitForTimeout(8000);
const body = await page.locator("body").innerText();
ok(!body.includes("options.video.fit"), "no “options.video.fit must also be provided” error");
const done = body.includes("Download") || /MP4 ready|Done|ready/i.test(body);
console.log(`INFO compressor outcome: ${done ? "a result is offered" : "no result in headless Chromium (no H.264 encoder); only the fit error is checked"}`);
await page.screenshot({ path: `${OUT}/compressor${TAG}.png`, fullPage: MOBILE });

ok(errors.length === 0, `no page errors (${errors.slice(0, 5).join(" | ")})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
