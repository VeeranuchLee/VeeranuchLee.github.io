/* ══ MODE o1: ORDER THE NUMBERS ══
   The shared activity surface for both Magic Math worlds. The engine owns the
   exact rational values; this block owns the hands: a card is usable by pointer,
   by tap, and by a keyboard click, and every route ends in the same judgement. */

const ORDER_NUMBER_COUNTS=[2, 3, 4, 5, 6, 7].map(n=>({id:String(n),label:String(n),aria:`Order ${n} numbers`}));

/* ══ THE COMPANION'S LINES FOR o1 ══ Added 2026-09-27, superseding ORDER-NUMBERS-SPEC.md
   note 7, which held this mode at "no new spoken lines" because a new line would need a
   paid render. They are written now and rendered later, on approval.

   WHY A TABLE AND NOT INLINE LITERALS. Because the lines are lifted out of the call sites
   into a table, `build-narration-manifest.py`'s spoken_fixed() cannot see them — it harvests
   the LITERAL arguments of Voice.say / Voice.lines, which is the one shape it reads. So the
   table is read the way the other three data tables already are (MOVE_KEY_RULES' `say`,
   MEMORY_TOPICS' `ask`, TEN_CFG's `hint`), anchored on the field, and an anchor that drifts
   exits rather than shipping the mode with no manifest. The alternative — inlining each
   string at its call site — is what made these lines unlistable in the first place.

   EVERY RULE THESE FIVE LINES OBEY, and they are rules rather than preferences:
     generic           no line reads out a value. Not one number or fraction appears below,
                       so one clip serves every round at every count.
     short             a child acts between the end of a line and the start of the next.
                       The longest here is numberLine, at 98 characters, which is exactly the
                       length of the longest line already shipped (sh-l-pair-them-up-…).
     always true       a claim a counter-example can break does not go in, whatever it
                       costs to reword. Two of the lines the owner suggested needed exactly
                       that, and both rewordings are recorded in ORDER-NUMBERS-SPEC.md §6 and
                       in the discussion log.
     no hedging        "usually" and "sometimes" are banned outright. A hint that is only
                       usually right is worse than no hint, because the child cannot tell
                       which time they are in.

   ON THE TWO REWORDED SUGGESTIONS. The owner's draft was "A fraction with a bigger bottom
   number means smaller pieces." — true of 1/2 against 1/4, false of 3/4 against 1/2, and a
   seven-year-old cannot be expected to supply the missing condition. The version below
   states the condition instead of hiding it: equal top numbers, so it is a rule they can
   actually apply to the pair in front of them. And "Look for the number closest to zero."
   is true of this generator and would stop being true the day a negative value was
   allowed in, so order-numbers.test.mjs now asserts non-negativity across a thousand
   problems; that test is what keeps the line true, and it goes red the day somebody
   extends the bounds. */
const ORDER_VOICE={
  /* Spoken as a round is dealt, and again from the speaker button in the instruction bar. */
  start:'Put the numbers in order, from the smallest to the biggest.',
  /* The second miss: the rule, then the specific thing to look at. */
  hint:'The smallest number left goes next. Look for the one closest to zero.',
  /* The second miss's other half. Said every time, not conditionally: every generated
     round holds a fraction card, so it is never a rule about nothing. */
  fraction:'When the top numbers are the same, a bigger bottom number makes a smaller fraction.',
  /* The third miss, where the correct card is revealed. */
  reveal:'This one is the smallest left. It goes here.',
  /* The win, chained after the praise, as the line slides in. */
  numberLine:'Look! On the number line, smaller numbers are on the left and bigger numbers are on the right.',
};

function orderNumberText(card){
  if(!card||!card.display)return '';
  return card.display.kind==='fraction'?`${card.display.n} over ${card.display.d}`:card.display.text;
}

function OrderNumberValue({value,form}){
  const shown=OrderNumbersEngine.displayOf(value,form&&form.kind);
  if(shown.kind==='fraction'){
    return(
      <span className="on-frac" data-on-value="true" aria-label={`${shown.n} over ${shown.d}`}>
        <span className="on-frac-top">{shown.n}</span>
        <span className="on-frac-bar" aria-hidden="true"/>
        <span className="on-frac-bot">{shown.d}</span>
      </span>
    );
  }
  return <span className="on-value" data-on-value="true">{shown.text}</span>;
}

/* The number line renders every label — fraction included — as a single
 * compact line ("3/2", not a stacked numerator/bar/denominator). Same font
 * size as elsewhere (still legible), but a uniform, short line-height that
 * makes staggering to a second or third row cheap instead of costing a
 * whole stacked-fraction's height every time. */
function OrderNumberLineLabel({value,form}){
  const shown=OrderNumbersEngine.displayOf(value,form&&form.kind);
  const label=shown.kind==='fraction'?`${shown.n}/${shown.d}`:shown.text;
  return <span className="on-line-value" data-on-value="true" aria-label={shown.kind==='fraction'?`${shown.n} over ${shown.d}`:label}>{label}</span>;
}

function OrderNumberLine({problem}){
  /* Each label sits directly above its own marker with a small fixed gap, and
   * grows the panel upward only as far as staggering actually needs — never a
   * fixed tall band with empty space between the labels and the axis. Rows
   * stack bottom-up from the axis; a label is pushed to a second or third row
   * only when it would otherwise overlap its neighbour horizontally, and a
   * thin leader line in the marker's own colour is drawn only for a staggered
   * (non-adjacent) label so a child can still see which dot it names. */
  const width=760, left=60, right=700, plot=right-left;
  const bounds=problem.lineBounds||problem.bounds;
  const xFor=value=>left+OrderNumbersEngine.markerPosition(value,bounds)*plot;
  const dotRadius=8, labelGap=8, rowGap=2, topPad=6, bottomSpace=50, maxRows=3, labelHeight=19;
  const overlaps=(a,b)=>Math.abs(a.center-b.center)<(a.width+b.width)/2+8;
  const bySort=problem.sortedCards.map((card,index)=>{
    const value=card.value;
    const ratio=OrderNumbersEngine.markerPosition(value,bounds);
    const x=left+ratio*plot;
    const labelWidth=Math.max(48,Math.min(96,20+card.display.text.length*15));
    const center=Math.max(labelWidth/2,Math.min(width-labelWidth/2,x));
    return {card,index,value,ratio,x,center,width:labelWidth};
  }).sort((a,b)=>a.center-b.center);
  /* Rows stack bottom-up from the axis in fixed, uniform steps (every label
   * on the line is one compact line of text, never a tall stacked fraction),
   * so staggering to a second or third row costs the same small amount
   * regardless of which values landed near each other. */
  const placed=[];
  for(const seat of bySort){
    let row=0;
    while(row<maxRows-1&&placed.some(other=>other.row===row&&overlaps(seat,other)))row++;
    seat.row=row;
    seat.rowBottomDist=dotRadius+labelGap+row*(labelHeight+rowGap);
    placed.push(seat);
  }
  const neededRows=Math.max(1,...bySort.map(seat=>seat.row+1));
  const axisY=topPad+dotRadius+labelGap+neededRows*labelHeight+(neededRows-1)*rowGap;
  const height=axisY+bottomSpace;
  const seats=bySort.slice().sort((a,b)=>a.index-b.index);
  return(
    <div className="on-line" data-on-line="true" data-on-line-bounds={`${bounds.min}-${bounds.max}-${bounds.step}`}>
      <div className="on-line-title">Number Line</div>
      <svg className="on-line-svg" viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label="Number line showing the ordered values" data-on-axis-left={left} data-on-axis-right={right}>
        <line className="on-axis" x1={left} y1={axisY} x2={right} y2={axisY}/>
        <path className="on-axis-arrow" d={`M ${left-12} ${axisY} l 12 -7 v 14 z M ${right} ${axisY} l -12 -7 v 14 z`}/>
        {(problem.ticks||OrderNumbersEngine.makeTicks(bounds)).map(tick=>{
          const x=xFor(tick);
          const label=OrderNumbersEngine.displayOf(tick,'decimal');
          return(
            <g key={`${tick.n}/${tick.d}`} className="on-tick-group" data-on-tick={`${tick.n}/${tick.d}`}>
              <line className="on-tick" x1={x} y1={axisY-11} x2={x} y2={axisY+11}/>
              <text className="on-tick-label" x={x} y={axisY+34} textAnchor="middle">{label.text}</text>
            </g>
          );
        })}
        {seats.map(seat=>{
          const {card,index,value,ratio,x,center,width:labelWidth,row,rowBottomDist}=seat;
          const labelX=center-labelWidth/2;
          const bottomY=axisY-rowBottomDist;
          const y=bottomY-labelHeight;
          const staggered=row>0;
          return(
            <g key={`${value.n}/${value.d}`} className={`on-marker-group on-marker-${index%7}`} data-on-marker={`${value.n}/${value.d}`}
              data-on-marker-position={ratio} data-on-marker-x={x}>
              {staggered&&
                <line className={`on-leader on-leader-${index%7}`} x1={x} y1={bottomY} x2={x} y2={axisY-dotRadius}/>
              }
              <foreignObject className="on-marker-label-box" x={labelX} y={y} width={labelWidth} height={labelHeight}>
                <div xmlns="http://www.w3.org/1999/xhtml" className="on-marker-label" data-on-marker-label-index={index} data-on-marker-label-row={row}>
                  <OrderNumberLineLabel value={value} form={card.display}/>
                </div>
              </foreignObject>
              <circle className={`on-dot on-dot-${index%7}`} cx={x} cy={axisY} r={dotRadius}/>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function OrderNumberBox({index,card,wrong,hint,last}){
  const cls=[
    'on-box',
    card?'on-locked':'',
    wrong?'on-wrong':'',
    hint?'on-hint-box':'',
  ].filter(Boolean).join(' ');
  return(
    <React.Fragment>
      <div className={cls} data-on-box-index={index} role="listitem"
        aria-label={card?`Box ${index+1}: ${orderNumberText(card)} locked`:'Empty answer box'}>
        {card
          ? <><OrderNumberValue value={card.value} form={card.display}/><span className="on-check" aria-hidden="true">✓</span></>
          : <span className="on-placeholder" aria-hidden="true">?</span>}
      </div>
      {!last&&<span className="on-sep" aria-hidden="true">&lt;</span>}
    </React.Fragment>
  );
}

function OrderNumberCard({card,index,used,wrong,hint,revealed,onTap,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onLostPointerCapture}){
  const classes=[
    'on-card',
    used?'on-gone':'',
    wrong?'on-return':'',
    hint?'on-hint-card':'',
    revealed?'on-revealed':'',
  ].filter(Boolean).join(' ');
  return(
    <button type="button" className={classes} data-on-card={index} data-on-card-value={`${card.value.n}/${card.value.d}`} disabled={used}
      aria-label={`${orderNumberText(card)}${used?', already placed':'. Tap to place in the next box'}`}
      onClick={e=>{const detail=e&&e.detail;if(detail===0||detail==null)onTap(index);}}
      onPointerDown={e=>onPointerDown(index,e)}
      onPointerMove={e=>onPointerMove(index,e)}
      onPointerUp={e=>onPointerUp(index,e)}
      onPointerCancel={e=>onPointerCancel(index,e)}
      onLostPointerCapture={e=>onLostPointerCapture(index,e)}>
      <OrderNumberValue value={card.value} form={card.display}/>
    </button>
  );
}

function OrderNumbersGame({onBack,score,setScore,muted,topBar,mascotKind,reward,background}){
  const [count,setCount]=useState(5);
  const [problem,setProblem]=useState(()=>OrderNumbersEngine.makeProblem(5,Math.random));
  const [placed,setPlaced]=useState(()=>Array(5).fill(null));
  const [misses,setMisses]=useState(0);
  const [wrongBox,setWrongBox]=useState(null);
  const [wrongCard,setWrongCard]=useState(null);
  const [won,setWon]=useState(false);
  const [confetti,setConfetti]=useState(false);
  const [drag,setDrag]=useState(null);
  const mascot=useMascot();
  const wrongT=useRef(null);
  const dragRef=useRef(null);
  const finishedRef=useRef(false);
  const emptyIndex=placed.findIndex(index=>index==null);

  const resetForProblem=useCallback((nextCount,nextProblem)=>{
    clearTimeout(wrongT.current);
    dragRef.current=null;
    finishedRef.current=false;
    setCount(nextCount);
    setProblem(nextProblem);
    setPlaced(Array(nextCount).fill(null));
    setMisses(0);
    setWrongBox(null);
    setWrongCard(null);
    setWon(false);
    setConfetti(false);
    setDrag(null);
  },[]);

  const deal=useCallback(nextCount=>{
    resetForProblem(nextCount,OrderNumbersEngine.makeProblem(nextCount,Math.random));
  },[resetForProblem]);

  /* The instruction, as a new round is dealt. Keyed on `problem` and not on a round
     counter, because `problem` IS the round: deal() and the count ribbon both replace it,
     and Next cannot re-deal the identical object. The lines never gate anything — Voice
     cancels its own chain and a tap is never blocked on it — so a child who starts
     dragging mid-sentence simply interrupts the sentence, which is what they did in every
     other mode before this one existed. */
  useEffect(()=>{
    if(!won)Voice.say(ORDER_VOICE.start);
  },[problem]);

  /* THE ESCALATION, and its two thresholds are the mode's own, not new ones. Misses 2 and 3
     are where the card and the box already light up, so a line cannot arrive before the
     thing it is talking about, and the reveal line says what the reveal is doing.
     The first miss stays silent: the return animation, red flash, wrong sound and mascot
     already answer the attempt, while narration would interrupt the child's retry. 4 and
     beyond fall silent again: past the reveal the child is being told what to do, not
     encouraged. */
  useEffect(()=>{
    if(won)return;
    if(misses===3){Voice.say(ORDER_VOICE.reveal);return;}
    if(misses!==2)return;
    /* The fractions rule is the second half of the same beat, chained behind the rule so
       the child hears the general one first. It is NOT conditional, and the reason is the
       engine rather than taste: makeProblem refuses to return a round without a fraction
       card — hasRequiredMix() demands one for every count from 2 to 7, and makeProblem
       retries until it has one — so there is always something in the tray for the rule to
       be about, and order-numbers.test.mjs now asserts that guarantee so a future engine
       change goes red here rather than quietly making the line noise.
       It is a RULE, not a claim about this round: it is applicable to the pair in front
       of the child when the two top numbers match, and true whether or not they do. That
       is deliberate. The alternative was a line that named a specific comparison, which
       would be false on most rounds — and a hint that is only right sometimes is worse
       than none, because the child cannot tell which kind of round they are in. */
    Voice.lines([ORDER_VOICE.hint,ORDER_VOICE.fraction]);
  },[misses,problem,won]);

  const finishRound=useCallback(()=>{
    if(finishedRef.current)return;
    finishedRef.current=true;
    setWon(true);
    setConfetti(true);
    Sound.ding();
    setTimeout(()=>Sound.celebrate(),200);
    mascot.happy();
    const arrived=reward?reward():false;
    /* Praise first, the line about the number line after it. The number line is what the
       second line is about, and a chain puts one behind the other, so the child is looking
       at the axis by the time they are told which end is which. A journey arrival takes
       praise's place exactly as before, and the line still follows: the axis is on screen
       either way. */
    Voice.lines([arrived?null:praise(),ORDER_VOICE.numberLine]);
    if(setScore)setScore(s=>s+1);
    setTimeout(()=>setConfetti(false),2600);
  },[mascot,reward,setScore]);

  const attemptPlacement=useCallback((cardIndex,boxIndex,alreadyTapSound=false)=>{
    if(won||finishedRef.current||boxIndex==null||boxIndex<0)return;
    if(placed[boxIndex]!=null||placed.some(index=>index===cardIndex))return;
    if(!alreadyTapSound){Sound.setMuted(muted);Sound.tap();}
    const card=problem.cards[cardIndex];
    if(!card)return;
    if(OrderNumbersEngine.isCorrectForBox(card.value,problem.sorted,boxIndex)){
      clearTimeout(wrongT.current);
      setWrongBox(null);
      setWrongCard(null);
      const next=placed.slice();
      next[boxIndex]=cardIndex;
      setPlaced(next);
      if(next.every(index=>index!=null))finishRound();
      else Sound.ding();
    }else{
      setMisses(value=>value+1);
      setWrongBox(boxIndex);
      setWrongCard(cardIndex);
      Sound.setMuted(muted);
      Sound.wrong();
      mascot.oops();
      clearTimeout(wrongT.current);
      wrongT.current=setTimeout(()=>{setWrongBox(null);setWrongCard(null);},480);
    }
  },[finishRound,mascot,muted,placed,problem]);

  const tapCard=useCallback(cardIndex=>{
    Sound.setMuted(muted);
    Sound.tap();
    const target=placed.findIndex(index=>index==null);
    attemptPlacement(cardIndex,target,true);
  },[attemptPlacement,muted,placed]);

  const pointerDown=useCallback((cardIndex,event)=>{
    if(won||placed.some(index=>index===cardIndex))return;
    if(event.button!=null&&event.button!==0)return;
    Sound.setMuted(muted);
    Sound.tap();
    const point={x:event.clientX||0,y:event.clientY||0};
    dragRef.current={cardIndex,pointerId:event.pointerId,startX:point.x,startY:point.y,moved:false};
    setDrag({cardIndex,x:point.x,y:point.y,moved:false});
    try{event.currentTarget.setPointerCapture&&event.currentTarget.setPointerCapture(event.pointerId);}catch(e){}
  },[muted,placed,won]);

  const pointerMove=useCallback((cardIndex,event)=>{
    const active=dragRef.current;
    if(!active||active.cardIndex!==cardIndex||active.pointerId!==event.pointerId)return;
    const x=event.clientX||0,y=event.clientY||0;
    const moved=active.moved||Math.hypot(x-active.startX,y-active.startY)>=6;
    active.moved=moved;
    if(moved)event.preventDefault&&event.preventDefault();
    setDrag({cardIndex,x,y,moved});
  },[]);

  const pointerUp=useCallback((cardIndex,event)=>{
    const active=dragRef.current;
    if(!active||active.cardIndex!==cardIndex||active.pointerId!==event.pointerId)return;
    dragRef.current=null;
    setDrag(null);
    try{event.currentTarget.releasePointerCapture&&event.currentTarget.releasePointerCapture(event.pointerId);}catch(e){}
    if(!active.moved){
      tapCard(cardIndex);
      return;
    }
    let target=null;
    try{
      const hit=document.elementFromPoint&&document.elementFromPoint(event.clientX,event.clientY);
      const box=hit&&hit.closest?hit.closest('[data-on-box-index]'):(event.target&&event.target.closest?event.target.closest('[data-on-box-index]'):null);
      if(box)target=Number(box.getAttribute('data-on-box-index'));
    }catch(e){}
    if(target!=null&&placed[target]==null)attemptPlacement(cardIndex,target,true);
  },[attemptPlacement,placed,tapCard]);

  const pointerCancel=useCallback((cardIndex,event)=>{
    const active=dragRef.current;
    if(active&&active.cardIndex===cardIndex)dragRef.current=null;
    setDrag(null);
  },[]);

  const lostPointerCapture=useCallback(()=>{
    dragRef.current=null;
    setDrag(null);
  },[]);

  const applyCount=useCallback(id=>deal(Number(id)),[deal]);
  const next=useCallback(()=>deal(count),[count,deal]);
  const revealIndex=misses>=3?problem.cards.findIndex(card=>emptyIndex>=0&&OrderNumbersEngine.isCorrectForBox(card.value,problem.sorted,emptyIndex)):-1;
  const smallestRemaining=problem.cards.reduce((best,card,index)=>{
    if(placed.includes(index))return best;
    if(best<0)return index;
    return OrderNumbersEngine.compare(card.value,problem.cards[best].value)<0?index:best;
  },-1);

  return(
    <div className={`screen on-screen on-${mascotKind==='unicorn'?'unicorn':'space'}`} data-on-count={count} data-on-bounds={`${problem.bounds.min},${problem.bounds.max},${problem.bounds.step}`} style={background?{'--game-bg':`url('${background}')`}:undefined}>
      <div className="screen-bg"/>
      <Confetti active={confetti}/>
      <BgDeco/>
      {topBar}
      {mascotKind&&<Mascot kind={mascotKind} mood={mascot.mood} stamp={mascot.stamp} onPoke={mascot.poke}/>}
      <div className="count-title"><div className="count-title-main">Order the Numbers</div><div className="count-title-sub">Least to greatest</div></div>
      {/* The speaker is INSIDE the instruction bar, beside the words it speaks, and it is
          the same affordance the journey overlay uses (`arrival-replay`, "Hear it again")
          rather than a new one invented here. A child who did not catch the instruction on
          the first pass can hear it again without asking a grown-up to repeat it, which is
          the whole reason the line is replayable. It stays after the win on purpose: the
          bar keeps its height either way, so hiding it would move every control above the
          number line for no gain. */}
      <div className="tap-hint on-instruction">
        <span className="on-instruction-text">Drag the number cards into the boxes from least to greatest.</span>
        <button className="on-instruction-say" aria-label="Hear it again"
          onClick={()=>{Sound.tap();Voice.say(ORDER_VOICE.start);}}><SpeakerOnIcon/></button>
      </div>
      <ActivityRibbon chips={ORDER_NUMBER_COUNTS} value={String(count)} onPick={applyCount} muted={muted} label="Choose how many numbers to order"/>
      <div className={`on-stage${won?' on-stage-won':''}`} data-on-won={won?'true':'false'}>
        <div className="on-answer-row" role="list" aria-label="Numbers from least to greatest">
          {placed.map((cardIndex,index)=><OrderNumberBox key={index} index={index} card={cardIndex==null?null:problem.cards[cardIndex]} wrong={wrongBox===index} hint={misses>=2&&index===emptyIndex} last={index===count-1}/>) }
        </div>
        {!won&&<div className="on-tray" aria-label="Number cards to place">
          {problem.cards.map((card,index)=><OrderNumberCard key={index} card={card} index={index}
            used={placed.includes(index)} wrong={wrongCard===index} hint={misses>=2&&index===smallestRemaining}
            revealed={misses>=3&&index===revealIndex} onTap={tapCard}
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
            onPointerCancel={pointerCancel} onLostPointerCapture={lostPointerCapture}/>) }
        </div>}
        <div className={`on-help ${misses>=2&&!won?'on-help-show':''}`} aria-live="polite">
          {!won&&(misses>=3?'This is the next number.':misses>=2?'Least goes first.':'')}
        </div>
        {drag&&drag.moved&&problem.cards[drag.cardIndex]&&<div className="on-ghost" style={{left:drag.x,top:drag.y}}><OrderNumberValue value={problem.cards[drag.cardIndex].value} form={problem.cards[drag.cardIndex].display}/></div>}
        {won&&<OrderNumberLine problem={problem}/>}
      </div>
      {won&&<button className="next-btn" onClick={next} aria-label="Next">Next</button>}
    </div>
  );
}
