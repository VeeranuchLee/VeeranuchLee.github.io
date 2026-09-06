/* SPELLING EXAM ENGINE — data and scheduling stay deliberately plain/testable. */
/* Mermaid Reef theme. Art is cut from shared-art/mermaid-reef -- see that
   folder's README for the whole set and the cutter that made it. */
const MASCOT=`<div class="mermaid"><img src="assets/mermaid/mermaid.webp" alt="" draggable="false"></div>`;
/* A companion on the sea floor while the child works. It is chosen per word set
   rather than per word, so a child keeps the same friend through a whole
   journey instead of meeting a stranger every question. */
const BUDDIES=['octopus','seahorse','reef-fish','dolphin','sea-turtle','crab','clownfish','starfish','pearl-clam','penguin'];

const SETS=[
['bat','pig','pot','man','van'],['fan','hat','top','bin','mat'],['dog','pan','hen','cat','map'],
['eye','ear','nose','arm','leg'],['hair','hand','face','mouth','foot'],['father','mother','son','brother','sister'],
['two','four','six','seven','nine'],['ten','eleven','fifteen','sixteen','twenty'],['bag','pencil','ruler','book','pen'],
['mop','broom','door','bin','window'],['tiger','fish','parrot','duck','rabbit'],['monkey','lion','snake','cow','bird']];
const ACCENTS=['us','uk','au'], STORE='spelling-exam-progress-v1', SESSION='spelling-exam-session-v1';
const $=s=>document.querySelector(s), app=$('#app');
function scene(name){document.body.classList.remove('scene-hall','scene-reef');document.body.classList.add('scene-'+name)}
function buddyFor(seed){return BUDDIES[Math.abs(seed)%BUDDIES.length]}
function buddyHTML(){return state.buddy?`<div class="buddy" aria-hidden="true"><span class="bubble"></span><img src="assets/mermaid/buddy-${state.buddy}.webp" alt="" draggable="false"></div>`:''}
let db=load(STORE,{words:{}}), sessionSeen=new Set(), state={screen:'home',mode:'practice',queue:[],i:0,typed:'',attempts:0,hinted:false,accent:'us',answers:[],locked:false,showWord:false};
function load(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}} function save(){localStorage.setItem(STORE,JSON.stringify(db))}
function rec(word){return db.words[word]||(db.words[word]={correctUnassisted:0,incorrect:0,hintsUsed:0,lastPracticedAt:0,lastSession:'',accentIndex:0,accentOrder:[],accents:{us:{correct:0,incorrect:0},uk:{correct:0,incorrect:0},au:{correct:0,incorrect:0}}})}
function shuffle(a){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function accentFor(word){const r=rec(word);if(!r.accentOrder.length){let block=shuffle(ACCENTS);if(r.lastAccent===block[0])block.push(block.shift());r.accentOrder=block}const a=r.accentOrder.shift();r.lastAccent=a;save();return a}
function all(){return SETS.flatMap((words,i)=>words.map(word=>({word,set:i+1}))) }
function mastery(word){const r=rec(word);if(r.correctUnassisted>=3&&(r.correctSessions||[]).length>=2)return'MASTERED';if(r.correctUnassisted>=2)return'ALMOST';if(r.correctUnassisted||r.incorrect)return'LEARNING';return'NEW'}
function sessionId(){let id=sessionStorage.getItem(SESSION);if(!id){id=Date.now().toString(36);sessionStorage.setItem(SESSION,id)}return id}
function priority(x){const r=rec(x.word);return (r.incorrect*5+r.hintsUsed*4+(r.correctUnassisted?0:8))-(r.correctUnassisted*2)+(r.lastPracticedAt?Math.min(5,(Date.now()-r.lastPracticedAt)/864e5):6)+Math.random()}
/* The way out, on the home screen only. The owner's standing rule from 2026-08-27 is
   that ALL games carry a back icon to the hub, because a four-year-old could not get out
   of one. The header arrow on every other screen goes to THIS screen, so leaving is one
   more tap of the same idea rather than a second button on every screen -- the same
   arrangement time-book uses.

   Absolute URL on purpose: published, /spelling-exam/ and /children-apps/ are siblings,
   but in this repo the hub lives under site/, so a relative link would work live and 404
   in every local preview -- the kind of difference nobody notices until a child taps it.
   It names where it goes rather than saying "back", for the same reason. */
const HUB='https://veeranuchlee.github.io/children-apps/';
function home(){state.screen='home';state.buddy='';scene('hall');app.innerHTML=`<a class="hub" href="${HUB}">← Children Games</a><section class="hero"><div class="mascot" aria-hidden="true">${MASCOT}</div><h1>Spelling Exam</h1><p>See it. Hear it. Spell it.</p></section><section class="menu"><button data-go="practice"><strong>Practice Now</strong><small>Start with words that need you most</small></button><button data-go="learn"><i class="step">1</i><strong>Learn Words</strong><small>Look, listen, then copy</small></button><button data-go="blocks"><i class="step">2</i><strong>Letter Blocks</strong><small>Build the word from tiles</small></button><button data-go="sets"><i class="step">3</i><strong>Word Sets 1–12</strong><small>Spell it on the keyboard</small></button><button data-go="weak"><strong>Weak Words</strong><small>Practise tricky words again</small></button><button class="span" data-go="exam"><i class="step">4</i><strong>Mock Exam</strong><small>Five words, results at the end</small></button></section>`;bindNav()}
function bindNav(){document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>route(b.dataset.go))}
function route(go){if(go==='practice')start('practice',shuffle(all()).sort((a,b)=>priority(b)-priority(a)).slice(0,10));if(go==='weak'){const q=all().filter(x=>rec(x.word).incorrect||rec(x.word).hintsUsed).sort((a,b)=>priority(b)-priority(a));start('practice',(q.length?q:all()).slice(0,10))}if(go==='sets')chooseSets('practice');if(go==='learn')chooseSets('learn');if(go==='blocks')chooseSets('blocks');if(go==='exam')examMenu()}
function headerBar(title,extra=''){return `<header class="top"><button class="back" aria-label="Back">←</button><h1>${title}</h1>${extra}</header>`}
function wireBack(fn=home){$('.back').onclick=fn}
function chooseSets(mode,examVariant=''){scene('hall');const title=mode==='learn'?'Learn Words':mode==='blocks'?'Letter Blocks':'Choose a word set';app.innerHTML=headerBar(title)+`<section class="sets">${SETS.map((w,i)=>{/* building a word and spelling one are different skills, so they are counted apart */const n=mode==='blocks'?w.filter(x=>rec(x).blocksCorrect).length:w.filter(x=>mastery(x)==='MASTERED').length;return`<button class="set" data-set="${i}"><b>WORDS ${i+1}</b><span>${n} / 5 ${mode==='blocks'?'built':'mastered'}</span></button>`}).join('')}</section>`;wireBack(mode==='learn'||mode==='blocks'?home:examVariant?examMenu:home);document.querySelectorAll('.set').forEach(b=>b.onclick=()=>{const i=+b.dataset.set;if(mode==='blocks')return startBlocks(i);start(mode,SETS[i].map(word=>({word,set:i+1})),examVariant)})}
function examMenu(){scene('hall');app.innerHTML=headerBar('Mock Exam')+`<section class="menu"><button data-variant="picture"><strong>Picture-assisted</strong><small>See the picture and hear the word</small></button><button data-variant="dictation"><strong>Pure dictation</strong><small>Hear the word, without a picture</small></button></section>`;wireBack();document.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>chooseSets('exam',b.dataset.variant))}
function start(mode,queue,variant=''){/* `set` is 1-based and startBlocks() seeds on the 0-based index, so without
   the -1 the same five words hand the child one companion in Letter Blocks
   and a different one on the keyboard -- which is the one place the
   companion is supposed to carry over. */
  const buddy=buddyFor(queue.length?queue[0].set-1:0);state={screen:'question',mode,variant,queue:shuffle(queue),i:0,typed:'',attempts:0,hinted:false,accent:'us',answers:[],locked:false,showWord:mode==='learn',buddy};next(true)}
function current(){return state.queue[state.i]}
function next(first=false){if(state.i>=state.queue.length)return results();state.typed='';state.attempts=0;state.hinted=false;state.locked=false;state.showWord=state.mode==='learn';state.accent=accentFor(current().word);renderQuestion();setTimeout(playWord,first?450:250)}
function visual(word){return`<div class="picture"><img src="assets/words/${word}.webp" alt="" draggable="false"></div>`}
function renderQuestion(){const q=current(),hidePicture=state.mode==='exam'&&state.variant==='dictation';scene('reef');app.innerHTML=buddyHTML()+headerBar(state.mode==='exam'?'Mock Exam':state.mode==='learn'?'Learn Words':'Practice',`<span class="pill">${state.i+1} / ${state.queue.length}</span>`)+`<section class="stage"><div class="card">${hidePicture?'<div class="picture">🎧</div>':visual(q.word)}<button class="sound" aria-label="Replay word">🔊</button>${state.showWord?`<div class="word-reveal">${q.word}</div>`:'<p class="prompt">Listen and spell the word</p>'}<div class="slots">${q.word.split('').map((_,i)=>`<span class="slot">${state.typed[i]||''}</span>`).join('')}</div><div class="feedback"></div></div><div>${keyboard()}</div></section>`;wireBack(()=>state.mode==='exam'?examMenu():home());$('.sound').onclick=playWord;wireKeys()}
function keyboard(){return`<div class="keyboard" aria-label="On-screen keyboard">${['qwertyuiop','asdfghjkl','zxcvbnm'].map(r=>`<div class="row">${[...r].map(x=>`<button class="key" data-key="${x}">${x}</button>`).join('')}</div>`).join('')}<div class="row"><button class="key wide" data-key="clear">clear</button><button class="key wide" data-key="back">⌫</button><button class="key wide" data-key="enter">check</button></div></div>`}
function wireKeys(){document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>key(b.dataset.key));window.onkeydown=e=>{if(/^[a-z]$/i.test(e.key))key(e.key.toLowerCase());else if(e.key==='Backspace')key('back');else if(e.key==='Enter')key('enter')}}
function key(k){if(state.locked)return;const w=current().word;if(k==='back')state.typed=state.typed.slice(0,-1);else if(k==='clear')state.typed='';else if(k==='enter'){check();return}else if(state.typed.length<w.length)state.typed+=k;document.querySelectorAll('.slot').forEach((s,i)=>s.textContent=state.typed[i]||'');if(state.typed.length===w.length)check()}
/* Null-safe: a blocked autoplay rejects long after the screen it belongs to is gone, and
   the card screens carry no feedback line at all — the speaker button is right there. */
function feedback(text,cls){const el=$('.feedback');if(el){el.textContent=text;el.className='feedback '+cls}say(cls)}
/* The card carries the instruction; the companion carries the encouragement.
   Saying the same sentence twice filled the bubble with five wrapped lines of
   text a child had already read, laid over the buddy itself. Two jobs, two
   voices. No hedging, and short enough to take in mid-tap. */
const CHEERS={good:['Yes!','You did it!','Brilliant!','That is the one!'],
              try:['Nearly!','Have another go.','You can do this.','Keep going.']};
function say(cls,text){const b=$('.buddy'),bub=$('.buddy .bubble');if(!b||!bub)return;
  const bank=CHEERS[cls];
  const line=text||(bank?bank[Math.floor(Math.random()*bank.length)]:'');
  b.dataset.mood=cls==='good'?'happy':cls==='try'?'think':'';
  bub.textContent=line;bub.classList.toggle('on',!!line);
  if(cls==='good')setTimeout(()=>{const c=$('.buddy');if(c)c.dataset.mood=''},1200)}

function check(){if(!state.typed)return;const q=current(),r=rec(q.word),ok=state.typed.toLowerCase()===q.word;if(state.mode==='exam'){state.answers.push({word:q.word,typed:state.typed,ok,accent:state.accent});state.locked=true;state.i++;setTimeout(next,250);return}if(ok){state.locked=true;r.lastPracticedAt=Date.now();r.accents[state.accent].correct++;if(!state.hinted&&state.attempts===0&&!sessionSeen.has(q.word)){r.correctUnassisted++;r.correctSessions=[...new Set([...(r.correctSessions||[]),sessionId()])]}r.lastSession=sessionId();sessionSeen.add(q.word);save();feedback('You spelled it! ⭐','good');celebrate();const slots=$('.slots');if(slots)slots.classList.add('win');chime(true);state.i++;setTimeout(next,750)}else{state.attempts++;r.incorrect++;r.accents[state.accent].incorrect++;r.lastPracticedAt=Date.now();if(state.attempts===2){state.hinted=true;r.hintsUsed++;state.typed=q.word[0];document.querySelectorAll('.slot').forEach((s,i)=>s.textContent=state.typed[i]||'');feedback(`Try again — it starts with “${q.word[0]}”.`,'try')}else if(state.attempts>=3){state.hinted=true;state.showWord=true;renderQuestion();feedback('Look carefully, then type the whole word.','try')}else{state.typed='';document.querySelectorAll('.slot').forEach(s=>s.textContent='');feedback('Not yet — listen and try again.','try');playWord()}save();chime(false)}}
/* Word audio is scheduled on a timer, so a fast answer can leave the timer to fire after
   the queue has already moved past its last word. There is nothing to play then. */
let audio;function playWord(){const q=current();if(!q)return;const {word}=q;if(audio)audio.pause();audio=new Audio(`assets/audio/${state.accent}/${word}.m4a`);audio.play().catch(()=>feedback('Tap 🔊 to hear the word.','muted'))}
function spellLetters(){let i=0;const letters=current().word.split('');function one(){if(i>=letters.length)return;const a=new Audio(`assets/audio/letters/${letters[i++]}.m4a`);a.onended=one;a.play().catch(()=>{});}one()}
function chime(ok){const C=window.AudioContext||window.webkitAudioContext,c=new C();if(!ok){const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=180;g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.start();o.stop(c.currentTime+.2);return}/* three-note major arpeggio: the sound of getting it right */[523.25,659.25,783.99].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.09;o.type='triangle';o.connect(g);g.connect(c.destination);o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.55)})}
function celebrate(){const host=document.createElement('div');host.className='celebration';host.setAttribute('aria-hidden','true');const BITS=['★','✦','♥','✧','✿'],COLORS=['#f06fb4','#9a55d6','#f6ad3d','#f472b6','#c4b5fd','#7ad0f0'];for(let i=0;i<44;i++){const s=document.createElement('span');s.className='confetti';s.textContent=BITS[i%BITS.length];s.style.left=(4+Math.random()*92)+'%';s.style.color=COLORS[i%COLORS.length];s.style.fontSize=(13+Math.random()*17)+'px';s.style.animationDuration=(.9+Math.random()*.9)+'s';s.style.animationDelay=(Math.random()*.25)+'s';host.appendChild(s)}document.body.appendChild(host);setTimeout(()=>host.remove(),2200)}
function results(){window.onkeydown=null;if(state.mode!=='exam'){home();return}const score=state.answers.filter(x=>x.ok).length;state.answers.forEach(a=>{const r=rec(a.word);r.lastPracticedAt=Date.now();if(a.ok){r.correctUnassisted++;r.correctSessions=[...new Set([...(r.correctSessions||[]),sessionId()])];r.accents[a.accent].correct++}else{r.incorrect++;r.accents[a.accent].incorrect++}});save();scene('hall');app.innerHTML=headerBar('Your results')+`<section class="card results"><div class="word-reveal">${score} / ${state.answers.length}</div>${state.answers.map(a=>`<div class="result"><b>${a.ok?'✓':'✗'} ${a.word}</b><span>${a.ok?'correct':`you typed: ${a.typed||'—'}`}</span></div>`).join('')}<div class="actions"><button class="primary mistakes">Practice mistakes</button><button class="secondary done">Done</button></div></section>`;wireBack(home);$('.done').onclick=home;$('.mistakes').onclick=()=>{const q=state.answers.filter(x=>!x.ok).map(x=>all().find(y=>y.word===x.word));start('practice',q.length?q:state.queue)}}
/* ---- BEGINNER LETTER BLOCKS ------------------------------------------------
   The scaffold between recognising a word and spelling it from the keyboard.
   Two rules shape every choice below. The board must never disclose how long
   the word is, and the child — not the app — decides the word is finished. */

/* Fixed for every word. `word.length + 2` only teaches a child to subtract two;
   a board that is the same size every time teaches nothing at all. Nine clears
   the longest words in the curriculum (brother, fifteen, sixteen) by two. */
const SLOT_COUNT=9;
const LOOKALIKE={a:'oe',b:'dp',c:'eo',d:'bq',e:'ca',f:'t',g:'qy',h:'nb',i:'lj',j:'i',k:'x',l:'it',m:'wn',n:'uhm',o:'ac',p:'qb',q:'pg',r:'n',s:'z',t:'fl',u:'nv',v:'wy',w:'mv',x:'k',y:'vg',z:'s'};
function distractors(word,siblings,n){const letters=[...word],banned=new Set(letters),bag=[];
  letters.forEach(ch=>[...(LOOKALIKE[ch]||'')].forEach(x=>{if(!banned.has(x))bag.push(x)}));
  siblings.join('').split('').forEach(x=>{if(!banned.has(x))bag.push(x)});
  [...'aeiourstnmlpbcdgh'].forEach(x=>{if(!banned.has(x))bag.push(x)});
  /* One spare tile repeats a letter the word already needs, so "I have seen this
     letter already" is never proof that it is spoken for. Words that repeat a
     letter of their own get a plain extra instead: four e's in `eleven` is a
     puzzle, not a scaffold. */
  const repeats=new Set(letters).size<letters.length,want=repeats?n:n-1,out=[],seen=new Set();
  for(const x of shuffle(bag)){if(out.length>=want)break;if(seen.has(x))continue;seen.add(x);out.push(x)}
  if(!repeats)out.push(letters[Math.floor(Math.random()*letters.length)]);
  return shuffle(out)}
function dealTiles(){const w=current().word,siblings=SETS[state.setIndex].filter(x=>x!==w);
  /* 3–5, drawn fresh per word, so counting the tiles does not estimate the length either. */
  const chars=shuffle([...w,...distractors(w,siblings,3+Math.floor(Math.random()*3))]);
  state.tiles=chars.map((ch,id)=>({id,ch,at:null}));
  state.slots=Array(SLOT_COUNT).fill(null);state.fixed=new Set()}
function tile(id){return state.tiles.find(t=>t.id===id)}
function tileHTML(t){return`<button class="tile${state.fixed.has(t.id)?' fixed':''}" data-tile="${t.id}">${t.ch.toUpperCase()}</button>`}
function blocksBoard(){return`<div class="board"><div class="bslots" role="group" aria-label="Your word">${state.slots.map((id,i)=>`<span class="bslot" data-slot="${i}">${id==null?'':tileHTML(tile(id))}</span>`).join('')}</div><div class="pool" data-pool="1" aria-label="Letter tiles">${state.tiles.filter(t=>t.at===null).map(tileHTML).join('')}</div><div class="actions"><button class="primary check">Check ✓</button></div></div>`}
function renderBoard(){const b=document.querySelector('.board');if(!b)return;b.outerHTML=blocksBoard();wireBoard()}
function wireBoard(){document.querySelectorAll('.tile').forEach(el=>el.addEventListener('pointerdown',e=>startDrag(e,el)));$('.check').onclick=checkBlocks}
function place(id,slot){const t=tile(id),from=t.at,occ=state.slots[slot];
  /* a hinted letter is nailed down: it may not be moved, nor pushed aside by another tile */
  if(occ===id||state.fixed.has(id))return;if(occ!=null&&state.fixed.has(occ))return;
  if(from!=null)state.slots[from]=null;
  if(occ!=null){const o=tile(occ);if(from!=null){state.slots[from]=occ;o.at=from}else o.at=null}
  state.slots[slot]=id;t.at=slot}
function unplace(id){const t=tile(id);if(state.fixed.has(id))return;if(t.at!=null){state.slots[t.at]=null;t.at=null}}
function tapTile(id){const t=tile(id);if(state.fixed.has(id))return;
  if(t.at!=null)unplace(id);
  else{const s=state.slots.indexOf(null);if(s<0)return feedback('The row is full. Tap a letter to take it back.','try');place(id,s)}
  renderBoard()}
/* One pointer handler serves both interactions the brief asks for: a drag if the
   finger travels, a tap if it does not. Pointer events rather than HTML5 drag
   and drop, because HTML5 drag and drop does not exist on the iPad. */
let drag=null;
function startDrag(e,el){const id=+el.dataset.tile;if(state.locked||state.fixed.has(id))return;e.preventDefault();
  const r=el.getBoundingClientRect();
  drag={el,id,x0:e.clientX,y0:e.clientY,dx:e.clientX-r.left,dy:e.clientY-r.top,w:r.width,h:r.height,moved:false,ghost:null};
  try{el.setPointerCapture(e.pointerId)}catch{}
  el.onpointermove=dragMove;el.onpointerup=dragEnd;el.onpointercancel=dragEnd}
function dragMove(e){if(!drag)return;
  if(!drag.moved){if(Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<8)return;drag.moved=true;
    const g=drag.el.cloneNode(true);g.className='tile ghost';g.style.width=drag.w+'px';g.style.height=drag.h+'px';document.body.appendChild(g);drag.ghost=g;drag.el.classList.add('lifted')}
  drag.ghost.style.left=(e.clientX-drag.dx)+'px';drag.ghost.style.top=(e.clientY-drag.dy)+'px';
  const t=dropTarget(e.clientX,e.clientY);
  document.querySelectorAll('.over').forEach(n=>n.classList.remove('over'));if(t)t.classList.add('over')}
function dropTarget(x,y){const el=document.elementFromPoint(x,y);return el?el.closest('.bslot,.pool'):null}
function dragEnd(e){if(!drag)return;const {el,id,moved,ghost}=drag;
  el.onpointermove=el.onpointerup=el.onpointercancel=null;
  if(ghost)ghost.remove();el.classList.remove('lifted');
  document.querySelectorAll('.over').forEach(n=>n.classList.remove('over'));drag=null;
  if(!moved)return tapTile(id);
  const t=dropTarget(e.clientX,e.clientY);
  if(t&&t.classList.contains('bslot'))place(id,+t.dataset.slot);else if(t&&t.classList.contains('pool'))unplace(id);
  renderBoard()}
/* Only the occupied slots are read, in order, with the gaps thrown away. Nothing
   submits on its own: auto-submitting at five letters would announce that the
   word has five letters, which is the whole thing this mode is built to hide. */
function built(){return state.slots.filter(id=>id!=null).map(id=>tile(id).ch).join('')}
function hintFirst(){const ch=current().word[0],occ=state.slots[0];
  if(occ!=null){if(state.fixed.has(occ))return;unplace(occ)}
  const t=state.tiles.filter(x=>x.ch===ch&&!state.fixed.has(x.id)).sort((a,b)=>(a.at==null?0:1)-(b.at==null?0:1))[0];
  if(!t)return;place(t.id,0);state.fixed.add(t.id)}
function checkBlocks(){if(state.locked)return;const answer=built();
  if(!answer)return feedback('Put some letters in the row first.','try');
  const q=current(),r=rec(q.word);r.lastPracticedAt=Date.now();
  if(answer===q.word){state.locked=true;r.blocksCorrect=(r.blocksCorrect||0)+1;save();
    feedback('You built it! ⭐','good');const row=document.querySelector('.bslots');if(row)row.classList.add('win');
    chime(true);celebrate();state.i++;setTimeout(nextBlock,900);return}
  state.attempts++;r.blocksIncorrect=(r.blocksIncorrect||0)+1;save();chime(false);
  /* Same two thresholds as the keyboard modes: a nudge first, a rule at two
     misses, the answer itself only at three. */
  if(state.attempts===1)return feedback('Not yet. Listen again, then look at your letters.','try'),playWord();
  if(state.attempts===2){state.hinted=true;hintFirst();renderBoard();return feedback(`It starts with “${q.word[0].toUpperCase()}”.`,'try')}
  state.hinted=true;state.showWord=true;renderBlock();feedback('Here is the word. Build it the same way.','try')}
function renderBlock(){const q=current();
  scene('reef');app.innerHTML=buddyHTML()+headerBar('Letter Blocks',`<span class="pill">${state.i+1} / ${state.queue.length}</span>`)+`<section class="bstage"><div class="card">${visual(q.word)}<button class="sound" aria-label="Replay word">🔊</button>${state.showWord?`<div class="reveal">${q.word.toUpperCase()}</div>`:'<p class="prompt">Build the word</p>'}<div class="feedback"></div></div>${blocksBoard()}</section>`;
  wireBack(()=>chooseSets('blocks'));$('.sound').onclick=playWord;wireBoard();
  window.onkeydown=e=>{if(e.key==='Enter')checkBlocks()}}
function nextBlock(){if(state.i>=state.queue.length){if(state.round===1){state.round=2;return roundBreak()}return blocksDone()}
  state.attempts=0;state.hinted=false;state.locked=false;state.showWord=false;
  state.accent=accentFor(current().word);dealTiles();renderBlock();setTimeout(playWord,300)}
/* The group flow the brief describes: meet the five cards, build all five,
   shuffle and build them again, then hand the same five to the keyboard. */
function startBlocks(idx){const words=SETS[idx].map(word=>({word,set:idx+1}));
  state={screen:'blocks',mode:'blocks',setIndex:idx,words,queue:words,i:0,round:1,leg:'cards',attempts:0,hinted:false,locked:false,showWord:true,accent:'us',answers:[],tiles:[],slots:[],fixed:new Set(),buddy:buddyFor(idx)};
  cardLeg()}
function cardLeg(){const q=current(),last=state.i===state.queue.length-1;state.accent=accentFor(q.word);
  scene('reef');app.innerHTML=buddyHTML()+headerBar('Word Cards',`<span class="pill">${state.i+1} / ${state.queue.length}</span>`)+`<section class="bstage"><div class="card">${visual(q.word)}<button class="sound" aria-label="Replay word">🔊</button><div class="reveal">${q.word.toUpperCase()}</div><p class="prompt">Look at it. Listen to it. Say it.</p><div class="actions"><button class="primary go">${last?'Build the words →':'Next →'}</button></div></div></section>`;
  wireBack(()=>chooseSets('blocks'));window.onkeydown=null;$('.sound').onclick=playWord;
  $('.go').onclick=()=>{state.i++;if(state.i<state.queue.length)return cardLeg();beginRound()};
  setTimeout(playWord,300)}
function beginRound(){state.leg='build';state.queue=shuffle(state.words);state.i=0;nextBlock()}
function blocksPanel(inner){scene('reef');app.innerHTML=buddyHTML()+headerBar('Letter Blocks')+`<section class="bstage"><div class="card">${inner}</div></section>`;wireBack(()=>chooseSets('blocks'));window.onkeydown=null}
function roundBreak(){blocksPanel(`<div class="reveal">Round 1 done ⭐</div><p class="prompt">The same five words again, all mixed up.</p><div class="actions"><button class="primary go">Go →</button></div>`);say('good','Five down. I am right here.');$('.go').onclick=beginRound}
function blocksDone(){const words=state.words,idx=state.setIndex;
  blocksPanel(`<div class="reveal">All five built 🎉</div><p class="prompt">Now spell them on the keyboard.</p><div class="actions"><button class="primary keys">Keyboard →</button><button class="secondary again">Word cards again</button><button class="secondary done">Done</button></div>`);
  say('good','You built every one of them!');
  $('.keys').onclick=()=>start('practice',words);$('.again').onclick=()=>startBlocks(idx);$('.done').onclick=home}
home();if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');
