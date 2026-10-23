/*
 * Read & Write — the writing pad. A bounded copy of Writing Book's free-writing surface
 * (writing-book/strokes.js, mode 'free'), NOT a refactor of it: Writing Book is shipped and keeps
 * its own file. What is carried over, deliberately unchanged in spirit:
 *
 *   - an SVG surface in fixed viewBox units, so a page drawn in portrait re-renders exactly after a
 *     rotation to landscape (the SVG rescales; the points never need recomputing);
 *   - pointer events for finger AND Apple Pencil (pointerType 'pen'), with setPointerCapture so a
 *     line that slides off the paper keeps going, and a capture failure never loses the stroke;
 *   - one pointerdown -> pointerup = one kept gesture; undo takes back the last, clear takes all;
 *   - free mode grades nothing: the gesture IS the answer and it stays.
 *
 * Added here: handwriting-book ruling for 2–3 lines (dashed top, dashed middle, solid baseline),
 * light smoothing (quadratic curves through midpoints) and toPNG() for the reward picture.
 *
 * Touch: the surface is `touch-action: pinch-zoom` (INTERACTION-DIRECTION.md, method C layer 2) —
 * one finger draws and never pans the page; two fingers still pinch.
 */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var W = 1200;            // viewBox width
  var LINE_H = 240;        // one ruled line, viewBox units (default; options.lineHeight overrides)
  var INK = "#2f3a4d";
  var INK_W = 9;

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    return n;
  }

  function smooth(points) {
    if (!points.length) return "";
    var f = function (v) { return v.toFixed(1); };
    if (points.length === 1) {
      var p = points[0];   // a dot: a tiny segment so the round cap shows
      return "M " + f(p.x) + " " + f(p.y) + " L " + f(p.x + 0.1) + " " + f(p.y + 0.1);
    }
    var d = "M " + f(points[0].x) + " " + f(points[0].y);
    for (var i = 1; i < points.length - 1; i++) {
      var a = points[i], b = points[i + 1];
      d += " Q " + f(a.x) + " " + f(a.y) + " " + f((a.x + b.x) / 2) + " " + f((a.y + b.y) / 2);
    }
    var last = points[points.length - 1];
    d += " L " + f(last.x) + " " + f(last.y);
    return d;
  }

  function create(options) {
    var host = options.host;
    var lines = Math.max(1, Math.min(4, options.lines || 3));
    var LH = options.lineHeight || LINE_H;
    var H = lines * LH;
    // Ruling within one line, as fractions of its height: dashed top, dashed middle, solid baseline.
    var ASC = 0.2, MID = 0.5, BASE = 0.8;
    var onChange = options.onChange || function () {};

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "pad-svg", role: "img",
      "aria-label": "Writing paper. Write with your finger or pencil." });
    svg.style.aspectRatio = W + " / " + H;
    host.style.setProperty("--aspect", String(W / H));

    var rules = el("g", { class: "pad-rules" });
    for (var i = 0; i < lines; i++) {
      var top = i * LH;
      var asc = top + LH * ASC, mid = top + LH * MID, base = top + LH * BASE;
      rules.appendChild(el("line", { class: "rule rule-dash", x1: 24, x2: W - 24, y1: asc, y2: asc }));
      rules.appendChild(el("line", { class: "rule rule-mid", x1: 24, x2: W - 24, y1: mid, y2: mid }));
      rules.appendChild(el("line", { class: "rule rule-base", x1: 24, x2: W - 24, y1: base, y2: base }));
    }
    svg.appendChild(rules);
    var inkLayer = el("g", { class: "pad-ink" });
    svg.appendChild(inkLayer);
    host.appendChild(svg);

    var trail = [];          // kept gestures: { points, path }
    var drawing = null;
    var penSeen = false;     // palm rejection, as Writing Book does it: armed only once a Pencil has
                             // touched THIS pad, so a child writing with a finger is never locked out

    function toLocal(event) {
      var ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      var p = svg.createSVGPoint();
      p.x = event.clientX; p.y = event.clientY;
      var q = p.matrixTransform(ctm.inverse());
      return { x: Math.max(0, Math.min(W, q.x)), y: Math.max(0, Math.min(H, q.y)) };
    }

    function begin(event) {
      if (drawing) return;                       // one pen at a time; a second finger is ignored
      if (event.button !== undefined && event.button > 0) return;
      if (event.pointerType === "pen") penSeen = true;
      else if (penSeen && event.pointerType === "touch") return;
      try { svg.setPointerCapture(event.pointerId); } catch (e) { /* no capture */ }
      var path = el("path", { class: "ink", d: "", fill: "none", stroke: INK, "stroke-width": INK_W,
        "stroke-linecap": "round", "stroke-linejoin": "round" });
      inkLayer.appendChild(path);
      drawing = { points: [toLocal(event)], path: path, pointerId: event.pointerId };
      path.setAttribute("d", smooth(drawing.points));
      event.preventDefault();
    }
    function move(event) {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      var list = event.getCoalescedEvents ? event.getCoalescedEvents() : null;
      if (list && list.length) list.forEach(function (e) { drawing.points.push(toLocal(e)); });
      else drawing.points.push(toLocal(event));
      drawing.path.setAttribute("d", smooth(drawing.points));
      event.preventDefault();
    }
    function end(event) {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      var g = drawing;
      drawing = null;
      try { svg.releasePointerCapture(event.pointerId); } catch (e) { /* gone */ }
      trail.push(g);
      onChange(trail.length);
    }
    svg.addEventListener("pointerdown", begin);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);

    function undo() {
      var g = trail.pop();
      if (g && g.path.parentNode) g.path.parentNode.removeChild(g.path);
      onChange(trail.length);
    }
    function clear() {
      trail.forEach(function (g) { if (g.path.parentNode) g.path.parentNode.removeChild(g.path); });
      trail = [];
      onChange(0);
    }

    /* The page as a small PNG: cream paper, the ruling, the child's ink. Path2D takes the same path
       strings the SVG draws, so the picture is exactly what was on the glass. Returns null when the
       browser cannot (old engine, tainted canvas) — the caller finishes the day without a picture. */
    function toPNG(maxWidth) {
      try {
        var w = maxWidth || 600;
        var s = w / W;
        var c = document.createElement("canvas");
        c.width = Math.round(W * s); c.height = Math.round(H * s);
        var x = c.getContext("2d");
        if (!x || typeof Path2D === "undefined") return null;
        x.fillStyle = "#fffaf0"; x.fillRect(0, 0, c.width, c.height);
        x.scale(s, s);
        x.lineCap = "round";
        for (var i = 0; i < lines; i++) {
          var top = i * LH;
          x.strokeStyle = "#c9d6e8"; x.lineWidth = 3; x.setLineDash([16, 18]);
          [top + LH * ASC, top + LH * MID].forEach(function (y) { x.beginPath(); x.moveTo(24, y); x.lineTo(W - 24, y); x.stroke(); });
          x.setLineDash([]); x.strokeStyle = "#8fa6c8"; x.lineWidth = 4;
          x.beginPath(); x.moveTo(24, top + LH * BASE); x.lineTo(W - 24, top + LH * BASE); x.stroke();
        }
        x.strokeStyle = INK; x.lineWidth = INK_W; x.lineJoin = "round";
        trail.forEach(function (g) { x.stroke(new Path2D(smooth(g.points))); });
        return c.toDataURL("image/png");
      } catch (e) { return null; }
    }

    return {
      svg: svg,
      undo: undo,
      clear: clear,
      count: function () { return trail.length; },
      toPNG: toPNG,
      destroy: function () {
        svg.removeEventListener("pointerdown", begin);
        svg.removeEventListener("pointermove", move);
        svg.removeEventListener("pointerup", end);
        svg.removeEventListener("pointercancel", end);
        if (svg.parentNode) svg.parentNode.removeChild(svg);
      }
    };
  }

  window.RWWritePad = { create: create };
})();
