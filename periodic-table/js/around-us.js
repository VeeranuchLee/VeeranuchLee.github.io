/* Screen switching for the Chemistry hub room, the Chemistry Around Us room (js/chem-room.js
   builds both rooms), the periodic table, and the shared scene screen. */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  /* Scene art and tap shapes for the three new places arrive from another worker; the
     fallbackTitle shows until each scene json loads, and a missing webp leaves the plain
     tinted placeholder instead of a broken image. */
  const SCENES = [
    {
      id: "kitchen",
      fallbackTitle: "Kitchen",
      alt: "A cosy kitchen counter with salt, sugar, water, baking soda, vinegar, lemons, foil, milk and a steel pot"
    },
    { id: "beach", fallbackTitle: "Beach and rocks" },
    { id: "dressing-table", fallbackTitle: "Dressing table" },
    { id: "jewellery", fallbackTitle: "Jewellery box" }
  ];
  const app = document.getElementById("app");
  const homeScreen = document.getElementById("home-screen");
  const scenesScreen = document.getElementById("scenes-screen");
  const sceneScreen = document.getElementById("scene-screen");
  const sceneFrame = document.getElementById("scene-frame");
  const sceneImage = document.getElementById("scene-image");
  const sceneTargets = document.getElementById("scene-targets");
  const sceneFallback = document.getElementById("scene-fallback");
  const scenePanel = document.getElementById("scene-panel");
  const sceneTitle = document.getElementById("scene-title");
  const tableNodes = Array.from(document.querySelectorAll(".table-only"));
  const elements = Array.isArray(window.PERIODIC_ELEMENTS) ? window.PERIODIC_ELEMENTS : [];
  const elementsBySymbol = new Map(elements.map((element) => [element.symbol, element]));
  const sceneData = new Map();
  const sceneSelection = new Map();
  let currentScene = null;
  let selectedThing = null;

  function hideAllScreens() {
    homeScreen.hidden = true;
    scenesScreen.hidden = true;
    sceneScreen.hidden = true;
    for (const node of tableNodes) node.hidden = true;
  }

  function showHome() {
    app.dataset.screen = "home";
    hideAllScreens();
    homeScreen.hidden = false;
  }

  function showTable() {
    app.dataset.screen = "table";
    hideAllScreens();
    for (const node of tableNodes) node.hidden = false;
  }

  function showScenes() {
    app.dataset.screen = "scenes";
    hideAllScreens();
    scenesScreen.hidden = false;
  }

  function showScene(sceneId) {
    app.dataset.screen = "scene";
    hideAllScreens();
    sceneScreen.hidden = false;
    openScene(sceneId);
  }

  function speakerIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const body = document.createElementNS(SVG_NS, "path");
    body.setAttribute("d", "M11 5 6 9H3v6h3l5 4V5z");
    body.setAttribute("fill", "currentColor");

    const nearArc = document.createElementNS(SVG_NS, "path");
    nearArc.setAttribute("d", "M15.5 8.5a5 5 0 0 1 0 7");
    nearArc.setAttribute("fill", "none");
    nearArc.setAttribute("stroke", "currentColor");
    nearArc.setAttribute("stroke-width", "2.2");
    nearArc.setAttribute("stroke-linecap", "round");

    const farArc = document.createElementNS(SVG_NS, "path");
    farArc.setAttribute("d", "M18.5 6a9 9 0 0 1 0 12");
    farArc.setAttribute("fill", "none");
    farArc.setAttribute("stroke", "currentColor");
    farArc.setAttribute("stroke-width", "2.2");
    farArc.setAttribute("stroke-linecap", "round");

    svg.append(body, nearArc, farArc);
    return svg;
  }

  function makeSpeakButton(label, audioId, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "panel-speak";
    button.setAttribute("aria-label", label);
    button.append(speakerIcon());
    button.addEventListener("click", () => window.PeriodicVoice.speak(audioId, text));
    return button;
  }

  function makeElementChips(symbols) {
    const group = document.createElement("div");
    group.className = "element-chips";
    group.setAttribute("aria-label", "Elements in this chemical");

    for (const symbol of symbols) {
      const element = elementsBySymbol.get(symbol);
      if (!element) continue;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "element-chip";
      chip.setAttribute("aria-label", `Open ${element.name} in the periodic table`);

      const icon = document.createElement("img");
      icon.src = `icons/${String(element.atomicNumber).padStart(3, "0")}-${element.symbol}.webp`;
      icon.alt = "";
      icon.draggable = false;

      const symbolText = document.createElement("span");
      symbolText.className = "element-chip-symbol";
      symbolText.textContent = element.symbol;

      const name = document.createElement("span");
      name.className = "element-chip-name";
      name.textContent = element.name;

      chip.append(icon, symbolText, name);
      chip.addEventListener("click", () => {
        showTable();
        window.__periodicApp.openElement(element.symbol);
      });
      group.append(chip);
    }
    return group;
  }

  function sceneAudioId(thingId) {
    return `around-${currentScene}-${thingId}`;
  }

  function renderThing(thing) {
    const heading = document.createElement("div");
    heading.className = "thing-heading";
    const title = document.createElement("h2");
    title.textContent = thing.name;
    heading.append(title, makeSpeakButton(`Replay the ${thing.name} explanation`, sceneAudioId(thing.id), thing.say));

    const chemical = document.createElement("p");
    chemical.className = "chemical-line";
    const chemicalLabel = document.createElement("strong");
    chemicalLabel.textContent = "Chemical: ";
    chemical.append(chemicalLabel, document.createTextNode(thing.chemical));

    const say = document.createElement("p");
    say.className = "thing-say";
    say.textContent = thing.say;

    const parts = [heading, chemical];
    if (thing.elements && thing.elements.length) parts.push(makeElementChips(thing.elements));
    parts.push(say);
    scenePanel.replaceChildren(...parts);

    if (thing.box) {
      const special = document.createElement("section");
      special.className = "special-box";
      const specialHeading = document.createElement("div");
      specialHeading.className = "special-heading";
      const specialTitle = document.createElement("h3");
      specialTitle.textContent = thing.box.title;
      specialHeading.append(specialTitle, makeSpeakButton(`Hear ${thing.box.title}`, `${sceneAudioId(thing.id)}-box`, thing.box.say));
      const specialSay = document.createElement("p");
      specialSay.textContent = thing.box.say;
      special.append(specialHeading, specialSay);
      if (thing.box.elements && thing.box.elements.length) special.append(makeElementChips(thing.box.elements));
      scenePanel.append(special);
    }
    scenePanel.scrollTop = 0;
  }

  function selectThing(thing, speakIt) {
    selectedThing = thing.id;
    sceneSelection.set(currentScene, thing.id);
    for (const polygon of sceneTargets.querySelectorAll(".scene-target")) {
      const selected = polygon.dataset.thingId === selectedThing;
      polygon.classList.toggle("is-selected", selected);
      polygon.setAttribute("aria-pressed", String(selected));
    }
    for (const button of sceneFallback.querySelectorAll(".scene-fallback-button")) {
      button.classList.toggle("is-selected", button.dataset.thingId === selectedThing);
    }
    renderThing(thing);
    if (speakIt !== false) window.PeriodicVoice.speak(sceneAudioId(thing.id), thing.say);
  }

  function resetPanel() {
    const prompt = document.createElement("div");
    prompt.className = "panel-prompt";
    const heading = document.createElement("h2");
    heading.textContent = "What is it made of?";
    const line = document.createElement("p");
    line.textContent = "Tap something in the picture to discover its chemistry.";
    prompt.append(heading, line);
    scenePanel.replaceChildren(prompt);
  }

  function buildTargets(data) {
    sceneTargets.replaceChildren();
    // Invisible tap margin: small things (salt, water, vinegar) are narrower than a fingertip at
    // iPad size, so each gets a transparent 11px band around its outline. Drawn first, so a real
    // outline always wins where a margin overlaps a neighbour.
    for (const thing of data.things) {
      if (!Array.isArray(thing.shape)) continue;
      const hit = document.createElementNS(SVG_NS, "polygon");
      hit.classList.add("scene-hit");
      hit.dataset.thingId = thing.id;
      hit.setAttribute("aria-hidden", "true");
      hit.setAttribute("points", thing.shape.map(([x, y]) => `${x * 1000},${y * 750}`).join(" "));
      hit.addEventListener("click", () => selectThing(thing, true));
      sceneTargets.append(hit);
    }
    for (const thing of data.things) {
      if (!Array.isArray(thing.shape)) continue;
      const polygon = document.createElementNS(SVG_NS, "polygon");
      polygon.classList.add("scene-target");
      polygon.dataset.thingId = thing.id;
      polygon.setAttribute("points", thing.shape.map(([x, y]) => `${x * 1000},${y * 750}`).join(" "));
      polygon.setAttribute("role", "button");
      polygon.setAttribute("tabindex", "0");
      polygon.setAttribute("aria-label", `Discover the chemistry of ${thing.name}`);
      polygon.setAttribute("aria-pressed", "false");
      polygon.addEventListener("click", () => selectThing(thing, true));
      polygon.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectThing(thing, true);
      });
      sceneTargets.append(polygon);
    }
  }

  /* Until the painted shapes arrive, a scene with no tappable outlines lists its things as
     plain buttons over the placeholder, so the explanations are reachable either way. */
  function buildFallback(data) {
    sceneFallback.replaceChildren();
    for (const thing of data.things) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-fallback-button";
      button.dataset.thingId = thing.id;
      button.textContent = thing.name;
      button.addEventListener("click", () => selectThing(thing, true));
      sceneFallback.append(button);
    }
    sceneFallback.hidden = false;
  }

  async function loadSceneData(sceneId) {
    if (sceneData.has(sceneId)) return sceneData.get(sceneId);
    try {
      const response = await fetch(`./data/around-us/${sceneId}.json`);
      if (!response.ok) throw new Error(`${sceneId} data HTTP ${response.status}`);
      const data = await response.json();
      sceneData.set(sceneId, data);
      return data;
    } catch (_error) {
      return null;
    }
  }

  async function openScene(sceneId) {
    currentScene = sceneId;
    selectedThing = null;
    const definition = SCENES.find((scene) => scene.id === sceneId) || SCENES[0];
    sceneFrame.dataset.scene = sceneId;
    sceneImage.alt = "";
    sceneImage.src = `./art/around-us/${sceneId}.webp`;
    sceneTargets.replaceChildren();
    sceneTargets.setAttribute("aria-label", "Tappable picture objects");
    sceneFallback.replaceChildren();
    sceneFallback.hidden = true;

    const data = await loadSceneData(sceneId);
    if (currentScene !== sceneId) return;
    if (!data) {
      sceneTitle.textContent = definition.fallbackTitle;
      const message = document.createElement("p");
      message.className = "panel-prompt";
      message.textContent = `The ${definition.fallbackTitle.toLowerCase()} could not be opened. Please try again.`;
      scenePanel.replaceChildren(message);
      return;
    }

    sceneTitle.textContent = data.title;
    sceneImage.alt = definition.alt || `${data.title} picture`;
    sceneTargets.setAttribute("aria-label", `Tappable ${data.title} objects`);
    buildTargets(data);
    if (!data.things.some((thing) => Array.isArray(thing.shape))) buildFallback(data);

    const storedId = sceneSelection.get(sceneId);
    const storedThing = storedId && data.things.find((thing) => thing.id === storedId);
    if (storedThing) selectThing(storedThing, false);
    else resetPanel();
  }

  sceneImage.addEventListener("error", () => sceneFrame.classList.add("is-missing"));
  sceneImage.addEventListener("load", () => sceneFrame.classList.remove("is-missing"));

  document.getElementById("scenes-back").addEventListener("click", showHome);
  document.getElementById("scene-back").addEventListener("click", showScenes);
  document.getElementById("back-link").addEventListener("click", (event) => {
    if (app.dataset.screen !== "table") return;
    event.preventDefault();
    showHome();
  });

  const isTestHub = window.location.pathname.includes("/test-apps/");
  document.getElementById("home-back-link").href = isTestHub ? "../../children-apps/" : "../children-apps/";
  showHome();

  window.__chemistryApp = Object.freeze({
    showHome,
    showTable,
    showScenes,
    showScene,
    showKitchen() {
      showScene("kitchen");
    },
    getSelectedScene() {
      return currentScene;
    },
    getSelectedThing() {
      return selectedThing;
    }
  });
})();
