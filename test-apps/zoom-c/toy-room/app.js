/* Toy Box — the shelf.
 *
 * The settled structure (owner, 2026-08-28): each substantial toy is its own
 * standalone app; this page is a navigation layer that LINKS to them. Cards
 * are plain anchors — real navigation, no mounting, no shared runtime, no
 * lazy loading. There is deliberately no sound engine here either: the shelf
 * has nothing to make noise about, and each app owns its own sound toggle.
 */
(function () {
  'use strict';

  var shelf = window.ToyBoxShelf.TOYS;
  var grid = document.getElementById('room-grid');

  shelf.forEach(function (toy) {
    var card = document.createElement(toy.soon ? 'div' : 'a');
    if (!toy.soon) card.href = toy.href;
    card.className = 'toy-card' + (toy.soon ? ' is-soon' : '');
    card.innerHTML =
      '<span class="toy-art">' + toy.art + '</span>' +
      '<span class="toy-name">' + toy.title + '</span>' +
      '<span class="toy-sub">' + (toy.subtitle || '') + '</span>' +
      (toy.soon ? '<span class="toy-soon-tag">Coming soon</span>' : '');
    grid.appendChild(card);
  });
})();
