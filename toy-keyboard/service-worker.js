/* Keyboard offline cache — the pattern-blocks pattern.
 *
 * The toy draws itself in CSS and synthesises its sound in WebAudio, so the
 * shell (one page, one script, two stylesheets, fonts) is the whole app and
 * it is fully offline from the moment it installs.
 *
 * Bump CACHE_NAME on every publish; the activate handler deletes every other
 * keyboard cache, and that is what ships an update to an installed device.
 *
 *   v1  2026-08-29  first build: 49 keys, four WebAudio patches, sustain.
 *       Never published; its cache served stale bytes across a same-day edit
 *       (the worker only updates when this file changes), which is why the
 *       number moved before anything shipped.
 *   v2  2026-08-29  LCD note readout and the no-pointer-events click
 *       fallback, still pre-publication.
 *   v3  2026-08-29  Test Hub publication prep: the control deck fixed at the
 *       iPad's portrait width, a master volume that is not 2px wide, 44px
 *       controls, and the LCD volume meter actually built. No back link — the
 *       owner took the Keyboard off the toy shelf (different age segment), so
 *       it is self-contained like every other app carded on the hub.
 *       apple-touch-icon.png joins the shell too — index.html has always linked
 *       it and it was never precached, so a cold offline install had no
 *       home-screen icon to fall back on.
 */

const CACHE_NAME = "toy-keyboard-v3";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./fonts.css",
  "./app.js",

  "./fonts/Nunito-latin.woff2",
  "./fonts/Nunito-latin-ext.woff2",
  "./fonts/FredokaOne-latin.woff2",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      /* Evict only THIS app's old versions (toy-keyboard-v*). The shelf and
         the other toys keep their own caches. */
      Promise.all(keys.filter((k) => /^toy-keyboard-v/.test(k) && k !== CACHE_NAME)
        .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) =>
      hit ||
      fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});
