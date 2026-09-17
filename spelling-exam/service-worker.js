/* CACHE_NAME is the variable the release pipeline's reader expects (publish-app.sh stage 5
   matches /CACHE_NAME\s*=/). Do not rename it back; see release/registry.json. */
const CACHE_NAME='spelling-exam-v13';
/* handwriting/ is the Writing Book's stroke engine, ported by tools/port-handwriting.js.
   It is precached rather than left to the runtime cache because Write Words is the one
   screen that cannot degrade: without the engine the writing area is a blank rectangle.
   v12 (2026-09-16) is the release that ships Write Words, so these two files join the
   shell here; a v11 shell has never heard of them. */
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./handwriting/letters.js','./handwriting/strokes.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('spelling-exam-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return r;})));});
