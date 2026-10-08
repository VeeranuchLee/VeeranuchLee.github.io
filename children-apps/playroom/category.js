/* Shared painted-room renderer for the category shells. The shell supplies only
   data-category; destinations.js supplies the picture, shaped doors and Cards list. */
(function () {
  'use strict';
  var R = window.PLAYROOM, L = R.lib;
  var id = document.body.getAttribute('data-category');
  var cat = R.categories.filter(function (c) { return c.id === id; })[0];
  var room = R.categoryRooms && R.categoryRooms[id];
  var THAI = /[\u0E00-\u0E7F]/;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var title = document.getElementById('catTitle');
  var line = document.getElementById('catLine');
  var picture = document.getElementById('roomPicture');
  var spots = document.getElementById('roomHotspots');
  var grid = document.getElementById('catGrid');
  var roomView = document.getElementById('roomView');
  var cardsView = document.getElementById('cardsView');
  var controls = Array.prototype.slice.call(document.querySelectorAll('[data-view]'));
  if (!cat) {
    grid.outerHTML = '<p class="missing">This room is not ready.</p>';
    return;
  }
  title.textContent = cat.name;
  line.textContent = cat.tagline || '';
  document.title = cat.name + ' — Children Games';
  /* Categories without an owner room design preserve the original card-only page. */
  if (!room) {
    L.appsIn(id).forEach(function (d) {
      var c = document.createElement('a'); c.className = 'card'; c.href = L.app(d.href); c.dataset.id = d.id;
      if (d.tone) { c.style.setProperty('--edge', d.tone[0]); c.style.setProperty('--shadow', d.tone[1]); c.style.setProperty('--tint', d.tone[2]); }
      var art = document.createElement('span'); art.className = 'art'; var img = document.createElement('img');
      img.src = L.app(d.tile); img.alt = ''; img.width = 96; img.height = 96; if (!d.cutout) img.className = 'tile'; art.appendChild(img);
      var name = document.createElement('span'); name.className = 'name'; name.textContent = d.name;
      var desc = document.createElement('span'); desc.className = 'desc'; desc.textContent = d.desc;
      c.appendChild(art); c.appendChild(name); c.appendChild(desc); grid.appendChild(c);
    });
    return;
  }
  picture.src = L.app(room.image);
  picture.alt = '';

  function polygon(points) {
    return 'polygon(' + points.map(function (p) { return p[0] + '% ' + p[1] + '%'; }).join(',') + ')';
  }
  room.objects.forEach(function (d) {
    var a = document.createElement('a');
    a.className = 'room-hotspot';
    a.href = L.app(d.href);
    a.dataset.id = d.id;
    a.setAttribute('aria-label', d.name + '. ' + d.desc);
    a.style.clipPath = polygon(d.points);
    a.style.webkitClipPath = polygon(d.points);
    a.innerHTML = '<span class="sr-only"></span>';
    a.firstChild.textContent = d.name;
    spots.appendChild(a);

    /* The name bubble (owner, 2026-10-07: the main menu names its objects, the rooms did not).
       The hotspot above is clip-pathed to the object's polygon and a clip-path clips children
       too, so the bubble cannot live inside it: it sits in this sibling span, sized to the
       polygon's bounding box. Edged exactly like the hub's doors (playroom.js): below an object
       near the top of the room, pinned to its edge when centring would run off the picture. */
    var x0 = 100, y0 = 100, x1 = 0, y1 = 0;
    d.points.forEach(function (p) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    });
    var w = x1 - x0, cx = x0 + w / 2;
    var tag = document.createElement('span');
    tag.className = 'spot-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.style.left = x0 + '%'; tag.style.top = y0 + '%';
    tag.style.width = w + '%'; tag.style.height = (y1 - y0) + '%';
    var b = document.createElement('span');
    b.className = 'bubble' + (y0 < 12 ? ' below' : '') +
                  (cx < 12 ? ' start' : (cx > 88 ? ' end' : ''));
    b.lang = THAI.test(d.name) ? 'th' : 'en';
    b.textContent = d.name;
    tag.appendChild(b);
    spots.appendChild(tag);

    var c = document.createElement('a');
    c.className = 'card'; c.href = L.app(d.href); c.dataset.id = d.id;
    if (d.tone) {
      c.style.setProperty('--edge', d.tone[0]); c.style.setProperty('--shadow', d.tone[1]);
      c.style.setProperty('--tint', d.tone[2]);
    }
    var art = document.createElement('span'); art.className = 'art';
    var img = document.createElement('img'); img.src = L.app(d.tile); img.alt = '';
    img.width = 96; img.height = 96; if (!d.cutout) img.className = 'tile'; art.appendChild(img);
    var name = document.createElement('span'); name.className = 'name'; name.textContent = d.name;
    if (THAI.test(d.name)) name.lang = 'th';
    var desc = document.createElement('span'); desc.className = 'desc'; desc.textContent = d.desc;
    c.appendChild(art); c.appendChild(name); c.appendChild(desc); grid.appendChild(c);
  });

  /* ── PRESS, THEN GO ── the hub's tap handling (playroom.js), brought into the rooms so a tap
     is answered with the object's name before the page goes. Modified clicks (new tab) are left
     to the browser; a keyboard Enter goes at once. Every room object only ever navigates —
     there is no card-view door here, so the bubble's job is the name, then the page turns. */
  var going = false;
  function clear() {
    going = false;
    Array.prototype.forEach.call(spots.querySelectorAll('.room-hotspot.on'), function (s) { s.classList.remove('on'); });
  }
  spots.addEventListener('pointerdown', function (e) {
    var s = e.target.closest && e.target.closest('.room-hotspot');
    if (!s || going) return;
    clear();
    s.classList.add('on');
  });
  spots.addEventListener('pointercancel', function () { if (!going) clear(); });
  spots.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !going) clear(); });
  spots.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('.room-hotspot');
    if (!s) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.detail === 0) return;                 /* keyboard Enter: the browser follows the link at once */
    e.preventDefault();
    if (going) return;
    going = true;
    s.classList.add('on');
    var href = s.href;
    setTimeout(function () { window.location.assign(href); }, reduced ? 120 : 320);
  });
  /* Coming back from a game restores this page from the back-forward cache, lit as it was left. */
  window.addEventListener('pageshow', function (e) { if (e.persisted) clear(); });

  var key = 'ca_category_view_' + id;
  function show(view, remember) {
    var cards = view === 'cards';
    roomView.hidden = cards; cardsView.hidden = !cards;
    controls.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
    if (remember) { try { localStorage.setItem(key, view); } catch (e) {} }
  }
  controls.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view, true); }); });
  var initial = 'room';
  try { if (localStorage.getItem(key) === 'cards') initial = 'cards'; } catch (e) {}
  show(initial, false);
})();
