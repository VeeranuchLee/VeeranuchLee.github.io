/* Time Book — the clock engine.
 *
 * One reusable SVG clock. Every chapter in the book is a consumer of this file;
 * nothing else in the app draws a clock face.
 *
 * Two things here are load-bearing teaching decisions, not implementation detail:
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
    this.step = opts.step || 1;          // snap, in minutes, while dragging
    this.draggable = !!opts.draggable;
    this.ring = !!opts.ring;             // §2.2 minute ring visible?
    this.onChange = opts.onChange || null;
    this.minutes = clampMinutes(typeof opts.minutes === 'number' ? opts.minutes : 0);

    this.dragging = null;                // 'hour' | 'minute' | null

    this.build();
    this.render();
    if (this.draggable) this.bindPointer();
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
    this.handLayer = el('g', { class: 'clock-hand-layer' });

    svg.appendChild(this.faceLayer);
    svg.appendChild(this.ringLayer);
    svg.appendChild(this.handLayer);

    /* Hands are drawn as lines with a round cap, plus a wide invisible line on top
       of each as the touch target: a 4.5-unit hand is unhittable by a finger, so
       each hit line is 22 units wide.

       The two hit lines occupy DIFFERENT RADIAL BANDS -- the hour's ends before
       the minute's begins (see HIT_BANDS). Running both from the centre is the
       obvious implementation and the wrong one: the minute hand is longer, so its
       hit line would lie on top of the hour hand's for the hour hand's whole
       length, and whenever the hands were near each other the child would grab
       the minute hand every time. Separate bands mean each hand has a zone that
       is exclusively its own at every angle, including when they overlap. */
    this.hourHand = el('line', { class: 'clock-hand clock-hand--hour' });
    this.minuteHand = el('line', { class: 'clock-hand clock-hand--minute' });
    this.hourHit = el('line', { class: 'clock-hit', 'data-hand': 'hour' });
    this.minuteHit = el('line', { class: 'clock-hit', 'data-hand': 'minute' });

    this.handLayer.appendChild(this.hourHand);
    this.handLayer.appendChild(this.minuteHand);
    this.handLayer.appendChild(this.hourHit);
    this.handLayer.appendChild(this.minuteHit);
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

    setSegment(this.hourHit,
      pointOnFace(angles.hour, HIT_BANDS.hour[0]),
      pointOnFace(angles.hour, HIT_BANDS.hour[1]));
    setSegment(this.minuteHit,
      pointOnFace(angles.minute, HIT_BANDS.minute[0]),
      pointOnFace(angles.minute, HIT_BANDS.minute[1]));

    this.svg.classList.toggle('clock--ring-on', this.ring);
    this.svg.setAttribute('aria-label', 'Clock showing ' + TimeBookClock.spoken(this.minutes));
  };

  /* Grab zones, as [inner radius, outer radius]. Non-overlapping by construction;
     each runs slightly past its hand's tip so the very end of a hand is grabbable.
     The hour hand's zone starts at 18 rather than 0 to keep it clear of the pin. */
  var HIT_BANDS = {
    hour: [18, 52],
    minute: [56, 80]
  };

  function setSegment(node, from, to) {
    node.setAttribute('x1', from.x);
    node.setAttribute('y1', from.y);
    node.setAttribute('x2', to.x);
    node.setAttribute('y2', to.y);
  }

  /* Dragging.
   *
   * Pointer position -> angle from 12 -> minutes. Which hand is being dragged
   * decides how that angle is read, and that difference is itself the lesson:
   * the minute hand's full turn is one hour, the hour hand's full turn is twelve.
   *
   * Dragging the minute hand deliberately drags the hour hand along with it. A
   * child who moves the minutes from :00 to :30 and sees the hour hand slide to
   * half past has discovered the linkage without being told it.
   */
  Clock.prototype.bindPointer = function () {
    var self = this;

    function angleAt(event) {
      var box = self.svg.getBoundingClientRect();
      // A zero-sized box would divide to Infinity and then to NaN. It happens for
      // real -- a clock inside a hidden container, or one being removed mid-drag --
      // so bail instead of poisoning the hand positions.
      if (!box.width || !box.height) return null;
      // getBoundingClientRect is in CSS pixels; the viewBox is 200 wide. Scale
      // through the box rather than assuming a size, so the clock works at any
      // rendered dimension.
      var x = ((event.clientX - box.left) / box.width) * 200 - CENTRE;
      var y = ((event.clientY - box.top) / box.height) * 200 - CENTRE;
      var degrees = Math.atan2(y, x) * 180 / Math.PI + 90;
      return (degrees + 360) % 360;
    }

    function snap(value) {
      return Math.round(value / self.step) * self.step;
    }

    function moveTo(event) {
      var degrees = angleAt(event);
      if (degrees === null) return;
      var next;

      if (self.dragging === 'minute') {
        var hour = Math.floor(self.minutes / 60);
        var minute = snap(degrees / 6) % 60;
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
        next = snap((degrees / 30) * 60);
      }

      self.set(next);
    }

    this.svg.addEventListener('pointerdown', function (event) {
      var hand = event.target.getAttribute && event.target.getAttribute('data-hand');
      if (!hand) return;
      self.dragging = hand;
      self.svg.classList.add('clock--dragging');
      // Capture so a fast drag that leaves the little SVG keeps tracking.
      self.svg.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    this.svg.addEventListener('pointermove', function (event) {
      if (!self.dragging) return;
      moveTo(event);
      event.preventDefault();
    });

    function release(event) {
      if (!self.dragging) return;
      self.dragging = null;
      self.svg.classList.remove('clock--dragging');
      if (self.svg.hasPointerCapture(event.pointerId)) {
        self.svg.releasePointerCapture(event.pointerId);
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
