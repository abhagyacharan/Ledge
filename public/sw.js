/* Ledge service worker (docs/pwa-spec.md).
 *
 * Two jobs only:
 *  1. Keep hashed static files (/_next/static, icons) so the app opens faster.
 *  2. Show /offline.html when a page cannot be loaded because the network is down.
 *
 * It NEVER stores pages, Server Action calls, /api responses or anything from the database. Ledge holds
 * finances and a private journal; a cached page would outlive signing out. Bump CACHE_VERSION to drop
 * every old cache on the next visit.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `ledge-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/ledge-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ledge-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always the network. Only when it fails, the offline page (never a stored copy of a page).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Hashed static files never change under the same name, so cache-first is safe.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
  // Everything else (api, actions, data, other files) is left to the browser untouched.
});
