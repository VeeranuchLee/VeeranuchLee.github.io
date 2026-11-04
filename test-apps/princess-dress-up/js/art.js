// The doll compositor (PLAN.md 5.2 and 6.2).
//
// Every picture is a layer {z, src, x, y, w, h} in the 1200 x 1800 rig frame. Layers are
// drawn back to front in data.zOrder. A layer with `tint` is repainted by a gradient map;
// with `mask`, only the masked (fabric) pixels are repainted and patterned, so trims and
// gems keep their colours. Repainted bitmaps live in a least-recently-used cache capped
// at about 32 entries, so recent colour taps are instant and memory stays bounded.
import { buildLut, patternInk, hexToRgb } from './colour.js';

const images = new Map(); // src -> HTMLImageElement (decoded)

export function allSources(data) {
  const set = new Set();
  const add = (L) => {
    set.add(L.src);
    if (L.mask && (typeof L.mask === 'string' || L.mask.src)) set.add(typeof L.mask === 'string' ? L.mask : L.mask.src);
  };
  data.rig.base.forEach(add);
  if (data.rig.basePlate) set.add(data.rig.basePlate.src);
  data.dolls.forEach((d) => d.layers.forEach(add));
  data.items.forEach((it) => it.layers.forEach(add));
  return [...set];
}

let basePlate = null; // the registered plate every derived layer is compared against

export async function preload(data) {
  basePlate = data.rig.basePlate || null;
  const srcs = allSources(data);
  await Promise.all(srcs.map((src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { images.set(src, img); resolve(); };
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  })));
}

class Lru {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(k) {
    const v = this.map.get(k);
    if (v !== undefined) { this.map.delete(k); this.map.set(k, v); }
    return v;
  }
  set(k, v) {
    this.map.set(k, v);
    while (this.map.size > this.cap) {
      const first = this.map.keys().next().value;
      const c = this.map.get(first);
      this.map.delete(first);
      if (c && c.width) { c.width = 0; c.height = 0; } // release the bitmap memory now
    }
  }
}

const rawCache = new Lru(160);   // plain layers at a scale (small: placeholder vectors)
const tintCache = new Lru(32);   // gradient-mapped layers: the PLAN's ~32-bitmap cap
const thumbTint = new Lru(48);   // tile-sized repaints, kept apart so tiles never evict the doll
const lutCache = new Map();

export const stats = { tintMisses: 0 };

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function q(s) { return Math.round(s * 1000) / 1000; }

function raw(src, box, s) {
  const key = `${src}@${q(s)}`;
  let c = rawCache.get(key);
  if (c) return c;
  const img = images.get(src);
  c = makeCanvas(box.w * s, box.h * s);
  if (img) c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  rawCache.set(key, c);
  return c;
}

function lut(hex) {
  let l = lutCache.get(hex);
  if (!l) { l = buildLut(hex); lutCache.set(hex, l); }
  return l;
}


// ---------- layers derived from registered whole figures (PLAN.md 5.2) ----------
// The Codex pilot draws every item as a whole figure, a reference edit of the base
// plate. A layer marked derive: "changed" keeps only the pixels that differ from
// rig.basePlate (a crown, earrings, a locket). Registration is measured, not assumed:
// the pilot's faces differ from the base by about 9 (sum of |dRGBA|) against a cut-off
// of 72, and one-pixel resampling edges are removed by the neighbour rule.
const T_CHANGED = 72;
const T_PATCH = 36;
const patchCache = new Lru(12);

function regionCanvas(src, box, region, s) {
  const c = makeCanvas(region.w * s, region.h * s);
  const img = images.get(src);
  if (img) c.getContext('2d').drawImage(img, (box.x - region.x) * s, (box.y - region.y) * s, box.w * s, box.h * s);
  return c;
}
const pixels = (c) => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
// premultiplied, so the colour hidden under a transparent pixel never counts
const dist = (a, b, i) => {
  const ka = a[i + 3] / 255, kb = b[i + 3] / 255;
  return Math.abs(a[i] * ka - b[i] * kb) + Math.abs(a[i + 1] * ka - b[i + 1] * kb) + Math.abs(a[i + 2] * ka - b[i + 2] * kb) + Math.abs(a[i + 3] - b[i + 3]);
};
// the smallest distance from a[i] to b at the same place or one pixel away: two renders
// resampled from different source sizes disagree by a pixel along every outline
function near(a, b, p, w, h) {
  const x = p % w, y = (p / w) | 0;
  let best = 1e9;
  for (let dy = -1; dy <= 1; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= h) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= w) continue;
      const j = (yy * w + xx) * 4, ka = a[p * 4 + 3] / 255, kb = b[j + 3] / 255;
      const d = Math.abs(a[p * 4] * ka - b[j] * kb) + Math.abs(a[p * 4 + 1] * ka - b[j + 1] * kb) + Math.abs(a[p * 4 + 2] * ka - b[j + 2] * kb) + Math.abs(a[p * 4 + 3] - b[j + 3]);
      if (d < best) { best = d; if (best <= 12) return best; }
    }
  }
  return best;
}
// the slip and the skin: what a doll's own figure must never paint over an outfit
const slipOrSkin = (d, i) => {
  if (d[i + 3] < 200) return false;
  const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (mx - mn <= 14 && lum > 0.6) return true;                       // white slip and its grey shading
  return r > g && g > b && r - b > 30 && r - b < 110 && lum > 0.62;  // light warm skin
};

// drop pixels with fewer than `min` kept neighbours: resampling edges are one pixel wide
function despeckle(keep, w, h, min = 3) {
  const out = new Uint8Array(keep.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!keep[i]) continue;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && keep[yy * w + xx]) n++;
    }
    if (n >= min) out[i] = 1;
  }
  return out;
}

function changedLayer(L, s) {
  const key = `chg:${L.src}@${q(s)}|${L.region ? JSON.stringify(L.region) : ''}`;
  let c = rawCache.get(key);
  if (c) return c;
  c = regionCanvas(L.src, L, L, s);
  if (basePlate) {
    const b = pixels(regionCanvas(basePlate.src, basePlate, L, s)).data;
    const img = pixels(c), d = img.data;
    const keep = new Uint8Array(c.width * c.height);
    // only inside the accessory's region: renders also redraw fingers and nudge edges
    const R = L.region || L;
    const rx0 = (R.x - L.x) * s, ry0 = (R.y - L.y) * s, rx1 = rx0 + R.w * s, ry1 = ry0 + R.h * s;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const x = p % c.width, y = (p / c.width) | 0;
      keep[p] = x >= rx0 && x < rx1 && y >= ry0 && y < ry1 && d[i + 3] > 0 && dist(d, b, i) > T_CHANGED && near(d, b, p, c.width, c.height) > T_CHANGED ? 1 : 0;
    }
    const k = despeckle(keep, c.width, c.height);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) if (!k[p]) d[i + 3] = 0;
    c.getContext('2d').putImageData(img, 0, 0);
  }
  rawCache.set(key, c);
  return c;
}

// A doll's own head and hair (layer L, a whole figure in the slip) over an outfit that
// was drawn on the base doll: wherever the outfit left the base's pixels untouched and
// the doll differs from the base, the doll's pixel wins (or the base's hair is erased).
// Where the outfit changed a pixel, the garment stays on top. Returns {erase, paint}.
function patchLayer(L, outfit, s) {
  const key = `patch:${L.src}|${outfit ? outfit.src : '-'}@${q(s)}|${L.region ? JSON.stringify(L.region) : ''}`;
  let r = patchCache.get(key);
  if (r) return r;
  const M = pixels(regionCanvas(L.src, L, L, s));
  const B = basePlate ? pixels(regionCanvas(basePlate.src, basePlate, L, s)).data : new Uint8ClampedArray(M.data.length);
  const O = outfit ? pixels(regionCanvas(outfit.src, outfit, L, s)).data : B;
  const m = M.data, w = M.width, h = M.height;
  const take = new Uint8Array(w * h);
  // below the chin a doll's own figure may only bring her hair: never her slip, its
  // outline or her skin, whose edges sit a pixel or two off the base's
  const chin = ((L.chinY ?? 400) - L.y) * s;
  const own = (i, p) => {
    if (((p / w) | 0) < chin || m[i + 3] < 40) return true;
    if (slipOrSkin(m, i)) return false;
    return Math.max(m[i], m[i + 1], m[i + 2]) - Math.min(m[i], m[i + 1], m[i + 2]) > 16;
  };
  const free = new Uint8Array(w * h);               // the outfit left the base untouched here
  const R = L.region || L;
  const rx0 = (R.x - L.x) * s, ry0 = (R.y - L.y) * s, rx1 = rx0 + R.w * s, ry1 = ry0 + R.h * s;
  for (let i = 0, p = 0; i < m.length; i += 4, p++) {
    const x = p % w, y = (p / w) | 0;
    if (x < rx0 || x >= rx1 || y < ry0 || y >= ry1) continue;
    if (dist(O, B, i) > T_CHANGED && near(O, B, p, w, h) > T_CHANGED) continue; // the outfit covers this pixel
    if (!own(i, p)) continue;
    free[p] = 1;
    if (dist(m, B, i) > T_PATCH && near(m, B, p, w, h) > T_PATCH) take[p] = 1; // her hair and face
  }
  // grow by three pixels so the base's soft hair edges go too, never into the garment
  let k = despeckle(take, w, h, 2);
  for (let pass = 0; pass < 3; pass++) {
    const g = new Uint8Array(k);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (k[i] || !free[i]) continue;
      if (k[i - 1] || k[i + 1] || k[i - w] || k[i + w]) g[i] = 1;
    }
    k = g;
  }
  const erase = makeCanvas(w, h), paint = makeCanvas(w, h);
  const E = erase.getContext('2d').createImageData(w, h), P = paint.getContext('2d').createImageData(w, h);
  for (let i = 0, p = 0; i < m.length; i += 4, p++) {
    if (!k[p]) continue;
    E.data[i + 3] = 255;
    P.data[i] = m[i]; P.data[i + 1] = m[i + 1]; P.data[i + 2] = m[i + 2]; P.data[i + 3] = m[i + 3];
  }
  erase.getContext('2d').putImageData(E, 0, 0);
  paint.getContext('2d').putImageData(P, 0, 0);
  r = { erase, paint, width: w, height: h };
  patchCache.set(key, r);
  return r;
}

// The fabric of a whole-figure outfit: white and soft-grey pixels below minY (so eyes and
// face are never repainted). Interim until hand-tagged masks exist (PLAN.md 4.3): white
// pearls and silver trim on a white gown are repainted with the fabric.
function autoMaskAlpha(r, g, b, rigY, spec) {
  if (rigY < (spec.minY || 0)) return 0;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), chroma = mx - mn;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum < 0.35) return 0;
  // warm pale skin highlights have a chroma of 25-45; white fabric shading stays under ~12
  if (chroma <= 10) return 1;
  if (chroma >= 24) return 0;
  return (24 - chroma) / 14;
}

// ---------- patterns ----------
function seeded(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; };
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
}
function heartPath(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.9);
  ctx.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.3, cx, cy - r * 0.45);
  ctx.bezierCurveTo(cx + r * 0.7, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r * 0.9);
  ctx.closePath();
}

// Draws pattern marks (alpha only matters) over a w x h area. `unit` is the rig-pixel
// size of one motif cell, scaled by s, and (ox, oy) is the area's rig-frame origin so
// the pattern lines up across the whole doll rather than restarting per layer.
export function drawPattern(ctx, pattern, w, h, s, ox = 0, oy = 0) {
  if (!pattern || pattern === 'none') return;
  const unit = (pattern === 'glitter' ? 34 : pattern === 'dots' ? 54 : 84) * s;
  ctx.save();
  ctx.fillStyle = '#000';
  const x0 = -((ox * s) % unit) - unit, y0 = -((oy * s) % unit) - unit;
  const rnd = seeded(97);
  let row = 0;
  for (let y = y0; y < h + unit; y += unit, row++) {
    for (let x = x0 + (row % 2 ? unit / 2 : 0); x < w + unit; x += unit) {
      if (pattern === 'stars') { starPath(ctx, x, y, unit * 0.24); ctx.fill(); }
      else if (pattern === 'hearts') { heartPath(ctx, x, y, unit * 0.2); ctx.fill(); }
      else if (pattern === 'dots') { ctx.beginPath(); ctx.arc(x, y, unit * 0.17, 0, Math.PI * 2); ctx.fill(); }
      else if (pattern === 'flowers') {
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * unit * 0.12, y + Math.sin(a) * unit * 0.12, unit * 0.09, 0, Math.PI * 2); ctx.fill();
        }
      } else if (pattern === 'glitter') {
        const jx = (rnd() - 0.5) * unit, jy = (rnd() - 0.5) * unit, r = unit * (0.06 + rnd() * 0.12);
        ctx.globalAlpha = 0.45 + rnd() * 0.55;
        if (rnd() > 0.7) { starPath(ctx, x + jx, y + jy, r * 2.2); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(x + jx, y + jy, r, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();
}

// ---------- gradient-mapped layers ----------
function tinted(L, s, hex, pattern, cache) {
  const maskSrc = L.mask ? (typeof L.mask === 'string' ? L.mask : L.mask.src || null) : null;
  const key = `${L.src}@${q(s)}|${hex}|${pattern || 'none'}`;
  let c = cache.get(key);
  if (c) return c;
  stats.tintMisses++;
  const src = raw(L.src, L, s);
  c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const px = img.data;
  let mask = null;
  const auto = L.mask && typeof L.mask === 'object' && L.mask.auto ? L.mask : null;
  if (maskSrc && !auto) {
    const mb = typeof L.mask === 'string' ? L : L.mask;
    const m = makeCanvas(c.width, c.height);
    const mctx = m.getContext('2d', { willReadFrequently: true });
    const mimg = images.get(maskSrc);
    if (mimg) mctx.drawImage(mimg, (mb.x - L.x) * s, (mb.y - L.y) * s, mb.w * s, mb.h * s);
    mask = mctx.getImageData(0, 0, c.width, c.height).data;
  }
  let pat = null, ink = null;
  if (pattern && pattern !== 'none') {
    const p = makeCanvas(c.width, c.height);
    const pctx = p.getContext('2d', { willReadFrequently: true });
    drawPattern(pctx, pattern, c.width, c.height, s, L.x, L.y);
    pat = pctx.getImageData(0, 0, c.width, c.height).data;
    ink = patternInk(hex, pattern);
  }
  const table = lut(hex);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const m = auto ? autoMaskAlpha(r, g, b, L.y + Math.floor(i / 4 / c.width) / s, auto) : mask ? mask[i + 3] / 255 : 1;
    if (m === 0) continue;
    const li = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    let nr = table[li * 3], ng = table[li * 3 + 1], nb = table[li * 3 + 2];
    if (pat && pat[i + 3]) {
      // the pattern follows the fabric's shading: darker in folds, bright on the shine
      const shadeK = Math.min(1.08, 0.5 + 0.58 * (li / 255));
      const a = (pat[i + 3] / 255) * 0.92;
      nr += (ink[0] * shadeK - nr) * a; ng += (ink[1] * shadeK - ng) * a; nb += (ink[2] * shadeK - nb) * a;
    }
    px[i] = r + (nr - r) * m; px[i + 1] = g + (ng - g) * m; px[i + 2] = b + (nb - b) * m;
  }
  ctx.putImageData(img, 0, 0);
  cache.set(key, c);
  return c;
}

// ---------- resolving a look into layers ----------
export function layersFor(data, look, { stage = true } = {}) {
  const byId = new Map(data.items.map((it) => [it.id, it]));
  const doll = data.dolls.find((d) => d.id === look.doll) || data.dolls[0];
  const pal = data.palettes;
  const out = [];
  const push = (L, colour, pattern) => out.push({ L, colour, pattern });
  if (stage && look.stage && byId.has(look.stage)) byId.get(look.stage).layers.forEach((L) => push(L));
  if (look.wings && byId.has(look.wings.id)) byId.get(look.wings.id).layers.forEach((L) => push(L, pal.dress[look.wings.shade] || pal.dress[0]));
  doll.layers.forEach((L) => push(L, L.tint === 'hair' ? pal.hair[look.hairShade] || pal.hair[0] : null));
  data.rig.base.forEach((L) => push(L));
  const dress = byId.get(look.dress.id);
  if (dress) dress.layers.forEach((L) => push(L, L.tint ? pal.dress[look.dress.shade] || pal.dress[0] : null, look.dress.pattern));
  for (const slot of ['crown', 'earrings', 'necklace']) if (look[slot] && byId.has(look[slot])) byId.get(look[slot]).layers.forEach((L) => push(L));
  const outfit = dress ? dress.layers.find((L) => L.z === 'plate') || null : null;
  for (const e of out) if (e.L.derive === 'patch') e.outfit = outfit;
  const order = data.zOrder;
  // stable sort keeps the data's own order inside one z (body before dress)
  return out.map((e, i) => ({ e, i })).sort((a, b) => (order.indexOf(a.e.L.z) - order.indexOf(b.e.L.z)) || (a.i - b.i)).map((x) => x.e);
}

// Draws the look into ctx with the rig frame mapped by (ox, oy, s): rig (x, y) lands on
// canvas (ox + x*s, oy + y*s). With thumb: true repaints come from the tile cache.
export function drawLook(ctx, data, look, ox, oy, s, { stage = false, thumb = false } = {}) {
  const cache = thumb ? thumbTint : tintCache;
  const list = layersFor(data, look, { stage });
  const bmpOf = (L, colour, pattern) => (colour && L.tint ? tinted(L, s, colour, pattern, cache)
    : L.derive === 'changed' ? changedLayer(L, s) : raw(L.src, L, s));
  if (!list.some((e) => e.L.derive === 'patch')) {
    for (const { L, colour, pattern } of list) ctx.drawImage(bmpOf(L, colour, pattern), Math.round(ox + L.x * s), Math.round(oy + L.y * s));
    return;
  }
  // A patch erases as well as paints, so the doll is composed apart from the stage.
  const doll = list.filter((e) => e.L.z !== 'stage');
  for (const e of list) if (e.L.z === 'stage') ctx.drawImage(bmpOf(e.L), Math.round(ox + e.L.x * s), Math.round(oy + e.L.y * s));
  const x0 = Math.min(...doll.map((e) => e.L.x)), y0 = Math.min(...doll.map((e) => e.L.y));
  const x1 = Math.max(...doll.map((e) => e.L.x + e.L.w)), y1 = Math.max(...doll.map((e) => e.L.y + e.L.h));
  const buf = makeCanvas((x1 - x0) * s + 2, (y1 - y0) * s + 2);
  const b = buf.getContext('2d');
  const at = (L) => [Math.round((L.x - x0) * s), Math.round((L.y - y0) * s)];
  for (const e of doll) {
    if (e.L.derive === 'patch') {
      const p = patchLayer(e.L, e.outfit, s);
      const [px, py] = at(e.L);
      b.globalCompositeOperation = 'destination-out';
      b.drawImage(p.erase, px, py);
      b.globalCompositeOperation = 'source-over';
      b.drawImage(p.paint, px, py);
    } else {
      const [px, py] = at(e.L);
      b.drawImage(bmpOf(e.L, e.colour, e.pattern), px, py);
    }
  }
  ctx.drawImage(buf, Math.round(ox + x0 * s), Math.round(oy + y0 * s));
  buf.width = 0; buf.height = 0;
}

// Stage art covers the whole canvas and keeps its floor under the doll's feet.
export function drawStage(ctx, data, stageId, cw, ch, feetY, s) {
  const st = data.items.find((i) => i.id === stageId);
  if (!st) return;
  ctx.fillStyle = st.bg || '#F6D5E6';
  ctx.fillRect(0, 0, cw, ch);
  const rig = data.rig;
  const ss = Math.max(cw / rig.w, ch / rig.h, s);
  let oy = feetY - rig.feetY * ss;
  oy = Math.min(0, Math.max(ch - rig.h * ss, oy));
  const ox = (cw - rig.w * ss) / 2;
  for (const L of st.layers) ctx.drawImage(raw(L.src, L, ss), Math.round(ox + L.x * ss), Math.round(oy + L.y * ss));
}

// Fit the doll box into a w x h area. Returns {s, ox, oy}. She stands on the floor:
// when the area is taller than she needs, the spare height goes above her head, so she
// never floats over the stage.
export function fitDoll(data, w, h, pad = 0) {
  const b = data.rig.dollBox;
  const s = Math.min((w - pad * 2) / b.w, (h - pad * 2) / b.h);
  return { s, ox: (w - b.w * s) / 2 - b.x * s, oy: h - pad - (b.y + b.h) * s };
}

// A tile picture: the look (with the item on) cropped to the item's thumb box.
export function drawThumb(ctx, data, look, crop, w, h, { stage = false } = {}) {
  const s = Math.max(w / crop.w, h / crop.h);
  const ox = (w - crop.w * s) / 2 - crop.x * s, oy = (h - crop.h * s) / 2 - crop.y * s;
  drawLook(ctx, data, look, ox, oy, s, { stage, thumb: true });
}

// The fabric mask of the worn dress, drawn into ctx at the rig mapping, for the
// show-time transformation glitter.
export function drawDressMask(ctx, data, look, ox, oy, s) {
  const dress = data.items.find((i) => i.id === look.dress.id);
  if (!dress) return;
  for (const L of dress.layers) {
    if (L.mask && typeof L.mask === 'object' && L.mask.auto) {
      const key = `amask:${L.src}@${q(s)}`;
      let c = rawCache.get(key);
      if (!c) {
        c = regionCanvas(L.src, L, L, s);
        const img = pixels(c), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          if (!d[i + 3]) continue;
          d[i + 3] = Math.round(d[i + 3] * autoMaskAlpha(d[i], d[i + 1], d[i + 2], L.y + Math.floor(i / 4 / c.width) / s, L.mask));
        }
        c.getContext('2d').putImageData(img, 0, 0);
        rawCache.set(key, c);
      }
      ctx.drawImage(c, Math.round(ox + L.x * s), Math.round(oy + L.y * s));
      continue;
    }
    const m = L.mask ? (typeof L.mask === 'string' ? { ...L, src: L.mask } : L.mask) : L;
    ctx.drawImage(raw(m.src, m, s), Math.round(ox + m.x * s), Math.round(oy + m.y * s));
  }
}

export function shadeSwatchColour(hex) { return hexToRgb(hex); }
