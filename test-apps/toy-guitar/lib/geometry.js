// Toy Guitar — instrument geometry and hit-testing. Pure; no DOM.
//
// The guitar is laid out in an abstract (u, v) space: u runs along the LONG
// axis of the screen (headstock at 0, body at the far end), v across it.
// Landscape maps u to screen x; portrait maps u to screen y, so the guitar
// follows the long axis of the screen. The same numbers serve the drawing and
// the touch hit-tests, so a string or fret that is drawn is exactly a string
// or fret that can be played.
//
// Zones along u: headstock | open slot | 12 fret slots | body (strum area).

import { STRING_COUNT, FRET_COUNT } from './theory.js';

export const MARGIN = 10;
export const HEAD_FRAC = 0.075;
export const BODY_FRAC = 0.26;
export const LANE_EDGE = 0.62; // how far outside the outer strings still counts
export const BEND_DEAD = 0.3;  // lanes of sideways drag before a bend begins
export const BEND_FULL = 1.1;  // lanes of sideways drag for the full bend

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function makeLayout(width, height) {
  const portrait = height > width;
  const longSide = portrait ? height : width;
  const shortSide = portrait ? width : height;
  const L = longSide - 2 * MARGIN;
  const S = shortSide - 2 * MARGIN;
  const headLen = HEAD_FRAC * L;
  const bodyLen = BODY_FRAC * L;
  const neckLen = L - headLen - bodyLen;
  const fretW = neckLen / (FRET_COUNT + 1);
  const nutU = headLen + fretW;                 // the nut wire: end of the open slot
  const neckEnd = headLen + neckLen;            // start of the body
  const bridgeU = neckEnd + bodyLen * 0.74;
  const nutSpacing = clamp(S * 0.085, 52, 70);
  const bridgeSpacing = clamp(S * 0.105, 60, 84);
  const center = S / 2;
  return {
    portrait, orientation: portrait ? 'portrait' : 'landscape',
    width, height, L, S, headLen, bodyLen, neckLen, fretW, nutU, neckEnd, bridgeU,
    nutSpacing, bridgeSpacing, center,
    // fret slot k spans [slotStart(k), slotStart(k)+fretW); slot 0 is the open string
    slotStart: (k) => headLen + k * fretW,
    // spacing between neighbouring strings at position u (fans out toward the bridge)
    spacing(u) {
      const t = clamp((u - nutU) / (bridgeU - nutU), 0, 1);
      return nutSpacing + (bridgeSpacing - nutSpacing) * t;
    },
    // v of string lane i at u
    stringV(i, u) { return center + (i - (STRING_COUNT - 1) / 2) * this.spacing(u); },
    // continuous string coordinate: 0 is the low E, 5 the high E
    laneCoord(u, v) { return (v - center) / this.spacing(u) + (STRING_COUNT - 1) / 2; },
    // screen <-> abstract (coordinates are relative to the playable area)
    toUV(x, y) { return portrait ? { u: y - MARGIN, v: x - MARGIN } : { u: x - MARGIN, v: y - MARGIN }; },
    toXY(u, v) { return portrait ? { x: v + MARGIN, y: u + MARGIN } : { x: u + MARGIN, y: v + MARGIN }; }
  };
}

export function zoneOf(layout, u) {
  if (u < layout.headLen) return 'head';
  if (u < layout.neckEnd) return 'neck';
  return 'body';
}

export function fretOf(layout, u) {
  return clamp(Math.floor((u - layout.headLen) / layout.fretW), 0, FRET_COUNT);
}

export function laneOf(layout, u, v, { clampToEdge = false } = {}) {
  const f = layout.laneCoord(u, v);
  if (!clampToEdge && (f < -LANE_EDGE || f > STRING_COUNT - 1 + LANE_EDGE)) return null;
  return clamp(Math.round(f), 0, STRING_COUNT - 1);
}

// What did a new finger land on?
export function hitTest(layout, x, y) {
  const { u, v } = layout.toUV(x, y);
  if (u < 0 || u > layout.L || v < 0 || v > layout.S) return null;
  const zone = zoneOf(layout, u);
  if (zone === 'head') return { zone, u, v, lane: null, fret: null };
  const lane = laneOf(layout, u, v);
  if (lane === null) return { zone, u, v, lane: null, fret: null };
  return { zone, u, v, lane, fret: zone === 'neck' ? fretOf(layout, u) : null };
}

// Sideways drag (in lanes) of a held neck finger -> bend in cents.
export function bendFromOffset(offsetLanes, maxCents) {
  if (maxCents <= 0) return 0;
  const d = Math.abs(offsetLanes);
  if (d <= BEND_DEAD) return 0;
  return clamp((d - BEND_DEAD) / (BEND_FULL - BEND_DEAD), 0, 1) * maxCents;
}

// Boundaries in continuous lane coordinates. Cell -1 and 6 are outside the
// strings; cells 0..5 are the six lanes (outer lanes reach LANE_EDGE).
const BOUNDS = [-LANE_EDGE, 0.5, 1.5, 2.5, 3.5, 4.5, STRING_COUNT - 1 + LANE_EDGE];

function cellOf(f) {
  if (f < BOUNDS[0]) return -1;
  if (f >= BOUNDS[6]) return STRING_COUNT;
  for (let k = 0; k < STRING_COUNT; k += 1) if (f < BOUNDS[k + 1]) return k;
  return STRING_COUNT;
}

// Which lanes does a finger cross moving from lane coordinate f0 at time t0 to
// f1 at t1? Every crossing gets its own interpolated timestamp (seconds), so a
// slow swipe is staggered and a fast one is near-simultaneous. Pure.
export function laneCrossings(f0, t0, f1, t1) {
  const c0 = cellOf(f0); const c1 = cellOf(f1);
  const out = [];
  if (c0 === c1) return out;
  const step = c1 > c0 ? 1 : -1;
  for (let c = c0; c !== c1; c += step) {
    const into = c + step;
    // the boundary crossed when leaving cell c toward `into`
    const boundary = step > 0 ? BOUNDS[c + 1] : BOUNDS[c];
    if (into < 0 || into >= STRING_COUNT) continue;     // leaving the strings: nothing sounds
    const frac = f1 === f0 ? 1 : clamp((boundary - f0) / (f1 - f0), 0, 1);
    out.push({ lane: into, t: t0 + (t1 - t0) * frac });
  }
  return out;
}

// Tracks one strumming finger: remembers where it was and reports the lanes
// it newly crosses. `down` plucks the lane it lands in (a body tap).
export class StrumTracker {
  constructor(layout) { this.layout = layout; this.f = null; this.t = 0; this.direction = 'down'; }

  down(u, v, t) {
    this.f = this.layout.laneCoord(u, v); this.t = t;
    const cell = cellOf(this.f);
    return cell >= 0 && cell < STRING_COUNT ? [{ lane: cell, t }] : [];
  }

  move(u, v, t) {
    const f = this.layout.laneCoord(u, v);
    const crossings = this.f === null ? [] : laneCrossings(this.f, this.t, f, t);
    if (crossings.length) this.direction = f > this.f ? 'down' : 'up';
    this.f = f; this.t = t;
    return crossings;
  }
}

// Velocity from swipe speed: lanes per second -> 0.6..0.95
export function strumVelocity(lanesPerSecond) {
  return clamp(0.6 + lanesPerSecond * 0.035, 0.6, 0.95);
}
