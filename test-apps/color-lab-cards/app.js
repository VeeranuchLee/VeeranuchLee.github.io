(function () {
  "use strict";

  var drops = { red: 0, yellow: 0, blue: 0, white: 0, black: 0 };
  var exploreColors = [];
  var colorById = new Map();
  var availableAudioSlugs = new Set();
  var exploreData = null;
  var mixTargets = [];
  var basicMixTargets = [];
  var whiteBlackTargets = [];
  var whiteBlackEnabled = false;
  // The target challenge is retained for a possible optional mode, but normal Mix play is
  // deliberately the open-ended colours-found collection requested by the owner.
  var MIX_TARGET_CHALLENGE_ENABLED = false;
  var activeTargetIndex = 0;
  var discoveredTargetIds = new Set();
  var foundColours = [];
  var currentMix = null;
  var EMPTY_BOWL_DECORATION = "#A56BDB";

  function progressStorageKey() {
    return location.pathname.indexOf("/test-apps/") >= 0
      ? "color-lab:test:mix-discoveries:v1"
      : "color-lab:mix-discoveries:v1";
  }

  function whiteBlackStorageKey() {
    return location.pathname.indexOf("/test-apps/") >= 0
      ? "color-lab:test:white-black-enabled:v1"
      : "color-lab:white-black-enabled:v1";
  }

  function foundColoursStorageKey() {
    return location.pathname.indexOf("/test-apps/") >= 0
      ? "color-lab:test:found-colours:v1"
      : "color-lab:found-colours:v1";
  }

  function readFoundColours() {
    try { return ColorLabMixNaming.parseFoundColours(localStorage.getItem(foundColoursStorageKey())); }
    catch (error) { return []; }
  }

  function saveFoundColours() {
    try { localStorage.setItem(foundColoursStorageKey(), JSON.stringify(foundColours)); }
    catch (error) { /* the collection still works for this visit */ }
  }

  function readWhiteBlackPreference() {
    try { return localStorage.getItem(whiteBlackStorageKey()) === "true"; }
    catch (error) { return false; }
  }

  function saveWhiteBlackPreference() {
    try { localStorage.setItem(whiteBlackStorageKey(), whiteBlackEnabled ? "true" : "false"); }
    catch (error) { /* optional preference */ }
  }

  function readDiscoveries() {
    try {
      var saved = JSON.parse(localStorage.getItem(progressStorageKey()) || "[]");
      return new Set(Array.isArray(saved) ? saved.filter(function (id) { return typeof id === "string"; }) : []);
    } catch (error) { return new Set(); }
  }

  function saveDiscoveries() {
    try { localStorage.setItem(progressStorageKey(), JSON.stringify(Array.from(discoveredTargetIds))); } catch (error) { /* optional progress */ }
  }

  function clearLegacyBowlPreference() {
    try {
      localStorage.removeItem("color-lab:test:bowl-colour:v1");
      localStorage.removeItem("color-lab:bowl-colour:v1");
    } catch (error) { /* obsolete preference is harmless when storage is unavailable */ }
  }

  // One player for every spoken run (2026-10-06, owner: "let's add voice to color lab"), so a
  // new tap stops the run already playing instead of talking over it. A grown card speaks its
  // name, examples and comparison one after another (2026-10-28, owner: "I also think we should
  // add voice for this too"). A missing clip is skipped silently; rendered clips only, never
  // the browser's built-in voice.
  var voice = null;
  var voiceRun = 0;
  function playClipRun(slugs, run) {
    if (run !== voiceRun) return;
    var slug = slugs.shift();
    if (!slug) return;
    var playNext = function () { playClipRun(slugs, run); };
    if (!availableAudioSlugs.has(slug)) { playNext(); return; }
    voice = new Audio("./audio/colour-names/" + slug + ".m4a");
    voice.addEventListener("ended", playNext);
    voice.addEventListener("error", playNext);
    voice.play().catch(playNext);
  }
  function sayClips(slugs) {
    voiceRun += 1;
    try { if (voice) voice.pause(); } catch (e) { /* already stopped */ }
    playClipRun(slugs.slice(), voiceRun);
  }
  function sayClip(slug) {
    sayClips([slug]);
  }

  // Description-clip slugs come from the same explore data the audio plan was generated from:
  // the n-th unique example pair in shelf order is clip "ex-n", and a card's comparison is
  // "cmp-" + its slug. Both walks read explore-colors.json, so the ids cannot drift apart.
  // An example pair's clip is named from its own words ("ex-a-poppy-and-a-toy-fire-engine"), so
  // adding or reordering cards can never make a card play another card's examples.
  function exampleClipSlug(examples) {
    return "ex-" + examples.join(" and ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function descriptionClips(shade) {
    var clips = [];
    var examplesSlug = shade.examples && shade.examples.length ? exampleClipSlug(shade.examples) : "";
    if (examplesSlug) clips.push(examplesSlug);
    if (shade.comparison) clips.push("cmp-" + shade.slug);
    return clips;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function loadVocabulary() {
    return Promise.all([
      fetch("./data/iscc-nbs-v1.json").then(function (response) {
        if (!response.ok) throw new Error("Vocabulary did not load");
        return response.json();
      }),
      fetch("./explore-colors.json").then(function (response) {
        if (!response.ok) throw new Error("Explore shelf did not load");
        return response.json();
      }),
      fetch("./audio/colour-names/available-clips.json").then(function (response) {
        if (!response.ok) return [];
        return response.json();
      }).catch(function () { return []; }),
      fetch("./mix-targets.json").then(function (response) {
        if (!response.ok) return { targets: [] };
        return response.json();
      }).catch(function () { return { targets: [] }; }),
      fetch("./mix-targets-wk.json").then(function (response) {
        if (!response.ok) return { targets: [] };
        return response.json();
      }).catch(function () { return { targets: [] }; }),
    ]).then(function (results) {
      colorById = new Map(results[0].colors.map(function (color) { return [color.id, color]; }));
      exploreData = results[1];
      exploreColors = exploreData.families.flatMap(function (family) {
        return family.shades.map(function (shade) {
          var color = colorById.get(shade.vocabularyId);
          return Object.assign({}, color, shade, { familyId: family.id });
        });
      });
      availableAudioSlugs = new Set(results[2]);
      basicMixTargets = results[3].targets || [];
      whiteBlackEnabled = readWhiteBlackPreference();
      whiteBlackTargets = results[4].targets || [];
      mixTargets = basicMixTargets.concat(whiteBlackEnabled ? whiteBlackTargets : []);
      discoveredTargetIds = readDiscoveries();
      foundColours = readFoundColours();
      renderWhiteBlackStage();
      renderFamilies();
      renderTarget();
      renderFoundColours();
    }).catch(function () {
      exploreColors = [];
      byId("family-shelf").textContent = "Color names are still loading…";
    });
  }

  function setMode(mode) {
    var explore = mode === "explore";
    byId("mix-panel").hidden = explore;
    byId("explore-panel").hidden = !explore;
    ["mix", "explore"].forEach(function (name) {
      var active = name === mode;
      var tab = byId(name + "-tab");
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function renderFamilies() {
    var shelf = byId("family-shelf");
    shelf.replaceChildren();
    exploreData.families.forEach(function (family) {
      var button = document.createElement("button");
      var label = document.createElement("span");
      button.type = "button";
      button.className = "family-button";
      button.style.setProperty("--family", family.swatch);
      button.setAttribute("aria-label", "Explore " + family.name + " colors");
      label.className = "family-label";
      label.textContent = family.name;
      button.appendChild(label);
      button.addEventListener("click", function () { openFamily(family); });
      shelf.appendChild(button);
    });
  }

  // Shared house speaker icon (shared/icons/cg-icons.json "speaker"), pasted byte for byte and
  // sized/coloured through CSS like every other app icon (owner 2026-10-28: the old CSS-drawn
  // speaker "look of different style than our normal style").
  var SPEAKER_ICON = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M11 5L6 9H3v6h3l5 4z\" fill=\"currentColor\"/><path d=\"M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";

  function makeShadeCard(shade) {
    var vocabularyColor = shade.vocabularyId ? colorById.get(shade.vocabularyId) : null;
    var colorHex = shade.colorHex || vocabularyColor.srgbCentroidHex;
    var card = document.createElement("article");
    var main = document.createElement("button");
    var visual = document.createElement("span");
    var crayon = document.createElement("span");
    var tint = document.createElement("span");
    var frame = document.createElement("img");
    var swatch = document.createElement("span");
    var name = document.createElement("span");
    var speaker = document.createElement("button");
    var icon = document.createElement("span");
    var audioUrl = "./audio/colour-names/" + shade.slug + ".m4a";

    card.className = "shade-card";
    card.dataset.vocabularyId = shade.vocabularyId;
    main.type = "button";
    main.className = "shade-card-main";
    main.style.setProperty("--shade", colorHex);
    main.dataset.srgb = colorHex;
    main.setAttribute("aria-label", shade.displayName + ". Tap to grow this color card.");
    main.setAttribute("aria-pressed", "false");
    visual.className = "shade-visual";
    crayon.className = "shade-crayon";
    tint.className = "crayon-tint";
    tint.setAttribute("aria-hidden", "true");
    frame.className = "crayon-frame";
    frame.src = "./assets/explore/" + exploreData.crayon.frame;
    frame.alt = "";
    frame.width = 256;
    frame.height = 256;
    crayon.append(tint, frame);
    visual.appendChild(crayon);
    if (shade.sprite) {
      var image = document.createElement("img");
      image.className = "shade-object";
      image.src = "./assets/explore/" + shade.sprite;
      image.alt = shade.object;
      image.width = 192;
      image.height = 192;
      visual.appendChild(image);
    }
    swatch.className = "shade-swatch";
    swatch.setAttribute("aria-hidden", "true");
    name.className = "shade-name";
    name.textContent = shade.displayName;
    main.append(visual, swatch, name);
    if (shade.examples && shade.comparison) {
      var details = document.createElement("span");
      details.className = "shade-details";
      details.textContent = shade.examples.join(" • ") + ". " + shade.comparison;
      main.appendChild(details);
    }
    main.addEventListener("click", function () {
      document.querySelectorAll(".shade-card.is-selected").forEach(function (selected) {
        selected.classList.remove("is-selected");
        selected.querySelector(".shade-card-main").setAttribute("aria-pressed", "false");
      });
      card.classList.add("is-selected");
      main.setAttribute("aria-pressed", "true");
      // The chosen card grows to show its examples; keep all of it (and its speaker) in view.
      if (card.scrollIntoView) card.scrollIntoView({ block: "nearest" });
      sayClip(shade.slug);
    });

    speaker.type = "button";
    speaker.className = "speaker-button";
    speaker.setAttribute("aria-label", "Hear " + shade.displayName);
    speaker.dataset.audio = audioUrl;
    speaker.hidden = !availableAudioSlugs.has(shade.slug);
    card.classList.toggle("has-audio", availableAudioSlugs.has(shade.slug));
    icon.className = "speaker-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = SPEAKER_ICON;
    speaker.appendChild(icon);
    speaker.addEventListener("click", function () {
      // A grown card reads its whole description; a small card still says just the name.
      sayClips(card.classList.contains("is-selected")
        ? [shade.slug].concat(descriptionClips(shade))
        : [shade.slug]);
    });
    card.append(main, speaker);
    return card;
  }

  function openFamily(family) {
    byId("family-home").hidden = true;
    byId("shade-room").hidden = false;
    byId("family-name").textContent = family.name + " Colors";
    sayClip("family-" + family.id);
    var shelf = byId("shade-shelf");
    shelf.replaceChildren();
    family.shades.forEach(function (shade) { shelf.appendChild(makeShadeCard(shade)); });
    byId("family-back").focus();
  }

  function showFamilies() {
    byId("shade-room").hidden = true;
    byId("family-home").hidden = false;
    var firstFamily = document.querySelector(".family-button");
    if (firstFamily) firstFamily.focus();
  }

  function setName(message) {
    byId("name-text").textContent = message;
  }

  var feedbackAudio = null;
  var emptyFeedbackTimer = 0;
  function softTap() {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      feedbackAudio = feedbackAudio && feedbackAudio.state !== "closed" ? feedbackAudio : new AudioContext();
      if (feedbackAudio.state === "suspended") feedbackAudio.resume();
      var oscillator = feedbackAudio.createOscillator();
      var gain = feedbackAudio.createGain();
      var now = feedbackAudio.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(310, now);
      oscillator.frequency.exponentialRampToValueAtTime(230, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      oscillator.connect(gain).connect(feedbackAudio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.11);
    } catch (error) { /* visual feedback remains available without WebAudio */ }
  }

  function emptyBowlFeedback(showPaints) {
    var bowl = byId("mix-bowl");
    var primaryPots = document.querySelectorAll('[data-paint="red"], [data-paint="yellow"], [data-paint="blue"]');
    bowl.classList.remove("needs-paint-feedback");
    primaryPots.forEach(function (pot) { pot.classList.remove("paint-hint"); });
    void bowl.offsetWidth;
    bowl.classList.add("needs-paint-feedback");
    if (showPaints) primaryPots.forEach(function (pot) { pot.classList.add("paint-hint"); });
    clearTimeout(emptyFeedbackTimer);
    emptyFeedbackTimer = window.setTimeout(function () {
      bowl.classList.remove("needs-paint-feedback");
      primaryPots.forEach(function (pot) { pot.classList.remove("paint-hint"); });
    }, 850);
    softTap();
  }

  function activeTarget() { return mixTargets[activeTargetIndex] || null; }

  function renderWhiteBlackStage() {
    var switchButton = byId("white-black-switch");
    switchButton.setAttribute("aria-checked", whiteBlackEnabled ? "true" : "false");
    switchButton.classList.toggle("is-on", whiteBlackEnabled);
    byId("white-black-switch-state").textContent = whiteBlackEnabled ? "On" : "Off";
    byId("white-pot").hidden = !whiteBlackEnabled;
    byId("black-pot").hidden = !whiteBlackEnabled;
    document.querySelector(".paint-side").classList.toggle("is-five-paint", whiteBlackEnabled);
  }

  function setWhiteBlackStage(enabled) {
    whiteBlackEnabled = enabled;
    saveWhiteBlackPreference();
    mixTargets = basicMixTargets.concat(whiteBlackEnabled ? whiteBlackTargets : []);
    activeTargetIndex = 0;
    drops = ColorLabReset.emptyDrops();
    renderWhiteBlackStage();
    renderTarget();
    render();
  }

  function renderTarget() {
    var target = activeTarget();
    var card = byId("mix-target-card");
    if (!MIX_TARGET_CHALLENGE_ENABLED || !target) { card.hidden = true; return; }
    card.hidden = false;
    byId("mix-target-swatch").style.setProperty("--target", target.swatchHex);
    byId("mix-target-name").textContent = target.name;
    byId("mix-target-progress").textContent = mixTargets.filter(function (t) { return discoveredTargetIds.has(t.id); }).length + " of " + mixTargets.length + " found";
    card.classList.toggle("is-found", discoveredTargetIds.has(target.id));
  }

  function nextTarget() {
    if (!mixTargets.length) return;
    activeTargetIndex = (activeTargetIndex + 1) % mixTargets.length;
    renderTarget();
  }

  function checkTarget() {
    if (!MIX_TARGET_CHALLENGE_ENABLED) return false;
    var target = activeTarget();
    if (!target || !currentMix) return false;
    var score = Math.hypot.apply(null, currentMix.oklab.map(function (value, index) {
      return value - target.centreOklab[index];
    }));
    if (score > target.toleranceOklab) return false;
    // A target is a one-time discovery, not the name of every nearby mixture. The broad
    // tolerance can contain several successive mixes, so celebrating an already-found target
    // here would restart the same clip on every drop (the first target is copper).
    if (!ColorLabMixNaming.isNewDiscovery(discoveredTargetIds, target.id)) return false;
    discoveredTargetIds.add(target.id);
    saveDiscoveries();
    renderTarget();
    setName("You made " + target.name + "!");
    sayClip(target.slug);
    return true;
  }

  function makeFoundColour(colour, isNew) {
    var hasAudio = availableAudioSlugs.has(colour.slug);
    var item = document.createElement(hasAudio ? "button" : "div");
    var swatch = document.createElement("span");
    var name = document.createElement("span");
    if (hasAudio) {
      item.type = "button";
      item.setAttribute("aria-label", "Hear " + colour.displayName);
      item.addEventListener("click", function () { sayClip(colour.slug); });
    }
    item.className = "found-colour" + (hasAudio ? " has-audio" : "") + (isNew ? " is-new" : "");
    item.style.setProperty("--found-colour", colour.colorHex);
    swatch.className = "found-colour-swatch";
    swatch.setAttribute("aria-hidden", "true");
    name.className = "found-colour-name";
    name.textContent = colour.displayName;
    item.append(swatch, name);
    return item;
  }

  function renderFoundColours(newSlug) {
    var shelf = byId("found-colours-list");
    shelf.replaceChildren();
    foundColours.forEach(function (colour) {
      shelf.appendChild(makeFoundColour(colour, colour.slug === newSlug));
    });
    byId("found-colours-count").textContent = foundColours.length +
      (foundColours.length === 1 ? " colour found" : " colours found");
    byId("found-colours-empty").hidden = foundColours.length > 0;
    // Newest swatches sit first; bring a fresh find into view even if the shelf was scrolled.
    if (newSlug) shelf.scrollLeft = 0;
  }

  function discoverCurrentMix() {
    if (!currentMix || !exploreColors.length) return null;
    var named = ColorLabMixNaming.nameMix(
      currentMix.drops, currentMix.oklab, exploreColors, mixTargets, ColorLabMixing.nearestName
    );
    if (!named) return null;
    var result = ColorLabMixNaming.addFoundColour(foundColours, {
      slug: named.slug,
      displayName: named.displayName,
      colorHex: currentMix.hex,
    });
    if (!result.added) return named;
    foundColours = result.colours;
    saveFoundColours();
    renderFoundColours(named.slug);
    setName("You found " + named.displayName + "!");
    sayClip(named.slug);
    return named;
  }

  function render() {
    ["red", "yellow", "blue", "white", "black"].forEach(function (name) {
      byId(name + "-count").textContent = String(drops[name]);
    });
    currentMix = ColorLabMixing.mixDrops(drops);
    var bowl = byId("mix-bowl");
    if (!currentMix) {
      document.documentElement.style.setProperty("--mix", "#F4EAD0");
      document.documentElement.style.setProperty("--bowl-decoration", EMPTY_BOWL_DECORATION);
      bowl.className = "mix-bowl is-empty";
      bowl.setAttribute("aria-label", "Mixing bowl. Add paint first.");
      setName("Add some paint!");
      return;
    }
    document.documentElement.style.setProperty("--mix", currentMix.hex);
    document.documentElement.style.setProperty("--bowl-decoration", currentMix.hex);
    bowl.className = "mix-bowl has-paint";
    bowl.setAttribute("aria-label", "Mixed color. Tap to explore its name.");
    setName("Tap the bowl!");
    checkTarget();
    discoverCurrentMix();
  }

  function addDrop(name) {
    drops[name] += 1;
    render();
  }

  function animateDrop(source, name) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var lab = document.querySelector(".lab").getBoundingClientRect();
    var start = source.getBoundingClientRect();
    var bowl = byId("mix-bowl").getBoundingClientRect();
    var drop = document.createElement("span");
    var colors = { red: "#df493f", yellow: "#f1c62f", blue: "#3866bc", white: "#f7f3e8", black: "#242127" };
    var startX = start.left + start.width * 0.5 - lab.left - 11;
    var startY = start.top + start.height * 0.22 - lab.top;
    var endX = bowl.left + bowl.width * 0.5 - lab.left - 11;
    var endY = bowl.top + bowl.height * 0.42 - lab.top;
    drop.className = "paint-drop";
    drop.style.left = startX + "px";
    drop.style.top = startY + "px";
    drop.style.setProperty("--drop-x", (endX - startX) + "px");
    drop.style.setProperty("--drop-y", (endY - startY) + "px");
    drop.style.setProperty("--drop-mid-x", ((endX - startX) * 0.5) + "px");
    drop.style.setProperty("--drop-mid-y", ((endY - startY) * 0.3 - 34) + "px");
    drop.style.setProperty("--drop-color", colors[name]);
    byId("drop-layer").appendChild(drop);
    drop.addEventListener("animationend", function () { drop.remove(); }, { once: true });
  }

  function revealName() {
    if (!currentMix) {
      setName("Add some paint!");
      emptyBowlFeedback(true);
      return;
    }
    var named = ColorLabMixNaming.nameMix(
      currentMix.drops, currentMix.oklab, exploreColors, mixTargets, ColorLabMixing.nearestName
    );
    setName(named ? named.displayName : "Color names are still loading…");
    if (named) sayClip(named.slug);
  }

  // One tap empties the bowl and returns the name chip to its prompt (2026-10-07).
  // render() rebuilds the bowl ("Add some paint!", empty paint) from the zeroed drops.
  function reset() {
    if (!currentMix) {
      // Same hint as tapping the empty bowl: the child sees which pots to tap (Dot, 2026-10-29).
      emptyBowlFeedback(true);
      return;
    }
    drops = ColorLabReset.emptyDrops();
    render();
  }

  document.querySelectorAll("[data-paint]").forEach(function (button) {
    button.addEventListener("click", function () {
      animateDrop(button, button.dataset.paint);
      addDrop(button.dataset.paint);
    });
  });
  byId("mix-bowl").addEventListener("click", revealName);
  byId("reset-button").addEventListener("click", reset);
  if (MIX_TARGET_CHALLENGE_ENABLED) byId("next-target").addEventListener("click", nextTarget);
  byId("white-black-switch").addEventListener("click", function () {
    setWhiteBlackStage(!whiteBlackEnabled);
  });
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () { setMode(button.dataset.mode); });
  });
  byId("family-back").addEventListener("click", showFamilies);
  clearLegacyBowlPreference();
  loadVocabulary();
  render();
})();
