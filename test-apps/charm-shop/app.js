(() => {
  "use strict";
  const E=BeadEngine, R=CharmRenderer, NS="http://www.w3.org/2000/svg", $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const palette=[["Ruby","#d94364"],["Orange","#ee8847"],["Gold","#e5b63e"],["Emerald","#39a77c"],["Aqua","#43b9c1"],["Blue","#4978d3"],["Purple","#9b76cd"],["Pink","#eb91ac"],["Pearl","#f7ead5"],["Cocoa","#9a6248"]];
  const effects=[["none","No effect","none"],["glitter","Glitter","glitter"],["sparkle","Sparkle","sparkle"],["shine","Shine","shine"],["glow","Glow","glow"]];
  /* Drawn icons, not emoji (owner rule 2026-10-20): an emoji is drawn by the operating system,
     so it never matched the boutique and looked different on every device. One stroke style,
     currentColor, aria-hidden; every [data-icon] in the page is filled from here. */
  const S=(d,extra="")=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra}>${d}</svg>`;
  const ICON={
    back:S('<path d="M15 5l-7 7 7 7"/>'),
    home:S('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>'),
    music:S('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    musicOff:S('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/>'),
    heart:S('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    necklace:S('<path d="M5 4c0 7 3 11 7 11s7-4 7-11"/><path d="M12 15l-2.5 3 2.5 3 2.5-3z"/>'),
    bracelet:S('<ellipse cx="12" cy="12" rx="8" ry="5"/><circle cx="12" cy="7" r="1.6"/><circle cx="6" cy="10" r="1.4"/><circle cx="18" cy="10" r="1.4"/>'),
    earrings:S('<path d="M7 3v4"/><path d="M7 7l-3 5 3 5 3-5z"/><path d="M17 3v4"/><path d="M17 7l-3 5 3 5 3-5z"/>'),
    bow:S('<path d="M12 12L4 7v10z"/><path d="M12 12l8-5v10z"/><circle cx="12" cy="12" r="2"/>'),
    girl:S('<circle cx="12" cy="7" r="4"/><path d="M8 6c1-3 7-3 8 0"/><path d="M6 21l2-8h8l2 8z"/>'),
    gift:S('<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M3 7h18v3H3z"/><path d="M12 7v13"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/>'),
    stand:S('<path d="M9 21h6"/><path d="M12 21V12"/><path d="M7 4c0 5 2 8 5 8s5-3 5-8"/>'),
    pencil:S('<path d="M15 4l5 5L9 20H4v-5z"/><path d="M13 6l5 5"/>'),
    none:S('<circle cx="12" cy="12" r="7"/>'),
    glitter:S('<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/>'),
    sparkle:S('<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/>'),
    shine:S('<circle cx="12" cy="12" r="7"/><path d="M12 5a7 7 0 0 1 0 14z" fill="currentColor"/>'),
    glow:S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>')
  };
  const fillIcons=(root=document)=>root.querySelectorAll("[data-icon]").forEach(el=>{el.innerHTML=ICON[el.dataset.icon]||"";});
  const shapes=["round","pearl","crystal","heart","flower","star"];
  const names={
    necklace:["Crystal Pendant","Moonlight Pearls","Layered Rainbow","Tiny Gem Choker","Heart Locket","Flower Garden"],
    bracelet:["Gemstone Bangle","Charm Bracelet","Berry Beads","Tennis Sparkle","Colour Blocks","Friendship Weave"],
    earrings:["Jewel Studs","Pearl Hoops","Beaded Hoops","Crystal Chandelier","Heart Dangles","Star Climbers"],
    hairpin:["Jewel Bow Clip","Bobby Stars","Flower Clip","Gem Barrette","Butterfly Clip","Star & Moon Slide"]
  };
  const baseColours=["#e75d7b","#f0bd46","#45b5b2","#7a83d1","#b47bd2","#f29a68","#55a978","#f09ab2","#f6e5cf"];
  let type="necklace", state=null, selected=0, muted=false, audio=null;
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
  function draw(svg,design,profile="editor",interactive=false){
    return R.draw(svg,design,profile,{interactive,selected,onChoose:index=>{selected=index;draw(svg,state,"editor",true);updateChoiceState();sound(440)}});
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
  /* Outfits (owner 2026-10-23: "i want other clothing style to choose from ... just few is
     enough. but she likes how it appear on the girl"). Each outfit plate is the same girl,
     registered to the original's 1280x960 frame (face, neck, ears and hands measured to match),
     so the jewellery overlay needs no per-outfit positions. The choice is remembered. */
  const OUTFITS=["original","everyday","party","sunny"];
  let outfit="original";
  try{const o=localStorage.getItem("charmShop.outfit");if(OUTFITS.includes(o))outfit=o;}catch(e){}
  const outfitSrc=o=>o==="original"?"assets/try-on-character.webp":`assets/outfits/${o}.webp`;
  function setOutfit(o){outfit=o;try{localStorage.setItem("charmShop.outfit",o)}catch(e){}
    $("#result-bg").src=outfitSrc(o);
    $$("#outfits [data-outfit]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.outfit===o)));sound(640);}
  function clearResultSvg(svg){svg.replaceChildren();svg.removeAttribute("data-render-profile");}
  function destination(kind){
    save();show("result");
    const gift=$("#gift-box"),giftSvg=$("#gift-box svg"),bg=$("#result-bg"),jewel=$("#result-jewel"),outfits=$("#outfits");
    gift.hidden=true;bg.hidden=true;jewel.hidden=true;outfits.hidden=true;gift.classList.remove("wrap");clearResultSvg(giftSvg);clearResultSvg(jewel);
    if(kind==="box"){
      gift.hidden=false;draw(giftSvg,state,"box");requestAnimationFrame(()=>gift.classList.add("wrap"));
    }else{
      bg.hidden=false;jewel.hidden=false;bg.src=kind==="wear"?outfitSrc(outfit):"assets/display-stand.webp";outfits.hidden=kind!=="wear";
      bg.alt=kind==="wear"?"A girl wearing your jewellery":"Your jewellery on the shop display";draw(jewel,state,kind==="wear"?"character":"display");
    }
    sound(kind==="box"?360:780);
  }
  function buildControls(){
    palette.forEach(([name,colour])=>{const b=document.createElement("button");b.dataset.colour=colour;b.setAttribute("aria-label",name);b.innerHTML=`<span class="colour-dot" style="--colour:${colour}"></span><small>${name}</small>`;b.onclick=()=>{state=E.customize(state,selected,{color:colour});draw($("#jewel"),state,"editor",true);updateChoiceState();save();sound(560)};$("#colours").append(b);});
    effects.forEach(([effect,name,picture])=>{const b=document.createElement("button");b.dataset.effect=effect;b.setAttribute("aria-label",name);b.innerHTML=`<span class="effect-picture effect-${effect}">${ICON[picture]}</span><small>${name}</small>`;b.onclick=()=>{const current=state.jewels[selected].effect||"none",next=current===effect&&effect!=="none"?"none":effect;state=E.customize(state,selected,{effect:next});draw($("#jewel"),state,"editor",true);updateChoiceState();save();sound(700)};$("#effects").append(b);});
  }
  $$('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type;renderCatalogue();sound(400)});
  $$('[data-destination]').forEach(b=>b.onclick=()=>destination(b.dataset.destination));
  $("#back-models").onclick=$("#home").onclick=()=>{show("catalogue");renderCatalogue()};
  $("#open-saved").onclick=()=>{renderSaved();show("saved");sound(480)};
  $("#saved-back").onclick=()=>{show("catalogue");renderCatalogue()};
  $("#edit-again").onclick=()=>{show("customise");draw($("#jewel"),state,"editor",true);updateChoiceState()};
  $("#mute").onclick=()=>{muted=!muted;$("#mute").innerHTML=muted?ICON.musicOff:ICON.music;$("#mute").setAttribute("aria-label",muted?"Turn sound on":"Mute sound")};
  fillIcons();
  $$("#outfits [data-outfit]").forEach(b=>{b.onclick=()=>setOutfit(b.dataset.outfit);b.setAttribute("aria-checked",String(b.dataset.outfit===outfit));});
  buildControls();renderCatalogue();
})();
