/**
 * Blackout Protocol presentation and accessible controls.
 * All objectives, votes, cooldowns and arming checks belong to the shared
 * simulation. This module reads ONLY the recipient-safe view and sends inputs.
 */
import { modifierOf, twistOf } from "./outpost-variety.js";
import { shareSummary, shareResult, whatsappUrl } from "./outpost-share.js";
import { MissionTaskPanel } from "./outpost-task-ui.js";
import { INTERACTIVE_TASKS } from "./outpost-task-games.js";
import { ProtocolFocus } from "./outpost-protocol-focus.js";
import { protocolView } from "./outpost-protocol.js";
import { PROTOCOL_MAP, TRANSPORT_MAP } from "./outpost-protocol-map.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const countdown = (seconds) => {
  const remaining = Math.max(0, Math.ceil(seconds || 0));
  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
};
const setText = (element, text) => {
  const value = String(text ?? "");
  if (element.textContent !== value) element.textContent = value;
};
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const GUIDE = [
  [
    "Lifeline Run / two phases",
    "Win one of two ways: deliver medical aid to the wounded before they all die, or find the infiltrators and vote every one of them out. First gather the medical items at Breakwater Forward Base (usually 13: trauma kits, surgical packs, IV fluids and recovery supplements). Cabinets are restocked differently every round, so follow the arrow and the manifest in Info. Carry one item at a time to the hangar loading pad, then board the medevac, fly to the casualty station and deliver. Every match also has a modifier and a twist, shown in your orders.",
  ],
  [
    "Operators: deliver aid before patients die",
    "At a stocked cabinet, press E or tap Check equipment. Each check is a quick skill test: stop a sweeping needle in the green band, type a batch code that flashes for a moment, or repeat a wire sequence. A miss costs a second and deals a new one. Stay put until the cycle finishes. Watch the remote vitals in Info; patients only fade while the base is working, not during meetings.",
  ],
  [
    "Recover a sabotaged aircraft",
    "Aboard, complete the aircraft duties in Info: open the oxygen valve and set the gauge, secure the trauma packs, and type back the landing beacon code. If autopilot fails (sabotage or the Turbulence twist), take the cockpit helm: W/S sets altitude, A/D steers. Hold both gauges in their safe bands for three seconds, restore autopilot, then release the helm.",
  ],
  [
    "Infiltrators: stop the rescue",
    "One or two infiltrators wear the same uniforms as everyone else; your partner is named in your orders. You win if you eliminate operators until your side matches theirs, if three base charges detonate, or if the patients die. Blend in: fake checks at wall panels, cut the power or jam communications, and use maintenance hatches. Careful: a real pickup visibly removes a case from its cabinet. Sharp operators notice when someone 'works' and nothing changes.",
  ],
  [
    "Base charges and concealed routes",
    "At the base, a concealed socket takes eight seconds of stationary planting, then a three-digit arming-code challenge within twenty seconds. Three sockets in three different rooms start a 75-second countdown. A nearby discovered charge can be disabled with a six-second hold. Charges remain a dangerous base sabotage; abandoned charges cannot follow the mission onto the aircraft. Maintenance hatches allow linked repositioning where available.",
  ],
  [
    "Witnesses and radio meetings",
    "Report a nearby fallen operator with F or Report body. Press C or use Info → Emergency radio to call from anywhere with working communications. If jammed, use the wired emergency console or restore communications. Each player gets one emergency call. Meetings allow fifteen seconds of discussion and fifteen seconds to vote. Patient vitals and the flight pause during meetings and Last Stand; new meetings are blocked while autopilot is disengaged during flight. More than half the living patrol must vote for one suspect. The accused fights every other survivor after a five-second preparation. Ties and Skip return to the rescue. A 90-second limit prevents hiding indefinitely; expiry forfeits the accused. Combat eliminations are permanent. Unless the host turns it off, the patrol learns whether a removed player was an infiltrator. Operators win the moment every infiltrator is stopped; infiltrators win once they equal the remaining crew.",
  ],
  [
    "Controls",
    "On foot: WASD / left joystick moves; mouse / right-side drag or arrow keys aims. Hold E / the contextual action button to collect, load, depart, repair, sabotage or deliver. F reports, C calls a meeting, X eliminates as an infiltrator, and B opens tactics. At the helm, WASD controls the aircraft and walking is disabled; use the Release helm button to leave the seat. Escape or P opens the menu. Weapons unlock only during Last Stand: click / Space or the touch Fire button shoots; R reloads. After elimination, watch surviving players through their first-person viewpoints. Use Left / Right arrows, [ / ], or the Previous / Next touch buttons to switch. Observation never allows tasks, voting or radio messages. Radio discussion uses text.",
  ],
];

export class ProtocolUI {
  constructor(g) {
    this.g = g;
    this.sequence = 0;
    this.actions = [];
    this.held = false;
    this.lastUpdate = 0;
    this.taskKey = "";
    this.meetingKey = "";
    this.voteKey = "";
    this.messageKey = "";
    this.view = null;
    this.disposed = false;
    this.flightTouch = new Map();
    this.originalHelp = g.$(".mf-help")?.innerHTML;
    this.originalWeaponLabel = g.$(".mf-weaponselect")?.closest("label")?.firstChild?.textContent;
    this.originalMapLabel = g.$(".mf-mapselect")?.closest("label")?.firstChild?.textContent;
    const descriptionId = g.shell.getAttribute("aria-describedby");
    this.description = descriptionId ? g.root.querySelector(`[id="${descriptionId}"]`) : null;
    this.originalDescription = this.description?.textContent;
    this.originalShellLabel = g.shell.getAttribute("aria-label");
    g.rolePreference ||= "operator";
    this.build();
    this.bind();
    this.focus = new ProtocolFocus(g, this);
    this.taskPanel = new MissionTaskPanel(this);
    this.combatStats = element("div", "mf-protocol-combatstats");
    this.combatStats.hidden = true;
    this.combatStats.setAttribute("role", "status");
    g.shell.append(this.combatStats);
    // After Last Stand: who was removed and, if the host allows, what they were.
    this.verdict = element("div", "mf-protocol-verdict");
    this.verdict.hidden = true;
    this.verdict.setAttribute("role", "status");
    this.verdict.setAttribute("aria-live", "assertive");
    g.shell.append(this.verdict);
    this.combatMarker = element("div", "mf-protocol-combattarget");
    this.combatMarker.hidden = true;
    this.combatMarker.setAttribute("aria-hidden", "true");
    g.shell.append(this.combatMarker);
    this.refreshMenu();
  }

  build() {
    const g = this.g;
    this.style = element("style");
    // Every selector is scoped to this game; [hidden] takes priority over layout.
    this.style.textContent = `
      midnry-fps .mf-protocol :is(.mf-super,.mf-ammo,.mf-bottom,.mf-fire,.mf-reload,.mf-match,.mf-objective) { display:none !important; }
      midnry-fps .mf-protocol-combat :is(.mf-fire,.mf-reload) { display:flex !important;align-items:center;justify-content:center; }
      midnry-fps .mf-protocol-combat :is(.mf-protocol-actions,.mf-protocol-context,.mf-protocol-flight,.mf-protocol-flightpad) { display:none !important; }
      midnry-fps .mf-protocol-combattarget { position:absolute;z-index:4;transform:translate(-50%,-100%);padding:4px 8px;border:1px solid #dc9b83;border-radius:8px;background:#472f26df;color:#ffe7d6;font:700 11px system-ui;max-width:170px;pointer-events:none; }
      midnry-fps .mf-protocol-combat .mf-fire { width:64px;height:64px;right:calc(18px + var(--mf-safe-right));bottom:calc(18px + var(--mf-safe-bottom));font-size:12px; }
      midnry-fps .mf-protocol-combat .mf-reload { width:44px;height:44px;right:calc(28px + var(--mf-safe-right));bottom:calc(94px + var(--mf-safe-bottom)); }
      midnry-fps .mf-protocol-awards { display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:12px 0; }
      midnry-fps .mf-protocol-award { display:grid;gap:2px;padding:10px 12px;border:2px solid #9fb09a66;border-radius:12px;background:#15221ce6;color:#eef4ea;font-size:13px; }
      midnry-fps .mf-protocol-award small { color:#b9c7b6;font-size:11px; }
      midnry-fps .mf-protocol-awardicon { font-size:20px; }
      midnry-fps .mf-protocol-timeline { margin:10px 0;font-size:13px; }
      midnry-fps .mf-protocol-timeline ol { margin:8px 0 0;padding-left:0;list-style:none;max-height:220px;overflow:auto;display:grid;gap:4px; }
      midnry-fps .mf-protocol-timeline time { display:inline-block;min-width:44px;color:#9fb09a;font-variant-numeric:tabular-nums; }
      midnry-fps .mf-protocol-timeline li[data-kind="kill"] { color:#ffb4a3; }
      midnry-fps .mf-protocol-timeline li[data-kind="sabotage"] { color:#ffd58a; }
      midnry-fps .mf-protocol-briefmatch { list-style:none;margin:12px 0;padding:0;display:grid;gap:8px; }
      midnry-fps .mf-protocol-briefmatch li { padding:9px 12px;border:1px solid #c9b77a66;border-radius:12px;background:#2a2a1aa8;color:#f3eedc;font-size:13px;line-height:1.4; }
      midnry-fps .mf-protocol-briefmatch b { display:block;color:#ffd77a;font-size:12px;letter-spacing:.06em;text-transform:uppercase; }
      midnry-fps .mf-protocol-matchline { display:block;margin-top:3px;color:#ffd77a;font-size:11px;font-weight:700; }
      midnry-fps .mf-protocol-verdict { position:absolute;z-index:7;left:50%;top:28%;transform:translateX(-50%);width:min(520px,calc(100% - 32px));padding:16px 20px;text-align:center;border:2px solid #b9c7a9;border-radius:16px;background:#14211dee;color:#f1f5ea;font:800 18px/1.35 system-ui;pointer-events:none;box-shadow:0 18px 50px #000a;animation:mf-verdict-in .35s ease-out; }
      midnry-fps .mf-protocol-verdict.mf-verdict-caught { border-color:#ef8d6b;background:#3d1f17ef;color:#ffe9dd; }
      midnry-fps .mf-protocol-verdict.mf-verdict-innocent { border-color:#9fb6d6;background:#17223aef;color:#e4edff; }
      @keyframes mf-verdict-in { from { opacity:0;transform:translate(-50%,10px) scale(.96); } to { opacity:1;transform:translate(-50%,0) scale(1); } }
      @media (prefers-reduced-motion: reduce) { midnry-fps .mf-protocol-verdict { animation:none; } }
      midnry-fps .mf-protocol-combatstats { position:absolute;z-index:6;right:calc(14px + var(--mf-safe-right));bottom:calc(148px + var(--mf-safe-bottom));padding:8px 12px;max-width:230px;background:#16231fe6;border:1px solid #bfc5ab66;border-radius:12px;color:#f1f3e7;font:700 12px system-ui;pointer-events:none; }
      @media(pointer:fine) and (min-width:701px) { midnry-fps .mf-protocol-combat :is(.mf-fire,.mf-reload) { display:none !important; } midnry-fps .mf-protocol-combatstats { bottom:20px; } }
      midnry-fps .mf-protocol .mf-modes { grid-template-columns:repeat(2,minmax(0,1fr)); }
      midnry-fps .mf-protocol [hidden], midnry-fps .mf-protocol-dialog [hidden], midnry-fps .mf-protocol-menu[hidden], midnry-fps .mf-protocol-results[hidden] { display:none !important; }
      midnry-fps .mf-protocol-hud { position:absolute;z-index:4;top:86px;left:24px;width:290px;pointer-events:none;color:#f2f5f3; }
      midnry-fps .mf-protocol-hud>* { pointer-events:auto; }
      midnry-fps .mf-protocol-role, midnry-fps .mf-protocol-tasks, midnry-fps .mf-protocol-context, midnry-fps .mf-protocol-tactics { border:1px solid #a8b7ac55;border-radius:16px;background:#14221fec;box-shadow:0 7px 22px #0005; }
      midnry-fps .mf-protocol-role { width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;min-height:48px;color:#f4f7f2;text-align:left; }
      midnry-fps .mf-protocol-role b { display:block;font-size:14px;letter-spacing:.02em; }
      midnry-fps .mf-protocol-role small { display:block;font-size:11px;font-weight:500;color:#ccd8cf; }
      midnry-fps .mf-protocol-clock { font-variant-numeric:tabular-nums;font-size:14px; }
      midnry-fps .mf-protocol-alert { margin:8px 0;padding:9px 12px;border-radius:12px;background:#332523f2;border:1px solid #d79875;color:#ffe1c9;font-size:12px;line-height:1.5; }
      midnry-fps .mf-protocol-tasks { margin-top:8px;overflow:hidden; }
      midnry-fps .mf-protocol-tasks summary { min-height:44px;padding:12px 13px;cursor:pointer;font-size:13px; }
      midnry-fps .mf-protocol-tasklist { padding:0 8px 8px;display:grid;gap:4px; }
      midnry-fps .mf-protocol-task { width:100%;min-height:44px;padding:7px 8px;text-align:left;border-radius:9px;background:#ffffff08;color:#eef4ef;border:1px solid transparent; }
      midnry-fps .mf-protocol-task small { display:block;color:#b2c4b8;font-size:11px;line-height:1.5; }
      midnry-fps .mf-protocol-task[aria-pressed="true"] { border-color:#96d7b2;background:#b4f8c819; }
      midnry-fps .mf-protocol-task:disabled { opacity:.6;text-decoration:line-through; }
      midnry-fps .mf-protocol-context { position:absolute;z-index:4;bottom:108px;left:50%;transform:translateX(-50%);width:min(390px,calc(100% - 48px));padding:12px 15px;color:#f0f6ef;pointer-events:none;text-align:center; }
      midnry-fps .mf-protocol-context b { display:block;font-size:14px; }
      midnry-fps .mf-protocol-context p { margin:5px 0 0;font-size:12px;color:#c2d2c7;line-height:1.4; }
      midnry-fps .mf-protocol-progress { margin-top:9px;height:5px;border-radius:4px;background:#667b6a55;overflow:hidden; }
      midnry-fps .mf-protocol-progress i { display:block;height:100%;width:0;background:#c5e6ae; }
      midnry-fps .mf-protocol-actions { position:absolute;z-index:5;bottom:23px;right:24px;display:flex;gap:8px;max-width:calc(100% - 48px); }
      midnry-fps .mf-protocol-actions button { min-width:68px;min-height:54px;padding:8px 12px;border-radius:14px;border:1px solid #9cb5a077;background:#172720ef;color:#f2f6ef;touch-action:none;font-size:12px;line-height:1.25; }
      midnry-fps .mf-protocol-actions button small { display:block;margin-top:3px;font-size:10px;color:#bccbbe; }
      midnry-fps .mf-protocol-actions .mf-protocol-hold { min-width:128px;background:#d1e1b6;color:#152219;border-color:#e5f4d2;font-weight:700; }
      midnry-fps .mf-protocol-actions .mf-protocol-hold small { color:#304732; }
      midnry-fps .mf-protocol-actions .mf-protocol-eliminate { border-color:#d39c87;background:#442d25;color:#ffe3d3; }
      midnry-fps .mf-protocol-actions .mf-protocol-report { border-color:#eed0a0;background:#edd7ad;color:#241d14;font-weight:750; }
      midnry-fps .mf-protocol-actions button:disabled { opacity:.5;cursor:default; }
      midnry-fps .mf-protocol-actions button:active:not(:disabled),midnry-fps .mf-protocol-hold[aria-pressed="true"] { transform:scale(.97); }
      midnry-fps .mf-protocol-tactics { position:absolute;z-index:6;bottom:94px;right:24px;width:290px;max-width:calc(100% - 24px);padding:14px;color:#edf4ed; }
      midnry-fps .mf-protocol-tactics h3 { margin:0 0 8px;font-size:14px; }
      midnry-fps .mf-protocol-tactics p { font-size:12px;line-height:1.5;color:#bacdbf; }
      midnry-fps .mf-protocol-tactics button { width:100%;min-height:44px;margin:4px 0;border:1px solid #839c8866;border-radius:10px;background:#2a4031;color:#f3f7ef;padding:8px; }
      midnry-fps .mf-protocol-tactics button:disabled { opacity:.45; }
      midnry-fps .mf-protocol-dialog { width:min(620px,calc(100% - 32px));max-height:calc(100% - 32px);padding:22px;border:1px solid #8eaa9655;border-radius:24px;background:#14221f;color:#eff4ef;box-shadow:0 16px 70px #0009;font:inherit;overflow:auto; }
      midnry-fps .mf-protocol-dialog::backdrop { background:#040b0adb; }
      midnry-fps .mf-protocol-dialog h2 { margin:4px 0 12px;font-size:27px;letter-spacing:-.02em; }
      midnry-fps .mf-protocol-dialog h3 { margin:20px 0 8px;font-size:16px; }
      midnry-fps .mf-protocol-dialog p { font-size:14px;line-height:1.65;color:#c9d8cd; }
      midnry-fps .mf-protocol-guide canvas { display:block;max-width:100%;width:360px;height:auto;margin:12px auto;border-radius:14px; }
      midnry-fps .mf-protocol-guide ol { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 18px;padding-left:22px;font-size:12px;line-height:1.5;color:#ccdacb; }
      midnry-fps .mf-protocol-dialog button,midnry-fps .mf-protocol-dialog input,midnry-fps .mf-protocol-menu select,midnry-fps .mf-protocol-menu button { min-height:44px;border-radius:10px;padding:9px 12px;font:inherit; }
      midnry-fps .mf-protocol-dialog button { border:1px solid #829b8766;background:#2e4937;color:#f5f8ef; }
      midnry-fps .mf-protocol-dialog button:disabled { opacity:.45; }
      midnry-fps .mf-protocol-dialog :is(button,input):focus-visible, midnry-fps .mf-protocol :is(button,summary):focus-visible { outline:3px solid #d6edae;outline-offset:3px; }
      midnry-fps .mf-protocol-dialoghead { display:flex;gap:12px;justify-content:space-between;align-items:flex-start; }
      midnry-fps .mf-protocol-dialoghead button { flex-shrink:0; }
      midnry-fps .mf-protocol-kicker { color:#c1dca7;font-size:12px;letter-spacing:.08em;text-transform:uppercase; }
      midnry-fps .mf-protocol-briefrole { font-size:40px;font-weight:800;color:#e3eccf; }
      midnry-fps .mf-protocol-brief .mf-protocol-begin { width:100%;margin-top:12px;background:#d2e3b7;color:#17231a; }
      midnry-fps .mf-protocol-code { display:flex;gap:10px;align-items:center; }
      midnry-fps .mf-protocol-code input { width:120px;background:#071510;color:#fff;border:1px solid #a4c2aa;text-align:center;font-size:28px;letter-spacing:.2em; }
      midnry-fps .mf-protocol-code button { flex:1; }
      midnry-fps .mf-protocol-codeform .mf-protocol-armingnumber { font:700 38px ui-monospace,monospace;color:#e0f0c4;letter-spacing:.2em; }
      midnry-fps .mf-protocol-meetingphase { display:block;margin-top:4px;color:#cce1b3;font-size:13px;font-variant-numeric:tabular-nums; }
      midnry-fps .mf-protocol-radio { max-height:190px;min-height:70px;overflow:auto;padding:10px;background:#091510;border-radius:12px;font-size:13px;line-height:1.55; }
      midnry-fps .mf-protocol-radio p { margin:3px 0;font-size:13px;overflow-wrap:anywhere; }
      midnry-fps .mf-protocol-chatform { display:flex;gap:8px;margin-top:10px; }
      midnry-fps .mf-protocol-chatform input { flex:1;min-width:0;color:#edf5eb;background:#091710;border:1px solid #789c8166;font-size:14px; }
      midnry-fps .mf-protocol-votes { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0; }
      midnry-fps .mf-protocol-votes button { text-align:left;font-size:13px;overflow-wrap:anywhere; }
      midnry-fps .mf-protocol-votes button[aria-pressed="true"] { border-color:#d4e7b7;background:#507143; }
      midnry-fps .mf-protocol-menu { display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;margin:12px 0;border:1px solid #87988655;border-radius:16px;background:#102019; }
      midnry-fps .mf-protocol-menu > :is(label, p) { grid-column:1 / -1; }
      midnry-fps .mf-protocol-menu label { display:grid;gap:7px;font-size:13px;color:#ecf4e8; }
      midnry-fps .mf-protocol-menu select { width:100%;background:#25392a;color:#ecf4e8; }
      midnry-fps .mf-protocol-menu p { margin:0;font-size:12px;line-height:1.5;color:#bdcbbb; }
      midnry-fps .mf-protocol-menu p:empty { display:none; }
      midnry-fps .mf-protocol-menu button { width:100%;margin:0;border:1px solid #8f9d7a;background:#2c3d28;color:#eef5e6; }
      midnry-fps .mf-protocol-results { margin:16px 0;padding:16px;border:1px solid #9baa8066;border-radius:16px;background:#183023;color:#edf5e9; }
      midnry-fps .mf-protocol-results h2 { margin:0 0 8px;font-size:23px; }
      midnry-fps .mf-protocol-results p { color:#d0decc;font-size:13px;line-height:1.6; }
      midnry-fps .mf-protocol-share { margin:12px 0;padding:12px;border:1px solid #7fd3ff55;border-radius:12px;background:#10242c; }
      midnry-fps .mf-protocol-share p { margin:0 0 10px;color:#eef6f2;font-weight:600; }
      midnry-fps .mf-protocol-sharerow { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
      midnry-fps .mf-protocol-sharerow > * { min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:10px;font:700 14px system-ui;text-decoration:none;cursor:pointer; }
      midnry-fps .mf-protocol-sharebtn { border:0;background:#7fd3ff;color:#06202b; }
      midnry-fps .mf-protocol-sharewa { border:1px solid #5ccf7f;background:#163d26;color:#c9f5d6 !important; }
      midnry-fps .mf-protocol-sharestatus { display:block;margin-top:8px;color:#b9d6cb; }
      midnry-fps .mf-protocol-results ul { margin:8px 0;padding-left:18px;font-size:12px;line-height:1.7; }
      midnry-fps .mf-protocol .mf-panel:has(.mf-protocol-results:not([hidden])) .mf-copy { display:none; }
      @media(pointer:coarse) { midnry-fps .mf-protocol-actions { bottom:18px;right:14px;display:grid;grid-template-columns:repeat(2,minmax(62px,1fr));max-width:calc(100% - 144px);gap:6px; } midnry-fps .mf-protocol-actions button { min-height:52px;padding:7px 9px; } midnry-fps .mf-protocol-actions .mf-protocol-hold { min-width:0;grid-column:1 / -1; } midnry-fps .mf-protocol-context { bottom:187px;width:min(330px,calc(100% - 28px)); } midnry-fps .mf-protocol-tactics { bottom:185px;right:14px; } }
      @media(max-width:600px) { midnry-fps .mf-protocol-hud { top:72px;left:12px;width:min(255px,calc(100% - 132px)); } midnry-fps .mf-protocol-role { padding:8px 10px;gap:5px; } midnry-fps .mf-protocol-role b { font-size:12px; } midnry-fps .mf-protocol-role small { font-size:10px; } midnry-fps .mf-protocol-clock { font-size:12px; } midnry-fps .mf-protocol-alert { font-size:11px;padding:7px 9px; } midnry-fps .mf-protocol-dialog { padding:17px;border-radius:20px; } midnry-fps .mf-protocol-dialog h2 { font-size:23px; } midnry-fps .mf-protocol-radio { max-height:140px; } }
      @media(max-height:570px) { midnry-fps .mf-protocol-hud { top:64px; } midnry-fps .mf-protocol-context { bottom:90px;width:310px;left:52%; } midnry-fps .mf-protocol-tactics { bottom:84px; } midnry-fps .mf-protocol-actions { display:flex;bottom:12px; } midnry-fps .mf-protocol-actions .mf-protocol-hold { min-width:112px; } }
      @media(prefers-reduced-motion:reduce) { midnry-fps .mf-protocol-actions button:active:not(:disabled),midnry-fps .mf-protocol-hold[aria-pressed="true"] { transform:none; } }
      midnry-fps .mf-protocol-missionstatus { margin-top:8px;padding:10px 12px;background:#14221fec;border:1px solid #a8b7ac44;border-radius:14px;font-size:12px;line-height:1.5; }
      midnry-fps .mf-protocol-missionstatus b { display:block;color:#e3edce; }
      midnry-fps .mf-protocol-missionstatus small { display:block;color:#c2d2c7;font-size:11px; }
      midnry-fps .mf-protocol-cargo { margin:7px 0 0;padding:7px 10px;background:#1c3529e8;border-radius:10px;font-size:12px; }
      midnry-fps .mf-protocol-patients { margin-top:7px;background:#14221fec;border:1px solid #a8b7ac44;border-radius:14px; }
      midnry-fps .mf-protocol-patients summary { min-height:44px;padding:12px;font-size:12px;cursor:pointer; }
      midnry-fps .mf-protocol-patientlist { padding:0 12px 10px;display:grid;gap:7px; }
      midnry-fps .mf-protocol-patient { font-size:11px;display:grid;grid-template-columns:1fr auto;gap:3px 8px; }
      midnry-fps .mf-protocol-patient meter { width:100%;grid-column:1 / -1;height:8px;accent-color:#9fcca4; }
      midnry-fps .mf-protocol-patient[data-critical="true"] { color:#ffbd9c; }
      midnry-fps .mf-protocol-piloting .mf-stick,midnry-fps .mf-protocol-piloting .mf-protocol-tasks { display:none !important; }
      midnry-fps .mf-protocol-flight { position:absolute;z-index:5;bottom:106px;left:50%;transform:translateX(-50%);width:min(350px,calc(100% - 28px));padding:13px 15px;color:#f0f6ef;background:#122321ed;border:1px solid #a4b89a66;border-radius:16px;font-size:12px;line-height:1.5; }
      midnry-fps .mf-protocol-flight b { display:block;font-size:14px;color:#e2eccd; }
      midnry-fps .mf-protocol-flight meter { width:100%;height:12px;accent-color:#b6daa4; }
      midnry-fps .mf-protocol-flight .mf-protocol-recovery { color:#ffbf9d;font-weight:700; }
      midnry-fps .mf-protocol-flightpad { position:absolute;z-index:5;left:14px;bottom:18px;display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(3,44px);gap:6px; }
      midnry-fps .mf-protocol-flightpad button { min-width:44px;min-height:44px;padding:4px;border:1px solid #b1cda177;background:#163025ed;border-radius:11px;color:#edf5e2;touch-action:none;font:700 18px system-ui; }
      midnry-fps .mf-protocol-flightpad button[aria-pressed="true"] { background:#b9d5a1;color:#122219; }
      midnry-fps .mf-protocol-flightpad button:nth-child(1) { grid-column:2;grid-row:1; }
      midnry-fps .mf-protocol-flightpad button:nth-child(2) { grid-column:1;grid-row:2; }
      midnry-fps .mf-protocol-flightpad button:nth-child(3) { grid-column:3;grid-row:2; }
      midnry-fps .mf-protocol-flightpad button:nth-child(4) { grid-column:2;grid-row:3; }
      midnry-fps .mf-protocol-flightpad small { grid-column:2;grid-row:2;align-self:center;text-align:center;color:#d9e9cb;font-size:10px; }
      @media(pointer:coarse) { midnry-fps .mf-protocol-flight { bottom:184px; } }
      @media(pointer:coarse) { midnry-fps .mf-protocol-piloting .mf-protocol-actions { max-width:calc(100% - 190px); } }
      @media(pointer:fine) { midnry-fps .mf-protocol-flightpad { display:none; } }
      @media(max-height:570px) { midnry-fps .mf-protocol-flight { bottom:85px;left:54%;width:300px;font-size:11px;padding:9px 12px; } midnry-fps .mf-protocol-piloting .mf-protocol-patients { display:none; } midnry-fps .mf-protocol-hud { width:250px; } midnry-fps .mf-protocol-alert { max-height:56px;overflow:auto; } }
    `;
    g.shell.append(this.style);
    this.hud = element("aside", "mf-protocol-hud");
    this.hud.hidden = true;
    this.hud.innerHTML = `<button class="mf-protocol-role" aria-label="Review your secret role and orders"><span><b></b><small></small></span><span class="mf-protocol-clock"></span></button><p class="mf-protocol-alert" role="status" aria-live="polite" hidden></p><details class="mf-protocol-tasks"><summary>Assignments</summary><div class="mf-protocol-tasklist"></div></details>`;
    if (!matchMedia("(pointer:coarse)").matches && matchMedia("(min-height:680px)").matches)
      this.hud.querySelector("details").open = true;
    g.shell.append(this.hud);
    this.missionStatus = element("section", "mf-protocol-missionstatus");
    this.missionStatus.innerHTML = "<b></b><small></small>";
    this.hud.querySelector(".mf-protocol-role").after(this.missionStatus);
    this.cargoStatus = element("p", "mf-protocol-cargo");
    this.missionStatus.after(this.cargoStatus);
    this.patients = element("details", "mf-protocol-patients");
    this.patients.innerHTML =
      "<summary>Remote patient vitals</summary><div class='mf-protocol-patientlist'></div>";
    this.hud.append(this.patients);
    this.context = element("aside", "mf-protocol-context");
    this.context.hidden = true;
    this.context.innerHTML = `<b></b><p></p><div class="mf-protocol-progress" hidden><i></i></div>`;
    g.shell.append(this.context);
    this.actionBar = element("div", "mf-protocol-actions");
    this.actionBar.setAttribute("role", "group");
    this.actionBar.setAttribute("aria-label", "Blackout Protocol actions");
    this.actionBar.hidden = true;
    this.actionBar.innerHTML = `<button class="mf-protocol-hold" aria-pressed="false">Hold to interact<small>E · stay still</small></button><button class="mf-protocol-report" hidden>Report<small>F · nearby body</small></button><button class="mf-protocol-emergency" hidden>Emergency<small>C · Command</small></button><button class="mf-protocol-eliminate" hidden>Eliminate<small>X · close range</small></button><button class="mf-protocol-openactions" hidden aria-expanded="false">Tactics<small>B · sabotage / hatches</small></button>`;
    g.shell.append(this.actionBar);
    this.actionBar.insertAdjacentHTML(
      "beforeend",
      '<button class="mf-protocol-helm" hidden>Take helm<small>Cockpit · operator</small></button><button class="mf-protocol-releasehelm" hidden>Release helm<small>Leave pilot seat</small></button><button class="mf-protocol-autopilot" hidden>Restore autopilot<small>Stabilize first</small></button>',
    );
    this.flight = element("aside", "mf-protocol-flight");
    this.flight.hidden = true;
    this.flight.innerHTML =
      '<b class="mf-protocol-flightstate">Manual aircraft control</b><div class="mf-protocol-altitude"></div><meter class="mf-protocol-altitudemeter" min="0" max="1" low=".5" high=".85" optimum=".65" aria-label="Flight level; safe range 50 to 85 percent"></meter><div class="mf-protocol-heading"></div><meter class="mf-protocol-headingmeter" min="-1" max="1" low="-.18" high=".18" optimum="0" aria-label="Course offset; target within plus or minus 18 percent"></meter><div class="mf-protocol-stabilize"></div><div class="mf-protocol-recovery" role="status"></div>';
    g.shell.append(this.flight);
    this.flightPad = element("div", "mf-protocol-flightpad");
    this.flightPad.hidden = true;
    this.flightPad.setAttribute("role", "group");
    this.flightPad.setAttribute("aria-label", "Seated aircraft flight controls");
    this.flightPad.innerHTML =
      '<button data-flight-axis="pitch" data-flight-value="1" aria-label="Hold to raise flight level" aria-pressed="false">↑</button><button data-flight-axis="steer" data-flight-value="-1" aria-label="Hold to steer left" aria-pressed="false">←</button><button data-flight-axis="steer" data-flight-value="1" aria-label="Hold to steer right" aria-pressed="false">→</button><button data-flight-axis="pitch" data-flight-value="-1" aria-label="Hold to lower flight level" aria-pressed="false">↓</button><small>FLIGHT</small>';
    g.shell.append(this.flightPad);
    this.tactics = element("aside", "mf-protocol-tactics");
    this.tactics.hidden = true;
    this.tactics.innerHTML = `<h3>Infiltrator tactics</h3><p class="mf-protocol-allies"></p><button data-sabotage="power">Cut power</button><button data-sabotage="comms">Jam communications</button><p class="mf-protocol-cooldown"></p><button class="mf-protocol-drag" hidden>Drag nearby body</button><h3>Maintenance hatches</h3><div class="mf-protocol-ventlinks"></div><p>Use a nearby hatch to reach its linked exits. Other uniforms reveal no allegiance.</p>`;
    this.tactics.insertAdjacentHTML("afterbegin", '<p class="mf-protocol-medicaltactics"></p>');
    g.shell.append(this.tactics);
    this.menu = element("section", "mf-protocol-menu");
    this.menu.hidden = true;
    this.menu.innerHTML = `<label>Offline role preference<select aria-label="Offline secret role preference"><option value="operator">Operator · learn the base</option><option value="infiltrator">Infiltrator · covert objectives</option><option value="random">Surprise me · random role</option></select></label><p>Offline preference starts a fresh round. Online roles are secret and assigned by the server; your choice here cannot change them.</p><button>How to play</button>`;
    g.$(".mf-start").before(this.menu);
    this.results = element("section", "mf-protocol-results");
    this.results.hidden = true;
    this.results.setAttribute("aria-label", "Blackout Protocol round result");
    g.$(".mf-start").before(this.results);
    this.brief = this.dialog("mf-protocol-brief", "Your secret role");
    this.brief.innerHTML = `<div class="mf-protocol-kicker">Blackout Protocol / Classified</div><h2>Your orders</h2><div class="mf-protocol-briefrole"></div><p class="mf-protocol-briefcopy"></p><p class="mf-protocol-brieffoot"></p><ul class="mf-protocol-briefmatch" aria-label="This match"></ul><button class="mf-protocol-begin">Understood · enter the base</button>`;
    this.guide = this.dialog("mf-protocol-guide", "Blackout Protocol manual");
    const head = element("div", "mf-protocol-dialoghead");
    head.append(element("h2", "", "Blackout Protocol"), element("button", "", "Done"));
    this.guide.append(head);
    this.guide.append(
      element(
        "p",
        "",
        "Offline menus pause the mission. Online missions continue while this manual is open, including patient vitals and flight safety.",
      ),
    );
    this.buildBaseGuide(PROTOCOL_MAP);
    this.buildBaseGuide(TRANSPORT_MAP);
    for (const [title, copy] of GUIDE)
      this.guide.append(element("h3", "", title), element("p", "", copy));
    this.arming = this.dialog("mf-protocol-codeform", "Arming-code challenge");
    this.arming.innerHTML = `<div class="mf-protocol-kicker">Final stage / Stay stationary</div><h2>Confirm the arming code</h2><p>Enter the displayed three-digit code. A wrong code, movement or an expired timer resets this planting attempt.</p><div class="mf-protocol-armingnumber" aria-label="Required arming code"></div><p class="mf-protocol-armingtimer" role="status"></p><form class="mf-protocol-code"><input type="text" inputmode="numeric" pattern="[0-9]{3}" maxlength="3" autocomplete="off" aria-label="Enter the displayed three-digit arming code" required><button type="submit">Arm charge</button></form>`;
    this.meeting = this.dialog("mf-protocol-meeting", "Radio meeting and Last Stand vote");
    this.meeting.innerHTML = `<div class="mf-protocol-dialoghead"><div><span class="mf-protocol-kicker">Command radio / Movement paused</span><h2>Emergency meeting</h2><span class="mf-protocol-meetingphase"></span></div><button class="mf-protocol-meetingmenu">Menu</button></div><p class="mf-protocol-meetingreason"></p><div class="mf-protocol-radio" role="log" aria-live="polite" aria-label="Meeting discussion"></div><form class="mf-protocol-chatform"><input type="text" maxlength="180" autocomplete="off" aria-label="Radio discussion message" placeholder="Where were you? What did you see?"><button type="submit">Send</button></form><p class="mf-protocol-meetinghint"></p><div class="mf-protocol-votes" role="group" aria-label="Vote for a Last Stand suspect"></div><button class="mf-protocol-skip" aria-pressed="false">Skip combat</button>`;
    this.live = element("div", "mf-sr-only");
    this.live.setAttribute("role", "status");
    this.live.setAttribute("aria-live", "polite");
    g.shell.append(this.live);
  }

  dialog(className, label) {
    const dialog = element("dialog", `mf-protocol-dialog ${className}`);
    dialog.setAttribute("aria-label", label);
    this.g.shell.append(dialog);
    this.g.on(dialog, "keydown", (event) => event.stopPropagation());
    return dialog;
  }

  buildBaseGuide(map = PROTOCOL_MAP) {
    const canvas = element("canvas");
    canvas.width = canvas.height = 420;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      `Tactical floor plan of ${map.name}. Rooms: ${map.rooms
        .filter((room) => !room.id.includes("corridor"))
        .map((room) => room.name)
        .join(", ")}.`,
    );
    const c = canvas.getContext("2d"),
      size = canvas.width / map.level.length;
    c.fillStyle = "#0a1713";
    c.fillRect(0, 0, canvas.width, canvas.height);
    const mainRooms = map.rooms.filter(
      (room) => !room.id.includes("corridor") && !room.id.includes("passage"),
    );
    for (const room of map.rooms) {
      c.fillStyle = room.roofed === false ? "#657449" : "#315044";
      c.fillRect(room.x * size, room.y * size, room.w * size, room.h * size);
    }
    map.level.forEach((row, y) =>
      row.forEach((tile, x) => {
        if (!tile) return;
        c.fillStyle = tile === 1 ? "#9aaa8e" : "#b2bd94";
        c.fillRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
      }),
    );
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "700 14px system-ui,sans-serif";
    c.fillStyle = "#fff2c4";
    mainRooms.forEach((room, i) => {
      const x = (room.x + room.w / 2) * size,
        y = (room.y + room.h / 2) * size;
      c.fillStyle = "#102019";
      c.beginPath();
      c.arc(x, y, 11, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#edf0bf";
      c.fillText(String(i + 1), x, y);
    });
    this.guide.append(element("h3", "", map.name), canvas);
    const legend = element("ol");
    for (const room of mainRooms) legend.append(element("li", "", room.name));
    this.guide.append(
      legend,
      element(
        "p",
        "",
        map.id === "medevac"
          ? "The cockpit helm controls the aircraft. Avionics houses autopilot systems; cargo holds the medical shipment and arrival delivery station. Everyone can move between these areas on foot."
          : "Medical fixtures are scattered through the base. Carry one item to the hangar loading pad at a time. Command houses the emergency console; Generators restores power, and Communications restores the radio link.",
      ),
    );
  }

  bind() {
    const g = this.g;
    for (const button of this.flightPad.querySelectorAll("button")) {
      g.on(button, "pointerdown", (event) => {
        if (!this.piloting || !this.visibleGameplay()) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.flightTouch.set(event.pointerId, {
          axis: button.dataset.flightAxis,
          value: Number(button.dataset.flightValue),
          button,
        });
        button.setAttribute("aria-pressed", "true");
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        g.on(button, type, (event) => {
          this.flightTouch.delete(event.pointerId);
          button.setAttribute("aria-pressed", "false");
        });
      const keyboardId = `key:${button.dataset.flightAxis}:${button.dataset.flightValue}`;
      g.on(button, "keydown", (event) => {
        if (!["Enter", " "].includes(event.key) || !this.piloting) return;
        event.preventDefault();
        event.stopPropagation();
        this.flightTouch.set(keyboardId, {
          axis: button.dataset.flightAxis,
          value: Number(button.dataset.flightValue),
          button,
        });
        button.setAttribute("aria-pressed", "true");
      });
      const releaseKey = () => {
        this.flightTouch.delete(keyboardId);
        button.setAttribute("aria-pressed", "false");
      };
      g.on(button, "keyup", (event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          releaseKey();
        }
      });
      g.on(button, "blur", releaseKey);
    }
    g.on(this.actionBar.querySelector(".mf-protocol-helm"), "click", () => {
      if (this.nearby?.helm && this.alive()) this.enqueue("helm");
    });
    g.on(this.actionBar.querySelector(".mf-protocol-releasehelm"), "click", () => {
      if (this.piloting) this.enqueue("release-helm");
    });
    g.on(this.actionBar.querySelector(".mf-protocol-autopilot"), "click", () => {
      const vehicle = this.safeView()?.protocol?.mission?.vehicle;
      if (this.piloting && vehicle?.underControl && !vehicle.autopilot) this.enqueue("autopilot");
    });
    this.holdButton = this.actionBar.querySelector(".mf-protocol-hold");
    g.on(this.holdButton, "pointerdown", (event) => {
      if (!this.canInteract()) return;
      event.preventDefault();
      if (this.startEquipmentCheck()) return;
      this.held = true;
      this.touchHold = event.pointerType !== "mouse";
      this.touchHoldSerial = g.missionPointerSerial;
      this.holdButton.setPointerCapture(event.pointerId);
      this.holdButton.setAttribute("aria-pressed", "true");
    });
    const release = () => {
      if (this.touchHold) {
        this.g.ignoreMissionTapUntil = performance.now() + 450;
        this.g.ignoreMissionTapSerial = this.touchHoldSerial;
      }
      this.touchHold = false;
      this.held = false;
      this.holdButton.setAttribute("aria-pressed", "false");
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      g.on(this.holdButton, type, release);
    g.on(window, "blur", () => {
      release();
      this.clearFlightInput();
    });
    g.on(this.holdButton, "keydown", (event) => {
      if ([" ", "Enter"].includes(event.key) && this.canInteract()) {
        event.preventDefault();
        event.stopPropagation();
        if (this.startEquipmentCheck()) return;
        this.held = true;
        this.holdButton.setAttribute("aria-pressed", "true");
      }
    });
    g.on(this.holdButton, "keyup", (event) => {
      if ([" ", "Enter"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        release();
      }
    });
    g.on(g.shell, "keydown", (event) => {
      if (
        g.mode !== "protocol" ||
        !g.running ||
        event.target.closest("input,select,textarea,dialog")
      )
        return;
      const key = event.key.toLowerCase();
      if (event.target.closest("button,summary") && !["b", "v"].includes(key)) return;
      if (["e", "f", "c", "x", "b", "v"].includes(key)) event.preventDefault();
      if (event.repeat) return;
      if (key === "f") this.report();
      if (key === "c") this.emergency();
      if (key === "x") this.eliminate();
      if (key === "b") this.toggleTactics();
      if (key === "v") this.toggleTactics(true);
    });
    g.on(this.actionBar.querySelector(".mf-protocol-report"), "click", () => this.report());
    g.on(this.actionBar.querySelector(".mf-protocol-emergency"), "click", () => this.emergency());
    g.on(this.actionBar.querySelector(".mf-protocol-eliminate"), "click", () => this.eliminate());
    g.on(this.g.$(".mf-protocol-openactions"), "click", () => this.toggleTactics());
    g.on(this.tactics, "click", (event) => {
      const sabotage = event.target.closest("[data-sabotage]");
      const vent = event.target.closest("[data-vent]");
      if (sabotage && !sabotage.disabled) this.enqueue("sabotage", sabotage.dataset.sabotage);
      if (vent && !vent.disabled) {
        this.enqueue("vent", vent.dataset.vent);
        this.tactics.hidden = true;
      }
      const drag = event.target.closest(".mf-protocol-drag");
      if (drag && !drag.disabled)
        this.enqueue("drag", this.nearby?.carriedBody?.id || this.nearby?.dragBody?.id);
    });
    g.on(this.hud.querySelector(".mf-protocol-role"), "click", () => this.showBrief());
    g.on(this.hud.querySelector(".mf-protocol-tasklist"), "click", (event) => {
      const task = event.target.closest("[data-supply],[data-flight-task]");
      if (task && !task.disabled) {
        if (task.dataset.flightTask) this.trackedFlightTask = task.dataset.flightTask;
        else this.trackedSupply = task.dataset.supply;
        this.taskKey = "";
        this.update(true);
      }
    });
    g.on(this.menu.querySelector("select"), "change", (event) => {
      if (g.online) return;
      g.rolePreference = event.target.value;
      g.reset();
      this.refreshMenu();
    });
    g.on(this.menu.querySelector("button"), "click", () => this.showGuide());
    g.on(this.guide.querySelector("button"), "click", () => this.guide.close());
    g.on(this.brief.querySelector("button"), "click", () => this.brief.close());
    g.on(this.brief, "close", () => this.resumeFocus());
    g.on(this.guide, "close", () => this.resumeFocus());
    g.on(this.arming.querySelector("input"), "input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 3);
    });
    g.on(this.arming.querySelector("form"), "submit", (event) => {
      event.preventDefault();
      const input = this.arming.querySelector("input");
      if (!/^\d{3}$/.test(input.value)) return;
      if (this.actions.some((action) => action.op === "wire")) return;
      this.enqueue("wire", undefined, input.value);
      this.arming.querySelector("button").disabled = true;
    });
    g.on(this.arming, "cancel", (event) => {
      // Opening the menu interrupts a hold; wire still times out in the simulation.
      event.preventDefault();
      g.pause();
      this.arming.close();
    });
    g.on(this.meeting.querySelector(".mf-protocol-meetingmenu"), "click", () => {
      g.pause();
      this.meeting.close();
    });
    g.on(this.meeting, "cancel", (event) => {
      event.preventDefault();
      g.pause();
      this.meeting.close();
    });
    g.on(this.meeting.querySelector("form"), "submit", (event) => {
      event.preventDefault();
      const input = this.meeting.querySelector("input");
      const text = input.value.trim().slice(0, 180);
      if (
        !text ||
        !this.alive() ||
        performance.now() < (this.chatReadyAt || 0) ||
        this.actions.some((action) => action.op === "chat")
      )
        return;
      this.enqueue("chat", undefined, text);
      this.chatReadyAt = performance.now() + 1050;
      input.value = "";
    });
    g.on(this.meeting.querySelector(".mf-protocol-votes"), "click", (event) => {
      const button = event.target.closest("[data-vote]");
      if (button && !button.disabled) this.enqueue("vote", button.dataset.vote);
    });
    g.on(this.meeting.querySelector(".mf-protocol-skip"), "click", (event) => {
      if (!event.currentTarget.disabled) this.enqueue("vote", "skip");
    });
  }

  safeView() {
    if (this.g.mode !== "protocol") return null;
    return this.g.protocolView?.() || protocolView(this.g.arena.snapshot(), this.g.selfId);
  }

  alive() {
    return (this.g.player?.hp || 0) > 0 && !this.g.player?.departed;
  }
  get piloting() {
    const view = this.safeView();
    return (
      this.g.mode === "protocol" &&
      this.alive() &&
      view?.protocol?.mission?.phase === "transport" &&
      view.protocol.mission.vehicle?.pilotId === this.g.selfId
    );
  }
  clearFlightInput() {
    for (const input of this.flightTouch.values())
      input.button.setAttribute("aria-pressed", "false");
    this.flightTouch.clear();
  }
  vehicleControls() {
    if (!this.piloting || !this.visibleGameplay() || this.hasDialogOpen())
      return { pitch: 0, steer: 0 };
    let pitch = Number(this.g.keys.has("w")) - Number(this.g.keys.has("s"));
    let steer = Number(this.g.keys.has("d")) - Number(this.g.keys.has("a"));
    for (const input of this.flightTouch.values()) {
      if (input.axis === "pitch") pitch += input.value;
      else steer += input.value;
    }
    return { pitch: clamp(pitch, -1, 1), steer: clamp(steer, -1, 1) };
  }
  hasDialogOpen() {
    return [this.brief, this.guide, this.arming, this.meeting, this.focus?.info, this.taskPanel?.dialog].some(
      (dialog) => dialog?.open,
    );
  }
  visibleGameplay() {
    return (
      this.g.mode === "protocol" &&
      (this.g.running || this.focus?.pausedOffline) &&
      this.g.state === "playing" &&
      this.g.$(".mf-modal").hidden
    );
  }
  canInteract() {
    return (
      this.visibleGameplay() &&
      this.view?.protocol?.phase === "roam" &&
      !this.brief.open &&
      !this.guide.open &&
      !this.arming.open &&
      !this.taskPanel?.dialog.open &&
      this.alive() &&
      Boolean(this.nearby?.context)
    );
  }

  enqueue(op, target, value) {
    if (!this.visibleGameplay() || !this.view?.protocol?.self || this.actions.length >= 12) return;
    if (!this.alive()) return;
    if (
      this.actions.some(
        (action) => action.op === op && action.target === target && action.value === value,
      )
    )
      return;
    const action = { seq: ++this.sequence, op };
    if (target != null) action.target = String(target);
    if (value != null) action.value = String(value);
    this.actions.push(action);
  }

  startEquipmentCheck() {
    const context = this.nearby?.context;
    if (!this.view?.protocol?.mission?.interactiveTasks || !INTERACTIVE_TASKS.has(context?.kind)) return false;
    this.enqueue("task-begin",context.target);
    return true;
  }

  /** A one-shot stays queued through failed HTTP polls; the server deduplicates seq. */
  controls() {
    if (!this.visibleGameplay() || this.brief.open || this.guide.open || this.focus?.info.open)
      return { interact: false };
    const phase = this.view?.protocol?.phase;
    const interact =
      phase === "roam" &&
      !this.arming.open &&
      this.canInteract() &&
      (this.held || this.g.keys.has("e"));
    if (!this.alive()) this.actions = [];
    return {
      interact: Boolean(interact),
      ...(this.piloting ? { vehicleInput: this.vehicleControls() } : {}),
      ...(this.actions[0] ? { protocolAction: { ...this.actions[0] } } : {}),
    };
  }

  acknowledge(seq) {
    if (!Number.isSafeInteger(seq)) return;
    this.actions = this.actions.filter((action) => action.seq > seq);
  }

  reset() {
    this.taskPanel?.reset();
    this.focus?.close();
    this.actions = [];
    this.held = false;
    this.trackedTask = null;
    this.trackedSupply = null;
    this.trackedFlightTask = null;
    this.patientKey = "";
    this.clearFlightInput();
    this.taskKey = this.meetingKey = this.voteKey = this.messageKey = this.ventKey = "";
    this.briefRound = null;
    this.resultRound = null;
    this.armingTarget = null;
    this.view = null;
    this.nearby = null;
    this.lastUpdate = 0;
    this.results.hidden = true;
    this.hud.hidden =
      this.actionBar.hidden =
      this.context.hidden =
      this.flight.hidden =
      this.flightPad.hidden =
        true;
    this.holdButton.setAttribute("aria-pressed", "false");
    for (const dialog of [this.brief, this.meeting, this.arming]) if (dialog.open) dialog.close();
    this.tactics.hidden = true;
  }

  releaseMouse() {
    const g = this.g;
    this.held = false;
    this.clearFlightInput();
    g.keys.clear();
    g.firing = false;
    // The game otherwise treats releasing pointer lock as a pause. A meeting
    // must keep advancing its shared discussion/vote timer instead.
    g.hadLock = false;
    if (document.pointerLockElement === g.canvas) document.exitPointerLock();
  }

  resumeFocus() {
    if (
      !this.visibleGameplay() ||
      !["roam", "combat"].includes(this.view?.protocol?.phase) ||
      this.arming.open ||
      this.meeting.open ||
      this.brief.open ||
      this.guide.open
    )
      return;
    this.g.shell.focus({ preventScroll: true });
    if (this.alive()) this.g.lockMouse?.();
  }

  showBrief() {
    const self = (this.view || this.safeView())?.protocol?.self;
    if (!self) return;
    const infiltrator = self.role === "infiltrator";
    setText(
      this.brief.querySelector(".mf-protocol-briefrole"),
      infiltrator ? "INFILTRATOR" : "OPERATOR",
    );
    setText(
      this.brief.querySelector(".mf-protocol-briefcopy"),
      infiltrator
        ? "Stop the rescue without getting caught. Eliminate operators until your side matches theirs, plant three charges, or sabotage the flight. Blend in: fake tasks and move with the crowd."
        : `Save the wounded soldiers. Carry ${this.view?.protocol?.mission?.manifest?.reduce((n, i) => n + i.required, 0) ?? 13} medical items to the hangar pad one at a time, fly the medevac and deliver aid. Or find the infiltrators: vote them all out and you win.`,
    );
    const partners = (self.allies || []).map((ally) => ally.name || "Covert partner").join(", ");
    setText(
      this.brief.querySelector(".mf-protocol-brieffoot"),
      infiltrator
        ? `${partners ? `Your covert partner: ${partners}. ` : ""}Tactics opens sabotage and maintenance hatches. A close-range elimination creates a body; it does not complete your mission.`
        : "Cabinets are restocked differently every round: follow the arrow. If autopilot fails, take the helm and hold both gauges in the safe band.",
    );
    const match = (this.view || this.safeView())?.protocol?.match;
    const list = this.brief.querySelector(".mf-protocol-briefmatch");
    list.replaceChildren();
    for (const option of [modifierOf(match?.modifier), twistOf(match?.twist)].filter(Boolean)) {
      const item = element("li");
      item.append(element("b", "", `${option.icon} ${option.name}`), document.createTextNode(option.text));
      list.append(item);
    }
    list.hidden = !list.children.length;
    this.releaseMouse();
    if (!this.brief.open) this.brief.showModal();
    this.brief.querySelector("button").focus({ preventScroll: true });
  }

  showGuide() {
    this.releaseMouse();
    if (this.g.running) this.g.pause();
    if (!this.guide.open) this.guide.showModal();
  }

  map() {
    return this.g.arena?.mapId === "medevac" ? TRANSPORT_MAP : this.g.protocolMap || PROTOCOL_MAP;
  }
  roomName(id) {
    return this.map().rooms?.find((room) => room.id === id)?.name || "Breakwater Base";
  }
  lineOfSight(x, y) {
    const p = this.g.player;
    if (!p) return false;
    const distance = Math.hypot(x - p.x, y - p.y);
    const steps = Math.max(1, Math.ceil(distance * 12));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor(p.x + (x - p.x) * t),
        ty = Math.floor(p.y + (y - p.y) * t);
      if (this.g.level?.[ty]?.[tx] !== 0) return false;
    }
    return true;
  }
  closest(items, radius, predicate = () => true) {
    const p = this.g.player;
    return [...(items || [])]
      .filter(
        (item) =>
          predicate(item) &&
          Math.hypot(item.x - p.x, item.y - p.y) <= radius &&
          this.lineOfSight(item.x, item.y),
      )
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  }

  getNearby(view) {
    const protocol = view.protocol,
      self = protocol.self,
      mission = protocol.mission;
    const infiltrator = self.role === "infiltrator",
      alive = this.alive(),
      transporting = mission?.phase === "transport";
    const bomb =
      !infiltrator && alive && !transporting
        ? this.closest(protocol.bombs, 1.4, (item) => item.state === "armed")
        : null;
    const repair =
      !infiltrator && alive
        ? this.closest(
            protocol.stations,
            1.4,
            (station) =>
              (protocol.sabotage.powerUntil > view.time &&
                ["power", "generator"].includes(station.kind)) ||
              (protocol.sabotage.commsUntil > view.time &&
                ["comms", "radio", "radar"].includes(station.kind)),
          )
        : null;
    const carriedBody = protocol.bodies.find((body) => body.carriedBy === this.g.selfId);
    const allLoaded = mission?.manifest?.every((item) => item.loaded >= item.required);
    const flightReady = mission?.flightTasks?.every((task) => task.done);
    const loading = !transporting && mission ? this.closest([mission.loading], 1.4) : null;
    const supplies =
      !transporting && mission
        ? this.closest(
            mission.supplyStock,
            1.4,
            (item) =>
              infiltrator ||
              (item.stock > 0 &&
                mission.manifest.some(
                  (entry) => entry.id === item.supplyId && entry.loaded < entry.required,
                )),
          )
        : null;
    const avionics = transporting ? this.closest([TRANSPORT_MAP.avionics], 1.4) : null;
    const cargo = transporting ? this.closest([TRANSPORT_MAP.cargo], 1.4) : null;
    const helm =
      transporting && !infiltrator && alive ? this.closest([TRANSPORT_MAP.helm], 1.4) : null;
    const site =
      infiltrator && !transporting
        ? this.closest(
            protocol.sites,
            1.4,
            (item) =>
              !protocol.bombs.some(
                (charge) => charge.siteId === item.id || charge.room === item.room,
              ),
          )
        : null;
    let context = null;
    const at = (kind, target, title, copy, point) => ({
      kind,
      target,
      title,
      copy,
      x: point.x,
      y: point.y,
    });
    if (alive && !carriedBody) {
      if (bomb)
        context = at(
          "defuse",
          bomb.id,
          "Disable hidden charge",
          "Hold for six seconds. Stay stationary to stop the base countdown.",
          bomb,
        );
      else if (transporting && !infiltrator && cargo && mission.vehicle.cargoDamage > 0)
        context = at(
          "repair-cargo",
          cargo.id,
          "Repair medical cargo",
          "Hold for six uninterrupted seconds. Aid cannot be delivered while cargo is damaged.",
          cargo,
        );
      else if (
        transporting &&
        !infiltrator &&
        cargo &&
        mission.vehicle.arrived &&
        allLoaded &&
        flightReady
      )
        context = at(
          "deliver",
          cargo.id,
          "Deliver lifesaving aid",
          "Hold for 4.5 seconds to treat the surviving wounded soldiers.",
          cargo,
        );
      else if (
        transporting &&
        infiltrator &&
        avionics &&
        mission.vehicle.autopilot &&
        !mission.vehicle.arrived &&
        view.time >= self.sabotageReadyAt
      )
        context = at(
          "disable-autopilot",
          avionics.id,
          "Disable the autopilot",
          "Hold at avionics for six seconds. Operators must manually recover the aircraft.",
          avionics,
        );
      else if (
        transporting &&
        infiltrator &&
        cargo &&
        mission.vehicle.cargoDamage < 60 &&
        view.time >= self.sabotageReadyAt
      )
        context = at(
          "cargo-sabotage",
          cargo.id,
          "Damage the medical cargo",
          "Hold for 4.5 seconds. Operators can repair the damaged shipment.",
          cargo,
        );
      else if (repair)
        context = at(
          "repair",
          repair.id,
          `Restore ${["power", "generator"].includes(repair.kind) ? "power" : "communications"}`,
          "Hold to restore this system. Moving interrupts the repair.",
          repair,
        );
      else if (transporting && mission.flightTasks) {
        const task = this.closest(
          mission.flightTasks,
          1.4,
          (task) =>
            !task.done &&
            (!task.system || protocol.sabotage[`${task.system}Until`] <= view.time) &&
            (task.id !== "trauma" || mission.vehicle.cargoDamage === 0),
        );
        if (task)
          context = at(
            "flight-task",
            task.id,
            `${infiltrator ? "Pretend to: " : ""}${task.name}`,
            infiltrator
              ? "Hold to blend in. This will not advance the crew's preparation."
              : `Hold for ${task.duration} uninterrupted seconds. Required before aid delivery.`,
            task,
          );
      } else if (!transporting && loading && self.cargo)
        context = at(
          "load",
          loading.id,
          `${infiltrator ? "Pretend to load" : "Load"} ${self.cargo.name}`,
          infiltrator
            ? "Hold for three seconds to maintain cover at the loading pad."
            : "Hold for three seconds to add your carried item to the medevac manifest.",
          loading,
        );
      else if (!transporting && !infiltrator && loading && allLoaded && !self.cargo)
        context = at(
          "depart",
          loading.id,
          "Board the Lifeline Medevac",
          "Hold for three seconds to recall all living operators and begin the medical flight.",
          loading,
        );
      else if (site && protocol.armedCount < 3)
        context = at(
          "plant",
          site.id,
          "Plant a concealed base charge",
          "Hold for eight seconds, then confirm the arming code while stationary.",
          site,
        );
      else if (!transporting && supplies && !self.cargo)
        context = at(
          "collect",
          supplies.id,
          `${infiltrator ? "Pretend to collect" : "Collect"} ${supplies.name}`,
          `${this.roomName(supplies.room)} · hold for 4.5 seconds${infiltrator ? " to blend in." : ", then carry one item to the loading pad."}`,
          supplies,
        );
    }
    const body = alive ? this.closest(protocol.bodies, 1.7, (item) => !item.reported) : null;
    const unsafeFlight = transporting && !mission.vehicle.autopilot && !mission.vehicle.arrived;
    const emergency =
      alive && !unsafeFlight && self.emergenciesLeft > 0 && this.closest([protocol.emergency], 1.2);
    const allies = new Set((self.allies || []).map((ally) => ally.id));
    const target =
      infiltrator && alive
        ? this.closest(
            view.entities,
            1.2,
            (item) =>
              item.id !== this.g.selfId && !allies.has(item.id) && item.hp > 0 && !item.departed,
          )
        : null;
    const vent = infiltrator && alive ? this.closest(protocol.vents, 1.2) : null;
    const dragBody =
      infiltrator && alive
        ? this.closest(protocol.bodies, 1.1, (item) => !item.reported && !item.carriedBy)
        : null;
    return {
      context,
      body: unsafeFlight ? null : body,
      emergency,
      target,
      vent,
      carriedBody,
      dragBody,
      helm,
      loading,
      supplies,
      cargo,
      avionics,
    };
  }

  report() {
    if (this.nearby?.body && this.alive() && this.view?.protocol?.phase === "roam")
      this.enqueue("report", this.nearby.body.id);
  }
  emergency() {
    const view=this.safeView(),p=view?.protocol;
    if(!this.alive()||p?.phase!=='roam'||p.self.emergenciesLeft<=0||p.emergencyReadyAt>view.time)return;
    if(p.mission?.phase==='transport'&&!p.mission.vehicle.autopilot&&!p.mission.vehicle.arrived)return;
    if(p.sabotage.commsUntil>view.time&&!this.nearby?.emergency) {
      this.g.navigation.requestMeeting=true;this.g.navigation.pinned='meeting-console';
      this.focus?.close(true);this.g.navigation.nextUpdate=0;this.g.navigation.update(view);
      this.g.message('RADIO JAMMED · FOLLOW THE GROUND TRAIL TO THE WIRED CONSOLE',4);return;
    }
    this.focus?.close(true);
    this.enqueue("meeting");
  }
  eliminate() {
    if (
      this.nearby?.target &&
      this.alive() &&
      this.view?.protocol?.self?.role === "infiltrator" &&
      this.view.protocol.phase === "roam" &&
      this.view.time >= this.view.protocol.self.killReadyAt
    )
      this.enqueue("eliminate", this.nearby.target.id);
  }
  toggleTactics(forceOpen = false) {
    if (
      !this.visibleGameplay() ||
      !this.alive() ||
      this.view?.protocol?.self?.role !== "infiltrator" ||
      this.view.protocol.phase !== "roam"
    )
      return;
    if (!this.focus.info.open) this.focus.open();
    this.tactics.hidden = forceOpen ? false : !this.tactics.hidden;
    this.g
      .$(".mf-protocol-openactions")
      .setAttribute("aria-expanded", String(!this.tactics.hidden));
    if (!this.tactics.hidden) {
      this.releaseMouse();
      this.tactics.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
    } else this.resumeFocus();
  }

  update(force = false) {
    if (this.disposed) return;
    const now = performance.now();
    if (!force && now - this.lastUpdate < 90) return;
    this.lastUpdate = now;
    const g = this.g,
      active = g.mode === "protocol";
    g.spectator?.update();
    g.shell.classList.toggle("mf-protocol", active);
    const gameplay = active && this.visibleGameplay();
    g.shell.classList.toggle(
      "mf-protocol-combat",
      gameplay && g.arena.protocol?.phase === "combat",
    );
    this.combatStats.hidden = true;
    this.combatMarker.hidden = true;
    const lastStand = gameplay ? this.safeView()?.protocol : null,
      verdict = lastStand?.phase !== "combat" ? lastStand?.combat : null,
      showVerdict = Boolean(verdict?.result && verdict.resultUntil > (g.arena?.time ?? 0));
    this.verdict.hidden = !showVerdict;
    if (showVerdict) {
      setText(this.verdict, verdict.result);
      this.verdict.classList.toggle("mf-verdict-caught", verdict.revealed?.infiltrator === true);
      this.verdict.classList.toggle("mf-verdict-innocent", verdict.revealed?.infiltrator === false);
    }
    this.hud.hidden = !gameplay;
    this.actionBar.hidden = !gameplay;
    this.context.hidden = !gameplay;
    if (!gameplay) {
      this.taskPanel?.close();
      this.focus?.update(null, false);
      this.flight.hidden = this.flightPad.hidden = true;
      this.clearFlightInput();
      g.shell.classList.remove("mf-protocol-piloting");
    }
    if (!active) {
      this.focus?.close();
      for (const dialog of [this.brief, this.arming, this.meeting]) if (dialog.open) dialog.close();
      this.tactics.hidden = true;
      this.held = false;
      return;
    }
    this.view = this.safeView();
    if (!this.view?.protocol?.self) return;
    const view = this.view,
      protocol = view.protocol,
      self = protocol.self;
    setText(g.$(".mf-brand small"), `OUTPOST ZERO / ${this.map().name.toUpperCase()}`);
    this.sequence = Math.max(this.sequence, self.actionSeq || 0);
    this.acknowledge(self.actionSeq);
    if (!gameplay) {
      this.held = false;
      this.tactics.hidden = true;
      this.focus?.close();
      for (const dialog of [this.brief, this.arming, this.meeting]) if (dialog.open) dialog.close();
      return;
    }
    this.nearby = this.getNearby(view);
    const infiltrator = self.role === "infiltrator",
      alive = this.alive();
    setText(
      this.hud.querySelector(".mf-protocol-role b"),
      alive
        ? infiltrator
          ? "INFILTRATOR"
          : "OPERATOR"
        : infiltrator
          ? "ELIMINATED / OBSERVER"
          : "OPERATOR / OBSERVER",
    );
    setText(
      this.hud.querySelector(".mf-protocol-role small"),
      infiltrator ? "Stop the medical rescue." : "Gather aid. Save the wounded.",
    );
    setText(
      this.hud.querySelector(".mf-protocol-clock"),
      countdown(view.time - (protocol.mission?.startedAt || 0)),
    );
    this.updateTasks(view);
    this.updateMedical(view);
    const notices = [];
    const mission = protocol.mission;
    if (mission?.phase === "transport" && !mission.vehicle.autopilot)
      notices.push(
        mission.vehicle.underControl
          ? "MANUAL FLIGHT · pilot can restore autopilot."
          : `AUTOPILOT OFF · recover at the cockpit${mission.vehicle.recoveryDeadline != null ? ` within ${Math.max(0, Math.ceil(mission.vehicle.recoveryDeadline - view.time))}s` : ""}.`,
      );
    if (mission?.vehicle.cargoDamage > 0)
      notices.push("MEDICAL CARGO DAMAGED · repair at the cargo station.");
    const critical =
      mission?.patients.filter((patient) => patient.hp > 0 && patient.hp <= 25).length || 0;
    if (critical)
      notices.push(`${critical} patient${critical > 1 ? "s" : ""} critical · deliver aid soon.`);
    if (protocol.detonateAt != null)
      notices.push(
        `BASE DETONATION IN ${countdown(protocol.detonateAt - view.time)} · find and disable a charge.`,
      );
    else if (protocol.armedCount > 0)
      notices.push(
        `${protocol.armedCount}/3 hidden charge${protocol.armedCount === 1 ? "" : "s"} armed. ${infiltrator ? "All three must stay armed to win." : "Search the side rooms."}`,
      );
    if (protocol.sabotage.powerUntil > view.time)
      notices.push("POWER DOWN · repair the generators.");
    if (protocol.sabotage.commsUntil > view.time)
      notices.push("COMMS JAMMED · restore the communications link.");
    if (!alive)
      notices.push(
        infiltrator
          ? "You are observing. Switch viewpoints with ← / → or the spectator buttons. No actions or radio messages."
          : "Observing only. Switch viewpoints with ← / → or the spectator buttons. Living operators cannot hear you; mission actions and voting are disabled.",
      );
    const alert = this.hud.querySelector(".mf-protocol-alert");
    alert.hidden = !notices.length;
    setText(alert, notices.join(" "));
    this.updateContext(view);
    this.updateActions(view);
    this.taskPanel?.update(view, gameplay);
    this.updateArming(view);
    this.updateMeeting(view);
    this.updateCombat(view);
    this.focus?.update(view, gameplay);
    g.navigation?.update(view);
    g.voice?.sync();
    if (protocol.phase === "roam" && this.briefRound !== view.roundId && !this.arming.open) {
      this.briefRound = view.roundId;
      this.showBrief();
    }
    g.spectator?.update();
    g.practice?.refresh();
  }

  updateTasks(view) {
    const mission = view.protocol.mission,
      details = this.hud.querySelector(".mf-protocol-tasks");
    if (!mission) {
      details.hidden = true;
      return;
    }
    if (mission.phase === "transport") {
      const tasks = mission.flightTasks || [];
      if (!tasks.some((task) => task.id === this.trackedFlightTask && !task.done))
        this.trackedFlightTask = tasks.find((task) => !task.done)?.id;
      setText(
        details.querySelector("summary"),
        `Aircraft duties ${tasks.filter((task) => task.done).length}/${tasks.length}`,
      );
      const key = `flight:${tasks.map((task) => `${task.id}:${task.done}`).join("|")}:${this.trackedFlightTask}`;
      if (this.taskKey === key) return;
      this.taskKey = key;
      const list = details.querySelector(".mf-protocol-tasklist");
      list.replaceChildren();
      for (const task of tasks) {
        const button = element("button", "mf-protocol-task");
        button.dataset.flightTask = task.id;
        button.disabled = task.done;
        button.setAttribute("aria-pressed", String(task.id === this.trackedFlightTask));
        button.append(
          element("span", "", task.name),
          element(
            "small",
            "",
            task.done
              ? "Complete"
              : `${this.roomName(task.room)} · ${task.duration}s hold · select to track`,
          ),
        );
        list.append(button);
      }
      return;
    }
    const manifest = mission.manifest || [],
      loaded = manifest.reduce((sum, item) => sum + item.loaded, 0),
      total = manifest.reduce((sum, item) => sum + item.required, 0);
    if (!manifest.some((item) => item.id === this.trackedSupply && item.loaded < item.required))
      this.trackedSupply = manifest.find((item) => item.loaded < item.required)?.id;
    setText(details.querySelector("summary"), `Medical manifest ${loaded}/${total}`);
    const key =
      manifest.map((item) => `${item.id}:${item.loaded}:${item.required}`).join("|") +
      this.trackedSupply;
    if (key === this.taskKey) return;
    this.taskKey = key;
    const list = details.querySelector(".mf-protocol-tasklist");
    list.replaceChildren();
    for (const item of manifest) {
      const button = element("button", "mf-protocol-task");
      button.dataset.supply = item.id;
      button.disabled = item.loaded >= item.required || mission.phase !== "base";
      button.setAttribute("aria-pressed", String(item.id === this.trackedSupply));
      const stock =
        mission.supplyStock
          ?.filter((fixture) => fixture.supplyId === item.id)
          .reduce((sum, fixture) => sum + fixture.stock, 0) || 0;
      button.append(
        element("span", "", `${item.name} · ${item.loaded}/${item.required}`),
        element(
          "small",
          "",
          item.loaded >= item.required
            ? "Loaded aboard"
            : `${stock} available at base · select to track`,
        ),
      );
      list.append(button);
    }
  }

  updateMedical(view) {
    const mission = view.protocol.mission;
    if (!mission) {
      this.missionStatus.hidden = this.cargoStatus.hidden = this.patients.hidden = true;
      return;
    }
    this.missionStatus.hidden = this.patients.hidden = false;
    const vehicle = mission.vehicle,
      pilot = this.piloting,
      total = mission.manifest.reduce((sum, item) => sum + item.required, 0),
      loaded = mission.manifest.reduce((sum, item) => sum + item.loaded, 0);
    setText(
      this.missionStatus.querySelector("b"),
      mission.phase === "base" ? "LIFELINE RUN / GATHER & LOAD" : "LIFELINE RUN / MEDICAL FLIGHT",
    );
    setText(
      this.missionStatus.querySelector("small"),
      mission.phase === "base"
        ? `${loaded}/${total} medical items loaded · one item per carrier`
        : vehicle.arrived
          ? "Arrival reached · deliver aid at the cargo station"
          : `${Math.round(clamp(vehicle.progress / vehicle.duration, 0, 1) * 100)}% of route · ${countdown(vehicle.duration - vehicle.progress)} remaining · ${vehicle.autopilot ? "autopilot" : "manual control"}`,
    );
    if (!this.matchLine) {
      this.matchLine = element("span", "mf-protocol-matchline");
      this.missionStatus.append(this.matchLine);
    }
    const match = view.protocol.match,
      modifier = modifierOf(match?.modifier),
      twist = twistOf(match?.twist);
    this.matchLine.hidden = !modifier && !twist;
    setText(
      this.matchLine,
      [modifier, twist].filter(Boolean).map((o) => `${o.icon} ${o.name}`).join(" · "),
    );
    this.matchLine.title = [modifier, twist].filter(Boolean).map((o) => `${o.name}: ${o.text}`).join("\n");
    this.cargoStatus.hidden = mission.phase !== "base";
    setText(
      this.cargoStatus,
      view.protocol.self.cargo
        ? `Carrying: ${view.protocol.self.cargo.name} · take it to the hangar pad`
        : view.protocol.self.role === "infiltrator"
          ? "Blend in around the medical fixtures."
          : "Hands free · collect one needed supply item",
    );
    const patientKey = mission.patients.map((patient) => patient.id).join("|");
    const list = this.patients.querySelector(".mf-protocol-patientlist");
    if (patientKey !== this.patientKey) {
      this.patientKey = patientKey;
      list.replaceChildren();
      for (const patient of mission.patients) {
        const row = element("div", "mf-protocol-patient");
        row.dataset.patient = patient.id;
        row.append(element("span", "", patient.name), element("b", ""), element("meter"));
        const meter = row.querySelector("meter");
        meter.min = 0;
        meter.max = patient.maxHp || 100;
        meter.low = 25;
        meter.optimum = 100;
        meter.setAttribute("aria-label", `${patient.name} remote vitals`);
        list.append(row);
      }
    }
    const surviving = mission.patients.filter((patient) => patient.hp > 0).length;
    setText(
      this.patients.querySelector("summary"),
      `Remote vitals · ${surviving}/${mission.patients.length} alive`,
    );
    for (const patient of mission.patients) {
      const row = [...list.children].find((child) => child.dataset.patient === patient.id);
      if (!row) continue;
      row.dataset.critical = String(patient.hp > 0 && patient.hp <= 25);
      setText(row.querySelector("span"), patient.critical ? `🩸 ${patient.name}` : patient.name);
      setText(
        row.querySelector("b"),
        patient.rescued ? "Rescued" : patient.hp <= 0 ? "Lost" : `${Math.ceil(patient.hp)}%`,
      );
      row.querySelector("meter").value = patient.hp;
    }
    this.g.shell.classList.toggle("mf-protocol-piloting", pilot);
    this.flight.hidden = this.flightPad.hidden = !pilot;
    if (!pilot) {
      this.clearFlightInput();
      return;
    }
    this.context.hidden = true;
    setText(
      this.flight.querySelector(".mf-protocol-flightstate"),
      vehicle.arrived
        ? "Arrival reached · release helm to deliver aid"
        : vehicle.autopilot
          ? "Autopilot engaged · release helm to move"
          : vehicle.underControl
            ? "Aircraft stabilized · restore autopilot"
            : "MANUAL RECOVERY / W S A D",
    );
    setText(
      this.flight.querySelector(".mf-protocol-altitude"),
      `Flight level ${Math.round(vehicle.altitude * 100)}% · safe 50–85%${vehicle.altitude < 0.5 ? " · hold W / ↑" : vehicle.altitude > 0.85 ? " · hold S / ↓" : ""}`,
    );
    setText(
      this.flight.querySelector(".mf-protocol-heading"),
      `Course offset ${vehicle.heading >= 0 ? "+" : ""}${Math.round(vehicle.heading * 100)}% · target ±18%${vehicle.heading > 0.18 ? " · hold A / ←" : vehicle.heading < -0.18 ? " · hold D / →" : ""}`,
    );
    this.flight.querySelector(".mf-protocol-altitudemeter").value = vehicle.altitude;
    this.flight.querySelector(".mf-protocol-headingmeter").value = vehicle.heading;
    setText(
      this.flight.querySelector(".mf-protocol-stabilize"),
      vehicle.arrived
        ? "Release the helm, then repair or deliver at the cargo station."
        : vehicle.autopilot
          ? "The aircraft holds a safe course automatically."
          : vehicle.underControl
            ? "Ready: press Restore autopilot, then Release helm."
            : `Stability ${Math.round(vehicle.stability)}% · safe trim ${Math.min(3, vehicle.stableFor || 0).toFixed(1)}/3s`,
    );
    setText(
      this.flight.querySelector(".mf-protocol-recovery"),
      vehicle.recoveryDeadline != null && !vehicle.autopilot
        ? `CRASH RECOVERY: ${Math.max(0, Math.ceil(vehicle.recoveryDeadline - view.time))}s`
        : "",
    );
  }

  updateContext(view) {
    const protocol = view.protocol,
      mission = protocol.mission,
      channel = protocol.self.channel,
      context = this.nearby.context;
    let title = context?.title,
      copy = context?.copy;
    if (channel && channel.kind !== "wire") {
      title =
        {
          plant: "Concealing base charge",
          repair: "Restoring base systems",
          defuse: "Disabling charge",
          collect: "Collecting medical supplies",
          load: "Loading the medevac",
          depart: "Boarding Lifeline Medevac",
          deliver: "Delivering lifesaving aid",
          "repair-cargo": "Repairing medical cargo",
          "flight-task": "Preparing aircraft equipment",
          "disable-autopilot": "Disabling aircraft autopilot",
          "cargo-sabotage": "Damaging medical cargo",
        }[channel.kind] || "Working on objective";
      copy = channel.challenge ? "Complete the equipment checks. Stay at the station while the cycle finishes." : "Keep holding. Stay stationary; releasing or moving interrupts progress.";
    }
    if (!title && mission) {
      const infiltrator = protocol.self.role === "infiltrator",
        allLoaded = mission.manifest.every((item) => item.loaded >= item.required);
      let destination;
      if (mission.phase === "base") {
        destination =
          protocol.self.cargo || allLoaded
            ? mission.loading
            : [...mission.supplyStock]
                .filter((item) => item.stock > 0 && item.supplyId === this.trackedSupply)
                .sort(
                  (a, b) =>
                    Math.hypot(a.x - this.g.player.x, a.y - this.g.player.y) -
                    Math.hypot(b.x - this.g.player.x, b.y - this.g.player.y),
                )[0];
        title = protocol.self.cargo
          ? `Load ${protocol.self.cargo.name}`
          : allLoaded
            ? "Manifest complete · prepare departure"
            : infiltrator
              ? "Blend in with the medical detail"
              : "Gather the medical manifest";
      } else {
        const task =
          mission.flightTasks?.find((task) => !task.done && task.id === this.trackedFlightTask) ??
          mission.flightTasks?.find((task) => !task.done);
        destination =
          !mission.vehicle.autopilot && !mission.vehicle.underControl && !infiltrator
            ? TRANSPORT_MAP.helm
            : mission.vehicle.cargoDamage > 0
              ? TRANSPORT_MAP.cargo
              : task || TRANSPORT_MAP.cargo;
        title =
          !mission.vehicle.autopilot && !mission.vehicle.underControl && !infiltrator
            ? "Recover the aircraft at the cockpit helm"
            : mission.vehicle.cargoDamage > 0 && !infiltrator
              ? "Repair the damaged medical cargo"
              : task
                ? `${infiltrator ? "Blend in: " : ""}${task.name}`
                : mission.vehicle.arrived
                  ? "Deliver aid at the cargo station"
                  : "Protect the medical flight";
      }
      if (destination) {
        const p = this.g.player,
          angle = Math.atan2(destination.y - p.y, destination.x - p.x) - p.a,
          normalized = Math.atan2(Math.sin(angle), Math.cos(angle));
        const direction =
          Math.abs(normalized) < 0.4
            ? "Ahead"
            : Math.abs(normalized) > 2.5
              ? "Behind you"
              : normalized > 0
                ? "To your right"
                : "To your left";
        copy = `${this.roomName(destination.room)} · ${direction} · ${Math.ceil(Math.hypot(destination.x - p.x, destination.y - p.y))} tiles. ${mission.phase === "base" ? "Hold the action button when nearby." : "Watch patient vitals and aircraft safety."}`;
      }
    }
    if (!this.alive()) {
      title = "Observing Lifeline Run";
      copy = "No mission actions, radio messages or votes remain available after elimination.";
    }
    this.context.hidden = protocol.phase !== "roam" || this.piloting;
    setText(this.context.querySelector("b"), title || "Lifeline Run");
    setText(
      this.context.querySelector("p"),
      copy || "Deliver aid to the surviving wounded soldiers.",
    );
    const progress = this.context.querySelector(".mf-protocol-progress");
    progress.hidden = !channel || channel.kind === "wire";
    if (channel)
      progress.querySelector("i").style.width =
        `${clamp(channel.progress / (channel.duration || 1), 0, 1) * 100}%`;
    setText(
      this.holdButton.firstChild,
      context
        ? {
            plant: "Hold to plant",
            defuse: "Hold to disable",
            repair: "Hold to restore",
            collect: "Hold to collect",
            load: "Hold to load",
            depart: "Hold to depart",
            deliver: "Hold to deliver",
            "repair-cargo": "Hold to repair",
            "flight-task": "Hold to prepare",
            "disable-autopilot": "Hold to sabotage",
            "cargo-sabotage": "Hold to sabotage",
          }[context.kind] || "Hold to interact"
        : "Find an objective",
    );
    if (mission?.interactiveTasks && INTERACTIVE_TASKS.has(context?.kind)) setText(this.holdButton.firstChild, "Check equipment");
    this.holdButton.disabled = !this.canInteract();
    this.holdButton.hidden = this.piloting || !context;
  }

  updateActions(view) {
    const { protocol, time } = view,
      self = protocol.self,
      alive = this.alive(),
      roam = protocol.phase === "roam",
      infiltrator = self.role === "infiltrator";
    const mission = protocol.mission,
      vehicle = mission?.vehicle,
      pilot = this.piloting;
    setText(
      this.tactics.querySelector(".mf-protocol-medicaltactics"),
      mission?.phase === "transport"
        ? "At avionics, hold for six seconds to disable autopilot. At cargo, hold to damage the shipment. These actions require a stationary hold and sabotage cooldown."
        : "Blend in with medical collection. Base system sabotage and concealed charges can delay or end the rescue.",
    );
    const helm = this.actionBar.querySelector(".mf-protocol-helm"),
      release = this.actionBar.querySelector(".mf-protocol-releasehelm"),
      autopilot = this.actionBar.querySelector(".mf-protocol-autopilot");
    helm.hidden =
      !alive || infiltrator || !roam || !this.nearby.helm || pilot || Boolean(vehicle?.arrived);
    helm.disabled =
      Boolean(vehicle?.pilotId) || this.actions.some((action) => action.op === "helm");
    setText(
      helm.querySelector("small"),
      vehicle?.pilotId ? "Pilot seat occupied" : "Disengages autopilot",
    );
    release.hidden = !pilot;
    release.disabled = this.actions.some((action) => action.op === "release-helm");
    autopilot.hidden = !pilot || vehicle?.autopilot;
    autopilot.disabled =
      !vehicle?.underControl || this.actions.some((action) => action.op === "autopilot");
    setText(
      autopilot.querySelector("small"),
      vehicle?.underControl ? "Aircraft stabilized · ready" : "Trim gauges for 3 seconds",
    );
    this.actionBar.querySelector(".mf-protocol-report").hidden =
      !alive || !roam || !this.nearby.body;
    setText(this.actionBar.querySelector('.mf-protocol-report').firstChild,'Report body');
    this.actionBar.querySelector(".mf-protocol-emergency").hidden =
      !alive || !roam || !this.nearby.emergency;
    this.actionBar.querySelector('.mf-protocol-emergency').disabled=self.emergenciesLeft<=0||protocol.emergencyReadyAt>time;
    const kill = this.actionBar.querySelector(".mf-protocol-eliminate");
    kill.hidden = !alive || !roam || !infiltrator || !this.nearby.target;
    kill.disabled =
      !this.nearby.target ||
      time < self.killReadyAt ||
      this.actions.some((action) => action.op === "eliminate");
    setText(
      kill.querySelector("small"),
      time < self.killReadyAt
        ? `Ready in ${Math.ceil(self.killReadyAt - time)}s`
        : "X · close range",
    );
    this.g.$(".mf-protocol-openactions").hidden = !alive || !roam || !infiltrator;
    if (!alive || !roam || !infiltrator) this.tactics.hidden = true;
    for (const button of this.tactics.querySelectorAll("[data-sabotage]"))
      button.disabled =
        !alive ||
        !roam ||
        !infiltrator ||
        time < self.sabotageReadyAt ||
        this.actions.some((action) => action.op === "sabotage") ||
        protocol.sabotage[`${button.dataset.sabotage}Until`] > time;
    setText(
      this.tactics.querySelector(".mf-protocol-cooldown"),
      time < self.sabotageReadyAt
        ? `Sabotage recharges in ${Math.ceil(self.sabotageReadyAt - time)}s.`
        : "Sabotage draws operators toward a repair terminal.",
    );
    setText(
      this.tactics.querySelector(".mf-protocol-allies"),
      `Covert partner: ${(self.allies || []).map((ally) => ally.name || "Partner").join(", ") || "No active partner"}.`,
    );
    const drag = this.tactics.querySelector(".mf-protocol-drag");
    drag.hidden = !this.nearby.carriedBody && !this.nearby.dragBody;
    setText(drag, this.nearby.carriedBody ? "Drop carried body" : "Drag nearby body");
    const vent = this.nearby.vent;
    const ventKey = `${vent?.id || "none"}:${time >= self.ventReadyAt}:${this.nearby.carriedBody?.id || ""}`;
    if (ventKey !== this.ventKey) {
      this.ventKey = ventKey;
      const links = this.tactics.querySelector(".mf-protocol-ventlinks");
      links.replaceChildren();
      if (!vent)
        links.append(element("p", "", "Stand near a maintenance hatch to see its linked exits."));
      else
        for (const id of vent.links || []) {
          const destination = protocol.vents.find((item) => item.id === id);
          const button = element("button", "", destination?.name || "Linked hatch");
          button.dataset.vent = id;
          button.disabled = time < self.ventReadyAt || Boolean(this.nearby.carriedBody);
          links.append(button);
        }
    }
  }

  updateArming(view) {
    const channel = view.protocol.self.channel,
      wire = channel?.kind === "wire" && this.alive() && view.protocol.phase === "roam";
    if (!wire) {
      if (this.arming.open) {
        this.arming.close();
        this.resumeFocus();
      }
      this.armingTarget = null;
      return;
    }
    setText(this.arming.querySelector(".mf-protocol-armingnumber"), channel.code || "");
    setText(
      this.arming.querySelector(".mf-protocol-armingtimer"),
      `Confirm within ${Math.max(0, Math.ceil(channel.deadline - view.time))} seconds. Stay stationary.`,
    );
    if (this.armingTarget !== channel.target) {
      this.armingTarget = channel.target;
      this.arming.querySelector("input").value = "";
      this.arming.querySelector("button").disabled = false;
    }
    if (!this.arming.open) {
      this.releaseMouse();
      this.arming.showModal();
      this.arming.querySelector("input").focus({ preventScroll: true });
    }
    this.arming.querySelector("button").disabled = this.actions.some(
      (action) => action.op === "wire",
    );
  }

  updateMeeting(view) {
    const protocol = view.protocol,
      meeting = protocol.meeting;
    if (!["discussion", "vote"].includes(protocol.phase) || !meeting) {
      if (this.meeting.open) {
        this.meeting.close();
        this.resumeFocus();
      }
      this.meetingKey = "";
      return;
    }
    if (this.brief.open) this.brief.close();
    if (this.arming.open) this.arming.close();
    if (!this.meeting.open) {
      this.releaseMouse();
      this.meeting.showModal();
      this.meeting
        .querySelector(this.alive() ? "input" : ".mf-protocol-meetingmenu")
        .focus({ preventScroll: true });
    }
    const alive = this.alive(),
      votePhase = protocol.phase === "vote",
      ownVote = meeting.votes?.[this.g.selfId],
      pendingVote = this.actions.find((action) => action.op === "vote")?.target,
      selectedVote = ownVote || pendingVote;
    setText(
      this.meeting.querySelector("h2"),
      meeting.reason === "body" ? "Body reported" : "Radio meeting",
    );
    setText(
      this.meeting.querySelector(".mf-protocol-meetingphase"),
      `${votePhase ? "Voting" : "Discussion"} · ${countdown((votePhase ? meeting.voteUntil : meeting.discussionUntil) - view.time)}`,
    );
    const caller = view.entities.find((item) => item.id === meeting.caller);
    setText(
      this.meeting.querySelector(".mf-protocol-meetingreason"),
      `${caller?.name || "An operator"} called this meeting: ${meeting.reason || "radio assembly"}. Share observations and positions. The clock is paused while you talk.`,
    );
    setText(
      this.meeting.querySelector(".mf-protocol-meetinghint"),
      !alive
        ? "Observer only. Eliminated operators cannot speak or vote."
        : ownVote
          ? "Vote recorded. Your vote cannot be changed."
          : pendingVote
            ? "Submitting your vote…"
            : votePhase
              ? "More than half the living patrol must vote for one suspect to begin Last Stand: accused versus every other survivor. Ties and Skip return to the mission."
              : "Discuss first. Voting opens when the discussion timer ends.",
    );
    const input = this.meeting.querySelector("input");
    input.disabled = !alive || votePhase;
    this.meeting.querySelector("form button").disabled =
      !alive ||
      votePhase ||
      performance.now() < (this.chatReadyAt || 0) ||
      this.actions.some((action) => action.op === "chat");
    const messageKey = `${meeting.id}:${meeting.messages?.map((message) => message.id).join(",")}`;
    if (messageKey !== this.messageKey) {
      this.messageKey = messageKey;
      const radio = this.meeting.querySelector(".mf-protocol-radio");
      const nearEnd = radio.scrollHeight - radio.scrollTop - radio.clientHeight < 35;
      radio.replaceChildren();
      if (!meeting.messages?.length)
        radio.append(element("p", "", "Radio channel open. Describe what you actually witnessed."));
      for (const message of meeting.messages || []) {
        const line = element("p"),
          sender = view.entities.find((entity) => entity.id === message.sender),
          who = element("b", "", `${sender?.mark ? sender.mark + " " : ""}${message.name || "Operator"}: `);
        if (sender?.color) who.style.color = sender.color;
        line.append(who, document.createTextNode(message.text || ""));
        radio.append(line);
      }
      if (nearEnd) radio.scrollTop = radio.scrollHeight;
    }
    const living = view.entities.filter((entity) => entity.hp > 0 && !entity.departed);
    const voteKey = `${meeting.id}:${protocol.phase}:${living.map((item) => item.id).join(",")}:${selectedVote || ""}:${alive}`;
    if (voteKey !== this.voteKey) {
      this.voteKey = voteKey;
      const choices = this.meeting.querySelector(".mf-protocol-votes");
      choices.replaceChildren();
      for (const candidate of living) {
        const button = element(
          "button",
          "",
          `${candidate.name || "Operator"}${candidate.colorName ? " · " + candidate.colorName : ""}${candidate.id === this.g.selfId ? " (you)" : ""}`,
        );
        if (candidate.mark) {
          const mark = element("span", "mf-protocol-mark", candidate.mark + " ");
          if (candidate.color) mark.style.color = candidate.color;
          button.prepend(mark);
        }
        if (candidate.color) {
          button.style.borderLeft = `6px solid ${candidate.color}`;
          button.title = candidate.colorName || "";
          if (candidate.colorName) button.setAttribute("aria-label", `${candidate.name}, ${candidate.colorName}`);
        }
        button.dataset.vote = candidate.id;
        button.disabled = !votePhase || !alive || Boolean(selectedVote);
        button.setAttribute("aria-pressed", String(candidate.id === selectedVote));
        choices.append(button);
      }
      const skip = this.meeting.querySelector(".mf-protocol-skip");
      skip.disabled = !votePhase || !alive || Boolean(selectedVote);
      skip.setAttribute("aria-pressed", String(selectedVote === "skip"));
    }
    if (this.meetingKey !== `${meeting.id}:${protocol.phase}`) {
      this.meetingKey = `${meeting.id}:${protocol.phase}`;
      setText(
        this.live,
        votePhase
          ? "Voting is open. Choose a suspect or skip combat."
          : "Radio meeting started. Discuss your observations.",
      );
    }
  }

  updateCombat(view) {
    const g = this.g,
      c = view.protocol.combat,
      active = view.protocol.phase === "combat" && !!c,
      alive = this.alive(),
      ready = active && view.time >= c.startsAt;
    this.combatStats.hidden = !active;
    for (const selector of [".mf-fire", ".mf-reload"]) {
      const button = g.$(selector);
      button.hidden = !active || !alive;
      button.disabled = !ready || !alive;
    }
    if (!active) return;
    this.tactics.hidden = true;
    this.held = false;
    this.clearFlightInput();
    const crew = view.entities.filter(
        (e) => c.participants.includes(e.id) && e.id !== c.targetId && e.hp > 0 && !e.departed,
      ).length,
      label = !alive ? "OBSERVER" : g.selfId === c.targetId ? "ACCUSED" : "PATROL";
    setText(
      this.combatStats,
      `${label} · HP ${Math.ceil(g.player.hp)} · ${g.player.reloadUntil > view.time ? "Reloading" : `${g.player.ammo} rounds`} · ${crew} vs 1`,
    );
    setText(
      this.live,
      !ready
        ? "Last Stand is preparing. Weapons unlock after the countdown."
        : "Last Stand. Fire with click or Space; reload with R. Only opposing sides take damage.",
    );
  }

  refreshMenu() {
    if (this.disposed) return;
    this.g.practice?.refresh();
    const g = this.g,
      active = g.mode === "protocol";
    g.spectator?.update();
    g.shell.classList.toggle("mf-protocol", active);
    this.menu.hidden = !active;
    this.results.hidden = !active || g.state !== "ended";
    if (!this.visibleGameplay()) {
      this.focus?.update(null, false);
      this.hud.hidden =
        this.actionBar.hidden =
        this.context.hidden =
        this.flight.hidden =
        this.flightPad.hidden =
          true;
      this.clearFlightInput();
      this.tactics.hidden = true;
      this.held = false;
      this.focus?.close();
      for (const dialog of [this.brief, this.arming, this.meeting]) if (dialog.open) dialog.close();
    }
    const preference = this.menu.querySelector("select");
    preference.value = g.rolePreference || "operator";
    preference.disabled = Boolean(g.online);
    preference.closest("label").hidden = Boolean(g.online) || g.ui?.playChoice === "online";
    setText(
      this.menu.querySelector("p"),
      g.online || g.ui?.playChoice === "online"
        ? "Roles are secret and dealt by the server. Bots fill empty seats."
        : "",
    );
    if (!active) {
      this.hud.hidden =
        this.actionBar.hidden =
        this.context.hidden =
        this.flight.hidden =
        this.flightPad.hidden =
          true;
      this.clearFlightInput();
      this.tactics.hidden = true;
      this.actions = [];
      if (!g.online) {
        g.$(".mf-weaponselect").disabled = false;
        g.$(".mf-mapselect").disabled = false;
      }
      if (this.wasProtocol && this.originalHelp != null)
        g.$(".mf-help").innerHTML = this.originalHelp;
      if (this.wasProtocol && this.originalWeaponLabel != null)
        setText(g.$(".mf-weaponselect").closest("label").firstChild, this.originalWeaponLabel);
      if (this.wasProtocol && this.originalMapLabel != null)
        setText(g.$(".mf-mapselect").closest("label").firstChild, this.originalMapLabel);
      if (this.wasProtocol && this.originalDescription != null)
        setText(this.description, this.originalDescription);
      if (this.wasProtocol && this.originalShellLabel)
        g.shell.setAttribute("aria-label", this.originalShellLabel);
      this.wasProtocol = false;
      return;
    }
    this.wasProtocol = true;
    g.shell.setAttribute("aria-label", "Outpost Zero Blackout Protocol controls");
    if (this.description)
      setText(
        this.description,
        "First-person social deduction and medical rescue. On foot, WASD moves; mouse or arrow keys aims. Hold E to collect, load, depart, repair or deliver aid. F reports, C calls a meeting, X eliminates as an infiltrator, and B opens tactics. At the aircraft helm, W/S raises or lowers flight level; A/D steers. Stabilize both gauges for three seconds, restore autopilot, then release the helm. Touch uses the movement joystick on foot and four directional buttons at the helm. Escape or P opens the menu. Weapons unlock only during a voted Last Stand; click / Space fires and R reloads.",
      );
    const matchStatus = g.$(".mf-accessstatus"),
      view = this.safeView();
    if (matchStatus && view?.protocol?.self && g.state !== "fresh")
      setText(
        matchStatus,
        `Blackout Protocol, Lifeline Run. Your role: ${view.protocol.self.role}. Medical cargo loaded: ${view.protocol.mission?.manifest.reduce((sum, item) => sum + item.loaded, 0) || 0}. Patients alive: ${view.protocol.mission?.patients.filter((patient) => patient.hp > 0).length || 0}. Mission phase: ${view.protocol.mission?.phase || "base"}.`,
      );
    g.$(".mf-mapselect").disabled = true;
    setText(g.$(".mf-mapselect").closest("label").firstChild, "Mission area");
    const weaponSelect = g.$(".mf-weaponselect");
    weaponSelect.disabled = true;
    setText(weaponSelect.closest("label").firstChild, "Matching kit");
    setText(g.$(".mf-weaponhint"), "Standard issue · identical for every role");
    setText(
      g.$(".mf-weaponinfo"),
      "Every operator carries the same standard-issue kit. Infiltrators eliminate at close range; weapons unlock only when a majority vote starts Last Stand.",
    );
    const copy = g.$(".mf-copy");
    if (g.state === "fresh")
      setText(
        copy,
        "Load the medevac and fly aid to wounded soldiers before they die. Two of your crew are secret infiltrators. Find them.",
      );
    setText(
      g.$(".mf-kitnote"),
      "Lifeline Run begins at Breakwater and boards the medevac after the medical manifest is loaded. Both phases use matching uniforms and secret online roles; bots fill empty seats. Offline role preference starts a fresh round.",
    );
    const instructions = g.$(".mf-help");
    if (instructions)
      setText(
        instructions,
        "On foot: WASD / left joystick moves. Press E / Check equipment for packing, repairs, aircraft checks and delivery. Hold E / the action button to load, depart, disable a charge or sabotage. F reports, C calls a meeting, X eliminates, B opens tactics. At the helm: W/S adjusts flight level; A/D steers. Hold both gauges in their safe bands for three seconds, restore autopilot, then release the helm. Escape / P opens the menu.",
      );
    if (g.state === "fresh" && !g.online) setText(g.$(".mf-start"), "PLAY OFFLINE →");
    if (g.state === "ended") this.result();
  }

  result() {
    const view = this.safeView();
    if (!view?.protocol || view.state !== "ended") return;
    const g = this.g,
      protocol = view.protocol;
    this.results.hidden = false;
    this.hud.hidden =
      this.actionBar.hidden =
      this.context.hidden =
      this.flight.hidden =
      this.flightPad.hidden =
        true;
    this.focus?.close();
    this.clearFlightInput();
    this.tactics.hidden = true;
    if (this.resultRound === view.roundId) return;
    this.resultRound = view.roundId;
    this.actions = [];
    this.held = false;
    for (const dialog of [this.meeting, this.arming, this.brief]) if (dialog.open) dialog.close();
    this.results.replaceChildren();
    const operatorsWon = view.winner === 0,
      delivered = protocol.mission?.patients.some((patient) => patient.rescued);
    this.results.append(
      element(
        "h2",
        "",
        operatorsWon ? (delivered ? "Lifesaving aid delivered" : "Infiltrators stopped") : "Lifeline Run lost",
      ),
    );
    this.results.append(
      element(
        "p",
        "",
        protocol.resultReason ||
          (operatorsWon
            ? "The medical crew delivered aid to surviving wounded soldiers."
            : "The rescue failed before aid reached the wounded soldiers."),
      ),
    );
    this.results.append(
      element(
        "p",
        "",
        `Patients rescued: ${protocol.mission?.patients.filter((patient) => patient.rescued).length || 0}/${protocol.mission?.patients.length || 4}. Your role: ${protocol.self?.role === "infiltrator" ? "Infiltrator" : "Operator"}. Roles are now declassified.`,
      ),
    );
    const roles = protocol.revealedRoles || {},
      list = element("ul");
    for (const entity of view.entities)
      if (roles[entity.id])
        list.append(
          element(
            "li",
            "",
            `${entity.mark ? entity.mark + " " : ""}${entity.name || "Operator"}${entity.id === g.selfId ? " (you)" : ""} · ${roles[entity.id] === "infiltrator" ? "Infiltrator" : "Operator"}`,
          ),
        );
    if (list.children.length) this.results.append(list);
    // Standout players this round.
    if (protocol.awards?.length) {
      const awards = element("div", "mf-protocol-awards");
      awards.setAttribute("aria-label", "Round awards");
      for (const award of protocol.awards) {
        const card = element("div", "mf-protocol-award");
        if (award.color) card.style.borderColor = award.color;
        card.append(
          element("span", "mf-protocol-awardicon", award.icon),
          element("b", "", award.title),
          element("span", "", `${award.mark ? award.mark + " " : ""}${award.name}${award.playerId === g.selfId ? " (you)" : ""}`),
          element("small", "", award.detail),
        );
        awards.append(card);
      }
      this.results.append(awards);
    }
    // Share how it went, with a link that brings friends to the game.
    if (!g.practice?.active && !g.academy?.active) {
      const card = shareSummary(view, g.selfId);
      const box = element("div", "mf-protocol-share"),
        status = element("small", "mf-protocol-sharestatus", "");
      const share = element("button", "mf-protocol-sharebtn", "Share result"),
        chat = element("a", "mf-protocol-sharewa", "WhatsApp");
      share.type = "button";
      chat.href = whatsappUrl(card);
      chat.target = "_blank";
      chat.rel = "noopener";
      status.setAttribute("aria-live", "polite");
      g.on(share, "click", async () => {
        share.disabled = true;
        try {
          status.textContent = await shareResult(card);
        } finally {
          share.disabled = false;
        }
      });
      const row = element("div", "mf-protocol-sharerow");
      row.append(share, chat);
      box.append(element("p", "", card.headline), row, status);
      this.results.append(box);
    }
    // What really happened, secrets included.
    if (protocol.timeline?.length) {
      const details = element("details", "mf-protocol-timeline"),
        items = element("ol");
      details.append(element("summary", "", `Match timeline · ${protocol.timeline.length} moments`));
      for (const entry of protocol.timeline) {
        const item = element("li");
        item.dataset.kind = entry.kind || "event";
        item.append(element("time", "", countdown(entry.t)), document.createTextNode(` ${entry.text}`));
        items.append(item);
      }
      details.append(items);
      this.results.append(details);
    }
    setText(
      this.live,
      operatorsWon ? "Round over. Lifesaving aid delivered." : "Round over. Lifeline Run lost.",
    );
  }

  /** All world props render in the realistic 3D scene. Kept for embed compatibility. */
  draw() {}

  dispose() {
    this.taskPanel?.dispose();
    this.focus?.dispose();
    this.disposed = true;
    this.actions = [];
    this.held = false;
    for (const node of [
      this.style,
      this.hud,
      this.context,
      this.actionBar,
      this.tactics,
      this.menu,
      this.results,
      this.brief,
      this.guide,
      this.arming,
      this.meeting,
      this.live,
      this.flight,
      this.flightPad,
      this.combatStats,
      this.combatMarker,
    ]) {
      if (node?.tagName === "DIALOG" && node.open) node.close();
      node?.remove();
    }
    this.g.shell.classList.remove("mf-protocol", "mf-protocol-piloting", "mf-protocol-combat");
  }
}
