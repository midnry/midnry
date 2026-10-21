// Phase 2 merges in a real browser, against the local dev server
// (sh scripts/qa/dev-up.sh). Synthetic data only.
//  - Pass (local QA admin): old Budget/Pocket/Prices/Crop prices/Terms
//    documents are seeded under their old slugs; the old links redirect to the
//    new home and view, the one-click import copies the entries in, and the
//    old documents are unchanged afterwards. QR menu → Menu's QR section.
//    Glyph: tree, path, sort keys, minify, error position. JSON: error position.
//  - Free (a fresh account): /apps/budget lands on Ledger (Pass) with a
//    read-only list of the saved entries, a CSV export and a note about the Pass.
//  - Phone 390×844: no sideways scrolling; no page errors anywhere.
// Usage: node scripts/qa/merges.mjs [outdir]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/merges";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ADMIN = "qa-admin@example.test";

const OLD = {
  budget: { rows: [{ name: "Salary", amount: "250000", side: "income" }, { name: "Rent", amount: "80000", side: "cost" }] },
  pocket: { rows: [{ name: "Pension", amount: "40000", side: "income" }, { name: "Market", amount: "6500", side: "cost" }, { name: "Transport", amount: "1500", side: "cost" }] },
  "price-list": { rows: [{ item: "Shea butter", price: "3500" }, { item: "Black soap", price: "1200" }] },
  produce: { rows: [{ crop: "Maize", price: "800", when: "2026-09-01" }] },
  "client-terms": { values: { client: "Ada Studio", job: "Logo design and two banners", fee: "50000", revisions: "3" } },
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

function watch(ctx) {
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
}

async function signInAdmin(ctx) {
  for (const password of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) return;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password } });
    if (r.ok()) return;
  }
  throw new Error("Could not sign in as the local QA admin");
}

async function signUpFree(ctx) {
  const email = `qa-merge-${Date.now()}@example.test`;
  const r = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email, password: "merge-qa-pass-1", name: "QA Free", ageConfirmed: true } });
  if (!r.ok()) throw new Error(`Could not create a free account (${r.status()})`);
}

// Old slugs stay saveable through the same server function (src/lib/merged-docs.ts), which is how
// a document saved before the merge looks.
const seedOld = (page, slug, doc) => seed(page, slug, doc);
async function seed(page, slug, doc) {
  const res = await page.evaluate(async ({ slug, payload }) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.saveDoc({ data: { slug, payload } });
  }, { slug, payload: JSON.stringify(doc) });
  if (!res.ok) throw new Error(`seed ${slug}: ${JSON.stringify(res)}`);
}
async function loadOld(page, slug) {
  return page.evaluate(async (slug) => {
    const m = await import("/src/lib/merged-docs.functions.ts");
    return m.loadMergedDoc({ data: slug });
  }, slug);
}
async function load(page, slug) {
  const res = await page.evaluate(async (slug) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: slug });
  }, slug);
  return res.ok && res.payload ? JSON.parse(res.payload) : null;
}
async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
}
function where(page) {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}
async function noSideScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
async function savedOnce(page) {
  await page.waitForTimeout(400);
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

// ── Pass ───────────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  watch(ctx);
  await signInAdmin(ctx);
  const page = await ctx.newPage();
  await go(page, "/");
  for (const [slug, doc] of Object.entries(OLD)) await seedOld(page, slug, doc);
  // Fresh receiving documents for the synthetic QA account, so the import is visible.
  await seed(page, "ledger", { entries: [], currency: "NGN" });
  await seed(page, "catalog", { rows: [{ name: "Soap", price: "900", line: "Lavender" }] });
  await seed(page, "farm-sales", { rows: [{ buyer: "Musa", crop: "Maize", amount: "4000" }] });
  await seed(page, "service-terms", { values: { you: "QA Maker", client: "Bola Ltd" } });
  await seed(page, "menu", { rows: [{ dish: "Jollof rice", price: "2500", note: "Spicy" }] });

  // Budget → Ledger, Budget view
  await go(page, "/apps/budget");
  ok(where(page) === "/apps/ledger?view=budget", `/apps/budget redirects to /apps/ledger?view=budget (${where(page)})`);
  await page.locator('[data-ledger-view="budget"]').waitFor({ timeout: 30000 });
  ok((await page.locator('[role="tab"][data-view="budget"]').getAttribute("aria-selected")) === "true", "Budget view is open");
  ok(await page.getByText("You have 2 entries saved in Budget").isVisible(), "Ledger offers the 2 saved Budget entries");
  ok(await page.getByText("You have 3 entries saved in Pocket").isVisible(), "…and the 3 saved Pocket entries");
  await page.screenshot({ path: `${OUT}/ledger-budget-before-import.png`, fullPage: true });
  await page.getByRole("button", { name: "Bring my Budget entries into Ledger" }).click();
  await page.getByText(/Copied 2 entries from Budget into Ledger/).waitFor({ timeout: 10000 });
  ok((await page.locator('[data-stat="Income"]').textContent()).includes("250,000"), "Budget view shows the copied income");
  ok((await page.locator('[data-stat="Costs"]').textContent()).includes("80,000"), "…and the copied cost");
  await savedOnce(page);
  const ledger = await load(page, "ledger");
  ok(ledger.entries.length === 2 && ledger.entries.every((e) => e.from?.startsWith("budget#")), "Ledger saved 2 copies marked from Budget");
  ok(ledger.entries.some((e) => e.label === "Salary" && e.flow === "in"), "income is kept as money in");
  const oldBudget = await loadOld(page, "budget");
  ok(oldBudget.ok && JSON.stringify(JSON.parse(oldBudget.payload)) === JSON.stringify(OLD.budget), "the Budget original is unchanged");
  await page.screenshot({ path: `${OUT}/ledger-budget-after-import.png`, fullPage: true });

  // Pocket view
  await go(page, "/apps/pocket");
  ok(where(page) === "/apps/ledger?view=pocket", `/apps/pocket redirects to /apps/ledger?view=pocket (${where(page)})`);
  await page.locator('[data-ledger-view="pocket"]').waitFor({ timeout: 30000 });
  ok(!(await page.getByText("You have 2 entries saved in Budget").isVisible()), "Budget is not offered twice");
  await page.getByRole("button", { name: "Bring my Pocket entries into Ledger" }).click();
  await page.getByText(/Copied 3 entries from Pocket/).waitFor({ timeout: 10000 });
  ok((await page.locator('[data-stat="Money in"]').textContent()).includes("290,000"), "Pocket view: money in adds Budget and Pocket income");
  ok((await page.locator('[data-stat="Left"]').textContent()).includes("202,000"), "Pocket view: what is left");
  await savedOnce(page);
  ok((await load(page, "ledger")).entries.length === 5, "Ledger now holds 5 copies");
  ok(JSON.stringify(JSON.parse((await loadOld(page, "pocket")).payload)) === JSON.stringify(OLD.pocket), "the Pocket original is unchanged");
  await page.screenshot({ path: `${OUT}/ledger-pocket.png`, fullPage: true });

  // Full ledger view and CSV export
  await page.locator('[role="tab"][data-view="ledger"]').click();
  ok(where(page) === "/apps/ledger", "switching to Ledger drops ?view=");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).first().click()]);
  const csv = readFileSync(await download.path(), "utf8");
  ok(csv.startsWith("Date,What,Category,Amount,In or out") && csv.split("\n").length === 6, "Ledger CSV has 5 rows and an In or out column");
  await page.screenshot({ path: `${OUT}/ledger-full.png`, fullPage: true });

  await go(page, "/discover/budget");
  ok(where(page) === "/discover/ledger?view=budget", `/discover/budget redirects (${where(page)})`);

  // Prices → Catalog
  await go(page, "/apps/price-list");
  ok(where(page) === "/apps/catalog", `/apps/price-list redirects to /apps/catalog (${where(page)})`);
  await page.getByRole("button", { name: "Bring my Prices entries in" }).click();
  await page.getByText("Shea butter").first().waitFor({ timeout: 10000 });
  ok(await page.getByText("Soap", { exact: true }).isVisible(), "the existing Catalog row stays");
  ok(await page.getByRole("button", { name: "Copy list" }).isVisible(), "Catalog has Copy list");
  await savedOnce(page);
  const catalog = await load(page, "catalog");
  ok(catalog.rows.length === 3 && catalog.rows[1].name === "Shea butter" && catalog.imported?.["price-list"], "Catalog saved the copied prices (item → product)");
  ok(JSON.stringify(JSON.parse((await loadOld(page, "price-list")).payload)) === JSON.stringify(OLD["price-list"]), "the Prices original is unchanged");
  await page.screenshot({ path: `${OUT}/catalog.png`, fullPage: true });

  // Crop prices → Farm sales, Price log
  await go(page, "/apps/produce");
  ok(where(page) === "/apps/farm-sales?view=prices", `/apps/produce redirects to the Price log (${where(page)})`);
  ok((await page.locator('[role="tab"][data-view="prices"]').getAttribute("aria-selected")) === "true", "Price log view is open");
  await page.getByRole("button", { name: "Bring my Crop prices entries in" }).click();
  await page.getByText("2026-09-01").waitFor({ timeout: 10000 });
  await savedOnce(page);
  const farm = await load(page, "farm-sales");
  ok(farm.rows.length === 1 && farm.views?.prices?.length === 1, "sales kept, crop price copied into the Price log");
  await page.locator('[role="tab"][data-view="sales"]').click();
  ok(await page.getByText("Musa").isVisible(), "Sales view shows the sale");
  await page.screenshot({ path: `${OUT}/farm-sales.png`, fullPage: true });

  // Terms → Agreement
  await go(page, "/apps/client-terms");
  ok(where(page) === "/apps/service-terms", `/apps/client-terms redirects to /apps/service-terms (${where(page)})`);
  await page.getByRole("button", { name: "Bring my Terms entries in" }).click();
  await page.getByText("These fields already had something").waitFor({ timeout: 10000 });
  ok((await page.getByLabel("Work or job").inputValue()) === OLD["client-terms"].values.job, "the job fills Work or job");
  ok((await page.getByLabel("Revisions").inputValue()) === "3", "revisions copied");
  ok((await page.getByLabel("Client").inputValue()) === "Bola Ltd", "a filled field keeps its value");
  ok(await page.getByText("Ada Studio").isVisible(), "the old client is shown, not lost");
  await savedOnce(page);
  ok(JSON.stringify(JSON.parse((await loadOld(page, "client-terms")).payload)) === JSON.stringify(OLD["client-terms"]), "the Terms original is unchanged");
  await page.screenshot({ path: `${OUT}/agreement.png`, fullPage: true });

  // QR menu → Menu's QR code section
  await go(page, "/apps/qr-menu");
  ok(where(page) === "/apps/menu?view=qr", `/apps/qr-menu redirects to /apps/menu?view=qr (${where(page)})`);
  const qr = page.locator("[data-qr-section]");
  ok(await qr.getByText("does not host your menu").isVisible(), "honest wording: encodes an existing link, no hosting");
  await qr.getByLabel("Menu link").fill("https://example.com/menu.pdf");
  await qr.getByRole("button", { name: "Make code" }).click();
  await qr.locator("img").waitFor({ timeout: 10000 });
  ok(await page.getByText("Jollof rice").isVisible(), "the dish list is on the same page");
  await savedOnce(page);
  ok((await load(page, "menu")).qrLink === "https://example.com/menu.pdf" && (await load(page, "menu")).rows.length === 1, "the link is saved with the menu, dishes kept");
  await page.screenshot({ path: `${OUT}/menu-qr.png`, fullPage: true });

  // Glyph
  await seed(page, "glyph", { source: "" });
  await go(page, "/apps/glyph");
  const box = page.getByLabel("JSON", { exact: true });
  await box.fill('{"b":1,"items":[{"price":5,"name":"pen"},{"price":7}],"a":{"z":true,"y":null}}');
  await page.getByRole("button", { name: "Sort keys" }).click();
  ok((await box.inputValue()).startsWith('{\n  "a": {\n    "y": null'), "Sort keys orders keys A to Z at every level");
  await page.getByRole("button", { name: "Open items" }).click();
  await page.getByRole("button", { name: "Open [1]" }).click();
  await page.locator('[data-node="$.items[1].price"]').click();
  ok((await page.locator("[data-glyph-path]").textContent()) === "$.items[1].price", "clicking a node shows its JSON path");
  await page.screenshot({ path: `${OUT}/glyph-tree.png`, fullPage: true });
  await page.getByRole("button", { name: "Minify" }).click();
  ok(!(await box.inputValue()).includes("\n"), "Minify gives one line");
  await box.fill('{\n  "a": 1,\n  "b": }');
  await page.locator("[data-json-error]").waitFor({ timeout: 5000 });
  ok((await page.locator("[data-json-error]").textContent()).includes("Line 3, column 8"), "Glyph names the line and column of the error");
  const [glyphFile] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).click()]);
  ok(glyphFile.suggestedFilename() === "glyph.json", "Glyph downloads a .json file");

  // Free JSON check
  await go(page, "/apps/json-fmt");
  const jbox = page.getByLabel("JSON", { exact: true });
  await jbox.fill('{\n  "a": 1,\n  "b": }');
  await page.getByRole("button", { name: "Check" }).click();
  ok((await page.locator("[data-json-error]").textContent()).includes("Line 3, column 8"), "free JSON names the line and column too");
  ok((await page.getByRole("button", { name: "Minify" }).count()) === 0, "free JSON stays simple (no minify)");
  await jbox.fill('{"ok":true}');
  await page.getByRole("button", { name: "Format" }).click();
  ok(await page.locator("[data-json-ok]").isVisible(), "free JSON formats valid input");
  await page.screenshot({ path: `${OUT}/json-free.png`, fullPage: true });

  // Phone
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  watch(phone);
  await signInAdmin(phone);
  const p = await phone.newPage();
  for (const [path, name] of [["/apps/ledger?view=pocket", "phone-ledger-pocket"], ["/apps/ledger?view=budget", "phone-ledger-budget"], ["/apps/farm-sales?view=prices", "phone-farm-sales"], ["/apps/menu?view=qr", "phone-menu-qr"], ["/apps/glyph", "phone-glyph"]]) {
    await go(p, path);
    await p.waitForTimeout(800);
    ok(await noSideScroll(p), `${path}: no sideways scroll at 390×844`);
    await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  }
  await phone.close();
  await ctx.close();
}

// ── Free ───────────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  watch(ctx);
  await signUpFree(ctx);
  const page = await ctx.newPage();
  await go(page, "/");
  await seedOld(page, "budget", OLD.budget);
  await seedOld(page, "pocket", OLD.pocket);
  await seedOld(page, "price-list", OLD["price-list"]);
  await go(page, "/apps/budget");
  ok(where(page) === "/apps/ledger?view=budget", `free: /apps/budget redirects to Ledger (${where(page)})`);
  const kept = page.locator("[data-kept-money]");
  await kept.waitFor({ timeout: 30000 });
  ok(await page.getByRole("link", { name: "Start Midnry Pass" }).isVisible(), "free: Ledger is locked behind the Pass");
  ok(await kept.getByText("Budget: 2 entries").isVisible(), "free: saved Budget entries are listed");
  ok(await kept.getByText("Pocket: 3 entries").isVisible(), "free: saved Pocket entries are listed");
  ok((await kept.getByText("(read-only)").count()) === 2, "free: marked read-only");
  ok(await kept.getByText("Salary").isVisible(), "free: entry text visible");
  ok((await kept.locator("button", { hasText: "Bring my" }).count()) === 0 && (await page.getByRole("button", { name: /Bring my/ }).count()) === 0, "free: no import into a locked Ledger");
  ok(await kept.getByText(/included with Midnry Pass/).isVisible(), "free: friendly note about the Pass");
  ok((await kept.getByRole("link", { name: "See Midnry Pass" }).getAttribute("href")) === "/billing", "free: links to /billing");
  const [download] = await Promise.all([page.waitForEvent("download"), kept.getByRole("button", { name: "Export Budget CSV" }).click()]);
  const csv = readFileSync(await download.path(), "utf8");
  ok(csv === "What,Amount,Income or cost\nSalary,250000,income\nRent,80000,cost", "free: Budget CSV export has every saved row");
  ok(await noSideScroll(page), "free: no sideways scroll at 390×844");
  await page.screenshot({ path: `${OUT}/free-ledger-readonly-phone.png`, fullPage: true });
  ok(JSON.stringify(JSON.parse((await loadOld(page, "budget")).payload)) === JSON.stringify(OLD.budget), "free: the Budget original is unchanged");

  // A free merge stays free and imports for a free user.
  await go(page, "/apps/price-list");
  ok(where(page) === "/apps/catalog", "free: /apps/price-list redirects to Catalog");
  await page.getByRole("button", { name: "Bring my Prices entries in" }).click();
  await page.getByText("Black soap").first().waitFor({ timeout: 10000 });
  ok(await noSideScroll(page), "free: Catalog fits the phone");
  await page.screenshot({ path: `${OUT}/free-catalog-phone.png`, fullPage: true });

  // Desktop look of the free read-only state.
  await page.setViewportSize({ width: 1280, height: 900 });
  await go(page, "/apps/pocket");
  await page.locator("[data-kept-money]").waitFor({ timeout: 30000 });
  ok(await page.locator("[data-kept=pocket]").isVisible(), "free: /apps/pocket shows the Pocket entries");
  await page.screenshot({ path: `${OUT}/free-ledger-readonly-desktop.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 5).join(" | ")}` : ""}`);
console.log(fails.length ? `\n${fails.length} failed` : "\nall passed");
process.exit(fails.length ? 1 : 0);
