/*
 * Periodic Table first build: one dataset, one table, four modes.
 * Explore and every game call PeriodicVoice.speak; no game owns narration logic.
 */
(function () {
  "use strict";

  const elements = Array.isArray(window.PERIODIC_ELEMENTS)
    ? window.PERIODIC_ELEMENTS
    : Object.freeze([]);
  const byNumber = new Map(elements.map((element) => [element.atomicNumber, element]));

  const CATEGORY_LABELS = Object.freeze({
    "alkali metal": "Alkali",
    "alkaline earth metal": "Alkaline earth",
    "transition metal": "Transition",
    "post-transition metal": "Post-transition",
    metalloid: "Metalloids",
    "reactive nonmetal": "Nonmetals",
    halogen: "Halogens",
    "noble gas": "Noble gases",
    lanthanide: "Lanthanides",
    actinide: "Actinides",
    unknown: "Unknown"
  });

  const CATEGORY_COLORS = Object.freeze({
    "alkali metal": "#ffd0d9",
    "alkaline earth metal": "#ffdca8",
    "transition metal": "#ffe985",
    "post-transition metal": "#baf0c5",
    metalloid: "#9fe1c9",
    "reactive nonmetal": "#b9ddff",
    halogen: "#e4cfff",
    "noble gas": "#d4bfff",
    lanthanide: "#ffcce1",
    actinide: "#ffd2d5",
    unknown: "#dce2e8"
  });

  const app = document.getElementById("app");
  const mainGrid = document.getElementById("main-grid");
  const fBlock = document.getElementById("f-block");
  const legend = document.getElementById("legend");
  const prompt = document.getElementById("game-prompt");
  const infoPreview = document.getElementById("info-preview");
  const infoSentence = document.getElementById("info-sentence");
  const speakButton = document.getElementById("speak-button");
  const nextQuestionButton = document.getElementById("next-question");

  const state = {
    mode: "explore",
    set: "starter",
    selectedNumber: 8,
    round: 0,
    game: null
  };

  function categoryClass(category) {
    return `category-${category.replace(/\s+/g, "-")}`;
  }

  function createTile(element) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = `element-tile ${categoryClass(element.category)}`;
    tile.dataset.atomicNumber = String(element.atomicNumber);
    tile.dataset.symbol = element.symbol;
    tile.dataset.name = element.name;
    tile.setAttribute("aria-label", `${element.name}, element number ${element.atomicNumber}, ${CATEGORY_LABELS[element.category] || element.category}`);
    tile.setAttribute("aria-pressed", "false");

    const number = document.createElement("span");
    number.className = "atomic-number";
    number.textContent = String(element.atomicNumber);

    const symbolLine = document.createElement("span");
    symbolLine.className = "symbol-line";
    const symbol = document.createElement("span");
    symbol.className = "symbol";
    symbol.textContent = element.symbol;
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = element.icon;
    symbolLine.append(symbol, icon);

    const name = document.createElement("span");
    name.className = "element-name";
    name.textContent = element.name;

    tile.append(number, symbolLine, name);
    return tile;
  }

  function buildLegend() {
    for (const category of Object.keys(CATEGORY_LABELS)) {
      const chip = document.createElement("span");
      chip.className = "legend-chip";
      chip.style.setProperty("--chip-color", CATEGORY_COLORS[category]);
      chip.textContent = CATEGORY_LABELS[category];
      legend.append(chip);
    }
  }

  function buildMainGrid() {
    for (let group = 1; group <= 18; group += 1) {
      const label = document.createElement("span");
      label.className = "group-number";
      label.style.gridColumn = String(group);
      label.textContent = String(group);
      mainGrid.append(label);
    }

    for (const element of elements) {
      if (element.series === "lanthanide" || element.series === "actinide") continue;
      const tile = createTile(element);
      tile.style.gridColumn = String(element.group);
      tile.style.gridRow = String(element.period + 1);
      mainGrid.append(tile);
    }

    const placeholders = [
      { period: 6, text: "57–71\n…" },
      { period: 7, text: "89–103\n…" }
    ];
    for (const placeholder of placeholders) {
      const node = document.createElement("div");
      node.className = "series-placeholder";
      node.style.gridColumn = "3";
      node.style.gridRow = String(placeholder.period + 1);
      node.textContent = placeholder.text;
      node.setAttribute("aria-label", placeholder.period === 6 ? "Lanthanides 57 to 71" : "Actinides 89 to 103");
      mainGrid.append(node);
    }
  }

  function buildFBlock() {
    for (const series of ["lanthanide", "actinide"]) {
      const row = document.createElement("div");
      row.className = "f-row";
      const label = document.createElement("span");
      label.className = "series-label";
      label.textContent = series === "lanthanide" ? "Lanthanides\n57–71" : "Actinides\n89–103";
      row.append(label);
      for (const element of elements.filter((item) => item.series === series)) {
        const tile = createTile(element);
        tile.style.gridColumn = String(element.atomicNumber - (series === "lanthanide" ? 55 : 87));
        row.append(tile);
      }
      fBlock.append(row);
    }
  }

  function clearHintClasses() {
    for (const node of document.querySelectorAll(".hint-glow, .hint-shown, .wrong-gently")) {
      node.classList.remove("hint-glow", "hint-shown", "wrong-gently");
    }
  }

  function clearSelection() {
    for (const tile of document.querySelectorAll(".element-tile.is-selected")) {
      tile.classList.remove("is-selected");
      tile.setAttribute("aria-pressed", "false");
    }
  }

  function renderInfo(element) {
    state.selectedNumber = element.atomicNumber;
    infoPreview.className = `info-preview ${categoryClass(element.category)}`;
    infoPreview.querySelector(".atomic-number").textContent = String(element.atomicNumber);
    infoPreview.querySelector(".symbol").textContent = element.symbol;
    infoPreview.querySelector(".icon").textContent = element.icon;
    infoPreview.querySelector(".element-name").textContent = element.name;

    const strong = document.createElement("strong");
    strong.textContent = element.name;
    infoSentence.replaceChildren(strong, document.createTextNode(` — ${element.fact}`));
    speakButton.dataset.audioId = element.audioId;
  }

  function selectElement(element, shouldSpeak) {
    clearSelection();
    const tile = document.querySelector(`.element-tile[data-atomic-number="${element.atomicNumber}"]`);
    if (tile) {
      tile.classList.add("is-selected");
      tile.setAttribute("aria-pressed", "true");
    }
    renderInfo(element);
    if (shouldSpeak) window.PeriodicVoice.speak(element.audioId, element.fact);
  }

  function setPrompt(message, isQuestion) {
    prompt.replaceChildren(document.createTextNode(message));
    prompt.classList.toggle("is-question", Boolean(isQuestion));
  }

  function poolForSet(setName) {
    return elements.filter((element) => element.difficultySets.includes(setName));
  }

  function rotate(items, amount) {
    if (!items.length) return [];
    const offset = ((amount % items.length) + items.length) % items.length;
    return items.slice(offset).concat(items.slice(0, offset));
  }

  function renderSymbolChoices() {
    if (state.mode !== "symbol-match" || !state.game) return;
    const group = document.createElement("span");
    group.className = "symbol-choices";
    group.setAttribute("aria-label", "Answer choices");
    for (const choice of state.game.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "symbol-choice";
      button.dataset.correct = String(choice.atomicNumber === state.game.target.atomicNumber);
      button.dataset.atomicNumber = String(choice.atomicNumber);
      button.textContent = state.game.direction === "symbol" ? choice.symbol : choice.name;
      button.setAttribute("aria-label", `${state.game.direction === "symbol" ? "Symbol" : "Name"} ${button.textContent}`);
      group.append(button);
    }
    prompt.append(group);
  }

  function newQuestion() {
    if (state.mode === "explore") return;
    const pool = poolForSet(state.set);
    if (!pool.length) return;
    clearHintClasses();
    clearSelection();
    for (const button of document.querySelectorAll(".symbol-choice")) {
      button.disabled = false;
      button.classList.remove("is-selected");
    }
    const target = pool[state.round % pool.length];
    const game = {
      kind: state.mode,
      target,
      attempts: 0,
      complete: false,
      direction: "symbol",
      choices: []
    };

    if (state.mode === "symbol-match") {
      game.direction = state.round % 2 === 0 ? "symbol" : "name";
      const distractors = rotate(pool.filter((element) => element.atomicNumber !== target.atomicNumber), state.round + 1).slice(0, 3);
      game.choices = rotate([target].concat(distractors), state.round);
    }
    state.game = game;
    nextQuestionButton.hidden = true;

    if (state.mode === "find-it") {
      setPrompt(`Find ${target.name}.`, true);
    } else if (state.mode === "atomic-number") {
      setPrompt(`Find element number ${target.atomicNumber}.`, true);
    } else {
      const question = game.direction === "symbol"
        ? `Which symbol means ${target.name}?`
        : `What is ${target.symbol}?`;
      setPrompt(question, true);
      renderSymbolChoices();
    }
  }

  function showWrongFeedback(node) {
    if (node) {
      node.classList.add("wrong-gently");
      window.setTimeout(() => node.classList.remove("wrong-gently"), 650);
    }
    const game = state.game;
    game.attempts += 1;

    if (game.attempts === 2) {
      setPrompt("Almost — look for the gentle glow.", true);
    } else if (game.attempts >= 3) {
      setPrompt(`This one is ${game.target.name}. Tap it when you are ready.`, true);
    } else {
      setPrompt("That is not this one. Try again gently.", true);
    }
    if (state.mode === "symbol-match") renderSymbolChoices();

    const targetNode = state.mode === "symbol-match"
      ? document.querySelector(`.symbol-choice[data-atomic-number="${game.target.atomicNumber}"]`)
      : document.querySelector(`.element-tile[data-atomic-number="${game.target.atomicNumber}"]`);
    if (game.attempts === 2 && targetNode) targetNode.classList.add("hint-glow");
    if (game.attempts >= 3 && targetNode) targetNode.classList.add("hint-shown");
  }

  function finishCorrect(target) {
    const game = state.game;
    game.complete = true;
    clearHintClasses();
    selectElement(target, true);
    setPrompt(`Yes! ${target.name} is element number ${target.atomicNumber}.`, true);
    if (state.mode === "symbol-match") renderSymbolChoices();
    nextQuestionButton.hidden = false;
    for (const button of document.querySelectorAll(".symbol-choice")) {
      button.disabled = true;
      if (button.dataset.correct === "true") button.classList.add("is-selected");
    }
  }

  function handleTile(element) {
    if (state.mode === "explore") {
      selectElement(element, true);
      return;
    }
    if (!state.game || state.game.complete || state.mode === "symbol-match") return;
    if (element.atomicNumber === state.game.target.atomicNumber) finishCorrect(element);
    else showWrongFeedback(document.querySelector(`.element-tile[data-atomic-number="${element.atomicNumber}"]`));
  }

  function chooseMode(mode) {
    state.mode = mode;
    app.dataset.mode = mode;
    state.game = null;
    clearHintClasses();
    clearSelection();
    for (const button of document.querySelectorAll(".mode-chip")) {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    nextQuestionButton.hidden = true;
    if (mode === "explore") {
      setPrompt("Tap any element to hear one short fact.", false);
      const selected = byNumber.get(state.selectedNumber) || byNumber.get(8) || elements[0];
      if (selected) {
        const tile = document.querySelector(`.element-tile[data-atomic-number="${selected.atomicNumber}"]`);
        if (tile) tile.classList.add("is-selected");
        renderInfo(selected);
      }
    } else {
      newQuestion();
    }
  }

  function chooseSet(setName) {
    state.set = setName;
    for (const button of document.querySelectorAll(".set-chip")) {
      const active = button.dataset.set === setName;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    state.round = 0;
    if (state.mode !== "explore") newQuestion();
  }

  function wireControls() {
    for (const button of document.querySelectorAll(".mode-chip")) {
      button.addEventListener("click", () => chooseMode(button.dataset.mode));
    }
    for (const button of document.querySelectorAll(".set-chip")) {
      button.addEventListener("click", () => chooseSet(button.dataset.set));
    }
    document.querySelector(".main-grid").addEventListener("click", (event) => {
      const tile = event.target.closest(".element-tile");
      if (!tile) return;
      handleTile(byNumber.get(Number(tile.dataset.atomicNumber)));
    });
    fBlock.addEventListener("click", (event) => {
      const tile = event.target.closest(".element-tile");
      if (!tile) return;
      handleTile(byNumber.get(Number(tile.dataset.atomicNumber)));
    });
    prompt.addEventListener("click", (event) => {
      const choice = event.target.closest(".symbol-choice");
      if (!choice || !state.game || state.game.complete) return;
      const element = byNumber.get(Number(choice.dataset.atomicNumber));
      if (element.atomicNumber === state.game.target.atomicNumber) finishCorrect(element);
      else showWrongFeedback(choice);
    });
    speakButton.addEventListener("click", () => {
      const element = byNumber.get(state.selectedNumber);
      if (element) window.PeriodicVoice.speak(element.audioId, element.fact);
    });
    nextQuestionButton.addEventListener("click", () => {
      state.round += 1;
      newQuestion();
    });
  }

  function adjustNavigation() {
    const isTestHub = window.location.pathname.includes("/test-apps/");
    document.getElementById("home-link").href = isTestHub ? "../../children-apps/" : "../children-apps/";
    document.getElementById("back-link").href = isTestHub ? "../" : "../";
  }

  function registerWorker() {
    if (window.__PERIODIC_DISABLE_SW__) return;
    if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
      Promise.resolve() /* Test Hub staging: no service worker */;
    }
  }

  buildLegend();
  buildMainGrid();
  buildFBlock();
  wireControls();
  adjustNavigation();
  chooseMode("explore");
  window.PeriodicVoice.load();
  registerWorker();

  window.__periodicApp = Object.freeze({
    getState() {
      return {
        mode: state.mode,
        set: state.set,
        selectedNumber: state.selectedNumber,
        round: state.round,
        targetNumber: state.game ? state.game.target.atomicNumber : null,
        targetName: state.game ? state.game.target.name : null,
        attempts: state.game ? state.game.attempts : 0,
        complete: state.game ? state.game.complete : false,
        direction: state.game ? state.game.direction : null
      };
    },
    getElement(atomicNumber) {
      return byNumber.get(atomicNumber) || null;
    },
    chooseMode,
    chooseSet,
    newQuestion
  });
})();
