/* Shadow Matching — the game.
 *
 * WHAT IT ASKS. One picture, four shadows, one tap. The child is never asked to search,
 * drag or type: "games ask, children answer" is the house rule and this is its simplest
 * possible shape.
 *
 * WHERE THE DIFFICULTY COMES FROM. Not from timers and not from how many choices there
 * are -- always four -- but from WHICH shadows sit beside the right one. asset-roster.json
 * groups the hundred objects into ten sets whose own titles say it: "Very different
 * silhouettes" is the starter, "Transport" and "Wild land animals" are same-category-hard,
 * because a lorry against a bus is a harder read than a butterfly against an eel. So the
 * distractors are ALWAYS drawn from the same set as the answer. Pulling them from anywhere
 * would quietly turn every set into set one.
 *
 * THE TWO HINT THRESHOLDS, which this project holds everywhere: at two misses teach the
 * RULE, at three reveal the ANSWER. Never the answer first.
 *
 * WHY FOUR CHOICES AND NOT THREE. Three was the first build and it broke the thresholds.
 * With three, a second miss has already eliminated both wrong shadows, so the child has
 * solved it by elimination before the rule is ever taught and the hint arrives too late to
 * teach anything. Four leaves a real choice standing at the second miss, which is the only
 * way "teach the rule, then reveal" means anything.
 *
 * AND WHY THE RULE HINT DOES NOT DIM A WRONG ANSWER. Dimming is elimination wearing a
 * teacher's coat: it shrinks the problem instead of saying how to look at it. The hint is
 * a sentence -- look at the edge shape, not the colour -- because the colour is precisely
 * what a shadow throws away, and that is the thing worth learning here.
 *
 * NO SCORE, NO TIMER, NO FAILURE STATE. A round ends when the ten are done.
 *
 * TWO MODES, AND WHY THE SECOND ONE TAPS RATHER THAN DRAGS. The owner asked for a board
 * like the printed matching cards -- pictures down one side, shadows down the other. The
 * obvious build is drag-and-drop, and it is the wrong one twice over. The house rule is
 * "games ask, children answer: one question, one tap; never make a child search or drag to
 * answer", and on a 9.7-inch iPad a seven-year-old's near-miss drop reads as failure in a
 * project that has no failure states. So Board mode is TAP-TO-PAIR: tap a picture, tap its
 * shadow, they join. Same board, same satisfaction of clearing it, every answer still one
 * tap on the thing you mean.
 */
'use strict';

var ART = 'assets-runtime/objects/';
var SIGS = null;               /* silhouette signatures, for Memory's fairness rule */
var MEM_MIN_DISTANCE = 0.15;   /* see the note above memChoosePairs */
var $ = function (s, r) { return (r || document).querySelector(s); };
var MIRROR = null;             /* measured mirror eligibility, for Mirror Match -- see below */

/* Regular | Tricky, kept the same way the speaker setting is: a plain localStorage read/write,
   each wrapped so blocked storage degrades to "this visit only" rather than a broken app.
   Regular is the fallback on any failure, matching the brief's default. */
var LEVEL_KEY = 'shadow-matching-level';
function loadLevel() {
  try { return window.localStorage.getItem(LEVEL_KEY) === 'tricky' ? 'tricky' : 'regular'; } catch (e) { return 'regular'; }
}
function saveLevel(level) {
  try { window.localStorage.setItem(LEVEL_KEY, level); } catch (e) { /* kept for this visit only */ }
}

var state = { set: null, queue: [], i: 0, misses: 0, done: 0, mode: 'find', level: loadLevel(),
              pick: null, pairs: 0, mem: null, visit: 0 };
var roster = null;

/* EVERY FIXED LINE THE GAME SAYS, IN ONE PLACE. Today they are only shown. They are kept
   here, keyed, because a later task may give them a rendered voice (OLDER-KID-SPEC.md
   section 13) -- and then say() is the one place that plays a clip for a key, with no
   gameplay rewritten. No clip exists for any of them yet and none is to be bought without
   the owner's approval, so nothing is spoken: no OS voice stands in, because a device voice
   is exactly what the audio direction rules out. Lines built from numbers ("6 pictures and
   their shadows.") are not fixed lines and are not here. */
var LINES = {
  hero:          'Look at the picture. Find its shadow.',
  findAsk:       'Which shadow belongs to it?',
  findYes:       'Yes — that is its shadow.',
  findRule:      'Look at the edge shape, not the colour.',
  findReveal:    'This one is its shadow.',
  findDone:      'You found them all.',
  mirrorAsk:     'Which shadow matches exactly?',
  mirrorYes:     'Yes — that one matches exactly.',
  mirrorRule:    'Look carefully at which side each part is on.',
  mirrorReveal:  'This one matches the picture.',
  mirrorDone:    'You matched them all exactly.',
  boardAsk:      'Tap a picture, then tap its shadow.',
  boardShadow:   'Now tap its shadow.',
  boardPicture:  'Now tap the picture it belongs to.',
  boardYes:      'Yes. Tap another picture.',
  boardAll:      'Every one matched.',
  boardNope:     'Not that one. Look at the edge shape.',
  boardDone:     'You matched the whole board.',
  memAsk:        'Turn over two cards. Find a picture and its shadow.',
  memOneMore:    'Now turn over one more.',
  memPair:       'A pair. Turn over two more.',
  memAll:        'You found every one.',
  memMiss:       'Not a pair. Remember where they are.',
  memDone:       'You found every pair.'
};

/* The seam for a future voice: every line a child reads during play goes through here. */
function say(key) {
  var el = $('#askline');
  if (el) el.textContent = LINES[key];
}

/* A sound cue, if the sound controller loaded (sound.js). Sound is never load-bearing: every
   cue has a visible equivalent, and a missing or broken controller is a silent game, not a
   broken one. */
function sfx(name) {
  try { if (typeof Sound !== 'undefined' && Sound[name]) Sound[name](); } catch (e) { /* silent */ }
}

/* A timer that dies when the child leaves the screen it was set on. Without it, tapping
   "Sets" during the short pause after an answer let the next question -- and its sound --
   arrive on top of the home screen. */
function later(fn, ms) {
  var visit = state.visit;
  return setTimeout(function () { if (state.visit === visit) fn(); }, ms);
}

/* THE SPEAKER. One button, top right of every screen, clear of Back and the progress dots.
   It is drawn only when there is sound to control: if sound.js did not load or the device has
   no Web Audio, a mute button would be a control that does nothing. Turning sound back on
   plays one quiet note, so the tap is answered; turning it off is answered by the icon. */
var SPEAKER_ON = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/>' +
  '<path d="M21 11.5a6 6 0 0 1 0 9M24.5 8a11 11 0 0 1 0 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
var SPEAKER_OFF = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/>' +
  '<path d="M21.5 12.5l7 7M28.5 12.5l-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

function soundAvailable() {
  try { return typeof Sound !== 'undefined' && Sound.available(); } catch (e) { return false; }
}

function soundButton() {
  if (!soundAvailable()) return '';
  var on = Sound.isEnabled();
  return '<button class="speaker' + (on ? '' : ' off') + '" id="speaker" aria-pressed="' + on + '" aria-label="' +
    (on ? 'Sound on' : 'Sound off') + '">' + (on ? SPEAKER_ON : SPEAKER_OFF) + '</button>';
}

function wireSoundButton() {
  var b = $('#speaker');
  if (!b) return;
  b.onclick = function () {
    var on = Sound.setEnabled(!Sound.isEnabled());
    b.classList.toggle('off', !on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    b.innerHTML = on ? SPEAKER_ON : SPEAKER_OFF;
    if (on) sfx('on');
  };
}

/* Every screen change is a new visit, and stops any cue still sounding. */
function screen(html) {
  state.visit++;
  sfx('stop');
  document.getElementById('app').innerHTML = html;
}

function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* Return a permutation of `col` with no element in its original index. Retries rather
   than constructing one: for six items a random shuffle is deranged about a third of the
   time, so this lands almost immediately, and the loop cannot run forever because the
   fixed cap falls back to a single rotation -- which is deranged by definition. */
function derange(col) {
  for (var attempt = 0; attempt < 40; attempt++) {
    var c = shuffle(col.slice());
    var clash = false;
    for (var i = 0; i < c.length; i++) if (c[i].id === col[i].id) { clash = true; break; }
    if (!clash) return c;
  }
  return col.slice(1).concat(col.slice(0, 1));
}

function reduceMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

/* ---- screens ------------------------------------------------------------- */

function home() {
  state.set = null;
  if (state.mode === 'mirror' && !MIRROR) state.mode = 'find';
  var cards = roster.groups.map(function (g) {
    var done = playable(g).length;
    /* A set with no mirror-eligible object has nothing to ask in Mirror Match. None does
       today (the fewest is three), but a set card that opens nothing would be a dead tap. */
    if (!done) return '';
    return '<button class="setcard" data-set="' + g.id + '">' +
      '<img class="setart" src="' + ART + g.items[0].id + '/shadow.webp" alt="" aria-hidden="true">' +
      '<strong>' + g.title + '</strong>' +
      '<small>' + done + ' to find</small></button>';
  }).join('');
  screen(
    '<header class="topline"><a class="hub" href="https://veeranuchlee.github.io/children-apps/" aria-label="Back to Children Games">&larr; All games</a>' +
    soundButton() + '</header>' +
    '<section class="hero"><h1>Shadow Matching</h1><p>' + LINES.hero + '</p>' +
    '<div class="modes" role="group" aria-label="How to play">' +
      '<button class="mode' + (state.mode === 'find' ? ' on' : '') + '" data-mode="find">One at a time</button>' +
      '<button class="mode' + (state.mode === 'board' ? ' on' : '') + '" data-mode="board">Match the board</button>' +
      '<button class="mode' + (state.mode === 'memory' ? ' on' : '') + '" data-mode="memory">Remember</button>' +
      /* Mirror Match needs the measured eligibility file. Without it the mode is not
         offered at all, rather than offered and unable to start. */
      (MIRROR ? '<button class="mode' + (state.mode === 'mirror' ? ' on' : '') + '" data-mode="mirror">Mirror Match</button>' : '') +
    '</div>' +
    /* Tricky belongs to "One at a time" only, so the choice is shown only there. Regular is
       the default and is today's game exactly. */
    (state.mode === 'find'
      ? '<div class="levels" role="group" aria-label="How tricky">' +
          '<button class="level' + (state.level === 'regular' ? ' on' : '') + '" data-level="regular" aria-pressed="' + (state.level === 'regular') + '">Regular</button>' +
          '<button class="level' + (state.level === 'tricky' ? ' on' : '') + '" data-level="tricky" aria-pressed="' + (state.level === 'tricky') + '">Tricky</button>' +
        '</div>'
      : '') +
    '</section>' +
    '<section class="sets">' + cards + '</section>');
  wireSoundButton();
  Array.prototype.forEach.call(document.querySelectorAll('.setcard'), function (b) {
    b.onclick = function () { startSet(b.dataset.set); };
  });
  Array.prototype.forEach.call(document.querySelectorAll('.mode'), function (b) {
    b.onclick = function () { state.mode = b.dataset.mode; home(); };
  });
  Array.prototype.forEach.call(document.querySelectorAll('.level'), function (b) {
    b.onclick = function () { state.level = b.dataset.level; saveLevel(state.level); home(); };
  });
}

/* TRICKY: the same four choices, harder ones. Regular asks "which object is this?"; Tricky
   asks "which exact outline is this?", by making the three wrong shadows the three NEAREST
   silhouettes in the set by sigDistance() -- the measured shape distance Memory already uses
   to AVOID lookalikes, used here the other way round. Nothing is hand-listed: pumpkin/tomato
   and spoon/fork come out of the numbers, not out of a table. Ties (none exist in today's
   hundred) break by id, so the choice is a pure function of the set and testable exactly.
   Never more than three: harder is never more choices (OLDER-KID-SPEC.md section 3). */
function nearestOthers(answer, pool, n) {
  return pool.filter(function (it) { return it.id !== answer.id; })
    .map(function (it) { return { it: it, d: sigDistance(answer.id, it.id) }; })
    .sort(function (a, b) { return a.d - b.d || (a.it.id < b.it.id ? -1 : a.it.id > b.it.id ? 1 : 0); })
    .slice(0, n)
    .map(function (x) { return x.it; });
}

/* ---- mirror match -------------------------------------------------------- */

/* THE OLDER-KID MODE. The normal coloured picture, and four shadows: its exact shadow, that
 * SAME shadow flipped left-to-right, and two near lookalikes from the set. Knowing "that is
 * the teapot" narrows four to two; only looking at which way the spout points finishes it.
 *
 * WHO MAY BE ASKED. Only objects whose shadow measurably changes when mirrored -- a ball's
 * mirror IS the ball, and would be a second right answer marked wrong. That is decided by
 * tools/build-mirror-eligibility.py from the shipped alpha masks into
 * assets-runtime/mirror-eligibility.json, never by name. An object missing from that file is
 * treated as NOT eligible: false exclusion is the safe mistake.
 *
 * THE MIRROR IS THE SAME IMAGE, REFLECTED. The twin is the canonical shadow.webp under CSS
 * scaleX(-1) on the <img> -- pixel-for-pixel a reflection, never redrawn -- and the transform
 * sits on the image, not the button, so a mirrored choice is exactly the size of any other.
 *
 * THE DISTRACTORS are the two nearest silhouettes in the set by sigDistance(), as in Tricky,
 * and each is shown one way or the other at random. If only the trap were ever flipped, "the
 * odd flipped-looking one is the trap" would be a rule a child could learn instead of
 * looking.
 */
function mirrorEligible(id) {
  return !!(MIRROR && MIRROR[id] && MIRROR[id].eligible === true);
}

/* The objects a set can ask about in the current mode. */
function playable(g) {
  return g.items.filter(function (it) {
    return it.status === 'complete' && (state.mode !== 'mirror' || mirrorEligible(it.id));
  });
}

function mirrorChoices(answer, pool) {
  return shuffle([{ id: answer.id, flip: false }, { id: answer.id, flip: true }].concat(
    nearestOthers(answer, pool, 2).map(function (it) {
      return { id: it.id, flip: Math.random() < 0.5 };
    })));
}

function startSet(id) {
  var g = roster.groups.filter(function (x) { return x.id === id; })[0];
  state.set = g;
  state.queue = shuffle(playable(g).slice());
  state.i = 0; state.done = 0; state.pairs = 0; state.pick = null;
  if (state.mode === 'board') return board();
  if (state.mode === 'memory') return memory();
  ask();
}

function ask() {
  if (state.i >= state.queue.length) return finished();
  state.misses = 0;
  var answer = state.queue[state.i];
  /* Distractors come from the SAME set, which is what makes a set's difficulty real. */
  var pool = state.set.items.filter(function (it) {
    return it.id !== answer.id && it.status === 'complete';
  });
  var mirror = state.mode === 'mirror';
  var choices;
  if (mirror) {
    choices = mirrorChoices(answer, pool);
  } else {
    var others = state.level === 'tricky' ? nearestOthers(answer, pool, 3) : shuffle(pool).slice(0, 3);
    choices = shuffle([answer].concat(others)).map(function (it) { return { id: it.id, flip: false }; });
  }

  screen(
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' +
    '<span class="progress" aria-label="' + (state.i + 1) + ' of ' + state.queue.length + '">' +
    state.queue.map(function (_, n) {
      return '<i class="' + (n < state.i ? 'on' : n === state.i ? 'now' : '') + '"></i>';
    }).join('') + '</span>' + soundButton() + '</header>' +
    '<section class="stage">' +
      '<div class="subject"><img src="' + ART + answer.id + '/picture.webp" alt="' + answer.label + '"></div>' +
      '<p class="askline" id="askline">' + LINES[mirror ? 'mirrorAsk' : 'findAsk'] + '</p>' +
      '<div class="choices">' + choices.map(function (c) {
        return '<button class="choice" data-id="' + c.id + '" data-flip="' + (c.flip ? 1 : 0) + '" aria-label="shadow choice">' +
          '<img src="' + ART + c.id + '/shadow.webp" alt=""' + (c.flip ? ' class="mirrored"' : '') + '></button>';
      }).join('') + '</div>' +
    '</section>');

  wireSoundButton();
  $('#back').onclick = home;
  Array.prototype.forEach.call(document.querySelectorAll('.choice'), function (b) {
    b.onclick = function () { pick(b, answer); };
  });
}

/* The only right answer is the right object AND the right way round. In Find every choice
   is the right way round, so this is today's id test there. */
function isAnswer(btn, answer) {
  return btn.dataset.id === answer.id && btn.dataset.flip !== '1';
}

function pick(btn, answer) {
  var mirror = state.mode === 'mirror';
  if (isAnswer(btn, answer)) {
    btn.classList.add('right');
    if (!reduceMotion()) btn.classList.add('pop');
    say(mirror ? 'mirrorYes' : 'findYes');
    Array.prototype.forEach.call(document.querySelectorAll('.choice'), function (b) { b.disabled = true; });
    state.done++; state.i++;
    sfx('correct');
    later(ask, 900);
    return;
  }
  state.misses++;
  btn.classList.add('wrong');
  btn.disabled = true;

  if (state.misses === 2) {
    /* Threshold one: teach the rule, and ONLY that. No dimming -- see the note at the top
       of this file. A real choice must still be standing or the rule teaches nothing. In
       Mirror Match the rule is about sides, because that is what the twin tests. */
    say(mirror ? 'mirrorRule' : 'findRule');
    sfx('hint');
  } else if (state.misses >= 3) {
    /* Threshold two: reveal. The mirrored twin is not called a wrong object -- it is the
       right object facing the other way -- so the line says which one matches, no more. */
    var right = $('.choice[data-id="' + answer.id + '"][data-flip="0"]');
    if (right) right.classList.add('right');
    say(mirror ? 'mirrorReveal' : 'findReveal');
    Array.prototype.forEach.call(document.querySelectorAll('.choice'), function (b) { b.disabled = true; });
    state.i++;
    sfx('resolve');
    later(ask, 1600);
  } else {
    sfx('wrong');
  }
}

/* ---- board mode ---------------------------------------------------------- */

/* Six pairs, not ten. The printed card the owner showed uses six, and six columns of two
   fit the iPad in portrait without scrolling -- a board a child has to scroll is a board
   they lose their place on. The other four of the set's ten simply sit out this board, so
   playing it twice is not the same board twice. */
var BOARD_PAIRS = 6;

function board() {
  var items = shuffle(state.set.items.filter(function (it) {
    return it.status === 'complete';
  })).slice(0, BOARD_PAIRS);
  state.queue = items;
  state.pairs = 0;
  state.pick = null;

  /* The two columns are shuffled independently AND then deranged: no row may hold a
     picture opposite its own shadow. Independent shuffles alone are not enough -- with six
     rows, one or two usually line up by chance, and a child who notices can clear those
     pairs by position without ever looking at a shape. Testing this board found two of six
     aligned on the first try. */
  var left = shuffle(items.slice());
  var right = derange(left);

  screen(
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' +
    '<span class="tally" id="tally">0 of ' + BOARD_PAIRS + ' matched</span>' + soundButton() + '</header>' +
    '<p class="askline" id="askline">' + LINES.boardAsk + '</p>' +
    '<section class="board">' +
      '<div class="col">' + left.map(function (it) {
        return '<button class="tile pic" data-id="' + it.id + '" aria-label="' + it.label + '">' +
          '<img src="' + ART + it.id + '/picture.webp" alt=""></button>';
      }).join('') + '</div>' +
      '<div class="col">' + right.map(function (it) {
        return '<button class="tile sh" data-id="' + it.id + '" aria-label="a shadow">' +
          '<img src="' + ART + it.id + '/shadow.webp" alt=""></button>';
      }).join('') + '</div>' +
    '</section>');

  wireSoundButton();
  $('#back').onclick = home;
  Array.prototype.forEach.call(document.querySelectorAll('.tile'), function (b) {
    b.onclick = function () { tapTile(b); };
  });
}

function tapTile(b) {
  if (b.classList.contains('matched')) return;

  /* First tap of a pair, or a change of mind on the same side. */
  if (!state.pick || state.pick.classList.contains('pic') === b.classList.contains('pic')) {
    if (state.pick) state.pick.classList.remove('chosen');
    if (state.pick === b) { state.pick = null; return; }   /* tapping it again lets go */
    state.pick = b; b.classList.add('chosen');
    say(b.classList.contains('pic') ? 'boardShadow' : 'boardPicture');
    return;
  }

  /* Second tap: the other column. */
  var a = state.pick;
  if (a.dataset.id === b.dataset.id) {
    a.classList.remove('chosen');
    a.classList.add('matched'); b.classList.add('matched');
    a.disabled = true; b.disabled = true;
    state.pick = null; state.pairs++;
    $('#tally').textContent = state.pairs + ' of ' + BOARD_PAIRS + ' matched';
    say(state.pairs === BOARD_PAIRS ? 'boardAll' : 'boardYes');
    sfx('correct');
    if (state.pairs === BOARD_PAIRS) later(boardDone, 800);
    return;
  }

  /* A wrong pair. Both let go and the board says what to look at -- it never removes a
     tile, because on a board the child is choosing among things that are all still true
     answers for some other tile. Taking one away would be lying about the puzzle. */
  b.classList.add('nope');
  setTimeout(function () { b.classList.remove('nope'); }, 420);
  a.classList.remove('chosen');
  state.pick = null;
  say('boardNope');
  sfx('wrong');
}

function boardDone() {
  screen(
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' + soundButton() + '</header>' +
    '<section class="done"><h2>' + LINES.boardDone + '</h2>' +
    '<p>' + BOARD_PAIRS + ' pictures and their shadows.</p>' +
    '<div class="actions"><button class="primary" id="again">Another board</button>' +
    '<button class="secondary" id="pick">Choose another set</button></div></section>');
  wireSoundButton();
  sfx('complete');
  $('#back').onclick = home;
  $('#again').onclick = function () { startSet(state.set.id); };
  $('#pick').onclick = home;
}

/* ---- memory mode --------------------------------------------------------- */

/* THIS FOLLOWS THE MATH APP'S MEMORY ENGINE, DELIBERATELY AND NOT BY COINCIDENCE.
 * `math-app/space-math.html` has a flip-card engine that has been in production and
 * argued over; its rules are reproduced here rather than reinvented. The owner's
 * instruction (2026-09-18) was to use it as the behavioural reference and write a small
 * Shadow-local version, NOT to extract a shared module -- refactoring two working Math
 * pages to serve this one would be a poor trade. If `memory-match-app/` ever becomes real
 * code, extract then, from the three implementations that actually exist.
 *
 * The rules taken from it, each for its stated reason:
 *
 *   MATCH ON pairId, NEVER ON WHAT THE CARD SHOWS. The Math engine's note: a board with
 *   2x6 and 3x4 has two cards reading "12", and comparing rendered faces would let either
 *   answer close either fact. Here the same hazard is two lookalike silhouettes. The
 *   owner also asked for a second condition -- the two cards must be OPPOSITE SIDE TYPES,
 *   picture against shadow. With one of each per pair that is already implied, and it is
 *   checked anyway: it costs nothing and it means a future deck of two pictures cannot
 *   quietly start matching itself.
 *
 *   CHOOSE PAIRS GREEDILY, AVOIDING COLLISIONS, THEN BACKFILL BY id IF SHORT. Exactly the
 *   Math engine's shape. The backfill matters: a board that came up short would be worse
 *   than a board with one near-miss on it.
 *
 *   DEAL TWO CARDS PER PAIR, THEN SHUFFLE THE WHOLE DECK. Not shuffle-then-pair.
 *
 *   THE RESOLVE IS IDEMPOTENT. Calling it twice, or after the board has moved on, does
 *   nothing -- which is what makes it safe on a timer that outlived its board.
 */

var MEM_PAIRS = 6;             /* 12 cards, 4x3 on the iPad in portrait */

function sigDistance(a, b) {
  var x = SIGS[a], y = SIGS[b];
  if (!x || !y) return 1;      /* unknown shape: treat as different, never as a clash */
  var t = 0;
  for (var i = 0; i < x.length; i++) t += Math.abs(x[i] - y[i]);
  return t / x.length;
}

/* The Math engine refuses two pairs on one board when their `value` or a rendered `face`
   collides. A silhouette's face IS its shape, so the collision test is shape distance.
   MEM_MIN_DISTANCE was measured, not guessed: over all 450 within-set pairs the median
   distance is 0.340 and every genuinely confusable pair sits below 0.144 (pumpkin/tomato
   0.044, spoon/fork 0.064, sheep/pig 0.123, hippopotamus/bear 0.124). 0.15 clears them
   all; above 0.18 some set can no longer fill a board. */
function memChoosePairs(items, n) {
  var order = shuffle(items.slice());
  var out = [];
  for (var i = 0; i < order.length && out.length < n; i++) {
    var clash = false;
    for (var j = 0; j < out.length; j++) {
      if (sigDistance(order[i].id, out[j].id) < MEM_MIN_DISTANCE) { clash = true; break; }
    }
    if (!clash) out.push(order[i]);
  }
  /* Backfill, the Math engine's own fallback: a short board is worse than a near-miss. */
  if (out.length < n) {
    var taken = {};
    out.forEach(function (p) { taken[p.id] = 1; });
    for (var k = 0; k < order.length && out.length < n; k++) {
      if (!taken[order[k].id]) { out.push(order[k]); taken[order[k].id] = 1; }
    }
  }
  return out;
}

function memDeal(pairs) {
  var cards = [];
  pairs.forEach(function (p) {
    cards.push({ cardId: p.id + '#pic', pairId: p.id, type: 'picture', label: p.label });
    cards.push({ cardId: p.id + '#sh',  pairId: p.id, type: 'shadow',  label: p.label });
  });
  return shuffle(cards);   /* deal THEN shuffle, not shuffle then pair */
}

function memory() {
  var pool = state.set.items.filter(function (it) { return it.status === 'complete'; });
  var pairs = memChoosePairs(pool, MEM_PAIRS);
  state.mem = { cards: memDeal(pairs), faceUp: [], solved: {}, resolving: false, turns: 0,
                solvedCount: 0, total: pairs.length };
  renderMemory();
}

function renderMemory() {
  var m = state.mem;
  screen(
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' +
    '<span class="tally" id="tally">' + m.solvedCount + ' of ' + m.total + ' found</span>' + soundButton() + '</header>' +
    '<p class="askline" id="askline">' + LINES.memAsk + '</p>' +
    '<section class="deck">' + m.cards.map(function (c) {
      return '<button class="card" data-card="' + c.cardId + '" aria-label="face-down card"></button>';
    }).join('') + '</section>');
  wireSoundButton();
  $('#back').onclick = home;
  Array.prototype.forEach.call(document.querySelectorAll('.card'), function (b) {
    b.onclick = function () { memFlip(b.dataset.card); };
  });
}

function memCard(id) {
  for (var i = 0; i < state.mem.cards.length; i++) {
    if (state.mem.cards[i].cardId === id) return state.mem.cards[i];
  }
  return null;
}

function paintCard(c) {
  var el = $('.card[data-card="' + c.cardId + '"]');
  if (!el) return;
  el.classList.add('up');
  el.setAttribute('aria-label', c.type === 'picture' ? c.label : 'a shadow');
  el.innerHTML = '<img src="' + ART + c.pairId + '/' +
    (c.type === 'picture' ? 'picture' : 'shadow') + '.webp" alt="">';
}

function memFlip(cardId) {
  var m = state.mem, c = memCard(cardId);
  if (!c) return;
  if (m.resolving || m.faceUp.length >= 2) return;   /* locked */
  if (m.solved[c.pairId]) return;
  if (m.faceUp.indexOf(cardId) >= 0) return;         /* already up */

  m.faceUp.push(cardId);
  paintCard(c);
  if (m.faceUp.length < 2) {
    say('memOneMore');
    return;
  }

  var first = memCard(m.faceUp[0]);
  m.turns++;
  /* pairId AND opposite side types -- see the note at the top of this section. */
  if (first.pairId === c.pairId && first.type !== c.type) {
    m.solved[c.pairId] = 1; m.solvedCount++; m.faceUp = [];
    ['#pic', '#sh'].forEach(function (suf) {
      var el = $('.card[data-card="' + c.pairId + suf + '"]');
      if (el) { el.classList.add('found'); el.disabled = true; }
    });
    $('#tally').textContent = m.solvedCount + ' of ' + m.total + ' found';
    say(m.solvedCount === m.total ? 'memAll' : 'memPair');
    sfx('correct');
    if (m.solvedCount === m.total) later(memDone, 900);
    return;
  }

  /* A miss: both stay visible, then flip back. The pause is what makes it a memory game
     -- a child who never sees the wrong card has nothing to remember. Turning over two that
     do not match is how a memory board is explored, not a wrong answer, so this plays the
     quieter 'mismatch' cue rather than 'wrong' -- a silent control here reads as broken, but
     the full wrong-answer buzz would be the constant noise the brief rules out. */
  m.resolving = true;
  say('memMiss');
  sfx('mismatch');
  setTimeout(memResolve, 1300);
}

/* Idempotent, the Math engine's property: safe to call twice, and safe on a timer that
   outlived its board. */
function memResolve() {
  var m = state.mem;
  if (!m || !m.resolving) return;
  m.faceUp.forEach(function (id) {
    var el = $('.card[data-card="' + id + '"]');
    if (el && !el.classList.contains('found')) { el.classList.remove('up'); el.innerHTML = ''; el.setAttribute('aria-label', 'face-down card'); }
  });
  m.faceUp = []; m.resolving = false;
  say('memAsk');
}

function memDone() {
  screen(
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' + soundButton() + '</header>' +
    '<section class="done"><h2>' + LINES.memDone + '</h2>' +
    '<p>' + state.mem.total + ' pictures and their shadows, in ' + state.mem.turns + ' turns.</p>' +
    '<div class="actions"><button class="primary" id="again">New cards</button>' +
    '<button class="secondary" id="pick">Choose another set</button></div></section>');
  wireSoundButton();
  sfx('complete');
  $('#back').onclick = home;
  /* A fresh shuffle, not the same board again. */
  $('#again').onclick = function () { memory(); };
  $('#pick').onclick = home;
}

function finished() {
  screen(
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' + soundButton() + '</header>' +
    '<section class="done"><h2>' + LINES[state.mode === 'mirror' ? 'mirrorDone' : 'findDone'] + '</h2>' +
    '<p>' + state.done + ' shadows matched.</p>' +
    '<div class="actions"><button class="primary" id="again">Play this set again</button>' +
    '<button class="secondary" id="pick">Choose another set</button></div></section>');
  wireSoundButton();
  sfx('complete');
  $('#back').onclick = home;
  $('#again').onclick = function () { startSet(state.set.id); };
  $('#pick').onclick = home;
}

Promise.all([
  fetch('asset-roster.json').then(function (r) { return r.json(); }),
  /* Signatures are only needed by Memory mode, so a failure here must not stop the app:
     sigDistance() treats an unknown shape as different, which degrades to "no fairness
     filtering" rather than to a broken board. */
  fetch('assets-runtime/silhouette-signatures.json').then(function (r) { return r.json(); })
    .catch(function () { return { signatures: {} }; }),
  /* Mirror eligibility is only needed by Mirror Match. Without it the mode is simply not
     offered -- never offered with a guess about which shapes are symmetric. */
  fetch('assets-runtime/mirror-eligibility.json').then(function (r) { return r.json(); })
    .catch(function () { return null; })
]).then(function (res) {
  roster = res[0]; SIGS = res[1].signatures || {};
  MIRROR = res[2] && res[2].objects ? res[2].objects : null;
  home();
}).catch(function () {
  document.getElementById('app').textContent = 'Could not load the shapes.';
});
