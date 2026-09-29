(() => {
  'use strict';
  const S = window.NailSalonState;
  const state = S.createState();
  const svgNS = 'http://www.w3.org/2000/svg';
  const nailsRoot = document.querySelector('#nails');
  const accessoryBackLayer = document.querySelector('#accessoryBackLayer');
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
    { id:'gem', icon:'◆', label:'Gem' }, { id:'sparkle', icon:'✦', label:'Sparkle' }, { id:'accessories', icon:'🎀', label:'Accessories' }
  ];
  const polish = ['#f15b9c','#f58aaa','#ff9c87','#ffb35c','#ffd267','#72d8cd','#65bceb','#a989e9','#e9685e','#d8205d','#372d3b','#f3efe9'];
  const stickerPacks = {
    favourites:{icon:'★',items:['daisy','bow','strawberry','star','heart','rainbow','kitten','cherries'],legacy:true},
    sweets:{icon:'🧁',items:['cupcake','ice-cream','lollipop','donut','macaron','candy']},
    animals:{icon:'🐰',items:['bunny','puppy','panda','bear','duck','fox']},
    garden:{icon:'🌷',items:['tulip','rose','sunflower','leaf','butterfly','ladybird']},
    sky:{icon:'🌙',items:['moon','planet','rocket','cloud','sun','shooting-star']},
    ocean:{icon:'🐚',items:['shell','starfish','fish','whale','octopus','pearl']}
  };
  const singlePatterns = new Set(['stripes','dots','hearts','stars','checks','flowers','waves','glitter-tip','moon-stars']);
  const gems = [{id:'ruby',art:'gem-heart'},{id:'aqua',art:'gem-blue'},{id:'violet',art:'gem-flower'},{id:'pearl',art:'gem-pearl'},{id:'gold',art:'gem-star'},{id:'mint',art:null}];
  let activeTab = 'polish';
  let activePack = 'favourites';
  let audio;
  let handAnchors;
  let accessoryMetrics;

  function el(name, attrs={}) { const n=document.createElementNS(svgNS,name); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); return n; }
  function sparkleEffect(id){return id==='twinkles'?'glints':id;}
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
  function fillFor(nail){ if(nail.finish==='glitter')return 'url(#glitter)'; if(nail.finish==='shimmer')return 'url(#shimmer)'; if(nail.finish==='chrome')return 'url(#chrome)'; return nail.polish; }
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
      addSparkle(group,nail,m,clipId,index);
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
    if(nail.pattern==='none')return;
    const p=el('g',{class:'nail-pattern','clip-path':`url(#${clipId})`});
    const c=nail.patternColor||'#fff';
    if(nail.pattern==='stripes'||nail.pattern==='rainbow') for(let x=m.x-55,i=0;x<m.x+m.w+65;x+=12,i++)p.append(el('line',{x1:x,y1:m.y+m.h,x2:x+68,y2:m.y,stroke:nail.pattern==='rainbow'?['#ff557d','#ffb84d','#ffe45e','#55d7a2','#55aef1','#9b72e8'][i%6]:c,'stroke-width':7,opacity:.9}));
    if(nail.pattern==='dots'||nail.pattern==='leopard') for(let y=m.y+12;y<m.y+m.h;y+=17)for(let x=m.x+9;x<m.x+m.w;x+=17){p.append(el('circle',{cx:x,cy:y,r:nail.pattern==='leopard'?6:4,fill:nail.pattern==='leopard'?'#d99a52':c,stroke:nail.pattern==='leopard'?'#5f3b35':'none','stroke-width':2}));}
    if(nail.pattern==='glitter-tip')p.append(el('path',{d:`M${m.x-3} ${m.y+20} Q${m.cx} ${m.y+34} ${m.x+m.w+3} ${m.y+20}V${m.y-4}H${m.x-3}Z`,fill:c,opacity:.88}));
    if(['hearts','stars','flowers','moon-stars'].includes(nail.pattern)){const chars={hearts:'♥',stars:'★',flowers:'✿','moon-stars':'☾✦'};for(let y=m.y+22;y<m.y+m.h;y+=25){const t=el('text',{x:m.cx,y,'text-anchor':'middle','font-size':16,fill:c});t.textContent=chars[nail.pattern];p.append(t);}}
    if(nail.pattern==='checks')for(let y=m.y;y<m.y+m.h;y+=14)for(let x=m.x;x<m.x+m.w;x+=14)if(((x+y)/14)%2<1)p.append(el('rect',{x,y,width:14,height:14,fill:c,opacity:.8}));
    if(nail.pattern==='waves')for(let y=m.y+14;y<m.y+m.h;y+=18)p.append(el('path',{d:`M${m.x-5} ${y}q10-10 20 0t20 0t20 0`,fill:'none',stroke:c,'stroke-width':5}));
    if(nail.pattern==='marble')for(let i=0;i<4;i++)p.append(el('path',{d:`M${m.x-8} ${m.y+12+i*18} C${m.cx-8} ${m.y+i*14},${m.cx+7} ${m.y+28+i*12},${m.x+m.w+8} ${m.y+8+i*18}`,fill:'none',stroke:['#fff','#bb83dc','#71d9d3','#ffd2e4'][i],'stroke-width':5,opacity:.8}));
    if(nail.pattern==='ombre')p.append(el('rect',{x:m.x,y:m.y,width:m.w,height:m.h,fill:'url(#polishGradient)',opacity:.88}));
    group.append(p);
  }
  function addSparkle(group,nail,m,clipId,index){
    const effect=sparkleEffect(nail.sparkle);
    if(!effect||effect==='none')return;
    const g=el('g',{class:`topcoat topcoat-${effect}`,'data-sparkle-effect':effect,'data-saved-effect':nail.sparkle,'clip-path':`url(#${clipId})`});
    if(effect==='glitter'){
      g.append(el('rect',{class:'glitter-texture',x:m.x,y:m.y,width:m.w,height:m.h,fill:'url(#glitterTopcoat)'}));
      [[.22,.2,1.8],[.74,.31,1.4],[.38,.61,1.5],[.7,.8,1.8]].forEach(([x,y,r],i)=>g.append(el('circle',{class:'glitter-bright',cx:m.x+m.w*x,cy:m.y+m.h*y,r,opacity:i%2?.72:.95})));
    }
    if(effect==='glints')[[.28,.27,7],[.7,.5,6],[.43,.75,5]].forEach(([x,y,r],i)=>{const cx=m.x+m.w*x,cy=m.y+m.h*y,glint=el('g',{class:`light-glint glint-${i+1}`});glint.append(el('circle',{class:'glint-halo',cx,cy,r,fill:'url(#glintGlow)'}));glint.append(el('path',{class:'glint-flare',d:`M${cx-r*.72} ${cy}H${cx+r*.72}M${cx} ${cy-r}V${cy+r}`}));g.append(glint);});
    if(effect==='shine')g.append(el('rect',{class:'shine-band',x:m.x-m.w*.8,y:m.y-8,width:m.w*.72,height:m.h+16,rx:m.w*.3,fill:'url(#shineBand)',transform:`rotate(9 ${m.cx} ${m.y+m.h/2})`}));
    if(effect==='holo'){const sheen=el('g',{class:'holo-drift'});sheen.append(el('rect',{class:'holo-sheen',x:m.x-m.w*.5,y:m.y,width:m.w*2,height:m.h,fill:'url(#holoTopcoat)'}));sheen.append(el('path',{class:'holo-light',d:`M${m.x-m.w*.4} ${m.y+m.h*.78} L${m.x+m.w*1.5} ${m.y+m.h*.2}`}));g.append(sheen);}
    group.append(g);
  }
  const layouts={1:[[.5,.5,30]],2:[[.35,.43,22],[.66,.65,22]],3:[[.5,.28,19],[.31,.65,19],[.7,.65,19]],4:[[.31,.3,17],[.69,.3,17],[.31,.7,17],[.69,.7,17]]};
  const gemLayouts={1:[[.5,.76,21]],2:[[.28,.72,17],[.72,.72,17]],3:[[.25,.72,15],[.5,.53,15],[.75,.72,15]],4:[[.22,.7,13],[.43,.55,13],[.64,.7,13],[.79,.48,13]]};
  function addDecorations(root,list,kind,m){
    const poses=(kind==='gem'?gemLayouts:layouts)[list.length]||[];
    list.forEach((id,i)=>{const [px,py,size]=poses[i];if(kind==='sticker'){root.append(el('image',{class:'decoration',href:`./assets/stickers/${id}.webp`,x:m.x+m.w*px-size/2,y:m.y+m.h*py-size/2,width:size,height:size,preserveAspectRatio:'xMidYMid meet'}));}else{const gem=gems.find(g=>g.id===id)||gems[0];if(gem.art){root.append(el('image',{class:'decoration',href:`./assets/icons/${gem.art}.webp`,x:m.x+m.w*px-size/2,y:m.y+m.h*py-size/2,width:size,height:size,preserveAspectRatio:'xMidYMid meet'}));}else{const cx=m.x+m.w*px,cy=m.y+m.h*py;root.append(el('path',{class:'decoration',d:`M${cx-size*.34} ${cy-size*.42}H${cx+size*.34}L${cx+size*.5} ${cy-size*.12}L${cx+size*.27} ${cy+size*.45}H${cx-size*.27}L${cx-size*.5} ${cy-size*.12}Z`,fill:'#42c891',stroke:'#d8ffed','stroke-width':2}));}}});
  }
  function renderAccessories(){
    accessoryBackLayer.replaceChildren();
    accessoryLayer.replaceChildren();
    if(!handAnchors)return;
    const specs={
      'heart-ring':{anchor:'ringFingerBase',heightAnchor:'ringFingerBase',heightRatio:440/640,offsetY:0},
      'pearl-bracelet':{anchor:'wrist',heightAnchor:'wrist',heightRatio:440/640,offsetY:0},
      'pink-bow':{anchor:'upperWrist',heightAnchor:'wrist',heightRatio:400/640,offsetY:0}
    };
    Object.entries(specs).forEach(([id,spec])=>{
      if(!state.accessories.includes(id))return;
      const a=handAnchors.anchors[spec.anchor].svg,coverage=accessoryMetrics.wrapCoverage[id],w=a.width/coverage.visibleSpanFraction,h=handAnchors.anchors[spec.heightAnchor].svg.width*spec.heightRatio,x=a.centreX-w/2,bandY=a.row+spec.offsetY,y=bandY-h*.43;
      const transform=`rotate(${a.bandAngleDegrees} ${a.centreX} ${bandY})`;
      const attrs={class:'worn-accessory',x,y,width:w,height:h,preserveAspectRatio:'none',transform,'data-accessory':id,'data-left':a.left,'data-right':a.right};
      accessoryBackLayer.append(el('image',{...attrs,href:`./assets/accessories/${id}-back.webp`,mask:'url(#handSkinMask)'}));
      const front=el('image',{...attrs,href:`./assets/accessories/${id}-front.webp`});
      front.setAttribute('mask','url(#handSkinMask)');
      accessoryLayer.append(front);
    });
    accessoryLayer.parentNode.append(accessoryLayer);
  }

  async function accessoryPixelCheck() {
    const clone=document.querySelector('#handSvg').cloneNode(true);
    clone.querySelector('.painted-hand')?.remove(); clone.querySelector('#nails')?.remove();
    clone.setAttribute('width','620'); clone.setAttribute('height','690');
    const baseUrl=new URL('.',location.href).href;
    for(const img of clone.querySelectorAll('image')){
      let href=img.getAttribute('href'); if(!href) continue;
      if(!/^[a-z][a-z0-9+.-]*:/i.test(href)) href=new URL(href,baseUrl).href;
      try{
        const blob=await (await fetch(href,{mode:'cors'})).blob();
        const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
        img.setAttribute('href',dataUrl);
      }catch(e){throw new Error(`Failed to inline ${href}: ${e.message}`);}
    }
    const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'});
    const url=URL.createObjectURL(blob);
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('accessory SVG failed to load'));img.src=url;});
    const canvas=document.createElement('canvas'); canvas.width=620;canvas.height=690;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,620,690);URL.revokeObjectURL(url);
    const pixels=ctx.getImageData(220,500,190,100).data;let painted=0;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]>16)painted++;
    if(painted<250)throw new Error(`Accessory pixel check failed: ${painted} painted pixels in wrist box`);
    return painted;
  }
  window.__nailSalonAccessoryPixelCheck=accessoryPixelCheck;
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
      ['glitter','shimmer','chrome'].forEach(id=>choice(`<img class="finish-art" src="./assets/icons/finish-${id}.webp" alt="">`,()=>S.update(state,{finish:id}),nail.finish===id,id));
    } else if(activeTab==='pattern'){
      ['none','stripes','dots','hearts','stars','checks','rainbow','marble','flowers','waves','ombre','glitter-tip','moon-stars','leopard'].forEach(id=>choice(id==='none'?'○':`<i class="pattern-icon pattern-${id}" style="--base:${nail.polish};--pattern:${nail.patternColor}"></i>`,()=>S.update(state,{pattern:id}),nail.pattern===id,id));
      if(singlePatterns.has(nail.pattern)){const row=document.createElement('div');row.className='pattern-colours';row.setAttribute('aria-label','Pattern colour');['#ffffff','#ff4f9e','#ffcf45','#55d7a2','#55aef1','#8a62df','#2f2740'].forEach(c=>{const b=document.createElement('button');b.className='pattern-colour'+(nail.patternColor===c?' selected':'');b.style.setProperty('--swatch',c);b.setAttribute('aria-label','Choose pattern colour');b.addEventListener('click',()=>{S.update(state,{patternColor:c});renderNails();renderTray();});row.append(b);});tray.append(row);}
    } else if(activeTab==='sticker'){
      const switcher=document.createElement('div');switcher.className='pack-switcher';Object.entries(stickerPacks).forEach(([id,p])=>{const b=document.createElement('button');b.className=id===activePack?'selected':'';b.textContent=p.icon;b.setAttribute('aria-label',`${id} sticker pack`);b.addEventListener('click',()=>{activePack=id;renderTray();});switcher.append(b);});tray.append(switcher);
      const pack=stickerPacks[activePack];pack.items.forEach(id=>choice(`<img src="./assets/stickers/${pack.legacy?'':'v2/'}${id}.webp" alt="">`,()=>S.addDecoration(state,'sticker',`${pack.legacy?'':'v2/'}${id}`),false,id));
      addDecorationPips(nail.stickers.length,'stickers');
    } else if(activeTab==='gem'){
      gems.forEach(g=>choice(g.art?`<img src="./assets/icons/${g.art}.webp" alt="">`:'<i class="gem gem-emerald"></i>',()=>S.addDecoration(state,'gem',g.id),false,g.id+' gem'));
      addDecorationPips(nail.gems.length,'gems');
    } else if(activeTab==='sparkle'){
      ['none','glitter','glints','shine','holo'].forEach(id=>choice(`<i class="sparkle-choice sparkle-${id}" data-preview="${id}"><b></b></i>`,()=>S.update(state,{sparkle:id}),sparkleEffect(nail.sparkle)===id,id));
    } else {
      [['heart-ring','accessory-heart-ring'],['pink-bow','accessory-bow'],['pearl-bracelet','accessory-pearl-bracelet']].forEach(([id,art])=>choice(`<img src="./assets/icons/${art}.webp" alt="">`,()=>S.setAccessories(state,id),state.accessories.includes(id),id));
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
  async function start(){
    const [anchorResponse,metricResponse]=await Promise.all([fetch('./assets/art/hand-anchors.json'),fetch('./assets/accessories/provenance.json')]);
    if(!anchorResponse.ok||!metricResponse.ok)throw new Error(`Accessory geometry failed to load: ${anchorResponse.status}/${metricResponse.status}`);
    [handAnchors,accessoryMetrics]=await Promise.all([anchorResponse.json(),metricResponse.json()]);
    renderTabs();renderNails();renderTray();
  }
  start().catch(error=>{console.error(error);renderTabs();renderNails();renderTray();});

  /* ══ SALON MUSIC ══
     Owner, 2026-09-29, verbatim: "nail salon -> pls add calm music bed (salon feel)".
     Same shape as the math-app menu bed and the coloring-app mode-menu bed: one
     generated instrumental loop, off by default, remembered per device, behind its own
     toggle, starting only on a real user gesture because a browser will not start audio
     before one -- and this app's very first screen IS the salon, so there is no separate
     "menu" moment to arm against; the first tap anywhere (including the toggle itself)
     is the gesture.

     LOW, UNDER THE TAP SOUND. `sound()` above peaks its WebAudio gain at .055 for a
     12ms blip; FULL here is a steady-state HTML5 <audio> volume, a different scale, but
     it is deliberately set low enough that a tap's chime is never masked by the bed --
     .16 rather than the worlds' .20, because this app has no narration to duck under
     and the bed should read as room tone, not a soundtrack.

     NO PLAYHEAD PERSISTENCE. Magic Math's hub/world pages park the bed's currentTime in
     localStorage because a child crosses page boundaries and a restarted intro would be
     audible. Nail Salon is one screen for the whole session -- nothing to hand off to --
     so that mechanism does not apply here. */
  var Music=(function(){
    var SRC='./assets/audio/menu-bed.m4a';
    var KEY='ns_music';
    var FULL=0.16;
    var RAMP_MS=420, STEP_MS=40;
    var el=null, ramp=0, armed=false;
    var pref=(function(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}})();

    function fadeTo(v,thenPause){
      if(!el)return;
      if(ramp){clearInterval(ramp);ramp=0;}
      var from=el.volume, steps=Math.max(1,Math.round(RAMP_MS/STEP_MS)), i=0;
      ramp=setInterval(function(){
        i++;
        try{el.volume=Math.max(0,Math.min(1,from+(v-from)*(i/steps)));}catch(e){}
        if(i>=steps){
          clearInterval(ramp);ramp=0;
          if(thenPause&&el){try{el.pause();}catch(e){}}
        }
      },STEP_MS);
    }

    /* Arms the next real tap anywhere on the page. Needed when a returning child has
       music on from a previous visit: the page loads silent (autoplay is blocked) and
       this is what starts it on their very first touch, same as the worlds do. */
    function arm(){
      if(armed)return;
      armed=true;
      var go=function(){
        window.removeEventListener('pointerdown',go,true);
        armed=false;
        apply();
      };
      window.addEventListener('pointerdown',go,true);
    }

    function apply(){
      if(!pref){
        if(el&&!el.paused)fadeTo(0,true);
        return;
      }
      if(!el){
        try{el=new Audio(SRC);}catch(e){return;}
        el.loop=true; el.preload='none'; el.volume=0;
      }
      if(document.hidden)return;
      el.volume=0;
      var p;
      try{p=el.play();}catch(e){arm();return;}
      if(p&&p.then)p.then(function(){fadeTo(FULL,false);}).catch(arm);
      else fadeTo(FULL,false);
    }

    return{
      init:function(){apply();},
      enabled:function(){return pref;},
      /* The toggle's own click is the one user gesture on this page that is reliably
         allowed to start playback immediately. */
      setEnabled:function(v){pref=!!v;try{localStorage.setItem(KEY,pref?'1':'0');}catch(e){}apply();},
      /* iPadOS suspends nothing on its own when the tab is hidden, so a music bed left
         playing under a locked screen or a backgrounded Safari tab keeps sounding --
         pause explicitly and resume (silently, needing no new gesture, since play()
         already succeeded once) when the child comes back. */
      onHidden:function(){if(el&&!el.paused){try{el.pause();}catch(e){}}},
      onVisible:function(){if(pref&&el&&el.paused){var p;try{p=el.play();}catch(e){return;}if(p&&p.catch)p.catch(function(){});}}
    };
  })();

  (function(){
    var btn=document.querySelector('#musicToggle');
    if(!btn)return;
    function paint(){
      var on=Music.enabled();
      btn.classList.toggle('music-off',!on);
      btn.setAttribute('aria-label',on?'Salon music on':'Salon music off');
      var label=btn.querySelector('small');
      if(label)label.textContent=on?'Music':'Off';
    }
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      Music.setEnabled(!Music.enabled());
      paint();
    });
    paint();
    Music.init();
    document.addEventListener('visibilitychange',function(){
      if(document.hidden)Music.onHidden();else Music.onVisible();
    });
  })();
})();
