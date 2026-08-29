/* Writing Book — the stroke engine.
 *
 * Reads letters.js and does the jobs CONCEPT.md §8 says must share one geometry:
 * draw the dotted guide, animate the demonstration, show where to start, follow
 * the child's finger, and grade what they wrote.
 *
 * TWO MODES, from the owner's page sketch of 2026-08-26. A word appears twice on
 * the page, one above the other:
 *
 *   mode: 'model'   the finished word in ink. Tap it and a hand writes it,
 *                   stroke by stroke, in the taught order. Nothing to touch.
 *   mode: 'trace'   the same word as a pale ghost under a dotted line. This is
 *                   the row the child writes on, and the only one that grades.
 *
 * Both are built from the same letters.js data, so the word demonstrated above
 * and the word graded below cannot drift apart.
 *
 * GRADING (CONCEPT.md §5). Touching the letter is not passing. Every stroke is
 * scored on four numbers, and all four have to clear their threshold:
 *
 *   accuracy   how much of the CHILD'S line sits inside the corridor
 *              — low when they scribble across the target
 *   coverage   how much of the TARGET the child actually travelled over
 *              — low when they trace half the letter and stop
 *   direction  how steadily they moved from the start of the stroke to its end
 *              — low when they go backwards, or write the letter upside down
 *   start      how close the first touch was to the green start dot
 *
 * Accuracy alone passes a scribble. Coverage alone passes a scribble too. The
 * pair is the point.
 *
 * LIFTING IS OPTIONAL. One pointerdown→pointerup used to mean exactly one
 * stroke, so a child who wrote a whole d in one motion — around, up, down — had
 * the entire gesture graded against the bowl alone: rejected at level 3, and at
 * levels 1 and 2 given a tick for the bowl and then asked to draw the stem
 * again over a d they had already finished. Either way the screen and the check
 * disagreed. A gesture is now read against the LETTER by readGesture below:
 * first as a run of consecutive strokes of that letter, and failing that as one
 * stroke, which is what this engine always did. Nothing is loosened to do it —
 * every portion of a run faces the same four scores at the same thresholds, and
 * a lifted stroke finds no run and is graded exactly as before. All that is new
 * is where one gesture may be cut.
 *
 * TOLERANCE is a wide invisible corridor around a thin pretty guide
 * (CONCEPT.md §4), widened again for a finger over a stylus. All of it is in
 * LEVELS below — one table, so tuning the difficulty never means reading this
 * file.
 */
(function (global) {
  'use strict';

  var L = global.WritingLetters;

  /* Difficulty. Distances are letter-box units: the x-height is 50 of them and a
     lowercase body from ascender to baseline is 100. */
  var LEVELS = {
    /* Level 1's direction floor is 0.62, not the 0.55 it started at: a random
       scribble scores about 0.5 by chance alone, and 0.55 left no daylight —
       qc/grading.html caught scribbles passing on h and p. */
    1: { corridor: 20, startRadius: 36, accuracy: 0.60, coverage: 0.70, direction: 0.62 },
    2: { corridor: 14, startRadius: 27, accuracy: 0.70, coverage: 0.80, direction: 0.66 },
    3: { corridor: 10, startRadius: 20, accuracy: 0.79, coverage: 0.86, direction: 0.76 }
  };

  /* A finger is blunter than a pencil, so it gets a wider corridor at every
     level rather than a level of its own (CONCEPT.md §4). */
  var FINGER_BONUS = 4;

  /* Reading one gesture as several strokes (readRun). The BRIDGE is the ink a
     continuous hand necessarily lays down travelling from the end of one stroke
     to the start of the next — the climb from the seam of a d's bowl up to the
     top of its stem. It belongs to no target, so it is discarded rather than
     graded against either, and it is bounded so a scribble cannot hide in it:
     no longer than the straight-line gap between the two strokes plus half
     again, and never less than one corridor's worth of wobble for the letters
     whose strokes already touch. */
  var BRIDGE_SLACK = 1.5;

  /* How near the end of a stroke counts as having finished it, as a fraction of
     that stroke's samples. */
  var TAIL_FRACTION = 0.06;

  /* However many bridges a gesture has, they may not add up to more than this
     share of it. The per-bridge cap above bounds each hop geometrically, but on
     a letter whose strokes nearly touch — the bowl and stem of an a are thirteen
     units apart — that cap is small enough to be cleared by the first point of a
     long detour, which would then land in the NEXT stroke's trail instead of
     being discarded. This is the guard that actually stops a scribble being cut
     into a lucky piece with the rest thrown away: a run has to account for most
     of the ink the child laid down. */
  var BRIDGE_SHARE = 1 / 3;

  /* A run is only believed when it explains the gesture as more than one
     stroke. If it can only account for one, the single-stroke reading already
     had its say and stands — so a child who traces the bowl and then scribbles
     cannot bank the bowl. */
  var MIN_RUN = 2;

  var SAMPLE_SPACING = 2;   // letter units between samples, target and child alike
  var MIN_SAMPLES = 16;
  var PAD = 14;             // breathing room around the word inside the viewBox
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
    }
    return node;
  }

  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* Walk a live <path> at a fixed spacing. The path must be in the document —
     getPointAtLength needs layout. */
  function samplePath(path) {
    var total = path.getTotalLength();
    var count = Math.max(MIN_SAMPLES, Math.ceil(total / SAMPLE_SPACING));
    var out = [];
    for (var i = 0; i <= count; i++) {
      var p = path.getPointAtLength(total * i / count);
      out.push({ x: p.x, y: p.y });
    }
    out.totalLength = total;
    return out;
  }

  /* Even out the child's raw pointer trail. A slow finger emits a hundred points
     in one corner and would otherwise dominate every average. */
  function resample(points) {
    if (points.length < 2) return points.slice();
    var out = [points[0]];
    var carry = 0;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      var seg = dist(a, b);
      if (seg === 0) continue;
      var walked = SAMPLE_SPACING - carry;
      while (walked <= seg) {
        var t = walked / seg;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        walked += SAMPLE_SPACING;
      }
      carry = (seg - (walked - SAMPLE_SPACING)) % SAMPLE_SPACING;
    }
    out.push(points[points.length - 1]);
    return out;
  }

  /* Index of the target sample nearest to p, and how far away it is. */
  function nearest(target, p) {
    var best = 0, bestD = Infinity;
    for (var i = 0; i < target.length; i++) {
      var d = dist(target[i], p);
      if (d < bestD) { bestD = d; best = i; }
    }
    return { index: best, distance: bestD };
  }

  /* The same, but searching only near where the child had got to.
   *
   * A letter that crosses itself breaks the unrestricted version. The bar of an
   * e runs straight through the loop that comes after it, so a child tracing the
   * bar sits on top of target samples from much later in the stroke, and their
   * progress reads as though they had already been round the loop. Half an e
   * scored 0.84 and passed.
   *
   * Writing is monotonic — a child moves along the stroke, not around it — so
   * matching within a window that follows them is both truer and immune to the
   * crossing. The window is wide enough to absorb a wobble or a small backtrack. */
  /* Does this stroke close on itself? Its first and last samples then sit on the
     same spot, so "the end" is not a different place from "the start". Exactly
     five strokes in the alphabet do: the bowls of a, d, g, q and the o. NOT the
     loop of an e — an e is one stroke that starts on the bar and ends below the
     loop, 43 units apart. The threshold is safe because nothing sits near it: the
     five meet at 0.00 and the nearest open stroke is the bar of an I at 28.
     qc/grading.html checks that gap rather than trusting it, so a new letterform
     cannot quietly land in between. */
  function isClosed(target) {
    return target.length > 2 &&
      dist(target[0], target[target.length - 1]) <= SAMPLE_SPACING;
  }

  /* Where the child's FIRST touch landed on the target. This one searches the
     whole stroke — a window would clamp a child who started half way along back
     to the window's edge and score them as though they had begun at the start.
     Ties go to the earliest index, and near-ties count as ties: on a letter that
     crosses itself the true start and a later crossing are the same point to
     within a rounding error, and the start is the honest reading. */
  function nearestStart(target, p) {
    var bestD = Infinity;
    for (var i = 0; i < target.length; i++) {
      bestD = Math.min(bestD, dist(target[i], p));
    }
    var tail = target.length - 1 - Math.max(2, Math.round(target.length * TAIL_FRACTION));
    for (var j = 0; j < target.length; j++) {
      if (dist(target[j], p) > bestD + 1.5) continue;
      /* On a CLOSED stroke, a first touch that lands a hair behind the seam is
         genuinely nearest to the stroke's last samples, and the near-tie band
         above is too narrow to reach back across the seam — a finger is 2.5 units
         wobbly and the sample two before the seam is 4 units round the arc. Mapped
         there, the child begins where the stroke ends: the cursor starts at the
         tail, nearestAhead can only look backwards from it, and a perfectly good o
         travels nowhere. It failed on coverage 8.7% of the time on a d's bowl.

         A stroke cannot begin already finished. On an open stroke a first touch at
         the far end is real information — the child started at the wrong end, and
         direction is meant to catch it. On a closed one the far end IS the start,
         so the tail carries no information beyond "they began near the seam", and
         index 0 is the honest reading. Nothing is loosened by this: where the child
         actually began is checked separately, by `start` against startRadius, and
         the distance returned here is the true one to target[0]. */
      if (j >= tail && isClosed(target)) return { index: 0, distance: dist(target[0], p) };
      return { index: j, distance: dist(target[j], p) };
    }
    return { index: 0, distance: bestD };
  }

  function nearestAhead(target, p, cursor) {
    var window = Math.max(8, Math.round(target.length * 0.25));
    var lo = Math.max(0, cursor - window);
    var hi = Math.min(target.length - 1, cursor + window);
    var best = lo, bestD = Infinity;
    for (var i = lo; i <= hi; i++) {
      var d = dist(target[i], p);
      if (d < bestD) { bestD = d; best = i; }
    }
    return { index: best, distance: bestD };
  }

  /* A dot is graded as a touch, not as a stroke. The dot on an i is five units
     across; asking a child to travel round it in the taught direction tests
     nothing they are learning, and the four stroke scores are meaningless at
     that size. Touch it and it is done. */
  function scoreDot(target, raw, tuning) {
    var centre = { x: 0, y: 0 };
    target.forEach(function (p) { centre.x += p.x / target.length; centre.y += p.y / target.length; });
    var closest = Infinity;
    for (var i = 0; i < raw.length; i++) closest = Math.min(closest, dist(raw[i], centre));
    var reach = tuning.corridor;
    return {
      accuracy: closest <= reach ? 1 : 0,
      coverage: closest <= reach ? 1 : 0,
      direction: 1,
      start: closest,
      pass: closest <= reach,
      reason: closest <= reach ? null : 'start'
    };
  }

  function score(target, raw, tuning, kind) {
    if (kind === 'dot') return scoreDot(target, raw, tuning);

    var child = resample(raw);
    if (child.length < 2) {
      return { pass: false, reason: 'tooShort', accuracy: 0, coverage: 0, direction: 0, start: Infinity };
    }

    var corridor = tuning.corridor;
    var onTarget = 0;
    var indices = [];
    var cursor = 0;
    for (var i = 0; i < child.length; i++) {
      var n = i === 0 ? nearestStart(target, child[0]) : nearestAhead(target, child[i], cursor);
      if (n.distance <= corridor) onTarget++;
      indices.push(n.index);
      cursor = n.index;
    }
    var accuracy = onTarget / child.length;

    /* Coverage is measured two ways and the worse one counts.
     *
     * `reached` is how much of the target has a child point near it. On its own
     * it is fooled by short strokes: the crossbar of an f is thirty units long
     * and the corridor is twenty-four, so one stab in the middle sits within
     * corridor of the whole bar and "covers" it. Every short stroke in the
     * alphabet passed on a single tap.
     *
     * `travelled` is how far along the target the child actually got, summed as
     * forward progress through the target's samples. It has no length scale in
     * it, so it behaves the same on the stem of a b and the bowl of an o: a stab
     * travels nothing, half a letter travels half.
     *
     * Taking the smaller keeps both failures covered — a child who touches only
     * the two ends travels the whole way but reaches almost none of it.
     *
     * Progress is summed step by step rather than taken as (highest − lowest).
     * On a closed letter — o, and the loop of an e — the first and last samples
     * sit on top of each other, so one jittered point at the seam matches the far
     * end of the path and the span reads as the whole letter. Half an o scored
     * 0.82 and passed. Summing forward steps has no seam to trip over.
     */
    var covered = 0;
    for (var j = 0; j < target.length; j++) {
      if (nearest(child, target[j]).distance <= corridor) covered++;
    }
    var reached = covered / target.length;

    /* One pass for both: how far forward the child got, and how steadily.
       Retracing a little is normal and only costs a fraction of direction. */
    var progress = 0, forward = 0, steps = 0;
    for (var k = 1; k < indices.length; k++) {
      if (indices[k] === indices[k - 1]) continue;
      steps++;
      if (indices[k] > indices[k - 1]) {
        forward++;
        progress += indices[k] - indices[k - 1];
      }
    }
    var travelled = Math.min(1, progress / target.length);
    var direction = steps === 0 ? 0 : forward / steps;

    var coverage = Math.min(reached, travelled);

    var start = dist(child[0], target[0]);

    var result = {
      accuracy: accuracy,
      coverage: coverage,
      direction: direction,
      start: start,
      pass: false,
      reason: null
    };

    /* Order matters: report the most useful thing to fix first. Starting in the
       wrong place is the one a child can correct instantly. */
    if (start > tuning.startRadius) result.reason = 'start';
    else if (direction < tuning.direction) result.reason = 'direction';
    else if (coverage < tuning.coverage) result.reason = 'coverage';
    else if (accuracy < tuning.accuracy) result.reason = 'accuracy';
    else result.pass = true;
    return result;
  }

  /* ---- reading one gesture as several strokes --------------------------- */

  function centroid(points) {
    var c = { x: 0, y: 0 };
    for (var i = 0; i < points.length; i++) {
      c.x += points[i].x / points.length;
      c.y += points[i].y / points.length;
    }
    return c;
  }

  /* The first moment the child's trail reaches the end of this stroke: the
     earliest sample that is both inside the corridor and mapped to the stroke's
     tail. FIRST, not last — on a d the child climbs from the bowl's seam up to
     the stem and then comes back DOWN past that same seam, twelve units away
     from it, so the last such sample would cut the gesture half way down the
     stem and hand the bowl a trail it never drew. Returns -1 when the child
     never got to the end, which is the honest answer: there is no run to read,
     and the single-stroke reading stands. */
  function firstAtEnd(target, child, corridor) {
    var tail = target.length - 1 - Math.max(2, Math.round(target.length * TAIL_FRACTION));
    var cursor = 0;
    for (var i = 0; i < child.length; i++) {
      var n = i === 0 ? nearestStart(target, child[0]) : nearestAhead(target, child[i], cursor);
      cursor = n.index;
      if (n.index >= tail && n.distance <= corridor) return i;
    }
    return -1;
  }

  function firstWithin(child, centre, reach) {
    for (var i = 0; i < child.length; i++) {
      if (dist(child[i], centre) <= reach) return i;
    }
    return -1;
  }

  /* Where one gesture stops being this stroke and starts being the next, or
     null when it cannot honestly be read that way. The ink between the two is
     the bridge and is thrown away — neither stroke is scored on it. */
  function splitAt(stroke, next, child, tuning) {
    /* A dot is finished the moment it is touched; it has no end to reach. */
    var cut = stroke.kind === 'dot'
      ? firstWithin(child, centroid(stroke.samples), tuning.corridor)
      : firstAtEnd(stroke.samples, child, tuning.corridor);
    if (cut < 0 || cut >= child.length - 2) return null;

    var begins = next.samples[0];
    var gap = dist(stroke.samples[stroke.samples.length - 1], begins);
    var allowance = Math.max(tuning.corridor, gap * BRIDGE_SLACK);

    /* Walk the bridge and take the point that comes CLOSEST to where the next
       stroke begins — not the first point inside the start radius. On a b the
       child retraces the stem upwards from the baseline, and every point of
       that climb is already within the radius of the bowl's start; cutting at
       the first would hand the bowl a trail beginning half way down it, which
       nearestStart then maps to the bowl's far end and reads as backwards. */
    var walked = 0, at = -1, best = Infinity;
    for (var i = cut + 1; i < child.length; i++) {
      walked += dist(child[i - 1], child[i]);
      if (walked > allowance) break;
      var d = dist(child[i], begins);
      if (d < best) { best = d; at = i; }
    }
    if (at < 0 || best > tuning.startRadius) return null;
    /* Nothing left to be the next stroke: this was an overshoot, not a run. */
    if (child.length - at < 4) return null;

    var bridge = 0;
    for (var k = cut + 1; k <= at; k++) bridge += dist(child[k - 1], child[k]);

    return { prefix: child.slice(0, cut + 1), rest: child.slice(at), bridge: bridge };
  }

  /* Read one gesture as consecutive strokes of ONE letter.
   *
   * Within one letter only. This model is print, not cursive (letters.js), and
   * print lifts between letters; letting a gesture run on into the next letter
   * would also fire that letter's completion sound from the middle of a stroke.
   *
   * Every portion faces the ordinary score() at the ordinary thresholds. If any
   * portion fails, the whole reading is abandoned rather than partly banked. */
  function readRun(letterStrokes, from, raw, tuning) {
    var child = resample(raw);
    if (child.length < 4) return null;

    var drawn = 0;
    for (var i = 1; i < child.length; i++) drawn += dist(child[i - 1], child[i]);

    var results = [];
    var at = from;
    var trail = child;
    var bridged = 0;

    while (at < letterStrokes.length - 1) {
      var split = splitAt(letterStrokes[at], letterStrokes[at + 1], trail, tuning);
      if (!split) break;
      bridged += split.bridge;
      if (bridged > drawn * BRIDGE_SHARE) return null;
      var part = score(letterStrokes[at].samples, split.prefix, tuning, letterStrokes[at].kind);
      if (!part.pass) return null;
      results.push(part);
      trail = split.rest;
      at++;
    }
    if (!results.length) return null;

    /* A dot ends a run only if what is left is the size of a tap.
     *
     * scoreDot asks one question — did any point come near the centre — because
     * it is written for a gesture that IS a tap. At the tail of a run that is a
     * hole with no floor: an i is a zero-width line in a box ten units across,
     * so every point of a scribble inside it sits in the corridor, and the run
     * reader was handing the dot two thousand units of scribble and being told
     * it had been touched. Accuracy and coverage bound the ink a real stroke can
     * absorb; nothing bounds a dot's, so bound it here. */
    if (letterStrokes[at].kind === 'dot') {
      var ink = 0;
      for (var j = 1; j < trail.length; j++) ink += dist(trail[j - 1], trail[j]);
      if (ink > letterStrokes[at].samples.totalLength + tuning.corridor * 2) return null;
    }

    /* Whatever is left has to be the last stroke of the run, in full. */
    var last = score(letterStrokes[at].samples, trail, tuning, letterStrokes[at].kind);
    if (!last.pass) return null;
    results.push(last);

    return results.length >= MIN_RUN ? results : null;
  }

  /* What one pointerdown→pointerup means: how many strokes it satisfied, and
     the result to say out loud.
   *
   * The RUN is read first, and this order matters. A continuous a never leaves
   * the bowl's corridor — the stem of an a sits eleven units from the bowl it
   * hangs off — so the single-stroke reading PASSES the whole gesture and would
   * bank one stroke for a child who plainly wrote two, leaving them to draw the
   * stem again over their own finished letter. Whichever reading accounts for
   * more of what the child drew is the truer one, and a run only ever wins by
   * clearing the ordinary thresholds on every portion of itself.
   *
   * A lifted stroke has no run to find, falls through to the single-stroke
   * reading, and is graded bit-for-bit as it was before runs existed. */
  function readGesture(letterStrokes, from, raw, tuning) {
    var run = readRun(letterStrokes, from, raw, tuning);
    if (run) return { completed: run.length, result: run[run.length - 1], results: run };

    var solo = score(letterStrokes[from].samples, raw, tuning, letterStrokes[from].kind);
    return { completed: solo.pass ? 1 : 0, result: solo, results: [solo] };
  }

  function create(options) {
    var svg = options.svg;
    var word = options.word;
    var level = options.level || 1;
    var mode = options.mode === 'model' ? 'model' : 'trace';
    var wantGuides = options.guides !== false && mode === 'trace';
    var handlers = {
      onStroke: options.onStroke || function () {},
      onLetter: options.onLetter || function () {},
      onWord: options.onWord || function () {},
      onProgress: options.onProgress || function () {}
    };

    var layout = L.layout(word);
    var strokes = [];       // flat, in teaching order, across the whole word
    var current = 0;
    var drawing = null;
    var pointerIsPen = false;
    var demoTimer = null;
    var demoChain = null;
    var watchdog = null;
    var active = mode === 'trace';
    var finished = false;

    /* ---- build the surface -------------------------------------------- */

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    /* add, never set: the page has already put its own layout class on this
       element, and replacing the attribute drops it. */
    svg.classList.add('wb', 'wb--' + mode);
    svg.setAttribute('viewBox', [
      -PAD, L.ASCENDER - PAD, layout.width + PAD * 2, (L.DESCENDER - L.ASCENDER) + PAD * 2
    ].join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');

    if (wantGuides) {
      var lines = el('g', { class: 'wb-guides' });
      [[L.ASCENDER, 'dashed'], [L.MIDLINE, 'dashed'], [L.BASELINE, 'solid'], [L.DESCENDER, 'dashed']]
        .forEach(function (row) {
          lines.appendChild(el('line', {
            class: 'wb-guide wb-guide--' + row[1],
            x1: -PAD, y1: row[0], x2: layout.width + PAD, y2: row[0]
          }));
        });
      svg.appendChild(lines);
    }

    layout.letters.forEach(function (letter, letterIndex) {
      var g = el('g', { transform: 'translate(' + letter.x + ' 0)' });
      letter.strokes.forEach(function (def, strokeIndex) {
        /* Three layers on the same path. The ghost is a pale solid letter so a
           child can see WHICH letter it is from across the room; the dotted
           guide sits on top of it and says where the line runs; `done` is the
           ink — drawn as the trace is accepted, or already complete on a model
           row. */
        var ghost = el('path', { class: 'wb-ghost', d: def.d });
        var guide = el('path', { class: 'wb-target', d: def.d });
        var done = el('path', { class: 'wb-done', d: def.d });
        g.appendChild(ghost);
        g.appendChild(guide);
        g.appendChild(done);
        strokes.push({
          letterIndex: letterIndex,
          strokeIndex: strokeIndex,
          char: letter.char,
          cue: def.cue,
          kind: def.kind || 'stroke',
          offsetX: letter.x,
          ghost: ghost,
          guide: guide,
          done: done,
          samples: null
        });
      });
      svg.appendChild(g);
    });

    var inkLayer = el('g', { class: 'wb-ink-layer' });
    svg.appendChild(inkLayer);

    var demoDot = el('circle', { class: 'wb-demo-dot', r: 9, cx: 0, cy: 0, opacity: 0 });
    svg.appendChild(demoDot);

    var startDot = null;
    if (mode === 'trace') {
      startDot = el('circle', { class: 'wb-start-dot', r: 10, cx: 0, cy: 0 });
      svg.appendChild(startDot);
    }

    /* Sampling has to wait until the paths are in the document. Samples are in
       the letter's own space, so shift them by the letter's x offset once. */
    strokes.forEach(function (stroke) {
      var local = samplePath(stroke.guide);
      var moved = local.map(function (p) { return { x: p.x + stroke.offsetX, y: p.y }; });
      moved.totalLength = local.totalLength;
      stroke.samples = moved;
      stroke.done.style.strokeDasharray = local.totalLength;
      stroke.done.style.strokeDashoffset = mode === 'model' ? 0 : local.totalLength;
    });

    /* ---- geometry helpers --------------------------------------------- */

    function toLocal(event) {
      var ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      var p = svg.createSVGPoint();
      p.x = event.clientX;
      p.y = event.clientY;
      var q = p.matrixTransform(ctm.inverse());
      return { x: q.x, y: q.y };
    }

    function tuning() {
      var base = LEVELS[level] || LEVELS[1];
      return {
        corridor: base.corridor + (pointerIsPen ? 0 : FINGER_BONUS),
        startRadius: base.startRadius + (pointerIsPen ? 0 : FINGER_BONUS),
        accuracy: base.accuracy,
        coverage: base.coverage,
        direction: base.direction
      };
    }

    /* ---- the current stroke ------------------------------------------- */

    function showCurrent() {
      if (mode !== 'trace') return;
      strokes.forEach(function (s, i) {
        s.guide.classList.toggle('is-current', i === current && active);
        s.guide.classList.toggle('is-waiting', i > current);
      });
      if (current >= strokes.length || !active) {
        startDot.setAttribute('opacity', 0);
        return;
      }
      var at = strokes[current].samples[0];
      startDot.setAttribute('cx', at.x);
      startDot.setAttribute('cy', at.y);
      startDot.setAttribute('opacity', 1);
      handlers.onProgress({
        index: current,
        total: strokes.length,
        char: strokes[current].char,
        cue: strokes[current].cue
      });
    }

    /* The strokes of the letter the child is standing in, and where in them
       they are. A gesture may run on through these and no further. */
    function letterRun() {
      var li = strokes[current].letterIndex;
      var first = current;
      while (first > 0 && strokes[first - 1].letterIndex === li) first--;
      var list = [];
      for (var i = first; i < strokes.length && strokes[i].letterIndex === li; i++) {
        list.push(strokes[i]);
      }
      return { list: list, from: current - first };
    }

    function completeStroke() {
      var stroke = strokes[current];
      stroke.done.style.transition = 'stroke-dashoffset 260ms ease-out';
      stroke.done.style.strokeDashoffset = 0;
      stroke.guide.classList.add('is-finished');
      stroke.ghost.classList.add('is-finished');

      var letterIndex = stroke.letterIndex;
      current++;
      var letterFinished = current >= strokes.length || strokes[current].letterIndex !== letterIndex;
      if (letterFinished) handlers.onLetter(layout.letters[letterIndex].char);

      if (current >= strokes.length) {
        startDot.setAttribute('opacity', 0);
        finished = true;
        active = false;
        svg.classList.add('is-finished');
        handlers.onWord(word);
      } else {
        showCurrent();
      }
    }

    /* ---- drawing ------------------------------------------------------- */

    function beginDraw(event) {
      if (!active || finished || current >= strokes.length) return;
      stopDemo();
      /* Capture keeps the trail alive when a finger slides off the paper. It is
         not essential, and it throws for pointer ids the browser is not tracking,
         so a failure here must not lose the stroke. */
      try { svg.setPointerCapture(event.pointerId); } catch (e) { /* no capture */ }
      pointerIsPen = event.pointerType === 'pen';
      var path = el('path', { class: 'wb-ink' });
      inkLayer.appendChild(path);
      drawing = { points: [toLocal(event)], path: path, pointerId: event.pointerId };
      renderInk();
      event.preventDefault();
    }

    function moveDraw(event) {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      drawing.points.push(toLocal(event));
      renderInk();
      event.preventDefault();
    }

    function renderInk() {
      var d = drawing.points.map(function (p, i) {
        return (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
      }).join(' ');
      drawing.path.setAttribute('d', d);
    }

    function endDraw(event) {
      if (!drawing || event.pointerId !== drawing.pointerId) return;
      var attempt = drawing;
      drawing = null;
      try { svg.releasePointerCapture(event.pointerId); } catch (e) { /* already gone */ }

      var stroke = strokes[current];
      var run = letterRun();
      /* One stroke if they lifted, several if they did not — readGesture makes
         that the child's choice rather than a rule they cannot see. */
      var read = readGesture(run.list, run.from, attempt.points, tuning());
      var result = read.result;
      result.char = stroke.char;
      result.cue = stroke.cue;
      result.strokes = read.completed;

      if (read.completed) {
        /* The child's own wobble fades as the clean stroke draws itself in —
           they see what they made, tidied, rather than a red mark. */
        attempt.path.classList.add('is-accepted');
        window.setTimeout(function () {
          if (attempt.path.parentNode) attempt.path.parentNode.removeChild(attempt.path);
        }, 320);
        for (var n = 0; n < read.completed; n++) completeStroke();
      } else {
        attempt.path.classList.add('is-rejected');
        window.setTimeout(function () {
          if (attempt.path.parentNode) attempt.path.parentNode.removeChild(attempt.path);
        }, 420);
        startDot.classList.add('is-nudging');
        window.setTimeout(function () { startDot.classList.remove('is-nudging'); }, 700);
      }
      handlers.onStroke(result);
    }

    if (mode === 'trace') {
      svg.addEventListener('pointerdown', beginDraw);
      svg.addEventListener('pointermove', moveDraw);
      svg.addEventListener('pointerup', endDraw);
      svg.addEventListener('pointercancel', endDraw);
    }

    /* ---- demonstration -------------------------------------------------- */

    /* Where the demonstration stands at a given progress, 0 to 1: how much of a
       stroke is inked and where the leading dot sits. A pure function of
       progress, so the QC harness can step it frame by frame — the preview pane
       keeps pages hidden and never runs requestAnimationFrame, which would
       otherwise make this the one part of the engine nothing can check. */
    function paintDemo(stroke, progress) {
      var total = stroke.samples.totalLength;
      stroke.done.style.strokeDashoffset = total * (1 - progress);
      var at = stroke.guide.getPointAtLength(total * progress);
      demoDot.setAttribute('cx', at.x + stroke.offsetX);
      demoDot.setAttribute('cy', at.y);
    }

    function hideInk(from) {
      strokes.forEach(function (s, i) {
        if (i >= from) {
          s.done.style.transition = 'none';
          s.done.style.strokeDashoffset = s.samples.totalLength;
        }
      });
    }

    function stopDemo() {
      if (demoTimer) { cancelAnimationFrame(demoTimer); demoTimer = null; }
      if (demoChain) { clearTimeout(demoChain); demoChain = null; }
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      demoDot.setAttribute('opacity', 0);
      strokes.forEach(function (s) { s.guide.classList.remove('is-demoing'); });
      /* Put the ink back the way this row is meant to sit at rest: a model row
         shows the finished word, a trace row shows only what has been earned. */
      if (mode === 'model') {
        strokes.forEach(function (s) {
          s.done.style.transition = 'none';
          s.done.style.strokeDashoffset = 0;
        });
      } else {
        hideInk(current);
      }
    }

    /* Animate one stroke, then call done(). */
    function runStroke(index, speed, done) {
      var stroke = strokes[index];
      var total = stroke.samples.totalLength;
      var duration = Math.max(600, total * (speed === 'slow' ? 14 : 6));
      var startedAt = null;

      stroke.guide.classList.add('is-demoing');
      stroke.done.style.transition = 'none';
      demoDot.setAttribute('opacity', 1);
      paintDemo(stroke, 0);

      function frame(now) {
        if (startedAt === null) startedAt = now;
        var t = Math.min(1, (now - startedAt) / duration);
        var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        paintDemo(stroke, eased);
        if (t < 1) {
          demoTimer = requestAnimationFrame(frame);
        } else {
          demoTimer = null;
          stroke.guide.classList.remove('is-demoing');
          done();
        }
      }
      demoTimer = requestAnimationFrame(frame);
    }

    /* Write the stroke the child is on. Used by the trace row. */
    function demo(speed) {
      stopDemo();
      if (mode !== 'trace' || current >= strokes.length) return;
      runStroke(current, speed, function () {
        demoChain = window.setTimeout(function () {
          demoChain = null;
          demoDot.setAttribute('opacity', 0);
          hideInk(current);
        }, 520);
      });
    }

    /* Put the row back to how it sits at rest. A model row must end up showing
       the finished word whatever happens: it is the reference the child copies,
       and a blank reference row is worse than no animation at all. */
    function settle() {
      if (watchdog) { clearTimeout(watchdog); watchdog = null; }
      if (demoTimer) { cancelAnimationFrame(demoTimer); demoTimer = null; }
      if (demoChain) { clearTimeout(demoChain); demoChain = null; }
      demoDot.setAttribute('opacity', 0);
      strokes.forEach(function (s) { s.guide.classList.remove('is-demoing'); });
      if (mode === 'model') {
        strokes.forEach(function (s) {
          s.done.style.transition = 'none';
          s.done.style.strokeDashoffset = 0;
        });
      } else {
        hideInk(current);
      }
    }

    /* Write the whole word from blank, stroke by stroke, in teaching order.
       This is what the "how to" row does when it is tapped. */
    function demoWord(speed) {
      stopDemo();
      /* requestAnimationFrame does not fire while the document is hidden — a
         backgrounded app, or a preview pane. Blanking the word and waiting for
         frames that never arrive would leave the row empty, so skip straight to
         the finished state. */
      if (document.hidden) { settle(); return; }

      hideInk(0);
      var budget = strokes.reduce(function (total, s) {
        return total + Math.max(600, s.samples.totalLength * (speed === 'slow' ? 14 : 6)) + 220;
      }, 800);
      /* If the frames stop coming part-way — the app is backgrounded mid-demo —
         land on the finished word rather than freezing half-written. */
      watchdog = window.setTimeout(settle, budget);

      var i = 0;
      function next() {
        if (i >= strokes.length) {
          if (mode === 'model') {
            settle();
          } else {
            demoDot.setAttribute('opacity', 0);
            demoChain = window.setTimeout(function () { hideInk(current); }, 700);
          }
          return;
        }
        var index = i++;
        runStroke(index, speed, function () {
          /* A beat between strokes, so lifting the pencil is visible. */
          demoChain = window.setTimeout(function () { demoChain = null; next(); }, 220);
        });
      }
      next();
    }

    function destroy() {
      stopDemo();
      if (mode === 'trace') {
        svg.removeEventListener('pointerdown', beginDraw);
        svg.removeEventListener('pointermove', moveDraw);
        svg.removeEventListener('pointerup', endDraw);
        svg.removeEventListener('pointercancel', endDraw);
      }
    }

    showCurrent();

    return {
      demo: demo,
      demoWord: demoWord,
      stopDemo: stopDemo,
      destroy: destroy,
      strokeCount: strokes.length,
      isFinished: function () { return finished; },

      /* Only the active row takes input and shows a green start dot; the rest of
         the page stays visible but quiet, so a child always knows where they
         are. */
      setActive: function (on) {
        if (finished) return;
        active = !!on;
        svg.classList.toggle('is-active', active);
        showCurrent();
      },

      /* Park a demonstration at a fixed progress instead of playing it. Used by
         qc/engine.html; the app itself always calls demo() or demoWord(). */
      demoSeek: function (index, progress) {
        var stroke = strokes[Math.min(index, strokes.length - 1)];
        stroke.done.style.transition = 'none';
        demoDot.setAttribute('opacity', 1);
        paintDemo(stroke, progress);
        return {
          char: stroke.char,
          dot: [+demoDot.getAttribute('cx'), +demoDot.getAttribute('cy')],
          inked: stroke.samples.totalLength * progress,
          total: stroke.samples.totalLength
        };
      },

      /* The stroke the child is on, in page coordinates — the QC harness traces
         against this. */
      currentSamples: function () {
        return current < strokes.length ? strokes[current].samples : null;
      },

      /* Skip the stroke the child is stuck on. The page decides when to offer
         this; the engine only makes it possible. */
      giveStroke: function () {
        if (current < strokes.length) completeStroke();
      },
      setLevel: function (next) { level = next; }
    };
  }

  global.WritingStrokes = {
    create: create,
    LEVELS: LEVELS,
    /* exposed for the QC harness, which grades synthetic traces */
    score: score,
    readGesture: readGesture,
    readRun: readRun,
    samplePath: samplePath
  };
})(window);
