// Checks the stylesheet guard in the page shell: a page whose stylesheet fails
// reloads once and comes back styled; a stylesheet that always fails does not
// loop; a normal load never reloads.
//   node scripts/qa/style-guard.mjs [base=http://127.0.0.1:8080]
import { chromium } from "playwright";
const BASE = process.argv[2] || "http://127.0.0.1:8080";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let failed = 0;
async function run(name, failFirst) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  let navs = 0, cssFails = 0;
  p.on("request", (q) => q.resourceType() === "document" && q.frame() === p.mainFrame() && navs++);
  await p.route(/\/assets\/.*\.css(\?.*)?$/, (r) => {
    if (cssFails < failFirst) { cssFails++; return r.fulfill({ status: 404, contentType: "text/html", body: "Not found" }); }
    return r.continue();
  });
  await p.goto(`${BASE}/games/outpost-zero`, { waitUntil: "load" });
  await p.waitForTimeout(6000);
  const styled = await p.evaluate(() => getComputedStyle(document.querySelector("iframe")).width !== "300px");
  console.log(name, JSON.stringify({ loads: navs, cssFails, styled, errors: errs }));
  await p.context().close();
  return { navs, styled };
}
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) failed++; };
let r = await run("normal", 0);
ok(r.navs === 1 && r.styled, "normal load: styled, no reload");
r = await run("stale-once", 2);
ok(r.navs === 2 && r.styled, "stylesheet fails once: one reload, then styled");
r = await run("always", 1e9);
ok(r.navs === 2, "stylesheet always fails: exactly one reload, no loop");
await b.close();
process.exit(failed ? 1 : 0);
