(function(root,factory){const money=typeof module==='object'&&module.exports?require('./money.js'):root.HelpMommyMoney;const api=factory(money);if(typeof module==='object'&&module.exports)module.exports=api;else root.HelpMommyEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Money){
  'use strict';
  const VERSION=1;
  function hashSeed(text){let h=2166136261;for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function seededUnit(seed,eventId){let a=hashSeed(`${seed}|${eventId}`);a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
  function initialState(mode='little-helper',seed='HM-HOME-0001'){
    if(!['little-helper','family-planner'].includes(mode))throw new Error('bad mode');
    return {schemaVersion:VERSION,mode,seed,day:1,phase:'meal',cash:800,currency:{...Money.DEFAULT_CURRENCY},inventory:[
      {lotId:'greens-use-soon',itemId:'greens',quantity:1,bestOnDay:1,acquiredDay:0,storage:'fridge'},
      {lotId:'greens-fresh',itemId:'greens',quantity:1,bestOnDay:3,acquiredDay:1,storage:'fridge'},
      {lotId:'rice-pantry',itemId:'rice-beans',quantity:2,bestOnDay:30,acquiredDay:0,storage:'pantry'}
    ],meters:{happiness:60,wellbeing:60},savings:{goalId:'lantern-picnic-blanket',balance:0,target:600},ledger:[],decisionIds:[],choice:null,misses:0,variant:seededUnit(seed,'evening')<.5?'dusk-blue':'lantern-gold'};
  }
  const clone=x=>JSON.parse(JSON.stringify(x));
  function consumeFIFO(inventory,itemId,quantity=1){let left=quantity;const lots=inventory.map(x=>({...x}));const order=lots.filter(x=>x.itemId===itemId&&x.quantity>0).sort((a,b)=>a.bestOnDay-b.bestOnDay||a.acquiredDay-b.acquiredDay||a.lotId.localeCompare(b.lotId));for(const lot of order){const take=Math.min(left,lot.quantity);lot.quantity-=take;left-=take;if(!left)break;}if(left)throw new Error('not enough inventory');return lots;}
  function spoilLots(inventory,day){const spoiled=[];const lots=inventory.map(l=>{if(l.quantity>0&&l.bestOnDay<day){spoiled.push({lotId:l.lotId,quantity:l.quantity});return{...l,quantity:0};}return{...l};});return{inventory:lots,spoiled};}
  function applyMeter(value,delta){return Math.max(0,Math.min(100,value+delta));}
  function reduceHousehold(input,action){const state=clone(input);const id=action.decisionId||`${action.type}:${action.optionId||''}`;if(state.decisionIds.includes(id))return{state:input,events:[]};const events=[];
    if(action.type==='CHOOSE_MEAL'&&state.phase==='meal'){
      if(action.optionId==='noodles'){state.inventory=consumeFIFO(state.inventory,'greens',1);state.choice='noodles';state.meters.wellbeing=applyMeter(state.meters.wellbeing,8);state.meters.happiness=applyMeter(state.meters.happiness,4);events.push({type:'LOT_USED',lotId:'greens-use-soon'},{type:'METER',meter:'wellbeing',delta:8});}
      else if(action.optionId==='rice'){state.inventory=consumeFIFO(state.inventory,'rice-beans',1);state.choice='rice';state.meters.happiness=applyMeter(state.meters.happiness,7);state.meters.wellbeing=applyMeter(state.meters.wellbeing,3);events.push({type:'LOT_USED',lotId:'rice-pantry'},{type:'METER',meter:'happiness',delta:7});}
      else throw new Error('bad meal');state.phase='consequence';state.misses=0;
    } else if(action.type==='CONTINUE'&&state.phase==='consequence'){state.phase='savings';}
    else if(action.type==='SAVE'&&state.phase==='savings'){const amount=Money.integer(action.amount||20);if(amount<0||amount>state.cash)throw new Error('bad savings');state.cash-=amount;state.savings.balance+=amount;state.ledger.push({id,day:state.day,direction:'out',amount,category:'savings',source:'cash',relatedId:state.savings.goalId});state.phase='done';events.push({type:'SAVED',amount});}
    else if(action.type==='MISS'&&state.phase==='meal'){state.misses+=1;return{state,events:[{type:state.misses>=3?'REVEAL':state.misses===2?'HINT':'TRY_AGAIN'}]};}
    else throw new Error(`action ${action.type} not allowed in ${state.phase}`);
    state.decisionIds.push(id);return{state,events};
  }
  return{VERSION,initialState,seededUnit,consumeFIFO,spoilLots,reduceHousehold};
});
