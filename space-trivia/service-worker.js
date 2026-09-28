/* Space Trivia — offline cache.

   Bump CACHE_NAME whenever any app file changes, or an installed copy keeps serving
   the old one. A cache-first worker handing back stale code is the failure that looks
   like "my edit did nothing". The release pipeline reads this name too: publish-app.sh
   stage 5 matches /CACHE_NAME\s*=/, and bumping it is what arms a release. Do not
   rename the constant; see release/registry.json.

   v1  2026-09-17  The Phase 2 shell: the start screen, the screen switching and the
       narration player. No questions, no art and no clips yet, so the precache list
       below is the whole app.

   v2  2026-09-17  Phase 4: the mission loop, the MC answering and Mission Complete.
       app.js, index.html and styles.css all changed, so the name had to move with
       them. It was caught the hard way and is worth writing down: with v1 still on
       the constant, an installed worker served the Phase 2 app.js over the Phase 4
       file on disk for a whole QA session, and the first bug "found" in the new code
       was a bug that had already been fixed in it. The list below is unchanged --
       the art in assets/images/ and the clips are still Phase 5's, and a precache
       that names a file which does not exist caches nothing at all.

   The explicit list includes the generated live-question bundle and every question
   image so owner-review missions remain available offline. Keep it in sync with
   data/questions.json; the cache version remains release-controller owned.

   narration/clips.json is on the list because it resolves every spoken line to its
   rendered clip. cache.addAll fails as a unit -- one 404 and nothing is cached at all --
   so the manifest and every explicitly listed runtime file must exist together. */
// v4 2026-09-22: zoom-trap fix -- the global gesturestart pinch blocker is
//        gone estate-wide (INTERACTION-DIRECTION.md); this bump carries it.
const CACHE_NAME = "space-trivia-v5";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./fonts.css",
  "./fonts/Nunito-latin.woff2",
  "./manifest.webmanifest",
  "./narration/clips.json",
  "./data/questions.json",
  "./assets/images/earth-moon-001.webp",
  "./assets/images/earth-moon-002.webp",
  "./assets/images/earth-moon-003.webp",
  "./assets/images/earth-moon-004.webp",
  "./assets/images/earth-moon-005.webp",
  "./assets/images/earth-moon-006.webp",
  "./assets/images/earth-moon-007.webp",
  "./assets/images/earth-moon-008.webp",
  "./assets/images/jupiter-001.webp",
  "./assets/images/jupiter-002.webp",
  "./assets/images/jupiter-003.webp",
  "./assets/images/jupiter-004.webp",
  "./assets/images/jupiter-005.webp",
  "./assets/images/jupiter-006.webp",
  "./assets/images/mars-001.webp",
  "./assets/images/mars-002.webp",
  "./assets/images/mars-003.webp",
  "./assets/images/mars-004.webp",
  "./assets/images/mars-005.webp",
  "./assets/images/mars-006.webp",
  "./assets/images/mars-007.webp",
  "./assets/images/mars-008.webp",
  "./assets/images/mercury-venus-001.webp",
  "./assets/images/mercury-venus-002.webp",
  "./assets/images/mercury-venus-003.webp",
  "./assets/images/mercury-venus-004.webp",
  "./assets/images/mercury-venus-005.webp",
  "./assets/images/mercury-venus-006.webp",
  "./assets/images/saturn-001.webp",
  "./assets/images/saturn-002.webp",
  "./assets/images/saturn-003.webp",
  "./assets/images/saturn-004.webp",
  "./assets/images/saturn-005.webp",
  "./assets/images/saturn-006.webp",
  "./assets/images/solar-system-basics-001.webp",
  "./assets/images/solar-system-basics-002.webp",
  "./assets/images/solar-system-basics-003.webp",
  "./assets/images/solar-system-basics-004.webp",
  "./assets/images/solar-system-basics-005.webp",
  "./assets/images/solar-system-basics-006.webp",
  "./assets/images/solar-system-basics-007.webp",
  "./assets/images/solar-system-basics-008.webp",
  "./assets/images/sun-001.webp",
  "./assets/images/sun-002.webp",
  "./assets/images/sun-003.webp",
  "./assets/images/sun-004.webp",
  "./assets/images/sun-005.webp",
  "./assets/images/sun-006.webp",
  "./assets/images/uranus-neptune-001.webp",
  "./assets/images/uranus-neptune-002.webp",
  "./assets/images/uranus-neptune-003.webp",
  "./assets/images/uranus-neptune-004.webp",
  "./assets/images/uranus-neptune-005.webp",
  "./assets/images/uranus-neptune-006.webp",
  "./assets/images/wider-basics-001.webp",
  "./assets/images/wider-basics-002.webp",
  "./assets/images/wider-basics-003.webp",
  "./assets/images/wider-basics-004.webp",
  "./assets/images/wider-basics-005.webp",
  "./assets/images/wider-basics-006.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        /* Evict only this app's old versions (space-trivia-v*). Several repo apps
           share one origin when published, each with its own worker -- deleting every
           cache that is not ours would evict the neighbours' offline caches. Foreign
           cache names are not ours to touch. */
        keys.filter((k) => /^space-trivia-v/.test(k) && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  /* Navigations go to the network first so a published update is picked up on the next
     load, and fall back to the cached shell when there is none. */
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
