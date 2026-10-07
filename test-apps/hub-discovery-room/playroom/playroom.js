/* The Discovery Room hub: draws the LANDMARKS in destinations.js as doors over the room picture,
   and every APP as the card grid (the Cards view). Nothing in here names a game or a landmark.
   Room and Cards are two equal ways in (owner, 2026-10-07: the 7-year-old prefers the room, the
   4-year-old prefers the cards): both are drawn from the one list in destinations.js. */
(function () {
  'use strict';
  var R = window.PLAYROOM, L = R.lib;
  var scene = document.getElementById('scene');
  var img = document.getElementById('sceneImg');
  var grid = document.getElementById('cardGrid');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THAI = /[฀-๿]/;

  function cssUrl(u) { return 'url("' + String(u).replace(/"/g, '%22') + '")'; }

  /* The picture and its shape. Everything else is in percent of it. */
  var imageUrl = L.abs(R.image);
  img.src = imageUrl;
  document.documentElement.style.setProperty('--ar', String(R.width / R.height));
  document.getElementById('backdrop').style.backgroundImage = cssUrl(imageUrl);

  /* One card, drawn the same way in the Cards view and in a landmark's picker. */
  function makeCard(d, prefix) {
    var c = document.createElement('a');
    c.className = 'card';
    c.href = L.app(d.href);
    c.id = prefix + d.id;
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
    return c;
  }

  /* ── THE ROOM: one door per ACTIVE landmark ──
     An inactive landmark (a future area: Computer, Toy Box, Shop / Business) has no door() and
     draws NOTHING: no element, so no hover, no glow, no cursor, no focus stop, no aria role. */
  var landmarkById = {};
  R.landmarks.forEach(function (c) {
    var door = L.door(c);
    if (!door) return;
    landmarkById[c.id] = c;
    /* What the door says to a screen reader: the landmark, and what is behind it. */
    var label = c.name + ' — ' + (door.kind === 'app' ? door.app.name + ': ' + door.app.desc
              : (door.kind === 'page' || door.kind === 'picker') ? door.apps.map(function (a) { return a.name; }).join(', ')
              : c.tagline);
    c.boxes.forEach(function (bx, k) {
      var x = bx[0], y = bx[1], w = bx[2], h = bx[3];
      /* A link where it goes straight to a page; a button where it opens the picker panel. */
      var a = document.createElement(door.kind === 'picker' ? 'button' : 'a');
      a.className = 'spot' + (bx[4] === 'ellipse' ? ' ellipse' : '');
      if (door.kind === 'picker') {
        a.type = 'button';
        a.setAttribute('aria-haspopup', 'dialog');
      } else {
        a.href = door.href;
      }
      a.id = 'spot-' + c.id + (k ? '-' + (k + 1) : '');
      a.dataset.id = c.id;
      a.dataset.kind = door.kind;
      a.setAttribute('aria-label', label);
      /* A second object of the same landmark is a second tap area, not a second door:
         keyboard and screen reader meet each landmark once, at its first object. */
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
  L.cards().forEach(function (d) { grid.appendChild(makeCard(d, 'card-')); });

  /* ── ROOM OR CARDS ── owner, 2026-10-02: "add the 'card view' too pls." The room is the
     default; the last choice made with the switch is remembered on this device, and the page
     works the same when storage is unavailable (private mode) — it just starts in the room.
     Owner, 2026-10-07: both are valid; neither is an old/new transition. Do not change the
     default or the key to favour one child. */
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

  /* ── THE PICKER ── a landmark that holds several apps opens a panel of their cards, in the room
     (the same cards as the Cards view, drawn from the same data). One tap on the landmark, one
     tap on the app. A big Close button, Escape and a tap outside the panel all answer: the panel
     is a labelled dialog, the room behind it is inert, focus goes in and comes back. */
  var picker = document.getElementById('picker');
  var pickerPanel = document.getElementById('pickerPanel');
  var pickerTitle = document.getElementById('pickerTitle');
  var pickerLine = document.getElementById('pickerLine');
  var pickerGrid = document.getElementById('pickerGrid');
  var behind = [room, document.querySelector('.view-toggle'), document.getElementById('musicBtn')];
  var opener = null;
  function setInert(on) {
    behind.forEach(function (el) {
      if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }
  function openPicker(spot) {
    var l = landmarkById[spot.dataset.id];
    if (!l) return;
    opener = spot;
    pickerTitle.textContent = l.name;
    pickerTitle.lang = THAI.test(l.name) ? 'th' : 'en';
    pickerLine.textContent = 'Choose something to explore';
    while (pickerGrid.firstChild) pickerGrid.removeChild(pickerGrid.firstChild);
    L.appsAt(l.id).forEach(function (d) { pickerGrid.appendChild(makeCard(d, 'pick-')); });
    picker.hidden = false;
    picker.dataset.landmark = l.id;
    setInert(true);
    if (pickerPanel.focus) pickerPanel.focus();
  }
  function closePicker() {
    if (picker.hidden) return;
    picker.hidden = true;
    delete picker.dataset.landmark;
    setInert(false);
    clear();
    if (opener && opener.focus) opener.focus();
    opener = null;
  }
  document.getElementById('pickerClose').addEventListener('click', closePicker);
  document.getElementById('pickerBackdrop').addEventListener('click', closePicker);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !picker.hidden) { e.preventDefault(); closePicker(); }
  });

  /* ── PRESS, THEN GO ──
     A child must never need two taps: the first tap opens the door. But a tap that navigates
     instantly is never seen to land, so the object lights, bounces and names itself first,
     and the page (or the picker) goes a moment later. Modified clicks (new tab) are left to the
     browser; a keyboard Enter goes at once. */
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
    var kind = s.dataset.kind;
    var opens = kind === 'cards' || kind === 'picker';
    if (!opens && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    if (e.detail === 0) {                 /* keyboard Enter / Space: at once */
      if (kind === 'cards') { e.preventDefault(); show('cards', false); }
      else if (kind === 'picker') openPicker(s);
      return;
    }
    e.preventDefault();
    if (going) return;
    going = true;
    s.classList.add('on');
    var href = s.href;
    setTimeout(function () {
      if (kind === 'cards') { clear(); show('cards', false); }
      else if (kind === 'picker') { going = false; openPicker(s); }
      else window.location.assign(href);
    }, reduced ? 120 : 320);
  });
  /* Coming Back from a game restores this page from the back-forward cache, lit as it was left. */
  window.addEventListener('pageshow', function (e) { if (e.persisted) { closePicker(); clear(); } });

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
