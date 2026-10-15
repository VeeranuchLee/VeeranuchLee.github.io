(function(){
"use strict";
var D=window.STARLIGHT_SLICE_ONE,page=Number(document.body.dataset.page||0),stage=document.querySelector(".stage"),timers=[];
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
function clearTimers(){timers.forEach(clearTimeout);timers=[]}
function status(text){var s=document.querySelector(".slice-status");if(!s)return;s.textContent=text;s.classList.add("show");timers.push(setTimeout(function(){s.classList.remove("show")},5200))}
function speak(text,who){if(window.Starlight){window.Starlight.say(text,who||"narrator");}status(text)}
function addMotion(data){
  if(!data.motion||!window.StarlightMotion)return null;
  if(data.motion.type==="window-glints"){var sky=el("div","window-glints");stage.appendChild(sky);window.StarlightMotion.glints(sky,data.motion.points);return null}
  if(data.motion.type!=="living-star-balance")return null;
  var m=data.motion,wrap=el("div","star-motion"),under=el("img","star-underplate"),img=el("img","star-frame"),arrows=el("div","balance-arrows");
  [wrap].forEach(function(n){n.style.left=m.crop.x+"%";n.style.top=m.crop.y+"%";n.style.width=m.crop.w+"%";n.style.height=m.crop.h+"%"});
  under.src=m.underPlate;under.alt="";img.alt="Animated cutaway model of a star";arrows.innerHTML='<i class="in n"></i><i class="in e"></i><i class="in s"></i><i class="in w"></i><i class="out n"></i><i class="out e"></i><i class="out s"></i><i class="out w"></i>';
  wrap.append(under,img,arrows);stage.appendChild(wrap);var cycle=window.StarlightMotion.frameCycle(img,m.frames,m.ms);
  return {play:function(kind){
    cycle.pause(true);wrap.classList.remove("gravity","pressure","balanced","reduced");void wrap.offsetWidth;
    var cls=kind===0?"gravity":kind===1?"pressure":"balanced";
    function reset(){wrap.classList.remove(cls,"reduced");cycle.pause(false)}
    window.StarlightMotion.sequence([{apply:function(){wrap.classList.add(cls)},wait:kind===2?1200:1300},{apply:reset,wait:0}],function(){wrap.classList.add(cls,"reduced");var t=setTimeout(reset,1200);return function(){clearTimeout(t);reset()}});
  },reset:function(){window.StarlightMotion.cancel();wrap.classList.remove("gravity","pressure","balanced","reduced");cycle.pause(false)}};
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
function answer(data,b,idx,buttons,result,motion){if(b.disabled)return;if(motion)motion.play(idx);var ok=data.correct==="any"||idx===data.correct;if(!ok){b.classList.add("wrong");result.textContent="Look again.";speak("Look again.");timers.push(setTimeout(function(){b.classList.remove("wrong")},700));return}buttons.forEach(function(x){x.disabled=true});b.classList.add("correct");result.textContent=data.result;speak(data.result);if(data.extra)timers.push(setTimeout(function(){speak(data.extra,"Dot")},500));}
function pageView(){var data=D.pages[page],shell=el("div","slice-shell"),plate=el("img","plate");plate.src="assets-runtime/standard/page-"+String(page).padStart(2,"0")+".webp";plate.alt="";stage.insertBefore(plate,stage.firstChild);var motion=addMotion(data);var story=el("article","story");story.innerHTML='<p class="eyebrow">'+data.eyebrow+'</p><h1>'+data.title+'</h1><h2>'+data.subtitle+'</h2><p>'+data.story+'</p><div class="story-actions"><button class="primary about" type="button">'+data.aboutLabel+'</button><button class="listen" type="button">Listen</button></div>';shell.appendChild(story);
  var panel=el("aside","info-panel");panel.innerHTML='<button class="info-close" type="button" aria-label="Close information">×</button><h3>'+data.aboutLabel+'</h3><p>'+data.about+'</p>';shell.appendChild(panel);story.querySelector(".about").addEventListener("click",function(){panel.classList.toggle("open")});panel.querySelector(".info-close").addEventListener("click",function(){panel.classList.remove("open")});story.querySelector(".listen").addEventListener("click",function(){speak(data.story)});
  (data.features||[]).forEach(function(f){var tag=el("span","feature",f.label);tag.style.left=f.x+"%";tag.style.top=f.y+"%";shell.appendChild(tag)});
  var q=el("section","question"),h=el("h2","",data.prompt),answers=el("div","answers"),result=el("p","result","Choose one.");q.append(h,answers,result);var buttons=[];data.choices.forEach(function(c,i){var b=el("button","answer",c);b.type="button";b.dataset.narrationId="p"+String(page).padStart(2,"0")+"-prompt";b.addEventListener("click",function(){answer(data,b,i,buttons,result,motion)});buttons.push(b);answers.appendChild(b)});shell.appendChild(q);facts(data,shell);shell.appendChild(el("div","slice-status"));stage.appendChild(shell);if(window.Starlight)window.Starlight.onReplay(function(){clearTimers();panel.classList.remove("open");if(motion)motion.reset();buttons.forEach(function(b){b.disabled=false;b.classList.remove("wrong","correct")});result.textContent="Choose one."})}
function cover(){var plate=el("img","plate");plate.src="assets-runtime/standard/page-00-cover.webp";plate.alt="Ari and Dot following a ribbon of starlight";stage.appendChild(plate);var card=el("section","cover-title");card.innerHTML="<h1>Follow the Starlight</h1><p>Ari &amp; Dot · Book 2</p>";stage.appendChild(card);var start=el("a","cover-start");start.href="page-01.html";start.setAttribute("aria-label",D.cover.prompt);stage.appendChild(start)}
function lifeCycleContract(){window.StarlightLifeCycle={open:function(root,stages,start){var box=root||document.querySelector(".life-cycle");if(!box)return;var i=start||0,current=box.querySelector(".current"),next=box.querySelector(".next");box.classList.add("open");function paint(node,n){node.textContent=stages[n].label;node.style.background=stages[n].colour}paint(current,i);return function(){var j=(i+1)%stages.length;paint(next,j);if(document.body.classList.contains("calm")){paint(current,j);i=j;return}box.classList.add("changing");setTimeout(function(){paint(current,j);box.classList.remove("changing");i=j},700)}}};}
function boot(){if(!stage)return;lifeCycleContract();if(page)pageView();else cover()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
