/* app.js -- My Writing (first-writer-app).
   A child's first word processor that teaches spelling instead of fixing it.

   The contract this page keeps (see work_progress_and_other_discussion.md):
   - Nothing changes by itself, ever. The iPad's autocorrect/autocapitalize/
     spellcheck are OFF; a word is only ever replaced by the child retyping it.
   - A word in `known` (bank list + simple endings + the child's own accepted
     words) just sits on the page. A word with at least one candidate in the
     teach list (Spell.candidates: sound-aware distance, up to three words)
     gets a soft orange wavy line and a pencil mark; tapping it opens the
     Teaching card. Anything else (names, made-up words) sits untouched.
   - When more than one teach word could be it, the card's first step is a
     CHOICE: up to three big picture buttons, one tap hears the word and
     selects it, and the child says which one they meant. The machine never
     guesses on the child's behalf -- a wrong "did you mean" teaches a
     falsehood. With one candidate the card asks its single yes/no question.
   - Then the card teaches in three steps -- tiles of the child's own
     spelling, then letter names with blank tiles, and only on the third
     attempt the answer, revealed letter by letter. It never says "wrong".
   - Everything the child needs while typing stays in the top part of the
     screen; the keyboard can cover only the paper and the shelf.

   Storage goes through SafeStorage (never bare localStorage), the audio is
   only the .m4a clips copied by tools/build-bank.py (no speechSynthesis, no
   network), and the back button is the shared cg-back control. */
(function () {
  'use strict';

  /* ---- bank ------------------------------------------------------------ */

  var BANK = window.WRITER_BANK || { teach: {}, known: [] };
  if (!window.WRITER_BANK && window.console) {
    console.warn('first-writer: data/bank.js is missing -- run ' +
      'first-writer-app/tools/build-bank.py. Words will not be checked.');
  }
  var teachOrder = Object.keys(BANK.teach); /* insertion order = CSV frequency order first */
  var knownSet = new Set(BANK.known || []);
  var S = window.Spell;

  /* ---- storage --------------------------------------------------------- */

  var KEY = 'first-writer:state:v1';
  var state = { story: [], stars: 0, shelf: [], own: [] };

  function save() {
    SafeStorage.local.setItem(KEY, JSON.stringify({
      v: 1, story: state.story, stars: state.stars,
      shelf: state.shelf, own: state.own
    }));
  }

  function load() {
    var raw = SafeStorage.local.getItem(KEY);
    if (!raw) return;
    var data = null;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || data.v !== 1) return;
    var story = [];
    if (Array.isArray(data.story)) {
      for (var i = 0; i < data.story.length; i++) {
        var it = data.story[i];
        if (it && (it.k === 'w' || it.k === 'p' || it.k === 'br') && typeof it.text !== 'undefined') {
          story.push(it);
        }
      }
    }
    state.story = story;
    state.stars = Math.max(0, data.stars | 0);
    state.shelf = (Array.isArray(data.shelf) ? data.shelf : []).filter(isPlainWord).slice(0, 30);
    state.own = Array.isArray(data.own) ? data.own.filter(isPlainWord) : [];
    for (i = 0; i < state.own.length; i++) knownSet.add(state.own[i]);
  }

  function isPlainWord(w) { return typeof w === 'string' && /^[a-z]+$/.test(w); }

  /* ---- elements --------------------------------------------------------- */

  var typeBox = document.getElementById('typeBox');
  var lines = document.getElementById('lines');
  var paper = document.getElementById('paper');
  var starRow = document.getElementById('starRow');
  var shelf = document.getElementById('shelf');
  var undoBtn = document.getElementById('undoBtn');
  var newPageBtn = document.getElementById('newPageBtn');
  var newPageLabel = document.getElementById('newPageLabel');
  var cardEl = document.getElementById('card');
  var cardBody = document.getElementById('cardBody');
  var cardClose = document.getElementById('cardClose');
  var statusEl = document.getElementById('status');

  /* ---- drawn icons (no emoji, no text glyphs) ---------------------------- */

  var ICON_PENCIL = '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 17.2l1-4 9.2-9.2 3 3-9.2 9.2-4 1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13.5 5.7l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.4.9-4.7 4.4 1.2 6.4L12 17.1l-5.8 3.1 1.2-6.4L2.7 9.4l6.4-.9z" fill="currentColor"/></svg>';
  var ICON_SAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" fill="currentColor"/><path d="M16 9a4.2 4.2 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.6 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_SWAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h11l-3.2-3.2M19 16H8l3.2 3.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function status(msg) { statusEl.textContent = msg; }

  /* ---- audio: only the copied .m4a clips, through one <audio> element -----
     Playback is a queue, never an onended chain: each item advances on
     onended OR a duration-based timer, whichever comes first, so one missed
     event cannot swallow the rest of a letter sequence (AUDIO-DIRECTION.md's
     "never chain playback on an onend callback"). */

  var player = document.getElementById('player');
  var queue = [];

  function stopQueue() {
    queue = [];
    try { player.pause(); } catch (e) { /* not loaded yet */ }
  }

  function playQueue(items) {
    stopQueue();
    queue = items.slice();
    runQueue();
  }

  function runQueue() {
    var item = queue.shift();
    if (!item) return;
    var advanced = false;
    var timer = null;
    function advance() {
      if (advanced) return;
      advanced = true;
      clearTimeout(timer);
      player.onended = player.onerror = player.onloadedmetadata = null;
      runQueue();
    }
    if (item.onStart) item.onStart();
    player.onended = advance;
    player.onerror = advance;
    player.onloadedmetadata = function () {
      clearTimeout(timer);
      var dur = isFinite(player.duration) && player.duration > 0 ? player.duration : 2;
      timer = setTimeout(advance, dur * 1000 + 900);
    };
    player.src = item.src;
    var played = player.play();
    if (played && played.catch) played.catch(advance);
    timer = setTimeout(advance, 5000); /* metadata never arrived */
  }

  function wordClip(word) {
    var e = BANK.teach[word];
    return e && e.a ? e.a : null;
  }

  function letterClip(ch) { return 'sounds/letters/' + ch + '.m4a'; }

  function playWord(word) {
    var clip = wordClip(word);
    if (clip) playQueue([{ src: clip }]);
  }

  /* word clip, then one clip per letter; onLetter(i) fires as letter i starts */
  function letterSequence(word, onLetter) {
    var items = [];
    var clip = wordClip(word);
    if (clip) items.push({ src: clip });
    for (var i = 0; i < word.length; i++) {
      items.push((function (idx) {
        return { src: letterClip(word.charAt(idx)), onStart: function () { onLetter(idx); } };
      })(i));
    }
    return items;
  }

  /* ---- classifying a typed word ------------------------------------------ */

  function classify(raw) {
    var n = S.normalise(raw);
    if (!n) return { st: 'plain' };
    if (knownSet.has(n) || S.isKnown(raw, knownSet)) return { st: 'known' };
    if (teachOrder.length) {
      /* underline only when at least one teach candidate qualifies; sug is
         the best one, and the card recomputes the full list when opened */
      var hits = S.candidates(raw, teachOrder, 1);
      if (hits.length && BANK.teach[hits[0]]) return { st: 'teach', sug: hits[0] };
    }
    return { st: 'plain' };
  }

  /* ---- the typing box: a word is finished by space, punctuation or Enter -- */

  var IS_LETTER = /[A-Za-z]/;

  function commitFromText(text) {
    var re = /([A-Za-z]+)|([^A-Za-z]+)/g;
    var m;
    while ((m = re.exec(text))) {
      if (m[1]) {
        var cls = classify(m[1]);
        state.story.push({ k: 'w', text: m[1], st: cls.st, sug: cls.sug || null, off: false });
      } else {
        state.story.push({ k: 'p', text: m[2] });
      }
    }
  }

  function onType() {
    var v = typeBox.value;
    var lastSep = -1;
    for (var i = 0; i < v.length; i++) {
      if (!IS_LETTER.test(v.charAt(i))) lastSep = i;
    }
    if (lastSep === -1) return; /* one word still being typed */
    commitFromText(v.slice(0, lastSep + 1));
    typeBox.value = v.slice(lastSep + 1); /* the unfinished word stays in the box */
    afterCommit();
  }

  function onEnter(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var hadText = !!typeBox.value;
    if (hadText) commitFromText(typeBox.value);
    var last = state.story[state.story.length - 1];
    /* a break only when something precedes it that is not already a break */
    var wantBreak = hadText || (last && last.k !== 'br');
    if (wantBreak) state.story.push({ k: 'br' });
    typeBox.value = '';
    if (hadText || wantBreak) afterCommit();
  }

  function afterCommit() {
    save();
    render();
    scrollNewest();
  }

  function scrollNewest() {
    var spans = lines.querySelectorAll('.w');
    var el = spans.length ? spans[spans.length - 1] : lines.lastElementChild;
    if (!el) return;
    var top = el.offsetTop - 4;
    if (top > paper.scrollTop) paper.scrollTop = top;
  }

  /* ---- rendering ---------------------------------------------------------- */

  function render() {
    renderPaper();
    renderStars();
    renderShelf();
    var hasWords = state.story.some(function (it) { return it.k === 'w'; });
    undoBtn.disabled = !hasWords;
    undoBtn.classList.toggle('dim', !hasWords);
  }

  function renderPaper() {
    if (!state.story.length) {
      lines.innerHTML = '<span class="shelf-hint">Your story will grow here, word by word.</span>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.story.length; i++) {
      var it = state.story[i];
      if (it.k === 'br') { html += '<br>'; continue; }
      if (it.k === 'p') {
        html += '<span class="punct">' + escapeHtml(it.text) + '</span>';
        continue;
      }
      var watch = it.st === 'teach' && !it.off;
      if (it.st === 'teach' && !BANK.teach[it.sug]) {
        it.st = 'plain'; /* the bank shrank under an old story; never flag blindly */
        watch = false;
      }
      html += '<span class="w' + (watch ? ' watch' : '') + '" data-i="' + i + '"' +
        (watch ? ' role="button" tabindex="0" aria-label="' +
          escapeHtml(it.text) + ', tap for help with this word"' : '') + '>' +
        escapeHtml(it.text) + (watch ? ICON_PENCIL : '') + '</span>';
    }
    lines.innerHTML = html;
  }

  function renderStars() {
    var n = state.stars;
    var html = '';
    for (var i = 0; i < Math.min(n, 10); i++) html += ICON_STAR;
    if (n > 10) html += '<span>&times;' + n + '</span>';
    starRow.innerHTML = html;
    starRow.setAttribute('aria-label', n ? n + (n === 1 ? ' star' : ' stars') : 'No stars yet');
  }

  function renderShelf() {
    if (!state.shelf.length) {
      shelf.innerHTML = '<p class="shelf-hint">Words you fix will appear here.</p>';
      return;
    }
    shelf.innerHTML = state.shelf.map(function (w) {
      var clip = wordClip(w);
      return '<button class="chip" type="button" data-w="' + escapeHtml(w) + '"' +
        (clip ? '' : ' disabled') + ' aria-label="Play the word ' + escapeHtml(w) + '">' +
        escapeHtml(w) + ICON_SAY + '</button>';
    }).join('');
  }

  /* ---- tools: undo + second-tap New page ----------------------------------- */

  function undoLastWord() {
    var s = state.story;
    while (s.length && (s[s.length - 1].k === 'p' || s[s.length - 1].k === 'br')) s.pop();
    if (s.length && s[s.length - 1].k === 'w') s.pop();
    save();
    render();
    status('Took the last word off the page.');
  }

  var armTimer = null;

  function disarmNewPage() {
    clearTimeout(armTimer);
    armTimer = null;
    newPageBtn.classList.remove('armed');
    newPageLabel.textContent = 'New page';
  }

  function onNewPage() {
    if (armTimer) { /* second tap confirms */
      disarmNewPage();
      state.story = [];
      save();
      render();
      status('A clean page. Write something new.');
      typeBox.focus();
      return;
    }
    newPageBtn.classList.add('armed');
    newPageLabel.textContent = 'Tap again for a new page';
    armTimer = setTimeout(disarmNewPage, 3000);
  }

  /* ---- the Teaching card ------------------------------------------------ */

  var card = { item: null, target: null, wrong: 0, choices: null };

  function openCard(item) {
    if (cardEl.hidden === false) closeCard();
    /* The candidate list is recomputed from the typed word every time: the
       ranking (or the bank) may have changed since the word was underlined. */
    var list = teachOrder.length ? S.candidates(item.text, teachOrder, 3) : [];
    list = list.filter(function (w) { return !!BANK.teach[w]; });
    /* A candidate with neither a picture nor a clip cannot be told from the
       others by picture and sound, so it is only offered when no candidate
       has either. */
    var withFace = list.filter(function (w) {
      var e = BANK.teach[w] || {};
      return e.p || e.a;
    });
    if (withFace.length) list = withFace;
    if (!list.length) { item.st = 'plain'; save(); render(); return; }
    card.item = item;
    card.wrong = 0;
    card.choices = list;
    typeBox.blur(); /* the card owns the next taps; the keyboard folds away */
    if (list.length === 1) {
      card.target = list[0];
      renderStage1();
    } else {
      card.target = null;
      renderChoiceStage();
    }
  }

  function closeCard() {
    cardEl.hidden = true;
    stopQueue();
    cardBody.innerHTML = '';
    card.item = null;
    card.target = null;
    card.choices = null;
  }

  function sayButton(clip, label) {
    return '<button class="say" type="button" aria-label="' + label + '"' +
      (clip ? '' : ' disabled') + '>' + ICON_SAY + '</button>';
  }

  function tileOf(ch, cls) {
    return '<span class="tile ' + (cls || '') + '">' + escapeHtml(ch) + '</span>';
  }

  /* A candidate with no picture and no clip: its first letter and its length
     as tiles, so the child can still tell the choices apart ("s _ _ _"). */
  function firstLetterTiles(word) {
    var html = '<span class="mini-tiles">' +
      '<span class="mini-tile">' + escapeHtml(word.charAt(0)) + '</span>';
    for (var i = 1; i < word.length; i++) html += '<span class="mini-tile blank"></span>';
    return html + '</span>';
  }

  /* Step 1 with more than one candidate: the child CHOOSES. Picture and
     sound only -- the printed word never appears, so the choice is made by
     ear and eye, not by reading. One tap on a choice plays its clip and
     selects it; "This one" stays disabled until a choice is selected. */
  function renderChoiceStage() {
    var html =
      '<div class="stage">' +
      '<h2>Which word did you mean?</h2>' +
      '<div class="word-choices">';
    for (var i = 0; i < card.choices.length; i++) {
      var w = card.choices[i];
      var e = BANK.teach[w] || {};
      var face;
      if (e.p) {
        face = '<img class="pic" src="' + escapeHtml(e.p) + '" alt="">';
      } else if (e.a) {
        face = '<span class="glyph-tile">' + ICON_SAY + '</span>';
      } else {
        face = firstLetterTiles(w);
      }
      var badge = e.a ? '<span class="badge">' + ICON_SAY + '</span>' : '';
      var label = (e.p || e.a) ? 'Hear this word'
        : 'It starts with ' + w.charAt(0) + ' and has ' + w.length + ' letters';
      html += '<button class="word-choice" type="button" data-w="' + escapeHtml(w) +
        '" aria-label="' + label + '" aria-pressed="false">' + face + badge + '</button>';
    }
    var anyClip = false;
    for (i = 0; i < card.choices.length; i++) {
      if (wordClip(card.choices[i])) { anyClip = true; break; }
    }
    html += '</div>' +
      '<p class="hint">' + (anyClip ? 'Tap one to hear it.' : 'Tap the one you meant.') + '</p>' +
      '<div class="choice-row">' +
      '<button class="choice yes pick-btn" type="button" disabled>This one — let me fix it</button>' +
      '<button class="choice no" type="button">None of these — my word is right</button>' +
      '</div></div>';
    cardBody.innerHTML = html;
    var pick = cardBody.querySelector('.pick-btn');
    var btns = cardBody.querySelectorAll('.word-choice');
    for (i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          for (var k = 0; k < btns.length; k++) {
            btns[k].classList.toggle('selected', btns[k] === btn);
            btns[k].setAttribute('aria-pressed', btns[k] === btn ? 'true' : 'false');
          }
          card.target = btn.getAttribute('data-w');
          pick.disabled = false;
          playWord(card.target); /* first tap: hear it AND select it */
        });
      })(btns[i]);
    }
    pick.addEventListener('click', function () {
      if (card.target) renderStage2();
    });
    cardBody.querySelector('.choice.no').addEventListener('click', keepOwnWord);
    cardEl.hidden = false;
  }

  /* Step 1 with exactly one candidate: which word did you mean? Picture +
     voice only -- the spelling is not shown yet, so the child has something
     to work out. */
  function renderStage1() {
    var t = card.target;
    var entry = BANK.teach[t] || {};
    var clip = wordClip(t);
    var middle;
    if (entry.p) {
      middle = '<img class="pic" src="' + escapeHtml(entry.p) + '" alt="">' +
        sayButton(clip, 'Play the word');
    } else if (clip) {
      middle = sayButton(clip, 'Play the word');
    } else {
      /* no picture and no clip: the first letter and the length, so the card
         still says something the child can check against their own word */
      middle = firstLetterTiles(t) +
        '<p class="hint">It starts with ' + t.charAt(0) + ' and has ' +
        t.length + ' letters.</p>';
    }
    cardBody.innerHTML =
      '<div class="stage">' +
      '<h2>Did you mean this word?</h2>' +
      middle +
      '<div class="choice-row">' +
      '<button class="choice yes" type="button">Yes, let me fix it</button>' +
      '<button class="choice no" type="button">No, my word is right</button>' +
      '</div></div>';
    var say = cardBody.querySelector('.say');
    if (clip) say.addEventListener('click', function () { playWord(t); });
    cardBody.querySelector('.choice.yes').addEventListener('click', renderStage2);
    cardBody.querySelector('.choice.no').addEventListener('click', keepOwnWord);
    cardEl.hidden = false;
    if (clip) playWord(t); /* plays once when the card opens (the tap's own reply) */
  }

  function tryRow(withLetters) {
    return '<div class="try-row">' +
      '<input class="try-input" type="text" autocomplete="off" autocorrect="off"' +
      ' autocapitalize="off" spellcheck="false" placeholder="Type the word"' +
      ' aria-label="Type the word">' +
      '<button class="say small" type="button" aria-label="' +
      (withLetters ? 'Play the word and its letters' : 'Play the word') + '">' +
      ICON_SAY + '</button>' +
      '<button class="check-btn" type="button">' + ICON_CHECK + '<span>Check</span></button>' +
      '</div>';
  }

  function blankTiles(word) {
    var html = '';
    for (var i = 0; i < word.length; i++) html += '<span class="tile"></span>';
    return html;
  }

  /* Step 2: the child's own spelling as tiles, the difference marked, the
     answer still hidden. The hint names the change, never a mistake. */
  function renderStage2() {
    var t = card.target;
    var ops = S.align(card.item.text, t);
    var tiles = '';
    for (var i = 0; i < ops.length; i++) {
      var o = ops[i];
      if (o.op === 'same') tiles += tileOf(o.a);
      else if (o.op === 'sub') tiles += tileOf(o.a, 'sub');
      else if (o.op === 'extra') tiles += tileOf(o.a, 'extra');
      else if (o.op === 'missing') tiles += '<span class="tile missing"></span>';
      else if (o.op === 'swap') tiles += '<span class="pair">' + tileOf(o.a) + ICON_SWAP + tileOf(o.a2) + '</span>';
    }
    cardBody.innerHTML =
      '<div class="stage">' +
      '<h2>Your spelling</h2>' +
      '<div class="tiles">' + tiles + '</div>' +
      '<p class="hint">' + escapeHtml(S.hintFor(ops)) + '</p>' +
      tryRow(false) +
      '</div>';
    bindTryRow(false);
    cardEl.hidden = false;
    focusTryInput();
  }

  /* Step 3 (after one more try): the word, then each letter's name, while
     blank tiles light up in order. Still no printed answer. */
  function renderStage3() {
    var t = card.target;
    cardBody.innerHTML =
      '<div class="stage">' +
      '<h2>Listen to the letters</h2>' +
      '<div class="tiles">' + blankTiles(t) + '</div>' +
      '<p class="hint">Listen, then type the word.</p>' +
      tryRow(true) +
      '</div>';
    var tiles = cardBody.querySelectorAll('.tile');
    bindTryRow(true, function () {
      playSequenceLighting(t, tiles);
    });
    cardEl.hidden = false;
    focusTryInput();
    playSequenceLighting(t, tiles);
  }

  function playSequenceLighting(word, tiles) {
    for (var i = 0; i < tiles.length; i++) tiles[i].classList.remove('lit');
    playQueue(letterSequence(word, function (idx) {
      tiles[idx].classList.add('lit');
    }));
  }

  /* Step 4 (third try): the answer, revealed one letter at a time with its
     sound, and the child copies it. */
  function renderStage4() {
    var t = card.target;
    cardBody.innerHTML =
      '<div class="stage">' +
      '<h2>Now copy the letters</h2>' +
      '<div class="tiles">' + blankTiles(t) + '</div>' +
      '<p class="hint">One letter at a time, then type the word.</p>' +
      tryRow(true) +
      '</div>';
    var tiles = cardBody.querySelectorAll('.tile');
    bindTryRow(true, function () {
      playSequenceRevealing(t, tiles);
    });
    cardEl.hidden = false;
    focusTryInput();
    playSequenceRevealing(t, tiles);
  }

  function playSequenceRevealing(word, tiles) {
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].textContent = '';
      tiles[i].classList.remove('lit');
    }
    playQueue(letterSequence(word, function (idx) {
      tiles[idx].textContent = word.charAt(idx);
      tiles[idx].classList.add('lit');
    }));
  }

  function bindTryRow(withLetters, replay) {
    var t = card.target;
    var say = cardBody.querySelector('.try-row .say');
    var check = cardBody.querySelector('.check-btn');
    var input = cardBody.querySelector('.try-input');
    say.addEventListener('click', function () {
      if (replay) replay();
      else playWord(t);
    });
    check.addEventListener('click', checkAttempt);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); checkAttempt(); }
    });
  }

  function focusTryInput() {
    var input = cardBody.querySelector('.try-input');
    if (input) input.focus();
  }

  function checkAttempt() {
    var input = cardBody.querySelector('.try-input');
    if (!input) return;
    var v = S.normalise(input.value);
    if (!v) return;
    if (v === S.normalise(card.target)) { succeedFix(); return; }
    card.wrong++;
    if (card.wrong === 1) renderStage3();  /* teach at the second attempt */
    else renderStage4();                   /* reveal at the third         */
  }

  function succeedFix() {
    var item = card.item;
    var t = card.target;
    var idx = state.story.indexOf(item);
    if (idx > -1) {
      item.text = t;
      item.st = 'known';
      item.sug = null;
      item.off = false;
      state.stars += 1;
      if (BANK.teach[t] && state.shelf.indexOf(t) === -1) {
        state.shelf.unshift(t);
        if (state.shelf.length > 30) state.shelf.pop();
      }
      save();
    }
    closeCard();
    render();
    if (idx > -1) {
      var el = lines.querySelector('.w[data-i="' + idx + '"]');
      if (el) {
        el.classList.add('flash');
        setTimeout(function () { el.classList.remove('flash'); }, 1200);
      }
      status(t + '. You fixed it. A star for you.');
    }
    typeBox.focus();
  }

  /* "No, my word is right": the underline comes off this word everywhere in
     this story, and the word joins the per-device own-words list. */
  function keepOwnWord() {
    var item = card.item;
    var n = S.normalise(item.text);
    if (n) {
      if (state.own.indexOf(n) === -1) state.own.push(n);
      knownSet.add(n);
    }
    for (var i = 0; i < state.story.length; i++) {
      var it = state.story[i];
      if (it.k === 'w' && it.st === 'teach' && !it.off &&
          S.normalise(it.text) === n) it.off = true;
    }
    save();
    closeCard();
    render();
    status('Kept your word: ' + item.text);
    typeBox.focus();
  }

  /* ---- wiring -------------------------------------------------------------- */

  typeBox.addEventListener('input', onType);
  typeBox.addEventListener('keydown', onEnter);

  lines.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.w.watch') : null;
    if (!el || !lines.contains(el)) return;
    var it = state.story[Number(el.getAttribute('data-i'))];
    if (it) openCard(it);
  });

  lines.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest ? e.target.closest('.w.watch') : null;
    if (!el || !lines.contains(el)) return;
    e.preventDefault();
    var it = state.story[Number(el.getAttribute('data-i'))];
    if (it) openCard(it);
  });

  shelf.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.chip') : null;
    if (!el || !shelf.contains(el) || el.disabled) return;
    playWord(el.getAttribute('data-w'));
  });

  undoBtn.addEventListener('click', function () {
    if (cardEl.hidden === false) closeCard();
    if (!undoBtn.disabled) undoLastWord();
  });

  newPageBtn.addEventListener('click', function () {
    if (cardEl.hidden === false) closeCard();
    onNewPage();
  });

  cardClose.addEventListener('click', function () {
    closeCard();
    typeBox.focus();
  });

  /* ---- go ------------------------------------------------------------------- */

  load();
  render();
})();
