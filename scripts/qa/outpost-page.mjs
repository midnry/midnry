// The Outpost Zero "about" page (/discover/outpost-zero): full-page and first-screen
// photos at laptop, small laptop, phone and phone-landscape sizes, plus checks for
// sideways scrolling, console errors, broken images, small tap targets, headings,
// links (play route, Midnry home, games hub) and the in-page jump links.
//   sh scripts/qa/dev-up.sh && node scripts/qa/outpost-page.mjs [baseURL]
// Photos: screenshots/qa/outpost-page/
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const OUT = "screenshots/qa/outpost-page";
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [1280, 800, false],
  [1024, 768, false],
  [390, 844, true],
  [844, 390, true],
];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const report = {};
let failed = false;
for (const [w, h, mobile] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await p.goto(BASE + "/discover/outpost-zero", { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/hero-${w}x${h}.png` });
  // Load the lazy images before the full-page photo.
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/full-${w}x${h}.png`, fullPage: true });
  const audit = await p.evaluate(() => {
    const doc = document.documentElement;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !el.closest(".sr-only");
    };
    const small = [...document.querySelectorAll("a, button")]
      .filter(visible)
      .filter((el) => !el.closest("#__grok, [data-grok]"))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44 || r.width < 44)
      .map(({ el, r }) => `${el.textContent.trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1 && !el.closest("[aria-hidden], picture"))
      .map((el) => el.tagName + "." + String(el.className).slice(0, 40));
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      wide: wide.slice(0, 5),
      headings: [...document.querySelectorAll("h1, h2, h3, h4")].map((el) => el.tagName + " " + el.textContent.trim().replace(/\s+/g, " ")),
      brokenImages: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
      heroImage: document.querySelector("picture img")?.currentSrc,
      links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
      smallTargets: small,
      h1Font: getComputedStyle(document.querySelector("h1")).fontFamily,
      h1Size: getComputedStyle(document.querySelector("h1")).fontSize,
    };
  });
  // The hero's Explore button lands on the next section.
  await p.click('a[href="#the-game"] >> nth=0');
  await p.waitForTimeout(1200);
  const explore = await p.evaluate(() => ({
    top: Math.round(document.getElementById("the-game").getBoundingClientRect().top),
    focused: document.activeElement?.id,
  }));
  const hasLinks = ["/games/outpost-zero", "/", "/games", "#coming-soon", "#inside", "#top"].every((l) => audit.links.includes(l));
  const ok =
    audit.scrollWidth <= audit.clientWidth &&
    errors.length === 0 &&
    audit.brokenImages.length === 0 &&
    audit.smallTargets.length === 0 &&
    hasLinks &&
    Math.abs(explore.top) <= 2 &&
    explore.focused === "the-game";
  if (!ok) failed = true;
  report[`${w}x${h}`] = { ok, errors, explore, hasLinks, ...audit, links: undefined, headings: w === 1280 ? audit.headings : undefined };
  await ctx.close();
}
// Reduced motion: jumps are instant.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(BASE + "/discover/outpost-zero", { waitUntil: "networkidle", timeout: 120000 });
  await p.click('header a[href="#coming-soon"]');
  await p.waitForTimeout(60);
  const top = await p.evaluate(() => Math.round(document.getElementById("coming-soon").getBoundingClientRect().top));
  report.reducedMotion = { instantJumpTop: top, ok: Math.abs(top) <= 2 };
  if (Math.abs(top) > 2) failed = true;
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(report, null, 2));
console.log(failed ? "FAIL" : "PASS");
process.exitCode = failed ? 1 : 0;
