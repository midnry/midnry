import { ASSET_FILES, ASSET_CACHE } from "./outpost-asset-manifest.js";
/** Optional, integrity-checked browser download. Game startup never waits for it. */
export class AssetCacheUI {
  constructor(g) {
    this.g = g;
    this.busy = false;
    this.panel = document.createElement("details");
    this.panel.className = "mf-assetcache";
    const size = (ASSET_FILES.reduce((n, f) => n + f.bytes, 0) / 1024 / 1024).toFixed(1);
    this.panel.innerHTML = `<summary>Save assets for faster loading</summary><p>Save ${size} MB of models, textures and sky in this browser. Repeat loading can be faster and use less data. This does not raise FPS or reduce multiplayer latency. Browser storage can be cleared or evicted; internet may still be needed for the page and game code.</p><button class="mf-saveassets">Download game assets</button><button class="mf-clearassets">Clear saved game assets</button><p class="mf-cachestatus" role="status" aria-live="polite">Optional. Playing never requires a download.</p>`;
    g.$(".mf-settingsbody").append(this.panel);
    this.credits = document.createElement("details");
    this.credits.innerHTML =
      '<summary>Asset credits</summary><p>Soldier sculpt, textured gloves and motion clips: Adobe Mixamo, adapted for embedded game use, including derived roughness/metalness masks. Environment photographs and props: Poly Haven, CC0. Breakwater corridor and room architecture (including Communications / Radar, Command and Supply Atrium), wayfinding, shared equipment and charge status artwork: original procedural game assets, not scanned production models. Equipment normal detail reuses Poly Haven metal_plate_02 (CC0). World signage and screen artwork use the bundled Barlow Condensed by Jeremy Tribby (SIL Open Font License 1.1). Medevac helicopter: "Rescue Helicopter (low poly)" by blueskinrulez, CC-BY 4.0.</p><a href="/games/military/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">Sources and licences</a>';
    g.$(".mf-settingsbody").append(this.credits);
    this.status = this.panel.querySelector(".mf-cachestatus");
    this.save = this.panel.querySelector(".mf-saveassets");
    g.on(this.save, "click", () => this.download());
    g.on(this.panel.querySelector(".mf-clearassets"), "click", () => this.clear());
  }
  async download() {
    if (this.busy) return;
    if (!navigator.serviceWorker || !globalThis.caches || !isSecureContext) {
      this.status.textContent = "Saving assets is unavailable in this browser. You can still play.";
      return;
    }
    this.busy = true;
    this.save.disabled = true;
    this.status.textContent = "Preparing this browser's asset storage…";
    try {
      const registration = await navigator.serviceWorker.register(
        new URL("./outpost-cache-worker.js", import.meta.url),
        {
          type: "module",
          updateViaCache: "none",
          scope: new URL("./outpost-zero", import.meta.url).pathname,
        },
      );
      await registration.update();
      const worker = registration.installing || registration.waiting || registration.active;
      if (worker.state !== "activated")
        await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Asset storage did not initialize")),
            15000,
          );
          worker.addEventListener("statechange", () => {
            if (worker.state === "activated") {
              clearTimeout(timer);
              resolve();
            } else if (worker.state === "redundant") {
              clearTimeout(timer);
              reject(new Error("Asset storage unavailable"));
            }
          });
        });
      await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          reject(new Error("Download timed out; playing is still available"));
        }, 180000);
        channel.port1.onmessage = (event) => {
          const data = event.data;
          this.status.textContent = `Saved ${data.complete}/${data.total} assets…`;
          if (data.error) {
            clearTimeout(timer);
            channel.port1.close();
            reject(new Error(data.error));
          }
          if (data.done) {
            clearTimeout(timer);
            channel.port1.close();
            resolve();
          }
        };
        worker.postMessage({ op: "save-assets" }, [channel.port2]);
      });
      this.status.textContent = "Assets saved. Repeat visits can load them from this browser.";
    } catch (error) {
      this.status.textContent = String(error.message || error) + ". Playing remains available.";
    } finally {
      this.busy = false;
      this.save.disabled = false;
    }
  }
  async clear() {
    if (this.busy) return;
    this.status.textContent = "Clearing saved game assets…";
    try {
      if (globalThis.caches) await caches.delete(ASSET_CACHE);
      this.status.textContent = "Saved game assets cleared. Playing remains available.";
    } catch {
      this.status.textContent = "Browser storage could not be cleared. Playing remains available.";
    }
  }
  dispose() {
    this.panel.remove();
    this.credits.remove();
  }
}
