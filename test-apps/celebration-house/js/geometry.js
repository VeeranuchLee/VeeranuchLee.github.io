/* Celebration House — strand and transform geometry.
 *
 * Pure functions only: no DOM, no canvas. Everything here works in SCENE units
 * (the house's own coordinate system, independent of screen pixels and zoom),
 * which is what lets tools/test-geometry.cjs check it under plain node.
 */
(function (root) {
  "use strict";

  function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

  /* A strand hung between two points droops. A parabola through both ends with
   * its lowest point `sag` below the chord's midpoint reads as a natural hang at
   * the sizes children make, and unlike a true catenary it has a closed form. */
  function hangCurve(a, b, sag, steps) {
    var n = Math.max(2, steps || 24), out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * sag * t * (1 - t)]);
    }
    return out;
  }

  /* Smooth a child's control points with a centripetal-ish Catmull-Rom so a
   * strand drawn in five wobbly strokes still reads as one soft line. */
  function catmullRom(pts, perSeg) {
    if (pts.length < 3) return pts.map(function (p) { return [p[0], p[1]]; });
    var m = perSeg || 8, out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (var j = 0; j < m; j++) {
        var t = j / m, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    var last = pts[pts.length - 1];
    out.push([last[0], last[1]]);
    return out;
  }

  /* Ramer–Douglas–Peucker: a finger-drawn path arrives as hundreds of points;
   * keep the handful that carry its shape, which become the editable handles. */
  function simplify(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var first = pts[0], last = pts[pts.length - 1], idx = -1, best = 0;
    for (var i = 1; i < pts.length - 1; i++) {
      var d = segDist(pts[i], first, last);
      if (d > best) { best = d; idx = i; }
    }
    if (best > eps) {
      var left = simplify(pts.slice(0, idx + 1), eps), right = simplify(pts.slice(idx), eps);
      return left.slice(0, -1).concat(right);
    }
    return [first, last];
  }

  function segDist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    if (!l2) return dist(p, a);
    var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    return dist(p, [a[0] + t * dx, a[1] + t * dy]);
  }

  function polyDist(p, poly) {
    var best = Infinity;
    for (var i = 0; i < poly.length - 1; i++) best = Math.min(best, segDist(p, poly[i], poly[i + 1]));
    return best;
  }

  /* The visible line a strand follows, from its stored control data. */
  function strandLine(s) {
    if (s.mode === "hang") return hangCurve(s.pts[0], s.pts[1], s.sag || 0, 28);
    return catmullRom(s.pts, 10);
  }

  /* Bulbs every `spacing` scene units along the line, each with its tangent
   * angle so a bulb sits ALONG the wire rather than as a flat dot. */
  function resample(line, spacing) {
    var out = [], carry = spacing / 2;
    if (!(spacing > 0) || line.length < 2) return out;
    for (var i = 0; i < line.length - 1; i++) {
      var a = line[i], b = line[i + 1], len = dist(a, b);
      if (!len) continue;
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), d = carry;
      while (d <= len) {
        var t = d / len;
        out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: ang });
        if (out.length > 4000) return out;   // a runaway spacing must never hang the iPad
        d += spacing;
      }
      carry = d - len;
    }
    return out;
  }

  function lineLength(line) {
    var l = 0;
    for (var i = 0; i < line.length - 1; i++) l += dist(line[i], line[i + 1]);
    return l;
  }

  /* A zig-zag across the front of a cone, top to bottom: how a child would
   * drape lights over a tree. It is an ordinary path strand afterwards. */
  function treeWrap(w) {
    var pts = [], rows = w.rows || 5;
    for (var i = 0; i <= rows; i++) {
      var t = (i + 0.35) / (rows + 0.35);
      var y = w.apex[1] + (w.baseY - w.apex[1]) * t;
      var half = w.baseHalfWidth * t * 0.92;
      pts.push([w.apex[0] + (i % 2 ? half : -half), y + (i % 2 ? 1 : -1) * half * 0.12]);
    }
    return pts;
  }


  /* Branch tips on a tree cone, row by row: where an ornament's loop can hook.
   * Derived from the same cone data as the light wrap, so no extra art data. */
  function treeBranchPoints(w, spacing) {
    var pts = [], rows = Math.max(2, w.rows || 5), sp = spacing || 64;
    var top = w.apex[1] + 50, bot = w.baseY - 30;
    for (var i = 0; i < rows; i++) {
      var y = top + (bot - top) * i / (rows - 1);
      var half = w.baseHalfWidth * (y - w.apex[1]) / (w.baseY - w.apex[1]) - 16;
      if (half < sp / 2) { pts.push([w.apex[0], Math.round(y)]); continue; }
      var n = Math.max(1, Math.round(2 * half / sp));
      for (var j = 0; j <= n; j++) pts.push([Math.round(w.apex[0] - half + 2 * half * j / n), Math.round(y)]);
    }
    return pts;
  }

  /* Gentle snapping. `d` is a placed decoration (scene units), `def` its
   * library entry (w, h, snap, hang), `targets` the snap targets in reach:
   *   { type, point: [x, y] }            tree branch tips, wall hooks
   *   { type, line: [x1, x2, y], hangY } floors, mantels/shelves, window sills
   * Returns the nearest target within `tol` as { x, y, r, dist, cue } or null.
   * Only items held roughly upright snap (a tilted one is the child's choice),
   * and a snap straightens them. Free placement is everything else. */
  function findSnap(d, def, targets, tol) {
    var types = def && def.snap ? [].concat(def.snap) : [];
    if (!types.length) return null;
    var r = ((d.r % 360) + 540) % 360 - 180, upright = Math.abs(r) <= 20;
    var w = def.w * d.s, h = def.h * d.s, best = null;
    targets.forEach(function (t) {
      if (types.indexOf(t.type) < 0) return;
      var c = null;
      if (t.rect) {
        /* A region (the sky): an item poking out of it by less than `tol` is
         * eased back fully inside; one already inside is left exactly as it is,
         * tilt and all (a sleigh may swoop). */
        var R = t.rect, hw = Math.min(w / 2, R[2] / 2), hh = Math.min(h / 2, R[3] / 2);
        var cx = Math.max(R[0] + hw, Math.min(R[0] + R[2] - hw, d.x)), cy = Math.max(R[1] + hh, Math.min(R[1] + R[3] - hh, d.y));
        var dr = Math.hypot(cx - d.x, cy - d.y);
        if (dr > 0 && dr <= tol) c = { x: cx, y: cy, dist: dr, keepR: true, cue: { kind: "rect", rect: R.slice() } };
      } else if (!upright) {
        return;                                          // tilted on purpose: the child's choice
      } else if (t.point) {
        var hook = t.type === "tree";                      // ornaments hang by their loop
        var ay = hook ? d.y - h / 2 : d.y, dd = Math.hypot(d.x - t.point[0], ay - t.point[1]);
        if (dd <= tol) c = { x: t.point[0], y: hook ? t.point[1] + h / 2 : t.point[1], dist: dd, cue: { kind: "point", at: t.point.slice() } };
      } else if (t.line) {
        var x1 = t.line[0], x2 = t.line[1];
        if (d.x < x1 - w / 3 || d.x > x2 + w / 3) return;
        var hang = !!def.hang, ly = hang && t.hangY != null ? t.hangY : t.line[2];
        var edge = hang ? d.y - h / 2 : d.y + h / 2, dy = Math.abs(edge - ly);
        if (dy <= tol) {
          var x = Math.max(x1, Math.min(x2, d.x));
          c = { x: x, y: hang ? ly + h / 2 : ly - h / 2, dist: dy, cue: { kind: "line", from: [Math.max(x1, x - w / 2 - 24), ly], to: [Math.min(x2, x + w / 2 + 24), ly] } };
        }
      }
      if (c && (!best || c.dist < best.dist)) { c.r = c.keepR ? d.r : 0; delete c.keepR; c.type = t.type; best = c; }
    });
    if (best) { best.x = Math.round(best.x); best.y = Math.round(best.y); }
    return best;
  }

  /* Rotated-box hit test for a placed decoration (scene units). */
  function hitBox(p, d, w, h, pad) {
    var r = -(d.r || 0) * Math.PI / 180, dx = p[0] - d.x, dy = p[1] - d.y;
    var lx = dx * Math.cos(r) - dy * Math.sin(r), ly = dx * Math.sin(r) + dy * Math.cos(r);
    var hw = (w * d.s) / 2 + (pad || 0), hh = (h * d.s) / 2 + (pad || 0);
    return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
  }

  /* View math: screen = scene * k + (tx, ty). Zooming about a fixed screen
   * point keeps the scene point under the fingers still — which is why a
   * decoration never drifts during a pinch. */
  function zoomAbout(view, sx, sy, k) {
    var wx = (sx - view.tx) / view.k, wy = (sy - view.ty) / view.k;
    return { k: k, tx: sx - wx * k, ty: sy - wy * k };
  }

  function fitRect(rect, vw, vh, pad) {
    var p = pad || 0, k = Math.min((vw - 2 * p) / rect[2], (vh - 2 * p) / rect[3]);
    return { k: k, tx: (vw - rect[2] * k) / 2 - rect[0] * k, ty: (vh - rect[3] * k) / 2 - rect[1] * k };
  }

  function toScene(view, sx, sy) { return [(sx - view.tx) / view.k, (sy - view.ty) / view.k]; }
  function toScreen(view, wx, wy) { return [wx * view.k + view.tx, wy * view.k + view.ty]; }

  var api = {
    dist: dist, hangCurve: hangCurve, catmullRom: catmullRom, simplify: simplify, segDist: segDist,
    polyDist: polyDist, strandLine: strandLine, resample: resample, lineLength: lineLength,
    treeWrap: treeWrap, treeBranchPoints: treeBranchPoints, findSnap: findSnap, hitBox: hitBox, zoomAbout: zoomAbout, fitRect: fitRect, toScene: toScene, toScreen: toScreen
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CHGeom = api;
})(typeof window !== "undefined" ? window : globalThis);
