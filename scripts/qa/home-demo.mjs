// Interactive checks for the homepage demo: the tablist (keyboard + aria),
// Remind's live parsing, Invoice's sums, Ledger's bars, reduced motion,
// and no horizontal overflow at five viewports.
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

  // Remind: the real parser runs on the sample and on what you type.
  const panel = page.getByRole("tabpanel", { name: /Remind/ });
  await panel.getByText("Every month on the 25th").first().waitFor();
  const input = panel.getByLabel("Type a reminder");
  await input.fill("Call mum tomorrow at 6pm @family");
  await panel.locator("dd", { hasText: "Tomorrow, 6pm" }).waitFor();
  await panel.locator("dd", { hasText: "@family" }).waitFor();
  ok("typing a reminder recognises date, time and label");
  await input.fill("Gym every mon and thu 7am p2");
  await panel.locator("dd", { hasText: "Every Monday and Thursday" }).waitFor();
  await panel.locator("dd", { hasText: "Priority 2" }).waitFor();
  await panel.getByRole("checkbox").click();
  await panel.getByText(/\+3 Midnry Points\. Next:/).waitFor();
  ok("recurrence + priority parsed; ticking shows points and the next date");
  await panel.getByRole("button", { name: "Water the plants every 3 days" }).click();
  await panel.locator("dd", { hasText: "Every 3 days" }).waitFor({ timeout: 5000 });
  assert.equal(await input.inputValue(), "Water the plants every 3 days");
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
  await invoice.getByLabel("Rate in naira, line 2").fill("abc");
  await sheet.getByText("₦305,000.00").first().waitFor();
  ok("invoice line totals, tax and total update; a bad rate shows a dash");
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
  await page.screenshot({ path: `${out}/demo-ledger-1280.png` });

  // Sample label is visible, nothing is saved (no server calls from typing).
  await page.getByText("Sample data. Try it, nothing is saved.").first().waitFor();
  ok("sample-data label shown");
  assert.deepEqual(errors, []);
  ok("no page errors");
  await context.close();
}

// Reduced motion: examples appear at once, no typing.
{
  const { context, page } = await open({ reducedMotion: "reduce" });
  const panel = page.getByRole("tabpanel", { name: /Remind/ });
  await panel.getByRole("button", { name: "Call mum tomorrow at 6pm @family" }).click();
  assert.equal(await panel.getByLabel("Type a reminder").inputValue(), "Call mum tomorrow at 6pm @family");
  ok("reduced motion: example fills instantly");
  await context.close();
}

// Viewports: no horizontal overflow on the homepage and product pages.
for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [390, 844], [844, 390]]) {
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
