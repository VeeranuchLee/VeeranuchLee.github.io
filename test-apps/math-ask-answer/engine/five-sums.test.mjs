import test from 'node:test'; import assert from 'node:assert/strict';
import {seeded,makeBag,tileMax,draw,emptyBoard,validateMove,applyMove,formedLines,arithmetic,hintFor,findMove,isDeadBoard} from './five-sums.js';
test('seeded bags are deterministic and bounded',()=>{assert.deepEqual(makeBag(42,80,'make10'),makeBag(42,80,'make10'));assert.notDeepEqual(makeBag(42,80,'make10'),makeBag(43,80,'make10'));assert.ok(makeBag(7,500,'make10').every(n=>n>=1&&n<=9));assert.deepEqual(draw([1,2,3,4],2),{tiles:[1,2],bag:[3,4]});});
test('every mode\'s bag only deals tiles that can ever complete its target',()=>{
  // Make 5's target is smaller than a single digit -- 5 alone needs a
  // nonexistent 0 partner and 6-9 already overshoot, so only 1-4 may appear.
  assert.equal(tileMax('make5'),4);
  assert.ok(makeBag(1,500,'make5').every(n=>n>=1&&n<=4),'Make 5 dealt a tile that can never form 5');
  // Every other mode's smallest target (10) is reachable by any 1-9 pairing.
  for(const modeId of ['make10','family','challenge']){
    assert.equal(tileMax(modeId),9);
    assert.ok(makeBag(1,500,modeId).every(n=>n>=1&&n<=9),`${modeId} dealt a tile outside 1-9`);
    assert.ok(makeBag(1,500,modeId).some(n=>n>=5),`${modeId} should still deal 5-9`);
  }
});
test('first play crosses centre, is straight, gapless and totals five',()=>{const b=emptyBoard();assert.equal(validateMove(b,[{r:0,c:0,value:2},{r:0,c:1,value:3}]).code,'connect');assert.equal(validateMove(b,[{r:3,c:3,value:2},{r:4,c:4,value:3}]).code,'straight');assert.equal(validateMove(b,[{r:3,c:2,value:2},{r:3,c:4,value:3}]).code,'gap');const v=validateMove(b,[{r:3,c:3,value:2},{r:3,c:4,value:3}]);assert.ok(v.ok);assert.equal(arithmetic(v.lines[0]),'2 + 3 = 5');});
test('occupied, bounds, duplicate and unconnected moves explain themselves',()=>{const b={size:7,cells:{'3,3':2,'3,4':3}};assert.equal(validateMove(b,[{r:3,c:3,value:1}]).code,'occupied');assert.equal(validateMove(b,[{r:-1,c:3,value:2}]).code,'bounds');assert.equal(validateMove(b,[{r:2,c:3,value:2},{r:2,c:3,value:3}]).code,'duplicate');assert.equal(validateMove(b,[{r:0,c:0,value:2},{r:0,c:1,value:3}]).code,'connect');});
test('all newly formed lines in both directions are checked',()=>{const b={size:7,cells:{'3,2':2,'3,4':1,'2,3':1,'4,3':1}};const ps=[{r:3,c:3,value:2}];const lines=formedLines(b,ps);assert.deepEqual(lines.map(x=>[x.direction,x.sum]),[['horizontal',5],['vertical',4]]);const v=validateMove(b,ps,'make5');assert.equal(v.code,'sum');assert.match(v.message,/makes 4/);});
test('two-line intersection scores strongly and celebrates by theme-neutral event',()=>{const b={size:7,cells:{'3,2':2,'3,4':1,'2,3':1,'4,3':2}};const v=validateMove(b,[{r:3,c:3,value:2}]);assert.ok(v.ok);assert.equal(v.lines.length,2);assert.equal(v.score,20);assert.equal(v.celebration,'double');});
test('three and four line de-duplication reports grand celebration',()=>{const b={size:7,cells:{'3,2':2,'3,4':1,'2,3':1,'4,3':2}};const v=validateMove(b,[{r:3,c:3,value:2}]);assert.equal(v.lines.length,2);assert.equal(new Set(v.lines.map(l=>l.direction)).size,2);});
test('mode rules cover exact targets, family and Challenge multiples/max five',()=>{const line=n=>Array.from({length:n},(_,i)=>({r:3,c:i+1,value:5}));assert.equal(validateMove(emptyBoard(),[{r:3,c:3,value:5},{r:3,c:4,value:5}],'make5').code,'sum');assert.ok(validateMove(emptyBoard(),[{r:3,c:3,value:4},{r:3,c:4,value:6}],'make10').ok);assert.ok(validateMove(emptyBoard(),[{r:3,c:2,value:5},{r:3,c:3,value:5},{r:3,c:4,value:5}],'family').ok);assert.ok(validateMove(emptyBoard(),[{r:3,c:2,value:4},{r:3,c:3,value:5},{r:3,c:4,value:6}],'challenge').ok);assert.equal(validateMove(emptyBoard(),line(6),'challenge').code,'tooLong');});
test('hint levels teach at two misses and reveal at three',()=>{const move=[{r:3,c:3,value:2},{r:3,c:4,value:3}];assert.equal(hintFor(1,move),null);assert.equal(hintFor(2,move).level,2);assert.equal(hintFor(3,move).level,3);assert.deepEqual(hintFor(3,move).placements,move);});
test('dead-board detection and move finding are deterministic',()=>{const b=emptyBoard();assert.deepEqual(findMove(b,[2,3,9],'make5').map(x=>x.value),[2,3]);assert.equal(isDeadBoard(b,[8,9],'make5'),true);assert.equal(isDeadBoard(b,[1,4],'make5'),false);});
test('applying a move is immutable',()=>{const b=emptyBoard(),n=applyMove(b,[{r:3,c:3,value:2}]);assert.deepEqual(b.cells,{});assert.equal(n.cells['3,3'],2);});
