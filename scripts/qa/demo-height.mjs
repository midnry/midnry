// Measures the homepage's opening demo frame (Remind tab) at a few viewports.
// Usage: node scripts/qa/demo-height.mjs
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [w, h] of [[1280, 800], [390, 844], [360, 740]]) {
  const phone = w < 700;
  const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, timezoneId: "Africa/Lagos" });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1500);
  const height = await page.evaluate(() => Math.round(document.querySelector('[role="tablist"]')?.closest("[class*='rounded-[1.75rem]']")?.getBoundingClientRect().height ?? 0));
  const page1 = await page.evaluate(() => Math.round(document.documentElement.scrollHeight));
  console.log(`${w}x${h}: demo ${height}px, page ${page1}px`);
  await context.close();
}
await browser.close();
