// Save reliability in a real browser against the local dev server
// (sh scripts/qa/dev-up.sh). Signs in as the local QA admin like
// scripts/qa/apps-phase1.mjs. Synthetic data only. Covers:
//  1. two tabs editing Ledger: the conflict panel appears; Review shows both;
//     Copy and Download give my version;
//  2. Keep my version (explicit, with a warning) saves it over the newer one;
//  3. Use the newer saved version offers a download first, then discards mine;
//  4. a conflict, then reload: the unsaved copy is offered back and restored;
//  5. a failed save (request blocked), tab closed, reopened: recovery offered;
//  6. an outdated client's revision-less save is refused with the refresh
//     message, the row is unchanged, and the copy is kept and offered back;
//  7. Invoice tax "7,5" shows the dot message and no total;
//  8. no page errors.
// Usage: node scripts/qa/save-conflict.mjs [outdir]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/reliability";
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
  for (const password of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) return;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password } });
    if (r.ok()) return;
  }
  throw new Error("Could not sign in as the local QA admin");
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
ctx.on("page", (page) => {
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
  });
});
await signIn(ctx);

/** Save through the app's own server function, on the current revision. */
async function seed(page, slug, doc) {
  const res = await page.evaluate(async ({ slug, payload }) => {
    const m = await import("/src/lib/cove.functions.ts");
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
  return res.ok ? { doc: res.payload ? JSON.parse(res.payload) : null, revision: res.revision } : null;
}
const labels = (doc) => (doc?.entries ?? []).map((e) => e.label);
async function open(page, slug = "ledger") {
  await page.goto(`${BASE}/apps/${slug}`, { waitUntil: "networkidle", timeout: 120000 });
}
async function addExpense(page, what, amount) {
  await page.getByLabel("What").first().fill(what);
  await page.getByLabel("Amount").first().fill(amount);
  await page.getByRole("button", { name: "Add expense" }).click();
}
async function saved(page) {
  await page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
}
const panel = (page, kind) => page.locator(`[data-doc-recovery="${kind}"]`);
/** No recovery offer shows within a short wait. */
async function noOffer(page) {
  await page.waitForTimeout(2500);
  return (await page.locator("[data-doc-recovery]").count()) === 0;
}
async function readDownload(page, click) {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), click()]);
  return { name: download.suggestedFilename(), text: readFileSync(await download.path(), "utf8") };
}
/** The recovery copies this browser holds (IndexedDB, falling back to sessionStorage). */
async function recoveryCopies(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("midnry-recovery", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("docs");
        req.onsuccess = () => {
          const all = req.result.transaction("docs", "readonly").objectStore("docs").getAll();
          all.onsuccess = () => resolve(all.result.map((r) => ({ slug: r.slug, reason: r.reason, payload: r.payload })));
          all.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      }),
  );
}

const start = await ctx.newPage();
await open(start);
const month = new Date().toISOString().slice(0, 10);
const entry = (id, label, cents) => ({ id, label, cents, category: "Food", date: month });
await seed(start, "ledger", { entries: [entry("qa-base", "Synthetic base entry", 1000)], currency: "NGN" });
await start.close();

// ── 1. Two tabs: the conflict panel, Review, Copy and Download ──────────────
const tabA = await ctx.newPage();
const tabB = await ctx.newPage();
await open(tabA);
await open(tabB);
await addExpense(tabA, "From tab A", "10");
await saved(tabA);
await addExpense(tabB, "From tab B", "20");
const conflictB = panel(tabB, "conflict");
await conflictB.waitFor({ timeout: 30000 });
ok(await conflictB.getByText("was changed in another tab or device").isVisible(), "the conflict panel says another tab saved first");
ok(labels((await load(tabB, "ledger")).doc).includes("From tab A") && !labels((await load(tabB, "ledger")).doc).includes("From tab B"), "nothing was overwritten silently");
ok((await recoveryCopies(tabB)).some((c) => c.slug === "ledger" && c.reason === "conflict" && c.payload.includes("From tab B")), "my unsaved version is kept in this browser");
await tabB.screenshot({ path: `${OUT}/01-conflict-panel.png` });
await conflictB.getByRole("button", { name: "Review both" }).click();
const mineBox = conflictB.getByRole("region", { name: "Your version (not saved)" });
const savedBox = conflictB.getByRole("region", { name: "Saved version" });
await savedBox.getByText("From tab A").waitFor({ timeout: 15000 });
ok((await mineBox.innerText()).includes("From tab B") && !(await mineBox.innerText()).includes("From tab A"), "Review shows my version");
ok((await savedBox.innerText()).includes("From tab A"), "Review shows the newer saved version");
await conflictB.getByRole("button", { name: "Copy mine" }).click();
await tabB.waitForTimeout(500);
const clip = await tabB.evaluate(() => navigator.clipboard.readText());
ok(clip.includes("From tab B") && !clip.includes("From tab A"), "Copy mine copies my version");
const dl = await readDownload(tabB, () => conflictB.getByRole("button", { name: "Download mine (.json)" }).click());
ok(/^midnry-ledger-my-version-.*\.json$/.test(dl.name), `Download is a .json file (${dl.name})`);
ok(labels(JSON.parse(dl.text)).includes("From tab B") && !labels(JSON.parse(dl.text)).includes("From tab A"), "Download gives my version");
await tabB.screenshot({ path: `${OUT}/02-review-both.png` });

// ── 2. Keep my version ──────────────────────────────────────────────────────
await conflictB.getByRole("button", { name: "Back to choices" }).click();
await conflictB.getByRole("button", { name: "Keep my version" }).click();
ok(await conflictB.getByText("Changes made in the other tab or device will be lost").isVisible(), "keeping mine warns first");
await tabB.screenshot({ path: `${OUT}/03-keep-mine-warning.png` });
await conflictB.getByRole("button", { name: "Replace it with my version" }).click();
await conflictB.waitFor({ state: "detached", timeout: 15000 });
await saved(tabB);
let server = await load(tabB, "ledger");
ok(labels(server.doc).includes("From tab B") && !labels(server.doc).includes("From tab A"), "Keep my version saved mine over the newer one");
await tabB.waitForTimeout(800);
ok(!(await recoveryCopies(tabB)).some((c) => c.slug === "ledger"), "the recovery copy is cleared once saved");

// ── 3. Use the newer saved version (tab A is now the stale one) ─────────────
await addExpense(tabA, "Stale tab A again", "30");
const conflictA = panel(tabA, "conflict");
await conflictA.waitFor({ timeout: 30000 });
await conflictA.getByRole("button", { name: "Use the newer saved version" }).click();
ok(await conflictA.getByText("Download it first if you might need it").isVisible(), "using the saved version offers a download first");
const dlA = await readDownload(tabA, () => conflictA.getByRole("button", { name: "Download my version" }).click());
ok(labels(JSON.parse(dlA.text)).includes("Stale tab A again"), "the offered download is my version");
await tabA.screenshot({ path: `${OUT}/04-use-saved-download.png` });
await conflictA.getByRole("button", { name: "Discard mine, use the saved version" }).click();
await conflictA.waitFor({ state: "detached", timeout: 15000 });
await tabA.getByText("From tab B").first().waitFor({ timeout: 15000 });
ok((await tabA.getByText("Stale tab A again").count()) === 0, "my version was discarded from the page");
server = await load(tabA, "ledger");
ok(labels(server.doc).includes("From tab B") && !labels(server.doc).includes("Stale tab A again"), "the saved version is untouched");
await addExpense(tabA, "After using saved", "5");
await saved(tabA);
ok(labels((await load(tabA, "ledger")).doc).includes("After using saved"), "saving continues from the saved version");
await tabA.reload({ waitUntil: "networkidle" });
ok(await noOffer(tabA), "nothing is offered after a resolved conflict");

// ── 4. Conflict, reload, recovery offered and restored ──────────────────────
await tabB.reload({ waitUntil: "networkidle" });
await addExpense(tabA, "Tab A before reload test", "6");
await saved(tabA);
await addExpense(tabB, "Unsaved before reload", "7");
await panel(tabB, "conflict").waitFor({ timeout: 30000 });
await tabB.waitForTimeout(500);
await tabB.reload({ waitUntil: "networkidle" });
const offer = panel(tabB, "recovered");
await offer.waitFor({ timeout: 15000 });
ok(await offer.getByText("You have unsaved changes in").isVisible(), "after a reload the unsaved copy is offered");
await tabB.screenshot({ path: `${OUT}/05-recovered-after-reload.png` });
await offer.getByRole("button", { name: "Review both" }).click();
await offer.getByRole("region", { name: "Saved version" }).getByText("Tab A before reload test").waitFor({ timeout: 15000 });
ok((await offer.getByRole("region", { name: "Your version (not saved)" }).innerText()).includes("Unsaved before reload"), "the offer shows my unsaved version");
await offer.getByRole("button", { name: "Back to choices" }).click();
await offer.getByRole("button", { name: "Keep my version" }).click();
ok(await offer.getByText("will replace what is saved now").isVisible(), "restoring warns first");
await offer.getByRole("button", { name: "Replace it with my version" }).click();
await offer.waitFor({ state: "detached", timeout: 15000 });
await saved(tabB);
await tabB.getByText("Unsaved before reload").first().waitFor({ timeout: 15000 });
ok(labels((await load(tabB, "ledger")).doc).includes("Unsaved before reload"), "the recovered version was saved");
await tabB.reload({ waitUntil: "networkidle" });
ok(await noOffer(tabB), "nothing is offered once restored");
await tabA.close();

// ── 5. Failed save, close, reopen ──────────────────────────────────────────
const tabC = await ctx.newPage();
await open(tabC);
const block = (route) => (route.request().method() === "POST" ? route.abort("failed") : route.continue());
await tabC.route("**/_serverFn/**", block);
await addExpense(tabC, "Typed while offline", "8");
await tabC.getByText("Not saved, retrying…").first().waitFor({ timeout: 15000 });
await tabC.waitForTimeout(800);
ok((await recoveryCopies(tabC)).some((c) => c.slug === "ledger" && c.reason === "retrying" && c.payload.includes("Typed while offline")), "a failed save keeps a recovery copy");
await tabC.screenshot({ path: `${OUT}/06-retrying.png` });
await tabC.close({ runBeforeUnload: false });
const tabD = await ctx.newPage();
await open(tabD);
ok(!labels((await load(tabD, "ledger")).doc).includes("Typed while offline"), "the blocked change never reached the server");
const offerD = panel(tabD, "recovered");
await offerD.waitFor({ timeout: 15000 });
ok(true, "reopening after closing offers the unsaved change");
await tabD.screenshot({ path: `${OUT}/07-recovered-after-close.png` });
await offerD.getByRole("button", { name: "Keep my version" }).click();
await offerD.getByRole("button", { name: "Replace it with my version" }).click();
await offerD.waitFor({ state: "detached", timeout: 15000 });
await saved(tabD);
ok(labels((await load(tabD, "ledger")).doc).includes("Typed while offline"), "the change made offline is saved once restored");

// ── 6. An outdated client's save without a revision ───────────────────────
await tabD.reload({ waitUntil: "networkidle" });
const before = await load(tabD, "ledger");
// Act like an outdated tab: strip baseRevision from this page's save requests.
const legacy = async (route) => {
  const req = route.request();
  const fn = Buffer.from(new URL(req.url()).pathname.split("/").pop(), "base64url").toString("utf8");
  if (req.method() !== "POST" || !fn.includes("saveDoc")) return route.continue();
  const body = JSON.parse(req.postData() || "{}");
  const strip = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.p?.k && Array.isArray(node.p.k)) {
      const at = node.p.k.indexOf("baseRevision");
      if (at >= 0) {
        node.p.k.splice(at, 1);
        node.p.v.splice(at, 1);
      }
    }
    for (const value of Object.values(node)) strip(value);
  };
  strip(body);
  return route.continue({ postData: JSON.stringify(body) });
};
await tabD.route("**/_serverFn/**", legacy);
await addExpense(tabD, "From an outdated tab", "9");
const refresh = panel(tabD, "refresh");
await refresh.waitFor({ timeout: 30000 });
ok(await refresh.getByText("Midnry was updated, refresh to keep saving").isVisible(), "the outdated save is refused with the refresh message");
ok(await tabD.getByText("Midnry was updated, refresh to keep saving.").first().isVisible(), "the save status says so too");
const after = await load(tabD, "ledger");
ok(after.revision === before.revision && JSON.stringify(after.doc) === JSON.stringify(before.doc), "the saved row is unchanged");
ok((await recoveryCopies(tabD)).some((c) => c.slug === "ledger" && c.reason === "refresh" && c.payload.includes("From an outdated tab")), "the unsaved copy is kept");
await tabD.screenshot({ path: `${OUT}/08-refresh-required.png` });
await tabD.unroute("**/_serverFn/**", legacy);
await Promise.all([tabD.waitForEvent("load", { timeout: 60000 }), refresh.getByRole("button", { name: "Refresh now" }).click()]);
await tabD.waitForLoadState("networkidle");
const offerE = panel(tabD, "recovered");
await offerE.waitFor({ timeout: 15000 });
ok(true, "after refreshing, the kept copy is offered back");
await offerE.getByRole("button", { name: "Discard it and keep what’s saved" }).click();
await offerE.getByRole("button", { name: "Discard mine, use the saved version" }).click();
await offerE.waitFor({ state: "detached", timeout: 15000 });
await tabD.waitForTimeout(500);
ok(!(await recoveryCopies(tabD)).some((c) => c.slug === "ledger"), "discarding clears the copy");

// ── 7. Invoice tax "7,5" ───────────────────────────────────────────────────
await seed(tabD, "invoice", {
  from: "Synthetic Studio",
  to: "Synthetic Client\nclient@example.test",
  number: "0007",
  issued: "2026-10-01",
  due: "",
  notes: "",
  currency: "USD",
  taxPercent: "7.5",
  lines: [{ id: "l1", description: "Design", qty: "2", rate: "100" }],
});
await open(tabD, "invoice");
const sheet = tabD.locator("article.invoice-sheet");
await sheet.locator("[data-total]").first().waitFor({ timeout: 30000 });
await tabD.getByLabel("Tax percent").fill("7,5");
await tabD.getByText("Use a dot for decimals, e.g. 7.5").first().waitFor({ timeout: 10000 });
ok(true, "tax “7,5” shows the dot message");
ok((await sheet.locator("[data-total]").count()) === 0 && (await sheet.getByTestId("invoice-no-total").isVisible()), "and no total");
await tabD.screenshot({ path: `${OUT}/09-invoice-tax-comma.png` });
await tabD.getByLabel("Tax percent").fill("7.5");
await sheet.locator("[data-total]").first().waitFor({ timeout: 10000 });
ok((await sheet.locator("[data-total]").first().innerText()).includes("215.00"), "tax “7.5” gives the total as before ($215.00)");
await saved(tabD).catch(() => {});

ok(errors.length === 0, `no page errors (${errors.slice(0, 5).join(" | ")})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
