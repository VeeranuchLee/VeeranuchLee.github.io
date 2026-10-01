// v8 2026-10-01: the pointed almond nail shape is removed (owner: "it's dangerous in real life").
const CACHE_NAME = 'nail-salon-v8';
const CACHE_PREFIX = 'nail-salon-v';
const SHELL = ['./','./index.html','./styles.css','./state-core.js','./app.js','./tap-zoom-guard.js',
  './assets/art/hand.webp','./assets/art/hand-anchors.json','./assets/art/salon-landscape.webp','./assets/art/salon-portrait.webp',
  './assets/icons/polish-bottle.webp','./assets/icons/gem-heart.webp','./assets/icons/gem-blue.webp',
  './assets/icons/gem-flower.webp','./assets/icons/gem-pearl.webp','./assets/icons/gem-star.webp',
  './assets/icons/accessory-heart-ring.webp','./assets/icons/accessory-bow.webp','./assets/icons/accessory-pearl-bracelet.webp',
  './assets/accessories/heart-ring-back.webp','./assets/accessories/heart-ring-front.webp',
  './assets/accessories/pearl-bracelet-back.webp','./assets/accessories/pearl-bracelet-front.webp',
  './assets/accessories/friendship-thread-bracelet-back.webp','./assets/accessories/friendship-thread-bracelet-front.webp','./assets/icons/accessory-friendship-thread-bracelet.webp',
  './assets/accessories/flower-ring-back.webp','./assets/accessories/flower-ring-front.webp','./assets/icons/accessory-flower-ring.webp',
  './assets/accessories/star-ring-back.webp','./assets/accessories/star-ring-front.webp','./assets/icons/accessory-star-ring.webp',
  './assets/accessories/rainbow-band-ring-back.webp','./assets/accessories/rainbow-band-ring-front.webp','./assets/icons/accessory-rainbow-band-ring.webp',
  './assets/accessories/gem-solitaire-ring-back.webp','./assets/accessories/gem-solitaire-ring-front.webp','./assets/icons/accessory-gem-solitaire-ring.webp',
  './assets/accessories/moon-star-charm-bracelet-back.webp','./assets/accessories/moon-star-charm-bracelet-front.webp','./assets/icons/accessory-moon-star-charm-bracelet.webp',
  './assets/accessories/pink-bow-back.webp','./assets/accessories/pink-bow-front.webp','./assets/accessories/provenance.json',
  './assets/icons/finish-glitter.webp','./assets/icons/finish-shimmer.webp','./assets/icons/finish-chrome.webp',
  './assets/stickers/daisy.webp','./assets/stickers/bow.webp','./assets/stickers/strawberry.webp','./assets/stickers/star.webp',
  './assets/stickers/heart.webp','./assets/stickers/rainbow.webp','./assets/stickers/kitten.webp','./assets/stickers/cherries.webp',
  './assets/stickers/v2/cupcake.webp','./assets/stickers/v2/ice-cream.webp','./assets/stickers/v2/lollipop.webp','./assets/stickers/v2/donut.webp','./assets/stickers/v2/macaron.webp','./assets/stickers/v2/candy.webp',
  './assets/stickers/v2/bunny.webp','./assets/stickers/v2/puppy.webp','./assets/stickers/v2/panda.webp','./assets/stickers/v2/bear.webp','./assets/stickers/v2/duck.webp','./assets/stickers/v2/fox.webp',
  './assets/stickers/v2/tulip.webp','./assets/stickers/v2/rose.webp','./assets/stickers/v2/sunflower.webp','./assets/stickers/v2/leaf.webp','./assets/stickers/v2/butterfly.webp','./assets/stickers/v2/ladybird.webp',
  './assets/stickers/v2/moon.webp','./assets/stickers/v2/planet.webp','./assets/stickers/v2/rocket.webp','./assets/stickers/v2/cloud.webp','./assets/stickers/v2/sun.webp','./assets/stickers/v2/shooting-star.webp',
  './assets/stickers/v2/shell.webp','./assets/stickers/v2/starfish.webp','./assets/stickers/v2/fish.webp','./assets/stickers/v2/whale.webp','./assets/stickers/v2/octopus.webp','./assets/stickers/v2/pearl.webp',
  './assets/audio/menu-bed.m4a',
  './assets/audio/clear-confirmation.m4a'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response&&response.status===200){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}return response;})));});
