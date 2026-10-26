/* Three shaped doors measured against both generated paintings. Coordinates are percentages,
   keeping the generous tap regions attached to their art at every viewport size. */
(function () {
  'use strict';
  var room = {
    image: 'assets-runtime/hub/scene-3worlds.webp',
    portraitImage: 'assets-runtime/hub/scene-3worlds-portrait.webp',
    unmatched: ['bookshelf and bunny', 'wall stars', 'window and moon', 'desk pencils'],
    objects: [
      {id:'space',name:'Space Math',desc:'Fly planet to planet with every answer',href:'space-math.html',
        landscapePoints:[[4,30],[13,35],[23,29],[33,34],[33,84],[23,79],[13,85],[4,80]],
        portraitPoints:[[2,29],[14,24],[30,21],[47,22],[47,57],[26,60],[15,58],[2,61]]},
      {id:'unicorn',name:'Unicorn Math',desc:'Grow a flower garden with every answer',href:'unicorn-math.html',
        landscapePoints:[[34,34],[39,29],[49,34],[57,29],[68,34],[68,84],[57,79],[49,85],[39,80],[34,84]],
        portraitPoints:[[48,22],[58,21],[68,20],[83,23],[98,29],[98,61],[84,57],[70,60],[58,56],[48,57]]},
      {id:'mermaid',name:'Mermaid Math',desc:'Find a shell for every answer',href:'mermaid-math.html',
        landscapePoints:[[69,34],[77,29],[87,34],[97,31],[97,80],[87,85],[77,79],[69,84]],
        portraitPoints:[[2,65],[15,62],[26,65],[38,61],[50,64],[70,61],[84,65],[98,62],[98,87],[84,90],[70,87],[50,91],[38,87],[26,90],[15,86],[2,84]]}
    ],
    helper: {id:'helper',name:'My Math Helper',desc:'Open your interactive math notebook',
      href:'math-helper.html',icon:'assets-runtime/hub/math-helper-notebook.webp'}
  };
  window.MATH_HUB_ROOM = room;

  function polygon(points) {
    return 'polygon(' + points.map(function (point) { return point[0] + '% ' + point[1] + '%'; }).join(',') + ')';
  }

  var picture = document.getElementById('hubScene');
  var portraitPicture = document.getElementById('hubScenePortrait');
  var hotspots = document.getElementById('worldHotspots');
  picture.src = room.image;
  portraitPicture.srcset = room.portraitImage;
  room.objects.forEach(function (object) {
    var link = document.createElement('a');
    link.className = 'world-hotspot';
    link.href = object.href;
    link.dataset.id = object.id;
    link.setAttribute('aria-label', object.name + '. ' + object.desc);
    link.style.setProperty('--landscape-shape', polygon(object.landscapePoints));
    link.style.setProperty('--portrait-shape', polygon(object.portraitPoints));
    var label = document.createElement('span');
    label.className = 'world-label';
    label.textContent = object.name;
    var glint = document.createElement('span');
    glint.className = 'hub-glint';
    glint.setAttribute('aria-hidden', 'true');
    link.appendChild(label);
    link.appendChild(glint);
    hotspots.appendChild(link);
  });

  var helper = document.createElement('a');
  helper.className = 'helper-entry';
  helper.href = room.helper.href;
  helper.dataset.id = room.helper.id;
  helper.setAttribute('aria-label', room.helper.name + '. ' + room.helper.desc);
  var helperIcon = document.createElement('img');
  helperIcon.src = room.helper.icon;
  helperIcon.alt = '';
  helperIcon.width = 256;
  helperIcon.height = 256;
  var helperLabel = document.createElement('span');
  helperLabel.textContent = room.helper.name;
  var helperGlint = document.createElement('i');
  helperGlint.className = 'hub-glint';
  helperGlint.setAttribute('aria-hidden', 'true');
  helper.appendChild(helperIcon);
  helper.appendChild(helperLabel);
  helper.appendChild(helperGlint);
  hotspots.appendChild(helper);
})();
