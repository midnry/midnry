/** The home screen: cinematic key art, the existing menu controls in a left
 * column, a profile / challenges / daily-case column on the right and mode
 * cards along the bottom. It only arranges and mirrors existing controls;
 * every action still runs through the original buttons and settings. */
import { icon } from "./outpost-icons.js";
import { levelOf } from "./outpost-progression.js";
import { readDaily } from "./outpost-protocol-ui.js";
import { fetchBoard, cachedBoard } from "./outpost-daily-board.js";
import { dailyKey, shiftChoice } from "./outpost-shifts.js";
import { modifierChoice } from "./outpost-variety.js";
import { SERIES_KINDS, seriesKindOf } from "./outpost-series.js";
import { characterOf } from "./outpost-characters.js";
import { networkQuality } from "./outpost-netmeter.js";

// Step 1 picks the game; step 2 shows only that game's ways to play.
const GAMES = [
  { id: "protocol", title: "Blackout Protocol", sub: "Rescue mission · find the infiltrator", art: "card-lifeline.webp" },
  { id: "signal", title: "Last Signal", sub: "Battle royale · 8 fighters", art: "card-signal.webp" },
];
const VARIANTS = {
  protocol: [
    { id: "lifeline", title: "Lifeline Run", sub: "Full shift · 8 players" },
    { id: "quick", title: "Quick shift", sub: "5 players · 4 min" },
    { id: "night", title: "Night shift", sub: "After dark" },
    { id: "daily", title: "Daily case", sub: "Same for everyone" },
  ],
  signal: Object.values(SERIES_KINDS).map(({ id, title, sub }) => ({ id, title, sub })),
};
const MODES = [...VARIANTS.protocol, ...VARIANTS.signal];

const CSS = `
midnry-fps .mf-playlists[data-unchosen] :is(#mf-step2, .mf-variants, .mf-playnext) { display: none !important; }
midnry-fps .mf-gamepick.mf-ask { animation: mf-ask 0.6s ease-in-out 2; border-radius: 12px; }
@keyframes mf-ask { 50% { box-shadow: 0 0 0 3px var(--mf-accent); } }
@media (prefers-reduced-motion: reduce) { midnry-fps .mf-gamepick.mf-ask { animation: none; box-shadow: 0 0 0 3px var(--mf-accent); } }
midnry-fps .mf-modal.mf-home { display: block !important; padding: 0 !important; overflow: hidden; background: #070a09 !important; }
midnry-fps .mf-hero { position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, #060908 0%, #060908f0 24%, #06090800 52%),
    linear-gradient(0deg, #050706f5 0%, #05070600 34%),
    linear-gradient(180deg, #050706d0 0%, #05070600 16%),
    url("menu/hero.webp") right center / auto 100% no-repeat, #0b0e0d; }
midnry-fps .mf-modal:not(.mf-home) :is(.mf-hero, .mf-hometop, .mf-homeside, .mf-playlists, .mf-homeactions, .mf-logosub, .mf-homefoot, .mf-playsummary) { display: none !important; }
midnry-fps .mf-shell:has(.mf-modal.mf-home:not([hidden])) :is(.mf-top, .mf-objective) { visibility: hidden; }

/* Top bar */
midnry-fps .mf-hometop { position: absolute; top: 0; left: 0; right: 0; height: 64px; display: flex; align-items: center; gap: 28px; padding: 0 32px; border-bottom: 1px solid #ffffff12; background: linear-gradient(180deg, #050706e8, #05070600); z-index: 2; }
midnry-fps .mf-hometop .mf-wordmark { font: 600 15px var(--mf-display); letter-spacing: 0.32em; color: #cfd8d2; padding-left: 12px; border-left: 2px solid var(--mf-accent); white-space: nowrap; }
midnry-fps .mf-hometop nav { display: flex; gap: 6px; margin-right: auto; }
midnry-fps .mf-hometop nav button { all: unset; cursor: pointer; position: relative; padding: 22px 12px; font: 600 15px var(--mf-display); letter-spacing: 0.08em; text-transform: uppercase; color: #b9c4bd; }
midnry-fps .mf-hometop nav button:hover, midnry-fps .mf-hometop nav button:focus-visible { color: #fff; }
midnry-fps .mf-hometop nav button[aria-current="page"] { color: var(--mf-accent); }
midnry-fps .mf-hometop nav button[aria-current="page"]::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: 12px; height: 2px; background: var(--mf-accent); }
midnry-fps .mf-profilechip { display: flex; align-items: center; gap: 10px; padding: 6px 14px 6px 6px; border: 1px solid #ffffff1f; border-radius: 4px; background: #0b100ecc; color: #e9efe9; }
midnry-fps .mf-avatar { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 3px; background: linear-gradient(160deg, #3a4a3c, #18201b); color: var(--mf-accent); }
midnry-fps .mf-avatar .mf-ico { width: 24px; height: 24px; }
midnry-fps .mf-profilechip b { display: block; font: 700 14px var(--mf-display); letter-spacing: 0.06em; text-transform: uppercase; }
midnry-fps .mf-profilechip small { display: flex; align-items: center; gap: 8px; font: 600 12px var(--mf-display); color: #aeb9b2; }
midnry-fps .mf-xpbar { display: block; width: 84px; height: 3px; background: #ffffff1f; }
midnry-fps .mf-xpbar i { display: block; height: 100%; background: var(--mf-accent); }

/* Left column: the original menu panel */
midnry-fps .mf-modal.mf-home > .mf-panel { position: absolute !important; left: 40px; top: 84px; bottom: 24px; width: 360px !important; max-height: none !important; margin: 0 !important; padding: 0 4px 0 0 !important; overflow: auto; background: none !important; border: 0 !important; box-shadow: none !important; display: flex !important; flex-direction: column; gap: 10px; z-index: 1; scrollbar-width: thin; }
midnry-fps .mf-modal.mf-home > .mf-panel > :is(.mf-eyebrow, .mf-copy, .mf-learn, .mf-exit, .mf-controlshelp, .mf-kit, .mf-kitnotes) { display: none !important; }
midnry-fps .mf-modal.mf-home .mf-panel h1 { margin: 0 !important; font: 800 64px/0.86 var(--mf-display) !important; letter-spacing: -0.01em !important; text-transform: uppercase; color: #f1f4ef; text-shadow: 0 4px 24px #0009; }
midnry-fps .mf-modal.mf-home .mf-panel h1 em { color: var(--mf-accent) !important; }
midnry-fps .mf-logosub { margin: 4px 0 10px; font: 600 14px var(--mf-display); letter-spacing: 0.34em; text-transform: uppercase; color: #d9e0da; }
midnry-fps .mf-logosub span { color: var(--mf-accent); }
midnry-fps .mf-modal.mf-home[data-mode="signal"] label:has(.mf-protocol-preference) { display: none !important; }
midnry-fps .mf-modal.mf-home[data-rookie] label:has(.mf-protocol-preference),
midnry-fps .mf-modal.mf-home[data-rookie] .mf-challenges { display: none !important; }
midnry-fps .mf-newhere { display: grid; gap: 6px; padding: 12px 14px; border: 1px solid var(--mf-accent); border-radius: 3px; background: #1a1305d9; color: #f1f4ef; }
midnry-fps .mf-newhere[hidden] { display: none !important; }
midnry-fps .mf-modal:not(.mf-home) .mf-newhere { display: none !important; }
midnry-fps .mf-newhere b { font: 700 16px var(--mf-display); letter-spacing: 0.06em; text-transform: uppercase; color: var(--mf-accent); }
midnry-fps .mf-newhere span { font-size: 14px; line-height: 1.4; color: #d9e0da; }
midnry-fps .mf-newhere button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 8px; justify-self: start; min-height: 44px; padding: 0 16px; border-radius: 3px; background: var(--mf-accent); color: #1a1406; font: 700 15px var(--mf-display); letter-spacing: 0.06em; text-transform: uppercase; }
midnry-fps .mf-newhere button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
midnry-fps .mf-newhere .mf-ico { width: 18px; height: 18px; }
midnry-fps .mf-systemcheck { display: flex; align-items: center; gap: 8px; min-height: 44px; margin-top: 12px; }
midnry-fps .mf-systemcheck .mf-ico { width: 18px; height: 18px; }
/* Desktop has the top menu bar; the left column copies are only for phones. */
@media (min-width: 1000px) and (min-height: 600px) { midnry-fps .mf-modal.mf-home .mf-homeactions { display: none !important; } }
/* Last Signal on touch: lift the health box clear of the movement stick. */
@media (pointer: coarse) { midnry-fps .mf-shell:not(.mf-protocol) .mf-bottom .mf-stat:first-child { transform: translateY(-128px); } }
midnry-fps .mf-modal.mf-home .mf-modes { display: grid !important; grid-template-columns: 1fr !important; gap: 8px !important; margin: 0 !important; }
midnry-fps .mf-modal.mf-home .mf-modes button { position: relative; display: grid !important; grid-template-columns: 34px 1fr 18px; align-items: center; column-gap: 10px; min-height: 56px; padding: 8px 14px !important; text-align: left !important; border-radius: 3px !important; border: 1px solid #ffffff24 !important; background: #0c1210d9 !important; color: #eef2ee !important; font: 700 19px/1.05 var(--mf-display) !important; letter-spacing: 0.04em !important; text-transform: uppercase; box-shadow: none !important; }
midnry-fps .mf-modal.mf-home .mf-modes button small { grid-column: 2; font: 400 13px var(--mf-body) !important; letter-spacing: 0 !important; text-transform: none !important; color: #b9c4bd !important; }
midnry-fps .mf-modal.mf-home .mf-modes button .mf-ico { grid-row: 1 / span 2; width: 26px; height: 26px; color: #d6ddd7; }
midnry-fps .mf-modal.mf-home .mf-modes button .mf-chev { grid-column: 3; grid-row: 1 / span 2; width: 18px; height: 18px; }
midnry-fps .mf-modal.mf-home .mf-modes button[aria-pressed="true"] { background: linear-gradient(90deg, #ffc857, #c99a33) !important; border-color: #ffd98a !important; color: #1b1405 !important; }
midnry-fps .mf-modal.mf-home .mf-modes button[aria-pressed="true"] :is(small, .mf-ico) { color: #2a1f08 !important; }
midnry-fps .mf-modal.mf-home .mf-protocol-menu { display: block !important; padding: 0 !important; margin: 0 !important; border: 0 !important; background: none !important; }
midnry-fps .mf-modal.mf-home .mf-protocol-menu > :is(.mf-protocol-shiftpick, .mf-protocol-dailynote, button) { display: none !important; }
midnry-fps .mf-modal.mf-home .mf-protocol-menu label { display: grid; gap: 6px; font: 600 13px var(--mf-display); letter-spacing: 0.14em; text-transform: uppercase; color: #aeb9b2; }
midnry-fps .mf-modal.mf-home .mf-protocol-menu select { min-height: 44px; border-radius: 3px; border: 1px solid #ffffff24; background: #0c1210e6; color: #eef2ee; font: 400 15px var(--mf-body); }
midnry-fps .mf-modal.mf-home .mf-start { min-height: 58px !important; margin: 4px 0 0 !important; border-radius: 3px !important; border: 0 !important; background: var(--mf-accent) !important; color: var(--mf-accent-ink) !important; font: 800 24px var(--mf-display) !important; letter-spacing: 0.04em !important; box-shadow: 0 10px 30px #ffc8572e !important; }
midnry-fps .mf-modal.mf-home .mf-start:hover { filter: brightness(1.06); }
midnry-fps .mf-homeactions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
midnry-fps .mf-homeactions button, midnry-fps .mf-homefoot button { display: flex !important; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px !important; border-radius: 3px !important; border: 1px solid #ffffff24 !important; background: #0c1210d9 !important; color: #e3e9e4 !important; font: 600 15px var(--mf-display) !important; letter-spacing: 0.08em !important; text-transform: uppercase; box-shadow: none !important; }
midnry-fps .mf-homeactions button:hover, midnry-fps .mf-homefoot button:hover { border-color: #ffffff55 !important; background: #121a17 !important; }
midnry-fps .mf-homeactions .mf-ico, midnry-fps .mf-homefoot .mf-ico { width: 18px; height: 18px; color: #c4cdc7; }
midnry-fps .mf-homefoot { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; }
midnry-fps .mf-homefoot button { min-height: 44px; font-size: 13px !important; background: none !important; border-color: #ffffff14 !important; color: #aab5ae !important; }
midnry-fps .mf-homefoot .mf-homeexit { color: #ffb4aa !important; }
midnry-fps .mf-modal.mf-lobby.mf-friends .mf-challenges { display: none !important; }
midnry-fps .mf-modal.mf-home .mf-network { margin: 0 !important; border-radius: 3px !important; background: #0c1210e6 !important; border: 1px solid #ffffff24 !important; }

/* Right column */
midnry-fps .mf-homeside { position: absolute; right: 32px; top: 84px; width: 340px; display: flex; flex-direction: column; gap: 12px; z-index: 1; }
midnry-fps .mf-card { position: relative; border: 1px solid #ffffff1f; border-radius: 4px; background: #0a0f0dd9; backdrop-filter: blur(6px); color: #e9efe9; }
midnry-fps .mf-card h3 { margin: 0; font: 600 14px var(--mf-display); letter-spacing: 0.14em; text-transform: uppercase; color: #aeb9b2; }
midnry-fps .mf-opcard { padding: 16px 18px 18px; overflow: hidden; }
midnry-fps .mf-ophead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #ffffff17; }
midnry-fps .mf-opname { display: block; margin: 6px 0 2px; font: 800 40px/1 var(--mf-display); text-transform: uppercase; letter-spacing: 0.02em; color: #f4f6f2; }
midnry-fps .mf-optag { margin: 0; font: 600 18px var(--mf-display); letter-spacing: 0.02em; text-transform: capitalize; color: #e3e9e4; }
midnry-fps .mf-emblem { flex: none; width: 58px; height: 58px; margin-top: 10px; fill: currentColor; fill-opacity: 0.28; stroke: #cfd6d2; stroke-width: 1.4; stroke-linejoin: round; }
midnry-fps .mf-opprog { display: grid; gap: 10px; padding-top: 14px; }
midnry-fps .mf-oplevel { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font: 700 16px var(--mf-display); letter-spacing: 0.08em; text-transform: uppercase; color: #f1f4ef; }
midnry-fps .mf-oplevel span { font-weight: 600; font-size: 14px; letter-spacing: 0.04em; color: #aeb9b2; }
midnry-fps .mf-opcard .mf-xpbar { width: 100%; height: 4px; border-radius: 2px; overflow: hidden; }
midnry-fps .mf-challenges { padding: 14px 18px; }
midnry-fps .mf-challenges header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
midnry-fps .mf-challenges header b { font: 700 15px var(--mf-display); color: var(--mf-accent); margin-left: 8px; }
midnry-fps .mf-challenges ul { margin: 0; padding: 0; list-style: none; }
midnry-fps .mf-challenges li { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid #ffffff12; font-size: 14px; color: #dfe5e0; }
midnry-fps .mf-challenges li i { width: 18px; height: 18px; border: 1px solid #ffffff55; border-radius: 2px; display: grid; place-items: center; }
midnry-fps .mf-challenges li.done i { background: #3fbf7f; border-color: #3fbf7f; }
midnry-fps .mf-challenges li.done i::after { content: ""; width: 8px; height: 4px; border: 2px solid #06140c; border-top: 0; border-right: 0; transform: translateY(-1px) rotate(-45deg); }
midnry-fps .mf-challenges li span { font: 600 13px var(--mf-display); color: #aeb9b2; }
midnry-fps .mf-challenges li.done span { color: #8fe3a8; }
midnry-fps .mf-casecard { all: unset; cursor: pointer; display: grid; grid-template-columns: 96px 1fr 18px; align-items: center; gap: 14px; padding: 10px 14px 10px 10px; border: 1px solid #7fd3ff55; border-radius: 4px; background: #0a0f0dd9; color: #e9efe9; }
midnry-fps .mf-casecard:hover, midnry-fps .mf-casecard:focus-visible { border-color: #7fd3ffaa; }
midnry-fps .mf-casecard img { width: 96px; height: 64px; object-fit: cover; border-radius: 2px; }
midnry-fps .mf-casecard small { display: block; font: 600 14px var(--mf-display); color: #e9efe9; }
midnry-fps .mf-casecard em { display: block; font-style: normal; font-size: 13px; color: #aeb9b2; }
midnry-fps .mf-casecard strong { font: 800 30px/1.1 var(--mf-display); color: var(--mf-accent); }
midnry-fps .mf-casecard strong span { font-size: 18px; color: #cfd8d2; font-weight: 600; }
midnry-fps .mf-casecard .mf-ico { width: 18px; height: 18px; }

/* Bottom: 1 · choose a game, 2 · choose how to play it */
midnry-fps .mf-playlists { position: absolute; left: 424px; right: 32px; bottom: 24px; display: grid; gap: 8px; z-index: 1; }
midnry-fps .mf-steplabel { margin: 0; font: 600 13px var(--mf-display); letter-spacing: 0.14em; text-transform: uppercase; color: #aeb9b2; }
midnry-fps .mf-steplabel b { color: var(--mf-accent); margin-right: 6px; }
midnry-fps .mf-gamepick { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
midnry-fps .mf-gamepick button { all: unset; cursor: pointer; position: relative; height: 104px; border: 1px solid #ffffff24; border-radius: 4px; overflow: hidden; background: #0b100e center / cover no-repeat; box-shadow: 0 10px 28px #0008; }
midnry-fps .mf-gamepick button::before { content: ""; position: absolute; inset: 0; background: linear-gradient(0deg, #050706f2 8%, #05070600 72%); }
midnry-fps .mf-gamepick button > span { position: absolute; left: 14px; right: 34px; bottom: 12px; }
midnry-fps .mf-gamepick b { display: block; font: 800 22px/1 var(--mf-display); letter-spacing: 0.03em; text-transform: uppercase; color: #f1f4ef; }
midnry-fps .mf-gamepick small { display: flex; align-items: center; gap: 8px; margin-top: 6px; font: 400 13px var(--mf-body); color: #c3ccc6; }
midnry-fps .mf-gamepick small::before { content: ""; flex: none; width: 16px; height: 2px; background: #ffffff66; }
midnry-fps .mf-gamepick .mf-ico { position: absolute; right: 12px; bottom: 16px; width: 18px; height: 18px; color: #e9efe9; }
midnry-fps .mf-gamepick button[aria-pressed="true"] { border: 2px solid var(--mf-accent); }
midnry-fps .mf-gamepick button[aria-pressed="true"] small::before { background: var(--mf-accent); }
midnry-fps .mf-variants { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
midnry-fps .mf-variants button { all: unset; cursor: pointer; position: relative; display: grid; gap: 3px; align-content: center; min-height: 56px; padding: 8px 12px; border: 1px solid #ffffff24; border-radius: 3px; background: #0c1210e6; color: #eef2ee; }
midnry-fps .mf-variants b { font: 700 16px/1.05 var(--mf-display); letter-spacing: 0.04em; text-transform: uppercase; }
midnry-fps .mf-variants small { font: 400 12px/1.25 var(--mf-body); color: #b9c4bd; }
midnry-fps .mf-variants button[aria-pressed="true"] { background: linear-gradient(90deg, #ffc857, #c99a33); border-color: #ffd98a; color: #1b1405; }
midnry-fps .mf-variants button[aria-pressed="true"] small { color: #2a1f08; }
midnry-fps .mf-variants button[aria-pressed="true"] b::before { content: "✓ "; }
midnry-fps :is(.mf-gamepick, .mf-variants) button:hover:not(:disabled) { border-color: #ffffff88; }
midnry-fps :is(.mf-gamepick, .mf-variants) button[aria-pressed="true"]:is(:hover, :focus-visible) { border-color: var(--mf-accent); }
midnry-fps :is(.mf-gamepick, .mf-variants) button:disabled { cursor: default; }
midnry-fps :is(.mf-gamepick, .mf-variants) button:disabled:not([aria-pressed="true"]) { filter: grayscale(0.7) brightness(0.6); }
midnry-fps .mf-variants button[data-start]::after { content: "Start here"; position: absolute; top: -9px; right: 8px; padding: 2px 6px; border-radius: 2px; background: #8fe3a8; color: #0b1a10; font: 700 10px var(--mf-display); letter-spacing: 0.08em; text-transform: uppercase; }
midnry-fps .mf-playnext { display: none; }
midnry-fps .mf-playlists[data-online] :is(.mf-gamepick button:not([aria-pressed="true"]), .mf-variants, .mf-steplabel) { display: none; }

/* Apple HIG: visible keyboard focus on every custom control, no motion when
   the system asks for less, and selection never shown by colour alone. */
midnry-fps :is(.mf-hometop nav button, .mf-playlists button, .mf-casecard, .mf-settingsnav button, .mf-homeactions button, .mf-homefoot button):focus-visible { outline: 2px solid var(--mf-accent) !important; outline-offset: 2px; }
midnry-fps .mf-gamepick button[aria-pressed="true"]::after { content: "Selected"; position: absolute; top: 10px; left: 10px; padding: 3px 8px; border-radius: 2px; background: var(--mf-accent); color: var(--mf-accent-ink); font: 700 12px var(--mf-display); letter-spacing: 0.08em; text-transform: uppercase; }
midnry-fps .mf-matchbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
midnry-fps .mf-matchbar[hidden] { display: none !important; }
midnry-fps .mf-matchbar .mf-netcheck { grid-column: 1 / -1; }
midnry-fps .mf-matchbar button { display: flex !important; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 12px !important; border-radius: 3px !important; border: 1px solid #ffffff3d !important; background: #0c1210e6 !important; color: #f1f4ef !important; font: 600 16px var(--mf-display) !important; letter-spacing: 0.08em !important; text-transform: uppercase; box-shadow: none !important; }
midnry-fps .mf-matchbar button[hidden] { display: none !important; }
midnry-fps .mf-matchbar button:only-of-type, midnry-fps .mf-matchbar button:not([hidden]):last-child:first-child { grid-column: 1 / -1; }
midnry-fps .mf-matchbar .mf-leavematch { border-color: #e0786b80 !important; color: #ffd6cf !important; }
midnry-fps .mf-matchbar .mf-ico { width: 18px; height: 18px; }
midnry-fps .mf-matchbar button:focus-visible { outline: 2px solid var(--mf-accent) !important; outline-offset: 2px; }
midnry-fps .mf-modal:not(.mf-home) .mf-matchbar { display: none !important; }
midnry-fps .mf-playsummary { margin: -2px 0 0; font: 400 14px var(--mf-body); color: #c3ccc6; text-align: center; }
midnry-fps .mf-playsummary b { color: #f1f4ef; font-weight: 600; }
@media (prefers-reduced-motion: reduce) { midnry-fps :is(.mf-modal.mf-home, .mf-settings) * { transition: none !important; animation: none !important; } }

/* Settings: a sidebar of sections and one section at a time. */
midnry-fps dialog.mf-settings.mf-tabbed { width: min(1080px, calc(100vw - 32px)) !important; max-width: none !important; height: min(720px, calc(100vh - 32px)); max-height: none !important; padding: 0 !important; border-radius: 4px !important; background: #090d0c !important; overflow: hidden; }
midnry-fps dialog.mf-settings.mf-tabbed[open] { display: grid !important; grid-template-rows: auto 1fr; }
midnry-fps .mf-settings.mf-tabbed .mf-settingshead { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px !important; background: #050807 !important; border-bottom: 1px solid #ffffff17 !important; }
midnry-fps .mf-settings.mf-tabbed .mf-settingshead h2 { margin: 0; font: 700 24px var(--mf-display) !important; letter-spacing: 0.12em !important; }
midnry-fps .mf-settings.mf-tabbed .mf-settingshead button { border-radius: 3px !important; min-width: 96px; }
midnry-fps .mf-settingsgrid { display: grid; grid-template-columns: 230px 1fr; min-height: 0; }
midnry-fps .mf-settingsnav { display: flex; flex-direction: column; gap: 2px; padding: 14px 0; border-right: 1px solid #ffffff14; background: #070a09; overflow: auto; }
midnry-fps .mf-settingsnav button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 14px; padding: 14px 22px; font: 600 17px var(--mf-display); letter-spacing: 0.04em; color: #c9d2cc; border-left: 3px solid transparent; }
midnry-fps .mf-settingsnav button .mf-ico { width: 22px; height: 22px; }
midnry-fps .mf-settingsnav button:hover, midnry-fps .mf-settingsnav button:focus-visible { background: #ffffff08; color: #fff; }
midnry-fps .mf-settingsnav button[aria-selected="true"] { color: var(--mf-accent); background: linear-gradient(90deg, #ffc8571f, #ffc85700); border-left-color: var(--mf-accent); }
midnry-fps .mf-settings.mf-tabbed .mf-settingsbody { min-height: 0; overflow: auto; padding: 8px 28px 28px !important; }
midnry-fps .mf-settings.mf-tabbed .mf-settingsbody > .mf-settab:not(.mf-on) { display: none; }
midnry-fps .mf-settab > h3 { margin: 14px 0 12px !important; padding-bottom: 10px; border-bottom: 1px solid #ffffff17; font: 700 22px var(--mf-display) !important; letter-spacing: 0.1em !important; text-transform: uppercase; color: #f1f4ef !important; }
midnry-fps .mf-settab :is(p) { color: #aeb9b2; }
midnry-fps .mf-settab :is(select, input[type="number"], input:not([type])) { border-radius: 3px !important; background: #0f1513 !important; border: 1px solid #ffffff2b !important; color: #eef2ee !important; }
midnry-fps .mf-settab input[type="range"] { accent-color: var(--mf-accent); }
midnry-fps .mf-settab input[type="checkbox"] { accent-color: var(--mf-accent); width: 18px; height: 18px; }
midnry-fps .mf-settab .mf-retention { border: 0 !important; background: none !important; padding: 0 !important; }
midnry-fps .mf-settab .mf-retention > summary { display: none; }
midnry-fps .mf-settab .mf-retention label { position: static !important; display: flex !important; flex-direction: row !important; align-items: center; justify-content: space-between; gap: 16px; min-height: 54px; margin: 0 !important; padding: 6px 0; border-bottom: 1px solid #ffffff12; font: 400 16px var(--mf-body); color: #e3e9e4; }
midnry-fps .mf-settab .mf-retention label > :is(input, select) { position: static !important; flex: none; margin: 0 !important; transform: none !important; }
midnry-fps .mf-settab .mf-retention label > input[type="checkbox"] { order: 2; }
midnry-fps .mf-settab .mf-retention label > :is(input:not([type="checkbox"]):not([type="range"]), select) { width: min(260px, 55%); min-height: 40px; padding: 0 10px; }
midnry-fps .mf-settab .mf-retention label > input[type="range"] { width: min(260px, 55%); }
midnry-fps .mf-settab .mf-retention > :is(p, button) { margin: 12px 0 0; }
@media (max-width: 760px) {
  midnry-fps .mf-settingsgrid { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  midnry-fps .mf-settingsnav { flex-direction: row; padding: 0; border-right: 0; border-bottom: 1px solid #ffffff14; overflow-x: auto; }
  midnry-fps .mf-settingsnav button { flex: none; padding: 12px 14px; border-left: 0; border-bottom: 3px solid transparent; white-space: nowrap; font-size: 15px; }
  midnry-fps .mf-settingsnav button[aria-selected="true"] { border-bottom-color: var(--mf-accent); background: none; }
  midnry-fps .mf-settingsnav button .mf-ico { display: none; }
  midnry-fps .mf-settings.mf-tabbed .mf-settingsbody { padding: 4px 16px 20px !important; }
}

/* Lobby: the 3D operator replaces the photo; panels sit around it. */
midnry-fps .mf-modal.mf-home.mf-lobby { background:
  linear-gradient(90deg, #050706e6 0%, #050706a8 22%, #05070600 36%, #05070600 66%, #050706b3 82%, #050706e6 100%),
  linear-gradient(0deg, #050706b3 0%, #05070600 22%) !important; }
midnry-fps .mf-modal.mf-lobby .mf-hero { display: none; }
midnry-fps .mf-modal.mf-lobby > .mf-panel :is(.mf-modes, .mf-start, .mf-playsummary) { display: none !important; }
midnry-fps .mf-homeleft { display: grid; gap: 12px; margin-top: 4px; }
midnry-fps .mf-opchar { all: unset; cursor: pointer; box-sizing: border-box; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 52px; margin-top: 6px; padding: 0 16px 0 20px; border: 1px solid #ffffff3d; border-radius: 4px; background: #ffffff08; font: 700 17px var(--mf-display); letter-spacing: 0.1em; text-transform: uppercase; color: #eef2ee; }
midnry-fps .mf-opchar .mf-ico { width: 18px; height: 18px; }
midnry-fps .mf-opchar:hover { border-color: #ffffff88; background: #ffffff10; }
midnry-fps .mf-opchar:focus-visible { outline: 2px solid var(--mf-accent); outline-offset: 2px; }
midnry-fps .mf-modal:not(.mf-home) :is(.mf-homeleft, .mf-modecard, .mf-squad) { display: none !important; }
midnry-fps .mf-modal.mf-home:not(.mf-lobby) :is(.mf-modecard, .mf-squad) { display: none !important; }
midnry-fps .mf-modal:not(.mf-lobby) :is(.mf-lobbytitle, .mf-stagebox, .mf-roomsheet) { display: none !important; }
midnry-fps .mf-hometop .mf-wordmark em { font-style: normal; color: var(--mf-accent); }
midnry-fps .mf-hometop nav .mf-ico { display: none; }
/* Lobby title: PLAY / ONLINE over the chosen game, its last word in gold. */
midnry-fps .mf-lobbytitle { position: absolute; left: 40px; top: 82px; z-index: 1; pointer-events: none; }
midnry-fps .mf-lobbykicker { margin: 0 0 4px; font: 600 16px var(--mf-display); letter-spacing: 0.3em; text-transform: uppercase; color: var(--mf-accent); }
midnry-fps .mf-lobbykicker i { font-style: normal; margin: 0 0.25em; color: #cfd8d2; }
midnry-fps .mf-lobbykicker span { color: #e3e9e4; }
midnry-fps .mf-lobbyname { margin: 0; font: 800 76px/0.92 var(--mf-display); letter-spacing: 0; text-transform: uppercase; white-space: nowrap; color: #f4f6f2; text-shadow: 0 4px 24px #0009; }
midnry-fps .mf-lobbyname em { font-style: normal; color: var(--mf-accent); }
midnry-fps .mf-modal.mf-lobby > .mf-panel { top: 194px; width: 320px !important; }
midnry-fps .mf-modal.mf-lobby > .mf-panel :is(h1, .mf-logosub) { display: none !important; }
midnry-fps .mf-modal.mf-lobby > .mf-panel > .mf-homefoot { flex-direction: column; align-items: flex-start; gap: 10px; }
midnry-fps .mf-modal.mf-home[data-mode="signal"] .mf-protocol-menunote { display: none; }
midnry-fps .mf-modal.mf-lobby .mf-protocol-menunote { margin: 0; font: 400 13px var(--mf-body); color: #aeb9b2; }
/* The 3D stage frames the operator and the squad pads inside this box. */
midnry-fps .mf-stagebox { position: absolute; left: clamp(240px, 24vw, 440px); right: clamp(220px, 24vw, 440px); top: 150px; bottom: 80px; pointer-events: none; }
/* Online ping (bottom left, above Exit game). */
midnry-fps .mf-homefoot .mf-ping { display: inline-flex !important; align-items: center; gap: 10px; min-height: 44px; padding: 0 16px !important; border: 1px solid #ffffff1f !important; border-radius: 4px !important; background: #0a0f0dd9 !important; color: #e3e9e4 !important; font: 500 15px var(--mf-body) !important; letter-spacing: 0 !important; text-transform: none; }
midnry-fps .mf-homefoot .mf-ping[hidden] { display: none !important; }
midnry-fps .mf-ping i { width: 10px; height: 10px; border-radius: 50%; background: #8a948e; }
midnry-fps .mf-ping:is([data-tone="great"], [data-tone="ok"]) i { background: #3fd07f; box-shadow: 0 0 8px #3fd07f99; }
midnry-fps .mf-ping[data-tone="warn"] i { background: #ffb547; }
midnry-fps .mf-ping[data-tone="bad"] i { background: #ff5a4a; }
/* Play card: Bots / Friends, the game (opens the picker), room, Start. */
midnry-fps .mf-modecard { position: absolute; right: 32px; bottom: 24px; width: 340px; box-sizing: border-box; display: grid; gap: 12px; padding: 16px; border: 1px solid #ffffff24; border-radius: 4px; background: #0a0f0de0; backdrop-filter: blur(8px); color: #eef2ee; z-index: 2; }
midnry-fps .mf-modecard[hidden] { display: none !important; }
midnry-fps .mf-playtoggle { display: grid; grid-template-columns: 1fr 1fr; }
midnry-fps .mf-playtoggle button { all: unset; cursor: pointer; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; border: 1px solid #ffffff24; background: #070a09; font: 600 15px var(--mf-display); letter-spacing: 0.08em; text-transform: uppercase; color: #c9d2cc; }
midnry-fps .mf-playtoggle button:first-child { border-radius: 4px 0 0 4px; }
midnry-fps .mf-playtoggle button:last-child { border-radius: 0 4px 4px 0; }
midnry-fps .mf-playtoggle button:hover { color: #fff; }
midnry-fps .mf-playtoggle .mf-ico { width: 20px; height: 20px; }
midnry-fps .mf-playtoggle button[aria-pressed="true"] { border-color: var(--mf-accent); background: #ffc85717; color: #fff; box-shadow: inset 0 0 0 1px var(--mf-accent); }
midnry-fps .mf-playtoggle button[aria-pressed="true"] .mf-ico { color: var(--mf-accent); }
midnry-fps .mf-modechange { all: unset; cursor: pointer; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 1fr) 20px; align-items: center; gap: 8px; padding: 2px 0 12px; border-bottom: 1px solid #ffffff17; }
midnry-fps .mf-modechange > .mf-ico { width: 20px; height: 20px; color: #e3e9e4; }
midnry-fps .mf-modechange[aria-disabled="true"] { cursor: default; }
midnry-fps .mf-modechange[aria-disabled="true"] > .mf-ico { visibility: hidden; }
midnry-fps .mf-modechange:hover:not([aria-disabled="true"]) .mf-modetitle { color: #fff; }
midnry-fps .mf-modetitle { display: block; font: 800 38px/1 var(--mf-display); letter-spacing: 0.01em; text-transform: uppercase; color: #f4f6f2; overflow-wrap: anywhere; }
midnry-fps .mf-modetitle[data-long] { font-size: 31px; }
midnry-fps .mf-modesub { display: block; margin-top: 4px; font: 400 15px var(--mf-body); color: #c3ccc6; }
midnry-fps .mf-roomline { display: grid; grid-template-columns: auto minmax(0, 1fr) 44px; align-items: center; gap: 6px 8px; }
midnry-fps .mf-roomline[hidden] { display: none; }
midnry-fps .mf-roomlabel { font: 600 14px var(--mf-display); letter-spacing: 0.14em; text-transform: uppercase; color: #aeb9b2; }
midnry-fps .mf-roomid { justify-self: end; font: 700 18px var(--mf-display); letter-spacing: 0.08em; color: #f1f4ef; white-space: nowrap; }
midnry-fps .mf-roomcopy { all: unset; cursor: pointer; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 4px; color: #e3e9e4; }
midnry-fps .mf-roomcopy .mf-ico { width: 22px; height: 22px; }
midnry-fps .mf-roomcopy:hover { background: #ffffff12; color: #fff; }
midnry-fps .mf-roomcopy[hidden] { display: none; }
midnry-fps .mf-roominvite { all: unset; cursor: pointer; box-sizing: border-box; grid-column: 1 / -1; display: grid; grid-template-columns: auto minmax(0, 1fr) 18px; align-items: center; gap: 14px; min-height: 48px; padding: 0 14px 0 0; border: 1px solid #ffffff3d; border-radius: 4px; font: 500 16px var(--mf-body); color: #eef2ee; }
midnry-fps .mf-roominvite > .mf-ico:first-child { box-sizing: content-box; width: 22px; height: 22px; padding: 0 14px 0 16px; border-right: 1px solid #ffffff24; }
midnry-fps .mf-roominvite > .mf-ico:last-child { width: 18px; height: 18px; }
midnry-fps .mf-roominvite span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
midnry-fps .mf-roominvite:hover { border-color: #ffffff88; background: #ffffff0a; }
midnry-fps .mf-modeplay { all: unset; cursor: pointer; box-sizing: border-box; display: grid; grid-template-columns: 24px minmax(0, 1fr) 24px; align-items: center; min-height: 64px; padding: 0 16px; border-radius: 4px; background: var(--mf-accent); color: var(--mf-accent-ink); font: 800 32px/1 var(--mf-display); letter-spacing: 0.04em; text-transform: uppercase; text-align: center; box-shadow: 0 12px 34px #ffc85738; }
midnry-fps .mf-modeplay > span { grid-column: 2; }
midnry-fps .mf-modeplay > .mf-ico { width: 24px; height: 24px; stroke-width: 2.4; }
midnry-fps .mf-modeplay:hover:not(:disabled) { filter: brightness(1.07); }
midnry-fps .mf-modeplay:disabled { opacity: 0.5; cursor: default; }
midnry-fps .mf-modestatus { margin: -4px 0 0; font: 400 13px var(--mf-body); color: #aeb9b2; }
midnry-fps .mf-modestatus:empty { display: none; }
midnry-fps .mf-shell:has(> .mf-modal.mf-lobby:not([hidden])) > :is(.mf-match, .mf-cross, .mf-super, .mf-bottom, .mf-hitmark, .mf-damage, .mf-toast, .mf-touch) { visibility: hidden; }
midnry-fps :is(.mf-modeplay, .mf-modechange, .mf-playtoggle button, .mf-squad button, .mf-pickerclose, .mf-roomclose, .mf-roomcopy, .mf-roominvite, .mf-ping):focus-visible { outline: 2px solid var(--mf-accent) !important; outline-offset: 3px; }
/* Squad pads: "+" over an empty pad, each fighter's name under theirs. */
midnry-fps .mf-squad { position: absolute; left: 0; top: 0; width: 100%; height: 0; z-index: 1; pointer-events: none; }
midnry-fps .mf-squad[hidden] { display: none; }
midnry-fps .mf-squad button { all: unset; pointer-events: auto; cursor: pointer; position: absolute; left: var(--x, 30%); top: var(--y, 55%); transform: translate(-50%, -50%); width: 56px; height: 56px; display: grid; place-items: center; border: 2px solid #ffffffc0; border-radius: 6px; background: #0a0f0db3; color: #fff; font: 600 34px/1 var(--mf-display); box-shadow: 0 6px 20px #0008; }
midnry-fps .mf-squad button[hidden] { display: none; }
midnry-fps .mf-squad button:hover { border-color: var(--mf-accent); color: var(--mf-accent); }
midnry-fps .mf-padname { position: absolute; left: var(--x, 50%); top: var(--y, 70%); transform: translate(-50%, -50%); font: 700 17px var(--mf-display); letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; color: #eef2ee; text-shadow: 0 1px 6px #000, 0 0 2px #000; }
midnry-fps .mf-padname:is([hidden], :empty) { display: none; }
/* Online room sheet. */
midnry-fps .mf-roomsheet { display: none; }
midnry-fps .mf-modal.mf-lobby.mf-roomopen > .mf-roomsheet { display: grid; gap: 8px; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-sizing: border-box; width: min(520px, calc(100vw - 32px)); max-height: calc(100% - 32px); overflow: auto; padding: 18px 20px 20px; border: 1px solid #ffffff2b; border-radius: 6px; background: #070a09f5; box-shadow: 0 30px 80px #000c; color: #e3e9e4; z-index: 6; }
midnry-fps .mf-modal.mf-roomopen::after { content: ""; position: absolute; inset: 0; background: #000a; z-index: 5; }
midnry-fps .mf-roomsheet .mf-pickerhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
midnry-fps .mf-roomsheet .mf-network { margin: 0 !important; padding: 0 !important; border: 0 !important; background: none !important; font: 400 15px/1.45 var(--mf-body); color: #dfe5e0; }
midnry-fps .mf-roomsheet .mf-network > summary { display: none; }
midnry-fps .mf-roomsheet .mf-roomformat { font: 700 16px var(--mf-display); letter-spacing: 0.06em; text-transform: uppercase; color: var(--mf-accent); }
midnry-fps .mf-roomsheet :is(.mf-netrow button, .mf-quick) { min-height: 44px; padding: 0 14px; border: 1px solid #ffffff3d !important; border-radius: 4px; background: #0c1210 !important; color: #f1f4ef !important; font: 700 15px var(--mf-display); letter-spacing: 0.08em; text-transform: uppercase; }
midnry-fps .mf-roomsheet .mf-quick { width: 100%; background: var(--mf-accent) !important; color: var(--mf-accent-ink) !important; border-color: transparent !important; }
midnry-fps .mf-roomsheet .mf-codeinput { min-height: 44px; border-radius: 4px; font: 700 18px var(--mf-display); letter-spacing: 0.12em; }
midnry-fps .mf-roomsheet .mf-roomcode { display: block; font: 800 34px var(--mf-display); letter-spacing: 0.12em; color: var(--mf-accent); }
midnry-fps .mf-roomsheet .mf-publiclabel { display: flex; align-items: center; gap: 10px; min-height: 44px; }
midnry-fps .mf-pickerhead { display: none; }
/* The picker becomes a sheet over the lobby, opened by Change or Play. */
midnry-fps .mf-modal.mf-lobby .mf-playlists:not(.mf-open) { display: none !important; }
midnry-fps .mf-modal.mf-lobby .mf-playlists.mf-open { left: 50%; right: auto; top: 50%; bottom: auto; transform: translate(-50%, -50%); width: min(860px, calc(100vw - 48px)); padding: 18px 20px 20px; border: 1px solid #ffffff2b; border-radius: 6px; background: #070a09f5; box-shadow: 0 30px 80px #000c; z-index: 6; }
midnry-fps .mf-modal.mf-lobby .mf-playlists.mf-open .mf-pickerhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
midnry-fps .mf-pickerhead b { font: 800 24px var(--mf-display); letter-spacing: 0.06em; text-transform: uppercase; color: #f4f6f2; }
midnry-fps :is(.mf-pickerclose, .mf-roomclose) { all: unset; min-height: 44px; box-sizing: border-box; display: grid; place-items: center; cursor: pointer; padding: 8px 16px; border-radius: 3px; background: var(--mf-accent); color: var(--mf-accent-ink); font: 700 14px var(--mf-display); letter-spacing: 0.1em; text-transform: uppercase; }
midnry-fps .mf-modal.mf-lobby .mf-playlists.mf-open .mf-playnext { display: none !important; }
midnry-fps .mf-modal.mf-picking::after { content: ""; position: absolute; inset: 0; background: #000a; z-index: 5; }

/* Short or narrow screens: one scrolling column. */
@media (max-width: 999px), (max-height: 599px) {
  midnry-fps .mf-modal.mf-home { display: flex !important; flex-direction: column; align-items: stretch !important; justify-content: flex-start !important; overflow-y: auto !important; overscroll-behavior: contain; }
  midnry-fps .mf-modal.mf-home > * { flex: none; }
  midnry-fps .mf-modal.mf-home > .mf-hometop { order: 0; }
  midnry-fps .mf-modal.mf-home > .mf-panel { order: 1; }
  midnry-fps .mf-modal.mf-home > .mf-playlists { order: 2; }
  midnry-fps .mf-modal.mf-home > .mf-homeside { order: 3; }
  midnry-fps .mf-hero { position: absolute; bottom: auto; height: 520px; background:
    linear-gradient(0deg, #070a09 0%, #070a0900 60%),
    linear-gradient(180deg, #050706d0 0%, #05070600 30%),
    url("menu/hero.webp") 62% center / cover no-repeat; }
  midnry-fps .mf-hometop { position: relative; height: calc(56px + var(--mf-safe-top, 0px)); padding: var(--mf-safe-top, 0px) calc(16px + var(--mf-safe-right, 0px)) 0 calc(16px + var(--mf-safe-left, 0px)); gap: 12px; }
  midnry-fps .mf-hometop nav { display: none; }
  midnry-fps .mf-hometop .mf-wordmark { margin-right: auto; font-size: 13px; }
  midnry-fps .mf-modal.mf-home > .mf-panel { position: relative !important; left: auto; top: auto; bottom: auto; width: auto !important; margin: 96px 16px 0 !important; overflow: visible; }
  midnry-fps .mf-modal.mf-home .mf-panel h1 { font-size: 54px !important; }
  midnry-fps .mf-playlists { position: relative; left: auto; right: auto; bottom: auto; margin: 16px 16px 0; }
  midnry-fps .mf-gamepick button { height: 112px; }
  midnry-fps .mf-playnext:not([hidden]) { all: unset; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 52px; border-radius: 3px; background: var(--mf-accent); color: var(--mf-accent-ink); font: 800 20px var(--mf-display); letter-spacing: 0.04em; text-transform: uppercase; }
  midnry-fps .mf-playnext .mf-ico { width: 18px; height: 18px; }
  midnry-fps .mf-playnext:disabled { opacity: 0.5; cursor: default; }
  midnry-fps .mf-homeside { position: relative; right: auto; top: auto; width: auto; margin: 16px 16px calc(24px + var(--mf-safe-bottom, 0px)); }
  midnry-fps .mf-homefoot { margin-top: 4px; }
}
/* Mid-size desktops: narrower side cards and title. */
@media (min-width: 1000px) and (max-width: 1199px) {
  midnry-fps .mf-modal.mf-lobby > .mf-panel { width: 300px !important; }
  midnry-fps .mf-modal.mf-lobby > :is(.mf-homeside, .mf-modecard) { width: 320px; }
  midnry-fps .mf-lobbyname { font-size: 62px; }
}
/* Phones and short screens, lobby: one column under the header (title,
   today's case, the 3D stage, operator, Play card, then the rest) with a
   tab bar fixed to the bottom. The panel, right column and footer unwrap
   (display: contents) so their cards take places in that column. */
@media (max-width: 999px), (max-height: 599px) {
  midnry-fps .mf-modal.mf-home.mf-lobby { --mf-gut: max(16px, calc((100% - 600px) / 2)); gap: 6px; padding: 0 0 calc(70px + var(--mf-safe-bottom, 0px)) !important; background: linear-gradient(180deg, #050706c0 0, #05070600 160px, #05070600 45%, #050706b0 75%) !important; }
  midnry-fps .mf-modal.mf-home.mf-lobby > :is(.mf-panel, .mf-homeside),
  midnry-fps .mf-modal.mf-home.mf-lobby > .mf-panel > :is(.mf-homeleft, .mf-homefoot) { display: contents !important; }
  midnry-fps .mf-modal.mf-lobby :is(.mf-lobbytitle, .mf-casecard, .mf-stagebox, .mf-opcard, .mf-modecard, .mf-newhere, .mf-matchbar, .mf-protocol-menu, .mf-challenges, .mf-homeactions, .mf-homeexit, .mf-ping) { flex: none; position: relative; left: auto; right: auto; top: auto; bottom: auto; box-sizing: border-box; width: auto; margin: 0 var(--mf-gut) !important; }
  midnry-fps .mf-modal.mf-lobby > .mf-lobbytitle { order: 1; margin-top: 4px !important; }
  midnry-fps .mf-modal.mf-lobby .mf-casecard { order: 2; }
  midnry-fps .mf-modal.mf-lobby > .mf-stagebox { order: 3; height: 240px; padding-bottom: 6px; }
  midnry-fps .mf-modal.mf-lobby.mf-pinged > .mf-stagebox { padding-bottom: 34px; }
  midnry-fps .mf-modal.mf-lobby .mf-homefoot .mf-ping { order: 4; position: relative; z-index: 2; align-self: flex-start; min-height: 36px; padding: 0 12px !important; font-size: 14px !important; margin: -40px 0 -2px var(--mf-gut) !important; }
  midnry-fps .mf-modal.mf-lobby .mf-homefoot .mf-ping::before { content: ""; position: absolute; inset: -4px; }
  midnry-fps .mf-modal.mf-lobby .mf-squad button { width: 48px; height: 48px; font-size: 30px; }
  midnry-fps .mf-modal.mf-lobby .mf-padname { font-size: 15px; }
  midnry-fps .mf-modal.mf-lobby .mf-opcard { order: 5; }
  midnry-fps .mf-modal.mf-lobby :is(.mf-modecard, .mf-matchbar) { order: 6; }
  midnry-fps .mf-modal.mf-lobby .mf-newhere { order: 7; }
  midnry-fps .mf-modal.mf-lobby .mf-protocol-menu { order: 8; }
  midnry-fps .mf-modal.mf-lobby .mf-challenges { order: 9; }
  midnry-fps .mf-modal.mf-lobby .mf-homeactions { order: 10; grid-template-columns: 1fr; }
  midnry-fps .mf-modal.mf-lobby .mf-homeactions button:not([data-go="practice"]) { display: none !important; }
  midnry-fps .mf-modal.mf-lobby .mf-homeexit { order: 11; }
  midnry-fps .mf-modal.mf-lobby .mf-hometop { height: calc(48px + var(--mf-safe-top, 0px)); padding-left: calc(var(--mf-gut) + var(--mf-safe-left, 0px)); padding-right: calc(var(--mf-gut) + var(--mf-safe-right, 0px)); }
  midnry-fps .mf-modal.mf-lobby .mf-profilechip small .mf-xpbar { display: block; width: 56px; }
  /* Title */
  midnry-fps .mf-lobbykicker { font-size: 13px; }
  midnry-fps .mf-lobbykicker { margin-bottom: 2px; }
  midnry-fps .mf-lobbyname { font-size: clamp(34px, 12.4vw, 58px); }
  midnry-fps .mf-lobbyname[data-long] { font-size: clamp(30px, 9.4vw, 58px); }
  /* Today's case */
  midnry-fps .mf-modal.mf-lobby .mf-casecard { grid-template-columns: 96px minmax(0, 1fr) 18px; gap: 12px; padding: 5px 14px 5px 5px; border-color: #ffffff24; }
  midnry-fps .mf-modal.mf-lobby .mf-casecard img { width: 96px; height: 48px; }
  midnry-fps .mf-modal.mf-lobby .mf-casecard small { font-size: 14px; line-height: 1.15; }
  midnry-fps .mf-modal.mf-lobby .mf-casecard em { font-size: 12px; line-height: 1.2; }
  midnry-fps .mf-modal.mf-lobby .mf-casecard strong { font-size: 22px; line-height: 1.05; }
  /* Operator: compact two columns. */
  midnry-fps .mf-modal.mf-lobby .mf-opcard { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 12px; padding: 10px 12px; }
  midnry-fps .mf-modal.mf-lobby .mf-ophead { gap: 8px; padding: 0 10px 0 0; border-bottom: 0; border-right: 1px solid #ffffff17; }
  midnry-fps .mf-modal.mf-lobby .mf-opname { margin: 2px 0 0; font-size: 26px; }
  midnry-fps .mf-modal.mf-lobby .mf-optag { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  midnry-fps .mf-modal.mf-lobby .mf-ophead > div { min-width: 0; }
  midnry-fps .mf-modal.mf-lobby .mf-emblem { width: 34px; height: 34px; margin-top: 10px; }
  midnry-fps .mf-modal.mf-lobby .mf-opprog { gap: 6px; padding-top: 0; align-content: center; }
  midnry-fps .mf-modal.mf-lobby .mf-oplevel { font-size: 14px; line-height: 1.2; }
  midnry-fps .mf-modal.mf-lobby .mf-oplevel span { font-size: 12px; }
  midnry-fps .mf-modal.mf-lobby .mf-opchar { min-height: 44px; margin-top: 2px; padding: 0 12px 0 16px; font-size: 16px; justify-content: center; position: relative; }
  midnry-fps .mf-modal.mf-lobby .mf-opchar .mf-ico { position: absolute; right: 12px; }
  midnry-fps .mf-modal.mf-lobby .mf-opmore { display: none; }
  /* Play card */
  midnry-fps .mf-modal.mf-lobby .mf-modecard { gap: 8px; padding: 10px 12px 12px; }
  midnry-fps .mf-modal.mf-lobby .mf-playtoggle button { min-height: 44px; }
  midnry-fps .mf-modal.mf-lobby .mf-modechange { padding: 2px 0 8px; }
  midnry-fps .mf-modal.mf-lobby .mf-modetitle { font-size: 27px; }
  midnry-fps .mf-modal.mf-lobby .mf-modetitle[data-long] { font-size: 25px; }
  midnry-fps .mf-modal.mf-lobby .mf-modesub { margin-top: 2px; font-size: 13px; }
  midnry-fps .mf-modal.mf-lobby .mf-roomline { grid-template-columns: auto auto 40px minmax(0, 1fr); gap: 6px; }
  midnry-fps .mf-modal.mf-lobby .mf-roomid { justify-self: start; font-size: 16px; }
  midnry-fps .mf-modal.mf-lobby .mf-roomcopy { width: 40px; }
  midnry-fps .mf-modal.mf-lobby .mf-roominvite { grid-column: auto; gap: 10px; min-height: 44px; padding-right: 10px; font-size: 15px; }
  midnry-fps .mf-modal.mf-lobby .mf-roominvite > .mf-ico:first-child { width: 20px; height: 20px; padding: 0 10px 0 12px; }
  midnry-fps .mf-modal.mf-lobby .mf-modeplay { min-height: 52px; font-size: 27px; }
  /* Tab bar */
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 4; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin: 0; height: calc(60px + var(--mf-safe-bottom, 0px)); padding: 0 var(--mf-safe-right, 0px) var(--mf-safe-bottom, 0px) var(--mf-safe-left, 0px); border-top: 1px solid #ffffff17; background: #070a09f2; backdrop-filter: blur(8px); }
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 0; padding: 0 2px; font-size: 12px; letter-spacing: 0.08em; white-space: nowrap; }
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav .mf-ico { display: block; width: 23px; height: 23px; }
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav button[aria-current="page"]::after { left: 16%; right: 16%; bottom: 0; height: 3px; }
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav .mf-navpractice { display: none; }
  /* Sheets cover the screen, not the scrolled column. */
  midnry-fps .mf-modal.mf-lobby > :is(.mf-playlists.mf-open, .mf-roomsheet) { position: fixed; top: 50%; max-height: calc(100dvh - 32px); overflow: auto; }
  midnry-fps .mf-modal.mf-lobby:is(.mf-picking, .mf-roomopen)::after { position: fixed; }
}
/* Landscape phones: a slimmer tab bar, icon beside the label. */
@media (max-height: 500px) and (orientation: landscape) {
  midnry-fps .mf-modal.mf-home.mf-lobby { padding-bottom: calc(58px + var(--mf-safe-bottom, 0px)) !important; }
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav { height: calc(48px + var(--mf-safe-bottom, 0px)); }
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav button { flex-direction: row; gap: 8px; }
  midnry-fps .mf-modal.mf-lobby .mf-hometop nav .mf-ico { width: 20px; height: 20px; }
}
@media (max-width: 640px) {
  midnry-fps .mf-logosub { letter-spacing: 0.2em; font-size: 13px; }
  midnry-fps .mf-profilechip small .mf-xpbar { display: none; }
  midnry-fps .mf-gamepick b { font-size: 18px; }
  midnry-fps .mf-gamepick small { font-size: 12px; }
  midnry-fps .mf-gamepick small::before { display: none; }
  midnry-fps .mf-gamepick button > span { left: 10px; right: 26px; bottom: 10px; }
  midnry-fps .mf-gamepick .mf-ico { right: 8px; }
  midnry-fps .mf-variants { grid-template-columns: 1fr 1fr; }
}
`;

const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};

export class OutpostMenu {
  constructor(g) {
    this.g = g;
    this.modal = g.$(".mf-modal");
    this.panel = g.$(".mf-panel");
    if (!this.modal || !this.panel) return;
    this.style = el("style");
    this.style.dataset.outpostMenu = "";
    this.style.textContent = CSS;
    g.shell.append(this.style);
    this.build();
    this.tabSettings();
    // Return to the mode played last time.
    let saved = null;
    try {
      saved = localStorage.getItem("midnry-outpost-mode");
    } catch {}
    // Play never guesses the game: until a game has been picked (now or on
    // an earlier visit), it asks the player to choose one first.
    this.gameChosen = saved === "signal" || saved === "protocol";
    this.guardPlay = (event) => {
      if (this.gameChosen || g.online || g.ui?.playChoice === "online" || g.state === "playing") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.askForGame();
    };
    // Capture on the button itself runs before the game's own start handler.
    g.$(".mf-start")?.addEventListener("click", this.guardPlay, true);
    if (saved === "signal" && !g.online && g.state !== "playing") {
      g.mode = "signal";
      g.reset();
    }
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(this.modal, { attributes: true, attributeFilter: ["hidden"] });
    this.observer.observe(this.panel, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-pressed", "disabled"] });
    // The room controls move into the lobby's room sheet: watch them there too.
    this.observer.observe(this.roomSlot, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "disabled"] });
    // A second observe() on the same node replaces the first one's options,
    // so the panel's own class (leaving the debrief) needs its own observer.
    this.panelObserver = new MutationObserver(() => this.schedule());
    this.panelObserver.observe(this.panel, { attributes: true, attributeFilter: ["class"] });
    // Phones: refit the stage when the screen or the cards change size.
    this.resizer = new ResizeObserver(() => this.fitStage());
    for (const node of [this.modal, this.modeCard, this.lobbyTitle]) this.resizer.observe(node);
    this.refresh();
  }

  build() {
    const g = this.g;
    this.hero = el("div", "mf-hero");
    this.top = el(
      "header",
      "mf-hometop",
      `<span class="mf-wordmark">OUTPOST <em>ZERO</em></span><nav aria-label="Menu"><button type="button" aria-current="page" data-go="home">${icon("home")}<span>Home</span></button><button type="button" data-go="locker">${icon("bot")}<span>Locker</span></button><button type="button" data-go="guide">${icon("book")}<span>How to play</span></button><button type="button" data-go="settings">${icon("gear")}<span>Settings</span></button><button type="button" class="mf-navpractice" data-go="practice">${icon("target")}<span>Practice</span></button></nav><div class="mf-profilechip"><span class="mf-avatar">${icon("helmet")}</span><span><b class="mf-chipname"></b><small><span class="mf-chiplevel"></span><span class="mf-xpbar"><i></i></span></small></span></div>`,
    );
    this.modal.prepend(this.hero);
    this.modal.append(this.top);
    // Logo subtitle under the existing title.
    this.logoSub = el("div", "mf-logosub", "Blackout <span>Protocol</span> · Lifeline Run");
    this.panel.querySelector("h1")?.after(this.logoSub);
    // Icons on the existing offline / online choices.
    for (const [sel, name] of [
      [".mf-offlinechoice", "squad"],
      [".mf-onlinechoice", "globe"],
    ]) {
      const button = this.panel.querySelector(sel);
      if (button && !button.querySelector(".mf-ico")) {
        button.insertAdjacentHTML("afterbegin", icon(name));
        button.insertAdjacentHTML("beforeend", icon("chevron", "mf-chev"));
      }
    }
    // Secondary actions: proxies for the original buttons.
    this.actions = el(
      "div",
      "mf-homeactions",
      `<button type="button" data-go="locker">${icon("lock")}Locker</button><button type="button" data-go="settings">${icon("gear")}Settings</button><button type="button" data-go="guide">${icon("book")}How to play</button><button type="button" data-go="practice">${icon("target")}Practice</button>`,
    );
    // First visits: one clear suggestion before anything else.
    this.welcome = el(
      "div",
      "mf-newhere",
      `<b>New here?</b><span>Learn the basics in a 2-minute training, or choose a game below: your first matches are kept simple.</span><button type="button" data-go="training">${icon("target")}Start training</button>`,
    );
    this.panel.querySelector(".mf-start")?.before(this.welcome);
    // Say what Play starts, so the choice below is never a surprise.
    this.summary = el("p", "mf-playsummary");
    this.summary.setAttribute("aria-live", "polite");
    this.panel.querySelector(".mf-start")?.after(this.summary);
    // Mid-match (paused): start the round again, or leave it for this menu.
    this.matchbar = el(
      "div",
      "mf-matchbar",
      `<button type="button" class="mf-restartmatch">↻ Restart</button><button type="button" class="mf-leavematch">${icon("exit")}Leave match</button><button type="button" class="mf-netcheck">${icon("globe")}Network check</button>`,
    );
    this.matchbar.hidden = true;
    this.summary.after(this.matchbar);
    this.matchbar.after(this.actions);
    g.on(this.matchbar.querySelector(".mf-netcheck"), "click", () => g.netMeter?.open());
    g.on(this.matchbar.querySelector(".mf-restartmatch"), "click", () =>
      g.ui.confirm("Restart match?", "This round ends and a fresh one starts with the same mode.", "Restart", (yes) => {
        if (!yes || g.online) return;
        g.reset();
        g.start();
      }),
    );
    g.on(this.matchbar.querySelector(".mf-leavematch"), "click", () =>
      g.ui.confirm(
        "Leave match?",
        g.online
          ? "You leave the online room and return to the menu. Bots take your place."
          : "This round ends and you return to the menu.",
        "Leave match",
        (yes) => {
          if (!yes) return;
          if (g.online) g.leaveOnline();
          else {
            g.series = null;
            g.reset();
          }
        },
      ),
    );
    this.foot = el(
      "div",
      "mf-homefoot",
      `<button type="button" class="mf-homeexit" data-go="exit">${icon("exit")}Exit game</button>`,
    );
    this.panel.append(this.foot);
    // Right column.
    this.side = el(
      "aside",
      "mf-homeside",
      `<section class="mf-card mf-opcard" aria-label="Operator"><div class="mf-ophead"><div><h3>Operator</h3><strong class="mf-opname"></strong><p class="mf-optag"></p></div><svg class="mf-emblem" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 3l5 13.5L43 11l-8.5 11.5L45 30l-14-.5L24 45l-7-15.5L3 30l10.5-7.5L5 11l14 5.5z"/><circle cx="24" cy="24" r="5"/></svg></div><div class="mf-opprog"><div class="mf-oplevel"><b class="mf-oplv"></b><span class="mf-opxp"></span></div><span class="mf-xpbar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100"><i></i></span><button type="button" class="mf-opchar" data-go="locker" aria-label="Change operator"><span>Change<span class="mf-opmore"> operator</span></span>${icon("chevron")}</button></div></section><section class="mf-card mf-challenges"><header><h3>Daily challenges<b class="mf-chcount"></b></h3></header><ul></ul></section><button type="button" class="mf-casecard" data-mode="daily"><img src="menu/card-daily.webp" alt=""><span><small>Today's case</small><em class="mf-casenote"></em><strong class="mf-casescore"></strong></span>${icon("chevron")}</button>`,
    );
    this.modal.append(this.side);
    // Your operator card sits on the left, under the logo; challenges stay
    // in the right column (on phones they follow the Play card).
    this.leftCards = el("div", "mf-homeleft");
    this.leftCards.append(this.side.querySelector(".mf-opcard"));
    this.logoSub.after(this.leftCards);
    this.side.append(this.side.querySelector(".mf-challenges"));
    // Lobby title: "PLAY / ONLINE" over the chosen game's name.
    this.lobbyTitle = el("div", "mf-lobbytitle", `<p class="mf-lobbykicker">Play <i>/</i> <span></span></p><h2 class="mf-lobbyname"></h2>`);
    this.modal.append(this.lobbyTitle);
    // The 3D stage frames the operator and pads inside this box.
    this.stageBox = el("div", "mf-stagebox");
    this.stageBox.setAttribute("aria-hidden", "true");
    this.modal.append(this.stageBox);
    // Online: ping to the room server (opens the network check).
    this.ping = el("button", "mf-ping", "<i></i><b></b>");
    this.ping.type = "button";
    this.ping.hidden = true;
    this.foot.prepend(this.ping);
    g.on(this.ping, "click", () => g.netMeter?.open());
    // Lobby: the mode card (bottom right) says what Play starts and changes it.
    this.modeCard = el(
      "section",
      "mf-modecard",
      `<div class="mf-playtoggle" role="group" aria-label="Play with"><button type="button" data-playwith="offline">${icon("bot")}Bots</button><button type="button" data-playwith="online">${icon("squad")}Friends</button></div><button type="button" class="mf-modechange" aria-haspopup="dialog"><span><strong class="mf-modetitle"></strong><span class="mf-modesub"></span></span>${icon("chevron")}</button><div class="mf-roomline"><span class="mf-roomlabel">Room</span><b class="mf-roomid"></b><button type="button" class="mf-roomcopy" aria-label="Copy invite link">${icon("copy")}</button><button type="button" class="mf-roominvite" aria-haspopup="dialog">${icon("squad")}<span></span>${icon("chevron")}</button></div><button type="button" class="mf-modeplay"><span></span>${icon("chevron")}</button><p class="mf-modestatus" role="status" aria-live="polite"></p>`,
    );
    this.modeCard.setAttribute("aria-label", "Game mode");
    this.modal.append(this.modeCard);
    // Online room sheet: the room's full controls (code, invite, quick
    // match, join by code, listing, roster, leave) open from the mode card.
    this.roomSheet = el(
      "section",
      "mf-roomsheet",
      `<header class="mf-pickerhead"><b id="mf-roomsheet-title">Online room</b><button type="button" class="mf-roomclose">Done</button></header><div class="mf-roomslot"></div>`,
    );
    this.roomSheet.setAttribute("role", "dialog");
    this.roomSheet.setAttribute("aria-labelledby", "mf-roomsheet-title");
    this.roomSlot = this.roomSheet.querySelector(".mf-roomslot");
    this.network = g.$(".mf-network");
    // Where the room controls live outside the lobby.
    this.netHome = document.createComment("mf-network");
    this.network?.before(this.netHome);
    this.modal.append(this.roomSheet);
    g.on(this.roomSheet.querySelector(".mf-roomclose"), "click", () => this.closeRoom());
    g.on(this.roomSheet, "keydown", (event) => {
      if (event.key === "Escape" && this.modal.classList.contains("mf-roomopen")) {
        event.stopPropagation();
        this.closeRoom();
      }
    });
    // Lobby: squad pads either side of your operator invite friends; each
    // pad's name label sits under it.
    this.squad = el(
      "div",
      "mf-squad",
      `<span class="mf-padname" data-pad="0"></span><span class="mf-padname" data-pad="1"></span><span class="mf-padname" data-pad="2"></span><button type="button" data-invite aria-label="Invite friends">+</button><button type="button" data-invite aria-label="Invite friends">+</button>`,
    );
    this.modal.append(this.squad);
    g.on(this.modeCard, "click", (event) => {
      const play = event.target.closest(".mf-modeplay"),
        change = event.target.closest(".mf-modechange"),
        withWho = event.target.closest("[data-playwith]");
      // Friends, no room yet: the big button opens one.
      if (play && !play.disabled) g.$(g.ui?.playChoice === "online" && !g.online ? ".mf-create" : ".mf-start")?.click();
      if (change && change.getAttribute("aria-disabled") !== "true") this.openPicker();
      if (withWho) g.$(withWho.dataset.playwith === "online" ? ".mf-onlinechoice" : ".mf-offlinechoice")?.click();
      if (event.target.closest(".mf-roominvite")) this.openRoom();
      if (event.target.closest(".mf-roomcopy")) {
        this.statusUntil = Date.now() + 5000;
        g.$(".mf-copyinvite")?.click();
        setTimeout(() => this.schedule(), 300);
        setTimeout(() => this.schedule(), 5100);
      }
    });
    g.on(this.squad, "click", (event) => {
      if (!event.target.closest("[data-invite]")) return;
      if (g.online || g.ui?.playChoice === "online") this.openRoom();
      else g.$(".mf-onlinechoice")?.click();
    });
    // Opening a room link (?room=CODE) shows the room sheet to join it.
    this.roomLink = new URLSearchParams(location.search).has("room");
    // The ping chip follows the network meter while online.
    this.pingTimer = setInterval(() => this.updatePing(), 1000);
    // Drag across the lobby to turn your operator.
    let dragX = null;
    g.on(this.modal, "pointerdown", (event) => {
      if (event.target === this.modal || event.target === this.hero) dragX = event.clientX;
    });
    g.on(window, "pointermove", (event) => {
      if (dragX === null) return;
      g.military?.lobby?.drag(event.clientX - dragX);
      dragX = event.clientX;
    });
    g.on(window, "pointerup", () => (dragX = null));
    // Bottom: pick the game first, then how to play it.
    this.cards = el(
      "div",
      "mf-playlists",
      `<header class="mf-pickerhead"><b>Game mode</b><button type="button" class="mf-pickerclose">Done</button></header><p class="mf-steplabel" id="mf-step1"><b>1</b>Choose a game</p><div class="mf-gamepick" role="group" aria-labelledby="mf-step1"></div><p class="mf-steplabel" id="mf-step2"><b>2</b>Choose how to play</p><div class="mf-variants" role="group" aria-labelledby="mf-step2"></div><button type="button" class="mf-playnext">Play ${icon("chevron")}</button>`,
    );
    this.gamePick = this.cards.querySelector(".mf-gamepick");
    this.variants = this.cards.querySelector(".mf-variants");
    for (const game of GAMES) {
      const card = el("button", "", `<span><b>${game.title}</b><small>${game.sub}</small></span>${icon("chevron")}`);
      card.type = "button";
      card.dataset.mode = game.id;
      card.style.backgroundImage = `url("menu/${game.art}")`;
      this.gamePick.append(card);
    }
    this.modal.append(this.cards);
    // Phones scroll past the Play button to reach the choices: repeat it here.
    this.playNext = this.cards.querySelector(".mf-playnext");
    this.cards.setAttribute("role", "dialog");
    this.cards.setAttribute("aria-label", "Choose a game mode");
    g.on(this.cards.querySelector(".mf-pickerclose"), "click", () => this.closePicker());
    g.on(this.cards, "keydown", (event) => {
      if (event.key === "Escape" && this.cards.classList.contains("mf-open")) {
        event.stopPropagation();
        this.closePicker();
      }
    });
    g.on(this.playNext, "click", () => g.$(".mf-start")?.click());
    const go = (event) => {
      const target = event.target.closest("[data-go]");
      if (target) this.go(target.dataset.go);
      const mode = event.target.closest("[data-mode], [data-variant]");
      if (mode && !mode.disabled) this.pick(mode.dataset.mode || mode.dataset.variant);
    };
    for (const node of [this.top, this.actions, this.foot, this.side, this.cards, this.welcome, this.leftCards]) g.on(node, "click", go);
  }

  /** Split the settings dialog into sections with a sidebar. The controls
   * themselves are moved, not copied, so their handlers keep working. */
  tabSettings() {
    const dialog = this.g.$(".mf-settings"),
      body = dialog?.querySelector(".mf-settingsbody");
    if (!body || dialog.classList.contains("mf-tabbed")) return;
    const ICONS = { "Camera & aim": "target", "Gameplay & sound": "squad", Accessibility: "book", Graphics: "chip" };
    const NAMES = { "Camera & aim": "Controls", "Gameplay & sound": "Gameplay & audio" };
    const tabs = [];
    let current = null;
    for (const node of [...body.children]) {
      if (node.tagName === "H3") {
        current = { title: node.textContent.trim(), section: el("section", "mf-settab") };
        tabs.push(current);
      } else if (!current || node.tagName === "DETAILS" || node.classList.contains("mf-settingsnotice")) {
        let system = tabs.find((t) => t.title === "System");
        if (!system) {
          system = { title: "System", section: el("section", "mf-settab", "<h3>System</h3>") };
          tabs.push(system);
        }
        system.section.append(node);
        continue;
      }
      current.section.append(node);
    }
    // The device check lives in System rather than on the home screen.
    const system = tabs.find((t) => t.title === "System");
    if (system) {
      const check = el("button", "mf-systemcheck", `${icon("chip")}Run device check`);
      check.type = "button";
      check.addEventListener("click", () => {
        dialog.close?.();
        this.go("device");
      });
      system.section.append(check);
    }
    // Graphics first, like most games.
    tabs.sort((a, b) => (b.title === "Graphics") - (a.title === "Graphics"));
    const nav = el("nav", "mf-settingsnav");
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Settings sections");
    const select = (index) => {
      tabs.forEach((tab, i) => {
        tab.section.classList.toggle("mf-on", i === index);
        tab.button.setAttribute("aria-selected", String(i === index));
        tab.button.tabIndex = i === index ? 0 : -1;
      });
      body.scrollTop = 0;
    };
    tabs.forEach((tab, i) => {
      tab.button = el("button", "", `${icon(ICONS[tab.title] || "gear")}${NAMES[tab.title] || tab.title}`);
      tab.button.type = "button";
      tab.button.setAttribute("role", "tab");
      tab.section.setAttribute("role", "tabpanel");
      this.g.on(tab.button, "click", () => select(i));
      this.g.on(tab.button, "keydown", (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = (i + step + tabs.length) % tabs.length;
        select(next);
        tabs[next].button.focus();
      });
      nav.append(tab.button);
      body.append(tab.section);
    });
    const grid = el("div", "mf-settingsgrid");
    body.before(grid);
    grid.append(nav, body);
    dialog.classList.add("mf-tabbed");
    select(0);
  }

  /** Run an original control so its behaviour stays the single source of truth. */
  go(where) {
    const g = this.g;
    // First-timers go straight into the operator drills, no track choice.
    if (where === "training") {
      if (g.mode !== "protocol") g.mode = "protocol";
      if (g.practice?.start?.(0, "operator")) return;
      where = "practice";
    }
    const find = {
      locker: () => g.$(".mf-lockeropen"),
      settings: () => g.$(".mf-graphics"),
      guide: () => g.$(".mf-protocol-menu > button:not(.mf-practice-start)"),
      practice: () => g.$(".mf-practice-start"),
      device: () => g.$(".mf-compat-open"),
      exit: () => g.$(".mf-exit"),
    }[where];
    const button = find?.();
    if (button && !button.disabled) button.click();
  }

  /** The current way to play: a Last Signal series kind, or a Blackout
   * Protocol shift plus the night-shift modifier. */
  current() {
    const g = this.g,
      shift = shiftChoice(g.shift);
    if (g.mode === "signal") return seriesKindOf(g.seriesKind);
    if (shift !== "full") return shift;
    return modifierChoice(g.modifier) === "night-shift" ? "night" : "lifeline";
  }

  /** Play was pressed before choosing: show the game choice and say so. */
  askForGame() {
    const step = this.cards.querySelector("#mf-step1");
    this.openPicker();
    this.gamePick.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    this.gamePick.classList.remove("mf-ask");
    void this.gamePick.offsetWidth;
    this.gamePick.classList.add("mf-ask");
    step.textContent = "";
    step.insertAdjacentHTML("beforeend", "<b>1</b>Choose a game to play");
    this.gamePick.querySelector("button")?.focus({ preventScroll: true });
  }

  /** The game-mode sheet (lobby layout): opened by Change or by Play. */
  openPicker() {
    this.cards.classList.add("mf-open");
    this.modal.classList.add("mf-picking");
    (this.cards.querySelector('[aria-pressed="true"]') || this.gamePick.querySelector("button"))?.focus({ preventScroll: true });
  }
  closePicker() {
    if (!this.cards.classList.contains("mf-open")) return;
    this.cards.classList.remove("mf-open");
    this.modal.classList.remove("mf-picking");
    this.modeCard.querySelector(".mf-modechange")?.focus({ preventScroll: true });
  }

  /** The online room sheet (lobby layout): opened by Invite / Join. */
  openRoom() {
    if (!this.modal.classList.contains("mf-lobby")) return;
    this.refresh();
    this.modal.classList.add("mf-roomopen");
    const first = [...this.roomSlot.querySelectorAll("button, input, select")].find((n) => n.offsetParent && !n.disabled);
    (first || this.roomSheet.querySelector(".mf-roomclose")).focus({ preventScroll: true });
  }
  closeRoom() {
    if (!this.modal.classList.contains("mf-roomopen")) return;
    this.modal.classList.remove("mf-roomopen");
    this.modeCard.querySelector(".mf-roominvite")?.focus({ preventScroll: true });
  }

  /** The lobby ping chip: the room server's round trip, coloured by quality. */
  updatePing() {
    const g = this.g,
      show = !!g.online && !!g.netMeter && this.modal.classList.contains("mf-lobby") && g.state !== "playing";
    if (this.ping.hidden === show) this.ping.hidden = !show;
    if (this.modal.classList.contains("mf-pinged") !== show) this.modal.classList.toggle("mf-pinged", show);
    if (!show) return;
    const s = g.netMeter.stats(),
      q = networkQuality(s),
      text = Number.isFinite(s.ping) ? `${s.ping} ms` : "… ms";
    if (this.ping.dataset.tone !== q.tone) this.ping.dataset.tone = q.tone;
    const b = this.ping.querySelector("b");
    if (b.textContent !== text) b.textContent = text;
    const label = `Network: ${q.label}${Number.isFinite(s.ping) ? `, ${s.ping} milliseconds` : ""}. Open network check.`;
    if (this.ping.getAttribute("aria-label") !== label) this.ping.setAttribute("aria-label", label);
  }

  /** What the big button says: the game it will start, or the next step. */
  playLabel() {
    if (!this.gameChosen) return "CHOOSE A GAME ↓";
    return this.g.mode === "signal" ? "PLAY LAST SIGNAL →" : "PLAY BLACKOUT PROTOCOL →";
  }

  pick(mode) {
    const g = this.g;
    if (g.online || g.state === "playing") return;
    // Any pick (a game, a way to play, today's case) is a choice.
    if (!this.gameChosen) {
      this.gameChosen = true;
      this.cards.querySelector("#mf-step1").innerHTML = "<b>1</b>Choose a game";
      this.gamePick.classList.remove("mf-ask");
      try {
        localStorage.setItem("midnry-outpost-mode", mode === "signal" || Object.hasOwn(SERIES_KINDS, mode) ? "signal" : g.mode);
      } catch {}
      this.refresh();
    }
    if (mode === this.current()) return;
    // Step 1: switch game, keeping that game's last way to play.
    if (mode === "signal" || mode === "protocol") {
      if (g.mode === mode) return;
      g.mode = mode;
      try {
        localStorage.setItem("midnry-outpost-mode", g.mode);
      } catch {}
      g.reset();
      g.protocolUI?.refreshMenu();
      this.refresh();
      return;
    }
    // Step 2, Last Signal: single round or a series (a new series starts).
    if (Object.hasOwn(SERIES_KINDS, mode)) {
      this.closeAfterPick = true;
      g.mode = "signal";
      g.seriesKind = mode;
      g.series = null;
      try {
        localStorage.setItem("midnry-outpost-mode", g.mode);
        localStorage.setItem("midnry-outpost-series", mode);
      } catch {}
      g.reset();
      g.protocolUI?.refreshMenu();
      this.refresh();
      return;
    }
    g.mode = "protocol";
    this.closeAfterPick = true;
    try {
      localStorage.setItem("midnry-outpost-mode", g.mode);
    } catch {}
    const shift = mode === "quick" || mode === "daily" ? mode : "full";
    let modifier = modifierChoice(g.modifier);
    if (mode === "night") modifier = "night-shift";
    else if (modifier === "night-shift") modifier = "random";
    g.shift = shift;
    g.modifier = modifier;
    try {
      localStorage.setItem("midnry-outpost-shift", shift);
      localStorage.setItem("midnry-outpost-modifier", modifier);
    } catch {}
    const select = g.$(".mf-modifier");
    if (select) select.value = modifier;
    g.reset();
    g.protocolUI?.refreshMenu();
    this.refresh();
  }

  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.refresh();
    });
  }

  refresh() {
    const g = this.g;
    if (!this.top) return;
    const debrief = this.panel.classList.contains("mf-debrief");
    const home = !this.modal.hidden && !debrief && (g.mode === "protocol" || g.mode === "signal");
    this.modal.classList.toggle("mf-home", home);
    // The 3D lobby replaces the photo backdrop once the 3D renderer is up.
    const lobby = home && !!g.militaryLoaded && !g.militaryError;
    if (this.modal.classList.contains("mf-lobby") !== lobby) this.modal.classList.toggle("mf-lobby", lobby);
    // The room controls: in the lobby's room sheet, elsewhere where they were.
    if (this.network) {
      if (lobby && this.network.parentNode !== this.roomSlot) this.roomSlot.append(this.network);
      else if (!lobby && this.network.parentNode === this.roomSlot) this.netHome.after(this.network);
    }
    if (!lobby && this.modal.classList.contains("mf-roomopen")) this.modal.classList.remove("mf-roomopen");
    if (this.closeAfterPick) {
      this.closeAfterPick = false;
      this.closePicker();
    }
    const signal = g.mode === "signal";
    if (this.modal.dataset.mode !== g.mode) {
      this.modal.dataset.mode = g.mode;
      this.logoSub.innerHTML = signal ? "Last <span>Signal</span> · Solo showdown" : "Blackout <span>Protocol</span> · Lifeline Run";
    }
    if (!this.modal.hidden) g.shell.classList.remove("mf-hudon");
    if (!home) return;
    // Newcomers (fewer than two finished rounds) see a simpler home screen.
    const rounds = g.retention?.profile?.matches ?? 0,
      rookie = rounds < 2 && !g.online;
    if (this.modal.hasAttribute("data-rookie") !== rookie) this.modal.toggleAttribute("data-rookie", rookie);
    let trained = false;
    try {
      trained = !!localStorage.getItem("midnry-outpost-practice");
    } catch {}
    const welcome = rookie && rounds === 0 && !trained && !signal;
    if (this.welcome.hidden === welcome) this.welcome.hidden = !welcome;
    const game = signal ? "signal" : "protocol";
    if (this.variants.dataset.game !== game) {
      this.variants.dataset.game = game;
      this.variants.replaceChildren(
        ...VARIANTS[game].map((v) => {
          const button = el("button", "", `<b>${v.title}</b><small>${v.sub}</small>`);
          button.type = "button";
          button.dataset.variant = v.id;
          return button;
        }),
      );
    }
    const quick = this.variants.querySelector('[data-variant="quick"]');
    if (quick && quick.hasAttribute("data-start") !== (rookie && !signal)) quick.toggleAttribute("data-start", rookie && !signal);
    const profile = g.retention?.profile;
    const name = g.playerName || "Operator";
    const level = profile ? levelOf(profile) : 1,
      xp = profile?.xp || 0,
      progress = `${((xp % 150) / 150) * 100}%`;
    const text = (node, value) => {
      if (node && node.textContent !== value) node.textContent = value;
    };
    text(this.modal.querySelector(".mf-chipname"), name);
    text(this.modal.querySelector(".mf-chiplevel"), `LV ${level}`);
    // Operator card: your Locker character, its tagline and your level.
    const hero = characterOf(g.character);
    text(this.leftCards.querySelector(".mf-opname"), hero.name);
    text(this.leftCards.querySelector(".mf-optag"), hero.role);
    text(this.leftCards.querySelector(".mf-oplv"), `Level ${level}`);
    text(this.leftCards.querySelector(".mf-opxp"), `${(xp % 150).toLocaleString()} / 150 XP`);
    this.leftCards.querySelector(".mf-emblem").style.color = hero.accent;
    this.leftCards.querySelector(".mf-xpbar").setAttribute("aria-valuenow", String(Math.round(((xp % 150) / 150) * 100)));
    for (const bar of this.modal.querySelectorAll(".mf-xpbar i")) bar.style.width = progress;
    // Daily challenges.
    let daily = [];
    try {
      daily = g.retention?.challengeStatus().daily || [];
    } catch {}
    const list = this.modal.querySelector(".mf-challenges ul");
    list.replaceChildren(
      ...daily.map((c) => {
        const li = el("li", c.done ? "done" : "");
        li.append(el("i"), document.createTextNode(c.text), el("span", "", `${Math.min(c.progress, c.goal)}/${c.goal}`));
        return li;
      }),
    );
    this.modal.querySelector(".mf-chcount").textContent = `${daily.filter((c) => c.done).length}/${daily.length || 3}`;
    // Today's case.
    const best = readDaily()[dailyKey()];
    const board = cachedBoard(),
      rank = board?.you ? ` · #${board.you.rank} of ${board.total}` : board?.total ? ` · ${board.total} played` : "",
      note = (best ? "Your best today" : "Not played yet") + rank;
    if (this.side.querySelector(".mf-casenote").textContent !== note) this.side.querySelector(".mf-casenote").textContent = note;
    // Refresh the shared ranking now and then (refresh runs on menu changes).
    if (!this.boardAt || Date.now() - this.boardAt > 60000) {
      this.boardAt = Date.now();
      fetchBoard()
        .then(() => this.refresh?.())
        .catch(() => {});
    }
    this.side.querySelector(".mf-casescore").innerHTML = best ? `${best.score} <span>/ 1000</span>` : "Play now";
    // Mode cards: either game online or offline; in a room, the room's game.
    const online = Boolean(g.online || g.ui?.playChoice === "online");
    // Mid-match (paused) or in a room the game is locked.
    const locked = Boolean(g.online) || g.state === "playing";
    const now = this.current();
    this.cards.toggleAttribute("data-online", online);
    // Before the first choice nothing looks selected and step 2 waits.
    const unchosen = !this.gameChosen && !g.online;
    if (this.cards.hasAttribute("data-unchosen") !== unchosen) this.cards.toggleAttribute("data-unchosen", unchosen);
    for (const card of this.cards.querySelectorAll("button")) {
      const pressed =
        !unchosen &&
        (card.dataset.mode ? card.dataset.mode === game : card.dataset.variant === now);
      if (card.getAttribute("aria-pressed") !== String(pressed)) card.setAttribute("aria-pressed", String(pressed));
      card.disabled = locked;
      card.title = locked && !g.online ? "Finish or exit this round to change mode" : "";
    }
    this.side.querySelector(".mf-casecard").disabled = locked;
    const start = g.$(".mf-start");
    if (start && g.state === "fresh" && !online && start.textContent !== this.playLabel()) start.textContent = this.playLabel();
    if (this.playNext.hidden !== (online || g.state === "playing")) this.playNext.hidden = online || g.state === "playing";
    if (this.playNext.disabled !== Boolean(start?.disabled)) this.playNext.disabled = Boolean(start?.disabled);
    const chosen = online
      ? signal
        ? { title: "Online room", sub: "Friends + bots · 8 fighters · next arena each rematch" }
        : MODES.find((m) => m.id === "lifeline")
      : MODES.find((m) => m.id === now);
    const series = signal && g.series?.rounds.length && !g.series.done ? ` · round ${g.series.round} next` : "";
    const summary = online || unchosen
      ? ""
      : `<b>${signal ? "Last Signal" : "Blackout Protocol"} · ${chosen.title}</b> · ${chosen.sub}${series}${g.state === "playing" ? " · in progress" : ""}`;
    if (this.summary.innerHTML !== summary) this.summary.innerHTML = summary;
    // Mode card: offline/online, the chosen game and way to play, Play.
    const onlineChoice = online;
    // Room controls take the challenges' place in the lobby.
    if (this.modal.classList.contains("mf-friends") !== online) this.modal.classList.toggle("mf-friends", online);
    for (const b of this.modeCard.querySelectorAll("[data-playwith]"))
      b.setAttribute("aria-pressed", String((b.dataset.playwith === "online") === onlineChoice));
    const gameName = unchosen ? "Choose a game" : signal ? "Last Signal" : "Blackout Protocol";
    const sub = unchosen
      ? "Blackout Protocol or Last Signal"
      : onlineChoice
        ? `${signal ? "8 fighters" : "Lifeline Run · 8 players"} · Friends + bots`
        : `${chosen.title} · ${chosen.sub.replace(/^One round · /, "")}${series}`;
    const set = (sel, value, root = this.modeCard) => text(root.querySelector(sel), value);
    // Lobby title: PLAY / ONLINE (or OFFLINE) over the game, last word in gold.
    set(".mf-lobbykicker span", onlineChoice ? "Online" : "Offline", this.lobbyTitle);
    const words = (unchosen ? "Outpost Zero" : gameName).split(" "),
      nameHtml = `${words.slice(0, -1).join(" ")} <em>${words.at(-1)}</em>`;
    const lobbyName = this.lobbyTitle.querySelector(".mf-lobbyname");
    if (lobbyName.innerHTML !== nameHtml) lobbyName.innerHTML = nameHtml;
    const long = words.join(" ").length > 12;
    for (const node of [lobbyName, this.modeCard.querySelector(".mf-modetitle")])
      if (node.hasAttribute("data-long") !== long) node.toggleAttribute("data-long", long);
    set(".mf-modetitle", gameName);
    set(".mf-modesub", sub);
    // In a room the room's game is fixed: the row only shows it.
    const change = this.modeCard.querySelector(".mf-modechange"),
      fixed = String(Boolean(g.online));
    if (change.getAttribute("aria-disabled") !== fixed) change.setAttribute("aria-disabled", fixed);
    const changeLabel = g.online ? `${gameName}, the room's game` : `${gameName}. Change game mode`;
    if (change.getAttribute("aria-label") !== changeLabel) change.setAttribute("aria-label", changeLabel);
    // Friends: the room code with copy, and invite (or join) in the sheet.
    const roomLine = this.modeCard.querySelector(".mf-roomline");
    if (roomLine.hidden === onlineChoice) roomLine.hidden = !onlineChoice;
    set(".mf-roomid", g.online?.code || "None yet");
    this.modeCard.querySelector(".mf-roomcopy").hidden = !g.online;
    set(".mf-roominvite span", g.online ? "Invite friends" : "Join with code");
    // Copy feedback ("Invite copied.") shows on the card for a few seconds.
    const status = onlineChoice && Date.now() < (this.statusUntil || 0) ? g.$(".mf-netstatus")?.textContent || "" : "";
    set(".mf-modestatus", status);
    const play = this.modeCard.querySelector(".mf-modeplay");
    const label = (start?.textContent || "PLAY").replace(/\s*[→↓]$/, "").replace(/^PLAY (LAST SIGNAL|BLACKOUT PROTOCOL)$/, "PLAY");
    const creating = online && !g.online;
    set(".mf-modeplay > span", unchosen ? "Choose a game" : creating ? "Create room" : /^(PLAY|DEPLOY)$/i.test(label) ? "Start match" : label);
    const playOff = creating ? Boolean(g.connecting) : Boolean(start?.disabled);
    if (play.disabled !== playOff) play.disabled = playOff;
    this.modeCard.hidden = g.state === "playing";
    this.squad.hidden = g.state === "playing" || !lobby;
    // A room link opens the sheet once, with the code ready to join.
    if (this.roomLink && lobby && onlineChoice && !g.online) {
      this.roomLink = false;
      requestAnimationFrame(() => this.openRoom());
    }
    // Friends in your room stand on the pads: their name instead of "+".
    const mates = g.online?.phase === "lobby" ? (g.online.members || []).filter((m) => m.id !== g.selfId) : [];
    text(this.squad.querySelector('[data-pad="0"]'), hero.name);
    this.squad.querySelectorAll("[data-invite]").forEach((button, i) => {
      const mate = mates[i],
        label = this.squad.querySelector(`[data-pad="${i + 1}"]`);
      if (button.hidden !== !!mate) button.hidden = !!mate;
      text(label, mate ? mate.name : "");
      if (label.hidden !== !mate) label.hidden = !mate;
    });
    this.summary.hidden = !summary;
    const midMatch = g.state === "playing" && !g.deathSequence;
    if (this.matchbar.hidden !== !midMatch) this.matchbar.hidden = !midMatch;
    const restart = this.matchbar.querySelector(".mf-restartmatch");
    if (restart.hidden !== Boolean(g.online)) restart.hidden = Boolean(g.online);
    // Mirror the original buttons' availability.
    for (const proxy of this.modal.querySelectorAll("[data-go]")) {
      const where = proxy.dataset.go;
      if (where === "home" || where === "training") continue;
      const original = {
        locker: ".mf-lockeropen",
        settings: ".mf-graphics",
        guide: ".mf-protocol-menu > button:not(.mf-practice-start)",
        practice: ".mf-practice-start",
        device: ".mf-compat-open",
        exit: ".mf-exit",
      }[where];
      const button = original && g.$(original);
      // Only write real changes: the panel is observed, so a no-op write would loop.
      const hidden = !button || button.hidden || (where === "practice" && online);
      if (proxy.hidden !== hidden) proxy.hidden = hidden;
      if (proxy.disabled !== Boolean(button?.disabled)) proxy.disabled = Boolean(button?.disabled);
    }
    this.updatePing();
    this.fitStage();
  }

  /** Phones: the 3D stage takes the height left on the first screen once
   * the header, title, today's case, operator and Play cards and the tab
   * bar have theirs, so Start match stays in view. */
  fitStage() {
    const stage = this.stageBox;
    if (!stage.isConnected || getComputedStyle(stage).position === "absolute" || !this.modal.classList.contains("mf-lobby")) {
      if (stage.style.height) stage.style.height = "";
      return;
    }
    const nav = this.top.querySelector("nav"),
      parts = [this.top, this.lobbyTitle, this.side.querySelector(".mf-casecard"), this.leftCards.querySelector(".mf-opcard"), this.modeCard],
      used = parts.reduce((sum, node) => sum + (node.offsetHeight || 0), 0) + (getComputedStyle(nav).position === "fixed" ? nav.offsetHeight : 0),
      gap = parseFloat(getComputedStyle(this.modal).rowGap) || 0,
      height = `${Math.round(Math.max(200, Math.min(460, this.modal.clientHeight - used - gap * parts.length - 8)))}px`;
    if (stage.style.height !== height) stage.style.height = height;
  }

  dispose() {
    this.observer?.disconnect();
    this.panelObserver?.disconnect();
    clearInterval(this.pingTimer);
    this.resizer?.disconnect();
    if (this.network && this.netHome?.parentNode) this.netHome.after(this.network);
    this.netHome?.remove();
    for (const node of [this.style, this.hero, this.top, this.side, this.cards, this.actions, this.foot, this.logoSub, this.summary, this.matchbar, this.leftCards, this.modeCard, this.squad, this.lobbyTitle, this.stageBox, this.roomSheet]) node?.remove();
    this.modal?.classList.remove("mf-home", "mf-lobby", "mf-picking", "mf-roomopen");
  }
}
