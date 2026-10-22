// Phase 3 quick fixes, in a real browser against the local dev server
// (sh scripts/qa/dev-up.sh). Signs in as the local QA account, like
// scripts/qa/apps-phase1.mjs, and checks:
//  1. Scam check lists warning signs (what each means, what to do), no verdict;
//     Claims shows only its questions,
//  2. the "not professionally reviewed yet" note on dose, tax and legal tools,
//  3. Bills: old rows still load; a new bill → Add to Remind → Remind's add box
//     is pre-filled → press Add → the task is saved with the right date,
//  4. Shifts hours and Visits' Add to Remind on old rows,
//  5. phone 390×844 with no sideways scroll, and no page errors throughout.
// Usage: node scripts/qa/phase3-fixes.mjs [outdir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/phase3-fixes";
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
  const res = await page.evaluate(
    async ({ slug, payload }) => {
      const m = await import("/src/lib/cove.functions.ts");
      // Saves need the current revision (a revision-less save is refused once the row has one).
      const current = await m.loadDoc({ data: slug });
      return m.saveDoc({ data: { slug, payload, baseRevision: current.ok ? current.revision : 0 } });
    },
    { slug, payload: JSON.stringify(doc) },
  );
  if (!res.ok) throw new Error(`seed ${slug}: ${JSON.stringify(res)}`);
}
async function load(page, slug) {
  const res = await page.evaluate(async (slug) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: slug });
  }, slug);
  return res.ok && res.payload ? JSON.parse(res.payload) : null;
}
async function open(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
}
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const ctx = await newCtx();
const page = await ctx.newPage();
await open(page, "/");

// ── 1. Scam check and Claims ────────────────────────────────────────────────
{
  await open(page, "/apps/scam-check");
  await page.getByLabel("The message").fill("URGENT: your account has been blocked. Send the OTP now at bit.ly/fix-it");
  const result = page.locator("[data-scam-result]");
  await result.waitFor();
  ok((await result.getByRole("status").innerText()).trim() === "Warning signs found: 4", "Scam check headline counts the warning signs");
  ok((await page.locator("[data-scam-sign]").count()) === 4, "four signs listed");
  const first = await page.locator("[data-scam-sign]").first().innerText();
  ok(/What to do:/.test(first), "each sign says what to do");
  const body = await page.locator("main").innerText();
  ok(!/this (is|looks like) a scam|is safe\b/i.test(body), "no scam or safe verdict on the page");
  ok(/checklist, not proof either way/.test(body), "the checklist footnote shows");
  await page.screenshot({ path: `${OUT}/scam-check.png`, fullPage: true });

  await page.getByLabel("The message").fill("Hi mum, see you at church on Sunday.");
  ok(/No common warning signs found\. That does not prove it is genuine/.test(await result.innerText()), "no signs: says it proves nothing");

  await open(page, "/apps/rumor-check");
  await page.locator("[data-claim-questions]").waitFor();
  ok((await page.locator("[data-claim-questions] li").count()) === 4, "Claims shows its four questions");
  ok((await page.locator("main textarea").count()) === 0 && !/warning sign/i.test(await page.locator("main").innerText()), "Claims has no scam checker");
  await page.screenshot({ path: `${OUT}/claims.png`, fullPage: true });
}

// ── 2. Review notes ─────────────────────────────────────────────────────────
for (const [slug, who] of [
  ["dose", "a pharmacist or doctor"],
  ["paye", "an accountant"],
  ["clauses", "a lawyer"],
  ["symptom-log", "a doctor"],
]) {
  await open(page, `/apps/${slug}`);
  const note = page.locator("[data-review-note]");
  await note.waitFor({ timeout: 30000 });
  ok((await note.innerText()).trim() === `Not professionally reviewed yet. Check with ${who} before relying on this.` && (await note.isVisible()), `${slug}: review note names ${who}`);
  if (slug === "dose") await page.screenshot({ path: `${OUT}/review-note-dose.png` });
}
await open(page, "/apps/units");
await page.getByText("Measure").first().waitFor();
ok((await page.locator("[data-review-note]").count()) === 0, "a plain calculator has no review note");

// ── 3. Bills → Add to Remind → Add ──────────────────────────────────────────
{
  const stamp = Date.now().toString(36).slice(-5);
  const name = `Electricity QA${stamp}`;
  // Ten days ahead, so the task also lands in Remind's two-week Upcoming list.
  const ahead = new Date();
  ahead.setDate(ahead.getDate() + 10);
  const dueIso = `${ahead.getFullYear()}-${String(ahead.getMonth() + 1).padStart(2, "0")}-${String(ahead.getDate()).padStart(2, "0")}`;
  const duePretty = `${ahead.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][ahead.getMonth()]} ${ahead.getFullYear()}`;
  // An old saved row (free-text "due") must still load as it was.
  await seed(page, "bill-watch", { rows: [{ name: "Old water", amount: "3000", due: "1st" }] });
  await open(page, "/apps/bill-watch");
  const oldRow = page.locator("li", { hasText: "Old water" });
  await oldRow.waitFor({ timeout: 30000 });
  ok(/Due\s*1st/.test(await oldRow.innerText()), "an old bill with a free-text due day still shows it");
  ok((await page.getByLabel("Due", { exact: true }).count()) === 0, "new bills get a date box, not the old free-text box");
  await page.getByLabel("Bill", { exact: true }).fill(name);
  await page.getByLabel("Amount").fill("12000");
  await page.getByLabel("Due date").fill(dueIso);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const row = page.locator("li", { hasText: name });
  await row.waitFor();
  ok((await row.innerText()).includes(duePretty), `the new bill shows its due date (${duePretty})`);
  await page.getByText("Saved", { exact: true }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${OUT}/bills.png`, fullPage: true });

  const href = await oldRow.locator("[data-add-to-remind]").getAttribute("href");
  ok(decodeURIComponent((href ?? "").replace(/\+/g, " ")).includes("Pay Old water bill (3,000) every 1st"), "the old bill's Add to Remind uses its day of the month");

  await row.locator("[data-add-to-remind]").click();
  await page.waitForURL(/\/apps\/tasks\?/, { timeout: 60000 });
  const box = page.locator("#remind-quick-add");
  await box.waitFor({ timeout: 60000 });
  const expected = `Pay ${name} bill (12,000) on ${duePretty}`;
  await page.waitForFunction((want) => document.querySelector("#remind-quick-add")?.value === want, expected, { timeout: 30000 }).catch(() => {});
  ok((await box.inputValue()) === expected, `Remind's add box is pre-filled: “${await box.inputValue()}”`);
  ok(await page.locator("[data-remind-prefill]").isVisible(), "Remind says nothing is added until you press Add");
  const before = await load(page, "tasks");
  ok(!(before?.tasks ?? []).some((task) => task.title?.includes(name)), "nothing was added before pressing Add");
  await page.screenshot({ path: `${OUT}/remind-prefilled.png` });

  await page.locator("form", { has: box }).getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForFunction(() => !location.search.includes("add="), null, { timeout: 30000 }).catch(() => {});
  ok(!page.url().includes("add="), "the pre-fill leaves the address once used");
  ok((await box.inputValue()) === "", "the add box is empty after Add");
  let task;
  for (let i = 0; i < 30 && !task; i += 1) {
    await page.waitForTimeout(1000);
    task = ((await load(page, "tasks"))?.tasks ?? []).find((item) => item.title === `Pay ${name} bill (12,000)`);
  }
  ok(task?.due === dueIso, `the task is saved for ${duePretty} (${task?.due})`);
  await open(page, "/apps/tasks?view=upcoming");
  const shown = page.getByText(`Pay ${name} bill (12,000)`).first();
  await shown.waitFor({ timeout: 30000 }).catch(() => {});
  ok(await shown.isVisible(), "the task shows in Upcoming");
  await shown.scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/remind-upcoming.png` });

  // Tidy the QA account: take the test task out again.
  const doc = await load(page, "tasks");
  if (doc?.tasks) await seed(page, "tasks", { ...doc, tasks: doc.tasks.filter((item) => !item.title?.includes(`QA${stamp}`)) });
}

// ── 4. Shifts hours, Visits on old rows ─────────────────────────────────────
{
  await seed(page, "shifts", { rows: [{ date: "2026-10-24", start: "19:00", end: "07:00", where: "Ward 3" }, { date: "Mon", start: "7am", end: "3:30pm", where: "Clinic" }] });
  await open(page, "/apps/shifts");
  const night = page.locator("li", { hasText: "Ward 3" });
  await night.waitFor({ timeout: 30000 });
  ok((await night.locator("[data-shift-hours]").innerText()).trim() === "12 h", "a night shift counts 12 hours");
  ok((await page.locator("li", { hasText: "Clinic" }).locator("[data-shift-hours]").innerText()).trim() === "8.5 h", "an old free-text shift still counts 8.5 hours");
  ok(/Hours in this list\s*20\.5 h/.test(await page.locator("main").innerText()), "the list total is 20.5 hours");
  ok(/24 Oct 2026/.test(await night.innerText()), "the date reads as 24 Oct 2026");
  const href = await night.locator("[data-add-to-remind]").getAttribute("href");
  ok(decodeURIComponent((href ?? "").replace(/\+/g, " ")).includes("Shift at Ward 3 on 24 Oct 2026 at 7pm until 7am"), "Shifts' Add to Remind text");
  await page.screenshot({ path: `${OUT}/shifts.png`, fullPage: true });

  await seed(page, "visits", { rows: [{ who: "Dr Bello", where: "General Hospital", when: "Fri 10am" }] });
  await open(page, "/apps/visits");
  const visit = page.locator("li", { hasText: "Dr Bello" });
  await visit.waitFor({ timeout: 30000 });
  ok(/When\s*Fri 10am/.test(await visit.innerText()), "an old visit keeps its free-text when");
  const vhref = await visit.locator("[data-add-to-remind]").getAttribute("href");
  ok(decodeURIComponent((vhref ?? "").replace(/\+/g, " ")).includes("Visit Dr Bello at General Hospital Fri 10am"), "Visits' Add to Remind text on an old row");
  await visit.getByRole("button", { name: "Edit" }).click();
  ok((await page.getByLabel("When", { exact: true }).inputValue()) === "Fri 10am", "editing an old visit shows its old when box");
  await page.getByRole("button", { name: "Cancel" }).click();
}
await ctx.close();

// ── 5. Phone 390×844 ────────────────────────────────────────────────────────
{
  const phone = await newCtx({ width: 390, height: 844 }, true);
  const p = await phone.newPage();
  await open(p, "/apps/bill-watch");
  await p.locator("[data-add-to-remind]").first().waitFor({ timeout: 30000 });
  ok(await noOverflow(p), "Bills fits a phone with no sideways scroll");
  const dlWidth = await p.locator("li dl").first().evaluate((el) => el.getBoundingClientRect().width);
  ok(dlWidth > 250, `a bill's details keep a readable width on a phone (${Math.round(dlWidth)}px)`);
  await p.screenshot({ path: `${OUT}/phone-bills.png`, fullPage: true });
  await open(p, "/apps/shifts");
  await p.locator("[data-shift-hours]").first().waitFor({ timeout: 30000 });
  ok(await noOverflow(p), "Shifts fits a phone");
  await p.screenshot({ path: `${OUT}/phone-shifts.png`, fullPage: true });
  await open(p, "/apps/scam-check");
  await p.getByLabel("The message").fill("Congratulations, you have won a prize! Send money by gift card and keep this secret. https://x.example");
  await p.locator("[data-scam-sign]").first().waitFor();
  ok(await noOverflow(p), "Scam check fits a phone");
  await p.screenshot({ path: `${OUT}/phone-scam-check.png`, fullPage: true });
  await open(p, `/apps/tasks?add=${encodeURIComponent("Pay rent on 25 Nov 2026")}`);
  await p.locator("#remind-quick-add").waitFor({ timeout: 60000 });
  ok((await p.locator("#remind-quick-add").inputValue()) === "Pay rent on 25 Nov 2026", "Remind pre-fills on a phone too");
  ok(await noOverflow(p), "Remind with a pre-fill fits a phone");
  await p.screenshot({ path: `${OUT}/phone-remind-prefill.png` });
  await open(p, "/apps/paye");
  await p.locator("[data-review-note]").waitFor({ timeout: 30000 });
  ok(await noOverflow(p), "Tax with its review note fits a phone");
  await p.screenshot({ path: `${OUT}/phone-tax.png`, fullPage: true });
  await phone.close();
}

await browser.close();
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 5).join(" | ")}` : ""}`);
console.log(fails.length ? `\n${fails.length} failed` : "\nAll passed");
process.exit(fails.length ? 1 : 0);
