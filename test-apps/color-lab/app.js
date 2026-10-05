(function () {
  "use strict";

  var drops = { red: 0, yellow: 0, blue: 0 };
  var childColors = [];
  var currentMix = null;
  var resetArmed = false;
  var resetTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function titleCase(value) {
    return value.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function loadVocabulary() {
    return Promise.all([
      fetch("./shared-data/colour-vocabulary/iscc-nbs-v1.json").then(function (response) {
        if (!response.ok) throw new Error("Vocabulary did not load");
        return response.json();
      }),
      fetch("./shared-data/colour-vocabulary/proposed-child-subset-review-v1.json").then(function (response) {
        if (!response.ok) throw new Error("Child subset did not load");
        return response.json();
      }),
    ]).then(function (results) {
      var included = new Set(results[1].candidates.filter(function (candidate) {
        return candidate.includedInProposedSubset;
      }).map(function (candidate) { return candidate.id; }));
      childColors = results[0].colors.filter(function (color) { return included.has(color.id); });
    }).catch(function () {
      childColors = [];
    });
  }

  function setName(message) {
    byId("name-text").textContent = message;
  }

  function render() {
    ["red", "yellow", "blue"].forEach(function (name) {
      byId(name + "-count").textContent = String(drops[name]);
    });
    currentMix = ColorLabMixing.mixDrops(drops);
    var bowl = byId("mix-bowl");
    if (!currentMix) {
      document.documentElement.style.setProperty("--mix", "#F4EAD0");
      bowl.className = "mix-bowl is-empty";
      bowl.setAttribute("aria-label", "Mixing bowl. Add paint first.");
      setName("Add some paint!");
      return;
    }
    document.documentElement.style.setProperty("--mix", currentMix.hex);
    bowl.className = "mix-bowl has-paint";
    bowl.setAttribute("aria-label", "Mixed color. Tap to explore its name.");
    setName("Tap the bowl!");
  }

  function addDrop(name) {
    drops[name] += 1;
    resetArmed = false;
    byId("reset-button").textContent = "Start again";
    render();
  }

  function revealName() {
    if (!currentMix) {
      setName("Add some paint!");
      return;
    }
    var nearest = ColorLabMixing.nearestName(currentMix.oklab, childColors);
    setName(nearest ? titleCase(nearest.color.name) : "Color names are still loading…");
  }

  function reset() {
    var button = byId("reset-button");
    if (!resetArmed) {
      resetArmed = true;
      button.textContent = "Tap again";
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        resetArmed = false;
        button.textContent = "Start again";
      }, 2200);
      return;
    }
    window.clearTimeout(resetTimer);
    drops = { red: 0, yellow: 0, blue: 0 };
    resetArmed = false;
    button.textContent = "Start again";
    render();
  }

  document.querySelectorAll("[data-paint]").forEach(function (button) {
    button.addEventListener("click", function () { addDrop(button.dataset.paint); });
  });
  byId("mix-bowl").addEventListener("click", revealName);
  byId("reset-button").addEventListener("click", reset);
  loadVocabulary();
  render();
})();
