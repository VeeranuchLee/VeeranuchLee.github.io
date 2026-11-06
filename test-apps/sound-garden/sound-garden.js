(function () {
  'use strict';

  var BASE_ORDER = ['s', 'a', 't', 'sh', 'ee'];
  var GARDENS = {
    'garden-1': ['s', 'a', 't', 'sh', 'e'],
    'garden-2': ['p', 'i', 'n', 'm', 'd', 'g', 'o', 'c-k', 'u']
  };
  var MAP_ORDER = GARDENS['garden-1'].concat(GARDENS['garden-2']);
  var STORE_KEY = 'word-book:sound-garden:v1';
  var TITLES = { pictures: 'Picture wall', trace: 'Touch letter', sort: 'Sound sorting', build: 'Moveable alphabet', spy: 'I spy' };
  var state = { groups: [], baseById: {}, placeById: {}, current: null, currentGarden: 'garden-1', vowelSide: 'short', material: 'pictures', audio: null, audioDone: null, sequenceToken: 0, selectedSort: null, buildTiles: [], buildLine: [] };
  var memory = readMemory();
  var map = document.getElementById('gardenMap');
  var place = document.getElementById('placeView');
  var body = document.getElementById('materialBody');
  var hintButton = document.getElementById('hintButton');
  var vowelSwitch = document.getElementById('vowelSwitch');
  var notice = document.getElementById('soundNotice');
  var noticeTimer = 0;

  function emptyMemory() {
    return { placesOpened: [], materialsOpened: {}, lastPlace: null, garden: 'garden-1', vowelSides: {}, builtWords: [], hintRequests: {} };
  }

  function readMemory() {
    var fallback = emptyMemory();
    try {
      var value = JSON.parse(SafeStorage.local.getItem(STORE_KEY) || 'null');
      if (!value || typeof value !== 'object') return fallback;
      value.placesOpened = Array.isArray(value.placesOpened) ? value.placesOpened : [];
      value.materialsOpened = value.materialsOpened || {};
      value.garden = value.garden === 'garden-2' ? 'garden-2' : 'garden-1';
      value.vowelSides = value.vowelSides || {};
      value.builtWords = Array.isArray(value.builtWords) ? value.builtWords : [];
      value.hintRequests = value.hintRequests || {};
      return value;
    } catch (error) { return fallback; }
  }

  function saveMemory() {
    SafeStorage.local.setItem(STORE_KEY, JSON.stringify(memory));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      var key = String(item);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function isVowelPlace(place) {
    return !!(place && Array.isArray(place.sides));
  }

  function activeGroup() {
    if (!isVowelPlace(state.current)) return state.current;
    return state.current.sides.filter(function (side) { return side.length === state.vowelSide; })[0] || state.current.sides[0];
  }

  function soundMeta(group) {
    return group && (group.pilot || group.sound_garden_expansion || group);
  }

  function haltAudio() {
    if (!state.audio) return;
    try { state.audio.pause(); state.audio.currentTime = 0; } catch (error) {}
    if (state.audioDone) state.audioDone(false);
    state.audio = null;
    state.audioDone = null;
    Array.prototype.forEach.call(document.querySelectorAll('.speaking'), function (node) { node.classList.remove('speaking'); });
  }

  function stopAudio() {
    state.sequenceToken++;
    haltAudio();
  }

  function playClip(src, activeNode) {
    haltAudio();
    return new Promise(function (resolve) {
      var audio;
      try { audio = new Audio(src); } catch (error) { resolve(false); return; }
      state.audio = audio;
      state.audioDone = done;
      audio.preload = 'auto';
      if (activeNode) activeNode.classList.add('speaking');
      var finished = false;
      function done(ok) {
        if (finished) return;
        finished = true;
        if (activeNode) activeNode.classList.remove('speaking');
        if (state.audio === audio) { state.audio = null; state.audioDone = null; }
        resolve(ok);
      }
      audio.addEventListener('ended', function () { done(true); }, { once: true });
      audio.addEventListener('error', function () { done(false); }, { once: true });
      try {
        var result = audio.play();
        if (result && result.catch) result.catch(function () { done(false); });
      } catch (error) { done(false); }
    });
  }

  function showNotice(text) {
    window.clearTimeout(noticeTimer);
    notice.querySelector('span').textContent = text;
    notice.hidden = false;
    noticeTimer = window.setTimeout(function () { notice.hidden = true; }, 2400);
  }

  function playPure(group, quiet) {
    var meta = soundMeta(group);
    if (!meta || !meta.pure_sound_clip) return Promise.resolve(false);
    return playClip(meta.pure_sound_clip).then(function (ok) {
      if (!ok && !quiet) showNotice('Pure sound coming soon');
      return ok;
    });
  }

  function playWord(word, activeNode) {
    return playClip(word.alice_word_clip, activeNode);
  }

  function highlightedWord(word) {
    var starts = {}, ends = {};
    (word.grapheme_spans || []).forEach(function (span) { starts[span[0]] = true; ends[span[1]] = true; });
    var joined = word.grapheme && word.grapheme.indexOf('_') !== -1 && word.grapheme_spans.length > 1;
    var joinedStart = joined ? word.grapheme_spans[0][0] : -1;
    var joinedEnd = joined ? word.grapheme_spans[word.grapheme_spans.length - 1][1] : -1;
    var out = '';
    for (var i = 0; i < word.word.length; i++) {
      if (i === joinedStart) out += '<span class="joined-grapheme">';
      if (starts[i]) out += '<mark>';
      out += escapeHtml(word.word.charAt(i));
      if (ends[i + 1]) out += '</mark>';
      if (i + 1 === joinedEnd) out += '</span>';
    }
    return out;
  }

  function updateMap() {
    var suggested = null;
    MAP_ORDER.some(function (id) {
      if (memory.placesOpened.indexOf(id) === -1) { suggested = id; return true; }
      return false;
    });
    if (!suggested) suggested = MAP_ORDER[(MAP_ORDER.indexOf(memory.lastPlace) + 1) % MAP_ORDER.length];
    Array.prototype.forEach.call(document.querySelectorAll('.place-marker'), function (marker) {
      var id = marker.getAttribute('data-place');
      marker.classList.toggle('visited', memory.placesOpened.indexOf(id) !== -1);
      marker.classList.toggle('suggested', id === suggested);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.garden-path'), function (pathButton) {
      var destinationGarden = pathButton.getAttribute('data-go-garden');
      pathButton.classList.toggle('suggested', GARDENS[destinationGarden].indexOf(suggested) !== -1);
    });
  }

  function showGarden(id, focusPath) {
    if (!GARDENS[id]) return;
    state.currentGarden = id;
    memory.garden = id;
    saveMemory();
    Array.prototype.forEach.call(document.querySelectorAll('.garden-panel'), function (panel) {
      panel.hidden = panel.getAttribute('data-garden') !== id;
    });
    document.getElementById('gardenSubtitle').textContent = (id === 'garden-1' ? 'First garden' : 'Second garden') + ' · choose any sound place';
    updateMap();
    if (focusPath) {
      var pathButton = document.querySelector('.garden-panel[data-garden="' + id + '"] .garden-path');
      if (pathButton) pathButton.focus({ preventScroll: true });
    }
  }

  function showMap() {
    stopAudio();
    place.hidden = true;
    map.hidden = false;
    showGarden(state.currentGarden, false);
    document.getElementById('gardenTitle').focus({ preventScroll: true });
  }

  function rememberOpen(groupId, material) {
    if (memory.placesOpened.indexOf(groupId) === -1) memory.placesOpened.push(groupId);
    memory.lastPlace = groupId;
    if (!memory.materialsOpened[groupId]) memory.materialsOpened[groupId] = [];
    if (memory.materialsOpened[groupId].indexOf(material) === -1) memory.materialsOpened[groupId].push(material);
    saveMemory();
  }

  function openPlace(id) {
    var destination = state.placeById[id];
    if (!destination) return;
    stopAudio();
    state.current = destination;
    state.vowelSide = isVowelPlace(destination) && memory.vowelSides[id] === 'long' ? 'long' : 'short';
    state.material = 'pictures';
    rememberOpen(id, 'pictures');
    map.hidden = true;
    place.hidden = false;
    document.getElementById('placeName').textContent = isVowelPlace(destination) ? destination.place : soundMeta(destination).place;
    document.getElementById('placeTitle').textContent = (isVowelPlace(destination) ? destination.letter + ' vowel' : destination.label + ' sound') + ' place';
    vowelSwitch.hidden = !isVowelPlace(destination);
    updateVowelSwitch();
    chooseMaterial('pictures');
  }

  function updateVowelSwitch() {
    var group = activeGroup();
    var grapheme = isVowelPlace(state.current) ? state.current.letter : group.label;
    document.getElementById('soundGrapheme').textContent = grapheme;
    document.getElementById('soundButton').setAttribute('aria-label', 'Hear the ' + (isVowelPlace(state.current) ? group.label : group.label + ' sound'));
    Array.prototype.forEach.call(vowelSwitch.querySelectorAll('button'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-vowel-side') === state.vowelSide ? 'true' : 'false');
    });
  }

  function chooseVowelSide(length) {
    if (!isVowelPlace(state.current) || (length !== 'short' && length !== 'long')) return;
    stopAudio();
    state.vowelSide = length;
    memory.vowelSides[state.current.id] = length;
    saveMemory();
    updateVowelSwitch();
    chooseMaterial(state.material);
  }

  function chooseMaterial(name) {
    if (!state.current || !TITLES[name]) return;
    stopAudio();
    state.material = name;
    rememberOpen(state.current.id, name);
    Array.prototype.forEach.call(document.querySelectorAll('.material-shelf button'), function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-material') === name ? 'true' : 'false');
    });
    document.getElementById('materialTitle').textContent = TITLES[name];
    hintButton.hidden = name !== 'sort' && name !== 'spy';
    hintButton.textContent = 'Hint';
    if (name === 'pictures') renderPictures();
    if (name === 'trace') renderTrace();
    if (name === 'sort') renderSort();
    if (name === 'build') renderBuilder();
    if (name === 'spy') renderSpy();
  }

  function renderPictures() {
    var group = activeGroup();
    var cards = group.words.map(function (word, index) {
      return '<article class="picture-card" data-word-index="' + index + '">' +
        '<button type="button" class="picture-image" aria-label="Hear ' + escapeHtml(word.word) + '">' +
        '<img src="' + escapeHtml(word.picture) + '" alt="' + escapeHtml(word.word) + '" draggable="false"></button>' +
        '<button type="button" class="word-label" aria-label="Hear the sound in ' + escapeHtml(word.word) + '">' + highlightedWord(word) + '</button></article>';
    }).join('');
    body.innerHTML = '<div class="picture-toolbar"><button type="button" class="soft-button" id="hearTogether"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>Hear them together</button></div><div class="picture-wall">' + cards + '</div>';
    Array.prototype.forEach.call(body.querySelectorAll('.picture-card'), function (card) {
      var word = group.words[Number(card.getAttribute('data-word-index'))];
      card.querySelector('.picture-image').addEventListener('click', function () {
        stopAudio();
        card.classList.add('revealed');
        playWord(word, card);
      });
      card.querySelector('.word-label').addEventListener('click', function () { stopAudio(); playPure(group); });
    });
    document.getElementById('hearTogether').addEventListener('click', hearTogether);
  }

  async function hearTogether() {
    var group = activeGroup();
    var placeAtStart = state.current;
    stopAudio();
    var token = state.sequenceToken;
    await playPure(group, true);
    for (var i = 0; i < group.words.length; i++) {
      if (placeAtStart !== state.current || group !== activeGroup() || token !== state.sequenceToken) return;
      var card = body.querySelector('.picture-card[data-word-index="' + i + '"]');
      if (!card) return;
      card.classList.add('revealed');
      await playWord(group.words[i], card);
      await new Promise(function (resolve) { window.setTimeout(resolve, 180); });
    }
  }

  function renderTrace() {
    var group = activeGroup();
    var grapheme = isVowelPlace(state.current) ? state.current.letter : group.label;
    var patterns = isVowelPlace(state.current) ? '<p class="spelling-patterns">' + group.spellings.map(function (spelling) { return escapeHtml(spelling.replace('_', '…')); }).join(' &nbsp; ') + '</p>' : '';
    body.innerHTML = '<div class="trace-wrap"><div class="trace-pad" id="tracePad" aria-label="Trace the ' + escapeHtml(grapheme) + ' grapheme with a finger"><div class="trace-letter">' + escapeHtml(grapheme) + '</div><canvas id="traceCanvas"></canvas></div>' +
      '<div class="trace-copy"><svg viewBox="0 0 80 80" aria-hidden="true"><path d="M22 57c-5-8-4-16 1-20 4-3 8 0 9 5V17c0-5 8-5 8 0v19-12c0-5 8-5 8 0v13-9c0-5 8-5 8 0v12-5c0-5 8-5 8 0v14c0 15-9 23-22 23-9 0-15-5-20-15Z"/></svg>' + patterns + '<p>Let your finger follow the whole shape. There is no score.</p><button type="button" class="soft-button" id="clearTrace">Clear glow</button></div></div>';
    var pad = document.getElementById('tracePad');
    var canvas = document.getElementById('traceCanvas');
    var context = canvas.getContext('2d');
    var drawing = false, last = null;
    function size() {
      var rect = pad.getBoundingClientRect();
      var scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = 'rgba(255,181,39,.88)'; context.lineWidth = 22;
    }
    function point(event) { var rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
    function start(event) {
      if (event.pointerType === 'touch' && !event.isPrimary) return;
      drawing = true; last = point(event); try { pad.setPointerCapture(event.pointerId); } catch (error) {}
      playPure(group);
    }
    function move(event) {
      if (!drawing) return;
      var now = point(event); context.beginPath(); context.moveTo(last.x, last.y); context.lineTo(now.x, now.y); context.stroke(); last = now;
    }
    function end() { drawing = false; last = null; }
    size();
    pad.addEventListener('pointerdown', start); pad.addEventListener('pointermove', move); pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    document.getElementById('clearTrace').addEventListener('click', function () { context.clearRect(0, 0, canvas.width, canvas.height); });
  }

  function contrastGroups() {
    if (isVowelPlace(state.current)) return state.current.sides;
    var prepared = soundMeta(state.current).sorting_contrasts;
    if (prepared) return prepared.map(function (contrast) { return state.baseById[contrast.sound_id]; });
    var index = BASE_ORDER.indexOf(state.current.id);
    return [state.current, state.baseById[BASE_ORDER[(index + 1) % BASE_ORDER.length]], state.baseById[BASE_ORDER[(index + 2) % BASE_ORDER.length]]];
  }

  function renderSort() {
    state.selectedSort = null;
    var groups = contrastGroups();
    var objects = [];
    groups.forEach(function (group, groupIndex) {
      var prepared = !isVowelPlace(state.current) && soundMeta(state.current).sorting_contrasts;
      var picks = isVowelPlace(state.current) ? group.words.slice(0, 3) : prepared ? soundMeta(state.current).sorting_contrasts[groupIndex].senses.map(function (sense) { return wordBySense(group, sense); }) : [group.words[groupIndex], group.words[groupIndex + 3]];
      picks.forEach(function (word) { objects.push({ group: group, word: word }); });
    });
    var cards = objects.map(function (item, index) {
      return '<button type="button" class="sort-card" data-sort-index="' + index + '" aria-label="Choose ' + escapeHtml(item.word.word) + '"><img src="' + escapeHtml(item.word.picture) + '" alt="' + escapeHtml(item.word.word) + '" draggable="false"></button>';
    }).join('');
    var baskets = groups.map(function (group) {
      return '<button type="button" class="basket" data-basket="' + escapeHtml(group.id) + '" aria-label="' + escapeHtml(group.label) + ' sound basket"><span class="basket-label">' + escapeHtml(group.label) + '</span></button>';
    }).join('');
    body.innerHTML = '<div class="sort-wrap"><div class="sort-tray">' + cards + '</div><div class="baskets' + (isVowelPlace(state.current) ? ' vowel-contrast' : '') + '">' + baskets + '</div></div>';
    Array.prototype.forEach.call(body.querySelectorAll('.sort-card'), function (card) {
      card.addEventListener('click', function () {
        Array.prototype.forEach.call(body.querySelectorAll('.sort-card'), function (other) { other.classList.remove('selected'); });
        card.classList.add('selected'); state.selectedSort = { card: card, item: objects[Number(card.getAttribute('data-sort-index'))] };
        playWord(state.selectedSort.item.word);
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll('.basket'), function (basket) {
      basket.addEventListener('click', function () {
        var basketId = basket.getAttribute('data-basket');
        var basketGroup = groups.filter(function (group) { return group.id === basketId; })[0];
        if (!state.selectedSort) { playPure(basketGroup); return; }
        var selected = state.selectedSort;
        if (selected.item.group.id === basketGroup.id) {
          selected.card.classList.add('settled'); selected.card.classList.remove('selected');
          var image = document.createElement('img'); image.src = selected.item.word.picture; image.alt = '';
          basket.appendChild(image);
          var label = document.createElement('span'); label.className = 'settled-word'; label.innerHTML = highlightedWord(selected.item.word); basket.appendChild(label);
          state.selectedSort = null; playWord(selected.item.word);
        } else {
          playWord(selected.item.word);
        }
      });
    });
  }

  function wordUnits(word, group) {
    var spans = (word.grapheme_spans || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    var split = word.grapheme && word.grapheme.indexOf('_') !== -1;
    var units = [], index = 0;
    spans.forEach(function (span, spanIndex) {
      while (index < span[0]) { units.push({ text: word.word.charAt(index), value: word.word.charAt(index) }); index++; }
      units.push({ text: word.word.slice(span[0], span[1]), value: word.word.slice(span[0], span[1]), soundGroup: !split || spanIndex === 0 ? group : null, silent: split && spanIndex > 0 }); index = span[1];
    });
    while (index < word.word.length) { units.push({ text: word.word.charAt(index), value: word.word.charAt(index) }); index++; }
    return units;
  }

  function renderBuilder() {
    var group = activeGroup();
    var meta = soundMeta(group);
    var target = meta.builder_senses ? wordBySense(group, meta.builder_senses[0]) : group.words[0];
    var units = wordUnits(target, group);
    var unitTexts = units.map(function (unit) { return unit.text; });
    var extras = ['s', 'a', 'e', 'i', 'o', 'u', 't', 'sh', 'ee', 'm', 'p', 'n'].filter(function (tile) { return unitTexts.indexOf(tile) === -1; }).slice(0, 4).map(function (text) { return { text: text, value: text }; });
    state.buildTiles = units.concat(extras).map(function (unit, index) { return { id: index, text: unit.text, value: unit.value, soundGroup: unit.soundGroup, silent: unit.silent, placed: false }; });
    state.buildLine = [];
    body.innerHTML = '<div class="builder-wrap"><div class="builder-picture" id="builderPicture"><img src="' + escapeHtml(target.picture) + '" alt="' + escapeHtml(target.word) + '"><p>' + escapeHtml(target.word) + '</p></div>' +
      '<div class="builder-work"><p class="builder-prompt">Tap tiles to build ' + escapeHtml(target.word) + ', or make your own.</p><div class="build-line" id="buildLine" aria-label="Your letters"></div><div class="tile-tray" id="tileTray" aria-label="Letter tiles"></div>' +
      '<div class="builder-actions"><button type="button" class="soft-button" id="soundBlend"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>Sound then blend</button><button type="button" class="soft-button" id="clearBuild">Clear</button></div></div></div>';
    paintBuilder(target);
    document.getElementById('soundBlend').addEventListener('click', soundThenBlend);
    document.getElementById('clearBuild').addEventListener('click', function () { state.buildLine = []; state.buildTiles.forEach(function (tile) { tile.placed = false; }); paintBuilder(target); });
  }

  function knownWord(text) {
    var found = null;
    state.groups.some(function (group) {
      return group.words.some(function (word) { if (word.word.toLowerCase() === text.toLowerCase()) { found = word; return true; } return false; });
    });
    return found;
  }

  function wordBySense(group, sense) {
    var found = group.words.filter(function (word) { return word.sense === sense; })[0];
    if (!found) throw new Error('Missing reviewed word ' + sense + ' in ' + group.id);
    return found;
  }

  function paintBuilder(defaultWord) {
    var line = document.getElementById('buildLine');
    var tray = document.getElementById('tileTray');
    if (!line || !tray) return;
    line.innerHTML = ''; tray.innerHTML = '';
    state.buildLine.forEach(function (tile) { line.appendChild(makeTile(tile, true, defaultWord)); });
    state.buildTiles.filter(function (tile) { return !tile.placed; }).forEach(function (tile) { tray.appendChild(makeTile(tile, false, defaultWord)); });
    var text = state.buildLine.map(function (tile) { return tile.value; }).join('');
    var known = knownWord(text);
    var picture = document.getElementById('builderPicture');
    var image = picture.querySelector('img'); var label = picture.querySelector('p');
    picture.classList.remove('awake');
    if (known) {
      image.src = known.picture; image.alt = known.word; label.textContent = known.word;
      window.requestAnimationFrame(function () { picture.classList.add('awake'); });
      if (memory.builtWords.indexOf(known.word) === -1) { memory.builtWords.push(known.word); memory.builtWords = memory.builtWords.slice(-24); saveMemory(); }
      playWord(known);
    } else { image.src = defaultWord.picture; image.alt = defaultWord.word; label.textContent = text || defaultWord.word; }
  }

  function makeTile(tile, inLine, defaultWord) {
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'letter-tile' + (inLine ? ' in-line' : ''); button.textContent = tile.text;
    button.setAttribute('aria-label', (inLine ? 'Return ' : 'Add ') + tile.text);
    button.addEventListener('click', function () {
      if (inLine) { tile.placed = false; state.buildLine = state.buildLine.filter(function (item) { return item.id !== tile.id; }); }
      else { tile.placed = true; state.buildLine.push(tile); }
      paintBuilder(defaultWord);
    });
    return button;
  }

  async function soundThenBlend() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#buildLine .letter-tile'));
    var supported = { s: 's', a: 'a', e: 'e', i: 'i', o: 'o', u: 'u', t: 't', sh: 'sh', ee: 'ee' };
    var missing = false;
    for (var i = 0; i < state.buildLine.length; i++) {
      if (buttons[i]) { buttons[i].classList.add('pulse'); window.setTimeout((function (button) { return function () { button.classList.remove('pulse'); }; })(buttons[i]), 380); }
      var tile = state.buildLine[i];
      var id = supported[tile.text];
      if (tile.silent) {
        await new Promise(function (resolve) { window.setTimeout(resolve, 180); });
      } else if (tile.soundGroup) {
        var targetOk = await playPure(tile.soundGroup, true); if (!targetOk) missing = true;
      } else if (id) {
        var ok = await playPure(state.baseById[id], true); if (!ok) missing = true;
      } else {
        await new Promise(function (resolve) { window.setTimeout(resolve, 360); });
      }
    }
    var text = state.buildLine.map(function (tile) { return tile.value; }).join('');
    var known = knownWord(text);
    if (known) await playWord(known);
    if (missing) showNotice('Pure sound coming soon');
  }

  function renderSpy() {
    var group = activeGroup();
    var meta = soundMeta(group);
    var preparedScene = !isVowelPlace(state.current) && meta.i_spy_scene;
    var target = preparedScene ? wordBySense(group, preparedScene.target_sense) : group.words[3];
    var options = [{ group: group, word: target }];
    if (isVowelPlace(state.current)) {
      var other = state.current.sides.filter(function (side) { return side.id !== group.id; })[0];
      other.words.slice(0, 3).forEach(function (word) { options.push({ group: other, word: word }); });
    } else if (preparedScene) {
      preparedScene.senses.filter(function (sense) { return sense !== preparedScene.target_sense; }).forEach(function (sense) {
        state.groups.some(function (candidate) {
          var word = candidate.words.filter(function (item) { return item.sense === sense; })[0];
          if (!word) return false;
          options.push({ group: candidate, word: word });
          return true;
        });
      });
    } else {
      var start = BASE_ORDER.indexOf(state.current.id);
      for (var i = 1; i < 4; i++) {
        var otherGroup = state.baseById[BASE_ORDER[(start + i) % BASE_ORDER.length]];
        options.push({ group: otherGroup, word: otherGroup.words[(start + i) % otherGroup.words.length] });
      }
    }
    var cards = options.map(function (option, index) {
      return '<button type="button" class="spy-card" data-spy-index="' + index + '" aria-label="' + escapeHtml(option.word.word) + '"><img src="' + escapeHtml(option.word.picture) + '" alt="' + escapeHtml(option.word.word) + '" draggable="false"></button>';
    }).join('');
    body.innerHTML = '<div class="spy-wrap"><p class="spy-prompt"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 20s6-9 16-9 16 9 16 9-6 9-16 9S4 20 4 20Z"/><circle cx="20" cy="20" r="5"/></svg>I spy something with <strong>' + escapeHtml(group.label) + '</strong></p><div class="spy-grid">' + cards + '</div></div>';
    Array.prototype.forEach.call(body.querySelectorAll('.spy-card'), function (card) {
      card.addEventListener('click', function () {
        var option = options[Number(card.getAttribute('data-spy-index'))];
        if (option.group.id === group.id) {
          card.classList.add('found');
          playPure(group, true).then(function () { playWord(option.word); });
        } else {
          playWord(option.word);
        }
      });
    });
    body.setAttribute('data-spy-target', target.sense);
  }

  function askHint() {
    var group = activeGroup();
    var key = state.current.id + ':' + (isVowelPlace(state.current) ? state.vowelSide + ':' : '') + state.material;
    memory.hintRequests[key] = Number(memory.hintRequests[key] || 0) + 1;
    saveMemory();
    if (state.material === 'sort') {
      var basket = body.querySelector('.basket[data-basket="' + group.id + '"]');
      if (basket) { basket.classList.remove('breathe'); window.requestAnimationFrame(function () { basket.classList.add('breathe'); }); }
      showNotice(soundMeta(group).hint);
      playPure(group, true);
    }
    if (state.material === 'spy') {
      var cards = Array.prototype.slice.call(body.querySelectorAll('.spy-card'));
      var targetSense = body.getAttribute('data-spy-target');
      var distractor = cards.filter(function (card) {
        var image = card.querySelector('img');
        return image && image.getAttribute('src').indexOf(targetSense) === -1 && !card.classList.contains('soft-hide');
      }).pop();
      if (distractor) distractor.classList.add('soft-hide');
      showNotice(soundMeta(group).hint);
      playPure(group, true);
    }
  }

  function validatePayload(payload) {
    var groups = (payload && payload.groups || []).filter(function (group) { return !!group.pilot; });
    if (groups.length !== 5) throw new Error('Expected five pilot groups');
    groups.forEach(function (group) {
      if (group.words.length !== 6) throw new Error('Expected six words for ' + group.id);
      group.words.forEach(function (word) {
        if (!word.sense || !word.picture || !word.alice_word_clip || !word.grapheme_spans) throw new Error('Incomplete word ' + word.word);
      });
    });
    groups.sort(function (a, b) { return BASE_ORDER.indexOf(a.id) - BASE_ORDER.indexOf(b.id); });
    var expansionIds = GARDENS['garden-2'];
    var expansion = (payload && payload.groups || []).filter(function (group) { return expansionIds.indexOf(group.id) !== -1; });
    expansion.sort(function (a, b) { return expansionIds.indexOf(a.id) - expansionIds.indexOf(b.id); });
    if (expansion.length !== expansionIds.length) throw new Error('Expected nine Garden 2 groups');
    expansion.forEach(function (group) {
      var meta = group.sound_garden_expansion;
      if (!meta || meta.status !== 'wired-garden-2' || group.words.length !== 6 || !meta.sorting_contrasts || !meta.builder_senses || !meta.i_spy_scene) throw new Error('Incomplete Garden 2 group ' + group.id);
    });
    var vowels = payload && payload.vowel_places || [];
    if (vowels.length !== 5) throw new Error('Expected five vowel places');
    vowels.forEach(function (vowel) {
      if (!vowel.id || !vowel.letter || !vowel.place || !Array.isArray(vowel.sides) || vowel.sides.length !== 2) throw new Error('Incomplete vowel place');
      vowel.sides.forEach(function (side) {
        if (!side.pure_sound_clip || !side.hint || !Array.isArray(side.words) || side.words.length !== 6) throw new Error('Incomplete vowel side ' + side.id);
      });
    });
    var gardens = payload && payload.gardens || [];
    if (gardens.length !== 2 || gardens[0].id !== 'garden-1' || gardens[1].id !== 'garden-2') throw new Error('Expected two garden records');
    if (JSON.stringify(gardens[0].places) !== JSON.stringify(GARDENS['garden-1']) || JSON.stringify(gardens[1].places) !== JSON.stringify(GARDENS['garden-2'])) throw new Error('Garden membership differs from the map');
    return { pilot: groups, expansion: expansion, vowels: vowels, all: payload.groups || [] };
  }

  Array.prototype.forEach.call(document.querySelectorAll('.place-marker'), function (marker) {
    marker.addEventListener('click', function () { openPlace(marker.getAttribute('data-place')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.material-shelf button'), function (button) {
    button.addEventListener('click', function () { chooseMaterial(button.getAttribute('data-material')); });
  });
  Array.prototype.forEach.call(vowelSwitch.querySelectorAll('button'), function (button) {
    button.addEventListener('click', function () { chooseVowelSide(button.getAttribute('data-vowel-side')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.garden-path'), function (button) {
    button.addEventListener('click', function () { showGarden(button.getAttribute('data-go-garden'), true); });
  });
  document.getElementById('mapButton').addEventListener('click', showMap);
  document.getElementById('soundButton').addEventListener('click', function () { stopAudio(); playPure(activeGroup()); });
  hintButton.addEventListener('click', askHint);
  window.addEventListener('pagehide', stopAudio);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAudio(); });

  fetch('phonics/sound-groups.json').then(function (response) {
    if (!response.ok) throw new Error('Sound group request failed');
    return response.json();
  }).then(function (payload) {
    var validated = validatePayload(payload);
    validated.all.forEach(function (group) { state.baseById[group.id] = group; });
    validated.pilot.forEach(function (group) { state.placeById[group.id] = group; });
    validated.expansion.forEach(function (group) { state.placeById[group.id] = group; });
    validated.vowels.forEach(function (vowel) { state.placeById[vowel.id] = vowel; });
    state.groups = validated.all.concat(validated.vowels.reduce(function (all, vowel) { return all.concat(vowel.sides); }, []));
    showGarden(memory.garden, false);
  }).catch(function () {
    var frame = document.getElementById('mapFrame');
    frame.innerHTML = '';
    frame.appendChild(document.getElementById('errorTemplate').content.cloneNode(true));
  });
})();
