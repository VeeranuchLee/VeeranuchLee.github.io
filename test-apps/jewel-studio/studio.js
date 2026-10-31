(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.JewelStudio = api;
    api.mount();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SAVE_KEY = "little-charm-studio-v1";
  const LEGACY_KEY = "little-charm-designs-v5";
  const VERSION = 4;
  const WIDTH = 900;
  const HEIGHT = 600;
  const ASSET_VERSION = "r7-regions-20261029";
  const ALL = "All designs";
  const CATEGORIES = ["Necklaces", "Bracelets", "Rings", "Earrings", "Hair ornaments"];
  const PALETTE = ["#d4a237", "#c5ccd6", "#2384d6", "#bf3c6e", "#2f977e", "#774db4", "#dc5837", "#f6ebda"];
  const METALS = {
    gold: { label: "Gold", base: "#d4a237", gradient: "linear-gradient(135deg,#6f4610 0%,#fff0a6 28%,#ad781d 49%,#ffe78a 68%,#815214 100%)" },
    silver: { label: "Silver", base: "#b8c2cf", gradient: "linear-gradient(135deg,#626b76 0%,#ffffff 28%,#a7b0bb 49%,#eef3f8 68%,#707984 100%)" },
    platinum: { label: "Platinum", base: "#d7e1e7", gradient: "linear-gradient(135deg,#788995 0%,#ffffff 25%,#cbd8df 48%,#f8ffff 69%,#82939e 100%)" },
    "rose-gold": { label: "Rose gold", base: "#c77f78", gradient: "linear-gradient(135deg,#74413d 0%,#ffd7ca 27%,#b66d68 49%,#ffe2d5 69%,#864b47 100%)" },
  };
  const TEMPLATES = [
    { id: "floral-necklace", title: "Layered Floral Necklace", category: "Necklaces", regionCount: 58 },
    { id: "teardrop-pendant", title: "Teardrop Pendant", category: "Necklaces", regionCount: 50 },
    { id: "deco-choker", title: "Art Deco Choker", category: "Necklaces", regionCount: 51 },
    { id: "graduated-pearls", title: "Graduated Pearls", category: "Necklaces", regionCount: 34 },
    { id: "oval-locket", title: "Oval Locket", category: "Necklaces", regionCount: 50 },
    { id: "two-tier-chain", title: "Two-tier Chain", category: "Necklaces", regionCount: 51 },
    { id: "royal-collar", title: "Royal Collar", category: "Necklaces", regionCount: 51 },
    { id: "geometric-stations", title: "Geometric Stations", category: "Necklaces", regionCount: 33 },
    { id: "stacked-leaf-bangles", title: "Stacked Leaf Bangles", category: "Bracelets", regionCount: 50 },
    { id: "classic-charm-bracelet", title: "Classic Charm Bracelet", category: "Bracelets", regionCount: 51 },
    { id: "woven-medallion", title: "Woven Medallion Bracelet", category: "Bracelets", regionCount: 51 },
    { id: "royal-filigree-cuff", title: "Royal Filigree Cuff", category: "Bracelets", regionCount: 50 },
    { id: "gemstone-tennis", title: "Gemstone Tennis Bracelet", category: "Bracelets", regionCount: 53 },
    { id: "double-pearl-bracelet", title: "Double Pearl Bracelet", category: "Bracelets", regionCount: 50 },
    { id: "floral-vine-bracelet", title: "Floral Vine Bracelet", category: "Bracelets", regionCount: 50 },
    { id: "deco-link-bracelet", title: "Art Deco Link Bracelet", category: "Bracelets", regionCount: 52 },
    { id: "round-solitaire", title: "Round Solitaire", category: "Rings", regionCount: 31 },
    { id: "heart-ring", title: "Heart Ring", category: "Rings", regionCount: 29 },
    { id: "flower-cluster-ring", title: "Flower Cluster Ring", category: "Rings", regionCount: 34 },
    { id: "butterfly-ring", title: "Butterfly Ring", category: "Rings", regionCount: 36 },
    { id: "royal-crown-ring", title: "Royal Crown Ring", category: "Rings", regionCount: 46 },
    { id: "three-stone-ring", title: "Three-stone Ring", category: "Rings", regionCount: 37 },
    { id: "deco-halo-ring", title: "Art Deco Halo Ring", category: "Rings", regionCount: 50 },
    { id: "botanical-vine-ring", title: "Botanical Vine Ring", category: "Rings", regionCount: 50 },
    { id: "chandelier-pair", title: "Chandelier Earring Pair", category: "Earrings", regionCount: 50 },
    { id: "round-bezel-studs", title: "Round Bezel Studs", category: "Earrings", regionCount: 50 },
    { id: "paneled-hoops", title: "Paneled Hoops", category: "Earrings", regionCount: 50 },
    { id: "teardrop-drops", title: "Teardrop Drops", category: "Earrings", regionCount: 54 },
    { id: "deco-dangles", title: "Art Deco Dangles", category: "Earrings", regionCount: 52 },
    { id: "floral-earrings", title: "Floral Earrings", category: "Earrings", regionCount: 51 },
    { id: "pearl-cluster-drops", title: "Pearl Cluster Drops", category: "Earrings", regionCount: 50 },
    { id: "crescent-star-earrings", title: "Crescent and Star Earrings", category: "Earrings", regionCount: 52 },
    { id: "tiara-comb", title: "Botanical Tiara Comb", category: "Hair ornaments", regionCount: 57 },
    { id: "slender-tiara", title: "Slender Jeweled Tiara", category: "Hair ornaments", regionCount: 50 },
    { id: "small-royal-crown", title: "Small Royal Crown", category: "Hair ornaments", regionCount: 38 },
    { id: "bow-barrette", title: "Bow Barrette", category: "Hair ornaments", regionCount: 38 },
    { id: "decorated-headband", title: "Decorated Headband", category: "Hair ornaments", regionCount: 50 },
    { id: "floral-side-clip", title: "Floral Side Clip", category: "Hair ornaments", regionCount: 50 },
    { id: "deco-hair-comb", title: "Art Deco Hair Comb", category: "Hair ornaments", regionCount: 50 },
    { id: "butterfly-hairpin", title: "Butterfly Hairpin", category: "Hair ornaments", regionCount: 50 },
  ].map((template) => ({
    ...template,
    line: `design/coloring-studio/raster/${template.id}-line.png?v=${ASSET_VERSION}`,
    regionMap: `design/coloring-studio/raster/${template.id}-regions.png?v=${ASSET_VERSION}`,
  }));
  // What an uncoloured part becomes when it is made real: clear diamond, polished gold,
  // cream pearl. An uncoloured plate is polished gold too, never a flat blank.
  const UNFILLED = { gem: "#e4ecf8", metal: "#e2b23c", pearl: "#f3e9dc", "enamel/other": "#e2b23c" };

  function blankDoc(templateId) {
    return { version: VERSION, id: `studio-${Date.now()}-${Math.random().toString(16).slice(2)}`, templateId, updatedAt: new Date().toISOString(), metal: "gold", fills: {}, effects: {}, strokes: [], madeReal: false };
  }
  function validDoc(doc) {
    return !!(doc && [1, 2, 3, VERSION].includes(doc.version) && TEMPLATES.some((template) => template.id === doc.templateId) && (!doc.metal || METALS[doc.metal]) && doc.fills && doc.effects && Array.isArray(doc.strokes));
  }
  function loadDocs(storage) {
    try {
      const docs = JSON.parse(storage.getItem(SAVE_KEY) || "[]");
      return Array.isArray(docs) ? docs.filter(validDoc) : [];
    } catch {
      return [];
    }
  }
  function saveDoc(storage, doc) {
    const docs = loadDocs(storage);
    const index = docs.findIndex((candidate) => candidate.id === doc.id);
    doc.version = VERSION;
    doc.updatedAt = new Date().toISOString();
    index < 0 ? docs.unshift(doc) : docs.splice(index, 1, doc);
    storage.setItem(SAVE_KEY, JSON.stringify(docs.slice(0, 24)));
    return docs;
  }
  function legacySummary(storage) {
    try {
      const docs = JSON.parse(storage.getItem(LEGACY_KEY) || "[]");
      return { key: LEGACY_KEY, count: Array.isArray(docs) ? docs.length : 0, preserved: true };
    } catch {
      return { key: LEGACY_KEY, count: 0, preserved: true };
    }
  }
  const rgbId = (data, offset) => (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
  function decodeRegionMap(data) {
    const labels = new Uint32Array(data.length / 4);
    for (let index = 0; index < labels.length; index++) labels[index] = rgbId(data, index * 4);
    return labels;
  }
  function pixelsForRegion(labels, id) {
    const pixels = [];
    for (let index = 0; index < labels.length; index++) if (labels[index] === id) pixels.push(index);
    return pixels;
  }
  function paintFlatColors(output, geometry, regionMeta, fills, width = WIDTH, height = HEIGHT) {
    for (const [id, paint] of Object.entries(fills)) {
      // Material tags describe the Make-it-real result. They must never pre-colour
      // a fresh flat design; metal is rendered only by rebuildFinish().
      if (regionMeta.get(+id)?.partClass === "METAL") continue;
      const solid = !String(paint).startsWith("gradient:");
      const a = parseHex(solid ? paint : paint.split(":")[1]), b = parseHex(solid ? paint : paint.split(":")[2]);
      for (const index of geometry.pixels.get(+id) || []) {
        const ratio = Math.floor(index / width) / height, offset = index * 4;
        output[offset] = a[0] + (b[0] - a[0]) * ratio;
        output[offset + 1] = a[1] + (b[1] - a[1]) * ratio;
        output[offset + 2] = a[2] + (b[2] - a[2]) * ratio;
        output[offset + 3] = 255;
      }
    }
    return output;
  }
  function nearestRegion(labels, x, y, radius, width = WIDTH, height = HEIGHT) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const exact = labels[y * width + x];
    if (exact) return exact;
    const limit = Math.max(0, Math.ceil(radius));
    let best = 0, bestDistance = Infinity;
    for (let dy = -limit; dy <= limit; dy++) for (let dx = -limit; dx <= limit; dx++) {
      const distance = dx * dx + dy * dy;
      if (distance > radius * radius || distance >= bestDistance) continue;
      const px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const candidate = labels[py * width + px];
      if (candidate) { best = candidate; bestDistance = distance; }
    }
    return best;
  }
  function metalFamily(hex) {
    const [r, g, b] = String(hex || "#d4a237").match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
    if (Math.abs(r - g) < 26 && Math.abs(g - b) < 26) return "silver";
    if (r > g * 1.18 && b > g * .72) return "rose-gold";
    if (r > b * 1.35 && g > b * 1.18) return "gold";
    return "tinted-metal";
  }

  // One pass over the label map: every region's pixel list, a chamfer distance-to-outline
  // field, and per-region thickness/centroid/bounds. The finish shades from the distance
  // field, so facets, domes and bevels follow each part's real shape. Round 4 shaded from
  // bounding boxes, which left petals, leaves and bands mostly one flat colour.
  function buildGeometry(labels, width = WIDTH, height = HEIGHT) {
    const total = width * height;
    const counts = new Map();
    for (let i = 0; i < total; i++) { const id = labels[i]; if (id) counts.set(id, (counts.get(id) || 0) + 1); }
    const pixels = new Map(), fill = new Map();
    for (const [id, count] of counts) { pixels.set(id, new Int32Array(count)); fill.set(id, 0); }
    for (let i = 0; i < total; i++) { const id = labels[i]; if (id) { const at = fill.get(id); pixels.get(id)[at] = i; fill.set(id, at + 1); } }
    const dist = new Float32Array(total);
    const BIG = 1e6, D = Math.SQRT2;
    for (let i = 0; i < total; i++) dist[i] = labels[i] ? BIG : 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x; if (!dist[i]) continue;
      let v = dist[i];
      if (x > 0) v = Math.min(v, dist[i - 1] + 1); else v = Math.min(v, 1);
      if (y > 0) { v = Math.min(v, dist[i - width] + 1); if (x > 0) v = Math.min(v, dist[i - width - 1] + D); if (x < width - 1) v = Math.min(v, dist[i - width + 1] + D); } else v = Math.min(v, 1);
      dist[i] = v;
    }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x; if (!dist[i]) continue;
      let v = dist[i];
      if (x < width - 1) v = Math.min(v, dist[i + 1] + 1); else v = Math.min(v, 1);
      if (y < height - 1) { v = Math.min(v, dist[i + width] + 1); if (x < width - 1) v = Math.min(v, dist[i + width + 1] + D); if (x > 0) v = Math.min(v, dist[i + width - 1] + D); } else v = Math.min(v, 1);
      dist[i] = v;
    }
    // Normals come from a lightly smoothed copy of the field; the raw chamfer steps show as
    // stair-step banding on metal and pearls otherwise.
    let soft = dist;
    for (let pass = 0; pass < 2; pass++) {
      const next = new Float32Array(total);
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const i = y * width + x; if (!labels[i]) continue;
        let sum = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * width + dx; if (labels[j] === labels[i] || !labels[j]) { sum += soft[j]; n++; } }
        next[i] = sum / n;
      }
      soft = next;
    }
    const stats = new Map();
    for (const [id, list] of pixels) {
      let left = width, right = 0, top = height, bottom = 0, sx = 0, sy = 0, maxD = 1;
      for (let k = 0; k < list.length; k++) { const i = list[k], x = i % width, y = (i - x) / width; if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; sx += x; sy += y; if (dist[i] > maxD) maxD = dist[i]; }
      stats.set(id, { id, n: list.length, left, right, top, bottom, x: (left + right) / 2, y: (top + bottom) / 2, cx: sx / list.length, cy: sy / list.length, maxD });
    }
    return { pixels, dist, soft, stats };
  }

  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const parseHex = (hex) => String(hex).match(/[a-f\d]{2}/gi).slice(0, 3).map((part) => parseInt(part, 16));
  function vivid(rgb, minSat = .72) {
    // Push a child's colour toward a saturated, jewel-like value without changing its hue.
    let [r, g, b] = rgb.map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (d < .11) return rgb.slice(); // near-neutral (white, cream, silver) stays neutral: a clear diamond
    let h; const s0 = l > .5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6;
    const s = Math.max(s0, minSat), L = Math.min(.56, Math.max(.36, l));
    const q = L < .5 ? L * (1 + s) : L + s - L * s, p = 2 * L - q;
    const hue = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
  }
  const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const WHITE = [255, 255, 255];
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // Key light from the upper left, viewer straight on.
  const LIGHT = (() => { const v = [-.5, -.62, .6], m = Math.hypot(...v); return v.map((c) => c / m); })();
  const HALF = (() => { const v = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], m = Math.hypot(...v); return v.map((c) => c / m); })();
  const LIGHT_ANGLE = Math.atan2(LIGHT[1], LIGHT[0]);

  // Shade every pixel of one region into an RGBA buffer. Returns nothing; writes `out`.
  function shadeRegion(out, geometry, id, material, paint) {
    const { pixels, dist, soft, stats } = geometry, st = stats.get(id), list = pixels.get(id);
    if (!st || !list) return;
    const solid = !paint || !String(paint).startsWith("gradient:");
    const startHex = !paint ? UNFILLED[material] : solid ? paint : paint.split(":")[1];
    const endHex = !paint ? startHex : solid ? paint : paint.split(":")[2];
    const A = parseHex(startHex), B = parseHex(endHex);
    const kind = !paint && material === "enamel/other" ? "metal" : material;
    const w = Math.max(1, st.right - st.left), h = Math.max(1, st.bottom - st.top), maxD = st.maxD;
    const sectors = maxD < 5 ? 6 : maxD < 10 ? 8 : 12;
    const at = (i) => soft[i] || 0;
    for (let k = 0; k < list.length; k++) {
      const i = list[k], x = i % WIDTH, y = (i - x) / WIDTH, o = i * 4;
      const base = solid ? A : mixRgb(A, B, y / HEIGHT);
      const d = dist[i], t = clamp01(d / maxD);
      const gx = (at(i + 1) - at(i - 1)) / 2, gy = (at(i + WIDTH) - at(i - WIDTH)) / 2;
      let rgb;
      if (kind === "gem") {
        const v = vivid(base, .66), dark = mixRgb(v, [10, 6, 22], .8), light = mixRgb(v, WHITE, .5);
        let b;
        if (t > .64) {
          // Table: a bright flat top that darkens away from the light, with one reflected bar.
          const u = ((x - st.cx) * LIGHT[0] + (y - st.cy) * LIGHT[1]) / Math.max(4, maxD);
          b = .52 + .3 * u;
          const bar = Math.abs(((x - st.cx) + (y - st.cy)) / Math.max(4, maxD) + .15);
          if (bar < .12) b += .3;
        } else {
          const ring = t < .3 ? 1 : 0;
          const s = ((Math.atan2(y - st.cy, x - st.cx) + Math.PI) / (2 * Math.PI)) * sectors + ring * .5;
          const facet = Math.floor(s), frac = s - facet;
          const normalAngle = ((facet + .5 - ring * .5) / sectors) * 2 * Math.PI - Math.PI;
          const lit = .5 + .5 * Math.cos(normalAngle - LIGHT_ANGLE);
          b = .08 + .86 * (.6 * lit + .4 * hash(facet * 7 + ring * 131 + id * 17));
          if (ring) b *= .78;
          const edge = Math.min(frac, 1 - frac) * (2 * Math.PI * Math.max(2, d)) / sectors;
          if (edge < .9) b = Math.min(1, b + .32);
          if (Math.abs(t - .3) < .9 / maxD || Math.abs(t - .64) < .9 / maxD) b = Math.min(1, b + .28);
        }
        if (d < 1.6) b *= .42;
        rgb = b < .5 ? mixRgb(dark, v, b / .5) : mixRgb(v, light, (b - .5) / .5);
        if (b > .88) rgb = mixRgb(rgb, WHITE, Math.min(1, (b - .88) * 6));
      } else if (kind === "metal") {
        const curve = Math.sqrt(Math.max(.02, 1 - (1 - t) * (1 - t)));
        const slope = Math.min(3.2, (1 - t) / curve) * 1.25;
        let nx = -gx * slope, ny = -gy * slope, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
        const rx = 2 * nz * nx, ry = 2 * nz * ny;
        const sweep = ((x - st.left) / w) * .9 + ((y - st.top) / h) * .7;
        let env = .5 + .5 * Math.sin(ry * 4.4 - rx * 1.8 + .6 + sweep * 3.4);
        env = Math.pow(env, 1.5);
        const spec = Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), 70);
        const tone = vivid(base, .5), dark = mixRgb(tone, [48, 24, 6], .72), light = mixRgb(tone, WHITE, .72);
        rgb = mixRgb(dark, light, env);
        if (d < 1.4) rgb = mixRgb(rgb, [20, 10, 8], .5);
        rgb = mixRgb(rgb, WHITE, Math.min(1, spec * 1.4));
      } else if (kind === "pearl") {
        const curve = Math.sqrt(Math.max(.02, 1 - (1 - t) * (1 - t)));
        const slope = Math.min(3.5, (1 - t) / curve) * 1.4;
        let nx = -gx * slope, ny = -gy * slope, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
        const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        const nh = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
        const tone = mixRgb(vivid(base, .5), WHITE, .12);
        rgb = mixRgb(mixRgb(tone, [60, 40, 55], .5), mixRgb(tone, WHITE, .35), diffuse);
        const rim = clamp01(1 - t * 2.4);
        rgb = mixRgb(rgb, [255, 190, 220], rim * .35);
        rgb = mixRgb(rgb, [190, 240, 230], clamp01(1 - Math.abs(t - .32) * 6) * .18);
        rgb = mixRgb(rgb, WHITE, Math.min(1, Math.pow(nh, 40) * 1.1 + Math.pow(nh, 8) * .25));
      } else {
        // Enamel: saturated colour under glass, a guilloché texture, bevelled glossy edges
        // and one diagonal window reflection.
        const tb = clamp01(d / Math.min(maxD, 7));
        const slope = (1 - tb) * 1.8;
        let nx = -gx * slope, ny = -gy * slope, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
        const v = vivid(base, .7);
        const ring = .9 + .1 * Math.sin(Math.hypot(x - st.cx, y - st.cy) * 1.25);
        rgb = mixRgb([10, 6, 18], v, (.62 + .38 * tb) * ring);
        const nh = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
        rgb = mixRgb(rgb, WHITE, Math.min(1, Math.pow(nh, 45) * 1.2));
        const u = ((x - st.left) / w) * .8 + ((y - st.top) / h) * .6;
        const band = Math.max(0, 1 - Math.abs(u - .38) / .09);
        rgb = mixRgb(rgb, WHITE, band * .42);
        if (d < 1.4) rgb = mixRgb(rgb, [10, 6, 18], .5);
      }
      out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = 255;
    }
  }

  function mount() {
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];
    const canvases = ["colorCanvas", "drawCanvas", "finishCanvas", "effectCanvas", "lineCanvas"].map((id) => $("#" + id));
    canvases.forEach((canvas) => { canvas.width = WIDTH; canvas.height = HEIGHT; });
    const [colorCanvas, drawCanvas, finishCanvas, effectCanvas, lineCanvas] = canvases;
    const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true });
    const drawContext = drawCanvas.getContext("2d");
    const finishContext = finishCanvas.getContext("2d", { willReadFrequently: true });
    const effectContext = effectCanvas.getContext("2d");
    const lineContext = lineCanvas.getContext("2d");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let category = ALL;
    let doc = null;
    let template = null;
    let labels = null;
    let geometry = null;
    let lineImage = null;
    let regionMeta = new Map();
    let tool = "fill";
    let color = PALETTE[2];
    let effect = null;
    let size = 18;
    let drawing = false;
    let activeStroke = null;
    let history = [];
    let future = [];
    let raf = 0;
    let lastFrame = 0;
    let revealStart = -1;
    let manifestPromise = null;
    const maskCache = new Map();
    const effectCache = new Map();
    let shared = null; // per-template cached canvases: whole-piece mask, gold outline
    let real = null; // per Make-it-real build: glow halo + twinkle stars

    const makeCanvas = (w = WIDTH, h = HEIGHT) => { const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; return canvas; };
    let audio = null;
    function tapFeedback(frequency = 560) {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
        oscillator.connect(gain).connect(audio.destination); oscillator.frequency.value = frequency; oscillator.type = "sine";
        gain.gain.setValueAtTime(.045, now); gain.gain.exponentialRampToValueAtTime(.001, now + .16);
        oscillator.start(now); oscillator.stop(now + .16);
      } catch {}
    }
    const loadImage = (src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    const show = (id) => {
      $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
      $("#back").style.visibility = id === "gallery" ? "hidden" : "visible";
      $("#hub-back").style.display = id === "gallery" ? "" : "none";
    };
    const point = (event) => {
      const rect = lineCanvas.getBoundingClientRect();
      return { x: Math.max(0, Math.min(WIDTH - 1, Math.floor((event.clientX - rect.left) * WIDTH / rect.width))), y: Math.max(0, Math.min(HEIGHT - 1, Math.floor((event.clientY - rect.top) * HEIGHT / rect.height))) };
    };
    const regionAt = (event) => {
      if (!labels) return 0;
      const p = point(event), rect = lineCanvas.getBoundingClientRect();
      // A 44 CSS-pixel fingertip may land beside a tiny prong or bead. Resolve
      // to the nearest fillable part within half a fingertip instead of
      // requiring the child to hit one exact raster pixel.
      return nearestRegion(labels, p.x, p.y, 22 * WIDTH / rect.width);
    };
    const regionPixels = (id) => geometry?.pixels.get(+id) || [];
    function snapshot() {
      history.push(JSON.stringify(doc));
      if (history.length > 30) history.shift();
      future = [];
      updateHistory();
    }
    function rebuildColor() {
      const output = colorContext.createImageData(WIDTH, HEIGHT);
      paintFlatColors(output.data, geometry, regionMeta, doc.fills);
      colorContext.putImageData(output, 0, 0);
    }
    function drawStroke(stroke) {
      if (!stroke.points?.length) return;
      drawContext.save();
      drawContext.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
      drawContext.strokeStyle = stroke.color;
      drawContext.fillStyle = stroke.color;
      drawContext.lineWidth = stroke.size;
      drawContext.lineCap = "round";
      drawContext.lineJoin = "round";
      drawContext.beginPath();
      drawContext.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((p) => drawContext.lineTo(p.x, p.y));
      if (stroke.points.length === 1) drawContext.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
      drawContext.stroke();
      drawContext.restore();
    }
    function rebuildDraw() {
      drawContext.clearRect(0, 0, WIDTH, HEIGHT);
      doc.strokes.forEach(drawStroke);
    }
    function maskFor(id) {
      id = +id;
      if (maskCache.has(id)) return maskCache.get(id);
      const mask = makeCanvas(), context = mask.getContext("2d"), image = context.createImageData(WIDTH, HEIGHT);
      for (const index of regionPixels(id)) { image.data[index * 4] = 255; image.data[index * 4 + 1] = 255; image.data[index * 4 + 2] = 255; image.data[index * 4 + 3] = 255; }
      context.putImageData(image, 0, 0);
      maskCache.set(id, mask);
      return mask;
    }
    const boundsFor = (id) => geometry.stats.get(+id);
    // Soft blur without ctx.filter (older iPad Safari lacks it): shrink, then enlarge smoothly.
    function softBlur(source, factor) {
      const small = makeCanvas(Math.ceil(WIDTH / factor), Math.ceil(HEIGHT / factor)), sc = small.getContext("2d");
      sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = "high"; sc.drawImage(source, 0, 0, small.width, small.height);
      const out = makeCanvas(), oc = out.getContext("2d");
      oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = "high"; oc.drawImage(small, 0, 0, WIDTH, HEIGHT);
      return out;
    }
    const starSprite = (() => {
      const sprite = makeCanvas(96, 96), c = sprite.getContext("2d");
      const glow = c.createRadialGradient(48, 48, 0, 48, 48, 30); glow.addColorStop(0, "rgba(255,255,255,1)"); glow.addColorStop(.25, "rgba(255,250,225,.75)"); glow.addColorStop(1, "rgba(255,240,200,0)");
      c.fillStyle = glow; c.fillRect(0, 0, 96, 96);
      c.fillStyle = "white";
      const ray = (angle, length, width) => { c.save(); c.translate(48, 48); c.rotate(angle); c.beginPath(); c.moveTo(-length, 0); c.quadraticCurveTo(0, -width, length, 0); c.quadraticCurveTo(0, width, -length, 0); c.fill(); c.restore(); };
      ray(0, 47, 4.5); ray(Math.PI / 2, 47, 4.5); ray(Math.PI / 4, 24, 3); ray(-Math.PI / 4, 24, 3);
      return sprite;
    })();
    function buildShared() {
      const whole = makeCanvas(), wc = whole.getContext("2d"), image = wc.createImageData(WIDTH, HEIGHT);
      for (let i = 0; i < labels.length; i++) if (labels[i]) image.data[i * 4 + 3] = 255;
      wc.putImageData(image, 0, 0);
      wc.globalCompositeOperation = "source-over"; wc.drawImage(lineImage, 0, 0, WIDTH, HEIGHT);
      // The drawn outlines become the selected polished metal once the piece is made real.
      const gold = makeCanvas(), gc = gold.getContext("2d");
      const metal = gc.createLinearGradient(0, 0, WIDTH * .35, HEIGHT);
      const base = parseHex(METALS[doc.metal].base), dark = mixRgb(base, [25, 18, 18], .62), light = mixRgb(base, WHITE, .72);
      [[dark, 0], [light, .08], [base, .17], [WHITE, .27], [dark, .38], [light, .5], [dark, .62], [WHITE, .74], [base, .86], [light, 1]].forEach(([c, s]) => metal.addColorStop(s, Array.isArray(c) ? `rgb(${c.map(Math.round).join(",")})` : c));
      gc.fillStyle = metal; gc.fillRect(0, 0, WIDTH, HEIGHT);
      gc.globalCompositeOperation = "destination-in"; gc.drawImage(lineImage, 0, 0, WIDTH, HEIGHT);
      const shade = makeCanvas(), shc = shade.getContext("2d");
      shc.drawImage(lineImage, 0, 0, WIDTH, HEIGHT);
      shared = { whole, gold, shade };
    }
    function rebuildFinish() {
      finishContext.clearRect(0, 0, WIDTH, HEIGHT);
      finishCanvas.hidden = !doc.madeReal;
      colorCanvas.style.opacity = doc.madeReal ? "0" : "1";
      drawCanvas.style.opacity = doc.madeReal ? "0" : "1";
      lineCanvas.style.opacity = doc.madeReal ? "0" : "1";
      $("#paper").classList.toggle("real", !!doc.madeReal);
      const button = $("#makeReal");
      button.setAttribute("aria-pressed", String(!!doc.madeReal));
      button.querySelector(".make-real-label").textContent = doc.madeReal ? "Keep colouring" : "Make it real";
      button.querySelector("small").textContent = doc.madeReal ? "Back to flat colours" : "Turn colours into a jewel";
      if (!doc.madeReal) { real = null; return; }
      const velvet = finishContext.createRadialGradient(WIDTH * .5, HEIGHT * .42, 20, WIDTH * .5, HEIGHT * .48, WIDTH * .72);
      velvet.addColorStop(0, "#6e3a5c"); velvet.addColorStop(.55, "#3f1b33"); velvet.addColorStop(1, "#160a14");
      finishContext.fillStyle = velvet; finishContext.fillRect(0, 0, WIDTH, HEIGHT);
      finishContext.save(); finishContext.shadowColor = "rgba(0,0,0,.65)"; finishContext.shadowBlur = 22; finishContext.shadowOffsetY = 14; finishContext.globalAlpha = .85; finishContext.drawImage(shared.whole, 0, 0); finishContext.restore();
      const image = finishContext.getImageData(0, 0, WIDTH, HEIGHT);
      for (const [id, meta] of regionMeta) shadeRegion(image.data, geometry, id, meta.material || "gem", meta.partClass === "METAL" ? METALS[doc.metal].base : doc.fills[id]);
      finishContext.putImageData(image, 0, 0);
      if (doc.strokes.length) { finishContext.save(); finishContext.globalAlpha = .9; finishContext.drawImage(drawCanvas, 0, 0); finishContext.restore(); }
      finishContext.save(); finishContext.globalAlpha = .7; finishContext.drawImage(shared.shade, .8, 1.4); finishContext.restore();
      finishContext.drawImage(shared.gold, 0, 0);
      buildRealEffects(image.data);
    }
    // Glow halo and twinkle stars for the made-real piece, built once per finish.
    function buildRealEffects(data) {
      const bright = makeCanvas(), bc = bright.getContext("2d"), glowImage = bc.createImageData(WIDTH, HEIGHT);
      const stars = [];
      for (const [id, meta] of regionMeta) {
        const material = meta.material || "gem", st = geometry.stats.get(id), list = geometry.pixels.get(id);
        if (!st || !list) continue;
        const glows = material === "gem" || material === "pearl";
        if (glows) for (let k = 0; k < list.length; k++) { const o = list[k] * 4; glowImage.data[o] = Math.min(255, data[o] * 1.25 + 40); glowImage.data[o + 1] = Math.min(255, data[o + 1] * 1.25 + 40); glowImage.data[o + 2] = Math.min(255, data[o + 2] * 1.25 + 40); glowImage.data[o + 3] = 255; }
        const count = material === "gem" ? (st.n > 3500 ? 3 : st.n > 1200 ? 2 : 1) : material === "pearl" ? 1 : st.n > 2000 ? 1 : 0;
        for (let s = 0; s < count; s++) {
          // Twinkles sit on the lit side of the part, inside it, never on the background.
          let best = list[0], bestScore = -1e9;
          for (let tries = 0; tries < 24; tries++) {
            const i = list[Math.floor(hash(id * 31 + s * 97 + tries * 13) * list.length)], x = i % WIDTH, y = (i - x) / WIDTH;
            const score = geometry.dist[i] * .6 - ((x - st.cx) * LIGHT[0] + (y - st.cy) * LIGHT[1]) * -.08 + hash(i) * 2 - (s ? 0 : 0);
            if (score > bestScore) { bestScore = score; best = i; }
          }
          const x = best % WIDTH, y = (best - x) / WIDTH;
          const radius = material === "gem" ? Math.max(9, Math.min(28, Math.sqrt(st.n) * .55)) : material === "pearl" ? Math.max(7, Math.min(16, Math.sqrt(st.n) * .4)) : 12;
          stars.push({ x, y, r: radius, phase: hash(id * 3 + s) * Math.PI * 2, speed: 650 + hash(id + s * 5) * 700 });
        }
      }
      bc.putImageData(glowImage, 0, 0);
      const halo = makeCanvas(), hc = halo.getContext("2d");
      hc.globalCompositeOperation = "lighter";
      hc.drawImage(softBlur(bright, 10), 0, 0); hc.drawImage(softBlur(bright, 22), 0, 0); hc.drawImage(softBlur(bright, 22), 0, 0);
      // The halo surrounds each stone; it must not wash the stone itself out to white.
      hc.globalCompositeOperation = "destination-out"; hc.drawImage(bright, 0, 0);
      real = { halo, stars: stars.slice(0, 70) };
    }
    function star(context, x, y, radius, alpha) {
      if (radius < .5 || alpha <= 0) return;
      context.globalAlpha = Math.min(1, alpha);
      context.drawImage(starSprite, x - radius, y - radius, radius * 2, radius * 2);
    }
    function effectAssets(id, spec) {
      const key = `${id}|${spec.type}|${spec.color}|${spec.intensity}`;
      if (effectCache.has(key)) return effectCache.get(key);
      const st = boundsFor(id), list = regionPixels(id), mask = maskFor(id), intensity = spec.intensity || 2, assets = { st, mask };
      if (spec.type === "glow") {
        const tint = makeCanvas(), tc = tint.getContext("2d");
        tc.fillStyle = spec.color || "#ffd43b"; tc.fillRect(st.left - 2, st.top - 2, st.right - st.left + 4, st.bottom - st.top + 4);
        tc.globalCompositeOperation = "destination-in"; tc.drawImage(mask, 0, 0);
        // Owner, 2026-10-19: "the glow effect is not good enough ... no need to go subtle."
        // The light spreads well past the part: enlarged copies of it, blurred wide.
        // Dilate by a fixed reach (not a scale), so a big drop and a small bead both get a
        // bold ring of light that does not swallow the rest of the piece.
        const spread = makeCanvas(), sc = spread.getContext("2d"), reach = 10 + intensity * 7;
        for (const [radius, alpha] of [[reach, .45], [reach * .55, .8]]) for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; sc.globalAlpha = alpha; sc.drawImage(tint, Math.cos(a) * radius, Math.sin(a) * radius); }
        sc.globalAlpha = 1; sc.drawImage(tint, 0, 0);
        const halo = makeCanvas(), hc = halo.getContext("2d");
        hc.globalCompositeOperation = "lighter";
        [6, 12, 20].forEach((factor) => hc.drawImage(softBlur(spread, factor), 0, 0));
        hc.globalAlpha = .4; hc.drawImage(tint, 0, 0);
        assets.halo = halo;
      } else if (spec.type === "sparkle" || spec.type === "glitter") {
        const count = spec.type === "sparkle" ? 2 + intensity * 2 : 30 + intensity * 40;
        assets.points = Array.from({ length: Math.min(count, list.length) }, (_, n) => { const i = list[Math.floor(hash(id * 911 + n * 37) * list.length)]; return { x: i % WIDTH, y: Math.floor(i / WIDTH), phase: hash(n + id) * 6.283, speed: 500 + hash(n * 3 + id) * 600 }; });
      } else {
        const w = st.right - st.left + 1, h = st.bottom - st.top + 1;
        assets.scratch = makeCanvas(w, h);
      }
      effectCache.set(key, assets);
      return assets;
    }
    function rebuildEffects(tick = 0) {
      effectContext.clearRect(0, 0, WIDTH, HEIGHT);
      effectContext.save();
      if (doc.madeReal && real) {
        effectContext.globalCompositeOperation = "lighter";
        effectContext.globalAlpha = .62 + .33 * Math.sin(tick / 520);
        effectContext.drawImage(real.halo, 0, 0);
        for (const s of real.stars) { const pulse = Math.max(0, Math.sin(tick / s.speed * 2 + s.phase)); star(effectContext, s.x, s.y, s.r * (.35 + pulse * pulse * 1.1), .25 + pulse); }
        const since = revealStart < 0 ? 1e9 : tick - revealStart;
        if (since >= 0 && since < 1600) {
          // Celebratory reveal: one bright shimmer sweeps across the piece and a burst of stars.
          const p = since / 1600, band = makeCanvas(), bc = band.getContext("2d");
          const xPos = -WIDTH * .3 + p * WIDTH * 1.6;
          const g = bc.createLinearGradient(xPos - 160, 0, xPos + 160, HEIGHT * .25);
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
          bc.fillStyle = g; bc.fillRect(0, 0, WIDTH, HEIGHT);
          bc.globalCompositeOperation = "destination-in"; bc.drawImage(shared.whole, 0, 0);
          effectContext.globalAlpha = 1; effectContext.drawImage(band, 0, 0);
          real.stars.forEach((s, n) => { const local = clamp01(p * 1.6 - (n % 9) * .07); const burst = Math.sin(local * Math.PI); star(effectContext, s.x, s.y, s.r * 2.6 * burst, burst); });
        }
      }
      effectContext.restore();
      for (const [id, spec] of Object.entries(doc.effects)) {
        if (!geometry.stats.has(+id)) continue;
        const intensity = spec.intensity || 2, assets = effectAssets(+id, spec), st = assets.st;
        effectContext.save();
        if (spec.type === "glow") {
          effectContext.globalCompositeOperation = doc.madeReal ? "lighter" : "source-over";
          effectContext.globalAlpha = .7 + .3 * Math.sin(tick / 450 + +id);
          effectContext.drawImage(assets.halo, 0, 0);
        } else if (spec.type === "sparkle") {
          assets.points.forEach((p) => { const pulse = Math.max(0, Math.sin(tick / p.speed * 2 + p.phase)); star(effectContext, p.x, p.y, (9 + intensity * 6) * (.3 + pulse * pulse), .35 + pulse); });
        } else if (spec.type === "glitter") {
          effectContext.globalCompositeOperation = doc.madeReal ? "lighter" : "source-over";
          assets.points.forEach((p, n) => { const pulse = .5 + .5 * Math.sin(tick / (p.speed * .5) + p.phase); effectContext.globalAlpha = .25 + .75 * pulse; effectContext.fillStyle = n % 3 ? "#fff6c4" : n % 2 ? "#ffffff" : "#ffd6f2"; const s = 1.5 + (n % 3) + pulse * 1.5; effectContext.fillRect(p.x - s / 2, p.y - s / 2, s, s); });
        } else {
          // Shine: a bright glossy streak that sweeps across the part every few seconds.
          const c = assets.scratch.getContext("2d"), w = assets.scratch.width, h = assets.scratch.height;
          const p = ((tick / 2600 + (+id % 7) * .13) % 1) * 1.8 - .4;
          c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, w, h);
          const g = c.createLinearGradient(0, h, w, 0);
          const at = (v) => Math.max(0, Math.min(1, v));
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(at(p - .14), "rgba(255,255,255,0)"); g.addColorStop(at(p), `rgba(255,255,255,${.55 + intensity * .15})`); g.addColorStop(at(p + .1), "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = g; c.fillRect(0, 0, w, h);
          c.fillStyle = `rgba(255,255,255,${.12 + intensity * .06})`; c.fillRect(0, 0, w, h * .45);
          c.globalCompositeOperation = "destination-in"; c.drawImage(assets.mask, st.left, st.top, w, h, 0, 0, w, h);
          effectContext.drawImage(assets.scratch, st.left, st.top);
        }
        effectContext.restore();
      }
    }
    function needsAnimation() { return !!doc && (doc.madeReal || Object.keys(doc.effects).length > 0); }
    function renderAll() { rebuildColor(); rebuildDraw(); rebuildFinish(); rebuildEffects(performance.now()); animate(); }
    function animate() {
      if (raf || document.hidden || !needsAnimation() || !$("#editor").classList.contains("active")) return;
      if (reducedMotion) { rebuildEffects(800); return; }
      const frame = (tick) => {
        if (document.hidden || !needsAnimation() || !$("#editor").classList.contains("active")) { raf = 0; effectContext.clearRect(0, 0, WIDTH, HEIGHT); return; }
        if (tick - lastFrame > 30) { lastFrame = tick; rebuildEffects(tick); }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }
    function loadManifest() {
      manifestPromise = manifestPromise || fetch(`design/coloring-studio/raster/manifest.json?v=${ASSET_VERSION}`).then((response) => response.json());
      return manifestPromise;
    }
    async function open(nextDoc) {
      doc = JSON.parse(JSON.stringify(nextDoc));
      if (doc.version < VERSION) doc.version = VERSION;
      doc.metal = METALS[doc.metal] ? doc.metal : "gold";
      doc.madeReal = !!doc.madeReal;
      template = TEMPLATES.find((candidate) => candidate.id === doc.templateId);
      history = []; future = []; maskCache.clear(); effectCache.clear(); real = null; revealStart = -1;
      $("#designTitle").textContent = template.title;
      $("#categoryLabel").textContent = `${template.category} · ${template.regionCount} fillable regions`;
      show("editor");
      $("#message").textContent = "Loading sealed region map…";
      const [line, regionImage, manifest] = await Promise.all([loadImage(template.line), loadImage(template.regionMap), loadManifest()]);
      lineImage = line;
      lineContext.clearRect(0, 0, WIDTH, HEIGHT); lineContext.drawImage(lineImage, 0, 0, WIDTH, HEIGHT);
      const scratch = makeCanvas(), scratchContext = scratch.getContext("2d", { willReadFrequently: true }); scratchContext.drawImage(regionImage, 0, 0);
      labels = decodeRegionMap(scratchContext.getImageData(0, 0, WIDTH, HEIGHT).data);
      geometry = buildGeometry(labels);
      // Every part must be explicitly classified by the checked design manifest. If the PNG
      // ever holds an id the manifest lacks, the part degrades to a colourable stone instead
      // of an undefined meta that throws inside rebuildFinish.
      const tagged = new Map(manifest.designs.find((design) => design.id === template.id).regions.map((region) => [region.id, region]));
      const unlisted = [];
      regionMeta = new Map([...geometry.stats.keys()].sort((a, b) => a - b).map((id) => {
        const region = tagged.get(id);
        if (region) return [id, region];
        unlisted.push(id);
        return [id, { id, material: "gem", partClass: "STONE" }];
      }));
      if (unlisted.length) console.warn(`${template.id}: ${unlisted.length} region(s) missing from manifest.json render as colourable stones`, unlisted);
      // v1–v3 fills on METAL parts are ignored by both views and can never be erased, so they
      // are dropped here rather than left stranded in doc.fills forever.
      for (const id of Object.keys(doc.fills)) if (regionMeta.get(+id)?.partClass === "METAL") delete doc.fills[id];
      buildShared();
      updateMetalPicker();
      renderAll(); updateHistory();
      $("#message").textContent = "Tap a bounded jewelry detail to fill it.";
    }
    function applyRegion(id) {
      if (!id) { $("#message").textContent = "That is background — zoom in and tap a jewelry detail."; return; }
      if (regionMeta.get(+id)?.partClass === "METAL" && !effect) {
        tapFeedback(420);
        $("#message").textContent = "Metal parts follow the metal picker. Choose Gold, Silver, Platinum or Rose gold below.";
        return;
      }
      snapshot();
      if (effect) doc.effects[id] = { type: effect, intensity: +$("#intensity").value, color };
      else if (tool === "eraser") { delete doc.fills[id]; delete doc.effects[id]; }
      else doc.fills[id] = tool === "gradient" ? `gradient:${color}:#fff2a8` : color;
      renderAll();
    }
    lineCanvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (!labels) return;
      if (tool === "brush" || tool === "eraser" && !effect) {
        snapshot(); drawing = true; activeStroke = { color, size, eraser: tool === "eraser", points: [point(event)] }; doc.strokes.push(activeStroke); lineCanvas.setPointerCapture?.(event.pointerId); rebuildDraw();
      } else applyRegion(regionAt(event));
    });
    lineCanvas.addEventListener("pointermove", (event) => { if (!drawing || !activeStroke) return; event.preventDefault(); activeStroke.points.push(point(event)); rebuildDraw(); });
    ["pointerup", "pointercancel"].forEach((name) => lineCanvas.addEventListener(name, () => { if (drawing && doc.madeReal) rebuildFinish(); drawing = false; activeStroke = null; }));
    function card(template, savedDoc, showCategory) {
      const button = document.createElement("button"); button.className = "design-card"; button.type = "button";
      const image = document.createElement("img"); image.src = template.line; image.alt = `${template.title} blank line art`;
      const strong = document.createElement("b"); strong.textContent = template.title;
      const small = document.createElement("small"); small.textContent = savedDoc ? `Saved ${new Date(savedDoc.updatedAt).toLocaleDateString()}` : `${showCategory ? template.category + " · " : ""}${template.regionCount} parts to colour`;
      button.append(image, strong, small); button.onclick = () => open(savedDoc || blankDoc(template.id)); return button;
    }
    function gallery() {
      const nav = $("#categories"); nav.replaceChildren();
      [ALL, ...CATEGORIES].forEach((name) => {
        const count = name === ALL ? TEMPLATES.length : TEMPLATES.filter((candidate) => candidate.category === name).length;
        const button = document.createElement("button"); button.type = "button"; button.dataset.category = name;
        button.innerHTML = `${name} <span class="count">${count}</span>`;
        button.classList.toggle("selected", name === category); button.setAttribute("aria-pressed", String(name === category));
        button.onclick = () => { category = name; gallery(); };
        nav.append(button);
      });
      const grid = $("#designGrid"); grid.replaceChildren();
      const list = TEMPLATES.filter((candidate) => category === ALL || candidate.category === category);
      list.forEach((candidate) => grid.append(card(candidate, null, category === ALL)));
      // There is one design per category so far; say so plainly instead of looking broken.
      const note = document.createElement("div"); note.className = "coming-soon";
      note.innerHTML = category === ALL
        ? `<b>40 designs to try</b><span>Eight necklaces, bracelets, rings, earring pairs and hair ornaments.</span>`
        : `<b>More ${category.toLowerCase()} are being drawn</b><span>This is the only ${category === "Earrings" ? "earring design" : category === "Hair ornaments" ? "hair ornament" : "necklace"} so far. Tap “${ALL}” to see every design.</span>`;
      grid.append(note);
    }
    function saved() {
      const docs = loadDocs(localStorage), grid = $("#savedGrid"); grid.replaceChildren(); $("#savedEmpty").hidden = !!docs.length;
      docs.forEach((savedDoc) => grid.append(card(TEMPLATES.find((candidate) => candidate.id === savedDoc.templateId), savedDoc))); $("#saveCount").textContent = docs.length;
    }
    function selectTool(next) {
      tool = next; effect = null;
      $$('[data-tool]').forEach((button) => button.classList.toggle("selected", button.dataset.tool === tool));
      $$("#effects button").forEach((button) => button.classList.remove("selected"));
      $("#message").textContent = next === "brush" ? "Draw beneath the crisp black line layer." : next === "gradient" ? "Tap one detail for a two-colour blend." : next === "eraser" ? "Tap a filled detail, or draw to erase brush marks." : "Tap a bounded jewelry detail to fill it.";
    }
    function updateHistory() { $("#undo").disabled = !history.length; $("#redo").disabled = !future.length; }
    $$('[data-tool]').forEach((button) => button.onclick = () => selectTool(button.dataset.tool));
    function updateMetalPicker() {
      // With no design open there is no chosen metal, so nothing is checked; the first radio
      // stays tabbable so the group remains reachable by keyboard.
      const buttons = $$(".metal-choice");
      const checked = buttons.findIndex((button) => button.dataset.metal === doc?.metal);
      buttons.forEach((button, index) => {
        const selected = index === checked;
        button.classList.toggle("selected", selected); button.setAttribute("aria-checked", String(selected));
        button.tabIndex = selected || (checked < 0 && index === 0) ? 0 : -1;
      });
    }
    const metalButtons = [];
    Object.entries(METALS).forEach(([key, spec]) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "metal-choice"; button.dataset.metal = key; button.setAttribute("role", "radio"); button.setAttribute("aria-label", spec.label); button.style.setProperty("--metal-gradient", spec.gradient); button.textContent = spec.label;
      button.onclick = () => {
        if (!doc) return;
        snapshot(); doc.metal = key; buildShared(); renderAll(); updateMetalPicker(); tapFeedback(600);
        button.classList.remove("tap-feedback"); void button.offsetWidth; button.classList.add("tap-feedback");
        $("#message").textContent = `${spec.label} selected. Every metal part changed; your stone colours stayed the same.`;
      };
      metalButtons.push(button);
      $("#metals").append(button);
    });
    // Radiogroup keys: arrows move (and apply) the choice; only one tab stop for the group.
    metalButtons.forEach((button, index) => button.addEventListener("keydown", (event) => {
      const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
      if (!step) return;
      event.preventDefault();
      const next = metalButtons[(index + step + metalButtons.length) % metalButtons.length];
      next.click(); next.focus();
    }));
    updateMetalPicker();
    PALETTE.forEach((paint, index) => { const button = document.createElement("button"); button.className = "swatch" + (paint === color ? " selected" : ""); button.style.setProperty("--c", paint); button.setAttribute("aria-label", `Colour ${index + 1}`); button.onclick = () => { color = paint; selectTool("fill"); $$(".swatch").forEach((candidate) => candidate.classList.toggle("selected", candidate === button)); }; $("#palette").append(button); });
    const effectIcons = {
      sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.8 5.8 3.2 8.2 9 9-5.8.8-8.2 3.2-9 9-.8-5.8-3.2-8.2-9-9 5.8-.8 8.2-3.2 9-9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
      glitter: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="2" fill="currentColor"/><circle cx="17" cy="6" r="1.5" fill="currentColor"/><circle cx="12" cy="13" r="2.2" fill="currentColor"/><circle cx="6" cy="18" r="1.4" fill="currentColor"/><circle cx="18" cy="18" r="2" fill="currentColor"/></svg>',
      glow: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      shine: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 16c2-5 5-8 10-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
    ["sparkle", "glitter", "glow", "shine"].forEach((name) => { const button = document.createElement("button"); button.innerHTML = `${effectIcons[name]}<span>${name[0].toUpperCase() + name.slice(1)}</span>`; button.onclick = () => { effect = name; tool = "effect"; $$('[data-tool]').forEach((candidate) => candidate.classList.remove("selected")); $$("#effects button").forEach((candidate) => candidate.classList.toggle("selected", candidate === button)); $("#message").textContent = `Tap jewelry details to add ${name}.`; }; $("#effects").append(button); });
    $("#clearEffect").onclick = () => selectTool("eraser");
    $("#makeReal").onclick = () => {
      snapshot(); doc.madeReal = !doc.madeReal;
      revealStart = doc.madeReal ? performance.now() : -1;
      renderAll();
      const stack = $("#canvasStack"); stack.classList.remove("revealing");
      if (doc.madeReal && !reducedMotion) { void stack.offsetWidth; stack.classList.add("revealing"); }
      $("#message").textContent = doc.madeReal ? "Ta-da! Your colours are now a real jewel. Add extra magic, or go back to keep colouring." : "Colouring view is back. Your colours are still editable.";
    };
    $("#canvasStack").addEventListener("animationend", (event) => event.currentTarget.classList.remove("revealing"));
    $("#customColor").oninput = (event) => { color = event.target.value; selectTool("fill"); };
    $$('[data-size]').forEach((button) => button.onclick = () => { size = +button.dataset.size; $$('[data-size]').forEach((candidate) => candidate.classList.toggle("selected", candidate === button)); });
    // Restoring doc.metal must also rebuild the metal-tinted shared canvases and the picker
    // ring, or the canvas and the radio disagree after undoing a metal change.
    $("#undo").onclick = () => { if (!history.length) return; future.push(JSON.stringify(doc)); doc = JSON.parse(history.pop()); buildShared(); renderAll(); updateMetalPicker(); updateHistory(); };
    $("#redo").onclick = () => { if (!future.length) return; history.push(JSON.stringify(doc)); doc = JSON.parse(future.pop()); buildShared(); renderAll(); updateMetalPicker(); updateHistory(); };
    $("#zoom").oninput = (event) => $("#canvasStack").style.width = `${event.target.value}%`;
    $("#zoomIn").onclick = () => { $("#zoom").value = Math.min(220, +$("#zoom").value + 10); $("#zoom").oninput({ target: $("#zoom") }); };
    $("#zoomOut").onclick = () => { $("#zoom").value = Math.max(70, +$("#zoom").value - 10); $("#zoom").oninput({ target: $("#zoom") }); };
    $("#save").onclick = () => { saveDoc(localStorage, doc); saved(); $("#message").textContent = "Saved — reopen it from My Designs to keep coloring."; };
    $("#choose").onclick = $("#back").onclick = () => { gallery(); show("gallery"); };
    $("#myDesigns").onclick = () => { saved(); show("saved"); };
    document.addEventListener("visibilitychange", () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else animate(); });
    gallery(); saved(); show("gallery"); legacySummary(localStorage);
  }
  return { VERSION, SAVE_KEY, LEGACY_KEY, TEMPLATES, CATEGORIES, PALETTE, METALS, UNFILLED, blankDoc, validDoc, loadDocs, saveDoc, legacySummary, decodeRegionMap, pixelsForRegion, paintFlatColors, nearestRegion, metalFamily, buildGeometry, shadeRegion, mount };
});
