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
 */
'use strict';

var ART = 'assets-runtime/objects/';
var $ = function (s, r) { return (r || document).querySelector(s); };
var state = { set: null, queue: [], i: 0, misses: 0, done: 0 };
var roster = null;

function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
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
    '<section class="hero"><h1>Shadow Matching</h1><p>Look at the picture. Find its shadow.</p></section>' +
    '<section class="sets">' + cards + '</section>';
  Array.prototype.forEach.call(document.querySelectorAll('.setcard'), function (b) {
    b.onclick = function () { startSet(b.dataset.set); };
  });
}

function startSet(id) {
  var g = roster.groups.filter(function (x) { return x.id === id; })[0];
  state.set = g;
  state.queue = shuffle(g.items.filter(function (it) { return it.status === 'complete'; }).slice());
  state.i = 0; state.done = 0;
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

fetch('asset-roster.json').then(function (r) { return r.json(); }).then(function (d) {
  roster = d; home();
}).catch(function () {
  document.getElementById('app').textContent = 'Could not load the shapes.';
});
