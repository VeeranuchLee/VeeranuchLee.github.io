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
    {id:1,orders:[o('plain',1,[20],20),o('iced',1,[50],50)]},
    {id:2,orders:[o('plain',1,[25,50]),o('iced',1,[30,50])]},
    {id:3,orders:[o('plain',1,[50]),o('iced',1,[50]),o('pink',1,[50]),o('pinkIced',1,[50])]},
    {id:4,orders:[o('plain',1,[50]),o('iced',1,[50]),o('pink',1,[50]),o('pinkIced',1,[50])],mixed:true},
    {id:5,orders:[o('plain',1,[100]),o('iced',1,[100]),o('pink',1,[100]),o('pinkIced',1,[100]),o('slushy',1,[100])]},
    {id:6,orders:[o('plain',1,[25,100]),o('iced',1,[30,100]),o('noIce',1,[25,100]),o('pink',1,[35,100]),o('pinkIced',1,[40,100]),o('slushy',1,[55,100])]},
    {id:7,orders:[o('plain',2,[100],50),o('iced',2,[100],60),o('pink',2,[100],70),o('pinkIced',2,[100],80),o('slushy',2,[110],110)]},
    {id:8,orders:[o('plain',3,[100,500],75),o('iced',3,[100,500],90),o('pink',3,[500],105),o('pinkIced',3,[500],120)]},
    {id:9,orders:[o('plain',2,[500],125),o('pink',3,[500],140),o('iced',2,[500],150),o('slushy',3,[500],165)]},
    {id:10,orders:[o('slushy',3,[1000],165),o('pinkIced',3,[1000],120),o('pink',2,[1000],140),o('iced',3,[1000],150)]}
  ];
  function paymentPieces(amount,mixed=false){if(mixed&&amount===50)return[20,20,10];if(amount===110)return[50,50,10];const out=[];for(const d of DENOMS)while(amount>=d){out.push(d);amount-=d;}return out;}
  function nextLandmark(current,paid){if(current>=paid)return paid;if(current<100){const nextTen=Math.ceil((current+1)/10)*10;return Math.min(paid,nextTen);}const nextHundred=Math.ceil((current+1)/100)*100;return Math.min(paid,nextHundred);}
  function bestPiece(current,paid){const target=nextLandmark(current,paid);return DENOMS.find(d=>current+d<=target)||DENOMS.find(d=>current+d<=paid)||0;}
  function countUp(price,paid){if(paid<price)throw new Error('payment below price');const steps=[];let current=price,guard=0;while(current<paid&&guard++<200){const piece=bestPiece(current,paid);if(!piece)throw new Error('no valid piece');steps.push({from:current,piece,to:current+piece,landmark:nextLandmark(current,paid)});current+=piece;}return steps;}
  function validTap(current,paid,piece){return DENOMS.includes(piece)&&current+piece<=paid;}
  function planDay(level){const data=LEVELS[level-1];if(!data)throw new Error('bad level');return Array.from({length:5},(_,i)=>{const order=data.orders[i%data.orders.length],choices=order.payments;const paid=choices[(i+level)%choices.length];return{...order,paid,paymentPieces:paymentPieces(paid,data.mixed&&i===3)};});}
  return{DENOMS,DRINKS,LEVELS,paymentPieces,nextLandmark,bestPiece,countUp,validTap,planDay};
});
