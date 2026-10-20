/** In-game network meter: signal bars by the pause button during online
 * matches, and a panel with live ping, jitter, update rate and dropouts.
 * Offline matches run on the device, so the panel says so and offers a
 * quick connection test instead. Measurements are advisory only. */
import { testConnection, connectionAdvice } from "./outpost-connection.js";

const WINDOW = 60000; // statistics cover the last minute

/** Quality from live measurements: 4 bars excellent … 1 bar poor. */
export function networkQuality({ ping, jitter, stalls, updatesPerSecond, live = true }) {
  if (!Number.isFinite(ping)) return { bars: 0, label: "Measuring…", tone: "wait" };
  let bars =
    ping < 80 && jitter < 20
      ? 4
      : ping < 150 && jitter < 40
        ? 3
        : ping < 250 && jitter < 80
          ? 2
          : 1;
  if (stalls >= 3) bars = Math.min(bars, 1);
  else if (stalls >= 1) bars = Math.min(bars, 2);
  if (!live || (Number.isFinite(updatesPerSecond) && updatesPerSecond < 3))
    bars = Math.min(bars, 2);
  const label = ["", "Poor", "Unstable", "Good", "Excellent"][bars];
  const advice =
    bars >= 4
      ? "Your connection is steady. Online actions should feel instant."
      : bars === 3
        ? "Your connection is fine. Small delays are possible during busy moments."
        : stalls >= 1
          ? "Updates dropped out recently. Move closer to your Wi-Fi router, switch to 5 GHz Wi-Fi or mobile data, and pause downloads."
          : "Your connection is slow or uneven, so other players may jump and your actions may lag. Move closer to Wi-Fi and pause downloads.";
  return { bars, label, tone: ["wait", "bad", "warn", "ok", "great"][bars], advice };
}

export class NetMeter {
  constructor(g) {
    this.g = g;
    this.pings = []; // [time, ms]
    this.snaps = []; // arrival times
    this.stalls = []; // times an update gap passed 1 s
    this.reconnects = [];
    const top = g.$(".mf-topright");
    this.badge = document.createElement("button");
    this.badge.className = "mf-netbadge";
    this.badge.type = "button";
    this.badge.hidden = true;
    this.badge.innerHTML =
      '<span class="mf-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b></b>';
    top.insertBefore(this.badge, g.$(".mf-pause"));
    this.panel = document.createElement("dialog");
    this.panel.className = "mf-netpanel";
    this.panel.setAttribute("aria-label", "Network check");
    this.panel.innerHTML = `<header><b>Network check</b><button type="button" class="mf-netclose" aria-label="Close">✕</button></header><p class="mf-netsummary"></p><dl class="mf-netstats"></dl><p class="mf-netadvice"></p><button type="button" class="mf-nettest">Test connection now</button><p class="mf-nettestresult" role="status"></p>`;
    g.shell.append(this.panel);
    g.on(this.badge, "click", () => this.open());
    g.on(this.panel.querySelector(".mf-netclose"), "click", () => this.panel.close());
    g.on(this.panel, "keydown", (e) => e.stopPropagation());
    g.on(this.panel.querySelector(".mf-nettest"), "click", () => this.test());
    const style = document.createElement("style");
    style.textContent = CSS;
    g.shell.append(style);
    this.style = style;
  }
  /** Called by the transport. */
  ping(ms) {
    this.pings.push([performance.now(), ms]);
  }
  snapshot() {
    const now = performance.now(),
      last = this.snaps.at(-1);
    // Only gaps during a live match count (lobbies update less often).
    const playing = this.g.online?.phase === "playing";
    if (last && playing && this.wasPlaying && now - last > 1000) this.stalls.push(now);
    this.wasPlaying = playing;
    this.snaps.push(now);
  }
  reconnected() {
    this.reconnects.push(performance.now());
  }
  stats() {
    const now = performance.now(),
      keep = (list, at = (x) => x) => list.filter((x) => now - at(x) < WINDOW);
    this.pings = keep(this.pings, (p) => p[0]);
    this.snaps = keep(this.snaps);
    this.stalls = keep(this.stalls);
    this.reconnects = keep(this.reconnects);
    const recent = this.pings.slice(-10).map((p) => p[1]),
      ping = recent.length
        ? Math.round([...recent].sort((a, b) => a - b)[recent.length >> 1])
        : NaN,
      jitter =
        recent.length > 1
          ? Math.round(
              recent.slice(1).reduce((s, x, i) => s + Math.abs(x - recent[i]), 0) /
                (recent.length - 1),
            )
          : 0,
      span = this.snaps.length > 1 ? (this.snaps.at(-1) - this.snaps[0]) / 1000 : 0,
      updatesPerSecond = span > 2 ? (this.snaps.length - 1) / span : NaN,
      sinceUpdate = this.snaps.length ? now - this.snaps.at(-1) : NaN;
    return {
      ping,
      jitter,
      updatesPerSecond,
      stalls: this.stalls.length + this.reconnects.length,
      sinceUpdate,
      live: !!this.g.transport?.ready,
    };
  }
  /** Each HUD frame: the badge shows during online play. */
  update() {
    const online = !!this.g.online;
    if (this.badge.hidden === online) this.badge.hidden = !online;
    if (online) {
      const s = this.stats(),
        q = networkQuality(s),
        text = Number.isFinite(s.ping) ? `${s.ping} ms` : "…";
      if (this.badge.dataset.tone !== q.tone) this.badge.dataset.tone = q.tone;
      if (this.badge.dataset.bars !== String(q.bars)) this.badge.dataset.bars = String(q.bars);
      const b = this.badge.querySelector("b");
      if (b.textContent !== text) b.textContent = text;
      this.badge.setAttribute(
        "aria-label",
        `Network: ${q.label}${Number.isFinite(s.ping) ? `, ${s.ping} milliseconds` : ""}. Open network check.`,
      );
    }
    if (this.panel.open && performance.now() - (this.drawnAt || 0) > 500) this.draw();
  }
  open() {
    this.draw();
    if (!this.panel.open) this.panel.showModal?.() ?? this.panel.setAttribute("open", "");
  }
  draw() {
    this.drawnAt = performance.now();
    const p = this.panel,
      online = !!this.g.online;
    p.querySelector(".mf-nettest").hidden = online;
    if (!online) {
      p.querySelector(".mf-netsummary").textContent = "Offline match";
      p.querySelector(".mf-netstats").innerHTML = "";
      p.querySelector(".mf-netadvice").textContent =
        "This match runs entirely on your device, so your network can't cause lag here. Test your connection before playing online.";
      return;
    }
    const s = this.stats(),
      q = networkQuality(s),
      row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    p.querySelector(".mf-netsummary").innerHTML =
      `<span class="mf-bars" data-bars="${q.bars}" data-tone="${q.tone}" aria-hidden="true"><i></i><i></i><i></i><i></i></span> ${q.label}`;
    p.querySelector(".mf-netstats").innerHTML =
      row("Ping (round trip)", Number.isFinite(s.ping) ? `${s.ping} ms` : "measuring…") +
      row("Steadiness (jitter)", `± ${s.jitter} ms`) +
      row(
        "Game updates",
        Number.isFinite(s.updatesPerSecond) ? `${s.updatesPerSecond.toFixed(1)} / s` : "measuring…",
      ) +
      row("Dropouts (last minute)", String(s.stalls)) +
      row("Link", s.live ? "Live connection" : "Backup mode (slower updates)");
    p.querySelector(".mf-netadvice").textContent = q.advice || "";
  }
  async test() {
    const out = this.panel.querySelector(".mf-nettestresult"),
      button = this.panel.querySelector(".mf-nettest");
    button.disabled = true;
    out.textContent = "Testing…";
    try {
      const r = await testConnection({ saveData: navigator.connection?.saveData });
      const a = r?.advice ? r : connectionAdvice([], null, 1);
      out.textContent = Number.isFinite(a.latency)
        ? `Response ${Math.round(a.latency)} ms · jitter ± ${Math.round(a.jitter)} ms${Number.isFinite(a.downloadMbps) ? ` · ${a.downloadMbps.toFixed(1)} Mbps` : ""}. ${a.advice}`
        : a.advice;
    } catch {
      out.textContent = "The test could not run. Check that you are online and try again.";
    }
    button.disabled = false;
  }
  dispose() {
    this.badge.remove();
    this.panel.remove();
    this.style.remove();
  }
}

const CSS = `
midnry-fps .mf-netbadge { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 10px; margin-right: 8px; border: 1px solid #ffffff2e; border-radius: 3px; background: #101419e6; color: #e6ece7; font: 700 13px var(--mf-body); cursor: pointer; }
midnry-fps .mf-netbadge[hidden] { display: none; }
midnry-fps .mf-bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; }
midnry-fps .mf-bars i { width: 4px; background: #ffffff33; border-radius: 1px; }
midnry-fps .mf-bars i:nth-child(1) { height: 4px; } midnry-fps .mf-bars i:nth-child(2) { height: 7px; }
midnry-fps .mf-bars i:nth-child(3) { height: 10px; } midnry-fps .mf-bars i:nth-child(4) { height: 14px; }
midnry-fps [data-tone="great"] .mf-bars i, midnry-fps .mf-bars[data-tone="great"] i { background: #5fd98a; }
midnry-fps [data-tone="ok"] .mf-bars i, midnry-fps .mf-bars[data-tone="ok"] i { background: #b8e05a; }
midnry-fps [data-tone="warn"] .mf-bars i, midnry-fps .mf-bars[data-tone="warn"] i { background: #ffc455; }
midnry-fps [data-tone="bad"] .mf-bars i, midnry-fps .mf-bars[data-tone="bad"] i { background: #ff675c; }
midnry-fps [data-bars="3"] .mf-bars i:nth-child(n+4), midnry-fps .mf-bars[data-bars="3"] i:nth-child(n+4),
midnry-fps [data-bars="2"] .mf-bars i:nth-child(n+3), midnry-fps .mf-bars[data-bars="2"] i:nth-child(n+3),
midnry-fps [data-bars="1"] .mf-bars i:nth-child(n+2), midnry-fps .mf-bars[data-bars="1"] i:nth-child(n+2),
midnry-fps [data-bars="0"] .mf-bars i, midnry-fps .mf-bars[data-bars="0"] i { background: #ffffff33; }
midnry-fps .mf-netpanel { width: min(420px, calc(100vw - 32px)); padding: 16px 18px; border: 1px solid #ffffff2e; border-radius: 4px; background: #0c1210f5; color: #e6ece7; font: 14px/1.45 var(--mf-body); }
midnry-fps .mf-netpanel::backdrop { background: #0008; }
midnry-fps .mf-netpanel header { display: flex; justify-content: space-between; align-items: center; }
midnry-fps .mf-netpanel header b { font: 700 18px var(--mf-display); letter-spacing: .06em; text-transform: uppercase; }
midnry-fps .mf-netpanel header button { min-width: 44px; min-height: 44px; border: 0; background: none; color: #e6ece7; font-size: 18px; cursor: pointer; }
midnry-fps .mf-netsummary { display: flex; align-items: center; gap: 8px; margin: 4px 0 10px; font: 700 20px var(--mf-display); text-transform: uppercase; }
midnry-fps .mf-netstats { display: grid; gap: 6px; margin: 0 0 10px; }
midnry-fps .mf-netstats div { display: flex; justify-content: space-between; border-top: 1px solid #ffffff14; padding-top: 6px; }
midnry-fps .mf-netstats dt { color: #aeb9b2; } midnry-fps .mf-netstats dd { margin: 0; font-weight: 700; }
midnry-fps .mf-netadvice { color: #c7d0ca; }
midnry-fps .mf-nettest { width: 100%; min-height: 44px; border: 0; border-radius: 3px; background: var(--mf-accent, #ffc857); color: #1a1406; font: 700 15px var(--mf-display); text-transform: uppercase; cursor: pointer; }
midnry-fps .mf-nettest[hidden] { display: none; }
@media (max-width: 700px) { midnry-fps .mf-netbadge b { display: none; } midnry-fps .mf-netbadge { padding: 0 8px; } }
`;
