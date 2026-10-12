(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeadEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LAYOUT_VERSION = 2;
  const TYPES = { necklace: 15, bracelet: 11, earrings: 12 };
  const editorCurves = {
    necklace: (i,n) => { const t=i/(n-1); return {x:18+64*t,y:22+43*Math.sin(Math.PI*t)}; },
    bracelet: (i,n) => { const a=Math.PI*2*i/n-Math.PI/2; return {x:50+30*Math.cos(a),y:49+27*Math.sin(a)}; },
    earrings: (i,n) => { const half=n/2, side=i<half?-1:1, j=i%half; return {x:50+side*(20+j*2),y:20+j*10}; }
  };
  const desiredRadii = {editor:4.4,character:1.35,display:1.7};
  const anchors = {
    character: {
      necklace: {box:{x1:40,y1:37,x2:61,y2:50}, curve:(i,n)=>{const t=i/(n-1);return{x:42+17*t,y:39+8.5*Math.sin(Math.PI*t)};}},
      bracelet: {box:{x1:43,y1:78,x2:51,y2:88}, curve:(i,n)=>{const a=Math.PI*2*i/n;return{x:47+2.5*Math.cos(a),y:83+3.5*Math.sin(a)};}},
      earrings: {box:{x1:37,y1:27,x2:63,y2:38}, curve:(i,n)=>{const half=n/2,j=i%half,left=i<half;return{x:left?38.8:61.2,y:29+j*1.45};}}
    },
    display: {
      necklace: {box:{x1:35,y1:22,x2:65,y2:55}, curve:(i,n)=>{const t=i/(n-1);return{x:37+26*t,y:25+27*Math.sin(Math.PI*t)};}},
      bracelet: {box:{x1:7,y1:47,x2:31,y2:61}, curve:(i,n)=>{const a=Math.PI*2*i/n;return{x:19+10*Math.cos(a),y:54+5*Math.sin(a)};}},
      earrings: {box:{x1:77,y1:39,x2:95,y2:52}, curve:(i,n)=>{const half=n/2,j=i%half,left=i<half;return{x:left?79.2:92.2,y:41+j*1.7};}}
    }
  };
  const clone = v => JSON.parse(JSON.stringify(v));
  function centreOrder(n){ const middle=Math.floor((n-1)/2), order=[middle]; for(let d=1;order.length<n;d++){if(middle-d>=0)order.push(middle-d);if(middle+d<n)order.push(middle+d);} return order; }
  function create(type='necklace') { const count=TYPES[type]||TYPES.necklace; return {id:null,type,cord:'gold',mirror:type==='earrings',centrepiece:null,slots:Array(count).fill(null),history:[],layoutVersion:LAYOUT_VERSION,updated:Date.now()}; }
  function push(s){ s.history.push({slots:clone(s.slots),centrepiece:s.centrepiece,cord:s.cord,mirror:s.mirror}); if(s.history.length>40)s.history.shift(); }
  function mate(s,i){ if(s.type==='earrings')return s.slots.length-1-i; if(i===0)return 0; return i%2?i+1:i-1; }
  function nextFree(state){ if(state.mirror&&state.type!=='earrings'){for(let i=1;i<state.slots.length-1;i+=2)if(!state.slots[i]&&!state.slots[i+1])return i;if(!state.slots[0])return 0;} return state.slots.findIndex(x=>!x); }
  function place(state,item,index){ const s=clone(state); let i=Number.isInteger(index)?index:nextFree(s); if(i<0)return s; push(s); s.slots[i]=clone(item); if(s.mirror)s.slots[mate(s,i)]=clone(item); s.updated=Date.now(); return s; }
  function remove(state,index){ const s=clone(state); push(s); s.slots[index]=null; if(s.mirror)s.slots[mate(s,index)]=null; return s; }
  function undo(state){ const s=clone(state), p=s.history.pop(); if(!p)return s; Object.assign(s,p); return s; }
  function setOption(state,key,value){ const s=clone(state); push(s); s[key]=value; return s; }
  function physicalIndex(type,i,n){
    if(type==='earrings'){const half=n/2;if(i<half)return half-1-i;return half+(i-half);}
    return centreOrder(n)[i];
  }
  function positions(type,profile='editor'){ const n=TYPES[type]||TYPES.necklace, curve=profile==='editor'?editorCurves[type]:anchors[profile][type].curve; return Array.from({length:n},(_,i)=>curve(physicalIndex(type,i,n),n)); }
  function safeRadius(type,profile='editor'){const points=positions(type,profile), desired=desiredRadii[profile]||desiredRadii.editor;let nearest=Infinity;for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)nearest=Math.min(nearest,Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y));return Math.min(desired,Math.max(.35,nearest/2-.08));}
  function anchorBox(type,profile){ return clone(anchors[profile][type].box); }
  function charmPositions(type,profile='editor'){const p=positions(type,profile), size=profile==='editor'?13:profile==='display'?6:4.8;if(type==='earrings'){const half=p.length/2;return [{x:p.slice(0,half).reduce((a,q)=>q.y>a.y?q:a).x,y:Math.max(...p.slice(0,half).map(q=>q.y))+size*.45},{x:p.slice(half).reduce((a,q)=>q.y>a.y?q:a).x,y:Math.max(...p.slice(half).map(q=>q.y))+size*.45}];}if(type==='bracelet'){const front=p.reduce((a,q)=>q.y>a.y?q:a);return[{x:front.x,y:front.y+size*.42}];}const bottom=p.reduce((a,q)=>q.y>a.y?q:a);return[{x:50,y:bottom.y+(profile==='editor'?7:2.6)}];}
  function renderData(state,profile='editor'){ return {type:state.type,cord:state.cord,centrepiece:state.centrepiece,profile,radius:safeRadius(state.type,profile),charmPositions:charmPositions(state.type,profile),items:positions(state.type,profile).map((p,i)=>({...p,item:clone(state.slots[i]),index:i}))}; }
  function serialize(state){ const s=clone(state); delete s.history; return JSON.stringify(s); }
  function deserialize(raw){ const parsed=typeof raw==='string'?JSON.parse(raw):clone(raw); const base=create(parsed.type); return {...base,...parsed,layoutVersion:LAYOUT_VERSION,history:[]}; }
  return {TYPES,LAYOUT_VERSION,create,place,remove,undo,setOption,nextFree,positions,safeRadius,charmPositions,anchorBox,renderData,serialize,deserialize,clone};
});
