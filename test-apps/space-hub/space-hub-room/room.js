/* The Space room's one source of truth: all three existing app links appear once in
   the painted room and once in Cards. Percent polygons follow the visible objects. */
window.SPACE_ROOM_ITEMS=[
    {id:'storybook',name:'Ari & Dot',desc:'A story about the planets',href:'https://veeranuchlee.github.io/solar-storybook-feedback/',tile:'./assets/ari-and-dot.webp',points:[[3,47],[8,43],[27,43],[32,50],[31,68],[26,72],[6,70],[3,64]]},
    {id:'solar-system',name:'Planets & Moons',desc:'Planets in order, moons at home, then the dwarf planets',href:'https://veeranuchlee.github.io/solar-system-game/',tile:'./assets/planets-and-moons.png',points:[[34,42],[43,36],[58,35],[68,42],[71,57],[66,70],[58,74],[41,72],[34,64]]},
    {id:'space-trivia',name:'Space Trivia',desc:'Space questions in two little missions',href:'https://veeranuchlee.github.io/space-trivia/',tile:'./assets/space-trivia.webp',points:[[74,46],[81,42],[95,44],[98,51],[97,72],[91,76],[73,72],[70,64]]}
  ];
(function(){
  'use strict';
  var items=window.SPACE_ROOM_ITEMS;
  var spots=document.getElementById('roomHotspots'),grid=document.getElementById('cardGrid');
  function poly(ps){return'polygon('+ps.map(function(p){return p[0]+'% '+p[1]+'%';}).join(',')+')';}
  items.forEach(function(d){
    var a=document.createElement('a');a.className='room-hotspot';a.href=d.href;a.dataset.id=d.id;a.setAttribute('aria-label',d.name+'. '+d.desc);a.style.clipPath=poly(d.points);a.style.webkitClipPath=poly(d.points);spots.appendChild(a);
    var c=document.createElement('a');c.className='card';c.href=d.href;c.dataset.id=d.id;c.innerHTML='<img alt="" width="104" height="104"><strong></strong><small></small>';c.querySelector('img').src=d.tile;c.querySelector('strong').textContent=d.name;c.querySelector('small').textContent=d.desc;grid.appendChild(c);
  });
  var room=document.getElementById('roomView'),cards=document.getElementById('cardsView'),buttons=[].slice.call(document.querySelectorAll('[data-view]')),key='space_hub_view';
  function show(view,save){var isCards=view==='cards';room.hidden=isCards;cards.hidden=!isCards;buttons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.view===view));});if(save)try{localStorage.setItem(key,view);}catch(e){}}
  buttons.forEach(function(b){b.addEventListener('click',function(){show(b.dataset.view,true);});});var initial='room';try{if(localStorage.getItem(key)==='cards')initial='cards';}catch(e){}show(initial,false);
})();
