(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SorobanLogic=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  function digitValue(rod){return (rod.heaven?5:0)+clamp(rod.earth,0,4);}
  function rodsValue(rods){return rods.reduce((sum,rod,index)=>sum+digitValue(rod)*10**(rods.length-index-1),0);}
  function numberToRods(number,count){const text=String(clamp(number,0,10**count-1)).padStart(count,'0');return [...text].map(d=>{const n=Number(d);return{heaven:n>=5,earth:n%5};});}
  function setEarth(rod,index){return{heaven:!!rod.heaven,earth:index<rod.earth?index:index+1};}
  function toggleHeaven(rod){return{heaven:!rod.heaven,earth:clamp(rod.earth,0,4)};}
  return{digitValue,rodsValue,numberToRods,setEarth,toggleHeaven};
});
