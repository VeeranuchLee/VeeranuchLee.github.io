(function(){"use strict";
  var C=window.KingdomChess,AI=window.KingdomChessAI,K=window.CHESS_KINGDOMS,I=window.ChessIcons;
  var app=document.getElementById("app"),promotion=document.getElementById("promotion");
  var state=null,selected=null,legal=[],config={white:"unicorn",black:"space",mode:"computer",level:"clever",rotate:false};
  var busy=false,tutorialMode=false,tutorial=null,allowedTargets=[],worker=AI.createWorker("./js/chess-ai.js");
  var handbook=window.ChessHandbook.create(document.getElementById("handbook"),{kingdom:function(){return config.white;}});

  function esc(x){return String(x).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
  function setup(){
    app.className="screen setup";
    app.innerHTML='<h1><span aria-hidden="true">'+I.svg("crown")+'</span> Kingdom Chess <span aria-hidden="true">'+I.svg("crown")+'</span></h1><p class="subtitle">Choose two kingdoms, then begin.</p><div class="setup-grid"><section class="panel"><h2><span aria-hidden="true">'+I.svg("sun")+'</span> Dawn kingdom</h2><div class="kingdom-options" data-side="white"></div></section><section class="panel"><h2><span aria-hidden="true">'+I.svg("moon")+'</span> Dusk kingdom</h2><div class="kingdom-options" data-side="black"></div></section></div><section class="panel"><h2>How will you play?</h2><div class="mode-options"><button data-mode="two">Two players</button><button data-mode="computer">Play the computer</button></div><div class="level-options"><button data-level="sleepy">Sleepy</button><button data-level="clever">Clever</button><button data-level="wise">Wise</button></div></section><div class="setup-actions"><div class="tutorial-callout"><img src="art/runtime/guide/guide.webp" alt="Professor Hoot"><button class="soft" data-tutorial>Easy tutorial</button></div><button class="soft" data-guided>'+I.svg("learn")+' Play a game with Hoot</button><button class="soft" data-book>'+I.svg("book")+' Handbook</button><button class="primary" data-start>'+I.svg("pk")+' Play chess</button></div>';
    Object.keys(K).forEach(function(id){["white","black"].forEach(function(side){var b=document.createElement("button");b.className="kingdom";b.dataset.kingdom=id;b.innerHTML='<span class="picker-art"><img src="'+window.CHESS_PIECE_ART.picker(id)+'" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>'+I.svg(K[id].icon)+'</span></span><small>'+K[id].name+'</small>';b.onclick=function(){config[side]=id;paintSetup();};app.querySelector('[data-side="'+side+'"]').appendChild(b);});});
    app.querySelectorAll("[data-mode]").forEach(function(b){b.onclick=function(){config.mode=b.dataset.mode;paintSetup();};});
    app.querySelectorAll("[data-level]").forEach(function(b){b.onclick=function(){config.level=b.dataset.level;paintSetup();};});
    app.querySelector("[data-start]").onclick=start;
    app.querySelector("[data-tutorial]").onclick=startTutorial;
    app.querySelector("[data-guided]").onclick=startGuidedGame;
    app.querySelector("[data-book]").onclick=function(){handbook.open();};
    paintSetup();
  }
  function paintSetup(){app.querySelectorAll("[data-side]").forEach(function(box){box.querySelectorAll("button").forEach(function(b){b.classList.toggle("selected",config[box.dataset.side]===b.dataset.kingdom);});});app.querySelectorAll("[data-mode]").forEach(function(b){b.classList.toggle("selected",config.mode===b.dataset.mode);});app.querySelectorAll("[data-level]").forEach(function(b){b.classList.toggle("selected",config.level===b.dataset.level);});app.querySelector(".level-options").hidden=config.mode!=="computer";}
  function stopTutorial(){if(tutorial&&tutorial.pause)tutorial.pause();tutorialMode=false;tutorial=null;}
  function start(){stopTutorial();state=C.load();selected=null;legal=[];allowedTargets=[];render();}
  function leaveBoard(){stopTutorial();setup();}
  function boardColours(){var a=K[config.white],b=K[config.black];return{"--board-light":a.light,"--board-dark":b.accent};}
  function gameShell(){
    app.className="game";
    app.innerHTML='<header class="topbar"><button class="icon-button" data-home aria-label="Choose kingdoms">'+I.svg("home")+'</button><div class="turn-banner" id="turn"></div><button class="icon-button" data-sound aria-label="Toggle sound">'+I.svg("soundOn")+'</button></header><div class="game-layout"><section class="board-area"><div id="board" class="board" role="grid" aria-label="Chess board"></div></section><aside class="side"><div id="tutorial-panel" class="tutorial-panel" hidden></div><div class="tray" id="tray" aria-label="Captured pieces"></div><div class="moves"><ol id="moves"></ol></div><div class="controls"><button data-undo>'+I.svg("undo")+' Undo</button><button data-hint>'+I.svg("hint")+' Hint</button><button data-rotate>'+I.svg("turn")+' Turn</button><button data-new>'+I.svg("plus")+' New</button><button data-book>'+I.svg("book")+' Book</button><button data-tutorial>'+I.svg("learn")+' Learn</button></div></aside></div>';
    app.querySelector("[data-home]").onclick=leaveBoard;
    app.querySelector("[data-sound]").onclick=function(){this.innerHTML=I.svg(window.ChessSound.toggle()?"soundOff":"soundOn");};
    app.querySelector("[data-undo]").onclick=undo;
    app.querySelector("[data-hint]").onclick=hint;
    app.querySelector("[data-rotate]").onclick=function(){config.rotate=!config.rotate;draw();};
    app.querySelector("[data-new]").onclick=start;
    app.querySelector("[data-book]").onclick=function(){handbook.open();};
    app.querySelector("[data-tutorial]").onclick=startTutorial;
  }
  function render(){gameShell();draw();}
  function viewIndex(cell){return config.rotate?63-cell:cell;}
  function colourway(piece){return C.color(piece)==="w"?"dawn":"dusk";}
  function kingdom(piece){return C.color(piece)==="w"?config.white:config.black;}
  function capturedHtml(){var captures=state.history.filter(function(m){return m.captured;});if(!captures.length)return'<span class="tray-empty">Captured pieces</span>';return captures.map(function(m){var name=(C.color(m.captured)==="w"?"Dawn ":"Dusk ")+pieceName(m.captured);return '<span class="captured-piece '+colourway(m.captured)+'" role="img" aria-label="'+name+'" title="'+name+'">'+I.svg("p"+C.type(m.captured))+'</span>';}).join("");}
  function draw(){
    var board=document.getElementById("board");if(!board)return;
    var styles=boardColours();Object.keys(styles).forEach(function(k){board.style.setProperty(k,styles[k]);});
    board.style.setProperty("--board-rotation",config.rotate?"180deg":"0deg");
    board.innerHTML='<img class="board-art" src="'+window.CHESS_PIECE_ART.board(config.white)+'" alt="">';
    var boardArt=board.firstElementChild;boardArt.onload=function(){board.classList.add("art-ready");};boardArt.onerror=function(){boardArt.remove();board.classList.remove("art-ready");};if(boardArt.complete)boardArt.naturalWidth?board.classList.add("art-ready"):boardArt.onerror();
    var moves=C.legalMoves(state),st=C.status(state),king=st.check?state.board.indexOf(state.turn==="w"?"K":"k"):-1,last=state.history[state.history.length-1];
    for(var pos=0;pos<64;pos++){var i=viewIndex(pos),p=state.board[i],sq=document.createElement("button");sq.className="square "+(((Math.floor(i/8)+i)%2)?"dark":"light");sq.dataset.square=i;sq.setAttribute("role","gridcell");sq.setAttribute("aria-label",C.square(i)+(p?" "+pieceName(p):" empty"));if(selected===i)sq.classList.add("selected");if(last&&(last.from===i||last.to===i))sq.classList.add("last");if(king===i)sq.classList.add("check");var target=legal.find(function(m){return m.to===i;});if(target)sq.classList.add(state.board[i]||target.ep?"capture":"target");if(allowedTargets.indexOf(C.square(i))>=0)sq.classList.add("hint");if(p)sq.innerHTML='<span class="piece '+colourway(p)+'">'+window.CHESS_PIECE_ART.render(p,kingdom(p),colourway(p))+'</span>';if((config.rotate?rankOf(i)===8:rankOf(i)===1))sq.innerHTML+='<small class="coord file">'+C.square(i)[0]+'</small>';if((config.rotate?fileOf(i)===7:fileOf(i)===0))sq.innerHTML+='<small class="coord rank">'+C.square(i)[1]+'</small>';sq.onclick=onSquare;board.appendChild(sq);}
    board.querySelectorAll(".piece-image").forEach(function(img){img.onload=function(){window.CHESS_PIECE_ART.fit(img);};img.onerror=function(){window.CHESS_PIECE_ART.fail(img);};if(img.complete)img.naturalWidth?window.CHESS_PIECE_ART.fit(img):window.CHESS_PIECE_ART.fail(img);});
    var side=state.turn==="w"?"white":"black",kk=K[config[side]],turn=document.getElementById("turn");turn.style.setProperty("--banner",kk.light);turn.textContent=busy?"The computer is thinking...":kk.name+" — "+(st.check?"King in check!":"your turn");
    document.getElementById("tray").innerHTML=capturedHtml();document.getElementById("moves").innerHTML=state.history.map(function(m){return'<li>'+esc(m.san)+'</li>';}).join("");app.classList.toggle("thinking",busy);app.querySelector("[data-rotate]").hidden=config.mode!=="two";app.querySelector("[data-undo]").hidden=tutorialMode;if(st.over&&!tutorialMode)showResult(st);
  }
  function fileOf(i){return i&7;}function rankOf(i){return 8-Math.floor(i/8);}function pieceName(p){return({p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"})[C.type(p)];}
  function onSquare(){if(busy)return;var i=+this.dataset.square,p=state.board[i],name=C.square(i);if(tutorialMode&&tutorial.tryTap&&tutorial.tryTap(name))return;if(selected!=null){var choices=legal.filter(function(m){return m.to===i;});if(choices.length){if(choices[0].promotion)return choosePromotion(choices);return play(choices[0]);}}if(p&&C.color(p)===state.turn){selected=i;legal=C.legalMoves(state).filter(function(m){return m.from===i;});if(!tutorialMode)allowedTargets=[];}else{selected=null;legal=[];if(tutorialMode)tutorial.miss();}draw();}
  function choosePromotion(choices){promotion.innerHTML='<div class="dialog"><h2>Choose a new piece</h2><div class="promotion-options"></div></div>';var box=promotion.querySelector(".promotion-options");choices.forEach(function(m){var b=document.createElement("button");b.innerHTML=I.svg("p"+m.promotion);b.setAttribute("aria-label",{q:"Queen",r:"Rook",b:"Bishop",n:"Knight"}[m.promotion]);b.onclick=function(){promotion.hidden=true;play(m);};box.appendChild(b);});promotion.hidden=false;}
  function play(m){if(tutorialMode&&tutorial.canMove&&!tutorial.canMove(m,state)){selected=null;legal=[];tutorial.miss();draw();return;}var made=C.move(state,m);if(!made)return;selected=null;legal=[];allowedTargets=[];var st=C.status(state);window.ChessSound.play(made.captured?"capture":st.check?"check":"move");draw();if(tutorialMode){tutorial.tryMove(made);return;}if(!st.over&&config.mode==="computer"&&state.turn==="b")computerTurn();}
  function scriptedReply(move){var made=C.move(state,{from:move[0],to:move[1]});if(!made)return null;selected=null;legal=[];allowedTargets=[];var st=C.status(state);window.ChessSound.play(made.captured?"capture":st.check?"check":"move");draw();return made;}
  async function computerTurn(){busy=true;draw();var result=await AI.chooseAsync(state,config.level,{worker:worker,timeMs:300});busy=false;if(result&&result.move)play(result.move);else draw();}
  function undo(){if(busy||tutorialMode||!state.history.length)return;C.undo(state);if(config.mode==="computer"&&state.history.length&&state.turn==="b")C.undo(state);selected=null;legal=[];draw();}
  async function hint(){if(busy)return;if(tutorialMode){if(tutorial.requestHint)tutorial.requestHint();else tutorial.miss();return;}busy=true;draw();var r=await AI.chooseAsync(state,"clever",{worker:worker,timeMs:220,randomness:0});busy=false;if(r.move){selected=r.move.from;legal=C.legalMoves(state).filter(function(m){return m.from===selected;});allowedTargets=[C.square(r.move.to)];}draw();}
  function showResult(st){if(document.getElementById("result"))return;var winner=st.winner?(st.winner==="w"?K[config.white]:K[config.black]):null,title=winner?winner.name+" wins!":"A peaceful draw",why={checkmate:"Checkmate — the king is safely trapped.",stalemate:"Stalemate — there are no safe moves.",threefold:"The same position appeared three times.","fifty-move":"Fifty moves passed without a pawn move or capture.",insufficient:"There are not enough pieces left to checkmate."}[st.result];var modal=document.createElement("div");modal.id="result";modal.className="modal";modal.innerHTML='<div class="dialog"><div class="result-title">'+title+'</div><p>'+why+'</p><div class="result-actions"><button class="soft" data-close>See board</button><button class="primary" data-again>Play again</button></div></div>';document.body.appendChild(modal);modal.querySelector("[data-close]").onclick=function(){modal.remove();};modal.querySelector("[data-again]").onclick=function(){modal.remove();start();};window.ChessSound.play("win");}
  function startTutorial(){stopTutorial();tutorialMode=true;config.mode="two";gameShell();var panel=document.getElementById("tutorial-panel");tutorial=window.ChessTutorial.create(panel,{load:function(fen,targets,from){state=C.load(fen);selected=from==null?null:C.index(from);legal=selected==null?[]:C.legalMoves(state).filter(function(m){return m.from===selected;});allowedTargets=targets||[];draw();},show:function(target,from){allowedTargets=[target];if(from){selected=C.index(from);legal=C.legalMoves(state).filter(function(m){return m.from===selected;});}draw();},finish:function(){tutorialMode=false;tutorial=null;start();}});tutorial.start();}
  function startGuidedGame(){
    stopTutorial();tutorialMode=true;config.mode="two";gameShell();var panel=document.getElementById("tutorial-panel");
    tutorial=window.ChessGuidedGame.create(panel,{
      load:function(moves,savedConfig){if(savedConfig&&K[savedConfig.white]&&K[savedConfig.black]){config.white=savedConfig.white;config.black=savedConfig.black;}state=C.load();for(var i=0;i<moves.length;i++)if(!C.move(state,moves[i]))return false;if(state.turn!=="w"||C.status(state).over)return false;selected=null;legal=[];allowedTargets=[];draw();return true;},
      state:function(){return state;},
      config:function(){return{white:config.white,black:config.black};},
      targets:function(targets){allowedTargets=targets||[];draw();},
      reveal:function(from,to){selected=C.index(from);legal=C.legalMoves(state).filter(function(m){return m.from===selected;});allowedTargets=[to];draw();},
      reply:scriptedReply,
      leave:function(){tutorialMode=false;tutorial=null;setup();}
    });
    tutorial.start();
  }
  setup();
})();
