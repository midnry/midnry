// Site journeys for Apps, Games, Pricing, About and the shell (dev server on :8080).
// Usage: node scripts/qa/site-journeys.mjs [outdir]
import { chromium } from "playwright";
const out = process.argv[2] || "screenshots/qa/site-v2";
await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
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

// Search on /apps: results take over, the address keeps ?q=, Clear/Escape restore browsing.
const browse = (pg) => pg.locator("[data-browse]").count();
let p = await page();
await go(p, "/apps");
const search = p.getByRole("searchbox", { name: "Search apps" });
ok((await browse(p)) === 1 && (await p.locator("#finder").count()) === 1 && (await p.locator("#all").count()) === 1, "browsing sections show with no query");
await search.fill("invoice");
await p.waitForTimeout(400);
const count = p.locator("[data-search-results] h2").first();
const countText = (await count.textContent()) || "";
ok(/^\d+ apps? match(es)? “invoice”$/.test(countText.trim()), `search heading shows the count (${countText.trim()})`);
ok((await browse(p)) === 0, "a query hides goal cards, finder, audiences, subjects and A to Z");
for (const sel of ["#start-title", "#finder", "#all", "a[href='/audiences/students']"]) ok((await p.locator(sel).count()) === 0, `hidden while searching: ${sel}`);
ok((await p.locator('[data-search-results] a[href="/discover/invoice"]').count()) > 0, "search finds Invoice and links to its product page");
ok(await p.locator("[data-search-results]").getByRole("button", { name: "Clear search" }).isVisible(), "results offer a visible Clear search button");
await p.waitForURL(/\?q=invoice/, { timeout: 5000 }).catch(() => {});
ok(new URL(p.url()).searchParams.get("q") === "invoice", `the address keeps the query (${p.url()})`);
await p.waitForTimeout(800);
const status = (await p.locator("[data-search-status]").textContent()) || "";
ok(/^\d+ results?$/.test(status.trim()), `aria-live status says the count (“${status.trim()}”)`);
ok((await p.locator("[data-search-status]").getAttribute("aria-live")) === "polite", "status is aria-live polite");
await p.screenshot({ path: `${out}/search-active-desktop.png`, fullPage: false });

// Product page and back keeps the query and the results.
await p.locator('[data-search-results] a[href="/discover/invoice"]').first().click();
await p.waitForURL("**/discover/invoice", { timeout: 60000 });
await p.goBack({ waitUntil: "networkidle" });
await p.waitForTimeout(500);
ok(new URL(p.url()).searchParams.get("q") === "invoice", "back from a product page returns to ?q=invoice");
ok((await search.inputValue()) === "invoice", "back restores the query in the box");
ok((await browse(p)) === 0 && (await p.locator("[data-search-results]").count()) === 1, "back restores the results view");

// A direct link with ?q= opens straight into the results.
await go(p, "/apps?q=todo");
ok((await search.inputValue()) === "todo", "?q=todo fills the box on load");
ok((await p.locator('[data-search-results] a[href="/discover/tasks"]').count()) > 0, "“todo” finds Remind");

// Search understands meaning: related apps, merged app names, and small typos (src/lib/app-search.ts).
const resultHrefs = (pg) => pg.locator("[data-search-results] li > a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
await go(p, "/apps?q=invoice");
const invoiceHrefs = await resultHrefs(p);
ok(invoiceHrefs[0] === "/discover/invoice" && invoiceHrefs.includes("/discover/service-terms"), `“invoice” lists Invoice first, then Agreement (${invoiceHrefs.slice(0, 3).join(", ")})`);
ok((await p.locator('[data-search-results] li:has(a[href="/discover/service-terms"]) [data-match-reason]').textContent()) === "Matches: invoice", "Agreement says why it matched");
await go(p, "/apps?q=quote");
const quoteFirst = p.locator("[data-search-results] li").first();
ok((await quoteFirst.locator("a").first().getAttribute("href")) === "/discover/invoice", "“quote” finds Invoice first");
ok((await quoteFirst.locator("[data-match-reason]").textContent()) === "Quotes are part of Invoice", "“quote” says quotes are part of Invoice");
await go(p, "/apps?q=pomodoro");
ok((await resultHrefs(p))[0] === "/discover/tasks", "“pomodoro” finds Remind");
await go(p, "/apps?q=invioce");
ok((await resultHrefs(p))[0] === "/discover/invoice", "the typo “invioce” still finds Invoice first");
await p.screenshot({ path: `${out}/search-meaning-desktop.png` });

// Clear search restores browsing and focus.
await p.locator("[data-search-results]").getByRole("button", { name: "Clear search" }).click();
await p.waitForTimeout(300);
ok((await search.inputValue()) === "", "Clear search empties the box");
ok(await p.evaluate(() => document.activeElement?.getAttribute("type") === "search"), "focus returns to the search box");
ok((await browse(p)) === 1, "Clear search restores the browsing sections");
await p.waitForTimeout(200);
ok(!new URL(p.url()).searchParams.has("q"), "Clear search drops ?q= from the address");

// Escape clears, from the box and from inside the results.
await search.fill("abc");
await search.press("Escape");
ok((await search.inputValue()) === "", "Escape in the box clears the search");
ok((await browse(p)) === 1, "Escape restores browsing");
await search.fill("budget");
await p.waitForTimeout(300);
await p.locator("[data-search-results] a").first().focus();
await p.keyboard.press("Escape");
ok((await search.inputValue()) === "" && (await p.evaluate(() => document.activeElement?.getAttribute("type") === "search")), "Escape from a result clears and returns to the box");

// Empty state: says nothing matched, offers Clear search and Help me choose, plus goals.
await search.fill("zzqxv");
await p.waitForTimeout(900);
ok(await p.getByText("No apps match “zzqxv”.").isVisible(), "empty search says nothing matched");
ok((((await p.locator("[data-search-status]").textContent()) || "").trim()) === "No results", "status says No results");
const empty = p.locator("[data-search-results]");
ok(await empty.getByRole("button", { name: "Clear search" }).isVisible(), "empty state offers Clear search");
ok(await empty.getByRole("button", { name: "Help me choose" }).isVisible(), "empty state offers Help me choose");
ok((await empty.locator('a[href="/games"], a[href="/discover/invoice"]').count()) >= 2, "empty state offers the goal shortcuts");
await p.screenshot({ path: `${out}/search-empty-desktop.png` });
await empty.getByRole("button", { name: "Help me choose" }).click();
await p.waitForTimeout(800);
ok((await search.inputValue()) === "", "Help me choose clears the query");
ok(await p.locator("#finder").getByText("Question 1 of 2").isVisible(), "Help me choose starts the finder");
ok(new URL(p.url()).hash === "#finder" && !new URL(p.url()).searchParams.has("q"), `Help me choose goes to #finder (${p.url()})`);
const finderTop = await p.locator("#finder").evaluate((el) => el.getBoundingClientRect().top);
ok(finderTop < 400, `the finder is scrolled into view (${Math.round(finderTop)})`);

// Phone screenshots of search.
const sp = await page(390, 844, true);
await go(sp, "/apps?q=invoice");
await sp.waitForTimeout(300);
await sp.screenshot({ path: `${out}/search-active-phone.png` });
ok((await sp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "phone search results don't overflow");
await go(sp, "/apps?q=zzqxv");
await sp.locator("[data-search-results] h2").scrollIntoViewIfNeeded();
await sp.screenshot({ path: `${out}/search-empty-phone.png` });
await sp.context().close();

// Finder: short second question, More options, several first answers, Back/Skip/Change answers.
const shortCount = (pg) => pg.locator("#finder [data-short-list] button").count();
const optionCount = (pg) => pg.locator("#finder fieldset button[aria-pressed]").count();
async function finderShots(pg, tag) {
  await go(pg, "/apps#finder");
  await pg.waitForTimeout(800);
  const f = pg.locator("#finder");
  await f.getByRole("button", { name: /Working for myself/ }).click();
  await f.getByRole("button", { name: "Next question" }).click();
  await f.locator("h3").scrollIntoViewIfNeeded();
  await pg.screenshot({ path: `${out}/finder-step2-${tag}.png` });
  await f.getByRole("button", { name: /More options/ }).click();
  await f.locator("[data-more-options] legend").first().scrollIntoViewIfNeeded();
  await pg.screenshot({ path: `${out}/finder-more-${tag}.png` });
  await f.getByRole("button", { name: /Invoices, quotes, or client terms/ }).click();
  await f.getByRole("button", { name: "Show my suggestions" }).click();
  await pg.waitForTimeout(400);
  await f.locator("h3").scrollIntoViewIfNeeded();
  await pg.screenshot({ path: `${out}/finder-results-${tag}.png` });
}

await go(p, "/apps#finder");
await p.waitForTimeout(800);
const finder = p.locator("#finder");
ok(await finder.getByText("Question 1 of 2").isVisible(), "#finder starts the questions");
await finder.getByRole("button", { name: /Working for myself/ }).click();
await finder.getByRole("button", { name: "Next question" }).click();
ok(await finder.getByText("Question 2 of 2").isVisible(), "second question shows");
ok(await p.evaluate(() => document.activeElement?.tagName === "H3"), "focus moves to the new question");
const firstShort = await shortCount(p);
ok(firstShort >= 5 && firstShort <= 6 && (await optionCount(p)) === firstShort, `second question shows ≤6 options at first (${firstShort})`);
ok(await finder.locator("[data-short-list] button").first().getByText("Invoices, quotes, or client terms").isVisible(), "working for yourself puts invoices first");
const more = finder.getByRole("button", { name: /More options/ });
ok((await more.getAttribute("aria-expanded")) === "false", "More options starts collapsed");
await more.click();
const all = await optionCount(p);
ok(all >= 30, `More options reveals the rest (${all})`);
ok((await finder.locator("[data-more-options] legend").count()) >= 3, "the rest are grouped");
ok(await finder.getByRole("button", { name: "Fewer options" }).isVisible(), "the toggle offers Fewer options");
ok(await finder.getByText("Something else? Describe it in your own words.").isVisible(), "free text alternative stays");
await finder.getByRole("button", { name: /Invoices, quotes, or client terms/ }).click();
await finder.getByRole("button", { name: /Knowing where the money goes/ }).click();
await finder.getByRole("button", { name: "Show my suggestions" }).click();
await p.waitForTimeout(300);
ok(await finder.getByText("Here’s where to start.").isVisible(), "finder shows suggestions");
const results = await finder.locator("[data-result]").count();
ok(results >= 3 && results <= 5, `3 to 5 recommendations (${results})`);
const reasons = await finder.locator("[data-reason]").allTextContents();
ok(reasons.length === results && reasons.every((r) => /^(Because |A good place|Another option)/.test(r)), `every recommendation says why (${reasons[0]})`);
ok(reasons.some((r) => r.includes("you’re working for yourself and want to send invoices")), "the reason joins the first and second answers");
ok((await finder.locator('[data-result] a[href="/discover/invoice"]').count()) > 0, "finder links Invoice's product page");
const labels = await finder.locator("[data-access]").allTextContents();
ok(labels.length === results && labels.every((l) => l === "Free with an account" || l === "Included with Midnry Pass"), `each result shows its access label (${[...new Set(labels)].join(", ")})`);
ok(await finder.locator('[data-result="invoice"] [data-access]').textContent() === "Free with an account", "Invoice is labelled free");
ok(await finder.locator('[data-result="ledger"] [data-access]').textContent() === "Included with Midnry Pass", "Ledger is labelled Pass");
ok(await p.evaluate(() => JSON.parse(localStorage.getItem("midnry.match") || "{}").results?.length > 0), "answers are kept in this browser");

// Change answers goes back to the first question, keeping them; Back works on question 2.
await finder.getByRole("button", { name: "Change my answers" }).click();
ok(await finder.getByText("Question 1 of 2").isVisible(), "Change my answers returns to question 1");
ok((await finder.getByRole("button", { name: /Working for myself/ }).getAttribute("aria-pressed")) === "true", "Change my answers keeps the first answer");
// Several first answers: studying + selling, still a short list with ideas from both.
await finder.getByRole("button", { name: /Working for myself/ }).click();
await finder.getByRole("button", { name: /Studying or training/ }).click();
await finder.getByRole("button", { name: /Selling things/ }).click();
await finder.getByRole("button", { name: "Next question" }).click();
const multi = await finder.locator("[data-short-list] button").allTextContents();
ok(multi.length <= 6 && multi.length >= 5, `several first answers still show a short list (${multi.length})`);
ok(multi.some((t) => /Essays/.test(t)) && multi.some((t) => /Stock/.test(t)), "the short list mixes ideas from both answers");
await finder.getByRole("button", { name: "Back" }).click();
ok(await finder.getByText("Question 1 of 2").isVisible(), "Back returns to question 1");
await finder.getByRole("button", { name: "Next question" }).click();
await finder.getByRole("button", { name: "Skip this one" }).click();
await p.waitForTimeout(300);
const skipped = await finder.locator("[data-result]").count();
ok(skipped >= 3, `Skip on question 2 still suggests apps from the first answer (${skipped})`);
ok((await finder.locator("[data-reason]").first().textContent())?.startsWith("Because you’re"), "skipped suggestions explain the first answer");
// Skipping both still gives popular starting points.
await finder.getByRole("button", { name: "Change my answers" }).click();
for (const name of [/Studying or training/, /Selling things/]) await finder.getByRole("button", { name }).click();
await finder.getByRole("button", { name: "Skip this one" }).click();
await finder.getByRole("button", { name: "Skip this one" }).click();
await p.waitForTimeout(300);
ok((await finder.locator("[data-result]").count()) >= 3, "skipping both questions still suggests popular apps");
await finder.screenshot({ path: `${out}/journey-finder.png` });
await p.evaluate(() => localStorage.removeItem("midnry.match"));

const fd = await page(1280, 800);
await finderShots(fd, "desktop");
await fd.context().close();
const fm = await page(390, 844, true);
await finderShots(fm, "phone");
await fm.context().close();

// All apps: hash expands the list; filter by Pass.
await go(p, "/apps#all");
await p.waitForTimeout(500);
ok(await p.getByRole("button", { name: "Show fewer" }).isVisible(), "#all opens the full A to Z list");
await p.locator("#all").getByRole("button", { name: "Midnry Pass", exact: true }).click();
const passCount = await p.locator("#all li").count();
// The merges (Board, Focus and Habits into Remind) left 8 Pass apps; the count line must agree with the list.
const passLine = (await p.locator("#all h2 + p").textContent()) || "";
ok(passCount >= 8 && passLine.startsWith(`${passCount} apps · Midnry Pass`), `Pass filter lists the Pass apps (${passCount}, “${passLine}”)`);

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
for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 740], [844, 390]]) {
  const v = await page(w, h, w < 900);
  for (const path of ["/apps", "/apps?q=invoice", "/apps?q=zzqxv", "/games", "/pricing", "/about", "/login", "/for/professionals", "/everyday"]) {
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
  // The finder opened, with every option showing.
  await go(v, "/apps#finder");
  await v.waitForTimeout(600);
  await v.locator("#finder").getByRole("button", { name: /Working for myself/ }).click();
  await v.locator("#finder").getByRole("button", { name: "Next question" }).click();
  await v.locator("#finder").getByRole("button", { name: /More options/ }).click();
  const fo = await v.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(fo <= 0, `${w}x${h} finder with More options no horizontal overflow (${fo})`);
  await v.context().close();
}
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(" / ")}` : ""}`);
await b.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASSED");
process.exit(fails.length ? 1 : 0);
