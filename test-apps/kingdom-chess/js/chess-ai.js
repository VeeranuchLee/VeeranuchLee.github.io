/* Kingdom Chess — intentionally gentle, time-bounded computer players. */
(function (root, factory) {
  if (typeof importScripts === "function" && !root.KingdomChess) importScripts("chess-engine.js");
  var api = factory(root.KingdomChess || (typeof require === "function" ? require("./chess-engine.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KingdomChessAI = api;
  if (typeof root.postMessage === "function" && typeof document === "undefined") root.onmessage = function (e) {
    var d=e.data||{}; if(d.type!=="choose")return;
    var result=api.choose(root.KingdomChess.load(d.fen),d.level,{timeMs:d.timeMs,randomness:d.randomness});
    root.postMessage({id:d.id,move:result.move,score:result.score,depth:result.depth});
  };
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";
  var centres=[27,28,35,36], near=[18,19,20,21,26,29,34,37,42,43,44,45];
  function copyMove(m){return{from:m.from,to:m.to,promotion:m.promotion||null,castle:m.castle||null,ep:!!m.ep};}
  function ordered(s,moves){return moves.slice().sort(function(a,b){var ac=s.board[a.to]?C.VALUES[C.type(s.board[a.to])]:a.ep?100:0,bc=s.board[b.to]?C.VALUES[C.type(s.board[b.to])]:b.ep?100:0;return bc-ac+(b.promotion?800:0)-(a.promotion?800:0);});}
  function evaluate(s,pov){var score=0;s.board.forEach(function(p,i){if(!p)return;var v=C.VALUES[C.type(p)]||0;if(centres.indexOf(i)>=0)v+=24;else if(near.indexOf(i)>=0)v+=8;score+=(C.color(p)===pov?1:-1)*v;});return score;}
  function search(s,depth,alpha,beta,pov,deadline,nodes){nodes.n++;if(Date.now()>=deadline){nodes.stop=true;return evaluate(s,pov);}var st=C.status(s);if(st.over){if(st.result==="checkmate")return st.winner===pov?100000-depth:-100000+depth;return 0;}if(depth===0)return evaluate(s,pov);var maximize=s.turn===pov,best=maximize?-Infinity:Infinity;var moves=ordered(s,C.legalMoves(s));for(var i=0;i<moves.length;i++){var n=C.clone(s);C._apply(n,moves[i]);var val=search(n,depth-1,alpha,beta,pov,deadline,nodes);if(nodes.stop)return val;if(maximize){best=Math.max(best,val);alpha=Math.max(alpha,best);}else{best=Math.min(best,val);beta=Math.min(beta,best);}if(beta<=alpha)break;}return best;}
  function pickScored(s,depth,deadline,randomness){var moves=ordered(s,C.legalMoves(s)),pov=s.turn,nodes={n:0,stop:false},scored=[];for(var i=0;i<moves.length;i++){var n=C.clone(s);C._apply(n,moves[i]);var val=search(n,depth-1,-Infinity,Infinity,pov,deadline,nodes);if(nodes.stop&&scored.length)break;scored.push({move:moves[i],score:val});}scored.sort(function(a,b){return b.score-a.score;});if(!scored.length)return{move:null,score:0,nodes:nodes.n,complete:false};var window=Math.max(1,randomness||0),choices=scored.filter(function(x){return x.score>=scored[0].score-window;}),chosen=choices[Math.floor(Math.random()*choices.length)];return{move:copyMove(chosen.move),score:chosen.score,nodes:nodes.n,complete:!nodes.stop};}
  function sleepy(s){var all=C.legalMoves(s);if(!all.length)return{move:null,score:0,depth:0};var captures=all.filter(function(m){return !!s.board[m.to]||m.ep;});var pool=captures.length&&Math.random()<.5?captures:all;return{move:copyMove(pool[Math.floor(Math.random()*pool.length)]),score:0,depth:0};}
  function choose(s,level,opts){opts=opts||{};if(level==="sleepy")return sleepy(s);var ms=opts.timeMs||300,deadline=Date.now()+ms;if(level==="clever"){var d=Math.random()<.5?1:2,r=pickScored(s,d,deadline,opts.randomness==null?18:opts.randomness);r.depth=d;return r;}var best=pickScored(s,3,deadline,opts.randomness==null?10:opts.randomness);best.depth=3;if(best.complete&&Date.now()<deadline-20){var deeper=pickScored(s,4,deadline,opts.randomness==null?10:opts.randomness);if(deeper.complete){best=deeper;best.depth=4;}}return best;}
  function createWorker(url){if(typeof Worker==="undefined")return null;try{return new Worker(url||"./js/chess-ai.js");}catch(e){return null;}}
  function chooseAsync(state,level,opts){opts=opts||{};var worker=opts.worker;if(!worker)return Promise.resolve(choose(state,level,opts));return new Promise(function(resolve){var id=Math.random().toString(36).slice(2),timer=setTimeout(function(){worker.removeEventListener("message",on);resolve(choose(state,level,opts));},(opts.timeMs||300)+250);function on(e){if(!e.data||e.data.id!==id)return;clearTimeout(timer);worker.removeEventListener("message",on);resolve(e.data);}worker.addEventListener("message",on);worker.postMessage({type:"choose",id:id,fen:C.fen(state),level:level,timeMs:opts.timeMs||300,randomness:opts.randomness});});}
  return {choose:choose,chooseAsync:chooseAsync,createWorker:createWorker,evaluate:evaluate};
});
