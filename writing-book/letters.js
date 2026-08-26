/* Writing Book — letterform geometry.
 *
 * CONCEPT.md §8: each character is defined ONCE. Everything downstream reads this
 * file — the dotted guide the child sees, the animated demonstration, the moving
 * pencil, the start dot, the tolerance corridor, the accuracy check and the
 * coverage check. If the letter shown and the letter graded ever disagree, it is
 * because something stopped reading from here.
 *
 * MODEL: lowercase print (manuscript), single-storey `a` and `g`, straight-tailed
 * `y`. That is not a neutral choice — it matches the printed word on the owner's
 * own vocabulary cards in art/words/, so the letter a child traces is the letter
 * a child reads on the card. Swapping models means rewriting this file and
 * nothing else.
 *
 * COORDINATES: one letter box, y down, four writing lines —
 *
 *     0  ┄┄┄┄┄┄┄┄  ascender   (tall letters: b d f h k l t)
 *    50  ┄┄┄┄┄┄┄┄  midline    (top of x-height)
 *   100  ────────  baseline   (letters sit here)
 *   140  ┄┄┄┄┄┄┄┄  descender  (g j p q y)
 *
 * x starts at 0; `width` is the advance, so words lay out by summing widths.
 *
 * STROKE ORDER IS THE TEACHING. Strokes are graded one at a time, in this order,
 * from this start point, in this direction. Reordering the array changes what the
 * child is taught, so reorder deliberately.
 */
(function (global) {
  'use strict';

  var ASCENDER = 0;
  var MIDLINE = 50;
  var BASELINE = 100;
  var DESCENDER = 140;

  /* Cubic control-point ratio for a 90° circular arc. */
  var K = 0.5522847498;

  function pt(cx, cy, r, deg) {
    var t = deg * Math.PI / 180;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  /* Circular arc as cubics. Screen y points down, so a NEGATIVE sweep runs
     counter-clockwise on screen — the direction handwriting teaches for o, a, c,
     d, e, g and q ("around this way"). Returns the C commands only; the caller
     supplies the starting M or L so an arc can continue an existing stroke. */
  function arcTail(cx, cy, r, startDeg, sweepDeg) {
    var steps = Math.max(1, Math.ceil(Math.abs(sweepDeg) / 90));
    var step = sweepDeg / steps;
    var k = K * (step / 90);
    var d = '';
    for (var i = 0; i < steps; i++) {
      var a0 = startDeg + step * i;
      var a1 = a0 + step;
      var p0 = pt(cx, cy, r, a0);
      var p1 = pt(cx, cy, r, a1);
      /* Unit tangent in the direction of travel. */
      var t0 = [-Math.sin(a0 * Math.PI / 180), Math.cos(a0 * Math.PI / 180)];
      var t1 = [-Math.sin(a1 * Math.PI / 180), Math.cos(a1 * Math.PI / 180)];
      d += ' C ' + round(p0[0] + k * r * t0[0]) + ' ' + round(p0[1] + k * r * t0[1]) +
           ' ' + round(p1[0] - k * r * t1[0]) + ' ' + round(p1[1] - k * r * t1[1]) +
           ' ' + round(p1[0]) + ' ' + round(p1[1]);
    }
    return d.trim();
  }

  function arc(cx, cy, r, startDeg, sweepDeg) {
    var p = pt(cx, cy, r, startDeg);
    return 'M ' + round(p[0]) + ' ' + round(p[1]) + ' ' + arcTail(cx, cy, r, startDeg, sweepDeg);
  }

  /* The x-height bowl shared by a b c d e g o p q. One shape, so they all match. */
  var BOWL_CX = 29, BOWL_CY = 75, BOWL_R = 25;

  function bowl(startDeg) {
    return arc(BOWL_CX, BOWL_CY, BOWL_R, startDeg, -360);
  }

  /* A dot, for i and j. Drawn as a small circle so the same code that renders and
     animates every other stroke also handles it — but it is NOT graded like one.
     A child taps a dot; nobody traces a five-unit circle, and asking them to
     travel round it in the right direction is a test of nothing. `kind: 'dot'`
     tells the grader to accept a touch anywhere on it. */
  var DOT_RADIUS = 5;

  function dot(cx, cy) {
    return { d: arc(cx, cy, DOT_RADIUS, -90, -360), kind: 'dot', centre: [cx, cy], radius: DOT_RADIUS };
  }

  function withDot(spec, cue) {
    return { d: spec.d, kind: spec.kind, centre: spec.centre, radius: spec.radius, cue: cue };
  }

  /* Cues are the short spoken/printed hints from CONCEPT.md §2. Four words, no
     sentences: "Start here", "Down", "Across", "Around". */
  var LETTERS = {
    a: { width: 60, strokes: [
      { d: bowl(-60), cue: 'Around' },
      { d: 'M 54 50 L 54 100', cue: 'Down' }
    ] },
    b: { width: 60, strokes: [
      { d: 'M 4 0 L 4 100', cue: 'Down' },
      { d: 'M 4 50 C 40 50 56 61 56 75 C 56 89 40 100 4 100', cue: 'Around' }
    ] },
    c: { width: 56, strokes: [
      { d: arc(28, 75, 25, -55, -250), cue: 'Around' }
    ] },
    d: { width: 60, strokes: [
      { d: bowl(-60), cue: 'Around' },
      { d: 'M 54 0 L 54 100', cue: 'Down' }
    ] },
    e: { width: 60, strokes: [
      { d: 'M 4 75 L 54 75 ' + arcTail(29, 75, 25, 0, -300), cue: 'Across' }
    ] },
    f: { width: 44, strokes: [
      { d: 'M 38 16 C 38 6 32 2 25 2 C 16 2 13 10 13 20 L 13 100', cue: 'Down' },
      { d: 'M 2 50 L 32 50', cue: 'Across' }
    ] },
    g: { width: 60, strokes: [
      { d: bowl(-60), cue: 'Around' },
      { d: 'M 54 50 L 54 118 C 54 133 44 139 33 138 C 26 137.5 21 135 18 131', cue: 'Down' }
    ] },
    h: { width: 58, strokes: [
      { d: 'M 4 0 L 4 100', cue: 'Down' },
      { d: 'M 4 67 C 4 56 15 50 27 50 C 43 50 53 58 53 72 L 53 100', cue: 'Around' }
    ] },
    i: { width: 26, strokes: [
      { d: 'M 13 50 L 13 100', cue: 'Down' },
      withDot(dot(13, 30), 'Start here')
    ] },
    j: { width: 34, strokes: [
      { d: 'M 22 50 L 22 118 C 22 133 14 139 7 137 C 4 136 2 134 1 132', cue: 'Down' },
      withDot(dot(22, 30), 'Start here')
    ] },
    k: { width: 54, strokes: [
      { d: 'M 4 0 L 4 100', cue: 'Down' },
      { d: 'M 46 50 L 8 79', cue: 'Down' },
      { d: 'M 19 70 L 48 100', cue: 'Down' }
    ] },
    l: { width: 24, strokes: [
      { d: 'M 12 0 L 12 100', cue: 'Down' }
    ] },
    m: { width: 88, strokes: [
      { d: 'M 4 50 L 4 100', cue: 'Down' },
      { d: 'M 4 67 C 4 56 13 50 23 50 C 35 50 43 58 43 72 L 43 100', cue: 'Around' },
      { d: 'M 43 67 C 43 56 52 50 62 50 C 74 50 82 58 82 72 L 82 100', cue: 'Around' }
    ] },
    n: { width: 56, strokes: [
      { d: 'M 4 50 L 4 100', cue: 'Down' },
      { d: 'M 4 67 C 4 56 15 50 27 50 C 43 50 52 58 52 72 L 52 100', cue: 'Around' }
    ] },
    o: { width: 60, strokes: [
      { d: bowl(-90), cue: 'Around' }
    ] },
    p: { width: 60, strokes: [
      { d: 'M 4 50 L 4 140', cue: 'Down' },
      { d: 'M 4 50 C 40 50 56 61 56 75 C 56 89 40 100 4 100', cue: 'Around' }
    ] },
    q: { width: 60, strokes: [
      { d: bowl(-60), cue: 'Around' },
      { d: 'M 54 50 L 54 140', cue: 'Down' }
    ] },
    r: { width: 44, strokes: [
      { d: 'M 4 50 L 4 100', cue: 'Down' },
      { d: 'M 4 69 C 4 57 15 50 27 50 C 32 50 37 51 40 53', cue: 'Around' }
    ] },
    s: { width: 56, strokes: [
      { d: 'M 48 60 C 44 52 37 50 29 50 C 18 50 10 55 10 62 C 10 69 17 73 29 75 ' +
           'C 41 77 48 82 48 89 C 48 96 40 100 30 100 C 21 100 13 97 8 90', cue: 'Around' }
    ] },
    t: { width: 44, strokes: [
      { d: 'M 17 12 L 17 88 C 17 97 23 100 31 100 C 35 100 38 99 41 97', cue: 'Down' },
      { d: 'M 3 50 L 33 50', cue: 'Across' }
    ] },
    u: { width: 56, strokes: [
      { d: 'M 4 50 L 4 84 C 4 94 13 100 25 100 C 37 100 48 94 48 84 L 48 50', cue: 'Down' },
      { d: 'M 48 50 L 48 100', cue: 'Down' }
    ] },
    v: { width: 54, strokes: [
      { d: 'M 4 50 L 26 100 L 48 50', cue: 'Down' }
    ] },
    w: { width: 82, strokes: [
      { d: 'M 4 50 L 22 100 L 40 50 L 58 100 L 76 50', cue: 'Down' }
    ] },
    x: { width: 52, strokes: [
      { d: 'M 4 50 L 48 100', cue: 'Down' },
      { d: 'M 48 50 L 4 100', cue: 'Down' }
    ] },
    /* Both diagonals meet exactly at the baseline vertex (28,100); the second
       carries straight through it into the tail. If they only nearly meet, the
       corridor has a hole in it and a correct trace scores as a miss. */
    y: { width: 56, strokes: [
      { d: 'M 4 50 L 28 100', cue: 'Down' },
      { d: 'M 50 50 L 18 123 C 15 132 8 136 2 133', cue: 'Down' }
    ] },
    z: { width: 52, strokes: [
      { d: 'M 5 50 L 47 50 L 5 100 L 47 100', cue: 'Across' }
    ] },

    /* The only capital in the owner's hundred words is the pronoun I. */
    I: { width: 44, strokes: [
      { d: 'M 8 0 L 36 0', cue: 'Across' },
      { d: 'M 22 0 L 22 100', cue: 'Down' },
      { d: 'M 8 100 L 36 100', cue: 'Across' }
    ] }
  };

  /* Space between letters in a traced word, in letter-box units. */
  var LETTER_GAP = 14;

  function has(ch) {
    return Object.prototype.hasOwnProperty.call(LETTERS, ch);
  }

  /* Lay a word out left to right. Returns the per-letter boxes and the total
     extent, so the writing screen can scale a word to fit the paper. */
  function layout(word) {
    var x = 0;
    var letters = [];
    for (var i = 0; i < word.length; i++) {
      var ch = word[i];
      if (!has(ch)) continue;
      letters.push({ char: ch, x: x, width: LETTERS[ch].width, strokes: LETTERS[ch].strokes });
      x += LETTERS[ch].width + LETTER_GAP;
    }
    return {
      letters: letters,
      width: Math.max(0, x - LETTER_GAP),
      top: ASCENDER,
      bottom: DESCENDER
    };
  }

  /* Every letter a word needs that this file has no geometry for. Empty means the
     word is traceable. */
  function missing(word) {
    var gaps = [];
    for (var i = 0; i < word.length; i++) {
      if (!has(word[i]) && gaps.indexOf(word[i]) === -1) gaps.push(word[i]);
    }
    return gaps;
  }

  global.WritingLetters = {
    ASCENDER: ASCENDER,
    MIDLINE: MIDLINE,
    BASELINE: BASELINE,
    DESCENDER: DESCENDER,
    LETTER_GAP: LETTER_GAP,
    letters: LETTERS,
    has: has,
    layout: layout,
    missing: missing
  };
})(window);
