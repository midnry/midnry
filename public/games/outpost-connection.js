/** Measurements are advisory. Never changes device compatibility or Play. */
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b),
    i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};
export function connectionAdvice(samples, downloadMbps, failures = 0) {
  const valid = samples.filter((x) => Number.isFinite(x) && x >= 0);
  if (!valid.length)
    return {
      quality: "unknown",
      latency: null,
      jitter: null,
      downloadMbps: null,
      advice:
        "The connection could not be measured. You can still play online; try the check again later.",
    };
  const latency = median(valid),
    jitter = valid.length > 1 ? median(valid.slice(1).map((x, i) => Math.abs(x - valid[i]))) : 0;
  const slow =
    latency > 150 ||
    jitter > 40 ||
    failures > 0 ||
    (Number.isFinite(downloadMbps) && downloadMbps < 2);
  const good = latency < 80 && jitter < 20 && (!Number.isFinite(downloadMbps) || downloadMbps >= 5);
  const advice = slow
    ? "Online play is available, but actions may respond slowly. Move closer to Wi-Fi, use 5 GHz/6 GHz Wi-Fi or a cable, and pause large downloads. Distance to the game server also affects response time."
    : good
      ? "Your measured connection should suit this game's online traffic. Device frame rate and server load still affect smoothness."
      : "Online play is available. A steadier connection may improve response time; avoid competing downloads and a weak Wi-Fi signal.";
  return {
    quality: slow ? "variable" : good ? "good" : "fair",
    latency,
    jitter,
    downloadMbps: Number.isFinite(downloadMbps) ? downloadMbps : null,
    failures,
    advice,
  };
}

/** Small HTTP probe samples response delay, NOT packet loss or upload speed. */
export async function testConnection({
  fetcher = fetch,
  now = () => performance.now(),
  signal,
  saveData = false,
} = {}) {
  const samples = [];
  let failures = 0,
    downloadMbps = null;
  const request = async (probe) => {
    const controller = new AbortController(),
      abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 2500);
    try {
      if (signal?.aborted) controller.abort();
      const start = now();
      const response = await fetcher(
        `/api/games/outpost-connection?probe=${probe}&nonce=${Date.now()}-${Math.random().toString(36).slice(2)}`,
        { cache: "no-store", credentials: "same-origin", signal: controller.signal },
      );
      if (!response.ok) throw new Error("probe-unavailable");
      const bytes = await response.arrayBuffer();
      return { duration: Math.max(0.1, now() - start), bytes: bytes.byteLength };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  };
  // Warm-up establishes TLS; subsequent samples include actual host response.
  try {
    await request("ping");
  } catch {
    failures++;
  }
  for (let i = 0; i < 5 && !signal?.aborted; i++) {
    try {
      samples.push((await request("ping")).duration);
    } catch {
      failures++;
    }
  }
  if (!saveData && !signal?.aborted) {
    try {
      const r = await request("download");
      if (r.bytes === 256 * 1024) downloadMbps = (r.bytes * 8) / r.duration / 1000;
    } catch {
      failures++;
    }
  }
  return { ...connectionAdvice(samples, downloadMbps, failures), checkedAt: Date.now(), saveData };
}

export class ConnectionUI {
  constructor(g) {
    this.g = g;
    this.report = null;
    this.busy = false;
    this.panels = [];
    for (const parent of [g.$(".mf-settingsbody"), g.protocolUI.focus.info]) {
      const details = document.createElement("details");
      details.className = "mf-connection";
      details.innerHTML =
        '<summary>Connection quality</summary><p class="mf-connectionresult" role="status" aria-live="polite">Connection check is optional and never blocks play.</p><p class="mf-connectionadvice"></p><p>Aim for at least 5 Mbps download and 1 Mbps upload, with server response below 80 ms and jitter below 20 ms. Higher Mbps alone cannot fix latency. This short HTTP check estimates download speed and server response; it does not measure upload speed or packet loss.</p><button class="mf-connectiontest">Test connection</button>';
      parent.append(details);
      this.panels.push(details);
      g.on(details.querySelector("button"), "click", () => this.check());
    }
    this.summary = document.createElement("p");
    this.summary.className = "mf-connectionsummary";
    g.$(".mf-network").querySelector("summary").after(this.summary);
  }
  async check() {
    if (this.busy || this.g.abort.signal.aborted) return;
    this.busy = true;
    this.refresh();
    try {
      this.report = await testConnection({
        signal: this.g.abort.signal,
        saveData: !!navigator.connection?.saveData,
      });
    } catch {
      this.report = connectionAdvice([], null);
    }
    this.busy = false;
    if (this.g.abort.signal.aborted) return;
    this.refresh();
    if (this.report.quality === "variable" && this.g.online && this.g.running)
      this.g.message("Connection may respond slowly. Online play remains available.", 4);
  }
  refresh() {
    const r = this.report;
    const text = this.busy
      ? "Measuring connection… Play remains available."
      : r?.latency != null
        ? `${Math.round(r.latency)} ms server response · ${Math.round(r.jitter)} ms jitter${r.downloadMbps != null ? ` · approximately ${r.downloadMbps.toFixed(1)} Mbps download` : ""}`
        : r
          ? "Connection not measured. Play remains available."
          : "Connection check available in Settings.";
    this.summary.textContent = text;
    for (const panel of this.panels) {
      panel.querySelector(".mf-connectionresult").textContent = text;
      panel.querySelector(".mf-connectionadvice").textContent = r?.advice || "";
      panel.querySelector("button").disabled = this.busy;
    }
  }
  dispose() {
    for (const p of this.panels) p.remove();
    this.summary.remove();
  }
}
