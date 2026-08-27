/* Time Book — chapters.
 *
 * Built against time-book/CONCEPT.md. Chapter ids carry the concept's own section
 * numbers so the app stays greppable against the owner's brief:
 *
 *   c1  §2.2  How a clock works      — the mechanism, and the two-systems reveal
 *   c2  §2.3  Read the clock         — the seven-stage progression
 *       §2.4  ...with past and to    — merged into stage 6, not a separate chapter
 *   c3  §2.5  Any clock              — read a face you have never seen before
 *
 * §2.1, §2.6, §2.7 and §2.8 are NOT built. See the task record for why; §2.6 in
 * particular is blocked on a decision no agent should make alone.
 *
 * The clock itself lives in clock.js. This file never draws a dial.
 */

(function () {
  'use strict';

  var CLOCK = window.TimeBookClock;
  var STORE_KEY = 'time-book-progress-v1';

  /* ------------------------------------------------------------------ *
   * Progress
   * ------------------------------------------------------------------ */

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (err) {
      return {}; // Private browsing, or a corrupt value. Start fresh, never throw.
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (err) {
      /* Storage is full or blocked. The child can still play; only the ticks are
         lost, which is not worth interrupting anyone over. */
    }
  }

  var progress = loadProgress();

  function markDone(key) {
    progress[key] = true;
    saveProgress(progress);
  }

  /* ------------------------------------------------------------------ *
   * Speech — one short utterance at a time, and honest about failing.
   *
   * math-app learned that queued utterances run back to back with a ~5 ms seam,
   * so anything needing a pause has to be chained on `onend`. Nothing here speaks
   * more than one line, which sidesteps that problem class entirely.
   *
   * The harder problem is that speech can be *silently impossible*. Measured
   * 2026-08-17 in the embedded preview browser: `speechSynthesis` exists, 180
   * macOS voices enumerate, `speak()` is accepted, `speaking` goes true — and no
   * utterance ever starts. No error, no event, nothing to catch. Feature-detecting
   * the API therefore proves nothing.
   *
   * So availability is decided by evidence, not by detection: `speechWorks` stays
   * null until an utterance actually reports `start`, and flips to false if none
   * does. The UI then stops claiming to have a voice, which is the same rule the
   * storybook's picture-quality control follows -- a control that cannot deliver
   * hides itself rather than lying.
   * ------------------------------------------------------------------ */

  var speechOn = progress.speech !== false;
  var speechWorks = null;   // null = untested, true = heard it start, false = silent
  var lastSpoken = '';

  function speak(text, onVerdict) {
    lastSpoken = text;
    if (!speechOn || !('speechSynthesis' in window) ||
        typeof window.SpeechSynthesisUtterance !== 'function') {
      if (onVerdict) onVerdict(false);
      return;
    }

    try {
      /* Cancel only when something is genuinely in flight. Calling cancel() and
         speak() back to back in the same tick is a documented way to wedge the
         queue: `speaking` stays true and nothing ever starts again. */
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      var utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.05;

      var settled = false;

      /* A "worked" verdict is permanent; a "silent" one is provisional.
         Two ways the naive version wrongly muted a device that speaks fine:
           - An utterance cancelled mid-flight never fires `start`, and cancelling
             is routine here (a new question interrupts the previous line). That
             must not demote a device already known to speak.
           - Some devices take well over a second to begin, notably Android
             fetching a network voice, so a late `start` has to be able to correct
             a pessimistic timeout.
         Hence: `true` always wins and can arrive late; `false` only sticks while
         we have never once heard a voice start. */
      function verdict(worked) {
        if (worked) {
          speechWorks = true;
          document.body.classList.remove('no-voice');
        } else if (speechWorks === null) {
          speechWorks = false;
          document.body.classList.add('no-voice');
        }
        refreshVoiceLabel();
        if (!settled) {
          settled = true;
          if (onVerdict) onVerdict(speechWorks === true);
        }
      }

      utterance.onstart = function () { verdict(true); };
      utterance.onerror = function () { verdict(false); };
      window.speechSynthesis.speak(utterance);

      /* Nothing started in time: stop claiming a voice this device may not have.
         Three seconds, not one -- long enough for a network voice to spin up, and
         still short enough that a child is not left waiting on a dead button. */
      setTimeout(function () { verdict(false); }, 3000);
    } catch (err) {
      if (speechWorks === null) {
        speechWorks = false;
        document.body.classList.add('no-voice');
      }
      refreshVoiceLabel();
      if (onVerdict) onVerdict(false);
    }
  }

  /* The voice button may be on screen when a verdict lands (or lands late), so it
     is re-read from the single source of truth rather than left stale. */
  function refreshVoiceLabel() {
    var button = document.querySelector('.voice-button');
    if (button && button.textContent !== '🔊 Listen…') button.textContent = voiceLabel();
  }

  function replayButton() {
    return h('button', {
      class: 'replay-button',
      type: 'button',
      'aria-label': 'Say that again',
      text: '🔊',
      onclick: function () { if (lastSpoken) speak(lastSpoken); }
    });
  }

  /* Pairs a prompt with a replay control. A spoken prompt a slow reader missed is
     worse than no spoken prompt, because there is no way back to it. Hidden by the
     `no-voice` class once speech has been shown not to work. */
  function promptRow(promptNode) {
    return h('div', { class: 'prompt-row' }, [promptNode, replayButton()]);
  }

  /* ------------------------------------------------------------------ *
   * Small DOM helpers
   * ------------------------------------------------------------------ */

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'class') node.className = attrs[key];
        else if (key === 'text') node.textContent = attrs[key];
        else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), attrs[key]);
        else node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* The choice grid picks its column count off this, so four options sit as a tidy
     2x2 instead of three-plus-an-orphan. Called once per question, after the
     options have been appended. */
  function countChoices(node) {
    node.dataset.count = node.children.length;
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

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  var screen = document.getElementById('screen');

  /* ------------------------------------------------------------------ *
   * Home
   * ------------------------------------------------------------------ */

  var CHAPTERS = [
    {
      id: 'c1',
      section: '§2.2',
      title: 'How a clock works',
      blurb: 'Two hands, one circle, and the secret that the numbers mean two things at once.',
      open: openMechanism
    },
    {
      id: 'c2',
      section: '§2.3',
      title: 'Read the clock',
      blurb: 'Seven steps: from o’clock all the way to any single minute, past and to.',
      open: openProgression
    },
    {
      id: 'c3',
      section: '§2.5',
      title: 'Any clock',
      blurb: 'Tick marks, Roman numerals, a digital screen — and a clock with no numbers at all.',
      open: openAnyClock
    }
  ];

  function openHome() {
    clear(screen);

    var cards = CHAPTERS.map(function (chapter) {
      var done = countDone(chapter.id);
      var preview = h('div', { class: 'card-clock' });

      var card = h('button', {
        class: 'chapter-card',
        type: 'button',
        onclick: function () { chapter.open(); }
      }, [
        preview,
        h('h2', { text: chapter.title }),
        h('p', { text: chapter.blurb }),
        done ? h('span', { class: 'card-done', text: '✓ ' + done }) : null
      ]);

      /* A live clock on every card, each showing a different time, so the home
         screen already looks like the thing the book is about. */
      new CLOCK.Clock(preview, {
        minutes: chapter.id === 'c1' ? 9 * 60 : chapter.id === 'c2' ? 3 * 60 + 15 : 7 * 60 + 45,
        face: chapter.id === 'c3' ? 'ticks' : 'numbers',
        ring: false
      });

      return card;
    });

    /* Owner, 2026-08-26: "add back button to test hub for the test apps too." It sits on
       the home screen only -- a chapter already has "\u2039 Book" back to here, so the way
       out is one more tap of the same idea rather than a second button on every screen.
       It reads "\u2039 Test Apps" for the same reason the chapter button reads "\u2039 Book":
       this book names where a button GOES. Absolute URL on purpose: published, /time-book/
       and /test-apps/ are siblings; in the repo the hub lives under site/, so a relative
       link would work live and 404 in every local preview. */
    screen.appendChild(h('div', { class: 'home' }, [
      h('div', { class: 'home-out' }, [
        h('a', {
          class: 'back-button hub-button',
          href: 'https://veeranuchlee.github.io/test-apps/',
          text: '\u2039 Test Apps'
        })
      ]),
      h('header', { class: 'home-head' }, [
        h('h1', { class: 'title', text: 'Time Book' }),
        h('p', { class: 'subtitle', text: 'Learn to read any clock in the world.' })
      ]),
      h('div', { class: 'chapter-grid' }, cards),
      h('button', {
        class: 'ghost-button voice-button',
        type: 'button',
        text: voiceLabel(),
        onclick: function (event) { toggleVoice(event.currentTarget); }
      })
    ]));
  }

  /* The label states the ACTION, not just the state. "Voice is on" reads as a
     status, so tapping it to hear something is the natural thing to try -- and the
     old version answered that tap by silently switching the voice OFF, which is
     exactly how you end up with an app that seems to have no sound at all. */
  function voiceLabel() {
    if (speechWorks === false) return '🔇 This device has no voice';
    return speechOn ? '🔊 Voice is on — tap to mute' : '🔇 Muted — tap to hear the voice';
  }

  function toggleVoice(button) {
    speechOn = !speechOn;
    progress.speech = speechOn;
    saveProgress(progress);

    if (!speechOn) {
      button.textContent = voiceLabel();
      return;
    }

    /* Turning the voice on says something straight away. Two reasons: the tap that
       asked for sound should produce sound, and this is the only honest moment to
       find out whether the device speaks at all -- a verdict needs a real utterance
       inside a real user gesture, which is also what iOS Safari requires before it
       will speak at all. */
    button.textContent = '🔊 Listen…';
    speak('Voice is on. I will read the questions to you.', function () {
      button.textContent = voiceLabel();
    });
  }

  function countDone(chapterId) {
    return Object.keys(progress).filter(function (key) {
      return key.indexOf(chapterId + ':') === 0;
    }).length;
  }

  function chapterFrame(heading, note, body) {
    clear(screen);
    screen.appendChild(h('div', { class: 'chapter' }, [
      h('header', { class: 'chapter-head' }, [
        h('button', { class: 'back-button', type: 'button', text: '‹ Book', onclick: openHome }),
        h('div', { class: 'chapter-titles' }, [
          h('h1', { text: heading }),
          note ? h('p', { text: note }) : null
        ])
      ]),
      body
    ]));
  }

  /* ================================================================== *
   * c1 — §2.2 How a clock works
   *
   * A five-step guided reveal. The order is the argument: one hand alone is
   * understandable, two hands are a system, and the minute ring is the thing
   * almost every clock book leaves out.
   * ================================================================== */

  var MECHANISM_STEPS = [
    {
      key: 'hour',
      title: 'The short hand tells the hour',
      body: 'Drag the short fat hand. It walks around the circle once, past all twelve numbers. ' +
            'Where it points is the hour.',
      face: 'numbers', ring: false, step: 60, hands: 'hour',
      say: function (minutes) { return CLOCK.spoken(minutes); }
    },
    {
      key: 'between',
      title: 'It can point between two numbers',
      body: 'Now it moves in smaller steps. Halfway between 3 and 4 is not three, and it is not ' +
            'four. It is somewhere inside the hour.',
      face: 'numbers', ring: false, step: 15, hands: 'hour',
      say: function (minutes) { return CLOCK.spoken(minutes); }
    },
    {
      key: 'minute',
      title: 'The long hand counts minutes',
      body: 'Drag the long thin hand all the way round. That whole trip is one hour — sixty ' +
            'minutes. Watch what the short hand does while you drag.',
      face: 'numbers', ring: false, step: 1, hands: 'both',
      say: function (minutes) { return CLOCK.digital(minutes); }
    },
    {
      key: 'ring',
      title: 'The numbers mean two things',
      body: 'Here is the secret. Every number is an hour for the short hand — and a jump of five ' +
            'minutes for the long hand. The 3 means three o’clock, and it also means fifteen ' +
            'minutes. Both systems live on one face.',
      face: 'numbers', ring: true, step: 5, hands: 'both',
      say: function (minutes) { return CLOCK.digital(minutes); }
    },
    {
      key: 'free',
      title: 'Try it yourself',
      body: 'Move both hands anywhere. The clock will always tell you what it says.',
      face: 'numbers', ring: true, step: 1, hands: 'both',
      say: function (minutes) { return CLOCK.spoken(minutes); }
    }
  ];

  function openMechanism() {
    var index = 0;
    var clock = null;

    var stage = h('div', { class: 'stage' });
    var readout = h('div', { class: 'readout' });
    var copy = h('div', { class: 'copy' });
    var dots = h('div', { class: 'step-dots' });
    var nextButton = h('button', { class: 'primary-button', type: 'button', text: 'Next →' });

    nextButton.addEventListener('click', function () {
      markDone('c1:' + MECHANISM_STEPS[index].key);
      if (index < MECHANISM_STEPS.length - 1) {
        index += 1;
        renderStep();
      } else {
        openHome();
      }
    });

    function renderReadout() {
      var step = MECHANISM_STEPS[index];
      clear(readout);
      readout.appendChild(h('strong', { text: step.say(clock.minutes) }));
      if (step.hands === 'both') {
        readout.appendChild(h('span', { text: CLOCK.spoken(clock.minutes) }));
      }
    }

    function renderStep() {
      var step = MECHANISM_STEPS[index];

      clear(stage);
      clear(copy);
      clear(dots);

      copy.appendChild(h('h2', { text: step.title }));
      copy.appendChild(h('p', { text: step.body }));

      clock = new CLOCK.Clock(stage, {
        minutes: clock ? clock.minutes : 9 * 60,
        face: step.face,
        ring: step.ring,
        step: step.step,
        draggable: true,
        onChange: renderReadout
      });

      /* Steps that are about the hour hand hide the minute hand outright. Leaving
         it on screen but inert would invite the child to drag a dead hand. */
      stage.querySelector('.clock').classList.toggle('clock--hour-only', step.hands === 'hour');

      MECHANISM_STEPS.forEach(function (other, i) {
        dots.appendChild(h('i', { class: i === index ? 'is-current' : (i < index ? 'is-past' : '') }));
      });

      nextButton.textContent = index < MECHANISM_STEPS.length - 1 ? 'Next →' : 'Finish ✓';
      renderReadout();
      // Title and body as ONE utterance. The instruction is the useful part to
      // hear, and a single utterance avoids the back-to-back seam entirely.
      speak(step.title + '. ' + step.body);
    }

    chapterFrame('How a clock works', '§2.2', h('div', { class: 'mechanism' }, [
      stage, readout, promptRow(copy), dots, nextButton
    ]));

    renderStep();
  }

  /* ================================================================== *
   * c2 — §2.3 the seven-step progression, with §2.4's naming as step 6
   *
   * Each stage sets a snap step and a pool of times. Two task directions run
   * throughout, because reading a clock and setting one are different skills and
   * a child who can only do the first has not finished learning.
   * ================================================================== */

  /* `show` is the time this step's menu picture displays. They all share the 3
     o'clock hour deliberately, so that reading down the list the ONLY thing that
     changes is the minute hand getting more particular: straight up, half turn,
     quarter, a five, an odd minute. That is the progression, drawn rather than
     described -- a child who cannot yet read "Quarters" can still see which row
     matches the clock they are looking at. */
  var STAGES = [
    { key: 's1', name: 'O’clock',         step: 60, pool: everyHour,    naming: false, show: 180 },
    { key: 's2', name: 'Half past',       step: 30, pool: everyHalf,    naming: false, show: 210 },
    { key: 's3', name: 'Quarters',        step: 15, pool: everyQuarter, naming: false, show: 195 },
    { key: 's4', name: 'Five minutes',    step: 5,  pool: everyFive,    naming: false, show: 200 },
    { key: 's5', name: 'Every minute',    step: 1,  pool: everyMinute,  naming: false, show: 187 },
    { key: 's6', name: 'Past and to',     step: 5,  pool: everyFive,    naming: true,  show: 225 },
    { key: 's7', name: 'Any time at all', step: 1,  pool: everyMinute,  naming: true,  show: 223 }
  ];

  function everyHour()    { return Math.floor(Math.random() * 12) * 60; }
  function everyHalf()    { return Math.floor(Math.random() * 24) * 30; }
  function everyQuarter() { return Math.floor(Math.random() * 48) * 15; }
  function everyFive()    { return Math.floor(Math.random() * 144) * 5; }
  function everyMinute()  { return Math.floor(Math.random() * 720); }

  var ROUND_LENGTH = 6;

  function openProgression() {
    openStagePicker();
  }

  function openStagePicker() {
    var buttons = STAGES.map(function (stage, i) {
      var done = progress['c2:' + stage.key];
      var preview = h('div', { class: 'row-clock' });

      var button = h('button', {
        class: 'stage-button' + (done ? ' is-done' : ''),
        type: 'button',
        onclick: function () { runRound(stage); }
      }, [
        h('span', { class: 'stage-number', text: String(i + 1) }),
        preview,
        h('span', { class: 'stage-name', text: stage.name }),
        done ? h('span', { class: 'stage-tick', text: '✓' }) : null
      ]);

      new CLOCK.Clock(preview, { minutes: stage.show, face: 'numbers' });
      return button;
    });

    chapterFrame('Read the clock', 'Seven steps. Start at one.',
      h('div', { class: 'stage-list' }, buttons));
  }

  /* Distractors are the whole teaching value of a multiple-choice question, and
     they also decide how hard a step actually is -- which is where this went wrong.
     `granularity` is the stage's own snap step, in minutes.

     COARSE STEPS GET DISTRACTORS ON THEIR OWN GRID. Step 1 is called "O'clock",
     and it used to show 9:00 against 8:55 / 9:05 / 12:45: a five-minute
     discrimination, which is step 4's skill. Every step was therefore as hard as
     step 5 and the seven-step ladder was fiction. On the coarse steps the wrong
     answers are now other times a child at that step can actually name -- other
     o'clocks, other half hours, other quarters.

     FINE STEPS GET THE REAL CONFUSIONS, because by then they are the content:
       - hands swapped        (3:05 read as 1:15) — by far the commonest error
       - the wrong hour on a "to" time (quarter to four read as quarter to three)
       - five minutes out
       - an hour out
     Every one of those lands on the five-minute grid or finer, so they belong from
     step 4 down and nowhere above it.

     Anything colliding with the right answer is dropped, not nudged. */
  function distractors(minutes, granularity) {
    var hour = Math.floor(minutes / 60) % 12;
    var minute = minutes % 60;
    var out = [];

    if (granularity >= 15) {
      [granularity, -granularity, granularity * 2, -granularity * 2, 60, -60]
        .forEach(function (delta) {
          var value = CLOCK.clampMinutes(minutes + delta);
          if (value !== minutes && out.indexOf(value) === -1) out.push(value);
        });
      return out;
    }

    // Hands swapped: read the hour hand's position as minutes, and the minute
    // hand's position as an hour.
    var swappedHour = Math.round(minute / 5) % 12;
    var swappedMinute = (hour === 0 ? 12 : hour) * 5 % 60;
    out.push(swappedHour * 60 + swappedMinute);

    // "to" said against the hour the hand has already left.
    if (minute > 30) out.push(((hour + 11) % 12) * 60 + minute);

    out.push(CLOCK.clampMinutes(minutes + 5));
    out.push(CLOCK.clampMinutes(minutes - 5));
    out.push(CLOCK.clampMinutes(minutes + 60));

    var seen = {};
    seen[minutes] = true;
    return out.filter(function (value) {
      if (seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  /* One time, in the register the question is testing. `naming` picks the
     "quarter past three" form where the time has one; a whole hour only ever has
     "three o'clock", so it falls back rather than inventing a phrasing. */
  function phrase(minutes, naming) {
    var all = CLOCK.names(minutes);
    return naming && all.length > 1 ? all[1] : all[0];
  }

  /* How an option is written.
     Only steps 6 and 7 are about what a time is CALLED, so only they use words.
     Everywhere else the answer is digits -- "3:45", not "three forty-five".

     This is the difference between a child reading a clock and a child reading
     English. Four phrases like "twenty-five minutes past nine" put a reading test
     in front of the actual skill, and digits are recognised years earlier than
     those words are. The voice still says the words aloud, so the naming is still
     being taught; it just is not the gate. */
  function optionLabel(minutes, stage) {
    return stage.naming ? phrase(minutes, true) : CLOCK.digital(minutes);
  }

  function runRound(stage) {
    var asked = 0;
    var right = 0;

    var stageHost = h('div', { class: 'stage' });
    var prompt = h('h2', { class: 'prompt' });
    var choices = h('div', { class: 'choices' });
    var feedback = h('div', { class: 'feedback' });
    var score = h('div', { class: 'score' });
    var actions = h('div', { class: 'actions' });

    chapterFrame(stage.name, 'Step ' + (STAGES.indexOf(stage) + 1) + ' of 7',
      h('div', { class: 'practice' }, [score, promptRow(prompt), stageHost, choices, feedback, actions]));

    nextQuestion();

    function nextQuestion() {
      clear(choices);
      clear(feedback);
      clear(actions);
      clear(stageHost);
      /* clear() only removes children. Without dropping these two classes the
         answer lock survives into the next question and nothing is clickable
         again for the rest of the round. */
      choices.classList.remove('is-locked');
      choices.classList.remove('is-faces');

      if (asked >= ROUND_LENGTH) return finishRound();

      score.textContent = 'Question ' + (asked + 1) + ' of ' + ROUND_LENGTH +
                          '   ·   ' + right + ' right';

      var target = stage.pool();
      // A 'set' task on stage 1 would be trivially easy and on stage 5 is the
      // hardest thing in the chapter, so both directions appear from the start.
      var kind = Math.random() < 0.5 ? 'read' : 'set';

      if (kind === 'read') askRead(target);
      else askSet(target);

      countChoices(choices);
    }

    function askRead(target) {
      new CLOCK.Clock(stageHost, { minutes: target, face: 'numbers' });

      prompt.textContent = 'What time is this?';
      speak('What time is this?');

      /* Every option is written in the SAME register -- all words on a naming
         stage, all digits otherwise.

         This matters more than it looks. Writing only the answer as "quarter to
         nine" and every distractor as "seven forty-five" makes the question
         answerable by picking the odd one out, without ever looking at the clock.
         One register throughout means the child has to read the hands. */
      var answerLabel = optionLabel(target, stage);

      var options = distractors(target, stage.step)
        .map(function (value) { return optionLabel(value, stage); })
        // A distractor that happens to render as the answer would make two options
        // correct and one of them marked wrong. Drop it.
        .filter(function (label) {
          return label !== answerLabel && CLOCK.names(target).indexOf(label) === -1;
        })
        .slice(0, 3)
        .map(function (label) { return { label: label, ok: false }; });

      options = shuffle(options.concat([{ label: answerLabel, ok: true }]));

      options.forEach(function (option) {
        choices.appendChild(h('button', {
          class: 'choice' + (stage.naming ? '' : ' choice--digits'),
          type: 'button',
          text: option.label,
          onclick: function (event) { judgeRead(event.currentTarget, option, target, answerLabel); }
        }));
      });
    }

    function judgeRead(button, option, target, answerLabel) {
      if (choices.classList.contains('is-locked')) return;
      choices.classList.add('is-locked');

      asked += 1;
      if (option.ok) {
        right += 1;
        button.classList.add('is-right');
        clear(feedback);
        feedback.appendChild(h('p', { class: 'good', text: '✓ ' + CLOCK.spoken(target) }));

        /* §2.4 lands here rather than in a lesson: the moment the child is right,
           show the other correct names for the same time. On a digits step the
           spoken name above is already the new information, so only the naming
           steps list alternatives -- otherwise a step deliberately free of word
           answers ends every question with a line of them. */
        if (stage.naming) {
          var others = CLOCK.names(target).filter(function (name) { return name !== option.label; });
          if (others.length) {
            feedback.appendChild(h('p', { class: 'also', text: 'Also: ' + others.join(' · ') }));
          }
        }
        speak(CLOCK.spoken(target));
      } else {
        button.classList.add('is-wrong');
        // Mark the right one by the label this question actually rendered, not by
        // re-deriving it -- on a digits step the answer is "3:45", which appears in
        // no name list at all.
        Array.prototype.forEach.call(choices.children, function (node) {
          if (node.textContent === answerLabel) node.classList.add('is-right');
        });
        clear(feedback);
        feedback.appendChild(h('p', { class: 'bad', text: 'It is ' + answerLabel }));
        feedback.appendChild(h('p', { class: 'also', text: 'Short hand → hour. Long hand → minutes.' }));
        speak(CLOCK.spoken(target));
      }

      actions.appendChild(h('button', {
        class: 'primary-button', type: 'button', text: 'Next →', onclick: nextQuestion
      }));
    }

    function askSet(target) {
      // Digits on the early steps, a spoken-style name only where naming is the
      // lesson. The voice says the words either way.
      var label = stage.naming ? pick(CLOCK.names(target)) : CLOCK.digital(target);
      clear(prompt);
      prompt.appendChild(document.createTextNode('Make the clock say '));
      prompt.appendChild(h('strong', { class: 'target-time', text: label }));
      speak('Make the clock say ' + (stage.naming ? label : CLOCK.spoken(target)));

      var live = h('div', { class: 'live-readout' });

      var clock = new CLOCK.Clock(stageHost, {
        minutes: pick([0, 2 * 60, 5 * 60, 8 * 60]),  // never start on the answer
        face: 'numbers',
        step: stage.step,
        draggable: true,
        onChange: function (minutes) { live.textContent = CLOCK.digital(minutes); }
      });
      live.textContent = CLOCK.digital(clock.minutes);
      stageHost.appendChild(live);

      actions.appendChild(h('button', {
        class: 'primary-button',
        type: 'button',
        text: 'Check',
        onclick: function () { judgeSet(clock, target, label); }
      }));
    }

    function judgeSet(clock, target, label) {
      if (choices.classList.contains('is-locked')) return;
      choices.classList.add('is-locked');
      clear(actions);
      asked += 1;

      clear(feedback);
      if (clock.minutes === target) {
        right += 1;
        feedback.appendChild(h('p', { class: 'good', text: '✓ ' + CLOCK.spoken(target) }));
        speak('Exactly right');
      } else {
        // Two digital times side by side, not a sentence: what you set, what was
        // asked. A child who cannot read the sentence can still compare the two.
        feedback.appendChild(h('p', {
          class: 'bad',
          text: CLOCK.digital(clock.minutes) + ' → ' + CLOCK.digital(target)
        }));
        // Show the answer on the same clock instead of describing it in words.
        clock.set(target);
        clock.setDraggable(false);
        feedback.appendChild(h('p', { class: 'also', text: 'Look where the hands sit now.' }));
        speak(label);
      }

      actions.appendChild(h('button', {
        class: 'primary-button', type: 'button', text: 'Next →', onclick: nextQuestion
      }));
    }

    function finishRound() {
      clear(stageHost);
      score.textContent = '';
      prompt.textContent = right + ' out of ' + ROUND_LENGTH;

      var passed = right >= ROUND_LENGTH - 1;
      if (passed) markDone('c2:' + stage.key);

      clear(feedback);
      feedback.appendChild(h('p', {
        class: passed ? 'good' : 'bad',
        text: passed ? 'This step is yours. ✓' : 'Close. Try this step once more.'
      }));

      actions.appendChild(h('button', {
        class: 'primary-button', type: 'button', text: 'Again', onclick: function () { runRound(stage); }
      }));
      actions.appendChild(h('button', {
        class: 'ghost-button', type: 'button', text: 'All steps', onclick: openStagePicker
      }));
      speak(passed ? 'Well done' : 'Try again');
    }
  }

  /* ================================================================== *
   * c3 — §2.5 Any clock
   *
   * The same reading skill against faces the child has not memorised. The bare
   * face is the chapter's argument in one puzzle: if you understood §2.2 you do
   * not need the numbers, because the hands' own lengths and positions carry the
   * time.
   * ================================================================== */

  /* `note` is deliberately short. This menu used to carry a full sentence per row
     and no picture at all -- a chapter whose entire subject is what clock faces
     look like, described in prose. The face itself is the label now; the words are
     the caption. */
  var FACES = [
    { key: 'ticks',   label: 'Tick marks',     note: 'Every mark is a minute.' },
    { key: 'roman',   label: 'Roman numbers',  note: 'On old clocks and towers.' },
    { key: 'bare',    label: 'Nothing at all', note: 'No numbers. Can you still tell?' },
    { key: 'digital', label: 'A screen',       note: 'No hands.' },
    { key: 'h24',     label: '24-hour time',   note: 'After midday: 13, 14, 15…' }
  ];

  function openAnyClock() {
    var buttons = FACES.map(function (face) {
      var done = progress['c3:' + face.key];
      var preview = h('div', { class: 'row-clock' });

      var button = h('button', {
        class: 'stage-button' + (done ? ' is-done' : ''),
        type: 'button',
        onclick: function () { runFaceRound(face); }
      }, [
        preview,
        h('span', { class: 'stage-name' }, [
          h('span', { class: 'stage-label', text: face.label }),
          h('small', { text: face.note })
        ]),
        done ? h('span', { class: 'stage-tick', text: '✓' }) : null
      ]);

      /* Each row previews the thing it opens. The two screen-based rows get a real
         digital readout rather than a dial, which is the whole distinction. */
      if (face.key === 'digital') {
        preview.appendChild(h('span', { class: 'row-digital', text: '3:45' }));
      } else if (face.key === 'h24') {
        preview.appendChild(h('span', { class: 'row-digital', text: '15:45' }));
      } else {
        new CLOCK.Clock(preview, { minutes: 225, face: face.key });
      }

      return button;
    });

    chapterFrame('Any clock', 'A clock you have never seen before is still a clock.',
      h('div', { class: 'stage-list stage-list--faces' }, buttons));
  }

  function runFaceRound(face) {
    var asked = 0;
    var right = 0;

    var stageHost = h('div', { class: 'stage' });
    var prompt = h('h2', { class: 'prompt' });
    var choices = h('div', { class: 'choices' });
    var feedback = h('div', { class: 'feedback' });
    var score = h('div', { class: 'score' });
    var actions = h('div', { class: 'actions' });

    chapterFrame(face.label, face.note,
      h('div', { class: 'practice' }, [score, promptRow(prompt), stageHost, choices, feedback, actions]));

    nextQuestion();

    function nextQuestion() {
      clear(choices);
      clear(feedback);
      clear(actions);
      clear(stageHost);
      /* clear() only removes children. Without dropping these two classes the
         answer lock survives into the next question and nothing is clickable
         again for the rest of the round. */
      choices.classList.remove('is-locked');
      choices.classList.remove('is-faces');

      if (asked >= ROUND_LENGTH) return finishRound();

      score.textContent = 'Question ' + (asked + 1) + ' of ' + ROUND_LENGTH +
                          '   ·   ' + right + ' right';

      // Five-minute times on the faces with no numbers: asking for :37 off a bare
      // dial tests eyesight rather than understanding.
      var target = (face.key === 'bare' || face.key === 'ticks')
        ? Math.floor(Math.random() * 144) * 5
        : Math.floor(Math.random() * 720);

      if (face.key === 'digital') askDigital(target);
      else if (face.key === 'h24') ask24Hour(target);
      else askFace(target);

      countChoices(choices);
    }

    function askFace(target) {
      new CLOCK.Clock(stageHost, { minutes: target, face: face.key });
      prompt.textContent = 'What time is this?';
      offerNames(target);
    }

    /* Digital runs the task backwards: the screen states the time, and the child
       finds the analog face that matches. Reading 3:45 off a screen is not a
       skill; knowing it is the same thing as quarter to four is. */
    function askDigital(target) {
      stageHost.appendChild(h('div', { class: 'digital', text: CLOCK.digital(target) }));
      prompt.textContent = 'Which clock is showing this time?';

      /* Deliberately NOT the shared distractor set, which includes five-minutes-out.
         Every other question shows one big clock to read; this one asks the child to
         compare three small dials, and two dials five minutes apart differ by a few
         pixels of hand angle -- that tests eyesight, not telling the time. The hand
         swap and the hour-out are unmistakable at this size and are both real
         confusions. */
      var hour = Math.floor(target / 60) % 12;
      var minute = target % 60;

      /* Each option must sit at least MIN_GAP from every other, or two dials look
         the same. The hand swap is the reason this guard exists: near 3:15 the two
         hands are almost symmetric, so swapping them lands on 3:16 -- a one-minute
         difference, indistinguishable at this size. When the swap is too close it
         is dropped and an hour-out takes its place. */
      var MIN_GAP = 25;
      var wrong = [];
      function farEnough(value) {
        return [target].concat(wrong).every(function (other) {
          var d = Math.abs(value - other);
          return Math.min(d, 720 - d) >= MIN_GAP;
        });
      }

      [
        (Math.round(minute / 5) % 12) * 60 + ((hour === 0 ? 12 : hour) * 5) % 60,  // hands swapped
        CLOCK.clampMinutes(target + 60),                                          // an hour late
        CLOCK.clampMinutes(target - 60),                                          // an hour early
        CLOCK.clampMinutes(target + 30),                                          // half an hour out
        CLOCK.clampMinutes(target + 150)                                          // a last resort
      ].forEach(function (value) {
        if (wrong.length < 2 && farEnough(value)) wrong.push(value);
      });

      var options = shuffle(wrong.concat([target]));

      options.forEach(function (value) {
        var holder = h('button', {
          class: 'face-choice',
          type: 'button',
          onclick: function (event) {
            judge(event.currentTarget, value === target, target, CLOCK.spoken(target));
          }
        });
        choices.appendChild(holder);
        new CLOCK.Clock(holder, { minutes: value, face: 'numbers' });
      });
      choices.classList.add('is-faces');
    }

    /* §2.5's 24-hour line. The clock face cannot show 15:00 — that is exactly the
       point, so the question is which 24-hour label belongs to this face plus a
       stated part of the day. */
    function ask24Hour(target) {
      var afternoon = Math.random() < 0.5;
      var hour12 = Math.floor(target / 60) % 12;
      var minute = target % 60;
      var hour24 = afternoon ? (hour12 === 0 ? 12 : hour12 + 12) : hour12;

      new CLOCK.Clock(stageHost, { minutes: target, face: 'numbers' });
      prompt.textContent = 'It is ' + (afternoon ? 'the afternoon or evening' : 'the morning') +
                           '. What is this in 24-hour time?';

      function label(hour) {
        return (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
      }

      var correct = label(hour24);

      /* Four candidates, deduped. Two of these collide by construction in the
         afternoon: hour24 is hour12 + 12 there, so (hour24 + 12) % 24 IS hour12,
         and taking the first two without deduping shipped the same wrong answer
         twice in every afternoon question. */
      var wrong = [];
      [
        label(hour12 === 0 ? 12 : hour12),   // the 12-hour reading, left alone
        label((hour24 + 12) % 24),           // the other half of the day
        label((hour24 + 1) % 24),            // an hour late
        label((hour24 + 23) % 24)            // an hour early
      ].forEach(function (value) {
        if (value !== correct && wrong.indexOf(value) === -1) wrong.push(value);
      });

      shuffle(wrong.slice(0, 2).concat([correct])).forEach(function (value) {
        choices.appendChild(h('button', {
          class: 'choice',
          type: 'button',
          text: value,
          onclick: function (event) { judge(event.currentTarget, value === correct, target, correct); }
        }));
      });
    }

    function offerNames(target) {
      var options = shuffle(distractors(target).slice(0, 3).map(function (value) {
        return { label: CLOCK.names(value)[0], ok: false };
      }).concat([{ label: CLOCK.names(target)[0], ok: true }]));

      options.forEach(function (option) {
        choices.appendChild(h('button', {
          class: 'choice',
          type: 'button',
          text: option.label,
          onclick: function (event) {
            judge(event.currentTarget, option.ok, target, CLOCK.names(target)[0]);
          }
        }));
      });
    }

    function judge(button, correct, target, answerText) {
      if (choices.classList.contains('is-locked')) return;
      choices.classList.add('is-locked');
      asked += 1;

      clear(feedback);
      if (correct) {
        right += 1;
        button.classList.add('is-right');
        feedback.appendChild(h('p', { class: 'good', text: 'Yes — ' + answerText + '.' }));
        speak('Yes');
      } else {
        button.classList.add('is-wrong');
        feedback.appendChild(h('p', { class: 'bad', text: 'It is ' + answerText + '.' }));
        if (face.key === 'bare') {
          feedback.appendChild(h('p', {
            class: 'also',
            text: 'Straight up is 12. The short hand is the hour, even with nothing to point at.'
          }));
        }
        speak(answerText);
      }

      actions.appendChild(h('button', {
        class: 'primary-button', type: 'button', text: 'Next →', onclick: nextQuestion
      }));
    }

    function finishRound() {
      clear(stageHost);
      choices.classList.remove('is-faces');
      score.textContent = '';
      prompt.textContent = right + ' out of ' + ROUND_LENGTH;

      var passed = right >= ROUND_LENGTH - 1;
      if (passed) markDone('c3:' + face.key);

      clear(feedback);
      feedback.appendChild(h('p', {
        class: passed ? 'good' : 'bad',
        text: passed ? 'You can read this clock. ✓' : 'Nearly. One more go.'
      }));

      actions.appendChild(h('button', {
        class: 'primary-button', type: 'button', text: 'Again',
        onclick: function () { runFaceRound(face); }
      }));
      actions.appendChild(h('button', {
        class: 'ghost-button', type: 'button', text: 'All clocks', onclick: openAnyClock
      }));
    }
  }

  openHome();
}());
