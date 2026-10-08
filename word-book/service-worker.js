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
   from the very first load, not only after one successful online fetch.

   v4 -> v5, 2026-09-26: the hub's music bed (audio/word-bed.m4a, rendered 2026-09-18) is
   wired to index.html for the first time -- AUDIO-DIRECTION.md decision 10a. A worker
   bump only; nothing here publishes on its own. The bed itself does NOT join SHELL: it
   is off by default, so precaching it would add 864 KB to every child's first install to
   serve a feature most will never turn on. It is cached the first time it actually plays,
   by the fetch handler's generic same-origin branch below (the comment on that branch
   already names this exact file).

   v5 -> v6, 2026-09-28: CG-250 round 7 owner verdicts landed. Only bow.ribbon-knot's
   clip changed (ships the IPA-turbo take; among/all/and/ago keep their current shipped
   clip unchanged, no file touched) -- coordination/tasks/2026-09-28-2029-claude-word-
   clips-r7-verdicts.md. A worker bump only; this arms a release candidate but does not
   publish it -- production publish still needs the owner's separate, SHA-bound
   approval.

   v6 -> v7, 2026-09-29: the owner lifted the Word Book freeze for exactly PR #1074 and
   #1075 ("lift C and D pls") -- coordination/tasks/2026-09-29-2026-claude-wordbook-
   merge-cd.md. #1074 shipped the letter-C verdict clips (7 IPA takes + 1 sentence cut);
   #1075 shipped sentence audio for the rest of C and all of D (105 clips). Neither PR
   bumped CACHE_NAME on its own branch (the held PR #1073 was going to carry v6->v7, but
   it stays held and unmerged), so installed devices would keep the old word/sentence
   clips without this bump. A worker bump only; this arms a release candidate but does
   not publish it -- production publish still needs the owner's separate, SHA-bound
   approval.

   NOT BUMPED FOR THE 2026-10-01 BOOKSHELF CARD. assets/icons/bookshelf.webp joins SHELL
   (the hub's fifth card, linking to Reading Tree at /reading/), but v7 has never been
   published -- live /word-book/ served word-book-v5 when this was written -- so v7 is
   already ahead of live and one unpublished version is enough, the same reasoning as the
   2026-09-22 word clips above.

   v7 -> v8, 2026-10-02: letters C and D are enabled (data/letters.json), owner, verbatim:
   "today's goal : i want C and D to be finished." 47 C/D pictures, 7 C/D word clips, the
   new click card's sentence clip and data/dictionary.json all change under unchanged URLs
   -- coordination/tasks/2026-10-02-0812-claude-wordbook-cd-release.md. v7 was never
   published either, so this is belt and braces: it marks the C/D candidate as its own
   cache generation. A worker bump only; this arms a release candidate but does not
   publish it -- production publish still needs the owner's separate, SHA-bound approval.

   v8 -> v9, 2026-10-07: letters A-H (owner, verbatim: "I think we can promote until H to
   main hub."). E-H are enabled in data/letters.json, and A-H pick up the held work from
   agent/wordbook-next-0930: the owner's v4 word clips (47/47 picks), sentence clips, card
   art fixes (globe, hundred, five's finished crown) and the Thai corrections (goal ->
   ประตูฟุตบอล) -- coordination/tasks/2026-10-07-1700-claude-wordbook-release-ah.md. The
   Grammar Game is HELD ("Letters only (Recommended)"): its files are [private] in
   .publish-manifest, so they are NOT in SHELL either -- cache.addAll() rejects on one 404
   and the whole install would fail. data/features.json ({"grammar": false}, the gate
   index.html reads) joins SHELL so the card stays hidden offline too, and
   tap-zoom-guard.js joins SHELL because index.html and
   dictionary.html now load it (INTERACTION-DIRECTION.md method C). A worker bump only;
   this arms a release candidate but does not publish it -- production publish still needs
   the owner's separate, SHA-bound approval.
   v9 -> v10, 2026-10-08: letters A-N (owner, verbatim: "word book -> approved the new
   changes, so pls publish until N"; "Everything on Test Hub"). I-N enabled in
   data/letters.json; Word Groups, the night room label bubbles and the Grammar Game ship
   (data/features.json grammar true; the game's html/css/js/questions/rendered.json join
   SHELL, its pictures and clips are cached on first use). L and N voice picks, the 8 Oct
   card redraws. A worker bump only; this arms a release candidate but does not publish it
   -- production publish still needs the owner's separate, SHA-bound approval. */
const CACHE_NAME='word-book-v10';
const SHELL=['./','./index.html','./dictionary.html','./fonts.css',
  './fonts/Nunito-latin.woff2','./fonts/Nunito-latin-ext.woff2','./fonts/FredokaOne-latin.woff2',
  './manifest.webmanifest','./data/dictionary.json','./data/letters.json','./data/features.json','./word-audio.js',
  './sentence-audio.js','./audio/sentences/rendered.json','./tap-zoom-guard.js','./grammar-game.html','./grammar-game.css','./grammar-game.js','./data/grammar-questions.json','./audio/grammar/rendered.json','./room-label.css','./room-label.js',
  './assets/icons/dictionary.webp','./assets/icons/spelling.webp',
  './assets/icons/writing-book.webp','./assets/icons/spelling-exam.webp',
  './assets/icons/bookshelf.webp','./assets/backdrop.webp','./assets/room-plate.webp',
  './assets/word-groups/actions.webp','./assets/word-groups/feelings-emotions.webp',
  './assets/word-groups/colours.webp','./assets/word-groups/shapes-sizes.webp',
  './assets/word-groups/describing-words.webp','./assets/word-groups/numbers-amounts.webp',
  './assets/word-groups/time.webp','./assets/word-groups/position-direction.webp',
  './assets/word-groups/people-family.webp','./assets/word-groups/body-senses.webp',
  './assets/word-groups/health-care.webp','./assets/word-groups/food-drink.webp',
  './assets/word-groups/clothes.webp','./assets/word-groups/home.webp',
  './assets/word-groups/school-learning.webp','./assets/word-groups/places.webp',
  './assets/word-groups/jobs-helpers.webp','./assets/word-groups/toys-games.webp',
  './assets/word-groups/sports-movement.webp','./assets/word-groups/music-art.webp',
  './assets/word-groups/technology-tools.webp','./assets/word-groups/transport.webp',
  './assets/word-groups/animals.webp','./assets/word-groups/nature-plants.webp',
  './assets/word-groups/weather.webp','./assets/word-groups/space.webp',
  './assets/word-groups/materials-textures.webp'];
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
