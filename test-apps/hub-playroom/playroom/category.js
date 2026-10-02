/* A category page of the playroom hub. The page names only its category, in
   <body data-category="...">; the title, line and cards all come from destinations.js, so a
   new app in this category appears here with no edit to this page. */
(function () {
  'use strict';
  var R = window.PLAYROOM, L = R.lib;
  var id = document.body.getAttribute('data-category');
  var cat = R.categories.filter(function (c) { return c.id === id; })[0];
  var THAI = /[\u0E00-\u0E7F]/;
  var h1 = document.getElementById('catTitle');
  var line = document.getElementById('catLine');
  var grid = document.getElementById('catGrid');
  if (!cat) { grid.outerHTML = '<p class="missing">This shelf is empty.</p>'; return; }
  h1.textContent = cat.name;
  if (THAI.test(cat.name)) h1.lang = 'th';
  line.textContent = cat.tagline || '';
  document.title = cat.name + ' — Children Games';
  var apps = L.appsIn(id);
  /* Two or three cards in a row; four as a 2x2 block (homework.html's rule). */
  grid.style.setProperty('--cols', String(apps.length === 3 ? 3 : 2));
  apps.forEach(function (d) {
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
    var t = document.createElement('img');
    t.src = L.app(d.tile); t.alt = ''; t.width = 96; t.height = 96;
    if (!d.cutout) t.className = 'tile';
    art.appendChild(t);
    var n = document.createElement('span');
    n.className = 'name'; n.textContent = d.name;
    if (THAI.test(d.name)) n.lang = 'th';
    var ds = document.createElement('span');
    ds.className = 'desc'; ds.textContent = d.desc;
    c.appendChild(art); c.appendChild(n); c.appendChild(ds);
    grid.appendChild(c);
  });
  /* BACK goes to the hub the child came from: the playroom when they came from it, else the
     card hub (index.html, "./"), so the arrow works from today's hub and from the playroom. */
  var back = document.getElementById('back');
  try {
    var ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === location.origin && /playroom\.html$|\/hub-playroom\/(index\.html)?$/.test(ref.pathname)) {
      back.href = ref.origin + ref.pathname;
    }
  } catch (e) {}
})();
