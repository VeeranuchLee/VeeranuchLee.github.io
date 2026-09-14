/* Writing Book — the two vocabulary games.
 *
 * CONCEPT.md §12–§15. Same screen for both, and the same rule underneath it:
 *
 *   THE WRITTEN ANSWER IS NEVER SHOWN.
 *
 * A child gets the picture, the spoken word, and the right number of blank
 * boxes. That is the whole clue. This is why art/words/ ships two crops of every
 * card — `picture/` has the printed word removed for exactly this screen, and
 * `card/` keeps it for the sticker book, where the answer is the reward.
 *
 *   find   §13 — which letters are in this word? Any order. Tapping a letter
 *                fills every box it belongs in at once, so APPLE gives both Ps
 *                for one tap. A wrong letter dims and is not offered again.
 *   spell  §14 — how is this word spelled, start to end? The same screen, but
 *                the letters have to go in in order. A wrong letter does not
 *                enter a box and is NOT taken away — the child tries again.
 *
 * That difference in what a wrong tap costs is the whole difficulty gap between
 * the two games, and it is straight out of the concept.
 *
 * CASE: the keys are lowercase, because every word the child has met in this app
 * is lowercase — on the cards, on the writing paper, in the sticker book. The
 * one word with a capital is the pronoun I, and matching is case-insensitive so
 * the lowercase key fills it. See README, open question 3.
 *
 * ERRORS ARE GENTLE (§24): a wrong tap wiggles and sounds softer than a right
 * one. No buzzer, no red cross, no score, no lives.
 */
(function (global) {
  'use strict';

  var Words = global.WritingWords;
  var Sound = global.WritingSound;

  /* Spelling is much quicker than tracing, so a page here is longer than the
     three words the writing sheet holds. Both award one sticker. */
  var SESSION_LENGTH = 5;

  var ROWS = ['abcdefg', 'hijklmn', 'opqrstu', 'vwxyz'];

  var PRAISE = ['Yes!', 'Good!', 'That one!', 'Well done!'];

  /* Drawn rather than set as 🔊: the emoji falls back to a flat monochrome glyph
     in the app's font stack, and this is the one control a child who cannot read
     relies on. */
  var SPEAKER_ICON =
    '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">' +
    '<path d="M6 12h5l6-5v18l-6-5H6z" fill="#2c3e63"/>' +
    '<path d="M21 11a7 7 0 0 1 0 10M25 8a11 11 0 0 1 0 16" fill="none" ' +
    'stroke="#2c3e63" stroke-width="2.4" stroke-linecap="round"/></svg>';

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* mode: 'find' | 'spell'
     options: { screen, page, onFinished, onBack } */
  function play(mode, options) {
    var screen = options.screen;
    var page = options.page;
    var queue = shuffle(page.words).slice(0, SESSION_LENGTH);
    var at = 0;

    var keys = ROWS.map(function (row) {
      return '<div class="keyrow">' + row.split('').map(function (ch) {
        return '<button class="key" data-key="' + ch + '">' + ch + '</button>';
      }).join('') + '</div>';
    }).join('');

    screen.innerHTML = '' +
      '<div class="bar">' +
      '  <button class="bar__back" id="back" aria-label="Back to the pages">←</button>' +
      '  <span class="bar__title">' + page.title + '</span>' +
      '  <span class="says" id="says"></span>' +
      '</div>' +
      '<div class="page">' +
      '  <div class="paper" style="background-image:url(' + Words.paper(page.paper) + ')">' +
      '    <div class="quiz">' +
      '      <div class="quiz__dots" id="dots"></div>' +
      '      <div class="quiz__prompt">' +
      '        <img class="quiz__picture" id="picture" alt="">' +
      '        <button class="speak" id="hear" aria-label="Hear the word">' + SPEAKER_ICON + '</button>' +
      '      </div>' +
      '      <div class="boxes" id="boxes"></div>' +
      '      <div class="keys" id="keys">' + keys + '</div>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    var says = screen.querySelector('#says');
    var boxes = screen.querySelector('#boxes');
    var picture = screen.querySelector('#picture');
    var dots = screen.querySelector('#dots');
    var keyNodes = {};
    Array.prototype.forEach.call(screen.querySelectorAll('.key'), function (node) {
      keyNodes[node.getAttribute('data-key')] = node;
    });

    var entry = null;
    var letters = [];      // the word's letters, as displayed
    var revealed = [];     // which boxes are open
    var next = 0;          // spell mode: the box waiting to be filled
    var locked = false;

    function tell(text, good) {
      says.textContent = text || '';
      says.classList.toggle('is-good', !!good);
    }

    function hear() {
      Sound.unlock();
      Sound.voice.word(entry.slug);
    }

    function wiggle(node) {
      node.classList.add('is-wrong');
      window.setTimeout(function () { node.classList.remove('is-wrong'); }, 420);
    }

    function renderBoxes() {
      boxes.innerHTML = letters.map(function (ch, i) {
        return '<span class="box' + (revealed[i] ? ' is-open' : '') + '">' +
               (revealed[i] ? ch : '') + '</span>';
      }).join('');
    }

    function renderDots() {
      dots.innerHTML = queue.map(function (_, i) {
        var cls = i < at ? 'is-done' : (i === at ? 'is-now' : '');
        return '<span class="' + cls + '"></span>';
      }).join('');
    }

    function loadWord() {
      entry = queue[at];
      letters = entry.word.split('');
      revealed = letters.map(function () { return false; });
      next = 0;
      locked = false;
      picture.src = Words.picture(entry.slug);
      picture.alt = '';
      Object.keys(keyNodes).forEach(function (k) {
        keyNodes[k].classList.remove('is-spent', 'is-wrong');
        keyNodes[k].disabled = false;
      });
      renderBoxes();
      renderDots();
      tell(mode === 'find' ? 'Which letters are in this word?' : 'Spell it from the start.');
      hear();
    }

    function finishWord() {
      locked = true;
      Sound.play('wordDone');
      boxes.classList.add('is-complete');
      tell(entry.word + '!', true);
      /* §15: the completion says the spelling back in the proper order, which
         matters most in `find` where the child discovered it out of order. */
      Sound.voice.spell(entry.slug);
      window.setTimeout(function () {
        boxes.classList.remove('is-complete');
        at++;
        if (at >= queue.length) options.onFinished(page);
        else loadWord();
      }, 1900);
    }

    function tap(ch) {
      if (locked) return;
      var node = keyNodes[ch];
      if (!node || node.disabled) return;
      Sound.unlock();

      if (mode === 'find') {
        /* Reveal every box this letter belongs in — one tap gets both Ps of
           APPLE. That is what keeps §13 easier than §14. */
        var hits = 0;
        letters.forEach(function (letter, i) {
          if (!revealed[i] && letter.toLowerCase() === ch) { revealed[i] = true; hits++; }
        });
        if (hits) {
          node.classList.add('is-spent');
          node.disabled = true;
          Sound.play('strokeGood');
          Sound.voice.letter(ch);
          renderBoxes();
          tell(pick(PRAISE), true);
          if (revealed.every(Boolean)) finishWord();
        } else {
          /* §13: not offered again, so the child is never stuck guessing the
             same wrong letter. It dims rather than disappearing. */
          node.classList.add('is-spent');
          node.disabled = true;
          Sound.play('strokeRetry');
          wiggle(node);
          tell('Not in this word.');
        }
        return;
      }

      /* spell */
      if (letters[next].toLowerCase() === ch) {
        revealed[next] = true;
        next++;
        Sound.play('strokeGood');
        Sound.voice.letter(ch);
        renderBoxes();
        tell(pick(PRAISE), true);
        if (next >= letters.length) finishWord();
      } else {
        /* §14: the letter does not go in, and the key stays available — the
           child gets another attempt at the same box. */
        Sound.play('strokeRetry');
        wiggle(node);
        tell('Try another letter.');
      }
    }

    Array.prototype.forEach.call(screen.querySelectorAll('.key'), function (node) {
      node.addEventListener('click', function () { tap(node.getAttribute('data-key')); });
    });
    screen.querySelector('#hear').addEventListener('click', hear);
    picture.addEventListener('click', hear);
    screen.querySelector('#back').addEventListener('click', function () {
      Sound.play('tap');
      options.onBack();
    });

    loadWord();
  }

  global.WritingVocab = {
    play: play,
    SESSION_LENGTH: SESSION_LENGTH
  };
})(window);
