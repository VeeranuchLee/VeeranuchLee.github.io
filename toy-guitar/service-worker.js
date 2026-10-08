const CACHE_NAME = "toy-guitar-v1";

const SHELL = [
  "./", "./index.html", "./styles.css", "./fonts.css", "./app.js", "./tap-zoom-guard.js", "./manifest.webmanifest",
  "./lib/theory.js", "./lib/string-board.js", "./lib/geometry.js", "./lib/recorder.js", "./lib/performer.js",
  "./lib/toys.js", "./lib/session.js",
  "./audio/ks-worklet.js", "./audio/guitar-models.js", "./audio/rig.js", "./audio/percussion.js",
  "./ui/draw-guitar.js", "./ui/pad-icons.js", "./ui/sparkle.js",
  "./fonts/FredokaOne-latin.woff2", "./fonts/Nunito-latin.woff2", "./fonts/Nunito-latin-ext.woff2",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png", "./assets/icons/icon-512-maskable.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/backgrounds/first-landscape.jpg", "./assets/backgrounds/first-portrait.jpg",
  "./assets/backgrounds/classical-landscape.jpg", "./assets/backgrounds/classical-portrait.jpg",
  "./assets/backgrounds/acoustic-landscape.jpg", "./assets/backgrounds/acoustic-portrait.jpg",
  "./assets/backgrounds/electric-landscape.jpg", "./assets/backgrounds/electric-portrait.jpg",
  "./assets/backgrounds/rock-landscape.jpg", "./assets/backgrounds/rock-portrait.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => /^toy-guitar-v/.test(key) && key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request).then((response) => {
      if (response.ok && event.request.url.startsWith(self.location.origin)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
