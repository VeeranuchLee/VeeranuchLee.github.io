/* Princess Dress Up Room offline cache -- the dollhouse-app one-tier shell pattern.
 *
 * The shell and every art source named by the two production data files install together,
 * so every shipped look works offline. This fills CacheStorage only; the app still decodes
 * images lazily through its bounded canvas/image caches. Bump CACHE_NAME on every change
 * that must reach an installed device; the
 * activate handler deletes this app's own older caches (dress-up-v*) and nobody else's:
 * several apps share one origin when published, so a foreign cache is not ours to touch.
 *
 *   v1  2026-11-06  first production candidate: Standing and Runway wardrobes.
 *
 * SHELL names the non-art runtime. Art is derived from the data rather than duplicated in
 * a second hand-maintained list, and the static gate proves the result equals the ship list.
 * A staged Test Hub copy carries no service worker at all (AGENTS.md).
 */

const CACHE_NAME = "dress-up-v1";
const PRECACHE_DATA = ["data/items.json", "data/runway.json"];
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "cg-back.css",
  "tap-zoom-guard.js",
  "safe-storage.js",
  "audio-wake.js",
  "cg-update.js",
  "manifest.webmanifest",
  "data/items.json",
  "data/runway.json",
  "icons/icon-180.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "js/app.js",
  "js/art.js",
  "js/colour.js",
  "js/icons.js",
  "js/look.js",
  "js/poses.js",
  "js/show.js",
  "js/sound.js",
  "js/store.js"
];

function collectArt(value, out) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectArt(entry, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "src" && typeof entry === "string" && entry.startsWith("art/")) out.add(entry);
    collectArt(entry, out);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(SHELL);
      const art = new Set();
      const datasets = await Promise.all(PRECACHE_DATA.map((path) => cache.match(path).then((response) => response.json())));
      datasets.forEach((dataset) => collectArt(dataset, art));
      await cache.addAll([...art].sort());
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys.filter((k) => /^dress-up-v/.test(k) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
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
