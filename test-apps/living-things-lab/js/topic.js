(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var query = new URLSearchParams(location.search);
  var topicId = query.get("t") || "plant-cell";
  var debug = query.get("debug") === "1";
  var title = document.getElementById("topicTitle");
  var image = document.getElementById("topicImage");
  var hotspots = document.getElementById("partHotspots");
  var labels = document.getElementById("allLabels");
  var lines = document.getElementById("leaderLines");
  var selection = document.getElementById("selectionShape");
  var debugShapes = document.getElementById("debugShapes");
  var toggle = document.getElementById("showNames");
  var replay = document.getElementById("replay");
  var partName = document.getElementById("partName");
  var partFact = document.getElementById("partFact");
  var selected = null;
  var showAll = window.SafeStorage.local.getItem("living-things-lab-show-names") === "true";
  if (debug) document.body.classList.add("debug");

  // Nonzero fill with regions wound one way and holes the other: overlapping regions of
  // one part add up instead of cancelling (evenodd turned every overlap into a dead hole).
  function area(points) {
    var sum = 0;
    for (var i = 0; i < points.length; i++) {
      var a = points[i], b = points[(i + 1) % points.length];
      sum += a[0] * b[1] - b[0] * a[1];
    }
    return sum;
  }
  function wound(points, positive) {
    return (area(points) > 0) === positive ? points : points.slice().reverse();
  }
  function pathData(regions, holes) {
    return (regions || []).map(function (points) { return wound(points, true); })
      .concat((holes || []).map(function (points) { return wound(points, false); }))
      .map(function (points) {
        return "M" + points.map(function (point) { return point.join(","); }).join("L") + "Z";
      }).join(" ");
  }
  function shape(regions, holes, className) {
    var node = document.createElementNS(NS, "path");
    node.setAttribute("d", pathData(regions, holes));
    node.setAttribute("fill-rule", "nonzero");
    node.setAttribute("class", className);
    return node;
  }
  function speak(part) { window.LabAudio.narrate(["./" + part.audio.name, "./" + part.audio.fact]); }
  function choose(part) {
    selected = part;
    selection.replaceChildren(shape(part.highlightRegions || part.regions, part.highlightHoles || part.holes, "selection-polygon"));
    partName.textContent = part.name;
    partFact.textContent = part.fact;
    replay.disabled = false;
    window.LabAudio.chime();
    speak(part);
  }
  function applyShowAll() {
    toggle.setAttribute("aria-checked", String(showAll));
    labels.querySelectorAll(".all-label").forEach(function (node) { node.hidden = !showAll; });
    lines.querySelectorAll(".leader-line").forEach(function (node) { node.classList.toggle("hidden", !showAll); });
  }
  toggle.addEventListener("click", function () {
    showAll = !showAll;
    window.SafeStorage.local.setItem("living-things-lab-show-names", String(showAll));
    applyShowAll();
    window.LabAudio.chime();
  });
  replay.addEventListener("click", function () {
    if (!selected) return;
    window.LabAudio.chime();
    speak(selected);
  });

  fetch("./data/topics.json").then(function (response) { return response.json(); }).then(function (data) {
    var topic = data.topics.find(function (candidate) { return candidate.id === topicId; });
    if (!topic) { location.replace("./"); return; }
    document.title = topic.title + " — Living Things Lab";
    title.textContent = topic.title;
    image.src = "./" + topic.image;
    image.alt = topic.alt || (topic.id === "plant-cell" ? "A large painted plant cell with distinct organelles" : "A large cut-open flower showing its main structures");

    topic.parts.slice().sort(function (a, b) { return a.priority - b.priority; }).forEach(function (part) {
      var button = shape(part.regions, part.holes, "part-hotspot");
      button.setAttribute("role", "button");
      button.setAttribute("tabindex", "0");
      button.setAttribute("aria-label", part.name);
      button.addEventListener("click", function () { choose(part); });
      button.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault(); choose(part);
      });
      hotspots.appendChild(button);

      var label = document.createElement("button");
      label.type = "button";
      label.className = "all-label";
      label.textContent = part.name;
      label.style.left = (part.label[0] / data.imageSize.width * 100) + "%";
      label.style.top = (part.label[1] / data.imageSize.height * 100) + "%";
      label.addEventListener("click", function () { choose(part); });
      labels.appendChild(label);

      var line = document.createElementNS(NS, "line");
      line.setAttribute("class", "leader-line");
      line.setAttribute("x1", part.anchor[0]); line.setAttribute("y1", part.anchor[1]);
      line.setAttribute("x2", part.label[0]); line.setAttribute("y2", part.label[1]);
      lines.appendChild(line);
      debugShapes.appendChild(shape(part.regions, part.holes, "debug-shape"));
    });
    applyShowAll();
  }).catch(function () {
    partName.textContent = "Could not load";
    partFact.textContent = "Please return to the room and try again.";
  });
})();
