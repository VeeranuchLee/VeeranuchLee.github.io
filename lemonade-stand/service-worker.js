const CACHE_PREFIX = "lemonade-stand-v";
const CACHE_NAME = "lemonade-stand-v1";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./service-worker.js",
  "./manifest.webmanifest",
  "./tap-zoom-guard.js",
  "./cg-back.css",
  "./cg-update.js",
  "./js/audio-wake.js",
  "./js/money-engine.js",
  "./js/voice-guide.js",
  "./voice/manifest.json",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/garden-landscape.webp",
  "./assets/garden-portrait.webp",
  "./assets/customer-poses.webp",
  "./assets/lemonade-objects.webp",
  "./assets/provenance.json",
  "./assets/customers/bunny-waiting.webp",
  "./assets/customers/bunny-happy.webp",
  "./assets/customers/kitten-waiting.webp",
  "./assets/customers/kitten-happy.webp",
  "./assets/customers/puppy-waiting.webp",
  "./assets/customers/puppy-happy.webp",
  "./assets/customers/duckling-waiting.webp",
  "./assets/customers/duckling-happy.webp",
  "./assets/customers/hedgehog-waiting.webp",
  "./assets/customers/hedgehog-happy.webp",
  "./assets/objects/cup-plain.webp",
  "./assets/objects/cup-iced.webp",
  "./assets/objects/cup-pink.webp",
  "./assets/objects/cup-slushy.webp",
  "./assets/objects/jug-yellow.webp",
  "./assets/objects/jug-pink.webp",
  "./assets/objects/ice-scoop.webp",
  "./assets/objects/slushy-machine.webp",
  "./assets/objects/lemon-dish.webp",
  "./assets/objects/serving-tray.webp",
  "./assets/objects/flower-pot.webp",
  "./assets/objects/bunting.webp",
  "./assets/objects/garden-lantern.webp",
  "./assets/voice/numbers/5.m4a",
  "./assets/voice/numbers/10.m4a",
  "./assets/voice/numbers/15.m4a",
  "./assets/voice/numbers/20.m4a",
  "./assets/voice/numbers/25.m4a",
  "./assets/voice/numbers/30.m4a",
  "./assets/voice/numbers/35.m4a",
  "./assets/voice/numbers/40.m4a",
  "./assets/voice/numbers/45.m4a",
  "./assets/voice/numbers/50.m4a",
  "./assets/voice/numbers/55.m4a",
  "./assets/voice/numbers/60.m4a",
  "./assets/voice/numbers/70.m4a",
  "./assets/voice/numbers/75.m4a",
  "./assets/voice/numbers/80.m4a",
  "./assets/voice/numbers/90.m4a",
  "./assets/voice/numbers/100.m4a",
  "./assets/voice/numbers/105.m4a",
  "./assets/voice/numbers/110.m4a",
  "./assets/voice/numbers/115.m4a",
  "./assets/voice/numbers/120.m4a",
  "./assets/voice/numbers/125.m4a",
  "./assets/voice/numbers/140.m4a",
  "./assets/voice/numbers/150.m4a",
  "./assets/voice/numbers/165.m4a",
  "./assets/voice/numbers/170.m4a",
  "./assets/voice/numbers/175.m4a",
  "./assets/voice/numbers/190.m4a",
  "./assets/voice/numbers/195.m4a",
  "./assets/voice/numbers/200.m4a",
  "./assets/voice/numbers/300.m4a",
  "./assets/voice/numbers/350.m4a",
  "./assets/voice/numbers/360.m4a",
  "./assets/voice/numbers/375.m4a",
  "./assets/voice/numbers/380.m4a",
  "./assets/voice/numbers/400.m4a",
  "./assets/voice/numbers/500.m4a",
  "./assets/voice/numbers/600.m4a",
  "./assets/voice/numbers/700.m4a",
  "./assets/voice/numbers/900.m4a",
  "./assets/voice/numbers/0.m4a",
  "./assets/voice/numbers/155.m4a",
  "./assets/voice/numbers/185.m4a",
  "./assets/voice/numbers/335.m4a",
  "./assets/voice/numbers/395.m4a",
  "./assets/voice/numbers/800.m4a",
  "./assets/voice/numbers/835.m4a",
  "./assets/voice/numbers/850.m4a",
  "./assets/voice/numbers/860.m4a",
  "./assets/voice/numbers/880.m4a",
  "./assets/voice/numbers/1000.m4a",
  "./assets/voice/phrases/baht.m4a",
  "./assets/voice/phrases/lemonade-costs.m4a",
  "./assets/voice/phrases/customer-gave.m4a",
  "./assets/voice/phrases/start-at.m4a",
  "./assets/voice/phrases/add.m4a",
  "./assets/voice/phrases/to-make.m4a",
  "./assets/voice/phrases/keep-counting-up.m4a",
  "./assets/voice/phrases/change-is.m4a",
  "./assets/voice/phrases/first-reach.m4a",
  "./assets/voice/lines/now-give-change.m4a",
  "./assets/voice/lines/count-up-to-money.m4a",
  "./assets/voice/lines/choose-a-coin-that-fits.m4a",
  "./assets/voice/lines/that-would-go-too-far.m4a",
  "./assets/voice/lines/tap-this-one-next.m4a",
  "./assets/voice/lines/you-worked-out-change.m4a",
  "./assets/voice/lines/no-change.m4a"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL("./", self.location).pathname)) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((response) => {
      if (response && response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
