/* Pattern Blocks — exact geometry engine.
 *
 * Shared by the toy (toys/pattern-blocks/pattern-blocks.js), the card data
 * (toys/pattern-blocks/cards.js) and the checker (tools/check-geometry.mjs).
 *
 * DESIGN NOTES — why this file looks the way it does.
 *
 * The brief requires "mathematically correct and mutually compatible" geometry:
 * pieces that fit together with no gaps when aligned. That is enforced by three
 * rules, and every rule has a mechanical reason:
 *
 * 1. UNIT EDGES. Every one of the six classic shapes is defined with all edges
 *    exactly length 1 (the tan rhombus's short diagonal and the square's sides
 *    included). Any two pieces can therefore share an edge with zero gap.
 *
 * 2. 30-DEGREE ROTATION TABLE. Every edge direction in a pattern-block set is a
 *    multiple of 30 degrees (the tan rhombus has 30-degree corners). Pieces
 *    rotate in fixed 30-degree steps only — `rot` is an INTEGER step count,
 *    never an angle in radians, so a piece can never drift to 31 degrees.
 *
 * 3. NO ACCUMULATED ARITHMETIC. World vertices are always recomputed fresh as
 *    `position + R(rot) * localVertex` from the stored step count, using one
 *    cached cos/sin table. Rotation never multiplies a matrix by a matrix, and
 *    snapping adjusts the position by an exact difference, so two snapped
 *    pieces share a vertex to within ~1e-15 units — invisible at any zoom and
 *    unable to grow over a long play session.
 *
 * Coordinates are MATHS coordinates (y up), origin anywhere. The renderer flips
 * y (SVG is y down) in one place, piecePath(); everything else is maths-space.
 *
 * Attaching pieces for the outline cards uses attachOutside(): two convex
 * CCW-wound polygons with disjoint interiors that share an edge traverse that
 * edge in OPPOSITE directions, so matching the attached piece's CCW edge
 * anti-parallel to the base's CCW edge is a complete, unambiguous placement —
 * no mirrored accidents, no hand-computed coordinates. The checker proves the
 * result: no interior overlap, one connected cluster.
 */
(function (root) {
  'use strict';

  var SQ3 = Math.sqrt(3);
  var SQ3_2 = SQ3 / 2;

  /* cos/sin for the 12 rotation steps. Math.cos(Math.PI/6) is deterministic
     for a given engine, and every rotation in the app reads this one table. */
  var ROT = [];
  for (var k = 0; k < 12; k++) {
    var a = (k * Math.PI) / 6;
    ROT.push({ cos: Math.cos(a), sin: Math.sin(a) });
  }

  function rotPoint(v, k) {
    var r = ROT[((k % 12) + 12) % 12];
    return { x: v.x * r.cos - v.y * r.sin, y: v.x * r.sin + v.y * r.cos };
  }

  /* --- The six classic shapes -------------------------------------------
   * verts are CCW around the centroid, in maths space, unit edge.
   * Canonical orientation: a horizontal edge at the bottom where possible. */
  function shape(label, color, stroke, verts, symSteps) {
    var edges = [];
    for (var i = 0; i < verts.length; i++) {
      edges.push([i, (i + 1) % verts.length]);
    }
    return {
      label: label,
      color: color,
      stroke: stroke,
      verts: verts,
      edges: edges,
      /* rotation steps after which the piece looks unchanged (30 x sym deg) */
      symSteps: symSteps,
    };
  }

  var SHAPES = {
    hexagon: shape(
      'Hexagon', '#FFC53D', '#D89B1C',
      [{ x: 1, y: 0 }, { x: 0.5, y: SQ3_2 }, { x: -0.5, y: SQ3_2 },
       { x: -1, y: 0 }, { x: -0.5, y: -SQ3_2 }, { x: 0.5, y: -SQ3_2 }],
      2 /* 60 degrees */
    ),
    triangle: shape(
      'Triangle', '#6BCB77', '#47945B',
      [{ x: -0.5, y: -SQ3 / 6 }, { x: 0.5, y: -SQ3 / 6 }, { x: 0, y: SQ3 / 3 }],
      4 /* 120 degrees */
    ),
    rhombus: shape(
      'Rhombus', '#4D96FF', '#2F6FCC',
      [{ x: -0.75, y: -SQ3 / 4 }, { x: 0.25, y: -SQ3 / 4 },
       { x: 0.75, y: SQ3 / 4 }, { x: -0.25, y: SQ3 / 4 }],
      6 /* 180 degrees */
    ),
    trapezoid: shape(
      'Trapezoid', '#FF6B6B', '#D04848',
      [{ x: -1, y: -SQ3 / 4 }, { x: 1, y: -SQ3 / 4 },
       { x: 0.5, y: SQ3 / 4 }, { x: -0.5, y: SQ3 / 4 }],
      12 /* mirror-symmetric only: 180 degrees swaps the long and short edges */
    ),
    square: shape(
      'Square', '#FF9F45', '#D5761B',
      [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }],
      3 /* 90 degrees */
    ),
    /* narrow 30-degree rhombus — the one that forces 30-degree steps */
    rhombusThin: shape(
      'Thin rhombus', '#F2D6A2', '#B99A5E',
      [{ x: -(2 + SQ3) / 4, y: -0.25 }, { x: (2 - SQ3) / 4, y: -0.25 },
       { x: (2 + SQ3) / 4, y: 0.25 }, { x: (SQ3 - 2) / 4, y: 0.25 }],
      6
    ),
  };

  var TRAY_ORDER = ['hexagon', 'triangle', 'rhombus', 'trapezoid', 'square', 'rhombusThin'];

  /* --- Pieces ------------------------------------------------------------ */
  /* A piece is { shape, x, y, rot } — translation of the centroid plus an
     integer rotation step. Everything else is derived, never stored. */

  function worldVerts(piece) {
    var s = SHAPES[piece.shape];
    var out = [];
    for (var i = 0; i < s.verts.length; i++) {
      var v = rotPoint(s.verts[i], piece.rot);
      out.push({ x: v.x + piece.x, y: v.y + piece.y });
    }
    return out;
  }

  /* SVG path, y negated (maths -> screen). */
  function piecePath(piece) {
    var vs = worldVerts(piece);
    var d = '';
    for (var i = 0; i < vs.length; i++) {
      d += (i ? 'L' : 'M') + vs[i].x.toFixed(6) + ' ' + (-vs[i].y).toFixed(6);
    }
    return d + 'Z';
  }

  function edgeMidpoints(piece) {
    /* midpoints of length-2 edges (the trapezoid's long base and top): a
       triangle butted against the middle of a trapezoid base is a legal
       physical placement, so those midpoints are snap targets too. */
    var s = SHAPES[piece.shape];
    var vs = worldVerts(piece);
    var out = [];
    for (var i = 0; i < s.edges.length; i++) {
      var a = vs[s.edges[i][0]], b = vs[s.edges[i][1]];
      var dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx * dx + dy * dy - 4) < 1e-9) {
        out.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
    }
    return out;
  }

  function snapPoints(pieces) {
    var out = [];
    for (var i = 0; i < pieces.length; i++) {
      var vs = worldVerts(pieces[i]);
      for (var j = 0; j < vs.length; j++) out.push(vs[j]);
      var mids = edgeMidpoints(pieces[i]);
      for (var m = 0; m < mids.length; m++) out.push(mids[m]);
    }
    return out;
  }

  /* Best snap for a dragged piece: nearest (dragged vertex, target point)
     pair within radius. Returns the translation to apply, or null. Gentle by
     construction — outside the radius nothing happens. */
  function bestSnap(dragPiece, targetPoints, radius) {
    var vs = worldVerts(dragPiece);
    var best = null;
    for (var i = 0; i < vs.length; i++) {
      for (var j = 0; j < targetPoints.length; j++) {
        var t = targetPoints[j];
        var dx = t.x - vs[i].x, dy = t.y - vs[i].y;
        var d2 = dx * dx + dy * dy;
        if (d2 <= radius * radius && (!best || d2 < best.d2)) {
          best = { d2: d2, dx: dx, dy: dy };
        }
      }
    }
    return best;
  }

  /* --- Hit testing -------------------------------------------------------- */
  function pointInPiece(piece, p, tol) {
    var s = SHAPES[piece.shape];
    var vs = worldVerts(piece);
    var n = vs.length;
    var inside = false;
    var i, j;
    for (i = 0, j = n - 1; i < n; j = i++) {
      var a = vs[i], b = vs[j];
      if ((a.y > p.y) !== (b.y > p.y) &&
          p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
        inside = !inside;
      }
    }
    if (inside) return true;
    if (tol) {
      for (i = 0; i < n; i++) {
        if (distToSeg(p, vs[i], vs[(i + 1) % n]) <= tol) return true;
      }
    }
    return false;
  }

  function distToSeg(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    var x = a.x + t * dx, y = a.y + t * dy;
    var ex = p.x - x, ey = p.y - y;
    return Math.sqrt(ex * ex + ey * ey);
  }

  /* Topmost piece at p (search from end of the array = top of z-order). */
  function pieceAt(pieces, p, tol) {
    for (var i = pieces.length - 1; i >= 0; i--) {
      if (pointInPiece(pieces[i], p, tol)) return pieces[i];
    }
    return null;
  }

  /* --- Card building ------------------------------------------------------ */
  function basePiece(shapeName) {
    return { shape: shapeName, x: 0, y: 0, rot: 0 };
  }

  function edgeAngle(verts, e) {
    var a = verts[e[0]], b = verts[e[1]];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  /* Attach `shapeName` to the outside of `base` along base's CCW edge
     `baseEdge`, gluing the shape's CCW edge `shapeEdge` (at rot 0) onto it.
     See the header comment for why anti-parallel CCW edges imply a clean,
     non-overlapping, outward placement. Returns the new piece. */
  function attachOutside(base, baseEdge, shapeName, shapeEdge) {
    var bs = SHAPES[base.shape];
    var bvs = worldVerts(base);
    var a = bvs[bs.edges[baseEdge][0]];   /* base edge start  */
    var b = bvs[bs.edges[baseEdge][1]];   /* base edge end    */

    var ss = SHAPES[shapeName];
    var e0 = edgeAngle(ss.verts, ss.edges[shapeEdge]);
    var eb = edgeAngle(bvs.map(function (v) { return v; }), bs.edges[baseEdge]);

    /* want the shape's edge to run b->a in world space */
    var want = eb + Math.PI;
    var steps = Math.round(((want - e0) / Math.PI) * 6);
    steps = ((steps % 12) + 12) % 12;

    var local = ss.verts[ss.edges[shapeEdge][0]];
    var rlocal = rotPoint(local, steps);
    return { shape: shapeName, x: b.x - rlocal.x, y: b.y - rlocal.y, rot: steps };
  }

  /* --- Card matching ------------------------------------------------------ */
  /* Match tolerance is deliberately >= SNAP_RADIUS (bestSnap): a piece snapped
     by a vertex can sit up to a full snap radius away from the target's
     centroid, and success feedback must never be stricter than the snap. */
  var SNAP_RADIUS = 0.42;
  var MATCH_TOL = 0.45;

  function samePlacement(placed, target) {
    if (placed.shape !== target.shape) return false;
    var dx = placed.x - target.x, dy = placed.y - target.y;
    if (dx * dx + dy * dy > MATCH_TOL * MATCH_TOL) return false;
    var sym = SHAPES[placed.shape].symSteps;
    var dr = ((placed.rot - target.rot) % 12 + 12) % 12;
    return dr % sym === 0;
  }

  function cardComplete(pieces, targets) {
    var used = {};
    for (var t = 0; t < targets.length; t++) {
      var found = false;
      for (var p = 0; p < pieces.length; p++) {
        if (used[p]) continue;
        if (samePlacement(pieces[p], targets[t])) { used[p] = true; found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  }

  /* --- Bounds ------------------------------------------------------------- */
  function bounds(pieces) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pieces.length; i++) {
      var vs = worldVerts(pieces[i]);
      for (var j = 0; j < vs.length; j++) {
        if (vs[j].x < minX) minX = vs[j].x;
        if (vs[j].x > maxX) maxX = vs[j].x;
        if (vs[j].y < minY) minY = vs[j].y;
        if (vs[j].y > maxY) maxY = vs[j].y;
      }
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY,
             w: maxX - minX, h: maxY - minY };
  }

  var api = {
    SHAPES: SHAPES,
    TRAY_ORDER: TRAY_ORDER,
    ROT: ROT,
    SQ3: SQ3,
    rotPoint: rotPoint,
    worldVerts: worldVerts,
    piecePath: piecePath,
    snapPoints: snapPoints,
    bestSnap: bestSnap,
    pointInPiece: pointInPiece,
    pieceAt: pieceAt,
    basePiece: basePiece,
    attachOutside: attachOutside,
    samePlacement: samePlacement,
    cardComplete: cardComplete,
    bounds: bounds,
    SNAP_RADIUS: SNAP_RADIUS,
    MATCH_TOL: MATCH_TOL,
  };

  root.PatternBlocksGeometry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
