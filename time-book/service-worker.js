/* Time Book offline cache.
 *
 * One tier, not three. `math-app`'s worker splits precache / warm / lazy because
 * it carries ~30 MB of artwork and precaching that would make "add to home
 * screen" feel broken. Time Book draws every clock in SVG at runtime, so the
 * whole app is well under 200 KB — the fonts are the biggest thing in it. There
 * is nothing to defer, so everything is precached and the app is fully offline
 * from the moment it installs.
 *
 * Bump CACHE_NAME on every publish. The activate handler deletes every other
 * cache, and that is what actually ships an update to a device that already
 * installed the app.
 *
 *   v1  2026-08-25  first publish, as Clock Game on the test hub
 *   v2  2026-08-27  a back button on the home screen, out to the test hub
 *   v3  2026-08-27  c4 World Clock Explorer (§2.8) and c5 How long? (§2.7).
 *                   Published 2026-08-27, public commit 1481a06.
 *   v4  2026-08-28  the World Clock Explorer keeps time -- c4 captured one
 *                   instant at open and never advanced it, so the clock stopped
 *                   the moment it was drawn. This bump is what carries the fix
 *                   to a device that already installed the app: the worker is
 *                   cache-first, so without it the old app.js is served forever.
 *                   Published 2026-08-28, public commit e603c45.
 *   v5  2026-08-28  c4's popup is parented to `screen`, so it can no longer
 *                   outlive its chapter. On body it survived a keyboard exit and
 *                   sat over the home screen, still driving the chapter the
 *                   child had left.
 */

const CACHE_NAME = "time-book-v5";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./fonts.css",
  "./clock.js",
  "./worldclock.js",
  "./elapsed.js",
  "./app.js",

  "./fonts/Nunito-latin.woff2",
  "./fonts/Nunito-latin-ext.woff2",
  "./fonts/FredokaOne-latin.woff2",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Never touch another origin. Speech runs through the platform rather than the
  // network, but anything added later should fail normally instead of being
  // served a stale cached copy.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Only store real, complete same-origin responses. Caching an error page
          // would pin the failure until the next version bump.
          if (response && response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached. A navigation gets the book's home screen
          // rather than the browser's error page.
          if (request.mode === "navigate") return caches.match("./index.html");
          throw new Error("offline and not cached: " + url.pathname);
        });
    })
  );
});
