// Study space in a real browser against the local dev server (sh scripts/qa/dev-up.sh).
// A fresh free account (like scripts/qa/account-delete.mjs) and the local QA admin
// (Pass tools, like scripts/qa/apps-phase1.mjs). Checks:
//  1. an old Lab / Quiz link opens the Study space with the saved page copied in,
//     and the old documents are unchanged,
//  2. make a deck, review cards, reload: progress kept,
//  3. a quiz score is saved,
//  4. citations persist across a reload,
//  5. the free user can't make a share link (screen and server) but can open one,
//     and save a copy; signed out, the link asks to sign in,
//  6. the owner turns the link off and it stops opening,
//  7. phone 390×844 with no sideways overflow, and no page errors.
// Also writes the product-page shots to public/shots/study/{desktop,phone}.jpg.
// Usage: node scripts/qa/study.mjs [outdir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/study";
mkdirSync(OUT, { recursive: true });
mkdirSync("public/shots/study", { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ADMIN = "qa-admin@example.test";
const stampId = Date.now();
const email = `qa-study-${stampId}@example.test`;
const password = "correct-horse-study-42";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

function watch(ctx) {
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
}

async function adminCtx(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  watch(ctx);
  for (const pw of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password: pw, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) return ctx;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password: pw } });
    if (r.ok()) return ctx;
  }
  throw new Error("Could not sign in as the local QA admin");
}

async function freeCtx(viewport = { width: 1280, height: 900 }, mobile = false, create = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  watch(ctx);
  const path = create ? "sign-up" : "sign-in";
  const res = await ctx.request.post(`${BASE}/api/auth/${path}/email`, { headers, data: create ? { email, password, name: "QA Student", ageConfirmed: true } : { email, password } });
  if (!res.ok()) throw new Error(`free account ${path}: ${res.status()}`);
  return ctx;
}

async function call(page, mod, fn, data) {
  return page.evaluate(
    async ({ mod, fn, data }) => {
      const m = await import(mod);
      return m[fn](data === undefined ? undefined : { data });
    },
    { mod, fn, data },
  );
}
const saveDoc = (page, slug, doc) => call(page, "/src/lib/cove.functions.ts", "saveDoc", { slug, payload: JSON.stringify(doc) });
const loadDoc = async (page, slug) => {
  const res = await call(page, "/src/lib/cove.functions.ts", "loadDoc", slug);
  return res.ok && res.payload ? JSON.parse(res.payload) : null;
};
const go = (page, path) => page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
const saved = (page) => page.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// ── Fresh free account with old Lab and Quiz documents ──────────────────────
const free = await freeCtx(undefined, false, true);
const page = await free.newPage();
await go(page, "/");
const LAB = { values: { title: `Titration ${stampId}`, aim: "Find the concentration", method: "Burette", results: "12.1 mL", end: "0.1 M" } };
const QUIZ = { values: { topic: "Cells", questions: "1. What is a cell?\nAnswer: the unit of life" } };
ok((await saveDoc(page, "lab-notes", LAB)).ok, "seeded an old Lab page");
ok((await saveDoc(page, "quiz-maker", QUIZ)).ok, "seeded an old Quiz page");

// 1. Old link → Study space with the data copied in.
await go(page, "/apps/lab-notes");
ok(/\/apps\/study\?view=notes$/.test(page.url()), `old Lab link redirects to the Notes tab (${page.url()})`);
await page.locator("[data-import-notice]").waitFor({ timeout: 30000 });
ok(/Lab write-up and Quiz were copied in/.test(await page.locator("[data-import-notice]").textContent()), "says what was copied in, and that the originals stay");
ok(await page.getByText(`Titration ${stampId}`).isVisible(), "the old lab page is a write-up in the Notes tab");
await saved(page);
await page.screenshot({ path: `${OUT}/migrated-notes.png`, fullPage: true });
await page.getByText(`Titration ${stampId}`).click();
ok((await page.getByLabel("Results").inputValue()) === "12.1 mL", "the write-up keeps every part");
const study1 = await loadDoc(page, "study");
ok(study1?.quizzes?.some((q) => q.title === "Cells (brought in)" && q.notes === QUIZ.values.questions), "the old quiz is a draft quiz, text kept as written");
ok(JSON.stringify(await loadDoc(page, "lab-notes")) === JSON.stringify(LAB), "old Lab document unchanged");
ok(JSON.stringify(await loadDoc(page, "quiz-maker")) === JSON.stringify(QUIZ), "old Quiz document unchanged");
for (const [old, view] of [["anatomy", "cards"], ["clinic-quiz", "practice"], ["citations", "references"], ["legal-cite", "law"], ["formula-sheet", "formulas"]]) {
  await go(page, `/apps/${old}`);
  ok(page.url().endsWith(`/apps/study?view=${view}`), `/apps/${old} → ?view=${view}`);
}
ok((await page.locator("#formulas-heading").count()) === 1, "Formulas link opens the formula sheet");
await go(page, "/discover/quiz-maker");
ok(page.url().endsWith("/discover/study?view=practice"), "old product page redirects too");
await go(page, "/apps/quiz-maker");
ok(await page.getByText("Cells (brought in)").isVisible(), "the brought-in quiz is listed under Practice");
await go(page, "/apps/study");
const again = await loadDoc(page, "study");
ok(again.notes.length === 1 && again.quizzes.length === 1, "visiting again copies nothing twice");

// 2. Make a deck, review, reload.
await go(page, "/apps/study");
await page.getByRole("button", { name: "New deck" }).click();
await page.getByLabel("Deck name").fill("QA bones");
await page.getByLabel("Front 1").fill("Femur");
await page.getByLabel("Back 1").fill("Thigh bone");
await page.getByRole("button", { name: "Add a card" }).click();
await page.getByLabel("Front 2").fill("Tibia");
await page.getByLabel("Back 2").fill("Shin bone");
await saved(page);
await page.getByRole("button", { name: /^Review/ }).first().click();
await page.getByRole("button", { name: "Show the answer" }).first().click();
await page.getByRole("button", { name: "I knew it" }).click();
await page.getByRole("button", { name: "Show the answer" }).first().click();
await page.getByRole("button", { name: "Again" }).click();
ok((await page.getByText("1 knew it · 1 again").count()) > 0, "the session counts knew it and again");
await page.screenshot({ path: `${OUT}/review.png` });
await saved(page);
await page.reload({ waitUntil: "networkidle" });
const deckDoc = await loadDoc(page, "study");
const qa = deckDoc.decks.find((d) => d.title === "QA bones");
const progress = deckDoc.progress[qa.id] ?? {};
const femur = qa.cards.find((c) => c.front === "Femur");
const tibia = qa.cards.find((c) => c.front === "Tibia");
ok(progress[femur.id]?.box === 1 && progress[tibia.id]?.box === 0, "progress saved: Femur known (box 1), Tibia again (box 0)");
await page.getByRole("button", { name: "QA bones" }).first().waitFor();
const listText = await page.locator("[data-deck-list]").textContent();
ok(/2 cards · 1 to review today · 1 known/.test(listText), `after reload the deck shows its progress (${listText.match(/2 cards[^R]*/)?.[0]})`);
await page.screenshot({ path: `${OUT}/cards.png`, fullPage: true });

// 3. A quiz score is saved.
await page.getByRole("tab", { name: "Practice" }).click();
const cases = page.locator('[data-starter="clinic-quiz"]');
ok(await cases.locator("[data-review-note]").isVisible(), "the Cases sample shows its 'not professionally reviewed' note");
await cases.getByRole("button", { name: "Start" }).click();
for (let i = 0; i < 4; i++) {
  await page.locator("[data-choice]").first().click();
  await page.getByRole("button", { name: /Next question|See my score/ }).click();
}
const score = (await page.locator("[data-quiz-score]").textContent()).trim();
ok(/^\d of 4$/.test(score), `quiz finished with a score (${score})`);
await saved(page);
await page.screenshot({ path: `${OUT}/quiz-score.png` });
await page.reload({ waitUntil: "networkidle" });
const quizDoc = await loadDoc(page, "study");
ok(quizDoc.attempts.some((a) => a.quizId === "clinic-quiz" && `${a.score} of ${a.total}` === score), "the attempt is saved");
ok((await page.locator('[data-starter="clinic-quiz"]').textContent()).includes(`last score ${score}`), "the score shows after a reload");

// 4. Citations persist.
await page.getByRole("tab", { name: "References" }).click();
await page.getByLabel("Author").fill("Adebayo, T.");
await page.getByLabel("Year", { exact: true }).fill("2024");
await page.getByLabel("Title", { exact: true }).fill(`Study habits ${stampId}`);
await page.getByLabel("Source").fill("Lagos Journal");
await page.getByRole("button", { name: "Add to my list" }).click();
await page.getByLabel("Style").selectOption("Law");
await page.getByLabel("Parties").fill("Ade v Bello");
await page.getByLabel("Year", { exact: true }).fill("2024");
await page.getByLabel("Volume").fill("5");
await page.getByRole("textbox", { name: "Report", exact: true }).fill("NWLR");
await page.getByLabel("Court, optional").fill("SC");
await page.getByRole("button", { name: "Add to my list" }).click();
await saved(page);
await page.goto(`${BASE}/apps/tasks`, { waitUntil: "networkidle" });
await go(page, "/apps/study?view=references");
const refs = await page.locator("[data-reference-list]").allTextContents();
ok(refs.join(" ").includes(`Adebayo, T. (2024). Study habits ${stampId}. Lagos Journal.`), "the APA reference is still there after leaving");
ok(refs.join(" ").includes("Ade v Bello (2024) 5 NWLR, SC"), "the law report is in the table of cases");
const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download .txt" }).click()]);
ok(download.suggestedFilename() === "references.txt", "references download as .txt");
await page.screenshot({ path: `${OUT}/references.png`, fullPage: true });

// 5. The free user can't make a share link.
await go(page, "/apps/study");
await page.getByRole("button", { name: "QA bones" }).first().click();
ok(await page.locator("[data-share-locked]").isVisible(), "free account: the share panel says Midnry Pass is needed");
ok((await page.getByRole("button", { name: "Make a share link" }).count()) === 0, "free account: no Make a share link button");
const refused = await call(page, "/src/lib/study.functions.ts", "shareStudyItem", { kind: "deck", item: qa });
ok(refused.ok === false && refused.error === "pass", "free account: the server refuses to make a link");
await page.screenshot({ path: `${OUT}/free-share-locked.png`, fullPage: true });

// Admin (Pass tools) makes a link.
const admin = await adminCtx();
const apage = await admin.newPage();
await go(apage, "/apps/study");
await apage.getByRole("button", { name: "New deck" }).click();
const shareTitle = `Shared deck ${stampId}`;
await apage.getByLabel("Deck name").fill(shareTitle);
await apage.getByLabel("Front 1").fill("Mitochondria");
await apage.getByLabel("Back 1").fill("Makes ATP");
await saved(apage);
await apage.getByRole("button", { name: "Make a share link" }).click();
await apage.locator("[data-share-link]").waitFor({ timeout: 30000 });
const link = await apage.locator("[data-share-link]").inputValue();
ok(/\/study\/shared\/[A-Za-z0-9_-]{32}$/.test(link), `the link has a 32-character token (${link.replace(/[A-Za-z0-9_-]{32}$/, "…")})`);
await apage.screenshot({ path: `${OUT}/admin-share.png`, fullPage: true });

// Signed out: asks to sign in.
const anon = await browser.newContext();
watch(anon);
const anonPage = await anon.newPage();
await anonPage.goto(link, { waitUntil: "networkidle" });
ok(await anonPage.getByRole("heading", { name: "Sign in to open this study set" }).isVisible(), "signed out: the link asks to sign in");
ok((await anonPage.getByText("Mitochondria").count()) === 0, "signed out: no content shown");
await anonPage.screenshot({ path: `${OUT}/shared-signed-out.png` });

// The free user opens it and saves a copy.
await page.goto(link, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: shareTitle }).waitFor({ timeout: 30000 });
ok(await page.getByText("Mitochondria").isVisible(), "free account: the shared deck opens");
await page.getByRole("button", { name: "Save a copy to my Study space" }).click();
await page.getByText("Saved to your account").waitFor({ timeout: 30000 });
await page.screenshot({ path: `${OUT}/shared-saved.png`, fullPage: true });
await page.locator("[data-open-study]").click();
await page.waitForURL(/\/apps\/study\?view=cards/, { timeout: 30000 });
await page.getByRole("button", { name: shareTitle }).first().waitFor({ timeout: 30000 });
ok((await page.locator("[data-deck-list]").textContent()).includes("Saved from a share link"), "the copy is in the free user's own decks");

// 6. Revoke.
await apage.getByRole("button", { name: "Turn off link" }).first().click();
await apage.getByRole("button", { name: "Yes, turn off link" }).click();
await apage.getByRole("button", { name: "Make a share link" }).waitFor({ timeout: 30000 });
await page.goto(link, { waitUntil: "networkidle" });
await page.locator("[data-share-missing]").waitFor({ timeout: 30000 });
ok((await page.getByText("Mitochondria").count()) === 0, "after revoke the link no longer opens");
const mine = await call(page, "/src/lib/study.functions.ts", "myShares");
ok(mine.canShare === false && mine.shares.length === 0, "free account: no links of its own, and can't share");
await page.screenshot({ path: `${OUT}/shared-revoked.png` });

// 7. Phone, 390×844.
const phoneCtx = await freeCtx({ width: 390, height: 844 }, true);
const phone = await phoneCtx.newPage();
for (const tab of ["cards", "practice", "references", "notes"]) {
  await go(phone, `/apps/study${tab === "cards" ? "" : `?view=${tab}`}`);
  await phone.locator(`[data-study-tab="${tab}"]`).waitFor({ timeout: 30000 });
  ok(await noOverflow(phone), `phone: ${tab} has no sideways overflow`);
  await phone.screenshot({ path: `${OUT}/phone-${tab}.png`, fullPage: true });
}
await phone.getByRole("tab", { name: "Cards" }).click();
await phone.getByRole("button", { name: "QA bones" }).first().click();
ok(await noOverflow(phone), "phone: deck editor has no sideways overflow");
await phone.screenshot({ path: `${OUT}/phone-deck.png`, fullPage: true });
await phone.goto(link, { waitUntil: "networkidle" });
ok(await noOverflow(phone), "phone: shared link page has no sideways overflow");

// Product page shots: a separate fresh account with tidy sample content, top of the page.
const shotEmail = `qa-study-shots-${stampId}@example.test`;
const shotSeed = await browser.newContext();
if (!(await shotSeed.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: shotEmail, password, name: "Ada", ageConfirmed: true } })).ok()) throw new Error("shot sign-up");
const seedPage = await shotSeed.newPage();
await go(seedPage, "/");
const now = new Date().toISOString();
const today = now.slice(0, 10);
const later = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
const cards = (pairs) => pairs.map(([front, back], i) => ({ id: `c${i}`, front, back }));
const bio = cards([["Mitochondria", "Makes ATP for the cell"], ["Ribosome", "Builds proteins"], ["Nucleus", "Holds the DNA"], ["Osmosis", "Water moving across a membrane"], ["Enzyme", "A protein that speeds up a reaction"], ["Diffusion", "Spreading from high to low concentration"]]);
const verbs = cards([["être", "to be"], ["avoir", "to have"], ["aller", "to go"], ["faire", "to do, to make"]]);
const known = (ids, box, due) => Object.fromEntries(ids.map((id) => [id, { box, due, seen: box, last: today }]));
await saveDoc(seedPage, "study", {
  v: 1,
  decks: [
    { id: "bio", title: "Cell biology", cards: bio, createdAt: now, updatedAt: now },
    { id: "fr", title: "French verbs", cards: verbs, createdAt: now, updatedAt: now },
  ],
  quizzes: [],
  progress: { bio: { ...known(["c0", "c1", "c2"], 2, later), ...known(["c3"], 0, today) }, fr: known(["c0", "c1", "c2", "c3"], 3, later) },
  attempts: [],
  references: [],
  notes: [],
  formulas: [],
  imported: { "lab-notes": true, "quiz-maker": true },
});
for (const [viewport, view, extra] of [[{ width: 1280, height: 800 }, "desktop", {}], [{ width: 390, height: 780 }, "phone", { deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await browser.newContext({ viewport, ...extra });
  if (!(await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: shotEmail, password } })).ok()) throw new Error("shot sign-in");
  const p = await ctx.newPage();
  await go(p, "/apps/study");
  await p.getByRole("button", { name: "Cell biology" }).first().waitFor();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `public/shots/study/${view}.jpg`, type: "jpeg", quality: 82 });
}

await browser.close();
ok(errors.length === 0, `no page errors (${errors.length})`);
for (const e of errors.slice(0, 10)) console.log("  error:", e);
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
