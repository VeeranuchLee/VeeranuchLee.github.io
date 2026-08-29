/* Pattern Blocks offline cache.
 *
 * Time-book pattern: one tier. The toy draws everything in SVG at runtime —
 * the fonts are the biggest thing in it — so the whole app is precached and
 * fully offline from the moment it installs.
 *
 * Bump CACHE_NAME on every publish; the activate handler deletes every other
 * cache, and that is what ships an update to an installed device.
 *
 *   v1  2026-08-28  first standalone build (split out of the Toy Box room
 *                   app the same day; the toy itself is unchanged).
 */

const CACHE_NAME = "pattern-blocks-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./fonts.css",
  "./app.js",
  "./geometry.js",
  "./cards.js",
  "./pattern-blocks.js",

  "./fonts/Nunito-latin.woff2",
  "./fonts/Nunito-latin-ext.woff2",
  "./fonts/FredokaOne-latin.woff2",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      /* Evict only THIS app's old versions (pattern-blocks-v*). The shelf and
         this app share an origin, each with its own worker — the single-app
         "delete every other cache" rule let this worker evict the shelf's
         toy-box cache on activate, breaking the shelf offline. Caught by the
         #277→#281 upgrade test; foreign cache names are not ours to touch. */
      Promise.all(
        keys.filter((k) => /^pattern-blocks-v/.test(k) && k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(event.request).then((response) => {
          /* cache-first with runtime fill, same policy as the other apps here */
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
    )
  );
});
