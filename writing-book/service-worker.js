/* Writing Book — offline cache.
 *
 * NEW WORKER, NOT A BUMP. writing-book-v1 is the first service worker this app has
 * ever had. It arms no release and it supersedes no live version: as of 2026-09-12
 * `https://veeranuchlee.github.io/writing-book/service-worker.js` returns 404. Do not
 * read v1 as "the published app is at v0".
 *
 * WHY IT EXISTS AT ALL, which is not the usual reason. Writing Book was hand-published
 * once and never enrolled. `release/registry.json` already names it with
 * service_worker: "service-worker.js" and cache_prefix: "writing-book-v", but the file
 * did not exist -- so the app had no cache version, and the cache version is what the
 * release gate reads. No worker, no gate, no pipeline. The visible cost: the cover's
 * exit arrow was retargeted to /word-book/ on 2026-09-09 and, three days later, the
 * live bytes still carried /children-apps/. Nothing noticed, because nothing could.
 *
 *   curl -s https://veeranuchlee.github.io/writing-book/app.js \
 *     | grep -oE "children-apps/|word-book/" | sort | uniq -c
 *   live 2026-09-12:  3 children-apps/     main 9c1e8878:  1 children-apps/, 3 word-book/
 *
 * ---------------------------------------------------------------------------
 * THE SHELL is everything the app draws, and it is derived, not transcribed.
 *
 * Read out of the code rather than off a directory listing:
 *   index.html           the seven scripts below, in load order, and styles.css
 *   styles.css:149       art/ui/say-bubble.png, the say badge
 *   words.js:216-218     art/words/picture/<slug>.jpg, art/words/card/<slug>.jpg,
 *                        art/paper/<name>.jpg
 *   app.js:129,133,262,288,460,491   the only caller of those three
 *   vocab.js:148         picture.src, same helper
 *   sound.js:147-155     audio/{words,spell,letters,sentence,cues}/*.m4a -- and those
 *                        are the exception, see THE VOICE below
 *
 * The hundred slugs and the four papers are NOT copied into this file. words.js is
 * importScripts'd and the paths are built with its own helpers, so a word added to
 * words.js is precached without anyone remembering to come back here. A hand-copied
 * list would keep passing while the source moved underneath it.
 *
 * That import needs one shim: words.js is `(function (global) {...})(window)` and a
 * worker has no `window`. Assigning it before the import is the whole trick. If a
 * future edit gives words.js a real DOM dependency, install FAILS -- loudly, in the
 * Application panel -- rather than quietly precaching a stale list. That is the
 * intended failure mode; do not wrap it in a try/catch.
 *
 * Precached: 8 code/markup files + 205 images, about 4.6 MB. Small enough to take in
 * one install, so there are no tiers here and no warm/lazy split.
 *
 * ---------------------------------------------------------------------------
 * THE VOICE IS ONLINE-ONLY, DELIBERATELY, AND THIS IS NOT A GRACEFUL FALLBACK.
 *
 * 335 clips, 4.9 MB, under audio/. They are NOT in the shell and the fetch handler
 * does NOT cache them. Offline, the book draws and traces perfectly and says nothing.
 * Stated, not hidden.
 *
 * The reason is mechanical and it defeats the obvious fix. sound.js:123 plays every
 * clip through `new Audio(path)`. A media element does not issue an ordinary GET: it
 * sends `Range: bytes=0-`, and GitHub Pages answers `206 Partial Content`. `206` is
 * inside 200-299, so `response.ok` is TRUE -- and then `cache.put()` rejects a partial
 * response with a TypeError. Inside a fetch handler that rejection is unhandled: no
 * console error a child's parent would see, no failed request, just a clip that never
 * caches and a promise nobody awaited. Precaching the clips with addAll would not fix
 * it either. addAll fetches with a plain GET and stores a 200, but the playback request
 * still carries Range, and a 200 returned to a ranged media request is refused by
 * WebKit -- which would trade a silent cache miss for silent audio on the iPad this
 * app is built for.
 *
 * So audio leaves the worker alone in BOTH directions, with two guards rather than one:
 *
 *   1. any request carrying a Range header is passed straight through, untouched, for
 *      the browser to handle natively. This is the general rule and it covers anything
 *      ranged that gets added later.
 *   2. any path under /audio/ is passed through as well. Belt and braces: a no-cors
 *      media request does not expose its Range header in every engine, and guard (1)
 *      alone would then be a rule that quietly does not apply.
 *
 * Making the voice work offline means serving real 206s out of the cache -- slicing a
 * stored full response and synthesising Content-Range. That is a deliberate feature, an
 * engine-sensitive one, and it is not this change. If someone builds it, the test is
 * not `!el.paused`: that stays true on a stalled element at readyState 0. Only a
 * currentTime that advances proves sound.
 *
 * ---------------------------------------------------------------------------
 * ONE MORE THING THE SIBLINGS GET WRONG, kept fixed here. The cache-write test is
 * `response.status === 200`, not `response.ok`. `ok` is every 2xx, which is how a 206
 * reaches cache.put in the first place.
 *
 * Bump CACHE_NAME on every publish: the handler is cache-first, so without a bump a
 * device that has installed the app serves the old app.js forever.
 *
 *   v1  2026-09-12  first worker. The app itself is unchanged apart from registering
 *                   it -- this exists so the app has a version the gate can read.
 */

/* CACHE_NAME is the variable the release pipeline reads (publish-app.sh matches
   /CACHE_NAME\s*=/). Do not rename it; see release/registry.json, writing-book. */
const CACHE_NAME = "writing-book-v2";

/* words.js is the single source of truth for the hundred words and the four papers.
   See THE SHELL above for why this is an import and not a copied list. */
self.window = self;
importScripts("./words.js");
const Words = self.WritingWords;

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",

  // Load order as index.html declares it. letters.js is the geometry the rest read.
  "./letters.js",
  "./strokes.js",
  "./words.js",
  "./sentences.js",
  "./sound.js",
  "./vocab.js",
  "./app.js",

  // The say badge, from styles.css:149. The only piece of interface art.
  "./art/ui/say-bubble.png"
];

Words.pages.forEach((page) => {
  SHELL.push("./" + Words.paper(page.paper));
  page.words.forEach((entry) => {
    SHELL.push("./" + Words.picture(entry.slug));   // the clue, word removed
    SHELL.push("./" + Words.card(entry.slug));      // the answer, and the sticker
  });
});

/* Four pages share each paper, so the list above names each one ten times over. */
const PRECACHE = SHELL.filter((path, i) => SHELL.indexOf(path) === i);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      /* Evict only this app's own old versions (writing-book-v*). Published, this app
         shares one origin with spelling-exam, word-book and the hub, each with its own
         worker — deleting every cache that is not ours would evict the neighbours'
         offline caches. Foreign cache names are not ours to touch. */
      .then((keys) =>
        Promise.all(
          keys.filter((key) => /^writing-book-v/.test(key) && key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Another origin is not ours to serve or to store.
  if (url.origin !== self.location.origin) return;

  // Guard 1 of 2 for the voice: anything ranged goes straight to the browser. A 206
  // cannot be put in a cache, and letting one reach cache.put rejects unhandled.
  if (request.headers.has("range")) return;

  // Guard 2 of 2: the clips, by path, because a no-cors media request does not expose
  // its Range header in every engine. See THE VOICE in the header before changing this.
  if (url.pathname.indexOf("/audio/") !== -1) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // 200 exactly, not response.ok: ok is every 2xx, and a 206 is what breaks
          // cache.put. An error page cached here would pin the failure until the next
          // version bump.
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached. A navigation gets the book's cover rather than the
          // browser's error page.
          if (request.mode === "navigate") return caches.match("./index.html");
          throw new Error("offline and not cached: " + url.pathname);
        });
    })
  );
});
