/*
 * Tap or Wait — standalone shell.
 * Gameplay lives in the canonical TapWaitEngine; this file supplies datasets, theme
 * rendering, navigation and the small amount of feedback chrome that belongs to the app.
 */
(function () {
  "use strict";

  var Engine = window.TapWaitEngine;
  var Sound = window.TapWaitSound;
  var ROUND_LENGTH = 12;
  var dom = {};
  var currentThemeKey = "garden";
  var currentRuleIndex = 0;
  var game = null;
  var flashTimer = null;

  function item(id, emoji, kind, label, variant) {
    return { id: id, emoji: emoji, kind: kind, label: label, variant: variant || "" };
  }

  var GARDEN_POOL = [
    item("heart-red", "❤️", "heart", "red heart"),
    item("heart-pink", "💗", "heart", "pink heart", "pink"),
    item("heart-yellow", "💛", "heart", "yellow heart"),
    item("heart-broken", "💔", "broken-heart", "broken heart"),
    item("flower-pink", "🌸", "flower", "pink flower"),
    item("flower-yellow", "🌼", "flower", "yellow flower"),
    item("butterfly-blue", "🦋", "butterfly", "blue butterfly"),
    item("bow", "🎀", "bow", "pink bow"),
    item("gem", "💎", "gem", "sparkling gem"),
    item("sparkles", "✨", "sparkles", "sparkles")
  ];
  var SPACE_POOL = [
    item("earth", "🌍", "earth", "Earth"),
    item("moon", "🌕", "moon", "the Moon"),
    item("star", "⭐", "star", "a star"),
    item("bright-star", "🌟", "star", "a bright star"),
    item("sparkle-star", "✨", "star", "a sparkling star"),
    item("asteroid", "☄️", "asteroid", "an asteroid"),
    item("rocket", "🚀", "rocket", "a rocket"),
    item("planet", "🪐", "planet", "a planet")
  ];

  var THEMES = {
    garden: {
      label: "Garden",
      kicker: "A girly garden",
      pool: GARDEN_POOL,
      rules: [
        { id: "hearts", title: "Tap hearts!", hint: "Find the hearts.", icon: "💗", art: "💗", test: function (entry) { return entry.kind === "heart"; } },
        { id: "flowers", title: "Tap flowers, not butterflies!", hint: "Flowers yes. Butterflies no.", icon: "🌸", art: "🌸", test: function (entry) { return entry.kind === "flower"; } },
        { id: "pink-hearts", title: "Tap pink hearts!", hint: "Only the pink hearts.", icon: "💗", art: "💗", test: function (entry) { return entry.kind === "heart" && entry.variant === "pink"; } },
        { id: "not-broken", title: "Tap everything except broken hearts!", hint: "Broken hearts float away.", icon: "💔", art: "💔", test: function (entry) { return entry.kind !== "broken-heart"; } }
      ]
    },
    space: {
      label: "Space",
      kicker: "A quiet space adventure",
      pool: SPACE_POOL,
      rules: [
        { id: "earth", title: "Tap Earth!", hint: "Find our home.", icon: "🌍", art: "🌍", test: function (entry) { return entry.kind === "earth"; } },
        { id: "stars", title: "Tap stars!", hint: "Find the stars.", icon: "⭐", art: "⭐", test: function (entry) { return entry.kind === "star"; } },
        { id: "stars-not-asteroids", title: "Tap stars, not asteroids!", hint: "Stars yes. Asteroids no.", icon: "☄️", art: "☄️", test: function (entry) { return entry.kind === "star"; } },
        { id: "earth-not-moon", title: "Tap Earth, not the Moon!", hint: "Earth yes. Moon no.", icon: "🌕", art: "🌕", test: function (entry) { return entry.kind === "earth"; } }
      ]
    }
  };

  function byId(id) { return document.getElementById(id); }
  function cacheDom() {
    ["home", "theme-picker", "play", "finish", "theme-kicker", "theme-title", "rule-grid",
      "play-theme", "rule-text", "rule-icon", "rule-hint", "score", "streak", "progress",
      "stage", "feedback", "finish-stars", "finish-copy", "finish-score", "again", "harder"]
      .forEach(function (id) { dom[id] = byId(id); });
  }

  function showScreen(name) {
    ["home", "theme-picker", "play", "finish"].forEach(function (screen) {
      dom[screen].hidden = screen !== name;
    });
    document.body.dataset.screen = name;
  }

  function theme() { return THEMES[currentThemeKey]; }
  function rule() { return theme().rules[currentRuleIndex]; }

  function makeConfig() {
    var selectedTheme = theme();
    var levels = selectedTheme.rules.map(function (entry) {
      return {
        itemPool: selectedTheme.pool,
        rule: entry.test,
        ruleText: entry.title,
        ruleHint: entry.hint,
        theme: { ruleIcon: entry.icon }
      };
    });
    return {
      itemPool: selectedTheme.pool,
      rule: selectedTheme.rules[0].test,
      ruleText: selectedTheme.rules[0].title,
      ruleHint: selectedTheme.rules[0].hint,
      roundLength: ROUND_LENGTH,
      spawn: { mode: "single", visibleMs: 2200, gapMs: 300 },
      difficultyLevels: levels,
      scoring: { streak: true, basePoints: 10, streakStep: 2, maxStreakBonus: 10 },
      feedback: {
        onCorrect: function (payload) {
          var state = game && game.getState();
          if (payload && payload.entry) flashItem(payload.entry, "correct");
          if (state) dom.feedback.textContent = state.streak > 1 ? "Nice! " + state.streak + " in a row" : "Yes! That one matches.";
        },
        onWrong: function () {
          pulseRule();
          flashStage("wrong-shake");
          dom.feedback.textContent = "That one can wait. Try another!";
        },
        onMissed: function () {
          flashStage("missed-float");
          dom.feedback.textContent = "It floated away. The next one is ready.";
        },
        onRoundEnd: function (summary) { showFinish(summary); }
      },
      theme: {
        render: function (entry) { return entry.emoji; },
        colors: currentThemeKey === "space" ? ["#172b62", "#a9dcff"] : ["#f8d4e6", "#fff7ce"]
      },
      audio: {
        correct: function () { Sound.correct(); },
        wrong: function () { Sound.wrong(); },
        missed: function () { Sound.missed(); },
        roundEnd: function () { Sound.roundEnd(); }
      }
    };
  }

  function flashStage(className) {
    clearTimeout(flashTimer);
    dom.stage.classList.remove("wrong-shake", "celebrate", "missed-float");
    void dom.stage.offsetWidth;
    dom.stage.classList.add(className);
    flashTimer = setTimeout(function () { dom.stage.classList.remove(className); }, 520);
  }

  function flashItem(entry, kind) {
    var button = dom.stage.querySelector('[data-slot="' + String(entry.slot) + '"]');
    if (!button) return;
    button.classList.add(kind === "correct" ? "is-correct" : "is-wrong");
    if (kind === "correct") flashStage("celebrate");
  }

  function pulseRule() {
    dom["rule-text"].classList.remove("pulse");
    void dom["rule-text"].offsetWidth;
    dom["rule-text"].classList.add("pulse");
    setTimeout(function () { dom["rule-text"].classList.remove("pulse"); }, 500);
  }

  function renderRules() {
    var selectedTheme = theme();
    dom["theme-kicker"].textContent = selectedTheme.label;
    dom["theme-title"].textContent = selectedTheme.kicker;
    dom["rule-grid"].replaceChildren();
    selectedTheme.rules.forEach(function (entry, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "rule-card";
      button.dataset.rule = entry.id;
      button.dataset.ruleIndex = String(index);
      button.innerHTML = '<span class="rule-art" aria-hidden="true">' + entry.art + '</span><span><strong>' +
        entry.title + '</strong><small>' + entry.hint + '</small></span>';
      button.addEventListener("click", function () { Sound.unlock(); Sound.tap(); startRule(index); });
      dom["rule-grid"].appendChild(button);
    });
  }

  function updateRuleHeader() {
    var activeRule = rule();
    dom["play-theme"].textContent = theme().label;
    dom["rule-text"].textContent = activeRule.title;
    dom["rule-hint"].textContent = activeRule.hint;
    dom["rule-icon"].textContent = activeRule.icon;
  }

  function renderStage(state) {
    dom.stage.replaceChildren();
    dom.stage.classList.remove("wrong-shake", "celebrate", "missed-float");
    if (state.phase !== "showing" || !state.current) return;
    state.current.items.forEach(function (entry) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "tap-wait-item";
      button.dataset.slot = String(entry.slot);
      button.dataset.target = String(entry.target);
      button.setAttribute("aria-label", entry.item.label);
      button.textContent = entry.item.emoji;
      button.addEventListener("click", function () {
        Sound.unlock();
        game.tap(entry);
      });
      dom.stage.appendChild(button);
    });
  }

  function renderPlay() {
    if (!game) return;
    var state = game.getState();
    updateRuleHeader();
    dom.score.textContent = String(state.score);
    dom.streak.textContent = "🔥 " + state.streak;
    dom.progress.textContent = Math.min(state.eventIndex + 1, state.roundLength) + " / " + state.roundLength;
    renderStage(state);
  }

  function showFinish(summary) {
    var ratio = summary.roundLength ? summary.correct / summary.roundLength : 0;
    var stars = ratio >= .85 ? 3 : ratio >= .55 ? 2 : 1;
    dom["finish-stars"].textContent = "⭐ ".repeat(stars) + "☆ ".repeat(3 - stars);
    dom["finish-copy"].textContent = stars === 3 ? "You spotted every kind of thing." : "You noticed some good ones.";
    dom["finish-score"].textContent = String(summary.score);
    dom.harder.disabled = currentRuleIndex >= theme().rules.length - 1;
    showScreen("finish");
  }

  function startRule(index) {
    if (game) game.destroy();
    currentRuleIndex = index;
    var config = makeConfig();
    var querySeed = null;
    try { querySeed = new URLSearchParams(location.search).get("tapWaitSeed"); } catch (e) {}
    var seed = querySeed == null || querySeed === "" ? Date.now() + index : Number(querySeed);
    game = new Engine.Game(config, { seed: isFinite(seed) ? seed : Date.now() + index });
    game.on("change", renderPlay);
    showScreen("play");
    updateRuleHeader();
    game.setDifficulty(index);
    game.start();
    renderPlay();
  }

  function openTheme(key) {
    currentThemeKey = THEMES[key] ? key : "garden";
    currentRuleIndex = 0;
    document.body.dataset.theme = currentThemeKey;
    renderRules();
    showScreen("theme-picker");
  }

  function wire() {
    document.querySelectorAll("[data-theme]").forEach(function (button) {
      button.addEventListener("click", function () { Sound.unlock(); Sound.tap(); openTheme(button.dataset.theme); });
    });
    document.querySelectorAll('[data-action="home"]').forEach(function (button) {
      button.addEventListener("click", function () { Sound.unlock(); Sound.tap(); showScreen("home"); });
    });
    document.querySelectorAll('[data-action="theme"]').forEach(function (button) {
      button.addEventListener("click", function () { Sound.unlock(); Sound.tap(); if (game) game.destroy(); game = null; showScreen("theme-picker"); });
    });
    dom.again.addEventListener("click", function () { Sound.unlock(); Sound.correct(); startRule(currentRuleIndex); });
    dom.harder.addEventListener("click", function () {
      Sound.unlock(); Sound.correct();
      if (currentRuleIndex < theme().rules.length - 1) startRule(currentRuleIndex + 1);
    });
  }

  function testApi() {
    return {
      get game() { return game; },
      get theme() { return currentThemeKey; },
      get ruleIndex() { return currentRuleIndex; },
      get state() { return game ? game.getState() : null; },
      openTheme: openTheme,
      startRule: startRule,
      showPlay: function () { showScreen("play"); },
      setVisibleMs: function (value) {
        if (game) {
          game.activeConfig.spawn.visibleMs = Math.max(1200, Number(value) || 2200);
          if (game.state.phase === "showing") game.state.visibleUntil = game.clock.now() + game.activeConfig.spawn.visibleMs;
        }
      },
      tapSlot: function (slot) {
        var button = dom.stage.querySelector('[data-slot="' + String(slot) + '"]');
        if (button) button.click();
      },
      /* A deterministic browser-harness shortcut. It drives the same engine state
         machine as the buttons, but skips the production 2.2-second dwell so all eight
         first-build rules can be checked in a reasonable CI run. */
      completeRoundForTest: function () {
        var guard = 0;
        var virtualNow = game ? game.clock.now() : 0;
        while (game && game.getState().phase !== "ended" && guard++ < 100) {
          var state = game.getState();
          virtualNow = Math.max(virtualNow, game.clock.now()) + (state.phase === "showing" ? 5000 : 1000);
          if (state.phase === "showing") {
            var target = state.current.items.find(function (entry) { return entry.target && !entry.tapped; });
            if (target) game.tap(target);
            else game.tick(virtualNow);
          } else {
            game.tick(virtualNow);
          }
        }
        return game ? game.getState() : null;
      }
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheDom();
    wire();
    document.body.dataset.theme = currentThemeKey;
    showScreen("home");
    window.__tapWait = testApi();
  });
})();
