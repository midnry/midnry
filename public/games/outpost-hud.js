/** In-match HUD styling for larger screens: a mission wordmark, the manifest
 * under the Info button, patient vitals and the phase clock top right, a
 * radio ticker under the alert banner, action buttons with key caps and the
 * waypoint at the bottom centre. It reads the same filtered view the UI
 * already renders, so it never shows anything a player could not see. Phones
 * keep the compact layout. */
import { icon } from "./outpost-icons.js";

const SUPPLY_ICON = { trauma: "medkit", surgical: "scissors", fluids: "drip", nutrition: "pill" };
const ACTIONS = [
  ["hold", "medkit", "E"],
  ["report", "alert", "F"],
  ["emergency", "radio", "C"],
  ["eliminate", "target", "X"],
  ["ability", "spark", "Q"],
  ["openactions", "power", "B"],
  ["helm", "plane", ""],
  ["releasehelm", "plane", ""],
  ["autopilot", "plane", ""],
];
const mask = (name) =>
  `url("data:image/svg+xml,${encodeURIComponent(icon(name).replace('class="mf-ico"', 'xmlns="http://www.w3.org/2000/svg"').replace('stroke="currentColor"', 'stroke="black"'))}")`;

const DESKTOP = "(min-width: 900px) and (min-height: 560px)";
const CSS = `
midnry-fps :is(.mf-hudbrand, .mf-hudmanifest, .mf-hudvitals, .mf-hudphase) { display: none; }
midnry-fps .mf-shell:has(.mf-modal:not([hidden])) :is(.mf-hudbrand, .mf-hudmanifest, .mf-hudvitals, .mf-hudphase) { display: none !important; }
/* Every screen size: the same squared, condensed style as the menu. */
midnry-fps .mf-protocol-focus :is(.mf-protocol-infoopen, .mf-pause) { border-radius: 3px !important; background: #070b0acc !important; border: 1px solid #ffffff2b !important; font-family: var(--mf-display) !important; letter-spacing: 0.06em; text-transform: uppercase; }
midnry-fps .mf-protocol-focus .mf-protocol-actions button { border-radius: 3px !important; font: 600 15px var(--mf-display) !important; letter-spacing: 0.05em !important; text-transform: uppercase; }
midnry-fps .mf-protocol-focus .mf-protocol-actions .mf-protocol-hold { background: #f1f4ef !important; color: #0b0f0d !important; border-color: #f1f4ef !important; }
midnry-fps .mf-protocol-focus .mf-protocol-context { border-radius: 3px !important; background: #070b0acc !important; border: 1px solid #ffffff2b !important; font-family: var(--mf-display) !important; }
midnry-fps .mf-protocol-focus .mf-protocol-context :is(b, .mf-navline, .mf-navline *) { font-family: var(--mf-display) !important; font-size: 15px !important; letter-spacing: 0.03em; }
midnry-fps .mf-protocol-focus .mf-protocol-urgent { border-radius: 3px !important; font-family: var(--mf-display) !important; text-transform: uppercase; letter-spacing: 0.06em !important; }
midnry-fps .mf-protocol-focus .mf-protocol-urgent[data-level="info"] { background: #06121acc !important; border-color: #4fc3ff !important; color: #bfe9ff !important; box-shadow: 0 0 14px #4fc3ff44 !important; }
midnry-fps .mf-protocol-focus .mf-toast { font-family: var(--mf-display) !important; letter-spacing: 0.03em !important; }
@media ${DESKTOP} {
  midnry-fps .mf-shell.mf-hudon :is(.mf-brand, .mf-tag) { display: none !important; }
  midnry-fps .mf-shell.mf-hudon .mf-hudbrand { display: block; position: absolute; z-index: 6; top: 18px; left: 22px; padding-left: 12px; border-left: 2px solid #f1f4ef; pointer-events: none; color: #f1f4ef; text-shadow: 0 2px 8px #000a; }
  midnry-fps .mf-hudbrand b { display: block; font: 700 17px var(--mf-display); letter-spacing: 0.42em; }
  midnry-fps .mf-hudbrand b span { color: var(--mf-accent); }
  midnry-fps .mf-hudbrand small { display: block; margin-top: 3px; font: 600 12px var(--mf-display); letter-spacing: 0.28em; text-transform: uppercase; color: #d5ddd7; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-infoopen { top: 74px !important; left: 22px !important; width: 270px; min-height: 44px !important; display: flex; align-items: center; justify-content: space-between; padding: 0 14px !important; border-radius: 3px 3px 0 0 !important; border: 1px solid #ffffff2b !important; background: #070b0acc !important; backdrop-filter: blur(6px); font: 600 18px var(--mf-display) !important; letter-spacing: 0.08em; text-transform: uppercase; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-infoopen::after { content: ""; width: 14px; height: 14px; background: currentColor; -webkit-mask: ${mask("chevron")} center / contain no-repeat; mask: ${mask("chevron")} center / contain no-repeat; }
  midnry-fps .mf-shell.mf-hudon .mf-hudmanifest:not([hidden]) { display: block; position: absolute; z-index: 6; top: 118px; left: 22px; width: 270px; border: 1px solid #ffffff2b; border-top: 0; border-radius: 0 0 3px 3px; background: #070b0ab8; backdrop-filter: blur(6px); pointer-events: none; }
  midnry-fps .mf-hudmanifest li { display: grid; grid-template-columns: 26px 1fr auto; align-items: center; gap: 10px; padding: 9px 14px; border-top: 1px solid #ffffff12; font: 500 16px var(--mf-display); letter-spacing: 0.02em; color: #eef2ee; }
  midnry-fps .mf-hudmanifest ul { margin: 0; padding: 0; list-style: none; }
  midnry-fps .mf-hudmanifest .mf-ico { width: 20px; height: 20px; color: var(--mf-accent); }
  midnry-fps .mf-hudmanifest li b { font: 600 18px var(--mf-display); color: #ff7b6b; }
  midnry-fps .mf-hudmanifest li.part b { color: #f1f4ef; }
  midnry-fps .mf-hudmanifest li.done b { color: #8fe3a8; }
  midnry-fps .mf-hudmanifest li.mine { background: #ffc85714; box-shadow: inset 3px 0 0 var(--mf-accent); }
  midnry-fps .mf-hudmanifest li.mine b { color: var(--mf-accent); }
  midnry-fps .mf-hudmanifest li.done { color: #aeb9b2; }
  midnry-fps .mf-hudmanifest h4 { margin: 0; padding: 8px 14px 4px; font: 600 13px var(--mf-display); letter-spacing: 0.16em; text-transform: uppercase; color: #aeb9b2; }
  midnry-fps .mf-shell.mf-hudon .mf-hudphase { display: flex; position: absolute; z-index: 6; top: 16px; right: 78px; align-items: center; gap: 18px; height: 44px; padding: 0 16px; border: 1px solid #ffffff2b; border-radius: 3px; background: #070b0acc; backdrop-filter: blur(6px); pointer-events: none; font: 600 16px var(--mf-display); letter-spacing: 0.1em; text-transform: uppercase; color: #eef2ee; }
  midnry-fps .mf-hudphase b { font-weight: 600; font-variant-numeric: tabular-nums; }
  midnry-fps .mf-shell.mf-hudon .mf-top { left: auto !important; right: 22px !important; top: 16px !important; width: auto !important; margin: 0 !important; }
  midnry-fps .mf-shell.mf-hudon .mf-pause { width: 44px; height: 44px; border-radius: 3px !important; background: #070b0acc !important; border: 1px solid #ffffff2b !important; }
  midnry-fps .mf-shell.mf-hudon .mf-hudvitals:not([hidden]) { display: block; position: absolute; z-index: 6; top: 74px; right: 22px; border: 1px solid #ffffff2b; border-radius: 3px; background: #070b0ab8; backdrop-filter: blur(6px); pointer-events: none; }
  midnry-fps .mf-hudvitals h4 { margin: 0; padding: 8px 14px; border-bottom: 1px solid #ffffff14; font: 600 15px var(--mf-display); letter-spacing: 0.1em; text-transform: uppercase; color: #eef2ee; }
  midnry-fps .mf-hudvitals ul { display: flex; margin: 0; padding: 0; list-style: none; }
  midnry-fps .mf-hudvitals li { width: 64px; padding: 8px 0 9px; display: grid; justify-items: center; gap: 3px; border-left: 1px solid #ffffff12; font: 600 19px var(--mf-display); color: #eef2ee; }
  midnry-fps .mf-hudvitals li:first-child { border-left: 0; }
  midnry-fps .mf-hudvitals .mf-ico { width: 22px; height: 22px; color: #55d68f; }
  midnry-fps .mf-hudvitals li.warn .mf-ico { color: var(--mf-accent); }
  midnry-fps .mf-hudvitals li.bad { color: #ff7b6b; }
  midnry-fps .mf-hudvitals li.bad .mf-ico { color: #ff5a4a; animation: mf-vital-pulse 0.9s ease-in-out infinite; }
  midnry-fps .mf-hudvitals li.safe { color: #8fe3a8; font-size: 13px; letter-spacing: 0.1em; }
  midnry-fps .mf-hudvitals li.lost { color: #7c8781; font-size: 13px; letter-spacing: 0.1em; }
  midnry-fps .mf-hudvitals li.lost .mf-ico { color: #56605a; }
  @keyframes mf-vital-pulse { 50% { opacity: 0.45; } }
  @media (prefers-reduced-motion: reduce) { midnry-fps .mf-hudvitals li.bad .mf-ico { animation: none; } }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button:focus-visible { outline: 2px solid var(--mf-accent) !important; outline-offset: 2px; }
  /* Alert banner and radio ticker, top centre. */
  midnry-fps .mf-shell.mf-hudon .mf-protocol-urgent { top: 76px !important; padding: 8px 22px !important; border-radius: 4px !important; background: #06121acc !important; border: 1.5px solid #4fc3ff !important; color: #bfe9ff !important; box-shadow: 0 0 18px #4fc3ff55, inset 0 0 12px #4fc3ff22 !important; font: 600 22px var(--mf-display) !important; letter-spacing: 0.06em !important; text-transform: uppercase; animation: none !important; }
  /* Training drills: the coach sits top-centre, clear of the supply list. */
  midnry-fps .mf-shell.mf-hudon .mf-practice-coach { top: 16px !important; left: 50% !important; transform: translateX(-50%); width: min(520px, 44vw) !important; min-height: 44px; padding: 10px 16px !important; border: 1px solid var(--mf-accent) !important; border-radius: 3px !important; background: #070b0ae6 !important; font: 600 15px/1.35 var(--mf-body) !important; z-index: 7; }
  /* At the helm the flight panel takes the duty list's place; the alert stays centred. */
  midnry-fps .mf-shell.mf-hudon.mf-protocol-piloting .mf-hudmanifest { display: none !important; }
  midnry-fps .mf-shell.mf-hudon.mf-protocol-piloting .mf-protocol-flight { top: 118px !important; left: 22px !important; width: 330px !important; z-index: 7; padding: 14px 16px !important; border-radius: 0 0 3px 3px !important; border: 1px solid #ffffff2b !important; border-top: 0 !important; background: #070b0ae0 !important; font-size: 13px !important; }
  midnry-fps .mf-shell.mf-hudon.mf-protocol-piloting .mf-protocol-flight > b { font: 700 16px var(--mf-display) !important; letter-spacing: 0.06em; text-transform: uppercase; }
  midnry-fps .mf-shell.mf-hudon.mf-protocol-piloting .mf-protocol-urgent { left: 50% !important; right: auto !important; transform: translateX(-50%) !important; width: auto !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-urgent[data-level="danger"] { background: #1c0807cc !important; border-color: #ff5a4a !important; color: #ffd2cc !important; box-shadow: 0 0 18px #ff5a4a55, inset 0 0 12px #ff5a4a22 !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-urgent[data-level="warn"] { background: #1a1305cc !important; border-color: var(--mf-accent) !important; color: #ffe6a8 !important; box-shadow: 0 0 18px #ffc85744, inset 0 0 12px #ffc85722 !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-chatter { left: 50% !important; right: auto !important; top: 132px !important; bottom: auto !important; transform: translateX(-50%); width: min(520px, 46vw) !important; justify-items: center; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-chatter p { display: flex; align-items: center; gap: 10px; padding: 7px 16px !important; border-radius: 4px !important; background: #070b0acc !important; border: 1px solid #ffffff22 !important; font: 500 16px var(--mf-display) !important; letter-spacing: 0.02em; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-chatter p::before { content: ""; flex: none; width: 20px; height: 20px; background: #4fc3ff; -webkit-mask: ${mask("wave")} center / contain no-repeat; mask: ${mask("wave")} center / contain no-repeat; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-chatter p b { color: var(--mf-accent); }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-chatter p:not(:nth-last-child(-n + 2)) { display: none; }
  /* Action stack, bottom right. */
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions { right: 22px !important; bottom: 22px !important; width: 290px; max-width: none !important; gap: 8px !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button { position: relative; display: grid !important; grid-template-columns: 30px 1fr 30px; align-items: center; column-gap: 14px; min-height: 54px !important; padding: 0 12px 0 16px !important; text-align: left; border-radius: 3px !important; border: 1px solid #ffffff2b !important; background: #070b0ad0 !important; backdrop-filter: blur(6px); color: #eef2ee !important; font: 600 17px var(--mf-display) !important; letter-spacing: 0.06em !important; text-transform: uppercase; box-shadow: none !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button::before { content: ""; grid-column: 1; grid-row: 1; width: 26px; height: 26px; background: currentColor; -webkit-mask: var(--mf-act) center / contain no-repeat; mask: var(--mf-act) center / contain no-repeat; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button::after { content: var(--mf-key); grid-column: 3; grid-row: 1; display: grid; place-items: center; width: 26px; height: 26px; border: 1px solid #ffffff88; border-radius: 3px; font: 600 15px var(--mf-display); }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button[data-nokey]::after { visibility: hidden; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button:first-child { min-height: 72px !important; border-color: #ffffff55 !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button:first-child::after { background: #f1f4ef; color: #0b0f0d; border-color: #f1f4ef; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button[aria-pressed="true"] { border-color: var(--mf-accent) !important; box-shadow: inset 4px 0 0 var(--mf-accent) !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button:disabled { opacity: 0.55; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button small { display: none !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-actions button[hidden] { display: none !important; }
  ${ACTIONS.map(([cls, name, key]) => `midnry-fps .mf-protocol-actions .mf-protocol-${cls} { --mf-act: ${mask(name)}; --mf-key: "${key}"; }`).join("\n  ")}
  /* Waypoint and prompts, bottom centre. */
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context { left: 50% !important; right: auto !important; bottom: 26px !important; transform: translateX(-50%) !important; width: auto !important; min-width: 200px; max-width: 420px !important; padding: 34px 18px 8px !important; text-align: center !important; border: 0 !important; border-radius: 0 !important; background: radial-gradient(closest-side, #000a, #0000) !important; box-shadow: none !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context::before { content: ""; position: absolute; top: 4px; left: 50%; width: 30px; height: 22px; transform: translateX(-50%); background: var(--mf-accent); clip-path: polygon(50% 0, 100% 100%, 50% 72%, 0 100%); }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context :is(b, .mf-navline, .mf-navline *) { font: 600 19px var(--mf-display) !important; letter-spacing: 0.04em; color: #f1f4ef; text-shadow: 0 2px 6px #000; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context.mf-navactive::before { top: 0; width: 24px; height: 30px; clip-path: polygon(50% 0,100% 48%,66% 48%,66% 100%,34% 100%,34% 48%,0 48%); transform: translateX(-50%) rotate(var(--mf-navturn, 0deg)); transition: transform 0.12s linear; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context .mf-navarrow { display: none; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context .mf-navline { display: grid !important; justify-items: center; gap: 0; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context.mf-navactive > :is(b, p) { display: none !important; }
  midnry-fps .mf-shell.mf-hudon .mf-protocol-context .mf-navdistance { font-size: 17px !important; color: #d5ddd7 !important; }
  midnry-fps .mf-shell.mf-hudon .mf-toast { font: 600 18px var(--mf-display) !important; letter-spacing: 0.04em !important; color: #ffe6a8 !important; text-shadow: 0 2px 8px #000 !important; }
}
`;

const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export class OutpostHud {
  constructor(g) {
    this.g = g;
    const ui = g.protocolUI;
    if (!ui || !g.shell) return;
    this.style = el("style");
    this.style.dataset.outpostHud = "";
    this.style.textContent = CSS;
    g.shell.append(this.style);
    this.brand = el("div", "mf-hudbrand", "<b>OUTPOST <span>ZERO</span></b><small>Blackout Protocol | Lifeline Run</small>");
    this.manifest = el("section", "mf-hudmanifest");
    this.manifest.setAttribute("aria-hidden", "true");
    this.vitals = el("section", "mf-hudvitals", "<h4>Patient vitals</h4><ul></ul>");
    this.vitals.setAttribute("aria-hidden", "true");
    this.phase = el("div", "mf-hudphase");
    this.phase.setAttribute("aria-hidden", "true");
    g.shell.append(this.brand, this.manifest, this.vitals, this.phase);
    for (const [cls, , key] of ACTIONS) if (!key) ui.actionBar?.querySelector(`.mf-protocol-${cls}`)?.setAttribute("data-nokey", "");
    // Render after every UI update, from the same view the UI just used.
    this.original = ui.update.bind(ui);
    ui.update = (...args) => {
      const result = this.original(...args);
      this.render(ui);
      return result;
    };
  }

  render(ui) {
    const g = this.g,
      view = ui.view,
      protocol = view?.protocol,
      on = Boolean(protocol && g.mode === "protocol" && g.state === "playing" && g.$(".mf-modal")?.hidden);
    g.shell.classList.toggle("mf-hudon", on);
    if (!on) return;
    const mission = protocol.mission;
    // Manifest (base) or aircraft duties (flight).
    let rows = "";
    if (mission?.phase === "base")
      rows = (mission.manifest || [])
        .map((item) => {
          const state = item.loaded >= item.required ? "done" : item.loaded > 0 ? "part" : "";
          return `<li class="${state}">${icon(SUPPLY_ICON[item.id] || "medkit")}<span>${item.name}</span><b>${item.loaded}/${item.required}</b></li>`;
        })
        .join("");
    else if (mission?.flightTasks)
      rows =
        "<h4>Aircraft duties</h4>" +
        [...mission.flightTasks]
          .sort((a, b) => Number(!!b.mine) - Number(!!a.mine))
          .map((task) => `<li class="${task.done ? "done" : task.mine ? "mine" : ""}">${icon("plane")}<span>${task.mine ? "Yours: " : ""}${task.name}</span><b>${task.done ? "Done" : task.mine ? "You" : "Open"}</b></li>`)
          .join("");
    const manifestHtml = rows ? (rows.startsWith("<h4>") ? rows.replace(/^(<h4>.*?<\/h4>)/, "$1<ul>") + "</ul>" : `<ul>${rows}</ul>`) : "";
    if (manifestHtml !== this.lastManifest) {
      this.lastManifest = manifestHtml;
      this.manifest.innerHTML = manifestHtml;
      this.manifest.hidden = !manifestHtml;
    }
    // Patient vitals.
    const vitals = (mission?.patients || [])
      .map((patient) => {
        const pct = Math.round((patient.hp / (patient.maxHp || 100)) * 100);
        const state = patient.rescued ? "safe" : patient.hp <= 0 ? "lost" : pct <= 25 || patient.critical ? "bad" : pct <= 50 ? "warn" : "";
        const value = patient.rescued ? "SAFE" : patient.hp <= 0 ? "LOST" : String(pct);
        return `<li class="${state}" title="${patient.name}">${icon("heart")}<span>${value}</span></li>`;
      })
      .join("");
    if (vitals !== this.lastVitals) {
      this.lastVitals = vitals;
      this.vitals.querySelector("ul").innerHTML = vitals;
      this.vitals.hidden = !vitals;
    }
    // Phase and clock.
    const started = Number(mission?.startedAt) || 0;
    const phaseText =
      mission?.phase === "transport"
        ? `<span>In flight</span><b>${Math.round(((mission.vehicle?.progress || 0) / (mission.vehicle?.duration || 1)) * 100)}%</b>`
        : `<span>${protocol.phase === "roam" ? "Base" : protocol.phase === "combat" ? "Last stand" : "Meeting"}</span><b>${clock(Math.max(0, (view.time || 0) - started))}</b>`;
    if (phaseText !== this.lastPhase) {
      this.lastPhase = phaseText;
      this.phase.innerHTML = phaseText;
    }
  }

  dispose() {
    const ui = this.g.protocolUI;
    if (ui && this.original) ui.update = this.original;
    for (const node of [this.style, this.brand, this.manifest, this.vitals, this.phase]) node?.remove();
    this.g.shell?.classList.remove("mf-hudon");
  }
}
