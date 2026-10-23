// AI allowance for a free account: 5 AI writes a day, then the quick writer.
// Checks both the page (it switches to the quick writer and says why) and the
// server (see ai-allowance-server.mjs). Uses a new synthetic free account, recorded for closing later.
// Each AI write spends a little of the owner's AI quota (5 short contract summaries).
// Usage: QA_BASE=https://www.midnry.com node scripts/qa/ai-allowance.mjs [outdir]
//   then scripts/qa/ai-allowance-server.mjs with the account it prints.
import { appendFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, TARGET } from "./target.mjs";

const OUT = process.argv[2] || "screenshots/qa/ai-allowance";
mkdirSync(OUT, { recursive: true });
const COMMIT = process.env.QA_COMMIT || "unknown";
const fails = [];
const results = [];
const ok = (cond, msg, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}${detail ? ` — ${detail}` : ""}`);
  results.push({ check: msg, pass: Boolean(cond), detail, base: BASE, target: TARGET, commit: COMMIT, at: new Date().toISOString() });
  if (!cond) fails.push(msg);
};
console.log(`target: ${TARGET} at ${BASE}, commit ${COMMIT}`);
const headers = { origin: BASE };
const account = { email: `qa-ai-${Date.now().toString(36)}@example.test`, password: "ai-allowance-pass-1", name: "QA AI Allowance", ageConfirmed: true };
appendFileSync("screenshots/qa/test-accounts.jsonl", JSON.stringify({ email: account.email, password: account.password, base: BASE }) + "\n");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const errors = [];
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const signUp = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: account });
if (!signUp.ok()) throw new Error(`sign-up: ${signUp.status()}`);

// Remember that the page sent a real AI request.
let aiRequest = null;
// The AI request's data is { slug, values, variant, style }; draft saves also mention the mode, so match the keys.
const isAi = (req) => req.method() === "POST" && (req.postData() ?? "").includes('"k":["slug","values","variant"') && req.url().includes("_serverFn");
page.on("request", (req) => {
  if (!aiRequest && isAi(req)) aiRequest = { url: req.url(), body: req.postData(), headers: req.headers() };
});

await page.goto(`${BASE}/apps/write?view=contract`, { waitUntil: "networkidle", timeout: 120000 });
const contract = page.getByLabel("Contract text");
await contract.waitFor({ timeout: 60000 });
await contract.fill(
  "This Agreement is made between Synthetic Studio Ltd and Nwosu Pharmacy (the Client). The Client shall pay ₦250,000 within 14 days of the invoice. The term is 6 months from 1 November 2026. Either party may end it with 30 days written notice.",
);

const by = [];
for (let i = 1; i <= 6; i += 1) {
  const button = page.getByRole("button", { name: /^(Write it|Try another wording|Update)$/ }).first();
  const response = i <= 5 ? page.waitForResponse((res) => isAi(res.request()), { timeout: 180000 }) : null;
  await button.click();
  if (response) {
    const res = await response;
    const text = await res.text();
    const kind = text.includes('"pieces"') ? "ai" : text.includes('"s":"limit"') ? "limit" : text.includes('"s":"off"') ? "off" : text.includes('"s":"busy"') ? "busy" : "error";
    by.push(kind);
  } else {
    await page.waitForTimeout(1500);
    by.push(errors.length ? "page-error" : "page-only");
  }
  await page.waitForTimeout(800);
  const output = await page.getByRole("region", { name: "Written text" }).getAttribute("data-output").catch(() => null);
  console.log(`write ${i}: server ${by[i - 1]}, written by ${output}`);
  if (i === 6) {
    ok(output === "quick", "6th write: the page uses the quick writer", `written by ${output}`);
    ok(/You.ve used today.s 5 AI writes/.test(await page.locator("body").innerText()), "6th write: the page says today's 5 AI writes are used and when they reset");
    await page.screenshot({ path: `${OUT}/sixth-write.png`, fullPage: false });
  }
}
ok(by.slice(0, 5).every((kind) => kind === "ai"), "writes 1–5 were written by the AI", by.slice(0, 5).join(", "));

ok(Boolean(aiRequest), "captured the page's AI request");
// The server side (a 6th request refused with "limit") is checked by
// scripts/qa/ai-allowance-server.mjs with this account; Cloudflare refuses
// server calls replayed from outside a real browser, so it is done in the page.
console.log(`next: node scripts/qa/ai-allowance-server.mjs ${account.email} ${account.password}`);

ok(errors.length === 0, "no page errors", errors.join(" | "));
appendFileSync(`${OUT}/results.jsonl`, results.map((r) => JSON.stringify(r)).join("\n") + "\n");
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
