// Crew Rooms — screen flow and rendering. The rules live in js/crew-logic.js, sound in
// js/audio.js, drawn SVG in js/art.js. One tap answers; every tap is seen and heard.
import { CREW, CREW_ORDER, LEVELS, RoomGame, ProgressStore, introducedCount } from "./js/crew-logic.js";
import { AudioEngine } from "./js/audio.js";
import { UI_ICONS, JOB_ICONS, BOOT_ARTS, SLEEP_ART, blobSVG } from "./js/art.js";

const $ = (selector) => document.querySelector(selector);
const SCREENS = ["menu", "card", "room", "party"];

const audio = new AudioEngine();
const store = new ProgressStore(safeStorage());
const state = { levelIndex: 0, openSlot: null, timers: 0 };
let game = null;

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

function announce(text) { $("#live").textContent = text; }

function svgIcon(markup, cls = "") {
  const host = document.createElement("template");
  host.innerHTML = markup.trim();
  const el = host.content.firstElementChild;
  if (cls) el.classList.add(...cls.split(/\s+/).filter(Boolean));
  return el;
}

// The shared crew art, with the drawn blob as the only fallback (no text in art).
function crewArt(id, pose = "", cls = "") {
  const crew = CREW[id];
  const wrap = document.createElement("span");
  wrap.className = ["crew-art", cls].filter(Boolean).join(" ");
  const img = document.createElement("img");
  img.src = `./assets/crew/${id}${pose ? "-" + pose : ""}.webp`;
  img.alt = `${crew.name}, ${crew.alt}`;
  img.draggable = false;
  wrap.append(img);
  img.addEventListener("error", () => wrap.replaceChildren(svgIcon(blobSVG(crew.colour))), { once: true });
  return wrap;
}

function showScreen(name) {
  closeChoice();
  hideCardPop();
  SCREENS.forEach((id) => { $("#" + id).hidden = id !== name; });
  $("#leave-app").hidden = name !== "menu";
}

/* Menu */

function renderMenu() {
  const progress = store.load();
  const target = store.nextLevel();

  const path = $("#room-path");
  path.replaceChildren();
  LEVELS.forEach((level, index) => {
    const room = index + 1;
    const locked = room > progress.unlocked;
    const done = progress.done.includes(room);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = ["tile", locked ? "locked" : "", done ? "done" : "", index === target && !locked ? "current" : ""].filter(Boolean).join(" ");
    tile.setAttribute("aria-label", locked ? `Room ${room}, locked` : `Room ${room}${done ? ", done" : ""}`);
    const num = document.createElement("span");
    num.className = "tile-num";
    num.textContent = String(room);
    tile.append(num);
    if (locked || done) tile.append(svgIcon(locked ? UI_ICONS.lock : UI_ICONS.check, "tile-icon"));
    tile.addEventListener("click", async () => {
      await audio.unlock();
      if (locked) { nudge(tile); audio.ui("lock"); return; }
      audio.ui("tap");
      openLevel(index);
    });
    path.append(tile);
  });

  const row = $("#sticker-row");
  row.replaceChildren();
  CREW_ORDER.forEach((id) => {
    const has = progress.stickers.includes(id);
    const sticker = document.createElement("button");
    sticker.type = "button";
    sticker.className = "sticker" + (has ? "" : " empty");
    sticker.setAttribute("aria-label", has ? `${CREW[id].name} sticker` : `Empty sticker space for ${CREW[id].name}`);
    if (has) {
      sticker.append(crewArt(id, "happy", "sticker-art"));
      const word = document.createElement("strong");
      word.textContent = CREW[id].name;
      sticker.append(word);
    } else {
      sticker.append(svgIcon(UI_ICONS.star, "sticker-art ghost"));
    }
    sticker.addEventListener("click", async () => {
      await audio.unlock();
      if (!has) { nudge(sticker); audio.ui("lock"); return; }
      audio.ui("card");
      showCardPop(id);
    });
    row.append(sticker);
  });
}

function nudge(el) { el.classList.remove("nudge"); void el.offsetWidth; el.classList.add("nudge"); }

/* Level flow */

function openLevel(index) {
  state.levelIndex = index;
  if (LEVELS[index].word) showCardScreen(index);
  else startRoom(index);
}

function showCardScreen(index) {
  const crew = CREW[LEVELS[index].word];
  $("#card-art").replaceChildren(crewArt(crew.id, "", "card-art-img"));
  $("#card-name").textContent = crew.name;
  $("#card-line").textContent = crew.line;
  showScreen("card");
  announce(`${crew.name}. ${crew.line}`);
}

function updateSlotAria(el, slot) {
  el.setAttribute("aria-label", slot.filled
    ? `${CREW[slot.filled].name} is in the slot`
    : slot.kind === "bug" ? "A glitch sits in the slot" : `Empty slot for the ${CREW[slot.kind].job}`);
}

function startRoom(index) {
  state.timers += 1; // cancels any pending boot-to-party handoff from an earlier room
  game = new RoomGame({ level: index });
  const level = LEVELS[index];

  $("#room-label").textContent = `Room ${index + 1}`;
  $("#show-card").hidden = !level.word;

  const machineScreen = $("#machine-screen");
  machineScreen.classList.remove("lit");
  machineScreen.replaceChildren(svgIcon(SLEEP_ART));
  const dot = document.createElement("span");
  dot.className = "power-dot";
  machineScreen.append(dot);

  const slotsEl = $("#slots");
  slotsEl.style.setProperty("--n", String(game.slots.length));
  slotsEl.replaceChildren();
  game.slots.forEach((slot, slotIndex) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "slot empty" + (slot.kind === "bug" ? " bug" : "");
    el.dataset.slot = String(slotIndex);
    updateSlotAria(el, slot);
    el.append(svgIcon(JOB_ICONS[slot.kind], "job-icon"));
    el.addEventListener("click", () => onSlot(slotIndex, el));
    slotsEl.append(el);
  });

  renderStrip();
  showScreen("room");
  announce(`Room ${index + 1}. Tap a glowing slot.`);
}

function renderStrip() {
  const strip = $("#crew-strip");
  const known = CREW_ORDER.slice(0, introducedCount(state.levelIndex));
  const placed = new Set(game.placedCrew());
  strip.replaceChildren();
  known.forEach((id) => {
    const member = document.createElement("button");
    member.type = "button";
    member.className = "strip-member";
    member.setAttribute("aria-label", `${CREW[id].name} card`);
    member.append(crewArt(id, placed.has(id) ? "busy" : "", "strip-art"));
    member.addEventListener("click", async () => {
      await audio.unlock();
      audio.ui("card");
      showCardPop(id);
    });
    strip.append(member);
  });
}

/* Answering: one tap on a slot, one tap on a helper */

async function onSlot(index, el) {
  await audio.unlock();
  const slot = game.slot(index);
  if (slot.filled) { // even a tap on a done slot answers back: a bounce and a soft note
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
    audio.ui("pop");
    return;
  }
  audio.ui("tap");
  openChoice(index);
}

function openChoice(index) {
  const slot = game.slot(index);
  state.openSlot = index;
  $("#choice-job").replaceChildren(svgIcon(JOB_ICONS[slot.kind], "job-icon"));
  $("#choice-ask").textContent = slot.kind === "bug" ? "Who can fix it?" : "Who fits?";
  const answerId = game.answerFor(slot);
  const order = game.openChoices(index);
  const choicesEl = $("#choices");
  choicesEl.style.setProperty("--n", String(order.length));
  choicesEl.replaceChildren();
  order.forEach((id) => {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = "choice";
    choice.dataset.crew = id;
    choice.setAttribute("aria-label", CREW[id].name);
    choice.append(crewArt(id, "", "choice-art"));
    const name = document.createElement("strong");
    name.textContent = CREW[id].name;
    choice.append(name);
    if (slot.hint && id === answerId) choice.classList.add("glow");
    choice.addEventListener("click", () => answerChoice(index, id, choice));
    choicesEl.append(choice);
  });
  renderHint(slot);
  $("#choice-wrap").hidden = false;
}

function renderHint(slot) {
  const hintCard = $("#hint-card");
  if (!slot.hint) { hintCard.hidden = true; hintCard.replaceChildren(); return; }
  const answerId = game.answerFor(slot);
  hintCard.replaceChildren(crewArt(answerId, "", "hint-art"));
  const copy = document.createElement("p");
  copy.textContent = (slot.kind === "bug" ? "The thinker fixes the glitch. " : "") + CREW[answerId].line;
  hintCard.append(copy);
  hintCard.hidden = false;
}

function fillSlot(index, crewId) {
  const el = $(`#slots .slot[data-slot="${index}"]`);
  el.classList.remove("empty", "bug");
  el.classList.add("filled", "lit", "pop");
  el.replaceChildren(crewArt(crewId, "happy", "slot-art"));
  updateSlotAria(el, game.slot(index));
}

async function answerChoice(index, id, button) {
  await audio.unlock();
  const result = game.answer(index, id);
  if (result.status === "correct") {
    audio.ui("correct");
    fillSlot(index, game.slot(index).filled);
    closeChoice();
    renderStrip();
    announce(`${CREW[id].name} fits!`);
    if (result.done) bootRoom();
  } else if (result.status === "revealed") {
    audio.ui("reveal");
    fillSlot(index, result.answer);
    closeChoice();
    renderStrip();
    announce(`${CREW[result.answer].name} slides in.`);
    if (result.done) bootRoom();
  } else if (result.status === "wrong") {
    audio.ui("wrong"); // a kind wiggle and a soft low note; nothing is lost
    button.classList.add("wiggle");
    setTimeout(() => button.classList.remove("wiggle"), 480);
    if (result.hint === "teach") {
      $(`#choices .choice[data-crew="${result.answer}"]`)?.classList.add("glow");
      renderHint(game.slot(index));
      announce("The glowing friend fits here.");
    }
  } else {
    closeChoice();
  }
}

function closeChoice() {
  $("#choice-wrap").hidden = true;
  state.openSlot = null;
}

/* Boot and party */

function bootRoom() {
  store.completeLevel(state.levelIndex);
  const machineScreen = $("#machine-screen");
  machineScreen.replaceChildren(svgIcon(BOOT_ARTS[state.levelIndex % BOOT_ARTS.length]));
  const dot = document.createElement("span");
  dot.className = "power-dot on";
  machineScreen.append(dot);
  machineScreen.classList.add("lit");
  document.querySelectorAll("#slots .slot").forEach((el) => el.classList.add("lit"));
  audio.ui("boot");
  announce("The machine wakes up!");
  const token = ++state.timers;
  setTimeout(() => { if (state.timers === token) showParty(); }, 1700);
}

function showParty() {
  const level = LEVELS[state.levelIndex];
  const last = state.levelIndex === LEVELS.length - 1;
  $("#party-art").replaceChildren(svgIcon(BOOT_ARTS[state.levelIndex % BOOT_ARTS.length]));
  const crewRow = $("#party-crew");
  crewRow.replaceChildren();
  game.placedCrew().forEach((id) => crewRow.append(crewArt(id, "happy", "party-crew-art")));

  const sticker = $("#party-sticker");
  sticker.replaceChildren();
  sticker.classList.remove("empty");
  const line = $("#party-line");
  if (level.word) {
    sticker.append(crewArt(level.word, "happy", "sticker-art"));
    const word = document.createElement("strong");
    word.textContent = CREW[level.word].name;
    sticker.append(word);
    line.textContent = "New sticker!";
  } else {
    sticker.append(svgIcon(UI_ICONS.star, "sticker-art"));
    line.textContent = last ? "All rooms done!" : "Room done!";
  }
  $("#party-next").hidden = last;
  showScreen("party");
  audio.ui("sticker");
  announce(line.textContent);
}

/* Word card pop-over (crew strip, sticker book, and the room's again button) */

function showCardPop(id) {
  if (!id || !CREW[id]) return;
  $("#pop-art").replaceChildren(crewArt(id, "", "pop-art-img"));
  $("#pop-name").textContent = CREW[id].name;
  $("#pop-line").textContent = CREW[id].line;
  $("#card-pop").hidden = false;
}

function hideCardPop() { $("#card-pop").hidden = true; }

function goMenu() {
  state.timers += 1;
  renderMenu();
  showScreen("menu");
  audio.ui("tap");
}

/* Wiring */

$("#menu-art").replaceChildren(crewArt("ram", "", "menu-art-img"));
$("#play").addEventListener("click", async () => { await audio.unlock(); audio.ui("tap"); openLevel(store.nextLevel()); });
$("#card-home").addEventListener("click", goMenu);
$("#room-home").addEventListener("click", goMenu);
$("#card-go").addEventListener("click", async () => { await audio.unlock(); audio.ui("tap"); startRoom(state.levelIndex); });
$("#show-card").addEventListener("click", async () => {
  await audio.unlock();
  audio.ui("card");
  showCardPop(LEVELS[state.levelIndex].word);
});
$("#party-next").addEventListener("click", async () => { await audio.unlock(); audio.ui("tap"); openLevel(state.levelIndex + 1); });
$("#party-menu").addEventListener("click", goMenu);
$("#pop-close").addEventListener("click", () => { hideCardPop(); audio.ui("tap"); });
$("#card-pop").addEventListener("click", (event) => { if (event.target.id === "card-pop") { hideCardPop(); audio.ui("tap"); } });
$("#choice-wrap").addEventListener("click", (event) => { if (event.target.id === "choice-wrap") { closeChoice(); audio.ui("tap"); } });
document.addEventListener("pointerdown", () => { audio.unlock(); }, { passive: true });

renderMenu();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
