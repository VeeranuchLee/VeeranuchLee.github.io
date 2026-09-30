// flags-app/app.js — the game.
//
// Home modes from the expansion roadmap:
//   Explore Flags  — browse all 39 flags and open a rotating country page.
//   Which country? — see a flag, tap the country it belongs to.
//   World map      — three ways to relate a country <-> the map (2026-09-30,
//                    owner: "add world map and ability to tap and relate
//                    country <-> map"): flag -> tap it on the map, glowing
//                    country -> pick its flag of 3, and explore (tap a country
//                    to meet its flag and name). Natural Earth geometry in
//                    assets/map/world.js; no text is ever drawn on the map.
// Match the flag's engine is deliberately retained below but has no UI entry.
// Owner decision, 2026-09-25: keep the engine for now; hide the mode rather
// than delete working quiz code. Every correct quiz answer opens the original
// knowledge card: flag, country, capital, "look for" cue and ONE tiny fact.
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
  var MAP = window.FLAGS_MAP || null;

  var VIEW = document.getElementById('view-root');
  var BTN_HOME = document.getElementById('btn-home');
  var BTN_HUB = document.getElementById('btn-hub');
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
  var mapSeen = load('mapSeen', {});       // code -> map rounds completed

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

  var screen = 'home'; // home | explore | country-info | question | card | done | map-menu | map-quiz | map-explore
  var mode = 'match';  // match | country (Match is retained but UI-unreachable)
  var queue = [];
  var question = null; // current question object
  var sessionAnswered = [];
  var sessionIndex = 0;
  var exploreScrollY = 0;

  function line(id) { return DATA.lines[id] || ''; }

  // AUDIO-DIRECTION: one sentence per utterance. Facts are stored as one
  // text for the card display; the robot voice splits them so each sentence
  // gets a real pause. Every sentence keeps a stable line id (the first uses
  // the fact id, later sentences use .2, .3, ...), so a later paid renderer
  // can harvest every utterance from the data layer.
  // No regex lookbehind: the design floor includes older iOS Safari.
  function saySentences(text, lineId) {
    var parts = String(text).match(/[^.!?]+[.!?]+["']?\s*/g) || [String(text)];
    parts.forEach(function (part, i) {
      var trimmed = part.trim();
      if (!trimmed) return;
      var sentenceId = lineId + (i > 0 ? '.' + (i + 1) : '');
      SPEECH.say(trimmed, sentenceId);
    });
  }

  function nextFactIndex(country) {
    var facts = country.facts;
    var last = typeof factCursor[country.code] === 'number' ? factCursor[country.code] : -1;
    return (last + 1) % facts.length;
  }

  function buildQueue(counts) {
    // Least-seen first, shuffled within equal counts, so every country gets
    // its card before favourites repeat.
    counts = counts || seenCounts;
    var bySeen = {};
    DATA.countries.forEach(function (c) {
      var n = counts[c.code] || 0;
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

  var APP_ROOT = document.getElementById('app-root');
  function clearView() {
    while (VIEW.firstChild) VIEW.removeChild(VIEW.firstChild);
    // Map screens fit the viewport (no page scroll); every other screen is
    // the normal scrolling layout. Map screens turn this on after clearing.
    if (APP_ROOT) APP_ROOT.classList.remove('is-map');
    mapView = null;
  }

  function scrollPageTo(y) {
    if (typeof window.scrollTo !== 'function') return;
    try { window.scrollTo(0, y); } catch (e) { /* older embedded webviews */ }
  }

  function pulseControl(control) {
    // Remove/reflow/add so a second tap visibly answers even when the same
    // short status message is shown again. Audio can be off; feedback is not.
    control.classList.remove('has-feedback');
    void control.offsetWidth;
    control.classList.add('has-feedback');
  }

  function renderHome() {
    screen = 'home';
    /* The two share the corner and swap. renderCard and renderDone deliberately leave
       both alone: they follow a question, so "back one level" still means the round. */
    BTN_HOME.hidden = true;
    BTN_HUB.hidden = false;
    clearView();
    SPEECH.stop();
    scrollPageTo(0);

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
        // Owner decision, 2026-09-25: Match the flag is replaced here. Its
        // full engine remains in this file for possible later restoration, but
        // there is deliberately no UI element that can call startSession('match').
        el('button', {
          class: 'mode-card mode-explore',
          type: 'button',
          onclick: function () { renderExplore(false); }
        }, [
          el('div', { class: 'mode-art' }, ['th', 'jp', 'br'].map(function (code) {
            return flagImg(byCode(code));
          })),
          el('h2', { class: 'mode-title', text: line('mode.explore') }),
          el('p', { class: 'mode-blurb', text: 'Browse every flag and meet a country.' })
        ]),
        modeCard('country', line('mode.country'), 'Whose flag is this?', ['fr', 'np', 'ke'])
      ].concat(MAP ? [
        el('button', {
          class: 'mode-card mode-map',
          type: 'button',
          onclick: renderMapMenu
        }, [
          el('div', { class: 'mode-art' }, [miniMap()]),
          el('h2', { class: 'mode-title', text: line('mode.map') }),
          el('p', { class: 'mode-blurb', text: 'Find each flag on the world map.' })
        ])
      ] : [])),
      el('p', { class: 'home-note', text: DATA.countries.length + ' countries to meet' })
    ]));
  }

  function renderExplore(restoreScroll) {
    screen = 'explore';
    BTN_HOME.hidden = false;
    BTN_HUB.hidden = true;
    clearView();
    SPEECH.stop();
    scrollPageTo(restoreScroll ? exploreScrollY : 0);

    var grid = el('div', {
      class: 'explore-grid',
      role: 'group',
      'aria-label': 'All ' + DATA.countries.length + ' flags'
    });
    DATA.countries.forEach(function (country) {
      var tile = el('button', {
        class: 'explore-tile',
        type: 'button',
        'aria-label': 'Open ' + country.name,
        onclick: function () {
          exploreScrollY = typeof window.scrollY === 'number' ? window.scrollY : 0;
          renderCountryInfo(country);
        }
      }, [
        flagImg(country, 'explore-flag'),
        el('span', { class: 'explore-country', text: country.name })
      ]);
      tile.dataset.code = country.code;
      grid.appendChild(tile);
    });

    VIEW.appendChild(el('section', { class: 'explore' }, [
      el('div', { class: 'explore-heading' }, [
        el('h2', { class: 'explore-title', text: line('mode.explore') }),
        el('p', {
          class: 'explore-intro',
          text: DATA.countries.length + ' flags — tap one to meet its country.'
        })
      ]),
      grid
    ]));

    SPEECH.say(line('explore.intro'), 'explore.intro');
  }

  function renderCountryInfo(country) {
    screen = 'country-info';
    BTN_HOME.hidden = false;
    BTN_HUB.hidden = true;
    clearView();
    SPEECH.stop();
    scrollPageTo(0);

    var factIndex = nextFactIndex(country);
    factCursor[country.code] = factIndex;
    save('factCursor', factCursor);

    var lines = DATA.cardLines(country);
    var fact = country.facts[factIndex];
    var factText = el('dd', { class: 'info-fact-text', text: fact.text });
    var factRow = el('div', { class: 'info-row info-fact-row' }, [
      el('dt', { text: 'Tiny fact' }), factText
    ]);
    factRow.dataset.factIndex = String(factIndex);

    var status = el('p', {
      class: 'info-status',
      role: 'status',
      'aria-live': 'polite',
      text: 'Choose Hear it or Another fact.'
    });

    function speakCurrentFact() {
      saySentences(fact.text, 'card.' + country.code + '.fact' + (factIndex + 1));
    }

    var hearButton = el('button', {
      class: 'btn btn-primary info-action info-hear',
      type: 'button',
      text: 'Hear it',
      onclick: function () {
        SFX.tap();
        SPEECH.stop();
        SPEECH.say(lines['card.' + country.code + '.name'], 'card.' + country.code + '.name');
        SPEECH.say(lines['card.' + country.code + '.region'], 'card.' + country.code + '.region');
        SPEECH.say(lines['card.' + country.code + '.capital'], 'card.' + country.code + '.capital');
        SPEECH.say(lines['card.' + country.code + '.lookfor'], 'card.' + country.code + '.lookfor');
        speakCurrentFact();
        status.textContent = 'Reading ' + country.name + ' from top to bottom.';
        pulseControl(hearButton);
      }
    });

    var anotherButton = el('button', {
      class: 'btn info-action info-another',
      type: 'button',
      text: 'Another fact',
      onclick: function () {
        SFX.tap();
        SPEECH.stop();
        factIndex = (factIndex + 1) % country.facts.length;
        factCursor[country.code] = factIndex;
        save('factCursor', factCursor);
        fact = country.facts[factIndex];
        factText.textContent = fact.text;
        factRow.dataset.factIndex = String(factIndex);
        status.textContent = 'Fact ' + (factIndex + 1) + ' of ' + country.facts.length + '.';
        pulseControl(factRow);
        pulseControl(anotherButton);
        // An explicit Another fact tap speaks the newly shown fact, matching
        // the existing tap-to-hear pattern. It is harmless when sound is off;
        // the text change and status above remain the visible feedback.
        speakCurrentFact();
      }
    });

    var backButton = el('button', {
      class: 'btn info-action info-back info-back-top',
      type: 'button',
      text: 'Back to flag browser',
      onclick: function () { renderExplore(true); }
    });

    var info = el('article', {
      class: 'country-info',
      'data-code': country.code,
      'aria-label': country.name + ' flag information'
    }, [
      el('div', { class: 'info-flag' }, [flagImg(country)]),
      el('h2', { class: 'info-country', text: country.name }),
      el('dl', { class: 'info-rows' }, [
        el('div', { class: 'info-row' }, [
          el('dt', { text: 'Region' }), el('dd', { class: 'info-region', text: country.region })
        ]),
        el('div', { class: 'info-row' }, [
          el('dt', { text: 'Capital' }), el('dd', { class: 'info-capital', text: country.capital })
        ]),
        el('div', { class: 'info-row' }, [
          el('dt', { text: 'Look for' }), el('dd', { class: 'info-lookfor', text: country.lookFor })
        ]),
        factRow
      ])
    ]);

    VIEW.appendChild(el('div', { class: 'country-info-screen' }, [
      backButton,
      info,
      el('div', { class: 'info-actions', role: 'group', 'aria-label': country.name + ' controls' }, [
        hearButton, anotherButton
      ]),
      status
    ]));
  }

  function renderQuestion() {
    screen = 'question';
    BTN_HOME.hidden = false;
    BTN_HUB.hidden = true;
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
          onclick: function () { replay(); }
        }),
        el('button', {
          class: 'btn', type: 'button', text: 'Home',
          onclick: renderHome
        })
      ])
    ]));

    SPEECH.say(line('session.done'));
  }

  var replay = function () { renderHome(); };

  function startSession(modeKey) {
    replay = function () { startSession(modeKey); };
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

  // ---- world map -------------------------------------------------------
  //
  // The geometry is real (Natural Earth 1:110m, public domain) so a child who
  // taps Brazil is tapping where Brazil is. Nothing is lettered on the map;
  // a country's name appears only as a brief label after a tap.
  //
  // Tap targets: a country whose largest piece is under TAP_MIN px on screen
  // (Singapore, Mauritius, Tonga, the Caribbean islands, small European
  // countries...) gets an INVISIBLE circle of TAP_MIN px diameter around a
  // point inside it. The svg has one click handler that resolves the tap
  // itself, so overlapping circles pick the nearest centre instead of the
  // last one drawn. Pinch zoom is never blocked here or anywhere else.

  var SVGNS = 'http://www.w3.org/2000/svg';
  var TAP_MIN = 64;
  var mapView = null;
  var CONTINENT_NAME = {
    as: 'Asia', eu: 'Europe', af: 'Africa', na: 'North America', sa: 'South America', oc: 'Australia and the Pacific'
  };

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }

  function flag(node, cls, on) {
    if (!node) return;
    if (on) node.classList.add(cls); else node.classList.remove(cls);
  }

  function inSet(id) {
    for (var i = 0; i < DATA.countries.length; i++) if (DATA.countries[i].code === id) return true;
    return false;
  }

  // A small decorative world for the home and menu cards: only the countries
  // in the game, no interaction.
  function miniMap() {
    var svg = svgEl('svg', { viewBox: '0 0 ' + MAP.w + ' ' + MAP.h, class: 'mini-map', 'aria-hidden': 'true' });
    svg.appendChild(svgEl('path', { d: MAP.ocean, class: 'map-ocean' }));
    MAP.shapes.forEach(function (s) {
      svg.appendChild(svgEl('path', { d: s.d, class: 'land c-' + s.c + (s.g ? ' in-set' : '') }));
    });
    return svg;
  }

  function buildMap(onTap) {
    var area = el('div', { class: 'map-area' });
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + MAP.w + ' ' + MAP.h,
      class: 'map-svg',
      role: 'img',
      'aria-label': 'Map of the world'
    });
    svg.appendChild(svgEl('path', { d: MAP.ocean, class: 'map-ocean' }));
    var nodes = {};
    var entries = {};
    var dots = [];
    MAP.shapes.forEach(function (s) {
      var p = svgEl('path', { d: s.d, class: 'land c-' + s.c + (s.g ? ' in-set' : ''), 'data-id': s.id });
      nodes[s.id] = p; entries[s.id] = s;
      svg.appendChild(p);
    });
    MAP.extra.forEach(function (e) {
      // too small for the 110m coastline: a visible dot; its circle is invisible
      var dot = svgEl('circle', { cx: e.x, cy: e.y, r: 12, class: 'land dot in-set c-' + e.c, 'data-id': e.id });
      nodes[e.id] = dot; entries[e.id] = e; dots.push(dot);
      svg.appendChild(dot);
    });
    var toast = el('div', { class: 'map-toast', role: 'status', 'aria-live': 'polite' });
    area.appendChild(svg);
    area.appendChild(toast);

    var toastTimer = null;
    var view = {
      area: area, svg: svg, nodes: nodes, entries: entries, locked: false,
      scale: function () {
        var ctm = svg.getScreenCTM ? svg.getScreenCTM() : null;
        return ctm ? ctm : null;
      },
      layout: function () {
        var ctm = view.scale();
        if (!ctm || !ctm.a) return;
        dots.forEach(function (dot) { dot.setAttribute('r', String(Math.max(7, 9 / ctm.a))); });
      },
      // Which country did this tap mean? What you touch is what you get,
      // except that specks (extras and countries under TAP_MIN/2 px) own a
      // TAP_MIN-px circle that wins over a big neighbour, and mid-sized small
      // countries (under TAP_MIN px) own the same circle over open sea and
      // countries the game does not cover. The nearest centre wins.
      resolve: function (ev) {
        var ctm = view.scale();
        var target = ev.target && ev.target.getAttribute ? ev.target.getAttribute('data-id') : null;
        if (!ctm || !isFinite(ev.clientX) || !isFinite(ev.clientY) || !ctm.a) return target;
        var direct = target && inSet(target) ? entries[target] : null;
        function dim(e) { return e.w === undefined ? 0 : Math.max(e.w, e.h) * ctm.a; }
        if (direct && dim(direct) < TAP_MIN) return target; // a tap on a small country itself
        var radius = TAP_MIN / 2;
        var best = null; var bestDist = radius + 1;
        DATA.countries.forEach(function (c) {
          var e = entries[c.code];
          if (!e) return;
          var d = dim(e);
          if (d >= TAP_MIN) return;
          // specks reach into a big neighbour; mid-sized small countries only
          // claim open sea and countries the game does not cover
          if (d >= TAP_MIN / 2 && direct) return;
          var sx = ctm.a * e.x + ctm.e; var sy = ctm.d * e.y + ctm.f;
          var dist = Math.sqrt((ev.clientX - sx) * (ev.clientX - sx) + (ev.clientY - sy) * (ev.clientY - sy));
          if (dist <= radius && dist < bestDist) { best = c.code; bestDist = dist; }
        });
        if (best) return best;
        return target;
      },
      mark: function (id, cls, on) { flag(nodes[id], cls, on); },
      clearMarks: function (cls) {
        Object.keys(nodes).forEach(function (id) { flag(nodes[id], cls, false); });
      },
      markContinent: function (cont, cls, on) {
        Object.keys(nodes).forEach(function (id) {
          if (entries[id].c === cont) flag(nodes[id], cls, on);
        });
      },
      say: function (text, ev) {
        if (!text) return;
        toast.textContent = text;
        var rect = area.getBoundingClientRect();
        var x = ev && isFinite(ev.clientX) ? ev.clientX - rect.left : rect.width / 2;
        var y = ev && isFinite(ev.clientY) ? ev.clientY - rect.top : rect.height / 2;
        toast.style.left = Math.max(70, Math.min(rect.width - 70, x)) + 'px';
        toast.style.top = Math.max(24, y - 34) + 'px';
        toast.classList.remove('is-shown');
        void toast.offsetWidth;
        toast.classList.add('is-shown');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('is-shown'); }, 1500);
      }
    };
    svg.addEventListener('click', function (ev) {
      if (view.locked) return;
      var id = view.resolve(ev);
      if (id) onTap(id, ev);
    });
    mapView = view;
    // measure once it is laid out, and again whenever the window changes
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(view.layout);
    return view;
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('resize', function () { if (mapView) mapView.layout(); });
  }

  function beginMapScreen(name) {
    screen = name;
    BTN_HOME.hidden = false;
    BTN_HUB.hidden = true;
    clearView();
    SPEECH.stop();
    scrollPageTo(0);
  }

  function renderMapMenu() {
    beginMapScreen('map-menu');
    function card(cls, title, blurb, art, action) {
      return el('button', { class: 'mode-card ' + cls, type: 'button', onclick: action }, [
        el('div', { class: 'mode-art' }, art),
        el('h2', { class: 'mode-title', text: title }),
        el('p', { class: 'mode-blurb', text: blurb })
      ]);
    }
    VIEW.appendChild(el('div', { class: 'home map-menu' }, [
      el('h2', { class: 'explore-title map-menu-title', text: line('mode.map') }),
      el('section', { class: 'mode-row' }, [
        card('map-mode-find', line('mode.mapFind'), 'See a flag. Tap its country.', [flagImg(byCode('br')), flagImg(byCode('jp'))],
          function () { startMapSession('find'); }),
        card('map-mode-pick', line('mode.mapPick'), 'A country glows. Pick its flag.', [flagImg(byCode('ke')), flagImg(byCode('mx'))],
          function () { startMapSession('pick'); }),
        card('map-mode-explore', line('mode.mapExplore'), 'Tap any country to meet it.', [miniMap()],
          renderMapExplore)
      ])
    ]));
    SPEECH.say(line('map.menu.intro'), 'map.menu.intro');
  }

  // ---- map quiz (flag -> map, map -> flag) -----------------------------

  var mapMode = 'find'; // find | pick
  var mapQ = null;

  function pickDistinctOptions(target, count) {
    // Distinct flags: never a confusable partner of the target or of each
    // other, so a child is choosing between looks, not squinting.
    var chosen = [target];
    var pool = shuffle(DATA.countries.filter(function (c) { return c.code !== target.code; }));
    for (var i = 0; i < pool.length && chosen.length < count; i++) {
      var ok = chosen.every(function (c) { return !confusableMap[c.code][pool[i].code]; });
      if (ok) chosen.push(pool[i]);
    }
    return shuffle(chosen);
  }

  function makeMapQuestion() {
    if (queue.length === 0) buildQueue(mapSeen);
    var target = queue.shift();
    return {
      target: target, tries: 0, done: false,
      options: mapMode === 'pick' ? pickDistinctOptions(target, 3) : null
    };
  }

  function startMapSession(modeKey) {
    replay = function () { startMapSession(modeKey); };
    mapMode = modeKey;
    sessionIndex = 0;
    sessionAnswered = [];
    queue = [];
    mapQ = makeMapQuestion();
    renderMapQuiz();
  }

  function mapHint() {
    // Second miss: teach the region, not the answer (two-threshold hint rule).
    mapView.markContinent(mapView.entries[mapQ.target.code].c, 'is-hint', true);
    SPEECH.say(line('map.hint'), 'map.hint');
    mapView.say('Look in ' + CONTINENT_NAME[mapView.entries[mapQ.target.code].c] + '.', null);
  }

  function mapReveal() {
    // Third miss: the country itself pulses gold. Gold always means "here it is".
    mapView.mark(mapQ.target.code, 'is-gold', true);
    var goldFlag = VIEW.querySelector('.map-options .option[data-code="' + mapQ.target.code + '"]');
    if (goldFlag) goldFlag.classList.add('is-gold');
    SFX.reveal();
    SPEECH.say(line('answer.reveal'), 'answer.reveal');
    SPEECH.say(mapQ.target.name + '.', 'card.' + mapQ.target.code + '.name');
  }

  function mapMiss(country, ev, tappedId) {
    var q = mapQ;
    q.tries += 1;
    SFX.retry();
    if (q.tries === REVEAL_AFTER_TRIES) { mapReveal(); return; }
    if (country) {
      SPEECH.stop();
      SPEECH.say(country.name + '.', 'card.' + country.code + '.name');
    }
    if (q.tries === 1) SPEECH.say(line('answer.retry.' + (1 + Math.floor(Math.random() * 2))));
    if (q.tries === 2) mapHint();
  }

  function mapSolved() {
    var q = mapQ;
    q.done = true;
    mapView.clearMarks('is-hint');
    mapView.mark(q.target.code, 'is-gold', false);
    mapView.mark(q.target.code, 'is-glow', false);
    mapView.mark(q.target.code, 'is-solved', true);
    SFX.correct();
    mapSeen[q.target.code] = (mapSeen[q.target.code] || 0) + 1;
    save('mapSeen', mapSeen);
    sessionAnswered.push(q.target);
    var foot = VIEW.querySelector('.map-foot');
    while (foot.firstChild) foot.removeChild(foot.firstChild);
    foot.appendChild(el('div', { class: 'map-found' }, [
      el('span', { class: 'map-found-flag' }, [flagImg(q.target)]),
      el('span', { class: 'map-found-text' }, [
        el('strong', { class: 'map-found-name', text: q.target.name }),
        el('span', { class: 'map-found-capital', text: 'Capital: ' + q.target.capital })
      ])
    ]));
    foot.appendChild(el('button', {
      class: 'btn btn-primary map-next', type: 'button', text: line('card.next'),
      onclick: nextAfterMap
    }));
    // Praise and the country's name speak AFTER stop(): the order is load-bearing.
    SPEECH.stop();
    SPEECH.say(q.target.name + '.', 'card.' + q.target.code + '.name');
    SPEECH.say(line('answer.correct.' + (1 + Math.floor(Math.random() * 4))));
  }

  function nextAfterMap() {
    sessionIndex += 1;
    if (sessionIndex >= QUESTIONS_PER_SESSION) {
      renderDone();
    } else {
      mapQ = makeMapQuestion();
      renderMapQuiz();
    }
  }

  function renderMapQuiz() {
    beginMapScreen('map-quiz');
    APP_ROOT.classList.add('is-map');
    var q = mapQ;
    var isFind = mapMode === 'find';

    var pill = el('span', { class: 'progress-pill', text: (sessionIndex + 1) + ' / ' + QUESTIONS_PER_SESSION });
    var promptId = isFind ? 'map.find.prompt' : 'map.pick.prompt';
    var prompt = el('p', { class: 'prompt map-prompt', text: line(promptId) });
    var head = el('div', { class: 'map-head' }, [pill]);
    if (isFind) {
      var askFlag = flagImg(q.target, 'map-ask-flag');
      askFlag.dataset.code = q.target.code;
      head.appendChild(el('div', { class: 'map-ask' }, [askFlag]));
    }
    head.appendChild(prompt);

    var view = buildMap(function (id, ev) {
      if (q.done) return;
      var entry = view.entries[id];
      var country = inSet(id) ? byCode(id) : null;
      if (isFind) {
        if (id === q.target.code) { mapSolved(); return; }
        view.mark(id, 'is-wrong', true);
        setTimeout(function () { view.mark(id, 'is-wrong', false); }, 600);
        // the tapped country shows its own name for a moment (no label at all
        // where a name would be disputed or the app has nothing to say)
        view.say(entry && entry.n ? entry.n : null, ev);
        mapMiss(country, ev, id);
      }
    });

    VIEW.appendChild(el('div', { class: 'map-screen map-screen-' + mapMode }, [head, view.area].concat(
      isFind ? [] : [el('div', { class: 'map-options', role: 'group', 'aria-label': 'Choose the flag' },
        q.options.map(function (country) {
          var option = el('button', { class: 'option option-flag', type: 'button', 'aria-label': 'Flag choice' }, [flagImg(country)]);
          option.dataset.code = country.code;
          option.addEventListener('click', function () {
            if (q.done) return;
            if (country.code === q.target.code) {
              option.classList.add('is-right');
              mapSolved();
              return;
            }
            option.classList.add('is-dimmed');
            mapMiss(country, null, country.code);
          });
          return option;
        }))],
      [el('div', { class: 'map-foot', 'aria-live': 'polite' })])));

    if (!isFind) view.mark(q.target.code, 'is-glow', true);
    SPEECH.say(line(promptId), promptId);
  }

  // ---- explore the map ---------------------------------------------------

  function renderMapExplore() {
    beginMapScreen('map-explore');
    APP_ROOT.classList.add('is-map');
    var panel = el('div', { class: 'map-panel', 'aria-live': 'polite' }, [
      el('p', { class: 'map-panel-hint', text: line('map.explore.hint') })
    ]);
    var view = buildMap(function (id) {
      if (!inSet(id)) return; // drawn but quiet: the country is not in the game
      var country = byCode(id);
      view.clearMarks('is-selected');
      view.mark(id, 'is-selected', true);
      while (panel.firstChild) panel.removeChild(panel.firstChild);
      var shownFlag = flagImg(country, 'map-panel-flag');
      panel.appendChild(el('div', { class: 'map-found', 'data-code': id }, [
        el('span', { class: 'map-found-flag' }, [shownFlag]),
        el('span', { class: 'map-found-text' }, [
          el('strong', { class: 'map-found-name', text: country.name }),
          el('span', { class: 'map-found-capital', text: 'Capital: ' + country.capital })
        ])
      ]));
      SFX.tap();
      SPEECH.stop();
      SPEECH.say(country.name + '.', 'card.' + id + '.name');
      SPEECH.say('The capital is ' + country.capital + '.', 'card.' + id + '.capital');
    });
    VIEW.appendChild(el('div', { class: 'map-screen map-screen-explore' }, [
      el('p', { class: 'prompt map-prompt', text: line('map.explore.prompt') }),
      view.area,
      panel
    ]));
    SPEECH.say(line('map.explore.prompt'), 'map.explore.prompt');
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
    if (screen === 'country-info') renderExplore(true);
    else if (screen === 'map-quiz' || screen === 'map-explore') renderMapMenu();
    else renderHome();
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
