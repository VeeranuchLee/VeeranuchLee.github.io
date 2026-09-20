/* Keyboard offline cache — the pattern-blocks pattern.
 *
 * The toy draws itself in CSS and synthesises its sound in WebAudio, so the
 * shell (one page, one script, two stylesheets, fonts) is the whole app and
 * it is fully offline from the moment it installs.
 *
 * Bump CACHE_NAME on every publish; the activate handler deletes every other
 * keyboard cache, and that is what ships an update to an installed device.
 *
 *   v1  2026-08-29  first build: 49 keys, four WebAudio patches, sustain.
 *       Never published; its cache served stale bytes across a same-day edit
 *       (the worker only updates when this file changes), which is why the
 *       number moved before anything shipped.
 *   v2  2026-08-29  LCD note readout and the no-pointer-events click
 *       fallback, still pre-publication.
 *   v3  2026-08-29  Test Hub publication prep: the control deck fixed at the
 *       iPad's portrait width, a master volume that is not 2px wide, 44px
 *       controls, and the LCD volume meter actually built. No back link — the
 *       owner took the Keyboard off the toy shelf (different age segment), so
 *       it is self-contained like every other app carded on the hub.
 *       apple-touch-icon.png joins the shell too — index.html has always linked
 *       it and it was never precached, so a cold offline install had no
 *       home-screen icon to fall back on.
 *   v4  2026-09-12  Five skins. The dark console stays the default and is unchanged;
 *               four cute pianos join it (moon bunny, coral whale, strawberry
 *               picnic, woodland mushroom), each with its own background. Art is
 *               lazy -- CSS never names the backgrounds or the two painted shells,
 *               so a child who plays the classic console fetches none of ~1.9 MB.
 *               The picker chips are CSS-drawn mini pianos, so no chip loads an
 *               image either. The keybed is untouched geometry; a skin only changes
 *               what is painted around and behind the keys.
 *   v5  2026-09-14  FIVE TOYS, not one console with five skins. Baby Rainbow Keys
 *               (eight slabs and a carry handle), Chunky First Piano (fifteen pads),
 *               Princess Star Piano, Big-Kid Keyboard and Studio Explorer (instrument
 *               bank, octave and transpose, metronome, record and play) over one
 *               shared engine. The ribbon chips are CSS-drawn pictures of the toy
 *               each opens, so with the colour taken away the picture still says
 *               which keyboard it is.
 *
 *               Six modules join the shell: engine.js, keybed.js, toys.js, toys.css,
 *               toy-studio.js and recorder.js. They were listed here before this
 *               bump and were therefore never cached, because a shell list is only
 *               read when CACHE_NAME changes.
 *
 *               Still v5, 2026-09-14: effects.js joins the same list. Live is v4,
 *               so v5 has never been published and everything landing under it is
 *               part of one unshipped release -- a second bump here would be a
 *               double-bump against a version no device has ever held. The file
 *               had to be added because index.html loads it and the three
 *               colourful toys call it on mount: a cold offline install that
 *               cached the shell without it would open on a toy that throws.
 *
 *               Worth knowing for anyone reading this during an incident: nothing
 *               registers this worker. There is no serviceWorker.register call
 *               anywhere under toy-keyboard-app/, so every bump from v1 to v4 was
 *               ceremonial and no child has ever had a cached copy. That means this
 *               release cannot be held back by a stale cache -- and it also means
 *               the offline promise in the manifest is not being kept. Registering
 *               it is a separate owner decision, deliberately not taken here.
 *   v6  2026-09-14  First Piano replaces its five-block rear row with the
 *               Princess-style C4-F5 piano bed: rainbow naturals, dark
 *               accidentals, and four engine-recorded drum pads (kick,
 *               snare, tom and clap). No new shell file joins this cache.
 *               Still v6, 2026-09-15: First Piano and Princess are capped at
 *               the stage's height so a landscape iPad no longer spills them
 *               over the ribbon. Unpublished, so no second bump -- the same
 *               reasoning as the v5 note above.
 *   v7  2026-09-15  Touch hygiene across 13 apps (#625): a child's drag is not a
 *               selection and a pinch is not a zoom. (Reconstructed from 0fbb4d5a;
 *               this note had stopped at v6.)
 *   v8  2026-09-16  The back arrow moves from the Test Hub to the Music hub
 *               (children-apps/music.html), because the app is promoted there and
 *               its Test Hub card is removed. index.html only; no new shell file.
 */

const CACHE_NAME = "toy-keyboard-v9";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./styles.css",
  "./toys.css",
  "./fonts.css",
  "./app.js",
  "./voices.js",
  "./engine.js",
  "./recorder.js",
  "./keybed.js",
  "./effects.js",
  "./toys.js",
  "./toy-studio.js",

  "./fonts/Nunito-latin.woff2",
  "./fonts/Nunito-latin-ext.woff2",
  "./fonts/FredokaOne-latin.woff2",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/apple-touch-icon.png",

  "./assets/backgrounds/moon-bunny.jpg",
  "./assets/backgrounds/strawberry-picnic.jpg",
  "./assets/backgrounds/coral-whale.jpg",
  "./assets/backgrounds/classic.jpg",
  "./assets/backgrounds/woodland-mushroom.jpg",
  "./assets/pianos/moon-bunny-shell.png",
  "./assets/pianos/coral-whale-shell.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      /* Evict only THIS app's old versions (toy-keyboard-v*). The shelf and
         the other toys keep their own caches. */
      Promise.all(keys.filter((k) => /^toy-keyboard-v/.test(k) && k !== CACHE_NAME)
        .map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) =>
      hit ||
      fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});
