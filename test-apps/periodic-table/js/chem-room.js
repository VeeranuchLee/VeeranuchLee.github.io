/* Chemistry rooms (owner 2026-11-23: "main > chem hub > periodic table & everyday chem ...
   everyday chem > many scenes"). Two painted rooms in the Biology-hub style, where the child taps
   the object itself:
     - the Chemistry hub room (data/room.json): the periodic table, and the doorway into
       Everyday Chemistry; more objects can join this level later;
     - the Everyday Chemistry room (data/everyday-room.json): one object per scene.
   Tap shapes, label spots and glint spots are in the picture's own pixels.
   Routes: "#table", "#everyday", "#scene/<id>". ?debug=1 draws every tap shape. */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const debug = new URLSearchParams(location.search).get("debug") === "1";

  function pct(value, total) { return (value / total * 100) + "%"; }

  function go(route) {
    const chem = window.__chemistryApp;
    if (!chem) return;
    if (route === "#table") chem.showTable();
    else if (route === "#everyday") chem.showScenes();
    else if (route.startsWith("#scene/")) chem.showScene(route.slice(7));
  }

  function buildRoom(stage) {
    const image = stage.querySelector(".room-image");
    const hotspots = stage.querySelector(".room-hotspots");
    const labels = stage.querySelector(".room-labels");
    const glints = stage.querySelector(".room-glints");
    const debugSvg = stage.querySelector(".room-debug");
    if (debug) stage.classList.add("is-debug");

    fetch(stage.dataset.room).then((response) => response.json()).then((data) => {
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
  }

  document.querySelectorAll(".room-stage[data-room]").forEach(buildRoom);
})();
