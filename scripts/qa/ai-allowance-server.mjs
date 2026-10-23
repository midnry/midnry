// Server-side half of the AI allowance check, for an account that has already
// used today's free AI writes (run scripts/qa/ai-allowance.mjs first). The page
// is made to believe writes are left (its own copy of the count is edited as the
// reply arrives), so it sends a real AI request; the server must refuse it with
// "limit" and the page must fall back to the quick writer. No AI is spent.
// Usage: QA_BASE=https://www.midnry.com node scripts/qa/ai-allowance-server.mjs email password [outdir]
import { appendFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, TARGET } from "./target.mjs";

const [email, password] = process.argv.slice(2, 4);
const OUT = process.argv[4] || "screenshots/qa/ai-allowance";
mkdirSync(OUT, { recursive: true });
const COMMIT = process.env.QA_COMMIT || "unknown";
const fails = [];
const results = [];
const ok = (cond, msg, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}${detail ? ` — ${detail}` : ""}`);
  results.push({ check: msg, pass: Boolean(cond), detail, base: BASE, target: TARGET, commit: COMMIT, at: new Date().toISOString() });
  if (!cond) fails.push(msg);
};
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const res = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers: { origin: BASE }, data: { email, password } });
if (!res.ok()) throw new Error(`sign-in: ${res.status()}`);

// First, the page as served: it should already know no AI writes are left.
await page.goto(`${BASE}/apps/write?view=contract`, { waitUntil: "networkidle", timeout: 120000 });
const line = (await page.locator("[data-allowance]").innerText()).replace(/\s+/g, " ");
ok(/0 .*left|no AI writes left|used today/i.test(line), "the page shows no AI writes left today", line);

// The page reads its allowance from the studio state server function (its reply has
// "allowance"). Inside the browser (Cloudflare refuses server calls from outside a real
// browser), rewrite "left" in that reply so the page thinks 3 writes remain.
await page.addInitScript(() => {
  const real = window.fetch.bind(window);
  function bump(node) {
    if (!node || typeof node !== "object") return false;
    let hit = false;
    if (node.p && Array.isArray(node.p.k) && Array.isArray(node.p.v)) {
      const at = node.p.k.indexOf("left");
      if (at >= 0 && node.p.k.includes("limit") && node.p.v[at] && node.p.v[at].t === 0) {
        node.p.v[at] = { t: 0, s: 3 };
        hit = true;
      }
    }
    for (const value of Object.values(node)) hit = bump(value) || hit;
    return hit;
  }
  window.fetch = async (...args) => {
    const res = await real(...args);
    const url = String(args[0] && args[0].url ? args[0].url : args[0]);
    if (!url.includes("/_serverFn/")) return res;
    const text = await res.clone().text();
    if (!text.includes('"allowance"')) return res;
    try {
      const json = JSON.parse(text);
      if (bump(json)) {
        window.__qaEdited = true;
        return new Response(JSON.stringify(json), { status: res.status, statusText: res.statusText, headers: res.headers });
      }
    } catch {
      // Not JSON: leave the reply as it is.
    }
    return res;
  };
});
const isAi = (req) => req.method() === "POST" && (req.postData() ?? "").includes('"k":["slug","values","variant"') && req.url().includes("_serverFn");
await page.goto(`${BASE}/apps/write?view=contract`, { waitUntil: "networkidle", timeout: 120000 });
ok(await page.evaluate(() => window.__qaEdited === true), "the page's own copy of the count was edited to 3 left");
const tricked = (await page.locator("[data-allowance]").innerText()).replace(/\s+/g, " ");
console.log(`page now says: ${tricked}`);
const response = page.waitForResponse((r) => isAi(r.request()), { timeout: 60000 });
await page.getByRole("button", { name: /^(Write it|Try another wording|Update)$/ }).first().click();
const text = await (await response).text();
ok(text.includes("limit") && !text.includes("pieces"), "server refuses the AI write (reason: limit)", text.slice(0, 160).replace(/\s+/g, " "));
await page.waitForTimeout(1500);
const output = await page.getByRole("region", { name: "Written text" }).getAttribute("data-output").catch(() => null);
ok(output === "quick", "the page falls back to the quick writer", `written by ${output}`);
const note = await page.locator("body").innerText();
const said = note.match(/You.ve used today.s \d+ AI writes[^\n]*/)?.[0] ?? "";
ok(Boolean(said), "the page says why", said);
await page.screenshot({ path: `${OUT}/server-refused.png`, fullPage: true });
ok(errors.length === 0, "no page errors", errors.join(" | "));
appendFileSync(`${OUT}/results.jsonl`, results.map((r) => JSON.stringify(r)).join("\n") + "\n");
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
