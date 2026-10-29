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
  function marketForDay(day,cosy=false){const safeDay=Math.max(1,Math.floor(Number(day)||1)),entries=Object.entries(INGREDIENTS),reason=MARKET_REASONS[safeDay%MARKET_REASONS.length],prices={};entries.forEach(([key,item],i)=>{const bounded=cosy?0:Math.floor(seededUnit(safeDay*97+i*31)*3)-1;prices[key]=Math.max(1,item.base+bounded*item.step+(cosy?0:reason.ingredient===key?reason.change:0));});const direction=safeDay%2?1:-1;prices.lemon=Math.max(1,INGREDIENTS.lemon.base+direction);if(cosy){const [key,item]=entries[(safeDay-1)%entries.length];prices[key]=Math.max(1,item.base+direction*item.step);}return{day:safeDay,reason:{key:cosy?'cosy-change':'daily-change',text:`Lemons cost a little ${direction>0?'more':'less'} today`,ingredient:'lemon',change:direction},prices};}
  function recipeFor(drink){if(!RECIPES[drink])throw new Error('bad drink');return{...RECIPES[drink]};}
  function canMake(stock,drink){return Object.entries(recipeFor(drink)).every(([key,count])=>(stock[key]||0)>=count);}
  function missingIngredients(stock,drink){return Object.entries(recipeFor(drink)).filter(([key,count])=>(stock[key]||0)<count).map(([key])=>key);}
  function maxMakeable(stock,drink){return Math.max(0,Math.min(...Object.entries(recipeFor(drink)).map(([key,count])=>Math.floor((stock[key]||0)/count))));}
  function consumeRecipe(stock,drink,quantity=1){const next={...stock},recipe=recipeFor(drink);if(!Object.entries(recipe).every(([key,count])=>(next[key]||0)>=count*quantity))return{ok:false,stock:next};Object.entries(recipe).forEach(([key,count])=>next[key]-=count*quantity);return{ok:true,stock:next};}
  function demandForPrice(drink,price){const base=DRINKS[drink].price,delta=Math.round((price-base)/5);return Math.max(1,Math.min(5,4-delta));}
  function priceRange(drink){const base=DRINKS[drink].price;return{min:Math.max(10,base-10),max:base+20,step:5};}
  function clampPrice(drink,price){const base=DRINKS[drink].price,r=priceRange(drink),snapped=base+Math.round((price-base)/r.step)*r.step;return Math.max(r.min,Math.min(r.max,snapped));}
  function buyStock(stock,cash,key,quantity,unitPrice){if(!INGREDIENTS[key])throw new Error('bad ingredient');const cost=Math.max(0,quantity*unitPrice);if(cost>cash)return{ok:false,stock:{...stock},cash:Math.max(0,cash),cost:0};return{ok:true,stock:{...stock,[key]:(stock[key]||0)+quantity},cash:Math.max(0,cash-cost),cost};}
  function stockBatches(stock,unitPrice=0,source='free starter'){const out={};Object.keys(INGREDIENTS).forEach(key=>{const quantity=Math.max(0,Math.floor(Number(stock?.[key])||0));out[key]=quantity?[{quantity,unitPrice:Math.max(0,Math.floor(Number(unitPrice)||0)),source}]:[];});return out;}
  function normaliseBatches(batches={}){const out={};Object.keys(INGREDIENTS).forEach(key=>{out[key]=(Array.isArray(batches[key])?batches[key]:[]).map(batch=>({quantity:Math.max(0,Math.floor(Number(batch.quantity)||0)),unitPrice:Math.max(0,Math.floor(Number(batch.unitPrice)||0)),source:String(batch.source||'market')})).filter(batch=>batch.quantity>0);});return out;}
  function batchTotals(batches){const clean=normaliseBatches(batches),stock={};Object.keys(INGREDIENTS).forEach(key=>stock[key]=clean[key].reduce((sum,batch)=>sum+batch.quantity,0));return stock;}
  function addStockBatch(batches,key,quantity,unitPrice,source='market'){if(!INGREDIENTS[key])throw new Error('bad ingredient');const next=normaliseBatches(batches),count=Math.max(0,Math.floor(Number(quantity)||0)),price=Math.max(0,Math.floor(Number(unitPrice)||0));if(count)next[key].push({quantity:count,unitPrice:price,source});return next;}
  function consumeRecipeBatches(batches,drink,quantity=1){const clean=normaliseBatches(batches),needed=Object.fromEntries(Object.entries(recipeFor(drink)).map(([key,count])=>[key,count*quantity])),stock=batchTotals(clean);if(!Object.entries(needed).every(([key,count])=>stock[key]>=count))return{ok:false,batches:clean,stock,usedRows:[],cost:0};const usedRows=[];Object.entries(needed).forEach(([key,count])=>{let remaining=count;while(remaining>0){const batch=clean[key][0],used=Math.min(remaining,batch.quantity);usedRows.push({ingredient:key,quantity:used,unitPrice:batch.unitPrice,source:batch.source,cost:used*batch.unitPrice});batch.quantity-=used;remaining-=used;if(!batch.quantity)clean[key].shift();}});const grouped=[];usedRows.forEach(row=>{const prior=grouped.find(item=>item.ingredient===row.ingredient&&item.unitPrice===row.unitPrice&&item.source===row.source);if(prior){prior.quantity+=row.quantity;prior.cost+=row.cost;}else grouped.push({...row});});return{ok:true,batches:clean,stock:batchTotals(clean),usedRows:grouped,cost:grouped.reduce((sum,row)=>sum+row.cost,0)};}
  function inventoryValue(batches){return Object.values(normaliseBatches(batches)).flat().reduce((sum,batch)=>sum+batch.quantity*batch.unitPrice,0);}
  function refillMissingBatches(batches,target,source='grandma loan'){let next=normaliseBatches(batches);const before=batchTotals(next);Object.keys(INGREDIENTS).forEach(key=>{const missing=Math.max(0,Math.floor(Number(target?.[key])||0)-(before[key]||0));if(missing)next=addStockBatch(next,key,missing,0,source);});return{batches:next,stock:batchTotals(next)};}
  function emptyDayLedger(day){return{day:Math.max(1,Math.floor(Number(day)||1)),sales:[],purchases:[],usedRows:[]};}
  function normaliseDayLedger(ledger,day){const expected=Math.max(1,Math.floor(Number(day)||1));if(!ledger||Number(ledger.day)!==expected)return emptyDayLedger(expected);const sales=Array.isArray(ledger.sales)?ledger.sales.map(sale=>({drink:String(sale.drink||''),quantity:Math.max(0,Math.floor(Number(sale.quantity)||0)),revenue:Math.max(0,Number(sale.revenue)||0),cost:Math.max(0,Number(sale.cost)||0),usedRows:Array.isArray(sale.usedRows)?sale.usedRows.map(row=>({...row})):[]})):[],purchases=Array.isArray(ledger.purchases)?ledger.purchases.map(purchase=>({ingredient:String(purchase.ingredient||''),quantity:Math.max(0,Math.floor(Number(purchase.quantity)||0)),unitPrice:Math.max(0,Number(purchase.unitPrice)||0),cost:Math.max(0,Number(purchase.cost)||0)})):[];return{day:expected,sales,purchases,usedRows:sales.flatMap(sale=>sale.usedRows.map(row=>({...row})))};}
  function recordDayPurchase(ledger,purchase){const next=normaliseDayLedger(ledger,ledger?.day);next.purchases.push({ingredient:String(purchase.ingredient),quantity:Math.max(0,Math.floor(Number(purchase.quantity)||0)),unitPrice:Math.max(0,Number(purchase.unitPrice)||0),cost:Math.max(0,Number(purchase.cost)||0)});return next;}
  function recordDaySale(ledger,sale){const next=normaliseDayLedger(ledger,ledger?.day),entry={drink:String(sale.drink),quantity:Math.max(0,Math.floor(Number(sale.quantity)||0)),revenue:Math.max(0,Number(sale.revenue)||0),cost:Math.max(0,Number(sale.cost)||0),usedRows:(sale.usedRows||[]).map(row=>({...row}))};next.sales.push(entry);next.usedRows.push(...entry.usedRows.map(row=>({...row})));return next;}
  function dayLedgerTotals(ledger){const clean=normaliseDayLedger(ledger,ledger?.day);return{sales:clean.sales.reduce((sum,sale)=>sum+sale.revenue,0),marketSpend:clean.purchases.reduce((sum,purchase)=>sum+purchase.cost,0),usedCost:clean.sales.reduce((sum,sale)=>sum+sale.cost,0),usedRows:clean.usedRows.map(row=>({...row}))};}
  function activationGate(){let accepted=false;return{accept(){if(accepted)return false;accepted=true;return true;},get accepted(){return accepted;}};}
  function dayProfit(sales,ingredientSpend){return Number(sales)-Number(ingredientSpend);}
  function cashFloor(cash){return Math.max(0,Number(cash)||0);}
  function nextBusinessDay(day){return Math.max(1,Math.floor(Number(day)||1))+1;}
  return{DENOMS,DRINKS,LEVELS,INGREDIENTS,RECIPES,MARKET_REASONS,paymentPieces,nextLandmark,bestPiece,countUp,validTap,planDay,seededUnit,marketForDay,recipeFor,canMake,missingIngredients,maxMakeable,consumeRecipe,demandForPrice,priceRange,clampPrice,buyStock,stockBatches,normaliseBatches,batchTotals,addStockBatch,consumeRecipeBatches,inventoryValue,refillMissingBatches,emptyDayLedger,normaliseDayLedger,recordDayPurchase,recordDaySale,dayLedgerTotals,activationGate,dayProfit,cashFloor,nextBusinessDay};
});
