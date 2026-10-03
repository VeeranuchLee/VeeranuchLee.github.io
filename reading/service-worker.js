/* Reading Tree (reading-app/), published at /reading/. CACHE_NAME is the name the release
   pipeline reads (publish-app.sh stage 5 matches /CACHE_NAME\s*=/); bumping it arms a release.

   v1 2026-10-01: first publication (owner: "pls also promote the bookshelf to the main hub,
   put it on this hub"). The whole app is about 3 MB, so SHELL precaches every shipped file:
   the Bookshelf, the reader, every book's data and art, and every word clip. That keeps a
   book readable offline on the iPad from the first visit. tools/check-reader.mjs fails when
   SHELL and scripts/ship-list.py disagree, in either direction, so a new book or a new word
   clip cannot ship uncached -- add it here and bump CACHE_NAME.

   v2 2026-10-03: book 2, "A World of Gems", joins the shelf (owner: "gems book -> approved.");
   its 13 paintings, book.json and word clips are in SHELL.

   All apps share one origin (veeranuchlee.github.io), so CacheStorage is shared too:
   activate deletes ONLY caches whose name starts with CACHE_PREFIX, never a neighbour's
   (scripts/check-worker-cache-scope.py). A Test Hub copy carries no worker at all
   (scripts/testhub-service-worker.py --strip).

   Navigations carry a query (?book=space-trip, ?from=wordbook), so they are matched with
   ignoreSearch; data and audio requests are matched exactly. */
const CACHE_NAME = 'reading-v2';
const CACHE_PREFIX = 'reading-v';
const SHELL = [
  './','./reader/','./audio/words/a.m4a','./audio/words/also.m4a','./audio/words/and.m4a',
  './audio/words/are.m4a','./audio/words/around.m4a','./audio/words/asteroids.m4a','./audio/words/bands.m4a',
  './audio/words/beautiful.m4a','./audio/words/bend.m4a','./audio/words/biggest.m4a','./audio/words/by.m4a',
  './audio/words/catch.m4a','./audio/words/clouds.m4a','./audio/words/colorful.m4a','./audio/words/come.m4a',
  './audio/words/comets.m4a','./audio/words/crystal.m4a','./audio/words/diamond.m4a',
  './audio/words/different.m4a','./audio/words/earth.m4a','./audio/words/eight.m4a','./audio/words/explore.m4a',
  './audio/words/finished.m4a','./audio/words/flat.m4a','./audio/words/for.m4a','./audio/words/form.m4a',
  './audio/words/from.m4a','./audio/words/giant.m4a','./audio/words/give.m4a','./audio/words/gives.m4a',
  './audio/words/grow.m4a','./audio/words/hard.m4a','./audio/words/has.m4a','./audio/words/have.m4a',
  './audio/words/heat.m4a','./audio/words/help.m4a','./audio/words/home.m4a','./audio/words/ice.m4a',
  './audio/words/in.m4a','./audio/words/inside.m4a','./audio/words/is.m4a','./audio/words/it.m4a',
  './audio/words/its.m4a','./audio/words/jupiter.m4a','./audio/words/light.m4a','./audio/words/like.m4a',
  './audio/words/line.m4a','./audio/words/long.m4a','./audio/words/made.m4a','./audio/words/many.m4a',
  './audio/words/material.m4a','./audio/words/moon.m4a','./audio/words/moons.m4a','./audio/words/most.m4a',
  './audio/words/nature.m4a','./audio/words/next.m4a','./audio/words/not.m4a','./audio/words/now.m4a',
  './audio/words/of.m4a','./audio/words/other.m4a','./audio/words/our.m4a','./audio/words/pattern.m4a',
  './audio/words/people.m4a','./audio/words/pieces.m4a','./audio/words/plain.m4a','./audio/words/planet.m4a',
  './audio/words/planets.m4a','./audio/words/purple.m4a','./audio/words/rainbow.m4a','./audio/words/rings.m4a',
  './audio/words/rock.m4a','./audio/words/rough.m4a','./audio/words/same.m4a','./audio/words/saturn.m4a',
  './audio/words/shall.m4a','./audio/words/slowly.m4a','./audio/words/solar.m4a','./audio/words/some.m4a',
  './audio/words/space.m4a','./audio/words/star.m4a','./audio/words/stone.m4a','./audio/words/storms.m4a',
  './audio/words/sun.m4a','./audio/words/system.m4a','./audio/words/that.m4a','./audio/words/the.m4a',
  './audio/words/them.m4a','./audio/words/they.m4a','./audio/words/through.m4a','./audio/words/time.m4a',
  './audio/words/tiny.m4a','./audio/words/travels.m4a','./audio/words/tree.m4a','./audio/words/trip.m4a',
  './audio/words/up.m4a','./audio/words/very.m4a','./audio/words/we.m4a','./audio/words/what.m4a',
  './audio/words/with.m4a','./audio/words/world.m4a',
  // book 2, A World of Gems — its word clips (v2)
  './audio/words/alive.m4a','./audio/words/amber.m4a','./audio/words/amethyst.m4a','./audio/words/bits.m4a',
  './audio/words/called.m4a','./audio/words/carbon.m4a','./audio/words/colors.m4a','./audio/words/comes.m4a',
  './audio/words/crystals.m4a','./audio/words/cutter.m4a','./audio/words/elements.m4a',
  './audio/words/faces.m4a','./audio/words/facets.m4a','./audio/words/flashes.m4a','./audio/words/gem.m4a',
  './audio/words/gems.m4a','./audio/words/geode.m4a','./audio/words/hardest.m4a','./audio/words/lined.m4a',
  './audio/words/living.m4a','./audio/words/looks.m4a','./audio/words/loved.m4a','./audio/words/mineral.m4a',
  './audio/words/minerals.m4a','./audio/words/natural.m4a','./audio/words/neat.m4a','./audio/words/opal.m4a',
  './audio/words/oysters.m4a','./audio/words/parts.m4a','./audio/words/pearls.m4a',
  './audio/words/polishes.m4a','./audio/words/pressure.m4a','./audio/words/quartz.m4a',
  './audio/words/rubies.m4a','./audio/words/sap.m4a','./audio/words/sapphires.m4a','./audio/words/shapes.m4a',
  './audio/words/sparkling.m4a','./audio/words/things.m4a','./audio/words/turned.m4a',
  './audio/words/underground.m4a','./books/gems/art/amethyst.webp','./books/gems/art/back-home.webp','./books/gems/art/cover.webp','./books/gems/art/crystals.webp','./books/gems/art/cutting.webp','./books/gems/art/diamond.webp','./books/gems/art/geode.webp','./books/gems/art/minerals.webp','./books/gems/art/opal.webp','./books/gems/art/pearl-amber.webp','./books/gems/art/ruby-sapphire.webp','./books/gems/art/underground.webp','./books/gems/art/what-is-a-gem.webp','./books/gems/book.json','./books/index.json',
  './books/space-trip/art/back-home.webp','./books/space-trip/art/contact.webp',
  './books/space-trip/art/cover.webp','./books/space-trip/art/earth-moon.webp',
  './books/space-trip/art/jupiter.webp','./books/space-trip/art/saturn.webp',
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
