// Site journeys for Apps, Games, Pricing, About and the shell (dev server on :8080).
// Usage: node scripts/qa/site-journeys.mjs [outdir]
import { chromium } from "playwright";
const out = process.argv[2] || "screenshots/qa/site";
const BASE = "http://127.0.0.1:8080";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"} ${msg}`); if (!cond) fails.push(msg); };
const errors = [];
async function page(w = 1280, h = 800, mobile = false) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${p.url()}: ${e.message}`));
  return p;
}
const go = (p, path) => p.goto(BASE + path, { waitUntil: "networkidle", timeout: 120000 });

// Search: results, then the empty state, then clear.
let p = await page();
await go(p, "/apps");
const search = p.getByRole("searchbox", { name: "Search apps" });
await search.fill("invoice");
await p.waitForTimeout(300);
ok(await p.getByText(/apps? match/).first().isVisible(), "search shows a result count");
ok((await p.locator('a[href="/discover/invoice"]').count()) > 0, "search finds Invoice and links to its product page");
await search.fill("todo");
ok((await p.locator('a[href="/discover/tasks"]').count()) > 0, "“todo” finds Remind");
await search.fill("zzqxv");
await p.waitForTimeout(300);
ok(await p.getByText("No apps match “zzqxv”.").isVisible(), "empty search says nothing matched");
ok(await p.getByRole("button", { name: "Clear search" }).first().isVisible(), "empty state offers Clear search");
ok(await p.getByRole("link", { name: "Browse all apps" }).first().isVisible(), "empty state offers Browse all apps");
ok((await p.locator('a[href="/games"]').count()) > 0, "empty state suggests goals");
await p.screenshot({ path: `${out}/journey-search-empty.png` });
await p.getByRole("button", { name: "Clear search" }).last().click();
ok((await search.inputValue()) === "", "Clear search empties the box");
ok(await p.evaluate(() => document.activeElement?.getAttribute("type") === "search"), "focus returns to the search box");
await search.fill("abc");
await search.press("Escape");
ok((await search.inputValue()) === "", "Escape clears the search");

// Finder: two questions, keyboard only, results link to product pages with access labels.
await go(p, "/apps#finder");
await p.waitForTimeout(800);
ok(await p.getByText("Question 1 of 2").isVisible(), "#finder starts the questions");
await p.getByRole("button", { name: /Working for myself/ }).click();
await p.getByRole("button", { name: "Next question" }).click();
ok(await p.getByText("Question 2 of 2").isVisible(), "second question shows");
ok(await p.evaluate(() => document.activeElement?.tagName === "H3"), "focus moves to the new question");
await p.getByRole("button", { name: /Invoices, quotes, or client terms/ }).click();
await p.getByRole("button", { name: /Show more ideas/ }).click();
await p.getByRole("button", { name: /Knowing where the money goes/ }).click();
await p.getByRole("button", { name: "Show my suggestions" }).click();
await p.waitForTimeout(300);
const finder = p.locator("#finder");
ok(await finder.getByText("Here’s where to start.").isVisible(), "finder shows suggestions");
ok((await finder.locator('a[href="/discover/invoice"]').count()) > 0, "finder links Invoice's product page");
ok(await finder.getByText("Free with an account").first().isVisible(), "finder shows the free label");
ok(await finder.getByText("Included with Midnry Pass").first().isVisible(), "finder shows the Pass label (Ledger)");
await finder.screenshot({ path: `${out}/journey-finder.png` });

// All apps: hash expands the list; filter by Pass.
await go(p, "/apps#all");
await p.waitForTimeout(500);
ok(await p.getByRole("button", { name: "Show fewer" }).isVisible(), "#all opens the full A to Z list");
await p.locator("#all").getByRole("button", { name: "Midnry Pass", exact: true }).click();
const passCount = await p.locator("#all li").count();
ok(passCount >= 11, `Pass filter lists the Pass apps (${passCount})`);

// Remind is listed under Professionals' general tools, not the Developers shelf.
await go(p, "/for/professionals");
const handy = p.locator("#group-more");
ok((await handy.locator('a[href="/discover/tasks"]').count()) > 0, "Remind is under “Handy for professionals”");
ok((await p.locator("#group-developers a[href='/discover/tasks']").count()) === 0, "Remind is not on the Developers shelf");
await go(p, "/sections/developers");
ok((await p.locator('a[href="/discover/tasks"]').count()) === 0, "Developers subject no longer lists Remind");

// Games hub → play routes and product pages.
await go(p, "/games");
for (const g of ["abuja-hustle", "outpost-zero"]) {
  ok((await p.locator(`a[href="/games/${g}"]`).count()) > 0, `/games links to play /games/${g}`);
  ok((await p.locator(`a[href="/discover/${g}"]`).count()) > 0, `/games links to /discover/${g}`);
}
await p.getByRole("link", { name: "Play Abuja Hustle" }).click();
await p.waitForURL("**/games/abuja-hustle", { timeout: 60000 });
ok(true, "Play Abuja Hustle opens the play route");

// Pricing → sign up with next=/billing; product page → next=/apps/<slug>.
await go(p, "/pricing");
ok((await p.locator('a[href="/login?next=%2Fbilling&intent=register"]').count()) > 0, "pricing Pass CTA goes to /login?next=/billing");
ok(await p.getByText("Paystack").first().isVisible(), "pricing names Paystack");
await go(p, "/discover/ledger");
ok((await p.locator('a[href^="/login?next=%2Fapps%2Fledger"]').count()) > 0, "product page signs up with next=/apps/ledger");
await go(p, "/login?next=/apps/ledger&intent=register");
ok(await p.getByText(/straight to Ledger/).isVisible(), "login says where you will land");
ok(await p.getByText(/Free apps open as soon as the account exists/).isVisible(), "login explains why an account");

// Shell: nav names, footer links, mobile menu keyboard.
await go(p, "/about");
const nav = p.getByRole("navigation", { name: "Main" });
ok(await nav.getByRole("link", { name: "Apps" }).isVisible() && await nav.getByRole("link", { name: "Games" }).isVisible(), "header shows Apps and Games");
ok((await nav.getByText("Desk", { exact: true }).count()) === 0, "header no longer says Desk");
for (const href of ["/apps", "/games", "/pricing", "/about", "/security", "/submit", "/contact", "/privacy", "/terms"]) {
  ok((await p.locator(`footer a[href="${href}"]`).count()) === 1, `footer links ${href}`);
}
ok(await p.getByText("hello@midnry.com").isVisible(), "about shows the contact address");

const m = await page(390, 844, true);
await go(m, "/apps");
await m.getByRole("button", { name: "Open menu" }).click();
ok(await m.locator("#site-menu").isVisible(), "mobile menu opens");
ok(await m.evaluate(() => document.activeElement?.closest("#site-menu") !== null), "focus moves into the menu");
for (const name of ["Apps", "Games", "Pricing", "Sign in", "Create account"]) {
  ok((await m.locator("#site-menu").getByRole("link", { name, exact: true }).count()) > 0, `mobile menu has ${name}`);
}
await m.keyboard.press("Escape");
ok(!(await m.locator("#site-menu").isVisible()), "Escape closes the menu");
ok(await m.evaluate(() => document.activeElement?.getAttribute("aria-controls") === "site-menu"), "focus returns to the menu button");

// No sideways scroll and touch-size targets across viewports.
for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [390, 844], [844, 390]]) {
  const v = await page(w, h, w < 900);
  for (const path of ["/apps", "/games", "/pricing", "/about", "/login", "/for/professionals", "/everyday"]) {
    await go(v, path);
    const over = await v.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 0, `${w}x${h} ${path} no horizontal overflow (${over})`);
    const small = await v.evaluate(() =>
      [...document.querySelectorAll("main a, main button, header a, header button, footer a")]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest(".sr-only") && !el.closest("p, dd, li > span"); })
        .filter((el) => { const r = el.getBoundingClientRect(); return r.height < 43.5; })
        .map((el) => `${el.tagName}:${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}`),
    );
    if (small.length) console.log(`  note ${w} ${path} small targets: ${small.slice(0, 6).join(" | ")}`);
  }
  await v.context().close();
}
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(" / ")}` : ""}`);
await b.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
