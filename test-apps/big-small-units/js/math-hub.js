/* The owner's painted open book has exactly two doors; the third world is a card (below). Points are percentages of the
   original 1672 x 941 scene so the shapes stay on the art at every viewport/crop. */
(function () {
  'use strict';
  var room = {
    image: 'assets-runtime/hub/scene.webp',
    unmatched: ['bookshelf and bunny', 'wall stars', 'window and moon', 'desk pencils'],
    objects: [
      {
        id: 'space',
        name: 'Space Math',
        desc: 'Fly planet to planet with every answer',
        href: 'space-math.html',
        points: [[14.4,35.2],[28.7,32.4],[40.2,35.4],[49.5,47.9],[49.6,75.9],[50,82.3],[7.5,80.2],[9.3,72.7],[12.7,61.8],[13.7,50]]
      },
      {
        id: 'unicorn',
        name: 'Unicorn Math',
        desc: 'Grow a flower garden with every answer',
        href: 'unicorn-math.html',
        points: [[51.4,47.9],[55,43.8],[64,32],[80.9,28.7],[86,40],[88.5,58],[92.7,79],[51.1,82.5]]
      }
    ],
    /* Owner, 2026-10-26: a third world, Mermaid Math. The painting has only two pages, so
       the third door is a card standing in front of the open book -- on the desk in
       landscape, in the space below the book in portrait -- rather than a shape traced
       on art that does not show it. */
    cards: [
      {
        id: 'mermaid',
        name: 'Mermaid Math',
        desc: 'Find a shell for every answer',
        href: 'mermaid-math.html',
        image: 'assets-runtime/mermaid/icons/mermaid-card.webp',
        shells: ['assets-runtime/mermaid/icons/shell-scallop.webp', 'assets-runtime/mermaid/icons/shell-nautilus.webp']
      }
    ]
  };
  window.MATH_HUB_ROOM = room;

  function polygon(points) {
    return 'polygon(' + points.map(function (point) {
      return point[0] + '% ' + point[1] + '%';
    }).join(',') + ')';
  }

  var picture = document.getElementById('hubScene');
  var hotspots = document.getElementById('worldHotspots');
  picture.src = room.image;
  room.objects.forEach(function (object) {
    var link = document.createElement('a');
    link.className = 'world-hotspot';
    link.href = object.href;
    link.dataset.id = object.id;
    link.setAttribute('aria-label', object.name + '. ' + object.desc);
    link.style.clipPath = polygon(object.points);
    link.style.webkitClipPath = polygon(object.points);
    link.innerHTML = '<span class="sr-only"></span>';
    link.firstChild.textContent = object.name;
    hotspots.appendChild(link);
  });
  var stage = document.getElementById('worldCards');
  (room.cards || []).forEach(function (card) {
    var link = document.createElement('a');
    link.className = 'world-card world-card-' + card.id;
    link.href = card.href;
    link.dataset.id = card.id;
    link.setAttribute('aria-label', card.name + '. ' + card.desc);
    var shells = card.shells || [];
    link.innerHTML =
      '<img class="wc-shell wc-shell-a" alt="" draggable="false">' +
      '<img class="wc-art" alt="" draggable="false">' +
      '<span class="wc-name"></span>' +
      '<img class="wc-shell wc-shell-b" alt="" draggable="false">';
    var imgs = link.querySelectorAll('img');
    imgs[0].src = shells[0] || '';
    imgs[1].src = card.image;
    imgs[2].src = shells[1] || shells[0] || '';
    link.querySelector('.wc-name').textContent = card.name;
    stage.appendChild(link);
  });
})();
