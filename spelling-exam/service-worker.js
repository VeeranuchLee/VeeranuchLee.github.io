/* CACHE_NAME is the variable the release pipeline's reader expects (publish-app.sh stage 5
   matches /CACHE_NAME\s*=/). Do not rename it back; see release/registry.json. */
// v16 2026-09-22: zoom-trap fix -- the global gesturestart pinch blocker is
//        gone estate-wide (INTERACTION-DIRECTION.md); this bump carries it.
// v17 2026-09-27: zoom fix C (method C, owner-approved 2026-09-25) -- the shared
//        ./tap-zoom-guard.js stops the ZOOM of a second quick single-finger tap and
//        re-delivers that tap, while a multi-finger pinch is never touched. It is in
//        SHELL because a shell list is only read when CACHE_NAME changes: listing the
//        file without the bump caches nothing, and index.html is precached, so an
//        offline install would otherwise have a page that asks for a guard the cache
//        never got. v16 was itself never published, so this rides an unpublished bump.
const CACHE_NAME='spelling-exam-v17';
/* handwriting/ is the Writing Book's stroke engine, ported by tools/port-handwriting.js.
   It is precached rather than left to the runtime cache because Write Words is the one
   screen that cannot degrade: without the engine the writing area is a blank rectangle.
   v12 (2026-09-16) is the release that ships Write Words, so these two files join the
   shell here; a v11 shell has never heard of them. */
const SHELL=['./','./index.html','./styles.css','./tap-zoom-guard.js','./app.js','./manifest.webmanifest','./handwriting/letters.js','./handwriting/strokes.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('spelling-exam-v')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return r;})));});
