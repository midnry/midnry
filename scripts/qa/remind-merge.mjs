// Board, Pulse and Habits merged into Remind as Pass views, in a real browser
// against the local dev server (sh scripts/qa/dev-up.sh).
//  1. /apps/board redirects to Remind's Board, with the seeded saved cards,
//  2. /discover/pulse redirects to Remind's page and says where Pulse went,
//  3. a Pass user (the local QA admin, same gate as the Pass) uses Board,
//     Focus (started from a task) and Habits (also ticked next to Today),
//  4. a fresh account without the Pass sees the locked state on all three,
//     can still add a task in normal Remind, and the server refuses the docs,
//  5. phone 390×844: no sideways scrolling,
//  6. no page errors.
// Usage: node scripts/qa/remind-merge.mjs [outdir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/merge-remind";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const ADMIN = "qa-admin@example.test";
const STAMP = Date.now().toString(36);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signInAdmin(ctx) {
  for (const password of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) return;
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password } });
    if (r.ok()) return;
  }
  throw new Error("Could not sign in as the local QA admin");
}

let freshCount = 0;
async function signUpFresh(ctx) {
  freshCount += 1;
  const email = `qa-remind-${STAMP}-${freshCount}@example.test`;
  const r = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email, password: "remind-merge-qa-1", name: "QA Free", ageConfirmed: true } });
  if (!r.ok()) throw new Error(`Could not create a fresh account (${r.status()})`);
}

async function newCtx(who, viewport = { width: 1280, height: 900 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
    });
  });
  if (who === "admin") await signInAdmin(ctx);
  else await signUpFresh(ctx);
  return ctx;
}

/** The app's own server functions, called from inside a page (dev server only). */
async function seed(page, slug, doc) {
  const res = await page.evaluate(async ({ slug, payload }) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.saveDoc({ data: { slug, payload } });
  }, { slug, payload: JSON.stringify(doc) });
  if (!res.ok) throw new Error(`seed ${slug}: ${JSON.stringify(res)}`);
}
async function loadRaw(page, slug) {
  return page.evaluate(async (slug) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: slug });
  }, slug);
}
async function load(page, slug) {
  const res = await loadRaw(page, slug);
  return res.ok && res.payload ? JSON.parse(res.payload) : null;
}
const go = (page, path) => page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
const saved = (scope) => scope.getByText("Saved to your account").first().waitFor({ timeout: 30000 });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Pass user (QA admin) ─────────────────────────────────────────────────────
const admin = await newCtx("admin");
const page = await admin.newPage();
await go(page, "/");
const cardA = `Seeded card ${STAMP} A`;
const cardB = `Seeded card ${STAMP} B`;
const habitName = `Water ${STAMP}`.slice(0, 40);
await seed(page, "board", {
  columns: [
    { id: "todo", title: "To do", cards: [{ id: `a-${STAMP}`, title: cardA }] },
    { id: "doing", title: "Doing", cards: [{ id: `b-${STAMP}`, title: cardB }] },
    { id: "done", title: "Done", cards: [] },
  ],
});
await seed(page, "habits", { habits: [{ id: `h-${STAMP}`, name: habitName, done: [] }] });
await seed(page, "pulse", { mode: "focus", secondsLeft: 1500, running: false, startedAt: null, rounds: 3 });

// 1. Old Board link.
await go(page, "/apps/board");
ok(new URL(page.url()).pathname === "/apps/tasks" && new URL(page.url()).searchParams.get("view") === "board", `/apps/board lands on Remind's Board (${page.url()})`);
await page.locator('[data-remind-panel="board"]').waitFor({ timeout: 30000 });
ok(await page.locator(`input[value="${cardA}"]`).isVisible(), "the saved To do card is there");
ok(await page.locator(`input[value="${cardB}"]`).isVisible(), "the saved Doing card is there");
ok(await page.getByRole("heading", { name: "Board", exact: true }).isVisible(), "the view is titled Board inside Remind");
ok(await page.getByRole("button", { name: "Today", exact: false }).first().isVisible(), "Remind's own menu is beside it");
await page.screenshot({ path: `${OUT}/pass-board.png`, fullPage: true });
const newCard = `Added ${STAMP}`;
await page.getByLabel("Add a card to To do").fill(newCard);
await page.locator('[data-remind-panel="board"] form').first().getByRole("button", { name: "Add" }).click();
await saved(page.locator('[data-remind-panel="board"]'));
const board = await load(page, "board");
ok(board?.columns?.[0]?.cards?.map((c) => c.title).join("|") === `${cardA}|${newCard}`, "a new card saves into the same Board document, old card kept");
await page.reload({ waitUntil: "networkidle" });
await page.locator('[data-remind-panel="board"]').waitFor({ timeout: 30000 });
ok(await page.locator(`input[value="${newCard}"]`).isVisible(), "reload stays on Board (?view=board) with the new card");

// 3. Habits view, then today's habits next to Today.
await page.getByRole("button", { name: "Habits", exact: true }).click();
await page.locator('[data-remind-panel="habits"]').waitFor({ timeout: 30000 });
ok(new URL(page.url()).searchParams.get("view") === "habits", "the address follows the view (?view=habits)");
ok(await page.locator(`input[value="${habitName}"]`).waitFor({ timeout: 30000 }).then(() => true, () => false), "the saved habit is listed");
await page.screenshot({ path: `${OUT}/pass-habits.png`, fullPage: true });
await page.getByRole("button", { name: "Today", exact: false }).first().click();
const strip = page.locator("[data-today-habits]");
await strip.waitFor({ timeout: 30000 });
ok(new URL(page.url()).searchParams.get("view") === null, "Today clears ?view=");
await strip.getByRole("button", { name: habitName }).click();
await page.waitForFunction(
  async ({ id, day }) => {
    const m = await import("/src/lib/cove.functions.ts");
    const r = await m.loadDoc({ data: "habits" });
    const doc = r.ok && r.payload ? JSON.parse(r.payload) : null;
    return Boolean(doc?.habits?.find((h) => h.id === id)?.done?.includes(day));
  },
  { id: `h-${STAMP}`, day: today() },
  { timeout: 30000, polling: 1000 },
);
ok(true, "ticking a habit next to Today saves it in the Habits document");
ok((await strip.getByRole("button", { name: habitName }).getAttribute("aria-pressed")) === "true", "the habit shows as done today");
await page.screenshot({ path: `${OUT}/pass-today-habits.png`, fullPage: true });

// 3. Focus from a task.
const taskTitle = `Focus task ${STAMP}`;
await page.getByPlaceholder(/Add a task/).fill(`${taskTitle} today`);
await page.getByRole("button", { name: "Add", exact: true }).first().click();
await page.getByRole("button", { name: taskTitle }).first().click();
await page.getByRole("button", { name: "Focus for 25 min" }).click();
await page.locator('[data-remind-panel="focus"]').waitFor({ timeout: 30000 });
await page.locator("[data-focus-task]").waitFor({ timeout: 30000 });
ok((await page.locator("[data-focus-task]").innerText()).includes(taskTitle), "Focus names the task it was started from");
ok(await page.getByRole("button", { name: "Pause" }).isVisible(), "the focus round is running");
ok(await page.getByText("3 focus rounds finished").isVisible(), "the old Pulse count carried over");
await page.screenshot({ path: `${OUT}/pass-focus.png`, fullPage: true });
await page.getByRole("button", { name: "Pause" }).click();
await page.getByRole("button", { name: "Reset" }).click();
await saved(page.locator('[data-remind-panel="focus"]'));
const pulse = await load(page, "pulse");
ok(pulse?.running === false && pulse?.label === taskTitle && pulse?.rounds === 3, "Focus saves to the same Pulse document");
// Tidy: finish the QA task so Today stays clean.
await page.getByRole("button", { name: "Today", exact: false }).first().click();
const check = page.getByRole("checkbox", { name: `Complete: ${taskTitle}` });
if (await check.count()) await check.first().click();

// 2. Old Discover links.
await go(page, "/discover/pulse");
ok(new URL(page.url()).pathname === "/discover/tasks" && new URL(page.url()).searchParams.get("view") === "focus", `/discover/pulse lands on Remind's page (${page.url()})`);
ok(await page.locator("[data-merged-note]").isVisible(), "it says Focus is now part of Remind");
await page.screenshot({ path: `${OUT}/discover-pulse.png` });
await go(page, "/apps/pulse");
ok(new URL(page.url()).searchParams.get("view") === "focus", "/apps/pulse opens Focus");
await go(page, "/apps/habits");
ok(new URL(page.url()).searchParams.get("view") === "habits", "/apps/habits opens Habits");
await go(page, "/apps");
ok(!(await page.locator('a[href="/apps/board"], a[href="/apps/pulse"], a[href="/apps/habits"]').count()), "the desk no longer links to the old apps");
await admin.close();

// ── Phone, Pass user ─────────────────────────────────────────────────────────
const phone = await newCtx("admin", { width: 390, height: 844 }, true);
const pp = await phone.newPage();
for (const view of ["board", "focus", "habits"]) {
  await go(pp, `/apps/tasks?view=${view}`);
  await pp.locator(`[data-remind-panel="${view}"]`).waitFor({ timeout: 30000 });
  ok(await noSideways(pp), `phone: ${view} has no sideways scrolling`);
  await pp.screenshot({ path: `${OUT}/phone-pass-${view}.png`, fullPage: true });
}
await go(pp, "/apps/tasks");
await pp.getByRole("button", { name: /Menu/ }).click();
ok(await pp.getByRole("button", { name: "Focus", exact: true }).isVisible(), "phone: the menu lists Focus");
await pp.screenshot({ path: `${OUT}/phone-pass-menu.png`, fullPage: true });
await phone.close();

// ── No Pass (fresh account) ──────────────────────────────────────────────────
const free = await newCtx("free");
const fp = await free.newPage();
await go(fp, "/apps/board");
ok(new URL(fp.url()).searchParams.get("view") === "board", "no Pass: /apps/board still lands on Remind");
await fp.locator('[data-pass-locked="board"]').waitFor({ timeout: 30000 });
ok(await fp.locator('[data-pass-locked="board"] a[href="/billing"]').isVisible(), "no Pass: Board is locked, with a link to /billing");
await fp.screenshot({ path: `${OUT}/free-board-locked.png`, fullPage: true });
for (const view of ["Focus", "Habits"]) {
  await fp.getByRole("button", { name: view, exact: true }).click();
  ok(await fp.locator(`[data-pass-locked="${view.toLowerCase()}"]`).isVisible(), `no Pass: ${view} is locked`);
}
ok((await loadRaw(fp, "board")).error === "locked", "no Pass: the server refuses the Board document");
ok((await loadRaw(fp, "habits")).error === "locked", "no Pass: the server refuses the Habits document");
ok((await loadRaw(fp, "tasks")).ok === true, "no Pass: Remind's own document opens");
await fp.getByRole("button", { name: "Back to Today" }).click();
const freeTask = `Free task ${STAMP}`;
await fp.getByPlaceholder(/Add a task/).fill(`${freeTask} today`);
await fp.getByRole("button", { name: "Add", exact: true }).first().click();
await fp.getByRole("button", { name: freeTask }).first().waitFor({ timeout: 30000 });
ok(true, "no Pass: normal Remind still adds a task");
ok(!(await fp.locator("[data-today-habits]").count()), "no Pass: no habits strip on Today");
await fp.getByRole("button", { name: freeTask }).first().click();
ok(!(await fp.getByRole("button", { name: "Focus for 25 min" }).count()), "no Pass: no Focus button on a task");
await saved(fp);
await fp.screenshot({ path: `${OUT}/free-today.png`, fullPage: true });
await free.close();

const freePhone = await newCtx("free", { width: 390, height: 844 }, true);
const fpp = await freePhone.newPage();
await go(fpp, "/apps/tasks?view=habits");
await fpp.locator('[data-pass-locked="habits"]').waitFor({ timeout: 30000 });
ok(await noSideways(fpp), "phone, no Pass: locked Habits has no sideways scrolling");
await fpp.screenshot({ path: `${OUT}/phone-free-habits-locked.png`, fullPage: true });
await freePhone.close();

await browser.close();
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
console.log(fails.length ? `\n${fails.length} failed` : "\nall passed");
process.exit(fails.length ? 1 : 0);
