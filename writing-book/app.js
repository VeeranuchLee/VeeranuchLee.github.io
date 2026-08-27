/* Writing Book — screens and flow.
 *
 * The loop from CONCEPT.md §30:
 *
 *   pick a page → see the picture → hear the word → write it or spell it →
 *   gentle feedback → finish the page → one random sticker →
 *   sticker book shows what is still missing → play the page again
 *
 * Three ways in, one sticker book behind them (CONCEPT.md §22):
 *
 *   write   the worksheet in this file — watch the stroke, trace the word
 *   find    vocab.js §13 — which letters are in this word? Any order
 *   spell   vocab.js §14 — the same screen, but in order
 *
 * One job per screen (CONCEPT.md §25): cover, the game, reward, book.
 */
(function () {
  'use strict';

  var L = window.WritingLetters;
  var Strokes = window.WritingStrokes;
  var Words = window.WritingWords;
  var Sound = window.WritingSound;
  var Vocab = window.WritingVocab;

  var screen = document.getElementById('screen');
  var STORE_KEY = 'writing-book/collected/v1';

  /* ---- what the child has collected ------------------------------------ */

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* Private browsing. The session still works; it just will not be there
         tomorrow. Never surfaced to the child. */
    }
  }

  var collected = load();

  function collectedIn(level) {
    return collected[String(level)] || [];
  }

  function collect(level, slug) {
    var key = String(level);
    collected[key] = collectedIn(level).concat([slug]);
    save(collected);
  }

  /* ---- helpers ---------------------------------------------------------- */

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function show(html) {
    screen.innerHTML = html;
    return screen;
  }

  function on(selector, handler) {
    var node = screen.querySelector(selector);
    if (node) node.addEventListener('click', handler);
    return node;
  }

  /* ---- what the child is playing ---------------------------------------- */

  /* Three ways into the same hundred words (CONCEPT.md §22), and one sticker
     book behind all of them. The mode is chosen once on the cover and sticks,
     so picking a page stays a single tap. */
  var MODES = [
    { id: 'write', icon: '✏️', label: 'Write it', hint: 'Trace the words.' },
    { id: 'find', icon: '🔎', label: 'Find letters', hint: 'Which letters are in the word?' },
    { id: 'spell', icon: '🔤', label: 'Spell it', hint: 'Put the letters in order.' }
  ];

  var MODE_KEY = 'writing-book/mode/v1';
  var mode = 'write';
  try {
    var stored = localStorage.getItem(MODE_KEY);
    if (stored && MODES.some(function (m) { return m.id === stored; })) mode = stored;
  } catch (e) { /* private browsing; the default stands */ }

  function setMode(next) {
    mode = next;
    try { localStorage.setItem(MODE_KEY, next); } catch (e) { /* not important */ }
  }

  function currentMode() {
    for (var i = 0; i < MODES.length; i++) if (MODES[i].id === mode) return MODES[i];
    return MODES[0];
  }

  /* ---- cover ------------------------------------------------------------ */

  function cover() {
    var modes = MODES.map(function (m) {
      return '<button class="mode' + (m.id === mode ? ' is-on' : '') + '" data-mode="' + m.id + '">' +
             '<span class="mode__icon">' + m.icon + '</span>' +
             '<span class="mode__label">' + m.label + '</span></button>';
    }).join('');

    var cards = Words.pages.map(function (page) {
      var have = collectedIn(page.level).length;
      var peek = page.words.slice(0, 3).map(function (w) {
        return '<img src="' + Words.picture(w.slug) + '" alt="" loading="lazy">';
      }).join('');
      return '' +
        '<button class="level" data-level="' + page.level + '"' +
        ' style="background-image:url(' + Words.paper(page.paper) + ')">' +
        '  <span class="level__veil"></span>' +
        '  <span class="level__count">' + have + '/' + page.words.length + '</span>' +
        '  <span class="level__n">LEVEL ' + page.level + '</span>' +
        '  <span class="level__title">' + page.title + '</span>' +
        '  <span class="level__peek">' + peek + '</span>' +
        '</button>';
    }).join('');

    /* Owner, 2026-08-27: "add the writing book back button", after the same thing went
       into Music Book and Clock Game. The cover only -- every screen inside already has a
       bar__back, so leaving the book is one more tap of the arrow the child already uses,
       not a second button competing with the first. Absolute URL on purpose: published,
       this app and /test-apps/ are siblings, but in the repo the hub lives under site/,
       so a relative link would work live and 404 in every local preview. */
    show('' +
      '<div class="cover">' +
      '  <div class="cover__out"><a class="bar__back" href="https://veeranuchlee.github.io/test-apps/" aria-label="Back to Test Apps">\u2190</a></div>' +
      '  <div class="cover__head">' +
      '    <h1>Writing Book</h1>' +
      '    <p id="cover-hint">' + currentMode().hint + '</p>' +
      '  </div>' +
      '  <div class="modes">' + modes + '</div>' +
      '  <div class="levels">' + cards + '</div>' +
      '  <div class="cover__book"><button class="control" id="open-book">📖 My stickers</button></div>' +
      '</div>');

    Array.prototype.forEach.call(screen.querySelectorAll('.mode'), function (button) {
      button.addEventListener('click', function () {
        Sound.unlock();
        Sound.play('tap');
        setMode(button.getAttribute('data-mode'));
        Array.prototype.forEach.call(screen.querySelectorAll('.mode'), function (other) {
          other.classList.toggle('is-on', other === button);
        });
        screen.querySelector('#cover-hint').textContent = currentMode().hint;
      });
    });

    Array.prototype.forEach.call(screen.querySelectorAll('.level'), function (button) {
      button.addEventListener('click', function () {
        Sound.unlock();
        Sound.play('tap');
        startSession(parseInt(button.getAttribute('data-level'), 10));
      });
    });
    on('#open-book', function () { Sound.play('tap'); book(); });
  }

  /* ---- a session -------------------------------------------------------- */

  /* All three modes read the same page and fill the same sticker book
     (CONCEPT.md §22). Only the screen in the middle differs. */
  function startSession(level) {
    var page = Words.page(level);
    if (mode === 'write') {
      /* Order is shuffled every run so the child retrieves the word rather than
         remembering the sequence — CONCEPT.md §18. */
      var queue = shuffle(page.words).slice(0, Words.SESSION_LENGTH);
      writing({ page: page, queue: queue, at: 0 });
      return;
    }
    Vocab.play(mode, { screen: screen, page: page, onFinished: reward, onBack: cover });
  }

  var PRAISE = ['Great!', 'Lovely!', 'Well done!', 'Beautiful!', 'Yes!'];

  var NUDGE = {
    start: 'Start at the green dot.',
    direction: 'Follow the line from the dot.',
    coverage: 'Keep going to the end.',
    accuracy: 'Stay on the line.',
    tooShort: 'Draw along the line.'
  };

  /* The worksheet page, from the owner's sketch of 2026-08-26.
   *
   *   ┌─────────────────────────────────────────┐
   *   │ ┌────┐   ▶  c u p      ← how it is done │
   *   │ │pic │      ⠉ ⠕ ⠏      ← the child's row│
   *   │ │cup │                                  │
   *   │ └────┘   ▶  c a t                       │
   *   │ ┌────┐      ⠉ ⠁ ⠞                       │
   *   │ │cat │                                  │
   *   ...
   *
   * The words for this page run down the left margin as picture cards, the same
   * place the owner drew them. Each word then gets two rows: the finished word
   * in ink, which writes itself when tapped, and the dotted row underneath that
   * the child traces.
   *
   * Rows activate in order. All three stay on the page the whole time — a child
   * can see what is coming and what they have done — but only one takes input,
   * so there is never a question about where to write next.
   */
  function writing(session) {
    var page = session.page;
    var tracing = Words.tracingLevel(page.level);
    var queue = session.queue;

    var cards = queue.map(function (entry, i) {
      return '<button class="wordcard" data-i="' + i + '">' +
             '<span class="wordcard__pic"><img src="' + Words.picture(entry.slug) +
             '" alt="' + entry.word + '"></span>' +
             '<span class="wordcard__word">' + entry.word + '</span>' +
             '<span class="wordcard__tick">✓</span></button>';
    }).join('');

    var entries = queue.map(function (entry, i) {
      return '<div class="entry" data-i="' + i + '">' +
             '  <div class="entry__row entry__row--model">' +
             '    <button class="playrow" data-i="' + i + '" aria-label="Watch ' + entry.word + ' being written">▶︎</button>' +
             '    <svg class="rowsvg" data-model="' + i + '" role="img" aria-label="' + entry.word + '"></svg>' +
             '  </div>' +
             '  <div class="entry__row entry__row--trace">' +
             '    <span class="playrow playrow--ghost" aria-hidden="true"></span>' +
             '    <svg class="rowsvg" data-trace="' + i + '" role="img" aria-label="Trace ' + entry.word + '"></svg>' +
             '  </div>' +
             '</div>';
    }).join('');

    show('' +
      '<div class="bar">' +
      '  <button class="bar__back" id="back" aria-label="Back to the pages">←</button>' +
      '  <span class="bar__title">' + page.title + '</span>' +
      '  <span class="says" id="says"></span>' +
      '</div>' +
      '<div class="page">' +
      '  <div class="paper" style="background-image:url(' + Words.paper(page.paper) + ')">' +
      '    <div class="sheet">' +
      '      <aside class="wordlist">' + cards + '</aside>' +
      '      <div class="lines">' + entries + '</div>' +
      '    </div>' +
      '  </div>' +
      '</div>');

    var says = screen.querySelector('#says');
    var models = [];
    var rows = [];
    var failures = 0;
    var at = 0;

    function tell(text, good) {
      says.textContent = text || '';
      says.classList.toggle('is-good', !!good);
    }

    function hear(i) {
      Sound.unlock();
      Sound.voice.word(queue[i].slug);
    }

    function activate(i) {
      at = i;
      rows.forEach(function (row, n) { row.setActive(n === i); });
      Array.prototype.forEach.call(screen.querySelectorAll('.entry'), function (node, n) {
        node.classList.toggle('is-active', n === i);
        node.classList.toggle('is-waiting', n > i);
      });
      if (i < queue.length) {
        hear(i);
        /* Write it for them once, unasked. A child who cannot read the buttons
           still sees what the row wants. */
        window.setTimeout(function () { models[i].demoWord('normal'); }, 500);
      }
    }

    queue.forEach(function (entry, i) {
      models.push(Strokes.create({
        svg: screen.querySelector('svg[data-model="' + i + '"]'),
        word: entry.word,
        mode: 'model'
      }));

      rows.push(Strokes.create({
        svg: screen.querySelector('svg[data-trace="' + i + '"]'),
        word: entry.word,
        level: tracing,
        mode: 'trace',

        onProgress: function (step) {
          failures = 0;
          tell(step.cue === 'Start here' ? 'Start at the green dot.' : step.cue);
        },

        onStroke: function (result) {
          if (result.pass) {
            failures = 0;
            Sound.play('strokeGood');
            tell(pick(PRAISE), true);
            return;
          }
          failures++;
          Sound.play('strokeRetry');
          tell(NUDGE[result.reason] || NUDGE.tooShort);
          /* Two misses on the same stroke and the app shows the child how,
             slowly, rather than repeating the same words at them —
             CONCEPT.md §24. */
          if (failures >= 2) {
            failures = 0;
            window.setTimeout(function () { rows[at].demo('slow'); }, 500);
          }
        },

        onLetter: function () { Sound.play('letterDone'); },

        onWord: function (word) {
          Sound.play('wordDone');
          tell('You wrote ' + word + '!', true);
          /* CONCEPT.md §15: completion restores the proper spelling out loud. */
          Sound.voice.spell(entry.slug);
          var card = screen.querySelector('.wordcard[data-i="' + i + '"]');
          if (card) card.classList.add('is-done');

          window.setTimeout(function () {
            if (i + 1 >= queue.length) {
              rows.forEach(function (r) { r.destroy(); });
              models.forEach(function (m) { m.destroy(); });
              reward(page);
            } else {
              tell('');
              activate(i + 1);
            }
          }, 1600);
        }
      }));
    });

    Array.prototype.forEach.call(screen.querySelectorAll('.playrow[data-i]'), function (button) {
      button.addEventListener('click', function () {
        var i = parseInt(button.getAttribute('data-i'), 10);
        Sound.play('tap');
        hear(i);
        models[i].demoWord('slow');
      });
    });

    Array.prototype.forEach.call(screen.querySelectorAll('.wordcard'), function (card) {
      card.addEventListener('click', function () {
        hear(parseInt(card.getAttribute('data-i'), 10));
      });
    });

    on('#back', function () {
      rows.forEach(function (r) { r.destroy(); });
      models.forEach(function (m) { m.destroy(); });
      cover();
    });

    activate(0);
  }

  /* ---- reward ------------------------------------------------------------ */

  /* CONCEPT.md §19: draw from the stickers this page has not given yet, so the
     child never gets a duplicate and the set is always eventually completable —
     but they still do not know which one is next. */
  function drawSticker(page) {
    var have = collectedIn(page.level);
    var left = page.words.filter(function (w) { return have.indexOf(w.slug) === -1; });
    if (!left.length) return null;
    return pick(left);
  }

  function reward(page) {
    var won = drawSticker(page);
    Sound.play('pageDone');

    if (!won) {
      show('' +
        '<div class="reward">' +
        '  <h2>' + page.title + ' is full!</h2>' +
        '  <p>You have every sticker on this page.</p>' +
        '  <div class="controls">' +
        '    <button class="control" id="again">Play again</button>' +
        '    <button class="control" id="home">Back to the pages</button>' +
        '  </div>' +
        '</div>');
    } else {
      collect(page.level, won.slug);
      show('' +
        '<div class="reward">' +
        '  <h2>Page complete!</h2>' +
        '  <p>Here is your sticker.</p>' +
        '  <img class="sticker" id="sticker" src="' + Words.card(won.slug) + '" alt="' + won.word + '">' +
        /* All three ways on from here. Without the third, a child who wanted a
           different page had to go via the sticker book to find one. */
        '  <div class="controls">' +
        '    <button class="control" id="again">Play again</button>' +
        '    <button class="control" id="book">📖 My stickers</button>' +
        '    <button class="control" id="home">Other pages</button>' +
        '  </div>' +
        '</div>');
      window.setTimeout(function () { Sound.play('stickerReveal'); }, 260);
      window.setTimeout(function () { Sound.voice.word(won.slug); }, 900);
      on('#sticker', function () { Sound.voice.word(won.slug); });
    }

    on('#again', function () { Sound.play('tap'); startSession(page.level); });
    on('#book', function () { Sound.play('tap'); book(); });
    on('#home', function () { Sound.play('tap'); cover(); });
  }

  /* ---- sticker book ------------------------------------------------------ */

  function book() {
    var pages = Words.pages.map(function (page) {
      var have = collectedIn(page.level);
      var slots = page.words.map(function (w) {
        if (have.indexOf(w.slug) === -1) {
          return '<div class="book__item"><div class="book__slot">?</div>' +
                 '<div class="book__word"></div></div>';
        }
        return '<div class="book__item" data-slug="' + w.slug + '">' +
               '<div class="book__slot">' +
               '<img src="' + Words.picture(w.slug) + '" alt="' + w.word + '" loading="lazy"></div>' +
               '<div class="book__word">' + w.word + '</div></div>';
      }).join('');
      return '<section class="book__page">' +
             '<h3>' + page.title + ' · ' + have.length + '/' + page.words.length + '</h3>' +
             '<div class="book__grid">' + slots + '</div></section>';
    }).join('');

    show('' +
      '<div class="bar">' +
      '  <button class="bar__back" id="back" aria-label="Back to the pages">←</button>' +
      '  <span class="bar__title">My stickers</span>' +
      '</div>' +
      '<div class="book">' + pages + '</div>');

    on('#back', function () { Sound.play('tap'); cover(); });
    /* A collected sticker says its own word — the reward doubles as review
       (CONCEPT.md §20). */
    Array.prototype.forEach.call(screen.querySelectorAll('.book__item[data-slug]'), function (slot) {
      slot.addEventListener('click', function () {
        Sound.unlock();
        Sound.voice.word(slot.getAttribute('data-slug'));
      });
    });
  }

  /* ---- start ------------------------------------------------------------- */

  /* A word with no stroke data would render as an empty writing line, so say so
     here, in the console, rather than letting a child meet a blank page. */
  var gaps = [];
  Words.pages.forEach(function (page) {
    page.words.forEach(function (w) {
      L.missing(w.word).forEach(function (ch) {
        if (gaps.indexOf(ch) === -1) gaps.push(ch);
      });
    });
  });
  if (gaps.length) {
    console.warn('[writing-book] no letterform for:', gaps.join(' '));
  }

  cover();
})();
