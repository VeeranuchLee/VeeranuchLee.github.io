(function () {
  "use strict";
  var stage = document.getElementById("roomStage");
  var hotspots = document.getElementById("roomHotspots");
  var labels = document.getElementById("roomLabels");
  var glints = document.getElementById("roomGlints");
  var debugSvg = document.getElementById("roomDebug");
  var status = document.getElementById("roomStatus");
  var debug = new URLSearchParams(location.search).get("debug") === "1";
  if (debug) document.body.classList.add("debug");

  function pointPercent(point, size) { return (point[0] / size.width * 100) + "% " + (point[1] / size.height * 100) + "%"; }
  function svgPolygon(points, className) {
    var polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points.map(function (p) { return p.join(","); }).join(" "));
    polygon.setAttribute("class", className);
    return polygon;
  }

  fetch("./data/room.json").then(function (response) { return response.json(); }).then(function (data) {
    document.getElementById("roomImage").src = data.image;
    data.landmarks.forEach(function (item, index) {
      debugSvg.appendChild(svgPolygon(item.polygon, item.active ? "active" : "inactive"));
      // Pilot: only active rooms are named. A named object that does nothing on tap
      // reads as a broken button to a child (controller review 2026-11-05).
      if (!item.active) return;
      var label = document.createElement("span");
      label.className = "room-label" + (item.active ? "" : " inactive");
      label.textContent = item.label;
      label.style.left = (item.labelAt[0] / data.imageSize.width * 100) + "%";
      label.style.top = (item.labelAt[1] / data.imageSize.height * 100) + "%";
      labels.appendChild(label);

      var link = document.createElement("a");
      link.className = "room-hotspot";
      link.href = item.route;
      link.setAttribute("aria-label", "Open " + item.label);
      link.style.clipPath = "polygon(" + item.polygon.map(function (p) { return pointPercent(p, data.imageSize); }).join(",") + ")";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (stage.dataset.navigating === "yes") return;
        stage.dataset.navigating = "yes";
        window.LabAudio.chime();
        link.classList.add("pressed");
        status.textContent = "Opening " + item.label;
        window.setTimeout(function () { location.href = item.route; }, 170);
      });
      hotspots.appendChild(link);

      var glint = document.createElement("span");
      glint.className = "room-glint";
      glint.style.left = (item.glint[0] / data.imageSize.width * 100) + "%";
      glint.style.top = (item.glint[1] / data.imageSize.height * 100) + "%";
      glint.style.setProperty("--delay", (index * 2.35) + "s");
      glints.appendChild(glint);
    });
  }).catch(function () { status.textContent = "The room could not load."; });
})();
