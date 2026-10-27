(() => {
  'use strict';
  const GROUPS = {
    fruit: { label: 'Fruit & vegetables', art: 'assets/groups/fruit-veg.webp', rule: 'Fruits and vegetables are colourful plant foods that give us fibre and vitamins.' },
    starch: { label: 'Starchy foods', art: 'assets/groups/starchy.webp', rule: 'Bread, rice, pasta and potatoes are starchy foods that give us energy.' },
    dairy: { label: 'Dairy & alternatives', art: 'assets/groups/dairy.webp', rule: 'Milk, yoghurt, cheese and fortified alternatives give us calcium for strong bones.' },
    protein: { label: 'Protein foods', art: 'assets/groups/protein.webp', rule: 'Beans, fish, eggs, meat and tofu give protein for growth and repair.' }
  };
  const FOODS = {
    apple: ['Apple', 'fruit', 'Apple is a fruit. It gives us fibre and vitamins.'],
    banana: ['Banana', 'fruit', 'Banana is a fruit. Its soft inside gives us energy and fibre.'],
    carrot: ['Carrot', 'fruit', 'Carrot is a vegetable that grows under the ground. It helps our eyes.'],
    bread: ['Bread', 'starch', 'Bread is a starchy food. It gives us energy to play.'],
    rice: ['Rice', 'starch', 'Rice is a starchy food. It gives us energy to play.'],
    'rice-noodles': ['Rice noodles', 'starch', 'Rice noodles are starchy foods. They give us energy to play.'],
    milk: ['Milk', 'dairy', 'Milk belongs with dairy foods. Its calcium helps build strong bones.'],
    yoghurt: ['Yoghurt', 'dairy', 'Yoghurt is a dairy food. Its calcium helps build strong bones.'],
    cheese: ['Cheese', 'dairy', 'Cheese is a dairy food. Its calcium helps build strong bones.'],
    egg: ['Egg', 'protein', 'Egg is a protein food. Protein helps our bodies grow and repair.'],
    fish: ['Fish', 'protein', 'Fish is a protein food. Protein helps our bodies grow and repair.'],
    tofu: ['Tofu', 'protein', 'Tofu is a protein food made from soya beans.']
  };
  const ROUNDS = [['apple','bread','milk','egg','banana','rice'], ['carrot','rice-noodles','yoghurt','fish','cheese','tofu']];
  const VOICE = Object.fromEntries([
    ...Object.entries(FOODS).map(([id,v]) => [`food-${id}`, `audio/food-${id}.m4a`]),
    ...Object.keys(GROUPS).map(id => [`rule-${id}`, `audio/rule-${id}.m4a`]),
    ...Object.keys(FOODS).map(id => [`reveal-${id}`, `audio/reveal-${id}.m4a`]),
    ['round-1-intro','audio/round-1-intro.m4a'], ['round-2-intro','audio/round-2-intro.m4a'],
    ['round-1-end','audio/round-1-end.m4a'], ['round-2-end','audio/round-2-end.m4a']
  ]);
  const $ = id => document.getElementById(id);
  const els = {app:$('app'),home:$('home-screen'),play:$('play-screen'),finish:$('finish-screen'),grid:$('group-grid'),food:$('food-card'),image:$('food-image'),name:$('food-name'),bubble:$('speech-bubble'),progress:$('progress'),prompt:$('prompt')};
  let round=0, index=0, misses=0, selected=false, muted=localStorage.getItem('food-groups-muted')==='1', audio=null, locked=false;

  function lineFor(id) {
    if (id.startsWith('food-')) return FOODS[id.slice(5)][2];
    if (id.startsWith('rule-')) return GROUPS[id.slice(5)].rule;
    if (id.startsWith('reveal-')) { const f=FOODS[id.slice(7)]; return `${f[0]} belongs with ${GROUPS[f[1]].label.toLowerCase()}. Try that group.`; }
    return {'round-1-intro':'Let’s sort six foods into four groups.','round-2-intro':'Here are six more foods to sort.','round-1-end':'You sorted six foods into their groups.','round-2-end':'You sorted all twelve foods into their groups.'}[id];
  }
  function speak(id) {
    stopAudio(); const text=lineFor(id); els.bubble.textContent=text; els.bubble.classList.add('show');
    if (muted || !VOICE[id]) return;
    audio=new Audio(VOICE[id]); audio.play().catch(()=>{});
  }
  function stopAudio(){ if(audio){audio.pause();audio.currentTime=0;audio=null;} }
  function updateSoundButton(){const button=$('sound-toggle');button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');}
  function setState(state){
    els.app.dataset.state=state;els.app.dataset.round=String(round+1);els.app.dataset.sorted=String(index);
    const busy=state==='sorting';els.food.disabled=busy;
    document.querySelectorAll('.group').forEach(group=>group.disabled=busy);
  }
  function show(which){ stopAudio(); [els.home,els.play,els.finish].forEach(x=>x.hidden=true); which.hidden=false; }
  function buildGroups(){
    els.grid.replaceChildren(...Object.entries(GROUPS).map(([id,g])=>{
      const b=document.createElement('button'); b.type='button'; b.className=`group group-${id}`; b.dataset.group=id;
      b.innerHTML=`<img src="${g.art}" alt=""><span>${g.label}</span>`; b.addEventListener('click',()=>els.food.hidden?speak(`rule-${id}`):answer(id,b)); return b;
    }));
  }
  function start(r=0){ round=r;index=0;misses=0;show(els.play);nextFood();speak(`round-${round+1}-intro`); }
  function nextFood(){ locked=false;misses=0;selected=false;els.food.className='food-card';els.bubble.classList.remove('show');document.querySelectorAll('.group').forEach(g=>g.classList.remove('reveal','correct','wrong')); const id=ROUNDS[round][index],f=FOODS[id];els.image.src=`assets/foods/${id}.webp`;els.image.alt=f[0];els.name.textContent=f[0];els.progress.textContent=`Round ${round+1} · ${index+1} of 6`;els.prompt.textContent=`Where does ${f[0].toLowerCase()} belong?`;els.food.dataset.food=id;setState('ready'); }
  function answer(group, target){
    if(locked)return; const id=ROUNDS[round][index], f=FOODS[id];
    if(group!==f[1]){misses++;els.food.classList.remove('bounce');void els.food.offsetWidth;els.food.classList.add('bounce');target.classList.add('wrong');setTimeout(()=>target.classList.remove('wrong'),450);if(misses===2)speak(`rule-${f[1]}`);if(misses>=3){document.querySelector(`[data-group="${f[1]}"]`).classList.add('reveal');speak(`reveal-${id}`);}return;}
    locked=true;setState('sorting');els.prompt.textContent='Great sorting! Next food coming…';target.classList.add('correct');const a=els.food.getBoundingClientRect(),b=target.getBoundingClientRect();els.food.style.setProperty('--fly-x',`${b.left+b.width/2-a.left-a.width/2}px`);els.food.style.setProperty('--fly-y',`${b.top+b.height/2-a.top-a.height/2}px`);els.food.classList.add('fly');speak(`food-${id}`);setTimeout(()=>{index++;if(index<6)nextFood();else finish();},1450);
  }
  function finish(){ localStorage.setItem('food-groups-progress',JSON.stringify({round:round+1,completedAt:new Date().toISOString()}));show(els.finish);setState('round-complete');$('finish-title').textContent=`Round ${round+1} complete`;$('finish-copy').textContent=round?'You sorted all twelve foods into their groups.':'You sorted six foods into their groups.';$('summary').replaceChildren(...ROUNDS[round].map(id=>{const i=document.createElement('img');i.src=`assets/foods/${id}.webp`;i.alt=FOODS[id][0];return i;}));$('next-button').hidden=round===1;$('next-button').textContent='Start round 2';speak(`round-${round+1}-end`); }
  els.food.addEventListener('click',()=>{selected=!selected;els.food.classList.toggle('selected',selected);els.prompt.textContent=selected?'Now tap a group.':`Where does ${FOODS[ROUNDS[round][index]][0].toLowerCase()} belong?`;});
  els.food.addEventListener('pointerdown',e=>{if(locked)return;els.food.setPointerCapture(e.pointerId);els.food.dataset.dragX=e.clientX;els.food.dataset.dragY=e.clientY;els.food.classList.add('dragging');});
  els.food.addEventListener('pointermove',e=>{if(!els.food.classList.contains('dragging'))return;els.food.style.transform=`translate(${e.clientX-Number(els.food.dataset.dragX)}px,${e.clientY-Number(els.food.dataset.dragY)}px)`;});
  els.food.addEventListener('pointerup',e=>{if(!els.food.classList.contains('dragging'))return;els.food.classList.remove('dragging');els.food.style.transform='';const target=[...document.querySelectorAll('.group')].find(group=>{const box=group.getBoundingClientRect();return e.clientX>=box.left&&e.clientX<=box.right&&e.clientY>=box.top&&e.clientY<=box.bottom;});if(target)answer(target.dataset.group,target);});
  $('start-button').addEventListener('click',()=>start(0));$('learn-button').addEventListener('click',()=>{show(els.play);els.progress.textContent='Meet the groups';els.food.hidden=true;els.prompt.textContent='Tap a group to hear its rule.';});
  $('next-button').addEventListener('click',()=>{els.food.hidden=false;start(1);});$('replay-button').addEventListener('click',()=>{els.food.hidden=false;start(round);});
  $('sound-toggle').addEventListener('click',()=>{muted=!muted;localStorage.setItem('food-groups-muted',muted?'1':'0');updateSoundButton();if(muted)stopAudio();});
  window.FOOD_GROUPS={GROUPS,FOODS,ROUNDS,VOICE,lineFor,start}; updateSoundButton();buildGroups();
})();
