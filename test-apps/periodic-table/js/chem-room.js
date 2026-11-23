/* Chemistry hub room (owner 2026-11-23: "it's still card view, not the room view").
   One painted room, like the Biology hub: the child taps the object itself. The tap shapes,
   label spots and glint spots live in data/room.json in 2048x1536 picture pixels.
   Routes: "#table" opens the periodic table; "#scene/<id>" opens that Chemistry Around Us place.
   ?debug=1 draws every tap shape. */
(function () {
  "use strict";

  const stage = document.getElementById("room-stage");
  if (!stage) return;
  const image = document.getElementById("room-image");
  const hotspots = document.getElementById("room-hotspots");
  const labels = document.getElementById("room-labels");
  const glints = document.getElementById("room-glints");
  const debugSvg = document.getElementById("room-debug");
  const SVG_NS = "http://www.w3.org/2000/svg";
  if (new URLSearchParams(location.search).get("debug") === "1") stage.classList.add("is-debug");

  function pct(value, total) { return (value / total * 100) + "%"; }

  function go(route) {
    const chem = window.__chemistryApp;
    if (!chem) return;
    if (route === "#table") chem.showTable();
    else if (route.startsWith("#scene/")) chem.showScene(route.slice(7));
  }

  fetch("./data/room.json").then((response) => response.json()).then((data) => {
    const size = data.imageSize;
    image.src = "./" + data.image;
    debugSvg.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    data.landmarks.forEach((item, index) => {
      if (!item.active) return;
      const polygon = document.createElementNS(SVG_NS, "polygon");
      polygon.setAttribute("points", item.polygon.map((p) => p.join(",")).join(" "));
      debugSvg.append(polygon);

      const label = document.createElement("span");
      label.className = "room-label";
      label.textContent = item.label;
      label.style.left = pct(item.labelAt[0], size.width);
      label.style.top = pct(item.labelAt[1], size.height);
      labels.append(label);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "room-hotspot";
      button.dataset.landmark = item.id;
      button.setAttribute("aria-label", "Open " + item.label);
      button.style.clipPath = "polygon(" + item.polygon
        .map((p) => pct(p[0], size.width) + " " + pct(p[1], size.height)).join(",") + ")";
      button.addEventListener("click", () => {
        if (stage.dataset.navigating === "yes") return;
        stage.dataset.navigating = "yes";
        button.classList.add("pressed");
        window.setTimeout(() => {
          button.classList.remove("pressed");
          delete stage.dataset.navigating;
          go(item.route);
        }, 170);
      });
      hotspots.append(button);

      const glint = document.createElement("span");
      glint.className = "room-glint";
      glint.style.left = pct(item.glint[0], size.width);
      glint.style.top = pct(item.glint[1], size.height);
      glint.style.setProperty("--delay", (index * 1.9) + "s");
      glints.append(glint);
    });
  }).catch(() => stage.classList.add("is-missing"));
})();
