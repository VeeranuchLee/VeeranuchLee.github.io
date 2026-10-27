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
  const INGREDIENTS={
    lemon:{name:'Lemons',base:5,step:1},sugar:{name:'Sugar',base:3,step:1},ice:{name:'Ice',base:2,step:1},cup:{name:'Cups',base:2,step:1},pink:{name:'Pink syrup',base:4,step:1},slushyIce:{name:'Slushy ice',base:4,step:1}
  };
  const RECIPES={
    plain:{lemon:2,sugar:1,cup:1},iced:{lemon:2,sugar:1,ice:1,cup:1},noIce:{lemon:2,sugar:1,cup:1},pink:{lemon:2,sugar:1,pink:1,cup:1},pinkIced:{lemon:2,sugar:1,ice:1,pink:1,cup:1},slushy:{lemon:2,sugar:1,slushyIce:2,cup:1}
  };
  const MARKET_REASONS=[
    {key:'rain',text:'Rainy week: lemons cost more',ingredient:'lemon',change:1},
    {key:'sun',text:'Sunny day: ice costs more',ingredient:'ice',change:1},
    {key:'delivery',text:'Big delivery: cups cost less',ingredient:'cup',change:-1},
    {key:'quiet',text:'A calm market day',ingredient:null,change:0}
  ];
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
  function seededUnit(seed){let x=(Number(seed)||1)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;}
  function marketForDay(day,cosy=false){const reason=MARKET_REASONS[Math.abs(day)%MARKET_REASONS.length],prices={};Object.entries(INGREDIENTS).forEach(([key,item],i)=>{const bounded=cosy?0:Math.floor(seededUnit(day*97+i*31)*3)-1;prices[key]=Math.max(1,item.base+bounded*item.step+(reason.ingredient===key?reason.change:0));});return{day,reason:cosy?MARKET_REASONS[3]:reason,prices};}
  function recipeFor(drink){if(!RECIPES[drink])throw new Error('bad drink');return{...RECIPES[drink]};}
  function canMake(stock,drink){return Object.entries(recipeFor(drink)).every(([key,count])=>(stock[key]||0)>=count);}
  function consumeRecipe(stock,drink,quantity=1){const next={...stock},recipe=recipeFor(drink);if(!Object.entries(recipe).every(([key,count])=>(next[key]||0)>=count*quantity))return{ok:false,stock:next};Object.entries(recipe).forEach(([key,count])=>next[key]-=count*quantity);return{ok:true,stock:next};}
  function demandForPrice(drink,price){const base=DRINKS[drink].price,step=price<=50?5:10,delta=Math.round((price-base)/step);return Math.max(1,Math.min(5,4-delta));}
  function priceRange(drink){const base=DRINKS[drink].price;return{min:Math.max(10,Math.ceil((base-10)/5)*5),max:Math.ceil((base+20)/5)*5,step:base>=50?10:5};}
  function clampPrice(drink,price){const r=priceRange(drink);return Math.max(r.min,Math.min(r.max,Math.round(price/r.step)*r.step));}
  function buyStock(stock,cash,key,quantity,unitPrice){if(!INGREDIENTS[key])throw new Error('bad ingredient');const cost=Math.max(0,quantity*unitPrice);if(cost>cash)return{ok:false,stock:{...stock},cash:Math.max(0,cash),cost:0};return{ok:true,stock:{...stock,[key]:(stock[key]||0)+quantity},cash:Math.max(0,cash-cost),cost};}
  function dayProfit(sales,ingredientSpend){return Number(sales)-Number(ingredientSpend);}
  function cashFloor(cash){return Math.max(0,Number(cash)||0);}
  return{DENOMS,DRINKS,LEVELS,INGREDIENTS,RECIPES,MARKET_REASONS,paymentPieces,nextLandmark,bestPiece,countUp,validTap,planDay,seededUnit,marketForDay,recipeFor,canMake,consumeRecipe,demandForPrice,priceRange,clampPrice,buyStock,dayProfit,cashFloor};
});
