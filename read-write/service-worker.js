/* Read & Write (read-write-app/), the School-Break homework, published at /read-write/.
   CACHE_NAME is the name the release pipeline reads (publish-app.sh stage 5 matches
   /CACHE_NAME\s*=/); bumping it arms a release.

   v1 2026-10-02: first publication (owner: "also, promote การบ้านปิดเทอม read&write to main hub pls.").

   WHAT IS PRECACHED. SHELL is every shipped file EXCEPT the clips under audio/: the page, styles,
   scripts, fonts, lessons.json, the 20 hero pictures and the vocabulary pictures (about 6 MB), so
   the journey and every day's reading open offline from the first visit. tools/check-app.mjs fails
   when SHELL and scripts/ship-list.py disagree (minus audio/), in either direction, so a new picture
   cannot ship uncached -- add it here and bump CACHE_NAME.

   THE CLIPS (audio/lessons/*.m4a and audio/words/*.m4a, 559 files, about 27 MB) are cached on first
   fetch, never precached -- Word Book's trade for its 26 MB of clips. The app fetches the current
   step's clips as the step opens (js/audio.js preload), so a day opened once online plays offline
   afterwards; a clip never fetched online shows the speaker's quiet grey "no audio" state offline.
   The <audio> fallback asks with a Range header and cache.put() rejects a 206, so the clip branch
   fetches the WHOLE file, keeps that 200, and answers a range from it as a proper 206 (Word Book's
   service-worker.js, verbatim logic).

   All apps share one origin (veeranuchlee.github.io), so CacheStorage is shared too: activate
   deletes ONLY caches whose name starts with CACHE_PREFIX, never a neighbour's
   (scripts/check-worker-cache-scope.py). A Test Hub copy carries no worker at all
   (scripts/testhub-service-worker.py --strip).

   Navigations may carry a query (?day=5), so they are matched with ignoreSearch. */
const CACHE_NAME = 'read-write-v1';
const CACHE_PREFIX = 'read-write-v';
const SHELL = [
  './','./css/app.css','./fonts/FredokaOne-latin.woff2','./fonts/Nunito-latin.woff2',
  './images/d01.webp','./images/d02.webp','./images/d03.webp','./images/d04.webp',
  './images/d05.webp','./images/d06.webp','./images/d07.webp','./images/d08.webp',
  './images/d09.webp','./images/d10.webp','./images/d11.webp','./images/d12.webp',
  './images/d13.webp','./images/d14.webp','./images/d15.webp','./images/d16.webp',
  './images/d17.webp','./images/d18.webp','./images/d19.webp','./images/d20.webp',
  './images/words/autumn.season.webp','./images/words/brain.body-organ.webp',
  './images/words/bridge.crossing-structure.webp','./images/words/cloud.sky-water.webp',
  './images/words/compass.direction-tool.webp','./images/words/desert.dry-land.webp',
  './images/words/float.stay-on-surface.webp','./images/words/friction.rubbing-resistance.webp',
  './images/words/half.one-of-two-equal-parts.webp','./images/words/ice.frozen-water.webp',
  './images/words/light.illumination.webp','./images/words/lightning.weather-flash.webp',
  './images/words/liquid.state-of-matter.webp','./images/words/magnet.attracting-object.webp',
  './images/words/map.place-diagram.webp','./images/words/melt.become-liquid.webp',
  './images/words/metal.material.webp','./images/words/muscle.body-part.webp',
  './images/words/north.direction.webp','./images/words/roll.turn-over-moving.webp',
  './images/words/seed.plant-part.webp','./images/words/shadow.dark-shape.webp',
  './images/words/shadow.webp','./images/words/shine.give-light.webp',
  './images/words/sink.go-below-water.webp','./images/words/sleep.be-asleep.webp',
  './images/words/spin.turn-around.webp','./images/words/symbol.meaning-mark.webp',
  './images/words/thirsty.wanting-a-drink.webp','./images/words/thunder.weather-sound.webp',
  './images/words/weight.how-heavy.webp','./images/words/wind.moving-air.webp','./index.html',
  './js/app.js','./js/audio-ids.js','./js/audio.js','./js/store.js','./js/tap-zoom-guard.js',
  './js/write-pad.js','./lessons/lessons.json'
];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim())));
function clip(request) {
  const whole = new Request(request.url);
  return caches.open(CACHE_NAME).then(cache => cache.match(whole).then(hit => hit || fetch(whole).then(r => {
    if (r.status === 200 && r.type === 'basic') cache.put(whole, r.clone()).catch(() => {});
    return r;
  }))).then(full => {
    const range = request.headers.get('range');
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || full.status !== 200 || (m[1] === '' && m[2] === '')) return full;
    return full.arrayBuffer().then(buf => {
      const size = buf.byteLength;
      let start, end;
      if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
      else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
      if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
      return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
        'Content-Type': full.headers.get('Content-Type') || 'audio/mp4',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
    });
  });
}
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/audio/') > -1 && url.pathname.endsWith('.m4a')) { event.respondWith(clip(req)); return; }
  /* status === 200, not r.ok: ok includes 206, which cache.put() rejects. */
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(req, { ignoreSearch: req.mode === 'navigate' }))
      .then(hit => hit || fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      })));
});
