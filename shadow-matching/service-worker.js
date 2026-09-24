/* CACHE_NAME is the variable the release pipeline's reader expects (publish-app.sh stage 5
   matches /CACHE_NAME\s*=/), and bumping it is what arms a release. Do not rename it. */
const CACHE_NAME = 'shadow-matching-v5';

/* The SHELL is the app and the roster -- everything needed to show the set picker. The
   OBJECT ART IS NOT PRECACHED: 100 objects at two images each is several megabytes, and a
   child who only ever plays two sets should not pay for ten on install. The fetch handler
   is cache-first for same-origin GETs, so each shadow and picture is stored the first time
   it is actually shown. Same trade the hub beds and the dictionary pictures make. */
const SHELL = ['./', './index.html', './sound.js', './app.js', './styles.css',
  './manifest.webmanifest', './asset-roster.json',
  /* 160 KB, and Memory mode cannot build a fair board without it. */
  './assets-runtime/silhouette-signatures.json',
  /* 6 KB. Without it Mirror Match is not offered, so an offline iPad must hold it. */
  './assets-runtime/mirror-eligibility.json'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));

/* Evict only THIS app's own old versions (shadow-matching-v*). Every app in this
   repository is published under one origin, veeranuchlee.github.io, and Cache Storage
   is partitioned by ORIGIN and not by path -- so "delete every cache that is not mine"
   is not a tidy-up, it is this worker emptying the Colour Garden's, Magic Math's and
   every other app's offline cache the moment a child opens Shadow Matching. On the
   iPad that means those apps stop working offline and silently re-download. Every
   other worker in this repository already scopes its eviction by its own prefix; this
   one was the last that did not. scripts/check-worker-cache-scope.py now fails the
   build if any worker regresses to the unscoped form. */
const CACHE_PREFIX = 'shadow-matching-v';

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
