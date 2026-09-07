/* Dollhouse offline cache — the pattern-pegs/time-book one-tier shell.
 *
 * The whole app is one page plus its art, so it is fully offline from the moment
 * it installs. Bump CACHE_NAME on every change that must reach an installed
 * device; the activate handler deletes this app's other caches and nobody else's.
 *
 *   v1  2026-09-07  first publication. The bedroom pilot: three verbs, eleven
 *                   variant families, day and night.
 *   v2  2026-09-07  the stage keeps the room's shape on a desktop window. On a
 *                   9.7" iPad it never did anything else, but measured on a
 *                   1440x860 Safari window the stage was 1420x575 -- aspect 2.47
 *                   against the room's 1.333 -- because `max-height` clamps the
 *                   height without narrowing the width, and object-fit then
 *                   cropped the ceiling and floor away and left the doll looking
 *                   enormous against a zoomed crop. This is the first bump that
 *                   has to reach an installed device.
 *   v3  2026-09-07  two things found by a real child on a real iPad. The app had
 *                   become a ZOOM TRAP -- it blocked `gesturestart`, so once it
 *                   was pinched in it could never be pinched out, and iOS has
 *                   ignored `user-scalable=no` since iOS 10 precisely because
 *                   zoom is an accessibility feature. And the shoes, bag and bow
 *                   did not snap to the doll the way a garment did; now every
 *                   worn thing has its own measured attachment point.
 *
 * THE FILE LIST IS GENERATED, THE VERSION IS NOT. `assets/shell.js` is written by
 * tools/build-runtime-assets.py and imported below, because fifty sprites is well
 * past what anyone keeps correct by hand and a shell that has drifted from the
 * assets is an app that half-works on a plane. The version stays here and stays
 * manual: listing files is bookkeeping, deciding that installed iPads must throw
 * away their cache is a judgement.
 */

importScripts("./assets/shell.js");

const CACHE_NAME = "dollhouse-v3";
const SHELL = self.SHELL_ASSETS;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      /* Evict only this app's old versions (dollhouse-v*). Several apps in this
         estate share one origin when published, each with its own worker --
         deleting every cache that is not ours would evict the neighbours'
         offline caches. Foreign cache names are not ours to touch. */
      .then((keys) => Promise.all(
        keys.filter((k) => /^dollhouse-v/.test(k) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Dev/QA escape hatch: any URL with ?dev always hits the network, so editing
  // files does not need a cache bump while iterating (installs still cache).
  if (new URL(event.request.url).searchParams.has("dev")) return;
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
