/* Toy Box offline cache — the shelf only.
 *
 * Time-book pattern: one tier. The shelf is one page plus fonts and icons, so
 * it is fully offline from the moment it installs. Each toy app carries its
 * OWN worker and precaches its OWN shell — the shelf never caches toy code
 * (that was the old mounting architecture; linking replaced it 2026-08-28).
 *
 * Bump CACHE_NAME on every publish; the activate handler deletes every other
 * cache, and that is what ships an update to an installed device.
 *
 *   v1  2026-08-28  first build: the room + Pattern Blocks (mounting).
 *                   Never published in that shape. Same-day split to a pure
 *                   linking shelf; contents below are the shelf's first real
 *                   publish set, still v1 because nothing shipped before.
 */

const CACHE_NAME = "toy-box-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./fonts.css",
  "./app.js",
  "./shelf.js",

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
      /* Evict only THIS app's old versions (toy-box-v*). Several repo apps share
         one origin when published, and each carries its own worker — the
         single-app "delete every other cache" rule evicted the neighbours'
         caches on activate. The #277→#281 upgrade test caught the app's worker
         deleting this shelf's cache. Foreign cache names are not ours to touch. */
      Promise.all(
        keys.filter((k) => /^toy-box-v/.test(k) && k !== CACHE_NAME).map((k) => caches.delete(k))
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
          /* cache-first with runtime fill, same policy as the other apps here.
             Scope note: the worker's scope is ./ so toy apps (../pattern-blocks-app/)
             are simply outside it — cross-app navigation leaves the shelf's cache. */
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
    )
  );
});
