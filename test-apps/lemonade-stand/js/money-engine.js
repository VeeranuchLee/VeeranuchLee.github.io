(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LemonadeMoney=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DENOMS=[1000,500,100,50,20,10,5,2,1];
  const DRINKS={
    plain:{name:'Plain',price:25,art:0,steps:['yellow','no-ice','finish']},
    iced:{name:'Iced',price:30,art:1,steps:['yellow','ice','finish']},
    noIce:{name:'No ice',price:25,art:0,steps:['yellow','no-ice','finish']},
    pink:{name:'Pink',price:35,art:2,steps:['pink','no-ice','finish']},
    pinkIced:{name:'Pink iced',price:40,art:2,steps:['pink','ice','finish']},
    slushy:{name:'Slushy',price:55,art:3,steps:['yellow','slushy','finish']}
  };
  const o=(drink,quantity,payments,total)=>({drink,quantity,total:total||DRINKS[drink].price*quantity,payments});
  const LEVELS=[
    {id:1,step:'exact',orders:[o('plain',1,[20],20),o('iced',1,[30])]},
    {id:2,step:'one-piece',orders:[o('pink',1,[40]),o('pinkIced',1,[50]),o('plain',1,[30])]},
    {id:3,step:'two-piece',orders:[o('pink',1,[50]),o('plain',1,[50]),o('iced',1,[50])]},
    {id:4,step:'under-100',orders:[o('slushy',1,[100]),o('pinkIced',1,[100]),o('pink',1,[50]),o('iced',1,[30,50])]},
    {id:5,step:'mixed-payment',orders:[o('plain',1,[50]),o('iced',1,[50]),o('pink',1,[50]),o('pinkIced',1,[50])],mixed:true},
    {id:6,step:'cross-100',orders:[o('pink',3,[120],105),o('plain',5,[200],125),o('pinkIced',3,[120],120),o('slushy',2,[120],110)]},
    {id:7,step:'party-under-200',orders:[o('plain',2,[100],50),o('iced',2,[100],60),o('pink',2,[100],70),o('pinkIced',2,[100],80),o('slushy',2,[120],110)]},
    {id:8,step:'from-500',orders:[o('plain',5,[500],125),o('pink',3,[500],105),o('pinkIced',3,[500],120),o('slushy',3,[500],165)]},
    {id:9,step:'from-500-mastery',orders:[o('plain',5,[500],125),o('pink',4,[500],140),o('iced',5,[500],150),o('slushy',3,[500],165)]},
    {id:10,step:'from-1000-capstone',orders:[o('slushy',3,[1000],165),o('pinkIced',3,[1000],120),o('pink',4,[1000],140),o('iced',5,[1000],150)]}
  ];
  function paymentPieces(amount,mixed=false){if(mixed&&amount===50)return[20,20,10];if(mixed&&amount===120)return[50,50,20];const out=[];for(const d of DENOMS)while(amount>=d){out.push(d);amount-=d;}return out;}
  function nextLandmark(current,paid){if(current>=paid)return paid;if(current<100){const nextTen=Math.ceil((current+1)/10)*10;return Math.min(paid,nextTen);}const nextHundred=Math.ceil((current+1)/100)*100;return Math.min(paid,nextHundred);}
  function bestPiece(current,paid){const target=nextLandmark(current,paid);return DENOMS.find(d=>current+d<=target)||DENOMS.find(d=>current+d<=paid)||0;}
  function countUp(price,paid){if(paid<price)throw new Error('payment below price');const steps=[];let current=price,guard=0;while(current<paid&&guard++<200){const piece=bestPiece(current,paid);if(!piece)throw new Error('no valid piece');steps.push({from:current,piece,to:current+piece,landmark:nextLandmark(current,paid)});current+=piece;}return steps;}
  function validTap(current,paid,piece){return DENOMS.includes(piece)&&current+piece<=paid;}
  function structure(price,paid,pieces=paymentPieces(paid)){const gap=paid-price;if(!gap)return'exact';if(pieces.length>1)return`mixed-${paid<100?'tens':'hundreds'}`;if(DENOMS.includes(gap))return`one-piece-${gap<20?'coins':'notes'}`;if(paid>=1000)return'from-1000';if(paid>=500)return'from-500';if(price<100&&paid>100)return'cross-100';const hops=countUp(price,paid).length;return hops===2?'two-piece':paid<=100?'under-100':'over-100';}
  function guideFor(record){if(!record||!record.seen)return'full';return record.partialNoReveal>=2?'independent':'partial';}
  function completeGuide(record={},mode,{revealed=false,taught=false}={}){const next={seen:true,partialNoReveal:record.partialNoReveal||0,completed:(record.completed||0)+1,teachingUsed:(record.teachingUsed||0)+(taught?1:0),revealUsed:(record.revealUsed||0)+(revealed?1:0)};if(revealed)next.partialNoReveal=0;else if(mode==='partial')next.partialNoReveal++;return next;}
  function planDay(level){const data=LEVELS[level-1];if(!data)throw new Error('bad level');return Array.from({length:5},(_,i)=>{const order=data.orders[i%data.orders.length],choices=order.payments;const paid=choices[(i+level)%choices.length];return{...order,paid,paymentPieces:paymentPieces(paid,data.mixed&&i===3)};});}
  return{DENOMS,DRINKS,LEVELS,paymentPieces,nextLandmark,bestPiece,countUp,validTap,structure,guideFor,completeGuide,planDay};
});
