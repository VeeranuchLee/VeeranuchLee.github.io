/* Time Book offline cache.
 *
 * One tier, not three — but no longer because there is nothing to defer.
 *
 * `math-app`'s worker splits precache / warm / lazy because it carries ~30 MB of
 * artwork, and precaching that would make "add to home screen" feel broken. Time
 * Book used to be the easy case: every clock is SVG drawn at runtime, so the whole
 * app was under 200 KB and precaching all of it was free.
 *
 * That stopped being true on 2026-08-28, when the voice arrived: **1,588 clips,
 * about 24 MB**, which is the same problem math-app solved with tiers. The answer
 * here is simpler than tiers because the fetch handler below already caches any
 * same-origin GET on first use. So the SHELL stays small and deliberately EXCLUDES
 * the clips: a child gets the app instantly, and each clip is kept the first time
 * it is heard. `audio/clips.json` IS in the shell, because the app reads it before
 * the first screen and a missing map means an all-robot session.
 *
 * The trade is explicit: the book is fully offline for everything it draws, and
 * the voice becomes offline for the parts of it a child has already heard. A first
 * run in a tunnel speaks through the robot, which is the fallback the app already
 * has, rather than failing.
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
 *                   Published 2026-08-28, public commit 8f82a91.
 *   v6  2026-08-28  that popup is a real <dialog> now, opened with showModal():
 *                   the background is inert, focus is trapped in the sheet and
 *                   Escape closes it. First bump to carry a styles.css change
 *                   as well -- the UA's own dialog styling has to be undone or
 *                   the dim stops short of the edges of the screen.
 *   v7  2026-08-28  THE VOICE. 3,136 rendered clips and the per-chapter gate:
 *                   c1-c4 speak in the Magic Math Narrator, c5 stays robot
 *                   because its scene sentences cost 6.5x a Creator month and
 *                   do not split. Carries audio/clips.json in the shell and
 *                   38 MB of .m4a cached lazily by the fetch handler, NOT
 *                   precached -- see the header above.
 */

const CACHE_NAME = "time-book-v7";

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

  // The clip map, but NOT the clips. Read before the first screen; without it
  // the app is all-robot, so it belongs in the shell. The 24 MB of .m4a behind
  // it does not, and is cached per clip by the fetch handler instead.
  "./audio/clips.json",

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
