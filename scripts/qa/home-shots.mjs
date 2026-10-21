// Full-page screenshots of site pages at several viewports, after scrolling so
// lazy images load. Also reports horizontal overflow and console errors.
// Usage: node scripts/qa/home-shots.mjs <outdir> [--mode=light|evening|dark] [--sizes=1280x800,390x844] / /discover/tasks ...
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const out = args.shift();
const flag = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const mode = flag("mode", "light");
const sizes = flag("sizes", "1280x800,390x844").split(",").map((s) => s.split("x").map(Number));
const paths = args.filter((a) => !a.startsWith("--"));
mkdirSync(out, { recursive: true });

// The site picks its mode from the clock (light 7–16, evening 16–19, dark otherwise) or a dark device.
const zone = { light: "Africa/Lagos", evening: "Africa/Lagos", dark: "Africa/Lagos" }[mode];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const problems = [];
for (const [w, h] of sizes) {
  const phone = w < 700;
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: phone,
    hasTouch: phone,
    timezoneId: zone,
    colorScheme: mode === "dark" ? "dark" : "light",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const path of paths) {
    errors.length = 0;
    await page.goto("http://127.0.0.1:8080" + path, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    // The dev server sometimes reloads the page once while it optimises dependencies.
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle").catch(() => {});
    if (mode !== "dark") {
      await page.evaluate((m) => {
        document.documentElement.classList.remove("mode-ease");
        document.documentElement.dataset.mode = m;
      }, mode);
    }
    // Scroll through so lazy images load.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += Math.round(h * 0.8)) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(900);
    const overflow = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > width + 1 && getComputedStyle(el).position !== "fixed";
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      return { scroll: document.documentElement.scrollWidth > width, wide };
    });
    const name = `${(path.replace(/\//g, "_") || "_home").replace(/^_$/, "_home")}-${w}x${h}${mode === "light" ? "" : `-${mode}`}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    const real = errors.filter((e) => !/favicon|Failed to load resource: the server responded with a status of 401/.test(e));
    if (overflow.scroll || real.length) problems.push({ path, size: `${w}x${h}`, overflow, errors: real.slice(0, 5) });
    console.log(name, overflow.scroll ? "OVERFLOW" : "ok", real.length ? `errors: ${real.length}` : "");
  }
  await context.close();
}
await browser.close();
if (problems.length) console.log(JSON.stringify(problems, null, 2));
