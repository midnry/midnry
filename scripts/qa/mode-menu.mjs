// Home screen: pick a game first (step 1), then how to play it (step 2).
// Photos of both games' options at the given width, plus a series flow check.
//   node scripts/qa/mode-menu.mjs [width]   (390 = phone)
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";
const W = Number(process.argv[2] ?? 1280),
  M = W < 500,
  H = M ? 844 : 720;
const OUT = "screenshots/qa/menu";
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const p = await (
  await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })
).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + (e.stack || e.message).slice(0, 400)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
await p.addInitScript(() =>
  localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 })),
);
await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await p.waitForFunction(
  () => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled,
  null,
  { timeout: 180000 },
);
const state = () =>
  p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    return {
      mode: g.mode,
      kind: g.seriesKind,
      shift: g.shift,
      variants: [...document.querySelectorAll(".mf-variants button")]
        .map((b) => (b.getAttribute("aria-pressed") === "true" ? "*" : "") + b.dataset.variant)
        .join(" "),
      summary: document.querySelector(".mf-playsummary")?.textContent,
    };
  });
const shot = async (name) => {
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${name}-${W}.png`, fullPage: false });
};
await pickGame(p, "protocol", { timeout: 60000 });
console.log("protocol", JSON.stringify(await state()));
await shot("protocol");
await p.click(".mf-variants [data-variant=quick]", { timeout: 60000 });
console.log("quick", JSON.stringify(await state()));
await pickGame(p, "signal", { timeout: 60000 });
console.log("signal", JSON.stringify(await state()));
await p.click(".mf-variants [data-variant=series]", { timeout: 60000 });
console.log("series", JSON.stringify(await state()));
await shot("signal-series");
if (M) {
  await p.evaluate(() => document.querySelector(".mf-playlists").scrollIntoView());
  await shot("signal-series-scrolled");
}
const playNext = await p.evaluate(
  () => getComputedStyle(document.querySelector(".mf-playnext")).display,
);
console.log("step-3 play button", playNext);
await pickGame(p, "protocol", { timeout: 60000 });
console.log("back to protocol keeps quick", JSON.stringify(await state()));
await pickGame(p, "signal", { timeout: 60000 });
console.log("back to signal keeps series", JSON.stringify(await state()));
// Play two series rounds: the player is knocked out, the round is played out unseen.
await play(p, { timeout: 60000 });
await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, {
  timeout: 180000,
});
for (let r = 1; r <= 2; r++) {
  await p.waitForTimeout(3000);
  const map = await p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    g.player.lives = 0;
    g.player.shieldUntil = 0;
    g.arena.damage(g.player, 9999, null);
    return g.arena.mapId;
  });
  await p.waitForFunction(() => !document.querySelector(".mf-results")?.hidden, null, {
    timeout: 120000,
  });
  const res = await p.evaluate(() => ({
    h2: document.querySelector(".mf-results > h2").textContent,
    head: document.querySelector(".mf-serieshead")?.textContent,
    rows: document.querySelectorAll(".mf-seriestable tbody tr").length,
    again: document.querySelector(".mf-again").textContent,
  }));
  console.log("round", r, map, JSON.stringify(res));
  await shot(`series-r${r}`);
  if (r < 2) await p.click(".mf-again", { timeout: 60000 });
}
console.log("errors", errs);
await b.close();
