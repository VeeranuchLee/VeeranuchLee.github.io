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
   * Trapezoid hull with the long edge up, a square deck/cabin stacked on the
   * left of the gunwale, a triangle flag on the cabin roof, and a rhombus
   * sail standing on the deck's right edge. NOTE: the deck square is glued
   * on with rot 6 (180 degrees), so its LOCAL edge 2 lies on the hull and its
   * local edge 0 is the physical top — the cabin glues to edge 0, not 2.
   * Hexagon-edge compass for the comments below: e1 top, e2 upper-left,
   * e3 lower-left, e4 bottom, e5 lower-right, e0 upper-right. */
  function boat() {
    var hull = base('trapezoid');
    hull.rot = 6; /* long edge up */
    var deck = att(hull, 0, 'square', 2);       /* deck on the gunwale, left half */
    var cabin = att(deck, 0, 'square', 2);      /* cabin stacked on the deck's top */
    var flag = att(cabin, 0, 'triangle', 0);    /* flag on the cabin roof */
    var sail = att(cabin, 3, 'rhombus', 0);     /* sail leaning right of the cabin — high
                                                   enough that its bottom tip clears the hull */
    return [hull, deck, cabin, flag, sail];
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
   * Four squares in a 2x2 wall and a sawtooth roof of three triangles across
   * the wall top (up, down, up). A chimney on the 60-degree slope only ever
   * sticks out sideways (tried in the first draft — the checker's preview
   * showed it sliding off the roof), so the house ships without one. */
  function house() {
    var sw = base('square');
    var se = att(sw, 1, 'square', 3);        /* bottom row: two squares */
    var nw = att(sw, 2, 'square', 0);        /* top row left, on sw's top */
    var ne = att(se, 2, 'square', 0);        /* top row right, on se's top */
    var r1 = att(nw, 2, 'triangle', 0);      /* roof: up */
    var r2 = att(r1, 1, 'triangle', 2);      /* roof: down fills between */
    var r3 = att(ne, 2, 'triangle', 0);      /* roof: up */
    return [sw, se, nw, ne, r1, r2, r3];
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
      cache[cardId] = def.build();
    }
    return cache[cardId];
  }

  var api = { CARDS: CARDS, targets: targets };
  root.PatternBlocksCards = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
