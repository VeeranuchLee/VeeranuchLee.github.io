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

   The list is written out by hand rather than generated, unlike solar-system-game's,
   because there are no sprites and no clips to fall behind yet. When Phase 5 brings
   the art and narration bundles it brings a generated list with them; until then a
   hand-written list of eight files is honest about what exists.

   narration/clips.json is on the list and is committed holding an empty map. cache.addAll
   fails as a unit -- one 404 and nothing is cached at all -- so an absent manifest would
   mean no offline copy of anything. The same reasoning keeps solar-system-game's
   audio-list.js committed while it is empty. */
const CACHE_NAME = "space-trivia-v3";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./fonts.css",
  "./fonts/Nunito-latin.woff2",
  "./manifest.webmanifest",
  "./narration/clips.json",
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
