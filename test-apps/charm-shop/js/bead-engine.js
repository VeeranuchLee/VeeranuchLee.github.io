(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BeadEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LAYOUT_VERSION = 4;
  const TYPES = { necklace: 9, bracelet: 8, earrings: 8 };
  const layouts = {
    editor: {
      necklace:{kind:'necklace',left:13,right:147,top:16,bottom:68},
      bracelet:{kind:'bracelet',cx:80,cy:49,rx:43,ry:30},
      earrings:{kind:'earrings',leftTop:55,rightTop:105,top:15,bottom:68,spread:18}
    },
    character: {
      necklace:{kind:'necklace',left:41,right:60,top:38,bottom:48},
      bracelet:{kind:'bracelet',cx:47,cy:83,rx:2.6,ry:3.6},
      earrings:{kind:'earrings',leftTop:39,rightTop:61,top:29,bottom:36.8,spread:1}
    },
    display: {
      necklace:{kind:'necklace',left:37,right:63,top:24,bottom:52},
      bracelet:{kind:'bracelet',cx:19,cy:54,rx:10.2,ry:5.2},
      earrings:{kind:'earrings',leftTop:80,rightTop:92,top:41,bottom:50,spread:1}
    }
  };
  const desiredRadii = {editor:6.2,character:1.35,display:1.7};
  const boxes = {
    character:{necklace:{x1:40,y1:37,x2:61,y2:50},bracelet:{x1:43,y1:78,x2:51,y2:88},earrings:{x1:37,y1:27,x2:63,y2:38}},
    display:{necklace:{x1:35,y1:22,x2:65,y2:55},bracelet:{x1:7,y1:47,x2:31,y2:61},earrings:{x1:77,y1:39,x2:95,y2:52}}
  };
  const clone = v => JSON.parse(JSON.stringify(v));
  function centreOrder(n){const middle=Math.floor((n-1)/2),order=[middle];for(let d=1;order.length<n;d++){if(middle+d<n)order.push(middle+d);if(middle-d>=0)order.push(middle-d);}return order;}
  function fillOrder(type){const n=TYPES[type]||TYPES.necklace;if(type==='earrings'){const half=n/2;return Array.from({length:half},(_,i)=>half-1-i);}return centreOrder(n);}
  function create(type='necklace'){const count=TYPES[type]||TYPES.necklace;return{id:null,type,cord:'gold',mirror:type==='earrings',centrepiece:null,slots:Array(count).fill(null),history:[],layoutVersion:LAYOUT_VERSION,updated:Date.now()};}
  function push(s){s.history.push({slots:clone(s.slots),centrepiece:s.centrepiece,cord:s.cord,mirror:s.mirror});if(s.history.length>40)s.history.shift();}
  function mate(s,i){return s.slots.length-1-i;}
  function nextFree(state){for(const i of fillOrder(state.type)){if(!state.slots[i]&&(!state.mirror||!state.slots[mate(state,i)]))return i;}return -1;}
  function place(state,item,index){const s=clone(state);const i=Number.isInteger(index)?index:nextFree(s);if(i<0)return s;push(s);s.slots[i]=clone(item);if(s.mirror)s.slots[mate(s,i)]=clone(item);s.updated=Date.now();return s;}
  function remove(state,index){const s=clone(state);push(s);s.slots[index]=null;if(s.mirror)s.slots[mate(s,index)]=null;return s;}
  function undo(state){const s=clone(state),p=s.history.pop();if(!p)return s;Object.assign(s,p);return s;}
  function setOption(state,key,value){const s=clone(state);push(s);s[key]=value;return s;}
  function point(layout,i,n){
    if(layout.kind==='necklace'){const t=i/(n-1);return{x:layout.left+(layout.right-layout.left)*t,y:layout.top+4*(layout.bottom-layout.top)*t*(1-t)};}
    if(layout.kind==='bracelet'){const a=Math.PI*2*i/n-Math.PI/2;return{x:layout.cx+layout.rx*Math.cos(a),y:layout.cy+layout.ry*Math.sin(a)};}
    const half=n/2,j=i%half,t=j/(half-1),side=i<half?-1:1,top=side<0?layout.leftTop:layout.rightTop;
    return{x:top+side*layout.spread*(2*t-t*t),y:layout.top+(layout.bottom-layout.top)*t};
  }
  function positions(type,profile='editor'){const n=TYPES[type]||TYPES.necklace,layout=layouts[profile][type];return Array.from({length:n},(_,i)=>point(layout,i,n));}
  function cordPath(type,profile='editor'){
    const l=layouts[profile][type];
    if(type==='necklace')return`M ${l.left} ${l.top} Q ${(l.left+l.right)/2} ${2*l.bottom-l.top} ${l.right} ${l.top}`;
    if(type==='bracelet')return`M ${l.cx} ${l.cy-l.ry} A ${l.rx} ${l.ry} 0 1 1 ${l.cx-.001} ${l.cy-l.ry} Z`;
    const lx=l.leftTop-l.spread,rx=l.rightTop+l.spread,controlY=(l.top+l.bottom)/2;
    return`M ${l.leftTop} ${l.top} Q ${lx} ${controlY} ${lx} ${l.bottom} M ${l.rightTop} ${l.top} Q ${rx} ${controlY} ${rx} ${l.bottom}`;
  }
  function safeRadius(type,profile='editor'){const points=positions(type,profile),desired=desiredRadii[profile]||desiredRadii.editor;let nearest=Infinity;for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)nearest=Math.min(nearest,Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y));return Math.min(desired,Math.max(.3,nearest/2.5-.06));}
  function anchorBox(type,profile){return clone(boxes[profile][type]);}
  function charmPositions(type,profile='editor'){
    const p=positions(type,profile),size=profile==='editor'?13:profile==='display'?6:4.8,r=safeRadius(type,profile),gap=profile==='editor'?2.2:.7;
    const hanging=(anchor,xOffset=0)=>({x:anchor.x+xOffset,y:anchor.y+r+gap+size/2,attachX:anchor.x,attachY:anchor.y+r,ringY:anchor.y+r+gap*.55});
    if(type==='earrings'){const half=p.length/2;return[hanging(p[half-1]),hanging(p[p.length-1])];}
    if(type==='bracelet'){return[hanging(p[Math.floor(p.length/2)])];}
    return[hanging(p[Math.floor(p.length/2)])];
  }
  function renderData(state,profile='editor'){return{type:state.type,cord:state.cord,cordPath:cordPath(state.type,profile),centrepiece:state.centrepiece,profile,radius:safeRadius(state.type,profile),charmPositions:charmPositions(state.type,profile),items:positions(state.type,profile).map((p,i)=>({...p,item:clone(state.slots[i]),index:i}))};}
  function serialize(state){const s=clone(state);delete s.history;return JSON.stringify(s);}
  function deserialize(raw){const parsed=typeof raw==='string'?JSON.parse(raw):clone(raw),base=create(parsed.type);if((parsed.layoutVersion||1)<LAYOUT_VERSION){const migrated=Array(base.slots.length).fill(null),order=fillOrder(parsed.type);parsed.slots.forEach((item,i)=>{if(order[i]!==undefined)migrated[order[i]]=item;});parsed.slots=migrated;}return{...base,...parsed,layoutVersion:LAYOUT_VERSION,history:[]};}
  return{TYPES,LAYOUT_VERSION,create,place,remove,undo,setOption,nextFree,fillOrder,positions,cordPath,safeRadius,charmPositions,anchorBox,renderData,serialize,deserialize,clone};
});
