/* Offline support for the children's apps hub.
 *
 * SCOPE IS THE WHOLE POINT. This file lives in /children-apps/, so its scope is
 * /children-apps/ and nothing above it. The games are published as separate
 * GitHub project sites at /magic-math/, /flower-shooter/, /little-color-garden/
 * and /solar-storybook-feedback/ — all OUTSIDE this scope, each already shipping
 * its own worker. Moving this file to the site root would silently put one
 * worker in front of four other apps. Do not.
 *
 * NAVIGATIONS ARE NETWORK-FIRST, deliberately, and this differs from the games'
 * worker. `math-app/service-worker.js` is cache-first for everything, which
 * means a freshly published change is invisible until the launch *after* the one
 * that downloads it — the owner hit exactly that on 2026-08-16 and reasonably
 * concluded the publish had failed. Here the page is always fetched from the
 * network when there is one, and the cache is the fallback rather than the
 * default. A republished hub therefore shows up on the very next load.
 *
 * Static assets stay cache-first: they are content-addressed by name, they only
 * change when this worker's version changes, and serving them from disk is what
 * makes the page instant.
 *
 * Bump CACHE_NAME on every publish, or installed devices keep the old shell.
 *
 *   v1  2026-08-16  first version, when the hub moved to /children-apps/
 */
const CACHE_NAME = "children-apps-v1";

/* Everything needed to render the hub with no network at all. Keep in step with
   index.html — a missing entry fails install and ships a broken offline page. */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts.css",
  "./fonts/Nunito-latin.woff2",
  "./fonts/Nunito-latin-ext.woff2",
  "./fonts/FredokaOne-latin.woff2",
  "./assets/space-math.webp",
  "./assets/unicorn-math.webp",
  "./assets/magic-spelling.webp",
  "./assets/classical-music.webp",
  "./assets/petal-kingdom.webp",
  "./assets/little-color-garden.png",
  "./assets/ari-and-dot.webp",
  "./assets/app-192.png",
  "./assets/app-512.png",
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Never touch another origin.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A link out to a game leaves this scope, so it never reaches this worker.
  // This guard only matters for anything that somehow resolves inside the scope
  // but is not ours; leaving it to the network is the safe answer.
  if (!url.pathname.startsWith(new URL("./", self.location).pathname)) return;

  if (request.mode === "navigate") {
    // Network-first: always prefer a fresh page, fall back to the cached one.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Everything else: cache-first, filling the cache on the way past.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
