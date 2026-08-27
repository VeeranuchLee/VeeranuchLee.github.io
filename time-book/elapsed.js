/* Time Book — §2.7, elapsed time: the questions, without the screen.
 *
 * WHY THIS IS ITS OWN FILE when c1, c2 and c3 keep their question generators
 * inside app.js: those generators cannot really be wrong. `everyHour()` returns a
 * whole hour and that is the end of it. This chapter's can be wrong in ways nobody
 * would see:
 *
 *   - a journey that runs past twelve, on a dial with no am or pm, makes "how long
 *     was it?" a question with two honest answers;
 *   - two options that render the same words means one correct answer is marked
 *     wrong;
 *   - distractors on the wrong grain make every step as hard as the last one, which
 *     is exactly the bug c2 shipped -- its "o'clock" step offered 8:55 against 9:00
 *     and the whole seven-step ladder was fiction;
 *   - two durations either side of an hour drawn as arcs side by side show the
 *     shorter one as longer (see `setSweep` in clock.js).
 *
 * Every one of those looks like a working app. So the arithmetic lives here, behind
 * one entry point, and `tools/check-elapsed.js` runs thousands of questions through
 * it and asserts the invariants. app.js does the DOM and nothing else.
 *
 * Nothing in this file touches the document.
 */

(function (global) {
  'use strict';

  var CLOCK = global.TimeBookClock;

  /* Scenarios, so a duration is something happening rather than a sum. `min` and
     `max` bound what the thing may plausibly last, and they are load-bearing: a
     fifteen-minute film or a four-hour walk to school is exactly the detail a child
     notices and a question generator does not.

     Every name is written to follow "How long is ___?", so no step has to bend its
     grammar around a plural. */
  var DOINGS = [
    { emoji: '🚗', name: 'the drive to the pool', min: 10, max: 45 },
    { emoji: '🚶', name: 'the walk to school',    min: 10, max: 30 },
    { emoji: '🧁', name: 'baking time',           min: 15, max: 40 },
    { emoji: '📚', name: 'reading time',          min: 15, max: 45 },
    { emoji: '🧩', name: 'the puzzle',            min: 20, max: 60 },
    { emoji: '🎹', name: 'the piano lesson',      min: 30, max: 60 },
    { emoji: '🏊', name: 'the swim',              min: 30, max: 90 },
    { emoji: '🎬', name: 'the film',              min: 75, max: 135 },
    { emoji: '🎂', name: 'the party',             min: 60, max: 180 },
    { emoji: '🚂', name: 'the train ride',        min: 45, max: 180 }
  ];

  /* Five steps, graded by the ARITHMETIC rather than by the reading:
   *
   *   s1  whole hours        3:00 + 2 hours   -- no minute work at all
   *   s2  inside the hour    3:20 + 25 min    -- add minutes, hour untouched
   *   s3  past the hour      3:50 + 25 min    -- always crosses; the real step
   *   s4  how long was it?   3:50 -> 4:15     -- the duration is the unknown
   *   s5  which is longer?   two of them      -- compare two durations
   *
   * `hint` is a RULE, never an answer. app.js shows it after two misses -- the
   * threshold this repository settled on is that a hint which teaches may speak at
   * two misses, while one that hands over the answer waits for three. Nothing here
   * waits for three, because a wrong tap is answered on the spot anyway.
   *
   * `show` is the dial each menu card previews, with a journey already drawn on it. */
  var STEPS = [
    { key: 's1', name: 'Whole hours',      note: 'Two hours later.',        grain: 60,
      hint: 'The short hand counts hours. One number is one hour.',
      show: { at: 180, lasting: 120 } },
    { key: 's2', name: 'Inside the hour',  note: 'The hour stays put.',     grain: 5,
      hint: 'The hour does not change. Count only the minutes.',
      show: { at: 200, lasting: 25 } },
    { key: 's3', name: 'Past the hour',    note: 'Over the top and on.',    grain: 5,
      hint: 'Count on to the next o’clock first. Then count the rest.',
      show: { at: 230, lasting: 25 } },
    { key: 's4', name: 'How long was it?', note: 'Start, finish, how far.', grain: 5,
      hint: 'Count up to the o’clock. Then on to the second clock.',
      show: { at: 190, lasting: 40 } },
    { key: 's5', name: 'Which is longer?', note: 'Two of them. Compare.',   grain: 5,
      hint: 'Work out each one on its own. Then compare the two.',
      show: { at: 175, lasting: 50 } }
  ];

  /* ------------------------------------------------------------------ *
   * Small pieces
   * ------------------------------------------------------------------ */

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = out[i];
      out[i] = out[j];
      out[j] = swap;
    }
    return out;
  }

  /* On a grid, inclusive, and null when the window holds nothing -- callers must
     handle that rather than receive a silently clamped value. */
  function pickOnGrid(low, high, grain) {
    var first = Math.ceil(low / grain);
    var last = Math.floor(high / grain);
    if (last < first) return null;
    return (first + Math.floor(Math.random() * (last - first + 1))) * grain;
  }

  function sentenceCase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /* "25 minutes", "1 hour", "1 hour 5 minutes". Digits rather than number words,
     the same bargain c2 makes on its own option labels: a child recognises "25"
     years before they can read "twenty-five", and the voice says the words anyway. */
  function durationWords(minutes) {
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    var parts = [];
    if (hours) parts.push(hours + (hours === 1 ? ' hour' : ' hours'));
    if (rest || !hours) parts.push(rest + (rest === 1 ? ' minute' : ' minutes'));
    return parts.join(' ');
  }

  /* An activity and a duration that suit each other. Picking the duration first and
     then hunting for something that could last that long is the version that
     produces the fifteen-minute film, so this picks among the activities whose own
     range overlaps the window and lets the chosen one decide the duration. */
  function pickDoing(low, high, grain) {
    var fits = DOINGS.filter(function (doing) {
      return pickOnGrid(Math.max(low, doing.min), Math.min(high, doing.max), grain) !== null;
    });
    var doing = pick(fits.length ? fits : DOINGS);
    var lasting = pickOnGrid(Math.max(low, doing.min), Math.min(high, doing.max), grain);
    return { doing: doing, lasting: lasting === null ? low : lasting };
  }

  function doingFor(lasting) {
    var fits = DOINGS.filter(function (doing) {
      return lasting >= doing.min && lasting <= doing.max;
    });
    return pick(fits.length ? fits : DOINGS);
  }

  /* The three start pickers the steps are built out of, and the only places that
     keep the no-wrap rule.

     `startWithin` keeps the whole journey inside one hour; `startCrossing` forces it
     over an o'clock. Steps 2 and 3 are exactly these two, and step 5 uses both to
     build its trap. All three assume a duration under an hour except
     `startAnywhere`, which is the one to use above that. */
  function startWithin(lasting) {
    var minute = pickOnGrid(0, 55 - lasting, 5);
    return Math.floor(Math.random() * 12) * 60 + (minute === null ? 0 : minute);
  }

  function startCrossing(lasting) {
    var minute = pickOnGrid(65 - lasting, 55, 5);
    /* Eleven hours, not twelve: 11:55 plus anything runs past twelve, and then a
       duration question has two honest answers on a dial with no am or pm. */
    return Math.floor(Math.random() * 11) * 60 + (minute === null ? 55 : minute);
  }

  function startAnywhere(lasting) {
    var minutes = pickOnGrid(0, 715 - lasting, 5);
    return minutes === null ? 0 : minutes;
  }

  /* ------------------------------------------------------------------ *
   * Wrong answers
   * ------------------------------------------------------------------ */

  /* For "what time is it then?".

     THE GRAIN MATTERS AS MUCH AS THE ERROR, and c2's history is why that is written
     down twice in one app: its "o'clock" step once offered 8:55 and 9:05 against
     9:00, which is a five-minute discrimination, so every step of a seven-step
     ladder was equally hard. Same rule here. The whole-hours step gets wrong answers
     on the hour; the five-minute steps get the mistakes that happen at five minutes.

     `from` is the time the child can see on the dial -- the start when the question
     runs forwards, the finish when it runs back. Counting the wrong way from the
     wrong end is a different mistake, so this has to be the shown time rather than
     always the start. */
  function timeDistractors(from, lasting, grain, forwards) {
    var answer = CLOCK.clampMinutes(forwards ? from + lasting : from - lasting);
    var backwards = CLOCK.clampMinutes(forwards ? from - lasting : from + lasting);
    var out = [];

    if (grain >= 60) {
      out.push(CLOCK.clampMinutes(answer + 60));
      out.push(CLOCK.clampMinutes(answer - 60));
      /* Counted the wrong way. On a whole-hour step it is the only mistake that is
         about the duration rather than about reading the dial. */
      out.push(backwards);
      out.push(CLOCK.clampMinutes(answer + 120));
    } else {
      /* Minutes moved, hour left where it was: 3:50 + 25 read as 3:15. This is the
         error step 3 exists for. On a sum that stays inside its hour it comes out
         equal to the answer and the dedupe below drops it, which is correct --
         there is no such mistake to make on step 2. */
      var kept = forwards
        ? Math.floor(from / 60) * 60 + ((from % 60) + lasting) % 60
        : Math.floor(from / 60) * 60 + ((((from % 60) - lasting) % 60) + 60) % 60;
      out.push(CLOCK.clampMinutes(kept));
      out.push(backwards);
      out.push(CLOCK.clampMinutes(answer + 60));
      out.push(CLOCK.clampMinutes(answer + 5));
      out.push(CLOCK.clampMinutes(answer - 5));
    }

    var seen = {};
    seen[answer] = true;
    return out.filter(function (value) {
      if (value === null || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  /* For "how long was it?".

     The reversal is the one that matters: take the two minute figures, subtract the
     smaller from the larger, ignore the hour -- and 3:50 to 4:15 comes out as 35
     minutes instead of 25. It is the commonest wrong answer there is, and offering
     it is what separates a child who has understood the crossing from one who has
     guessed. */
  function durationDistractors(start, finish, lasting) {
    var out = [
      Math.abs((finish % 60) - (start % 60)),
      lasting + 60,
      lasting - 60,
      lasting + 5,
      lasting - 5,
      lasting + 10
    ];

    var seen = {};
    seen[lasting] = true;
    return out.filter(function (value) {
      if (value <= 0 || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  /* The count-on, written out, for the moment after the answer lands. This is the
     method the arc draws: reach the o'clock, then carry on.

     Null unless the journey actually passes an o'clock with something left over. On
     a sum that stays inside its hour the jump IS the answer and restating it teaches
     nothing; landing exactly on the hour leaves no rest to count. */
  function jumpLine(start, lasting) {
    if (start % 60 === 0 && lasting % 60 === 0) {
      var stops = [];
      for (var m = start; m <= start + lasting; m += 60) {
        stops.push(CLOCK.digital(CLOCK.clampMinutes(m)));
      }
      return stops.join(' → ');
    }

    var toTheHour = 60 - (start % 60);
    if (lasting <= toTheHour) return null;

    return CLOCK.digital(start) + ' → ' + CLOCK.digital(CLOCK.clampMinutes(start + toTheHour)) +
           ' is ' + durationWords(toTheHour) + '. Then ' + durationWords(lasting - toTheHour) + ' more.';
  }

  /* Options in ONE register, always. c2 learned this the expensive way: write the
     answer as "quarter to nine" and the distractors as "7:45" and the question is
     answerable by picking the odd one out, without looking at a clock at all. Here
     that means all four options are times, or all four are durations, and they are
     all rendered by the same function.

     The label-level dedupe here is a backstop, not the mechanism: the two distractor
     builders already dedupe by VALUE, and both renderers are one-to-one, so a
     collision cannot currently be produced. It stays because a future renderer that
     is not one-to-one — anything that words a time or rounds a duration — would
     otherwise put the same answer on two buttons and mark one of them wrong. */
  function optionsFrom(values, answer, render) {
    var answerLabel = render(answer);
    var wrong = [];
    var seen = {};
    seen[answerLabel] = true;

    values.forEach(function (value) {
      if (wrong.length >= 3) return;
      var label = render(value);
      if (seen[label]) return;
      seen[label] = true;
      wrong.push({ label: label, ok: false });
    });

    return {
      answerLabel: answerLabel,
      options: shuffle(wrong.concat([{ label: answerLabel, ok: true }]))
    };
  }

  /* ------------------------------------------------------------------ *
   * One question
   * ------------------------------------------------------------------ */

  function timeQuestion(step, forwards) {
    var chosen = step.key === 's1' ? pickDoing(60, 240, 60) : pickDoing(10, 55, 5);
    var lasting = chosen.lasting;
    var start = step.key === 's1'
      /* A whole-hour start early enough to leave room for the journey: this chapter
         does not run past twelve. */
      ? Math.floor(Math.random() * (12 - lasting / 60)) * 60
      : (step.key === 's2' ? startWithin(lasting) : startCrossing(lasting));

    var finish = CLOCK.clampMinutes(start + lasting);
    var shown = forwards ? start : finish;
    var answer = forwards ? finish : start;

    /* Digits on screen, words to the voice. CLOCK.digital gives "3:20", which a
       speech engine is liable to read out as "three colon twenty"; CLOCK.spoken
       gives the sentence a person would say. Same split c2 makes. */
    function line(timeText) {
      return sentenceCase(chosen.doing.name) + (forwards
        ? ' starts at ' + timeText + '. It takes ' + durationWords(lasting) + '.'
        : ' takes ' + durationWords(lasting) + '. It has to finish at ' + timeText + '.');
    }

    var built = optionsFrom(
      timeDistractors(shown, lasting, step.grain, forwards),
      answer,
      function (value) { return CLOCK.digital(value); }
    );

    return {
      kind: 'time',
      doing: chosen.doing,
      start: start,
      lasting: lasting,
      finish: finish,
      shown: shown,
      answer: answer,
      emoji: chosen.doing.emoji,
      scene: line(CLOCK.digital(shown)),
      sceneSaid: line(CLOCK.spoken(shown)),
      ask: forwards ? 'What time does it finish?' : 'What time does it start?',
      options: built.options,
      answerLabel: built.answerLabel,
      good: '✓ ' + built.answerLabel,
      bad: 'It is ' + built.answerLabel,
      say: CLOCK.spoken(answer),
      also: jumpLine(start, lasting)
    };
  }

  function durationQuestion(step) {
    var chosen = pickDoing(10, 115, 5);
    var lasting = chosen.lasting;
    var start = startAnywhere(lasting);
    var finish = CLOCK.clampMinutes(start + lasting);

    var built = optionsFrom(
      durationDistractors(start, finish, lasting),
      lasting,
      durationWords
    );

    return {
      kind: 'duration',
      doing: chosen.doing,
      start: start,
      lasting: lasting,
      finish: finish,
      emoji: chosen.doing.emoji,
      scene: sentenceCase(chosen.doing.name) +
             ' starts at ' + CLOCK.digital(start) + ' and finishes at ' + CLOCK.digital(finish) + '.',
      sceneSaid: sentenceCase(chosen.doing.name) + ' starts at ' + CLOCK.spoken(start) +
                 ' and finishes at ' + CLOCK.spoken(finish) + '.',
      ask: 'How long is ' + chosen.doing.name + '?',
      options: built.options,
      answerLabel: built.answerLabel,
      good: '✓ ' + built.answerLabel,
      bad: 'It is ' + built.answerLabel,
      say: built.answerLabel,
      also: jumpLine(start, lasting)
    };
  }

  function compareQuestion(step) {
    /* BOTH JOURNEYS STAY UNDER AN HOUR, and that is the step's design rather than a
       convenience.

       Mixing the two sides of an hour is straightforwardly wrong: setSweep draws an
       under-an-hour journey on the minute hand's circle at six degrees a minute and an
       hour-plus journey on the hour hand's at half a degree, so a 55-minute arc beside
       a 60-minute one would be five times the length and would say the opposite of the
       truth.

       Keeping BOTH above the hour is honest but useless, which was found by building it
       and measuring: 85 minutes against 110 came out as 19px of arc against 25px on a
       112px dial. Six pixels is not a comparison a child can make, and no dial size
       that fits two of them on screen fixes it — 25 minutes of hour-hand travel is
       12.5 degrees at any size. The arc is what this step teaches with, so the step
       stays where the arc works. Comparing 35 minutes with 55 is the same skill, and it
       is the case where the digits mislead. */
    var low = 10;
    var high = 55;

    /* Ten minutes apart at least — 60 degrees of arc — so the answer never turns on a
       squint. */
    var shorter = pickOnGrid(low, high - 10, 5);
    var longer = pickOnGrid(shorter + 10, high, 5);

    var shortDoing = doingFor(shorter);
    var longDoing = doingFor(longer);
    if (longDoing === shortDoing) {
      /* Two cards naming the same thing is worse than one activity stretched past
         its usual length, so distinctness wins if it comes to that. */
      var fits = DOINGS.filter(function (doing) {
        return doing !== shortDoing && longer >= doing.min && longer <= doing.max;
      });
      longDoing = pick(fits.length ? fits : DOINGS.filter(function (doing) {
        return doing !== shortDoing;
      }));
    }

    /* The trap, deliberately: the SHORTER journey is the one that crosses an o'clock,
       so its digits look dramatic while its arc is the smaller of the two. A child who
       compares "10:50 to 11:15" against "2:05 to 2:40" without counting picks the wrong
       card. */
    var cards = shuffle([
      { doing: shortDoing, lasting: shorter, ok: false, start: startCrossing(shorter) },
      { doing: longDoing, lasting: longer, ok: true, start: startWithin(longer) }
    ]);

    cards.forEach(function (card) {
      card.finish = CLOCK.clampMinutes(card.start + card.lasting);
    });

    var winner = cards[0].ok ? cards[0] : cards[1];

    return {
      kind: 'compare',
      cards: cards,
      shorter: shorter,
      longer: longer,
      emoji: '',
      scene: '',
      sceneSaid: '',
      ask: 'Which one takes longer?',
      answerLabel: sentenceCase(winner.doing.name) + ' — ' + durationWords(longer),
      good: '✓ ' + sentenceCase(winner.doing.name) + ' — ' + durationWords(longer),
      bad: sentenceCase(winner.doing.name) + ' — ' + durationWords(longer),
      say: sentenceCase(winner.doing.name) + ' takes ' + durationWords(longer) + '.',
      also: durationWords(longer) + ' beats ' + durationWords(shorter) + '.'
    };
  }

  /* The one entry point. `forwards` is ignored by steps 4 and 5, which have only one
     direction. */
  function question(step, forwards) {
    if (step.key === 's5') return compareQuestion(step);
    if (step.key === 's4') return durationQuestion(step);
    return timeQuestion(step, forwards);
  }

  global.TimeBookElapsed = {
    STEPS: STEPS,
    DOINGS: DOINGS,
    question: question,
    durationWords: durationWords,
    jumpLine: jumpLine,
    sentenceCase: sentenceCase
  };
}(window));
