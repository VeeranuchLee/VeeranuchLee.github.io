/* Kingdom Chess — dependency-free standard chess rules. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.KingdomChess = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var FILES = "abcdefgh";
  var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var DIR = { n: -8, s: 8, e: 1, w: -1, ne: -7, nw: -9, se: 9, sw: 7 };
  var VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  function color(p) { return p && p === p.toUpperCase() ? "w" : p ? "b" : null; }
  function type(p) { return p ? p.toLowerCase() : null; }
  function other(c) { return c === "w" ? "b" : "w"; }
  function rank(i) { return 8 - Math.floor(i / 8); }
  function file(i) { return i & 7; }
  function square(i) { return FILES[file(i)] + rank(i); }
  function index(s) { return (8 - Number(s[1])) * 8 + FILES.indexOf(s[0]); }
  function sameLine(a, b, delta) {
    if (b < 0 || b > 63) return false;
    var df = Math.abs(file(a) - file(b));
    return Math.abs(delta) === 8 || (Math.abs(delta) === 1 && df === 1) || (Math.abs(delta) === 7 && df === 1) || (Math.abs(delta) === 9 && df === 1);
  }
  function effectiveEp(s) {
    if (s.ep == null) return null;
    var pawn=s.turn==="w"?"P":"p",base=s.ep+(s.turn==="w"?8:-8),us=s.turn;
    for(var j=-1;j<=1;j+=2){var from=base+j;if(from<0||from>63||Math.abs(file(from)-file(s.ep))!==1||s.board[from]!==pawn)continue;var n=clone(s);applyRaw(n,{from:from,to:s.ep,ep:true});if(!inCheck(n,us))return s.ep;}
    return null;
  }
  function positionKey(s) { var ep=effectiveEp(s);return boardFen(s) + " " + s.turn + " " + (s.castling || "-") + " " + (ep == null ? "-" : square(ep)); }
  function boardFen(s) {
    var rows = [];
    for (var r = 0; r < 8; r++) {
      var out = "", empty = 0;
      for (var f = 0; f < 8; f++) {
        var p = s.board[r * 8 + f];
        if (!p) empty++; else { if (empty) out += empty; empty = 0; out += p; }
      }
      rows.push(out + (empty || ""));
    }
    return rows.join("/");
  }
  function load(fen) {
    var parts = (fen || START).trim().split(/\s+/), board = [];
    parts[0].split("/").forEach(function (row) { Array.from(row).forEach(function (c) { if (/\d/.test(c)) for (var n = 0; n < +c; n++) board.push(null); else board.push(c); }); });
    if (board.length !== 64) throw new Error("Invalid FEN board");
    var s = { board: board, turn: parts[1] || "w", castling: parts[2] === "-" ? "" : (parts[2] || ""), ep: parts[3] && parts[3] !== "-" ? index(parts[3]) : null, halfmove: +(parts[4] || 0), fullmove: +(parts[5] || 1), history: [], repetition: {} };
    s.repetition[positionKey(s)] = 1;
    return s;
  }
  function fen(s) { return positionKey(s) + " " + s.halfmove + " " + s.fullmove; }
  function clone(s) { return { board: s.board.slice(), turn: s.turn, castling: s.castling, ep: s.ep, halfmove: s.halfmove, fullmove: s.fullmove, history: (s.history || []).slice(), repetition: Object.assign({}, s.repetition || {}) }; }
  function attacked(s, target, by) {
    var b = s.board, pawn = by === "w" ? "P" : "p", pawnFrom = by === "w" ? [target + 7, target + 9] : [target - 7, target - 9];
    for (var i = 0; i < pawnFrom.length; i++) if (sameLine(target, pawnFrom[i], pawnFrom[i] - target) && b[pawnFrom[i]] === pawn) return true;
    var jumps = [[-17,-1],[-15,1],[-10,-2],[-6,2],[6,-2],[10,2],[15,-1],[17,1]], knight = by === "w" ? "N" : "n";
    for (i = 0; i < jumps.length; i++) { var n = target + jumps[i][0]; if (n >= 0 && n < 64 && Math.abs(file(n)-file(target)) === Math.abs(jumps[i][1]) && b[n] === knight) return true; }
    var dirs = [-9,-8,-7,-1,1,7,8,9];
    for (i = 0; i < dirs.length; i++) {
      var d = dirs[i], q = target;
      while (sameLine(q, q + d, d)) { q += d; var p = b[q]; if (!p) continue; if (color(p) === by && (type(p) === "q" || (type(p) === "r" && (d === -8 || d === 8 || d === -1 || d === 1)) || (type(p) === "b" && Math.abs(d) !== 1 && Math.abs(d) !== 8))) return true; break; }
    }
    var king = by === "w" ? "K" : "k";
    return dirs.some(function (d) { return sameLine(target, target + d, d) && b[target + d] === king; });
  }
  function kingSquare(s, c) { return s.board.indexOf(c === "w" ? "K" : "k"); }
  function inCheck(s, c) { var k = kingSquare(s, c); return k >= 0 && attacked(s, k, other(c)); }
  function pushMove(out, from, to, extras) { out.push(Object.assign({ from: from, to: to }, extras || {})); }
  function pseudo(s) {
    var out = [], b = s.board, us = s.turn;
    for (var from = 0; from < 64; from++) {
      var p = b[from]; if (!p || color(p) !== us) continue;
      var t = type(p), f = file(from), step = us === "w" ? -8 : 8;
      if (t === "p") {
        var to = from + step, startRank = us === "w" ? 2 : 7, promoRank = us === "w" ? 8 : 1;
        if (to >= 0 && to < 64 && !b[to]) {
          if (rank(to) === promoRank) "qrbn".split("").forEach(function (x) { pushMove(out, from, to, { promotion:x }); }); else pushMove(out, from, to);
          var two = from + step * 2; if (rank(from) === startRank && !b[two]) pushMove(out, from, two, { double:true });
        }
        [-1,1].forEach(function (df) { var x = from + step + df; if (x < 0 || x > 63 || Math.abs(file(x)-f) !== 1) return; if ((b[x] && color(b[x]) !== us) || x === s.ep) { var extra = x === s.ep ? { ep:true } : {}; if (rank(x) === promoRank) "qrbn".split("").forEach(function (pr) { pushMove(out, from, x, Object.assign({}, extra, {promotion:pr})); }); else pushMove(out, from, x, extra); } });
      } else if (t === "n") {
        [[-17,-1],[-15,1],[-10,-2],[-6,2],[6,-2],[10,2],[15,-1],[17,1]].forEach(function (j) { var x=from+j[0]; if(x>=0&&x<64&&Math.abs(file(x)-f)===Math.abs(j[1])&&color(b[x])!==us) pushMove(out,from,x); });
      } else if (t === "b" || t === "r" || t === "q") {
        var ds = t === "b" ? [-9,-7,7,9] : t === "r" ? [-8,-1,1,8] : [-9,-8,-7,-1,1,7,8,9];
        ds.forEach(function (d) { var x=from; while(sameLine(x,x+d,d)){x+=d;if(!b[x])pushMove(out,from,x);else{if(color(b[x])!==us)pushMove(out,from,x);break;}} });
      } else if (t === "k") {
        [-9,-8,-7,-1,1,7,8,9].forEach(function(d){var x=from+d;if(sameLine(from,x,d)&&color(b[x])!==us)pushMove(out,from,x);});
        var home = us === "w" ? 60 : 4, rights = us === "w" ? ["K","Q"] : ["k","q"];
        if (from === home && !inCheck(s, us)) {
          if (s.castling.indexOf(rights[0]) >= 0 && b[home+3] && type(b[home+3]) === "r" && color(b[home+3])===us && !b[home+1] && !b[home+2] && !attacked(s,home+1,other(us)) && !attacked(s,home+2,other(us))) pushMove(out,from,home+2,{castle:"k"});
          if (s.castling.indexOf(rights[1]) >= 0 && b[home-4] && type(b[home-4]) === "r" && color(b[home-4])===us && !b[home-1] && !b[home-2] && !b[home-3] && !attacked(s,home-1,other(us)) && !attacked(s,home-2,other(us))) pushMove(out,from,home-2,{castle:"q"});
        }
      }
    }
    return out;
  }
  function applyRaw(s, m) {
    var p=s.board[m.from], us=color(p), captured=m.ep?s.board[m.to+(us==="w"?8:-8)]:s.board[m.to];
    s.board[m.to]=m.promotion?(us==="w"?m.promotion.toUpperCase():m.promotion):p;s.board[m.from]=null;
    if(m.ep)s.board[m.to+(us==="w"?8:-8)]=null;
    if(m.castle){var rf=m.castle==="k"?m.from+3:m.from-4,rt=m.castle==="k"?m.from+1:m.from-1;s.board[rt]=s.board[rf];s.board[rf]=null;}
    var remove=""; if(type(p)==="k")remove+=us==="w"?"KQ":"kq"; if(m.from===63||m.to===63)remove+="K";if(m.from===56||m.to===56)remove+="Q";if(m.from===7||m.to===7)remove+="k";if(m.from===0||m.to===0)remove+="q";
    Array.from(remove).forEach(function(x){s.castling=s.castling.replace(x,"");});
    s.ep=m.double?(m.from+m.to)/2:null;s.halfmove=(type(p)==="p"||captured)?0:s.halfmove+1;if(us==="b")s.fullmove++;s.turn=other(us);return captured;
  }
  function legalMoves(s) { var us=s.turn; return pseudo(s).filter(function(m){var n=clone(s);applyRaw(n,m);return !inCheck(n,us);}); }
  function san(s,m,moves){moves=moves||legalMoves(s);var p=s.board[m.from],t=type(p),capture=!!s.board[m.to]||m.ep,out="";if(m.castle)out=m.castle==="k"?"O-O":"O-O-O";else{if(t!=="p"){out=t.toUpperCase();var twins=moves.filter(function(x){return x.to===m.to&&x.from!==m.from&&type(s.board[x.from])===t;});if(twins.length){var sameF=twins.some(function(x){return file(x.from)===file(m.from);}),sameR=twins.some(function(x){return rank(x.from)===rank(m.from);});out+=!sameF?FILES[file(m.from)]:!sameR?rank(m.from):square(m.from);}}else if(capture)out+=FILES[file(m.from)];if(capture)out+="x";out+=square(m.to);if(m.promotion)out+="="+m.promotion.toUpperCase();}var n=clone(s);applyRaw(n,m);if(inCheck(n,n.turn))out+=legalMoves(n).length?"+":"#";return out;}
  function move(s, spec) {
    var moves=legalMoves(s), from=typeof spec.from==="string"?index(spec.from):spec.from,to=typeof spec.to==="string"?index(spec.to):spec.to,promotion=(spec.promotion||"q").toLowerCase();
    var m=moves.find(function(x){return x.from===from&&x.to===to&&(!x.promotion||x.promotion===promotion);});if(!m)return null;
    var before=clone(s), notation=san(s,m,moves),captured=applyRaw(s,m);m=Object.assign({},m,{piece:before.board[m.from],captured:captured,san:notation,before:before});s.history.push(m);var key=positionKey(s);s.repetition[key]=(s.repetition[key]||0)+1;return m;
  }
  function undo(s){var m=s.history[s.history.length-1];if(!m)return null;var restored=clone(m.before);Object.keys(s).forEach(function(k){delete s[k];});Object.assign(s,restored);return m;}
  function insufficient(s){var pieces=s.board.map(function(p,i){return p?{p:p,i:i}:null;}).filter(Boolean).filter(function(x){return type(x.p)!=="k";});if(!pieces.length)return true;if(pieces.some(function(x){return "pqr".indexOf(type(x.p))>=0;}))return false;if(pieces.length===1)return true;if(pieces.every(function(x){return type(x.p)==="b";})){var shades=pieces.map(function(x){return (file(x.i)+Math.floor(x.i/8))%2;});return shades.every(function(x){return x===shades[0];});}return false;}
  function status(s){var moves=legalMoves(s),check=inCheck(s,s.turn);if(!moves.length)return{over:true,result:check?"checkmate":"stalemate",winner:check?other(s.turn):null,check:check};if((s.repetition[positionKey(s)]||0)>=3)return{over:true,result:"threefold",winner:null,check:check};if(s.halfmove>=100)return{over:true,result:"fifty-move",winner:null,check:check};if(insufficient(s))return{over:true,result:"insufficient",winner:null,check:check};return{over:false,result:null,winner:null,check:check};}
  function perft(s,depth){if(depth===0)return 1;var total=0;legalMoves(s).forEach(function(m){var n=clone(s);applyRaw(n,m);total+=perft(n,depth-1);});return total;}
  return { START_FEN:START, VALUES:VALUE, load:load, fen:fen, clone:clone, square:square, index:index, color:color, type:type, attacked:attacked, inCheck:inCheck, legalMoves:legalMoves, move:move, undo:undo, san:san, status:status, insufficientMaterial:insufficient, positionKey:positionKey, perft:perft, _apply:applyRaw };
});
