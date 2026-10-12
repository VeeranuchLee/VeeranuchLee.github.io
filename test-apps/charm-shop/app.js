(() => {
  "use strict";
  const E = BeadEngine;
  const families = ["round", "pearl", "crystal", "heart", "flower", "star"];
  const colors = [
    ["ruby", "#d93455"], ["tangerine", "#ec7b3c"], ["gold", "#e5b83f"],
    ["emerald", "#2f9b72"], ["aqua", "#35aeb5"], ["sapphire", "#356dcc"],
    ["lavender", "#9b79c9"], ["rose", "#e889a3"], ["cream", "#f5e7c8"], ["cocoa", "#9a6046"],
  ];
  const charms = ["daisy", "butterfly", "strawberry", "cat", "bow", "heart", "moon", "seashell"];
  const familyNames = {round:"Wood", pearl:"Pearl", crystal:"Crystal", heart:"Heart", flower:"Flower", star:"Star"};
  let state = E.create("necklace"), selected = null, currentColor = colors[0], muted = false, audio = null;
  let gift = {paper:"#d98f9c", ribbon:"#d3a43b"}, displayMode = "character", renderSerial = 0;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs={}) => { const n=document.createElementNS(NS,name); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); return n; };

  function sound(kind) {
    if (muted) return;
    try {
      audio = audio || new AudioContext();
      const t=audio.currentTime, o=audio.createOscillator(), g=audio.createGain();
      o.connect(g).connect(audio.destination);
      o.frequency.value={click:360,snap:650,ding:880,rustle:170,full:190}[kind]||440;
      o.type=kind==="rustle"?"sawtooth":kind==="full"?"triangle":"sine";
      g.gain.setValueAtTime(kind==="full"?0.035:0.06,t); g.gain.exponentialRampToValueAtTime(.001,t+(kind==="ding"?.5:.14));
      o.start(t); o.stop(t+(kind==="ding"?.5:.14));
    } catch {}
  }
  function screen(id){ $$(".screen").forEach(x=>x.classList.toggle("active",x.id===id)); if(id==="tryon")renderTry(); if(id==="gallery")renderGallery(); }
  function bubble(text){ const b=$("#bubble"); b.textContent=text; b.classList.add("show"); setTimeout(()=>b.classList.remove("show"),1200); }
  function tint(hex, amount){ const v=parseInt(hex.slice(1),16), f=n=>Math.max(0,Math.min(255,n)); return `#${[v>>16,(v>>8)&255,v&255].map(c=>f(c+amount).toString(16).padStart(2,"0")).join("")}`; }
  function cordPoints(data){
    const p=data.items;
    if(data.type==="earrings"){ const h=p.length/2; return [`M ${p[0].x} ${p[0].y} `+p.slice(1,h).map(q=>`L ${q.x} ${q.y}`).join(" "),`M ${p[h].x} ${p[h].y} `+p.slice(h+1).map(q=>`L ${q.x} ${q.y}`).join(" ")].join(" "); }
    return `M ${p[0].x} ${p[0].y} ${p.slice(1).map(q=>`L ${q.x} ${q.y}`).join(" ")}${data.type==="bracelet"?" Z":""}`;
  }
  function shapeFor(item,x,y,r,id){
    const g=el("g",{class:`bead-art ${item.family}`});
    const dark=tint(item.color,-45), light=tint(item.color,70);
    const grad=el(item.family==="pearl"?"radialGradient":"linearGradient",{id:`g${id}`,x1:"0",y1:"0",x2:"1",y2:"1"});
    [["0%",light,".98"],["45%",item.color,item.family==="crystal"?".72":"1"],["100%",dark,item.family==="crystal"?".55":"1"]].forEach(([o,c,a])=>grad.append(el("stop",{offset:o,"stop-color":c,"stop-opacity":a})));
    const defs=el("defs"); defs.append(grad); g.append(defs);
    let s;
    if(item.family==="crystal") s=el("polygon",{points:`${x},${y-r*1.2} ${x+r},${y-r*.35} ${x+r*.7},${y+r} ${x-r*.7},${y+r} ${x-r},${y-r*.35}`,fill:`url(#g${id})`,stroke:light,"stroke-width":.35});
    else if(item.family==="heart") s=el("path",{d:`M ${x} ${y+r} C ${x-r*1.25} ${y+r*.1},${x-r} ${y-r},${x} ${y-r*.25} C ${x+r} ${y-r},${x+r*1.25} ${y+r*.1},${x} ${y+r}Z`,fill:`url(#g${id})`,stroke:dark,"stroke-width":.35});
    else if(item.family==="flower") s=el("path",{d:Array.from({length:8},(_,i)=>{const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.48:r*1.15;return`${i?"L":"M"} ${x+Math.cos(a)*rr} ${y+Math.sin(a)*rr}`;}).join(" ")+" Z",fill:`url(#g${id})`,stroke:dark,"stroke-width":.35});
    else if(item.family==="star") s=el("path",{d:Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r*1.15;return`${i?"L":"M"} ${x+Math.cos(a)*rr} ${y+Math.sin(a)*rr}`;}).join(" ")+" Z",fill:`url(#g${id})`,stroke:dark,"stroke-width":.35});
    else s=el("circle",{cx:x,cy:y,r,fill:`url(#g${id})`,stroke:item.family==="pearl"?"#fff7e8":dark,"stroke-width":.45});
    g.append(s);
    g.append(el("ellipse",{cx:x-r*.3,cy:y-r*.35,rx:r*.26,ry:r*.17,fill:"#fff","fill-opacity":item.family==="round"?.5:.78,transform:`rotate(-28 ${x} ${y})`}));
    if(item.family==="crystal") g.append(el("path",{d:`M ${x} ${y-r*1.1} L ${x} ${y+r*.9} M ${x-r*.9} ${y-r*.3} L ${x+r*.65} ${y+r*.85}`,stroke:"#fff","stroke-opacity":.62,"stroke-width":.25}));
    return g;
  }
  function charmImage(name,x,y,size){ return el("image",{href:`assets/charms/${name}.webp`,x:x-size/2,y:y-size/2,width:size,height:size}); }
  function svgPiece(target,data,mode="editor"){
    target.replaceChildren();
    const renderId=++renderSerial;
    const rainbow=el("linearGradient",{id:"rainbow",x2:"1",y2:"1"}); ["#d93455","#e5b83f","#35aeb5","#356dcc","#9b79c9"].forEach((c,i)=>rainbow.append(el("stop",{offset:`${i*25}%`,"stop-color":c}))); const defs=el("defs");defs.append(rainbow);target.append(defs);
    target.append(el("path",{class:"jewel-cord",d:cordPoints(data),fill:"none",stroke:data.cord==="gold"?"#d7a52b":data.cord==="silver"?"#d8dde5":"url(#rainbow)","stroke-width":mode==="editor"?1.3:.38,"stroke-linecap":"round","stroke-linejoin":"round"}));
    const r=mode==="editor"?4.4:data.profile==="display"?1.7:1.35;
    data.items.forEach(p=>{
      if(mode!=="editor"&&!p.item)return;
      const g=el("g",{class:`slot${p.index===selected?" selected":""}`,"data-index":p.index});
      if(mode==="editor"){
        g.append(el("circle",{class:"slot-hit",cx:p.x,cy:p.y,r:7.4,fill:"transparent"}));
        if(!p.item)g.append(el("circle",{class:"slot-guide",cx:p.x,cy:p.y,r:2.25,fill:"none",stroke:"#8e705e","stroke-width":.5,"stroke-dasharray":"1 1"}));
      }
      if(p.item)g.append(shapeFor(p.item,p.x,p.y,r,`${renderId}-${p.index}`));
      if(mode==="editor")g.addEventListener("click",()=>{selected=p.index;render();sound("click");});
      target.append(g);
    });
    if(data.centrepiece){ const filled=data.items.filter(p=>p.item), size=mode==="editor"?13:data.profile==="display"?6:4.8; if(data.type==="earrings"){const half=data.items.length/2;[filled.filter(p=>p.index<half),filled.filter(p=>p.index>=half)].forEach(side=>{if(side.length){const c=side.reduce((a,p)=>p.y>a.y?p:a,side[0]);target.append(charmImage(data.centrepiece,c.x,c.y+size*.45,size));}});}else{const c=filled.length?filled.reduce((a,p)=>p.y>a.y?p:a,filled[0]):{x:50,y:65};const y=data.type==="bracelet"?c.y:c.y+(mode==="editor"?7:2.6);target.append(charmImage(data.centrepiece,c.x,y,size));} }
  }
  function render(){ svgPiece($("#cord"),E.renderData(state)); $("#mirror").setAttribute("aria-pressed",state.mirror); $("#mirror").classList.toggle("selected",state.mirror); $$(".swatch").forEach(b=>b.classList.toggle("selected",b.dataset.name===currentColor[0])); }
  function fullFeedback(){ const stage=$("#jewel-stage"); stage.classList.remove("wiggle"); void stage.offsetWidth; stage.classList.add("wiggle"); sound("full"); bubble("The cord is full — choose a bead to replace!"); }
  function addFamily(family){ if(selected===null&&E.nextFree(state)<0){fullFeedback();return;} state=E.place(state,{family,color:currentColor[1],name:currentColor[0]},selected); selected=null; render(); $("#cord").classList.add("snap"); setTimeout(()=>$("#cord").classList.remove("snap"),220); sound("snap"); }
  function chooseColor(name,color){ currentColor=[name,color]; if(selected!==null&&state.slots[selected]){ const item={...state.slots[selected],color,name}; state=E.place(state,item,selected); selected=null; sound("snap"); } else sound("click"); render(); }
  function buildTray(){
    families.forEach(f=>{const b=document.createElement("button");b.className=`family family-${f}`;b.innerHTML=`<span class="material-icon ${f}"></span><small>${familyNames[f]}</small>`;b.setAttribute("aria-label",`Add ${familyNames[f]} bead`);b.onclick=()=>addFamily(f);$("#families").append(b);});
    colors.forEach(([name,color])=>{const b=document.createElement("button");b.className="swatch";b.style.setProperty("--swatch",color);b.dataset.name=name;b.innerHTML=`<span></span><small>${name}</small>`;b.onclick=()=>chooseColor(name,color);$("#colors").append(b);});
    charms.forEach(c=>{const b=document.createElement("button");b.className="charm";b.innerHTML=`<img src="assets/charms/${c}.webp" alt=""><small>${c}</small>`;b.setAttribute("aria-label",`Choose ${c} centrepiece`);b.onclick=()=>{state=E.setOption(state,"centrepiece",c);render();sound("snap");};$("#charms").append(b);});
    families.forEach(f=>colors.forEach(([n,c])=>{const d=document.createElement("div");d.className=`bead-preview ${f}`;d.style.setProperty("--bead",c);d.title=`${n} ${f}`;$("#collection-grid").append(d);}));
  }
  function save(){ const record=E.deserialize(E.serialize(state));record.id=record.id||`${Date.now()}`;const all=loadAll();try{const ix=all.findIndex(x=>x.id===record.id);if(ix>=0)all[ix]=record;else all.unshift(record);localStorage.setItem("little-charm-designs",JSON.stringify(all.slice(0,12)));state=record;state.history=[];}catch{}sound("ding");bubble("Saved in your jewellery box!"); }
  function loadAll(){try{const parsed=JSON.parse(localStorage.getItem("little-charm-designs")||"[]");if(!Array.isArray(parsed))return[];return parsed.filter(r=>r&&E.TYPES[r.type]&&Array.isArray(r.slots)&&r.slots.length===E.TYPES[r.type]).map(r=>E.deserialize(r));}catch{return[];}}
  function renderTry(){ const profile=displayMode==="display"?"display":"character";svgPiece($(".overlay-jewel"),E.renderData(state,profile),"display"); }
  function renderGallery(){const box=$("#saved-grid"),all=loadAll();box.replaceChildren();$("#empty").hidden=all.length>0;all.slice(0,6).forEach(d=>{const b=document.createElement("button"),s=el("svg",{viewBox:"0 0 100 100"});svgPiece(s,E.renderData(d),"display");b.append(s);b.onclick=()=>{state=E.deserialize(d);selected=null;screen("workshop");render();};box.append(b);});}
  $$('[data-open]').forEach(b=>b.onclick=()=>{state=E.create(b.dataset.open);selected=null;screen("workshop");render();sound("click");});
  $$('[data-screen]').forEach(b=>b.onclick=()=>{screen(b.dataset.screen);sound("click");});
  $$(".type-tabs button").forEach(b=>b.onclick=()=>{state=E.create(b.dataset.type);selected=null;render();sound("click");});
  $("#undo").onclick=()=>{state=E.undo(state);selected=null;render();sound("click");};
  $("#remove").onclick=()=>{if(selected!==null&&state.slots[selected]){state=E.remove(state,selected);selected=null;render();sound("click");}else bubble("Tap a bead first, then remove.");};
  $("#mirror").onclick=()=>{state=E.setOption(state,"mirror",!state.mirror);render();sound("click");};
  $$(".cord-choice").forEach(b=>b.onclick=()=>{state=E.setOption(state,"cord",b.dataset.cord);render();sound("click");});
  $$(".finish").forEach(b=>b.onclick=()=>{selected=null;screen("tryon");}); $("#save").onclick=save;
  $("#display").onclick=()=>{displayMode=displayMode==="display"?"character":"display";$("#try-bg").src=displayMode==="display"?"assets/display-stand.webp":"assets/try-on-character.webp";$("#display .tool-label").textContent=displayMode==="display"?"Try on":"Display";renderTry();};
  $("#home").onclick=()=>screen("shop"); $("#mute").onclick=()=>{muted=!muted;$("#mute").textContent=muted?"♪̸":"♪";};
  $("#register").onclick=()=>{$("#gift").hidden=false;$("#receipt-piece").textContent=`One ${state.type}`;$("#receipt-card").textContent=$("#card").value;sound("ding");setTimeout(()=>sound("rustle"),180);};
  $$('[data-paper]').forEach(b=>b.onclick=()=>{gift.paper=b.dataset.paper;$(".gift-box").style.setProperty("--paper",gift.paper);sound("rustle");});
  const ribbonColors={rose:"#b85d73",gold:"#d3a43b",sage:"#718c68"}; $$('[data-ribbon]').forEach(b=>b.onclick=()=>{gift.ribbon=ribbonColors[b.dataset.ribbon];$(".gift-box").style.setProperty("--ribbon",gift.ribbon);sound("rustle");});
  $$(".hotspots button").forEach(b=>b.addEventListener("pointerdown",()=>bubble(b.getAttribute("aria-label"))));
  buildTray(); render();
})();
