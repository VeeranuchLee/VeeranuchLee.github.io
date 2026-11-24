/* TEMPORARY DIAGNOSTIC (2026-11-24, TTS cut-off on iPad). Staging only -- never merged.
   Logs every speechSynthesis request, cancel, utterance event, media play/pause and
   AudioContext state change into a small on-screen panel, so the owner can screenshot
   what happened on the real iPad. Loaded only when the URL carries ?speechlog. */
(function(){
  if(!/[?&]speechlog/.test(location.search))return;
  var KEEP=/[?&]speechlog=keep/.test(location.search);
  var T0=performance.now(), rows=[], box=null, MAX=40;
  function t(){return ((performance.now()-T0)/1000).toFixed(2);}
  function caller(){
    try{var s=(new Error()).stack||'';
      return s.split('\n').slice(2,5).map(function(l){return l.replace(/https?:\/\/[^\s)]*\//g,'').trim().slice(0,60);}).join(' < ');
    }catch(e){return '';}
  }
  function paint(){
    if(!box){
      if(!document.body)return;
      box=document.createElement('div');
      box.id='speech-log';
      box.style.cssText='position:fixed;left:4px;bottom:4px;z-index:2147483647;width:min(96vw,620px);max-height:46vh;overflow:auto;'+
        'background:rgba(0,0,0,.82);color:#cfe;font:11px/1.3 Menlo,monospace;padding:6px 8px;border-radius:8px;white-space:pre-wrap;word-break:break-word;';
      var hdr=document.createElement('div');
      hdr.style.cssText='display:flex;gap:8px;margin-bottom:4px';
      var c=document.createElement('button');c.textContent='clear';c.onclick=function(){rows=[];T0=performance.now();paint();};
      var h=document.createElement('button');h.textContent='hide';h.onclick=function(){box.style.display='none';};
      [c,h].forEach(function(b){b.style.cssText='font:12px system-ui;padding:4px 10px;border-radius:6px;border:0';hdr.appendChild(b);});
      box.appendChild(hdr);
      var body=document.createElement('div');body.id='speech-log-body';box.appendChild(body);
      document.body.appendChild(box);
    }
    document.getElementById('speech-log-body').textContent=rows.join('\n');
    box.scrollTop=box.scrollHeight;
  }
  function log(msg){rows.push(t()+' '+msg);if(rows.length>MAX)rows.shift();try{paint();}catch(e){}}
  window.__speechLog=function(){return rows.slice();};
  document.addEventListener('DOMContentLoaded',paint);
  log('probe on'+(KEEP?' (KEEP)':'')+(/fix=(\w+)/.test(location.search)?' FIX='+location.search.match(/fix=(\w+)/)[1].toUpperCase():'')+' · '+navigator.userAgent.replace(/.*(iPhone OS|CPU OS|Mac OS X) ([\d_]+).*/,'$1 $2'));

  var ss=window.speechSynthesis;
  if(ss){
    var n=0;
    var speak=ss.speak.bind(ss), cancel=ss.cancel.bind(ss), pause=ss.pause.bind(ss), resume=ss.resume.bind(ss);
    ss.speak=function(u){
      var id=++n, txt=String(u&&u.text||'').slice(0,40), bounds=0;
      log('SPEAK#'+id+' "'+txt+'" rate='+u.rate+' pitch='+u.pitch+' voice='+(u.voice?u.voice.name:'-')+' [spk='+ss.speaking+' pend='+ss.pending+']');
      u.addEventListener('start',function(){log('  start#'+id);});
      u.addEventListener('end',function(e){log('  end#'+id+' bnd='+bounds);});
      u.addEventListener('error',function(e){log('  ERROR#'+id+' '+(e.error||'?')+' bnd='+bounds);});
      u.addEventListener('boundary',function(e){bounds++;if(bounds<=3||bounds%5===0)log('  word#'+id+' '+bounds+' @'+e.charIndex);});
      u.addEventListener('pause',function(){log('  pause#'+id);});
      u.addEventListener('resume',function(){log('  resume#'+id);});
      if(KEEP)(window.__keepUtt=window.__keepUtt||[]).push(u);
      if(FIXSUSP&&window.__ctxs){
        var back=function(){setTimeout(function(){if(talking())return;window.__ctxs.forEach(function(c){if(c.state!=='running'&&c.state!=='closed'){c.__ours=1;c.resume().then(function(){c.__ours=0;},function(){c.__ours=0;});}});},50);};
        u.addEventListener('end',back);u.addEventListener('error',back);
        window.__ctxs.forEach(function(c){if(c.state==='running')c.suspend();});
      }
      return speak(u);
    };
    ss.cancel=function(){log('CANCEL [spk='+ss.speaking+' pend='+ss.pending+'] '+caller());return cancel();};
    ss.pause=function(){log('PAUSE '+caller());return pause();};
    ss.resume=function(){log('RESUME');return resume();};
    function voices(){try{var v=ss.getVoices()||[],en=v.filter(function(x){return /^en/i.test(x.lang);});
      var d=v.filter(function(x){return x.default;})[0];
      log('VOICES '+v.length+' (en '+en.length+') default='+(d?d.name+' '+d.lang:'-'));}catch(e){}}
    voices(); if(ss.addEventListener)ss.addEventListener('voiceschanged',voices);
    var last='';
    setInterval(function(){var s='spk='+ss.speaking+' pend='+ss.pending+' paused='+ss.paused;if(s!==last){last=s;log('  · '+s);}},100);
  }else log('no speechSynthesis');

  var MP=HTMLMediaElement.prototype, play=MP.play, mpause=MP.pause;
  /* fix=nomedia / fix=silent: no <audio> file ever plays. play() resolves and 'ended' fires
     shortly after, so the game's chains advance exactly as if the clip had finished. */
  var NOMEDIA=/[?&]fix=(nomedia|silent)/.test(location.search);
  if(NOMEDIA){MP.play=function(){var el=this;log('MEDIA play SKIPPED '+name(el));
      if(!el.loop)setTimeout(function(){try{el.dispatchEvent(new Event('ended'));}catch(e){}},60);
      return Promise.resolve();};}
  function name(el){return String(el.currentSrc||el.src||'').split('/').pop().slice(0,40);}
  if(!NOMEDIA)MP.play=function(){var el=this;log('MEDIA play '+name(el)+(el.loop?' (loop)':''));
    var p=play.apply(this,arguments);
    if(p&&p.catch)p.catch(function(e){log('MEDIA play REFUSED '+name(el)+' '+(e&&e.name));});
    if(!el.__lg){el.__lg=1;['ended','pause','error'].forEach(function(k){el.addEventListener(k,function(){log('MEDIA '+k+' '+name(el));});});}
    return p;};
  MP.pause=function(){if(!this.paused)log('MEDIA pause() '+name(this)+' '+caller());return mpause.apply(this,arguments);};

  var FIXWAKE=/[?&]fix=(wake|suspend|silent)/.test(location.search), FIXSUSP=/[?&]fix=(suspend|silent)/.test(location.search);
  var ctxs=window.__ctxs=[];
  function talking(){try{var q=window.speechSynthesis;return !!(q&&(q.speaking||q.pending));}catch(e){return false;}}
  ['AudioContext','webkitAudioContext'].forEach(function(k){
    var AC=window[k]; if(!AC||AC.prototype.__lgp)return; AC.prototype.__lgp=1;
    var res=AC.prototype.resume, sus=AC.prototype.suspend;
    AC.prototype.resume=function(){
      if(FIXWAKE&&!this.__ours&&(talking()||this.state==='interrupted')){log('AUDIOCTX resume BLOCKED ('+this.state+') '+caller());return Promise.resolve();}
      if(this.state!=='running')log('AUDIOCTX resume() from '+this.state+' '+caller());
      return res.apply(this,arguments);};
    AC.prototype.suspend=function(){log('AUDIOCTX suspend() '+caller());return sus.apply(this,arguments);};
  });
  ['AudioContext','webkitAudioContext'].forEach(function(k){
    var AC=window[k]; if(!AC)return;
    var W=function(){var c=new (Function.prototype.bind.apply(AC,[null].concat([].slice.call(arguments))))();
      log('AUDIOCTX new '+c.state); ctxs.push(c);
      c.addEventListener&&c.addEventListener('statechange',function(){log('AUDIOCTX '+c.state);});
      return c;};
    W.prototype=AC.prototype; window[k]=W;
  });
  document.addEventListener('visibilitychange',function(){log('VISIBILITY '+document.visibilityState);});
  window.addEventListener('pagehide',function(){log('PAGEHIDE');});
})();
