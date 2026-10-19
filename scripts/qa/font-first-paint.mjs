import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
// Slow the network so any swap would be visible.
const cdp = await p.context().newCDPSession(p);
await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 400 * 1024, uploadThroughput: 200 * 1024 });
const order = []; p.on("requestfinished", (r) => /fonts\/|outpost-theme|outpost-zero.html/.test(r.url()) && order.push(r.url().split("/").pop().split("?")[0]));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "commit", timeout: 90000 });
const samples = [];
for (let i = 0; i < 12; i++) {
  samples.push(await p.evaluate(() => { const el = document.querySelector(".mf-loadstatus, .mf-loading h1, .mf-loading, h1"); const fam = el ? getComputedStyle(el).fontFamily.split(",")[0] : "-"; const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "") + f.weight).join("+"); return `${Math.round(performance.now())}ms ${el?.className || el?.tagName || "none"} uses ${fam} | loaded: ${loaded || "none"} | visible text: ${(document.body?.innerText || "").trim().slice(0, 30).replace(/\s+/g, " ")}`; }).catch((e) => "err " + e.message.slice(0, 60)));
  await p.waitForTimeout(250);
}
console.log(samples.join("\n")); console.log("request order:", order.slice(0, 8).join(", "));
await b.close();
