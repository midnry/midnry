// Remind batch "repeats and editing" (docs/audit-2026-10-23/next-batch-invoice-remind.md R2 + part of R3),
// in a real browser at laptop (1280×900) and phone (390×844) size. Synthetic data only.
//  1. The add box previews a repeat as "Next: Tue 27 Oct, then every Tue and Fri" and the saved row agrees.
//  2. A custom weekly repeat set in the task panel moves the date to the first matching day.
//  3. A typed day/month that has passed ("30/9") says "next year" before Add.
//  4. Finishing a repeating task says "Next one: …" with Undo, and Undo puts it back (points too).
//  5. "Weekend market shopping this weekend" keeps its first word.
//  6. Changing the date (Today) or project (Inbox) in the open panel keeps the panel open and says where it went.
//  7. "Share" asks first; the shared project's delete warning says the tasks are deleted for everyone.
// The browser clock is fixed at Sat 24 Oct 2026, 10:00 in Lagos so dates are predictable.
// Usage: QA_BASE=http://127.0.0.1:8092 node scripts/qa/remind-batch.mjs [outdir]
import { appendFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, TARGET } from "./target.mjs";

const OUT = process.argv[2] || "screenshots/qa/remind-batch";
mkdirSync(OUT, { recursive: true });
const fails = [];
let passes = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (cond) passes += 1;
  else fails.push(msg);
};
console.log(`target: ${TARGET} at ${BASE}`);
const errors = [];
const headers = { origin: BASE };
const ADMIN = "qa-admin@example.test";
const STAMP = Date.now().toString(36);
const NOW = new Date("2026-10-24T10:00:00+01:00");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signInAdmin(ctx) {
  for (const password of ["payouts-qa-pass-1", "outpost-zero-qa-1"]) {
    const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: ADMIN, password, name: "QA Admin", ageConfirmed: true } });
    if (up.ok()) {
      appendFileSync("screenshots/qa/test-accounts.jsonl", JSON.stringify({ email: ADMIN, password, base: BASE }) + "\n");
      return;
    }
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: ADMIN, password } });
    if (r.ok()) return;
  }
  throw new Error("Could not sign in as the local QA admin");
}

async function run(mobile) {
  const tag = mobile ? "phone" : "laptop";
  const sfx = `${mobile ? "P" : "L"}${STAMP.slice(-4)}`;
  console.log(`\n── ${tag} ──`);
  const ctx = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: "Africa/Lagos" }
      : { viewport: { width: 1280, height: 900 }, timezoneId: "Africa/Lagos" },
  );
  await ctx.clock.setFixedTime(NOW);
  ctx.on("page", (page) => {
    page.on("pageerror", (e) => errors.push(`${tag} ${page.url()}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${tag} ${page.url()}: ${m.text()}`);
    });
  });
  await signInAdmin(ctx);
  const page = await ctx.newPage();
  let shot = 0;
  const snap = async (name) => {
    shot += 1;
    await page.screenshot({ path: `${OUT}/${tag}-${String(shot).padStart(2, "0")}-${name}.png`, fullPage: false });
  };
  await page.goto(`${BASE}/apps/tasks`, { waitUntil: "networkidle", timeout: 120000 });
  const box = page.locator("#remind-quick-add");
  await box.waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);

  const heading = page.locator("h2.font-display");
  async function nav(pattern) {
    const aside = page.locator("aside");
    if (mobile && !(await aside.isVisible())) await page.locator("button[aria-expanded]").filter({ hasText: /Menu$/ }).click();
    await aside.locator("button", { hasText: pattern }).first().click();
    await page.waitForTimeout(300);
  }
  async function add(text) {
    await box.fill(text);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForTimeout(300);
  }
  const rowButton = (title) => page.locator("button[aria-expanded]", { hasText: title }).first();
  const detail = page.locator("[data-remind-detail]");
  /** A labelled select or input in the open task panel ("Repeat", "Project"). */
  const field = (name) => detail.locator("label").filter({ has: page.locator("span", { hasText: new RegExp(`^${name}$`) }) }).locator("select, input");
  const points = async () => Number((await page.locator("aside nav button", { hasText: "Productivity" }).textContent())?.match(/(\d+)\s*pts/)?.[1] ?? NaN);
  const toast = (text) => page.locator("[data-sonner-toast]", { hasText: text }).first();
  const seen = (locator, timeout = 5000) => locator.waitFor({ state: "visible", timeout }).then(() => true, () => false);

  // 1. Repeat preview while typing, and the row agrees once added.
  const gym = `Gym ${sfx}`;
  await box.fill(`${gym} every tue and fri`);
  const repeatChip = page.locator('[data-remind-chip="repeat"]');
  await repeatChip.waitFor({ timeout: 5000 }).catch(() => undefined);
  const chipText = (await repeatChip.textContent().catch(() => "")) ?? "";
  ok(chipText === "Next: Tue 27 Oct, then every Tue and Fri", `add box previews the repeat ("${chipText}")`);
  await snap("repeat-preview");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForTimeout(400);
  await nav(/^Upcoming/);
  const gymRow = page.locator("section", { has: page.locator("h3", { hasText: /^Tuesday$/ }) }).locator("li", { hasText: gym });
  ok((await gymRow.count()) === 1, "the added task is listed under Tuesday in Upcoming");
  ok(/Every Tuesday and Friday/.test((await gymRow.first().textContent()) ?? ""), "its row says ↻ Every Tuesday and Friday");
  await rowButton(gym).click();
  const line = (await detail.locator("[data-remind-repeat-line]").textContent().catch(() => "")) ?? "";
  ok(line === chipText, `the task panel's repeat line matches the preview ("${line}")`);
  await detail.getByRole("button", { name: "Close", exact: true }).click();

  // 2. A custom weekly repeat set in the panel snaps to the first matching day (Monday → Tuesday).
  const snapTitle = `Snap ${sfx}`;
  await add(`${snapTitle} monday`);
  ok((await page.locator("section", { has: page.locator("h3", { hasText: /^Monday$/ }) }).locator("li", { hasText: snapTitle }).count()) === 1, "a task typed for Monday is due Monday");
  await rowButton(snapTitle).click();
  await detail.getByLabel("Custom repeat").fill("every tue and fri");
  await detail.getByRole("button", { name: "Set", exact: true }).click();
  await page.waitForTimeout(400);
  ok((await detail.locator('input[type="date"]').inputValue()) === "2026-10-27", "custom repeat 'every tue and fri' moved the date from Mon 26 to Tue 27 Oct");
  const snapText = (await rowButton(snapTitle).textContent()) ?? "";
  ok(/Tuesday/.test(snapText) && !/Monday/.test(snapText) && /Every Tuesday and Friday/.test(snapText), `the row now reads Tuesday ↻ Every Tuesday and Friday ("${snapText}")`);
  await detail.locator('input[type="date"]').fill("2026-10-31");
  await page.waitForTimeout(300);
  await field("Repeat").selectOption("weekdays");
  await page.waitForTimeout(400);
  ok((await detail.locator('input[type="date"]').inputValue()) === "2026-11-02", "choosing Every weekday on a Saturday date moves it to Mon 2 Nov");
  await snap("panel-snapped");
  await detail.getByRole("button", { name: "Close", exact: true }).click();

  // 3. A past day/month says "next year" before Add, and after.
  await nav(/^Today/);
  await box.fill(`School fees ${sfx} 30/9`);
  const nextYear = (await page.locator('[data-remind-chip="next-year"]').textContent().catch(() => "")) ?? "";
  ok(nextYear === "Thu 30 Sep 2027 — next year", `a passed date says next year in the preview ("${nextYear}")`);
  ok(await page.locator("[data-remind-next-year]").isVisible(), "the preview explains it and how to keep this year");
  await snap("next-year-preview");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  ok(await seen(toast("next year")), "adding it says 'Added for Thu 30 Sep 2027, next year.'");
  await box.fill(`School fees ${sfx} 30 Sep 2026`);
  ok((await page.locator('[data-remind-chip="next-year"]').count()) === 0, "typing the year as the hint says keeps this year (no next-year note)");
  await box.fill("");

  // 5. Title words are kept unless they are the date.
  await box.fill(`Weekend market shopping ${sfx} this weekend`);
  const preview = (await page.locator("form", { has: box }).locator('[aria-live="polite"]').first().textContent()) ?? "";
  ok(preview.includes(`“Weekend market shopping ${sfx}”`) && preview.includes("Today"), `"Weekend market shopping … this weekend" keeps its first word and is due Saturday ("${preview}")`);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForTimeout(300);
  ok((await rowButton(`Weekend market shopping ${sfx}`).count()) === 1, "the saved task keeps the title 'Weekend market shopping'");

  // 4. Finishing a repeating task: "Next one: …" with Undo.
  const stretch = `Stretch ${sfx}`;
  await add(`${stretch} every day`);
  const before = await points();
  await page.getByRole("checkbox", { name: `Complete: ${stretch}` }).click();
  const nextToast = toast("Next one:");
  ok(await seen(nextToast), "finishing a repeat shows a toast");
  const toastText = (await nextToast.textContent().catch(() => "")) ?? "";
  ok(toastText.includes("Next one: Sun 25 Oct"), `it says "Next one: Sun 25 Oct" ("${toastText.replace(/Undo/, "").trim()}")`);
  ok((await rowButton(stretch).count()) === 0, "the task left Today");
  ok((await points()) === before + 1, "a point was added");
  await nextToast.hover().catch(() => undefined);
  await snap("next-one-toast");
  await nextToast.screenshot({ path: `${OUT}/${tag}-next-one-toast-close-up.png` }).catch(() => undefined);
  await nextToast.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(400);
  ok((await rowButton(stretch).count()) === 1, "Undo brings it back to Today");
  ok((await points()) === before, "Undo takes the point back");

  // 6a. Today: changing the date keeps the panel open and says where it went.
  const bill = `Pay bill ${sfx}`;
  await add(bill);
  await rowButton(bill).click();
  await detail.locator('input[type="date"]').fill("2026-10-27");
  await page.waitForTimeout(500);
  ok(await detail.isVisible(), "Today: the panel stays open after the date moves the task out of Today");
  ok(((await detail.locator("[data-remind-moved]").textContent()) ?? "").includes("Moved to Upcoming."), "it says 'Moved to Upcoming.'");
  await detail.getByRole("button", { name: "P2" }).click();
  await page.waitForTimeout(300);
  ok(await detail.isVisible(), "a second edit (priority) still keeps it open");
  await detail.locator("[data-remind-moved]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await snap("today-moved");
  await detail.getByRole("button", { name: "Go to Upcoming" }).click();
  await page.waitForTimeout(400);
  ok((await heading.textContent())?.trim() === "Upcoming" && (await detail.isVisible()), "'Go to Upcoming' opens Upcoming with the task still open");
  await detail.getByRole("button", { name: "Close", exact: true }).click();

  // 6b. Inbox: changing the project keeps the panel open.
  const work = `Work ${sfx}`;
  const aside = page.locator("aside");
  if (mobile && !(await aside.isVisible())) await page.locator("button[aria-expanded]").filter({ hasText: /Menu$/ }).click();
  await aside.getByLabel("New project").fill(work);
  await aside.getByLabel("New project").press("Enter");
  await page.waitForTimeout(400);
  await nav(/^Inbox/);
  const errand = `Errand ${sfx}`;
  await add(errand);
  await rowButton(errand).click();
  await field("Project").selectOption({ label: work });
  await page.waitForTimeout(500);
  ok(await detail.isVisible(), "Inbox: the panel stays open after moving the task to another project");
  ok(((await detail.locator("[data-remind-moved]").textContent()) ?? "").includes(`Moved to ${work}.`), `it says 'Moved to ${work}.'`);
  await detail.getByLabel("Task name").fill(`${errand} edited`);
  await detail.getByLabel("Task name").blur();
  await page.waitForTimeout(300);
  ok(await detail.isVisible(), "renaming it afterwards still keeps the panel open");
  await detail.locator("[data-remind-moved]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await snap("inbox-moved");
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await page.waitForTimeout(300);
  ok((await rowButton(errand).count()) === 0, "after Close it leaves the Inbox");

  // 7. Share asks first; shared delete is honest.
  await nav(new RegExp(`^${work}$`));
  ok((await rowButton(`${errand} edited`).count()) === 1, "the moved task is in the project");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const confirm = page.locator("[data-remind-share-confirm]");
  ok(await confirm.isVisible(), "Share opens a confirmation instead of sharing at once");
  const confirmText = (await confirm.textContent()) ?? "";
  ok(/becomes a shared project/.test(confirmText) && /can't turn it back/.test(confirmText) && /deleted for everyone/.test(confirmText), "it says what sharing does, that it can't be turned back, and what delete does");
  await snap("share-confirm");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  ok((await confirm.count()) === 0 && (await page.getByRole("button", { name: /^People/ }).count()) === 0, "Cancel leaves it a personal project");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await confirm.getByRole("button", { name: "Yes, share it" }).click();
  await page.getByRole("button", { name: /Hide people|People/ }).first().waitFor({ timeout: 15000 });
  ok((await page.locator("aside button", { hasText: `👥 ${work}` }).count()) === 1, "Yes, share it makes it a shared project");
  await page.getByRole("button", { name: "Delete project" }).click();
  const del = page.locator("[data-remind-delete-confirm]");
  const delText = (await del.textContent()) ?? "";
  ok(/Its task is deleted for everyone in it, not moved to your Inbox/.test(delText) && /can't be undone/.test(delText), `the shared delete warning is accurate ("${delText.slice(0, 90)}…")`);
  await snap("shared-delete-confirm");
  await del.getByRole("button", { name: "Delete", exact: true }).click();
  ok(await seen(toast("Project deleted.")), "deleting the shared project works after confirming");

  if (mobile) {
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(width <= 390, `phone: no sideways scrolling (scrollWidth ${width})`);
  }
  await ctx.close();
}

try {
  await run(false);
  await run(true);
} catch (error) {
  ok(false, `script stopped: ${error instanceof Error ? error.message : String(error)}`);
}
await browser.close();
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
console.log(`\n${passes} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
