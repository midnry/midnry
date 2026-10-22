// Phase 1 app fixes, in a real browser against the local dev server
// (sh scripts/qa/dev-up.sh). Signs in as the local QA admin
// (ADMIN_EMAIL=qa-admin@example.test in dev-up.sh), which opens Pass tools.
// Seeds synthetic documents through the app's own server functions, then:
//  1. Ledger keeps 520+ entries across reload and in the CSV export,
//  2. Board keeps a saved 41-card column and refuses add/move into a full one,
//  3. Invoice shows inline errors, hides the total and disables print,
//  4. Medicines: old saved rows load, tick today, untick, history,
//  5. Reconcile reports unreadable lines and amounts in both lists,
//  6. Apply's PDF keeps accented names (read back with unpdf),
//  7. Saving: another tab's change is detected, a failed save retries,
//     leaving during the pause still saves, and closing with unsaved
//     changes asks first.
// Usage: node scripts/qa/apps-phase1.mjs [outdir]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { extractText, getDocumentProxy } from "unpdf";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/apps-phase1";
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

async function signIn(ctx) {
  // Other QA scripts create this account with one of these passwords.
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

/** Call the app's own server functions from inside a page (dev server only). */
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
async function open(page, slug) {
  await page.goto(`${BASE}/apps/${slug}`, { waitUntil: "networkidle", timeout: 120000 });
}
async function saved(page) {
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
}

const ctx = await newCtx();
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });

// ── 1. Ledger ───────────────────────────────────────────────────────────────
{
  const month = new Date().toISOString().slice(0, 7);
  const entries = Array.from({ length: 520 }, (_, i) => ({
    id: `qa-${i}`,
    label: `Synthetic expense ${i}`,
    cents: 1000 + i,
    category: "Food",
    date: `${month}-${String((i % 27) + 1).padStart(2, "0")}`,
  }));
  await seed(page, "ledger", { entries, currency: "NGN" });
  await open(page, "ledger");
  await page.getByLabel("What").fill("Synthetic 521st");
  await page.getByLabel("Amount").fill("12.50");
  await page.getByRole("button", { name: "Add expense" }).click();
  await saved(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Synthetic 521st").waitFor({ timeout: 30000 });
  const doc = await load(page, "ledger");
  ok(doc?.entries?.length === 521, `ledger keeps all 521 entries after reload (${doc?.entries?.length})`);
  ok(doc?.entries?.some((e) => e.id === "qa-0") && doc?.entries?.some((e) => e.id === "qa-519"), "the oldest and newest seeded entries are both kept");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).first().click()]);
  const csv = readFileSync(await download.path(), "utf8").split("\n");
  ok(csv.length === 522, `CSV export has 521 rows plus a header (${csv.length} lines)`);
  await page.screenshot({ path: `${OUT}/ledger.png` });
}

// ── 2. Board ────────────────────────────────────────────────────────────────
{
  const cards = (prefix, n) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, title: `${prefix} card ${i + 1}` }));
  await seed(page, "board", {
    columns: [
      { id: "todo", title: "To do", cards: cards("todo", 41) },
      { id: "doing", title: "Doing", cards: cards("doing", 40) },
      { id: "done", title: "Done", cards: cards("done", 2) },
    ],
  });
  await open(page, "board");
  const col = (n) => page.locator("section", { has: page.getByLabel(`Column ${n} name`) });
  await col(1).getByLabel("Card", { exact: true }).first().waitFor();
  ok((await col(1).getByLabel("Card", { exact: true }).count()) === 41, "a saved 41-card column shows all 41 cards");
  ok(await col(1).getByText("41 cards, over the limit of 40. All are kept; new cards go in another column.").isVisible(), "the over-limit column says so");
  await col(1).getByPlaceholder("New card").fill("One too many");
  await col(1).getByRole("button", { name: "Add" }).click();
  ok(await col(1).getByRole("alert").getByText("“To do” is full (40 cards). Move or remove a card there first.").isVisible(), "adding to a full column shows a message");
  await col(1).getByRole("button", { name: "Right" }).first().click();
  ok(await col(1).getByRole("alert").getByText("“Doing” is full (40 cards). Move or remove a card there first.").isVisible(), "moving into a full column shows a message");
  ok((await col(1).getByLabel("Card", { exact: true }).count()) === 41 && (await col(2).getByLabel("Card", { exact: true }).count()) === 40, "nothing moved or dropped");
  await col(3).getByPlaceholder("New card").fill("Fits here");
  await col(3).getByRole("button", { name: "Add" }).click();
  await saved(page);
  await page.reload({ waitUntil: "networkidle" });
  await col(1).getByLabel("Card", { exact: true }).first().waitFor();
  ok((await col(1).getByLabel("Card", { exact: true }).count()) === 41 && (await col(3).getByLabel("Card", { exact: true }).count()) === 3, "after a save and reload: 41, 40 and 3 cards (84 in total)");
  await page.screenshot({ path: `${OUT}/board.png` });
}

// ── 3. Invoice ──────────────────────────────────────────────────────────────
{
  await seed(page, "invoice", {
    from: "Synthetic Studio",
    to: "Synthetic Client",
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
  });
  await open(page, "invoice");
  const sheet = page.locator("article.invoice-sheet");
  const print = page.getByRole("button", { name: "Print or save as PDF" });
  await sheet.getByText("$107.61").waitFor({ timeout: 30000 }); // 99.99 + 0.11 = 100.10, tax 7.51
  ok(await print.isEnabled(), "valid invoice: total shown and print enabled");
  ok(await page.getByText(/Each line is rounded to 2 decimal places/).isVisible(), "the rounding rule is stated");
  const tax = page.getByLabel("Tax percent");
  for (const [value, message] of [
    ["100.01", "Tax can’t be more than 100%."],
    ["abc", "Tax must be a number from 0 to 100."],
    ["-2", "Tax can’t be negative."],
    ["", "Enter a tax percent. Use 0 if there is no tax."],
  ]) {
    await tax.fill(value);
    await page.getByText(message).waitFor();
    ok((await sheet.getByText("$107.61").count()) === 0 && (await print.isDisabled()), `tax "${value}": "${message}", no total, print disabled`);
  }
  ok(await page.getByText("Fix the highlighted field to print. No total is shown until every amount is valid.").first().isVisible(), "print shows why it is disabled");
  await tax.fill("7.5");
  await page.getByLabel("Quantity 1").fill("-1");
  await page.getByText("Line 1: Quantity can’t be negative.").waitFor();
  await page.getByLabel("Rate 2").fill("0.075");
  await page.getByText("Line 2: Rate can have at most 2 decimal places.").waitFor();
  ok((await page.getByLabel("Quantity 1").getAttribute("aria-invalid")) === "true", "the invalid quantity is marked aria-invalid");
  ok(await page.getByText("Fix the 2 highlighted fields to print.", { exact: false }).first().isVisible(), "two errors are counted");
  await page.getByLabel("Quantity 1").fill("3");
  await page.getByLabel("Rate 2").fill("0.07");
  await sheet.getByText("$107.61").waitFor();
  ok(await print.isEnabled(), "fixing the inputs brings back the total and print");
  await page.screenshot({ path: `${OUT}/invoice.png`, fullPage: true });
}

// ── 4. Medicines ────────────────────────────────────────────────────────────
{
  // The old tracker's shape: no ids, no ticks.
  await seed(page, "meds", { rows: [{ name: "Synthetic Aspirin", when: "Morning" }, { name: "Synthetic Metformin", when: "Night" }] });
  await open(page, "meds");
  const aspirin = page.getByRole("button", { name: /Synthetic Aspirin/ });
  await aspirin.waitFor({ timeout: 30000 });
  ok(await page.getByRole("button", { name: /Synthetic Metformin.*Night/ }).isVisible(), "old saved medicines load with their times");
  ok((await aspirin.getAttribute("aria-pressed")) === "false" && (await aspirin.textContent()).includes("Not taken yet today"), "not ticked to start");
  const box = await aspirin.boundingBox();
  ok(box && box.height >= 56, `the tick button is a large target (${box?.height}px)`);
  await aspirin.click();
  await saved(page);
  await page.reload({ waitUntil: "networkidle" });
  await aspirin.waitFor();
  ok((await aspirin.getAttribute("aria-pressed")) === "true" && /Taken today at \d\d:\d\d/.test(await aspirin.textContent()), "ticked today, and still ticked after reload");
  ok(await page.getByText("1 of 2 taken today.").isVisible(), "today's count");
  await page.getByText("The last 30 days", { exact: true }).click();
  const days = page.locator("details", { has: page.getByText("The last 30 days", { exact: true }) }).locator("li");
  ok(await days.first().getByText(/Synthetic Aspirin at \d\d:\d\d/).isVisible(), "history shows today's tick");
  ok((await days.count()) === 30, "history lists 30 days");
  await page.screenshot({ path: `${OUT}/meds-ticked.png`, fullPage: true });
  await aspirin.click();
  await saved(page);
  await page.reload({ waitUntil: "networkidle" });
  await aspirin.waitFor();
  ok((await aspirin.getAttribute("aria-pressed")) === "false", "an accidental tick can be undone");
  const doc = await load(page, "meds");
  ok(doc.rows.length === 2 && doc.rows[0].name === "Synthetic Aspirin" && doc.rows[1].when === "Night", "the saved rows keep their names and times");
  const mobile = await newCtx({ width: 390, height: 844 }, true);
  const phone = await mobile.newPage();
  await open(phone, "meds");
  await phone.getByRole("button", { name: /Synthetic Aspirin/ }).waitFor();
  ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no sideways scroll at 390px");
  await phone.screenshot({ path: `${OUT}/meds-390.png`, fullPage: true });
  await mobile.close();
}

// ── 5. Reconcile ────────────────────────────────────────────────────────────
{
  await open(page, "reconcile");
  await page.getByLabel(/Your records/).fill("12,500\nabc\n780.50\n2026-10-01 3,000");
  await page.getByLabel(/Bank or statement/).fill("12,500\n99");
  ok(await page.getByText("Line 2: “abc” is not an amount.").isVisible(), "an unreadable line is reported with its number and reason");
  ok(await page.getByText("Line 4: “2026-10-01 3,000” has more than one number; put only the amount on the line.").isVisible(), "a line with a date is reported, not dropped");
  ok(await page.getByText("Amounts that appear in both lists (1)").isVisible(), "the matched result is named honestly");
  ok(await page.getByText("Only in your records (1)").isVisible() && (await page.getByText("780.5 (line 3)").isVisible()), "unmatched items on our side, with line numbers");
  ok(await page.getByText("Only on the statement (1)").isVisible() && (await page.getByText("99 (line 2)").isVisible()), "unmatched items on their side");
  ok((await page.getByText(/reconciled/i).count()) === 0, "nothing claims the lists are reconciled");
  await page.screenshot({ path: `${OUT}/reconcile.png`, fullPage: true });
}

// ── 6. Apply PDF ────────────────────────────────────────────────────────────
{
  const resume = "Adébáyọ̀ Ọlá\nJosé Müller\nŁukasz Żółć\n\nSynthetic resume for QA.";
  await seed(page, "apply", { rolesText: "Designer", resume, packs: [{ role: "Designer", note: "Synthetic", resume, submitted: false }] });
  await open(page, "apply");
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: "Download PDF" }).click()]);
  const bytes = new Uint8Array(readFileSync(await download.path()));
  const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
  for (const name of ["Adébáyọ̀ Ọlá", "José Müller", "Łukasz Żółć"]) ok(text.normalize("NFC").includes(name.normalize("NFC")), `PDF keeps "${name}"`);
}

// ── 7. Saving ───────────────────────────────────────────────────────────────
{
  await seed(page, "board", { columns: [{ id: "todo", title: "To do", cards: [] }, { id: "doing", title: "Doing", cards: [] }, { id: "done", title: "Done", cards: [] }] });
  const tabA = await ctx.newPage();
  const tabB = await ctx.newPage();
  await open(tabA, "board");
  await open(tabB, "board");
  await tabA.getByLabel("Column 1 name").fill("Edited in tab A");
  await saved(tabA);
  await tabB.getByLabel("Column 1 name").fill("Edited in tab B");
  await tabB.getByText("This was changed in another tab. Your changes are kept until you choose.").first().waitFor({ timeout: 30000 });
  await tabB.locator('[data-doc-recovery="conflict"]').waitFor({ timeout: 10000 });
  ok(true, "a stale tab is told it was changed in another tab, with choices");
  ok((await load(tabB, "board")).columns[0].title === "Edited in tab A", "the other tab's save was not overwritten");
  await tabB.screenshot({ path: `${OUT}/conflict.png` });
  await tabB.reload({ waitUntil: "networkidle" });
  ok((await tabB.getByLabel("Column 1 name").inputValue()) === "Edited in tab A", "reload shows the latest");
  // The unsaved change from before the reload is offered back (scripts/qa/save-conflict.mjs covers the choices).
  const offer = tabB.locator('[data-doc-recovery="recovered"]');
  await offer.waitFor({ timeout: 15000 });
  ok(true, "after the reload the unsaved change is offered back");
  await offer.getByRole("button", { name: "Discard it and keep what’s saved" }).click();
  await offer.getByRole("button", { name: "Discard mine, use the saved version" }).click();
  await offer.waitFor({ state: "detached", timeout: 10000 });
  await tabA.close();

  // A failed save keeps the change and retries.
  const block = (route) => (route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await tabB.route("**/_serverFn/**", block);
  await tabB.getByLabel("Column 2 name").fill("Saved after a retry");
  await tabB.getByText("Not saved, retrying…").first().waitFor({ timeout: 15000 });
  ok(true, "a failed save shows “Not saved, retrying…”");
  ok((await tabB.getByLabel("Column 2 name").inputValue()) === "Saved after a retry", "the change stays on the page");
  await tabB.screenshot({ path: `${OUT}/retrying.png` });

  // Closing the tab with the change still unsaved asks first.
  let asked = false;
  tabB.on("dialog", async (dialog) => {
    asked = dialog.type() === "beforeunload";
    await dialog.dismiss();
  });
  await tabB.close({ runBeforeUnload: true });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  ok(asked, "closing with an unsaved change asks before leaving");
  ok(!tabB.isClosed(), "dismissing the prompt keeps the tab open");
  await tabB.unroute("**/_serverFn/**", block);
  await tabB.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
  ok((await load(tabB, "board")).columns[1].title === "Saved after a retry", "the retry saves once the connection is back");
  await tabB.close();

  // Leaving during the pause still saves.
  const tabC = await ctx.newPage();
  await open(tabC, "board");
  await tabC.getByLabel("Column 3 name").fill("Typed then left at once");
  await tabC.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  ok((await load(tabC, "board")).columns[2].title === "Typed then left at once", "a change made just before leaving the page is saved");
  await tabC.close();
}

ok(errors.length === 0, `no page errors (${errors.slice(0, 5).join(" | ")})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
