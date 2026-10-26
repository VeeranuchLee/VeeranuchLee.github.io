(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./bead-engine.js'):root.BeadEngine);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CharmRenderer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const NS='http://www.w3.org/2000/svg';let renderId=0;
  const node=(doc,name,attrs={})=>{const n=doc.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n};
  const tint=(hex,n)=>{const v=parseInt(hex.slice(1),16),f=x=>Math.max(0,Math.min(255,x+n));return`#${[v>>16,(v>>8)&255,v&255].map(x=>f(x).toString(16).padStart(2,'0')).join('')}`};
  function jewelShape(doc,item,x,y,r,id){
    const g=node(doc,'g',{class:`jewel-art effect-${item.effect||'none'}`}),dark=tint(item.color,-45),light=tint(item.color,65),size=r*(item.size||1);
    const grad=node(doc,'radialGradient',{id:`gem-${id}`,cx:'30%',cy:'24%'});[['0%','#fff'],['28%',light],['68%',item.color],['100%',dark]].forEach(([o,c])=>grad.append(node(doc,'stop',{offset:o,'stop-color':c})));
    const defs=node(doc,'defs');defs.append(grad);g.append(defs);let s;
    if(item.family==='heart')s=node(doc,'path',{d:`M ${x} ${y+size} C ${x-size*1.25} ${y},${x-size} ${y-size},${x} ${y-size*.25} C ${x+size} ${y-size},${x+size*1.25} ${y},${x} ${y+size}Z`});
    else if(item.family==='star')s=node(doc,'path',{d:Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,rr=i%2?size*.43:size;return`${i?'L':'M'}${x+Math.cos(a)*rr},${y+Math.sin(a)*rr}`}).join(' ')+'Z'});
    else if(item.family==='flower')s=node(doc,'path',{d:Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,rr=i%2?size*.48:size;return`${i?'L':'M'}${x+Math.cos(a)*rr},${y+Math.sin(a)*rr}`}).join(' ')+'Z'});
    else if(item.family==='crystal')s=node(doc,'polygon',{points:`${x},${y-size} ${x+size},${y-size*.25} ${x+size*.65},${y+size} ${x-size*.65},${y+size} ${x-size},${y-size*.25}`});
    else s=node(doc,'circle',{cx:x,cy:y,r:size});
    s.setAttribute('fill',`url(#gem-${id})`);s.setAttribute('stroke',light);s.setAttribute('stroke-width',r*.12);g.append(s);
    g.append(node(doc,'ellipse',{class:'gem-highlight',cx:x-size*.28,cy:y-size*.34,rx:size*.24,ry:size*.14,fill:'#fff'}));
    if(item.effect&&item.effect!=='none'){
      g.append(node(doc,'circle',{class:'effect-halo',cx:x,cy:y,r:size*1.45}));
      g.append(node(doc,'path',{class:'effect-star one',d:`M${x} ${y-size*1.75}v${size*.85}M${x-size*.42} ${y-size*1.33}h${size*.84}`}));
      g.append(node(doc,'path',{class:'effect-star two',d:`M${x+size*1.25} ${y-size*.8}v${size*.7}M${x+size*.9} ${y-size*.45}h${size*.7}`}));
    }
    return g;
  }
  function draw(svg,design,profile='editor',options={}){
    const doc=svg.ownerDocument||root.document,interactive=!!options.interactive,selected=options.selected??0;
    svg.replaceChildren();const data=profile==='character'?E.renderCharacterData(design):E.renderData(design,profile),id=++renderId;
    svg.setAttribute('data-render-profile',profile);
    if(profile==='display'&&design.type==='hairpin')svg.append(node(doc,'rect',{class:'hairpin-display-card',x:72.2,y:39.2,width:18.6,height:14.8,rx:1.8}));
    const xs=data.items.map(p=>p.x);svg.append(node(doc,'path',{class:`jewel-cord ${design.type}`,d:data.cordPath,transform:data.cordTransform,'data-layout-width':Math.max(...xs)-Math.min(...xs),fill:'none',stroke:'#d8ab42','stroke-width':profile==='editor'?3.2:1.1,'vector-effect':'non-scaling-stroke','stroke-linecap':'round','stroke-linejoin':'round'}));
    data.bails.forEach(b=>svg.append(node(doc,'circle',{class:'jewel-bail',cx:b.x,cy:b.y,r:b.r,fill:'none',stroke:'#d8ab42','stroke-width':2.2,'vector-effect':'non-scaling-stroke'})));
    data.items.forEach(p=>{if(!p.item)return;const size=data.radius*(p.item.size||1),g=node(doc,'g',{class:`jewel ${interactive&&p.index===selected?'selected':''}`,'data-index':p.index,'data-x':p.x,'data-y':p.y,'data-radius':size});
      if(interactive)g.append(node(doc,'circle',{class:'hit',cx:p.x,cy:p.y,r:9,fill:'transparent'}));g.append(jewelShape(doc,p.item,p.x,p.y,data.radius,`${id}-${p.index}`));
      if(interactive&&p.index===selected)g.append(node(doc,'circle',{class:'selection-ring',cx:p.x,cy:p.y,r:data.radius*(p.item.size||1)+2.2}));
      if(interactive){g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`Jewel ${p.index+1}`);const choose=()=>options.onChoose?.(p.index);g.addEventListener('click',choose);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')choose()})}svg.append(g);
    });
    return data;
  }
  return{draw};
});
