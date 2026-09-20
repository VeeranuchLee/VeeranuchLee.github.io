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
function load(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}}
/* v:2 is the first version marker this store has ever carried, and nothing branches
   on it: every field added since v1 -- the blocks counters, and now the writing ones
   -- simply appears beside the older ones, so a record written before this build
   loads and works untouched. The marker exists so a LATER schema change can find
   its boundary without guessing. */
function save(){db.v=2;localStorage.setItem(STORE,JSON.stringify(db))}
function rec(word){return db.words[word]||(db.words[word]={correctUnassisted:0,incorrect:0,hintsUsed:0,lastPracticedAt:0,lastSession:'',accentIndex:0,accentOrder:[],accents:{us:{correct:0,incorrect:0},uk:{correct:0,incorrect:0},au:{correct:0,incorrect:0}}})}
function shuffle(a){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function accentFor(word){const r=rec(word);if(!r.accentOrder.length){let block=shuffle(ACCENTS);if(r.lastAccent===block[0])block.push(block.shift());r.accentOrder=block}const a=r.accentOrder.shift();r.lastAccent=a;save();return a}
function all(){return SETS.flatMap((words,i)=>words.map(word=>({word,set:i+1}))) }
function mastery(word){const r=rec(word);if(r.correctUnassisted>=3&&(r.correctSessions||[]).length>=2)return'MASTERED';if(r.correctUnassisted>=2)return'ALMOST';if(r.correctUnassisted||r.incorrect)return'LEARNING';return'NEW'}
function sessionId(){let id=sessionStorage.getItem(SESSION);if(!id){id=Date.now().toString(36);sessionStorage.setItem(SESSION,id)}return id}
function priority(x){const r=rec(x.word);return (r.incorrect*5+/* §5.3: write misses join the weighting, guarded the way every late-added field is */((r.write||{}).strokesRejected||0)*3+r.hintsUsed*4+(r.correctUnassisted?0:8))-(r.correctUnassisted*2)+(r.lastPracticedAt?Math.min(5,(Date.now()-r.lastPracticedAt)/864e5):6)+Math.random()}
/* §5.3: which representation a weak word is served through — the earliest of the
   four tracks whose completion evidence is still empty, else keyboard recall.
   Every read is guarded, because a record saved before these tracks existed has
   no recognise and no write, and must load, route to Hear/See, and never throw. */
function weakRoute(word){const r=rec(word),w=r.write||{};
  if(!((r.recognise||{}).exposures>0))return'see';
  if(!(r.blocksCorrect>0))return'build';
  if(!(w.traced||w.copied||w.fromMemory))return'write';
  return'type'}
/* The way out, on the home screen only. The owner's standing rule from 2026-08-27 is
   that ALL games carry a back icon to the hub, because a four-year-old could not get out
   of one. The header arrow on every other screen goes to THIS screen, so leaving is one
   more tap of the same idea rather than a second button on every screen -- the same
   arrangement time-book uses.

   Absolute URL on purpose: published, /spelling-exam/ and /word-book/ are siblings, but
   in this repo they are separate top-level folders, so a relative link would work live
   and 404 in every local preview -- the kind of difference nobody notices until a child
   taps it. It names where it goes rather than saying "back", for the same reason.

   2026-09-09: this went from /children-apps/ to /word-book/. Children Games no longer
   has a Spelling Exam card; it has one Our Word Book card, and this game is a section
   inside it. An arrow left pointing at the hub would drop a child onto a page that no
   longer lists the game they were just playing -- which is the exact fault Writing Book
   shipped for eight days in September.
   THIS ARROW AND /word-book/ MUST PUBLISH TOGETHER, or the exit is a 404. See
   release/registry.json, the word-book note. */
const HUB='https://veeranuchlee.github.io/word-book/';
/* ---- MENU BED AND SPOKEN PRAISE ----
   AUDIO-DIRECTION.md decision 10 for the bed, and its 2026-08-20 rule for where it may
   play: atmosphere where the child is CHOOSING, silence where they are spelling. So the
   bed runs on the home screen and the set pickers and stops the moment a word appears.
   Off by default, behind its own toggle, like the hub's and Magic Math's. */
const BED_KEY='spelling-exam-bed-v1';
let bed=null,bedWanted=(()=>{try{return localStorage.getItem(BED_KEY)==='on'}catch{return false}})();
function bedOn(){return bedWanted}
function setBed(on){bedWanted=on;try{localStorage.setItem(BED_KEY,on?'on':'off')}catch{}
  if(on)bedPlay();else bedStop()}
function bedPlay(){if(!bedWanted)return;
  if(!bed){bed=new Audio('assets/audio/sea-bed.m4a');bed.loop=true;bed.volume=.32}
  /* A tab that has never been touched refuses to autoplay. That is not an error worth
     showing a child: the toggle they just pressed IS the gesture, and on a cold load the
     bed simply waits for the first tap. */
  bed.play().catch(()=>{})}
function bedStop(){if(bed){bed.pause();try{bed.currentTime=0}catch{}}}
/* Spoken praise, US voice, rendered by tools/render-praise.py. It plays only where the
   confetti already fires, so the Mock Exam stays silent -- a cheer there would say the
   answer was right before the results screen does. */
const PRAISE=['yes','you-did-it','brilliant','thats-the-one','well-done','perfect'];
let praise=null;
function cheer(which){const name=which||PRAISE[Math.floor(Math.random()*PRAISE.length)];
  try{if(praise)praise.pause();praise=new Audio(`assets/audio/praise/${name}.m4a`);praise.volume=.9;praise.play().catch(()=>{})}catch{}}

/* The Write Words stage guidance, in the same designed teacher voice as the words and
   the praise (owner, 2026-09-17 evening): four ruled lines rendered by
   tools/render-guidance.py, spoken EVERY time a stage opens -- the WORD first, the
   instruction after a short pause (see speakStage below) -- plus the demonstration line
   when the two-miss demo animates. Write screens only: never the Mock Exam, the same
   boundary the praise bank obeys, and guidance never names the word it is asking about. */
let guidance=null;
function guide(key){try{if(guidance)guidance.pause();guidance=new Audio(`assets/audio/guidance/${key}.m4a`);guidance.volume=.9;guidance.play().catch(()=>{})}catch{}}

/* Mode pictures for the menu. The owner's note was that the text alone does not say
   what a mode IS -- "hard for even grown up to know what they are exactly" -- so each
   one draws its own mechanic rather than decorating the card: a picture card with a word
   under it, tiles dropping into a row, a keyboard, a listening exam with nothing to look
   at. Inline SVG because it must stay crisp at 54px, carry no download, and take the
   card's own colour. */
const MODE_ART={
  /* Each glyph must say what makes its mode DIFFERENT, not just "spelling". The first
     draft drew a picture card for both Practice and Learn and they read as the same
     mode -- which is the complaint, restated in pictures. The distinguishing fact is:
     Learn SHOWS the word, Blocks gives you tiles, Word Sets gives you a keyboard, Mock
     Exam gives you nothing to look at, Practice picks for you, Weak Words goes again. */
  practice:`<svg viewBox="0 0 60 46" aria-hidden="true"><path d="M30 3l5.4 11.4L47 16.2l-8.5 8.6 2 12.2L30 31.2 19.5 37l2-12.2L13 16.2l11.6-1.8z" class="f3"/><g class="f1"><rect x="14" y="40" width="9" height="4.5" rx="2.2"/><rect x="25.5" y="40" width="9" height="4.5" rx="2.2"/><rect x="37" y="40" width="9" height="4.5" rx="2.2"/></g></svg>`,
  learn:`<svg viewBox="0 0 60 46" aria-hidden="true"><rect x="13" y="1" width="34" height="24" rx="6" class="f2"/><circle cx="23" cy="9" r="3.6" class="f1"/><path d="M17 21l7-7.5 5 5 4-3.5 6 6z" class="f1"/><text x="30" y="42" class="glyphword">cat</text></svg>`,
  blocks:`<svg viewBox="0 0 60 46" aria-hidden="true"><g class="s1"><rect x="3.5" y="29" width="12" height="14" rx="4"/><rect x="17.5" y="29" width="12" height="14" rx="4"/><rect x="31.5" y="29" width="12" height="14" rx="4"/><rect x="45.5" y="29" width="11" height="14" rx="4"/></g><rect x="3.5" y="29" width="12" height="14" rx="4" class="f1"/><text x="9.5" y="40" class="glyphtile">c</text><rect x="17.5" y="29" width="12" height="14" rx="4" class="f1"/><text x="23.5" y="40" class="glyphtile">a</text><rect x="31" y="4" width="13" height="15" rx="4" class="f3"/><text x="37.5" y="15.5" class="glyphtile on3">t</text><path d="M37.5 21v4.5" class="s2"/><path d="M34 23l3.5 4 3.5-4" class="s2"/></svg>`,
  sets:`<svg viewBox="0 0 60 46" aria-hidden="true"><rect x="1" y="9" width="58" height="33" rx="7" class="f2"/><g class="f1"><rect x="5" y="14" width="8.4" height="6.4" rx="2.2"/><rect x="15.4" y="14" width="8.4" height="6.4" rx="2.2"/><rect x="25.8" y="14" width="8.4" height="6.4" rx="2.2"/><rect x="36.2" y="14" width="8.4" height="6.4" rx="2.2"/><rect x="46.6" y="14" width="8.4" height="6.4" rx="2.2"/><rect x="8" y="23" width="8.4" height="6.4" rx="2.2"/><rect x="18.4" y="23" width="8.4" height="6.4" rx="2.2"/><rect x="28.8" y="23" width="8.4" height="6.4" rx="2.2"/><rect x="39.2" y="23" width="8.4" height="6.4" rx="2.2"/><rect x="12" y="32" width="8.4" height="6" rx="2.2"/><rect x="39" y="32" width="8.4" height="6" rx="2.2"/></g><rect x="22.4" y="32" width="14.6" height="6" rx="3" class="f3"/></svg>`,
  weak:`<svg viewBox="0 0 60 46" aria-hidden="true"><path d="M46 20A16 16 0 1 0 43 33" class="s3"/><path d="M53 12l-5.6 8.6 10.2.8z" class="f3"/><g class="f1"><rect x="17" y="33" width="9" height="4.6" rx="2.3"/><rect x="28.5" y="33" width="9" height="4.6" rx="2.3"/></g></svg>`,
  /* What makes Write Words different from every other card: ruled paper, a dotted
     word, and a hand actually laying ink on it. */
  write:`<svg viewBox="0 0 60 46" aria-hidden="true"><g class="s1"><path d="M2 8h56" stroke-dasharray="5 5"/><path d="M2 20h56" stroke-dasharray="5 5"/></g><path d="M2 32h56" class="s3"/><text x="15" y="32" class="glyphtrace">ab</text><path d="M48 4l7 7-16 16-9 2 2-9z" class="f3"/><path d="M32 20l-2 9 9-2z" class="f1"/><path d="M30 29l3.4-.9-2.5-2.5z" class="f2"/></svg>`,
  exam:`<svg viewBox="0 0 60 46" aria-hidden="true"><path d="M13 25v-4a17 17 0 0 1 34 0v4" class="s3"/><rect x="6.5" y="23" width="11" height="16" rx="5.5" class="f1"/><rect x="42.5" y="23" width="11" height="16" rx="5.5" class="f1"/><g class="f3"><rect x="21" y="40" width="7.4" height="4.4" rx="2.2"/><rect x="31" y="40" width="7.4" height="4.4" rx="2.2"/></g></svg>`};

function home(){state.screen='home';state.buddy='';scene('hall');app.innerHTML=`<div class="topline"><a class="hub" href="${HUB}">← Our Word Book</a><button class="bedtoggle" aria-pressed="${bedOn()}">${bedOn()?"🔊":"🔈"} Music</button></div><section class="hero"><div class="mascot" aria-hidden="true">${MASCOT}</div><h1>Spelling Exam</h1><p>See it. Hear it. Spell it.</p></section><section class="menu"><button data-go="practice"><span class="modeart">${MODE_ART.practice}</span><strong>Practise Now</strong><small>Start with words that need you most</small></button><button data-go="learn"><i class="step">1</i><span class="modeart">${MODE_ART.learn}</span><strong>Learn Words</strong><small>Look, listen, then copy</small></button><button data-go="blocks"><i class="step">2</i><span class="modeart">${MODE_ART.blocks}</span><strong>Letter Blocks</strong><small>Build the word from tiles</small></button><button data-go="write"><i class="step">3</i><span class="modeart">${MODE_ART.write}</span><strong>Write Words</strong><small>Trace, copy, then write it</small></button><button data-go="sets"><i class="step">4</i><span class="modeart">${MODE_ART.sets}</span><strong>Word Sets 1–12</strong><small>Spell it on the keyboard</small></button><button data-go="weak"><span class="modeart">${MODE_ART.weak}</span><strong>Weak Words</strong><small>Practise tricky words again</small></button><button data-go="exam"><i class="step">5</i><span class="modeart">${MODE_ART.exam}</span><strong>Mock Exam</strong><small>Five words, results at the end</small></button></section>`;bindNav();$('.bedtoggle').onclick=()=>{setBed(!bedOn());home()};bedPlay()}
function bindNav(){document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>route(b.dataset.go))}
function route(go){if(go==='practice')start('practice',shuffle(all()).sort((a,b)=>priority(b)-priority(a)).slice(0,10));if(go==='weak'){const q=all().filter(x=>{const r=rec(x.word);return r.incorrect||r.hintsUsed||r.blocksIncorrect||(r.write||{}).strokesRejected}).sort((a,b)=>priority(b)-priority(a));startWeak((q.length?q:all()).slice(0,10))}if(go==='sets')chooseSets('practice');if(go==='learn')chooseSets('learn');if(go==='blocks')chooseSets('blocks');if(go==='write')chooseSets('write');if(go==='exam')examMenu()}
function headerBar(title,extra=''){return `<header class="top"><button class="back" aria-label="Back">←</button><h1>${title}</h1>${extra}</header>`}
function wireBack(fn=home){$('.back').onclick=fn}
function chooseSets(mode,examVariant=''){scene('hall');bedPlay();const title=mode==='learn'?'Learn Words':mode==='blocks'?'Letter Blocks':mode==='write'?'Write Words':'Choose a word set';app.innerHTML=headerBar(title)+`<section class="sets">${SETS.map((w,i)=>{/* building a word and spelling one are different skills, so they are counted apart */const n=mode==='blocks'?w.filter(x=>rec(x).blocksCorrect).length:mode==='write'?w.filter(x=>(rec(x).write||{}).fromMemory).length:w.filter(x=>mastery(x)==='MASTERED').length;return`<button class="set" data-set="${i}"><b>WORDS ${i+1}</b><span>${n} / 5 ${mode==='blocks'?'built':mode==='write'?'done':'mastered'}</span></button>`}).join('')}</section>`;wireBack(mode==='learn'||mode==='blocks'||mode==='write'?home:examVariant?examMenu:home);document.querySelectorAll('.set').forEach(b=>b.onclick=()=>{const i=+b.dataset.set;if(mode==='blocks')return startBlocks(i);if(mode==='write')return startWrite(i);start(mode,SETS[i].map(word=>({word,set:i+1})),examVariant)})}
function examMenu(){scene('hall');bedPlay();app.innerHTML=headerBar('Mock Exam')+`<section class="menu"><button data-variant="picture"><strong>Picture-assisted</strong><small>See the picture and hear the word</small></button><button data-variant="dictation"><strong>Pure dictation</strong><small>Hear the word, without a picture</small></button></section>`;wireBack();document.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>chooseSets('exam',b.dataset.variant))}
function start(mode,queue,variant='',after=''){/* `set` is 1-based and startBlocks() seeds on the 0-based index, so without
   the -1 the same five words hand the child one companion in Letter Blocks
   and a different one on the keyboard -- which is the one place the
   companion is supposed to carry over. */
  const buddy=buddyFor(queue.length?queue[0].set-1:0);state={screen:'question',mode,variant,queue:shuffle(queue),i:0,typed:'',attempts:0,hinted:false,accent:'us',answers:[],locked:false,showWord:mode==='learn',buddy,after};next(true)}
function current(){return state.queue[state.i]}
function next(first=false){if(state.i>=state.queue.length)return results();state.typed='';state.attempts=0;state.hinted=false;state.locked=false;state.showWord=state.mode==='learn';state.accent=accentFor(current().word);renderQuestion();setTimeout(playWord,first?450:250)}
function visual(word){return`<div class="picture"><img src="assets/words/${word}.webp" alt="" draggable="false"></div>`}
function renderQuestion(){bedStop();const q=current(),hidePicture=state.mode==='exam'&&state.variant==='dictation';scene('reef');app.innerHTML=buddyHTML()+headerBar(state.mode==='exam'?'Mock Exam':state.mode==='learn'?'Learn Words':'Practice',`<span class="pill">${state.i+1} / ${state.queue.length}</span>`)+`<section class="stage"><div class="card">${hidePicture?'<div class="picture">🎧</div>':visual(q.word)}<button class="sound" aria-label="Replay word">🔊</button>${state.showWord?`<div class="word-reveal">${q.word}</div>`:'<p class="prompt">Listen and spell the word</p>'}<div class="slots">${q.word.split('').map((_,i)=>`<span class="slot">${state.typed[i]||''}</span>`).join('')}</div><div class="feedback"></div></div><div>${keyboard()}</div></section>`;wireBack(()=>state.mode==='exam'?examMenu():home());$('.sound').onclick=playWord;wireKeys()}
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

function check(){if(!state.typed)return;const q=current(),r=rec(q.word),ok=state.typed.toLowerCase()===q.word;if(state.mode==='exam'){state.answers.push({word:q.word,typed:state.typed,ok,accent:state.accent});state.locked=true;state.i++;setTimeout(next,250);return}if(ok){state.locked=true;r.lastPracticedAt=Date.now();r.accents[state.accent].correct++;if(!state.hinted&&state.attempts===0&&!sessionSeen.has(q.word)){r.correctUnassisted++;r.correctSessions=[...new Set([...(r.correctSessions||[]),sessionId()])]}r.lastSession=sessionId();sessionSeen.add(q.word);save();feedback('You spelled it! ⭐','good');cheer('spelled-it');celebrate();const slots=$('.slots');if(slots)slots.classList.add('win');chime(true);state.i++;setTimeout(next,750)}else{state.attempts++;r.incorrect++;r.accents[state.accent].incorrect++;r.lastPracticedAt=Date.now();if(state.attempts===2){state.hinted=true;r.hintsUsed++;state.typed=q.word[0];document.querySelectorAll('.slot').forEach((s,i)=>s.textContent=state.typed[i]||'');feedback(`Try again — it starts with “${q.word[0]}”.`,'try')}else if(state.attempts>=3){state.hinted=true;state.showWord=true;renderQuestion();feedback('Look carefully, then type the whole word.','try')}else{state.typed='';document.querySelectorAll('.slot').forEach(s=>s.textContent='');feedback('Not yet — listen and try again.','try');playWord()}save();chime(false)}}
/* Word audio is scheduled on a timer, so a fast answer can leave the timer to fire after
   the queue has already moved past its last word. There is nothing to play then. */
let audio;function playWord(){const q=current();if(!q)return;const {word}=q;if(audio)audio.pause();audio=new Audio(`assets/audio/${state.accent}/${word}.m4a`);audio.play().catch(()=>feedback('Tap 🔊 to hear the word.','muted'))}
function spellLetters(){let i=0;const letters=current().word.split('');function one(){if(i>=letters.length)return;const a=new Audio(`assets/audio/letters/${letters[i++]}.m4a`);a.onended=one;a.play().catch(()=>{});}one()}
function chime(ok){const C=window.AudioContext||window.webkitAudioContext,c=new C();if(!ok){const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=180;g.gain.setValueAtTime(.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.start();o.stop(c.currentTime+.2);return}/* three-note major arpeggio: the sound of getting it right */[523.25,659.25,783.99].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.09;o.type='triangle';o.connect(g);g.connect(c.destination);o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.55)})}
function celebrate(){const host=document.createElement('div');host.className='celebration';host.setAttribute('aria-hidden','true');const BITS=['★','✦','♥','✧','✿'],COLORS=['#f06fb4','#9a55d6','#f6ad3d','#f472b6','#c4b5fd','#7ad0f0'];for(let i=0;i<44;i++){const s=document.createElement('span');s.className='confetti';s.textContent=BITS[i%BITS.length];s.style.left=(4+Math.random()*92)+'%';s.style.color=COLORS[i%COLORS.length];s.style.fontSize=(13+Math.random()*17)+'px';s.style.animationDuration=(.9+Math.random()*.9)+'s';s.style.animationDelay=(Math.random()*.25)+'s';host.appendChild(s)}document.body.appendChild(host);setTimeout(()=>host.remove(),2200)}
function results(){window.onkeydown=null;if(state.mode!=='exam'){if(state.after)return state.after();home();return}const score=state.answers.filter(x=>x.ok).length;state.answers.forEach(a=>{const r=rec(a.word);r.lastPracticedAt=Date.now();if(a.ok){r.correctUnassisted++;r.correctSessions=[...new Set([...(r.correctSessions||[]),sessionId()])];r.accents[a.accent].correct++}else{r.incorrect++;r.accents[a.accent].incorrect++}});save();scene('hall');app.innerHTML=headerBar('Your results')+`<section class="card results"><div class="word-reveal">${score} / ${state.answers.length}</div>${state.answers.map(a=>`<div class="result"><b>${a.ok?'✓':'✗'} ${a.word}</b><span>${a.ok?'correct':`you typed: ${a.typed||'—'}`}</span></div>`).join('')}<div class="actions"><button class="primary mistakes">Practice mistakes</button><button class="secondary done">Done</button></div></section>`;wireBack(home);$('.done').onclick=home;$('.mistakes').onclick=()=>{const q=state.answers.filter(x=>!x.ok).map(x=>all().find(y=>y.word===x.word));start('practice',q.length?q:state.queue)}}
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
    feedback('You built it! ⭐','good');cheer('built-it');const row=document.querySelector('.bslots');if(row)row.classList.add('win');
    chime(true);celebrate();state.i++;setTimeout(nextBlock,900);return}
  state.attempts++;r.blocksIncorrect=(r.blocksIncorrect||0)+1;save();chime(false);
  /* Same two thresholds as the keyboard modes: a nudge first, a rule at two
     misses, the answer itself only at three. */
  if(state.attempts===1)return feedback('Not yet. Listen again, then look at your letters.','try'),playWord();
  if(state.attempts===2){state.hinted=true;hintFirst();renderBoard();return feedback(`It starts with “${q.word[0].toUpperCase()}”.`,'try')}
  state.hinted=true;state.showWord=true;renderBlock();feedback('Here is the word. Build it the same way.','try')}
function renderBlock(){const q=current();bedStop();
  scene('reef');app.innerHTML=buddyHTML()+headerBar('Letter Blocks',`<span class="pill">${state.i+1} / ${state.queue.length}</span>`)+`<section class="bstage"><div class="card">${visual(q.word)}<button class="sound" aria-label="Replay word">🔊</button>${state.showWord?`<div class="reveal">${q.word.toUpperCase()}</div>`:'<p class="prompt">Build the word</p>'}<div class="feedback"></div></div>${blocksBoard()}</section>`;
  wireBack(()=>chooseSets('blocks'));$('.sound').onclick=playWord;wireBoard();
  window.onkeydown=e=>{if(e.key==='Enter')checkBlocks()}}
function nextBlock(){if(state.i>=state.queue.length){if(state.round===1){state.round=2;return roundBreak()}return blocksDone()}
  state.attempts=0;state.hinted=false;state.locked=false;state.showWord=false;
  state.accent=accentFor(current().word);dealTiles();renderBlock();setTimeout(playWord,300)}
/* The group flow the brief describes: meet the five cards, build all five,
   shuffle and build them again, then hand the same five to the keyboard. */
function startBlocks(idx,one,after){const words=one?[one]:SETS[idx].map(word=>({word,set:idx+1}));
  /* A weak word routed here (§5.3) arrives already chosen: no cards leg and no
     second round — one build of this word, then the sitting it came from. */
  state={screen:'blocks',mode:'blocks',setIndex:idx,words,queue:words,i:0,round:one?2:1,leg:one?'build':'cards',attempts:0,hinted:false,locked:false,showWord:true,accent:'us',answers:[],tiles:[],slots:[],fixed:new Set(),buddy:buddyFor(idx),after};
  if(one)return nextBlock();
  cardLeg()}
function cardLeg(){bedStop();const q=current(),last=state.i===state.queue.length-1;state.accent=accentFor(q.word);
  scene('reef');app.innerHTML=buddyHTML()+headerBar('Word Cards',`<span class="pill">${state.i+1} / ${state.queue.length}</span>`)+`<section class="bstage"><div class="card">${visual(q.word)}<button class="sound" aria-label="Replay word">🔊</button><div class="reveal">${q.word.toUpperCase()}</div><p class="prompt">Look at it. Listen to it. Say it.</p><div class="actions"><button class="primary go">${last?'Build the words →':'Next →'}</button></div></div></section>`;
  wireBack(()=>chooseSets('blocks'));window.onkeydown=null;$('.sound').onclick=playWord;
  $('.go').onclick=()=>{state.i++;if(state.i<state.queue.length)return cardLeg();beginRound()};
  setTimeout(playWord,300)}
function beginRound(){state.leg='build';state.queue=shuffle(state.words);state.i=0;nextBlock()}
function blocksPanel(inner){scene('reef');app.innerHTML=buddyHTML()+headerBar('Letter Blocks')+`<section class="bstage"><div class="card">${inner}</div></section>`;wireBack(()=>chooseSets('blocks'));window.onkeydown=null}
function roundBreak(){blocksPanel(`<div class="reveal">Round 1 done ⭐</div><p class="prompt">The same five words again, all mixed up.</p><div class="actions"><button class="primary go">Go →</button></div>`);say('good','Five down. I am right here.');$('.go').onclick=beginRound}
function blocksDone(){if(state.after)return state.after();const words=state.words,idx=state.setIndex;
  blocksPanel(`<div class="reveal">All five built 🎉</div><p class="prompt">Now spell them on the keyboard.</p><div class="actions"><button class="primary keys">Keyboard →</button><button class="secondary again">Word cards again</button><button class="secondary done">Done</button></div>`);
  say('good','You built every one of them!');
  $('.keys').onclick=()=>start('practice',words);$('.again').onclick=()=>startBlocks(idx);$('.done').onclick=home}
/* ---- WRITE WORDS ------------------------------------------------------------
   The owner's 2026-09-14 progression, one word per screen: TRACE the dotted word,
   COPY it on a blank line with the word still in view, then WRITE it from memory
   with the spelling nowhere on the screen.

   NONE OF THE HANDWRITING IS OURS. handwriting/letters.js and handwriting/strokes.js
   are byte-identical copies of the Writing Book's canonical files, dropped there by
   tools/port-handwriting.js and held to the byte by its --check in preflight. So the
   letterforms a child traces here, the corridor they are allowed, the four-number
   grader that marks them and the demonstration that shows them how are the ones
   writing-book/qc/grading.html tests -- 858 + 522 + 31 checks. Nothing in this file
   draws a letter or scores a stroke, and nothing in it may start to. A runtime
   import is impossible: each release copies one directory to the public site, so
   /spelling-exam/ has no path to /writing-book/'s files. See the port tool's header.

   THE THIRD STAGE IS WHY THE ENGINE GREW A FREE MODE. A trace surface draws the
   dotted word, and on the WRITE screen the dotted word IS the answer. Free mode has
   no target layer at all -- no ghost, no dots, no ink-in-waiting -- so the spelling
   cannot leak onto that screen through the writing area. tools/test-write-words.js
   asserts that against the built DOM rather than trusting this paragraph.

   THE CHILD'S OWN HAND STAYS. keepInk is the owner's "preserve the child's actual
   strokes; do not auto-beautify handwriting": where the Writing Book fades an
   accepted wobble out as the clean stroke draws in, here both stand. Undo and Clear
   are how a child takes a line back -- crossing an attempt out is legitimate on
   paper -- and neither touches the counters.  */
const WRITE_STAGES=[
  /* `step` names the stage on its own button in the step row, so a child reaching back
     for a scaffold is told what they are reaching for. Deliberately says nothing a
     child could read the spelling out of -- these labels render on the WRITE screen. */
  {key:'trace',prompt:'Trace the word on the dots.',step:'Trace it'},
  {key:'copy',prompt:'Now write it yourself.',step:'Copy it'},
  /* Deliberately says nothing a child could read the spelling out of. */
  {key:'memory',prompt:'Write it from memory.',step:'From memory'}];
/* One visible number, the same rule the Writing Book uses: the corridor tightens in
   thirds as the sets get harder (WRITING-EXPERIENCE-SPEC.md 10.2). */
function writeLevel(setIndex){return setIndex<4?1:setIndex<8?2:3}
/* THE GRADER TELLS THE CHILD WHY (owner report 2026-09-19: "apparently good writing
   repeatedly fails... the UI exposes only generic retry feedback"). The engine has
   always returned a specific reject reason; these are the Writing Book's own nudge
   words for the same reasons, so a child meeting both apps is told the same thing
   by both. Tolerances are NOT touched -- the parked level-tolerance decision stays
   parked, and qc/grading.html's verdicts are unchanged because the engine is. */
const WRITE_NUDGE={start:'Start at the green dot.',direction:'Follow the line from the dot.',
  coverage:'Keep going to the end.',accuracy:'Stay on the line.'};
/* Grader evidence, per difficulty tier, kept in a store of its own
   (spelling-exam-grader-v1) so the progress record keeps exactly the shape the spec
   names and test-write-words.js guards -- the evidence is device telemetry, not part
   of the child's record. With this, the parked tolerance decision can one day be
   made from what actually rejected the children on this device; see the muted line
   on the round-complete screen. */
const GRADER_STORE='spelling-exam-grader-v1';
let graderDb=load(GRADER_STORE,null);
function grader(){if(!graderDb)graderDb={accepted:0,rejected:{1:{start:0,direction:0,coverage:0,accuracy:0},
  2:{start:0,direction:0,coverage:0,accuracy:0},3:{start:0,direction:0,coverage:0,accuracy:0}}};
  return graderDb}
function graderSave(){try{localStorage.setItem(GRADER_STORE,JSON.stringify(graderDb))}catch{}}
/* The grown-up reset, 2026-09-19: zeroes the EVIDENCE and nothing else. The child's
   progress record (STORE) is a different key and is never touched, the grading
   thresholds live in the ported engine and are never read here, and a reset starts a
   fresh evidence session without erasing a single sticker, set or completion. The ✕
   beside the grown-ups line is the only door to it -- a child has no reason to tap a
   small grey dot that says nothing. */
function resetGraderEvidence(){graderDb=null;try{localStorage.removeItem(GRADER_STORE)}catch{}
  const line=$('.gline-row');if(line)line.outerHTML=graderLine()?`<p class="gline-row"><span class="gline">${graderLine()}</span><button class="greset" aria-label="Reset grader evidence for a fresh session">✕</button></p>`:''}
function graderLine(){const g=grader();if(!g.accepted&&!Object.values(g.rejected).some(t=>Object.values(t).some(n=>n)))return'';
  const parts=['start','direction','coverage','accuracy'].map((k,i)=>[k,[1,2,3].reduce((s,L)=>s+(g.rejected[L][k]||0),0)])
    .filter(([,n])=>n).map(([k,n])=>`${k} ${n}`);
  return `Grown-ups — grader on this device: ${g.accepted} accepted`+(parts.length?` · rejected: ${parts.join(' · ')}`:'')}

/* The evidence tracks of WRITING-EXPERIENCE-SPEC.md 6.2, created the way the Letter
   Blocks counters were: on first touch, beside everything already in the record. A
   record saved before this build gains them here and is never rewritten, and the
   keyboard modes keep feeding exactly the counters they feed today -- building a
   word, writing one and spelling one are different skills and are counted apart. */
function writeRec(word){const r=rec(word);
  if(!r.recognise)r.recognise={exposures:0,lastAt:0};
  if(!r.write)r.write={traced:0,copied:0,fromMemory:0,strokesAccepted:0,strokesRejected:0,lastAt:0};
  if(r.writeStage==null)r.writeStage=0;
  return r}
let surface=null;
function writeDestroy(){if(surface){surface.destroy();surface=null}if(guidance)guidance.pause();
  /* The writing lock leaves with the surface: every other screen keeps the app's
     ordinary scrolling document. renderWrite re-adds it on the way in. */
  document.body.classList.remove('wlock')}
function startWrite(idx,one,after){writeDestroy();
  const words=one?[one]:SETS[idx].map(word=>({word,set:idx+1}));
  state={screen:'write',mode:'write',setIndex:idx,queue:words,i:0,
    stage:0,level:writeLevel(idx),accent:'us',misses:0,inked:0,locked:false,screenToken:0,buddy:buddyFor(idx),after};
  nextWriteWord(true)}
function nextWriteWord(first=false){if(state.i>=state.queue.length)return writeDone();
  /* Resume where this word was left and never further back: a child who has already
     traced `cat` is not sent through the dots again to reach the blank line. The word
     still OPENS here -- what changed on 2026-09-16 is that the earlier stages stayed
     reachable from the step row once it has opened. See goStage. */
  state.stage=Math.min(2,writeRec(current().word).writeStage||0);
  state.misses=0;state.inked=0;state.accent=accentFor(current().word);
  renderWrite();speakStage(first?450:250)}
/* THE WORD, THEN THE GUIDANCE (owner, 2026-09-17: "Play word first, then guidance after
   a short pause", every time a stage opens). 'ended' is the honest beat; behind it sits
   a generous duration estimate for the browsers whose 'ended' never fires -- the same
   net the math app had to build for iOS Safari -- and whichever fires first wins, once.
   The screen token guards the whole chain: a fast stage change or an exit retires the
   old screen's pending guidance unsaid, so a child never hears instructions for a
   screen they have already left. */
function speakStage(delay){
  const tok=state.screenToken;
  setTimeout(()=>{
    if(tok!==state.screenToken)return;
    playWord();
    let said=false;
    const later=()=>{if(said||tok!==state.screenToken)return;said=true;
      setTimeout(()=>{if(tok===state.screenToken)guide(WRITE_STAGES[state.stage].key)},550)};
    const est=700+(current().word.length*280);
    /* Guarded: a stubbed or exotic Audio without events still reaches `later` through
       the estimate net, which is the whole reason the net exists. */
    if(audio&&typeof audio.addEventListener==='function')audio.addEventListener('ended',later,{once:true});
    setTimeout(later,est);
  },delay)}
function renderWrite(){bedStop();writeDestroy();window.onkeydown=null;
  /* The locked writing shell: see the body.wlock block in styles.css. */
  document.body.classList.add('wlock');
  const q=current(),st=state.stage,show=st<2,r=writeRec(q.word);
  /* How far back the step row may reach for this word: every stage it has unlocked,
     and not one past it. See goStage. */
  const reach=Math.min(2,r.writeStage||0);
  /* Which screen this is. Every way of ending a stage carries it, and ending one
     spends it -- see writeStageDone. */
  const tok=++state.screenToken;
  /* Seeing the word beside its picture is recognition evidence, and it is counted
     apart from spelling it: one exposure per screen the word is visible on. */
  if(show){r.recognise.exposures++;r.recognise.lastAt=Date.now();save()}
  scene('reef');
  app.innerHTML=buddyHTML()+headerBar('Write Words',`<span class="pill">${state.i+1} / ${state.queue.length}</span>`)+
    `<section class="wstage"><div class="card">${visual(q.word)}<div class="wsteps" role="group" aria-label="Step ${st+1} of 3">${WRITE_STAGES.map((x,n)=>`<button class="wstep wstep${n}${n===st?' on':n<st?' done':''}${n>reach?' is-off':''}"${n>reach?' disabled':''}${n===st?' aria-current="step"':''} aria-label="${x.step}"><i>${n+1}</i></button>`).join('')}</div>${show?`<div class="wref">${q.word}</div>`:''}<p class="prompt">${WRITE_STAGES[st].prompt}</p><div class="feedback"></div></div><div class="wpaper"><svg class="writesvg" aria-label="Writing line"></svg></div><div class="wcontrols"><button class="sound" aria-label="Replay it">🔊</button><button class="secondary undo">↶ Undo</button><button class="secondary wipe">✕ Clear</button><button class="primary wnext">Next →</button></div></section>`;
  wireBack(()=>{writeDestroy();chooseSets('write')});
  $('.sound').onclick=playWord;
  /* Undo and Clear move ink and nothing else. A stroke the engine already accepted
     stays counted: taking the line back is not a confession that it was wrong. */
  $('.undo').onclick=()=>{if(surface&&surface.undoStroke())state.inked=Math.max(0,state.inked-1);writeReady()};
  $('.wipe').onclick=()=>{if(surface)surface.clear();state.inked=0;writeReady()};
  $('.wnext').onclick=()=>writeStageDone(tok);
  /* The step row is the scaffolds' only door, and every button on it carries the
     token of the screen it was drawn on, exactly as Next does. */
  WRITE_STAGES.forEach((x,n)=>{const b=$('.wstep'+n);if(b)b.onclick=()=>goStage(tok,n)});
  buildSurface(tok);writeReady()}
/* THE SCAFFOLDS, AND WHY THE STEP ROW IS THE DOOR TO THEM.
   Owner decision, 2026-09-16, verbatim: "Keep writeStage as the highest achieved stage,
   but do not use it to permanently disable earlier stages. Completed words should reopen
   at WRITE by default, while TRACE and COPY remain available as optional scaffolds. Do
   not decrement mastery history when an earlier stage is revisited."

   The three dots a child already reads as "step 2 of 3" ARE the buttons. Nothing new is
   added to the screen, nothing is navigated to, and the row keeps its laid-out height --
   the 48px targets overflow it rather than pushing the paper down. So a child stuck on
   the blank line taps 1 and the dotted word is back, on the screen they were already on,
   in one tap: the mode still asks one question and the child still answers with one tap.

   THE ROW ONLY GOES BACK. n is refused above `reach`, so no tap can hand a child a
   screen this word has not unlocked -- and the refusal lives here, not only in the
   disabled attribute, because a disabled attribute is a hint and this is the rule.

   GOING BACK STILL WALKS FORWARD. Choosing TRACE runs on into COPY and then WRITE the
   ordinary way, because a scaffold exists to build up to writing the word, not to
   escape writing it.

   NOTHING IS TAKEN AWAY BY GOING BACK. This function moves state.stage and nothing else;
   writeStage is raised by writeStageDone only when it is behind, so re-earning an unlock
   is a no-op. Tracing `cat` for the fifth time cannot cost a child the COPY or WRITE it
   already opened. */
function goStage(tok,n){if(tok!==state.screenToken)return;
  const r=writeRec(current().word);
  if(n===state.stage||n<0||n>Math.min(2,r.writeStage||0))return;
  state.screenToken++;state.stage=n;state.misses=0;state.inked=0;renderWrite();speakStage(250)}
/* Nothing to move on from until there is ink on the line -- except on the tracing
   stage, where the dots do the asking and a child may leave when they like. */
function writeReady(){const b=$('.wnext');if(!b)return;const off=state.stage>0&&!state.inked;
  b.disabled=off;b.classList.toggle('is-off',off)}
function buildSurface(tok){const svg=$('.writesvg');
  if(!svg||typeof WritingStrokes==='undefined')return;
  const q=current();
  if(state.stage>0){
    /* No word is passed, so there is no geometry on this surface to give one away. */
    surface=WritingStrokes.create({svg,mode:'free',keepInk:true,palmRejection:true,
      onInk:()=>{state.inked++;writeReady()}});
    return}
  surface=WritingStrokes.create({svg,word:q.word,level:state.level,mode:'trace',
    keepInk:true,palmRejection:true,
    onProgress:step=>{state.misses=0;feedback(step.cue==='Start here'?'Start at the green dot.':step.cue,'')},
    onStroke:res=>{const r=writeRec(q.word);r.write.lastAt=Date.now();
      if(res.pass){state.misses=0;r.write.strokesAccepted++;grader().accepted++;graderSave();save();return}
      state.misses++;r.write.strokesRejected++;save();
      if(res.reason&&grader().rejected[state.level][res.reason]!=null){grader().rejected[state.level][res.reason]++;graderSave()}
      feedback(WRITE_NUDGE[res.reason]||'Have another go.','try');
      /* The repo's two thresholds, in the shape this mode can offer them: at two
         misses the app writes the stroke slowly rather than saying the same words
         again, and at three it gives that stroke so a child is never held on one. */
      if(state.misses===2)setTimeout(()=>{if(surface){surface.demo('slow');guide('demo')}},450);
      else if(state.misses>=3){state.misses=0;
        setTimeout(()=>{if(surface){surface.demo('slow');
          setTimeout(()=>{if(surface){surface.stopDemo();surface.giveStroke()}},1500)}},450)}},
    onWord:()=>setTimeout(()=>writeStageDone(tok),900)})}
/* Finishing a traced word schedules this on a timer, and the Next button calls it, so
   a child who taps Next inside that beat would be advanced twice and credited with a
   COPY they never did. Both ways in carry the token of the screen they were armed on,
   and ending a stage spends it: the second caller is refused, whichever it was. */
function writeStageDone(tok){if(tok!==state.screenToken)return;state.screenToken++;
  const q=current(),r=writeRec(q.word),st=state.stage;
  r.lastPracticedAt=Date.now();r.write.lastAt=Date.now();
  if(st===0)r.write.traced++;else if(st===1)r.write.copied++;else r.write.fromMemory++;
  /* writeStage is the highest stage this word has ever reached, and this `<` is the
     whole of that rule: an unlock is raised when it is behind and left alone when it is
     not. Finishing a revisited TRACE on a word already at WRITE therefore changes
     nothing about what the child has unlocked -- re-earning is a no-op, never a step
     back. The tallies above are a different thing and keep counting: traced, copied and
     fromMemory sit beside strokesAccepted/strokesRejected, which count every stroke of
     every attempt, and phase 2's routing reads them as practice, not as a badge. */
  if((r.writeStage||0)<Math.min(2,st+1))r.writeStage=Math.min(2,st+1);
  save();
  if(st>=2){/* the whole progression for this word, finished */
    feedback('You wrote it! ⭐','good');cheer();chime(true);celebrate();
    writeDestroy();state.i++;return setTimeout(nextWriteWord,900)}
  state.stage=st+1;state.misses=0;state.inked=0;renderWrite();speakStage(250)}
function writeDone(){if(state.after)return state.after();writeDestroy();bedStop();scene('reef');
  app.innerHTML=buddyHTML()+headerBar('Write Words')+`<section class="wstage"><div class="card"><div class="reveal">You wrote all five 🎉</div><p class="prompt">Five words, three ways each.</p>${graderLine()?`<p class="gline-row"><span class="gline">${graderLine()}</span><button class="greset" aria-label="Reset grader evidence for a fresh session">✕</button></p>`:''}<div class="actions"><button class="primary again">Another set</button><button class="secondary done">Done</button></div></div></section>`;
  wireBack(home);window.onkeydown=null;say('good','You wrote every one of them!');guide('round');
  $('.greset')&&($('.greset').onclick=resetGraderEvidence);
  $('.again').onclick=()=>chooseSets('write');$('.done').onclick=home}
/* ---- WEAK WORDS, ROUTED -----------------------------------------------------
   §5.3: the queue keeps its entry predicate, its priority() order and its cap of
   ten, and each queued word is now served through ONE representation, chosen by
   weakRoute() — Hear/See, one build, Write Words at the stage the word reached,
   or the keyboard. The other flows each own a whole sitting and end on screens
   of their own, so this sitting hands each word to the right flow for that word
   alone and takes itself back through state.after when that flow's word is done.
   The buddy is the word's own set's, the accent rotation is accentFor()'s, and a
   back-arrow out of a leg abandons the sitting, as it abandons any other. */
let weakSitting=null;
function startWeak(q){weakSitting={queue:shuffle(q),i:0};weakNext()}
function weakNext(){const s=weakSitting;if(!s)return;
  if(s.i>=s.queue.length){weakSitting=null;return home()}
  const q=s.queue[s.i],how=weakRoute(q.word),
    done=()=>{if(weakSitting!==s)return;s.i++;weakNext()};
  if(how==='see')return weakSee(q,done);
  /* startBlocks/startWrite take the chosen word itself and wrap it; handing them
     a one-word array here would nest it and deal tiles for an undefined word. */
  if(how==='build')return startBlocks(q.set-1,q,done);
  if(how==='write')return startWrite(q.set-1,q,done);
  start('practice',[q],'',done)}
/* The Hear/See representation is the card the blocks flow opens on — picture,
   word, audio, nothing to answer — and seeing the word beside its picture is
   recognition evidence (§5.2). The exposure is what moves the word on: without
   it, this card would be served again every sitting. writeRec() is also where a
   record older than the writing build gains the new tracks, so the first card a
   pre-upgrade weak word is served through is its migration. */
function weakSee(q,done){state={screen:'weak',mode:'weak',queue:[q],i:0,accent:'us',buddy:buddyFor(q.set-1)};
  state.accent=accentFor(q.word);const r=writeRec(q.word);
  r.recognise.exposures++;r.recognise.lastAt=Date.now();save();bedStop();scene('reef');
  app.innerHTML=buddyHTML()+headerBar('Weak Words',`<span class="pill">${weakSitting.i+1} / ${weakSitting.queue.length}</span>`)+`<section class="bstage"><div class="card">${visual(q.word)}<button class="sound" aria-label="Replay word">🔊</button><div class="reveal">${q.word.toUpperCase()}</div><p class="prompt">Look at it. Listen to it. Say it.</p><div class="actions"><button class="primary go">Next →</button></div></div></section>`;
  wireBack(home);window.onkeydown=null;$('.sound').onclick=playWord;
  $('.go').onclick=done;setTimeout(playWord,300)}
home();if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');
