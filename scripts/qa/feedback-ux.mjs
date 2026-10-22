// Player-feedback fixes in the browser: sound starts on the first click,
// the pause card (Resume button, Esc / P, click outside, auto-pause reason),
// no browser context menu in a match (but right-click aim still works), and
// the quick-start carousel (next / back / dots / keys / swipe / skip / Play)
// at laptop 1280, phone 390×844 and phone landscape 844×390.
//   node scripts/qa/feedback-ux.mjs        (after sh scripts/qa/dev-up.sh)
// Screenshots: screenshots/qa/feedback-ux/
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { pickGame } from "./lobby-helpers.mjs";

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const OUT = "screenshots/qa/feedback-ux";
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` · ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
};
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  // A real autoplay policy: audio may only start after a user gesture.
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=user-gesture-required"],
});

async function open(width, height, { mobile = false, fresh = true, reduced = false } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? "reduce" : "no-preference" });
  ctx.setDefaultTimeout(180000);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await p.addInitScript((fresh) => {
    if (sessionStorage.getItem("qa-seeded")) return;
    sessionStorage.setItem("qa-seeded", "1");
    localStorage.setItem("midnry-outpost-mode", "signal");
    localStorage.setItem("midnry-outpost-profile", JSON.stringify({ matches: fresh ? 0 : 5 }));
  }, fresh);
  await p.goto(`${BASE}/games/outpost-zero.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForFunction(() => document.querySelector("midnry-fps")?.engine?.militaryLoaded, null, { timeout: 240000, polling: 1000 });
  await p.waitForTimeout(1500);
  return { ctx, p, errors };
}
const engine = (p, fn, arg) => p.evaluate(([src, arg]) => new Function("e", "arg", "return " + src)(document.querySelector("midnry-fps").engine, arg), [fn, arg]);
const waitFor = (p, src, timeout = 90000) =>
  p.waitForFunction((src) => new Function("e", "return " + src)(document.querySelector("midnry-fps").engine), src, { timeout, polling: 250 });
const card = (p) => p.evaluate(() => {
  const d = document.querySelector(".mf-qs");
  return { open: !!d?.open, title: d?.querySelector(".mf-qscard:not([inert]) h3")?.textContent, next: d?.querySelector(".mf-qsnext")?.textContent.trim(), dots: d?.querySelectorAll(".mf-qsdots button").length };
});
const swipe = (p, dx) =>
  p.evaluate((dx) => {
    const v = document.querySelector(".mf-qsviewport"),
      r = v.getBoundingClientRect(),
      y = r.top + r.height / 2,
      x = r.left + r.width / 2 - dx / 2;
    const ev = (type, cx) => v.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: cx, clientY: y, bubbles: true, isPrimary: true }));
    ev("pointerdown", x);
    ev("pointerup", x + dx);
  }, dx);

/** Carousel: keys, buttons, dots, swipe, Skip; screenshot every card. */
async function carousel(p, tag, { touch = false } = {}) {
  const first = await card(p);
  check(`${tag}: carousel opens on card 1 of ${first.dots}`, first.open && first.dots >= 4 && first.dots <= 6, first.title);
  const titles = [first.title];
  await p.screenshot({ path: `${OUT}/carousel-${tag}-1.png` });
  for (let i = 2; i <= first.dots; i++) {
    if (touch) await swipe(p, -160);
    else if (i % 2) await p.click(".mf-qsnext");
    else await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(900);
    const c = await card(p);
    titles.push(c.title);
    await p.screenshot({ path: `${OUT}/carousel-${tag}-${i}.png` });
  }
  check(`${tag}: ${touch ? "swipe" : "Next / arrow key"} walks through every card`, new Set(titles).size === first.dots, titles.join(" → "));
  const last = await card(p);
  check(`${tag}: last card offers Play / Got it`, /Play|Got it/.test(last.next), last.next);
  if (touch) await swipe(p, 160);
  else await p.keyboard.press("ArrowLeft");
  await p.waitForTimeout(300);
  check(`${tag}: ${touch ? "swipe right" : "arrow left"} goes back`, (await card(p)).title === titles.at(-2));
  await p.click(".mf-qsback");
  await p.waitForTimeout(300);
  check(`${tag}: Back button`, (await card(p)).title === titles.at(-3));
  await p.click(".mf-qsdots button >> nth=0");
  await p.waitForTimeout(300);
  check(`${tag}: dot jumps to card 1`, (await card(p)).title === titles[0]);
  const fits = await p.evaluate(() => {
    const r = document.querySelector(".mf-qs").getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5 && document.documentElement.scrollWidth <= innerWidth;
  });
  check(`${tag}: carousel fits the screen`, fits);
  return titles;
}

/** Sound level at the master bus over `ms`. */
async function listen(p, ms) {
  await p.evaluate(() => {
    const a = document.querySelector("midnry-fps").engine.retention.audio;
    if (!a.qaAnalyser) {
      a.qaAnalyser = a.ctx.createAnalyser();
      a.qaAnalyser.fftSize = 2048;
      a.master.connect(a.qaAnalyser);
    }
    const buf = new Float32Array(2048);
    window.__qaLevel = { peak: 0 };
    clearInterval(window.__qaTimer);
    window.__qaTimer = setInterval(() => {
      a.qaAnalyser.getFloatTimeDomainData(buf);
      for (const v of buf) window.__qaLevel.peak = Math.max(window.__qaLevel.peak, Math.abs(v));
    }, 30);
  });
  await p.waitForTimeout(ms);
  return p.evaluate(() => window.__qaLevel.peak);
}
const audio = (p) =>
  engine(p, "({ state: e.retention.audio.ctx?.state || 'none', gain: e.retention.audio.master?.gain.value ?? null, on: e.retention.audio.soundOn(), music: !!e.retention.audio.score?.playing, mode: e.mode })");
/** A point on the menu's empty background (no card or button under it). */
const emptySpot = (p) =>
  p.evaluate(() => {
    const m = document.querySelector(".mf-modal");
    // Clear of buttons by 28 px all round (touch taps snap to nearby targets).
    const clear = (x, y) => [[0, 0], [28, 0], [-28, 0], [0, 28], [0, -28]].every(([dx, dy]) => document.elementFromPoint(x + dx, y + dy) === m);
    for (let y = innerHeight * 0.85; y > innerHeight * 0.15; y -= 17)
      for (let x = innerWidth * 0.5; x < innerWidth * 0.95; x += 23) if (clear(x, y)) return [Math.round(x), Math.round(y)];
    return null;
  });
const pauseShown = (p, focused = false) =>
  p
    .waitForFunction(
      (focused) => {
        const c = document.querySelector(".mf-pausecard");
        const r = c?.getBoundingClientRect();
        return c && !c.hidden && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && (!focused || document.activeElement?.classList.contains("mf-resume"));
      },
      focused,
      { timeout: 30000, polling: 200 },
    )
    .catch(() => {});
const pauseCard = (p) =>
  p.evaluate(() => {
    const c = document.querySelector(".mf-pausecard"),
      r = c?.getBoundingClientRect(),
      active = document.querySelector("midnry-fps").querySelector(":focus") || document.activeElement;
    return {
      visible: !!c && !c.hidden && r.width > 0 && getComputedStyle(c).display !== "none",
      focused: active?.classList?.contains("mf-resume"),
      hint: c?.querySelector(".mf-pausehint")?.textContent,
      reason: c?.querySelector(".mf-pausereason")?.textContent,
      onScreen: r ? r.top >= 0 && r.bottom <= innerHeight : false,
    };
  });

// PARTS=laptop,protocol,phones runs only some sections (all by default).
const PARTS = (process.env.PARTS || "laptop,protocol,phones").split(",");
// ---------- Laptop 1280: first match, sound, pause, context menu, ADS ----------
if (PARTS.includes("laptop")) {
  const { ctx, p, errors } = await open(1280, 720);
  check("1280: no audio context before any gesture", (await audio(p)).state === "none");
  // First gesture: a click on the lobby background (not Play).
  const bg = await emptySpot(p);
  await p.mouse.click(...(bg || [640, 300]));
  await p.waitForFunction(() => document.querySelector("midnry-fps").engine.retention.audio.ctx?.state === "running", null, { timeout: 15000 }).catch(() => {});
  const first = await audio(p);
  check("1280: AudioContext running after the first click", first.state === "running", first);
  check("1280: master gain above zero", first.gain > 0, first);
  // How to play from the menu opens the carousel; Full guide is there.
  await p.click('.mf-hometop [data-go="guide"]');
  await p.waitForTimeout(500);
  await carousel(p, "signal-1280");
  check("1280: Full guide link shown", await p.isVisible(".mf-qsfull"));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  check("1280: Esc skips (closes) the carousel", !(await card(p)).open);
  // Protocol cards via the game picker.
  await pickGame(p, "protocol");
  await p.click('.mf-hometop [data-go="guide"]');
  await p.waitForTimeout(500);
  const ptitles = await carousel(p, "protocol-1280");
  check("1280: Blackout Protocol has its own cards", ptitles[0] === "Save the wounded", ptitles[0]);
  await p.click(".mf-qsfull");
  await p.waitForTimeout(600);
  check("1280: Full guide opens the Blackout Protocol manual", await p.evaluate(() => !!document.querySelector(".mf-protocol-guide")?.open));
  await p.screenshot({ path: `${OUT}/full-guide-protocol-1280.png` });
  await p.evaluate(() => document.querySelector(".mf-protocol-guide").close());
  await pickGame(p, "signal");
  // First match of a brand-new player: Start match shows the cards first
  // (Signal's were marked seen above, so clear that to see the first run).
  await p.evaluate(() => localStorage.removeItem("midnry-outpost-quickstart"));
  await p.click(".mf-modeplay:visible");
  await p.waitForTimeout(500);
  check("1280: first match opens the quick start", (await card(p)).open);
  await p.click(".mf-qsdots button >> nth=-1");
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/first-run-last-card-1280.png` });
  await p.click(".mf-qsnext");
  await waitFor(p, 'e.state === "playing" && e.running', 120000);
  check("1280: Play on the last card starts the match", true);
  await p.waitForTimeout(2000);
  const peak = await listen(p, 8000);
  const inMatch = await audio(p);
  check("1280: sound plays in the match (master peak > 0.01)", peak > 0.01 && inMatch.state === "running", { peak: +peak.toFixed(3), ...inMatch });
  // Context menu in a match: canvas and HUD prevented, text field not.
  const menus = await p.evaluate(() => {
    const fire = (el) => {
      const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: 600, clientY: 300 });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    const root = document.querySelector("midnry-fps");
    return {
      canvas: fire(root.querySelector("canvas")),
      hud: fire(root.querySelector(".mf-bottom") || root.querySelector(".mf-top")),
      shell: fire(root.querySelector(".mf-shell")),
      input: fire(root.querySelector(".mf-codeinput") || root.querySelector("input")),
    };
  });
  check("1280: right-click menu blocked on the view and HUD in a match", menus.canvas && menus.hud && menus.shell, menus);
  check("1280: text fields keep their right-click menu", menus.input === false, menus);
  // Right mouse still aims down the sights in Last Signal.
  await p.mouse.move(640, 360);
  await p.mouse.down({ button: "right" });
  await waitFor(p, "e.adsHeld === true", 20000).catch(() => {});
  const ads = await engine(p, "({ held: e.adsHeld, aiming: !!e.aiming })");
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/ads-right-click-1280.png` });
  await p.mouse.up({ button: "right" });
  await p.waitForTimeout(500);
  const adsAfter = await engine(p, "e.adsHeld");
  check("1280: right mouse aims down the sights (and lets go)", ads.held && adsAfter === false, { ...ads, after: adsAfter });
  // Pause with Esc → card with a focused Resume; Esc resumes.
  await p.keyboard.press("Escape");
  await waitFor(p, "!e.running", 20000);
  await pauseShown(p, true);
  let pc = await pauseCard(p);
  check("1280: Esc pauses and shows Resume, focused", pc.visible && pc.focused && pc.onScreen, pc);
  check("1280: pause hint names Esc and P", /Esc/.test(pc.hint) && /P\b/.test(pc.hint), pc.hint);
  await p.screenshot({ path: `${OUT}/pause-1280.png` });
  await p.keyboard.press("Escape");
  await waitFor(p, "e.running", 20000).catch(() => {});
  check("1280: Esc resumes", await engine(p, "e.running"));
  // P pauses and P resumes.
  await p.waitForTimeout(600);
  await p.keyboard.press("p");
  await waitFor(p, "!e.running", 20000);
  await p.waitForTimeout(600);
  await p.keyboard.press("p");
  await waitFor(p, "e.running", 20000).catch(() => {});
  check("1280: P pauses and P resumes", await engine(p, "e.running"));
  // Pause button → big Resume button.
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector(".mf-pause").click());
  await waitFor(p, "!e.running", 20000);
  await p.waitForTimeout(600);
  await p.click(".mf-resume");
  await waitFor(p, "e.running", 20000).catch(() => {});
  check("1280: Resume button resumes", await engine(p, "e.running"));
  // Click outside the menu cards resumes.
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector(".mf-pause").click());
  await waitFor(p, "!e.running", 20000);
  await p.waitForTimeout(600);
  await pauseShown(p);
  const spot = await emptySpot(p);
  if (spot) {
    await p.mouse.click(...spot);
    await waitFor(p, "e.running", 20000).catch(() => {});
  }
  check("1280: click outside the menu resumes", spot && (await engine(p, "e.running")), { spot });
  // Sound toggle in the pause card.
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector(".mf-pause").click());
  await waitFor(p, "!e.running", 20000);
  await p.waitForTimeout(600);
  await p.click(".mf-soundtoggle");
  await p.waitForTimeout(300);
  const off = await audio(p);
  const offLabel = (await p.textContent(".mf-soundtoggle")).trim();
  await p.click(".mf-soundtoggle");
  await p.waitForTimeout(300);
  const on = await audio(p);
  check("1280: pause card Sound on/off toggles the sound", !off.on && on.on && /off/i.test(offLabel), { off, on, offLabel });
  await p.click(".mf-resume");
  await waitFor(p, "e.running", 20000).catch(() => {});
  // Auto-pause (window lost focus) shows the same card with the reason.
  await p.waitForTimeout(600);
  await p.evaluate(() => window.dispatchEvent(new Event("blur")));
  await waitFor(p, "!e.running", 20000);
  await pauseShown(p, true);
  pc = await pauseCard(p);
  check("1280: auto-pause on lost focus shows Resume and why", pc.visible && pc.focused && /focus/.test(pc.reason), pc);
  await p.screenshot({ path: `${OUT}/auto-pause-1280.png` });
  await p.keyboard.press("Enter");
  await waitFor(p, "e.running", 20000).catch(() => {});
  check("1280: Enter on the focused Resume resumes", await engine(p, "e.running"));
  // Muted sound: the in-match hint appears and turns it back on.
  await p.evaluate(() => {
    const a = document.querySelector("midnry-fps").engine.retention.audio;
    a.setSound(false);
  });
  await p.keyboard.press("Escape");
  await waitFor(p, "!e.running", 20000);
  await p.waitForTimeout(600);
  await p.click(".mf-resume");
  await p.waitForFunction(() => !document.querySelector(".mf-soundhint").hidden, null, { timeout: 20000, polling: 200 }).catch(() => {});
  const hint = await p.evaluate(() => ({ shown: !document.querySelector(".mf-soundhint").hidden, text: document.querySelector(".mf-soundhint").textContent }));
  await p.screenshot({ path: `${OUT}/sound-off-hint-1280.png` });
  check("1280: 'Sound is off' hint shows in a match when muted", hint.shown && /Sound is off/.test(hint.text), hint);
  await p.evaluate(() => document.querySelector(".mf-soundhint").click());
  await p.waitForTimeout(300);
  check("1280: the hint turns sound back on", (await audio(p)).on);
  check("1280: no page errors", errors.length === 0, errors);
  await ctx.close();
}

// ---------- Blackout Protocol: sound is not silent ----------
if (PARTS.includes("protocol")) {
  const { ctx, p, errors } = await open(1280, 720, { fresh: false });
  await pickGame(p, "protocol");
  await p.click(".mf-modeplay:visible");
  await waitFor(p, 'e.state === "playing"', 120000);
  await p.waitForTimeout(3000);
  await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Understood/.test(x.textContent))?.click());
  await waitFor(p, "e.running", 30000).catch(() => {});
  const peak = await listen(p, 6000);
  check("protocol: base ambience is audible (master peak > 0.005)", peak > 0.005, { peak: +peak.toFixed(4), ...(await audio(p)) });
  await p.keyboard.press("Escape");
  await waitFor(p, "!e.running", 20000).catch(() => {});
  await pauseShown(p, true);
  const pc = await pauseCard(p);
  check("protocol: pause shows Resume, focused", pc.visible && pc.focused, pc);
  await p.screenshot({ path: `${OUT}/pause-protocol-1280.png` });
  check("protocol: no page errors", errors.length === 0, errors);
  await ctx.close();
}

// ---------- Phones: carousel (swipe), first tap sound, pause card ----------
for (const [w, h] of PARTS.includes("phones") ? [
  [390, 844],
  [844, 390],
] : []) {
  const tag = `${w}x${h}`;
  // Phones also run with reduced motion: the cards switch without sliding.
  const { ctx, p, errors } = await open(w, h, { mobile: true, reduced: true });
  const bg = await emptySpot(p);
  await p.touchscreen.tap(...(bg || [w / 2, h / 3]));
  await p.waitForFunction(() => document.querySelector("midnry-fps").engine.retention.audio.ctx?.state === "running", null, { timeout: 15000 }).catch(() => {});
  check(`${tag}: AudioContext running after the first tap`, (await audio(p)).state === "running", await audio(p));
  await p.tap('.mf-hometop [data-go="guide"]');
  await p.waitForTimeout(600);
  await carousel(p, `signal-${tag}`, { touch: true });
  check(`${tag}: reduced motion: cards switch without sliding`, (await p.evaluate(() => getComputedStyle(document.querySelector(".mf-qstrack")).transitionDuration)) === "0s");
  await p.tap(".mf-qsskip");
  await p.waitForTimeout(300);
  check(`${tag}: Skip closes the carousel`, !(await card(p)).open);
  // First match: the cards, Skip starts the match.
  await p.evaluate(() => localStorage.removeItem("midnry-outpost-quickstart"));
  await p.tap(".mf-modeplay:visible");
  await p.waitForTimeout(600);
  check(`${tag}: first match opens the quick start`, (await card(p)).open);
  await p.tap(".mf-qsskip");
  await waitFor(p, 'e.state === "playing" && e.running', 120000).catch(() => {});
  check(`${tag}: Skip on a first match starts it`, await engine(p, "e.running"));
  await p.waitForTimeout(1500);
  const menus = await p.evaluate(() => {
    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.querySelector("midnry-fps .mf-touch, midnry-fps .mf-stick")?.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  check(`${tag}: long-press menu blocked on the touch controls`, menus);
  await p.tap(".mf-pause");
  await waitFor(p, "!e.running", 20000);
  await pauseShown(p);
  const pc = await pauseCard(p);
  check(`${tag}: pause card on screen with Resume`, pc.visible && pc.onScreen, pc);
  await p.screenshot({ path: `${OUT}/pause-${tag}.png` });
  await p.tap(".mf-resume");
  await waitFor(p, "e.running", 20000).catch(() => {});
  check(`${tag}: Resume resumes`, await engine(p, "e.running"));
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}

await b.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => f.name).join("; "));
  process.exitCode = 1;
}
