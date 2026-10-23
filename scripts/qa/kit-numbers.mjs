// Number input in the kit apps, through the real screens on the local dev
// server (sh scripts/qa/dev-up.sh). Synthetic data, own QA account. Checks that
// a mistyped number is named on screen and never shown as a result, and that
// a tracker refuses to save it. Usage: node scripts/qa/kit-numbers.mjs [outdir] [mobile]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/kit-numbers";
const MOBILE = process.argv[3] === "mobile";
const TAG = MOBILE ? "-mobile" : "";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext(MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
ctx.on("page", (page) => {
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
  });
});
{
  const data = { email: "qa-numbers@example.test", password: "kit-numbers-qa-1", name: "QA Numbers", ageConfirmed: true };
  const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data });
  if (!up.ok() && !(await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data })).ok()) throw new Error("sign-in failed");
}
const page = await ctx.newPage();
async function open(slug) {
  await page.goto(`${BASE}/apps/${slug}`, { waitUntil: "networkidle", timeout: 120000 });
}
const results = () => page.locator("dl").first().innerText();

// Dose
await open("dose");
await page.getByLabel("Weight (kg)").waitFor({ timeout: 60000 });
const doseCases = [
  [["7,5", "10", "24"], /Use a dot for decimals, e\.g\. 7\.5/, "7,5 kg"],
  [["1,500", "10", "24"], /not realistic/, "1,500 kg"],
  [["132 lb", "10", "24"], /without “lb”/, "132 lb"],
  [["0", "10", "24"], /must be more than 0/, "0 kg"],
  [["-60", "10", "24"], /can’t be negative/, "-60 kg"],
  [["abc", "10", "24"], /must be a number/, "letters"],
  [["60", "15", "0"], /mg per mL must be more than 0/, "zero strength"],
  [["60", "15", ""], /Fill in mg per mL/, "blank strength"],
];
for (const [[kg, mgkg, mgml], pattern, why] of doseCases) {
  await page.getByLabel("Weight (kg)").fill(kg);
  await page.getByLabel("mg per kg").fill(mgkg);
  await page.getByLabel("mg per mL").fill(mgml);
  const text = await results();
  ok((await page.getByRole("button", { name: "Copy results" }).count()) === 0, `Dose ${why}: nothing to copy`);
  ok(pattern.test(text) && !/\bmg\b\s*$/m.test(text.replace(/mg per (kg|mL)/g, "")) && !/ mL$/m.test(text), `Dose ${why}: named, no result (${text.split("\n").slice(-1)[0]})`);
}
await page.getByLabel("Weight (kg)").fill("7.5 kg");
await page.getByLabel("mg per kg").fill("10");
await page.getByLabel("mg per mL").fill("24");
ok((await results()).includes("75 mg") && (await results()).includes("3.13 mL"), "Dose 7.5 kg × 10 mg/kg at 24 mg/mL = 75 mg, 3.13 mL");
await page.getByLabel("mg per kg").fill("120");
ok((await page.locator("body").innerText()).includes("Over 100 mg per kg is unusual"), "Dose: an unusual mg per kg shows a warning beside the result");
await page.screenshot({ path: `${OUT}/dose-warning${TAG}.png`, fullPage: MOBILE });
await page.getByLabel("Weight (kg)").fill("7,5");
await page.screenshot({ path: `${OUT}/dose-comma${TAG}.png`, fullPage: MOBILE });

// Profit: comma and negative
await open("margin");
await page.getByLabel("Cost").waitFor({ timeout: 60000 });
await page.getByLabel("Cost").fill("1,200");
await page.getByLabel("Price").fill("1,500");
ok((await results()).includes("300") && (await results()).includes("20%"), "Profit with thousands separators: 300, 20%");
await page.getByLabel("Price").fill("15,5");
ok(/Use a dot/.test(await results()) && !(await results()).includes("Margin"), "Profit 15,5: named, no margin");

// Tax: letters and blank never show ₦0
await open("paye");
await page.getByLabel("Annual pay (₦)").waitFor({ timeout: 60000 });
await page.getByLabel("Annual pay (₦)").fill("abc");
ok(/Annual pay must be a number/.test(await results()) && !(await results()).includes("PAYE estimate"), "Tax letters: named, no ₦0 estimate");
await page.getByLabel("Annual pay (₦)").fill("");
ok(/Fill in Annual pay/.test(await results()), "Tax blank pay: asked for");
await page.getByLabel("Annual pay (₦)").fill("₦6,000,000");
ok((await results()).includes("₦870,000"), "Tax ₦6,000,000 a year: ₦870,000");

// Solver: switching formula clears the boxes; zero time refused
await open("solver");
await page.getByLabel("Distance").waitFor({ timeout: 60000 });
await page.getByLabel("Distance").fill("100");
await page.getByLabel("Time").fill("0");
ok((await page.locator("body").innerText()).includes("Time must be more than 0"), "Solver: zero time named");
await page.getByLabel("Formula").selectOption("density");
ok((await page.getByLabel("Mass").inputValue()) === "" && (await page.getByLabel("Volume").inputValue()) === "", "Solver: switching formula starts the boxes empty");

// A tracker refuses to save a bad number (Menu price), and saves a good one
await open("menu");
await page.getByLabel("Dish").first().waitFor({ timeout: 60000 });
const entryCount = async () => {
  const text = await page.locator("body").innerText();
  const match = /(\d+) entr(?:y|ies)\b/.exec(text);
  return match ? Number(match[1]) : 0;
};
const before = await entryCount();
await page.getByLabel("Dish").first().fill("Jollof rice");
await page.getByLabel("Price").first().fill("2,5");
await page.getByRole("button", { name: "Add", exact: true }).click();
ok((await page.locator("[data-number-problem]").innerText()).includes("Use a dot"), "Menu price 2,5: named under the form");
ok((await entryCount()) === before, `and the row was not added (${before} entries before and after)`);
await page.getByLabel("Price").first().fill("₦2,500");
await page.getByRole("button", { name: "Add", exact: true }).click();
await page.waitForFunction((n) => new RegExp(`${n + 1} entr`).test(document.body.innerText), before, { timeout: 15000 });
ok((await page.locator("[data-number-problem]").count()) === 0, "Menu price ₦2,500: saved, message cleared");
await page.screenshot({ path: `${OUT}/menu${TAG}.png`, fullPage: MOBILE });

ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(" | ")})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
