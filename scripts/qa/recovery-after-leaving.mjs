// Recovery when a save can't be kept, or the person leaves while a save is
// still pending, in a real browser against the local dev server
// (sh scripts/qa/dev-up.sh). Uses its own account (qa-recovery@example.test)
// and the free Emergency card app, so it never touches other QA accounts'
// documents. Synthetic data only. Covers:
//  A. "Refresh now" when this browser will not store the copy: no reload, the
//     document stays, Copy my version works, Refresh anyway is explicit;
//  B. leaving the tool during the save pause while offline: a copy is kept
//     and offered back when the app opens again, then saved;
//  C. leaving with a save in flight that conflicts later: the copy is kept
//     with the conflict, offered back, and Keep my version saves it;
//  D. leaving with a save in flight that lands later: no offer, nothing lost;
//  E. no page errors.
// Usage: node scripts/qa/recovery-after-leaving.mjs [outdir] [mobile]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";
const OUT = process.argv[2] || "screenshots/qa/recovery";
const MOBILE = process.argv[3] === "mobile";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "PASS" : "FAIL"} ${msg}`);
  if (!cond) fails.push(msg);
};
const errors = [];
const headers = { origin: BASE };
const EMAIL = "qa-recovery@example.test";
const PASSWORD = "recovery-qa-pass-1";
const SLUG = "ice-card";
const FIELD = "Your name";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext(
  MOBILE
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true }
    : { viewport: { width: 1280, height: 900 }, acceptDownloads: true },
);
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
ctx.on("page", (page) => {
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|403|401|net::ERR_FAILED|Failed to fetch|blocked/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`);
  });
});
{
  const up = await ctx.request.post(`${BASE}/api/auth/sign-up/email`, { headers, data: { email: EMAIL, password: PASSWORD, name: "QA Recovery", ageConfirmed: true } });
  if (!up.ok()) {
    const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email`, { headers, data: { email: EMAIL, password: PASSWORD } });
    if (!r.ok()) throw new Error("Could not sign in as the recovery QA account");
  }
}

const isSave = (req) => {
  if (req.method() !== "POST") return false;
  try {
    return Buffer.from(new URL(req.url()).pathname.split("/").pop(), "base64url").toString("utf8").includes("saveDoc");
  } catch {
    return false;
  }
};
async function open(page) {
  await page.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByLabel(FIELD).waitFor({ timeout: 60000 });
}
const savedText = (page) => page.getByText("Saved", { exact: true }).first().waitFor({ timeout: 30000 });
const panel = (page, kind) => page.locator(`[data-doc-recovery="${kind}"]`);
async function load(page) {
  const res = await page.evaluate(async (slug) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: slug });
  }, SLUG);
  return res.ok ? { doc: res.payload ? JSON.parse(res.payload) : null, revision: res.revision } : null;
}
async function seed(page, doc) {
  const res = await page.evaluate(async ({ slug, payload }) => {
    const m = await import("/src/lib/cove.functions.ts");
    const current = await m.loadDoc({ data: slug });
    return m.saveDoc({ data: { slug, payload, baseRevision: current.ok ? current.revision : 0 } });
  }, { slug: SLUG, payload: JSON.stringify(doc) });
  if (!res.ok) throw new Error(`seed: ${JSON.stringify(res)}`);
}
const name = async (page) => (await load(page))?.doc?.values?.name ?? null;
/** The recovery copies this browser holds in IndexedDB. */
async function copies(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("midnry-recovery", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("docs");
        req.onsuccess = () => {
          const all = req.result.transaction("docs", "readonly").objectStore("docs").getAll();
          all.onsuccess = () => resolve(all.result.map((r) => ({ owner: r.owner, slug: r.slug, reason: r.reason, payload: r.payload })));
          all.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      }),
  );
}
async function noOffer(page) {
  await page.waitForTimeout(2500);
  return (await page.locator("[data-doc-recovery]").count()) === 0;
}
/** Leave the tool through the app's own link (in-app navigation, no reload). */
async function leave(page) {
  await page.getByRole("link", { name: "Your desk" }).click();
  await page.waitForURL(/\/apps\/?(\?.*)?$/, { timeout: 30000 });
}

// ── base document ───────────────────────────────────────────────────────────
const start = await ctx.newPage();
await open(start);
await seed(start, { values: { name: "Base name", call: "Amaka Okafor", phone: "0803 000 0000", notes: "" } });
await start.close();

// ── A. Refresh now, storage blocked ─────────────────────────────────────────
const tabA = await ctx.newPage();
await tabA.addInitScript(() => {
  Object.defineProperty(window, "indexedDB", {
    get() {
      throw new Error("blocked");
    },
  });
  Object.defineProperty(window, "sessionStorage", {
    get() {
      throw new Error("blocked");
    },
  });
});
await open(tabA);
// Act like an outdated tab: strip baseRevision from this page's save requests.
const legacy = async (route) => {
  const req = route.request();
  if (!isSave(req)) return route.continue();
  const body = JSON.parse(req.postData() || "{}");
  const strip = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.p?.k && Array.isArray(node.p.k)) {
      const at = node.p.k.indexOf("baseRevision");
      if (at >= 0) {
        node.p.k.splice(at, 1);
        node.p.v.splice(at, 1);
      }
    }
    for (const value of Object.values(node)) strip(value);
  };
  strip(body);
  return route.continue({ postData: JSON.stringify(body) });
};
await tabA.route("**/_serverFn/**", legacy);
await tabA.getByLabel(FIELD).fill("Typed on an outdated page");
const refresh = panel(tabA, "refresh");
await refresh.waitFor({ timeout: 30000 });
await tabA.evaluate(() => {
  window.__stayed = true;
});
await refresh.getByRole("button", { name: "Refresh now" }).click();
const notStored = refresh.locator('[data-doc-recovery-step="not-stored"]');
await notStored.waitFor({ timeout: 15000 });
ok(await notStored.getByText("This browser would not keep a copy").isVisible(), "Refresh now reports that no copy could be kept");
ok((await tabA.evaluate(() => window.__stayed === true)) && (await tabA.getByLabel(FIELD).inputValue()) === "Typed on an outdated page", "the page was not reloaded and the document is still open");
ok((await name(tabA)) === "Base name", "the saved row is unchanged");
await tabA.screenshot({ path: `${OUT}/A1-not-stored${MOBILE ? "-mobile" : ""}.png`, fullPage: MOBILE });
await notStored.getByRole("button", { name: "Copy my version" }).click();
await tabA.waitForTimeout(500);
const clip = await tabA.evaluate(() => navigator.clipboard.readText());
ok(clip.includes("Typed on an outdated page"), "Copy my version copies my version");
await tabA.unroute("**/_serverFn/**", legacy);
await Promise.all([tabA.waitForEvent("load", { timeout: 60000 }), notStored.getByRole("button", { name: /Refresh anyway/ }).click()]);
await tabA.waitForLoadState("networkidle");
ok((await tabA.evaluate(() => window.__stayed)) === undefined, "Refresh anyway reloads, as an explicit choice");
await tabA.close();

// ── B. Leave during the pause while offline ─────────────────────────────────
const tabB = await ctx.newPage();
await open(tabB);
const block = (route) => (isSave(route.request()) ? route.abort("failed") : route.continue());
await tabB.route("**/_serverFn/**", block);
await tabB.getByLabel(FIELD).fill("Typed then left while offline");
await leave(tabB);
await tabB.waitForTimeout(1500);
let kept = (await copies(tabB)).find((c) => c.slug === SLUG);
ok(kept && ["pending", "retrying"].includes(kept.reason) && kept.payload.includes("Typed then left while offline"), `leaving during the pause keeps a copy (${kept?.reason})`);
ok((await name(tabB)) === "Base name", "the blocked save never reached the server");
await tabB.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
const offerB = panel(tabB, "recovered");
await offerB.waitFor({ timeout: 15000 });
ok(true, "opening the app again offers the unsaved change");
await tabB.screenshot({ path: `${OUT}/B1-offered-after-leaving${MOBILE ? "-mobile" : ""}.png`, fullPage: MOBILE });
await tabB.unroute("**/_serverFn/**", block);
await offerB.getByRole("button", { name: "Keep my version" }).click();
await offerB.getByRole("button", { name: "Replace it with my version" }).click();
await offerB.waitFor({ state: "detached", timeout: 15000 });
await savedText(tabB);
ok((await name(tabB)) === "Typed then left while offline", "the change is saved once restored");
await tabB.waitForTimeout(800);
ok(!(await copies(tabB)).some((c) => c.slug === SLUG), "the copy is cleared once saved");
await tabB.close();

// ── C. Leave with a save in flight that conflicts later ─────────────────────
const tabC = await ctx.newPage();
await open(tabC);
let releaseC;
const heldC = new Promise((resolve) => (releaseC = resolve));
const hold = async (route) => {
  if (!isSave(route.request())) return route.continue();
  await heldC;
  return route.continue();
};
await tabC.route("**/_serverFn/**", hold);
await tabC.getByLabel(FIELD).fill("Typed then left; my phone saved first");
await tabC.waitForTimeout(700);
await leave(tabC);
await tabC.waitForTimeout(800);
kept = (await copies(tabC)).find((c) => c.slug === SLUG);
ok(kept?.reason === "pending" && kept.payload.includes("my phone saved first"), "leaving with a save in flight keeps a pending copy first");
const phone = await ctx.newPage();
await phone.goto(`${BASE}/apps`, { waitUntil: "networkidle", timeout: 120000 });
await seed(phone, { values: { name: "From my phone", call: "Amaka Okafor", phone: "0803 000 0000", notes: "" } });
await phone.close();
releaseC();
await tabC.waitForTimeout(2500);
kept = (await copies(tabC)).find((c) => c.slug === SLUG);
ok(kept?.reason === "conflict" && kept.payload.includes("my phone saved first"), "the late conflict keeps the copy with its reason");
ok((await name(tabC)) === "From my phone", "nothing was overwritten");
await tabC.unroute("**/_serverFn/**", hold);
await tabC.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
const offerC = panel(tabC, "recovered");
await offerC.waitFor({ timeout: 15000 });
await offerC.getByRole("button", { name: "Review both" }).click();
await offerC.getByRole("region", { name: "Saved version" }).getByText("From my phone").waitFor({ timeout: 15000 });
ok((await offerC.getByRole("region", { name: "Your version (not saved)" }).innerText()).includes("my phone saved first"), "Review shows my version and the newer saved one");
await tabC.screenshot({ path: `${OUT}/C1-late-conflict-review${MOBILE ? "-mobile" : ""}.png`, fullPage: MOBILE });
await offerC.getByRole("button", { name: "Back to choices" }).click();
await offerC.getByRole("button", { name: "Keep my version" }).click();
await offerC.getByRole("button", { name: "Replace it with my version" }).click();
await offerC.waitFor({ state: "detached", timeout: 15000 });
await savedText(tabC);
ok((await name(tabC)) === "Typed then left; my phone saved first", "Keep my version saves it over the newer one");
await tabC.waitForTimeout(800);
ok(!(await copies(tabC)).some((c) => c.slug === SLUG), "and clears the copy");
await tabC.close();

// ── D. Leave with a save in flight that lands later ─────────────────────────
const tabD = await ctx.newPage();
await open(tabD);
const slow = async (route) => {
  if (!isSave(route.request())) return route.continue();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return route.continue();
};
await tabD.route("**/_serverFn/**", slow);
await tabD.getByLabel(FIELD).fill("Typed then left; saved late");
await tabD.waitForTimeout(600);
await leave(tabD);
await tabD.waitForTimeout(300);
kept = (await copies(tabD)).find((c) => c.slug === SLUG);
ok(kept?.reason === "pending", "a pending copy is kept while the request is in flight");
await tabD.waitForTimeout(3000);
ok(!(await copies(tabD)).some((c) => c.slug === SLUG), "the late success clears it");
ok((await name(tabD)) === "Typed then left; saved late", "the change made just before leaving is saved");
await tabD.unroute("**/_serverFn/**", slow);
await tabD.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
ok(await noOffer(tabD), "nothing is offered");
ok((await tabD.getByLabel(FIELD).inputValue()) === "Typed then left; saved late", "the app shows the saved change");
await tabD.close();

ok(errors.length === 0, `no page errors (${errors.slice(0, 5).join(" | ")})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
