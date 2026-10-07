/* ROOM LABEL: the shared name bubble for every Discovery Room. See room-label.css.
   Byte-identical copies live in other apps (word-book/room-label.js); do not edit one alone.

     RoomLabel.attach(stageEl, items, { avoid: ['.music-btn', ...] }) -> { show(item), hide(), set(items), bubble }
     avoid = selectors of fixed chrome (back, Room/Cards switch, music toggle): no-go zones for the bubble.
     item = { el: <the active landmark link/button>,
              text: 'Toy Guitar',
              anchor: { x0, x1, y0, y1 },         // the object's box, percent of the stage
              group: 'music',                     // optional: boxes of one landmark don't count as 'other'
              accent: ['#edge', '#base'] }        // optional pastel outline + soft base

   Only landmarks passed in get a bubble: a decorative or future landmark is simply not an item,
   so it stays completely inert. Shown on mouse hover, keyboard focus-visible and press; hidden on
   leave, blur, Escape and a press elsewhere. The bubble sits above its object, centred, and only
   moves (to an edge, below, beside) when above would leave the stage, hit the chrome or sit on
   another landmark. Touch: a press shows it and the landmark's own tap
   still opens the destination at once (nothing here waits for, or needs, a hover). */
(function (root) {
  'use strict';
  var THAI = /[฀-๿]/;
  var PAD = 4;

  function attach(stage, items, opts) {
    opts = opts || {};
    /* Attached again (a room that redraws its landmarks): keep the one bubble, swap the items. */
    if (stage.__roomLabel) { stage.__roomLabel.set(items); return stage.__roomLabel; }
    try { if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative'; } catch (err) {}
    var b = document.createElement('span');
    b.className = 'room-label';
    b.setAttribute('aria-hidden', 'true');
    stage.appendChild(b);
    var current = null;

    /* Pixel rect of an element in the stage's own coordinates (no-go zones: fixed chrome). */
    function chromeRects() {
      var out = [], sr = stage.getBoundingClientRect();
      (opts.avoid || []).forEach(function (sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
          var r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          out.push({ l: r.left - sr.left - 6, t: r.top - sr.top - 6, r: r.right - sr.left + 6, b: r.bottom - sr.top + 6 });
        });
      });
      return out;
    }
    function overlap(p, q) {
      var w = Math.min(p.r, q.r) - Math.max(p.l, q.l), h = Math.min(p.b, q.b) - Math.max(p.t, q.t);
      return w > 0 && h > 0 ? w * h : 0;
    }

    /* Where the bubble goes. Preferred: ABOVE the object, centred on it (the main room's own
       placement). Only when that is not clean does it try the object's left or right edge, then
       below, then beside. "Clean" = inside the stage, clear of the fixed chrome, and clear of
       every OTHER landmark's box. The best-scoring candidate wins if none is clean. */
    function place(item) {
      var a = item.anchor, W = stage.clientWidth, H = stage.clientHeight;
      b.textContent = item.text;
      b.lang = THAI.test(item.text) ? 'th' : 'en';
      if (item.accent) {
        b.style.setProperty('--rl-edge', item.accent[0]);
        b.style.setProperty('--rl-base', item.accent[1] || item.accent[0]);
      } else {
        b.style.removeProperty('--rl-edge');
        b.style.removeProperty('--rl-base');
      }
      var w = b.offsetWidth, h = b.offsetHeight;
      var y0 = (a.y0 != null ? a.y0 : a.y) / 100 * H, y1 = (a.y1 != null ? a.y1 : (a.y0 != null ? a.y0 : a.y)) / 100 * H;
      var x0 = a.x0 / 100 * W, x1 = a.x1 / 100 * W, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      var chrome = chromeRects(), others = [];
      items.forEach(function (o) {
        if (o === item || (item.group && o.group === item.group)) return;
        var q = o.anchor, oy0 = q.y0 != null ? q.y0 : q.y, oy1 = q.y1 != null ? q.y1 : oy0;
        others.push({ l: q.x0 / 100 * W, r: q.x1 / 100 * W, t: oy0 / 100 * H, b: oy1 / 100 * H });
      });
      var ups = [y0 - 0.78 * h], ins = [y0 + 0.18 * h], downs = [y1 - 0.22 * h];   /* above overlaps the top edge by 22%; inside-top is the old near-the-ceiling case; below overlaps the bottom edge by 22% */
      var lefts = [cx - w / 2, x0, x1 - w, cx - w / 2 - 0.3 * w, cx - w / 2 + 0.3 * w, cx - w / 2 - 0.6 * w, cx - w / 2 + 0.6 * w];
      var cands = [];
      lefts.forEach(function (l) { cands.push([l, ups[0]]); });
      lefts.forEach(function (l) { cands.push([l, ins[0]]); });
      lefts.forEach(function (l) { cands.push([l, downs[0]]); });
      cands.push([x1 + 6, cy - h / 2], [x0 - w - 6, cy - h / 2]);
      /* Last resort: a ring of positions that still touch (or nearly touch) the object itself,
         nearest the preferred spot first, so a crowded corner finds a clear patch beside it. */
      var ring = [];
      for (var dy = -1.6; dy <= 1.6; dy += 0.2) for (var dx = -1.6; dx <= 1.6; dx += 0.2) {
        var rl = cx - w / 2 + dx * w, rt = y0 - 0.78 * h + dy * h;
        var gx = Math.max(x0 - (rl + w), rl - x1, 0), gy = Math.max(y0 - (rt + h), rt - y1, 0);
        if (Math.max(gx, gy) <= 0.4 * h) ring.push([rl, rt, Math.abs(dx) + Math.abs(dy)]);
      }
      ring.sort(function (p, q) { return p[2] - q[2]; });
      ring.forEach(function (p) { cands.push([p[0], p[1]]); });
      var best = null;
      cands.forEach(function (c, i) {
        var l = c[0], t = c[1];
        var out = Math.max(0, PAD - l) + Math.max(0, l + w - (W - PAD)) + Math.max(0, PAD - t) + Math.max(0, t + h - (H - PAD));
        var cl = Math.max(PAD, Math.min(W - w - PAD, l)), ct = Math.max(PAD, Math.min(H - h - PAD, t));
        var r = { l: cl, t: ct, r: cl + w, b: ct + h }, hit = 0;
        chrome.forEach(function (q) { hit += overlap(r, q) * 50; });
        others.forEach(function (q) { hit += overlap(r, q) * 10; });
        var score = hit + out * 400 + i;       /* earlier candidates win ties: above first */
        if (!best || score < best.score) best = { score: score, l: cl, t: ct };
      });
      b.style.left = best.l + 'px';
      b.style.top = best.t + 'px';
    }
    function show(item) {
      if (!item) return;
      current = item;
      place(item);
      b.classList.add('show');
    }
    function hide(item) {
      if (item && item !== current) return;
      current = null;
      b.classList.remove('show');
    }

    function set(list) {
      hide();
      list.forEach(function (item) {
        var el = item.el;
        el.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') show(item); });
        el.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') hide(item); });
        el.addEventListener('pointerdown', function () { show(item); });
        el.addEventListener('pointercancel', function () { hide(item); });
        el.addEventListener('focus', function () {
          var vis = true;
          try { vis = el.matches(':focus-visible'); } catch (err) {}
          if (vis) show(item);
        });
        el.addEventListener('blur', function () { hide(item); });
      });
    }
    set(items);
    stage.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    document.addEventListener('pointerdown', function (e) {
      if (!current) return;
      if (current.el.contains(e.target)) return;
      hide();
    }, true);
    window.addEventListener('resize', function () { if (current) place(current); });
    var ctrl = { show: show, hide: function () { hide(); }, set: set, bubble: b };
    stage.__roomLabel = ctrl;
    return ctrl;
  }

  root.RoomLabel = { attach: attach };
})(window);
