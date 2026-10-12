(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeadEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = { necklace: 15, bracelet: 11, earrings: 12 };
  const editorCurves = {
    necklace: (i,n) => { const t=i/(n-1); return {x:18+64*t,y:22+43*Math.sin(Math.PI*t)}; },
    bracelet: (i,n) => { const a=Math.PI*2*i/n-Math.PI/2; return {x:50+30*Math.cos(a),y:49+27*Math.sin(a)}; },
    earrings: (i,n) => { const half=n/2, side=i<half?-1:1, j=i%half; return {x:50+side*(20+j*2),y:20+j*10}; }
  };
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
  function create(type='necklace') { const count=TYPES[type]||TYPES.necklace; return {id:null,type,cord:'gold',mirror:type==='earrings',centrepiece:null,slots:Array(count).fill(null),history:[],updated:Date.now()}; }
  function push(s){ s.history.push({slots:clone(s.slots),centrepiece:s.centrepiece,cord:s.cord,mirror:s.mirror}); if(s.history.length>40)s.history.shift(); }
  function mate(s,i){ return s.slots.length-1-i; }
  function nextFree(state){ return state.slots.findIndex(x=>!x); }
  function place(state,item,index){ const s=clone(state); let i=Number.isInteger(index)?index:nextFree(s); if(i<0)return s; push(s); s.slots[i]=clone(item); if(s.mirror)s.slots[mate(s,i)]=clone(item); s.updated=Date.now(); return s; }
  function remove(state,index){ const s=clone(state); push(s); s.slots[index]=null; if(s.mirror)s.slots[mate(s,index)]=null; return s; }
  function undo(state){ const s=clone(state), p=s.history.pop(); if(!p)return s; Object.assign(s,p); return s; }
  function setOption(state,key,value){ const s=clone(state); push(s); s[key]=value; return s; }
  function positions(type,profile='editor'){ const n=TYPES[type]||TYPES.necklace, curve=profile==='editor'?editorCurves[type]:anchors[profile][type].curve; return Array.from({length:n},(_,i)=>curve(i,n)); }
  function anchorBox(type,profile){ return clone(anchors[profile][type].box); }
  function renderData(state,profile='editor'){ return {type:state.type,cord:state.cord,centrepiece:state.centrepiece,profile,items:positions(state.type,profile).map((p,i)=>({...p,item:clone(state.slots[i]),index:i}))}; }
  function serialize(state){ const s=clone(state); delete s.history; return JSON.stringify(s); }
  function deserialize(raw){ const parsed=typeof raw==='string'?JSON.parse(raw):clone(raw); const base=create(parsed.type); return {...base,...parsed,history:[]}; }
  return {TYPES,create,place,remove,undo,setOption,nextFree,positions,anchorBox,renderData,serialize,deserialize,clone};
});
