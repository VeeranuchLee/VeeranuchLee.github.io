const CACHE_NAME = "memory-echo-v1";
const CACHE_PREFIX = "memory-echo-v";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./tap-zoom-guard.js",
  "./manifest.webmanifest", "./package.json", "./js/game-logic.js", "./js/audio-engine.js", "./js/layout-geometry.js",
  "./fonts/FredokaOne-latin.woff2", "./fonts/Nunito-latin.woff2",
  "./assets/art/pastel-landscape.webp", "./assets/art/echo-robot.webp",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png", "./assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.open(CACHE_NAME).then((own) => own.match(event.request, { ignoreSearch: true })).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && event.request.url.startsWith(self.location.origin)) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});
