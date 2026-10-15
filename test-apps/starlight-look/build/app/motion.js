(function(){
"use strict";
var activeSequence=null;
function calm(){return !window.Starlight||window.Starlight.calm}
function frameCycle(img,frames,ms){
  var index=0,timer=0,manualPause=false,destroyed=false;
  function stop(){if(timer){clearTimeout(timer);timer=0}}
  function held(){return destroyed||manualPause||document.hidden||calm()}
  function show(n){index=n;img.src=frames[index]}
  function tick(){stop();if(held()){show(0);return}show((index+1)%frames.length);timer=setTimeout(tick,ms)}
  function sync(){stop();if(held())show(0);else timer=setTimeout(tick,ms)}
  function visibility(){sync()}
  document.addEventListener("visibilitychange",visibility);
  if(window.Starlight)window.Starlight.onCalm(sync);
  show(0);sync();
  return {pause:function(v){manualPause=v!==false;sync()},reset:function(){show(0);sync()},destroy:function(){destroyed=true;stop();document.removeEventListener("visibilitychange",visibility)}};
}
function sequence(steps,reduced){
  if(activeSequence)activeSequence.cancel();
  var cancelled=false,timer=0,cleanups=[];
  function cancel(){cancelled=true;clearTimeout(timer);cleanups.splice(0).forEach(function(fn){fn()});if(activeSequence===api)activeSequence=null}
  var api={cancel:cancel};activeSequence=api;
  if(calm()){
    if(reduced)cleanups.push(reduced()||function(){});
    return api;
  }
  var i=0;
  function next(){
    if(cancelled)return;
    if(i>=steps.length){activeSequence=null;return}
    var step=steps[i++],cleanup=step.apply&&step.apply();
    if(typeof cleanup==="function")cleanups.push(cleanup);
    timer=setTimeout(next,step.wait||0);
  }
  next();return api;
}
function glints(root,points){
  var nodes=points.map(function(p,i){var n=document.createElement("i");n.className="window-glint";n.style.left=p.x+"%";n.style.top=p.y+"%";n.style.setProperty("--twinkle-period",p.period+"s");n.style.setProperty("--twinkle-delay",(-i*.37)+"s");root.appendChild(n);return n});
  function sync(){root.classList.toggle("motion-paused",document.hidden||calm())}
  document.addEventListener("visibilitychange",sync);if(window.Starlight)window.Starlight.onCalm(sync);sync();
  return {destroy:function(){document.removeEventListener("visibilitychange",sync);nodes.forEach(function(n){n.remove()})}};
}
window.StarlightMotion={frameCycle:frameCycle,sequence:sequence,glints:glints,cancel:function(){if(activeSequence)activeSequence.cancel()}};
})();
