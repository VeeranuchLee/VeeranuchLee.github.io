/* Reading Tree (reading-app/), published at /reading/. CACHE_NAME is the name the release
   pipeline reads (publish-app.sh stage 5 matches /CACHE_NAME\s*=/); bumping it arms a release.

   v1 2026-10-01: first publication (owner: "pls also promote the bookshelf to the main hub,
   put it on this hub"). The whole app is about 3 MB, so SHELL precaches every shipped file:
   the Bookshelf, the reader, every book's data and art, and every word clip. That keeps a
   book readable offline on the iPad from the first visit. tools/check-reader.mjs fails when
   SHELL and scripts/ship-list.py disagree, in either direction, so a new book or a new word
   clip cannot ship uncached -- add it here and bump CACHE_NAME.

   All apps share one origin (veeranuchlee.github.io), so CacheStorage is shared too:
   activate deletes ONLY caches whose name starts with CACHE_PREFIX, never a neighbour's
   (scripts/check-worker-cache-scope.py). A Test Hub copy carries no worker at all
   (scripts/testhub-service-worker.py --strip).

   Navigations carry a query (?book=space-trip, ?from=wordbook), so they are matched with
   ignoreSearch; data and audio requests are matched exactly. */
const CACHE_NAME = 'reading-v1';
const CACHE_PREFIX = 'reading-v';
const SHELL = [
  './','./reader/',
  './audio/words/a.m4a','./audio/words/also.m4a','./audio/words/and.m4a','./audio/words/are.m4a',
  './audio/words/around.m4a','./audio/words/asteroids.m4a','./audio/words/bands.m4a','./audio/words/beautiful.m4a',
  './audio/words/biggest.m4a','./audio/words/clouds.m4a','./audio/words/colorful.m4a','./audio/words/comets.m4a',
  './audio/words/earth.m4a','./audio/words/eight.m4a','./audio/words/explore.m4a','./audio/words/finished.m4a',
  './audio/words/for.m4a','./audio/words/form.m4a','./audio/words/giant.m4a','./audio/words/gives.m4a',
  './audio/words/has.m4a','./audio/words/heat.m4a','./audio/words/home.m4a','./audio/words/ice.m4a',
  './audio/words/is.m4a','./audio/words/it.m4a','./audio/words/its.m4a','./audio/words/jupiter.m4a',
  './audio/words/light.m4a','./audio/words/made.m4a','./audio/words/moon.m4a','./audio/words/moons.m4a',
  './audio/words/next.m4a','./audio/words/now.m4a','./audio/words/of.m4a','./audio/words/our.m4a',
  './audio/words/pieces.m4a','./audio/words/planet.m4a','./audio/words/planets.m4a','./audio/words/rings.m4a',
  './audio/words/rock.m4a','./audio/words/saturn.m4a','./audio/words/shall.m4a','./audio/words/solar.m4a',
  './audio/words/space.m4a','./audio/words/star.m4a','./audio/words/storms.m4a','./audio/words/sun.m4a',
  './audio/words/system.m4a','./audio/words/the.m4a','./audio/words/through.m4a','./audio/words/travels.m4a',
  './audio/words/trip.m4a','./audio/words/we.m4a','./audio/words/what.m4a','./books/index.json',
  './books/space-trip/art/back-home.webp','./books/space-trip/art/contact.webp','./books/space-trip/art/cover.webp',
  './books/space-trip/art/earth-moon.webp','./books/space-trip/art/jupiter.webp','./books/space-trip/art/saturn.webp',
  './books/space-trip/art/solar-system.webp','./books/space-trip/art/sun.webp','./books/space-trip/book.json',
  './index.html','./reader/fonts/FredokaOne-latin.woff2','./reader/fonts/Nunito-latin.woff2',
  './reader/index.html','./reader/js/tap-zoom-guard.js','./reader/reader.css','./reader/reader.js',
  './shelf/bg-landscape.webp','./shelf/bg-portrait.webp','./shelf/icon-bookshelf.webp','./shelf/shelf.css',
  './shelf/shelf.js','./shelf/tap-zoom-guard.js'
];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(req, { ignoreSearch: req.mode === 'navigate' }))
      .then(hit => hit || fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      })));
});
