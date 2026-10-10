// Abuja Hustle service worker: makes the game installable and lets it reopen
// offline. Pages are network-first; built assets (hashed names) are cache-first;
// the game's art (/abuja/) comes straight from the cache and is refreshed in the
// background, so continuing a saved life doesn't wait on hundreds of downloads.
const CACHE = "abuja-hustle-v4";
const ART = "abuja-hustle-art-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("abuja-hustle-") && key !== CACHE && key !== ART).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/games/abuja-hustle"))),
    );
    return;
  }
  if (url.pathname.startsWith("/abuja/")) {
    event.respondWith(
      caches.open(ART).then((cache) =>
        cache.match(request).then((hit) => {
          const fresh = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => hit);
          if (hit) {
            event.waitUntil(fresh);
            return hit;
          }
          return fresh;
        }),
      ),
    );
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/abuja-hustle")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
