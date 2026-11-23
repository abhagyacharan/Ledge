/* Ledge service worker (docs/pwa-spec.md).
 *
 * Three jobs only:
 *  1. Keep hashed static files (/_next/static, icons) so the app opens faster.
 *  2. Show /offline.html when a page cannot be loaded because the network is down.
 *  3. Show task reminders pushed by the server (docs/reminders-spec.md) and handle their buttons.
 *
 * It NEVER stores pages, Server Action calls, /api responses or anything from the database. Ledge holds
 * finances and a private journal; a cached page would outlive signing out. Bump CACHE_VERSION to drop
 * every old cache on the next visit.
 *
 * Registered as /sw.js?dev=1 (development, push only) it skips all caching and the offline page.
 */
const CACHE_VERSION = "v2";
const DEV = new URL(self.location.href).searchParams.get("dev") === "1";
const STATIC_CACHE = `ledge-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  if (DEV) {
    event.waitUntil(self.skipWaiting());
    return;
  }
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
  if (DEV) return;
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

/* ---- Reminders (docs/reminders-spec.md §7). Nothing about a task is stored here. ---- */

const ICON = "/icons/ledge-192.png";

function parsePayload(event) {
  try {
    const data = event.data ? event.data.json() : null;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePayload(event);
  if (!payload || typeof payload.title !== "string") return;
  const isReminder = payload.type === "reminder" && typeof payload.taskId === "string";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "",
    tag: typeof payload.tag === "string" ? payload.tag : isReminder ? payload.taskId : "ledge",
    icon: ICON,
    badge: ICON,
    data: { url, taskId: isReminder ? payload.taskId : null },
  };
  if (isReminder) {
    options.renotify = true;
    options.actions = [
      { action: "done", title: "Done" },
      { action: "snooze", title: "Snooze 10 min" },
    ];
  }
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

function openApp(url) {
  const target = new URL(url, self.location.origin).href;
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (!open) return self.clients.openWindow(target);
    return open
      .focus()
      .then((focused) => (focused || open).navigate(target))
      .catch(() => self.clients.openWindow(target));
  });
}

function postReminder(taskId, action) {
  return fetch(`/api/reminders/${encodeURIComponent(taskId)}/${action}`, {
    method: "POST",
    credentials: "same-origin",
  });
}

function showMarkedDone(tag) {
  return self.registration
    .showNotification("Marked done", { tag, icon: ICON, badge: ICON, silent: true })
    .then(() => new Promise((resolve) => setTimeout(resolve, 3000)))
    .then(() => self.registration.getNotifications({ tag }))
    .then((shown) => shown.forEach((n) => n.close()));
}

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  const url = data.url || "/";
  notification.close();

  if (event.action === "done" && data.taskId) {
    event.waitUntil(
      postReminder(data.taskId, "done").then(
        (response) => (response.ok ? showMarkedDone(notification.tag) : openApp(url)),
        () => openApp(url),
      ),
    );
    return;
  }
  if (event.action === "snooze" && data.taskId) {
    // The server sends the reminder again in 10 minutes; if that fails, open the app instead.
    event.waitUntil(
      postReminder(data.taskId, "snooze").then(
        (response) => (response.ok ? undefined : openApp(url)),
        () => openApp(url),
      ),
    );
    return;
  }
  event.waitUntil(openApp(url));
});

/* pushsubscriptionchange is deliberately not handled here. Re-subscribing from the worker would
 * need a new signed-in route to save the new address; instead Settings > Notifications shows
 * reminders as off for a device the server no longer lists, and one tap turns them back on. */
