/** Narrow Outpost scope. Never cache HTML, scripts, APIs, credentials or chat. */
import { ASSET_CACHE, ASSET_FILES } from "./outpost-asset-manifest.js";
const allowed = new Map(ASSET_FILES.map((f) => [f.url, f]));
const hash = async (buffer) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function save(cache, file) {
  const cached = await cache.match(file.url);
  if (cached) return;
  const response = await fetch(file.url, { cache: "reload", credentials: "omit" });
  if (!response.ok) throw new Error("Asset download failed");
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== file.bytes || (await hash(bytes)) !== file.sha256)
    throw new Error("Asset changed; refresh the game before downloading");
  await cache.put(file.url, response);
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("outpost-assets-") && name !== ASSET_CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url),
    file = allowed.get(url.pathname);
  // An older active worker must never supply its older model to new code.
  if (url.searchParams.has("assetVersion") && url.searchParams.get("assetVersion") !== ASSET_CACHE)
    return;
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !file) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE),
        cached = await cache.match(file.url);
      return cached || fetch(event.request);
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.op !== "save-assets" || !event.ports[0]) return;
  event.waitUntil(
    (async () => {
      const port = event.ports[0],
        cache = await caches.open(ASSET_CACHE);
      let complete = 0;
      try {
        // Sequential downloads avoid saturating a live room's connection.
        for (const file of ASSET_FILES) {
          await save(cache, file);
          port.postMessage({ complete: ++complete, total: ASSET_FILES.length });
        }
        port.postMessage({ done: true, complete, total: ASSET_FILES.length });
      } catch (error) {
        port.postMessage({
          error: String(error.message || error),
          complete,
          total: ASSET_FILES.length,
        });
      }
    })(),
  );
});
