// Invoice "Needs follow-up" in a real browser: which invoices are listed, Copy
// reminder, Remind me (opens Remind with the text typed, nothing added until Add),
// Mark paid removes the row, search hides the section, no sideways scrolling.
// Seeds a synthetic invoice document through the app's own server function, so it
// runs against the dev server (sh scripts/qa/dev-up.sh). Synthetic data only.
// Usage: node scripts/qa/invoice-follow-up.mjs [outdir] [mobile]
import { appendFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, TARGET } from "./target.mjs";

const OUT = process.argv[2] || "screenshots/qa/invoice-follow-up";
const MOBILE = process.argv[3] === "mobile";
const TAG = MOBILE ? "-mobile" : "";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
console.log(`target: ${TARGET} at ${BASE}${MOBILE ? " (390x844 touch)" : " (1280x900)"}`);
const headers = { origin: BASE };
const account = { email: `qa-followup-${Date.now().toString(36)}${MOBILE ? "m" : "d"}@example.test`, password: "followup-pass-1", name: "QA Follow-up", ageConfirmed: true };
appendFileSync("screenshots/qa/test-accounts.jsonl", JSON.stringify({ email: account.email, password: account.password, base: BASE }) + "\n");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  ...(MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } }),
  timezoneId: "Africa/Lagos",
});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
const errors = [];
ctx.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const res = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: account });
if (!res.ok()) throw new Error(`sign-up: ${res.status()}`);

await page.goto(`${BASE}/apps/invoice`, { waitUntil: "networkidle", timeout: 120000 });
// "Today" in the browser's own time zone, as the app computes it.
const today = await page.evaluate(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});
const add = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const line = (id, rate) => [{ id, description: "Synthetic design work", qty: "1", rate }];
const inv = (n, over) => ({
  id: `qa-${n}`,
  number: `QA-${n}`,
  from: "Synthetic Studio\nLagos",
  to: "Okafor Foods\nokafor@example.test",
  issued: add(-30),
  due: add(-5),
  currency: "NGN",
  notes: "",
  taxPercent: "0",
  lines: line(`l${n}`, "50000"),
  status: "sent",
  sentOn: add(-30),
  createdAt: `${add(-30)}T09:00:00.000Z`,
  updatedAt: `${add(-30)}T09:00:00.000Z`,
  ...over,
});
const doc = {
  v: 2,
  from: "Synthetic Studio\nLagos",
  currency: "NGN",
  payment: "Bank: Example Bank\nAccount number: 0123456789",
  imported: { quote: true, proposal: true },
  clients: [],
  quotes: [],
  proposals: [],
  invoices: [
    inv("0001", { due: add(-1), to: "Bola Stores\nbola@example.test", lines: line("a", "25000") }),
    inv("0002", { due: add(-12) }),
    inv("0003", { due: today, to: "Chika Prints" }),
    inv("0004", { due: add(2), to: "Tomorrow Ventures" }),
    inv("0005", { due: add(5), to: "Later Ltd" }),
    inv("0006", { due: add(-9), status: "paid", paidOn: add(-2), to: "Paid Co" }),
    inv("0007", { due: add(-9), status: "draft", sentOn: undefined, to: "Draft Co" }),
  ],
};
const seeded = await page.evaluate(
  async ({ doc }) => {
    const m = await import("/src/lib/cove.functions.ts");
    const current = await m.loadDoc({ data: "invoice" });
    return m.saveDoc({ data: { slug: "invoice", payload: JSON.stringify(doc), baseRevision: current.ok ? current.revision : 0 } });
  },
  { doc },
);
ok(seeded.ok, "seeded 7 synthetic invoices");

await page.goto(`${BASE}/apps/invoice?view=invoices`, { waitUntil: "networkidle", timeout: 120000 });
const section = page.locator("[data-follow-up]");
await section.waitFor({ timeout: 60000 });
const rows = await section.locator("[data-follow-up-row]").evaluateAll((els) => els.map((el) => el.getAttribute("data-follow-up-row")));
ok(JSON.stringify(rows) === JSON.stringify(["QA-0002", "QA-0001", "QA-0003", "QA-0004"]), `listed most overdue first, paid/draft/later left out: ${rows.join(", ")}`);
ok((await section.locator("h2").innerText()).includes("(4)"), "heading shows the count");
const late = await section.locator("[data-late]").allInnerTexts();
ok(JSON.stringify(late) === JSON.stringify(["12 days overdue", "1 day overdue", "Due today", "Due in 2 days"]), `labels: ${late.join(" | ")}`);
await page.screenshot({ path: `${OUT}/list${TAG}.png`, fullPage: true });

// Copy reminder for QA-0001 (Bola Stores): its own details only.
await section.locator('[data-follow-up-row="QA-0001"] [data-copy-reminder]').click();
await page.getByText("Reminder for QA-0001 copied").waitFor({ timeout: 10000 });
const clip = await page.evaluate(() => navigator.clipboard.readText());
ok(/^Hello Bola Stores,/.test(clip) && clip.includes("invoice QA-0001 for ₦25,000.00 was due on") && clip.includes("(1 day ago)"), "reminder names the client, number, amount and days late");
ok(clip.includes("How to pay:\nBank: Example Bank\nAccount number: 0123456789"), "reminder includes How to pay");
ok(!/Okafor|Chika|QA-0002|50,000/.test(clip), "reminder has no other client's details");

// Mark paid removes the row.
await section.locator('[data-follow-up-row="QA-0002"]').getByRole("button", { name: "Mark invoice QA-0002 paid" }).click();
await section.locator('[data-follow-up-row="QA-0002"]').waitFor({ state: "detached", timeout: 10000 });
ok((await section.locator("[data-follow-up-row]").count()) === 3, "marking paid removes it from the list");

// Search hides the section so results are not mixed with it.
await page.getByLabel("Search invoices").fill("Okafor");
ok((await page.locator("[data-follow-up]").count()) === 0, "searching hides Needs follow-up");
await page.getByLabel("Search invoices").fill("");

// No sideways scrolling.
const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, `no sideways scrolling (${wide}px)`);
if (MOBILE) {
  const small = await section.locator("button, a").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.textContent?.trim()));
  ok(small.length === 0, `follow-up buttons are at least 44px tall${small.length ? `: ${small.join(", ")}` : ""}`);
}

// Remind me for QA-0004 ("Tomorrow Ventures" would be cut up by Remind, so the number alone is used).
await section.locator('[data-follow-up-row="QA-0004"] [data-remind-me]').click();
await page.waitForURL(/\/apps\/tasks/, { timeout: 60000 });
const box = page.locator("#remind-quick-add");
await box.waitFor({ timeout: 60000 });
ok((await box.inputValue()) === "Follow up invoice QA-0004 tomorrow 9am", `Remind's box is filled: "${await box.inputValue()}"`);
ok((await page.locator("[data-remind-prefill]").count()) === 1, "Remind says nothing is added until Add is pressed");
await page.screenshot({ path: `${OUT}/remind-prefilled${TAG}.png`, fullPage: false });
const before = await page.evaluate(async () => {
  const m = await import("/src/lib/cove.functions.ts");
  const r = await m.loadDoc({ data: "tasks" });
  return r.ok && r.payload ? JSON.parse(r.payload) : null;
});
ok(!JSON.stringify(before ?? {}).includes("QA-0004"), "nothing was added before pressing Add");
await page.getByRole("button", { name: "Add", exact: true }).click();
// The new task is due tomorrow, so it may not show in Today; read the saved document instead.
let after = null;
for (let i = 0; i < 20 && !JSON.stringify(after ?? {}).includes("QA-0004"); i += 1) {
  await page.waitForTimeout(750);
  after = await page.evaluate(async () => {
    const m = await import("/src/lib/cove.functions.ts");
    const r = await m.loadDoc({ data: "tasks" });
    return r.ok && r.payload ? JSON.parse(r.payload) : null;
  });
}
await page.screenshot({ path: `${OUT}/remind-added${TAG}.png`, fullPage: false });
const task = (after?.tasks ?? []).find((t) => t.title === "Follow up invoice QA-0004");
ok(Boolean(task), "after Add, the task is saved with the whole title");
ok(task?.due === add(1) && task?.time === "09:00", `saved for tomorrow 9am (${task?.due} ${task?.time})`);

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
