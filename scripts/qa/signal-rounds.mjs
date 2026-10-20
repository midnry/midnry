import { chromium } from "playwright";
const W = Number(process.argv[2] ?? 1280), M = W < 500, H = M ? 844 : 720;
const S = "screenshots/qa/signal";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push("PAGEERROR " + (e.stack || e.message).slice(0, 600))); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
p.on("crash", () => errs.push("TAB CRASHED"));
await p.addInitScript(() => localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })));
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, { timeout: 180000 });
await p.click(".mf-gamepick [data-mode=signal]", { timeout: 60000 }); await p.waitForTimeout(1500);
await p.click(".mf-start", { timeout: 60000 });
for (let round = 1; round <= 3; round++) {
  await p.waitForTimeout(5000);
  const info = () => p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; return { mode: g.mode, map: g.arena?.mapId, state: g.state, running: g.running, alive: g.arena?.entities.filter(e => e.hp > 0).length, hp: Math.round(g.player?.hp), t: +(g.arena?.time||0).toFixed(1), frame: g.frameCount ?? g.frames ?? null, err: document.querySelector(".mf-loaderr, .mf-error, [class*=crash]")?.innerText?.slice(0,120) || null }; });
  console.log("round", round, "start", JSON.stringify(await info()));
  // Fight: keep firing and walking forward, turning now and then.
  await p.evaluate(() => { const g = document.querySelector("midnry-fps").engine; clearInterval(window.__bot); window.__bot = setInterval(() => { g.firing = true; g.keys.add("w"); if (Math.random() < 0.05) g.player.a += (Math.random() - .5) * 2; }, 100); });
  for (let k = 0; k < 9; k++) { await p.waitForTimeout(10000); const i = await info(); console.log("  +" + (k + 1) * 10 + "s", JSON.stringify(i)); if (i.state === "ended") break; }
  await p.evaluate(() => { clearInterval(window.__bot); const g = document.querySelector("midnry-fps").engine; g.firing = false; g.keys.clear(); if (g.state !== "ended") { for (const e of g.arena.entities) if (e.id !== g.selfId) e.hp = 0; } });
  await p.waitForTimeout(6000);
  await p.screenshot({ path: `${S}/play-r${round}-${W}.png` });
  const btns = await p.evaluate(() => [...document.querySelectorAll("button")].filter(b => b.offsetParent).map(b => b.textContent.trim()).slice(0, 10).join(" / "));
  console.log(" end screen:", btns);
  if (round < 3) await p.click("text=REMATCH", { timeout: 60000 }).catch(e => console.log(" rematch click failed", e.message.slice(0, 80)));
}
console.log("errors", errs);
await b.close();
