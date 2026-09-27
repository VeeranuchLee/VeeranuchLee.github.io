(() => {
  'use strict';
  const S = window.NailSalonState;
  const state = S.createState();
  const svgNS = 'http://www.w3.org/2000/svg';
  const nailsRoot = document.querySelector('#nails');
  const accessoryLayer = document.querySelector('#accessoryLayer');
  const tray = document.querySelector('#tray');
  const tabsRoot = document.querySelector('#tabs');
  const undoButton = document.querySelector('#undo');
  const geometry = [
    { x:121.1,y:231.2,w:44.5,h:66,r:-32.6 }, { x:190.1,y:42.4,w:44.8,h:63,r:-10.5 },
    { x:291.2,y:-1.2,w:46.9,h:68,r:-0.5 }, { x:382.9,y:26.6,w:44.1,h:65,r:2 }, { x:473.4,y:113.6,w:37.5,h:56,r:11.4 }
  ];
  const tabs = [
    { id:'shape', icon:'▰', label:'Shape' }, { id:'polish', icon:'<img src="./assets/icons/polish-bottle.webp" alt="">', label:'Polish' },
    { id:'pattern', icon:'✿', label:'Pattern' }, { id:'sticker', icon:'★', label:'Sticker' },
    { id:'gem', icon:'◆', label:'Gem' }, { id:'accessories', icon:'🎀', label:'Accessories' }
  ];
  const polish = ['#f15b9c','#f58aaa','#ff9c87','#ffb35c','#ffd267','#72d8cd','#65bceb','#a989e9','#e9685e','#d8205d','#372d3b','#f3efe9'];
  const stickers = ['flower','heart','star','strawberry','rainbow','cat','butterfly','tulip'];
  const stickerIcon = {flower:'🌼',heart:'💗',star:'⭐',strawberry:'🍓',rainbow:'🌈',cat:'🐱',butterfly:'🦋',tulip:'🌷'};
  const gems = [{id:'ruby',art:'gem-heart'},{id:'aqua',art:'gem-blue'},{id:'violet',art:'gem-flower'},{id:'pearl',art:'gem-pearl'},{id:'gold',art:'gem-star'},{id:'mint',art:null}];
  let activeTab = 'polish';
  let audio;

  function el(name, attrs={}) { const n=document.createElementNS(svgNS,name); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); return n; }
  function shapeMetrics(nail, g) {
    const extension=nail.length==='long'?20:0;
    return {x:g.x,y:g.y-extension,w:g.w,h:g.h+extension,cx:g.x+g.w/2,baseY:g.y+g.h};
  }
  function nailPath(m,shape){
    const {x,y,w,h,cx,baseY:b}=m, left=x+1.5, right=x+w-1.5, cuticleY=b+2;
    const sides={
      round:`M${left} ${b-4} C${x-.5} ${b-h*.28} ${x} ${y+14} ${x+3} ${y+10} C${x+6} ${y+3} ${cx-7} ${y+1} ${cx} ${y+1} C${cx+7} ${y+1} ${x+w-6} ${y+3} ${x+w-3} ${y+10} C${x+w} ${y+14} ${x+w+.5} ${b-h*.28} ${right} ${b-4}`,
      square:`M${left} ${b-4} C${x-.5} ${b-h*.3} ${x+.5} ${y+9} ${x+4} ${y+5} Q${x+7} ${y+2} ${x+11} ${y+2} L${x+w-11} ${y+2} Q${x+w-7} ${y+2} ${x+w-4} ${y+5} C${x+w-.5} ${y+9} ${x+w+.5} ${b-h*.3} ${right} ${b-4}`,
      almond:`M${left} ${b-4} C${x} ${b-h*.28} ${x+3} ${y+18} ${cx} ${y} C${x+w-3} ${y+18} ${x+w} ${b-h*.28} ${right} ${b-4}`,
      oval:`M${left} ${b-4} C${x-.5} ${b-h*.3} ${x+1} ${y+17} ${x+7} ${y+8} C${x+12} ${y+1} ${cx-5} ${y} ${cx} ${y} C${cx+5} ${y} ${x+w-12} ${y+1} ${x+w-7} ${y+8} C${x+w-1} ${y+17} ${x+w+.5} ${b-h*.3} ${right} ${b-4}`
    };
    return `${sides[shape]||sides.round} Q${cx} ${cuticleY} ${left} ${b-4} Z`;
  }
  function rimPath(m,shape){
    const d=nailPath(m,shape);
    return d.slice(0,d.lastIndexOf(' Q'))+` Q${m.cx} ${m.baseY+2} ${m.x+1.5} ${m.baseY-4}`;
  }
  function fillFor(nail){ if(nail.finish==='glitter')return 'url(#glitter)'; if(nail.finish==='shimmer')return 'url(#shimmer)'; if(nail.finish==='chrome')return 'url(#chrome)'; if(nail.pattern==='gradient')return 'url(#polishGradient)'; return nail.polish; }
  function renderNails(){
    nailsRoot.replaceChildren();
    state.nails.forEach((nail,index)=>{
      const geo=geometry[index], m=shapeMetrics(nail,geo), d=nailPath(m,nail.shape), group=el('g',{transform:`rotate(${geo.r} ${m.cx} ${m.baseY})`});
      const clipId=`nailMask${index}`;
      const clip=el('clipPath',{id:clipId}); clip.append(el('path',{d})); group.append(clip);
      group.append(el('path',{class:'nail-base',d,fill:fillFor(nail)}));
      addPattern(group,nail,m,clipId);
      const decorGroup=el('g',{'clip-path':`url(#${clipId})`});
      addDecorations(decorGroup,nail.stickers,'sticker',m);
      addDecorations(decorGroup,nail.gems,'gem',m);
      group.append(decorGroup);
      group.append(el('path',{class:'nail-rim',d:rimPath(m,nail.shape)}));
      group.append(el('path',{class:'nail-shine',d:`M${m.x+m.w*.3} ${m.y+11} C${m.x+m.w*.22} ${m.y+m.h*.34} ${m.x+m.w*.25} ${m.y+m.h*.58} ${m.x+m.w*.34} ${m.y+m.h*.7}`}));
      if(index===state.selected) group.append(el('path',{class:'nail-selected',d}));
      const hitW=Math.max(70,m.w+24),hitH=Math.max(78,m.h+20);
      const hit=el('rect',{class:'nail-hit',x:m.cx-hitW/2,y:m.baseY-hitH,width:hitW,height:hitH,rx:18,'data-nail':index,'aria-label':`Select nail ${index+1}`,role:'button',tabindex:'0'});
      hit.addEventListener('click',()=>{S.select(state,index);renderNails();markFeedback(hit)});
      hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();hit.click();}});
      group.append(hit); nailsRoot.append(group);
    });
    renderAccessories(); undoButton.disabled=!state.history.length;
  }
  function addPattern(group,nail,m,clipId){
    if(nail.pattern==='none'||nail.pattern==='gradient')return;
    const p=el('g',{class:'nail-pattern','clip-path':`url(#${clipId})`});
    if(nail.pattern==='stripes') for(let x=m.x-50;x<m.x+m.w+60;x+=18)p.append(el('line',{x1:x,y1:m.y+m.h,x2:x+65,y2:m.y,stroke:'#fff','stroke-width':8,opacity:.78}));
    if(nail.pattern==='dots') for(let y=m.y+18;y<m.y+m.h;y+=22)for(let x=m.x+14;x<m.x+m.w;x+=24)p.append(el('circle',{cx:x,cy:y,r:5,fill:'#fff',opacity:.9}));
    if(nail.pattern==='french')p.append(el('path',{d:`M${m.x-3} ${m.y+18} Q${m.x+m.w/2} ${m.y+34} ${m.x+m.w+3} ${m.y+18} L${m.x+m.w+3} ${m.y-3} L${m.x-3} ${m.y-3}Z`,fill:'#fff'}));
    if(nail.pattern==='hearts')p.append(el('text',{x:m.x+m.w/2,y:m.y+m.h*.62,'text-anchor':'middle','font-size':30,fill:'#fff'})).textContent='♥';
    group.append(p);
  }
  const layouts={1:[[.5,.5,30]],2:[[.35,.43,22],[.66,.65,22]],3:[[.5,.28,19],[.31,.65,19],[.7,.65,19]],4:[[.31,.3,17],[.69,.3,17],[.31,.7,17],[.69,.7,17]]};
  const gemLayouts={1:[[.5,.76,21]],2:[[.28,.72,17],[.72,.72,17]],3:[[.25,.72,15],[.5,.53,15],[.75,.72,15]],4:[[.22,.7,13],[.43,.55,13],[.64,.7,13],[.79,.48,13]]};
  function addDecorations(root,list,kind,m){
    const poses=(kind==='gem'?gemLayouts:layouts)[list.length]||[];
    list.forEach((id,i)=>{const [px,py,size]=poses[i];if(kind==='sticker'){root.append(el('image',{class:'decoration',href:`./assets/stickers/${id}.webp`,x:m.x+m.w*px-size/2,y:m.y+m.h*py-size/2,width:size,height:size,preserveAspectRatio:'xMidYMid meet'}));}else{const gem=gems.find(g=>g.id===id)||gems[0];if(gem.art){root.append(el('image',{class:'decoration',href:`./assets/icons/${gem.art}.webp`,x:m.x+m.w*px-size/2,y:m.y+m.h*py-size/2,width:size,height:size,preserveAspectRatio:'xMidYMid meet'}));}else{const cx=m.x+m.w*px,cy=m.y+m.h*py;root.append(el('path',{class:'decoration',d:`M${cx-size*.34} ${cy-size*.42}H${cx+size*.34}L${cx+size*.5} ${cy-size*.12}L${cx+size*.27} ${cy+size*.45}H${cx-size*.27}L${cx-size*.5} ${cy-size*.12}Z`,fill:'#42c891',stroke:'#d8ffed','stroke-width':2}));}}});
  }
  function renderAccessories(){
    accessoryLayer.replaceChildren();
    if(state.accessories.includes('heart-ring')) accessoryLayer.append(el('image',{href:'./assets/icons/accessory-heart-ring.webp',x:354,y:326,width:76,height:76}));
    if(state.accessories.includes('star-ring')) accessoryLayer.append(el('image',{href:'./assets/icons/gem-star.webp',x:294,y:318,width:58,height:58}));
    if(state.accessories.includes('pearl-bracelet')) accessoryLayer.append(el('image',{href:'./assets/icons/accessory-pearl-bracelet.webp',x:232,y:505,width:160,height:110,preserveAspectRatio:'xMidYMid meet'}));
    if(state.accessories.includes('bow-bracelet')) accessoryLayer.append(el('image',{href:'./assets/icons/accessory-bow.webp',x:258,y:515,width:108,height:88,preserveAspectRatio:'xMidYMid meet'}));
  }
  function renderTabs(){tabsRoot.innerHTML=tabs.map(t=>`<button data-tab="${t.id}" class="${t.id===activeTab?'active':''}" aria-label="${t.label}" aria-pressed="${t.id===activeTab}"><span>${t.icon}</span>${t.label}</button>`).join('');tabsRoot.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;renderTabs();renderTray();}));}
  function choice(html,handler,selected=false,label=''){const b=document.createElement('button');b.className='choice'+(selected?' selected':'');b.innerHTML=html;b.setAttribute('aria-label',label);b.addEventListener('click',()=>{handler();renderNails();renderTray();});tray.append(b);}
  function addDecorationPips(count,kind){const pips=document.createElement('div');pips.className='choice hint-chip';pips.setAttribute('role','img');pips.setAttribute('aria-label',`${count} ${kind} on this nail, up to 4`);for(let i=0;i<4;i+=1){const pip=document.createElement('i');pip.className='decoration-pip'+(i<count?' filled':'');pips.append(pip);}tray.append(pips);}
  function renderTray(){
    tray.replaceChildren(); const nail=state.nails[state.selected];
    if(activeTab==='shape'){
      ['round','square','almond','oval'].forEach(id=>choice(`<i class="shape-icon shape-${id}"></i>`,()=>S.update(state,{shape:id}),nail.shape===id,id+' nail'));
      ['short','long'].forEach(id=>choice(`<i class="shape-icon shape-round ${id==='long'?'shape-long':''}"></i><small>${id==='short'?'↔':'↕'}</small>`,()=>S.update(state,{length:id}),nail.length===id,id+' nails'));
    } else if(activeTab==='polish'){
      polish.forEach(c=>choice(`<i class="polish-dot" style="--color:${c}"></i>`,()=>S.update(state,{polish:c,finish:'solid'}),nail.polish===c&&nail.finish==='solid','polish color'));
      [['glitter','url(#glitter)','✨'],['shimmer','linear-gradient(135deg,#76dfe5,#fff,#d28ae7)','🫧'],['chrome','linear-gradient(90deg,#777,#fff,#9aa,#fff,#777)','⚡']].forEach(([id,bg,icon])=>choice(`<i class="polish-dot" style="--color:${bg}"></i><small>${icon}</small>`,()=>S.update(state,{finish:id}),nail.finish===id,id));
    } else if(activeTab==='pattern'){
      ['none','stripes','dots','french','hearts','gradient'].forEach(id=>choice(id==='none'?'○':`<i class="pattern-icon pattern-${id}"></i>`,()=>S.update(state,{pattern:id}),nail.pattern===id,id));
    } else if(activeTab==='sticker'){
      stickers.forEach(id=>choice(`<img src="./assets/stickers/${id}.webp" alt="">`,()=>S.addDecoration(state,'sticker',id),false,id));
      addDecorationPips(nail.stickers.length,'stickers');
    } else if(activeTab==='gem'){
      gems.forEach(g=>choice(g.art?`<img src="./assets/icons/${g.art}.webp" alt="">`:'<i class="gem gem-emerald"></i>',()=>S.addDecoration(state,'gem',g.id),false,g.id+' gem'));
      addDecorationPips(nail.gems.length,'gems');
    } else {
      [['heart-ring','accessory-heart-ring'],['star-ring','gem-star'],['pearl-bracelet','accessory-pearl-bracelet'],['bow-bracelet','accessory-bow']].forEach(([id,art])=>choice(`<img src="./assets/icons/${art}.webp" alt="">`,()=>S.setAccessories(state,id),state.accessories.includes(id),id));
    }
  }
  function markFeedback(target){target.classList.remove('feedback');void target.offsetWidth;target.classList.add('feedback');}
  function sound(){
    try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(520,audio.currentTime);o.frequency.exponentialRampToValueAtTime(720,audio.currentTime+.07);g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.055,audio.currentTime+.012);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.11);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.12);}catch(_e){}
  }
  document.addEventListener('click',e=>{sound();markFeedback(e.target.closest('button')||e.target);const burst=document.querySelector('#tapBurst');burst.style.left=`${Math.min(innerWidth-50,e.clientX)}px`;burst.style.top=`${Math.min(innerHeight-50,e.clientY)}px`;burst.classList.remove('go');void burst.offsetWidth;burst.classList.add('go');});
  document.querySelector('#applyAll').addEventListener('click',()=>{S.applyAll(state);renderNails();renderTray();});
  undoButton.addEventListener('click',()=>{S.undo(state);renderNails();renderTray();});
  document.querySelector('#reset').addEventListener('click',()=>{S.resetNail(state);renderNails();renderTray();});
  renderTabs();renderNails();renderTray();
})();
