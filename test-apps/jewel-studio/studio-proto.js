(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.JewelStudio = api;
    api.mount();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SAVE_KEY = "little-charm-studio-v1";
  const LEGACY_KEY = "little-charm-designs-v5";
  const VERSION = 3;
  const WIDTH = 900;
  const HEIGHT = 600;
  const CATEGORIES = ["Necklaces", "Hair ornaments", "Earrings"];
  const PALETTE = ["#d4a237", "#c5ccd6", "#2384d6", "#bf3c6e", "#2f977e", "#774db4", "#dc5837", "#f6ebda"];
  const TEMPLATES = [
    { id: "floral-necklace", title: "Layered Floral Necklace", category: "Necklaces", regionCount: 59 },
    { id: "tiara-comb", title: "Botanical Tiara Comb", category: "Hair ornaments", regionCount: 59 },
    { id: "chandelier-pair", title: "Chandelier Earring Pair", category: "Earrings", regionCount: 51 },
  ].map((template) => ({
    ...template,
    line: `design/coloring-studio/raster/${template.id}-line.png`,
    regionMap: `design/coloring-studio/raster/${template.id}-regions.png`,
  }));

  function blankDoc(templateId) {
    return { version: VERSION, id: `studio-${Date.now()}-${Math.random().toString(16).slice(2)}`, templateId, updatedAt: new Date().toISOString(), fills: {}, effects: {}, strokes: [], madeReal: false };
  }
  function validDoc(doc) {
    return !!(doc && [1, 2, VERSION].includes(doc.version) && TEMPLATES.some((template) => template.id === doc.templateId) && doc.fills && doc.effects && Array.isArray(doc.strokes));
  }
  function loadDocs(storage) {
    try {
      const docs = JSON.parse(storage.getItem(SAVE_KEY) || "[]");
      return Array.isArray(docs) ? docs.filter(validDoc) : [];
    } catch {
      return [];
    }
  }
  function saveDoc(storage, doc) {
    const docs = loadDocs(storage);
    const index = docs.findIndex((candidate) => candidate.id === doc.id);
    doc.version = VERSION;
    doc.updatedAt = new Date().toISOString();
    index < 0 ? docs.unshift(doc) : docs.splice(index, 1, doc);
    storage.setItem(SAVE_KEY, JSON.stringify(docs.slice(0, 24)));
    return docs;
  }
  function legacySummary(storage) {
    try {
      const docs = JSON.parse(storage.getItem(LEGACY_KEY) || "[]");
      return { key: LEGACY_KEY, count: Array.isArray(docs) ? docs.length : 0, preserved: true };
    } catch {
      return { key: LEGACY_KEY, count: 0, preserved: true };
    }
  }
  const rgbId = (data, offset) => (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
  function decodeRegionMap(data) {
    const labels = new Uint32Array(data.length / 4);
    for (let index = 0; index < labels.length; index++) labels[index] = rgbId(data, index * 4);
    return labels;
  }
  function pixelsForRegion(labels, id) {
    const pixels = [];
    for (let index = 0; index < labels.length; index++) if (labels[index] === id) pixels.push(index);
    return pixels;
  }
  function metalFamily(hex) {
    const [r, g, b] = String(hex || "#d4a237").match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
    if (Math.abs(r - g) < 26 && Math.abs(g - b) < 26) return "silver";
    if (r > g * 1.18 && b > g * .72) return "rose-gold";
    if (r > b * 1.35 && g > b * 1.18) return "gold";
    return "tinted-metal";
  }

  function mount() {
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];
    const canvases = ["colorCanvas", "drawCanvas", "finishCanvas", "effectCanvas", "lineCanvas"].map((id) => $("#" + id));
    canvases.forEach((canvas) => { canvas.width = WIDTH; canvas.height = HEIGHT; });
    const [colorCanvas, drawCanvas, finishCanvas, effectCanvas, lineCanvas] = canvases;
    const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true });
    const drawContext = drawCanvas.getContext("2d");
    const finishContext = finishCanvas.getContext("2d");
    const effectContext = effectCanvas.getContext("2d");
    const lineContext = lineCanvas.getContext("2d");
    let category = CATEGORIES[0];
    let doc = null;
    let template = null;
    let labels = null;
    let regionMeta = new Map();
    let tool = "fill";
    let color = PALETTE[2];
    let effect = null;
    let size = 18;
    let drawing = false;
    let activeStroke = null;
    let history = [];
    let future = [];
    let raf = 0;
    const regionCache = new Map();

    const loadImage = (src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    const show = (id) => {
      $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
      $("#back").style.visibility = id === "gallery" ? "hidden" : "visible";
    };
    const point = (event) => {
      const rect = lineCanvas.getBoundingClientRect();
      return { x: Math.max(0, Math.min(WIDTH - 1, Math.floor((event.clientX - rect.left) * WIDTH / rect.width))), y: Math.max(0, Math.min(HEIGHT - 1, Math.floor((event.clientY - rect.top) * HEIGHT / rect.height))) };
    };
    const regionAt = (event) => labels ? labels[point(event).y * WIDTH + point(event).x] : 0;
    const regionPixels = (id) => {
      if (!regionCache.has(id)) regionCache.set(id, pixelsForRegion(labels, id));
      return regionCache.get(id);
    };
    function snapshot() {
      history.push(JSON.stringify(doc));
      if (history.length > 30) history.shift();
      future = [];
      updateHistory();
    }
    function paintRegion(id, paint) {
      const output = colorContext.getImageData(0, 0, WIDTH, HEIGHT);
      const solid = !String(paint).startsWith("gradient:");
      const start = solid ? paint : paint.split(":")[1];
      const end = solid ? paint : paint.split(":")[2];
      const parse = (hex) => hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
      const a = parse(start), b = parse(end);
      for (const index of regionPixels(+id)) {
        const y = Math.floor(index / WIDTH), ratio = y / HEIGHT, offset = index * 4;
        output.data[offset] = a[0] + (b[0] - a[0]) * ratio;
        output.data[offset + 1] = a[1] + (b[1] - a[1]) * ratio;
        output.data[offset + 2] = a[2] + (b[2] - a[2]) * ratio;
        output.data[offset + 3] = 255;
      }
      colorContext.putImageData(output, 0, 0);
    }
    function rebuildColor() {
      colorContext.clearRect(0, 0, WIDTH, HEIGHT);
      for (const [id, paint] of Object.entries(doc.fills)) paintRegion(id, paint);
    }
    function drawStroke(stroke) {
      if (!stroke.points?.length) return;
      drawContext.save();
      drawContext.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
      drawContext.strokeStyle = stroke.color;
      drawContext.fillStyle = stroke.color;
      drawContext.lineWidth = stroke.size;
      drawContext.lineCap = "round";
      drawContext.lineJoin = "round";
      drawContext.beginPath();
      drawContext.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach((p) => drawContext.lineTo(p.x, p.y));
      if (stroke.points.length === 1) drawContext.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
      drawContext.stroke();
      drawContext.restore();
    }
    function rebuildDraw() {
      drawContext.clearRect(0, 0, WIDTH, HEIGHT);
      doc.strokes.forEach(drawStroke);
    }
    function maskFor(id) {
      const mask = document.createElement("canvas");
      mask.width = WIDTH; mask.height = HEIGHT;
      const context = mask.getContext("2d");
      const image = context.createImageData(WIDTH, HEIGHT);
      for (const index of regionPixels(+id)) image.data[index * 4 + 3] = 255;
      context.putImageData(image, 0, 0);
      return mask;
    }
    function boundsFor(id) {
      const pixels = regionPixels(+id);
      let left = WIDTH, right = 0, top = HEIGHT, bottom = 0;
      pixels.forEach((index) => { const x = index % WIDTH, y = Math.floor(index / WIDTH); left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); });
      return { left, right, top, bottom, x: (left + right) / 2, y: (top + bottom) / 2 };
    }
    function baseColour(id, material) {
      const paint = doc.fills[id];
      if (paint) return String(paint).startsWith("gradient:") ? paint.split(":")[1] : paint;
      return { gem: "#77a9cc", metal: "#d4a237", pearl: "#f6eadb", "enamel/other": "#d98aa8" }[material] || "#d8d0d5";
    }
    function rebuildFinish() {
      finishContext.clearRect(0, 0, WIDTH, HEIGHT);
      finishCanvas.hidden = !doc.madeReal;
      colorCanvas.style.opacity = doc.madeReal ? "0" : "1";
      drawCanvas.style.opacity = doc.madeReal ? "0" : "1";
      const button = $("#makeReal");
      button.setAttribute("aria-pressed", String(!!doc.madeReal));
      button.firstChild.nodeValue = doc.madeReal ? "← Keep colouring " : "✨ Make it real ";
      if (!doc.madeReal) return;
      const velvet = finishContext.createRadialGradient(WIDTH * .5, HEIGHT * .42, 20, WIDTH * .5, HEIGHT * .48, WIDTH * .72);
      velvet.addColorStop(0, "#7d4566"); velvet.addColorStop(.55, "#51233e"); velvet.addColorStop(1, "#24101f");
      finishContext.fillStyle = velvet; finishContext.fillRect(0, 0, WIDTH, HEIGHT);
      const wholeMask = document.createElement("canvas"); wholeMask.width = WIDTH; wholeMask.height = HEIGHT;
      const whole = wholeMask.getContext("2d");
      for (const id of regionMeta.keys()) whole.drawImage(maskFor(id), 0, 0);
      finishContext.save(); finishContext.shadowColor = "rgba(62,35,51,.38)"; finishContext.shadowBlur = 18; finishContext.shadowOffsetY = 12; finishContext.globalAlpha = .9; finishContext.drawImage(wholeMask, 0, 0); finishContext.restore();
      for (const [id, meta] of regionMeta) {
        const bounds = boundsFor(id), w = Math.max(1, bounds.right - bounds.left), h = Math.max(1, bounds.bottom - bounds.top);
        const layer = document.createElement("canvas"); layer.width = WIDTH; layer.height = HEIGHT; const context = layer.getContext("2d");
        const base = baseColour(id, meta.material);
        if (meta.material === "gem") {
          const rim = context.createRadialGradient(bounds.x, bounds.y, 1, bounds.x, bounds.y, Math.max(w, h) * .65); rim.addColorStop(0, "white"); rim.addColorStop(.18, base); rim.addColorStop(.68, base); rim.addColorStop(1, "#160d25"); context.fillStyle = rim; context.fillRect(bounds.left, bounds.top, w, h);
          const table = [[bounds.x-w*.17,bounds.y],[bounds.x,bounds.y-h*.17],[bounds.x+w*.17,bounds.y],[bounds.x,bounds.y+h*.17]];
          for (let facet=0;facet<8;facet++) { const a=facet*Math.PI/4,b=(facet+1)*Math.PI/4; context.fillStyle=facet%2?"rgba(255,255,255,.44)":"rgba(20,8,35,.34)"; context.beginPath(); context.moveTo(...table[Math.floor(facet/2)%4]); context.lineTo(bounds.x+Math.cos(a)*w*.58,bounds.y+Math.sin(a)*h*.58); context.lineTo(bounds.x+Math.cos(b)*w*.58,bounds.y+Math.sin(b)*h*.58); context.closePath(); context.fill(); }
          context.strokeStyle = "rgba(255,255,255,.72)"; context.lineWidth = 2; context.beginPath(); table.forEach((point,index)=>index?context.lineTo(...point):context.moveTo(...point)); context.closePath(); context.stroke();
          context.fillStyle = "rgba(255,255,255,.9)"; context.beginPath(); context.arc(bounds.left + w * .3, bounds.top + h * .25, Math.max(2, Math.min(w, h) * .1), 0, Math.PI * 2); context.fill();
        } else if (meta.material === "metal") {
          const family = metalFamily(base); const bright = family === "silver" ? "#ffffff" : family === "rose-gold" ? "#ffe0d8" : "#fff1aa";
          const metal = context.createLinearGradient(bounds.left, bounds.top, bounds.right, bounds.bottom); metal.addColorStop(0, "#392b34"); metal.addColorStop(.18, base); metal.addColorStop(.43, bright); metal.addColorStop(.57, base); metal.addColorStop(.8, bright); metal.addColorStop(1, "#4b3437"); context.fillStyle = metal; context.fillRect(bounds.left, bounds.top, w, h);
        } else if (meta.material === "pearl") {
          const pearl = context.createRadialGradient(bounds.left + w * .3, bounds.top + h * .25, 1, bounds.x, bounds.y, Math.max(w, h) * .65); pearl.addColorStop(0, "#ffffff"); pearl.addColorStop(.35, "#fff4df"); pearl.addColorStop(.72, base); pearl.addColorStop(1, "#b896aa"); context.fillStyle = pearl; context.fillRect(bounds.left, bounds.top, w, h);
        } else {
          const enamel = context.createLinearGradient(bounds.left, bounds.top, bounds.left, bounds.bottom); enamel.addColorStop(0, "white"); enamel.addColorStop(.23, base); enamel.addColorStop(1, base); context.fillStyle = enamel; context.fillRect(bounds.left, bounds.top, w, h);
        }
        context.globalCompositeOperation = "destination-in"; context.drawImage(maskFor(id), 0, 0); finishContext.drawImage(layer, 0, 0);
      }
    }
    function rebuildEffects(tick = 0) {
      effectContext.clearRect(0, 0, WIDTH, HEIGHT);
      for (const [id, spec] of Object.entries(doc.effects)) {
        const mask = maskFor(id), bounds = boundsFor(id), intensity = spec.intensity || 2;
        if (spec.type === "glow") {
          const glow = document.createElement("canvas"); glow.width = WIDTH; glow.height = HEIGHT;
          const context = glow.getContext("2d");
          context.save(); context.shadowColor = spec.color || "#ffd43b"; context.shadowBlur = 12 + intensity * 8; context.globalAlpha = .9; context.drawImage(mask, 0, 0); context.restore();
          context.globalCompositeOperation = "destination-out"; context.drawImage(mask, 0, 0);
          effectContext.drawImage(glow, 0, 0);
        } else if (spec.type === "sparkle") {
          effectContext.save();
          effectContext.fillStyle = "white";
          effectContext.strokeStyle = "#ffd85a";
          effectContext.lineWidth = 2;
          for (let index = 0; index < intensity + 1; index++) {
            const pulse = .7 + .3 * Math.sin(tick / 340 + index * 2.1);
            const x = bounds.left + (bounds.right - bounds.left) * (.25 + index / (intensity + 2));
            const y = bounds.top + (bounds.bottom - bounds.top) * (.35 + (index % 2) * .3);
            const radius = (6 + intensity * 2) * pulse;
            effectContext.beginPath();
            for (let ray = 0; ray < 8; ray++) { const angle = ray * Math.PI / 4, r = ray % 2 ? radius * .22 : radius; effectContext.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r); }
            effectContext.closePath(); effectContext.fill(); effectContext.stroke();
          }
          effectContext.restore();
        } else {
          const texture = document.createElement("canvas"); texture.width = WIDTH; texture.height = HEIGHT;
          const context = texture.getContext("2d");
          if (spec.type === "glitter") {
            const seed = +id * 7919;
            const phase = Math.floor(tick / 140);
            for (let index = 0; index < 30 + intensity * 30; index++) { const x = bounds.left + ((seed + (index + phase) * 47) % Math.max(1, bounds.right - bounds.left)); const y = bounds.top + ((seed + (index + phase) * 83) % Math.max(1, bounds.bottom - bounds.top)); context.fillStyle = index % 3 ? "#fffbd1" : "white"; context.fillRect(x, y, 2 + index % 2, 2 + index % 2); }
          } else {
            const gradient = context.createLinearGradient(bounds.left, bounds.bottom, bounds.right, bounds.top); gradient.addColorStop(.36, "transparent"); gradient.addColorStop(.48, "rgba(255,255,255,.92)"); gradient.addColorStop(.58, "rgba(255,255,255,.28)"); gradient.addColorStop(.7, "transparent"); context.fillStyle = gradient; context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
          }
          context.globalCompositeOperation = "destination-in"; context.drawImage(mask, 0, 0);
          effectContext.drawImage(texture, 0, 0);
        }
      }
    }
    function renderAll() { rebuildColor(); rebuildDraw(); rebuildFinish(); rebuildEffects(); animate(); }
    function animate() {
      if (raf || document.hidden || !doc || !Object.values(doc.effects).some((spec) => spec.type === "sparkle" || spec.type === "glitter")) return;
      const frame = (tick) => { if (document.hidden) { raf = 0; return; } rebuildEffects(tick); raf = requestAnimationFrame(frame); };
      raf = requestAnimationFrame(frame);
    }
    async function open(nextDoc) {
      doc = JSON.parse(JSON.stringify(nextDoc));
      if (doc.version < VERSION) doc.version = VERSION;
      doc.madeReal = !!doc.madeReal;
      template = TEMPLATES.find((candidate) => candidate.id === doc.templateId);
      history = []; future = []; regionCache.clear();
      $("#designTitle").textContent = template.title;
      $("#categoryLabel").textContent = `${template.category} · ${template.regionCount} fillable regions`;
      show("editor");
      $("#message").textContent = "Loading sealed region map…";
      const [lineImage, regionImage, manifest] = await Promise.all([loadImage(template.line), loadImage(template.regionMap), fetch("design/coloring-studio/raster/manifest.json").then((response) => response.json())]);
      lineContext.clearRect(0, 0, WIDTH, HEIGHT); lineContext.drawImage(lineImage, 0, 0, WIDTH, HEIGHT);
      const scratch = document.createElement("canvas"); scratch.width = WIDTH; scratch.height = HEIGHT;
      const scratchContext = scratch.getContext("2d", { willReadFrequently: true }); scratchContext.drawImage(regionImage, 0, 0);
      labels = decodeRegionMap(scratchContext.getImageData(0, 0, WIDTH, HEIGHT).data);
      regionMeta = new Map(manifest.designs.find((design) => design.id === template.id).regions.map((region) => [region.id, region]));
      renderAll(); updateHistory();
      $("#message").textContent = "Tap a bounded jewelry detail to fill it.";
    }
    function applyRegion(id) {
      if (!id) { $("#message").textContent = "That is background — zoom in and tap a jewelry detail."; return; }
      snapshot();
      if (effect) doc.effects[id] = { type: effect, intensity: +$("#intensity").value, color };
      else if (tool === "eraser") { delete doc.fills[id]; delete doc.effects[id]; }
      else doc.fills[id] = tool === "gradient" ? `gradient:${color}:#fff2a8` : color;
      renderAll();
    }
    lineCanvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (tool === "brush" || tool === "eraser" && !effect) {
        snapshot(); drawing = true; activeStroke = { color, size, eraser: tool === "eraser", points: [point(event)] }; doc.strokes.push(activeStroke); lineCanvas.setPointerCapture?.(event.pointerId); rebuildDraw();
      } else applyRegion(regionAt(event));
    });
    lineCanvas.addEventListener("pointermove", (event) => { if (!drawing || !activeStroke) return; event.preventDefault(); activeStroke.points.push(point(event)); rebuildDraw(); });
    ["pointerup", "pointercancel"].forEach((name) => lineCanvas.addEventListener(name, () => { drawing = false; activeStroke = null; }));
    function card(template, savedDoc) {
      const button = document.createElement("button"); button.className = "design-card";
      const image = document.createElement("img"); image.src = template.line; image.alt = `${template.title} blank line art`;
      const strong = document.createElement("b"); strong.textContent = template.title;
      const small = document.createElement("small"); small.textContent = savedDoc ? `Saved ${new Date(savedDoc.updatedAt).toLocaleDateString()}` : `${template.regionCount} fillable details`;
      button.append(image, strong, small); button.onclick = () => open(savedDoc || blankDoc(template.id)); return button;
    }
    function gallery() {
      const nav = $("#categories"); nav.replaceChildren();
      CATEGORIES.forEach((name) => { const button = document.createElement("button"); button.textContent = name; button.classList.toggle("selected", name === category); button.onclick = () => { category = name; gallery(); }; nav.append(button); });
      const grid = $("#designGrid"); grid.replaceChildren(); TEMPLATES.filter((candidate) => candidate.category === category).forEach((candidate) => grid.append(card(candidate)));
    }
    function saved() {
      const docs = loadDocs(localStorage), grid = $("#savedGrid"); grid.replaceChildren(); $("#savedEmpty").hidden = !!docs.length;
      docs.forEach((savedDoc) => grid.append(card(TEMPLATES.find((candidate) => candidate.id === savedDoc.templateId), savedDoc))); $("#saveCount").textContent = docs.length;
    }
    function selectTool(next) {
      tool = next; effect = null;
      $$('[data-tool]').forEach((button) => button.classList.toggle("selected", button.dataset.tool === tool));
      $$("#effects button").forEach((button) => button.classList.remove("selected"));
      $("#message").textContent = next === "brush" ? "Draw beneath the crisp black line layer." : next === "gradient" ? "Tap one detail for a two-colour blend." : next === "eraser" ? "Tap a filled detail, or draw to erase brush marks." : "Tap a bounded jewelry detail to fill it.";
    }
    function updateHistory() { $("#undo").disabled = !history.length; $("#redo").disabled = !future.length; }
    $$('[data-tool]').forEach((button) => button.onclick = () => selectTool(button.dataset.tool));
    PALETTE.forEach((paint, index) => { const button = document.createElement("button"); button.className = "swatch" + (index ? "" : " selected"); button.style.setProperty("--c", paint); button.setAttribute("aria-label", `Colour ${index + 1}`); button.onclick = () => { color = paint; selectTool("fill"); $$(".swatch").forEach((candidate) => candidate.classList.toggle("selected", candidate === button)); }; $("#palette").append(button); });
    ["sparkle", "glitter", "glow", "shine"].forEach((name) => { const button = document.createElement("button"); button.textContent = { sparkle: "✦ Sparkle", glitter: "⁙ Glitter", glow: "☀ Glow", shine: "◒ Shine" }[name]; button.onclick = () => { effect = name; tool = "effect"; $$('[data-tool]').forEach((candidate) => candidate.classList.remove("selected")); $$("#effects button").forEach((candidate) => candidate.classList.toggle("selected", candidate === button)); $("#message").textContent = `Tap jewelry details to add ${name}.`; }; $("#effects").append(button); });
    $("#clearEffect").onclick = () => selectTool("eraser");
    $("#makeReal").onclick = () => { snapshot(); doc.madeReal = !doc.madeReal; renderAll(); $("#message").textContent = doc.madeReal ? "Your colours are now a finished jewel. Add extra magic, or go back to keep colouring." : "Colouring view is back. Your colours are still editable."; };
    $("#customColor").oninput = (event) => { color = event.target.value; selectTool("fill"); };
    $$('[data-size]').forEach((button) => button.onclick = () => { size = +button.dataset.size; $$('[data-size]').forEach((candidate) => candidate.classList.toggle("selected", candidate === button)); });
    $("#undo").onclick = () => { if (!history.length) return; future.push(JSON.stringify(doc)); doc = JSON.parse(history.pop()); renderAll(); updateHistory(); };
    $("#redo").onclick = () => { if (!future.length) return; history.push(JSON.stringify(doc)); doc = JSON.parse(future.pop()); renderAll(); updateHistory(); };
    $("#zoom").oninput = (event) => $("#canvasStack").style.width = `${event.target.value}%`;
    $("#zoomIn").onclick = () => { $("#zoom").value = Math.min(220, +$("#zoom").value + 10); $("#zoom").oninput({ target: $("#zoom") }); };
    $("#zoomOut").onclick = () => { $("#zoom").value = Math.max(70, +$("#zoom").value - 10); $("#zoom").oninput({ target: $("#zoom") }); };
    $("#save").onclick = () => { saveDoc(localStorage, doc); saved(); $("#message").textContent = "Saved — reopen it from My Designs to keep coloring."; };
    $("#choose").onclick = $("#back").onclick = () => { gallery(); show("gallery"); };
    $("#myDesigns").onclick = () => { saved(); show("saved"); };
    document.addEventListener("visibilitychange", () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else animate(); });
    gallery(); saved(); show("gallery"); legacySummary(localStorage);
  }
  return { VERSION, SAVE_KEY, LEGACY_KEY, TEMPLATES, PALETTE, blankDoc, validDoc, loadDocs, saveDoc, legacySummary, decodeRegionMap, pixelsForRegion, metalFamily, mount };
});
