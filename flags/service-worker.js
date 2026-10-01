/* Flags offline cache.
 *
 * Pattern-blocks pattern: one tier, whole-app precache. The 39 flag SVGs are
 * a few kilobytes each, so the game is fully offline from the moment it
 * installs.
 *
 * Bump CACHE_NAME on every publish; the activate handler deletes only this
 * app's older versions, and that is what ships an update to an installed
 * device.
 *
 *   v1  2026-08-29  first playable slice: match-the-flag and
 *                   which-country over 39 countries, knowledge cards,
 *                   interim speechSynthesis narration.
 */

// v3 2026-09-22: zoom-trap fix -- the global gesturestart pinch blocker is
//        gone estate-wide (INTERACTION-DIRECTION.md); this bump carries it.
// v4 2026-09-26: zoom fix C (method C, owner-approved 2026-09-25) -- the shared
//        ./tap-zoom-guard.js stops the second quick tap's zoom and re-delivers the
//        tap, while a multi-finger pinch is never touched. It has to be IN this
//        list, not merely fetched at runtime: a shell list is only read when
//        CACHE_NAME changes, so an offline install without it would have no guard.
// v5 2026-09-30: 30 more countries (69) and the world map -- assets/map/world.js is a
//        new shell file, the new flag SVGs are in FLAG_CODES, and the home gains a
//        World map card with three ways to relate a country to the map.
const CACHE_NAME = "flags-v5";

const FLAG_CODES = [
  "th", "vn", "la", "kh", "my", "sg", "id", "ph",
  "jp", "cn", "kr", "in", "np",
  "au", "nz",
  "gb", "fr", "de", "it", "es", "pt", "nl", "ch", "se", "dk", "gr", "pl", "ua", "ie",
  "us", "ca", "mx",
  "br", "ar",
  "tr",
  "eg", "za", "ng", "ke",
  // 2026-09-30: thirty more
  "sa", "pk", "bd", "mn", "kz", "bt", "qa", "uz",
  "at", "al", "lt",
  "ma", "et", "tz", "bw", "mg", "zm", "ug", "zw", "mu",
  "cu", "jm", "pa", "do", "ht",
  "co", "gy", "sr",
  "pg", "to",
];

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./fonts.css",
  "./tap-zoom-guard.js",
  "./data.js",
  "./speech.js",
  "./app.js",
  "./assets/map/world.js",
  "./service-worker.js",

  "./fonts/Nunito-latin.woff2",
  "./fonts/Nunito-latin-ext.woff2",
  "./fonts/FredokaOne-latin.woff2",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/apple-touch-icon.png",

  /* flag SVGs; tools/check-data.mjs and this list must agree */
  ...FLAG_CODES.map((code) => `./assets/flags/${code}.svg`),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      /* Evict only THIS app's old versions (flags-v*). Apps share an origin
         and each owns its own caches — the shelf-cache lesson from the
         pattern-blocks worker. */
      Promise.all(
        keys.filter((k) => /^flags-v/.test(k) && k !== CACHE_NAME).map((k) => caches.delete(k))
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
