/* Chemistry home and the Chemistry Around Us kitchen pilot. */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const app = document.getElementById("app");
  const homeScreen = document.getElementById("home-screen");
  const kitchenScreen = document.getElementById("kitchen-screen");
  const tableNodes = Array.from(document.querySelectorAll(".table-only"));
  const targets = document.getElementById("kitchen-targets");
  const panel = document.getElementById("kitchen-panel");
  const elements = Array.isArray(window.PERIODIC_ELEMENTS) ? window.PERIODIC_ELEMENTS : [];
  const elementsBySymbol = new Map(elements.map((element) => [element.symbol, element]));
  let kitchenData = null;
  let selectedThing = null;

  function showHome() {
    app.dataset.screen = "home";
    homeScreen.hidden = false;
    kitchenScreen.hidden = true;
    for (const node of tableNodes) node.hidden = true;
  }

  function showTable() {
    app.dataset.screen = "table";
    homeScreen.hidden = true;
    kitchenScreen.hidden = true;
    for (const node of tableNodes) node.hidden = false;
  }

  function showKitchen() {
    app.dataset.screen = "kitchen";
    homeScreen.hidden = true;
    kitchenScreen.hidden = false;
    for (const node of tableNodes) node.hidden = true;
    loadKitchen();
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

  function renderThing(thing) {
    const heading = document.createElement("div");
    heading.className = "thing-heading";
    const title = document.createElement("h2");
    title.textContent = thing.name;
    heading.append(title, makeSpeakButton(`Replay the ${thing.name} explanation`, `around-kitchen-${thing.id}`, thing.say));

    const chemical = document.createElement("p");
    chemical.className = "chemical-line";
    const chemicalLabel = document.createElement("strong");
    chemicalLabel.textContent = "Chemical: ";
    chemical.append(chemicalLabel, document.createTextNode(thing.chemical));

    const say = document.createElement("p");
    say.className = "thing-say";
    say.textContent = thing.say;

    panel.replaceChildren(heading, chemical, makeElementChips(thing.elements), say);

    if (thing.box) {
      const special = document.createElement("section");
      special.className = "special-box";
      const specialHeading = document.createElement("div");
      specialHeading.className = "special-heading";
      const specialTitle = document.createElement("h3");
      specialTitle.textContent = thing.box.title;
      const audioId = `around-kitchen-${thing.id}-box`;
      specialHeading.append(specialTitle, makeSpeakButton(`Hear ${thing.box.title}`, audioId, thing.box.say));
      const specialSay = document.createElement("p");
      specialSay.textContent = thing.box.say;
      special.append(specialHeading, specialSay, makeElementChips(thing.box.elements));
      panel.append(special);
    }
    panel.scrollTop = 0;
  }

  function selectThing(thing) {
    selectedThing = thing.id;
    for (const polygon of targets.querySelectorAll(".scene-target")) {
      const selected = polygon.dataset.thingId === selectedThing;
      polygon.classList.toggle("is-selected", selected);
      polygon.setAttribute("aria-pressed", String(selected));
    }
    renderThing(thing);
    window.PeriodicVoice.speak(`around-kitchen-${thing.id}`, thing.say);
  }

  function buildTargets(data) {
    targets.replaceChildren();
    // Invisible tap margin: small things (salt, water, vinegar) are narrower than a fingertip at
    // iPad size, so each gets a transparent 11px band around its outline. Drawn first, so a real
    // outline always wins where a margin overlaps a neighbour.
    for (const thing of data.things) {
      const hit = document.createElementNS(SVG_NS, "polygon");
      hit.classList.add("scene-hit");
      hit.dataset.thingId = thing.id;
      hit.setAttribute("aria-hidden", "true");
      hit.setAttribute("points", thing.shape.map(([x, y]) => `${x * 1000},${y * 750}`).join(" "));
      hit.addEventListener("click", () => selectThing(thing));
      targets.append(hit);
    }
    for (const thing of data.things) {
      const polygon = document.createElementNS(SVG_NS, "polygon");
      polygon.classList.add("scene-target");
      polygon.dataset.thingId = thing.id;
      polygon.setAttribute("points", thing.shape.map(([x, y]) => `${x * 1000},${y * 750}`).join(" "));
      polygon.setAttribute("role", "button");
      polygon.setAttribute("tabindex", "0");
      polygon.setAttribute("aria-label", `Discover the chemistry of ${thing.name}`);
      polygon.setAttribute("aria-pressed", "false");
      polygon.addEventListener("click", () => selectThing(thing));
      polygon.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectThing(thing);
      });
      targets.append(polygon);
    }
  }

  async function loadKitchen() {
    if (kitchenData) return kitchenData;
    try {
      const response = await fetch("./data/around-us/kitchen.json");
      if (!response.ok) throw new Error(`kitchen data HTTP ${response.status}`);
      kitchenData = await response.json();
      buildTargets(kitchenData);
      return kitchenData;
    } catch (_error) {
      const message = document.createElement("p");
      message.className = "panel-prompt";
      message.textContent = "The kitchen could not be opened. Please try again.";
      panel.replaceChildren(message);
      return null;
    }
  }

  document.getElementById("open-table").addEventListener("click", showTable);
  document.getElementById("open-kitchen").addEventListener("click", showKitchen);
  document.getElementById("kitchen-back").addEventListener("click", showHome);
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
    showKitchen,
    getSelectedThing() {
      return selectedThing;
    }
  });
})();
