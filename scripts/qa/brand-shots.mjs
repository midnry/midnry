// Header and footer screenshots of the Midnry brand in each colour mode and width.
// Usage: node scripts/qa/brand-shots.mjs <label> [path]   (dev server on :8080; see dev-up.sh)
// Writes screenshots/qa/brand/<label>-<mode>-<width>-{header,footer}.png
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const [label = "after", path = "/"] = process.argv.slice(2);
const out = "screenshots/qa/brand";
mkdirSync(out, { recursive: true });
// The site picks its mode from the clock (light 7–16h, evening 16–19h) or the device's dark setting.
const MODES = [
  ["light", "2026-10-22T10:00:00", "light"],
  ["evening", "2026-10-22T17:00:00", "light"],
  ["dark", "2026-10-22T10:00:00", "dark"],
];
const WIDTHS = [1280, 390, 360, 320];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const problems = [];
for (const [mode, time, scheme] of MODES) {
  for (const w of WIDTHS) {
    const mobile = w < 500;
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: mobile, hasTouch: mobile, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date(time));
    p.on("pageerror", (e) => problems.push(`${mode} ${w}: ${e.message}`));
    await p.goto("http://127.0.0.1:8080" + path, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(800);
    const got = await p.evaluate(() => document.documentElement.dataset.mode);
    if (got !== mode) problems.push(`${mode} ${w}: page is in ${got} mode`);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${mode} ${w}: ${overflow}px horizontal overflow`);
    await p.locator("header").first().screenshot({ path: `${out}/${label}-${mode}-${w}-header.png` });
    await p.locator("footer").first().screenshot({ path: `${out}/${label}-${mode}-${w}-footer.png` });
    await ctx.close();
  }
}
await b.close();
console.log(problems.length ? problems.join("\n") : "ok");
