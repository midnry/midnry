import { chromium } from "playwright";
const [out, ...paths] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [w, h, m] of [[1280, 800, false], [390, 844, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m })).newPage();
  for (const path of paths) {
    await p.goto("http://127.0.0.1:8080" + path, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const name = (path.replace(/\//g, "_") || "_home").replace(/^_$/, "_home");
    await p.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
  }
}
await b.close();
