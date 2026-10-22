/** Quick start: a short card carousel per game (goal, move and look, the key
 * actions, how to win or lose, one tip) shown before a first match and from
 * "How to play". The full manual stays one tap away ("Full guide").
 * Controls on the cards follow the real bindings in outpost-zero.html,
 * outpost-gamepad.js and outpost-protocol-ui.js; the scheme shown (keyboard,
 * touch or controller) follows the device and can be switched. */
import { icon } from "./outpost-icons.js";

const SEEN_KEY = "midnry-outpost-quickstart";

// Extra line icons in the same 24×24 stroke style as outpost-icons.js.
const EXTRA = {
  crown: '<path d="M4 18h16M5 18l-1.5-9 5 4L12 6l3.5 7 5-4L19 18"/>',
  move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  aim: '<circle cx="12" cy="12" r="7"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/><circle cx="12" cy="12" r="1"/>',
  stance: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v6l-3 7M12 13l3 7M8 10h8"/>',
  haze: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5" stroke-dasharray="3 2.5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  vote: '<path d="M4 20h16M6 20v-8h12v8M9 12V5h6v7M10.5 8.5l1.2 1.2 2.3-2.4"/>',
  hand: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.8-2.4L3.5 14.5a1.5 1.5 0 0 1 2.3-1.9L8 15"/>',
};
const ico = (name) =>
  EXTRA[name]
    ? `<svg class="mf-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${EXTRA[name]}</svg>`
    : icon(name);

/** Each card: icon, title, one short line, and controls per scheme
 * (`kb` keyboard + mouse, `touch`, `pad` controller) as [action, keys]. */
export const CARDS = {
  signal: [
    {
      icon: "crown",
      title: "Be the last one standing",
      text: "Eight fighters, one survivor. You start with an 8-second shield and three lives.",
    },
    {
      icon: "move",
      title: "Move and look",
      text: "Keep moving: a still target is an easy target.",
      kb: [["Move", "W A S D"], ["Look", "Mouse"], ["Run", "Shift"]],
      touch: [["Move", "Left stick"], ["Run", "Push the stick to its edge"], ["Look", "Drag on the right side"]],
      pad: [["Move", "Left stick"], ["Look", "Right stick"], ["Run", "Click the left stick"]],
    },
    {
      icon: "aim",
      title: "Shoot and aim",
      text: "Aiming down the sights zooms in and tightens your shots, but you walk slower.",
      kb: [["Fire", "Left click"], ["Aim", "Hold right click"], ["Reload", "R"], ["Special move", "Q (when full)"]],
      touch: [["Fire", "FIRE button"], ["Aim", "Scope button"], ["Reload", "Reload button"], ["Special move", "Round button (when full)"]],
      pad: [["Fire", "RT"], ["Aim", "Hold LT"], ["Reload", "Fire on empty"], ["Special move", "X (when full)"]],
    },
    {
      icon: "stance",
      title: "Jump, crouch, lie down",
      text: "Crouched or prone you are harder to spot and to hit. Jump over sandbags and canisters.",
      kb: [["Jump", "Space"], ["Crouch", "Tap C"], ["Lie down", "Hold C or Z"], ["Slide", "Ctrl while running"]],
      touch: [["Jump", "JUMP button"], ["Crouch", "Tap the stance button"], ["Lie down", "Hold the stance button"]],
      pad: [["Jump", "A"], ["Crouch", "Tap B"], ["Lie down", "Hold B"], ["Slide", "Y while running"]],
    },
    {
      icon: "haze",
      title: "Win or lose",
      text: "After 12 seconds the Red Haze closes in and hurts outside the safe square on the minimap. Lose all three lives and you are out. Each round also brings a disaster, with a 10-second warning.",
    },
    {
      icon: "bulb",
      title: "Tip",
      text: "Shoot the canisters: red explodes, green gasses, pink blocks a path, blue heals. Out of fire for 5 seconds, your health comes back.",
      kb: [["Pause", "Esc or P"]],
      touch: [["Pause", "II button, top right"]],
      pad: [["Pause", "Start"]],
    },
  ],
  protocol: [
    {
      icon: "medkit",
      title: "Save the wounded",
      text: "Operators gather medical supplies, fly the medevac to the field hospital and treat the patients. One or two players are secret infiltrators: your orders say which side you are on.",
    },
    {
      icon: "move",
      title: "Move and look",
      text: "Follow the arrow and the manifest in Info to find what is needed.",
      kb: [["Move", "W A S D"], ["Look", "Mouse or arrow keys"], ["Run", "Shift"]],
      touch: [["Move", "Left stick"], ["Run", "Push the stick to its edge"], ["Look", "Drag on the right side"]],
      pad: [["Move", "Left stick"], ["Look", "Right stick"], ["Run", "LT or click the left stick"], ["Info", "View"]],
    },
    {
      icon: "hand",
      title: "Key actions",
      text: "Hold the action to collect, load, repair or treat. Infiltrators can eliminate at close range.",
      kb: [["Collect, load, treat", "Hold E"], ["Report a body", "F"], ["Emergency meeting", "C"], ["Eliminate (infiltrator)", "X"]],
      touch: [["Collect, load, treat", "Hold the action button"], ["Report a body", "Report body"], ["Emergency meeting", "Info, then Emergency radio"]],
      pad: [["Collect, load, treat", "Hold A"], ["Report a body", "B"], ["Emergency meeting", "Y"], ["Eliminate (infiltrator)", "RB"]],
    },
    {
      icon: "vote",
      title: "Meet and vote",
      text: "In a meeting, say what you saw and vote. If most vote for one player, a Last Stand starts and weapons unlock.",
      kb: [["Fire (Last Stand)", "Click or Space"], ["Reload", "R"]],
      touch: [["Fire (Last Stand)", "FIRE button"]],
      pad: [["Fire (Last Stand)", "RT"]],
    },
    {
      icon: "crown",
      title: "Win or lose",
      text: "Operators win by saving at least two patients, or by voting out every infiltrator. Infiltrators win if too few patients are saved, three base charges go off, or enough operators fall.",
    },
    {
      icon: "bulb",
      title: "Tip",
      text: "Watch who works at a cabinet and nothing changes: real pickups visibly take a case. Offline, the menu pauses the game; online it keeps running.",
      kb: [["Pause", "Esc or P"]],
      touch: [["Pause", "II button, top right"]],
      pad: [["Pause", "Start"]],
    },
  ],
};

const SCHEMES = [
  ["kb", "Keyboard"],
  ["touch", "Touch"],
  ["pad", "Controller"],
];

const CSS = `
midnry-fps .mf-shell .mf-qs { box-sizing: border-box; width: min(560px, calc(100% - 24px)); max-width: none; max-height: calc(100% - 24px); margin: auto; padding: 0; overflow: hidden; border: 1px solid #ffffff2b; border-radius: 6px; background: #0a0f0df5; color: #eef2ee; box-shadow: 0 24px 80px #000c; font: 400 16px var(--mf-body); }
midnry-fps .mf-shell .mf-qs::backdrop { background: #030504c4; backdrop-filter: blur(3px); }
midnry-fps .mf-shell .mf-qs[open] { display: flex; flex-direction: column; }
midnry-fps .mf-shell .mf-qs .mf-qshead { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px 0; }
midnry-fps .mf-shell .mf-qs .mf-qskicker { margin: 0; font: 600 14px var(--mf-display); letter-spacing: 0.22em; text-transform: uppercase; color: var(--mf-accent); }
midnry-fps .mf-shell .mf-qs .mf-qskicker span { color: #aeb9b2; }
midnry-fps .mf-shell .mf-qs button { all: unset; cursor: pointer; box-sizing: border-box; }
midnry-fps .mf-shell .mf-qs button:focus-visible { outline: 2px solid var(--mf-accent); outline-offset: 2px; }
midnry-fps .mf-shell .mf-qs .mf-qsskip { min-height: 44px; padding: 0 12px; font: 600 15px var(--mf-display); letter-spacing: 0.12em; text-transform: uppercase; color: #c9d2cc; }
midnry-fps .mf-shell .mf-qs .mf-qsskip:hover { color: #fff; }
midnry-fps .mf-shell .mf-qs .mf-qsschemes { display: flex; gap: 6px; padding: 10px 18px 0; }
midnry-fps .mf-shell .mf-qs .mf-qsschemes button { min-height: 32px; padding: 0 12px; border: 1px solid #ffffff24; border-radius: 16px; font: 500 13px var(--mf-body); color: #c3ccc6; }
midnry-fps .mf-shell .mf-qs .mf-qsschemes button[aria-pressed="true"] { border-color: var(--mf-accent); color: #fff; background: #ffc85717; }
midnry-fps .mf-shell .mf-qs .mf-qsviewport { overflow: hidden; flex: 1 1 auto; min-height: 0; touch-action: pan-y; }
midnry-fps .mf-shell .mf-qs .mf-qstrack { display: flex; height: 100%; transition: transform 0.28s ease; }
midnry-fps .mf-shell .mf-qs .mf-qscard { box-sizing: border-box; flex: 0 0 100%; min-width: 0; overflow: auto; padding: 18px 26px 8px; display: grid; align-content: start; justify-items: center; gap: 12px; text-align: center; }
midnry-fps .mf-shell .mf-qs .mf-qsart { display: grid; place-items: center; width: 84px; height: 84px; border: 1px solid #ffc85755; border-radius: 50%; background: radial-gradient(circle, #ffc85726, #ffc85705 70%); color: var(--mf-accent); }
midnry-fps .mf-shell .mf-qs .mf-qsart .mf-ico { width: 44px; height: 44px; }
midnry-fps .mf-shell .mf-qs .mf-qscard h3 { margin: 0; font: 800 34px/1.02 var(--mf-display); letter-spacing: 0.01em; text-transform: uppercase; color: #f4f6f2; }
midnry-fps .mf-shell .mf-qs .mf-qscard p { margin: 0; max-width: 32em; font: 400 18px/1.45 var(--mf-body); color: #d6ddd8; }
midnry-fps .mf-shell .mf-qs .mf-qskeys { display: grid; grid-template-columns: auto auto; gap: 8px 14px; margin: 4px 0 0; padding: 0; align-items: center; text-align: left; }
midnry-fps .mf-shell .mf-qs .mf-qskeys dt { font: 400 16px var(--mf-body); color: #aeb9b2; justify-self: end; }
midnry-fps .mf-shell .mf-qs .mf-qskeys dd { margin: 0; justify-self: start; }
midnry-fps .mf-shell .mf-qs .mf-qskeys kbd { display: inline-block; padding: 4px 10px; border: 1px solid #ffffff3d; border-bottom-width: 3px; border-radius: 5px; background: #ffffff0d; font: 700 16px var(--mf-display); letter-spacing: 0.06em; color: #fff; }
midnry-fps .mf-shell .mf-qs .mf-qsfoot { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; padding: 12px 18px 16px; border-top: 1px solid #ffffff14; }
midnry-fps .mf-shell .mf-qs .mf-qsback { justify-self: start; min-height: 48px; padding: 0 16px; border: 1px solid #ffffff3d; border-radius: 4px; font: 700 17px var(--mf-display); letter-spacing: 0.1em; text-transform: uppercase; color: #eef2ee; }
midnry-fps .mf-shell .mf-qs .mf-qsback[aria-disabled="true"] { visibility: hidden; }
midnry-fps .mf-shell .mf-qs .mf-qsnext { justify-self: end; display: inline-flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 20px; border-radius: 4px; background: var(--mf-accent); color: var(--mf-accent-ink, #111); font: 800 21px var(--mf-display); letter-spacing: 0.06em; text-transform: uppercase; box-shadow: 0 10px 28px #ffc85730; }
midnry-fps .mf-shell .mf-qs .mf-qsnext .mf-ico { width: 20px; height: 20px; stroke-width: 2.4; }
midnry-fps .mf-shell .mf-qs .mf-qsnext:hover, midnry-fps .mf-shell .mf-qs .mf-qsback:hover { filter: brightness(1.08); }
midnry-fps .mf-shell .mf-qs .mf-qsdots { display: flex; gap: 2px; }
midnry-fps .mf-shell .mf-qs .mf-qsdots button { width: 24px; height: 32px; display: grid; place-items: center; }
midnry-fps .mf-shell .mf-qs .mf-qsdots button::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: #ffffff40; transition: background 0.2s, transform 0.2s; }
midnry-fps .mf-shell .mf-qs .mf-qsdots button[aria-current="step"]::before { background: var(--mf-accent); transform: scale(1.3); }
midnry-fps .mf-shell .mf-qs .mf-qsfull { display: block; margin: 0 auto 2px; min-height: 36px; padding: 0 10px; font: 500 14px var(--mf-body); color: #aeb9b2; text-decoration: underline; text-underline-offset: 3px; }
midnry-fps .mf-shell .mf-qs .mf-qsfull:hover { color: #fff; }
@media (max-width: 480px) {
  midnry-fps .mf-shell .mf-qs .mf-qscard { padding: 14px 16px 6px; gap: 10px; }
  midnry-fps .mf-shell .mf-qs .mf-qscard h3 { font-size: 28px; }
  midnry-fps .mf-shell .mf-qs .mf-qscard p { font-size: 17px; }
  midnry-fps .mf-shell .mf-qs .mf-qsart { width: 68px; height: 68px; }
  midnry-fps .mf-shell .mf-qs .mf-qsart .mf-ico { width: 36px; height: 36px; }
  midnry-fps .mf-shell .mf-qs .mf-qsfoot { padding: 10px 12px 14px; gap: 6px; }
  midnry-fps .mf-shell .mf-qs .mf-qsback { padding: 0 12px; font-size: 15px; }
  midnry-fps .mf-shell .mf-qs .mf-qsnext { padding: 0 14px; font-size: 18px; }
  midnry-fps .mf-shell .mf-qs .mf-qsdots button { width: 18px; }
}
@media (max-height: 500px) {
  midnry-fps .mf-shell .mf-qs { width: min(760px, calc(100% - 24px)); }
  midnry-fps .mf-shell .mf-qs .mf-qscard { grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto 1fr; column-gap: 20px; row-gap: 6px; justify-items: start; text-align: left; padding: 10px 22px 4px; }
  midnry-fps .mf-shell .mf-qs .mf-qsart { grid-row: 1 / 4; width: 64px; height: 64px; align-self: start; }
  midnry-fps .mf-shell .mf-qs .mf-qsart .mf-ico { width: 34px; height: 34px; }
  midnry-fps .mf-shell .mf-qs .mf-qscard h3 { font-size: 26px; }
  midnry-fps .mf-shell .mf-qs .mf-qscard p { font-size: 16px; }
  midnry-fps .mf-shell .mf-qs .mf-qskeys { grid-template-columns: auto auto auto auto; gap: 6px 10px; }
  midnry-fps .mf-shell .mf-qs .mf-qshead { padding-top: 8px; }
  midnry-fps .mf-shell .mf-qs .mf-qsschemes { padding-top: 4px; }
  midnry-fps .mf-shell .mf-qs .mf-qsfoot { padding: 8px 16px 10px; }
  midnry-fps .mf-shell .mf-qs .mf-qsnext { min-height: 46px; }
  midnry-fps .mf-shell .mf-qs .mf-qsback { min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
  midnry-fps .mf-shell .mf-qs .mf-qstrack, midnry-fps .mf-shell .mf-qs .mf-qsdots button::before { transition: none !important; }
}
`;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Which control scheme to show first on this device. */
export function defaultScheme(win = globalThis) {
  try {
    if ([...(win.navigator?.getGamepads?.() || [])].some(Boolean)) return "pad";
    if (win.matchMedia?.("(pointer: coarse)").matches) return "touch";
  } catch {}
  return "kb";
}

export class QuickStart {
  /** `fullGuide(mode)` opens the full manual for that game. */
  constructor(g, { fullGuide } = {}) {
    this.g = g;
    this.fullGuide = fullGuide;
    this.style = document.createElement("style");
    this.style.textContent = CSS;
    g.shell.append(this.style);
    const d = (this.dialog = document.createElement("dialog"));
    d.className = "mf-qs";
    d.setAttribute("aria-roledescription", "carousel");
    d.innerHTML = `<div class="mf-qshead"><p class="mf-qskicker" id="mf-qs-title"></p><button type="button" class="mf-qsskip">Skip</button></div><div class="mf-qsschemes" role="group" aria-label="Show controls for">${SCHEMES.map(([id, name]) => `<button type="button" data-scheme="${id}" aria-pressed="false">${name}</button>`).join("")}</div><div class="mf-qsviewport" aria-live="polite"><div class="mf-qstrack"></div></div><div class="mf-qsfoot"><button type="button" class="mf-qsback">Back</button><div class="mf-qsdots" role="group" aria-label="Choose a card"></div><button type="button" class="mf-qsnext"></button></div><button type="button" class="mf-qsfull">Full guide</button>`;
    d.setAttribute("aria-labelledby", "mf-qs-title");
    g.shell.append(d);
    this.track = d.querySelector(".mf-qstrack");
    this.dots = d.querySelector(".mf-qsdots");
    this.index = 0;
    this.scheme = defaultScheme();
    // Keys stay inside the carousel (the game's own keys ignore dialogs).
    g.on(d, "keydown", (e) => {
      e.stopPropagation();
      if (e.key === "ArrowRight") {
        e.preventDefault();
        this.go(this.index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.go(this.index - 1);
      }
    });
    g.on(d, "cancel", (e) => {
      // Escape skips, the same as the Skip button.
      e.preventDefault();
      this.skip();
    });
    g.on(d.querySelector(".mf-qsskip"), "click", () => this.skip());
    g.on(d.querySelector(".mf-qsback"), "click", () => this.go(this.index - 1));
    g.on(d.querySelector(".mf-qsnext"), "click", () => {
      if (this.index >= this.cards.length - 1) this.finish(true);
      else this.go(this.index + 1);
    });
    g.on(d.querySelector(".mf-qsfull"), "click", () => {
      const mode = this.mode;
      this.close();
      this.fullGuide?.(mode);
    });
    g.on(this.dots, "click", (e) => {
      const dot = e.target.closest("[data-card]");
      if (dot) this.go(Number(dot.dataset.card));
    });
    g.on(d.querySelector(".mf-qsschemes"), "click", (e) => {
      const b = e.target.closest("[data-scheme]");
      if (!b) return;
      this.scheme = b.dataset.scheme;
      this.render();
    });
    // Swipe on touch screens (horizontal drags only; vertical scrolls).
    const view = d.querySelector(".mf-qsviewport");
    let start = null;
    g.on(view, "pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    g.on(view, "pointerup", (e) => {
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x,
        dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) this.go(this.index + (dx < 0 ? 1 : -1));
    });
    g.on(view, "pointercancel", () => (start = null));
  }

  static seenAll() {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY)) || {};
    } catch {
      return {};
    }
  }
  seen(mode) {
    return Boolean(QuickStart.seenAll()[mode]);
  }
  markSeen(mode) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify({ ...QuickStart.seenAll(), [mode]: true }));
    } catch {}
  }

  /** Open for a game. `onPlay` runs when the last card's Play is pressed
   * (first match); without it the last button just closes. */
  open(mode, { onPlay = null, onSkip = null } = {}) {
    if (this.g.running) this.g.pause();
    this.mode = mode === "signal" ? "signal" : "protocol";
    this.cards = CARDS[this.mode];
    this.onPlay = onPlay;
    this.onSkip = onSkip;
    this.index = 0;
    this.returnFocus = document.activeElement;
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.querySelector(".mf-qsnext").focus({ preventScroll: true });
  }

  render() {
    const d = this.dialog,
      mode = this.mode;
    d.querySelector(".mf-qskicker").innerHTML = `${mode === "signal" ? "Last Signal" : "Blackout Protocol"} <span>/ Quick start</span>`;
    // Only offer schemes some card uses; all cards here have all three.
    for (const b of d.querySelectorAll("[data-scheme]")) b.setAttribute("aria-pressed", String(b.dataset.scheme === this.scheme));
    this.track.innerHTML = this.cards
      .map((card, i) => {
        const keys = card[this.scheme] || [];
        return `<section class="mf-qscard" role="group" aria-roledescription="card" aria-label="${i + 1} of ${this.cards.length}: ${escapeHtml(card.title)}"${i === this.index ? "" : " inert"}><div class="mf-qsart">${ico(card.icon)}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p>${keys.length ? `<dl class="mf-qskeys">${keys.map(([what, how]) => `<dt>${escapeHtml(what)}</dt><dd><kbd>${escapeHtml(how)}</kbd></dd>`).join("")}</dl>` : ""}</section>`;
      })
      .join("");
    this.dots.innerHTML = this.cards
      .map((card, i) => `<button type="button" data-card="${i}" aria-label="Card ${i + 1}: ${escapeHtml(card.title)}"></button>`)
      .join("");
    this.go(this.index, true);
  }

  go(i, quiet = false) {
    if (!this.cards) return;
    const last = this.cards.length - 1;
    this.index = Math.max(0, Math.min(last, i));
    this.track.style.transform = `translateX(${-100 * this.index}%)`;
    [...this.track.children].forEach((card, n) => card.toggleAttribute("inert", n !== this.index));
    [...this.dots.children].forEach((dot, n) => {
      if (n === this.index) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });
    const back = this.dialog.querySelector(".mf-qsback"),
      next = this.dialog.querySelector(".mf-qsnext");
    back.setAttribute("aria-disabled", String(this.index === 0));
    back.tabIndex = this.index === 0 ? -1 : 0;
    next.innerHTML = this.index === last ? `${this.onPlay ? "Play" : "Got it"} ${icon("chevron")}` : `Next ${icon("chevron")}`;
    if (!quiet && this.index === 0 && document.activeElement === back) next.focus({ preventScroll: true });
  }

  close() {
    if (this.mode) this.markSeen(this.mode);
    if (this.dialog.open) this.dialog.close();
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back?.isConnected && back.offsetParent) back.focus?.({ preventScroll: true });
  }
  skip() {
    const after = this.onSkip;
    this.close();
    after?.();
  }
  finish() {
    const after = this.onPlay;
    this.close();
    after?.();
  }

  dispose() {
    this.dialog.remove();
    this.style.remove();
  }
}
