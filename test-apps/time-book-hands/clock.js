/* Time Book — the clock engine.
 *
 * One reusable SVG clock. Every chapter in the book is a consumer of this file;
 * nothing else in the app draws a clock face.
 *
 * Three things here are load-bearing teaching decisions, not implementation detail:
 *
 * 1. THE HOUR HAND MOVES CONTINUOUSLY. At 3:45 it sits three quarters of the way
 *    from 3 to 4, because that is what a real clock does and because "quarter to
 *    four" is only readable if it does. A clock that snaps the hour hand to the
 *    hour teaches a false mechanism and makes CONCEPT.md §2.4 impossible.
 *
 * 2. THE MINUTE RING IS A SEPARATE LAYER that can be switched on and off. §2.2's
 *    core insight is that "the same clock face contains two overlapping systems".
 *    You cannot show an overlap by drawing it permanently -- the child has to see
 *    the face without it, then with it. So the 00/05/10... ring is its own layer
 *    and `setRing()` fades it in.
 *
 * 3. THE SWEEP IS A DISTANCE, NOT A POSITION. §2.7 is about duration, and the one
 *    thing a still dial cannot show is how far the hand travelled. `setSweep()`
 *    draws that journey as an arc. Read the comment on it before using it: which
 *    hand carries the arc depends on the duration, and getting that wrong draws a
 *    misleading picture rather than a wrong one.
 *
 * 4. THE WHOLE FACE IS THE GRAB SURFACE. A touch anywhere on the dial grabs a
 *    hand -- which one is decided from the touch's angle and radius -- and the
 *    hand follows the finger's angle until release, snapping to the stage's
 *    step only when let go. The 28px hit strips this replaced were too hard for
 *    a young child to land (owner complaint 2026-11-10). See bindPointer.
 *
 * Geometry: viewBox is 0 0 200 200, centre (100,100). 12 o'clock is straight up,
 * angles increase clockwise, and every angle in this file is in degrees measured
 * from 12 o'clock -- NOT the SVG/maths convention of 0 = 3 o'clock. Conversion to
 * screen coordinates happens in one place (`pointOnFace`) so the offset is applied
 * exactly once.
 */

(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var CENTRE = 100;

  var ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  /* Roman-numeral clocks overwhelmingly use IIII, not IV, for four o'clock --
     it balances the VIII opposite it. Kept deliberately: §2.5 is about reading
     real clocks, and a real clock face says IIII. */

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    return node;
  }

  /* Degrees clockwise from 12 -> a point at `radius` from the centre. */
  function pointOnFace(degrees, radius) {
    var radians = (degrees - 90) * Math.PI / 180;
    return {
      x: CENTRE + radius * Math.cos(radians),
      y: CENTRE + radius * Math.sin(radians)
    };
  }

  /* Returns null rather than NaN for a non-finite input. NaN would sail through
     every comparison below, get written into the hands' coordinates, and leave the
     clock permanently stuck with no way back -- `NaN % 720` is NaN, so even a
     later valid set() could not repair it. Callers treat null as "no change". */
  function clampMinutes(total) {
    if (typeof total !== 'number' || !isFinite(total)) return null;
    var wrapped = total % 720;
    return wrapped < 0 ? wrapped + 720 : wrapped;
  }

  /* The single source of truth for what the hands do, given minutes-since-12.
     Hour hand: 30 degrees per hour plus half a degree per minute -- that half
     degree is the continuous movement described at the top of this file. */
  function handAngles(minutesSince12) {
    return {
      hour: (minutesSince12 / 60) * 30,
      minute: (minutesSince12 % 60) * 6
    };
  }

  function Clock(host, options) {
    var opts = options || {};

    this.host = host;
    this.face = opts.face || 'numbers';
    this.step = opts.step || 1;          // snap, in minutes, on release
    this.draggable = !!opts.draggable;
    this.ring = !!opts.ring;             // §2.2 minute ring visible?
    this.onChange = opts.onChange || null;
    this.minutes = clampMinutes(typeof opts.minutes === 'number' ? opts.minutes : 0);

    this.dragging = null;                // 'hour' | 'minute' | null
    this.dragDegrees = null;             // the finger's last angle while dragging

    this.build();
    this.render();
    if (this.draggable) { this.bindPointer(); this.bound = true; }
  }

  Clock.prototype.build = function () {
    var svg = el('svg', {
      viewBox: '0 0 200 200',
      class: 'clock' + (this.draggable ? ' clock--draggable' : ''),
      role: 'img'
    });

    /* The rim is a 10-unit band (87..97) rather than a thin edge, because the
       minute ring is drawn inside it -- see drawRing. */
    svg.appendChild(el('circle', { class: 'clock-rim', cx: CENTRE, cy: CENTRE, r: 97 }));
    svg.appendChild(el('circle', { class: 'clock-dial', cx: CENTRE, cy: CENTRE, r: 87 }));

    this.faceLayer = el('g', { class: 'clock-face-layer' });
    this.ringLayer = el('g', { class: 'clock-ring-layer' });
    /* Between the face and the hands on purpose: §2.7's arc has to sit on top of
       the numerals it spans and underneath the hands, or a hand lying along the
       arc disappears into it. */
    this.sweepLayer = el('g', { class: 'clock-sweep-layer' });
    this.handLayer = el('g', { class: 'clock-hand-layer' });

    svg.appendChild(this.faceLayer);
    svg.appendChild(this.ringLayer);
    svg.appendChild(this.sweepLayer);
    svg.appendChild(this.handLayer);

    /* Hands are drawn as lines with a round cap. There are no invisible hit
       lines any more: the hit strips they drew were 28px wide on the iPad and a
       young child could not land one (owner complaint 2026-11-10). The whole
       face is the grab surface now, and bindPointer decides which hand a touch
       means from the touch's own angle and radius. */
    this.hourHand = el('line', { class: 'clock-hand clock-hand--hour' });
    this.minuteHand = el('line', { class: 'clock-hand clock-hand--minute' });

    this.handLayer.appendChild(this.hourHand);
    this.handLayer.appendChild(this.minuteHand);
    this.handLayer.appendChild(el('circle', { class: 'clock-pin', cx: CENTRE, cy: CENTRE, r: 6 }));

    this.svg = svg;
    this.host.appendChild(svg);

    this.drawFace();
    this.drawRing();
  };

  /* §2.5 -- the five faces a child should be able to read. Everything except the
     labels is shared, so a bare face is genuinely the same clock with the labels
     removed rather than a different drawing. */
  Clock.prototype.drawFace = function () {
    var layer = this.faceLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    var face = this.face;
    var i;

    if (face === 'ticks' || face === 'bare' || face === 'numbers' || face === 'roman') {
      // Minute ticks: 60 of them, every fifth one long. A bare face keeps none.
      if (face !== 'bare') {
        for (i = 0; i < 60; i += 1) {
          var major = i % 5 === 0;
          var outer = pointOnFace(i * 6, 84);
          var inner = pointOnFace(i * 6, major ? 74 : 79);
          layer.appendChild(el('line', {
            class: 'clock-tick' + (major ? ' clock-tick--major' : ''),
            x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y
          }));
        }
      }
    }

    if (face === 'numbers' || face === 'roman') {
      for (i = 0; i < 12; i += 1) {
        var at = pointOnFace(i * 30, 62);
        var label = el('text', {
          class: 'clock-numeral' + (face === 'roman' ? ' clock-numeral--roman' : ''),
          x: at.x, y: at.y,
          'text-anchor': 'middle',
          'dominant-baseline': 'central'
        });
        label.textContent = face === 'roman' ? ROMAN[i] : String(i === 0 ? 12 : i);
        layer.appendChild(label);
      }
    }
  };

  /* §2.2 -- the second system. The same twelve positions, labelled in minutes.
     Drawn once and revealed by a class, so turning it on is a fade rather than a
     redraw: the child should see it arrive on top of the face they were looking
     at, which is the whole point being made. */
  Clock.prototype.drawRing = function () {
    var layer = this.ringLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    for (var i = 0; i < 12; i += 1) {
      /* Centred in the rim band (87..97), not straddling its inner edge. Small
         text sitting half on the cream rim and half on the white dial is markedly
         harder to read than the same text on one flat colour. */
      var at = pointOnFace(i * 30, 92);
      var label = el('text', {
        class: 'clock-minute-label',
        x: at.x, y: at.y,
        'text-anchor': 'middle',
        'dominant-baseline': 'central'
      });
      // Two digits on purpose: 00 and 05 are how a digital clock writes them.
      label.textContent = (i * 5 < 10 ? '0' : '') + (i * 5);
      layer.appendChild(label);
    }
  };

  Clock.prototype.render = function () {
    var angles = handAngles(this.minutes);

    setSegment(this.hourHand, pointOnFace(angles.hour, 0), pointOnFace(angles.hour, 48));
    setSegment(this.minuteHand, pointOnFace(angles.minute, 0), pointOnFace(angles.minute, 76));

    this.svg.classList.toggle('clock--ring-on', this.ring);
    this.svg.setAttribute('aria-label', 'Clock showing ' + TimeBookClock.spoken(this.minutes));
  };

  /* Grab-anywhere tuning, in the same viewBox units as everything else.
     NEAR_DEGREES is how close to BOTH hands a touch must be before radius is
     what decides; INNER_GRAB_RADIUS is roughly the inner 45% of the 97-unit
     rim -- the hour hand's home ground, being short, against the minute hand's
     long outer run. */
  var NEAR_DEGREES = 25;
  var INNER_GRAB_RADIUS = 44;

  function setSegment(node, from, to) {
    node.setAttribute('x1', from.x);
    node.setAttribute('y1', from.y);
    node.setAttribute('x2', to.x);
    node.setAttribute('y2', to.y);
  }

  /* A grab is heard as well as seen, synthesized here -- never a shipped file
     (AUDIO-DIRECTION.md decision 6: interaction sound is runtime WebAudio). One
     pitch per hand, because with grab-anywhere the hand you got is a decision
     the child did not make and the pitch is what tells them which one answered.
     A missing or suspended context is harmless; the drag still works. */
  var audioContext = null;

  function handTick(frequency) {
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!audioContext) audioContext = new Ctor();
      // pointerdown is a user gesture, which is the one moment a suspended
      // context is allowed to wake.
      if (audioContext.state === 'suspended' && audioContext.resume) audioContext.resume();
      var at = audioContext.currentTime;
      var osc = audioContext.createOscillator();
      var gain = audioContext.createGain();
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.055, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(at);
      osc.stop(at + 0.1);
    } catch (err) { /* silence is an acceptable failure */ }
  }

  /* Dragging.
   *
   * A touch ANYWHERE on the dial grabs a hand at once and the hand follows the
   * finger's angle from the centre until release (owner complaint 2026-11-10:
   * the old 28px hit strips were too hard for a young child to land). Which
   * hand a touch grabs is decided from the touch itself: the hand whose angle
   * is nearest, except that within NEAR_DEGREES of both -- the overlapped
   * case, where nearest-angle alone is a coin flip -- the radius decides,
   * because inside the inner 45% the short hour hand is what is under the
   * finger and outside it the long minute hand is.
   *
   * Which hand is being dragged decides how the angle is read, and that
   * difference is itself the lesson: the minute hand's full turn is one hour,
   * the hour hand's full turn is twelve. Dragging the minute hand deliberately
   * drags the hour hand along with it. A child who moves the minutes from :00
   * to :30 and sees the hour hand slide to half past has discovered the linkage
   * without being told it.
   *
   * While dragged, the time is rounded to whole minutes (so a readout never
   * shows a fraction) but NOT snapped -- the hand tracks the finger freely.
   * The snap to the stage's step happens on RELEASE, so Check's exact
   * comparison is forgiving: a child who lets go near the mark lands on it.
   */
  Clock.prototype.bindPointer = function () {
    var self = this;

    /* Pointer position -> angle from 12 and radius from the centre, in viewBox
       units. A zero-sized box would divide to Infinity and then to NaN. It
       happens for real -- a clock inside a hidden container, or one being
       removed mid-drag -- so bail instead of poisoning the hand positions. */
    function locate(event) {
      var box = self.svg.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      // getBoundingClientRect is in CSS pixels; the viewBox is 200 wide. Scale
      // through the box rather than assuming a size, so the clock works at any
      // rendered dimension.
      var x = ((event.clientX - box.left) / box.width) * 200 - CENTRE;
      var y = ((event.clientY - box.top) / box.height) * 200 - CENTRE;
      var degrees = Math.atan2(y, x) * 180 / Math.PI + 90;
      return {
        degrees: (degrees + 360) % 360,
        radius: Math.sqrt(x * x + y * y)
      };
    }

    /* Shortest way round the circle between two angles from 12. */
    function angleBetween(a, b) {
      var d = Math.abs(a - b) % 360;
      return d > 180 ? 360 - d : d;
    }

    function pickHand(degrees, radius) {
      // Steps that hide the minute hand outright have only one answer.
      if (self.svg.classList.contains('clock--hour-only')) return 'hour';
      var angles = handAngles(self.minutes);
      var toHour = angleBetween(degrees, angles.hour);
      var toMinute = angleBetween(degrees, angles.minute);
      if (toHour < NEAR_DEGREES && toMinute < NEAR_DEGREES) {
        return radius < INNER_GRAB_RADIUS ? 'hour' : 'minute';
      }
      return toHour <= toMinute ? 'hour' : 'minute';
    }

    function snap(value) {
      return Math.round(value / self.step) * self.step;
    }

    function applyAngle(degrees, snapNow) {
      var next;

      if (self.dragging === 'minute') {
        var hour = Math.floor(self.minutes / 60);
        var minute = snapNow ? snap(degrees / 6) % 60 : Math.round(degrees / 6) % 60;
        next = hour * 60 + minute;
        /* Crossing 12 with the minute hand should roll the hour, the way winding
           a real clock does. Without this the hand jumps backwards over the top
           and the hour never changes, which feels broken and teaches nothing. */
        var previous = self.minutes % 60;
        if (previous > 45 && minute < 15) next += 60;
        else if (previous < 15 && minute > 45) next -= 60;
      } else {
        // The hour hand carries its minutes with it: 30 degrees per hour, and
        // anything between two numerals is a real part-hour, not a rounding error.
        // Rounded to whole minutes like the minute branch, so a readout can never
        // show a fraction while the hand itself still tracks the finger smoothly.
        next = Math.round(degrees * 2);
        if (snapNow) next = snap(next);
      }

      self.set(next);
    }

    this.svg.addEventListener('pointerdown', function (event) {
      if (!self.draggable || self.dragging) return;
      // Mouse keeps left-button drags; touch and pen report button 0 anyway.
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      var at = locate(event);
      if (!at) return;

      self.dragging = pickHand(at.degrees, at.radius);
      self.dragDegrees = at.degrees;
      self.svg.classList.add('clock--dragging', 'clock--grab-' + self.dragging);
      // Capture so a fast drag that leaves the little SVG keeps tracking.
      try { self.svg.setPointerCapture(event.pointerId); } catch (err) {}
      event.preventDefault();
      // The hand goes to the finger at once. Waiting for a pointermove is why
      // a touch used to feel dead: a quick tap never moved anything.
      applyAngle(at.degrees, false);
      handTick(self.dragging === 'minute' ? 715 : 495);
    });

    this.svg.addEventListener('pointermove', function (event) {
      if (!self.dragging) return;
      var at = locate(event);
      if (!at) return;
      self.dragDegrees = at.degrees;
      applyAngle(at.degrees, false);
      event.preventDefault();
    });

    function release(event) {
      if (!self.dragging) return;
      /* Snap to the stage's step where the child let go -- BEFORE `dragging` is
         cleared, because applyAngle reads it to know whose rule applies. On
         pointercancel the last tracked angle is the best place to settle. */
      var before = self.minutes;
      if (self.dragDegrees !== null) applyAngle(self.dragDegrees, true);
      var moved = self.minutes !== before;
      self.dragging = null;
      self.dragDegrees = null;
      self.svg.classList.remove('clock--dragging', 'clock--grab-hour', 'clock--grab-minute');
      if (moved) handTick(392);
      if (event && self.svg.hasPointerCapture &&
          self.svg.hasPointerCapture(event.pointerId)) {
        try { self.svg.releasePointerCapture(event.pointerId); } catch (err) {}
      }
    }

    this.svg.addEventListener('pointerup', release);
    this.svg.addEventListener('pointercancel', release);
  };

  Clock.prototype.set = function (minutesSince12, quiet) {
    var next = clampMinutes(minutesSince12);
    if (next === null || next === this.minutes) return;
    this.minutes = next;
    this.render();
    if (this.onChange && !quiet) this.onChange(next);
  };

  Clock.prototype.setFace = function (face) {
    this.face = face;
    this.drawFace();
  };

  Clock.prototype.setRing = function (on) {
    this.ring = !!on;
    this.render();
  };

  Clock.prototype.setStep = function (step) {
    this.step = step;
  };

  Clock.prototype.setDraggable = function (on) {
    this.draggable = !!on;
    this.svg.classList.toggle('clock--draggable', this.draggable);
    if (on && !this.bound) {
      this.bindPointer();
      this.bound = true;
    }
  };

  /* ------------------------------------------------------------------ *
   * The sweep -- CONCEPT.md §2.7's duration, drawn as a piece of the circle.
   *
   * Elapsed time is the one thing in this book a still clock cannot show. A dial
   * reading 4:15 is a position; "twenty-five minutes" is a distance, and a child
   * who only ever subtracts digits never sees that it is a distance. So the
   * journey gets drawn: an arc from where the hand set off to where it arrived.
   *
   * WHICH HAND CARRIES THE ARC follows the duration, because the two hands do not
   * share a scale. Under an hour the minute hand is the whole story -- six degrees
   * a minute, and the arc is unmistakable. At an hour and over, the minute hand's
   * arc is a full turn or more and says nothing, while the hour hand's own travel
   * is exactly the readable quantity. So: the minute hand's circle under an hour,
   * the hour hand's at an hour and above.
   *
   * That switch is also a trap for the caller. Two durations either side of the
   * hour draw on DIFFERENT circles at different degrees-per-minute, so a
   * fifty-five minute arc looks five times longer than a one-hour arc. Never put
   * two sweeps side by side unless both durations are on the same side of 60.
   *
   * Only ever called to explain an answer, never to pose a question: an arc from
   * start to finish is the answer to "how long?" drawn in one stroke.
   * ------------------------------------------------------------------ */

  /* Each arc runs at its own hand's TIP rather than somewhere inside it, so the arc
     is literally the path that hand's point traced: hour hand 48 long, minute hand
     76. The minute arc at 68 runs in the clear channel between the numerals at 62
     and the ticks at 74.

     The hour radius was 40 first, and one hour came out as 19px of arc on a 250px
     dial — nearly invisible on the step where one hour is the SMALLEST journey there
     is. At 52 the same hour is 27px and sits on the hour hand's tip, which is the
     more honest picture anyway. */
  var SWEEP_RADIUS = { minute: 68, hour: 52 };

  Clock.prototype.setSweep = function (fromMinutes, durationMinutes) {
    this.clearSweep();

    var from = clampMinutes(fromMinutes);
    if (from === null || typeof durationMinutes !== 'number' ||
        !isFinite(durationMinutes) || durationMinutes <= 0) return;

    var onMinuteHand = durationMinutes < 60;
    var radius = onMinuteHand ? SWEEP_RADIUS.minute : SWEEP_RADIUS.hour;
    var angles = handAngles(from);
    var startAngle = onMinuteHand ? angles.minute : angles.hour;

    /* Six degrees per minute for the minute hand, half a degree for the hour hand:
       the same two rates handAngles uses, so the arc cannot disagree with the hands
       it is drawn between. Stopped just short of a full turn -- an arc whose two
       ends coincide draws nothing at all. */
    var sweep = Math.min(durationMinutes * (onMinuteHand ? 6 : 0.5), 359);

    /* An arrowhead at the finish rather than a second dot. A fifty-five minute
       journey is almost a full turn, and with a plain dot at each end "nearly all
       the way round" and "a short hop backwards" look identical -- which loses the
       one thing a duration cannot be read without. The head is measured in units of
       ARC rather than degrees, so it comes out the same size on either circle. */
    var head = (11 / radius) * 180 / Math.PI;
    /* Stop the stroke short of the tip: its round cap would otherwise poke out past
       the arrowhead by half its own width. */
    var arcSweep = Math.max(sweep - head * 0.5, 0.1);

    var began = pointOnFace(startAngle, radius);
    var ended = pointOnFace(startAngle + arcSweep, radius);
    var tip = pointOnFace(startAngle + sweep, radius);
    var wingIn = pointOnFace(startAngle + sweep - head, radius - 6.5);
    var wingOut = pointOnFace(startAngle + sweep - head, radius + 6.5);

    this.sweepLayer.appendChild(el('path', {
      class: 'clock-sweep',
      d: 'M ' + began.x + ' ' + began.y +
         ' A ' + radius + ' ' + radius + ' 0 ' + (arcSweep > 180 ? 1 : 0) + ' 1 ' +
         ended.x + ' ' + ended.y
    }));

    /* Hollow, and only at the start: where the hand set off. */
    this.sweepLayer.appendChild(el('circle', {
      class: 'clock-sweep-end', cx: began.x, cy: began.y, r: 5
    }));
    this.sweepLayer.appendChild(el('path', {
      class: 'clock-sweep-head',
      d: 'M ' + tip.x + ' ' + tip.y + ' L ' + wingOut.x + ' ' + wingOut.y +
         ' L ' + wingIn.x + ' ' + wingIn.y + ' Z'
    }));
  };

  Clock.prototype.clearSweep = function () {
    var layer = this.sweepLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
  };

  /* ------------------------------------------------------------------ *
   * Naming -- CONCEPT.md §2.4, "one time can have several names".
   * ------------------------------------------------------------------ */

  var WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six',
               'seven', 'eight', 'nine', 'ten', 'eleven'];

  var MINUTE_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
    'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
    'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five',
    'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty'];

  function hourWord(hourIndex) {
    return WORDS[((hourIndex % 12) + 12) % 12];
  }

  function digital(minutesSince12) {
    var hour = Math.floor(minutesSince12 / 60) % 12;
    var minute = minutesSince12 % 60;
    return (hour === 0 ? 12 : hour) + ':' + (minute < 10 ? '0' : '') + minute;
  }

  /* Every correct spoken name for a time, most-common first. The book asks the
     child to recognise that these are the same time, so the app has to know all
     of them rather than one "right answer". */
  function names(minutesSince12) {
    var hour = Math.floor(minutesSince12 / 60) % 12;
    var minute = minutesSince12 % 60;
    var thisHour = hourWord(hour);
    var nextHour = hourWord(hour + 1);
    var out = [];

    if (minute === 0) return [thisHour + " o'clock"];

    // "X fifteen" style always works.
    out.push(thisHour + ' ' + spokenMinutes(minute));

    if (minute === 15) out.push('quarter past ' + thisHour);
    if (minute === 30) out.push('half past ' + thisHour);
    if (minute === 45) out.push('quarter to ' + nextHour);

    if (minute < 30) {
      out.push(minutePhrase(minute) + ' past ' + thisHour);
    } else if (minute > 30) {
      out.push(minutePhrase(60 - minute) + ' to ' + nextHour);
    }

    return out;
  }

  /* "one minute", not "one minutes". The book is teaching a child what to say out
     loud, so it has to be sayable -- 12:59 is "one minute to one". */
  function minutePhrase(count) {
    return MINUTE_WORDS[count] + (count === 1 ? ' minute' : ' minutes');
  }

  /* "three oh five" for 3:05, "three twenty" for 3:20 -- how the digital reading
     is actually said aloud. */
  function spokenMinutes(minute) {
    if (minute < 10) return 'oh ' + MINUTE_WORDS[minute];
    if (minute <= 30) return MINUTE_WORDS[minute];
    if (minute < 40) return 'thirty-' + MINUTE_WORDS[minute - 30];
    if (minute === 40) return 'forty';
    if (minute < 50) return 'forty-' + MINUTE_WORDS[minute - 40];
    if (minute === 50) return 'fifty';
    return 'fifty-' + MINUTE_WORDS[minute - 50];
  }

  function spoken(minutesSince12) {
    return names(minutesSince12)[0];
  }

  global.TimeBookClock = {
    Clock: Clock,
    names: names,
    spoken: spoken,
    digital: digital,
    handAngles: handAngles,
    clampMinutes: clampMinutes
  };
}(window));
