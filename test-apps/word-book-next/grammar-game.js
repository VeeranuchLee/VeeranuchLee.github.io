(function(){
  'use strict';
  var data, rendered={clips:{}}, run=[], index=0, level=1, streak=0, stars=0, placed=[], misses=0, lessonStage='';
  var $=function(id){return document.getElementById(id);};
  var start=$('start'), game=$('game'), finish=$('finish'), choices=$('choices'), answerLine=$('answerLine');
  var audio=new Audio();
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
    var t=$('voiceToggle');if(t){t.setAttribute('aria-pressed',on?'true':'false');t.setAttribute('aria-label',on?'Voice on':'Voice off');t.textContent=on?'🔊':'🔇';}
    if(!on){queueRun++;try{audio.pause();}catch(e){}}
  }

  function sound(kind){
    var C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    var c=sound.c||(sound.c=new C()),o=c.createOscillator(),g=c.createGain(),now=c.currentTime;
    o.type='sine';o.frequency.setValueAtTime(kind==='right'?520:210,now);o.frequency.exponentialRampToValueAtTime(kind==='right'?780:150,now+.16);
    g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.12,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+.2);
    o.connect(g).connect(c.destination);o.start(now);o.stop(now+.22);
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
    $('lessonTitle').textContent=title;$('lessonText').textContent=text;$('lessonFace').textContent=face;
    $('listen').hidden=!clip;$('listen').onclick=function(){if(clip){queueRun++;audio.src='./audio/grammar/'+clip.file;audio.currentTime=0;audio.play().catch(function(){});}};
    $('lesson').hidden=false;
  }
  function answer(q,value,btn){
    var expected=Array.isArray(q.answer)?q.answer.join(' '):q.answer,got=Array.isArray(value)?value.join(' '):value;
    var right=got===expected;sound(right?'right':'wrong');
    if(right){streak++;stars++;if(streak>=2&&level<5){level++;streak=0;}next();return;}
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
      showLesson('Let’s learn it',q.explanation,'💡',clip);
      resetForRetry(q,btn);
      return;
    }
    // Third miss: reveal the answer and move on.
    lessonStage='reveal';
    $('continue').textContent='Next sentence';
    showLesson('Here is the answer',q.explanation+' The answer is: '+expected+'.','⭐',clip);
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
  if('serviceWorker'in navigator)window.addEventListener('load',function(){Promise.resolve() /* Test Hub staging: no service worker */.catch(function(){});});
}());
