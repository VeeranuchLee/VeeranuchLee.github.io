(function () {
  "use strict";

  var drops = { red: 0, yellow: 0, blue: 0 };
  var exploreColors = [];
  var colorById = new Map();
  var availableAudioSlugs = new Set();
  var exploreData = null;
  var mixTargets = [];
  var activeTargetIndex = 0;
  var discoveredTargetIds = new Set();
  var currentMix = null;
  var EMPTY_BOWL_DECORATION = "#A56BDB";

  function progressStorageKey() {
    return location.pathname.indexOf("/test-apps/") >= 0
      ? "color-lab:test:mix-discoveries:v1"
      : "color-lab:mix-discoveries:v1";
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

  // One player for every spoken name (2026-10-06, owner: "let's add voice to color lab"), so a
  // new tap stops the name before it instead of talking over it. A missing clip stays silent.
  var voice = null;
  function sayClip(slug) {
    if (!availableAudioSlugs.has(slug)) return;
    try { if (voice) voice.pause(); } catch (e) { /* already stopped */ }
    voice = new Audio("./audio/colour-names/" + slug + ".m4a");
    voice.play().catch(function () {});
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
      mixTargets = results[3].targets || [];
      discoveredTargetIds = readDiscoveries();
      renderFamilies();
      renderTarget();
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
    speaker.appendChild(icon);
    speaker.addEventListener("click", function () {
      sayClip(shade.slug);
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

  function activeTarget() { return mixTargets[activeTargetIndex] || null; }

  function renderTarget() {
    var target = activeTarget();
    var card = byId("mix-target-card");
    if (!target) { card.hidden = true; return; }
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

  function render() {
    ["red", "yellow", "blue"].forEach(function (name) {
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
    var colors = { red: "#df493f", yellow: "#f1c62f", blue: "#3866bc" };
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
  byId("next-target").addEventListener("click", nextTarget);
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.addEventListener("click", function () { setMode(button.dataset.mode); });
  });
  byId("family-back").addEventListener("click", showFamilies);
  clearLegacyBowlPreference();
  loadVocabulary();
  render();
})();
