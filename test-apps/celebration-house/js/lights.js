/* Celebration House — light-string renderer.
 *
 * Light strings are DATA (a path plus settings), never pictures: every frame
 * the bulbs are placed along the path in scene units and drawn on one
 * screen-sized canvas. Drawing in screen space keeps bulbs crisp at any zoom,
 * and one canvas for every strand is what keeps an older iPad smooth.
 *
 * Glow is a cached radial sprite per colour drawn with additive blending —
 * far cheaper than a CSS/SVG blur filter per bulb.
 */
(function (root) {
  "use strict";
  var G = root.CHGeom;

  /* Style presets in scene units. A bulb's size and spacing multiply these. */
  var STYLE = {
    fairy:  { spacing: 24, r: 4.6, glow: 26 },
    globe:  { spacing: 58, r: 13,  glow: 62 },
    star:   { spacing: 40, r: 11,  glow: 42 },
    icicle: { spacing: 22, r: 4.4, glow: 24 }
  };

  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbToHex(c) { return "#" + c.map(function (v) { var s = Math.round(Math.max(0, Math.min(255, v))).toString(16); return s.length < 2 ? "0" + s : s; }).join(""); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  var glowCache = new Map();
  function glowSprite(rgb) {
    var q = rgb.map(function (v) { return Math.round(v / 16) * 16; });
    var key = q.join(",");
    var c = glowCache.get(key);
    if (c) return c;
    if (glowCache.size > 400) glowCache.clear();
    c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    var col = q.map(function (v) { return Math.min(255, v); }).join(",");
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.12, "rgba(" + col + ",0.85)");
    grad.addColorStop(0.4, "rgba(" + col + ",0.32)");
    grad.addColorStop(1, "rgba(" + col + ",0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(key, c);
    return c;
  }

  function starPath(ctx, x, y, r, points, inner, rot) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var rr = i % 2 ? r * inner : r, a = rot + i * Math.PI / points - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cache = new Map();
    this.w = 0; this.h = 0; this.dpr = 1;
  }

  Renderer.prototype.resize = function (w, h) {
    this.dpr = Math.min(2, root.devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
  };

  /* Bulb positions depend only on geometry, so they are cached per strand and
   * recomputed only when the path, style or spacing changes. */
  Renderer.prototype.layout = function (s) {
    var key = JSON.stringify([s.mode, s.pts, s.sag, s.style, s.spacing]);
    var hit = s.id && this.cache.get(s.id);
    if (hit && hit.key === key) return hit;
    var st = STYLE[s.style] || STYLE.fairy;
    var line = G.strandLine(s);
    var out = { key: key, line: line, bulbs: G.resample(line, st.spacing * s.spacing) };
    if (s.id) this.cache.set(s.id, out);
    return out;
  };

  Renderer.prototype.colourAt = function (s, i, t) {
    var pal = s.colorMode === "multi" ? (s.palette || this.multi) : [s.color];
    if (s.effect !== "fade") return hexToRgb(pal[i % pal.length]);
    /* Slow colour fading: each bulb drifts through the palette (multi) or
     * breathes between its colour and a warm white (single). ~7 s per step. */
    var seq = pal.length > 1 ? pal : [pal[0], rgbToHex(mix(hexToRgb(pal[0]), [255, 244, 214], 0.65))];
    var u = t / 7 + i * 0.11, k = Math.floor(u), f = u - k;
    f = f * f * (3 - 2 * f);
    return mix(hexToRgb(seq[k % seq.length]), hexToRgb(seq[(k + 1) % seq.length]), f);
  };

  Renderer.prototype.brightness = function (s, i, t) {
    if (s.effect !== "twinkle") return 1;
    /* Gentle: each bulb on its own 3–6 s cycle, never below 40%. */
    var p = hash(i + 1), w = 1.0 + hash(i + 7) * 1.1;
    return 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * w + p * 6.283));
  };

  Renderer.prototype.draw = function (o) {
    var ctx = this.ctx, v = o.view, doc = o.doc, t = o.time, dpr = this.dpr;
    this.multi = o.multi;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    var glowK = doc.night ? 1 : 0.32;
    var self = this;

    /* Lit windows of the house itself: warm, steady, night only. */
    if (doc.night && o.windows) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.75;
      o.windows.forEach(function (w) {
        var p = G.toScreen(v, w[0], w[1]), R = w[2] * v.k;
        ctx.drawImage(glowSprite([255, 200, 110]), p[0] - R, p[1] - R, 2 * R, 2 * R);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    /* Decorations that give light (candles, lanterns) glow at night. */
    if (doc.master && o.decoGlows) {
      ctx.globalCompositeOperation = "lighter";
      o.decoGlows.forEach(function (g) {
        var p = G.toScreen(v, g.x, g.y), R = g.r * v.k * (doc.night ? 1 : 0.55);
        if (R < 2 || p[0] < -R || p[1] < -R || p[0] > self.w + R || p[1] > self.h + R) return;
        var flick = 0.85 + 0.15 * Math.sin(t * 2.3 + g.x);
        ctx.globalAlpha = (doc.night ? 0.9 : 0.35) * flick;
        ctx.drawImage(glowSprite(hexToRgb(g.color)), p[0] - R, p[1] - R, 2 * R, 2 * R);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    var strands = doc.strands.slice();
    if (o.preview) strands.push(o.preview);
    strands.forEach(function (s) {
      self.drawStrand(s, v, t, doc.master && s.on, glowK, s === o.preview, s.id && s.id === o.selectedId);
    });
    (o.toppers || []).forEach(function (tp) { self.drawTopper(tp, v, t, doc.master && tp.state.on, glowK, tp.selected); });
  };

  Renderer.prototype.drawStrand = function (s, v, t, lit, glowK, isPreview, selected) {
    var ctx = this.ctx, st = STYLE[s.style] || STYLE.fairy, lay = this.layout(s);
    var k = v.k, r = Math.max(1.2, st.r * s.size * k), R = Math.max(4, st.glow * s.size * k);
    var self = this, line = lay.line;
    var margin = R + (s.style === "icicle" ? 90 * k : 0);

    if (selected) {
      ctx.beginPath();
      line.forEach(function (p, i) { var q = G.toScreen(v, p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = Math.max(10, r * 3.2);
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.stroke();
    }
    if (isPreview) ctx.globalAlpha = 0.75;

    /* The wire. */
    ctx.beginPath();
    line.forEach(function (p, i) { var q = G.toScreen(v, p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.strokeStyle = "#24402c";
    ctx.lineWidth = Math.max(1, 2.4 * k * s.size);
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.stroke();

    /* Bulb centres in screen space (icicles hang below the wire). */
    var pts = [];
    lay.bulbs.forEach(function (b, i) {
      var q = G.toScreen(v, b.x, b.y);
      if (s.style === "icicle") {
        var drop = (14 + Math.floor(hash(i + 3) * 4) * 16) * s.size * k;
        ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0], q[1] + drop);
        ctx.lineWidth = Math.max(0.8, 1.4 * k * s.size); ctx.stroke();
        pts.push({ x: q[0], y: q[1] + drop, a: Math.PI / 2, i: i });
        if (drop > 40 * k * s.size) pts.push({ x: q[0], y: q[1] + drop * 0.5, a: Math.PI / 2, i: i + 1000 });
      } else {
        pts.push({ x: q[0], y: q[1], a: b.a, i: i });
      }
    });
    var W = this.w, H = this.h;
    pts = pts.filter(function (p) { return p.x > -margin && p.y > -margin && p.x < W + margin && p.y < H + margin; });

    if (lit) {
      ctx.globalCompositeOperation = "lighter";
      pts.forEach(function (p) {
        var c = self.colourAt(s, p.i % 1000, t), b = self.brightness(s, p.i, t);
        ctx.globalAlpha = (isPreview ? 0.6 : 1) * b * glowK;
        ctx.drawImage(glowSprite(c), p.x - R, p.y - R, 2 * R, 2 * R);
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = isPreview ? 0.75 : 1;
    }

    pts.forEach(function (p) {
      var c = self.colourAt(s, p.i % 1000, t), b = lit ? self.brightness(s, p.i, t) : 0;
      var body = lit ? rgbToHex(mix(c, [255, 255, 255], 0.15 + 0.25 * b)) : rgbToHex(mix(c, [120, 120, 130], 0.6));
      var core = lit ? "rgba(255,255,250," + (0.55 + 0.45 * b) + ")" : "rgba(255,255,255,0.35)";
      ctx.fillStyle = body;
      ctx.strokeStyle = "rgba(30,40,30,0.55)";
      ctx.lineWidth = Math.max(0.6, r * 0.12);
      if (s.style === "star") {
        starPath(ctx, p.x, p.y, r, 5, 0.48, p.a + Math.PI / 2);
        ctx.fill(); if (r > 4) ctx.stroke();
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.28, 0, 6.283); ctx.fill();
      } else if (s.style === "globe") {
        /* A round bulb with its socket on the wire side, perpendicular to it. */
        var nx = Math.cos(p.a + Math.PI / 2), ny = Math.sin(p.a + Math.PI / 2);
        var cx = p.x + nx * r * 0.9, cy = p.y + ny * r * 0.9;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = "#3a4a3c"; ctx.fillRect(-r * 0.32, -r * 0.1, r * 0.64, r * 0.5);
        ctx.restore();
        ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill(); if (r > 4) ctx.stroke();
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.34, 0, 6.283); ctx.fill();
      } else {
        /* Fairy and icicle: a small rice bulb lying along the wire. */
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.75, 0, 0, 6.283); ctx.fill(); if (r > 4) ctx.stroke();
        ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.32, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
    });
    ctx.globalAlpha = 1;
  };

  /* A tree topper is a light object of its own: own switch, own colour. */
  Renderer.prototype.drawTopper = function (tp, v, t, lit, glowK, selected) {
    var ctx = this.ctx, st = tp.state, p = G.toScreen(v, tp.anchor[0], tp.anchor[1]);
    var r = tp.size / 2 * v.k, c = hexToRgb(st.color);
    if (selected) {
      ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.5 + 6, 0, 6.283);
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 5; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (lit) {
      var breathe = 0.85 + 0.15 * Math.sin(t * 1.3), R = r * 4.2 * breathe;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.max(0.45, glowK);
      ctx.drawImage(glowSprite(c), p[0] - R, p[1] - R, 2 * R, 2 * R);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    var body = lit ? rgbToHex(mix(c, [255, 255, 255], 0.3)) : rgbToHex(mix(c, [150, 150, 150], 0.55));
    ctx.fillStyle = body; ctx.strokeStyle = "#4a3426"; ctx.lineWidth = Math.max(1, 3 * v.k);
    if (st.design === "burst") starPath(ctx, p[0], p[1], r, 8, 0.5, 0);
    else if (st.design === "snowstar") starPath(ctx, p[0], p[1], r, 6, 0.38, 0);
    else starPath(ctx, p[0], p[1], r, 5, 0.46, 0);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = lit ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.22, 0, 6.283); ctx.fill();
  };

  Renderer.prototype.forget = function (id) { this.cache.delete(id); };

  root.CHLights = { Renderer: Renderer, STYLE: STYLE };
})(window);
