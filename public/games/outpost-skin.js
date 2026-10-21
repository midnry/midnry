/** One look for every Outpost Zero dialog and overlay, matching the home
 * screen: near-black glass panels with thin borders and squared corners,
 * condensed uppercase headings, ghost buttons with one amber primary action,
 * 44pt touch targets and visible keyboard focus. Styling only; no behaviour.
 * Loaded after every other module so it is the last word on shared surfaces. */
const DIALOGS =
  "dialog:is(.mf-protocol-dialog, .mf-book, .mf-locker, .mf-confirm, .mf-practice-chooser, .mf-compat-report, .mf-weaponinspect)";
const PRIMARY =
  ":is(.mf-protocol-begin, .mf-again, .mf-compat-recommend, .mf-task-stop, .mf-task-gauge button, .mf-compat-apply, .mf-protocol-arm, .mf-codeform-submit, .mf-protocol-codeform button[type='submit'], .mf-protocol-meeting form button, .mf-lockerhead button)";

const CSS = `
/* Panels */
midnry-fps ${DIALOGS} {
  background: #0a0e0d !important; color: #e6ece7 !important;
  border: 1px solid #ffffff26 !important; border-radius: 4px !important;
  box-shadow: 0 30px 90px #000d !important; font-family: var(--mf-body);
}
midnry-fps ${DIALOGS}::backdrop { background: #020403b8 !important; backdrop-filter: blur(4px); }
midnry-fps ${DIALOGS} :is(h2) { margin: 0 0 6px !important; font: 700 28px/1.05 var(--mf-display) !important; letter-spacing: 0.04em !important; text-transform: uppercase; color: #f1f4ef !important; }
midnry-fps ${DIALOGS} :is(h3, h4, summary) { font-family: var(--mf-display) !important; letter-spacing: 0.1em !important; text-transform: uppercase; }
midnry-fps ${DIALOGS} h3 { margin: 18px 0 10px !important; padding-bottom: 8px; border-bottom: 1px solid #ffffff17; font-size: 15px !important; font-weight: 600 !important; color: #aeb9b2 !important; }
midnry-fps ${DIALOGS} p { line-height: 1.5; }
midnry-fps .mf-protocol-dialoghead { display: flex !important; align-items: center; justify-content: space-between; gap: 16px; margin: -2px 0 12px !important; padding-bottom: 12px; border-bottom: 1px solid #ffffff17; }
midnry-fps .mf-protocol-dialoghead h2 { margin: 0 !important; }
midnry-fps .mf-protocol-kicker { font: 600 13px var(--mf-display) !important; letter-spacing: 0.22em !important; text-transform: uppercase; color: var(--mf-accent) !important; }

/* Buttons: ghost by default, one amber primary. */
midnry-fps ${DIALOGS} button:not(.mf-task-chip, .mf-task-keys button, .mf-task-wires button, [role="tab"]),
midnry-fps :is(.mf-spectator, .mf-protocol-flightpad, .mf-protocol-tactics, .mf-lesson) button,
midnry-fps .mf-panel.mf-debrief button {
  min-height: 44px; border-radius: 3px !important; border: 1px solid #ffffff38 !important;
  background: #ffffff0a !important; color: #eef2ee !important; box-shadow: none !important;
  font: 600 15px var(--mf-display) !important; letter-spacing: 0.06em !important; text-transform: uppercase;
}
midnry-fps ${DIALOGS} button:not(:disabled):hover, midnry-fps :is(.mf-spectator, .mf-protocol-flightpad, .mf-protocol-tactics, .mf-lesson) button:not(:disabled):hover { background: #ffffff16 !important; border-color: #ffffff5c !important; }
midnry-fps ${DIALOGS} button:disabled { opacity: 0.45; }
midnry-fps ${DIALOGS} ${PRIMARY}, midnry-fps ${PRIMARY}, midnry-fps .mf-panel.mf-debrief .mf-again {
  background: var(--mf-accent) !important; border-color: var(--mf-accent) !important; color: var(--mf-accent-ink) !important; font-weight: 700 !important;
}
midnry-fps ${DIALOGS} ${PRIMARY}:not(:disabled):hover { filter: brightness(1.06); background: var(--mf-accent) !important; }
/* Leaving a round is destructive: red, as Apple's guidelines ask. */
midnry-fps ${DIALOGS} button.mf-confirmapply.mf-confirmapply { background: #ff5a4a24 !important; border-color: #ff7b6b !important; color: #ffd2cc !important; }
midnry-fps ${DIALOGS} button.mf-confirmapply.mf-confirmapply:not(:disabled):hover { background: #ff5a4a3d !important; }
midnry-fps :is(${DIALOGS}, .mf-spectator, .mf-protocol-flightpad, .mf-protocol-tactics, .mf-lesson, .mf-panel.mf-debrief) :is(button, a, input, select, summary, [tabindex]):focus-visible { outline: 2px solid var(--mf-accent) !important; outline-offset: 2px !important; box-shadow: none !important; }
midnry-fps ${DIALOGS} :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea) {
  min-height: 44px; border-radius: 3px !important; border: 1px solid #ffffff33 !important; background: #121816 !important; color: #eef2ee !important; font: 400 16px var(--mf-body) !important; padding: 0 12px !important;
}
midnry-fps ${DIALOGS} :is(input[type="range"], input[type="checkbox"], progress) { accent-color: var(--mf-accent); }
midnry-fps ${DIALOGS} details { border: 1px solid #ffffff1a !important; border-radius: 3px !important; background: #ffffff05 !important; }
midnry-fps ${DIALOGS} details > summary { padding: 12px 14px; min-height: 44px; box-sizing: border-box; cursor: pointer; font-size: 15px; color: #e6ece7; }

/* Briefing: the role in its side's colour, orders as clean rows. */
midnry-fps .mf-protocol-brief { width: min(560px, calc(100vw - 32px)) !important; padding: 26px 28px !important; }
midnry-fps .mf-protocol-brief h2 { font-size: 16px !important; letter-spacing: 0.16em !important; color: #aeb9b2 !important; margin-top: 6px !important; }
midnry-fps .mf-protocol-briefrole { margin: 2px 0 10px; font: 800 64px/0.95 var(--mf-display) !important; letter-spacing: 0.01em; color: #8fe3a8; }
midnry-fps .mf-protocol-brief[data-role="infiltrator"] .mf-protocol-briefrole { color: #ff8577; }
midnry-fps .mf-protocol-brief[data-role="infiltrator"] { border-top: 3px solid #ff5a4a !important; }
midnry-fps .mf-protocol-brief[data-role="operator"] { border-top: 3px solid #55d68f !important; }
midnry-fps .mf-protocol-briefmatch { display: grid; gap: 8px; margin: 14px 0 18px !important; padding: 0 !important; list-style: none; }
midnry-fps .mf-protocol-briefmatch li { display: grid; gap: 2px; padding: 10px 14px !important; border: 1px solid #ffffff1a !important; border-left: 3px solid var(--mf-accent) !important; border-radius: 3px !important; background: #ffffff06 !important; color: #c9d2cc !important; font-size: 14px; }
midnry-fps .mf-protocol-briefmatch li b { font: 600 15px var(--mf-display) !important; letter-spacing: 0.08em; text-transform: uppercase; color: #f1f4ef !important; }
midnry-fps .mf-protocol-begin { width: 100%; min-height: 54px !important; font-size: 19px !important; }

/* Meeting: chat, quick replies and vote cards. */
midnry-fps .mf-protocol-meeting { width: min(760px, calc(100vw - 32px)) !important; }
midnry-fps .mf-protocol-meeting :is(.mf-protocol-messages, .mf-protocol-chat, ol, ul) { border-radius: 3px !important; }
midnry-fps .mf-protocol-quicktalk button { min-height: 44px !important; font-size: 14px !important; }
midnry-fps .mf-shell:has(.mf-modal:not([hidden])) .mf-protocol-infoopen { display: none !important; }
midnry-fps .mf-protocol-meeting [data-vote], midnry-fps .mf-protocol-meeting .mf-protocol-votes button { justify-content: flex-start; text-align: left; text-transform: none !important; font: 600 16px var(--mf-display) !important; letter-spacing: 0.02em !important; }
midnry-fps .mf-protocol-meeting [aria-pressed="true"] { border-color: var(--mf-accent) !important; box-shadow: inset 4px 0 0 var(--mf-accent) !important; }

/* Info panel and case board. */
midnry-fps .mf-protocol-info { width: min(640px, calc(100vw - 32px)) !important; }
midnry-fps .mf-protocol-info :is(section, .mf-protocol-role, .mf-protocol-missionstatus, .mf-protocol-cargo) { border-radius: 3px !important; }
midnry-fps .mf-protocol-task { border-radius: 3px !important; text-transform: none !important; text-align: left; font: 500 15px var(--mf-body) !important; letter-spacing: 0 !important; }
midnry-fps .mf-protocol-task[aria-pressed="true"] { border-color: var(--mf-accent) !important; box-shadow: inset 4px 0 0 var(--mf-accent) !important; }

midnry-fps .mf-protocol-info :is(.mf-protocol-cargo, .mf-protocol-missionstatus, .mf-protocol-role, .mf-navhint, .mf-protocol-focusnext) { background: #ffffff06 !important; border: 1px solid #ffffff1a !important; color: #dfe5e0 !important; }

/* Skill tests at cabinets. */
midnry-fps .mf-mission-task { width: min(480px, calc(100vw - 32px)) !important; }
midnry-fps .mf-task-step { font: 600 13px var(--mf-display); letter-spacing: 0.12em; text-transform: uppercase; color: #aeb9b2; }
midnry-fps .mf-task-instruction { font-size: 16px !important; color: #e6ece7 !important; }
midnry-fps .mf-task-needlebar { border-radius: 3px !important; background: #121816 !important; border: 1px solid #ffffff2b !important; }
midnry-fps .mf-task-zone { background: #3fbf7f !important; }
midnry-fps .mf-task-needle { background: #fff !important; box-shadow: 0 0 8px #fff8; }
midnry-fps :is(.mf-task-chip, .mf-task-keys button, .mf-task-wires button) { border-radius: 3px !important; font-family: var(--mf-display) !important; min-height: 44px; }
midnry-fps .mf-mission-task progress { width: 100%; height: 4px; }

/* Results: the debrief over the key art. */
midnry-fps .mf-modal:has(> .mf-panel.mf-debrief) { background: linear-gradient(90deg, #060908f2, #060908b0), url("menu/hero.webp") center / cover no-repeat, #0a0e0d !important; }
midnry-fps .mf-panel.mf-debrief { width: min(600px, calc(100% - 32px)) !important; padding: 0 !important; border: 0 !important; background: none !important; box-shadow: none !important; }
midnry-fps .mf-panel.mf-debrief .mf-results { border-radius: 4px !important; background: #0a0e0de8 !important; border: 1px solid #ffffff26 !important; padding: 26px 28px !important; }
midnry-fps .mf-panel.mf-debrief .mf-results > h2 { font-size: clamp(48px, 10vw, 72px) !important; letter-spacing: 0.01em; }
midnry-fps .mf-panel.mf-debrief :is(.mf-protocol-share, .mf-protocol-award, .mf-protocol-dailyscore, .mf-protocol-timeline) { border-radius: 3px !important; }
midnry-fps .mf-panel.mf-debrief .mf-resultstats { padding: 12px 0; border-top: 1px solid #ffffff17; border-bottom: 1px solid #ffffff17; }
midnry-fps .mf-panel.mf-debrief .mf-tomenu { background: none !important; border-color: #ffffff26 !important; }

/* Spectating, flight, Last Stand and other overlays. */
midnry-fps .mf-spectator { border-radius: 4px !important; background: #070b0ad9 !important; border: 1px solid #ffffff2b !important; backdrop-filter: blur(6px); font-family: var(--mf-display); }
midnry-fps .mf-spectator b { font: 600 18px var(--mf-display) !important; letter-spacing: 0.04em; }
midnry-fps .mf-spectator-support { background: var(--mf-accent) !important; color: var(--mf-accent-ink) !important; border-color: var(--mf-accent) !important; }
midnry-fps .mf-death { font: 700 clamp(40px, 8vw, 72px) var(--mf-display) !important; letter-spacing: 0.24em !important; color: #ffd2cc !important; text-shadow: 0 4px 30px #ff5a4a66 !important; }
midnry-fps :is(.mf-protocol-flight, .mf-protocol-preparation, .mf-protocol-verdict, .mf-protocol-killconfirmation, .mf-protocol-combatstats, .mf-protocol-tactics, .mf-lesson, .mf-countdown) {
  border-radius: 4px !important; background: #070b0ae0 !important; border: 1px solid #ffffff2b !important; color: #e6ece7 !important; backdrop-filter: blur(6px); font-family: var(--mf-body);
}
midnry-fps :is(.mf-protocol-flight, .mf-protocol-preparation, .mf-protocol-tactics, .mf-lesson) :is(h2, h3, b, small:first-child) { font-family: var(--mf-display) !important; letter-spacing: 0.06em; }
midnry-fps .mf-protocol-preparation h2 { font: 800 44px var(--mf-display) !important; text-transform: uppercase; }
midnry-fps .mf-protocol-verdict { font: 600 20px var(--mf-display) !important; letter-spacing: 0.04em; }
midnry-fps .mf-protocol-flight meter { accent-color: var(--mf-accent); }
midnry-fps .mf-protocol-flightpad button { min-width: 56px; min-height: 56px !important; }
midnry-fps .mf-countdown { font: 800 64px var(--mf-display) !important; }

/* Loading screen. */
.mf-loading :is(button):focus-visible { outline: 2px solid #ffc857 !important; outline-offset: 2px; }
.mf-loading .mf-loadbrand { letter-spacing: 0.32em !important; padding-left: 12px; border-left: 2px solid #ffc857; }
.mf-loading progress { accent-color: #ffc857; }
.mf-loading progress::-webkit-progress-value { background: #ffc857 !important; }
.mf-loading progress::-moz-progress-bar { background: #ffc857 !important; }
.mf-loading .mf-loadcategory { color: #ffc857 !important; }

@media (prefers-reduced-motion: reduce) { midnry-fps :is(${DIALOGS}, .mf-spectator) * { transition: none !important; animation: none !important; } }
@media (max-width: 520px) {
  midnry-fps ${DIALOGS} { padding: 18px 16px !important; }
  midnry-fps .mf-protocol-briefrole { font-size: 48px !important; }
  midnry-fps ${DIALOGS} h2 { font-size: 24px !important; }
}
`;

export class OutpostSkin {
  constructor(g) {
    this.style = document.createElement("style");
    this.style.dataset.outpostSkin = "";
    this.style.textContent = CSS;
    g.shell.append(this.style);
    // The loading screen sits outside the game shell.
    this.pageStyle = document.createElement("style");
    this.pageStyle.textContent = CSS.slice(CSS.indexOf("/* Loading screen. */"), CSS.indexOf("@media (prefers-reduced-motion"));
    document.head.append(this.pageStyle);
  }
  dispose() {
    this.style.remove();
    this.pageStyle.remove();
  }
}
