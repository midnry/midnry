/** The home screen: cinematic key art, the existing menu controls in a left
 * column, a profile / challenges / daily-case column on the right and mode
 * cards along the bottom. It only arranges and mirrors existing controls;
 * every action still runs through the original buttons and settings. */
import { icon } from "./outpost-icons.js";
import { levelOf } from "./outpost-progression.js";
import { readDaily } from "./outpost-protocol-ui.js";
import { dailyKey, shiftChoice } from "./outpost-shifts.js";
import { modifierChoice } from "./outpost-variety.js";

const MODES = [
  { id: "lifeline", title: "Lifeline Run", sub: "Full shift · 8 players", art: "card-lifeline.webp" },
  { id: "quick", title: "Quick shift", sub: "5 players · 4 min", art: "card-quick.webp" },
  { id: "night", title: "Night shift", sub: "After dark", art: "card-night.webp" },
  { id: "daily", title: "Daily case", sub: "Same for everyone", art: "card-daily.webp" },
];

const CSS = `
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
midnry-fps .mf-modal.mf-home .mf-network { margin: 0 !important; border-radius: 3px !important; background: #0c1210e6 !important; border: 1px solid #ffffff24 !important; }

/* Right column */
midnry-fps .mf-homeside { position: absolute; right: 32px; top: 84px; width: 340px; display: flex; flex-direction: column; gap: 12px; z-index: 1; }
midnry-fps .mf-card { position: relative; border: 1px solid #ffffff1f; border-radius: 4px; background: #0a0f0dd9; backdrop-filter: blur(6px); color: #e9efe9; }
midnry-fps .mf-card h3 { margin: 0; font: 600 14px var(--mf-display); letter-spacing: 0.14em; text-transform: uppercase; color: #aeb9b2; }
midnry-fps .mf-opcard { padding: 16px 18px 18px; overflow: hidden; }
midnry-fps .mf-opcard strong { display: block; margin: 4px 0 8px; font: 800 34px/1 var(--mf-display); text-transform: uppercase; letter-spacing: 0.02em; }
midnry-fps .mf-opcard p { margin: 0 0 10px; font: 600 14px var(--mf-display); letter-spacing: 0.08em; color: #c7d0ca; }
midnry-fps .mf-opcard .mf-xpbar { width: 100%; height: 4px; }
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

/* Bottom mode cards */
midnry-fps .mf-playlists { position: absolute; left: 424px; right: 32px; bottom: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; z-index: 1; }
midnry-fps .mf-playlists button { all: unset; cursor: pointer; position: relative; height: 138px; border: 1px solid #ffffff24; border-radius: 4px; overflow: hidden; background: #0b100e center / cover no-repeat; box-shadow: 0 10px 28px #0008; }
midnry-fps .mf-playlists button::before { content: ""; position: absolute; inset: 0; background: linear-gradient(0deg, #050706f2 8%, #05070600 72%); }
midnry-fps .mf-playlists button > span { position: absolute; left: 14px; right: 34px; bottom: 12px; }
midnry-fps .mf-playlists b { display: block; font: 800 21px/1 var(--mf-display); letter-spacing: 0.03em; text-transform: uppercase; color: #f1f4ef; }
midnry-fps .mf-playlists small { display: flex; white-space: nowrap; align-items: center; gap: 8px; margin-top: 6px; font: 400 13px var(--mf-body); color: #c3ccc6; }
midnry-fps .mf-playlists small::before { content: ""; width: 16px; height: 2px; background: #ffffff66; }
midnry-fps .mf-playlists .mf-ico { position: absolute; right: 12px; bottom: 16px; width: 18px; height: 18px; color: #e9efe9; }
midnry-fps .mf-playlists button[aria-pressed="true"] { border: 2px solid var(--mf-accent); }
midnry-fps .mf-playlists button[aria-pressed="true"] small::before { background: var(--mf-accent); }
midnry-fps .mf-playlists button:hover:not(:disabled), midnry-fps .mf-playlists button:focus-visible { border-color: #ffffff88; }
midnry-fps .mf-playlists button[aria-pressed="true"]:is(:hover, :focus-visible) { border-color: var(--mf-accent); }
midnry-fps .mf-playlists button:disabled { cursor: default; }
midnry-fps .mf-playlists button:disabled:not([aria-pressed="true"]) { filter: grayscale(0.7) brightness(0.6); }
midnry-fps .mf-playlists[data-online] button:not([aria-pressed="true"]) { display: none; }

/* Apple HIG: visible keyboard focus on every custom control, no motion when
   the system asks for less, and selection never shown by colour alone. */
midnry-fps :is(.mf-hometop nav button, .mf-playlists button, .mf-casecard, .mf-settingsnav button, .mf-homeactions button, .mf-homefoot button):focus-visible { outline: 2px solid var(--mf-accent) !important; outline-offset: 2px; }
midnry-fps .mf-playlists button[aria-pressed="true"]::after { content: "Selected"; position: absolute; top: 10px; left: 10px; padding: 3px 8px; border-radius: 2px; background: var(--mf-accent); color: var(--mf-accent-ink); font: 700 12px var(--mf-display); letter-spacing: 0.08em; text-transform: uppercase; }
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

/* Short or narrow screens: one scrolling column. */
@media (max-width: 1100px), (max-height: 640px) {
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
  midnry-fps .mf-playlists { position: relative; left: auto; right: auto; bottom: auto; margin: 16px 16px 0; grid-template-columns: repeat(2, 1fr); }
  midnry-fps .mf-playlists button { height: 112px; }
  midnry-fps .mf-homeside { position: relative; right: auto; top: auto; width: auto; margin: 16px 16px calc(24px + var(--mf-safe-bottom, 0px)); }
  midnry-fps .mf-homefoot { margin-top: 4px; }
}
@media (max-width: 640px) {
  midnry-fps .mf-logosub { letter-spacing: 0.2em; font-size: 13px; }
  midnry-fps .mf-profilechip small .mf-xpbar { display: none; }
  midnry-fps .mf-playlists b { font-size: 18px; }
  midnry-fps .mf-playlists button > span { left: 10px; right: 26px; bottom: 10px; }
  midnry-fps .mf-playlists .mf-ico { right: 8px; }
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
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(this.modal, { attributes: true, attributeFilter: ["hidden"] });
    this.observer.observe(this.panel, { attributes: true, attributeFilter: ["class"], subtree: false });
    this.observer.observe(this.panel, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-pressed", "disabled"] });
    this.refresh();
  }

  build() {
    const g = this.g;
    this.hero = el("div", "mf-hero");
    this.top = el(
      "header",
      "mf-hometop",
      `<span class="mf-wordmark">OUTPOST ZERO</span><nav aria-label="Menu"><button type="button" aria-current="page" data-go="home">Home</button><button type="button" data-go="locker">Locker</button><button type="button" data-go="guide">How to play</button><button type="button" data-go="practice">Practice</button><button type="button" data-go="settings">Settings</button></nav><div class="mf-profilechip"><span class="mf-avatar">${icon("helmet")}</span><span><b class="mf-chipname"></b><small><span class="mf-chiplevel"></span><span class="mf-xpbar"><i></i></span></small></span></div>`,
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
    // Say what Play starts, so the choice below is never a surprise.
    this.summary = el("p", "mf-playsummary");
    this.summary.setAttribute("aria-live", "polite");
    this.panel.querySelector(".mf-start")?.after(this.summary);
    this.summary.after(this.actions);
    this.foot = el(
      "div",
      "mf-homefoot",
      `<button type="button" data-go="device">${icon("chip")}Device check</button><button type="button" class="mf-homeexit" data-go="exit">${icon("exit")}Exit game</button>`,
    );
    this.panel.append(this.foot);
    // Right column.
    this.side = el(
      "aside",
      "mf-homeside",
      `<section class="mf-card mf-opcard"><h3>Operator</h3><strong class="mf-opname"></strong><p class="mf-oplevel"></p><span class="mf-xpbar"><i></i></span></section><section class="mf-card mf-challenges"><header><h3>Daily challenges<b class="mf-chcount"></b></h3></header><ul></ul></section><button type="button" class="mf-casecard" data-mode="daily"><img src="menu/card-daily.webp" alt=""><span><small>Today's case</small><em class="mf-casenote"></em><strong class="mf-casescore"></strong></span>${icon("chevron")}</button>`,
    );
    this.modal.append(this.side);
    // Bottom mode cards.
    this.cards = el("div", "mf-playlists");
    this.cards.setAttribute("role", "group");
    this.cards.setAttribute("aria-label", "Choose a mode");
    for (const mode of MODES) {
      const card = el("button", "", `<span><b>${mode.title}</b><small>${mode.sub}</small></span>${icon("chevron")}`);
      card.type = "button";
      card.dataset.mode = mode.id;
      card.style.backgroundImage = `url("menu/${mode.art}")`;
      this.cards.append(card);
    }
    this.modal.append(this.cards);
    const go = (event) => {
      const target = event.target.closest("[data-go]");
      if (target) this.go(target.dataset.go);
      const mode = event.target.closest("[data-mode]");
      if (mode && !mode.disabled) this.pick(mode.dataset.mode);
    };
    for (const node of [this.top, this.actions, this.foot, this.side, this.cards]) g.on(node, "click", go);
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

  /** The current card: shift plus the night-shift modifier. */
  current() {
    const g = this.g,
      shift = shiftChoice(g.shift);
    if (shift !== "full") return shift;
    return modifierChoice(g.modifier) === "night-shift" ? "night" : "lifeline";
  }

  pick(mode) {
    const g = this.g;
    if (g.online || g.state === "playing" || mode === this.current()) return;
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
    const home = !this.modal.hidden && !debrief && g.mode === "protocol";
    this.modal.classList.toggle("mf-home", home);
    if (!this.modal.hidden) g.shell.classList.remove("mf-hudon");
    if (!home) return;
    const profile = g.retention?.profile;
    const name = g.playerName || "Operator";
    const level = profile ? levelOf(profile) : 1,
      xp = profile?.xp || 0,
      progress = `${((xp % 150) / 150) * 100}%`;
    for (const node of this.modal.querySelectorAll(".mf-chipname, .mf-opname")) node.textContent = name;
    this.modal.querySelector(".mf-chiplevel").textContent = `LV ${level}`;
    this.modal.querySelector(".mf-oplevel").textContent = `Level ${level} · ${xp.toLocaleString()} XP`;
    for (const bar of this.modal.querySelectorAll(".mf-xpbar i")) bar.style.width = progress;
    // Daily challenges.
    let daily = [];
    try {
      daily = g.retention?.challengeStatus().daily || [];
    } catch {}
    const list = this.side.querySelector(".mf-challenges ul");
    list.replaceChildren(
      ...daily.map((c) => {
        const li = el("li", c.done ? "done" : "");
        li.append(el("i"), document.createTextNode(c.text), el("span", "", `${Math.min(c.progress, c.goal)}/${c.goal}`));
        return li;
      }),
    );
    this.side.querySelector(".mf-chcount").textContent = `${daily.filter((c) => c.done).length}/${daily.length || 3}`;
    // Today's case.
    const best = readDaily()[dailyKey()];
    this.side.querySelector(".mf-casenote").textContent = best ? "Your best today" : "Not played yet";
    this.side.querySelector(".mf-casescore").innerHTML = best ? `${best.score} <span>/ 1000</span>` : "Play now";
    // Mode cards: offline picks the mode; online shows the room's mode only.
    const online = Boolean(g.online || g.ui?.playChoice === "online");
    // Mid-match (paused) the mode is locked: changing it would restart the round.
    const locked = online || g.state === "playing";
    const now = this.current();
    this.cards.toggleAttribute("data-online", online);
    for (const card of this.cards.children) {
      card.setAttribute("aria-pressed", String(card.dataset.mode === (online ? "lifeline" : now)));
      card.disabled = locked;
      card.title = locked && !online ? "Finish or exit this round to change mode" : "";
    }
    this.side.querySelector(".mf-casecard").disabled = locked;
    const chosen = MODES.find((m) => m.id === (online ? "lifeline" : now));
    const summary = online ? "" : `<b>${chosen.title}</b> · ${chosen.sub}${g.state === "playing" ? " · in progress" : ""}`;
    if (this.summary.innerHTML !== summary) this.summary.innerHTML = summary;
    this.summary.hidden = !summary;
    // Mirror the original buttons' availability.
    for (const proxy of this.modal.querySelectorAll("[data-go]")) {
      const where = proxy.dataset.go;
      if (where === "home") continue;
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
  }

  dispose() {
    this.observer?.disconnect();
    for (const node of [this.style, this.hero, this.top, this.side, this.cards, this.actions, this.foot, this.logoSub, this.summary]) node?.remove();
    this.modal?.classList.remove("mf-home");
  }
}
