(function(root){
'use strict';

const WORLDS={
  length:{title:'Length',unit:'cm',big:'m',fact:100,summary:'1 m = 100 cm',rungs:['Longer?','1 m','Halves','Ruler']},
  mass:{title:'Mass',unit:'g',big:'kg',fact:1000,summary:'1 kg = 1,000 g',rungs:['Heavier?','1 kg','Parts','Scale']},
  capacity:{title:'Capacity',unit:'ml',big:'l',fact:1000,summary:'1 l = 1,000 ml',rungs:['More?','1 l','Parts','Jug']}
};

const BANK={
  length:[
    [
      {prompt:'Which is longer?',answer:'1 m stick',choices:['1 m stick','10 cm ruler','50 cm string'],art:'length-compare',values:{'1 m stick':100,'10 cm ruler':10,'50 cm string':50}},
      {prompt:'Which is longer?',answer:'80 cm ribbon',choices:['20 cm pencil','80 cm ribbon','40 cm brush'],art:'length-compare',values:{'20 cm pencil':20,'80 cm ribbon':80,'40 cm brush':40}}
    ],
    [
      {prompt:'How many centimetres make 1 metre?',answer:'100',choices:['10','100','1,000'],art:'length-blocks',count:1},
      {prompt:'This ribbon is 2 metres. How many centimetres?',answer:'200',choices:['2','20','200'],art:'length-blocks',count:2}
    ],
    [
      {prompt:'Half a metre is how many centimetres?',answer:'50',choices:['5','50','500'],art:'half-stick',fill:.5},
      {prompt:'One and a half metres is how many centimetres?',answer:'150',choices:['15','150','1,500'],art:'half-stick',fill:1.5},
      {prompt:'Two and a half metres is how many centimetres?',answer:'250',choices:['25','250','2,500'],art:'half-stick',fill:2.5}
    ],
    [20,40,60,80,100].map(n=>({prompt:'How long is the ribbon?',answer:String(n),choices:[String(n),String(n===100?80:n+10),String(n===20?40:n-10)],art:'ruler',level:n}))
  ],
  mass:[
    [
      {prompt:'Which is heavier?',answer:'small rock',choices:['big pillow','small rock','book'],art:'balance',heavy:'rock'},
      {prompt:'Which is heavier?',answer:'small apple',choices:['big balloon','small apple','toy block'],art:'balance',heavy:'apple'}
    ],
    [{prompt:'How many grams make 1 kilogram?',answer:'1,000',choices:['100','1,000','10'],art:'mass-weights',count:4}],
    [
      {prompt:'Half a kilogram is how many grams?',answer:'500',choices:['50','500','5,000'],art:'mass-part',fill:.5},
      {prompt:'One quarter of a kilogram is how many grams?',answer:'250',choices:['25','250','2,500'],art:'mass-part',fill:.25},
      {prompt:'Three quarters of a kilogram is how many grams?',answer:'750',choices:['75','750','7,500'],art:'mass-part',fill:.75}
    ],
    [250,500,750,1000].map(n=>({prompt:'What does the scale show?',answer:n===1000?'1,000':String(n),choices:[n===1000?'1,000':String(n),String(n===1000?500:n+250),String(n===250?750:n-250)],art:'dial',level:n}))
  ],
  capacity:[
    [
      {prompt:'Which has more juice?',answer:'the same',choices:['tall glass','wide glass','the same'],art:'same-glasses'},
      {prompt:'Which holds more?',answer:'bucket',choices:['bucket','cup','bowl'],art:'vessels'}
    ],
    [{prompt:'How many millilitres make 1 litre?',answer:'1,000',choices:['100','1,000','10'],art:'litre-cups',count:4}],
    [
      {prompt:'Half a litre is how many millilitres?',answer:'500',choices:['50','500','5,000'],art:'litre-part',fill:.5},
      {prompt:'One quarter of a litre is how many millilitres?',answer:'250',choices:['25','250','2,500'],art:'litre-part',fill:.25},
      {prompt:'Three quarters of a litre is how many millilitres?',answer:'750',choices:['75','750','7,500'],art:'litre-part',fill:.75}
    ],
    [250,500,750,1000].map(n=>({prompt:'How much water is in the jug?',answer:n===1000?'1,000':String(n),choices:[n===1000?'1,000':String(n),String(n===1000?500:n+250),String(n===250?750:n-250)],art:'jug',level:n}))
  ]
};

const ART_KINDS=new Set([
  'length-compare','length-blocks','half-stick','ruler','balance','mass-weights',
  'mass-part','dial','same-glasses','vessels','litre-cups','litre-part','jug'
]);

function shuffle(rng,a){
  a=a.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function question(rng,world,rung,avoid){
  const list=BANK[world][rung-1];
  let q=list[Math.floor(rng()*list.length)];
  if(avoid&&list.length>1&&q.prompt===avoid.prompt)q=list[(list.indexOf(q)+1)%list.length];
  return Object.assign({},q,{world,rung,choices:shuffle(rng,q.choices)});
}

function missState(misses){return{teach:misses>=2,reveal:misses>=3};}

/* Shared drawing coordinates keep the question data, SVG, and tests in lockstep. */
function polarPoint(cx,cy,radius,angle){
  const radians=angle*Math.PI/180;
  return{x:cx+radius*Math.cos(radians),y:cy+radius*Math.sin(radians)};
}

function levelGeometry(kind,level){
  if(kind==='ruler')return{x:70+(level/100)*460};
  if(kind==='dial'){
    /* SVG angles increase clockwise because screen y increases downwards. */
    const angle=135+(level/1000)*270;
    return{angle,...polarPoint(300,132,88,angle)};
  }
  if(kind==='jug')return{y:202-(level/1000)*142};
  throw new Error(`No level geometry for ${kind}`);
}

function dialMarkGeometry(level){
  const angle=levelGeometry('dial',level).angle;
  return{
    angle,
    inner:polarPoint(300,132,96,angle),
    outer:polarPoint(300,132,108,angle),
    label:polarPoint(300,132,126,angle)
  };
}

/* The pan balance, in a 600 x 280 picture. The beam pivots on the post top and tips
   13 degrees towards the heavy side; each pan hangs a fixed string length below its
   beam end, so the heavy pan is LOWER on screen. The string is long enough for a big
   balloon or pillow to stand in the high pan without reaching the top edge. */
const BALANCE={pivot:{x:300,y:50},halfBeam:150,tilt:13,string:130,panHalf:70};

function balanceGeometry(heavy){
  /* 'level' is the 1 kg rung: a bag of flour balanced by four 250 g weights. */
  const heavySide=heavy==='level'?null:heavy==='rock'||heavy==='apple'?'right':'left';
  const angle=!heavySide?0:heavySide==='right'?BALANCE.tilt:-BALANCE.tilt;
  const {x,y}=BALANCE.pivot;
  const left=polarPoint(x,y,BALANCE.halfBeam,180+angle);
  const right=polarPoint(x,y,BALANCE.halfBeam,angle);
  return{
    angle,
    pivot:BALANCE.pivot,
    panHalf:BALANCE.panHalf,
    left:{beam:left,panY:left.y+BALANCE.string},
    right:{beam:right,panY:right.y+BALANCE.string},
    heavySide
  };
}

function teachingSteps(q){
  if(q.art==='length-blocks'||q.art==='half-stick'||q.art==='ruler'){
    const answer=Number(q.answer.replace(',',''));
    return Array.from({length:Math.ceil(answer/10)},(_,i)=>Math.min((i+1)*10,answer));
  }
  if(['mass-weights','mass-part','dial','litre-cups','litre-part','jug'].includes(q.art)){
    const answer=Number(q.answer.replace(',',''));
    return Array.from({length:Math.ceil(answer/250)},(_,i)=>Math.min((i+1)*250,answer));
  }
  return[q.answer];
}

/* The juice-conservation pour. Straight-sided glasses, so juice area = width x height
   and the three amounts are honestly equal (tested): 70x80 = 40x140 = 140x40. */
const GLASSES={
  floor:250,
  first:{w:70,juice:80,h:104},
  tall:{x:180,w:40,juice:140,h:160},
  wide:{x:420,w:140,juice:40,h:62}
};

function hasRenderer(kind){return ART_KINDS.has(kind);}

root.BigSmallUnits={
  WORLDS,BANK,ART_KINDS,question,missState,levelGeometry,dialMarkGeometry,
  balanceGeometry,teachingSteps,hasRenderer,GLASSES
};
if(typeof module!=='undefined')module.exports=root.BigSmallUnits;
})(typeof window!=='undefined'?window:globalThis);
