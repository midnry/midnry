/** In-match HUD look for the arena modes (Last Signal, Pair Ops, training):
 * dark rounded pills and cards, white line icons, gold accents.
 *  - Last Signal: an "alive | lives" pill top left, the start shield (or the
 *    last-life adrenaline) under it, and the Red Haze countdown in a red pill.
 *  - Touch: a round thumb cluster (FIRE, RELOAD, CROUCH, ADS, JUMP), a larger
 *    joystick with arrow ticks, the health card above it, the weapon card
 *    bottom right and the special move as a round button with a charge ring.
 *  - Desktop: the same cards and pills, no touch buttons; the special move
 *    keeps its Q hint.
 * It only restyles the existing buttons (their handlers, labels for screen
 * readers and stance/scope states stay as they are) and adds three status
 * pills. Blackout Protocol keeps its own HUD: nothing here applies there. */
import { SIGNAL } from "./outpost-sim.js";

const svg = (body, filled = false) =>
  `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${filled ? 0 : 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const mask = (body, filled = false) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    svg(body, filled).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll("currentColor", "black"),
  )}")`;

const ICON = {
  person: '<circle cx="12" cy="7.6" r="4.1"/><path d="M3.8 21c0-4.6 3.6-7.6 8.2-7.6s8.2 3 8.2 7.6z"/>',
  heart: '<path d="M12 20.8S3 15.4 3 9.1A4.9 4.9 0 0 1 12 6.4a4.9 4.9 0 0 1 9 2.7c0 6.3-9 11.7-9 11.7z"/>',
  shield: '<path d="M12 2.5l8 3.1v5.9c0 5-3.4 9-8 10.4-4.6-1.4-8-5.4-8-10.4V5.6z"/>',
  bolt: '<path d="M13.6 2L4.8 13.6h6.1L9.6 22l9.6-12.2h-6.3z"/>',
  biohazard:
    '<circle cx="12" cy="12.6" r="1.7"/><path d="M9.2 8.6a4.2 4.2 0 1 1 5.6 0M7.6 16.4a4.2 4.2 0 1 1-1.2-5.5M17.6 10.9a4.2 4.2 0 1 1-1.2 5.5"/><path d="M8.3 6.2a6.6 6.6 0 0 0-2.4 3.4M15.7 6.2a6.6 6.6 0 0 1 2.4 3.4M8.7 19.1a6.6 6.6 0 0 0 6.6 0"/>',
  bullet: '<g transform="rotate(40 12 12)"><path d="M8.8 9.4C9 5.9 10.4 3.5 12 2c1.6 1.5 3 3.9 3.2 7.4z"/><path d="M8.8 11h6.4v11H8.8z"/></g>',
  reload: '<path d="M19.2 9.2A7.6 7.6 0 0 0 5.4 7.4M4.8 14.8a7.6 7.6 0 0 0 13.8 1.8"/><path d="M19.6 3.8v5.6H14M4.4 20.2v-5.6H10"/>',
  crosshair: '<circle cx="12" cy="12" r="6.8"/><path d="M12 2.2v5.2M12 16.6v5.2M2.2 12h5.2M16.6 12h5.2"/><circle cx="12" cy="12" r="1.4" fill="black" stroke="none"/>',
  chevron: '<path d="M4.8 15.6L12 8.4l7.2 7.2"/>',
};
// The joystick ring: four small arrow ticks at its edges.
const TICKS = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#ffffffa6"><path d="M50 7l5 7h-10zM50 93l5-7h-10zM7 50l7 5v-10zM93 50l-7 5v-10z"/></svg>',
)}")`;

const PILL = "background: #0b1015c7; border: 1px solid #ffffff24; border-radius: 10px; box-shadow: 0 2px 10px #0006; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);";
const S = "midnry-fps .mf-shell.mf-sighud";
const CSS = `
midnry-fps .mf-sig-status, midnry-fps .mf-sig-shield, midnry-fps .mf-sig-haze { display: none; }
${S}.mf-sigmode :is(.mf-sig-status, .mf-sig-shield, .mf-sig-haze):not([hidden]) { display: flex; }
${S} :is(.mf-sig-status, .mf-sig-shield, .mf-sig-haze) { position: absolute; z-index: 3; align-items: center; pointer-events: none; color: #f2f4f1; font: 600 16px/1 var(--mf-display); letter-spacing: 0.04em; ${PILL} }
${S} :is(.mf-sig-status, .mf-sig-shield, .mf-sig-haze) svg { flex: none; width: 18px; height: 18px; }
midnry-fps .mf-shell:has(> .mf-modal:not([hidden])) > :is(.mf-sig-status, .mf-sig-shield, .mf-sig-haze) { visibility: hidden; }
${S} .mf-sig-status { top: calc(14px + var(--mf-safe-top)); left: calc(14px + var(--mf-safe-left)); height: 36px; padding: 0 12px; gap: 10px; }
${S} .mf-sig-alive { display: flex; align-items: center; gap: 7px; }
${S} .mf-sig-alive b { font: 700 20px/1 var(--mf-display); font-variant-numeric: tabular-nums; }
${S} :is(.mf-sig-alive, .mf-sig-lives) small { font: 600 12px/1 var(--mf-display); letter-spacing: 0.08em; color: #c9d0cc; }
${S} .mf-sig-lives { display: grid; justify-items: center; gap: 3px; padding-left: 10px; border-left: 1px solid #ffffff33; }
${S} .mf-sig-hearts { display: flex; gap: 3px; color: var(--mf-accent, #ffc857); }
${S} .mf-sig-status .mf-sig-hearts svg { width: 13px; height: 13px; }
${S} .mf-sig-hearts .mf-lost { color: #ffffff38; }
${S} .mf-sig-status.mf-lastlife { border-color: #ff5a4a99; }
${S} .mf-sig-status.mf-lastlife .mf-sig-lives small { color: #ff8a7f; }
${S} .mf-sig-shield { top: calc(56px + var(--mf-safe-top)); left: calc(14px + var(--mf-safe-left)); height: 30px; padding: 0 10px; gap: 7px; font-size: 17px; font-variant-numeric: tabular-nums; }
${S} .mf-sig-shield.mf-rush { color: #ffd98a; border-color: #ffc85799; }
${S} .mf-sig-haze { top: calc(14px + var(--mf-safe-top)); left: 50%; transform: translateX(-50%); height: 32px; padding: 0 14px; gap: 8px; white-space: nowrap; font-size: 17px; letter-spacing: 0.05em; color: #ffd0c9; background: #3a0f0fd0; border-color: #ff5a4a; box-shadow: 0 0 14px #ff3b2f66, inset 0 0 10px #ff3b2f2e; }
${S} .mf-sig-haze svg { color: #ff6a5c; }
${S} .mf-sig-haze[data-state="inside"] { background: #6a0f0fe0; color: #fff; animation: mf-sig-alarm 0.9s ease-in-out infinite; }
${S} .mf-sig-haze[data-state="closed"] { color: #e7c9c4; box-shadow: none; }
@keyframes mf-sig-alarm { 50% { box-shadow: 0 0 22px #ff3b2fcc, inset 0 0 12px #ff3b2f66; } }
/* Disaster warnings: the same pill language, under the Red Haze pill. */
${S}.mf-sigmode .mf-disaster { top: calc(56px + var(--mf-safe-top)) !important; left: 50% !important; transform: translateX(-50%) !important; max-width: min(440px, calc(100% - 32px)) !important; padding: 7px 14px !important; border-width: 1px !important; border-radius: 10px !important; text-align: center !important; font-family: var(--mf-display) !important; }
${S}.mf-sigmode .mf-disaster b { font: 700 16px/1.15 var(--mf-display) !important; letter-spacing: 0.06em; }
/* Top right: pause button; the minimap is drawn to its left on the canvas. */
${S} .mf-top { left: auto !important; right: calc(14px + var(--mf-safe-right)) !important; top: calc(14px + var(--mf-safe-top)) !important; width: auto !important; }
${S}.mf-sigmode :is(.mf-brand, .mf-tag), ${S}.mf-sigmode .mf-objective { display: none !important; }
${S} .mf-topright { flex-direction: column; align-items: flex-end; gap: 8px; }
${S} .mf-pause { order: -1; width: 48px !important; height: 48px !important; min-width: 48px; border-radius: 10px !important; ${PILL} color: #fff; font: 800 15px/1 var(--mf-display); letter-spacing: 0; }
/* Health card. */
${S} .mf-bottom { inset: 0 !important; opacity: 1 !important; display: block !important; }
${S} .mf-bottom .mf-stat { position: absolute; margin: 0; padding: 8px 14px 10px !important; border-radius: 10px !important; ${PILL} color: #f2f4f1; font-size: 0 !important; transform: none !important; }
${S} .mf-bottom .mf-stat:first-child { display: flex; flex-wrap: wrap; align-items: center; gap: 7px 5px; left: calc(14px + var(--mf-safe-left)); bottom: calc(168px + var(--mf-safe-bottom)); width: 136px; }
${S} .mf-bottom .mf-stat:first-child::before { content: ""; width: 20px; height: 20px; background: #f6f7f4; -webkit-mask: ${mask(ICON.heart, true)} center / contain no-repeat; mask: ${mask(ICON.heart, true)} center / contain no-repeat; }
${S} .mf-hp { font: 600 28px/1 var(--mf-display) !important; letter-spacing: 0 !important; color: #fff !important; font-variant-numeric: tabular-nums; margin: 0 !important; flex: 1; text-align: left; }
${S} .mf-hp.mf-critical { color: #ff7366 !important; }
${S} .mf-health { flex: 0 0 100%; width: auto !important; height: 7px !important; margin: 0 !important; border-radius: 4px; background: #ffffff1f !important; overflow: hidden; }
${S} .mf-health i { border-radius: 4px; background: #ffc23d !important; transition: width 0.2s ease; }
${S} .mf-stat:has(.mf-critical) .mf-health i { background: #ff5a4a !important; }
${S} .mf-stat:has(.mf-critical) { border-color: #ff5a4a99 !important; animation: mf-sig-low 0.9s ease-in-out infinite; }
${S} .mf-stat:has(.mf-critical)::before { background: #ff5a4a !important; }
@keyframes mf-sig-low { 50% { box-shadow: 0 0 16px #ff3b2f88; } }
/* Weapon card. */
${S} .mf-bottom .mf-ammo { right: calc(14px + var(--mf-safe-right)); bottom: calc(12px + var(--mf-safe-bottom)); min-width: 104px; padding: 7px 14px 6px !important; text-align: left !important; font: 600 12px/1 var(--mf-display) !important; letter-spacing: 0.08em !important; color: #c9d0cc !important; white-space: nowrap; }
${S} .mf-rounds { display: block; margin-top: 3px !important; font: 600 30px/1 var(--mf-display) !important; letter-spacing: 0 !important; color: #fff !important; font-variant-numeric: tabular-nums; }
${S} .mf-rounds span { margin-left: 4px; font: 600 26px/1 var(--mf-display) !important; color: #d9dedb !important; }
/* Special move: a round button with a charge ring. */
${S} .mf-super { left: 50% !important; right: auto !important; bottom: calc(86px + var(--mf-safe-bottom)) !important; transform: translateX(-50%) !important; display: block; width: 58px !important; height: 58px !important; min-width: 0 !important; max-width: none !important; min-height: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 50% !important; overflow: visible; background: #0b1015c7 !important; box-shadow: 0 2px 12px #0007 !important; color: #f2f4f1 !important; font: 700 13px/1 var(--mf-display) !important; letter-spacing: 0.08em; cursor: pointer; corner-shape: round !important; }
${S} .mf-super:disabled { opacity: 1; cursor: default; }
${S} .mf-super::before { content: ""; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(var(--mf-accent, #ffc857) calc(var(--mf-charge, 0) * 1turn), #ffffff2e 0); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px)); mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px)); }
${S} .mf-super .mf-superico { position: absolute; inset: 15px; background: #ffffffb3; -webkit-mask: ${mask(ICON.bolt, true)} center / contain no-repeat; mask: ${mask(ICON.bolt, true)} center / contain no-repeat; }
${S} .mf-super b { position: absolute; left: 50%; top: calc(100% + 4px); transform: translateX(-50%); margin: 0 !important; padding: 4px 9px 3px; border-radius: 8px; background: #0b1015d9; color: #e6ebe7 !important; font: 700 13px/1 var(--mf-display); letter-spacing: 0.08em; white-space: nowrap; font-variant-numeric: tabular-nums; }
${S} .mf-supername { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
${S} .mf-super.mf-super-ready { box-shadow: 0 0 0 2px #ffc85755, 0 0 18px #ffc857aa, 0 2px 12px #0007 !important; animation: mf-sig-ready 1.4s ease-in-out infinite; }
${S} .mf-super.mf-super-ready .mf-superico { background: var(--mf-accent, #ffc857); }
${S} .mf-super.mf-super-ready b { color: var(--mf-accent, #ffc857) !important; }
@keyframes mf-sig-ready { 50% { box-shadow: 0 0 0 3px #ffc85777, 0 0 26px #ffc857dd, 0 2px 12px #0007; } }
/* Touch controls. */
${S} .mf-touch button:is(.mf-fire, .mf-reload, .mf-stance, .mf-jump, .mf-scope) { position: absolute; display: grid !important; place-items: center; align-content: center; gap: 2px; padding: 0 !important; min-width: 0 !important; min-height: 0 !important; border: 2px solid #ffffffc0 !important; border-radius: 50% !important; background: #0b1015a6 !important; color: #fff !important; font: 700 11px/1 var(--mf-display) !important; letter-spacing: 0.06em !important; box-shadow: 0 2px 10px #0006 !important; transform: none; corner-shape: round !important; }
${S} .mf-touch button:is(.mf-fire, .mf-reload, .mf-stance, .mf-jump, .mf-scope):active { transform: scale(0.94); filter: none; opacity: 1; }
/* Settings → Touch button size / opacity. A pressed control is always fully visible.
   Bigger than standard only where there is room (tablets); phones (and any
   short landscape screen) cap at the standard size so nothing overlaps. */
${S} { --mf-btnk: var(--mf-btn, 1); }
@media (max-width: 599px), (max-height: 500px) { ${S} { --mf-btnk: min(var(--mf-btn, 1), 1); } }
${S} .mf-bottom .mf-stat:first-child { bottom: calc(168px + (var(--mf-btnk, 1) - 1) * 154px + var(--mf-safe-bottom)); }
${S} .mf-touch :is(button, .mf-stick), ${S} .mf-super { opacity: var(--mf-btn-alpha, 1); }
${S} .mf-touch .mf-stick:active { opacity: 1; }
${S} .mf-touch :is(.mf-stance, .mf-jump, .mf-scope) i { width: 24px !important; height: 24px !important; }
${S} .mf-touch :is(.mf-fire, .mf-reload)::before { content: ""; width: 24px; height: 24px; background: currentColor; -webkit-mask: var(--mf-glyph) center / contain no-repeat; mask: var(--mf-glyph) center / contain no-repeat; }
/* Settings → Edit touch layout (outpost-touch-layout.js) sets --mf-<control>-dx /
   -dy on the shell: the player's shift from the default spot, in standard-size
   pixels. It sits inside the size multiplication so a custom layout grows and
   shrinks with the button-size setting exactly like the default one does, and
   the safe-area inset is still added afterwards. */
${S} .mf-touch button.mf-fire { right: calc((14px + var(--mf-fire-dx, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-right)) !important; bottom: calc((128px + var(--mf-fire-dy, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-bottom)) !important; width: calc(78px * var(--mf-btnk, 1)) !important; height: calc(78px * var(--mf-btnk, 1)) !important; border: 3px solid var(--mf-accent, #ffc857) !important; font-size: 15px !important; box-shadow: 0 0 16px #ffc85777, inset 0 0 12px #ffc85733 !important; --mf-glyph: ${mask(ICON.bullet, true)}; }
${S} .mf-touch .mf-fire::before { width: 30px; height: 30px; }
${S} .mf-touch button.mf-reload { right: calc((14px + var(--mf-reload-dx, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-right)) !important; bottom: calc((72px + var(--mf-reload-dy, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-bottom)) !important; width: calc(52px * var(--mf-btnk, 1)) !important; height: calc(52px * var(--mf-btnk, 1)) !important; font-size: 0 !important; --mf-glyph: ${mask(ICON.reload)}; }
${S} .mf-touch .mf-reload::before { width: 20px; height: 20px; }
${S} .mf-touch .mf-reload::after { content: "RELOAD"; font: 700 10px/1 var(--mf-display); letter-spacing: 0.06em; }
${S} .mf-touch button.mf-stance { right: calc((98px + var(--mf-stance-dx, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-right)) !important; bottom: calc((102px + var(--mf-stance-dy, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-bottom)) !important; width: calc(54px * var(--mf-btnk, 1)) !important; height: calc(54px * var(--mf-btnk, 1)) !important; }
${S} .mf-touch .mf-stance span { font-size: 10px; }
${S} .mf-touch button.mf-stance:is([data-stance="crouch"], [data-stance="prone"]) { border-color: var(--mf-accent, #ffc857) !important; color: var(--mf-accent, #ffc857) !important; }
${S} .mf-touch button.mf-scope { right: calc((100px + var(--mf-scope-dx, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-right)) !important; bottom: calc((196px + var(--mf-scope-dy, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-bottom)) !important; width: calc(52px * var(--mf-btnk, 1)) !important; height: calc(52px * var(--mf-btnk, 1)) !important; --mf-glyph: ${mask(ICON.crosshair)}; }
${S} .mf-touch .mf-scope span { font-size: 0; }
${S} .mf-touch .mf-scope span::after { content: "ADS"; font-size: 10px; }
${S} .mf-touch button.mf-scope[aria-pressed="true"] { border-color: var(--mf-accent, #ffc857) !important; background: #3a2c10d0 !important; color: var(--mf-accent, #ffc857) !important; }
${S} .mf-touch button.mf-jump { right: calc((16px + var(--mf-jump-dx, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-right)) !important; bottom: calc((216px + var(--mf-jump-dy, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-bottom)) !important; width: calc(52px * var(--mf-btnk, 1)) !important; height: calc(52px * var(--mf-btnk, 1)) !important; --mf-glyph: ${mask(ICON.chevron)}; }
${S} .mf-touch .mf-jump span { font-size: 10px; }
${S} .mf-touch .mf-stick { left: calc((14px + var(--mf-stick-dx, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-left)) !important; bottom: calc((30px + var(--mf-stick-dy, 0px)) * var(--mf-btnk, 1) + var(--mf-safe-bottom)) !important; width: calc(124px * var(--mf-btnk, 1)) !important; height: calc(124px * var(--mf-btnk, 1)) !important; border: 2px solid #ffffff59 !important; background: ${TICKS} center / 100% 100% no-repeat, radial-gradient(circle, #0b101540, #0b101580) !important; box-shadow: 0 2px 12px #0004; }
${S} .mf-touch .mf-stick i { left: 50% !important; top: 50% !important; width: calc(46px * var(--mf-btnk, 1)) !important; height: calc(46px * var(--mf-btnk, 1)) !important; margin: calc(-23px * var(--mf-btnk, 1)) 0 0 calc(-23px * var(--mf-btnk, 1)); border: 0 !important; background: radial-gradient(circle at 40% 35%, #f4f5f2, #c9ccc8) !important; box-shadow: 0 2px 8px #0006; }
${S} .mf-touch .mf-stick::before { content: "" !important; top: -20px !important; }
${S} .mf-touch .mf-stick.mf-run { border-color: var(--mf-accent, #ffc857) !important; box-shadow: 0 0 0 3px #ffc85740 !important; }
${S} .mf-touch .mf-stick.mf-run i { background: var(--mf-accent, #ffc857) !important; }
${S} .mf-touch .mf-stick.mf-run::before { content: "RUN" !important; font: 700 12px/1 var(--mf-display) !important; letter-spacing: 0.12em; }
/* Pair Ops / training keep their status cards; move them clear of the minimap. */
@media (max-width: 700px) and (orientation: portrait) {
  ${S}:not(.mf-sigmode) .mf-objective { top: calc(72px + var(--mf-safe-top)) !important; }
  ${S}:not(.mf-sigmode) .mf-match { top: calc(112px + var(--mf-safe-top)) !important; }
}
/* Last Signal: the cores line only on large screens (phones drop it). */
${S}.mf-sigmode .mf-match { display: none !important; }
/* Landscape phones: messages above the crosshair, clear of the special move. */
@media (max-height: 500px) {
  ${S} .mf-toast { top: 27% !important; }
}
/* Portrait phones: the Red Haze pill sits beside the shield pill, under the
   status pill, so the minimap keeps the top right corner. */
@media (max-width: 600px) {
  ${S} .mf-sig-haze { top: calc(56px + var(--mf-safe-top)); left: calc(14px + var(--mf-safe-left)); transform: none; height: 30px; padding: 0 11px; font-size: 15px; }
  ${S}.mf-shielded .mf-sig-haze { left: calc(84px + var(--mf-safe-left)); }
  ${S}.mf-sigmode .mf-disaster { top: calc(108px + var(--mf-safe-top)) !important; }
}
/* Large screens without touch: bigger cards, the Q hint under the special move. */
@media (pointer: fine), (hover: hover) and (min-width: 900px) {
  ${S} .mf-bottom .mf-stat:first-child { left: calc(22px + var(--mf-safe-left)); bottom: calc(22px + var(--mf-safe-bottom)); width: 220px; padding: 10px 16px 12px !important; }
  ${S} .mf-bottom .mf-stat:first-child::before { width: 24px; height: 24px; }
  ${S} .mf-hp { font-size: 34px !important; }
  ${S} .mf-health { height: 8px !important; }
  ${S} .mf-bottom .mf-ammo { right: calc(22px + var(--mf-safe-right)); bottom: calc(22px + var(--mf-safe-bottom)); min-width: 150px; padding: 10px 16px 9px !important; font-size: 14px !important; }
  ${S} .mf-rounds { font-size: 38px !important; }
  ${S} .mf-rounds span { font-size: 30px !important; }
  ${S} .mf-super { bottom: calc(64px + var(--mf-safe-bottom)) !important; width: 64px !important; height: 64px !important; }
  ${S} .mf-super .mf-superico { inset: 17px; }
  ${S} .mf-supername { position: absolute; left: 50%; top: calc(100% + 28px); width: auto; height: auto; overflow: visible; clip-path: none; transform: translateX(-50%); color: #e6ebe7; font: 600 12px/1 var(--mf-display); letter-spacing: 0.1em; text-shadow: 0 1px 4px #000; }
  ${S} .mf-supername { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
  ${S} .mf-supername[data-key]::before { content: attr(data-key); display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border: 1px solid #ffffff59; border-radius: 4px; background: #0b0d0cb3; color: #ffc857; font: 700 12px/1 var(--mf-display); letter-spacing: 0; }
  ${S}.mf-sigmode .mf-match:not([hidden]) { display: block !important; top: calc(56px + var(--mf-safe-top)) !important; left: calc(14px + var(--mf-safe-left)) !important; max-width: none !important; padding: 7px 12px !important; border-radius: 10px !important; ${PILL} font: 600 14px/1 var(--mf-display) !important; letter-spacing: 0.06em !important; text-shadow: none; }
  ${S}.mf-sigmode.mf-shielded .mf-match { left: calc(84px + var(--mf-safe-left)) !important; }
  ${S}.mf-sigmode .mf-match :is(.mf-teamstat, .mf-zone) { display: none; }
  ${S}.mf-sigmode .mf-match .mf-cores { color: #9fe8d8; }
  ${S} .mf-sig-status { height: 40px; }
  ${S} .mf-sig-shield { top: calc(60px + var(--mf-safe-top)); }
  ${S}.mf-sigmode .mf-match:not([hidden]) { top: calc(60px + var(--mf-safe-top)) !important; }
  ${S}.mf-sigmode .mf-disaster { top: calc(58px + var(--mf-safe-top)) !important; }
}
@media (prefers-reduced-motion: reduce) {
  ${S} :is(.mf-sig-haze, .mf-super.mf-super-ready, .mf-stat) { animation: none !important; }
  ${S} .mf-health i { transition: none; }
}
`;

const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  node.className = cls;
  if (html) node.innerHTML = html;
  return node;
};

export class SignalHud {
  constructor(g) {
    this.g = g;
    if (!g.shell) return;
    this.style = el("style", "");
    this.style.dataset.outpostSignalHud = "";
    this.style.textContent = CSS;
    this.status = el(
      "div",
      "mf-sig-status",
      `<span class="mf-sig-alive">${svg(ICON.person, true)}<b>8</b><small>ALIVE</small></span><span class="mf-sig-lives"><span class="mf-sig-hearts" aria-hidden="true"></span><small>3 LIVES</small></span>`,
    );
    this.shield = el("div", "mf-sig-shield", `${svg(ICON.shield, true)}<span></span>`);
    this.haze = el("div", "mf-sig-haze", `${svg(ICON.biohazard)}<span></span>`);
    for (const node of [this.status, this.shield, this.haze]) node.hidden = true;
    g.shell.append(this.style, this.status, this.shield, this.haze);
    // The special move: its name in its own node (updateHUD writes the
    // button's first child), plus the lightning icon.
    const button = g.$(".mf-super");
    if (button && button.firstChild?.nodeType === Node.TEXT_NODE) {
      const name = el("span", "mf-supername");
      name.textContent = button.firstChild.textContent;
      button.replaceChild(name, button.firstChild);
      const ico = el("i", "mf-superico");
      ico.setAttribute("aria-hidden", "true");
      button.append(ico);
    }
    this.original = g.updateHUD.bind(g);
    g.updateHUD = (...args) => {
      const result = this.original(...args);
      this.render();
      return result;
    };
  }

  set(node, key, value, apply) {
    if (node[key] === value) return;
    node[key] = value;
    apply(value);
  }

  render() {
    const g = this.g,
      p = g.player;
    if (!p) return;
    const shell = g.shell,
      on = g.mode !== "protocol",
      signal = on && g.mode === "signal";
    if (shell.classList.contains("mf-sighud") !== on) {
      shell.classList.toggle("mf-sighud", on);
      // The pause button moved: place the minimap again.
      queueMicrotask(() => g.resize?.());
    }
    shell.classList.toggle("mf-sigmode", signal);
    if (!on) return;
    // Special move ring and label.
    const charge = Math.max(0, Math.min(100, p.charge || 0)),
      ready = p.hp > 0 && charge >= 100,
      button = g.$(".mf-super");
    if (button) {
      this.set(this, "charge", charge, (v) => button.style.setProperty("--mf-charge", (v / 100).toFixed(3)));
      const label = ready ? "READY" : Math.floor(charge) + "%";
      const b = button.querySelector("b");
      if (b && b.textContent !== label) b.textContent = label;
      const name = button.querySelector(".mf-supername")?.textContent.replace(/^[QX] · /, "").trim().toLowerCase() || "special move";
      this.set(this, "superLabel", `${ready ? "Use" : "Charging"} ${name}${ready ? ", ready" : `, ${Math.floor(charge)} percent`}`, (v) =>
        button.setAttribute("aria-label", v),
      );
    }
    if (!signal) {
      shell.classList.remove("mf-shielded");
      for (const node of [this.status, this.shield, this.haze]) node.hidden = true;
      return;
    }
    const time = g.time || 0,
      alive = g.combatants().filter((e) => e.hp > 0).length,
      total = SIGNAL.lives,
      left = p.hp > 0 ? Math.max(0, Math.min(total, (p.lives || 0) + 1)) : 0;
    this.status.hidden = false;
    this.set(this, "statusKey", `${alive}|${left}`, () => {
      this.status.querySelector(".mf-sig-alive b").textContent = String(alive);
      this.status.querySelector(".mf-sig-hearts").innerHTML = Array.from({ length: total }, (_, i) =>
        svg(ICON.heart, true).replace("<svg ", `<svg class="${i < left ? "" : "mf-lost"}" `),
      ).join("");
      this.status.querySelector(".mf-sig-lives small").textContent = p.hp > 0 ? `${left} ${left === 1 ? "LIFE" : "LIVES"}` : "OUT";
      this.status.classList.toggle("mf-lastlife", p.hp > 0 && left === 1);
    });
    // Start shield, or the last-life adrenaline rush.
    const shielded = p.hp > 0 && p.shieldUntil > time,
      rush = p.hp > 0 && !shielded && p.adrenalineUntil > time,
      badge = shielded ? `${Math.ceil(p.shieldUntil - time)}s` : rush ? `${Math.ceil(p.adrenalineUntil - time)}s` : "";
    this.shield.hidden = !badge;
    shell.classList.toggle("mf-shielded", !!badge);
    this.set(this, "shieldKey", `${rush}|${badge}`, () => {
      this.shield.classList.toggle("mf-rush", rush);
      this.shield.innerHTML = `${svg(rush ? ICON.bolt : ICON.shield, true)}<span>${badge}</span>`;
      this.shield.setAttribute("aria-label", rush ? `Adrenaline ${badge}` : `Shield ${badge}`);
    });
    // Red Haze countdown, then its state.
    const zone = g.zone;
    if (!zone) {
      this.haze.hidden = true;
      return;
    }
    const closesAt = zone.delay + zone.duration,
      inside = time >= zone.delay && p.hp > 0 && g.outsideSafe?.(p),
      state = time < zone.delay ? "soon" : inside ? "inside" : time < closesAt ? "closing" : "closed",
      text =
        state === "soon"
          ? `RED HAZE · ${Math.ceil(zone.delay - time)}s`
          : state === "inside"
            ? "IN THE HAZE · MOVE"
            : state === "closing"
              ? `HAZE CLOSING · ${Math.ceil(closesAt - time)}s`
              : "HAZE CLOSED";
    this.haze.hidden = g.arena?.state === "ended";
    this.set(this, "hazeKey", text, () => {
      this.haze.dataset.state = state;
      this.haze.querySelector("span").textContent = text;
    });
  }

  dispose() {
    if (this.original) this.g.updateHUD = this.original;
    for (const node of [this.style, this.status, this.shield, this.haze]) node?.remove();
    this.g.shell?.classList.remove("mf-sighud", "mf-sigmode", "mf-shielded");
  }
}
