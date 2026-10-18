(() => {
  "use strict";
  const E=BeadEngine, NS="http://www.w3.org/2000/svg", $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const palette=[["Ruby","#d94364"],["Orange","#ee8847"],["Gold","#e5b63e"],["Emerald","#39a77c"],["Aqua","#43b9c1"],["Blue","#4978d3"],["Purple","#9b76cd"],["Pink","#eb91ac"],["Pearl","#f7ead5"],["Cocoa","#9a6248"]];
  const effects=[["none","No effect","○"],["glitter","Glitter","✦"],["sparkle","Sparkle","✧"],["shine","Shine","◒"],["glow","Glow","☀"]];
  const shapes=["round","pearl","crystal","heart","flower","star"];
  const names={
    necklace:["Crystal Pendant","Moonlight Pearls","Layered Rainbow","Tiny Gem Choker","Heart Locket","Flower Garden"],
    bracelet:["Gemstone Bangle","Charm Bracelet","Berry Beads","Tennis Sparkle","Colour Blocks","Friendship Weave"],
    earrings:["Jewel Studs","Pearl Hoops","Beaded Hoops","Crystal Chandelier","Heart Dangles","Star Climbers"],
    hairpin:["Jewel Bow Clip","Bobby Stars","Flower Clip","Gem Barrette","Butterfly Clip","Star & Moon Slide"]
  };
  const baseColours=["#e75d7b","#f0bd46","#45b5b2","#7a83d1","#b47bd2","#f29a68","#55a978","#f09ab2","#f6e5cf"];
  let type="necklace", state=null, selected=0, muted=false, audio=null, renderId=0;
  const node=(name,attrs={})=>{const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};

  function makeModels(kind){return names[kind].map((name,m)=>{
    const count=E.MODEL_COUNTS[kind][m];
    const jewels=Array.from({length:count},(_,i)=>({family:shapes[(i+m*2)%shapes.length],color:baseColours[(i*2+m*3)%baseColours.length],effect:"none",size:1+((i+m)%3)*.1}));
    if(kind==="necklace"&&m===0)jewels[0]={...jewels[0],family:"crystal",size:1.65};
    if(kind==="necklace"&&m===1)jewels.forEach(j=>{j.family="pearl";j.color="#f7ead5"});
    if(kind==="necklace"&&m===4)jewels[0]={...jewels[0],family:"heart",size:1.55};
    if(kind==="bracelet"&&m===3)jewels.forEach(j=>{j.family="crystal";j.size=.82});
    if(kind==="earrings"&&m===0)jewels.forEach(j=>{j.family="crystal";j.size=1.3});
    if(kind==="earrings"&&m===4)jewels.forEach((j,i)=>{if(i%3===2){j.family="heart";j.size=1.4}});
    if(kind==="earrings"&&m===5)jewels.forEach(j=>{j.family="star";j.size=.9});
    if(kind==="hairpin"&&m===0)jewels[0]={...jewels[0],family:"crystal",size:1.35};
    if(kind==="hairpin"&&m===2)jewels.forEach((j,i)=>{j.family=i?"pearl":"flower"});
    if(kind==="hairpin"&&m===4)jewels.forEach((j,i)=>{j.family=i?"crystal":"flower"});
    if(kind==="hairpin"&&m===5)jewels.forEach((j,i)=>{j.family=i<4?"star":"crystal"});
    return E.create(kind,`${kind}-${m+1}`,jewels);
  });}
  const catalogue=Object.fromEntries(Object.keys(E.TYPES).map(k=>[k,makeModels(k)]));

  function sound(freq=520){if(muted)return;try{audio=audio||new AudioContext();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.connect(g).connect(audio.destination);o.frequency.value=freq;o.type="sine";g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.start(t);o.stop(t+.16);}catch{}}
  function show(id){$$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));}
  function tint(hex,n){const v=parseInt(hex.slice(1),16),f=x=>Math.max(0,Math.min(255,x+n));return`#${[v>>16,(v>>8)&255,v&255].map(x=>f(x).toString(16).padStart(2,"0")).join("")}`;}
  function jewelShape(item,x,y,r,id){
    const g=node("g",{class:`jewel-art effect-${item.effect||"none"}`}),dark=tint(item.color,-45),light=tint(item.color,65),size=r*(item.size||1);
    const grad=node("radialGradient",{id:`gem-${id}`,cx:"30%",cy:"24%"});[["0%","#fff"],["28%",light],["68%",item.color],["100%",dark]].forEach(([o,c])=>grad.append(node("stop",{offset:o,"stop-color":c})));
    const defs=node("defs");defs.append(grad);g.append(defs);let s;
    if(item.family==="heart")s=node("path",{d:`M ${x} ${y+size} C ${x-size*1.25} ${y},${x-size} ${y-size},${x} ${y-size*.25} C ${x+size} ${y-size},${x+size*1.25} ${y},${x} ${y+size}Z`});
    else if(item.family==="star")s=node("path",{d:Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,rr=i%2?size*.43:size;return`${i?"L":"M"}${x+Math.cos(a)*rr},${y+Math.sin(a)*rr}`}).join(" ")+"Z"});
    else if(item.family==="flower")s=node("path",{d:Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,rr=i%2?size*.48:size;return`${i?"L":"M"}${x+Math.cos(a)*rr},${y+Math.sin(a)*rr}`}).join(" ")+"Z"});
    else if(item.family==="crystal")s=node("polygon",{points:`${x},${y-size} ${x+size},${y-size*.25} ${x+size*.65},${y+size} ${x-size*.65},${y+size} ${x-size},${y-size*.25}`});
    else s=node("circle",{cx:x,cy:y,r:size});
    s.setAttribute("fill",`url(#gem-${id})`);s.setAttribute("stroke",light);s.setAttribute("stroke-width",r*.12);g.append(s);
    g.append(node("ellipse",{class:"gem-highlight",cx:x-size*.28,cy:y-size*.34,rx:size*.24,ry:size*.14,fill:"#fff"}));
    if(item.effect&&item.effect!=="none"){
      g.append(node("circle",{class:"effect-halo",cx:x,cy:y,r:size*1.45}));
      g.append(node("path",{class:"effect-star one",d:`M${x} ${y-size*1.75}v${size*.85}M${x-size*.42} ${y-size*1.33}h${size*.84}`}));
      g.append(node("path",{class:"effect-star two",d:`M${x+size*1.25} ${y-size*.8}v${size*.7}M${x+size*.9} ${y-size*.45}h${size*.7}`}));
    }
    return g;
  }
  function draw(svg,design,profile="editor",interactive=false){
    svg.replaceChildren();const data=E.renderData(design,profile),id=++renderId;
    if(profile==="display"&&design.type==="hairpin")svg.append(node("rect",{class:"hairpin-display-card",x:72.2,y:39.2,width:18.6,height:14.8,rx:1.8}));
    svg.append(node("path",{class:`jewel-cord ${design.type}`,d:data.cordPath,transform:data.cordTransform,fill:"none",stroke:"#d8ab42","stroke-width":profile==="editor"?3.2:1.1,"vector-effect":"non-scaling-stroke","stroke-linecap":"round","stroke-linejoin":"round"}));
    data.bails.forEach(b=>svg.append(node("circle",{class:"jewel-bail",cx:b.x,cy:b.y,r:b.r,fill:"none",stroke:"#d8ab42","stroke-width":2.2,"vector-effect":"non-scaling-stroke"})));
    data.items.forEach(p=>{if(!p.item)return;const g=node("g",{class:`jewel ${interactive&&p.index===selected?"selected":""}`,"data-index":p.index});
      if(interactive)g.append(node("circle",{class:"hit",cx:p.x,cy:p.y,r:9,fill:"transparent"}));
      g.append(jewelShape(p.item,p.x,p.y,data.radius,`${id}-${p.index}`));
      if(interactive&&p.index===selected)g.append(node("circle",{class:"selection-ring",cx:p.x,cy:p.y,r:data.radius*(p.item.size||1)+2.2}));
      if(interactive){g.setAttribute("role","button");g.setAttribute("tabindex","0");g.setAttribute("aria-label",`Jewel ${p.index+1}`);const choose=()=>{selected=p.index;draw(svg,state,"editor",true);updateChoiceState();sound(440)};g.addEventListener("click",choose);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")choose()});}
      svg.append(g);
    });
  }
  function renderCatalogue(){
    const grid=$("#model-grid");grid.replaceChildren();catalogue[type].forEach((model,i)=>{const b=document.createElement("button"),svg=node("svg",{viewBox:"0 0 160 100","aria-hidden":"true"}),label=document.createElement("b");draw(svg,model,"editor");label.textContent=names[type][i];b.append(svg,label);b.onclick=()=>openModel(model,i);grid.append(b);});
    $$('[data-type]').forEach(b=>b.classList.toggle('chosen',b.dataset.type===type));
  }
  function openModel(model,index){state=E.deserialize(E.serialize(model));state.id=`${state.modelId}-${Date.now()}`;selected=Math.floor(state.jewels.length/2);$("#model-name").textContent=names[state.type][index]||"My jewellery";show("customise");draw($("#jewel"),state,"editor",true);updateChoiceState();sound(620);}
  function updateChoiceState(){if(!state)return;const item=state.jewels[selected];$$('[data-colour]').forEach(b=>b.classList.toggle('chosen',b.dataset.colour===item.color));$$('[data-effect]').forEach(b=>b.classList.toggle('chosen',b.dataset.effect===(item.effect||"none")));}
  function save(){if(!state)return;let all=[];try{const parsed=JSON.parse(localStorage.getItem("little-charm-designs-v5")||"[]");all=Array.isArray(parsed)?parsed.filter(x=>x.layoutVersion===E.LAYOUT_VERSION):[];}catch{}const i=all.findIndex(x=>x.id===state.id);if(i>=0)all[i]=state;else all.unshift(state);try{localStorage.setItem("little-charm-designs-v5",JSON.stringify(all.slice(0,16)));}catch{}}
  function loadAll(){try{const parsed=JSON.parse(localStorage.getItem("little-charm-designs-v5")||"[]");return Array.isArray(parsed)?parsed.filter(x=>x&&x.layoutVersion===E.LAYOUT_VERSION&&E.TYPES[x.type]&&Array.isArray(x.jewels)).map(x=>E.deserialize(x)):[];}catch{return[];}}
  function modelName(design){const index=Number((design.modelId||"").split("-").at(-1))-1;return names[design.type]?.[index]||"My jewellery";}
  function renderSaved(){const grid=$("#saved-grid"),all=loadAll();grid.replaceChildren();$("#saved-empty").hidden=all.length>0;all.forEach(design=>{const b=document.createElement("button"),svg=node("svg",{viewBox:"0 0 160 100","aria-hidden":"true"}),label=document.createElement("b");draw(svg,design,"editor");label.textContent=modelName(design);b.append(svg,label);b.onclick=()=>{state=E.deserialize(design);type=state.type;selected=Math.floor(state.jewels.length/2);$("#model-name").textContent=modelName(state);show("customise");draw($("#jewel"),state,"editor",true);updateChoiceState();sound(620)};grid.append(b);});}
  function destination(kind){save();show("result");$("#gift-box").hidden=kind!=="box";$("#result-bg").hidden=kind==="box";$("#result-jewel").hidden=kind==="box";
    if(kind==="box"){draw($("#gift-box svg"),state,"display");$("#gift-box").classList.remove("wrap");requestAnimationFrame(()=>$("#gift-box").classList.add("wrap"));}
    else{$("#result-bg").src=kind==="wear"?"assets/try-on-character.webp":"assets/display-stand.webp";$("#result-bg").alt=kind==="wear"?"A girl wearing your jewellery":"Your jewellery on the shop display";draw($("#result-jewel"),state,kind==="wear"?"character":"display");}
    sound(kind==="box"?360:780);
  }
  function buildControls(){
    palette.forEach(([name,colour])=>{const b=document.createElement("button");b.dataset.colour=colour;b.setAttribute("aria-label",name);b.innerHTML=`<span class="colour-dot" style="--colour:${colour}"></span><small>${name}</small>`;b.onclick=()=>{state=E.customize(state,selected,{color:colour});draw($("#jewel"),state,"editor",true);updateChoiceState();save();sound(560)};$("#colours").append(b);});
    effects.forEach(([effect,name,picture])=>{const b=document.createElement("button");b.dataset.effect=effect;b.setAttribute("aria-label",name);b.innerHTML=`<span class="effect-picture effect-${effect}">${picture}</span><small>${name}</small>`;b.onclick=()=>{const current=state.jewels[selected].effect||"none",next=current===effect&&effect!=="none"?"none":effect;state=E.customize(state,selected,{effect:next});draw($("#jewel"),state,"editor",true);updateChoiceState();save();sound(700)};$("#effects").append(b);});
  }
  $$('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type;renderCatalogue();sound(400)});
  $$('[data-destination]').forEach(b=>b.onclick=()=>destination(b.dataset.destination));
  $("#back-models").onclick=$("#home").onclick=()=>{show("catalogue");renderCatalogue()};
  $("#open-saved").onclick=()=>{renderSaved();show("saved");sound(480)};
  $("#saved-back").onclick=()=>{show("catalogue");renderCatalogue()};
  $("#edit-again").onclick=()=>{show("customise");draw($("#jewel"),state,"editor",true);updateChoiceState()};
  $("#mute").onclick=()=>{muted=!muted;$("#mute").textContent=muted?"♩":"♪"};
  buildControls();renderCatalogue();
})();
