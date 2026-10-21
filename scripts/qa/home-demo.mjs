// Interactive checks for the homepage demo: the simple Remind default and its
// "Explore more features" disclosure, the tablist (keyboard + aria), Remind's
// live parsing, Invoice's sums, Ledger's bars, the screen-reader summaries,
// product pages ("Try the demo", the next step after trying it, sign-up next=),
// reduced motion, and no horizontal overflow at six viewports.
// Usage: node scripts/qa/home-demo.mjs [outdir]
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "screenshots/qa/site";
mkdirSync(out, { recursive: true });
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const ok = (name) => {
  results.push(name);
  console.log("ok -", name);
};

async function open(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: "Africa/Lagos", ...options });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle").catch(() => {});
  return { context, page, errors };
}

{
  const { context, page, errors } = await open();
  const tabs = page.getByRole("tablist", { name: "Choose an app to try" }).getByRole("tab");
  assert.equal(await tabs.count(), 3);
  assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true");
  ok("three tabs, Remind selected first");

  // Remind, by default: the sentence, one task with its date and time, two plain examples. Nothing else.
  const panel = page.getByRole("tabpanel", { name: /Remind/ });
  const input = panel.getByLabel("Type a reminder");
  assert.equal(await input.inputValue(), "Call mum tomorrow at 6pm");
  const task = panel.locator("[data-demo-task]");
  await task.getByText("Call mum", { exact: true }).waitFor();
  const when = await task.locator("[data-demo-when]").textContent();
  assert.equal(when?.trim(), "Tomorrow, 6pm");
  const tomorrow = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  });
  await task.getByText(tomorrow, { exact: true }).waitFor();
  ok(`"Call mum tomorrow at 6pm" parses to "Call mum", tomorrow (${tomorrow}) at 6pm`);
  const more = panel.locator("details[data-demo-more]");
  assert.equal(await more.evaluate((el) => el.open), false);
  assert.equal(await panel.locator("dl", { hasText: "Priority" }).isVisible(), false);
  assert.equal(await panel.getByText("p1", { exact: true }).isVisible(), false);
  const simple = panel.getByRole("button", { name: /^(Dentist on Friday at 10am|Gym every Monday at 7am)$/ });
  assert.equal(await simple.count(), 2);
  assert.equal(await panel.getByRole("button", { name: /p1 #Home/ }).isVisible(), false);
  ok("simple default: one task, two plain examples, details closed");

  // aria-live: quiet on load, then a short summary after the visitor types.
  const live = panel.locator("[data-demo-live]");
  assert.equal((await live.textContent())?.trim(), "");
  await input.fill("Dentist on Friday at 10am");
  await live.getByText(/^Task: Dentist, .*10am\.$/).waitFor({ timeout: 5000 });
  ok(`aria-live summary updates: "${(await live.textContent())?.trim()}"`);

  // The disclosure opens from the keyboard and holds the full syntax and table.
  await more.locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await more.evaluate((el) => el.open), true);
  const details = panel.getByRole("definition").first();
  await details.waitFor();
  ok("Explore more features opens with the keyboard");
  await panel.getByRole("button", { name: "Pay rent every 25th at 9am p1 #Home" }).click();
  await panel.locator("dd", { hasText: "Every month on the 25th" }).waitFor({ timeout: 8000 });
  await panel.locator("dd", { hasText: "Priority 1" }).waitFor();
  await panel.locator("dd", { hasText: "#Home" }).waitFor();
  await panel.locator("dd", { hasText: "9am" }).waitFor();
  ok("rich example inside the disclosure: repeat, priority, project and time");
  await input.fill("Call mum tomorrow at 6pm @family");
  await panel.locator("dd", { hasText: "Tomorrow, 6pm" }).waitFor();
  await panel.locator("dd", { hasText: "@family" }).waitFor();
  ok("typing a reminder recognises date, time and label");
  await input.fill("Gym every mon and thu 7am p2");
  await panel.locator("dd", { hasText: "Every Monday and Thursday" }).waitFor();
  await panel.locator("dd", { hasText: "Priority 2" }).waitFor();
  await panel.getByRole("checkbox").click();
  await panel.locator("dd", { hasText: /\+3 earned\. Next:/ }).waitFor();
  ok("recurrence + priority parsed; ticking shows points and the next date");
  await more.locator("summary").click();
  assert.equal(await more.evaluate((el) => el.open), false);
  await panel.getByRole("button", { name: "Dentist on Friday at 10am" }).click();
  // On a Thursday the next Friday is "Tomorrow".
  await task.locator("[data-demo-when]").getByText(/^(Friday|Tomorrow), 10am$/).waitFor({ timeout: 5000 });
  assert.equal(await input.inputValue(), "Dentist on Friday at 10am");
  ok("example button types the example in");

  // Keyboard: arrows move selection and focus, Home/End jump.
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes("Invoice")), true);
  await page.keyboard.press("End");
  assert.equal(await tabs.nth(2).getAttribute("aria-selected"), "true");
  await page.keyboard.press("ArrowRight");
  assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await tabs.nth(2).getAttribute("aria-selected"), "true");
  await page.keyboard.press("Home");
  assert.equal(await tabs.nth(0).getAttribute("aria-selected"), "true");
  assert.equal(await tabs.nth(1).getAttribute("tabindex"), "-1");
  ok("arrow keys, Home and End move between tabs (roving tabindex)");

  // Invoice: real sums.
  await tabs.nth(1).click();
  const invoice = page.getByRole("tabpanel", { name: /Invoice/ });
  assert.equal(await invoice.isVisible(), true);
  const sheet = invoice.getByRole("article", { name: /Finished invoice/ });
  await sheet.getByText("₦193,500.00").waitFor();
  await invoice.getByLabel("Quantity, line 1").fill("2");
  await sheet.getByText("₦354,750.00").waitFor(); // (300000 + 25000 + 5000) × 1.075
  await invoice.getByLabel("Tax %").fill("0");
  await sheet.getByText("₦330,000.00").first().waitFor();
  await invoice.locator("[data-demo-live]").getByText("Invoice total ₦330,000.00, including ₦0.00 tax.").waitFor({ timeout: 5000 });
  ok("invoice aria-live summary follows the total");
  // An invalid rate, quantity or tax: an inline error and no total at all.
  await invoice.getByLabel("Rate in naira, line 2").fill("abc");
  await invoice.getByText("Line 2: Rate must be a number, like 2 or 1.5.").waitFor();
  await sheet.locator("[data-testid=invoice-no-total]").getByText("No total yet. Fix the highlighted field to see the total.").waitFor();
  assert.equal(await sheet.getByText("Total", { exact: true }).count(), 0);
  assert.equal(await invoice.getByLabel("Rate in naira, line 2").getAttribute("aria-invalid"), "true");
  await invoice.locator("[data-demo-live]").getByText(/^No total yet\./).waitFor({ timeout: 5000 });
  await invoice.getByLabel("Rate in naira, line 2").fill("12500");
  await invoice.getByLabel("Quantity, line 1").fill("-1");
  await invoice.getByText("Line 1: Quantity can’t be negative.").waitFor();
  await invoice.getByLabel("Quantity, line 1").fill("");
  await invoice.getByText("Line 1: Enter a quantity.").waitFor();
  await invoice.getByLabel("Quantity, line 1").fill("2");
  await invoice.getByLabel("Tax %").fill("100.01");
  await invoice.getByText("Tax can’t be more than 100%.").waitFor();
  await invoice.getByLabel("Tax %").fill("");
  await invoice.getByText("Enter a tax percent. Use 0 if there is no tax.").waitFor();
  assert.equal(await sheet.locator("[data-testid=invoice-no-total]").count(), 1);
  await invoice.getByLabel("Tax %").fill("7.5");
  await sheet.getByText("₦354,750.00").waitFor();
  await invoice.getByLabel("Rate in naira, line 2").fill("12500.555");
  await invoice.getByText("Line 2: Rate can have at most 2 decimal places.").waitFor();
  await invoice.getByLabel("Rate in naira, line 2").fill("12500");
  await sheet.getByText("₦354,750.00").waitFor();
  ok("invoice: blank, text, negative, 3-decimal and 100.01% inputs show inline errors and hide the total");
  await page.screenshot({ path: `${out}/demo-invoice-1280.png` });

  // Ledger: add an expense and the bars and total change.
  await tabs.nth(2).click();
  const ledger = page.getByRole("tabpanel", { name: /Ledger/ });
  await ledger.getByText("₦58,200.00").first().waitFor();
  await ledger.getByPlaceholder("What, e.g. Fuel").fill("Fuel for the generator");
  await ledger.getByPlaceholder("₦ Amount").fill("25,000");
  await ledger.getByLabel("Category").selectOption("Home");
  await ledger.getByRole("button", { name: "Add", exact: true }).click();
  await ledger.getByText("₦83,200.00").first().waitFor();
  await ledger.getByText("₦16,800.00 left of ₦100,000.00").waitFor();
  await ledger.getByRole("button", { name: "Remove Fuel for the generator" }).click();
  await ledger.getByText("₦58,200.00").first().waitFor();
  await ledger.getByPlaceholder("₦ Amount").fill("lots");
  await ledger.getByPlaceholder("What, e.g. Fuel").fill("Snacks");
  await ledger.getByRole("button", { name: "Add", exact: true }).click();
  await ledger.getByRole("alert").getByText("Enter an amount like 2500.").waitFor();
  ok("ledger adds and removes an expense; total, budget and validation work");
  await ledger.locator("[data-demo-live]").getByText(/total ₦58,200\.00\. ₦41,800\.00 left of the budget\./).waitFor({ timeout: 5000 });
  ok("ledger aria-live summary follows the total");
  await page.screenshot({ path: `${out}/demo-ledger-1280.png` });

  // Currency: Lagos time zone starts in naira; switching gives the invoice and
  // the ledger their own sample amounts in that currency (no conversion).
  const currency = page.getByLabel("Currency");
  assert.equal(await currency.inputValue(), "NGN");
  await currency.selectOption("GBP");
  await ledger.getByText("£415.00").first().waitFor();
  await ledger.getByText("£385.00 left of £800.00").waitFor();
  assert.equal(await ledger.getByPlaceholder("£ Amount").count(), 1);
  await tabs.nth(1).click();
  await sheet.getByText("£1,020.00").waitFor(); // (750 + 2 × 40 + 20) × 1.20
  await invoice.getByLabel("Rate in pounds, line 1").fill("800");
  await sheet.getByText("£1,080.00").waitFor();
  await currency.selectOption("USD");
  await sheet.getByText("$1,096.20").waitFor(); // (900 + 2 × 45 + 25) × 1.08
  await tabs.nth(2).click();
  await ledger.getByText("$520.00").first().waitFor();
  await currency.selectOption("NGN");
  await ledger.getByText("₦58,200.00").first().waitFor();
  await tabs.nth(1).click();
  await sheet.getByText("₦193,500.00").waitFor();
  ok("switching currency updates the invoice and ledger totals");
  await tabs.nth(0).click();
  assert.equal(await page.getByText("Currency", { exact: true }).isVisible(), false);
  ok("currency picker hidden on the Remind tab");

  // Sample label is visible, nothing is saved (no server calls from typing).
  await page.getByText("Sample data. Try it, nothing is saved.").first().waitFor();
  ok("sample-data label shown");
  assert.deepEqual(errors, []);
  ok("no page errors");
  await context.close();
}

// The currency choice is remembered on this device.
{
  const { context, page } = await open();
  await page.getByRole("tab").nth(1).click();
  await page.getByLabel("Currency").selectOption("EUR");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  assert.equal(await page.getByLabel("Currency").inputValue(), "EUR");
  await page.getByRole("tab").nth(1).click();
  await page.getByRole("article", { name: /Finished invoice/ }).getByText("€1,119.30").waitFor(); // (800 + 90 + 20) × 1.23
  ok("currency choice remembered after reload");
  await context.close();
}

// Default currency from the browser only: time zone, then language region, then naira.
for (const [timezoneId, locale, expected] of [
  ["Europe/London", "en-US", "GBP"],
  ["Europe/Berlin", "de-DE", "EUR"],
  ["America/New_York", "en-US", "USD"],
  ["America/Toronto", "en-CA", "CAD"],
  ["Africa/Nairobi", "en-US", "KES"],
  ["Asia/Kolkata", "en-US", "INR"],
  ["Asia/Tokyo", "en-ZA", "ZAR"],
  ["Asia/Tokyo", "ja-JP", "NGN"],
]) {
  const { context, page } = await open({ timezoneId, locale });
  await page.getByRole("tab").nth(2).click();
  assert.equal(await page.getByLabel("Currency").inputValue(), expected, `${timezoneId} ${locale}`);
  await context.close();
}
ok("default currency follows time zone, then language, else naira");

// The server renders naira, so the first paint never depends on the visitor.
{
  const html = await (await fetch(BASE + "/")).text();
  assert.ok(html.includes("₦193,500.00") && html.includes("₦58,200.00"), "server HTML has the naira samples");
  ok("server-rendered demo is in naira");
}

// Reduced motion: examples appear at once, no typing.
{
  const { context, page } = await open({ reducedMotion: "reduce" });
  const panel = page.getByRole("tabpanel", { name: /Remind/ });
  await panel.getByRole("button", { name: "Dentist on Friday at 10am" }).click();
  assert.equal(await panel.getByLabel("Type a reminder").inputValue(), "Dentist on Friday at 10am");
  ok("reduced motion: example fills instantly");
  await context.close();
}

/** Opens a product page, signed out. */
async function product(slug, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: "Africa/Lagos", ...options });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/discover/${slug}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.waitForLoadState("networkidle").catch(() => {});
  return { context, page, errors };
}

const signUp = async (link) => {
  const href = await link.getAttribute("href");
  const url = new URL(href, BASE);
  return { path: url.pathname, next: url.searchParams.get("next"), intent: url.searchParams.get("intent") };
};

/** The section is at the top of the viewport (below the sticky header) and has focus. */
async function landed(page, id) {
  const state = await page.evaluate((target) => {
    const el = document.getElementById(target);
    return { focused: document.activeElement === el, top: Math.round(el.getBoundingClientRect().top), hash: location.hash };
  }, id);
  assert.equal(state.focused, true, `${id} has focus`);
  assert.ok(state.top >= 0 && state.top <= 140, `${id} top at ${state.top}px`);
  assert.equal(state.hash, `#${id}`);
}

// Product page with a demo: "Try the demo" scrolls and focuses; the account action keeps next=.
for (const reducedMotion of ["no-preference", "reduce"]) {
  const { context, page, errors } = await product("invoice", { reducedMotion });
  const create = page.getByRole("link", { name: "Create a free account" }).first();
  assert.deepEqual(await signUp(create), { path: "/login", next: "/apps/invoice", intent: "register" });
  await page.getByRole("link", { name: "Try the demo" }).click();
  if (reducedMotion === "reduce") {
    // No smooth scrolling: the section is there on the next frame.
    await page.waitForTimeout(80);
  } else {
    await page.waitForTimeout(1200);
  }
  await landed(page, "try-it");
  ok(`invoice: "Try the demo" scrolls to the demo and focuses it (${reducedMotion})`);
  if (reducedMotion === "reduce") {
    await context.close();
    continue;
  }
  // The next step appears only after the visitor does something.
  const next = page.locator("[data-demo-next]");
  assert.equal(await next.count(), 0);
  await page.getByLabel("Quantity, line 1").fill("3");
  await next.waitFor();
  await next.getByText("Create a free account to make your own invoices.").waitFor();
  await next.getByText(/This sample is not kept\./).waitFor();
  assert.deepEqual(await signUp(next.getByRole("link", { name: "Create a free account" })), { path: "/login", next: "/apps/invoice", intent: "register" });
  ok("invoice: after editing a line, the next step offers a free account (next=/apps/invoice)");
  assert.deepEqual(errors, []);
  await context.close();
}

// Remind: the next step after typing; sign-up goes back to the app.
{
  const { context, page } = await product("tasks");
  assert.deepEqual(await signUp(page.getByRole("link", { name: "Create a free account" }).first()), { path: "/login", next: "/apps/tasks", intent: "register" });
  await page.getByLabel("Type a reminder").fill("Call the bank on Friday at 9am");
  await page.locator("[data-demo-next]").getByText("Create a free account to keep your own reminders.").waitFor();
  ok("remind: typing shows the next step; sign-up next=/apps/tasks");
  await context.close();
}

// Ledger is a Pass app: never called free.
{
  const { context, page } = await product("ledger");
  const create = page.getByRole("link", { name: "Create an account", exact: true }).first();
  assert.deepEqual(await signUp(create), { path: "/login", next: "/apps/ledger", intent: "register" });
  assert.equal(await page.getByText(/free account/i).count(), 0);
  await page.getByPlaceholder("What, e.g. Fuel").fill("Bus fare");
  const next = page.locator("[data-demo-next]");
  await next.getByText("Create an account to track your own spending.").waitFor();
  await next.getByText(/Included with Midnry Pass/).waitFor();
  assert.equal(await page.getByText(/free account/i).count(), 0);
  ok("ledger (Pass): \"Create an account\", never \"free\"; next step names Midnry Pass");
  await context.close();
}

// An app without a demo: "Create an account to use <App>" and "See how it works".
{
  const { context, page } = await product("cycle");
  assert.deepEqual(await signUp(page.getByRole("link", { name: "Create an account to use Cycle" })), { path: "/login", next: "/apps/cycle", intent: "register" });
  await page.getByRole("link", { name: "See how it works" }).click();
  await page.waitForTimeout(1200);
  await landed(page, "how-it-works");
  ok("cycle: account action keeps next=/apps/cycle; See how it works scrolls and focuses");
  await context.close();
}

// Viewports: no horizontal overflow on the homepage and product pages.
for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 740], [844, 390]]) {
  const phone = w < 900 && h < 900 && Math.min(w, h) < 500;
  const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, timezoneId: "Africa/Lagos" });
  const page = await context.newPage();
  for (const path of ["/", "/discover/tasks", "/discover/invoice", "/discover/ledger", "/discover/cycle"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(600);
    for (const tab of path === "/" ? [0, 1, 2] : [0]) {
      if (path === "/") await page.getByRole("tab").nth(tab).click();
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(wide <= 0, `${path} tab ${tab} overflows by ${wide}px at ${w}x${h}`);
    }
    // Touch targets in the demo: every button and input is at least 44px tall.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('[role="tabpanel"]:not([hidden]) button, [role="tabpanel"]:not([hidden]) input, [role="tablist"] button')]
        .map((el) => ({ el: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width }))
        .filter((r) => r.h > 0 && (r.h < 43.5 || r.w < 43.5)),
    );
    assert.deepEqual(small, [], `${path} small targets at ${w}x${h}: ${JSON.stringify(small)}`);
  }
  if (w === 844) await page.goto(BASE + "/", { waitUntil: "networkidle" }).then(() => page.screenshot({ path: `${out}/_home-844x390.png`, fullPage: false }));
  ok(`no overflow and 44px targets at ${w}x${h}`);
  await context.close();
}

await browser.close();
console.log(`\n${results.length} checks passed`);
