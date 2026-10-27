/* Professor Hoot's finite, board-derived coaching selectors. */
(function(root,factory){var api=factory(root.KingdomChess||(typeof require==="function"?require("./chess-engine.js"):null));if(typeof module==="object"&&module.exports)module.exports=api;root.ChessTutor=api;})(typeof globalThis!=="undefined"?globalThis:this,function(C){
  "use strict";
  var LINES={
    "turn-check":"Your king is in check. Make it safe first.",
    "turn-capture":"Look carefully. One of their pieces can be taken.",
    "turn-attacked":"One of your pieces is under attack. Can it find safety?",
    "turn-scan":"Your move! Is your king safe? Can you take something?",
    "select-piece":"The dots show every move this piece can make.",
    "select-danger":"An amber ring means the other side can take there.",
    "hint-capture":"Look for a piece you can take without losing yours.",
    "hint-safety":"Find your piece in danger. Can it move somewhere safe?",
    "hint-check":"Make your king safe. Move it, block the check, or take the checking piece.",
    "hint-quiet":"Bring out a piece, aim near the middle, or guard your team.",
    "reveal":"I have shown one useful move. You still choose it.",
    "child-check":"That move gives check. Their king must answer.",
    "child-capture":"You took a piece and changed the game.",
    "child-safe":"You moved an attacked piece to safety.",
    "child-develop":"You brought a new piece into the game.",
    "child-steady":"Your move is done. Now Hoot will think.",
    "hoot-check":"I gave check, so your king must become safe.",
    "hoot-capture":"I made a capture because the piece was available.",
    "hoot-defend":"I moved a piece away from danger.",
    "hoot-castle":"I castled to tuck my king behind its guards.",
    "hoot-promote":"My pawn reached the end and became a new piece.",
    "hoot-pawn":"I moved a pawn to help my team.",
    "hoot-knight":"I moved my knight to a new jumping spot.",
    "hoot-bishop":"I moved my bishop along its slanting path.",
    "hoot-rook":"I moved my rook along a straight path.",
    "hoot-queen":"I moved my queen to a new square.",
    "hoot-king":"I moved my king one careful step.",
    "game-over":"Good game. Every game teaches us."
  };
  function line(id){return{id:id,text:LINES[id]};}
  function enemy(c){return c==="w"?"b":"w";}
  function capture(s,m){return !!s.board[m.to]||m.ep;}
  function attackedOwn(s){var by=enemy(s.turn),out=[];s.board.forEach(function(p,i){if(p&&C.color(p)===s.turn&&C.type(p)!=="k"&&C.attacked(s,i,by))out.push(i);});return out;}
  function destinationDanger(s,m){var n=C.clone(s);C._apply(n,m);return C.attacked(n,m.to,n.turn);}
  function selectTurn(s){if(C.status(s).check)return line("turn-check");if(C.legalMoves(s).some(function(m){return capture(s,m);}))return line("turn-capture");if(attackedOwn(s).length)return line("turn-attacked");return line("turn-scan");}
  function moveScore(s,m){var p=s.board[m.from],type=C.type(p),toFile=m.to%8,toRank=Math.floor(m.to/8),fromRank=Math.floor(m.from/8),score=7-Math.abs(3.5-toFile)-Math.abs(3.5-toRank),after=C.clone(s);C._apply(after,m);if(destinationDanger(s,m))score-=12;if((type==="n"||type==="b")&&((s.turn==="w"&&fromRank===7)||(s.turn==="b"&&fromRank===0)))score+=8;if(type==="p")score+=2;if(type==="k"&&Math.abs(m.to-m.from)===2)score+=10;if(C.attacked(after,m.to,s.turn))score+=2;if(capture(s,m))score-=4;return score;}
  function bestMove(s,moves){return moves.slice().sort(function(a,b){return moveScore(s,b)-moveScore(s,a)||(a.from-b.from)||(a.to-b.to);})[0];}
  function teachable(s){var moves=C.legalMoves(s),best=null;if(!moves.length)return null;if(C.status(s).check)return{kind:"check",move:bestMove(s,moves)};for(var i=0;i<moves.length;i++){var m=moves[i],p=s.board[m.from],taken=s.board[m.to];if(capture(s,m)&&taken&&(C.VALUES[C.type(taken)]||0)>=(C.VALUES[C.type(p)]||0)&&!destinationDanger(s,m))return{kind:"capture",move:m};}
    var attacked=attackedOwn(s);for(i=0;i<moves.length;i++){m=moves[i];if(attacked.indexOf(m.from)>=0&&!destinationDanger(s,m)){best={kind:"safety",move:m};break;}}return best||{kind:"quiet",move:bestMove(s,moves)};
  }
  function afterMove(before,made){var piece=C.type(before.board[made.from]),after=C.clone(before);C._apply(after,made);if(C.status(after).check)return line("child-check");if(made.captured)return line("child-capture");if(C.attacked(before,made.from,enemy(before.turn))&&!C.attacked(after,made.to,after.turn))return line("child-safe");var r=Math.floor(made.from/8);if((piece==="n"||piece==="b")&&((before.turn==="w"&&r===7)||(before.turn==="b"&&r===0)))return line("child-develop");return line("child-steady");}
  function explainMove(before,made){var piece=C.type(before.board[made.from]),after=C.clone(before);C._apply(after,made);if(piece==="k"&&Math.abs(made.to-made.from)===2)return line("hoot-castle");if(made.promotion)return line("hoot-promote");if(C.status(after).check)return line("hoot-check");if(before.board[made.to]||made.ep)return line("hoot-capture");if(C.attacked(before,made.from,enemy(before.turn))&&!C.attacked(after,made.to,after.turn))return line("hoot-defend");return line("hoot-"+({p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"})[piece]);}
  return{LINES:LINES,line:line,selectTurn:selectTurn,teachable:teachable,afterMove:afterMove,explainMove:explainMove,destinationDanger:destinationDanger};
});
