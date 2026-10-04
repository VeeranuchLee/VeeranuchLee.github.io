/* Shared painted-room renderer for the category shells. The shell supplies only
   data-category; destinations.js supplies the picture, shaped doors and Cards list. */
(function () {
  'use strict';
  var R = window.PLAYROOM, L = R.lib;
  var id = document.body.getAttribute('data-category');
  var cat = R.categories.filter(function (c) { return c.id === id; })[0];
  var room = R.categoryRooms && R.categoryRooms[id];
  var THAI = /[\u0E00-\u0E7F]/;
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
