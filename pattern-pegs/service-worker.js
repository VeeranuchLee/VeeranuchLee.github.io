/* Pattern Pegs offline cache — time-book one-tier pattern.
 *
 * The shell is one page plus its fonts, icons and the plate, so it is fully offline
 * from the moment it installs. Bump CACHE_NAME on every change that must reach an
 * installed device; the activate handler deletes every other cache.
 *
 *   v1  2026-08-28  first build: five activities on the dawn plate. Not published.
 *   v2  2026-08-28  same day, pre-publish dev iterations (hash deep links,
 *                   labelled beads). Nothing installed v1 anywhere.
 *   v3  2026-08-28  next-position ghost markers on the lace thread and copy tower
 *                   (owner UX call from live play). Still pre-publish.
 *   v4  2026-08-29  Font paths fixed. assets/fonts/fonts.css asked for
 *                   ./fonts/<face>.woff2, which resolves from its OWN directory
 *                   to assets/fonts/fonts/ — a level that has never existed. All
 *                   three faces 404'd and the app has been drawing in the system
 *                   fallback since it went live; the .woff2 files were published
 *                   correctly the whole time. This is the first bump that has to
 *                   reach installed devices, so it is the first one that matters.
 */

const CACHE_NAME = "pattern-pegs-v4";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./js/pattern-core.js",
  "./manifest.webmanifest",
  "./assets/bg-dawn.webp",
  "./assets/fonts/fonts.css",
  "./assets/fonts/Nunito-latin.woff2",
  "./assets/fonts/Nunito-latin-ext.woff2",
  "./assets/fonts/FredokaOne-latin.woff2",
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
    caches
      .keys()
      /* Evict only this app's old versions (pattern-pegs-v*). Several repo apps
         share one origin when published, each with its own worker — deleting
         every cache that is not ours would evict the neighbours' offline caches.
         Foreign cache names are not ours to touch. */
      .then((keys) => Promise.all(keys.filter((k) => /^pattern-pegs-v/.test(k) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Dev/QA escape hatch: any URL with ?dev always hits the network, so editing
  // files does not require a cache bump while iterating (installs still cache).
  const devUrl = new URL(event.request.url);
  if (devUrl.searchParams.has("dev")) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(event.request).then((resp) => {
          const url = new URL(event.request.url);
          if (resp.ok && url.origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
    )
  );
});
