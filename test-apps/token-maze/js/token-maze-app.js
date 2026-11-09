/*
 * Token Maze — rendering, input and the little arcade loop.
 * The rules live in token-maze-core.js (window.TokenMazeCore) and every sound
 * in token-maze-audio.js (window.TokenMazeAudio). Plain script, no build step.
 *
 * Controls: four big drawn arrows (or the keyboard) run RAM to the next
 * junction; tapping an open cell nearby moves there too. No drag anywhere.
 * Crew art loads from assets/crew/<id>.webp; if an image is missing every
 * character is drawn in code as its personified object with two eyes (memory
 * stick, chest of drawers, chip with core lights, paint palette, bean, wire
 * tangle), so the game is complete before the final art lands. No text inside
 * art.
 */
(function () {
  "use strict";

  var Core = window.TokenMazeCore;
  if (!Core) return;
  var audio = new window.TokenMazeAudio();
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var LEVELS = Core.LEVELS.map(function (def, i) { return Core.parseLevel(def, i); });
  var STICKER_ART = {
    "Tokens": "token", "Glitch": "bug", "GPU": "gpu", "CPU": "cpu",
    "RAM": "ram", "Storage": "storage", "Bug Fix": "bug", "Crew": "star"
  };

  /* ---------- storage (optional; the game works without it) ---------------- */
  function safeStorage() { try { return window.localStorage; } catch (e) { return null; } }
  var store = safeStorage();
  var progress = new Core.Progress(store);

  /* ---------- crew: image with a drawn placeholder fallback ---------------- */
  var CREW = {
    ram: { color: "#8FDCC2", deep: "#5FBF9F", src: "./assets/crew/ram.webp" },
    storage: { color: "#C7B5EE", deep: "#A98FE8", src: "./assets/crew/storage.webp" },
    cpu: { color: "#5CC3C0", deep: "#F5927A", src: "./assets/crew/cpu.webp" },
    gpu: { color: "#E06AB8", deep: "#F2C14E", src: "./assets/crew/gpu.webp" },
    token: { color: "#F6CB57", deep: "#E0A83C", src: "./assets/crew/token.webp" },
    bug: { color: "#C9A7EE", deep: "#A87FD9", src: "./assets/crew/bug.webp" }
  };
  var crewImages = {};
  Object.keys(CREW).forEach(function (id) {
    var rec = { img: new Image(), ok: false };
    rec.img.onload = function () { rec.ok = true; refreshArt(); };
    rec.img.onerror = function () { rec.ok = false; };
    rec.img.src = CREW[id].src;
    crewImages[id] = rec;
  });

  function hexToRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    var ca = hexToRgb(a), cb = hexToRgb(b);
    var r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
    var g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
    var bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function eyes(ctx, x, y, gap, r, closed) {
    ctx.fillStyle = "#2E3550";
    if (closed) {
      ctx.strokeStyle = "#2E3550"; ctx.lineWidth = Math.max(1.5, r * 0.5); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(x - gap, y, r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + gap, y, r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      return;
    }
    ctx.beginPath(); ctx.arc(x - gap, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + gap, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x - gap + r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + gap + r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
  }
  function sparkle(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * 0.18, -size * 0.18, size, 0);
    ctx.quadraticCurveTo(size * 0.18, size * 0.18, 0, size);
    ctx.quadraticCurveTo(-size * 0.18, size * 0.18, -size, 0);
    ctx.quadraticCurveTo(-size * 0.18, -size * 0.18, 0, -size);
    ctx.fill();
    ctx.restore();
  }
  function star(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 === 0 ? r : r * 0.45;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Draws a crew character centred at (x, y) within `size`. If the webp has not
  // (yet) loaded, the placeholder blob carries the character's one tell.
  function drawCrew(ctx, id, x, y, size, opts) {
    opts = opts || {};
    var rec = crewImages[id];
    if (rec && rec.ok) {
      ctx.drawImage(rec.img, x - size / 2, y - size / 2, size, size);
      if (id === "cpu" && opts.heat) {
        // Final art keeps its own core lights; warmth shows as a soft coral halo.
        var g = ctx.createRadialGradient(x, y - size * 0.3, size * 0.1, x, y - size * 0.2, size * 0.6);
        g.addColorStop(0, "rgba(245,146,122," + (0.55 * opts.heat).toFixed(3) + ")");
        g.addColorStop(1, "rgba(245,146,122,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
      }
      if (opts.sparkle) sparkle(ctx, x + size * 0.36, y - size * 0.34, size * 0.22, "#F6CB57");
      return;
    }
    var c = CREW[id], s = size, f = opts.facing || 1;
    if (id === "ram") {
      // RAM: a cheerful mint memory stick that leans into its run
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f * 0.1);
      ctx.fillStyle = "#F6CB57";                            // the gold stick edge
      rr(ctx, -s * 0.24, -s * 0.46, s * 0.48, s * 0.92, s * 0.1); ctx.fill();
      ctx.fillStyle = c.color;                              // the mint board
      rr(ctx, -s * 0.19, -s * 0.46, s * 0.38, s * 0.74, s * 0.08); ctx.fill();
      ctx.fillStyle = c.deep;                               // the chips on the board
      rr(ctx, -s * 0.11, -s * 0.38, s * 0.22, s * 0.14, s * 0.03); ctx.fill();
      rr(ctx, -s * 0.11, -s * 0.18, s * 0.22, s * 0.1, s * 0.03); ctx.fill();
      ctx.strokeStyle = "#DF9F33"; ctx.lineWidth = Math.max(1.5, s * 0.03);
      for (var pin = 0; pin < 5; pin++) {                   // the edge contacts
        var px = -s * 0.16 + pin * s * 0.08;
        ctx.beginPath(); ctx.moveTo(px, s * 0.3); ctx.lineTo(px, s * 0.44); ctx.stroke();
      }
      eyes(ctx, 0, s * 0.08, s * 0.1, s * 0.05, false);
      ctx.strokeStyle = "#2E3550"; ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.07, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ell(ctx, -s * 0.14, s * 0.14, s * 0.045, s * 0.03, "#F5927A");   // happy cheeks
      ell(ctx, s * 0.14, s * 0.14, s * 0.045, s * 0.03, "#F5927A");
      ctx.restore();
    } else if (id === "bug") {
      // a silly lilac tangle of wire with googly eyes
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = c.deep; ctx.lineWidth = Math.max(2, s * 0.07);
      ctx.beginPath();                                      // the big loopy knot
      ctx.moveTo(x - s * 0.34, y + s * 0.22);
      ctx.bezierCurveTo(x - s * 0.5, y - s * 0.28, x - s * 0.08, y - s * 0.44, x - s * 0.14, y - s * 0.08);
      ctx.bezierCurveTo(x - s * 0.18, y + s * 0.2, x + s * 0.2, y - s * 0.36, x + s * 0.34, y + s * 0.02);
      ctx.bezierCurveTo(x + s * 0.44, y + s * 0.28, x - s * 0.06, y + s * 0.34, x - s * 0.02, y + s * 0.08);
      ctx.stroke();
      ctx.strokeStyle = c.color; ctx.lineWidth = Math.max(2, s * 0.055);
      ctx.beginPath();                                      // a second wire crossing it
      ctx.moveTo(x + s * 0.3, y - s * 0.3);
      ctx.bezierCurveTo(x - s * 0.1, y + s * 0.4, x + s * 0.24, y + s * 0.1, x - s * 0.26, y - s * 0.26);
      ctx.stroke();
      ctx.strokeStyle = c.deep; ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.beginPath(); ctx.moveTo(x - s * 0.34, y + s * 0.22); ctx.lineTo(x - s * 0.46, y + s * 0.34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.34, y + s * 0.02); ctx.lineTo(x + s * 0.48, y - s * 0.12); ctx.stroke();
      eyes(ctx, x, y - s * 0.04, s * 0.12, s * 0.06, false);
      ell(ctx, x, y + s * 0.14, s * 0.05, s * 0.04, "#2E3550");        // a puzzled little mouth
    } else if (id === "gpu") {
      // GPU: a pink paint palette with a thumb hole and paint dabs
      ell(ctx, x, y + s * 0.05, s * 0.44, s * 0.36, c.deep);            // the gold rim
      ell(ctx, x, y + s * 0.03, s * 0.4, s * 0.32, c.color);            // the pink board
      ell(ctx, x + s * 0.24, y + s * 0.16, s * 0.08, s * 0.07, c.deep); // the thumb hole
      ell(ctx, x - s * 0.2, y - s * 0.12, s * 0.06, s * 0.05, "#F6CB57"); // the paint dabs
      ell(ctx, x, y - s * 0.16, s * 0.06, s * 0.05, "#5CC3C0");
      ell(ctx, x + s * 0.18, y - s * 0.08, s * 0.06, s * 0.05, "#9CC7EE");
      eyes(ctx, x, y + s * 0.06, s * 0.11, s * 0.05, false);
      ctx.strokeStyle = "#2E3550"; ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath(); ctx.arc(x, y + s * 0.08, s * 0.06, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    } else if (id === "cpu") {
      // CPU: a teal chip whose four core lights warm as levels speed up
      var heat = opts.heat || 0;
      ctx.fillStyle = "#3A4560";                            // the pins
      for (var cp = 0; cp < 4; cp++) {
        var cy = y - s * 0.21 + cp * s * 0.14;
        ctx.fillRect(x - s * 0.44, cy, s * 0.09, s * 0.05);
        ctx.fillRect(x + s * 0.35, cy, s * 0.09, s * 0.05);
      }
      rr(ctx, x - s * 0.34, y - s * 0.3, s * 0.68, s * 0.6, s * 0.1);
      ctx.fillStyle = c.color; ctx.fill();                  // the chip body
      rr(ctx, x - s * 0.26, y - s * 0.22, s * 0.52, s * 0.3, s * 0.06);
      ctx.fillStyle = mix("#8FDEDB", "#FBD3C4", heat); ctx.fill();    // the warming plate
      var core = mix("#9CC7EE", "#F5927A", heat);           // the four core lights
      for (var t = 0; t < 4; t++) {
        ell(ctx, x - s * 0.12 + (t % 2) * s * 0.24, y - s * 0.15 + Math.floor(t / 2) * s * 0.16, s * 0.05, s * 0.05, core);
      }
      eyes(ctx, x, y + s * 0.16, s * 0.11, s * 0.045, false);
      ctx.strokeStyle = "#2E3550"; ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath(); ctx.arc(x, y + s * 0.18, s * 0.06, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    } else if (id === "storage") {
      // Storage: a sleepy lilac chest of drawers
      rr(ctx, x - s * 0.42, y - s * 0.44, s * 0.84, s * 0.88, s * 0.08);
      ctx.fillStyle = c.color; ctx.fill();                  // the lilac chest
      rr(ctx, x - s * 0.46, y - s * 0.5, s * 0.92, s * 0.14, s * 0.05);
      ctx.fillStyle = c.deep; ctx.fill();                   // the chest lid
      ctx.fillStyle = "#E6DCF9";                            // the two drawers
      rr(ctx, x - s * 0.3, y - s * 0.28, s * 0.6, s * 0.28, s * 0.05); ctx.fill();
      rr(ctx, x - s * 0.3, y + s * 0.08, s * 0.6, s * 0.28, s * 0.05); ctx.fill();
      eyes(ctx, x, y - s * 0.14, s * 0.12, s * 0.05, true); // asleep on the top drawer
      ell(ctx, x, y + s * 0.22, s * 0.05, s * 0.05, "#F6CB57");        // the gold knob
      ell(ctx, x - s * 0.3, y + s * 0.46, s * 0.08, s * 0.05, c.deep); // the little feet
      ell(ctx, x + s * 0.3, y + s * 0.46, s * 0.08, s * 0.05, c.deep);
    } else if (id === "token") {
      var glow = ctx.createRadialGradient(x, y, 1, x, y, s * 0.85);
      glow.addColorStop(0, "rgba(246,203,87,.55)");
      glow.addColorStop(1, "rgba(246,203,87,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(0.35);
      ell(ctx, 0, 0, s * 0.46, s * 0.32, c.color);
      ell(ctx, -s * 0.1, -s * 0.08, s * 0.12, s * 0.07, "#FFE9A8");
      ctx.restore();
      eyes(ctx, x, y + s * 0.02, s * 0.14, s * 0.05, true);    // the sleepy face
    }
    if (opts.sparkle) sparkle(ctx, x + size * 0.36, y - size * 0.34, size * 0.22, "#F6CB57");
  }

  /* ---------- dom ---------------------------------------------------------- */
  var $ = function (sel) { return document.querySelector(sel); };
  var menuEl = $("#menu"), gameEl = $("#game");
  var leaveApp = $("#leave-app"), homeBtn = $("#home");
  var board = $("#board"), boardCtx = board.getContext("2d"), boardArea = $(".board-area");
  var tokenCountEl = $("#token-count"), liveEl = $("#live");
  var cpuPanel = $("#cpu-panel"), storagePanel = $("#storage-panel");
  var overlay = $("#level-done");
  var SPARKLE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.7 6.2 3.8 9.3 10 10-6.2.7-9.3 3.8-10 10-.7-6.2-3.8-9.3-10-10 6.2-.7 9.3-3.8 10-10z" fill="currentColor"/></svg>';

  /* ---------- state -------------------------------------------------------- */
  var state = {
    screen: "menu", levelIndex: 0, level: null,
    tokensLeft: new Set(), gpus: new Set(), eatCount: 0,
    bugs: [], player: null, buffered: null,
    boostUntil: 0, won: false, effects: []
  };
  var geom = { cell: 48, ox: 0, oy: 0, w: 0, h: 0 };

  function fitBoard() {
    if (!state.level) return;
    var box = boardArea.getBoundingClientRect();
    if (box.width < 20 || box.height < 20) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    geom.w = box.width; geom.h = box.height;
    board.width = Math.round(box.width * dpr);
    board.height = Math.round(box.height * dpr);
    boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var l = state.level;
    geom.cell = Math.max(20, Math.min(108, Math.floor(Math.min((box.width - 14) / l.cols, (box.height - 14) / l.rows))));
    geom.ox = Math.round((box.width - geom.cell * l.cols) / 2);
    geom.oy = Math.round((box.height - geom.cell * l.rows) / 2);
  }
  function cellCenter(cell) {
    var l = state.level;
    return {
      x: geom.ox + (cell % l.cols) * geom.cell + geom.cell / 2,
      y: geom.oy + Math.floor(cell / l.cols) * geom.cell + geom.cell / 2
    };
  }
  function playerPixel() {
    var p = state.player;
    if (!p) return { x: 0, y: 0 };
    if (p.run) {
      var a = cellCenter(p.run.path[p.run.seg]);
      var b = p.run.path.length > p.run.seg + 1 ? cellCenter(p.run.path[p.run.seg + 1]) : a;
      return { x: a.x + (b.x - a.x) * p.run.t, y: a.y + (b.y - a.y) * p.run.t };
    }
    return cellCenter(p.cell);
  }
  function bugPixel(b) {
    var a = b.moving ? cellCenter(b.moving.from) : cellCenter(b.cell);
    var c = b.moving ? cellCenter(b.moving.to) : a;
    var t = b.moving ? Math.min(1, b.moving.t) : 0;
    var lift = Math.sin(Math.PI * t) * geom.cell * 0.16;
    return { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t - lift, ground: a.y + (c.y - a.y) * t };
  }

  function announce(text) { liveEl.textContent = text; }

  /* ---------- level lifecycle ---------------------------------------------- */
  function startLevel(i) {
    state.levelIndex = i;
    var l = state.level = LEVELS[i];
    state.tokensLeft = new Set(l.tokens);
    state.gpus = new Set(l.gpus);
    state.eatCount = 0;
    state.won = false;
    state.boostUntil = 0;
    state.buffered = null;
    state.effects = [];
    state.player = { cell: l.start, run: null, facing: 1, dirName: "right", safeUntil: performance.now() + 700, pop: 0 };
    state.bugs = l.bugs.map(function (cell, k) {
      return { cell: cell, dir: null, moving: null, cool: 1 + k * 0.5, fixed: false, flyT: 0 };
    });
    $("#level-pill").textContent = "Level " + (i + 1);
    var banner = $("#word-banner");
    if (l.label) { banner.hidden = false; $("#word-banner-text").textContent = l.label; }
    else banner.hidden = true;
    tokenCountEl.textContent = String(state.tokensLeft.size);
    overlay.hidden = true;
    fitBoard();
    requestAnimationFrame(function () { fitBoard(); }); // re-measure once the grid has settled
    drawCpuPanel();
    drawStoragePanel();
    announce("Level " + (i + 1) + ". " + l.tokens.length + " tokens to eat.");
  }

  function winLevel() {
    state.won = true;
    state.player.run = null;
    state.buffered = null;
    audio.win();
    ideaSparkles();
    var result = progress.completeLevel(state.levelIndex, state.level.tokens.length);
    refreshSavedLine();
    setTimeout(function () {
      if (state.screen !== "play" || !state.won) return;
      audio.sticker();
      showLevelDone(result && result.sticker ? result.sticker : state.level.word);
    }, 850);
  }

  function showLevelDone(word) {
    $("#sticker-word").textContent = word;
    var canvas = $("#sticker-art");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStickerArt(ctx, word, true, 100, 104, 120);
    var last = state.levelIndex >= LEVELS.length - 1;
    $("#next-level-label").textContent = last ? "Play again" : "Next level";
    overlay.hidden = false;
    refreshStickerStrip();
  }

  function enterCell(cell, now) {
    if (state.tokensLeft.has(cell)) {
      state.tokensLeft.delete(cell);
      state.eatCount += 1;
      audio.eat(state.eatCount);
      var pt = cellCenter(cell);
      burst(pt.x, pt.y, "#F6CB57", 5);
      tokenCountEl.textContent = String(state.tokensLeft.size);
      drawStoragePanel();
      announce(state.tokensLeft.size === 0 ? "All tokens eaten" : state.tokensLeft.size + " tokens left");
      if (state.tokensLeft.size === 0) winLevel();
    }
    if (state.gpus.has(cell)) {
      state.gpus.delete(cell);
      state.boostUntil = now + 5000;
      audio.power();
      var gpt = cellCenter(cell);
      burst(gpt.x, gpt.y, "#E06AB8", 8);
      announce("GPU super speed");
    }
  }

  /* ---------- input: one tap answers --------------------------------------- */
  function tryRun(dir, silent) {
    var p = state.player;
    p.dirName = dir;
    if (dir === "left") p.facing = -1;
    if (dir === "right") p.facing = 1;
    var r = Core.runToJunction(state.level, p.cell, dir);
    if (r.blocked) { audio.blocked(); nudge(); return false; }
    p.run = { path: r.path, seg: 0, t: 0 };
    if (!silent) audio.step();
    return true;
  }

  function inputDir(dir) {
    audio.unlock();
    if (state.screen !== "play" || state.won || !state.level) return;
    var p = state.player;
    if (p.run) { state.buffered = dir; audio.ui(); return; }  // held tap lands at the junction
    tryRun(dir, false);
  }

  function nudge() {
    if (reduceMotion) return;
    board.classList.remove("wobble");
    void board.offsetWidth;
    board.classList.add("wobble");
    setTimeout(function () { board.classList.remove("wobble"); }, 320);
  }

  document.querySelectorAll(".arrow").forEach(function (btn) {
    btn.addEventListener("click", function () { inputDir(btn.dataset.dir); });
  });

  window.addEventListener("keydown", function (e) {
    var map = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left" };
    var dir = map[e.key];
    if (!dir || state.screen !== "play") return;
    e.preventDefault();
    inputDir(dir);
  });

  // Tapping the maze: an open neighbour moves one step; a cell straight down an
  // open corridor runs there (stopping at the first junction on the way). Every
  // tap answers with movement or a ripple and a soft sound.
  board.addEventListener("click", function (e) {
    audio.unlock();
    if (state.screen !== "play" || state.won || !state.level) return;
    var rect = board.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    var l = state.level;
    var c = Math.floor((x - geom.ox) / geom.cell);
    var r = Math.floor((y - geom.oy) / geom.cell);
    state.effects.push({ kind: "ripple", x: x, y: y, t0: performance.now(), dur: 420 });
    if (c < 0 || r < 0 || c >= l.cols || r >= l.rows || l.walls[r * l.cols + c]) {
      audio.blocked();
      return;
    }
    var target = r * l.cols + c;
    var p = state.player;
    if (p.run) { audio.ui(); return; }
    var dir = Core.dirTo(l, p.cell, target);
    if (dir) {
      p.run = { path: [p.cell, target], seg: 0, t: 0 };
      if (dir === "left") p.facing = -1;
      if (dir === "right") p.facing = 1;
      audio.step();
      return;
    }
    var pc = Core.colOf(l, p.cell), pr = Core.rowOf(l, p.cell);
    var along = null;
    if (pr === r && c !== pc) along = c > pc ? "right" : "left";
    if (pc === c && r !== pr) along = r > pr ? "down" : "up";
    if (along) {
      var run = Core.runToJunction(l, p.cell, along);
      if (!run.blocked) {
        var cut = run.path.indexOf(target);
        var path = cut > 0 ? run.path.slice(0, cut + 1) : run.path;
        p.run = { path: path, seg: 0, t: 0 };
        if (along === "left") p.facing = -1;
        if (along === "right") p.facing = 1;
        audio.step();
        return;
      }
    }
    audio.blocked();
  });

  /* ---------- the loop ------------------------------------------------------ */
  function updatePlayer(dt, now) {
    var p = state.player;
    if (p.pop > 0) p.pop = Math.max(0, p.pop - dt * 3);
    if (!p.run) return;
    var speed = now < state.boostUntil ? 8.6 : 4.2;
    p.run.t += dt * speed;
    while (p.run && p.run.t >= 1) {
      p.run.seg += 1;
      p.run.t -= 1;
      p.cell = p.run.path[p.run.seg];
      enterCell(p.cell, now);
      if (!p.run) break;                      // a bump or a win ended the run
      if (p.run.seg >= p.run.path.length - 1) {
        p.run = null;
        if (state.buffered && !state.won) {
          var d = state.buffered;
          state.buffered = null;
          tryRun(d, true);
        }
        break;
      }
    }
  }

  function updateBugs(dt) {
    var l = state.level;
    for (var i = 0; i < state.bugs.length; i++) {
      var b = state.bugs[i];
      if (b.fixed) { b.flyT += dt; continue; }
      if (state.won) continue;                // the bugs pause while the crew celebrates
      if (b.moving) {
        b.moving.t += dt * l.bugSpeed;
        if (b.moving.t >= 1) {
          b.cell = b.moving.to;
          b.dir = b.moving.dir;
          b.moving = null;
          b.cool = Core.isJunction(l, b.cell) ? 0.4 : 0.08;
        }
      } else {
        b.cool -= dt;
        if (b.cool <= 0) {
          var next = Core.stepBug(l, { cell: b.cell, dir: b.dir }, Math.random);
          b.moving = { from: b.cell, to: next.cell, dir: next.dir, t: 0 };
        }
      }
    }
  }

  function bumpHome(now) {
    var p = state.player;
    var pp = playerPixel();
    audio.bump();
    p.run = null;
    state.buffered = null;
    p.cell = state.level.start;
    p.safeUntil = now + 1300;                 // a beat to look around, never a penalty
    p.pop = 1;
    for (var i = 0; i < state.bugs.length; i++) if (!state.bugs[i].fixed) state.bugs[i].cool = Math.max(state.bugs[i].cool, 0.9);
    burst(pp.x, pp.y, "#C9A7EE", 7);
    announce("Bump. Back to the start.");
  }

  function checkCollisions(now) {
    if (state.won || !state.player) return;
    var pp = playerPixel();
    var boosted = now < state.boostUntil;
    var reach = geom.cell * 0.62;
    for (var i = 0; i < state.bugs.length; i++) {
      var b = state.bugs[i];
      if (b.fixed) continue;
      var bp = bugPixel(b);
      var dx = pp.x - bp.x, dy = pp.y - bp.ground;
      if (dx * dx + dy * dy < reach * reach) {
        if (boosted) {
          b.fixed = true;                     // the GPU glow fixes the bug; it leaves happy
          b.flyT = 0;
          audio.fix();
          burst(bp.x, bp.y, "#F2C14E", 9);
          announce("Bug fixed");
        } else if (now > state.player.safeUntil) {
          bumpHome(now);
          return;
        }
      }
    }
  }

  var lastFrame = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (state.screen === "play" && state.level) {
      updatePlayer(dt, now);
      updateBugs(dt);
      checkCollisions(now);
    }
    if (state.level) drawBoard(now);
    requestAnimationFrame(frame);
  }

  /* ---------- drawing ------------------------------------------------------- */
  function burst(x, y, color, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.PI * 2 * i / n + Math.random() * 0.5;
      var d = geom.cell * (0.3 + Math.random() * 0.5);
      state.effects.push({
        kind: "sparkle", x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        t0: performance.now(), dur: 420 + Math.random() * 280, color: color
      });
    }
  }

  function drawPalette(ctx, x, y, size, now) {
    var g = ctx.createRadialGradient(x, y, 1, x, y, size);
    g.addColorStop(0, "rgba(242,193,78,.5)");
    g.addColorStop(1, "rgba(242,193,78,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(reduceMotion ? 0.08 : Math.sin(now / 300) * 0.12);   // a gentle rock, no spin
    ell(ctx, 0, size * 0.04, size * 0.46, size * 0.38, "#F2C14E");  // the gold rim
    ell(ctx, 0, size * 0.02, size * 0.42, size * 0.34, "#E06AB8");  // the pink board
    ell(ctx, size * 0.24, size * 0.18, size * 0.08, size * 0.07, "#F2C14E"); // the thumb hole
    ell(ctx, -size * 0.2, -size * 0.1, size * 0.07, size * 0.06, "#F6CB57"); // the paint dabs
    ell(ctx, 0, -size * 0.16, size * 0.07, size * 0.06, "#5CC3C0");
    ell(ctx, size * 0.18, -size * 0.06, size * 0.07, size * 0.06, "#9CC7EE");
    eyes(ctx, 0, size * 0.1, size * 0.1, size * 0.05, false);
    ctx.strokeStyle = "#2E3550"; ctx.lineWidth = Math.max(1.5, size * 0.035);
    ctx.beginPath(); ctx.arc(0, size * 0.12, size * 0.06, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.restore();
  }

  function drawEffects(ctx, now) {
    for (var i = state.effects.length - 1; i >= 0; i--) {
      var e = state.effects[i];
      var life = (now - e.t0) / e.dur;
      if (life >= 1) { state.effects.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = 1 - life;
      if (e.kind === "sparkle") sparkle(ctx, e.x, e.y - life * geom.cell * 0.4, geom.cell * 0.16 * (1 - life * 0.4), e.color);
      else {
        ctx.strokeStyle = "#8FDCC2";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, geom.cell * (0.3 + life * 0.7), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBoard(now) {
    var ctx = boardCtx;
    ctx.clearRect(0, 0, geom.w, geom.h);
    var l = state.level, cell = geom.cell, i, c, r, x, y;
    rr(ctx, geom.ox - 8, geom.oy - 8, cell * l.cols + 16, cell * l.rows + 16, 26);
    ctx.fillStyle = "#FCEFDA";
    ctx.fill();

    var st = cellCenter(l.start);             // the soft start square RAM returns to
    rr(ctx, st.x - cell * 0.34, st.y - cell * 0.34, cell * 0.68, cell * 0.68, cell * 0.2);
    ctx.fillStyle = "rgba(143,220,194,.4)";
    ctx.fill();

    var passes = [{ color: "#8CC79C", dy: 3 }, { color: "#A9D9B4", dy: 0 }];
    for (var p = 0; p < passes.length; p++) {
      ctx.fillStyle = passes[p].color;
      for (i = 0; i < l.walls.length; i++) {
        if (!l.walls[i]) continue;
        c = i % l.cols; r = Math.floor(i / l.cols);
        x = geom.ox + c * cell; y = geom.oy + r * cell;
        rr(ctx, x - 0.25, y - 0.25 + passes[p].dy, cell + 0.5, cell + 0.5, cell * 0.34);
        ctx.fill();
      }
    }
    var petals = ["#F7B7C8", "#FFF6D8", "#C7B5EE"];   // little garden flowers on the hedges
    for (i = 0; i < l.walls.length; i++) {
      if (!l.walls[i]) continue;
      c = i % l.cols; r = Math.floor(i / l.cols);
      var h = c * 31 + r * 17;
      if (h % 6 !== 0) continue;
      x = geom.ox + c * cell + cell * (0.3 + (h % 3) / 6);
      y = geom.oy + r * cell + cell * 0.42;
      ell(ctx, x, y, cell * 0.09, cell * 0.09, petals[h % 3]);
      ell(ctx, x + cell * 0.05, y + cell * 0.07, cell * 0.05, cell * 0.05, petals[(h + 1) % 3]);
    }

    var k = 0;
    state.tokensLeft.forEach(function (cellIdx) {
      var pt = cellCenter(cellIdx);
      var bob = reduceMotion ? 0 : Math.sin(now / 320 + k) * cell * 0.05;
      k += 1;
      drawCrew(ctx, "token", pt.x, pt.y + bob, cell * 0.62, {});
    });
    state.gpus.forEach(function (cellIdx) {
      var pt = cellCenter(cellIdx);
      drawPalette(ctx, pt.x, pt.y, cell * 0.66, now);
    });

    for (i = 0; i < state.bugs.length; i++) {
      var b = state.bugs[i];
      if (b.fixed && b.flyT > 1) continue;
      var bp = bugPixel(b);
      var rise = b.fixed ? b.flyT * cell * 1.6 : 0;
      if (b.fixed) ctx.globalAlpha = Math.max(0, 1 - b.flyT);
      ell(ctx, bp.x, bp.ground + cell * 0.3, cell * 0.26, cell * 0.09, "rgba(58,69,96,.14)");
      drawCrew(ctx, "bug", bp.x, bp.y - rise, cell * 0.74, { sparkle: b.fixed });
      ctx.globalAlpha = 1;
    }

    if (state.player) {
      var pp = playerPixel();
      var boosted = now < state.boostUntil;
      ell(ctx, pp.x, pp.y + cell * 0.34, cell * 0.28, cell * 0.09, "rgba(58,69,96,.16)");
      if (boosted) {
        var aura = ctx.createRadialGradient(pp.x, pp.y, cell * 0.2, pp.x, pp.y, cell * 0.85);
        var pulse = 0.35 + 0.2 * Math.sin(now / 120);
        aura.addColorStop(0, "rgba(242,193,78," + pulse.toFixed(3) + ")");
        aura.addColorStop(1, "rgba(224,106,184,0)");
        ctx.fillStyle = aura;
        ctx.fillRect(pp.x - cell, pp.y - cell, cell * 2, cell * 2);
      }
      var hop = state.player.run && !reduceMotion ? Math.abs(Math.sin(now / 70)) * cell * 0.08 : 0;
      var scale = 1 - state.player.pop * 0.3;
      drawCrew(ctx, "ram", pp.x, pp.y - hop, cell * 0.94 * scale, { facing: state.player.facing });
    }
    drawEffects(ctx, now);
  }

  /* ---------- the crew side rail -------------------------------------------- */
  function drawCpuPanel() {
    var ctx = cpuPanel.getContext("2d");
    ctx.clearRect(0, 0, cpuPanel.width, cpuPanel.height);
    var heat = LEVELS.length > 1 ? state.levelIndex / (LEVELS.length - 1) : 0;
    drawCrew(ctx, "cpu", cpuPanel.width / 2, cpuPanel.height / 2 + 4, 86, { heat: heat });
  }
  function drawStoragePanel() {
    var ctx = storagePanel.getContext("2d");
    ctx.clearRect(0, 0, storagePanel.width, storagePanel.height);
    drawCrew(ctx, "storage", storagePanel.width / 2, 50, 76, {});
    var dw = 24, dh = 16, gap = 5;
    var x0 = storagePanel.width / 2 - (4 * dw + 3 * gap) / 2, y0 = 98;
    for (var i = 0; i < LEVELS.length; i++) {
      var x = x0 + (i % 4) * (dw + gap), y = y0 + Math.floor(i / 4) * (dh + gap);
      rr(ctx, x, y, dw, dh, 4);
      ctx.fillStyle = "#F7F1E2";
      ctx.fill();
      ctx.strokeStyle = "#B99B5E";
      ctx.lineWidth = 2;
      ctx.stroke();
      var frac = 0;
      if (i < state.levelIndex) frac = 1;
      else if (i === state.levelIndex && state.level && LEVELS[i].tokens.length)
        frac = state.eatCount / LEVELS[i].tokens.length;
      if (frac > 0) {
        rr(ctx, x + 2, y + dh - 2 - (dh - 4) * Math.min(1, frac), dw - 4, (dh - 4) * Math.min(1, frac), 3);
        ctx.fillStyle = "#F6CB57";
        ctx.fill();
      }
      ctx.fillStyle = "#B99B5E";
      ctx.fillRect(x + dw / 2 - 3, y + 2, 6, 2);
    }
  }

  function ideaSparkles() {
    var hosts = [document.querySelector(".rail"), boardArea];
    for (var h = 0; h < hosts.length; h++) {
      for (var k = 0; k < 3; k++) {
        var d = document.createElement("div");
        d.className = "idea-sparkle";
        d.style.left = (12 + k * 30 + Math.random() * 10) + "%";
        d.style.top = (10 + Math.random() * 50) + "%";
        var size = Math.round(26 + Math.random() * 22);
        d.style.width = d.style.height = size + "px";
        d.innerHTML = SPARKLE_SVG;
        hosts[h].appendChild(d);
        setTimeout(function (node) { return function () { node.remove(); }; }(d), 1200);
      }
    }
  }

  /* ---------- stickers and menu ---------------------------------------------- */
  function drawStickerArt(ctx, word, earned, cx, cy, size) {
    var id = STICKER_ART[word] || "star";
    ctx.globalAlpha = earned ? 1 : 0.25;
    if (id === "star") star(ctx, cx, cy, size * 0.62, "#F6CB57");
    else drawCrew(ctx, id, cx, cy, size, { sparkle: word === "Bug Fix" || word === "Crew", heat: word === "CPU" ? 0.15 : 0 });
    ctx.globalAlpha = 1;
    if (!earned) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "#C9BFA4";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function buildStickerStrip() {
    var strip = $("#sticker-strip");
    strip.replaceChildren();
    LEVELS.forEach(function (l, i) {
      var slot = document.createElement("button");
      slot.type = "button";
      slot.className = "sticker-slot";
      var canvas = document.createElement("canvas");
      canvas.width = 104;
      canvas.height = 104;
      var label = document.createElement("span");
      slot.append(canvas, label);
      slot.addEventListener("click", function () {
        audio.unlock();
        if (progress.stickers().indexOf(l.word) >= 0) audio.sticker();
        else audio.ui();
        slot.classList.remove("pop");
        void slot.offsetWidth;
        slot.classList.add("pop");
      });
      strip.append(slot);
    });
    refreshStickerStrip();
  }

  function refreshStickerStrip() {
    var earned = progress.stickers();
    document.querySelectorAll(".sticker-slot").forEach(function (slot, i) {
      var l = LEVELS[i];
      var has = earned.indexOf(l.word) >= 0;
      slot.classList.toggle("earned", has);
      slot.setAttribute("aria-label", has ? "Sticker: " + l.word : "Sticker " + (i + 1) + ", not earned yet");
      slot.querySelector("span").textContent = has ? l.word : String(i + 1);
      var canvas = slot.querySelector("canvas");
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStickerArt(ctx, l.word, has, 52, 54, 62);
    });
  }

  function refreshSavedLine() {
    $("#menu-saved-count").textContent = progress.totalSaved() + " tokens saved";
  }

  function refreshArt() {
    [["#crew-ram", "ram"], ["#crew-bug", "bug"], ["#crew-gpu", "gpu"]].forEach(function (pair) {
      var cv = document.querySelector(pair[0]);
      if (!cv) return;
      var ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, cv.width, cv.height);
      drawCrew(ctx, pair[1], cv.width / 2, cv.height / 2 + 4, 82, {});
    });
    drawCpuPanel();
    drawStoragePanel();
    refreshStickerStrip();
  }

  function goMenu() {
    state.screen = "menu";
    gameEl.hidden = true;
    menuEl.hidden = false;
    leaveApp.hidden = false;
    homeBtn.hidden = true;
    overlay.hidden = true;
    refreshStickerStrip();
    refreshSavedLine();
    audio.ui();
  }

  function startGame() {
    audio.unlock();
    audio.ui();
    state.screen = "play";
    menuEl.hidden = true;
    gameEl.hidden = false;
    leaveApp.hidden = true;
    homeBtn.hidden = false;
    var i = Math.min(LEVELS.length - 1, Math.max(0, progress.unlockedLevel() - 1));
    startLevel(i);
  }

  /* ---------- wiring ---------------------------------------------------------- */
  $("#play").addEventListener("click", startGame);
  homeBtn.addEventListener("click", function () { audio.unlock(); goMenu(); });
  $("#next-level").addEventListener("click", function () {
    audio.unlock();
    audio.ui();
    overlay.hidden = true;
    var next = state.levelIndex >= LEVELS.length - 1 ? state.levelIndex : state.levelIndex + 1;
    startLevel(next);
  });
  $("#to-menu").addEventListener("click", function () { audio.unlock(); goMenu(); });

  var muted = false;
  try { muted = store ? store.getItem("token-maze.sound") === "off" : false; } catch (e) { muted = false; }
  audio.setMuted(muted);
  function updateSoundButton() {
    var btn = $("#sound");
    btn.setAttribute("aria-pressed", String(!muted));
    btn.setAttribute("aria-label", muted ? "Sound off" : "Sound on");
    $("#sound-on-icon").hidden = muted;
    $("#sound-off-icon").hidden = !muted;
  }
  updateSoundButton();
  $("#sound").addEventListener("click", function () {
    audio.unlock();
    muted = !muted;
    audio.setMuted(muted);
    try { if (store) store.setItem("token-maze.sound", muted ? "off" : "on"); } catch (e) {}
    updateSoundButton();
    if (!muted) audio.ui();
  });

  window.addEventListener("resize", fitBoard);
  window.addEventListener("orientationchange", function () { setTimeout(fitBoard, 80); });

  buildStickerStrip();
  refreshSavedLine();
  refreshArt();
  requestAnimationFrame(frame);

  if ("serviceWorker" in navigator)
    window.addEventListener("load", function () {
      Promise.resolve() /* Test Hub staging: no service worker */.catch(function () {});
    });
})();
