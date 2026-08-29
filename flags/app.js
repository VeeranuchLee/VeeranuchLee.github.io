// flags-app/app.js — the game.
//
// Progression slice 1-2 from the expansion roadmap:
//   Match the flag  — see a flag, tap the same one among 2-4 options.
//   Which country?  — see a flag, tap the country it belongs to.
// Every correct answer opens the knowledge card: flag, country, capital,
// "look for" cue and ONE tiny fact, rotating across encounters.
//
// Conventions carried over from the solar system game: a single tap is the
// whole interaction; nothing is taken away for a wrong answer; after three
// tries the right answer blinks gold — gold always means "here it is".
// Interaction sounds are synthesised in WebAudio (AUDIO-DIRECTION decision 6);
// speech is the interim robot voice through speech.js until a designed voice
// is rendered.

(function () {
  'use strict';

  var DATA = window.FLAGS_DATA;
  var SPEECH = window.FlagsSpeech;

  var VIEW = document.getElementById('view-root');
  var BTN_HOME = document.getElementById('btn-home');
  var BTN_SOUND = document.getElementById('btn-sound');

  var STORE_PREFIX = 'flags-app.';
  var QUESTIONS_PER_SESSION = 10;
  var REVEAL_AFTER_TRIES = 3;

  // ---- tiny DOM helper -------------------------------------------------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      if (key === 'class') node.className = attrs[key];
      else if (key === 'text') node.textContent = attrs[key];
      else if (key === 'html') node.innerHTML = attrs[key];
      else if (key.indexOf('on') === 0) node.addEventListener(key.slice(2), attrs[key]);
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = copy[i]; copy[i] = copy[j]; copy[j] = swap;
    }
    return copy;
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  // ---- persistence -----------------------------------------------------

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(STORE_PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  var seenCounts = load('seen', {});   // code -> encounters completed
  var factCursor = load('factCursor', {}); // code -> index of last fact shown

  // ---- confusability ---------------------------------------------------

  var confusableMap = {};
  DATA.countries.forEach(function (country) { confusableMap[country.code] = {}; });
  DATA.confusable.forEach(function (group) {
    group.forEach(function (code) {
      if (!confusableMap[code]) return;
      group.forEach(function (other) {
        if (other !== code && confusableMap[other]) confusableMap[code][other] = true;
      });
    });
  });

  // ---- WebAudio interaction sounds (decision 6: synthesised, never files)

  var audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, start, duration, type, peak) {
    if (!soundOn) return; // the toggle gates the chimes too, not just speech
    var context = ctx();
    if (!context) return;
    var osc = context.createOscillator();
    var gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var t0 = context.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.16, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(context.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  var SFX = {
    correct: function () { tone(523.25, 0, 0.16, 'sine', 0.18); tone(659.25, 0.1, 0.18, 'sine', 0.18); tone(783.99, 0.2, 0.3, 'sine', 0.16); },
    retry: function () { tone(220, 0, 0.28, 'sine', 0.12); },
    reveal: function () { tone(392, 0, 0.18, 'triangle', 0.12); tone(523.25, 0.12, 0.3, 'triangle', 0.12); },
    fanfare: function () {
      tone(523.25, 0, 0.14, 'sine', 0.16); tone(659.25, 0.12, 0.14, 'sine', 0.16);
      tone(783.99, 0.24, 0.14, 'sine', 0.16); tone(1046.5, 0.36, 0.5, 'sine', 0.18);
    },
    tap: function () { tone(880, 0, 0.06, 'sine', 0.05); }
  };

  // ---- state -----------------------------------------------------------

  var screen = 'home'; // home | question | card | done
  var mode = 'match';  // match | country
  var queue = [];
  var question = null; // current question object
  var sessionAnswered = [];
  var sessionIndex = 0;

  function line(id) { return DATA.lines[id] || ''; }

  // AUDIO-DIRECTION: one sentence per utterance. Facts are stored as one
  // text for the card display; the robot voice splits them so each sentence
  // gets a real pause. (A future rendered clip keys on the fact id and
  // carries the whole text as one file — solar-game lines do the same.)
  // No regex lookbehind: the design floor includes older iOS Safari.
  function saySentences(text, lineId) {
    var parts = String(text).match(/[^.!?]+[.!?]+["']?\s*/g) || [String(text)];
    parts.forEach(function (part, i) {
      var trimmed = part.trim();
      if (trimmed) SPEECH.say(trimmed, i === 0 ? lineId : null);
    });
  }

  function nextFactIndex(country) {
    var facts = country.facts;
    var last = typeof factCursor[country.code] === 'number' ? factCursor[country.code] : -1;
    return (last + 1) % facts.length;
  }

  function buildQueue() {
    // Least-seen first, shuffled within equal counts, so every country gets
    // its card before favourites repeat.
    var bySeen = {};
    DATA.countries.forEach(function (c) {
      var n = seenCounts[c.code] || 0;
      (bySeen[n] = bySeen[n] || []).push(c);
    });
    queue = [];
    Object.keys(bySeen).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      queue = queue.concat(shuffle(bySeen[n]));
    });
  }

  function optionCount(country) {
    // The roadmap's "2-4 options" ramp: brand-new countries are asked with
    // two choices, familiar ones with up to four.
    var seen = seenCounts[country.code] || 0;
    if (seen < 2) return 2;
    if (seen < 5) return 3;
    return 4;
  }

  function makeQuestion() {
    if (queue.length === 0) buildQueue();
    var target = queue.shift();

    var count = optionCount(target);
    var pool = DATA.countries.filter(function (c) {
      return c.code !== target.code && !confusableMap[target.code][c.code];
    });
    var distractors = shuffle(pool).slice(0, count - 1);

    return { target: target, options: shuffle([target].concat(distractors)), tries: 0 };
  }

  // ---- rendering -------------------------------------------------------

  function flagImg(country, extraClass) {
    return el('img', {
      src: './assets/flags/' + country.code + '.svg',
      alt: 'The flag of ' + country.name,
      class: 'flag-art' + (extraClass ? ' ' + extraClass : ''),
      draggable: 'false'
    });
  }

  function clearView() {
    while (VIEW.firstChild) VIEW.removeChild(VIEW.firstChild);
  }

  function renderHome() {
    screen = 'home';
    BTN_HOME.hidden = true;
    clearView();
    SPEECH.stop();

    var showcase = shuffle(DATA.countries).slice(0, 3);
    var hero = el('section', { class: 'home-hero' }, [
      el('div', { class: 'hero-flags' }, showcase.map(function (c) { return flagImg(c); }))
    ]);

    function modeCard(modeKey, title, blurb, sampleCodes) {
      return el('button', {
        class: 'mode-card mode-' + modeKey,
        type: 'button',
        onclick: function () { startSession(modeKey); }
      }, [
        el('div', { class: 'mode-art' }, sampleCodes.map(function (code) {
          return flagImg(byCode(code));
        })),
        el('h2', { class: 'mode-title', text: title }),
        el('p', { class: 'mode-blurb', text: blurb })
      ]);
    }

    VIEW.appendChild(el('div', { class: 'home' }, [
      hero,
      el('section', { class: 'mode-row' }, [
        modeCard('match', line('mode.match'), 'Tap the flag that is the same.', ['th', 'jp', 'br']),
        modeCard('country', line('mode.country'), 'Whose flag is this?', ['fr', 'np', 'ke'])
      ]),
      el('p', { class: 'home-note', text: DATA.countries.length + ' countries to meet' })
    ]));
  }

  function renderQuestion() {
    screen = 'question';
    BTN_HOME.hidden = false;
    clearView();
    SPEECH.stop();

    var q = question;
    var progress = el('div', { class: 'progress', role: 'status' }, [
      el('span', { class: 'progress-pill', text: (sessionIndex + 1) + ' / ' + QUESTIONS_PER_SESSION })
    ]);

    var promptId = mode === 'match'
      ? (q.tries >= REVEAL_AFTER_TRIES ? 'prompt.match.reveal' : 'prompt.match')
      : (q.tries >= REVEAL_AFTER_TRIES ? 'prompt.country.reveal' : 'prompt.country');
    var prompt = el('p', { class: 'prompt', text: line(promptId) });

    var stageFlag = el('div', { class: 'stage-flag' }, [flagImg(q.target)]);

    var options = el('div', { class: 'options options-' + (mode === 'match' ? 'flags' : 'names') });
    q.options.forEach(function (country) {
      var isTarget = country.code === q.target.code;
      var option;

      function judge() {
        if (screen !== 'question') return;

        if (mode === 'country' && !isTarget) {
          // Label on tap for a wrong guess: hearing the name teaches. A
          // CORRECT tap speaks its name after the card renders, because
          // renderCard's stop() would cancel anything queued here.
          SPEECH.say(country.name + '.', 'card.' + country.code + '.name');
        }

        if (isTarget) {
          SFX.correct();
          settleQuestion(true);
          // Praise (and the tapped country's name) speak AFTER renderCard's
          // stop() — the ordering is load-bearing.
          if (mode === 'country') {
            SPEECH.say(country.name + '.', 'card.' + country.code + '.name');
          }
          SPEECH.say(line('answer.correct.' + (1 + Math.floor(Math.random() * 4))));
        } else {
          q.tries += 1;
          option.classList.add('is-dimmed');
          SFX.retry();
          if (q.tries === 1) SPEECH.say(line('answer.retry.' + (1 + Math.floor(Math.random() * 2))));
          if (q.tries >= REVEAL_AFTER_TRIES) {
            revealAnswer();
          }
        }
      }

      if (mode === 'match') {
        option = el('button', { class: 'option option-flag', type: 'button', onclick: judge }, [flagImg(country)]);
      } else {
        option = el('button', {
          class: 'option option-name', type: 'button', onclick: judge,
          text: country.name
        });
      }
      option.dataset.code = country.code;
      options.appendChild(option);
    });

    VIEW.appendChild(el('div', { class: 'question question-' + mode }, [progress, prompt, stageFlag, options]));

    SPEECH.say(line(promptId));
  }

  function revealAnswer() {
    var buttons = VIEW.querySelectorAll('.option');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].dataset.code === question.target.code) {
        buttons[i].classList.add('is-gold');
      }
    }
    SPEECH.say(line('answer.reveal'));
    SPEECH.say(question.target.name + '.', 'card.' + question.target.code + '.name');
  }

  function settleQuestion(correct) {
    if (!correct) return;
    var country = question.target;
    seenCounts[country.code] = (seenCounts[country.code] || 0) + 1;
    save('seen', seenCounts);
    sessionAnswered.push(country);
    renderCard(country);
  }

  function renderCard(country) {
    screen = 'card';
    clearView();
    SPEECH.stop();

    var factIndex = nextFactIndex(country);
    factCursor[country.code] = factIndex;
    save('factCursor', factCursor);

    var fact = country.facts[factIndex];
    var lines = DATA.cardLines(country);
    var heard = false;

    function hearCard() {
      if (heard) return;
      heard = true;
      SPEECH.say(lines['card.' + country.code + '.name'], 'card.' + country.code + '.name');
      SPEECH.say(lines['card.' + country.code + '.capital'], 'card.' + country.code + '.capital');
      SPEECH.say(lines['card.' + country.code + '.lookfor'], 'card.' + country.code + '.lookfor');
      saySentences(fact.text, 'card.' + country.code + '.fact' + (factIndex + 1));
    }

    var card = el('article', {
      class: 'knowledge-card',
      onclick: hearCard,
      role: 'button',
      tabindex: '0',
      onkeydown: function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); hearCard(); }
      }
    }, [
      el('div', { class: 'card-flag' }, [flagImg(country)]),
      el('h2', { class: 'card-name', text: country.name }),
      el('dl', { class: 'card-rows' }, [
        el('div', { class: 'card-row' }, [
          el('dt', { text: 'Capital' }), el('dd', { text: country.capital })
        ]),
        el('div', { class: 'card-row' }, [
          el('dt', { text: 'Look for' }), el('dd', { text: country.lookFor })
        ]),
        el('div', { class: 'card-row card-fact' }, [
          el('dt', { text: 'Tiny fact' }), el('dd', { text: fact.text })
        ])
      ]),
      el('p', { class: 'card-hear-hint', text: '\uD83D\uDD0A ' + line('card.tapToHear') })
    ]);

    var next = el('button', {
      class: 'btn btn-primary',
      type: 'button',
      text: line('card.next'),
      onclick: nextAfterCard
    });

    VIEW.appendChild(el('div', { class: 'card-screen' }, [card, next]));
  }

  function nextAfterCard() {
    sessionIndex += 1;
    if (sessionIndex >= QUESTIONS_PER_SESSION) {
      renderDone();
    } else {
      question = makeQuestion();
      renderQuestion();
    }
  }

  function renderDone() {
    screen = 'done';
    clearView();
    SPEECH.stop();
    SFX.fanfare();

    VIEW.appendChild(el('div', { class: 'done' }, [
      el('h2', { class: 'done-title', text: line('session.done') }),
      el('div', { class: 'done-flags' }, sessionAnswered.map(function (c) {
        return el('img', {
          src: './assets/flags/' + c.code + '.svg',
          alt: c.name,
          class: 'flag-art done-flag',
          draggable: 'false'
        });
      })),
      el('div', { class: 'done-row' }, [
        el('button', {
          class: 'btn btn-primary', type: 'button', text: 'Play again',
          onclick: function () { startSession(mode); }
        }),
        el('button', {
          class: 'btn', type: 'button', text: 'Home',
          onclick: renderHome
        })
      ])
    ]));

    SPEECH.say(line('session.done'));
  }

  function startSession(modeKey) {
    mode = modeKey;
    sessionIndex = 0;
    sessionAnswered = [];
    queue = [];
    question = makeQuestion();
    renderQuestion();
  }

  function byCode(code) {
    for (var i = 0; i < DATA.countries.length; i++) {
      if (DATA.countries[i].code === code) return DATA.countries[i];
    }
    return DATA.countries[0];
  }

  // ---- chrome ----------------------------------------------------------

  var soundOn = load('sound', true);
  function applySound() {
    SPEECH.setEnabled(soundOn);
    BTN_SOUND.setAttribute('aria-pressed', String(soundOn));
    BTN_SOUND.classList.toggle('is-off', !soundOn);
    save('sound', soundOn);
  }
  BTN_SOUND.addEventListener('click', function () {
    soundOn = !soundOn;
    applySound();
    if (soundOn) SFX.tap();
  });

  BTN_HOME.addEventListener('click', function () {
    SPEECH.stop();
    renderHome();
  });

  // Warm the voice list (some browsers load voices asynchronously).
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = function () { window.speechSynthesis.getVoices(); };
    }
  }

  applySound();
  renderHome();
})();
