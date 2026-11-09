import { COLS, ROWS, COLORS, LEVELS, LABEL_TEXT, CrewDropGame, GenerationScheduler, loadProgress, saveProgress, calculateBoardGeometry } from "./js/game-logic.js";
import { AudioEngine } from "./js/audio-engine.js";
import { crewSlot } from "./js/crew.js";

// Drawn inline SVG icons only — no emoji, no Unicode glyph icons (owner rule 2026-10-20).
const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  paint: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19.5 3.2l1.3 1.3c.5.5.5 1.3 0 1.8l-8.1 8.1-3.1-3.1 8.1-8.1c.5-.5 1.3-.5 1.8 0z" fill="#F2C14E"/><path d="M9.6 11.3l3.1 3.1-1.2 1.2c-.9.9-2.2 1.2-3.4.9L5 19.6c-.8.8-2 .8-2.8 0-.8-.8-.8-2 0-2.8l3.1-3.1c-.3-1.2 0-2.5.9-3.4z" fill="#E06AB8"/><circle cx="17" cy="17" r="2.4" fill="#8FDCC2"/><circle cx="20" cy="12.5" r="1.7" fill="#9CC7EE"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="10" rx="3" fill="currentColor"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" fill="currentColor"/></svg>'
};

// One sticker per crew word, earned as each word becomes real for the child.
const STICKERS = [
  { word: "RAM", id: "ram" },
  { word: "Storage", id: "storage" },
  { word: "Tokens", id: "token" },
  { word: "GPU", id: "gpu" },
  { word: "CPU", id: "cpu" }
];

// Board pieces: shape carries the colour cue (round / square / star). A bug draws
// the same shape as a bare outline so the tangled-wire puff reads on top and the
// shape cue never depends on the colour alone.
const SHAPES = [
  (fill) => `<circle cx="20" cy="20" r="15" fill="${fill}"/>`,
  (fill) => `<rect x="6" y="6" width="28" height="28" rx="9" fill="${fill}"/>`,
  (fill) => `<path d="M20 4.5l4.5 9.4 10.3 1.5-7.4 7.3 1.7 10.3L20 28.2l-9.1 4.8 1.7-10.3-7.4-7.3 10.3-1.5z" fill="${fill}"/>`
];
const BUG_OUTLINES = [
  (stroke) => `<circle cx="20" cy="20" r="13.8" fill="none" stroke="${stroke}" stroke-width="2.6"/>`,
  (stroke) => `<rect x="7.4" y="7.4" width="25.2" height="25.2" rx="8" fill="none" stroke="${stroke}" stroke-width="2.6"/>`,
  (stroke) => `<path d="M20 4.5l4.5 9.4 10.3 1.5-7.4 7.3 1.7 10.3L20 28.2l-9.1 4.8 1.7-10.3-7.4-7.3 10.3-1.5z" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>`
];
// The glitch bugs: a little tangled-wire puff (overlapping loops) with a cheeky face.
const BUG_PUFF = (stroke) => `<g fill="none" stroke="${stroke}" stroke-width="2.3" stroke-linecap="round"><circle cx="20" cy="20" r="7.5"/><circle cx="14.8" cy="16.6" r="4.8"/><circle cx="25.4" cy="17.4" r="4.6"/><circle cx="18.8" cy="25.2" r="4.6"/><circle cx="24.2" cy="23.6" r="4"/></g><circle cx="16.5" cy="18.6" r="3.2" fill="#fff"/><circle cx="23.5" cy="18.6" r="3.2" fill="#fff"/><circle cx="17.2" cy="19.2" r="1.4" fill="#3A2E27"/><circle cx="24.2" cy="19.2" r="1.4" fill="#3A2E27"/><path d="M16.8 23.6q3.2 3 6.4 0" stroke="#3A2E27" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

function pieceSVG(color, bug) {
  const hex = COLORS[color].hex;
  const art = bug
    ? `${BUG_OUTLINES[color](hex)}${BUG_PUFF(hex)}`
    : `${SHAPES[color](hex)}<ellipse cx="14.5" cy="13.5" rx="4.4" ry="3" fill="#ffffff59"/>`;
  return `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">${art}</svg>`;
}
const tokenSVG = () => `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><ellipse cx="20" cy="21" rx="14" ry="11.5" fill="#F6CB57" stroke="#D9A93F" stroke-width="2"/><path d="M14 20q2 2.4 4 0M22 20q2 2.4 4 0" fill="none" stroke="#8A6A2F" stroke-width="1.8" stroke-linecap="round"/><path d="M18 25q2 1.6 4 0" fill="none" stroke="#8A6A2F" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="14" cy="16" rx="3.4" ry="1.8" fill="#fff" opacity=".7"/></svg>`;
const sparkleSVG = (filled) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" fill="${filled ? "#F2C14E" : "none"}" stroke="${filled ? "#D9A93F" : "#B9803F88"}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const channel = (shift) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${[channel(16), channel(8), channel(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const $ = (selector) => document.querySelector(selector);
const menu = $("#menu");
const gameScreen = $("#game");
const leaveApp = $("#leave-app");
const heroCrew = $("#hero-crew");
const playBtn = $("#play");
const levelPath = $("#level-path");
const stickerStrip = $("#sticker-strip");
const levelPill = $("#level-pill");
const tokenRow = $("#token-row");
const boardZone = $("#board-zone");
const boardWrap = $("#board-wrap");
const lane = $("#lane");
const boardEl = $("#board");
const columnsEl = $("#columns");
const ramCorner = $("#ram-corner");
const ramPal = $("#ram-pal");
const hint = $("#hint");
const stuckBanner = $("#stuck-banner");
const gpuHelpBtn = $("#gpu-help");
const storageBtn = $("#storage-btn");
const drawersEl = $("#drawers");
const cpuBtn = $("#cpu-btn");
const coresEl = $("#cores");
const retry = $("#retry");
const retryReason = $("#retry-reason");
const retryReplay = $("#retry-replay");
const party = $("#party");
const partySub = $("#party-sub");
const partySticker = $("#party-sticker");
const partyNext = $("#party-next");
const partyCrew = $("#party-crew");
const live = $("#live");
const pills = { ram: $("#ram-label"), storage: $("#storage-label"), gpu: $("#gpu-label") };

const audio = new AudioEngine();
const scheduler = new GenerationScheduler();
let storage = null;
let progress = null;
let game = null;
let levelIndex = 0;
let phase = "menu"; // menu | playing | resolving | stuck | overlay
let creations = 0;
let pendingResult = null;
let rendered = Array.from({ length: ROWS }, () => Array(COLS).fill(""));

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

/* ---------- rendering ---------- */

function buildBoard() {
  boardEl.replaceChildren();
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      boardEl.append(cell);
    }
  }
  columnsEl.replaceChildren();
  for (let c = 0; c < COLS; c += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Drop chip on column ${c + 1}`);
    button.addEventListener("click", () => onColumnTap(c));
    columnsEl.append(button);
  }
}

function cellEl(r, c) { return boardEl.children[r * COLS + c]; }

function renderBoard(data) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const piece = data[r][c];
      const key = piece ? `${piece.color}${piece.bug ? "!" : ""}` : "";
      if (key === rendered[r][c]) continue;
      rendered[r][c] = key;
      const cell = cellEl(r, c);
      cell.classList.remove("pop", "gold", "land");
      cell.innerHTML = piece ? pieceSVG(piece.color, piece.bug) : "";
      if (piece) {
        void cell.offsetWidth; // restart the landing bounce
        cell.classList.add("land");
      }
    }
  }
}

function popCells(list, gold = false) {
  for (const spot of list) {
    const cell = cellEl(spot.r, spot.c);
    if (!cell) continue;
    cell.classList.remove("land");
    if (gold) cell.classList.add("gold");
    cell.classList.add("pop");
  }
}

function glowColumns(list) {
  clearGlow();
  for (const c of list) columnsEl.children[c]?.classList.add("glow");
}
function clearGlow() { columnsEl.querySelectorAll(".glow").forEach((el) => el.classList.remove("glow")); }

function renderChip(chip) {
  clearGlow();
  const ms = game.level.dropSeconds * 1000;
  const el = document.createElement("button");
  el.type = "button";
  el.className = "chip";
  el.setAttribute("aria-label", "Flip the chip");
  el.style.left = `calc(var(--cell-w) * ${chip.leftCol})`;
  el.innerHTML = `<span class="half">${pieceSVG(chip.left, false)}</span><span class="half">${pieceSVG(chip.right, false)}</span><svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16.5" fill="none" stroke="#8FDCC2" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg>`;
  el.addEventListener("click", onChipTap);
  lane.replaceChildren(el);
  glowColumns([chip.leftCol, chip.leftCol + 1]);
  // The calm countdown: the chip drifts down and its ring gently empties.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = `transform ${ms}ms linear`;
    el.style.transform = "translateY(calc(var(--lane-h) - var(--cell-h) - 4px))";
    el.querySelector(".ring circle").style.animation = `drain ${ms}ms linear forwards`;
  }));
  scheduler.wait(ms).then((alive) => {
    if (alive && game && game.chip && phase === "playing") doDrop(game.chip.leftCol);
  });
}

function onChipTap() {
  if (phase !== "playing" || !game || !game.chip) { audio.ui("tick"); return; }
  game.flipChip();
  audio.ui("flip");
  const el = lane.querySelector(".chip");
  if (!el) return;
  const halves = el.querySelectorAll(".half");
  halves[0].innerHTML = pieceSVG(game.chip.left, false);
  halves[1].innerHTML = pieceSVG(game.chip.right, false);
  el.classList.remove("flipping");
  void el.offsetWidth;
  el.classList.add("flipping");
}

function renderTokens() {
  tokenRow.replaceChildren(...Array.from({ length: game.level.tokens }, (_, i) => {
    const bead = document.createElement("span");
    bead.className = `bead${i >= game.tokensLeft ? " dim" : ""}`;
    bead.innerHTML = tokenSVG();
    return bead;
  }));
}

function renderCupboard() {
  drawersEl.replaceChildren(...Array.from({ length: 12 }, (_, i) => {
    const slot = document.createElement("span");
    slot.className = "slot";
    slot.innerHTML = sparkleSVG(i < Math.min(creations, 12));
    return slot;
  }));
}

function renderCpu() {
  const warmth = game ? game.cpuWarmth() : 0;
  coresEl.querySelectorAll(".core").forEach((light, i) => {
    light.setAttribute("fill", mixHex("#5CC3C0", "#F5927A", Math.min(1, warmth + i / 8)));
  });
}

function setLabels() {
  const label = game.level.label;
  for (const [id, pill] of Object.entries(pills)) {
    pill.hidden = label !== id;
    if (label === id) {
      const text = document.createElement("span");
      text.textContent = LABEL_TEXT[id];
      pill.replaceChildren(crewSlot(id, { cls: "pill-art" }), text);
    }
  }
}

function updateGeometry() {
  const rect = boardZone.getBoundingClientRect();
  // The RAM corner shares the zone's row, so the table only gets what it leaves.
  const corner = document.getElementById("ram-corner");
  const gap = parseFloat(getComputedStyle(boardZone).columnGap) || 0;
  const taken = corner ? corner.getBoundingClientRect().width + gap : 0;
  const geometry = calculateBoardGeometry({ width: rect.width - taken, height: rect.height });
  const style = boardWrap.style;
  style.setProperty("--cell-w", `${geometry.cellW}px`);
  style.setProperty("--cell-h", `${geometry.cellH}px`);
  style.setProperty("--board-w", `${geometry.boardWidth}px`);
  style.setProperty("--board-h", `${geometry.boardHeight}px`);
  style.setProperty("--lane-h", `${geometry.laneHeight}px`);
}

/* ---------- game flow ---------- */

function startLevel(index) {
  scheduler.cancel();
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
  progress.current = levelIndex + 1;
  saveProgress(storage, progress);
  game = new CrewDropGame({ levelIndex, storage });
  creations = progress.creations;
  pendingResult = null;
  phase = "playing";
  menu.hidden = true;
  gameScreen.hidden = false;
  leaveApp.hidden = true; // inside the game, the round button means "back to the menu"
  party.hidden = true;
  retry.hidden = true;
  stuckBanner.hidden = true;
  ramCorner.classList.remove("flustered");
  hint.hidden = levelIndex !== 0;
  levelPill.textContent = `Level ${levelIndex + 1}`;
  setLabels();
  renderTokens();
  renderCupboard();
  renderCpu();
  rendered = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
  renderBoard(game.board);
  updateGeometry();
  live.textContent = `Level ${levelIndex + 1}`;
  maybeSpawn();
}

function maybeSpawn() {
  if (phase !== "playing" || !game) return;
  if (game.chip) { renderChip(game.chip); return; } // the waiting chip resumes
  const chip = game.spawnChip();
  if (chip) renderChip(chip);
  else if (game.tokenRunOut()) showRetry("The beads are all used");
}

function onColumnTap(col) {
  if (phase === "resolving") { audio.ui("tick"); nudge(); return; }
  if (phase === "stuck") { audio.ui("wiggle"); nudge(); return; }
  if (phase !== "playing" || !game || !game.chip) { audio.ui("tick"); return; }
  doDrop(col);
}

function nudge() {
  boardWrap.classList.remove("nudge");
  void boardWrap.offsetWidth;
  boardWrap.classList.add("nudge");
}

async function doDrop(col) {
  scheduler.cancel(); // stop the countdown
  phase = "resolving";
  clearGlow();
  hint.hidden = true;
  const result = game.dropChipInto(col);
  if (!result.ok) {
    if (result.reason === "full") {
      renderBoard(game.board);
      enterStuck();
    } else {
      phase = "playing";
      audio.ui("tick");
    }
    return;
  }
  pendingResult = result;
  audio.ui("drop");
  renderTokens();
  audio.ui("tick");
  const token = scheduler.token();
  if (!await playResolution(result, token)) return; // the child left the screen
  afterTurn(result);
}

async function playResolution(result, token) {
  renderBoard(result.placed);
  if (!await scheduler.wait(180, token)) return false;
  for (const step of result.steps) {
    popCells(step.cleared);
    audio.ui("chain", step.step - 1); // each chain step plays a rising note
    if (step.cleared.some((spot) => spot.bug)) audio.ui("bug");
    for (const group of step.groups) flySparkle(group.cells[0]);
    if (!await scheduler.wait(340, token)) return false;
    renderBoard(step.after);
    if (!await scheduler.wait(220, token)) return false;
  }
  return true;
}

function afterTurn(result) {
  addCreations(result.groupsTotal);
  renderCupboard();
  renderCpu();
  renderTokens();
  pendingResult = null;
  if (result.complete) return levelComplete();
  if (result.stuck) return enterStuck();
  if (game.tokenRunOut()) return showRetry("The beads are all used");
  phase = "playing";
  maybeSpawn();
}

function enterStuck() {
  phase = "stuck";
  audio.ui("stuck"); // calm and low — never a buzzer
  ramCorner.classList.add("flustered");
  lane.querySelector(".chip")?.classList.add("paused");
  live.textContent = "The table is full. Ask the painter for help.";
  if (game.helpAvailable) stuckBanner.hidden = false;
  else showRetry("The table is full");
}

async function onGpuHelp() {
  if (phase !== "stuck" || !game.helpAvailable) { audio.ui("wiggle"); return; }
  phase = "resolving";
  stuckBanner.hidden = true;
  ramCorner.classList.remove("flustered");
  audio.ui("paint");
  const flash = document.createElement("div");
  flash.className = "paint-flash";
  boardEl.append(flash);
  setTimeout(() => flash.remove(), 650);
  const result = game.useGpuHelp();
  pendingResult = result;
  const token = scheduler.token();
  if (!await scheduler.wait(430, token)) return;
  popCells(result.painted, true);
  if (!await scheduler.wait(320, token)) return;
  renderBoard(result.afterPaint);
  if (!await scheduler.wait(200, token)) return;
  if (!await playResolution({ placed: result.afterPaint, steps: result.steps }, token)) return;
  afterTurn(result);
}

function levelComplete() {
  phase = "overlay";
  audio.ui("win");
  progress.unlocked = Math.max(progress.unlocked, Math.min(levelIndex + 2, LEVELS.length));
  progress.current = Math.min(levelIndex + 2, LEVELS.length);
  progress.creations = creations;
  const word = game.level.sticker;
  const isNew = word && !progress.stickers.includes(word);
  if (isNew) progress.stickers = [...progress.stickers, word];
  saveProgress(storage, progress);
  partySub.textContent = word ? (isNew ? `${word} sticker!` : `${word} again!`) : "The crew cheers!";
  partySticker.hidden = !word;
  if (word) {
    const id = STICKERS.find((s) => s.word === word)?.id || "ram";
    partySticker.replaceChildren();
    const label = document.createElement("strong");
    label.textContent = word;
    partySticker.append(crewSlot(id, { cls: "badge-art", happy: true }), label);
  }
  party.hidden = false;
  retry.hidden = true;
  live.textContent = "All clean!";
}

function showRetry(reason) {
  phase = "overlay";
  audio.ui("retry"); // soft and gentle
  retryReason.textContent = reason;
  retry.hidden = false;
  party.hidden = true;
  live.textContent = "Let's try that again";
}

function addCreations(n) {
  if (n <= 0) return;
  creations += n;
  progress.creations = creations;
  saveProgress(storage, progress);
}

function flySparkle(spot) {
  const from = cellEl(spot.r, spot.c)?.getBoundingClientRect();
  const to = drawersEl.getBoundingClientRect();
  if (!from) return;
  const spark = document.createElement("div");
  spark.className = "fly";
  spark.innerHTML = ICONS.sparkle;
  spark.style.left = `${from.left + from.width / 2 - 14}px`;
  spark.style.top = `${from.top + from.height / 2 - 14}px`;
  document.body.append(spark);
  audio.ui("sparkle");
  requestAnimationFrame(() => {
    spark.style.transform = `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(.5)`;
    spark.style.opacity = ".15";
  });
  setTimeout(() => spark.remove(), 720);
}

/* ---------- menu ---------- */

function buildMenu() {
  heroCrew.append(crewSlot("ram"), crewSlot("gpu"), crewSlot("bug"));
  playBtn.innerHTML = `${ICONS.play}<span>Play</span>`;
  levelPath.replaceChildren(...LEVELS.map((_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.level = String(i);
    button.addEventListener("click", () => {
      if (i >= progress.unlocked) {
        audio.ui("wiggle");
        button.classList.remove("wiggle");
        void button.offsetWidth;
        button.classList.add("wiggle");
        return;
      }
      startLevel(i);
    });
    return button;
  }));
  stickerStrip.replaceChildren(...STICKERS.map(({ word, id }) => {
    const slot = document.createElement("div");
    slot.className = "sticker";
    slot.dataset.word = word;
    const label = document.createElement("small");
    label.textContent = word;
    slot.append(crewSlot(id, { cls: "badge-art" }), label);
    return slot;
  }));
  refreshMenu();
}

function refreshMenu() {
  levelPath.querySelectorAll("button").forEach((button, i) => {
    const unlocked = i < progress.unlocked;
    const done = i < progress.unlocked - 1;
    button.classList.toggle("locked", !unlocked);
    button.classList.toggle("done", done);
    button.innerHTML = unlocked
      ? `<span class="node-num">${i + 1}</span>${done ? `<span class="node-check">${ICONS.check}</span>` : ""}`
      : `<span class="node-lock">${ICONS.lock}</span>`;
    button.setAttribute("aria-label", unlocked ? `Level ${i + 1}` : `Level ${i + 1} is still locked`);
  });
  stickerStrip.querySelectorAll(".sticker").forEach((slot) => {
    slot.classList.toggle("earned", progress.stickers.includes(slot.dataset.word));
  });
}

function goMenu() {
  scheduler.cancel();
  phase = "menu";
  party.hidden = true;
  retry.hidden = true;
  gameScreen.hidden = true;
  menu.hidden = false;
  leaveApp.hidden = false;
  audio.ui("tap");
  refreshMenu();
}

/* ---------- boot ---------- */

function buildSide() {
  ramPal.append(crewSlot("ram"));
  storageBtn.append(crewSlot("storage"));
  cpuBtn.append(crewSlot("cpu"));
  partyCrew.replaceChildren(crewSlot("ram", { happy: true }), crewSlot("storage", { happy: true }), crewSlot("cpu", { happy: true }), crewSlot("gpu", { happy: true }));
  retryReplay.innerHTML = `${ICONS.replay}<span>Try again</span>`;
  partyNext.innerHTML = `<span>Next</span>${ICONS.next}`;
}

function wire() {
  playBtn.addEventListener("click", () => startLevel(progress.current - 1));
  $("#home").addEventListener("click", goMenu);
  gpuHelpBtn.innerHTML = ICONS.paint; // icon only, no text
  gpuHelpBtn.addEventListener("click", onGpuHelp);
  retryReplay.addEventListener("click", () => startLevel(levelIndex)); // same seed, same bugs
  partyNext.addEventListener("click", () => {
    const next = levelIndex + 1;
    if (next < LEVELS.length) startLevel(next);
    else goMenu();
  });
  document.querySelectorAll(".overlay-home").forEach((button) => button.addEventListener("click", goMenu));
  ramPal.addEventListener("click", () => { audio.ui("squeak"); ramPal.classList.remove("bounce"); void ramPal.offsetWidth; ramPal.classList.add("bounce"); });
  storageBtn.addEventListener("click", () => {
    audio.ui("yawn");
    storageBtn.classList.remove("pat");
    drawersEl.classList.remove("pat");
    void storageBtn.offsetWidth;
    storageBtn.classList.add("pat");
    drawersEl.classList.add("pat");
    setTimeout(() => drawersEl.classList.remove("pat"), 600);
  });
  cpuBtn.addEventListener("click", () => { audio.ui("tap"); renderCpu(); });
  for (const pill of Object.values(pills)) {
    pill.addEventListener("click", () => { audio.ui("chime"); pill.classList.remove("bounce"); void pill.offsetWidth; pill.classList.add("bounce"); });
  }
  document.addEventListener("pointerdown", () => { audio.unlock(); }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // Finish the pending turn instantly so the board never freezes mid-clear.
      if (phase === "resolving" && game) {
        renderBoard(game.board);
        phase = "playing";
        if (pendingResult) afterTurn(pendingResult);
      }
      scheduler.cancel();
    } else if (game && (phase === "playing")) {
      if (game.chip) renderChip(game.chip);
      else maybeSpawn();
    }
  });
}

function boot() {
  storage = safeStorage();
  progress = loadProgress(storage);
  buildMenu();
  buildBoard();
  buildSide();
  wire();
  if ("ResizeObserver" in window) new ResizeObserver(updateGeometry).observe(boardZone);
  else window.addEventListener("resize", updateGeometry, { passive: true });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => Promise.resolve() /* Test Hub staging: no service worker */.catch(() => {}));
}

boot();
