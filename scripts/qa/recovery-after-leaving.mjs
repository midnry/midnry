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
//  E. leaving with a save in flight that then fails (network): the copy is
//     kept as "retrying", offered on reopening, restored and cleared once saved;
//  F. this browser cannot store a copy: leaving inside the app with an unsaved
//     change asks first; staying keeps the change, which then saves; once
//     saved, leaving does not ask;
//  G. account and app isolation in one browser: a second account signed in
//     on the same browser is never offered the first account's copy, nor is
//     another app; the first account gets it back after signing in again;
//  H. no page errors.
// Usage: node scripts/qa/recovery-after-leaving.mjs [outdir] [mobile]
// Against a production build: QA_TARGET=build (see scripts/qa/target.mjs); the
// card is then seeded and read through its own form instead of /src imports.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, BUILD, TARGET, isServerFn } from "./target.mjs";

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
  const up = await authPost("/api/auth/sign-up/email", { email: EMAIL, password: PASSWORD, name: "QA Recovery", ageConfirmed: true });
  if (!up.ok()) {
    const r = await authPost("/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD });
    if (!r.ok()) throw new Error("Could not sign in as the recovery QA account");
  }
}

const isSave = (req) => req.method() === "POST" && isServerFn(req, "saveDoc");
/** Sign-in calls, waiting out the live site's rate limit (HTTP 429) instead of failing. */
async function authPost(path, data) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await ctx.request.post(`${BASE}${path}`, { headers, data });
    if (res.status() !== 429) return res;
    await new Promise((resolve) => setTimeout(resolve, 12000));
  }
  return ctx.request.post(`${BASE}${path}`, { headers, data });
}
console.log(`target: ${TARGET} at ${BASE}`);
const CARD = [
  ["name", "Your name"],
  ["call", "Call this person"],
  ["phone", "Their phone"],
  ["notes", "Allergies or medicines"],
];
async function open(page) {
  await page.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByLabel(FIELD).waitFor({ timeout: 60000 });
}
const savedText = (page) => page.getByText("Saved", { exact: true }).first().waitFor({ timeout: 30000 });
const panel = (page, kind) => page.locator(`[data-doc-recovery="${kind}"]`);
/** Read the saved card as a fresh visitor would (production build: through the form). */
async function readCard(page) {
  const view = await page.context().newPage();
  try {
    await view.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
    await view.getByLabel(FIELD).waitFor({ timeout: 60000 });
    await view.waitForTimeout(500);
    const values = {};
    for (const [id, label] of CARD) values[id] = await view.getByLabel(label).inputValue();
    return { doc: { values } };
  } finally {
    await view.close({ runBeforeUnload: false });
  }
}
/** Save the card through its form, the way a person (or another device) would. */
async function writeCard(page, doc) {
  const edit = await page.context().newPage();
  try {
    await edit.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
    await edit.getByLabel(FIELD).waitFor({ timeout: 60000 });
    await edit.waitForTimeout(500);
    const saved = edit.waitForResponse((res) => isSave(res.request()) && res.ok(), { timeout: 8000 }).catch(() => null);
    for (const [id, label] of CARD) await edit.getByLabel(label).fill(doc.values?.[id] ?? "");
    await saved;
    await edit.waitForTimeout(300);
  } finally {
    await edit.close({ runBeforeUnload: false });
  }
}
async function load(page) {
  if (BUILD) return readCard(page);
  const res = await page.evaluate(async (slug) => {
    const m = await import("/src/lib/cove.functions.ts");
    return m.loadDoc({ data: slug });
  }, SLUG);
  return res.ok ? { doc: res.payload ? JSON.parse(res.payload) : null, revision: res.revision } : null;
}
async function seed(page, doc) {
  if (BUILD) return writeCard(page, doc);
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
  return route.continue().catch(() => {});
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
  return route.continue().catch(() => {});
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

// ── E. Leave with a save in flight that then fails ──────────────────────────
const tabE = await ctx.newPage();
await open(tabE);
await seed(tabE, { values: { name: "Base E", call: "Amaka Okafor", phone: "0803 000 0000", notes: "" } });
await tabE.reload({ waitUntil: "networkidle" });
await tabE.getByLabel(FIELD).waitFor({ timeout: 60000 });
const failLate = async (route) => {
  if (!isSave(route.request())) return route.continue();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // The interceptor may have been removed while waiting: then the request is already handled.
  return route.abort("failed").catch(() => {});
};
await tabE.route("**/_serverFn/**", failLate);
await tabE.getByLabel(FIELD).fill("Typed then left; the network dropped");
await tabE.waitForTimeout(600);
await leave(tabE);
await tabE.waitForTimeout(300);
ok((await copies(tabE)).find((c) => c.slug === SLUG)?.reason === "pending", "E: a pending copy is kept while the request is in flight");
await tabE.waitForTimeout(3500);
kept = (await copies(tabE)).find((c) => c.slug === SLUG);
ok(kept?.reason === "retrying" && kept.payload.includes("the network dropped"), `E: the late network failure keeps the copy (${kept?.reason})`);
ok((await name(tabE)) === "Base E", "E: the server still has the old value");
await tabE.unroute("**/_serverFn/**", failLate);
await tabE.goto(`${BASE}/apps/${SLUG}`, { waitUntil: "networkidle", timeout: 120000 });
// Two correct outcomes, depending on timing: a retry left over from the closed tab saves it once the
// network is back (nothing to offer), or the retries ran out first and reopening offers it back.
const offerE2 = panel(tabE, "recovered");
const offeredE = await offerE2.waitFor({ timeout: 15000 }).then(() => true, () => false);
if (offeredE) {
  await offerE2.getByRole("button", { name: "Keep my version" }).click();
  await offerE2.getByRole("button", { name: "Replace it with my version" }).click();
  await offerE2.waitFor({ state: "detached", timeout: 15000 });
  await savedText(tabE);
}
ok((await name(tabE)) === "Typed then left; the network dropped", `E: never lost (${offeredE ? "offered back, restored and saved" : "saved by the retry once the network was back"})`);
await tabE.waitForTimeout(800);
ok(!(await copies(tabE)).some((c) => c.slug === SLUG), "E: the copy is cleared once saved");
await tabE.close();

// ── F. No storage: leaving inside the app asks first ───────────────────────
const tabF = await ctx.newPage();
await tabF.addInitScript(() => {
  Object.defineProperty(window, "indexedDB", { get() { throw new Error("blocked"); } });
  Object.defineProperty(window, "sessionStorage", { get() { throw new Error("blocked"); } });
});
await open(tabF);
await tabF.waitForTimeout(1000);
let releaseF;
let heldF = new Promise((resolve) => (releaseF = resolve));
const holdF = async (route) => {
  if (!isSave(route.request())) return route.continue();
  await heldF;
  return route.continue().catch(() => {});
};
await tabF.route("**/_serverFn/**", holdF);
await tabF.getByLabel(FIELD).fill("Typed with storage blocked");
await tabF.waitForTimeout(600);
let asked = "";
tabF.once("dialog", async (dialog) => {
  asked = dialog.message();
  await dialog.dismiss();
});
await tabF.getByRole("link", { name: "Your desk" }).click();
await tabF.waitForTimeout(1000);
ok(/can't keep a copy/.test(asked), `F: leaving asks first (${asked.slice(0, 60)}…)`);
ok(tabF.url().includes(`/apps/${SLUG}`) && (await tabF.getByLabel(FIELD).inputValue()) === "Typed with storage blocked", "F: staying keeps the page and the change");
await tabF.screenshot({ path: `${OUT}/F1-leave-question${MOBILE ? "-mobile" : ""}.png` });
releaseF();
await savedText(tabF);
ok((await name(tabF)) === "Typed with storage blocked", "F: the change then saves");
let askedAgain = false;
tabF.once("dialog", async (dialog) => {
  askedAgain = true;
  await dialog.dismiss();
});
await leave(tabF);
ok(!askedAgain, "F: once saved, leaving does not ask");
await tabF.unroute("**/_serverFn/**", holdF);
await tabF.close();

// ── G. Account and app isolation in one browser ───────────────────────────
const tabG = await ctx.newPage();
await open(tabG);
await seed(tabG, { values: { name: "Account one saved", call: "", phone: "", notes: "" } });
await tabG.reload({ waitUntil: "networkidle" });
await tabG.getByLabel(FIELD).waitFor({ timeout: 60000 });
await tabG.route("**/_serverFn/**", block);
await tabG.getByLabel(FIELD).fill("Account one, unsaved");
await tabG.getByText("Not saved, retrying").first().waitFor({ timeout: 15000 });
await tabG.waitForTimeout(800);
const ownerOne = (await copies(tabG)).find((c) => c.slug === SLUG)?.owner;
ok(Boolean(ownerOne), "G: account one has a kept copy in this browser");
// Account one's tab stays open and offline while the others check (closing it would let the
// tab's last keep-alive save deliver the change, which is correct but leaves nothing to offer).
// Another app, same account: not offered.
const other = await ctx.newPage();
await other.goto(`${BASE}/apps/memoir`, { waitUntil: "networkidle", timeout: 120000 });
ok(await noOffer(other), "G: another app is not offered the copy");
await other.close();
// Sign out, sign in as a second account in the same browser.
await authPost("/api/auth/sign-out", {});
const SECOND = { email: "qa-recovery-2@example.test", password: "recovery-qa-pass-2", name: "QA Recovery Two", ageConfirmed: true };
if (!(await authPost("/api/auth/sign-up/email", SECOND)).ok()) {
  const r = await authPost("/api/auth/sign-in/email", SECOND);
  if (!r.ok()) throw new Error("second account sign-in failed");
}
const two = await ctx.newPage();
await open(two);
await seed(two, { values: { name: "Account two's own card", call: "", phone: "", notes: "" } });
await two.reload({ waitUntil: "networkidle" });
await two.getByLabel(FIELD).waitFor({ timeout: 60000 });
ok(await noOffer(two), "G: a second account in the same browser is not offered the first account's copy");
ok((await two.getByLabel(FIELD).inputValue()) === "Account two's own card", "G: the second account sees only its own card");
ok((await copies(two)).some((c) => c.owner === ownerOne && c.slug === SLUG), "G: the first account's copy is still kept, untouched");
await two.screenshot({ path: `${OUT}/G1-second-account${MOBILE ? "-mobile" : ""}.png` });
await two.close();
// Back to the first account: offered again.
await authPost("/api/auth/sign-out", {});
if (!(await authPost("/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD })).ok()) throw new Error("sign back in failed");
const one = await ctx.newPage();
await open(one);
const offerG = panel(one, "recovered");
await offerG.waitFor({ timeout: 15000 });
ok((await offerG.innerText()).includes("You have unsaved changes"), "G: the first account gets its copy back after signing in again");
await offerG.getByRole("button", { name: "Discard it and keep what’s saved" }).click();
await offerG.getByRole("button", { name: "Discard mine, use the saved version" }).click();
await offerG.waitFor({ state: "detached", timeout: 15000 });
await one.close();
await tabG.close({ runBeforeUnload: false });

ok(errors.length === 0, `no page errors (${errors.slice(0, 5).join(" | ")})`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
