/* Pattern Blocks — outline pattern cards.
 *
 * Data-driven by design: a card is an id, a plain child-facing label, and a
 * build() that composes target placements. Adding a card is adding an entry
 * here — the tray, the card picker, the board outline renderer and the success
 * check all read this list and never need to know a card exists.
 *
 * Every card is COMPOSED, never coordinate-typed: pieces are glued edge to
 * edge with geometry.attachOutside(), so shared edges coincide by construction
 * (float-exact) and the checker (tools/check-geometry.mjs) proves the result:
 * no interior overlaps, one connected cluster, classic-shape areas.
 *
 * Card design language: like printed pattern-block cards, an outline shows the
 * SHAPE of each region (thin grey stroke, whisper of fill) and leaves the
 * colours to the child's blocks.
 */
(function (root) {
  'use strict';

  var G = root.PatternBlocksGeometry || require('./geometry.js');
  var base = G.basePiece;
  var att = G.attachOutside;

  /* Rotate a composition helper: given a piece built at the origin, nothing
     needed — attachOutside composes relative to any anchor. */

  function card(id, label, build) {
    return { id: id, label: label, build: build };
  }

  /* --- Flower --------------------------------------------------------------
   * Hexagon heart, a rhombus petal on every edge, a green tip on every petal.
   * 13 pieces. The rhombus glued by edge 1 has its opposite edge (edge 3) on
   * the outside; the triangle's base (edge 0) sits on that outer edge. */
  function flower() {
    var hex = base('hexagon');
    var out = [hex];
    for (var i = 0; i < 6; i++) {
      var petal = att(hex, i, 'rhombus', 1);
      out.push(petal);
      out.push(att(petal, 3, 'triangle', 0));
    }
    return out;
  }

  /* --- Boat ----------------------------------------------------------------
   * Trapezoid hull with the long edge up; a square cabin on the left half of
   * the deck; a blue rhombus sail standing on the right half, leaning forward,
   * topped by a triangle. Rebuilt 2026-10-20 for the dot lattice: the old boat
   * stacked a second square on the first and put the flag and sail on it, so
   * three of its five pieces could never sit on the dots (a square's top edge
   * is 1 unit up, and lattice rows are sqrt3/2 apart). */
  function boat() {
    var hull = base('trapezoid');
    hull.rot = 6; /* long edge up */
    var cabin = att(hull, 0, 'square', 2);         /* left half of the deck */
    var sail = att(hull, 0, 'rhombus', 0, 1);      /* right half, leaning forward */
    var top = att(sail, 2, 'triangle', 0);         /* sail tip */
    return [hull, cabin, sail, top];
  }

  /* --- Fish ----------------------------------------------------------------
   * Hexagon body; trapezoid tail widening away on the upper-left edge;
   * triangle dorsal fin on top, belly fin below, nose on the upper-right —
   * swimming right. */
  function fish() {
    var body = base('hexagon');
    var tail = att(body, 2, 'trapezoid', 2);
    var dorsal = att(body, 1, 'triangle', 0);
    var belly = att(body, 4, 'triangle', 0);
    var nose = att(body, 0, 'triangle', 0);
    return [body, tail, dorsal, belly, nose];
  }

  /* --- House ---------------------------------------------------------------
   * A sawtooth roof of three triangles (up, down, up) with two square walls
   * hanging under the two up-triangles. Rebuilt 2026-10-20 for the dot
   * lattice: the old house had a 2x2 square wall with the roof on top, which
   * puts the roof 2 units up — not a lattice row — so the roof could never sit
   * on the dots. A square has exactly one edge on a lattice line, so the walls
   * hang from the roof line instead of the roof resting on the walls. (A
   * chimney on the 60-degree slope only ever sticks out sideways — tried in
   * the first draft — so the house still ships without one.) */
  function house() {
    var r1 = base('triangle');                 /* roof: up */
    var r2 = att(r1, 1, 'triangle', 2);        /* roof: down fills between */
    var r3 = att(r2, 0, 'triangle', 1);        /* roof: up */
    var w1 = att(r1, 0, 'square', 2);          /* wall under r1 */
    var w2 = att(r3, 2, 'square', 2);          /* wall under r3 (r3 is r2's glue turned 120 degrees, so its base is edge 2) */
    return [r1, r2, r3, w1, w2];
  }

  /* --- Rocket --------------------------------------------------------------
   * Triangle nose on the hexagon body's top edge, rhombus fins splayed on the
   * two LOWER side edges (e3, e5 — the first draft glued both on the left),
   * a trapezoid flame widening away below. */
  function rocket() {
    var body = base('hexagon');
    var nose = att(body, 1, 'triangle', 0);
    var finL = att(body, 3, 'rhombus', 1);
    var finR = att(body, 5, 'rhombus', 0);   /* edge 0, not 1: the mirror twin of finL */
    var flame = att(body, 4, 'trapezoid', 2);
    return [body, nose, finL, finR, flame];
  }

  /* --- Medallion (symmetric mosaic) ---------------------------------------
   * Six-fold PINWHEEL symmetry, deliberately not the flower's recipe: a
   * triangle on every hexagon edge, then a square standing on every
   * triangle's right-hand side edge — the card where squares meet the
   * 60-degree family edge to edge. */
  function medallion() {
    var hex = base('hexagon');
    var out = [hex];
    for (var i = 0; i < 6; i++) {
      var tri = att(hex, i, 'triangle', 0);
      out.push(tri);
      out.push(att(tri, 1, 'square', 1));
    }
    return out;
  }

  /* --- Border (repeating pattern) -----------------------------------------
   * A repeating strip a child can continue forever: diamond (two triangles),
   * flat rhombus, diamond, rhombus, diamond. The unit cell is diamond+rhombus
   * and the strip ends on a diamond so the pattern reads as ongoing. Each
   * rhombus glues onto the diamond's lower-right edge and lies flat. */
  function border() {
    var t1 = base('triangle');
    var t2 = att(t1, 1, 'triangle', 2);        /* down-triangle makes the diamond */
    var r1 = att(t2, 0, 'rhombus', 1);         /* flat rhombus continues right */
    var t3 = att(r1, 3, 'triangle', 2);
    var t4 = att(t3, 1, 'triangle', 2);        /* second diamond */
    var r2 = att(t4, 0, 'rhombus', 1);
    var t5 = att(r2, 3, 'triangle', 2);
    var t6 = att(t5, 1, 'triangle', 2);        /* closing diamond */
    return [t1, t2, r1, t3, t4, r2, t5, t6];
  }

  var CARDS = [
    card('flower', 'Flower', flower),
    card('boat', 'Boat', boat),
    card('fish', 'Fish', fish),
    card('house', 'House', house),
    card('rocket', 'Rocket', rocket),
    card('medallion', 'Medallion', medallion),
    card('border', 'Border', border),
  ];

  /* Cache built targets — compositions are pure, so once is enough. */
  var cache = {};
  function targets(cardId) {
    if (!cache[cardId]) {
      var def = null;
      for (var i = 0; i < CARDS.length; i++) {
        if (CARDS[i].id === cardId) def = CARDS[i];
      }
      if (!def) return null;
      cache[cardId] = onDots(def.build());
    }
    return cache[cardId];
  }

  /* Slide a composed card so its pieces sit on the board's dot lattice
     (geometry.js, "The dot lattice"): compositions start from a piece centred
     on the origin, and a triangle's centre is not a dot. Pure translation, so
     every glued edge stays glued. */
  function onDots(ts) {
    for (var i = 0; i < ts.length; i++) {
      if (G.LATTICE_SHAPES[ts[i].shape]) {
        var s = G.settle(ts[i]);
        return ts.map(function (t) {
          return { shape: t.shape, x: t.x + s.dx, y: t.y + s.dy, rot: t.rot };
        });
      }
    }
    return ts;
  }

  var api = { CARDS: CARDS, targets: targets };
  root.PatternBlocksCards = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
