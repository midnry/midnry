/** One visual system for Outpost Zero's menus, dialogs and HUD: a condensed
 * tactical display face for titles and buttons, a readable body face, one
 * set of colours and one button style. Loaded after every other UI module so
 * it is the last word on shared surfaces; it never changes gameplay. */
const CSS = `
@font-face { font-family: "Barlow Condensed"; font-weight: 600; font-display: swap; src: url("fonts/barlow-condensed-latin-600-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 700; font-display: swap; src: url("fonts/barlow-condensed-latin-700-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow"; font-weight: 400; font-display: swap; src: url("fonts/barlow-latin-400-normal.woff2") format("woff2"); }
@font-face { font-family: "Barlow"; font-weight: 600; font-display: swap; src: url("fonts/barlow-latin-600-normal.woff2") format("woff2"); }
:root, midnry-fps {
  --mf-display: "Barlow Condensed", "Arial Narrow", system-ui, sans-serif;
  --mf-body: "Barlow", system-ui, sans-serif;
  --mf-surface-2: #1a2523;
  --mf-line: #a9bdb22e;
  --mf-line-strong: #a9bdb266;
  --mf-text: #eef3ee;
  --mf-muted: #b7c5bd;
  --mf-accent: #ffc857;
  --mf-accent-ink: #1d1505;
  --mf-good: #8fe3a8;
  --mf-bad: #ff958a;
}

/* Type: display face for titles, labels and buttons; body face elsewhere. */
midnry-fps :is(h1, h2, h3, h4, button, summary, .mf-eyebrow, .mf-protocol-sharewa, .mf-loadbrand, .mf-loadtitle, .mf-loadcategory),
.mf-loading :is(h1, .mf-loadbrand, .mf-loadtitle, .mf-loadcategory) {
  font-family: var(--mf-display) !important;
}
midnry-fps button small { font-family: var(--mf-body) !important; text-transform: none !important; letter-spacing: 0 !important; font-weight: 400; }
midnry-fps :is(h1, h2, h3) { letter-spacing: 0.01em; }
midnry-fps .mf-panel h1 { font-weight: 700; letter-spacing: 0.01em; text-transform: uppercase; }
/* One button style for menus and dialog headers: uppercase, condensed, tracked. */
midnry-fps :is(.mf-panel, .mf-protocol-dialoghead, .mf-protocol-results, .mf-locker, .mf-settings) button,
midnry-fps .mf-panel summary, midnry-fps .mf-protocol-sharewa {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}
/* Long-form text stays in the readable face at a comfortable size. */
midnry-fps .mf-panel :is(p, li, label) { font-family: var(--mf-body); }

/* Colour: one dark surface for cards, yellow only for the main action. */
midnry-fps :is(.mf-results, .mf-retention, .mf-network, .mf-protocol-share, .mf-protocol-award) {
  background: var(--mf-surface-2) !important;
  border: 1px solid var(--mf-line) !important;
  color: var(--mf-text);
}
midnry-fps .mf-panel button:not(.mf-start, .mf-again, [aria-pressed="true"], .mf-exit, .mf-protocol-sharebtn) {
  background: #ffffff0a;
  border: 1px solid var(--mf-line-strong);
  color: var(--mf-text);
  box-shadow: none;
}
midnry-fps .mf-panel button:not(:disabled, .mf-start, .mf-again, [aria-pressed="true"], .mf-exit, .mf-protocol-sharebtn):hover { background: #ffffff16; }
midnry-fps .mf-panel :is(.mf-start, .mf-again, button[aria-pressed="true"]) {
  background: var(--mf-accent);
  border-color: var(--mf-accent);
  color: var(--mf-accent-ink);
}
midnry-fps .mf-panel .mf-exit { background: transparent; border: 1px solid #ff958a88; color: #ffc4bc; }
midnry-fps .mf-panel .mf-protocol-sharebtn { background: transparent; border: 1px solid var(--mf-accent); color: var(--mf-accent); }
midnry-fps .mf-panel .mf-protocol-sharewa { background: transparent; border: 1px solid #5ccf7f; color: #a8efbd !important; }
/* Device check: a short label with a status dot. */
midnry-fps [data-state="warn"]::after, midnry-fps [data-state="ready"]::after {
  content: ""; display: inline-block; width: 8px; height: 8px; margin-left: 7px; border-radius: 50%;
  background: var(--mf-accent); vertical-align: 1px;
}
midnry-fps [data-state="ready"]::after { background: var(--mf-good); }
/* Visible only to screen readers: a running description of the round. */
midnry-fps .mf-accessstatus {
  position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}

/* Locker, settings and other full dialogs share the panel's surfaces. */
midnry-fps :is(.mf-locker, .mf-settings) { background: #141d1b !important; color: var(--mf-text) !important; border: 1px solid var(--mf-line-strong) !important; }
midnry-fps :is(.mf-lockerhead, .mf-settingshead) { background: var(--mf-surface-2) !important; border-bottom: 1px solid var(--mf-line); }
midnry-fps :is(.mf-lockerhead, .mf-settingshead) :is(b, h2) { font: 700 20px var(--mf-display); letter-spacing: 0.06em; text-transform: uppercase; }
midnry-fps .mf-lockerhead button { background: var(--mf-accent) !important; color: var(--mf-accent-ink) !important; border-color: var(--mf-accent) !important; }
midnry-fps .mf-locker h3 { font: 700 18px var(--mf-display); letter-spacing: 0.04em; text-transform: uppercase; color: var(--mf-accent); }
midnry-fps .mf-locker progress { accent-color: var(--mf-accent) !important; }

/* In-game alert banner: bigger, and coloured by how urgent it is. */
midnry-fps .mf-protocol-urgent {
  padding: 9px 16px !important; border-radius: 12px !important;
  width: max-content; max-width: calc(100% - 32px);
  font: 700 17px/1.2 var(--mf-display) !important; letter-spacing: 0.04em;
  background: #3a2c12f0 !important; border: 1px solid #ffc85799 !important; color: #ffe6a8 !important;
  box-shadow: 0 6px 20px #0007;
}
midnry-fps .mf-protocol-urgent[data-level="danger"] { background: #4a1714f2 !important; border-color: #ff958a !important; color: #ffd9d4 !important; animation: mf-urgent-pulse 1.2s ease-in-out infinite; }
midnry-fps .mf-protocol-urgent[data-level="info"] { background: #13262bf0 !important; border-color: #7fd3ff88 !important; color: #d6f1ff !important; }
@keyframes mf-urgent-pulse { 50% { box-shadow: 0 0 0 4px #ff958a33, 0 6px 20px #0007; } }
@media (prefers-reduced-motion: reduce) { midnry-fps .mf-protocol-urgent { animation: none !important; } }

/* Dialogs: the main action uses the same yellow as the menu. */
midnry-fps .mf-protocol-brief .mf-protocol-begin { background: var(--mf-accent) !important; color: var(--mf-accent-ink) !important; border-color: var(--mf-accent) !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 17px; }
midnry-fps .mf-protocol-briefrole { font-family: var(--mf-display) !important; font-weight: 700 !important; font-size: 48px !important; letter-spacing: 0.02em; }

/* Debrief: after a round the panel shows only the results until "Main menu". */
midnry-fps .mf-panel.mf-debrief > :not(.mf-results) { display: none !important; }
midnry-fps .mf-panel:not(.mf-debrief) > .mf-results { display: none !important; }
midnry-fps .mf-results { display: flex !important; flex-direction: column; gap: 10px; padding: 18px !important; border-radius: 16px !important; }
midnry-fps .mf-results[hidden] { display: none !important; }
midnry-fps .mf-results > * { margin: 0 !important; }
midnry-fps .mf-results > h2 { order: 0; font-size: clamp(40px, 9vw, 56px) !important; line-height: 0.95; font-weight: 700; text-transform: uppercase; color: var(--mf-good); }
midnry-fps .mf-results.mf-lost > h2 { color: var(--mf-bad); }
midnry-fps .mf-results .mf-protocol-results { display: contents; }
midnry-fps .mf-results .mf-protocol-results > * { margin: 0 !important; }
midnry-fps .mf-results .mf-protocol-results > p + p { margin-top: -4px !important; }
midnry-fps .mf-protocol-sharerow { align-items: stretch; }
midnry-fps .mf-protocol-sharerow > * { height: 48px; min-height: 48px !important; margin: 0 !important; padding: 0 8px !important; box-sizing: border-box; white-space: nowrap; font: 700 15px var(--mf-display) !important; letter-spacing: 0.04em !important; text-transform: uppercase; }
midnry-fps .mf-results .mf-protocol-results > h2 { order: 1; font-size: 22px !important; text-transform: uppercase; color: var(--mf-text); }
midnry-fps .mf-results .mf-protocol-results > p { order: 2; font-size: 15px !important; line-height: 1.5; color: var(--mf-muted); }
midnry-fps .mf-results .mf-resultstats { order: 3; }
midnry-fps .mf-results .mf-resultstats small { font-size: 13px !important; color: var(--mf-muted); }
midnry-fps .mf-results .mf-resultstats strong { font-family: var(--mf-display); font-size: 30px !important; }
midnry-fps .mf-results .mf-earned { order: 4; font-size: 15px !important; color: var(--mf-accent); }
midnry-fps .mf-results .mf-protocol-awards { order: 5; }
midnry-fps .mf-results .mf-protocol-share { order: 6; }
midnry-fps .mf-results .mf-again { order: 7; min-height: 56px; font-size: 22px !important; }
midnry-fps .mf-results .mf-againnote { order: 8; font-size: 14px !important; color: var(--mf-muted); }
midnry-fps .mf-results .mf-protocol-results > ul { order: 9; font-size: 14px !important; line-height: 1.8; list-style: none; padding: 0 !important; }
@media (min-width: 640px) { midnry-fps .mf-results .mf-protocol-results > ul { columns: 2; } }
midnry-fps .mf-results .mf-protocol-timeline { order: 10; font-size: 14px; }
midnry-fps .mf-results .mf-tomenu { order: 11; min-height: 48px; }
`;

export class OutpostTheme {
  constructor(g) {
    this.style = document.createElement("style");
    this.style.dataset.outpostTheme = "";
    this.style.textContent = CSS;
    // Appended last, after every module's own stylesheet.
    g.shell.append(this.style);
  }
  dispose() {
    this.style.remove();
  }
}
