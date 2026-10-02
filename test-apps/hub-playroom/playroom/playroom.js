/* The playroom hub: draws the doors listed in destinations.js over the room picture.
   Nothing in here names a game. See destinations.js to add one or to replace the art. */
(function () {
  'use strict';
  var R = window.PLAYROOM;
  var scene = document.getElementById('scene');
  var img = document.getElementById('sceneImg');
  var list = document.getElementById('listItems');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resolve(href) {
    try { return new URL(href, R.base || document.baseURI).href; } catch (e) { return href; }
  }
  function cssUrl(u) { return 'url("' + String(u).replace(/"/g, '%22') + '")'; }

  /* The picture and its shape. Everything else is in percent of it. */
  var imageUrl = new URL(R.image, document.baseURI).href;
  img.src = imageUrl;
  document.documentElement.style.setProperty('--ar', String(R.width / R.height));
  document.getElementById('backdrop').style.backgroundImage = cssUrl(imageUrl);

  R.destinations.forEach(function (d) {
    var x = d.box[0], y = d.box[1], w = d.box[2], h = d.box[3];
    var href = resolve(d.href);

    var a = document.createElement('a');
    a.className = 'spot' + (d.shape === 'ellipse' ? ' ellipse' : '');
    a.href = href;
    a.id = 'spot-' + d.id;
    a.dataset.id = d.id;
    a.setAttribute('aria-label', d.name + ' — ' + d.desc);
    if (/[\u0E00-\u0E7F]/.test(d.name)) a.lang = 'th';
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
    b.lang = /[฀-๿]/.test(d.name) ? 'th' : 'en';
    b.textContent = d.name;
    a.appendChild(b);

    scene.appendChild(a);

    var li = document.createElement('li');
    var la = document.createElement('a');
    la.href = href;
    la.innerHTML = '<span class="n"></span><span class="d"></span>';
    la.firstChild.textContent = d.name;
    la.lastChild.textContent = d.desc;
    li.appendChild(la);
    list.appendChild(li);
  });

  /* ── PRESS, THEN GO ──
     A child must never need two taps: the first tap opens the game. But a tap that navigates
     instantly is never seen to land, so the object lights, bounces and names itself first,
     and the page goes a moment later. Modified clicks (new tab) and keyboard activation are
     left to the browser. */
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
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.detail === 0) return;          /* keyboard Enter: go straight away */
    e.preventDefault();
    if (going) return;
    going = true;
    s.classList.add('on');
    var href = s.href;
    setTimeout(function () { window.location.assign(href); }, reduced ? 120 : 320);
  });
  /* Coming Back from a game restores this page from the back-forward cache, lit as it was left. */
  window.addEventListener('pageshow', function (e) { if (e.persisted) clear(); });

  /* ── ALL GAMES LIST ── */
  var btn = document.getElementById('listBtn');
  var panel = document.getElementById('listPanel');
  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { var f = panel.querySelector('a'); if (f) f.focus(); }
  }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });

  /* Read-only, for verification: the boxes as the page drew them. */
  window.Playroom = { destinations: R.destinations, resolve: resolve };
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
