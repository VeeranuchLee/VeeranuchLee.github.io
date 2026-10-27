(function(root,factory){root.LemonadeAudio=factory(root);})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  let manifest={},queue=[],current=null,token=0,muted=false,ready=null;
  function load(){
    if(!ready)ready=fetch('audio/manifest.json').then(r=>r.ok?r.json():{}).then(data=>{manifest=data;return data;}).catch(()=>({}));
    return ready;
  }
  function stop(){token++;queue=[];if(current){current.pause();current.removeAttribute('src');current=null;}}
  function setMuted(value){muted=Boolean(value);if(muted)stop();}
  async function drain(run){
    await load();
    while(run===token&&queue.length&&!muted){
      const id=queue.shift(),src=manifest[id];
      if(!src)continue;
      await new Promise(resolve=>{
        const audio=new Audio(src);current=audio;
        const done=()=>{if(current===audio)current=null;resolve();};
        audio.addEventListener('ended',done,{once:true});
        audio.addEventListener('error',done,{once:true});
        const started=audio.play();if(started&&started.catch)started.catch(done);
      });
    }
  }
  function compose(ids,{interrupt=true}={}){
    if(muted)return;
    if(interrupt)stop();
    queue.push(...ids.filter(Boolean));const run=token;void drain(run);
  }
  function play(id,options){compose([id],options);}
  load();
  return{play,compose,stop,setMuted,isMuted:()=>muted};
});
