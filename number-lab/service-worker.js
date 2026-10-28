/* Owner decision 2026-10-25: the installed worker takes over immediately so cg-update.js
   can detect it; cg-update.js will not reload a child-touched page until 5+ minutes idle. */
const CACHE_NAME='number-lab-v5';const PRECACHE=['./','./index.html','./styles.css',
  './cg-back.css',
  './cg-update.js','./tap-zoom-guard.js','./assets/tile-atlas.webp','./js/app.js','./js/balance-config.js','./js/game-state.js','./js/queue-engine.js','./js/rules-engine.js','./js/shop-engine.js','./js/cpu-player.js','./js/renderer.js'];self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(PRECACHE)));self.skipWaiting();});self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(xs=>Promise.all(xs.filter(x=>x.startsWith('number-lab-v')&&x!==CACHE_NAME).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))})
