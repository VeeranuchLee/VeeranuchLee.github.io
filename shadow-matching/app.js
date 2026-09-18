/* Shadow Matching — the game.
 *
 * WHAT IT ASKS. One picture, three shadows, one tap. The child is never asked to search,
 * drag or type: "games ask, children answer" is the house rule and this is its simplest
 * possible shape.
 *
 * WHERE THE DIFFICULTY COMES FROM. Not from timers and not from how many choices there
 * are -- always three -- but from WHICH shadows sit beside the right one. asset-roster.json
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
var state = { set: null, queue: [], i: 0, misses: 0, done: 0, mode: 'find', pick: null, pairs: 0, mem: null };
var roster = null;

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
  var cards = roster.groups.map(function (g) {
    var done = g.items.filter(function (it) { return it.status === 'complete'; }).length;
    return '<button class="setcard" data-set="' + g.id + '">' +
      '<img class="setart" src="' + ART + g.items[0].id + '/shadow.webp" alt="" aria-hidden="true">' +
      '<strong>' + g.title + '</strong>' +
      '<small>' + done + ' to find</small></button>';
  }).join('');
  document.getElementById('app').innerHTML =
    '<header class="topline"><a class="hub" href="https://veeranuchlee.github.io/test-apps/">&larr; Test Hub</a></header>' +
    '<section class="hero"><h1>Shadow Matching</h1><p>Look at the picture. Find its shadow.</p>' +
    '<div class="modes" role="group" aria-label="How to play">' +
      '<button class="mode' + (state.mode === 'find' ? ' on' : '') + '" data-mode="find">One at a time</button>' +
      '<button class="mode' + (state.mode === 'board' ? ' on' : '') + '" data-mode="board">Match the board</button>' +
      '<button class="mode' + (state.mode === 'memory' ? ' on' : '') + '" data-mode="memory">Remember</button>' +
    '</div></section>' +
    '<section class="sets">' + cards + '</section>';
  Array.prototype.forEach.call(document.querySelectorAll('.setcard'), function (b) {
    b.onclick = function () { startSet(b.dataset.set); };
  });
  Array.prototype.forEach.call(document.querySelectorAll('.mode'), function (b) {
    b.onclick = function () { state.mode = b.dataset.mode; home(); };
  });
}

function startSet(id) {
  var g = roster.groups.filter(function (x) { return x.id === id; })[0];
  state.set = g;
  state.queue = shuffle(g.items.filter(function (it) { return it.status === 'complete'; }).slice());
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
  var others = shuffle(state.set.items.filter(function (it) {
    return it.id !== answer.id && it.status === 'complete';
  })).slice(0, 3);
  var choices = shuffle([answer].concat(others));

  document.getElementById('app').innerHTML =
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' +
    '<span class="progress" aria-label="' + (state.i + 1) + ' of ' + state.queue.length + '">' +
    state.queue.map(function (_, n) {
      return '<i class="' + (n < state.i ? 'on' : n === state.i ? 'now' : '') + '"></i>';
    }).join('') + '</span></header>' +
    '<section class="stage">' +
      '<div class="subject"><img src="' + ART + answer.id + '/picture.webp" alt="' + answer.label + '"></div>' +
      '<p class="askline" id="askline">Which shadow belongs to it?</p>' +
      '<div class="choices">' + choices.map(function (c) {
        return '<button class="choice" data-id="' + c.id + '" aria-label="shadow choice">' +
          '<img src="' + ART + c.id + '/shadow.webp" alt=""></button>';
      }).join('') + '</div>' +
    '</section>';

  $('#back').onclick = home;
  Array.prototype.forEach.call(document.querySelectorAll('.choice'), function (b) {
    b.onclick = function () { pick(b, answer); };
  });
}

function pick(btn, answer) {
  if (btn.dataset.id === answer.id) {
    btn.classList.add('right');
    if (!reduceMotion()) btn.classList.add('pop');
    $('#askline').textContent = 'Yes — that is its shadow.';
    Array.prototype.forEach.call(document.querySelectorAll('.choice'), function (b) { b.disabled = true; });
    state.done++; state.i++;
    setTimeout(ask, 900);
    return;
  }
  state.misses++;
  btn.classList.add('wrong');
  btn.disabled = true;

  if (state.misses === 2) {
    /* Threshold one: teach the rule, and ONLY that. No dimming -- see the note at the top
       of this file. A real choice must still be standing or the rule teaches nothing. */
    $('#askline').textContent = 'Look at the edge shape, not the colour.';
  } else if (state.misses >= 3) {
    /* Threshold two: reveal. */
    var right = $('.choice[data-id="' + answer.id + '"]');
    if (right) right.classList.add('right');
    $('#askline').textContent = 'This one is its shadow.';
    Array.prototype.forEach.call(document.querySelectorAll('.choice'), function (b) { b.disabled = true; });
    state.i++;
    setTimeout(ask, 1600);
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

  document.getElementById('app').innerHTML =
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' +
    '<span class="tally" id="tally">0 of ' + BOARD_PAIRS + ' matched</span></header>' +
    '<p class="askline" id="askline">Tap a picture, then tap its shadow.</p>' +
    '<section class="board">' +
      '<div class="col">' + left.map(function (it) {
        return '<button class="tile pic" data-id="' + it.id + '" aria-label="' + it.label + '">' +
          '<img src="' + ART + it.id + '/picture.webp" alt=""></button>';
      }).join('') + '</div>' +
      '<div class="col">' + right.map(function (it) {
        return '<button class="tile sh" data-id="' + it.id + '" aria-label="a shadow">' +
          '<img src="' + ART + it.id + '/shadow.webp" alt=""></button>';
      }).join('') + '</div>' +
    '</section>';

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
    $('#askline').textContent = b.classList.contains('pic')
      ? 'Now tap its shadow.' : 'Now tap the picture it belongs to.';
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
    $('#askline').textContent = state.pairs === BOARD_PAIRS
      ? 'Every one matched.' : 'Yes. Tap another picture.';
    if (state.pairs === BOARD_PAIRS) setTimeout(boardDone, 800);
    return;
  }

  /* A wrong pair. Both let go and the board says what to look at -- it never removes a
     tile, because on a board the child is choosing among things that are all still true
     answers for some other tile. Taking one away would be lying about the puzzle. */
  b.classList.add('nope');
  setTimeout(function () { b.classList.remove('nope'); }, 420);
  a.classList.remove('chosen');
  state.pick = null;
  $('#askline').textContent = 'Not that one. Look at the edge shape.';
}

function boardDone() {
  document.getElementById('app').innerHTML =
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button></header>' +
    '<section class="done"><h2>You matched the whole board.</h2>' +
    '<p>' + BOARD_PAIRS + ' pictures and their shadows.</p>' +
    '<div class="actions"><button class="primary" id="again">Another board</button>' +
    '<button class="secondary" id="pick">Choose another set</button></div></section>';
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
  document.getElementById('app').innerHTML =
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button>' +
    '<span class="tally" id="tally">' + m.solvedCount + ' of ' + m.total + ' found</span></header>' +
    '<p class="askline" id="askline">Turn over two cards. Find a picture and its shadow.</p>' +
    '<section class="deck">' + m.cards.map(function (c) {
      return '<button class="card" data-card="' + c.cardId + '" aria-label="face-down card"></button>';
    }).join('') + '</section>';
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
    $('#askline').textContent = 'Now turn over one more.';
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
    $('#askline').textContent = m.solvedCount === m.total
      ? 'You found every one.' : 'A pair. Turn over two more.';
    if (m.solvedCount === m.total) setTimeout(memDone, 900);
    return;
  }

  /* A miss: both stay visible, then flip back. The pause is what makes it a memory game
     -- a child who never sees the wrong card has nothing to remember. */
  m.resolving = true;
  $('#askline').textContent = 'Not a pair. Remember where they are.';
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
  $('#askline').textContent = 'Turn over two cards. Find a picture and its shadow.';
}

function memDone() {
  document.getElementById('app').innerHTML =
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button></header>' +
    '<section class="done"><h2>You found every pair.</h2>' +
    '<p>' + state.mem.total + ' pictures and their shadows, in ' + state.mem.turns + ' turns.</p>' +
    '<div class="actions"><button class="primary" id="again">New cards</button>' +
    '<button class="secondary" id="pick">Choose another set</button></div></section>';
  $('#back').onclick = home;
  /* A fresh shuffle, not the same board again. */
  $('#again').onclick = function () { memory(); };
  $('#pick').onclick = home;
}

function finished() {
  document.getElementById('app').innerHTML =
    '<header class="topline"><button class="hub" id="back">&larr; Sets</button></header>' +
    '<section class="done"><h2>You found them all.</h2>' +
    '<p>' + state.done + ' shadows matched.</p>' +
    '<div class="actions"><button class="primary" id="again">Play this set again</button>' +
    '<button class="secondary" id="pick">Choose another set</button></div></section>';
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
    .catch(function () { return { signatures: {} }; })
]).then(function (res) {
  roster = res[0]; SIGS = res[1].signatures || {};
  home();
}).catch(function () {
  document.getElementById('app').textContent = 'Could not load the shapes.';
});
