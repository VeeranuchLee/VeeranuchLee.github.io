/* CACHE_NAME is the variable the release pipeline's reader expects (publish-app.sh stage 5
   matches /CACHE_NAME\s*=/), and bumping it is what arms a release. Do not rename it; see
   release/registry.json.

   NO skipWaiting, deliberately -- the same shape as spelling-exam-app beside it. A new
   worker takes over on the next cold start, not mid-session, so a child never has a page
   swapped underneath them. The cost is real and worth writing down: an edit appears to
   have no effect until every tab is closed, and a publish does not reach an already-open
   app. That is a known trade in this repository, not a bug to fix in a hurry.

   NOT BUMPED FOR THE 2026-09-22 WORD CLIPS. word-book has never been published: the live
   /word-book/ serves no worker at all and release/registry.json had word-book disabled at
   the time, so v2 on main was already ahead of live and unpublished. One unpublished
   version is enough; bumping again would arm nothing new.

   v3 2026-09-24: arms the first release candidate -- owner-approved A/B preview
   (data/letters.json {"enabled":["a","b"]}, wired by commit f6534e0b). data/letters.json
   joins SHELL here: dictionary.html fetches it at runtime and falls back to EVERY letter
   if that fetch fails, so precaching it is what keeps the A/B-only gate holding offline
   from the very first load, not only after one successful online fetch. */
const CACHE_NAME='word-book-v4';
const SHELL=['./','./index.html','./dictionary.html','./fonts.css',
  './fonts/Nunito-latin.woff2','./fonts/Nunito-latin-ext.woff2','./fonts/FredokaOne-latin.woff2',
  './manifest.webmanifest','./data/dictionary.json','./data/letters.json','./word-audio.js',
  './sentence-audio.js','./audio/sentences/rendered.json',
  './assets/icons/dictionary.webp','./assets/icons/spelling.webp',
  './assets/icons/writing-book.webp','./assets/icons/spelling-exam.webp',
  './assets/backdrop.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('word-book-v')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
/* THE SPOKEN WORDS (audio/words/*.m4a, 2,020 clips, 26 MB) -- cached on first play,
   never precached. Precaching 26 MB on install to serve taps that may never come is the
   wrong trade, the same call .publish-manifest makes for the pictures and the Space Hub
   made for its bed.

   Why they need their own branch: an <audio> element asks with `Range: bytes=0-`, the
   server answers 206, and cache.put() REJECTS a 206 -- so the plain handler below would
   never cache a clip and would throw inside the worker on every tap (animal-book's and
   coloring-app's workers record the same finding). Here the worker fetches the WHOLE
   file with no Range header (a clean 200, ~13 KB), keeps that, and answers the element's
   range from it as a proper 206, which is what Safari's media stack insists on.

   OFFLINE CONSEQUENCE, stated plainly: a word the child has heard once while online
   plays offline afterwards. A word never played while online cannot play offline -- the
   fetch fails, the element errors, and the page shows the speaker's "missed" face (a
   shake and a cross) instead of doing nothing. A new CACHE_NAME drops the heard clips
   with the rest of the old cache; they refill as words are tapped again.

   THE SPOKEN SENTENCES (audio/sentences/<sense>.m4a, owner spec 2026-09-22) take the
   SAME branch for the same reason: an <audio> range request, cached whole on first play
   under this app's own CACHE_NAME, never precached. Only their small ledger,
   audio/sentences/rendered.json, is in SHELL -- it is what tells the page which cards
   may show a sentence speaker, so it must be there offline like data/dictionary.json.
   tools/check-sentence-audio.mjs fails if a sentence clip ever joins SHELL or leaves
   this branch. The offline consequence is the words' exactly: a sentence heard once
   plays offline; one never heard shows the missed face. */
function wordClip(request){
  const whole=new Request(request.url);
  return caches.open(CACHE_NAME).then(cache=>cache.match(whole).then(hit=>hit||fetch(whole).then(r=>{
    if(r.status===200&&r.type==='basic')cache.put(whole,r.clone()).catch(()=>{});
    return r;
  }))).then(full=>{
    const range=request.headers.get('range');
    const m=range&&/^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if(!m||full.status!==200||(m[1]===''&&m[2]===''))return full;
    return full.arrayBuffer().then(buf=>{
      const size=buf.byteLength;
      let start,end;
      if(m[1]===''){start=Math.max(0,size-Number(m[2]));end=size-1;}
      else{start=Number(m[1]);end=m[2]===''?size-1:Math.min(Number(m[2]),size-1);}
      if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
      return new Response(buf.slice(start,end+1),{status:206,statusText:'Partial Content',headers:{
        'Content-Type':full.headers.get('Content-Type')||'audio/mp4',
        'Content-Range':'bytes '+start+'-'+end+'/'+size,
        'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
    });
  });
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin===location.origin&&(url.pathname.indexOf('/audio/words/')>-1||url.pathname.indexOf('/audio/sentences/')>-1)&&url.pathname.endsWith('.m4a')){
    e.respondWith(wordClip(e.request));return;
  }
  /* status===200, not r.ok: ok includes 206, which cache.put() rejects (the hub's bed is
     a ranged <audio> fetch and used to throw here on every play). */
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.status===200&&url.origin===location.origin){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return r;})));
});
