(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BeadEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LAYOUT_VERSION = 5;
  const TYPES = { necklace: 9, bracelet: 8, earrings: 8, hairpin: 7 };
  const MODEL_COUNTS = {
    necklace: [7, 9, 9, 8, 7, 9], bracelet: [6, 8, 9, 9, 7, 8],
    earrings: [4, 8, 6, 8, 6, 8], hairpin: [7, 6, 7, 7, 7, 6]
  };
  const boxes = {
    editor: {necklace:[10,10,140,80],bracelet:[10,10,140,80],earrings:[10,10,140,80],hairpin:[14,10,132,80]},
    character: {necklace:[39,30.2,22,10.2],bracelet:[39.7,59.4,7.3,6],earrings:[26,17.8,48,12],hairpin:[36.2,9.4,7,5.8]},
    display: {necklace:[42.8,17.5,14.4,16.8],bracelet:[8.5,35.8,21,9.8],earrings:[78.1,30.5,15.6,12.2],hairpin:[74.5,42.3,14,8.2]},
    box: {necklace:[20,10,60,50],bracelet:[27,13,46,43],earrings:[19,10,62,48],hairpin:[17,18,66,36]}
  };
  const desiredRadii = {editor:10.1,character:1.1,display:1.2,box:3.2};
  const characterRadii = {necklace:1.1,bracelet:1,earrings:1.15,hairpin:1};
  const clone = value => JSON.parse(JSON.stringify(value));
  const line = (n,a,b,y=52)=>Array.from({length:n},(_,i)=>({x:a+(b-a)*i/(n-1),y}));
  const ellipse = (n,cx=50,cy=50,rx=43,ry=34,start=-Math.PI/2)=>Array.from({length:n},(_,i)=>{const a=start+Math.PI*2*i/n;return{x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a)}});

  function modelNumber(modelId) { return Math.max(0, Math.min(5, Number(String(modelId||"").split("-").at(-1))-1 || 0)); }
  function rawGeometry(type, model=0) {
    const count=MODEL_COUNTS[type][model]; let points=[], hardware="";
    if(type==="necklace"){
      if(model===0){points=[{x:50,y:78},...line(6,34,66,39)];hardware="M8 10 Q50 106 92 10";}
      if(model===1){points=Array.from({length:count},(_,i)=>{const t=i/(count-1);return{x:7+86*t,y:10+66*4*t*(1-t)}});hardware="M7 10 Q50 101 93 10";}
      if(model===2){points=Array.from({length:count},(_,i)=>{const t=i/(count-1);return{x:11+78*t,y:12+55*4*t*(1-t)+(i%2?10:0)}});hardware="M8 10 Q50 92 92 10 M15 17 Q50 105 85 17";}
      if(model===3){points=Array.from({length:count},(_,i)=>({x:9+82*i/(count-1),y:28+7*Math.sin(i*Math.PI/(count-1))}));hardware="M7 27 Q50 43 93 27";}
      if(model===4){points=[{x:50,y:76},{x:50,y:56},...line(5,27,73,37)];hardware="M9 10 Q50 96 91 10 M50 54 L50 76";}
      if(model===5){points=[{x:50,y:75},{x:40,y:67},{x:60,y:67},{x:32,y:55},{x:68,y:55},{x:24,y:42},{x:76,y:42},{x:16,y:27},{x:84,y:27}];hardware="M8 10 Q50 96 92 10";}
    } else if(type==="bracelet"){
      if(model===0){points=ellipse(count,50,50,38,31);hardware="M50 15 A40 35 0 1 1 49.9 15";}
      if(model===1){points=ellipse(count,50,48,39,29);hardware="M50 17 A40 31 0 1 1 49.9 17";}
      if(model===2){points=ellipse(count,50,50,40,33);hardware="M50 16 A41 34 0 1 1 49.9 16";}
      if(model===3){points=Array.from({length:count},(_,i)=>({x:9+82*i/(count-1),y:50+(i%2?4:-4)}));hardware="M7 50 Q50 42 93 50";}
      if(model===4){points=ellipse(count,50,49,39,31).map((p,i)=>({...p,y:p.y+(i%2?5:0)}));hardware="M50 16 A40 34 0 1 1 49.9 16";}
      if(model===5){points=Array.from({length:count},(_,i)=>({x:10+80*i/(count-1),y:44+(i%2?12:0)}));hardware="M7 43 L93 57 M7 57 L93 43";}
    } else if(type==="earrings"){
      const pair=(left)=>left.flatMap(p=>[p,{x:100-p.x,y:p.y}]);
      if(model===0){points=pair([{x:27,y:36},{x:27,y:64}]);hardware="M27 12 Q18 20 27 29 M73 12 Q82 20 73 29";}
      if(model===1){points=ellipse(4,27,51,15,24).concat(ellipse(4,73,51,15,24));hardware="M27 12 Q18 20 27 26 M73 12 Q82 20 73 26";}
      if(model===2){points=pair([{x:25,y:34},{x:18,y:60},{x:32,y:60}]);hardware="M25 11 Q16 20 25 29 M75 11 Q84 20 75 29";}
      if(model===3){points=pair([{x:26,y:31},{x:18,y:48},{x:34,y:48},{x:26,y:69}]);hardware="M26 10 Q17 19 26 27 M74 10 Q83 19 74 27";}
      if(model===4){points=pair([{x:25,y:33},{x:25,y:53},{x:25,y:72}]);hardware="M25 10 Q16 19 25 28 M75 10 Q84 19 75 28";}
      if(model===5){points=pair([{x:18,y:27},{x:24,y:39},{x:30,y:51},{x:36,y:63}]);hardware="M18 10 Q10 17 18 23 M82 10 Q90 17 82 23";}
    } else {
      if(model===0){points=[{x:50,y:49},{x:37,y:40},{x:27,y:31},{x:63,y:40},{x:73,y:31},{x:31,y:58},{x:69,y:58}];hardware="M9 54 L91 54 M50 49 C30 12 12 23 30 49 C12 75 34 79 50 52 C66 79 88 75 70 49 C88 23 70 12 50 49";}
      if(model===1){points=line(count,25,75,43);hardware="M8 53 Q50 38 92 53 M10 60 L88 60";}
      if(model===2){points=[{x:50,y:47},...ellipse(6,50,47,24,22)];hardware="M10 60 L90 60 M50 23 C66 23 76 34 76 47 C76 63 62 70 50 70 C38 70 24 63 24 47 C24 34 34 23 50 23";}
      if(model===3){points=line(count,20,80,48);hardware="M9 35 L91 35 L91 62 L9 62 Z M4 67 L96 67";}
      if(model===4){points=[{x:50,y:48},{x:35,y:34},{x:65,y:34},{x:32,y:60},{x:68,y:60},{x:20,y:47},{x:80,y:47}];hardware="M8 65 L92 65 M50 48 C35 12 8 25 28 49 C8 72 36 82 50 48 C64 82 92 72 72 49 C92 25 65 12 50 48";}
      if(model===5){points=[{x:36,y:43},{x:29,y:31},{x:23,y:46},{x:30,y:56},{x:66,y:36},{x:76,y:50}];hardware="M8 61 Q52 43 92 58 M36 22 A20 20 0 1 0 51 54 M66 22 L70 34 L83 35 L73 43 L77 56 L66 49 L55 56 L59 43 L49 35 L62 34 Z";}
    }
    return {points,hardware};
  }
  function mapPoint(p,box){const[x,y,w,h]=box;return{x:x+p.x*w/100,y:y+p.y*h/100};}
  function editorPoints(points, sizes=[],type="",model=0) {
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const spread=points.map(p=>({
      x:34+(p.x-minX)*92/(maxX-minX||1),
      y:maxY===minY?50:25+(p.y-minY)*50/(maxY-minY)
    }));
    if(type==="necklace"&&(model===0||model===4)){
      const start=model===4?2:1,chain=spread.slice(start).sort((a,b)=>a.x-b.x);
      chain.forEach(p=>{p.y=25+25*(1-Math.abs((p.x-80)/46));});
      spread[0].x=80;spread[0].y=84;
      if(model===4){spread[1].x=80;spread[1].y=65;}
    }
    // Keep the 44px touch circles separate at the smallest iPad editor scale.
    // Moving only editor points lets dense beads follow a roomier version of the
    // same silhouette while the worn and display profiles stay pixel-stable.
    for(let pass=0;pass<240;pass++){
      let moved=false;
      for(let i=0;i<spread.length;i++)for(let j=i+1;j<spread.length;j++){
        const dx=spread[j].x-spread[i].x,dy=spread[j].y-spread[i].y,distance=Math.hypot(dx,dy);
        const radiusI=desiredRadii.editor*(sizes[i]||1),radiusJ=desiredRadii.editor*(sizes[j]||1);
        const minimum=Math.max(19,radiusI+radiusJ-.2*Math.min(radiusI,radiusJ));
        if(distance>=minimum)continue;
        const amount=(minimum-distance)/2+.01,ux=distance>.01?dx/distance:0,uy=distance>.01?dy/distance:((i+j)%2?1:-1);
        spread[i].x-=ux*amount;spread[i].y-=uy*amount;spread[j].x+=ux*amount;spread[j].y+=uy*amount;moved=true;
      }
      if(!moved)break;
    }
    return spread;
  }
  const pointCommand=(p,first=false)=>`${first?"M":"L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  function through(points,close=false){return points.map((p,i)=>pointCommand(p,i===0)).join(" ")+(close?" Z":"");}
  const wornArc=(count,left=40,right=60,endY=31.8,drop=3.5)=>Array.from({length:count},(_,i)=>{
    const x=left+(right-left)*i/(count-1),u=(x-(left+right)/2)/((right-left)/2);
    return{x,y:endY+drop*(1-u*u)};
  });
  function editorHardware(type,model,points){
    const paths=[];
    if(type==="necklace"){
      const pendant=model===0||model===4,chain=points.filter((_,i)=>!pendant||i>(model===4?1:0)).sort((a,b)=>a.x-b.x);
      paths.push(through(chain));
      if(pendant){
        const pendantPoint=points[0],connector=model===4?points[1]:chain.reduce((a,b)=>a.y>b.y?a:b),topY=pendantPoint.y-desiredRadii.editor*(model===0?1.65:1.55);
        paths.push(`M${connector.x.toFixed(2)} ${connector.y.toFixed(2)} L${pendantPoint.x.toFixed(2)} ${topY.toFixed(2)}`);
      }
    } else if(type==="bracelet"){
      paths.push(through((model===0||model===1||model===2||model===4)?points:[...points].sort((a,b)=>a.x-b.x),model===0||model===1||model===2||model===4));
    } else if(type==="earrings"){
      const halves=[points.filter(p=>p.x<80),points.filter(p=>p.x>=80)];
      halves.forEach(half=>{
        const ordered=model===1?half:[...half].sort((a,b)=>a.y-b.y);
        paths.push(through(ordered,model===1||model===2));
        const top=ordered.reduce((a,b)=>a.y<b.y?a:b),side=top.x<80?-1:1;
        paths.push(`M${top.x.toFixed(2)} ${top.y.toFixed(2)} Q${(top.x+side*8).toFixed(2)} ${(top.y-12).toFixed(2)} ${top.x.toFixed(2)} ${(top.y-18).toFixed(2)}`);
      });
    } else {
      const ordered=(model===0||model===2||model===4||model===5)?points:[...points].sort((a,b)=>a.x-b.x);
      paths.push(through(ordered,model===2||model===4));
      const ys=points.map(p=>p.y),baseY=Math.max(...ys)+12;
      paths.push(`M${Math.min(...points.map(p=>p.x)).toFixed(2)} ${baseY.toFixed(2)} L${Math.max(...points.map(p=>p.x)).toFixed(2)} ${baseY.toFixed(2)}`);
    }
    return paths.join(" ");
  }
  function geometry(type,modelId,profile="editor",sizes=[]) {
    const model=modelNumber(modelId),raw=rawGeometry(type,model),box=boxes[profile][type],[x,y,w,h]=box;
    if(profile==="editor"){
      const points=editorPoints(raw.points,sizes,type,model);
      return{points,hardware:editorHardware(type,model,points),hardwareTransform:"",bails:(type==="necklace"&&(model===0||model===4))?[{x:points[0].x,y:points[0].y-desiredRadii.editor*sizes[0]-2.6,r:3.2}]:[]};
    }
    if(profile==="character"&&type==="earrings"){
      // The two ears need independent anchors. A single wide box put the old
      // artwork on the cheeks, while its collision radius reduced small drops
      // to dots. Keep each model's local silhouette but register both halves
      // directly from the measured earlobes.
      const points=raw.points.map(p=>({
        x:(p.x<50?39:61)+(p.x-(p.x<50?27:73))*.12,
        y:17.8+p.y*.12
      }));
      const paths=[];
      [points.filter(p=>p.x<50),points.filter(p=>p.x>=50)].forEach(half=>{
        const ordered=model===1?half:[...half].sort((a,b)=>a.y-b.y);
        paths.push(through(ordered,model===1||model===2));
        const top=ordered.reduce((a,b)=>a.y<b.y?a:b),side=top.x<50?-1:1;
        paths.push(`M${top.x.toFixed(2)} ${top.y.toFixed(2)} Q${(top.x+side*.9).toFixed(2)} ${(top.y-1.5).toFixed(2)} ${(top.x+side*.15).toFixed(2)} ${(top.y-2.7).toFixed(2)}`);
      });
      return{points,hardware:paths.join(" "),hardwareTransform:"",bails:[]};
    }
    if(profile==="character"&&type==="necklace"){
      // Wear-it is its own physical layout: every model spans the measured
      // collarbones, every bead sits on a visible cord, and dense catalogue
      // coordinates cannot collapse through a small affine box.
      let points=[],hardware="";
      if(model===0||model===4){
        const chain=wornArc(model===0?6:6,40,60,31.8,3.5),pendantSize=characterRadii.necklace*(sizes[0]||(model===0?1.65:1.55)),lowY=35.3;
        points=[{x:50,y:lowY+pendantSize},...chain];
        hardware=`M40 31.80 Q50 38.80 60 31.80 M50 35.30 L50 ${lowY.toFixed(2)}`;
      }else if(model===2){
        const upper=wornArc(5,40,60,31.3,2.5),lower=wornArc(4,42,58,34.2,2.8);
        points=[...upper,...lower];hardware="M40 31.30 Q50 36.30 60 31.30 M42 34.20 Q50 39.80 58 34.20";
      }else{
        const config=model===1?[9,39.5,60.5,31.5,4]:model===3?[8,41,59,31.1,1.8]:[9,39.5,60.5,31.5,4.2];
        points=wornArc(...config);hardware=`M${config[1]} ${config[3].toFixed(2)} Q50 ${(config[3]+config[4]*2).toFixed(2)} ${config[2]} ${config[3].toFixed(2)}`;
      }
      return{points,hardware,hardwareTransform:"",bails:[]};
    }
    if(profile==="character"&&type==="hairpin"){
      const xs=raw.points.map(p=>p.x),ys=raw.points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const points=raw.points.map(p=>({x:35.5+(p.x-minX)*9/(maxX-minX||1),y:maxY===minY?12:8.8+(p.y-minY)*6/(maxY-minY)}));
      const ordered=(model===0||model===2||model===4||model===5)?points:[...points].sort((a,b)=>a.x-b.x),barY=Math.max(...points.map(p=>p.y))+1.15;
      return{points,hardware:`${through(ordered,model===2||model===4)} M35.2 ${barY.toFixed(2)} L44.8 ${barY.toFixed(2)}`,hardwareTransform:"",bails:[]};
    }
    return{points:raw.points.map(p=>mapPoint(p,box)),hardware:raw.hardware,hardwareTransform:`translate(${x} ${y}) scale(${w/100} ${h/100})`,bails:[]};
  }
  function positions(type,profile="editor",modelId=`${type}-1`) {return geometry(type,modelId,profile).points;}
  function profileBox(type,profile="editor") {return clone(boxes[profile][type]);}
  function cordPath(type,profile="editor",modelId=`${type}-1`) {return geometry(type,modelId,profile).hardware;}
  function safeRadius(type,profile="editor",modelId=`${type}-1`) {
    if(profile==="editor")return desiredRadii.editor;
    const p=positions(type,profile,modelId),desired=desiredRadii[profile];let nearest=Infinity;
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)nearest=Math.min(nearest,Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y));
    if(profile==="character")return Math.min(characterRadii[type],nearest/2.15);
    return Math.min(desired,nearest/2.5);
  }
  function create(type="necklace",modelId=`${type}-1`,jewels=[]) {return{id:null,type,modelId,jewels:clone(jewels),layoutVersion:LAYOUT_VERSION,updated:Date.now()};}
  function customize(state,index,patch){const next=clone(state);if(!next.jewels[index])return next;next.jewels[index]={...next.jewels[index],...patch};next.updated=Date.now();return next;}
  function renderProfile(state,profile) {const g=geometry(state.type,state.modelId,profile,state.jewels.map(j=>j?.size||1));return{type:state.type,profile,cordPath:g.hardware,cordTransform:g.hardwareTransform,bails:g.bails,radius:safeRadius(state.type,profile,state.modelId),items:g.points.map((p,index)=>({...p,index,item:clone(state.jewels[index])}))};}
  function renderCharacterData(state){return renderProfile(state,"character");}
  function renderData(state,profile="editor") {return profile==="character"?renderCharacterData(state):renderProfile(state,profile);}
  function serialize(state){return JSON.stringify(state);}
  function deserialize(raw){const value=typeof raw==="string"?JSON.parse(raw):clone(raw);if(value.layoutVersion!==LAYOUT_VERSION)throw new Error("Old save layout");return{...value,layoutVersion:LAYOUT_VERSION};}
  return{LAYOUT_VERSION,TYPES,MODEL_COUNTS,create,customize,positions,profileBox,cordPath,safeRadius,renderData,renderCharacterData,serialize,deserialize,clone};
});
