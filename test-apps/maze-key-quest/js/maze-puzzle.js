/* Our Maze — pure authored-puzzle engine (Key Quest + Animal Escape). */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.MazePuzzle = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var DIRS = { up:[0,-1], right:[1,0], down:[0,1], left:[-1,0] };
  var ACTIONS = ["up","right","down","left"];
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function at(level, cell) { return level.map[cell[1]][cell[0]]; }
  function same(a,b) { return a[0] === b[0] && a[1] === b[1]; }
  function add(a,d) { return [a[0]+DIRS[d][0], a[1]+DIRS[d][1]]; }
  function has(list,c) { return list.some(function (x) { return same(x,c); }); }
  function replace(list,from,to) { return list.map(function(x){ return same(x,from) ? to : x; }); }
  function blocked(level, state, cell, animal) {
    var tile = at(level,cell);
    if (tile === "#") return true;
    if (tile === "D" && !switchOn(level,state)) return true;
    if (tile === "G" && !state.openGates.some(function(g){return same(g,cell);}) && state.keys < 1) return true;
    if (tile === "T" && animal !== "bear") return true;
    if (tile === "L" && animal !== "fox") return true;
    if (tile === "U" && animal !== "rabbit") return true;
    return false;
  }
  function switchOn(level,state) {
    return state.boulders.some(function(c){return at(level,c) === "S";}) || at(level,state.player) === "S";
  }
  function find(map,ch) {
    var out=[]; for(var y=0;y<map.length;y++) for(var x=0;x<map[y].length;x++) if(map[y][x]===ch) out.push([x,y]); return out;
  }
  function initial(level, opts) {
    opts=opts||{};
    var state={ mode:level.mode, player:find(level.map,"P")[0], boulders:find(level.map,"B"), keys:0,
      collected:[], openGates:[], predators:copy(level.predators||[]), turn:0, won:false, captured:false,
      checkpoint:null, animal:opts.animal||"bear" };
    state.checkpoint=state.player.slice(); return state;
  }
  function canonical(state) {
    function cs(a){return a.slice().sort(function(x,y){return x[1]-y[1]||x[0]-y[0];});}
    return JSON.stringify({p:state.player,b:cs(state.boulders),k:state.keys,c:cs(state.collected),g:cs(state.openGates),
      r:state.predators.map(function(p){return [p.x,p.y,p.phase||0,p.mode];}),t:state.turn%12,a:state.animal,w:state.won});
  }
  function lineVisible(level,a,b) {
    if(a[0]!==b[0]&&a[1]!==b[1]) return false;
    var dx=Math.sign(b[0]-a[0]),dy=Math.sign(b[1]-a[1]),c=[a[0]+dx,a[1]+dy];
    while(!same(c,b)){ if(at(level,c)==="#")return false; c=[c[0]+dx,c[1]+dy]; }
    return true;
  }
  var PROFILES={
    bear:{notice:{wolf:2,lynx:2,owl:1,badger:0},hide:"C"},
    fox:{notice:{wolf:4,lynx:3,owl:2,badger:3},hide:"F"},
    rabbit:{notice:{wolf:6,lynx:6,owl:7,badger:4},hide:"H"}
  };
  function passable(level,state,c,animal,predators) {
    if(c[1]<0||c[1]>=level.map.length||c[0]<0||c[0]>=level.map[0].length) return false;
    return !blocked(level,state,c,animal) && !has(state.boulders,c) && !(predators||[]).some(function(p){return p.x===c[0]&&p.y===c[1];});
  }
  function toward(level,state,from,target,predators) {
    var best=from,bestD=Math.abs(from[0]-target[0])+Math.abs(from[1]-target[1]);
    ACTIONS.forEach(function(d){var c=add(from,d);if(passable(level,state,c,state.animal,predators)){var n=Math.abs(c[0]-target[0])+Math.abs(c[1]-target[1]);if(n<bestD){best=c;bestD=n;}}});
    return best;
  }
  function predatorTurn(level,state) {
    var moved=[];
    state.predators.forEach(function(p){
      var from=[p.x,p.y],to=from,profile=PROFILES[state.animal],hidden=at(level,state.player)===profile.hide;
      if(p.mode==="patrol") { var route=p.route||[from]; p.phase=((p.phase||0)+1)%route.length; to=route[p.phase]; }
      else if(p.mode==="chase") { var range=profile.notice[p.kind]||0,dist=Math.abs(p.x-state.player[0])+Math.abs(p.y-state.player[1]); if(!hidden&&dist<=range&&lineVisible(level,from,state.player))to=toward(level,state,from,state.player,moved); }
      else if(p.mode==="ambush") { var target=(p.ambush&&p.ambush[state.turn%p.ambush.length])||from; to=toward(level,state,from,target,moved); }
      if(passable(level,state,to,state.animal,moved)||same(to,state.player)){p.x=to[0];p.y=to[1];}
      moved.push(p);
    });
    state.turn++;
    if(state.predators.some(function(p){return same([p.x,p.y],state.player);})){
      state.captured=true; state.player=state.checkpoint.slice();
    }
  }
  function step(level, prior, action) {
    if(!DIRS[action] && !(level.mode==="animal"&&action==="wait")) return {state:prior,valid:false,events:["invalid"]};
    var state=copy(prior),events=[]; state.captured=false;
    if(state.won) return {state:prior,valid:false,events:["finished"]};
    if(action!=="wait") {
      var next=add(state.player,action);
      if(next[0]<0||next[1]<0||next[1]>=level.map.length||next[0]>=level.map[0].length) return {state:prior,valid:false,events:["blocked"]};
      if(level.mode==="key" && has(state.boulders,next)) {
        var beyond=add(next,action);
        if(beyond[0]<0||beyond[1]<0||beyond[1]>=level.map.length||beyond[0]>=level.map[0].length||blocked(level,state,beyond)||has(state.boulders,beyond)) return {state:prior,valid:false,events:["blocked"]};
        state.boulders=replace(state.boulders,next,beyond); events.push("push");
      } else if(blocked(level,state,next,state.animal)||has(state.boulders,next)) return {state:prior,valid:false,events:["blocked"]};
      if(at(level,next)==="G"&&!state.openGates.some(function(g){return same(g,next);})) {state.keys--;state.openGates.push(next);events.push("gate");}
      state.player=next;
      if(at(level,next)==="k"&&!has(state.collected,next)){state.collected.push(next);state.keys++;events.push("key");}
      if(at(level,next)==="Q"){state.checkpoint=next.slice();events.push("checkpoint");}
    } else events.push("wait");
    if(level.mode==="animal") predatorTurn(level,state);
    state.won=at(level,state.player)==="E"; if(state.won)events.push("win");
    return {state:state,valid:true,events:events};
  }
  function history(level,opts){return {level:level,states:[initial(level,opts)]};}
  function act(game,action){var out=step(game.level,game.states[game.states.length-1],action);if(out.valid)game.states.push(out.state);return out;}
  function undo(game){if(game.states.length>1)game.states.pop();return game.states[game.states.length-1];}
  function solveFrom(level,start,opts){
    opts=opts||{};start=copy(start);var q=[{s:start,path:[]}],seen=new Set([canonical(start)]),actions=ACTIONS.concat(level.mode==="animal"?["wait"]:[]),cap=opts.cap||250000;
    for(var h=0;h<q.length&&seen.size<cap;h++){var cur=q[h];if(cur.s.won)return {solved:true,length:cur.path.length,path:cur.path,visited:seen.size};
      for(var i=0;i<actions.length;i++){var o=step(level,cur.s,actions[i]);if(!o.valid)continue;var k=canonical(o.state);if(!seen.has(k)){seen.add(k);q.push({s:o.state,path:cur.path.concat(actions[i])});}}
    } return {solved:false,length:-1,path:[],visited:seen.size};
  }
  function solve(level,opts){opts=opts||{};return solveFrom(level,initial(level,opts),opts);}
  return {ACTIONS:ACTIONS,PROFILES:PROFILES,initial:initial,step:step,history:history,act:act,undo:undo,solve:solve,solveFrom:solveFrom,canonical:canonical,switchOn:switchOn};
});
