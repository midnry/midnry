// Writing studio, in a real browser against the local dev server
// (sh scripts/qa/dev-up.sh). No AI key is needed: without one (or past the
// day's limit) every mode writes with Midnry's quick writer, which is what
// this checks. Synthetic accounts only.
//  1. A new free account with an old Outreach document: /apps/cold-email opens
//     the studio in Outreach with the typed boxes brought in; the original stays.
//  2. Write it (quick writer), the draft is saved and still there after reload.
//  3. Copy all and Download .txt give the written text.
//  4. Free: Word download and house style are locked, on screen and on the server.
//  5. The QA admin (Pass extras open): Word file is a real zip, house style saves.
//  6. Old /discover link, mode switching, phone 390×844 with no sideways scroll.
//  7. No page errors.
// Usage: node scripts/qa/studio.mjs [outdir]
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/studio";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ADMIN = "qa-admin@example.test";
const email = `qa-studio-${Date.now()}@example.test`;
const password = "studio-qa-pass-1";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

function watch(ctx) {
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
}

async function newCtx(viewport = { width: 1280, height: 900 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  watch(ctx);
  return ctx;
}

async function signInAdmin(ctx) {
  for (const pw of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password: pw, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) return;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password: pw } });
    if (r.ok()) return;
  }
  throw new Error("Could not sign in as the local QA admin");
}

/** A new free account, signed in (the sign-up API the register form uses). */
async function register(page) {
  const up = await page.context().request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email, password, name: "QA Writer", ageConfirmed: true } });
  if (!up.ok()) throw new Error(`Could not create the free account (${up.status()})`);
  await page.goto(`${BASE}/apps`, { waitUntil: "networkidle", timeout: 120000 });
}

/** The app's own server functions, called from inside a page (dev server only). */
async function call(page, module, name, data) {
  return page.evaluate(
    async ({ module, name, data }) => {
      const m = await import(module);
      return m[name](data === undefined ? undefined : { data });
    },
    { module, name, data },
  );
}

async function studioReady(page) {
  await page.locator("[data-studio]").waitFor({ timeout: 90000 });
  await page.locator("[data-draft-id]").waitFor({ timeout: 60000 });
}

async function noSideways(page, label) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  ok(scroll <= client + 1, `${label}: no sideways scroll (${scroll} vs ${client})`);
}

// ---------------------------------------------------------------- 1. Free account, old link, brought-in boxes
const ctx = await newCtx();
const page = await ctx.newPage();
await register(page);
const OLD_VALUES = { name: "Eunice", role: "videographer", them: "Ruth, event planner", offer: "film and edit videos of your events" };
const seeded = await call(page, "/src/lib/cove.functions.ts", "saveDoc", { slug: "cold-email", payload: JSON.stringify({ values: OLD_VALUES }) });
ok(seeded.ok, "an old Outreach document is saved under its old name");

await page.goto(`${BASE}/apps/cold-email`, { waitUntil: "networkidle", timeout: 120000 });
await studioReady(page);
ok(/\/apps\/write\?view=outreach$/.test(page.url()), `old link opens the studio in Outreach (${page.url()})`);
ok(await page.getByRole("heading", { name: "Writing studio", level: 1 }).isVisible(), "the studio's heading");
ok((await page.locator("[data-brought-in]").getAttribute("data-brought-in")) === "1", "says one saved form was brought in");
ok((await page.locator("[data-mode-current]").getAttribute("data-mode-current")) === "outreach", "Outreach mode is open");
ok((await page.getByLabel("Your name").inputValue()) === "Eunice", "the old boxes are filled in");
ok((await page.getByLabel("Who you're writing to").inputValue()) === "Ruth, event planner", "every old box is there");
ok((await page.locator("[data-draft-list] button").first().innerText()).includes("Outreach (brought in)"), "the draft is named (brought in)");
const original = await call(page, "/src/lib/merged-docs.functions.ts", "loadMergedDoc", "cold-email");
ok(original.ok && JSON.parse(original.payload).values.name === "Eunice", "the original document is kept, unchanged");
const allowance = await page.locator("[data-allowance]").innerText();
ok(/quick writer|AI writes? left today|no daily limit/.test(allowance), `the AI allowance is shown (${allowance.slice(0, 70)}…)`);
await page.screenshot({ path: `${OUT}/desktop-brought-in.png`, fullPage: true });

// ---------------------------------------------------------------- 2. Write, save, reload
await page.locator("[data-write]").click();
await page.locator("[data-output]").waitFor({ timeout: 60000 });
const by = await page.locator("[data-written-by]").getAttribute("data-written-by");
ok(by === "quick" || by === "ai", `a draft was written (by ${by})`);
const label = await page.locator("[data-written-by]").innerText();
ok(by === "ai" ? /Written by AI/.test(label) : /quick writer/.test(label), `labelled with who wrote it (${label.slice(0, 60)}…)`);
const firstPiece = await page.locator("[data-output] textarea").first().inputValue();
ok(/Ruth/.test(firstPiece), "the email greets Ruth");
await page.locator('[data-save="saved"]').waitFor({ timeout: 30000 });
ok(true, "the draft saved");
const draftId = await page.locator("[data-draft-id]").getAttribute("data-draft-id");
await page.reload({ waitUntil: "networkidle" });
await studioReady(page);
ok((await page.locator("[data-draft-id]").getAttribute("data-draft-id")) === draftId, "the same draft opens after reload");
ok((await page.locator("[data-output] textarea").first().inputValue()) === firstPiece, "the written text is still there after reload");
ok((await page.locator("[data-written-by]").getAttribute("data-written-by")) === by, "and still says who wrote it");

// Edit the text: the edit is saved too.
const edited = `${firstPiece}\n\nP.S. Edited by QA.`;
await page.locator("[data-output] textarea").first().fill(edited);
await page.locator('[data-save="saved"]').waitFor({ timeout: 30000 });
await page.reload({ waitUntil: "networkidle" });
await studioReady(page);
ok((await page.locator("[data-output] textarea").first().inputValue()) === edited, "an edit to the written text is kept");

// ---------------------------------------------------------------- 3. Copy and download
await page.getByRole("button", { name: "Copy all" }).click();
const clip = await page.evaluate(() => navigator.clipboard.readText());
ok(clip.includes("P.S. Edited by QA.") && clip.includes("Email 1"), "Copy all copies every email, with the edit");
const [download] = await Promise.all([page.waitForEvent("download"), page.locator('[data-download="txt"]').click()]);
const text = readFileSync(await download.path(), "utf8");
ok(/\.txt$/.test(download.suggestedFilename()), `downloads a .txt (${download.suggestedFilename()})`);
ok(text === clip, "the .txt holds the same text");

// ---------------------------------------------------------------- 4. Free: Pass extras locked, on screen and on the server
ok(await page.locator('[data-download="docx-locked"]').isDisabled(), "Word download is locked for a free account");
ok(await page.locator('[data-locked="docx"]').isVisible(), "says Word download comes with Midnry Pass");
ok((await page.locator("[data-house-style]").getAttribute("data-house-style")) === "locked", "house style is locked");
ok(await page.locator('[data-locked="style"]').isVisible(), "says house style comes with Midnry Pass");
ok((await page.locator("[data-history]").getAttribute("data-history")) === "1/20", "free history: 20 per mode");
const docxRes = await call(page, "/src/lib/studio.functions.ts", "draftDocx", { title: "x", pieces: [{ title: "a", text: "b" }] });
ok(!docxRes.ok && docxRes.error === "pass", "the server refuses the Word file without the Pass");
const styleRes = await call(page, "/src/lib/studio.functions.ts", "saveStudioSettings", { style: { tone: "formal", use: "", avoid: "cheap", signoff: "" } });
ok(!styleRes.ok && styleRes.error === "pass", "the server refuses a house style without the Pass");
await page.screenshot({ path: `${OUT}/desktop-free-written.png`, fullPage: true });

// Mode switching keeps ?view= in step, and a new mode starts empty.
await page.locator('[data-mode="captions"]').click();
await page.waitForURL(/view=captions/);
await studioReady(page);
ok((await page.locator("[data-mode-current]").getAttribute("data-mode-current")) === "captions", "Captions mode opens");
ok((await page.locator("[data-history]").getAttribute("data-history")) === "0/20", "Captions has its own history");
await page.locator('[data-mode="soap"]').click();
await page.waitForURL(/view=soap/);
ok(await page.getByText("Do not put a real patient's identifying details in here.").isVisible(), "SOAP notes keeps its warning");
ok(!(await page.locator("[data-soap-history]").isChecked()), "SOAP history is off by default");
ok((await page.locator("[data-history]").getAttribute("data-history")) === "0/1", "SOAP keeps one note while history is off");
await page.locator('[data-mode="contract"]').click();
await page.waitForURL(/view=contract/);
ok(await page.locator("[data-review-note]").isVisible(), "Contract keeps its 'not professionally reviewed' note");

// Old discover link.
await page.goto(`${BASE}/discover/soap-note`, { waitUntil: "networkidle" });
ok(/\/discover\/write\?view=soap$/.test(page.url()), `old discover link goes to the studio page (${page.url()})`);
ok((await page.locator("[data-merged-note]").innerText()).includes("SOAP notes is now a mode of the Writing studio"), "and says where it went");

// ---------------------------------------------------------------- 6. Phone
const phone = await newCtx({ width: 390, height: 844 }, true);
const cookies = await ctx.cookies();
await phone.addCookies(cookies);
const p2 = await phone.newPage();
await p2.goto(`${BASE}/apps/write?view=outreach`, { waitUntil: "networkidle", timeout: 120000 });
await studioReady(p2);
ok(await p2.locator("[data-mode-select]").isVisible(), "phone: modes are one menu");
await noSideways(p2, "phone studio");
await p2.screenshot({ path: `${OUT}/phone-studio.png`, fullPage: true });
await p2.locator("[data-mode-select]").selectOption("digest");
await p2.waitForURL(/view=digest/);
await noSideways(p2, "phone Digest");
await p2.goto(`${BASE}/discover/write`, { waitUntil: "networkidle" });
await noSideways(p2, "phone product page");
await p2.screenshot({ path: `${OUT}/phone-product.png`, fullPage: false });
await phone.close();
await ctx.close();

// ---------------------------------------------------------------- 5. Admin: Pass extras open
const admin = await newCtx();
await signInAdmin(admin);
const a = await admin.newPage();
await a.goto(`${BASE}/apps/write?view=letters`, { waitUntil: "networkidle", timeout: 120000 });
await studioReady(a);
ok((await a.locator("[data-house-style]").getAttribute("data-house-style")) === "open", "admin: house style is open");
ok(/\/500$/.test(await a.locator("[data-history]").getAttribute("data-history")), "admin: 500 drafts per mode");
await a.locator("#house-style").scrollIntoViewIfNeeded();
await a.getByLabel("Words to avoid, separated by commas").fill("deposit");
await a.getByRole("button", { name: "Save house style" }).click();
await a.getByText("House style saved").waitFor({ timeout: 20000 });
ok(true, "admin: house style saved");
await a.getByLabel("Your name and address").fill("Ada Obi");
await a.getByLabel("Who it is to").fill("The Manager, Bright Homes");
await a.getByLabel("Subject").fill("Refund of deposit");
await a.getByLabel("What you are asking for").fill("kindly refund my deposit");
await a.locator("[data-write]").click();
const wrote = await a.locator("[data-output]").waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
if (!wrote) {
  const missing = await a.getByRole("alert").first().innerText().catch(() => "");
  ok(false, `admin: Letters wrote a draft (${missing})`);
} else {
  ok(true, "admin: Letters wrote a draft");
  ok(await a.locator("[data-style-check]").isVisible(), "the house style check flags a word to avoid (deposit)");
  const [doc] = await Promise.all([a.waitForEvent("download"), a.locator('[data-download="docx"]').click()]);
  const bytes = readFileSync(await doc.path());
  ok(/\.docx$/.test(doc.suggestedFilename()) && bytes[0] === 0x50 && bytes[1] === 0x4b, `admin: a .docx zip downloads (${doc.suggestedFilename()}, ${bytes.length} bytes)`);
  ok(bytes.includes(Buffer.from("word/document.xml")), "the .docx holds word/document.xml");
}
await a.screenshot({ path: `${OUT}/desktop-pass-extras.png`, fullPage: true });
// Put the admin's house style back to empty so other runs start clean.
await call(a, "/src/lib/studio.functions.ts", "saveStudioSettings", { style: { tone: "", use: "", avoid: "", signoff: "" } });
await admin.close();

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 5).join(" | ")}` : ""}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
