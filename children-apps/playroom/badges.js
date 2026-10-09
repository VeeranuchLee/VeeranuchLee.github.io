/* ROOM BADGES: draws one always-visible labelled icon badge per active destination, pinned where
   destinations.js says (`badgeAt: [x, y]`, percent of the picture, the centre of the icon).
   Reuses the card tile art the hub already ships — no new art. Behaviour and rationale: badges.css. */
(function () {
  'use strict';
  var R = window.PLAYROOM, L = R.lib;
  var THAI = /[฀-๿]/;

  /* One badge for `d` (an apps entry or a category-room object: name, href, tile, cutout). */
  function make(d, x, y, index) {
    var a = document.createElement('a');
    a.className = 'badge';
    a.href = L.app(d.href);
    a.dataset.id = d.id;
    a.setAttribute('aria-label', d.name + (d.desc ? '. ' + d.desc : ''));
    a.style.setProperty('--x', x + '%');
    a.style.setProperty('--y', y + '%');
    a.style.setProperty('--d', (index * 0.07).toFixed(2) + 's');
    var icon = document.createElement('span');
    icon.className = 'badge-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (d.tile) {
      var t = document.createElement('img');
      t.src = L.app(d.tile); t.alt = ''; t.width = 96; t.height = 96; t.decoding = 'async';
      t.draggable = false;
      if (!d.cutout) t.className = 'tile';
      icon.appendChild(t);
    }
    var n = document.createElement('span');
    n.className = 'badge-name';
    n.textContent = d.name;
    if (THAI.test(d.name)) n.lang = 'th';
    a.appendChild(icon); a.appendChild(n);
    a.addEventListener('pointerdown', function () { a.classList.add('on'); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      a.addEventListener(ev, function () { a.classList.remove('on'); });
    });
    return a;
  }

  /* The main Discovery Room: one badge per AREA. Its link is the same resolved door used by every
     hotspot in that area, so grouped landmarks can never disagree with their badge. */
  var scene = document.getElementById('scene');
  if (scene && !document.body.getAttribute('data-category')) {
    var n = 0;
    R.mainAreas.forEach(function (area) {
      if (!area.badgeAt || !area.landmarks || !area.landmarks.length) return;
      var l = R.landmarks.filter(function (c) { return c.id === area.landmarks[0]; })[0];
      var door = l && L.door(l);
      if (!door) return;
      var d = { id: area.id, name: area.name, desc: area.tagline, href: door.href, tile: area.tile };
      scene.appendChild(make(d, area.badgeAt[0], area.badgeAt[1], n++));
    });
  }
  window.PlayroomBadges = { make: make };
})();
