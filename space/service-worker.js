/* CACHE_NAME is the variable the release pipeline's reader expects (publish-app.sh stage 5
   matches /CACHE_NAME\s*=/), and bumping it is what arms a release. Do not rename it; see
   release/registry.json.

   NO skipWaiting, deliberately -- the same shape as word-book, which this page twins. A new
   worker takes over on the next cold start, not mid-session, so a child never has a page
   swapped underneath them. The cost is real and worth writing down: an edit appears to
   have no effect until every tab is closed, and a publish does not reach an already-open
   app. That is a known trade in this repository, not a bug to fix in a hurry. */
/* space-hub-v3: index.html changed (the music toggle and its script), and index.html
   IS precached below, so the version bumps even though SHELL's file list does not.
   audio/space-bed.m4a is DELIBERATELY NOT ADDED to SHELL -- see index.html's Music
   IIFE. It is off by default, so precaching ~880 KB into every child's first install
   to serve a feature most sessions never turn on is the wrong trade; the fetch
   handler below is cache-first for same-origin GETs already, so the bed joins the
   cache itself the first time a child plays it. Same reasoning as
   site/children-apps/index.html's own bed ("NOT PRECACHED"). */
const CACHE_NAME='space-hub-v4';
const SHELL=['./','./index.html','./fonts.css',
  './fonts/Nunito-latin.woff2','./fonts/Nunito-latin-ext.woff2','./fonts/FredokaOne-latin.woff2',
  './manifest.webmanifest',
  './assets/ari-and-dot.webp','./assets/planets-and-moons.png','./assets/space-trivia.webp','./assets/backdrop.webp',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('space-hub-v')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return r;})));});
