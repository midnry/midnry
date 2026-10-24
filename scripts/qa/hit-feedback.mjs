// Photographs the combat feedback (outpost-hit-feedback.js) in a Last Signal
// round, state by state and deterministically: the HUD's clock is frozen and
// the simulation is told exactly who hurt whom, so each frame shows one thing.
//   hit        a plain hit marker (ticks + damage number)
//   kill       the gold kill marker with ELIMINATED · name, and the card flash
//   down       the Last Signal variant: DOWN · name (victim had a life left)
//   arc-left   one damage arc, attacker on the player's left
//   arcs-two   two arcs: attacker front-left and attacker behind-right
//   hazard     the neutral dashed ring for haze damage (no attacker)
//   hit-still  camera motion off: the marker shows with no pop
// Frames go to screenshots/qa/hit/<state>-<width>.png at 390×844 and 1280×720,
// and the script checks that nothing in the centre overlaps the touch controls,
// the health/ammo cards or the top bar.
//   node scripts/qa/hit-feedback.mjs [width]   (no width: both sizes)
import { chromium } from "playwright";
import { pickGame, play } from "./lobby-helpers.mjs";
import { mkdirSync } from "node:fs";

const widths = process.argv[2] ? [Number(process.argv[2])] : [390, 1280];
mkdirSync("screenshots/qa/hit", { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errs = [],
  results = [];
let failures = 0;
const fail = (why) => {
  failures++;
  console.log("FAIL " + why);
};

for (const W of widths) {
  const M = W < 500,
    H = M ? 844 : 720;
  const p = await (await b.newContext({ viewport: { width: W, height: H }, isMobile: M, hasTouch: M })).newPage();
  p.on("pageerror", (e) => errs.push(`${W}: ${e.message.slice(0, 200)}`));
  p.on("console", (m) => {
    if (m.type() === "error") errs.push(`${W} console: ${m.text().slice(0, 200)}`);
  });
  await p.addInitScript(() => {
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: 5 }));
  });
  await p.goto("http://127.0.0.1:8080/games/outpost-zero.html", { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(() => document.querySelector(".mf-start") && !document.querySelector(".mf-start").disabled, null, {
    timeout: 180000,
  });
  await pickGame(p, "signal", { timeout: 60000 });
  await p.waitForTimeout(1000);
  await play(p, { timeout: 90000 });
  await p.waitForFunction(
    () => {
      const g = document.querySelector("midnry-fps")?.engine;
      return g?.running && g.militaryLoaded && g.player;
    },
    null,
    { timeout: 180000 },
  );
  // The round's intro screen (outpost-transition.js) takes over render()
  // for the round's first frames and skips them while it is up, so the
  // loop must run until it has shown and hidden the splash for this round;
  // only then does a manual render reach the HUD.
  await p.waitForFunction(() => {
    const g = document.querySelector("midnry-fps").engine, t = g.sceneTransition;
    return !t || (!t.pending && t.lastRound === g.arena?.roundId && t.el.hidden);
  }, null, { timeout: 300000 });
  await p.waitForTimeout(1500);
  // Freeze the loop and the HUD's clock; make every rival passive so only
  // the scripted shots happen; drop the start shields so damage lands.
  await p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    cancelAnimationFrame(g.frame);
    g.frame = 0;
    g.arena.time = Math.max(g.arena.time, 30);
    for (const e of g.arena.entities) {
      e.shieldUntil = 0;
      if (e !== g.player) Object.assign(e, { bot: false, x: 1.5, y: 1.5 });
    }
    g.player.hp = g.player.maxHp;
    window.__now = performance.now();
    performance.now = () => window.__now;
  });
  // One frame builds the feedback module (the headless renderer is too slow
  // to count on the loop having drawn one). The 3D view must be up: in its
  // recovery state the HUD draws nothing.
  const ready = await p.evaluate(() => {
    const g = document.querySelector("midnry-fps").engine;
    g.render();
    return { feedback: !!g.hitFeedback, loaded: g.militaryLoaded, marker: !!document.querySelector(".mf-hitmark b") };
  });
  if (!ready.feedback || !ready.marker) {
    fail(`${W}: the HUD built no hit feedback after a frame: ${JSON.stringify(ready)}`);
    await p.context().close();
    continue;
  }

  // Runs the scripted damage, renders once so the HUD notices, lets `settle`
  // milliseconds pass on the frozen clock, renders again and photographs.
  const shot = async (name, script, settle = 130) => {
    // The scenario is a function's source text: call it (a bare function
    // expression would come back unserialised, uncalled).
    await p.evaluate(`(${script})()`);
    await p.evaluate((ms) => {
      const g = document.querySelector("midnry-fps").engine;
      g.render();
      g.updateHUD(true);
      window.__now += ms;
      g.render();
      g.updateHUD(true);
    }, settle);
    const state = await p.evaluate(() => {
      const $ = (s) => document.querySelector(s);
      const box = (s) => {
        const n = $(s);
        if (!n || n.hidden) return null;
        const r = n.getBoundingClientRect();
        return r.width && r.height && getComputedStyle(n).visibility !== "hidden" ? { x: r.x, y: r.y, w: r.width, h: r.height, s } : null;
      };
      const mark = $(".mf-hitmark");
      const feedback = [".mf-hitmark svg", ".mf-hitmark b", ".mf-hitmark span", ".mf-dmgring"].map(box).filter(Boolean);
      // The visible ring is smaller than its box: shrink to the stroke.
      for (const f of feedback) if (f.s === ".mf-dmgring") Object.assign(f, { x: f.x + f.w * 0.08, y: f.y + f.h * 0.08, w: f.w * 0.84, h: f.h * 0.84 });
      const chrome = [".mf-stick", ".mf-fire", ".mf-reload", ".mf-jump", ".mf-scope", ".mf-stance", ".mf-super", ".mf-bottom .mf-stat", ".mf-ammo", ".mf-top", ".mf-sig-status", ".mf-sig-haze", ".mf-toast", ".mf-damage"]
        .map(box)
        .filter(Boolean);
      const overlaps = [];
      for (const f of feedback)
        for (const c of chrome)
          if (f.x < c.x + c.w && f.x + f.w > c.x && f.y < c.y + c.h && f.y + f.h > c.y) overlaps.push(`${f.s} × ${c.s}`);
      return {
        mark: !mark.hidden,
        kill: mark.classList.contains("mf-kill"),
        number: $(".mf-hitmark b").textContent,
        tag: $(".mf-hitmark span").textContent,
        scale: $(".mf-hitmark svg").style.transform,
        arcs: [...document.querySelectorAll(".mf-dmgarc")].filter((n) => +n.style.opacity > 0).map((n) => n.style.transform),
        pulse: +$(".mf-dmgpulse").style.opacity,
        flash: $(".mf-bottom").classList.contains("mf-killflash"),
        toast: $(".mf-toast").textContent,
        overlaps,
      };
    });
    await p.screenshot({ path: `screenshots/qa/hit/${name}-${W}.png` });
    results.push({ W, name, ...state });
    if (state.overlaps.length) fail(`${name} ${W}: feedback overlaps HUD chrome: ${state.overlaps.join(", ")}`);
    // Let everything expire before the next state.
    await p.evaluate(() => {
      const g = document.querySelector("midnry-fps").engine;
      window.__now += 3000;
      g.render();
      g.updateHUD(true);
    });
    return state;
  };
  // Place a rival `d` tiles from the player at `turn` radians from the facing.
  const place = `(i, turn, d = 3) => {
    const g = document.querySelector("midnry-fps").engine, me = g.player;
    const bot = g.arena.entities.filter((e) => e !== me)[i];
    Object.assign(bot, { x: me.x + Math.cos(me.a + turn) * d, y: me.y + Math.sin(me.a + turn) * d, hp: 100, lives: 2, shieldUntil: 0 });
    return bot;
  }`;

  const hit = await shot("hit", `() => { const bot = (${place})(0, 0); const g = document.querySelector("midnry-fps").engine; g.arena.damage(bot, 24, g.player); }`);
  // Last Signal scales weapon damage, so the number is whatever landed, not 24.
  if (!hit.mark || hit.kill || !/^[1-9]\d*$/.test(hit.number)) fail(`${W} hit marker: ${JSON.stringify(hit)}`);
  if (hit.scale !== "scale(1)") fail(`${W} hit marker should have settled from its pop: ${hit.scale}`);

  const kill = await shot("kill", `() => { const bot = (${place})(1, 0); bot.lives = 0; bot.hp = 30; const g = document.querySelector("midnry-fps").engine; g.arena.damage(bot, 50, g.player); g.flushEvents(); }`);
  if (!kill.mark || !kill.kill || !/^ELIMINATED · /.test(kill.tag) || !kill.flash || !/^[1-9]\d*$/.test(kill.number))
    fail(`${W} kill marker: ${JSON.stringify(kill)}`);

  const down = await shot("down", `() => { const bot = (${place})(2, 0); bot.lives = 1; bot.hp = 20; const g = document.querySelector("midnry-fps").engine; g.arena.damage(bot, 50, g.player); g.flushEvents(); }`);
  if (!down.kill || !/^DOWN · /.test(down.tag)) fail(`${W} down marker: ${JSON.stringify(down)}`);

  const left = await shot("arc-left", `() => { const bot = (${place})(3, -Math.PI / 2); const g = document.querySelector("midnry-fps").engine; g.arena.damage(g.player, 12, bot); }`, 150);
  if (left.arcs.length !== 1 || left.pulse > 0) fail(`${W} one arc expected: ${JSON.stringify(left)}`);
  // Left = bearing 270°, the arc turned back by 90° + half its span (56°) → 152°.
  if (!/rotate\(152deg\)/.test(left.arcs[0] || "")) fail(`${W} the left arc should point left: ${left.arcs[0]}`);

  const two = await shot("arcs-two", `() => { const a = (${place})(3, -Math.PI / 4), b = (${place})(4, (3 * Math.PI) / 4); const g = document.querySelector("midnry-fps").engine; g.arena.damage(g.player, 8, a); g.arena.damage(g.player, 8, b); }`, 150);
  if (two.arcs.length !== 2) fail(`${W} two arcs expected: ${JSON.stringify(two)}`);

  const hazard = await shot("hazard", `() => { const g = document.querySelector("midnry-fps").engine; g.arena.damage(g.player, 3, null); }`, 100);
  if (hazard.arcs.length || !(hazard.pulse > 0)) fail(`${W} hazard pulse expected: ${JSON.stringify(hazard)}`);

  const still = await shot("hit-still", `() => { const g = document.querySelector("midnry-fps").engine; g.cameraMotion = "off"; const bot = (${place})(0, 0); g.arena.damage(bot, 17, g.player); }`, 0);
  if (!still.mark || still.scale !== "scale(1)") fail(`${W} motion off: no pop expected: ${JSON.stringify(still)}`);
  await p.evaluate(() => (document.querySelector("midnry-fps").engine.cameraMotion = "full"));
  await p.context().close();
}
for (const r of results) console.log(JSON.stringify(r));
if (errs.length) fail("browser errors: " + errs.join(" | "));
console.log(failures ? `${failures} failure(s)` : "PASS combat feedback states render as designed at both sizes");
await b.close();
process.exit(failures ? 1 : 0);
