/* Shared painted-room renderer for the category shells. The shell supplies only
   data-category; destinations.js supplies the picture, shaped doors and Cards list. */
(function () {
  'use strict';
  var R = window.PLAYROOM, L = R.lib;
  var id = document.body.getAttribute('data-category');
  /* The page's own title and line: destinations.js `hubPages` (these pages are no longer room
     landmarks, but they keep working). */
  var cat = R.hubPages && R.hubPages[id];
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
    L.appsAt(id).forEach(function (d) {
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
  /* A room that declares its own shape (`fit`, with width and height) is shown whole at that shape
     with a blurred copy of the picture filling the sides, so the percent hotspots stay on the art.
     Rooms without it keep the original 1672x941 frame. */
  if (room.fit && room.width && room.height) {
    document.body.classList.add('fit');
    document.body.style.setProperty('--room-ar', String(room.width / room.height));
    picture.width = room.width; picture.height = room.height;
    var fill = document.createElement('div');
    fill.className = 'room-fill';
    fill.setAttribute('aria-hidden', 'true');
    fill.style.backgroundImage = 'url("' + picture.src.replace(/"/g, '%22') + '")';
    document.body.insertBefore(fill, document.body.firstChild);
  }

  function polygon(points) {
    return 'polygon(' + points.map(function (p) { return p[0] + '% ' + p[1] + '%'; }).join(',') + ')';
  }
  var labelItems = [];
  /* Objects with `active: false` are future landmarks: geometry in the data, nothing in the page. */
  room.objects.filter(function (d) { return d.active !== false; }).forEach(function (d) {
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

    /* The name bubble: the shared Room label (room-label.js), the same component the main hub and
       every other room uses. The anchor is the polygon's bounding box; the label sits above it, centred,
       and moves only when above would leave the room, hit the controls or sit on a neighbour. Only active objects
       reach this loop; a future landmark has no link and so no label. */
    var x0 = 100, y0 = 100, x1 = 0, y1 = 0;
    d.points.forEach(function (p) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    });
    labelItems.push({ el: a, text: d.name, anchor: { x0: x0, x1: x1, y0: y0, y1: y1 }, group: d.id, accent: d.accent });

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

  var label = window.RoomLabel.attach(spots.parentNode, labelItems, { avoid: ['.topbar .back', '.view-switch', '.music-btn'] });

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
  window.addEventListener('pageshow', function (e) { if (e.persisted) { label.hide(); clear(); } });

  grid.setAttribute('data-count', String(grid.children.length));

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
