/* CACHE_NAME is the variable the release pipeline's reader expects (publish-app.sh stage 5
   matches /CACHE_NAME\s*=/), and bumping it is what arms a release. Do not rename it. */
/* v5 2026-10-08: owner-approved release of Robot Code's new maze type, the directional Code Toys, the Code Toy heading arrow and the retired rocket toy. Worker/cache bump only; the controller prepares the release. */
const CACHE_NAME = 'our-maze-v5';

/* The SHELL is everything needed to open the picker and play the first maze offline:
   the page, its scripts and styles, the manifest, the sprite roster, and every sprite
   the page can offer. The sprite set is small (fifteen 512px WebPs), so precaching it
   keeps the game fully playable the first time a child opens it without a network. */
const SHELL = [
  './',
  './index.html',
  './css/maze.css',
  './js/tap-zoom-guard.js',
  './js/maze-core.js',
  './js/maze-movement.js',
  './js/maze-plan.js',
  './js/maze-sound.js',
  './js/maze-app.js',
  './manifest.webmanifest',
  './assets/sprites/sprites.js',
  './assets/sprites/teddy.webp',
  './assets/sprites/bunny.webp',
  './assets/sprites/dinosaur.webp',
  './assets/sprites/robot.webp',
  './assets/sprites/robot-back.webp',
  './assets/sprites/robot-side.webp',
  './assets/sprites/doll.webp',
  './assets/sprites/penguin.webp',
  './assets/sprites/lion.webp',
  './assets/sprites/hippo.webp',
  './assets/sprites/duck.webp',
  './assets/sprites/elephant.webp',
  './assets/sprites/owl.webp',
  './assets/sprites/rocking-horse.webp',
  './assets/sprites/flag.webp',
  './assets/sprites/signpost.webp',
  './assets/sprites/sparkles.webp',
  './assets/code-toys/car-tile.webp',
  './assets/code-toys/car-up.webp',
  './assets/code-toys/car-right.webp',
  './assets/code-toys/car-down.webp',
  './assets/code-toys/car-left.webp',
  './assets/code-toys/bus-tile.webp',
  './assets/code-toys/bus-up.webp',
  './assets/code-toys/bus-right.webp',
  './assets/code-toys/bus-down.webp',
  './assets/code-toys/bus-left.webp',
  './assets/code-toys/train-tile.webp',
  './assets/code-toys/train-up.webp',
  './assets/code-toys/train-right.webp',
  './assets/code-toys/train-down.webp',
  './assets/code-toys/train-left.webp',
  './assets/code-toys/airplane-tile.webp',
  './assets/code-toys/airplane-up.webp',
  './assets/code-toys/airplane-right.webp',
  './assets/code-toys/airplane-down.webp',
  './assets/code-toys/airplane-left.webp',
  './assets/code-toys/robot-rover-tile.webp',
  './assets/code-toys/robot-rover-up.webp',
  './assets/code-toys/robot-rover-right.webp',
  './assets/code-toys/robot-rover-down.webp',
  './assets/code-toys/robot-rover-left.webp',
  './assets/code-toys/boat-tile.webp',
  './assets/code-toys/boat-up.webp',
  './assets/code-toys/boat-right.webp',
  './assets/code-toys/boat-down.webp',
  './assets/code-toys/boat-left.webp',
  './assets/code-toys/fire-truck-tile.webp',
  './assets/code-toys/fire-truck-up.webp',
  './assets/code-toys/fire-truck-right.webp',
  './assets/code-toys/fire-truck-down.webp',
  './assets/code-toys/fire-truck-left.webp',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));

/* Evict only THIS app's own old versions (our-maze-v*). Every app in this repository is
   published under one origin, veeranuchlee.github.io, and Cache Storage is partitioned by
   ORIGIN and not by path -- so "delete every cache that is not mine" would empty the
   Colour Garden's, Magic Math's and every other app's offline cache the moment a child
   opens Our Maze. */
const CACHE_PREFIX = 'our-maze-v';

self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(
    ks.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))
  )).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => hit)));
});
