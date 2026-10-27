(function(){
"use strict";
var D=window.STARLIGHT_SLICE_ONE,page=Number(document.body.dataset.page||0),stage=document.querySelector(".stage"),artLayer=null,timers=[];
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
function clearTimers(){timers.forEach(clearTimeout);timers=[]}
function status(text){var s=document.querySelector(".slice-status");if(!s)return;s.textContent=text;s.classList.add("show");timers.push(setTimeout(function(){s.classList.remove("show")},5200))}
function speak(text,who,sourceEl){if(window.Starlight){window.Starlight.say(text,who||"narrator",sourceEl||null);}status(text)}
function labelSlug(text){return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function addMotion(data){
  if(!data.motion||!window.StarlightMotion)return null;
  if(data.motion.type==="window-glints"){var sky=el("div","window-glints");artLayer.appendChild(sky);window.StarlightMotion.glints(sky,data.motion.points);return null}
  if(data.motion.type!=="living-star-balance")return null;
  var m=data.motion,wrap=el("div","star-motion"),under=el("img","star-underplate"),img=el("img","star-frame"),arrows=el("div","balance-arrows");
  [wrap].forEach(function(n){n.style.left=m.crop.x+"%";n.style.top=m.crop.y+"%";n.style.width=m.crop.w+"%";n.style.height=m.crop.h+"%"});
  under.src=m.underPlate;under.alt="";img.alt="Animated cutaway model of a star";arrows.innerHTML='<i class="in n"></i><i class="in e"></i><i class="in s"></i><i class="in w"></i><i class="out n"></i><i class="out e"></i><i class="out s"></i><i class="out w"></i>';
  wrap.append(under,img,arrows);artLayer.appendChild(wrap);var cycle=window.StarlightMotion.paintedCycle(img,m.frames,m.ms);
  return {play:function(kind){
    cycle.pause(true);wrap.classList.remove("gravity","pressure","balanced","reduced");void wrap.offsetWidth;
    var cls=kind===0?"gravity":kind===1?"pressure":"balanced";
    function reset(){wrap.classList.remove(cls,"reduced");cycle.pause(false)}
    window.StarlightMotion.sequence([{apply:function(){wrap.classList.add(cls)},wait:kind===2?1200:1300},{apply:reset,wait:0}],function(){wrap.classList.add(cls,"reduced");var t=setTimeout(reset,1200);return function(){clearTimeout(t);reset()}});
  },reset:function(){window.StarlightMotion.cancel();wrap.classList.remove("gravity","pressure","balanced","reduced");cycle.pause(false)}};
}
function addTeachingMotion(data){
  if(!data.teachingMotion)return null;
  var m=data.teachingMotion,wrap=el("div","teaching-motion motion-"+m.type);wrap.setAttribute("aria-hidden","true");
  wrap.innerHTML=m.markup||'<div class="motion-model"></div><div class="motion-readout"></div>';
  artLayer.appendChild(wrap);
  function reset(){window.StarlightMotion.cancel();wrap.className="teaching-motion motion-"+m.type;wrap.style.setProperty("--choice","0");var r=wrap.querySelector(".motion-readout");if(r)r.textContent=m.rest||""}
  return {play:function(idx){
    reset();wrap.style.setProperty("--choice",String(idx));
    var steps=(m.steps||[]).map(function(s){return {wait:s.wait,apply:function(){wrap.classList.add(s.add);var r=wrap.querySelector(".motion-readout");if(r&&s.text)r.textContent=s.text}}});
    window.StarlightMotion.sequence(steps,function(){wrap.classList.add("reduced","done");var r=wrap.querySelector(".motion-readout");if(r)r.textContent=m.reduced||m.done||""});
  },reset:reset,el:wrap};
}
function icon(kind){
  var common='stroke="#123e6d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';
  var art={
    venus:'<circle cx="80" cy="76" r="45" fill="#f5c16f" '+common+'/><path d="M43 68q35-18 74 0M45 88q35 15 70-1" fill="none" stroke="#fff1b8" stroke-width="8"/>',
    mars:'<circle cx="80" cy="76" r="45" fill="#df6544" '+common+'/><circle cx="63" cy="61" r="10" fill="#a63f35"/><path d="M49 91q25-13 57 4" fill="none" stroke="#f59b69" stroke-width="9"/>',
    jupiter:'<circle cx="80" cy="76" r="47" fill="#e6b883" '+common+'/><path d="M40 57h80M35 76h90M41 96h78" stroke="#ad704f" stroke-width="9"/><ellipse cx="103" cy="78" rx="13" ry="7" fill="#b84d39"/>',
    star:'<path d="M80 20l12 32 34-8-19 29 26 22-35 2-6 34-21-27-30 18 10-33-33-13 33-13-10-33 30 18z" fill="#ffd84a" '+common+'/>',
    diameter:'<circle cx="80" cy="68" r="36" fill="#ffbd25" '+common+'/><path d="M28 128h104M28 128l13-9M28 128l13 9M132 128l-13-9M132 128l-13 9" fill="none" stroke="#1596c8" stroke-width="7"/>',
    temperature:'<path d="M67 29a18 18 0 0136 0v67a32 32 0 11-36 0z" fill="#fff8df" '+common+'/><circle cx="85" cy="118" r="20" fill="#ef5948"/><rect x="78" y="54" width="14" height="65" rx="7" fill="#ef5948"/>',
    light:'<circle cx="30" cy="80" r="20" fill="#ffbd25" '+common+'/><path d="M56 80h60" stroke="#71d6e9" stroke-width="6" stroke-dasharray="7 8"/><circle cx="130" cy="80" r="20" fill="#2998c8" '+common+'/>',
    distance:'<circle cx="35" cy="80" r="17" fill="#ffbd25" '+common+'/><circle cx="128" cy="80" r="6" fill="#fff" '+common+'/><path d="M59 80h51M64 70l-9 10 9 10M105 70l9 10-9 10" fill="none" stroke="#1596c8" stroke-width="6"/>',
    clock:'<circle cx="80" cy="80" r="48" fill="#fff8df" '+common+'/><path d="M80 48v34l24 15" fill="none" stroke="#1596c8" stroke-width="8"/>',
    core:'<circle cx="80" cy="80" r="53" fill="#ef6b17" '+common+'/><circle cx="80" cy="80" r="37" fill="#ff9818"/><circle cx="80" cy="80" r="20" fill="#fff4a3"/>',
    atoms:'<circle cx="80" cy="80" r="10" fill="#ffd84a" '+common+'/><ellipse cx="80" cy="80" rx="57" ry="23" fill="none" stroke="#1596c8" stroke-width="5"/><ellipse cx="80" cy="80" rx="57" ry="23" fill="none" stroke="#ef6b58" stroke-width="5" transform="rotate(60 80 80)"/>',
    gravity:'<ellipse cx="80" cy="80" rx="62" ry="35" fill="none" stroke="#71d6e9" stroke-width="5" stroke-dasharray="8 7"/><circle cx="80" cy="80" r="27" fill="#ffbd25" '+common+'/><circle cx="142" cy="80" r="9" fill="#2998c8" '+common+'/>',
    dwarf:'<circle cx="80" cy="80" r="25" fill="#e85c47" '+common+'/><path d="M80 34v-15M80 141v-15M34 80H19M141 80h-15" stroke="#ffb238" stroke-width="6"/>',
    giant:'<circle cx="80" cy="80" r="48" fill="#f09a38" '+common+'/><circle cx="80" cy="80" r="31" fill="#ffd05a"/>',
    supergiant:'<circle cx="80" cy="80" r="59" fill="#df6041" '+common+'/><circle cx="80" cy="80" r="40" fill="#f28b44"/>',
    blue:'<path d="M80 21l12 30 32-7-18 28 25 20-33 2-7 32-20-25-29 17 9-31-30-12 30-12-9-31 29 17z" fill="#bfe8ff" '+common+'/>',
    sun:'<circle cx="80" cy="80" r="45" fill="#ffd84a" '+common+'/><path d="M80 20v-13M80 153v-13M20 80H7M153 80h-13" stroke="#ff9d1d" stroke-width="7"/>',
    red:'<circle cx="80" cy="80" r="44" fill="#dc5948" '+common+'/>',
    orange:'<circle cx="80" cy="80" r="48" fill="#ee7e42" '+common+'/>'
  };
  return '<svg viewBox="0 0 160 160" aria-hidden="true">'+(art[kind]||art.star)+'</svg>';
}
function facts(data,shell){var box=el("section","fact-box");box.style.setProperty("--facts",data.facts.length);box.setAttribute("aria-label",data.facts.length+" facts about "+data.title);data.facts.forEach(function(f,i){var b=el("button","fact-card");b.type="button";b.innerHTML=icon(f.icon)+'<span><span class="fact-label">'+f.label+'</span><strong>'+f.value+'</strong>'+(f.qualifier?'<small>'+f.qualifier+'</small>':'')+'</span>';b.dataset.say=f.say;b.dataset.narrationId="p"+String(page).padStart(2,"0")+"-fact-"+String(i+1).padStart(2,"0");b.setAttribute("aria-pressed","false");b.addEventListener("click",function(){document.querySelectorAll(".fact-card").forEach(function(x){x.setAttribute("aria-pressed","false")});b.setAttribute("aria-pressed","true");timers.push(setTimeout(function(){b.setAttribute("aria-pressed","false")},2200))});box.appendChild(b)});shell.appendChild(box)}
/* Question flow (owner, 2026-10-21: "approve starlight plan, keep which light
   is a star"). Dot's lead-in and the narrator's prompt are one spoken ask, and
   the answers are the things in the painting: the matching feature pills are
   tap targets, the chosen object holds a green glow when it is right and
   pulses red for another try, and the child hears the ask once -- before their
   first verdict if it was never played -- then the page's own right or wrong
   line. A wrong tap never ends the try. */
function askItems(data,h){var items=[];if(data.leadIn)items.push({text:data.leadIn,who:"Dot"});items.push({text:data.prompt,who:"narrator",sourceEl:h});return items}
function askThen(data,ctx,items){if(!ctx.heard){ctx.heard=true;items=askItems(data,ctx.h).concat(items)}if(window.Starlight&&window.Starlight.sayQueue)window.Starlight.sayQueue(items);else items.forEach(function(it){speak(it.text,it.who,it.sourceEl)})}
function wrongFlash(data,motion){if(!data.wrongFlash||!motion||!motion.el)return;motion.el.classList.add(data.wrongFlash);timers.push(setTimeout(function(){motion.el.classList.remove(data.wrongFlash)},1100))}
function answer(data,b,idx,buttons,result,motion,ctx){if(b.disabled)return;var ok=data.correct==="any"||idx===data.correct,picks=(ctx.pills||[]).filter(function(p){return Number(p.dataset.a)===idx});if(!ok){if(motion&&data.motionAllChoices)motion.play(idx);b.classList.add("wrong");picks.forEach(function(p){p.classList.add("wrong")});wrongFlash(data,motion);var wrongText=data.wrong||"Look again.";result.textContent=wrongText;askThen(data,ctx,[{text:wrongText,who:"narrator"}]);timers.push(setTimeout(function(){b.classList.remove("wrong");picks.forEach(function(p){p.classList.remove("wrong")})},700));return}if(motion)motion.play(idx);buttons.forEach(function(x){x.disabled=true});b.classList.add("correct");picks.forEach(function(p){p.classList.add("correct")});if(window.Starlight&&window.Starlight.sfx)window.Starlight.sfx.good();ctx.reveals.forEach(function(p){p.querySelector(".feature-label").textContent=p.dataset.reveal;p.setAttribute("aria-label",p.dataset.reveal)});result.textContent=data.result;if(ctx.replay)ctx.replay.hidden=false;var items=[{text:data.result,who:"narrator"}];if(data.extra)items.push({text:data.extra,who:"Dot"});askThen(data,ctx,items)}
/* A line of visible text that reads itself when tapped. Owner, 2026-10-21:
   "pls check the voice. i want to hear the voice read if tap on the text."
   The story paragraph, the question and the cover title become their own read
   controls the way every fact card already was; the exact text is the map key,
   so what the child taps is what the child hears. starlight.js owns the clip,
   the cancel-on-new-tap and the .reading highlight while it plays. */
function sayLine(node,text,id){
  node.classList.add("say-line");
  node.dataset.say=text;
  node.dataset.narrationId=id;
  node.setAttribute("role","button");
  node.tabIndex=0;
  /* role="button" makes an aria-label replace the content in the a11y tree,
     so the name must carry the words themselves -- a generic "Listen to the
     question" would hide the question a VoiceOver child is being asked. */
  node.setAttribute("aria-label",text+" — tap to hear");
  return node;
}
function addPageOneObjects(shell){
  var book=el("button","bed-book");book.type="button";book.dataset.bookNav="toc";book.setAttribute("aria-label","Open the contents. Jump to any page");book.setAttribute("aria-haspopup","dialog");book.innerHTML='<img src="assets-runtime/standard/page-01-book-open.webp" alt="">';shell.appendChild(book);
  var lamp=el("button","bedside-lamp");lamp.type="button";lamp.setAttribute("aria-label","Turn the bedside lamp off");lamp.setAttribute("aria-pressed","true");var room=el("div","room-dark"),shade=el("div","lamp-dark"),glow=el("div","lamp-glow");[room,shade,glow].forEach(function(n){n.setAttribute("aria-hidden","true");shell.appendChild(n)});shell.appendChild(lamp);var on=true;
  lamp.addEventListener("click",function(){on=!on;shell.classList.toggle("lamp-off",!on);lamp.setAttribute("aria-pressed",String(on));lamp.setAttribute("aria-label","Turn the bedside lamp "+(on?"off":"on"));if(window.Starlight&&window.Starlight.sfx)window.Starlight.sfx.tap();status(on?"The lamp is on. A warm glow fills Ari's corner.":"The lamp is off. The room dims to moonlight and the window keeps its glow.")});
  return {reset:function(){on=true;shell.classList.remove("lamp-off");lamp.setAttribute("aria-pressed","true");lamp.setAttribute("aria-label","Turn the bedside lamp off")}};
}
function pageView(){var data=D.pages[page],shell=el("div","slice-shell"),artUi=el("div","art-ui"),plate=el("img","plate");if(!data)throw new Error("Missing page data "+page);artLayer=el("div","art-layer");plate.src="assets-runtime/standard/page-"+String(page).padStart(2,"0")+".webp";plate.alt="";stage.insertBefore(artLayer,stage.firstChild);stage.insertBefore(plate,artLayer);shell.appendChild(artUi);var motion=addMotion(data)||addTeachingMotion(data);var nn=String(page).padStart(2,"0");var story=el("article","story");story.innerHTML='<p class="eyebrow">'+data.eyebrow+'</p><h1>'+data.title+'</h1><h2>'+data.subtitle+'</h2>';var storyLine=sayLine(el("p","",data.story),data.story,"p"+nn+"-narrator-story");story.appendChild(storyLine);var actions=el("div","story-actions");actions.innerHTML='<button class="primary about" type="button" aria-label="'+data.aboutLabel+'" title="'+data.aboutLabel+'"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M12 10h18a6 6 0 0 1 6 6v22H18a6 6 0 0 0-6 6z"/><path d="M36 38H18a6 6 0 0 0-6 6V10h18a6 6 0 0 1 6 6z"/></svg></button><button class="listen" type="button" aria-label="Listen to the story" title="Listen to the story"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M10 19h5l9-8v26l-9-8h-5z"/><path d="M31 17a10 10 0 0 1 0 14M36 12a17 17 0 0 1 0 24"/></svg></button>';story.appendChild(actions);shell.appendChild(story);
  var panel=el("aside","info-panel");panel.innerHTML='<button class="info-close" type="button" aria-label="Close information">×</button><h3>'+data.aboutLabel+'</h3><p>'+data.about+'</p>';shell.appendChild(panel);story.querySelector(".about").addEventListener("click",function(){panel.classList.toggle("open")});panel.querySelector(".info-close").addEventListener("click",function(){panel.classList.remove("open")});
  var ctx={heard:false,h:null,pills:[],reveals:[]},h=null,buttons=[],result=null,pageObjects=page===1?addPageOneObjects(artUi):null;
  story.querySelector(".listen").addEventListener("click",function(){ctx.heard=true;var items=[{text:data.story,who:"narrator",sourceEl:storyLine}];if(!data.storyOnly)items=items.concat(askItems(data,h));if(window.Starlight&&window.Starlight.sayQueue)window.Starlight.sayQueue(items);else speak(data.story,"narrator",storyLine)});
  /* The hear-the-question chip is the Sound control's own drawn speaker
     (currentColor strokes, svg aria-hidden), not an emoji: an emoji speaker is
     a different little picture on every platform. 64px, like every picture
     button; the label still speaks the action. */
  if(!data.storyOnly){var q=el("section","question"),ask=el("button","ask");h=sayLine(el("h2","",data.prompt),data.prompt,"p"+nn+"-narrator-01");ask.type="button";ask.title="Listen to the question";ask.setAttribute("aria-label","Listen to the question");ask.innerHTML='<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M10 19h5l9-8v26l-9-8h-5z" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';ctx.h=h;var answers=el("div","answers");result=el("p","result","Choose one.");
  /* Right/wrong verdicts are the page's spoken answer to the child's tap, so
     they are announced, not just shown. */
  result.setAttribute("role","status");result.setAttribute("aria-live","polite");
  /* Replay after a correct answer: the ↻ chip beside the verdict emits
     Starlight's "replay", whose handler below re-asks the page (pills
     un-revealed, glows cleared, motion reset) without a reload. */
  var replay=el("button","replay","↻");replay.type="button";replay.title="Play again";replay.setAttribute("aria-label","Play again");replay.hidden=true;replay.addEventListener("click",function(){if(window.Starlight)window.Starlight.emit("replay")});ctx.replay=replay;
  var resultCell=el("div","result-cell");resultCell.append(result,replay);q.append(ask,h,answers,resultCell);data.choices.forEach(function(c,i){var b=el("button","answer",c);b.type="button";b.dataset.narrationId="p"+String(page).padStart(2,"0")+"-prompt";b.addEventListener("click",function(){answer(data,b,i,buttons,result,motion,ctx)});buttons.push(b);answers.appendChild(b)});ask.addEventListener("click",function(){ctx.heard=true;if(window.Starlight&&window.Starlight.sayQueue)window.Starlight.sayQueue(askItems(data,h));else speak(data.prompt,"narrator",h)});shell.appendChild(q)}
  (data.features||[]).forEach(function(f,i){var tag,line,boxes=D.pointerObjectBoxes&&D.pointerObjectBoxes[page];if(f.tipX!=null&&f.tipY!=null){f.objectBox=boxes&&boxes[i];line=document.createElementNS("http://www.w3.org/2000/svg","svg");line.setAttribute("class","feature-pointer");line.dataset.feature=String(i);if(f.objectBox)line.dataset.objectBox=f.objectBox.join(",");line.setAttribute("viewBox","0 0 100 75");line.innerHTML='<line x1="'+f.x+'" y1="'+(f.y*.75)+'" x2="'+f.tipX+'" y2="'+(f.tipY*.75)+'"/><circle cx="'+f.tipX+'" cy="'+(f.tipY*.75)+'" r=".42"/>';artUi.appendChild(line)}if(f.a==null){tag=el("button","feature");tag.classList.add("name-label");tag.type="button";var id="lbl-"+String(page).padStart(2,"0")+"-"+labelSlug(f.label);tag.dataset.narrationId=id;tag.dataset.say=f.label;tag.dataset.clip="narration/clips/"+id+".m4a";tag.dataset.clipReady="false";(function askReady(n){/* slice-one can build before starlight.js exports its API; wait for it */if(window.Starlight&&window.Starlight.clipReady)window.Starlight.clipReady(id,f.label).then(function(ready){tag.dataset.clipReady=String(ready)});else if(n<60)setTimeout(function(){askReady(n+1)},50)})(0);tag.setAttribute("aria-label",f.label+" — tap to hear");tag.addEventListener("click",function(){tag.classList.remove("tap-glow");void tag.offsetWidth;tag.classList.add("tap-glow");timers.push(setTimeout(function(){tag.classList.remove("tap-glow")},650));speak(f.label,"narrator",tag)})}else{tag=el("button","feature answer-target"+(f.tipX==null?" plain-answer":""));tag.type="button";tag.dataset.a=String(f.a);tag.setAttribute("aria-label","Choose "+f.label);tag.addEventListener("click",function(){answer(data,buttons[f.a],f.a,buttons,result,motion,ctx)});ctx.pills.push(tag)}tag.dataset.feature=String(i);tag.appendChild(el("span","feature-label",f.label));tag.style.setProperty("--feature-x",f.x+"%");tag.style.setProperty("--feature-y",f.y+"%");if(f.reveal){tag.dataset.plain=f.label;tag.dataset.reveal=f.reveal;ctx.reveals.push(tag)}artUi.appendChild(tag)});facts(data,shell);var sbar=el("div","slice-status");sbar.setAttribute("role","status");sbar.setAttribute("aria-live","polite");shell.appendChild(sbar);stage.appendChild(shell);
  /* The ask also speaks once by itself as the question opens: a browser that
     still blocks untouched audio simply stays silent (the chip, the story's
     Listen and the first answer tap each carry the ask for that child). The
     attempt counts as heard only when a clip truly starts (onStart), so a
     child who did hear it never hears the whole ask a second time on their
     first answer tap, and a blocked one still gets it carried there. */
  if(!data.storyOnly&&data.leadIn&&window.Starlight&&window.Starlight.sayQueue)timers.push(setTimeout(function(){if(!ctx.heard)window.Starlight.sayQueue(askItems(data,h).map(function(it){it.onStart=function(){ctx.heard=true};return it}))},700));
  if(window.Starlight)window.Starlight.onReplay(function(){clearTimers();ctx.heard=false;panel.classList.remove("open");if(motion&&motion.reset)motion.reset();if(pageObjects)pageObjects.reset();buttons.forEach(function(b){b.disabled=false;b.classList.remove("wrong","correct")});ctx.pills.forEach(function(p){p.classList.remove("wrong","correct")});ctx.reveals.forEach(function(p){p.querySelector(".feature-label").textContent=p.dataset.plain;p.setAttribute("aria-label","Choose "+p.dataset.plain)});if(result)result.textContent="Choose one.";if(ctx.replay)ctx.replay.hidden=true})}
function cover(){var plate=el("img","plate");plate.src="assets-runtime/standard/page-00-cover.webp";plate.alt="Ari and Dot following a ribbon of starlight";stage.appendChild(plate);var card=el("section","cover-title");card.innerHTML="";var title=sayLine(el("h1","","Follow the Starlight"),"Follow the Starlight","cover-narrator-01");title.dataset.say=D.cover.line;card.append(title,el("p","","Ari & Dot · Book 2"));stage.appendChild(card);var start=el("a","cover-start");start.href="page-01.html";start.setAttribute("aria-label",D.cover.prompt);stage.appendChild(start)}
function lifeCycleContract(){window.StarlightLifeCycle={open:function(root,stages,start){var box=root||document.querySelector(".life-cycle");if(!box)return;var i=start||0,current=box.querySelector(".current"),next=box.querySelector(".next");box.classList.add("open");function paint(node,n){node.textContent=stages[n].label;node.style.background=stages[n].colour}paint(current,i);return function(){var j=(i+1)%stages.length;paint(next,j);if(document.body.classList.contains("calm")){paint(current,j);i=j;return}box.classList.add("changing");setTimeout(function(){paint(current,j);box.classList.remove("changing");i=j},700)}}};}
function boot(){if(!stage)return;lifeCycleContract();if(page)pageView();else cover()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();

/* Label readiness: labels can be rebuilt after the first async lookup (layout passes
   replace them), so mark whatever .name-label elements are on the page now, for a
   few seconds after load, from the narration manifest via Starlight.clipReady. */
(function markLabelClips(){var n=0;function pass(){if(window.Starlight&&window.Starlight.clipReady){document.querySelectorAll('.name-label[data-clip-ready="false"]').forEach(function(t){window.Starlight.clipReady(t.dataset.narrationId,t.dataset.say).then(function(r){t.dataset.clipReady=String(r)})})}if(++n<40)setTimeout(pass,100)}pass()})();
