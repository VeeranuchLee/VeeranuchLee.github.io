(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else{root.SweetShopStudio=api;api.mount().catch((error)=>{console.error(error);const app=document.querySelector("#app");if(app)app.textContent="The sweet designs could not be loaded. Please try again.";});}})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const WIDTH=900,HEIGHT=600,VERSION=1,SAVE_KEY="sweet-shop-studio-v1";
  const PALETTE=["#f05d8b","#ff9e72","#ffd66e","#8fd3a7","#76bde9","#b991df","#84543e","#fff0d6"];
  const CATEGORIES=[
    {id:"easy",label:"Easy designs",word:"Easy",icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 20c0-7 5-12 12-12s12 5 12 12"/><path d="M10 21h28l-4 19H14z"/><path d="M16 29h16M18 35h12"/></svg>'},
    {id:"cakes",label:"Cakes",word:"Cakes",icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 31h32l-3 9H11zM11 30h26v-9H11zM14 20h20v-8H14z"/><path d="M18 12V7m6 5V6m6 6V7"/></svg>'},
    {id:"cupcakes-cookies",label:"Cupcakes & cookies",word:"Cupcakes",icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 25h20l-3 16H17zM15 24c0-8 4-13 9-13s9 5 9 13M24 11V6"/><circle cx="24" cy="6" r="2"/></svg>'},
    {id:"donuts-pastries",label:"Donuts & pastries",word:"Pastries",icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 28c0-10 7-18 16-18s16 8 16 18-7 13-16 13S8 38 8 28Z"/><path d="M15 19c3 3 5-2 8 1s5-2 9 1"/><circle cx="24" cy="28" r="6"/></svg>'},
    {id:"ice-cream",label:"Ice cream",word:"Scoops",icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m17 25 7 18 7-18M14 24h20"/><circle cx="19" cy="18" r="8"/><circle cx="29" cy="18" r="8"/></svg>'},
    {id:"candy-party",label:"Candy & party",word:"Candy",icon:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="m6 16 9 4v8l-9 4 4-8zM42 16l-9 4v8l9 4-4-8z"/><rect x="15" y="14" width="18" height="20" rx="8"/></svg>'},
  ];
  let DESIGNS=[],activeCategory=CATEGORIES[0].id,manifestPromise=null;
  function compileCatalogue(index,fragments){
    if(!index||index.version!==1||!Number.isInteger(index.designCount)||index.designCount<1||!Array.isArray(index.fragments)||!index.fragments.length)throw new Error("Invalid sweet design index");
    if(fragments.length!==index.fragments.length)throw new Error("Sweet design fragment count mismatch");
    const allowed=new Set(CATEGORIES.map((item)=>item.id)),seen=new Set(),merged=[];
    fragments.forEach((fragment,at)=>{
      if(!fragment||fragment.version!==1||!Array.isArray(fragment.designs))throw new Error(`Invalid sweet design fragment ${index.fragments[at]}`);
      fragment.designs.forEach((item)=>{
        if(!item||!/^[-a-z0-9]+$/.test(item.id)||seen.has(item.id))throw new Error(`Invalid or duplicate sweet design id: ${item?.id}`);
        const minimum=item.category==="easy"?8:30;
        if(typeof item.title!=="string"||!item.title.trim()||!allowed.has(item.category)||!Number.isInteger(item.parts)||item.parts<minimum||item.parts>60)throw new Error(`Invalid sweet design metadata: ${item.id}`);
        for(const key of ["line","regions"])if(typeof item[key]!=="string"||!item[key].startsWith("art/"))throw new Error(`Invalid ${key} path: ${item.id}`);
        if(item.real!==undefined&&(typeof item.real!=="string"||!item.real.startsWith("art/")))throw new Error(`Invalid real path: ${item.id}`);
        seen.add(item.id);merged.push(Object.freeze({...item}));
      });
    });
    if(merged.length!==index.designCount)throw new Error(`Sweet design count mismatch: expected ${index.designCount}, found ${merged.length}`);
    return merged;
  }
  function setDesigns(items){DESIGNS=Object.freeze([...items]);return DESIGNS;}
  async function loadCatalogue(fetcher=globalThis.fetch.bind(globalThis)){
    const indexResponse=await fetcher("data/index.json");if(!indexResponse.ok)throw new Error("Sweet design index did not load");
    const index=await indexResponse.json(),fragments=[];
    for(const filename of index.fragments){const response=await fetcher(`data/${filename}`);if(!response.ok)throw new Error(`Sweet design fragment did not load: ${filename}`);fragments.push(await response.json());}
    return setDesigns(compileCatalogue(index,fragments));
  }
  function loadRenderManifest(fetcher=globalThis.fetch.bind(globalThis)){manifestPromise=manifestPromise||fetcher("art/raster/manifest.json").then((response)=>{if(!response.ok)throw new Error("Sweet design material manifest did not load");return response.json();});return manifestPromise;}
  const $=(selector)=>document.querySelector(selector),$$=(selector)=>[...document.querySelectorAll(selector)];
  const blankDoc=(designId)=>({version:VERSION,id:`sweet-${Date.now()}-${Math.random().toString(16).slice(2)}`,designId,fills:{},madeReal:false,updatedAt:new Date().toISOString()});
  const validDoc=(doc)=>!!(doc&&doc.version===VERSION&&DESIGNS.some((item)=>item.id===doc.designId)&&doc.fills&&typeof doc.fills==="object");
  function loadDocs(storage){try{const docs=JSON.parse(storage.getItem(SAVE_KEY)||"[]");return Array.isArray(docs)?docs.filter(validDoc):[];}catch{return[];}}
  function saveDoc(storage,doc){const docs=loadDocs(storage),at=docs.findIndex((item)=>item.id===doc.id);doc.updatedAt=new Date().toISOString();at<0?docs.unshift(doc):docs.splice(at,1,doc);storage.setItem(SAVE_KEY,JSON.stringify(docs.slice(0,24)));return docs;}
  const rgbId=(data,offset)=>(data[offset]<<16)|(data[offset+1]<<8)|data[offset+2];
  function decodeRegionMap(data){const labels=new Uint32Array(data.length/4);for(let i=0;i<labels.length;i++)labels[i]=rgbId(data,i*4);return labels;}
  function buildPixels(labels){const counts=new Map();for(const id of labels)if(id)counts.set(id,(counts.get(id)||0)+1);const pixels=new Map(),fill=new Map();for(const [id,count] of counts){pixels.set(id,new Int32Array(count));fill.set(id,0);}for(let i=0;i<labels.length;i++){const id=labels[i];if(!id)continue;const at=fill.get(id);pixels.get(id)[at]=i;fill.set(id,at+1);}return pixels;}
  function nearestRegion(labels,x,y,radius,width=WIDTH,height=HEIGHT){x=Math.max(0,Math.min(width-1,Math.round(x)));y=Math.max(0,Math.min(height-1,Math.round(y)));const exact=labels[y*width+x];if(exact)return exact;let best=0,bestDistance=Infinity,limit=Math.ceil(radius);for(let dy=-limit;dy<=limit;dy++)for(let dx=-limit;dx<=limit;dx++){const distance=dx*dx+dy*dy;if(distance>radius*radius||distance>=bestDistance)continue;const px=x+dx,py=y+dy;if(px<0||py<0||px>=width||py>=height)continue;const id=labels[py*width+px];if(id){best=id;bestDistance=distance;}}return best;}
  const parseHex=(hex)=>String(hex).match(/[a-f\d]{2}/gi).slice(0,3).map((part)=>parseInt(part,16));
  function paintFills(output,pixels,fills,alpha=255){for(const [key,colour] of Object.entries(fills)){const rgb=parseHex(colour);for(const index of pixels.get(+key)||[]){const o=index*4;output[o]=rgb[0];output[o+1]=rgb[1];output[o+2]=rgb[2];output[o+3]=alpha;}}return output;}
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
  const hash=(value)=>{const result=Math.sin(value*127.1+311.7)*43758.5453;return result-Math.floor(result);};
  function rgbToHsv(rgb){const [r,g,b]=rgb.map((value)=>value/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d+(g<b?6:0))/6;else if(max===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;}return[h,max?d/max:0,max];}
  function hsvToRgb(h,s,v){const i=Math.floor((h%1+1)%1*6),f=(h%1+1)%1*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);return[[v,q,p,p,t,v][i%6],[t,v,v,q,p,p][i%6],[p,p,t,v,v,q][i%6]].map((value)=>Math.round(value*255));}
  const MATERIAL_DEFAULTS={frosting:"#fff0cf",cream:"#f7e8c4",sponge:"#d89b48",glaze:"#e7b94d",chocolate:"#75462f",fruit:"#e6a62f",candy:"#e8c83d",paper:"#e8ddc8",plate:"#f2eee3",glass:"#d9ece8"};
  function materialFor(design,meta,stat){
    const named={wrapper:"paper",shell:"paper",box:"paper",stand:"plate",cake:"sponge",dough:"sponge",wafer:"sponge",icing:"frosting",filling:"cream","ice-cream":"cream",sauce:"glaze",glass:"glass",candle:"candy"};
    if(named[meta?.material])return named[meta.material];
    const words=`${design.id} ${design.title}`.toLowerCase(),y=(stat.cy-stat.designTop)/Math.max(1,stat.designBottom-stat.designTop),wide=(stat.right-stat.left)>2.6*(stat.bottom-stat.top);
    if(wide&&y>.76)return words.includes("box")||words.includes("basket")||words.includes("cup")?"paper":"plate";
    if(/chocolate|cocoa|gingerbread/.test(words))return"chocolate";
    if(/jar|glass|window|fountain/.test(words)&&stat.n>7000)return"glass";
    if(/candy|gumball|lollipop|jelly|marshmallow|rock|cane|jewellery/.test(words))return"candy";
    if(/fruit|strawberry|cherry|banana|berry|lemon/.test(words)&&y<.48)return"fruit";
    if(/ice|sundae|milkshake|soft-serve|cream puff|macaron/.test(words))return y<.68?"cream":"paper";
    if(/pancake/.test(words))return y<.48?"glaze":"sponge";
    if(/cake|cupcake|teapot/.test(words))return y<.56?"frosting":y>.82?"plate":"sponge";
    if(/donut|doughnut|danish|roll|croissant|churro|waffle|cookie|tart|whoopie/.test(words))return y<.38?"glaze":"sponge";
    if(design.category==="candy-party")return"candy";
    return design.category==="cakes"?"frosting":"sponge";
  }
  // Adapted from Jewel Studio: a two-pass chamfer distance field makes the light
  // follow each closed part instead of tinting a pre-painted photograph.
  function buildGeometry(labels,width=WIDTH,height=HEIGHT){
    const total=width*height,pixels=buildPixels(labels),dist=new Float32Array(total),BIG=1e6,D=Math.SQRT2;
    for(let i=0;i<total;i++)dist[i]=labels[i]?BIG:0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(!dist[i])continue;let v=dist[i];v=x?Math.min(v,dist[i-1]+1):Math.min(v,1);if(y){v=Math.min(v,dist[i-width]+1);if(x)v=Math.min(v,dist[i-width-1]+D);if(x<width-1)v=Math.min(v,dist[i-width+1]+D);}else v=Math.min(v,1);dist[i]=v;}
    for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;if(!dist[i])continue;let v=dist[i];v=x<width-1?Math.min(v,dist[i+1]+1):Math.min(v,1);if(y<height-1){v=Math.min(v,dist[i+width]+1);if(x<width-1)v=Math.min(v,dist[i+width+1]+D);if(x)v=Math.min(v,dist[i+width-1]+D);}else v=Math.min(v,1);dist[i]=v;}
    const stats=new Map();let designTop=height,designBottom=0;
    for(const [id,list]of pixels){let left=width,right=0,top=height,bottom=0,sx=0,sy=0,maxD=1;for(const i of list){const x=i%width,y=(i-x)/width;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sx+=x;sy+=y;maxD=Math.max(maxD,dist[i]);}designTop=Math.min(designTop,top);designBottom=Math.max(designBottom,bottom);stats.set(id,{id,n:list.length,left,right,top,bottom,cx:sx/list.length,cy:sy/list.length,maxD});}
    for(const stat of stats.values()){stat.designTop=designTop;stat.designBottom=designBottom;}
    return{pixels,dist,stats,width,height};
  }
  function shadeRegion(output,geometry,id,material,colour){
    const list=geometry.pixels.get(id),stat=geometry.stats.get(id);if(!list||!stat)return;
    const hsv=rgbToHsv(parseHex(colour)),w=Math.max(1,stat.right-stat.left),h=Math.max(1,stat.bottom-stat.top);
    for(const i of list){const x=i%geometry.width,y=(i-x)/geometry.width,d=geometry.dist[i],edge=clamp(d/Math.min(8,stat.maxD)),softEdge=edge*edge*(3-2*edge),nx=(x-stat.cx)/w,ny=(y-stat.cy)/h;
      const directional=clamp(.5-nx*.72-ny*.72),shine=Math.exp(-((nx+.22)**2+(ny+.25)**2)*42),lowerRight=clamp((nx+ny)*1.7);
      let value=.78+.17*softEdge+(directional-.5)*.18-lowerRight*.045,sat=1,texture=0;
      if(material==="frosting"||material==="cream"){value+=shine*.25;texture=Math.sin((x+y)*.2)*.016;}
      else if(material==="sponge"){texture=(hash(i+id*97)-.5)*.14-(hash(i*7+id)<.055?.16:0);value+=shine*.07-Math.abs(ny)*.035;}
      else if(material==="glaze"){value+=shine*.38+Math.max(0,1-Math.abs((x-stat.left)/w+(y-stat.top)/h-.62)*12)*.13;}
      else if(material==="chocolate"){value+=shine*.22;texture=(hash(i+id*31)-.5)*.045;}
      else if(material==="fruit"||material==="candy"){value+=shine*.36;texture=(hash(i+id*17)-.5)*.028;}
      else if(material==="paper"){texture=Math.sin(x*.42)*.045;value-=Math.abs(nx)*.07;}
      else if(material==="plate"){value+=shine*.16;sat=.96;}
      else if(material==="glass"){value+=shine*.3;sat=.94;}
      const rgb=hsvToRgb(hsv[0],hsv[1]*sat,clamp(hsv[2]*(value+texture),.06,1)),o=i*4;output[o]=rgb[0];output[o+1]=rgb[1];output[o+2]=rgb[2];output[o+3]=255;
    }
  }
  function paintFoodEdges(output,labels,geometry,design,fills,metadata,radius=4){
    const colours=new Map();for(const [id,stat]of geometry.stats){const material=materialFor(design,metadata.get(id),stat),hsv=rgbToHsv(parseHex(fills[id]||MATERIAL_DEFAULTS[material]));colours.set(id,hsv);}
    const total=labels.length,dist=new Float32Array(total),owner=new Uint32Array(labels),BIG=1e6,D=Math.SQRT2,{width,height}=geometry;
    for(let i=0;i<total;i++)dist[i]=labels[i]?0:BIG;
    const relax=(at,from,cost)=>{const candidate=dist[from]+cost;if(candidate<dist[at]&&owner[from]){dist[at]=candidate;owner[at]=owner[from];}};
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(labels[i])continue;if(x)relax(i,i-1,1);if(y){relax(i,i-width,1);if(x)relax(i,i-width-1,D);if(x<width-1)relax(i,i-width+1,D);}}
    for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){const i=y*width+x;if(labels[i])continue;if(x<width-1)relax(i,i+1,1);if(y<height-1){relax(i,i+width,1);if(x<width-1)relax(i,i+width+1,D);if(x)relax(i,i+width-1,D);}}
    for(let i=0;i<total;i++){const id=owner[i];if(labels[i]||!id||dist[i]>radius)continue;const hsv=colours.get(id),rgb=hsvToRgb(hsv[0],Math.max(.12,hsv[1]*.98),clamp(hsv[2]*(.7+.06*dist[i]/radius),.05,.8)),o=i*4;output[o]=rgb[0];output[o+1]=rgb[1];output[o+2]=rgb[2];output[o+3]=255;}
  }
  function renderMadeReal(labels,design,fills={},regionMetadata=[] ,width=WIDTH,height=HEIGHT){
    const geometry=buildGeometry(labels,width,height),output=new Uint8ClampedArray(width*height*4),metadata=new Map(regionMetadata.map((item)=>[item.id,item]));
    const tableY=Math.round(height*.77);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const o=(y*width+x)*4,t=y/Math.max(1,height-1),table=y>=tableY,grain=table?(hash(x*.17+y*2.3)-.5)*2.2:0;if(table){output[o]=Math.round(249-5*t+grain);output[o+1]=Math.round(238-7*t+grain);output[o+2]=Math.round(218-8*t+grain);}else{output[o]=Math.round(255-5*t);output[o+1]=Math.round(252-10*t);output[o+2]=Math.round(243-14*t);}if(Math.abs(y-tableY)<=1){output[o]-=13;output[o+1]-=12;output[o+2]-=10;}output[o+3]=255;}
    if(geometry.stats.size){const stats=[...geometry.stats.values()],left=Math.min(...stats.map((item)=>item.left)),right=Math.max(...stats.map((item)=>item.right)),bottom=Math.max(...stats.map((item)=>item.bottom)),cx=(left+right)/2,rx=Math.max(20,(right-left)*.46),ry=Math.max(9,rx*.085);for(let y=Math.max(0,Math.floor(bottom-ry));y<Math.min(height,Math.ceil(bottom+ry*2));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<Math.min(width,Math.ceil(cx+rx));x++){if(labels[y*width+x])continue;const q=((x-cx)/rx)**2+((y-bottom-ry*.42)/ry)**2;if(q<1){const o=(y*width+x)*4,a=(1-q)*.29;output[o]*=1-a;output[o+1]*=1-a;output[o+2]*=1-a;}}}
    for(const [id,stat]of geometry.stats){const material=materialFor(design,metadata.get(id),stat),colour=fills[id]||MATERIAL_DEFAULTS[material];shadeRegion(output,geometry,id,material,colour);}
    paintFoodEdges(output,labels,geometry,design,fills,metadata);
    return{data:output,geometry};
  }
  function mountReady(){
    const canvases=["flatCanvas","realCanvas","lineCanvas"].map((id)=>$("#"+id)),[flatCanvas,realCanvas,lineCanvas]=canvases;
    const flat=flatCanvas.getContext("2d",{willReadFrequently:true}),real=realCanvas.getContext("2d"),line=lineCanvas.getContext("2d");
    let doc=null,design=null,labels=null,pixels=new Map(),regionMetadata=[],colour=PALETTE[0],eraser=false,history=[],future=[],audio=null,reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loadImage=(src)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
    function sound(kind="tap"){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const now=audio.currentTime,gain=audio.createGain(),osc=audio.createOscillator();osc.type=kind==="reveal"?"sine":"triangle";osc.frequency.setValueAtTime(kind==="reveal"?523:420,now);if(kind==="reveal")osc.frequency.exponentialRampToValueAtTime(1046,now+.42);gain.gain.setValueAtTime(.045,now);gain.gain.exponentialRampToValueAtTime(.001,now+(kind==="reveal"?.48:.12));osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+(kind==="reveal"?.5:.13));}catch{}}
    function show(id){$$('.screen').forEach((screen)=>screen.classList.toggle('active',screen.id===id));$("#backHub").hidden=id==="editor";$("#backStep").hidden=id!=="editor";}
    function snapshot(){history.push(JSON.stringify(doc));if(history.length>30)history.shift();future=[];updateHistory();}
    function updateHistory(){$("#undo").disabled=!history.length;$("#redo").disabled=!future.length;}
    function renderFlat(){const image=flat.createImageData(WIDTH,HEIGHT);paintFills(image.data,pixels,doc.fills);flat.putImageData(image,0,0);}
    function renderReal(){if(!labels)return;const rendered=renderMadeReal(labels,design,doc.fills,regionMetadata),image=real.createImageData(WIDTH,HEIGHT);image.data.set(rendered.data);real.putImageData(image,0,0);}
    function setMadeReal(value,announce=true){doc.madeReal=!!value;realCanvas.hidden=!doc.madeReal;lineCanvas.style.opacity=doc.madeReal?"0":"1";flatCanvas.style.opacity=doc.madeReal?"0":"1";const paper=$("#paper");paper.classList.toggle("real",doc.madeReal);paper.style.background=doc.madeReal?"linear-gradient(135deg,#fff8ea,#ecd7b9)":"";$("#makeReal").hidden=doc.madeReal;$("#keepColouring").hidden=!doc.madeReal;$("#makeReal").setAttribute("aria-pressed",String(doc.madeReal));if(doc.madeReal){renderReal();if(announce){sound("reveal");const stack=$("#canvasStack");stack.classList.remove("revealing");if(!reduced){void stack.offsetWidth;stack.classList.add("revealing");}$("#message").textContent="Ta-da! Your design is ready for the sweet-shop window.";}}else if(announce)$("#message").textContent="Keep colouring — every part is still editable.";}
    async function open(nextDoc){doc=JSON.parse(JSON.stringify(nextDoc));design=DESIGNS.find((item)=>item.id===doc.designId);history=[];future=[];updateHistory();$("#designTitle").textContent=design.title;$("#partCount").textContent=`${design.parts} parts to colour`;show("editor");$("#message").textContent="Loading the design…";const [lineImage,regionImage,manifest]=await Promise.all([loadImage(design.line),loadImage(design.regions),loadRenderManifest()]);line.clearRect(0,0,WIDTH,HEIGHT);line.drawImage(lineImage,0,0,WIDTH,HEIGHT);const scratch=document.createElement("canvas");scratch.width=WIDTH;scratch.height=HEIGHT;const sc=scratch.getContext("2d",{willReadFrequently:true});sc.drawImage(regionImage,0,0);labels=decodeRegionMap(sc.getImageData(0,0,WIDTH,HEIGHT).data);pixels=buildPixels(labels);regionMetadata=manifest.designs.find((item)=>item.id===design.id)?.regions||[];renderFlat();renderReal();setMadeReal(doc.madeReal,false);$("#message").textContent=doc.madeReal?"Your polished design is ready.":"Tap a closed part to colour it.";}
    function card(item,savedDoc){const button=document.createElement("button");button.type="button";button.className="design-card";const image=document.createElement("img");image.src=item.line;image.alt=`${item.title} blank line art`;image.loading="lazy";image.decoding="async";const title=document.createElement("b");title.textContent=item.title;const detail=document.createElement("small");detail.textContent=savedDoc?`Saved ${new Date(savedDoc.updatedAt).toLocaleDateString()}`:`${item.parts} parts to colour`;button.append(image,title,detail);button.onclick=()=>open(savedDoc||blankDoc(item.id));return button;}
    function updateCategoryTabs(){$$(".category-tab").forEach((button)=>{const selected=button.dataset.category===activeCategory;button.classList.toggle("selected",selected);button.setAttribute("aria-pressed",String(selected));});}
    function gallery(){const grid=$("#designGrid");grid.replaceChildren();DESIGNS.filter((item)=>item.category===activeCategory).forEach((item)=>grid.append(card(item)));updateCategoryTabs();}
    CATEGORIES.forEach((category)=>{const button=document.createElement("button");button.type="button";button.className="category-tab";button.dataset.category=category.id;button.setAttribute("aria-label",category.label);button.title=category.label;button.innerHTML=category.icon;const word=document.createElement("span");word.textContent=category.word;button.append(word);button.onclick=()=>{activeCategory=category.id;gallery();sound();};$("#categoryTabs").append(button);});
    function saved(){const docs=loadDocs(SafeStorage.local),grid=$("#savedGrid");grid.replaceChildren();$("#savedEmpty").hidden=!!docs.length;docs.forEach((item)=>grid.append(card(DESIGNS.find((designItem)=>designItem.id===item.designId),item)));$("#saveCount").textContent=docs.length;}
    PALETTE.forEach((paint,index)=>{const button=document.createElement("button");button.type="button";button.className="swatch"+(index===0?" selected":"");button.style.setProperty("--colour",paint);button.setAttribute("aria-label",`Colour ${index+1}`);button.onclick=()=>{colour=paint;$("#customColor").value=paint;eraser=false;$$('.swatch').forEach((candidate)=>candidate.classList.toggle('selected',candidate===button));$("#eraser").classList.remove("active");sound();};$("#palette").append(button);});
    lineCanvas.addEventListener("pointerdown",(event)=>{event.preventDefault();if(!labels||doc.madeReal)return;const rect=lineCanvas.getBoundingClientRect(),x=(event.clientX-rect.left)*WIDTH/rect.width,y=(event.clientY-rect.top)*HEIGHT/rect.height,id=nearestRegion(labels,x,y,24*WIDTH/rect.width);if(!id){$("#message").textContent="That is the background — tap inside a drawn part.";return;}snapshot();if(eraser)delete doc.fills[id];else doc.fills[id]=colour;renderFlat();sound();$("#message").textContent=eraser?"That part is blank again.":"Lovely — choose another colour or fill another part.";});
    $("#customColor").oninput=(event)=>{colour=event.target.value;eraser=false;$$('.swatch').forEach((item)=>item.classList.remove('selected'));$("#eraser").classList.remove("active");};
    $("#eraser").onclick=()=>{eraser=true;$("#eraser").classList.add("active");$$('.swatch').forEach((item)=>item.classList.remove('selected'));$("#message").textContent="Tap a coloured part to make it blank.";};
    $("#undo").onclick=()=>{if(!history.length)return;future.push(JSON.stringify(doc));doc=JSON.parse(history.pop());renderFlat();renderReal();setMadeReal(doc.madeReal,false);updateHistory();};
    $("#redo").onclick=()=>{if(!future.length)return;history.push(JSON.stringify(doc));doc=JSON.parse(future.pop());renderFlat();renderReal();setMadeReal(doc.madeReal,false);updateHistory();};
    $("#makeReal").onclick=()=>{snapshot();setMadeReal(true);};$("#keepColouring").onclick=()=>{snapshot();setMadeReal(false);};
    $("#save").onclick=()=>{saveDoc(SafeStorage.local,doc);saved();sound();$("#message").textContent="Saved — open My bakes whenever you want to continue.";};
    $("#backStep").onclick=()=>{gallery();show("gallery");};$("#myBakes").onclick=()=>{saved();show("saved");};
    gallery();saved();show("gallery");
  }
  async function mount(){if(!DESIGNS.length)await loadCatalogue();mountReady();}
  return{WIDTH,HEIGHT,VERSION,SAVE_KEY,PALETTE,CATEGORIES,MATERIAL_DEFAULTS,get DESIGNS(){return DESIGNS;},compileCatalogue,setDesigns,loadCatalogue,loadRenderManifest,blankDoc,validDoc,loadDocs,saveDoc,decodeRegionMap,buildPixels,nearestRegion,paintFills,rgbToHsv,hsvToRgb,materialFor,buildGeometry,renderMadeReal,mount};
});
