(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeadEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = { necklace: 15, bracelet: 11, earrings: 12 };
  const curves = {
    necklace: (i,n) => { const t=i/(n-1); return {x:18+64*t,y:22+43*Math.sin(Math.PI*t)}; },
    bracelet: (i,n) => { const a=Math.PI*2*i/n-Math.PI/2; return {x:50+30*Math.cos(a),y:49+27*Math.sin(a)}; },
    earrings: (i,n) => { const half=n/2, side=i<half?-1:1, j=i%half; return {x:50+side*(20+j*2),y:20+j*10}; }
  };
  const clone = v => JSON.parse(JSON.stringify(v));
  function create(type='necklace') { const count=TYPES[type]||TYPES.necklace; return {id:null,type,cord:'gold',mirror:type==='earrings',centrepiece:null,slots:Array(count).fill(null),history:[],updated:Date.now()}; }
  function push(s){ s.history.push({slots:clone(s.slots),centrepiece:s.centrepiece,cord:s.cord,mirror:s.mirror}); if(s.history.length>40)s.history.shift(); }
  function mate(s,i){ return s.slots.length-1-i; }
  function place(state,item,index){ const s=clone(state); push(s); let i=Number.isInteger(index)?index:s.slots.findIndex(x=>!x); if(i<0)i=s.slots.length-1; s.slots[i]=clone(item); if(s.mirror)s.slots[mate(s,i)]=clone(item); s.updated=Date.now(); return s; }
  function remove(state,index){ const s=clone(state); push(s); s.slots[index]=null; if(s.mirror)s.slots[mate(s,index)]=null; return s; }
  function undo(state){ const s=clone(state), p=s.history.pop(); if(!p)return s; Object.assign(s,p); return s; }
  function setOption(state,key,value){ const s=clone(state); push(s); s[key]=value; return s; }
  function positions(type){ const n=TYPES[type]||TYPES.necklace; return Array.from({length:n},(_,i)=>curves[type](i,n)); }
  function renderData(state){ return {type:state.type,cord:state.cord,centrepiece:state.centrepiece,items:positions(state.type).map((p,i)=>({...p,item:clone(state.slots[i]),index:i}))}; }
  function serialize(state){ const s=clone(state); delete s.history; return JSON.stringify(s); }
  function deserialize(raw){ const parsed=typeof raw==='string'?JSON.parse(raw):clone(raw); const base=create(parsed.type); return {...base,...parsed,history:[]}; }
  return {TYPES,create,place,remove,undo,setOption,positions,renderData,serialize,deserialize,clone};
});
