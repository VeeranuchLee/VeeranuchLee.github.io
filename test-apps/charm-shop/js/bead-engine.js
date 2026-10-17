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
    editor: {necklace:[17,13,126,66],bracelet:[41,16,78,68],earrings:[37,12,86,70],hairpin:[39,22,82,52]},
    character: {necklace:[43.2,31.2,13.6,12],bracelet:[40.2,60.2,6.7,5.3],earrings:[38.2,23.6,23.5,8.2],hairpin:[36.2,9.4,7,5.8]},
    display: {necklace:[42.8,17.5,14.4,16.8],bracelet:[8.5,35.8,21,9.8],earrings:[78.1,30.5,15.6,12.2],hairpin:[74.5,42.3,14,8.2]}
  };
  const desiredRadii = {editor:6.8,character:1.05,display:1.2};
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
  function geometry(type,modelId,profile="editor") {const raw=rawGeometry(type,modelNumber(modelId)),box=boxes[profile][type],[x,y,w,h]=box;return{points:raw.points.map(p=>mapPoint(p,box)),hardware:raw.hardware,hardwareTransform:`translate(${x} ${y}) scale(${w/100} ${h/100})`};}
  function positions(type,profile="editor",modelId=`${type}-1`) {return geometry(type,modelId,profile).points;}
  function cordPath(type,profile="editor",modelId=`${type}-1`) {return geometry(type,modelId,profile).hardware;}
  function safeRadius(type,profile="editor",modelId=`${type}-1`) {
    const p=positions(type,profile,modelId),desired=desiredRadii[profile];let nearest=Infinity;
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)nearest=Math.min(nearest,Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y));
    return Math.min(desired,nearest/2.5);
  }
  function create(type="necklace",modelId=`${type}-1`,jewels=[]) {return{id:null,type,modelId,jewels:clone(jewels),layoutVersion:LAYOUT_VERSION,updated:Date.now()};}
  function customize(state,index,patch){const next=clone(state);if(!next.jewels[index])return next;next.jewels[index]={...next.jewels[index],...patch};next.updated=Date.now();return next;}
  function renderData(state,profile="editor") {const g=geometry(state.type,state.modelId,profile);return{type:state.type,profile,cordPath:g.hardware,cordTransform:g.hardwareTransform,radius:safeRadius(state.type,profile,state.modelId),items:g.points.map((p,index)=>({...p,index,item:clone(state.jewels[index])}))};}
  function serialize(state){return JSON.stringify(state);}
  function deserialize(raw){const value=typeof raw==="string"?JSON.parse(raw):clone(raw);if(value.layoutVersion!==LAYOUT_VERSION)throw new Error("Old save layout");return{...value,layoutVersion:LAYOUT_VERSION};}
  return{LAYOUT_VERSION,TYPES,MODEL_COUNTS,create,customize,positions,cordPath,safeRadius,renderData,serialize,deserialize,clone};
});
