(function(){
  'use strict';
  var data, rendered={clips:{}}, run=[], index=0, level=1, streak=0, stars=0, placed=[], misses=0, lessonStage='';
  var $=function(id){return document.getElementById(id);};
  var start=$('start'), game=$('game'), finish=$('finish'), choices=$('choices'), answerLine=$('answerLine');
  var audio=new Audio();
  var SPEAKER_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SPEAKER_OFF_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SPARKLE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2c.7 6.2 3.8 9.3 10 10-6.2.7-9.3 3.8-10 10-.7-6.2-3.8-9.3-10-10 6.2-.7 9.3-3.8 10-10z" fill="currentColor"/></svg>';
  var STAR_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.7l1-6.1L3.2 9.3l6.1-.9z" fill="currentColor"/></svg>';
  // VOICE ON BY DEFAULT (owner, 2026-10-06): each question is read aloud -- the instruction, then the
  // sentence -- unless hearing the sentence would reveal what is tested (those questions carry
  // speakStem:false in the data, so no sentence clip exists for them). The toggle is remembered on
  // this device only; a blocked storage simply means voice stays on.
  var voiceOn=true;
  try{voiceOn=localStorage.getItem('grammarVoice')!=='off';}catch(e){}
  var queue=[],queueRun=0;
  function playQueue(ids){
    queueRun++;var my=queueRun;queue=ids.filter(function(id){return rendered.clips&&rendered.clips[id];});
    try{audio.pause();}catch(e){}
    (function step(){
      if(my!==queueRun||!queue.length)return;
      var id=queue.shift();audio.src='./audio/grammar/'+rendered.clips[id].file;
      audio.onended=function(){setTimeout(step,250);};audio.onerror=function(){step();};
      audio.play().catch(function(){});
    })();
  }
  function speakQuestion(q,force){if((voiceOn||force)&&q)playQueue([q.id+'-prompt',q.id+'-stem']);}
  function setVoice(on){
    voiceOn=on;try{localStorage.setItem('grammarVoice',on?'on':'off');}catch(e){}
    var t=$('voiceToggle');if(t){t.setAttribute('aria-pressed',on?'true':'false');t.setAttribute('aria-label',on?'Voice on':'Voice off');t.innerHTML=on?SPEAKER_ICON:SPEAKER_OFF_ICON;}
    if(!on){queueRun++;try{audio.pause();}catch(e){}}
  }

  function sound(kind){
    var C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    var c=sound.c||(sound.c=new C()),now=c.currentTime;
    // Right: a small rising C-E-G cheer (owner 2026-10-07, "small cheer ... like on math app").
    (kind==='right'?[[523.25,0],[659.25,.09],[783.99,.18]]:[[210,0]]).forEach(function(n){
      var o=c.createOscillator(),g=c.createGain(),t=now+n[1],len=kind==='right'?.17:.2;
      o.type=kind==='right'?'triangle':'sine';o.frequency.setValueAtTime(n[0],t);
      if(kind!=='right')o.frequency.exponentialRampToValueAtTime(150,t+.16);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(kind==='right'?.1:.12,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+len);
      o.connect(g).connect(c.destination);o.start(t);o.stop(t+len+.02);
    });
  }
  if (typeof AudioWake !== "undefined") AudioWake.attach(function(){return sound.c},function(){sound.c=null});
  // The cheer on a right answer: a praise word, a little confetti, the chime and (voice on)
  // the same praise spoken. Each spoken line is a rendered clip keyed praise-NN in
  // audio/grammar/rendered.json; the word on screen and the voice always match.
  var PRAISE=['Great job!','Well done!','You did it!','Super!','Brilliant!',"That's right!"];
  var cheering=false;
  function cheer(done){
    cheering=true;
    var i=Math.floor(Math.random()*PRAISE.length),id='praise-0'+(i+1),still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pop=document.createElement('div');pop.className='cheer-pop';pop.textContent=PRAISE[i];pop.setAttribute('role','status');document.body.appendChild(pop);
    var layer=null;
    if(!still){
      layer=document.createElement('div');layer.className='cheer-confetti';
      var colours=['#ff73aa','#ffd54f','#7ad3ff','#9be27a','#c9a2ff'];
      for(var k=0;k<24;k++){var p=document.createElement('span');p.style.left=(10+Math.random()*80)+'%';p.style.background=colours[k%colours.length];p.style.animationDelay=(Math.random()*.25)+'s';p.style.transform='rotate('+Math.floor(Math.random()*360)+'deg)';layer.appendChild(p);}
      document.body.appendChild(layer);
    }
    var spoken=voiceOn&&rendered.clips&&rendered.clips[id];
    if(spoken)playQueue([id]);
    setTimeout(function(){pop.remove();if(layer)layer.remove();cheering=false;done();},spoken?1400:1000);
  }
  function shuffle(a){a=a.slice();for(var i=a.length-1;i;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function pickQuestion(){
    var used=new Set(run.map(function(q){return q.id;}));
    var wanted=['choose','fill','arrange','fix','word-job'][index%5];
    var pool=data.questions.filter(function(q){return q.level===level&&q.mechanic===wanted&&!used.has(q.id);});
    if(!pool.length)pool=data.questions.filter(function(q){return Math.abs(q.level-level)<=1&&!used.has(q.id);});
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function formatStem(text){return text.replace(/\[([^\]]+)\]/g,'<mark>$1</mark>');}
  function button(text,cls){var b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;return b;}
  function showQuestion(){
    var q=pickQuestion();run.push(q);placed=[];misses=0;lessonStage='';$('continue').textContent='Try the next one';
    $('progress').textContent=(index+1)+' of 10';$('stars').textContent=(stars>0?'★ '.repeat(Math.min(3,stars)):'')+'☆ '.repeat(Math.max(0,3-stars));
    $('scene').src='./assets/grammar/'+q.image+'.webp';$('scene').alt='Illustration for this sentence';
    $('prompt').textContent=q.prompt;$('stem').innerHTML=formatStem(q.stem||'');choices.innerHTML='';answerLine.innerHTML='';answerLine.hidden=q.mechanic!=='arrange';$('check').hidden=q.mechanic!=='arrange';
    speakQuestion(q,false);
    if(q.mechanic==='arrange'){
      shuffle(q.words).forEach(function(w){var b=button(w,'word');b.addEventListener('click',function(){placed.push(w);b.disabled=true;b.classList.add('selected');renderPlaced(q);});choices.appendChild(b);});
    }else{
      shuffle(q.choices).forEach(function(value){var b=button(value,'choice');b.addEventListener('click',function(){answer(q,value,b);});choices.appendChild(b);});
    }
  }
  function renderPlaced(q){
    answerLine.innerHTML='';placed.forEach(function(w,i){var b=button(w,'word selected');b.setAttribute('aria-label','Remove '+w);b.addEventListener('click',function(){placed.splice(i,1);Array.from(choices.children).forEach(function(c){if(c.textContent===w&&c.disabled){c.disabled=false;c.classList.remove('selected');}});renderPlaced(q);});answerLine.appendChild(b);});
  }
  function resetForRetry(q,btn){
    if(q.mechanic==='arrange'){
      placed=[];renderPlaced(q);
      Array.from(choices.children).forEach(function(c){c.disabled=false;c.classList.remove('selected');});
    }else if(btn){
      btn.disabled=true;btn.classList.add('wrong');
    }
  }
  function showLesson(title,text,face,clip){
    $('lessonTitle').textContent=title;$('lessonText').textContent=text;$('lessonFace').innerHTML=face;
    $('listen').hidden=!clip;$('listen').onclick=function(){if(clip){queueRun++;audio.src='./audio/grammar/'+clip.file;audio.currentTime=0;audio.play().catch(function(){});}};
    $('lesson').hidden=false;
  }
  function answer(q,value,btn){
    if(cheering)return;
    var expected=Array.isArray(q.answer)?q.answer.join(' '):q.answer,got=Array.isArray(value)?value.join(' '):value;
    var right=got===expected;sound(right?'right':'wrong');
    if(right){streak++;stars++;if(streak>=2&&level<5){level++;streak=0;}cheer(next);return;}
    streak=0;misses++;
    var clip=rendered.clips&&rendered.clips[q.id+'-explanation'];
    if(misses===1){
      // First miss: just let the child try again, no lesson yet.
      if(level>1)level--;
      $('continue').textContent='Try again';
      resetForRetry(q,btn);
      return;
    }
    if(misses===2){
      // Second miss: teach the rule, then let the child try again.
      lessonStage='teach';
      $('continue').textContent='Try again';
      showLesson('Let’s learn it',q.explanation,SPARKLE_ICON,clip);
      resetForRetry(q,btn);
      return;
    }
    // Third miss: reveal the answer and move on.
    lessonStage='reveal';
    $('continue').textContent='Next sentence';
    showLesson('Here is the answer',q.explanation+' The answer is: '+expected+'.',STAR_ICON,clip);
  }
  function next(){index++;if(index>=10){game.hidden=true;finish.hidden=false;$('finishCopy').textContent='You collected '+stars+' sentence stars.';return;}showQuestion();}
  $('check').addEventListener('click',function(){var q=run[run.length-1];if(placed.length)answer(q,placed);});
  $('continue').addEventListener('click',function(){$('lesson').hidden=true;if(lessonStage==='reveal')next();});
  function begin(){run=[];index=0;level=1;streak=0;stars=0;start.hidden=true;finish.hidden=true;game.hidden=false;showQuestion();}
  $('voiceToggle').addEventListener('click',function(){setVoice(!voiceOn);if(voiceOn)speakQuestion(run[run.length-1],true);});
  $('hearQuestion').addEventListener('click',function(){speakQuestion(run[run.length-1],true);});
  setVoice(voiceOn);
  $('play').addEventListener('click',begin);$('again').addEventListener('click',begin);
  Promise.all([fetch('./data/grammar-questions.json').then(function(r){return r.json();}),fetch('./audio/grammar/rendered.json').then(function(r){return r.json();})]).then(function(all){data=all[0];rendered=all[1];$('play').disabled=false;}).catch(function(){$('play').textContent='Please try again';$('play').disabled=true;});
  $('play').disabled=true;
  if('serviceWorker'in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('./service-worker.js').catch(function(){});});
}());
