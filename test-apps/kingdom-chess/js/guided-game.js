(function(root,factory){
  var api=factory(root.KingdomChess||(typeof require==="function"?require("./chess-engine.js"):null),root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.ChessGuidedGame=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(C,root){"use strict";
  var KEY="kingdom-chess-guided-v1",VERSION=1;
  function exact(from,to){return function(s,m){return C.square(m.from)===from&&C.square(m.to)===to;};}
  function knightHome(s,m){var from=C.square(m.from),to=C.square(m.to);return(from==="g1"&&to==="f3")||(from==="b1"&&to==="c3");}
  function queenBishop(s,m){return C.square(m.from)==="c1"&&C.type(s.board[m.from])==="b"&&C.square(m.to)!=="c1";}
  var steps=[
    {goal:"Put a pawn in the middle.",why:"A middle pawn claims space for your army.",hint:"Move the king's pawn two squares.",accept:exact("e2","e4"),canonical:["e2","e4"],reply:["e7","e5"]},
    {goal:"Develop a knight toward the middle.",why:"Knights work best when they can reach the centre.",hint:"Either knight can jump toward the four middle squares.",accept:knightHome,canonical:["g1","f3"],reply:["b8","c6"]},
    {goal:"Bring out your other knight.",why:"Both knights can now help your middle pawns.",hint:"Move the knight that is still on its starting square.",accept:knightHome,canonical:["b1","c3"],reply:["g8","f6"]},
    {goal:"Challenge the middle with your other pawn.",why:"Two middle pawns give your pieces room to grow.",hint:"Move the queen's pawn two squares.",accept:exact("d2","d4"),canonical:["d2","d4"],reply:["e5","d4"]},
    {goal:"Develop the queen's bishop.",why:"A developed bishop watches long diagonal roads.",hint:"Move the bishop beside your queen off its starting square.",accept:queenBishop,canonical:["c1","e3"],reply:["d7","d6"]},
    {goal:"Aim the king's bishop at the king side.",why:"This bishop is ready to join a king-side attack.",hint:"Move the bishop beside your king to d3.",accept:exact("f1","d3"),canonical:["f1","d3"],reply:["f8","e7"]},
    {goal:"Castle to keep your king safe.",why:"Castling tucks your king away and brings out a rook.",hint:"Move your king two squares toward the rook.",accept:exact("e1","g1"),canonical:["e1","g1"],reply:["c6","b4"]},
    {goal:"Protect the pawn that the knight attacks.",why:"The rook now guards the pawn on c2.",hint:"Slide the queen-side rook behind the attacked pawn.",accept:exact("a1","c1"),canonical:["a1","c1"],reply:["b4","c2"]},
    {goal:"Take the knight with your rook.",why:"A safe recapture wins back the piece that took your pawn.",hint:"Your rook can capture the knight on c2.",accept:exact("c1","c2"),canonical:["c1","c2"],reply:["e8","g8"]},
    {goal:"Move your middle pawn forward.",why:"The pawn opens a clear diagonal for your bishop.",hint:"Advance the king's pawn one square.",accept:exact("e4","e5"),canonical:["e4","e5"],reply:["c8","g4"]},
    {goal:"Move your attacked knight to safety.",why:"The knight escapes and joins the attack instead of hanging.",hint:"Jump the attacked knight toward the king side.",accept:exact("f3","g5"),canonical:["f3","g5"],reply:["g4","c8"]},
    {goal:"Give check with your bishop.",why:"Check makes the king answer your threat now.",hint:"Capture the pawn beside the king with your bishop.",accept:exact("d3","h7"),canonical:["d3","h7"],reply:["g8","h8"]},
    {goal:"Bring your queen close to help.",why:"The queen and bishop are strongest when they work together.",hint:"Move the queen to h5.",accept:exact("d1","h5"),canonical:["d1","h5"],reply:["f6","e8"]},
    {goal:"Move the bishop and uncover check.",why:"Moving the bishop opens the queen's line to the king.",hint:"Move the checking bishop to g6.",accept:exact("h7","g6"),canonical:["h7","g6"],reply:["h8","g8"]},
    {goal:"Deliver checkmate with your queen.",why:"Checkmate means the king has no safe answer.",hint:"Move the queen beside the king, protected by the bishop.",accept:exact("h5","h7"),canonical:["h5","h7"],mate:true}
  ];
  function goalMoves(state,step){return C.legalMoves(state).filter(function(m){return step.accept(state,m);});}
  function spec(m){return{from:C.square(m.from),to:C.square(m.to),promotion:m.promotion||null};}
  function store(){return root.SafeStorage&&root.SafeStorage.local;}
  function Guided(host,callbacks){this.host=host;this.callbacks=callbacks;this.i=0;this.misses=0;this.moves=[];this.nextTimer=null;}
  Guided.prototype.read=function(){var area=store(),raw=area&&area.getItem(KEY);if(!raw)return null;try{var x=JSON.parse(raw);return x&&x.version===VERSION&&Array.isArray(x.moves)&&Number.isInteger(x.step)?x:null;}catch(e){return null;}};
  Guided.prototype.save=function(){var area=store();if(area)area.setItem(KEY,JSON.stringify({version:VERSION,step:this.i,misses:this.misses,moves:this.moves,config:this.callbacks.config()}));};
  Guided.prototype.clear=function(){var area=store();if(area)area.removeItem(KEY);};
  Guided.prototype.start=function(){var saved=this.read();if(saved&&saved.step>=0&&saved.step<steps.length&&this.callbacks.load(saved.moves,saved.config)){this.i=saved.step;this.misses=Math.max(0,Math.min(3,saved.misses||0));this.moves=saved.moves.slice();}else{this.clear();this.i=0;this.misses=0;this.moves=[];this.callbacks.load([],null);}this.show();if(this.misses>=2)this.help(false);};
  Guided.prototype.show=function(){var s=steps[this.i];this.host.innerHTML='<div class="lesson-card guided-card"><img class="guide-expression" src="art/runtime/guide/thinking.webp" alt="Professor Hoot is thinking"><div class="lesson-copy"><button class="close" aria-label="Leave guided game">'+root.ChessIcons.svg("close")+'</button><p class="eyebrow">Move '+(this.i+1)+' of '+steps.length+'</p><h2>'+s.goal+'</h2><p class="lesson-why" hidden></p><p class="lesson-hint" hidden></p></div></div>';this.host.hidden=false;this.host.querySelector(".close").onclick=this.leave.bind(this);this.callbacks.targets([]);};
  Guided.prototype.mood=function(name,label){var img=this.host.querySelector(".guide-expression");if(img){img.src="art/runtime/guide/"+name+".webp";img.alt="Professor Hoot "+label;}};
  Guided.prototype.candidates=function(){return goalMoves(this.callbacks.state(),steps[this.i]);};
  Guided.prototype.canMove=function(m,state){return steps[this.i].accept(state,m);};
  Guided.prototype.miss=function(){this.misses++;if(this.misses>=2)this.help(this.misses>=3);else this.callbacks.targets([]);this.save();};
  Guided.prototype.help=function(reveal){var s=steps[this.i],moves=this.candidates(),hint=this.host.querySelector(".lesson-hint");this.mood("happy","is ready to help");hint.hidden=false;hint.textContent=reveal?"Hoot will show the move now.":s.hint;this.callbacks.targets(moves.map(function(m){return C.square(m.to);}));if(reveal&&moves[0])this.callbacks.reveal(C.square(moves[0].from),C.square(moves[0].to));};
  Guided.prototype.requestHint=function(){this.help(false);};
  Guided.prototype.tryMove=function(made){var s=steps[this.i],self=this;this.moves.push(spec(made));this.misses=0;this.mood("cheering","is cheering for you");var why=this.host.querySelector(".lesson-why");why.hidden=false;why.textContent=s.why;this.host.querySelector(".lesson-hint").hidden=true;if(s.mate){this.clear();clearTimeout(this.nextTimer);this.nextTimer=setTimeout(function(){self.done();},700);return true;}var reply=this.callbacks.reply(s.reply);if(!reply)throw new Error("Guided reply became illegal at move "+(this.i+1));this.moves.push(spec(reply));this.i++;this.save();clearTimeout(this.nextTimer);this.nextTimer=setTimeout(function(){self.show();},850);return true;};
  Guided.prototype.done=function(){this.host.innerHTML='<div class="lesson-card"><img class="guide-expression" src="art/runtime/guide/cheering.webp" alt="Professor Hoot is cheering for you"><div class="lesson-copy"><h2>Checkmate!</h2><p>You played a whole game and trapped the king.</p><div class="lesson-actions"><button class="soft" data-menu>Back to kingdoms</button><button class="primary" data-again>Play it again</button></div></div></div>';this.host.querySelector("[data-menu]").onclick=this.leave.bind(this);this.host.querySelector("[data-again]").onclick=function(){self.clear();self.i=0;self.misses=0;self.moves=[];self.callbacks.load([],null);self.show();};};
  Guided.prototype.pause=function(){clearTimeout(this.nextTimer);this.save();};
  Guided.prototype.leave=function(){this.pause();this.host.hidden=true;this.callbacks.leave();};
  return{steps:steps,goalMoves:goalMoves,create:function(host,callbacks){return new Guided(host,callbacks);},storageKey:KEY};
});
