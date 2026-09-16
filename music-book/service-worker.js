// Our Music Book — offline shell and the app's cache version.
//
// CACHE_NAME is the variable the release pipeline reads (publish-app.sh stage 5
// matches /CACHE_NAME\s*=/; scripts/onboard-app.py carries the same shape). Do
// not rename it, and spell the full cache name exactly once in this file, on
// the CACHE_NAME line — the runbook reads the version off this file by grepping
// for the name and taking the first hit, so a second literal above that line
// makes every reader report the wrong one.
//
// Bump the cache name whenever any shipped file changes. The fetch handler is
// cache-first, so without a bump a device that has installed the app keeps
// serving the old app.js forever, and stage 5 refuses a release whose version
// is not strictly greater than the one the live worker serves — this line IS
// the version of the app as far as the pipeline is concerned.
//
// v1  2026-09-16  the first worker this app has ever had. Not published yet:
//                 the live tree is a stale hand deploy carrying no worker at
//                 all, so there is no live version for this one to be newer
//                 than — stage 5 will treat the first pipeline release as a
//                 FIRST VERSIONED PUBLICATION and compare normally from v2 on.
//
// WHY ONLY THE SHELL IS PRECACHED
//
// The book's art is 146 files under assets/ — the world map, 22 painted
// backgrounds, 24 room cards, 83 song bubbles, six companions, eight
// playalong songs and a portrait — and precaching all of it would make every
// install crawl for a child who opens two rooms. The rule this repo settled on
// (math-app's header states it for its own art tiers): the shell is precached,
// heavy media joins the cache as it is used. A room becomes fully offline once
// it has been visited with a connection. The map is the one piece of heavy art
// precached on purpose: it is the second screen and the book's actual menu —
// each wing is a tappable region of the painting — and it is 207 KB.
//
// THE SPOKEN TITLES ARE ONLINE-ONLY, DELIBERATELY. audio/titles/*.m4a plays
// through `new Audio()` (app/titles.js), a media element, and media elements
// issue Range requests answered 206 — see guard 1 in the fetch handler for why
// that combination cannot be cached by a worker of this shape. Offline, the
// book draws, plays every piece and says nothing. Stated, not hidden.
//
// Registered from index.html, best-effort: opened straight off the filesystem
// the browser refuses the registration and the book must still work.

/* CACHE_NAME is the variable the release pipeline reads (publish-app.sh matches
   /CACHE_NAME\s*=/). Do not rename it; see release/registry.json, music-book. */
const CACHE_NAME = 'music-book-v1';

// Everything the app needs to START, plus the two screens a child sees before
// any room. The app is one ES module graph — index.html loads app/app.js and
// the imports cascade from it — so every code file below is load-bearing: one
// missing module is a blank page, not a missing feature. There are no dynamic
// imports to miss.
const APP_FILES = [
  './',
  './index.html',
  './app/styles.css',

  // Load-bearing modules: app.js and everything its import graph reaches.
  './app/app.js',
  './app/audio-engine.js',
  './app/player.js',
  './app/music-bed.js',
  './app/ambience.js',
  './app/journey.js',
  './app/titles.js',
  './app/read-together.js',
  './app/playroom.js',
  './data/instruments.js',
  './data/catalogue.js',
  './data/rooms.js',
  './data/motifs.js',
  './data/read-together-room-01.js',
  './data/playalong-songs.js',
  './data/classical-themes.js',
  './data/piano-scores.js',

  // The landing (garden plus companions) and the map, which is the menu.
  './assets/backgrounds/garden-pastel.webp',
  './assets/backgrounds/music-world-map.webp',
  './assets/companions/flute.webp',
  './assets/companions/glockenspiel.webp',
  './assets/companions/music-box.webp',
  './assets/companions/piano.webp',
  './assets/companions/violin.webp',
  './assets/companions/xylophone.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Failures swallowed one by one: a single missing picture must never
      // leave the app uninstallable. addAll() is all-or-nothing and would.
      await Promise.all(APP_FILES.map((url) => cache.add(url).catch(() => undefined)));
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        // Evict only this app's own old versions. Published, this app shares
        // one origin with the hub, Writing Book, Time Book and the others, each
        // with its own worker — deleting every cache that is not ours would
        // evict the neighbours' offline caches. This deletion is what actually
        // ships an update: a device holds the old rooms until the old cache
        // is gone.
        keys.filter((k) => /^music-book-v/.test(k) && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Another origin is not ours to serve or to store.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Guard 1 of 2 for the spoken titles: anything ranged goes straight to the
  // browser. A media element asks with `Range: bytes=0-`, GitHub Pages answers
  // 206 Partial Content, `response.ok` is TRUE for a 206 — and cache.put()
  // rejects a partial response with a TypeError nobody catches, so a clip
  // never caches and no console says why. Measured in Writing Book on
  // 2026-09-12; this book plays its titles the same way (app/titles.js).
  if (request.headers.has('range')) return;

  // Guard 2 of 2: the clips, by path, because a no-cors media request does not
  // expose its Range header in every engine and guard 1 would then be a rule
  // that quietly does not apply. The titles are online-only by design — see
  // the header before changing this.
  if (url.pathname.indexOf('/audio/') !== -1) return;

  // Navigations go to the network first, so a published update is picked up on
  // the next load; the cached shell is the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // status === 200 is load-bearing, not tidiness: it is what keeps a 206
        // (see guard 1) and any error page out of the cache — an error cached
        // here would pin the failure until the next version bump. type ===
        // 'basic' keeps opaque cross-origin responses out; they cannot be
        // validated.
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // Offline and not cached. Say so rather than handing back undefined.
        throw new Error('offline and not cached: ' + url.pathname);
      });
    })
  );
});
