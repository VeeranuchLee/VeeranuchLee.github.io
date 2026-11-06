const CACHE_NAME = "jewel-studio-v1";
const CACHE_PREFIX = "jewel-studio-v";

const SHELL = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./studio.css",
  "./studio.js",
  "./tap-zoom-guard.js",
  "./safe-storage.js",
  "./cg-back.css",
  "./cg-update.js",
  "./manifest.webmanifest",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./design/coloring-studio/raster/botanical-vine-ring-line.webp",
  "./design/coloring-studio/raster/botanical-vine-ring-regions.webp",
  "./design/coloring-studio/raster/bow-barrette-line.webp",
  "./design/coloring-studio/raster/bow-barrette-regions.webp",
  "./design/coloring-studio/raster/butterfly-hairpin-line.webp",
  "./design/coloring-studio/raster/butterfly-hairpin-regions.webp",
  "./design/coloring-studio/raster/butterfly-ring-line.webp",
  "./design/coloring-studio/raster/butterfly-ring-regions.webp",
  "./design/coloring-studio/raster/chandelier-pair-line.webp",
  "./design/coloring-studio/raster/chandelier-pair-regions.webp",
  "./design/coloring-studio/raster/classic-charm-bracelet-line.webp",
  "./design/coloring-studio/raster/classic-charm-bracelet-regions.webp",
  "./design/coloring-studio/raster/crescent-star-earrings-line.webp",
  "./design/coloring-studio/raster/crescent-star-earrings-regions.webp",
  "./design/coloring-studio/raster/deco-choker-line.webp",
  "./design/coloring-studio/raster/deco-choker-regions.webp",
  "./design/coloring-studio/raster/deco-dangles-line.webp",
  "./design/coloring-studio/raster/deco-dangles-regions.webp",
  "./design/coloring-studio/raster/deco-hair-comb-line.webp",
  "./design/coloring-studio/raster/deco-hair-comb-regions.webp",
  "./design/coloring-studio/raster/deco-halo-ring-line.webp",
  "./design/coloring-studio/raster/deco-halo-ring-regions.webp",
  "./design/coloring-studio/raster/deco-link-bracelet-line.webp",
  "./design/coloring-studio/raster/deco-link-bracelet-regions.webp",
  "./design/coloring-studio/raster/decorated-headband-line.webp",
  "./design/coloring-studio/raster/decorated-headband-regions.webp",
  "./design/coloring-studio/raster/double-pearl-bracelet-line.webp",
  "./design/coloring-studio/raster/double-pearl-bracelet-regions.webp",
  "./design/coloring-studio/raster/floral-earrings-line.webp",
  "./design/coloring-studio/raster/floral-earrings-regions.webp",
  "./design/coloring-studio/raster/floral-necklace-line.webp",
  "./design/coloring-studio/raster/floral-necklace-regions.webp",
  "./design/coloring-studio/raster/floral-side-clip-line.webp",
  "./design/coloring-studio/raster/floral-side-clip-regions.webp",
  "./design/coloring-studio/raster/floral-vine-bracelet-line.webp",
  "./design/coloring-studio/raster/floral-vine-bracelet-regions.webp",
  "./design/coloring-studio/raster/flower-cluster-ring-line.webp",
  "./design/coloring-studio/raster/flower-cluster-ring-regions.webp",
  "./design/coloring-studio/raster/gemstone-tennis-line.webp",
  "./design/coloring-studio/raster/gemstone-tennis-regions.webp",
  "./design/coloring-studio/raster/geometric-stations-line.webp",
  "./design/coloring-studio/raster/geometric-stations-regions.webp",
  "./design/coloring-studio/raster/graduated-pearls-line.webp",
  "./design/coloring-studio/raster/graduated-pearls-regions.webp",
  "./design/coloring-studio/raster/heart-ring-line.webp",
  "./design/coloring-studio/raster/heart-ring-regions.webp",
  "./design/coloring-studio/raster/manifest.json",
  "./design/coloring-studio/raster/oval-locket-line.webp",
  "./design/coloring-studio/raster/oval-locket-regions.webp",
  "./design/coloring-studio/raster/paneled-hoops-line.webp",
  "./design/coloring-studio/raster/paneled-hoops-regions.webp",
  "./design/coloring-studio/raster/pearl-cluster-drops-line.webp",
  "./design/coloring-studio/raster/pearl-cluster-drops-regions.webp",
  "./design/coloring-studio/raster/round-bezel-studs-line.webp",
  "./design/coloring-studio/raster/round-bezel-studs-regions.webp",
  "./design/coloring-studio/raster/round-solitaire-line.webp",
  "./design/coloring-studio/raster/round-solitaire-regions.webp",
  "./design/coloring-studio/raster/royal-collar-line.webp",
  "./design/coloring-studio/raster/royal-collar-regions.webp",
  "./design/coloring-studio/raster/royal-crown-ring-line.webp",
  "./design/coloring-studio/raster/royal-crown-ring-regions.webp",
  "./design/coloring-studio/raster/royal-filigree-cuff-line.webp",
  "./design/coloring-studio/raster/royal-filigree-cuff-regions.webp",
  "./design/coloring-studio/raster/slender-tiara-line.webp",
  "./design/coloring-studio/raster/slender-tiara-regions.webp",
  "./design/coloring-studio/raster/small-royal-crown-line.webp",
  "./design/coloring-studio/raster/small-royal-crown-regions.webp",
  "./design/coloring-studio/raster/stacked-leaf-bangles-line.webp",
  "./design/coloring-studio/raster/stacked-leaf-bangles-regions.webp",
  "./design/coloring-studio/raster/teardrop-drops-line.webp",
  "./design/coloring-studio/raster/teardrop-drops-regions.webp",
  "./design/coloring-studio/raster/teardrop-pendant-line.webp",
  "./design/coloring-studio/raster/teardrop-pendant-regions.webp",
  "./design/coloring-studio/raster/three-stone-ring-line.webp",
  "./design/coloring-studio/raster/three-stone-ring-regions.webp",
  "./design/coloring-studio/raster/tiara-comb-line.webp",
  "./design/coloring-studio/raster/tiara-comb-regions.webp",
  "./design/coloring-studio/raster/two-tier-chain-line.webp",
  "./design/coloring-studio/raster/two-tier-chain-regions.webp",
  "./design/coloring-studio/raster/woven-medallion-line.webp",
  "./design/coloring-studio/raster/woven-medallion-regions.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL("./", self.location).pathname)) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
