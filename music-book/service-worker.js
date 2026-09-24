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
// v1  2026-09-16  the first worker this app has ever had. The note written
//                 here said "not published yet", and that stopped being true
//                 the same day: VeeranuchLee.github.io d4d8f3f3 (2026-09-16)
//                 is a pipeline publish of private main 52e6d8ed as v1, and
//                 this file was live, byte for byte, until the hand deploy
//                 1d005320 (2026-09-18) removed both it and its registration
//                 from index.html. Removing a worker does not unregister it,
//                 so a device that opened the book in those two days still
//                 holds a v1 cache of the 2026-09-16 shell.
// v2  2026-09-21  the first release after that. Shipped files changed since
//                 v1 went out (catalogue.js, classical-themes.js, styles.css,
//                 index.html, 45 title clips), and a byte-identical v1 worker
//                 would never reinstall on those devices, so they would keep
//                 the old catalogue forever. Stage 5 still reads the live tree
//                 as a FIRST VERSIONED PUBLICATION (no worker there today),
//                 which accepts any number; the bump is for the devices, not
//                 the gate. Evidence: external-data/2026-09-21-music-book-release-candidate.md.
//
// (v2, still the candidate) OWNER DECISION D3 (2026-09-22, option A, below)
//                 changed no behaviour in this file — the shape it asks for was
//                 already the shape here — so it did not bump the version: v2
//                 has never reached a device (the live URL is 404 on 2026-09-22
//                 and staged copies carry no worker), and there is no installed
//                 v2 cache for an unchanged name to leave stale. What D3 added
//                 is a test, music-book/tools/check-offline-scope.mjs, which runs
//                 this worker, and a refreshed art census in the next paragraph.
//
// WHY ONLY THE SHELL IS PRECACHED — OWNER DECISION D3, 2026-09-22, OPTION A
//
// The owner was given two options and chose A:
//
//   A  Precache only the shell (measured then: 27 files, 1,007,405 bytes,
//      0.96 MB). Art caches room by room, on first visit.   ← CHOSEN
//   B  Precache all art as well (measured then: +9.84 MB on top of the shell,
//      for an install of 10.85 MB).                          ← presented, NOT chosen
//
// The reasoning was the Space Hub precedent (space-hub/service-worker.js, which
// leaves its 880 KB music bed out of SHELL for the same reason): a room a child
// has visited once works offline afterwards, and no child waits out an eleven-
// megabyte first load to open one room.
//
// Measured again after the 2026-09-22 background tranche (#862): the art is
// 209 files, 12,215,083 bytes (11.65 MB) under assets/ — 29 backgrounds (the
// landing garden, the world map and the room paintings), 24 room cards, 117
// song bubbles, six companions, eight playalong songs, 24 composer portraits
// and an index — and the shell is 27 files, 1,008,434 bytes (0.96 MB). Option
// B's cost only grows as art lands; option A's does not. Measured numbers in a
// comment go stale silently (this one said 146 files and 83 bubbles until
// 2026-09-22), so check-offline-scope.mjs re-measures the shell on every run
// and fails at a 1.5 MB budget. Eight of the art files are shell: the landing
// garden (64 KB), the six companions (208 KB together) and the world map. The
// map is the one piece of heavy art precached on purpose — it is the second
// screen and the book's actual menu, each wing a tappable region of the
// painting — and it is 207 KB.
//
// WHAT A CHILD GETS AND DOES NOT GET, OFFLINE. Everything the book reads and
// plays is shell: the room text, the room graph, and the music itself, which is
// synthesised by WebAudio rather than streamed. So offline, a room that has
// never been opened still opens, still plays and still reads — it is the
// painting that is missing, and only for that room. A visited room is complete.
// app/app.js turns a song picture that fails into the ♪ disc a piece without
// art already shows, so the missing painting never reads as a broken page.
//
// THE COST OF ONE CACHE. Runtime art is stored in CACHE_NAME, the same cache the
// shell lives in, so bumping the version discards the rooms a device had already
// collected and it re-downloads them as they are next visited. A second,
// separately versioned art cache would avoid that, and is deliberately not built
// here: the release pipeline (publish-app.sh stages 5 and 9) and
// scripts/check-worker-cache-scope.py both treat one app as one cache family,
// the Space Hub makes the same trade, and inventing a second family for this one
// book is a change to release tooling wearing the costume of a worker tweak.
// Worth revisiting when art changes far less often than code; not worth doing by
// stealth inside a decision about precache scope.
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
const CACHE_NAME = 'music-book-v2';

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
