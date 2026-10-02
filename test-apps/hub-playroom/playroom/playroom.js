/* The playroom hub: draws the CATEGORIES in destinations.js as doors over the room picture,
   and every APP as the card grid (the Cards view). Nothing in here names a game or a category. */
(function () {
  'use strict';
  var R = window.PLAYROOM, L = R.lib;
  var scene = document.getElementById('scene');
  var img = document.getElementById('sceneImg');
  var grid = document.getElementById('cardGrid');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THAI = /[\u0E00-\u0E7F]/;

  function cssUrl(u) { return 'url("' + String(u).replace(/"/g, '%22') + '")'; }

  /* The picture and its shape. Everything else is in percent of it. */
  var imageUrl = L.abs(R.image);
  img.src = imageUrl;
  document.documentElement.style.setProperty('--ar', String(R.width / R.height));
  document.getElementById('backdrop').style.backgroundImage = cssUrl(imageUrl);

  /* ── THE ROOM: one door per category, one tap area per object ── */
  R.categories.forEach(function (c) {
    var door = L.door(c);
    /* What the door says to a screen reader: the category, and what is behind it. */
    var label = c.name + ' — ' + (door.kind === 'app' ? door.app.name + ': ' + door.app.desc
              : door.kind === 'page' ? door.apps.map(function (a) { return a.name; }).join(', ')
              : c.tagline);
    c.boxes.forEach(function (bx, k) {
      var x = bx[0], y = bx[1], w = bx[2], h = bx[3];
      var a = document.createElement('a');
      a.className = 'spot' + (bx[4] === 'ellipse' ? ' ellipse' : '');
      a.href = door.href;
      a.id = 'spot-' + c.id + (k ? '-' + (k + 1) : '');
      a.dataset.id = c.id;
      a.dataset.kind = door.kind;
      a.setAttribute('aria-label', label);
      /* A second object of the same category is a second tap area, not a second door:
         keyboard and screen reader meet each category once, at its first object. */
      if (k) { a.tabIndex = -1; a.setAttribute('aria-hidden', 'true'); }
      if (THAI.test(c.name)) a.lang = 'th';
      a.style.left = x + '%'; a.style.top = y + '%';
      a.style.width = w + '%'; a.style.height = h + '%';

      /* The object itself, cut from the same picture so it can rise when touched. */
      var lift = document.createElement('span');
      lift.className = 'lift';
      lift.setAttribute('aria-hidden', 'true');
      lift.style.backgroundImage = cssUrl(imageUrl);
      lift.style.backgroundSize = (10000 / w) + '% ' + (10000 / h) + '%';
      lift.style.backgroundPosition = (w >= 100 ? 0 : x / (100 - w) * 100) + '% ' +
                                      (h >= 100 ? 0 : y / (100 - h) * 100) + '%';
      a.appendChild(lift);

      /* The name, near the object. Above it, unless the object is at the top of the room;
         pinned to its left or right edge when centring it would run off the picture. */
      var b = document.createElement('span');
      b.className = 'bubble' + (y < 12 ? ' below' : '') +
                    (x + w / 2 < 12 ? ' start' : (x + w / 2 > 88 ? ' end' : ''));
      b.setAttribute('aria-hidden', 'true');
      b.lang = THAI.test(c.name) ? 'th' : 'en';
      b.textContent = c.name;
      a.appendChild(b);

      scene.appendChild(a);
    });
  });

  /* ── THE CARDS: every app, exactly as index.html draws a card ── */
  R.apps.forEach(function (d) {
    var c = document.createElement('a');
    c.className = 'card';
    c.href = L.app(d.href);
    c.id = 'card-' + d.id;
    c.dataset.id = d.id;
    if (d.tone) {
      c.style.setProperty('--edge', d.tone[0]);
      c.style.setProperty('--shadow', d.tone[1]);
      c.style.setProperty('--tint', d.tone[2]);
    }
    var art = document.createElement('span');
    art.className = 'art';
    if (d.tile) {
      var t = document.createElement('img');
      t.src = L.app(d.tile);
      t.alt = ''; t.width = 96; t.height = 96;
      t.loading = 'lazy'; t.decoding = 'async';
      if (!d.cutout) t.className = 'tile';
      art.appendChild(t);
    }
    var n = document.createElement('span');
    n.className = 'name';
    n.textContent = d.name;
    if (THAI.test(d.name)) n.lang = 'th';
    var ds = document.createElement('span');
    ds.className = 'desc';
    ds.textContent = d.desc;
    c.appendChild(art); c.appendChild(n); c.appendChild(ds);
    grid.appendChild(c);
  });

  /* ── ROOM OR CARDS ── owner, 2026-10-02: "add the 'card view' too pls." The room is the
     default; the last choice made with the switch is remembered on this device, and the page
     works the same when storage is unavailable (private mode) — it just starts in the room. */
  var VIEW_KEY = 'ca_hub_view';
  var room = document.getElementById('roomView');
  var cards = document.getElementById('cardsView');
  var buttons = document.querySelectorAll('.view-btn');
  function show(view, remember) {
    if (view !== 'cards') view = 'room';
    room.hidden = view !== 'room';
    cards.hidden = view !== 'cards';
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute('aria-pressed', b.dataset.view === view ? 'true' : 'false');
    });
    document.documentElement.setAttribute('data-view', view);
    if (remember) { try { localStorage.setItem(VIEW_KEY, view); } catch (e) {} }
  }
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () { show(b.dataset.view, true); });
  });
  var saved = null;
  try { saved = localStorage.getItem(VIEW_KEY); } catch (e) {}
  show(saved, false);

  /* ── PRESS, THEN GO ──
     A child must never need two taps: the first tap opens the door. But a tap that navigates
     instantly is never seen to land, so the object lights, bounces and names itself first,
     and the page goes a moment later. Modified clicks (new tab) are left to the browser; a
     keyboard Enter goes at once. The toy box does not navigate: it opens the card view (and
     does not change the remembered choice — the room stays home). */
  var going = false;
  function clear() {
    going = false;
    Array.prototype.forEach.call(scene.querySelectorAll('.spot.on'), function (s) { s.classList.remove('on'); });
  }
  scene.addEventListener('pointerdown', function (e) {
    var s = e.target.closest && e.target.closest('.spot');
    if (!s || going) return;
    clear();
    s.classList.add('on');
  });
  scene.addEventListener('pointercancel', function () { if (!going) clear(); });
  scene.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !going) clear(); });
  scene.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('.spot');
    if (!s) return;
    var toCards = s.dataset.kind === 'cards';
    if (!toCards && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    if (e.detail === 0) {                 /* keyboard Enter: at once */
      if (toCards) { e.preventDefault(); show('cards', false); }
      return;
    }
    e.preventDefault();
    if (going) return;
    going = true;
    s.classList.add('on');
    var href = s.href;
    setTimeout(function () {
      if (toCards) { clear(); show('cards', false); }
      else window.location.assign(href);
    }, reduced ? 120 : 320);
  });
  /* Coming Back from a game restores this page from the back-forward cache, lit as it was left. */
  window.addEventListener('pageshow', function (e) { if (e.persisted) clear(); });

  /* Read-only, for verification. */
  window.Playroom = { data: R, show: show };
})();

/* ══ HUB MUSIC ══ — the code from index.html, unchanged except that the file's path comes from
   destinations.js (so the Test Hub copy can play the live file instead of shipping a second
   copy of the track). Off by default, remembered under the same key as the card hub, so the
   two pages share one preference. See index.html for the full reasoning. */
var Music = (function () {
  var SRC = (window.PLAYROOM && window.PLAYROOM.music) || './audio/hub-bed.m4a';
  var KEY = 'ca_music';
  var FULL = 0.22;             /* resting level: present in a quiet room, never in front */
  var RAMP_MS = 900, STEP_MS = 50;
  var el = null, ramp = 0, armed = false, pref = false;
  try { pref = localStorage.getItem(KEY) === '1'; } catch (e) {}

  var btn = document.getElementById('musicBtn');

  function paint() {
    btn.setAttribute('aria-pressed', pref ? 'true' : 'false');
    btn.setAttribute('aria-label', pref ? 'Stop music' : 'Play music');
    btn.classList.toggle('playing', !!(el && !el.paused));
  }

  function fadeTo(v, thenPause) {
    if (!el) return;
    if (ramp) { clearInterval(ramp); ramp = 0; }
    var from = el.volume, steps = Math.max(1, Math.round(RAMP_MS / STEP_MS)), i = 0;
    ramp = setInterval(function () {
      i++;
      try { el.volume = Math.max(0, Math.min(1, from + (v - from) * (i / steps))); } catch (e) {}
      if (i >= steps) {
        clearInterval(ramp); ramp = 0;
        if (thenPause && el) { try { el.pause(); } catch (e) {} }
        paint();
      }
    }, STEP_MS);
  }

  function arm() {
    if (armed) return;
    armed = true;
    var go = function () {
      window.removeEventListener('pointerdown', go, true);
      armed = false;
      apply();
    };
    window.addEventListener('pointerdown', go, true);
  }

  function apply() {
    if (!pref) {
      if (el && !el.paused) fadeTo(0, true); else paint();
      return;
    }
    if (!el) {
      try { el = new Audio(SRC); } catch (e) { return; }
      el.loop = true;
      el.preload = 'none';
      el.volume = 0;
      el.addEventListener('playing', paint);
      el.addEventListener('pause', paint);
    }
    el.volume = 0;
    var p;
    try { p = el.play(); } catch (e) { arm(); return; }
    if (p && p.then) p.then(function () { fadeTo(FULL, false); paint(); }).catch(arm);
    else { fadeTo(FULL, false); paint(); }
  }

  btn.addEventListener('click', function () {
    pref = !pref;
    try { localStorage.setItem(KEY, pref ? '1' : '0'); } catch (e) {}
    apply();
    paint();
  });

  paint();
  apply();

  return { state: function () {
    return { pref: pref, exists: !!el, playing: !!(el && !el.paused),
             volume: el ? +el.volume.toFixed(3) : null, armed: armed, src: SRC };
  } };
})();
