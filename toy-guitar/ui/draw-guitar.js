// Toy Guitar — draws the five guitars in code (SVG). No image files.
//
// Everything is drawn in the abstract (u, v) space of lib/geometry.js and the
// whole group is mapped to the screen by one transform, so the picture and the
// touch hit-tests share exact numbers: a string or fret that is drawn is a
// string or fret that plays. Portrait is a transposition (x = v, y = u), so
// the guitar follows the long axis of the screen. Text is never drawn inside
// the transformed group (it would mirror).

import { STRING_COUNT, FRET_COUNT } from '../lib/theory.js';
import { MARGIN } from '../lib/geometry.js';

const f1 = (n) => Math.round(n * 10) / 10;

// ---- body outlines, in a 0..100 box. x runs along u from the neck joint to the
// tail (x < 0 reaches beside the neck: horns), y across (50 = centre line).
// Each outline keeps >= 24 units either side of centre where the strings are.
function sym(start, segs) {
  // a half outline given from the neck side down the top edge, mirrored for the bottom
  const cmds = [`M${start[0]},${start[1]}`];
  let prev = start;
  const pts = [start];
  segs.forEach((s) => { cmds.push(`C${s[0]},${s[1]} ${s[2]},${s[3]} ${s[4]},${s[5]}`); pts.push([s[4], s[5]]); });
  const back = [];
  for (let i = segs.length - 1; i >= 0; i -= 1) {
    const s = segs[i]; const p = i === 0 ? start : [segs[i - 1][4], segs[i - 1][5]];
    back.push(`C${s[2]},${100 - s[3]} ${s[0]},${100 - s[1]} ${p[0]},${100 - p[1]}`);
  }
  return cmds.join(' ') + ` L${segs[segs.length - 1][4]},${100 - segs[segs.length - 1][5]} ` + back.join(' ') + ' Z';
}

const OUTLINE = {
  // chunky peanut: a small upper lobe and a big round lower lobe, soft waist
  first: sym([0, 22], [[10, 14, 30, 12, 42, 18], [52, 23, 58, 4, 76, 3], [94, 2, 100, 26, 100, 50]]),
  // slim classical figure-eight, wide lower bout
  classical: sym([0, 24], [[8, 16, 26, 9, 38, 17], [46, 22, 48, 25, 54, 25], [62, 25, 66, 3, 82, 3], [95, 3, 100, 28, 100, 50]]),
  // dreadnought: big shoulders, round lower bout
  acoustic: sym([0, 14], [[6, 4, 24, 1, 38, 6], [50, 11, 52, 20, 58, 20], [66, 20, 70, -2, 86, 0], [97, 1, 100, 26, 100, 50]]),
  // offset double cutaway: a long upper horn, a short lower horn, flat tail
  electric: 'M-20,8 C-10,2 8,8 20,16 C34,22 44,5 68,4 C90,3 99,20 100,44 C100,66 96,90 72,94 C52,97 40,86 30,84 C20,82 8,90 -6,94 C-14,94 -12,80 0,76 L2,24 C-8,24 -18,18 -20,8 Z',
  // pointed, angular V
  rock: 'M2,40 L-14,6 L22,22 L52,2 L100,30 L100,70 L52,98 L22,78 L-14,94 L2,60 Z'
};

function mapPath(d, map) {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, x, y) => {
    const [u, v] = map(Number(x), Number(y));
    return `${f1(u)},${f1(v)}`;
  });
}

const STRING_STYLE = {
  first: { w: [5.2, 4.6, 4, 3.4, 2.9, 2.5], col: (p) => p.string },
  classical: { w: [4.6, 3.9, 3.2, 2.4, 2.1, 1.8], col: (p, i) => (i < 3 ? p.accent : p.string), alpha: [1, 1, 1, 0.8, 0.8, 0.8] },
  acoustic: { w: [4.6, 3.8, 3.1, 2.4, 1.9, 1.5], col: (p, i) => (i < 4 ? '#d8bd8a' : p.string) },
  electric: { w: [4.4, 3.6, 3, 2.4, 1.9, 1.5], col: (p) => p.string },
  rock: { w: [5, 4.2, 3.4, 2.6, 2, 1.6], col: (p) => p.string }
};

// ---- pieces shared by the full guitar and the picker silhouettes ----
// g = { headLen, nutU, neckEnd, L, S, center, bodyLen, bridgeU, nutHalf, neckHalf, sp(u) }
function head(shape, g, p) {
  const h = g.headLen; const c = g.center; const w = g.nutHalf + 4;
  const pegs = [];
  const peg = (u, v, r, fill) => pegs.push(`<circle cx="${f1(u)}" cy="${f1(v)}" r="${f1(r)}" fill="${fill}" stroke="#0003" stroke-width="1.5"/>`);
  let d; let extra = '';
  if (shape === 'first') {
    // a chunky rounded paddle with three fat pegs a side
    const r = 16; const a = h * 0.06; const b = h + 6; const t = c - w - 6; const bt = c + w + 6;
    d = `M${f1(b)},${f1(t)} L${f1(a + r)},${f1(t)} Q${f1(a)},${f1(t)} ${f1(a)},${f1(t + r)} L${f1(a)},${f1(bt - r)} Q${f1(a)},${f1(bt)} ${f1(a + r)},${f1(bt)} L${f1(b)},${f1(bt)} Z`;
    for (let i = 0; i < 3; i += 1) { const u = h * (0.3 + 0.24 * i); peg(u, c - w - 14, 9, p.accent); peg(u, c + w + 14, 9, p.accent); }
  } else if (shape === 'classical') {
    d = `M${f1(h + 6)},${f1(c - w)} L${f1(h * 0.06)},${f1(c - w)} L${f1(h * 0.06)},${f1(c + w)} L${f1(h + 6)},${f1(c + w)} Z`;
    extra = [0, 1].map((k) => `<rect x="${f1(h * 0.16)}" y="${f1(c - w * 0.62 + k * w * 0.66)}" width="${f1(h * 0.62)}" height="${f1(w * 0.58)}" rx="4" fill="#1a0f08"/>`).join('');
    for (let i = 0; i < 3; i += 1) { const u = h * (0.26 + 0.24 * i); peg(u, c - w - 6, 5.5, '#f6efe0'); peg(u, c + w + 6, 5.5, '#f6efe0'); }
  } else if (shape === 'acoustic') {
    d = `M${f1(h + 6)},${f1(c - w)} L${f1(h * 0.34)},${f1(c - w - 6)} L${f1(h * 0.02)},${f1(c)} L${f1(h * 0.34)},${f1(c + w + 6)} L${f1(h + 6)},${f1(c + w)} Z`;
    for (let i = 0; i < 3; i += 1) { const u = h * (0.42 + 0.24 * i); peg(u, c - w - 11, 6.5, '#d9dde0'); peg(u, c + w + 11, 6.5, '#d9dde0'); }
  } else if (shape === 'electric') {
    d = `M${f1(h + 6)},${f1(c - w)} L${f1(h * 0.5)},${f1(c - w - 4)} C${f1(h * 0.1)},${f1(c - w - 2)} ${f1(-h * 0.04)},${f1(c - w * 0.4)} ${f1(h * 0.04)},${f1(c + w * 0.2)} C${f1(h * 0.1)},${f1(c + w * 0.8)} ${f1(h * 0.4)},${f1(c + w)} ${f1(h + 6)},${f1(c + w)} Z`;
    for (let i = 0; i < 6; i += 1) peg(h * (0.9 - i * 0.14), c - w - 9, 5, '#cfd5da');
  } else {
    d = `M${f1(h + 6)},${f1(c - w)} L${f1(h * 0.55)},${f1(c - w - 12)} L${f1(h * 0.0)},${f1(c)} L${f1(h * 0.55)},${f1(c + w + 12)} L${f1(h + 6)},${f1(c + w)} Z`;
    for (let i = 0; i < 3; i += 1) { const u = h * (0.7 - i * 0.2); peg(u, c - w - 3 - i * 4, 5.5, '#c6ccd6'); peg(u, c + w + 3 + i * 4, 5.5, '#c6ccd6'); }
  }
  return `<path d="${d}" fill="${p.rim}" stroke="#0004" stroke-width="2"/>${extra}${pegs.join('')}`;
}

function neckShape(g) {
  // a fretboard that widens toward the body, matching the fanning strings
  const u0 = g.headLen; const u1 = g.neckEnd + 4;
  const w0 = g.nutHalf; const w1 = g.neckHalf;
  return `M${f1(u0)},${f1(g.center - w0)} L${f1(u1)},${f1(g.center - w1)} L${f1(u1)},${f1(g.center + w1)} L${f1(u0)},${f1(g.center + w0)} Z`;
}

function bodyExtras(shape, g, p) {
  const u0 = g.neckEnd; const bl = g.bodyLen; const c = g.center; const S = g.S;
  const out = [];
  const holeU = u0 + bl * 0.3;
  const spanAt = (u) => 2.5 * g.sp(u) + g.sp(u) * 0.55;
  if (shape === 'first') {
    out.push(`<circle cx="${f1(holeU)}" cy="${f1(c)}" r="${f1(bl * 0.2)}" fill="#3a1a14" stroke="${p.plate}" stroke-width="7"/>`);
    out.push(`<circle cx="${f1(u0 + bl * 0.66)}" cy="${f1(c - S * 0.34)}" r="${f1(bl * 0.045)}" fill="${p.plate}" opacity=".85"/><circle cx="${f1(u0 + bl * 0.66)}" cy="${f1(c + S * 0.34)}" r="${f1(bl * 0.045)}" fill="${p.plate}" opacity=".85"/>`);
  } else if (shape === 'classical') {
    out.push(`<circle cx="${f1(holeU)}" cy="${f1(c)}" r="${f1(bl * 0.17)}" fill="#2a160c" stroke="${p.plate}" stroke-width="4"/>`);
    out.push(`<circle cx="${f1(holeU)}" cy="${f1(c)}" r="${f1(bl * 0.215)}" fill="none" stroke="#7a4a25" stroke-width="5" stroke-dasharray="7 4"/>`);
  } else if (shape === 'acoustic') {
    out.push(`<circle cx="${f1(holeU)}" cy="${f1(c)}" r="${f1(bl * 0.19)}" fill="#1c1008" stroke="#2a1810" stroke-width="5"/>`);
    out.push(`<path d="M${f1(u0 + bl * 0.44)},${f1(c - S * 0.32)} C${f1(u0 + bl * 0.6)},${f1(c - S * 0.3)} ${f1(u0 + bl * 0.64)},${f1(c - S * 0.12)} ${f1(u0 + bl * 0.55)},${f1(c - S * 0.04)} C${f1(u0 + bl * 0.46)},${f1(c - S * 0.1)} ${f1(u0 + bl * 0.4)},${f1(c - S * 0.24)} ${f1(u0 + bl * 0.44)},${f1(c - S * 0.32)} Z" fill="${p.plate}" opacity=".9"/>`);
  } else if (shape === 'electric') {
    const pickup = (frac) => { const u = u0 + bl * frac; const half = spanAt(u);
      let dots = ''; for (let i = 0; i < STRING_COUNT; i += 1) dots += `<circle cx="${f1(u)}" cy="${f1(g.vAt(i, u))}" r="3.4" fill="#aeb4ba"/>`;
      return `<rect x="${f1(u - 9)}" y="${f1(c - half)}" width="18" height="${f1(half * 2)}" rx="6" fill="#f4f1e6" stroke="#0004" stroke-width="2"/>${dots}`; };
    out.push(`<path d="M${f1(u0 + bl * 0.02)},${f1(c - S * 0.3)} C${f1(u0 + bl * 0.3)},${f1(c - S * 0.36)} ${f1(u0 + bl * 0.56)},${f1(c - S * 0.3)} ${f1(u0 + bl * 0.6)},${f1(c - S * 0.18)} L${f1(u0 + bl * 0.6)},${f1(c + S * 0.22)} C${f1(u0 + bl * 0.4)},${f1(c + S * 0.34)} ${f1(u0 + bl * 0.16)},${f1(c + S * 0.3)} ${f1(u0 + bl * 0.02)},${f1(c + S * 0.2)} Z" fill="${p.plate}" opacity=".7"/>`);
    out.push(pickup(0.1), pickup(0.3), pickup(0.5));
  } else {
    const humbucker = (frac) => { const u = u0 + bl * frac; const half = spanAt(u);
      let dots = ''; for (let i = 0; i < STRING_COUNT; i += 1) dots += `<circle cx="${f1(u - 6)}" cy="${f1(g.vAt(i, u))}" r="2.6" fill="#9aa1aa"/><circle cx="${f1(u + 6)}" cy="${f1(g.vAt(i, u))}" r="2.6" fill="#9aa1aa"/>`;
      return `<rect x="${f1(u - 15)}" y="${f1(c - half)}" width="30" height="${f1(half * 2)}" rx="5" fill="#111" stroke="#c9ced6" stroke-width="3"/>${dots}`; };
    out.push(`<path d="M${f1(u0 + bl * 0.1)},${f1(c - S * 0.22)} L${f1(u0 + bl * 0.34)},${f1(c - S * 0.4)} L${f1(u0 + bl * 0.4)},${f1(c - S * 0.16)} L${f1(u0 + bl * 0.66)},${f1(c - S * 0.36)} L${f1(u0 + bl * 0.6)},${f1(c - S * 0.1)} Z" fill="${p.plate}" opacity=".9"/>`);
    out.push(humbucker(0.2), humbucker(0.46));
  }
  // bridge
  const bu = g.bridgeU; const bh = spanAt(bu);
  if (shape === 'classical') out.push(`<rect x="${f1(bu - 9)}" y="${f1(c - bh)}" width="18" height="${f1(bh * 2)}" rx="4" fill="#4a2c18" stroke="#0005" stroke-width="2"/>`);
  else if (shape === 'acoustic') {
    out.push(`<rect x="${f1(bu - 9)}" y="${f1(c - bh)}" width="18" height="${f1(bh * 2)}" rx="4" fill="#3a2214" stroke="#0005" stroke-width="2"/>`);
    for (let i = 0; i < STRING_COUNT; i += 1) out.push(`<circle cx="${f1(bu + 12)}" cy="${f1(g.vAt(i, bu))}" r="3.4" fill="#f3efe4"/>`);
  } else if (shape === 'electric') out.push(`<rect x="${f1(bu - 7)}" y="${f1(c - bh)}" width="14" height="${f1(bh * 2)}" rx="3" fill="#c9ced6" stroke="#0005" stroke-width="2"/>`);
  else if (shape === 'rock') out.push(`<rect x="${f1(bu - 8)}" y="${f1(c - bh)}" width="16" height="${f1(bh * 2)}" rx="3" fill="#d5dae2" stroke="#0007" stroke-width="2"/><rect x="${f1(bu + 12)}" y="${f1(c - bh)}" width="10" height="${f1(bh * 2)}" rx="3" fill="#8e95a0"/>`);
  else out.push(`<rect x="${f1(bu - 10)}" y="${f1(c - bh)}" width="20" height="${f1(bh * 2)}" rx="8" fill="${p.accent}" stroke="#0004" stroke-width="2"/>`);
  return out.join('');
}

function bodyAndNeck(model, g, p, withBody = true, fill = null) {
  const d = mapPath(OUTLINE[model.shape], (x, y) => [g.neckEnd + x / 100 * g.bodyLen, g.center + (y - 50) / 100 * g.S]);
  const mid = `${f1(g.bodyLen * 0.5 + g.neckEnd)} ${f1(g.center)}`;
  const inner = `<path d="${d}" fill="none" stroke="${p.plate}" stroke-opacity=".5" stroke-width="3" transform="translate(${mid}) scale(.965) translate(${mid.split(' ').map((n) => -Number(n)).join(' ')})"/>`;
  return `${withBody ? `<path class="body" d="${d}" fill="${fill || p.body}" stroke="${p.rim}" stroke-width="7" stroke-linejoin="round"/>${inner}` : ''}`;
}

// Gradients that give each body and neck its material: a lit plastic shell,
// varnished spruce, a sunburst, a gloss finish, a black gloss with a red bevel.
function tonalDefs(model, g) {
  const p = model.palette; const id = model.id;
  const finish = {
    first: [[0, '#ffb08f'], [0.55, p.body], [1, p.rim]],
    classical: [[0, '#f0c48a'], [0.6, p.body], [1, '#8a5428']],
    acoustic: [[0, '#ffe2a0'], [0.45, p.body], [0.82, '#9a4e1e'], [1, '#3a1a0c']],
    electric: [[0, '#8fe6f0'], [0.5, p.body], [1, p.rim]],
    rock: [[0, '#5a5566'], [0.55, p.body], [1, '#0d0c10']]
  }[model.shape];
  const stops = finish.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  const cx = g.neckEnd + g.bodyLen * 0.42;
  const neck = {
    first: ['#fff4d6', '#f3cf86'], classical: ['#5c3a24', '#3a2414'], acoustic: ['#7a4e2c', '#4e2e18'],
    electric: ['#f4dca6', '#d9b676'], rock: ['#3d2c22', '#1f1712']
  }[model.shape];
  // (gradients run in the guitar's own u/v space, so "across the neck" is y in both orientations)
  return `<defs>
<radialGradient id="body-${id}" gradientUnits="userSpaceOnUse" cx="${f1(cx)}" cy="${f1(g.center - g.S * 0.12)}" r="${f1(Math.max(g.bodyLen, g.S) * 0.62)}">${stops}</radialGradient>
<linearGradient id="neck-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${neck[0]}"/><stop offset=".5" stop-color="${neck[1]}"/><stop offset="1" stop-color="${neck[0]}"/></linearGradient>
<linearGradient id="fret-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e959c"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa1a8"/></linearGradient>
</defs>`;
}

// Per-toy string look: First wears a rainbow (colour is a bonus, never the
// only cue); the others are nylon, bronze-wound steel, nickel or black-chrome.
const RAINBOW = ['#ff6b6b', '#ff9f43', '#ffd43b', '#51cf66', '#4dabf7', '#9775fa'];

// The shared body grain for the wooden guitars: faint lengthwise lines.
function grain(g, shape) {
  if (shape !== 'classical' && shape !== 'acoustic') return '';
  const lines = [];
  for (let k = -6; k <= 6; k += 1) {
    const v = g.center + k * g.S * 0.07;
    lines.push(`<path d="M${f1(g.neckEnd - g.bodyLen * 0.05)},${f1(v)} C${f1(g.neckEnd + g.bodyLen * 0.4)},${f1(v + 6)} ${f1(g.neckEnd + g.bodyLen * 0.7)},${f1(v - 6)} ${f1(g.neckEnd + g.bodyLen * 1.05)},${f1(v + 3)}"/>`);
  }
  return `<g fill="none" stroke="#3a1a08" stroke-opacity=".09" stroke-width="2" clip-path="url(#clip-body)">${lines.join('')}</g>`;
}

// ---------- the full, playable guitar ----------
// `layout` is lib/geometry.makeLayout(...). Returns an <svg> string sized to
// the playable area. data-* attributes mark every element the app animates.
// Two layers: the still guitar (with its soft shadow) and, above it, the parts
// that move — fret lights, fingertip marks and the strings — kept outside the
// shadow so redrawing a vibrating string never re-renders a filtered layer.
export function drawGuitar(model, layout) {
  const p = model.palette; const L = layout; const shape = model.shape;
  const g = {
    portrait: L.portrait,
    headLen: L.headLen, nutU: L.nutU, neckEnd: L.neckEnd, L: L.L, S: L.S, center: L.center, bodyLen: L.bodyLen, bridgeU: L.bridgeU,
    nutHalf: 2.5 * L.nutSpacing + L.nutSpacing * 0.62, neckHalf: 2.5 * L.spacing(L.neckEnd) + L.spacing(L.neckEnd) * 0.62,
    sp: (u) => L.spacing(u), vAt: (i, u) => L.stringV(i, u)
  };
  const style = STRING_STYLE[shape];
  const still = [];
  const bodyPath = mapPath(OUTLINE[shape], (x, y) => [g.neckEnd + x / 100 * g.bodyLen, g.center + (y - 50) / 100 * g.S]);
  still.push(`<clipPath id="clip-body"><path d="${bodyPath}"/></clipPath>`);
  still.push(bodyAndNeck(model, g, p, true, `url(#body-${model.id})`));
  still.push(grain(g, shape));
  still.push(head(shape, g, p));
  // the fretboard, with a lit edge along both sides
  still.push(`<path d="${neckShape(g)}" fill="url(#neck-${model.id})" stroke="${p.rim}" stroke-width="3"/>`);
  if (shape === 'first') {
    // First's board is moulded plastic: a soft raised rim down both edges
    still.push(`<path d="${neckShape(g)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" transform="translate(0 0)"/>`);
  }
  // the open slot is a slightly darker strip so "open string" reads as a place
  still.push(`<rect x="${f1(L.headLen)}" y="${f1(g.center - g.nutHalf)}" width="${f1(L.fretW)}" height="${f1(g.nutHalf * 2)}" fill="#000" opacity=".16"/>`);
  // the nut and 12 fret wires (a metal wire with a highlight)
  still.push(`<line x1="${f1(L.nutU)}" y1="${f1(g.center - L.spacing(L.nutU) * 3.05)}" x2="${f1(L.nutU)}" y2="${f1(g.center + L.spacing(L.nutU) * 3.05)}" stroke="${shape === 'rock' || shape === 'classical' || shape === 'acoustic' ? '#f4efe2' : '#fffaf0'}" stroke-width="8" stroke-linecap="round"/>`);
  for (let k = 1; k <= FRET_COUNT; k += 1) {
    const u = L.nutU + k * L.fretW; const half = L.spacing(u) * 3.05;
    still.push(`<line class="fret-wire" x1="${f1(u)}" y1="${f1(g.center - half)}" x2="${f1(u)}" y2="${f1(g.center + half)}" stroke="#7c848c" stroke-width="5" stroke-linecap="round"/>`);
    still.push(`<line x1="${f1(u - 0.8)}" y1="${f1(g.center - half + 2)}" x2="${f1(u - 0.8)}" y2="${f1(g.center + half - 2)}" stroke="#fff" stroke-opacity=".85" stroke-width="1.6" stroke-linecap="round"/>`);
  }
  // inlays centre the slot (positions 3 5 7 9, double at 12). First: rainbow buttons.
  const inlay = (k, v, i) => {
    const r = L.fretW * (shape === 'first' ? 0.17 : 0.12);
    const fill = shape === 'first' ? RAINBOW[i % 6] : shape === 'rock' ? '#e0324b' : p.plate;
    const cx = L.slotStart(k) + L.fretW / 2;
    if (shape === 'rock') return `<path d="M${f1(cx - r)},${f1(v)} L${f1(cx)},${f1(v - r * 1.3)} L${f1(cx + r)},${f1(v)} L${f1(cx)},${f1(v + r * 1.3)} Z" fill="${fill}" opacity=".9"/>`;
    return `<circle cx="${f1(cx)}" cy="${f1(v)}" r="${f1(r)}" fill="${fill}" opacity="${shape === 'first' ? 0.95 : 0.75}"/>`;
  };
  [3, 5, 7, 9].forEach((k, i) => still.push(inlay(k, g.center, i)));
  [-1, 1].forEach((s, i) => still.push(inlay(12, g.center + s * L.spacing(L.slotStart(12)) * 1.5, 4 + i)));
  // strum plate: the part of the body that picks and strums
  const sx = L.neckEnd + 4; const sw = L.bridgeU + 20 - sx; const sh = 2.5 * L.bridgeSpacing + L.bridgeSpacing * 0.8;
  still.push(`<rect class="strum-plate" x="${f1(sx)}" y="${f1(g.center - sh)}" width="${f1(sw)}" height="${f1(sh * 2)}" rx="22" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`);
  still.push(`<g clip-path="url(#clip-body)">${bodyExtras(shape, g, p)}</g>`);

  // ---- the moving layer ----
  const live = [];
  for (let lane = 0; lane < STRING_COUNT; lane += 1) {
    for (let fret = 0; fret <= FRET_COUNT; fret += 1) {
      const u = L.slotStart(fret) + L.fretW / 2; const v = L.stringV(lane, u);
      const cw = L.fretW * 0.84; const ch = Math.min(L.spacing(u) * 0.78, 54);
      // the fret cell that lights while held or plucked
      live.push(`<rect class="cell" data-lane="${lane}" data-fret="${fret}" x="${f1(u - cw / 2)}" y="${f1(v - ch / 2)}" width="${f1(cw)}" height="${f1(ch)}" rx="${f1(Math.min(cw, ch) * 0.32)}" fill="${p.accent}" opacity="0"/>`);
    }
    // open-string rings: a hollow circle in the open slot marks "play the open string here"
    const uo = L.slotStart(0) + L.fretW / 2;
    live.push(`<circle cx="${f1(uo)}" cy="${f1(L.stringV(lane, uo))}" r="${f1(Math.min(L.fretW, L.spacing(uo)) * 0.28)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" pointer-events="none"/>`);
  }
  // the strings: a glow underlay, a soft shadow and the string, all redrawn while ringing
  for (let lane = 0; lane < STRING_COUNT; lane += 1) {
    const d = stringD(L, lane, 0, 0);
    const col = shape === 'first' ? RAINBOW[lane] : style.col(p, lane);
    live.push(`<path class="string-glow" data-lane="${lane}" d="${d}" fill="none" stroke="${shape === 'first' ? RAINBOW[lane] : p.accent}" stroke-width="${f1(style.w[lane] + 11)}" stroke-linecap="round" opacity="0"/>`);
    live.push(`<path class="string-shadow" data-lane="${lane}" d="${d}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="${f1(style.w[lane] * 0.9)}" stroke-linecap="round" transform="translate(${L.portrait ? '0 0' : '0 0'})"/>`);
    live.push(`<path class="string-line" data-lane="${lane}" d="${d}" fill="none" stroke="${col}" stroke-opacity="${style.alpha ? style.alpha[lane] : 1}" stroke-width="${style.w[lane]}" stroke-linecap="round"${lane < 3 && shape !== 'first' && shape !== 'classical' ? ` stroke-dasharray="1.2 1.4"` : ''}/>`);
    if (lane < 3 && shape !== 'first' && shape !== 'classical') live.push(`<path class="string-core" data-lane="${lane}" d="${d}" fill="none" stroke="${col}" stroke-opacity=".75" stroke-width="${f1(style.w[lane] * 0.55)}" stroke-linecap="round"/>`);
  }
  // fingertip marks sit above the strings
  for (let lane = 0; lane < STRING_COUNT; lane += 1) {
    for (let fret = 0; fret <= FRET_COUNT; fret += 1) {
      const u = L.slotStart(fret) + L.fretW / 2;
      const r = Math.min(L.fretW, L.spacing(u)) * 0.34;
      live.push(`<circle class="mark" data-lane="${lane}" data-fret="${fret}" cx="${f1(u)}" cy="${f1(L.stringV(lane, u))}" r="${f1(r)}" fill="${shape === 'first' ? RAINBOW[lane] : p.accent}" stroke="#fff" stroke-width="${fret === 0 ? 4 : 3.5}" opacity="0"/>`);
    }
  }
  const w = L.portrait ? L.S : L.L; const h = L.portrait ? L.L : L.S;
  void w; void h;
  const tf = L.portrait ? `matrix(0 1 1 0 ${MARGIN} ${MARGIN})` : `translate(${MARGIN} ${MARGIN})`;
  return `<svg class="guitar-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(L.width)} ${f1(L.height)}" width="${f1(L.width)}" height="${f1(L.height)}" role="img" aria-label="${model.name}">${tonalDefs(model, g)}<g transform="${tf}"><g class="guitar-shadow">${still.join('')}</g><g class="guitar-live">${live.join('')}</g></g></svg>`;
}

// The path of one string. amp is the sideways wobble (px) at the middle.
export function stringD(L, lane, amp, phase) {
  const u0 = L.headLen; const u1 = L.bridgeU; const um = (u0 + u1) / 2;
  const v0 = L.stringV(lane, u0); const v1 = L.stringV(lane, u1); const vm = L.stringV(lane, um);
  const off = amp * Math.sin(phase);
  if (!amp) return `M${f1(u0)},${f1(v0)} L${f1(u1)},${f1(v1)}`;
  return `M${f1(u0)},${f1(v0)} Q${f1(um)},${f1(vm + off * 2)} ${f1(u1)},${f1(v1)}`;
}

// ---------- small silhouettes for the picker ----------
export function drawSilhouette(model, w = 220, h = 84) {
  const p = model.palette;
  const L = w; const S = h;
  const g = {
    headLen: L * 0.13, nutU: L * 0.17, neckEnd: L * 0.5, L, S, center: S / 2, bodyLen: L * 0.5, bridgeU: L * 0.5 + L * 0.5 * 0.74,
    nutHalf: S * 0.13, neckHalf: S * 0.17,
    sp: () => S * 0.045, vAt: (i) => S / 2 + (i - 2.5) * S * 0.045
  };
  const parts = [];
  parts.push(bodyAndNeck(model, g, p));
  parts.push(head(model.shape, g, p));
  parts.push(`<path d="${neckShape(g)}" fill="${p.neck}" stroke="${p.rim}" stroke-width="1.5"/>`);
  parts.push(bodyExtras(model.shape, g, p));
  for (let i = 0; i < STRING_COUNT; i += 1) parts.push(`<line x1="${f1(g.headLen)}" y1="${f1(g.vAt(i, 0))}" x2="${f1(g.bridgeU)}" y2="${f1(g.vAt(i, 0))}" stroke="${p.string}" stroke-width="1" opacity=".9"/>`);
  return `<svg class="silhouette" xmlns="http://www.w3.org/2000/svg" viewBox="-6 -2 ${w + 12} ${h + 4}" aria-hidden="true"><g>${parts.join('')}</g></svg>`;
}

// ---------- the ribbon chip: one-colour drawing of the whole guitar ----------
// Like Toy Keyboard's chips, it is a picture of THIS toy in one ink on the
// chip's dark case, so with colour taken away it still says which guitar it
// is: the peanut toy, the slotted classical head and round hole, the
// dreadnought with its pickguard, the offset double cutaway with three
// pickups, the pointed V with two humbuckers.
export function drawChip(model) {
  // Drawn big and cropped to the body end, where the five differ most.
  const W = 300; const H = 200; const c = 112;
  const g = {
    headLen: 34, nutU: 44, neckEnd: 128, L: W, S: H, center: c, bodyLen: 168, bridgeU: 128 + 168 * 0.74,
    nutHalf: 15, neckHalf: 19, sp: () => 11, vAt: (i) => c + (i - 2.5) * 11
  };
  const ink = 'currentColor'; const cut = '#1b1f29';
  const mono = { body: ink, rim: ink, neck: ink, plate: cut, string: cut, accent: cut };
  const parts = [];
  parts.push(bodyAndNeck(model, g, mono));
  parts.push(head(model.shape, g, mono).replace(/fill="#[0-9a-fA-F]{3,8}"/g, `fill="${ink}"`).replace(/stroke="#000?[34]"/g, 'stroke="none"'));
  parts.push(`<path d="${neckShape(g)}" fill="${ink}"/>`);
  parts.push(bodyExtras(model.shape, g, mono).replace(/stroke="[^"]*"/g, 'stroke="none"').replace(/fill="#[0-9a-fA-F]{3,6}"/g, `fill="${cut}"`));
  return `<svg class="chip-art" xmlns="http://www.w3.org/2000/svg" viewBox="-14 0 318 224" aria-hidden="true"><g>${parts.join('')}</g></svg>`;
}
