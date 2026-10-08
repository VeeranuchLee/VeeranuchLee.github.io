import { MemoryGame, GenerationScheduler } from "./js/game-logic.js";
import { AudioEngine } from "./js/audio-engine.js";

const SPEEDS = { slow: { step: 900, sound: .58 }, normal: { step: 650, sound: .42 }, fast: { step: 420, sound: .27 } };
const MODES = {
  colours: { label: "Colours", icon: "● ● ● ●", prompt: "Tap the colours in order" },
  numbers: { label: "Numbers", icon: "1 2 3", prompt: "Tap the numbers in order" },
  music: { label: "Music Notes", icon: "♫", prompt: "Play the melody back" }
};

const $ = (selector) => document.querySelector(selector);
const menu = $("#menu");
const gameScreen = $("#game");
const instrument = $("#instrument");
const statusPanel = $("#status-panel");
const statusIcon = $("#status-icon");
const statusTitle = $("#status-title");
const statusCopy = $("#status-copy");
const robot = $("#robot");
const replay = $("#replay");
const numberDisplay = $("#number-display");
const best = $("#best");
const lengthLabel = $("#length-label");
const modePill = $("#mode-pill");
const live = $("#live");
const audio = new AudioEngine();
const scheduler = new GenerationScheduler({ onCancel: () => { audio.stopAll(); clearHighlights(); } });

let selectedMode = "colours";
let startLength = 4;
let speed = readSpeed();
let model = null;
let phase = "menu";
let explore = false;
let lastPress = { key: "", at: 0 };
let resumeOnVisible = false;

function readSpeed() {
  try { return SPEEDS[localStorage.getItem("memoryEcho.speed")] ? localStorage.getItem("memoryEcho.speed") : "normal"; }
  catch { return "normal"; }
}

function storeSpeed() { try { localStorage.setItem("memoryEcho.speed", speed); } catch { /* optional */ } }

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

function setChoice(group, value) {
  document.querySelectorAll(`[data-${group}]`).forEach((button) => {
    const active = button.dataset[group] === String(value);
    button.classList.toggle("selected", active); button.setAttribute("aria-pressed", String(active));
  });
}

function modeItems(mode) {
  if (mode === "colours") return ["Red", "Blue", "Green", "Yellow"];
  if (mode === "numbers") return ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return ["C", "D", "E", "F", "G", "A", "B", "C"];
}

function buildInstrument(mode) {
  gameScreen.dataset.mode = mode;
  instrument.className = `instrument ${mode}`;
  instrument.replaceChildren();
  modeItems(mode).forEach((label, index) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "note-key"; button.dataset.index = index;
    button.setAttribute("aria-label", mode === "music" ? `Note ${label}${index === 7 ? " high" : ""}` : label);
    if (mode === "colours") button.innerHTML = `<span>${label}</span>`;
    else if (mode === "music") button.innerHTML = `<span>${label}</span><i></i><i></i>`;
    else button.textContent = label;
    instrument.append(button);
  });
}

function setPhase(next, copy) {
  phase = next;
  gameScreen.dataset.phase = next;
  statusPanel.className = `status-panel ${next}`;
  const config = {
    watch: ["◉", "Watch & listen", copy || "Remember the pattern"],
    turn: ["☝", "Your turn", copy || MODES[selectedMode].prompt],
    success: ["★", "Wonderful!", copy || "One more joins the pattern"],
    mistake: ["↻", "Let’s watch again", copy || "Same pattern, another try"],
    explore: ["✦", "Explore", copy || "Tap anything and make music"]
  }[next];
  [statusIcon.textContent, statusTitle.textContent, statusCopy.textContent] = config;
  robot.dataset.pose = next;
  replay.disabled = next === "watch" || next === "success" || next === "mistake" || explore;
  instrument.setAttribute("aria-disabled", String(next !== "turn" && next !== "explore"));
  live.textContent = `${config[1]}. ${config[2]}`;
}

function clearHighlights() {
  instrument.querySelectorAll(".active").forEach((el) => el.classList.remove("active"));
  numberDisplay.classList.remove("show");
}

function light(index, on) {
  instrument.querySelector(`[data-index="${index}"]`)?.classList.toggle("active", on);
  if (selectedMode === "numbers") {
    numberDisplay.textContent = modeItems(selectedMode)[index];
    numberDisplay.classList.toggle("show", on);
  }
}

async function pulse(index, ms, token) {
  if (!scheduler.current(token)) return false;
  clearHighlights();
  light(index, true);
  audio.tone(selectedMode, index, SPEEDS[speed].sound);
  if (!await scheduler.wait(ms * .68, token)) return false;
  light(index, false);
  return scheduler.wait(ms * .32, token);
}

async function watchSequence(message) {
  const token = scheduler.cancel();
  model.resetInput();
  setPhase("watch", message);
  await scheduler.wait(420, token);
  for (const item of model.sequence) {
    if (!await pulse(item, SPEEDS[speed].step, token)) return;
  }
  if (!scheduler.current(token)) return;
  clearHighlights();
  setPhase("turn");
}

function refreshStats() {
  lengthLabel.textContent = explore ? "Free play" : `Length ${model.sequence.length}`;
  best.textContent = explore ? "No challenge" : `★ Best ${model.getBest() || "—"}`;
}

async function handleSuccess() {
  const token = scheduler.cancel();
  const completed = model.sequence.length;
  model.updateBest(completed); refreshStats(); setPhase("success"); audio.ui("success");
  gameScreen.classList.add("celebrate");
  await scheduler.wait(1050, token);
  gameScreen.classList.remove("celebrate");
  if (!scheduler.current(token)) return;
  model.advance(); refreshStats(); watchSequence("A longer pattern is coming");
}

async function handleMistake(index) {
  const token = scheduler.cancel();
  light(index, true); setPhase("mistake"); audio.ui("mistake"); instrument.classList.add("wobble");
  await scheduler.wait(650, token); clearHighlights(); instrument.classList.remove("wobble");
  if (scheduler.current(token)) watchSequence("Same pattern — you can do it");
}

async function pressItem(index, pointerId) {
  if (phase !== "turn" && phase !== "explore") return;
  const now = performance.now(); const key = String(index);
  if (lastPress.key === key && now - lastPress.at < 120) return;
  lastPress = { key, at: now };
  await audio.unlock();
  light(index, true); audio.tone(selectedMode, index, .34);
  const pressToken = scheduler.token();
  scheduler.wait(180, pressToken).then((current) => { if (current) light(index, false); });
  if (explore) return;
  const result = model.checkInput(index);
  if (result.status === "success") handleSuccess();
  else if (result.status === "mistake") handleMistake(index);
}

function enter(mode, isExplore) {
  scheduler.cancel(); selectedMode = mode; explore = isExplore;
  model = new MemoryGame({ mode, startLength, storage: safeStorage() });
  buildInstrument(mode); model.start();
  modePill.textContent = `${MODES[mode].icon}  ${MODES[mode].label}`;
  menu.hidden = true; gameScreen.hidden = false; refreshStats();
  if (explore) setPhase("explore"); else watchSequence();
}

function goHome() {
  scheduler.cancel(); clearHighlights(); explore = false; phase = "menu";
  gameScreen.classList.remove("celebrate"); gameScreen.hidden = true; menu.hidden = false;
  audio.ui("tap");
}

document.addEventListener("pointerdown", () => audio.unlock(), { once: true, passive: true });
document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { selectedMode = button.dataset.mode; setChoice("mode", selectedMode); audio.ui("tap"); }));
document.querySelectorAll("[data-length]").forEach((button) => button.addEventListener("click", () => { startLength = Number(button.dataset.length); setChoice("length", startLength); audio.ui("tap"); }));
document.querySelectorAll("[data-speed]").forEach((button) => button.addEventListener("click", () => { speed = button.dataset.speed; storeSpeed(); setChoice("speed", speed); audio.ui("tap"); }));
$("#play").addEventListener("click", () => enter(selectedMode, false));
$("#explore").addEventListener("click", () => enter(selectedMode, true));
$("#home").addEventListener("click", goHome);
replay.addEventListener("click", () => { if (phase === "turn") watchSequence("Listen once more"); });
instrument.addEventListener("pointerdown", (event) => {
  const key = event.target.closest(".note-key");
  if (!key || (phase !== "turn" && phase !== "explore")) return;
  event.preventDefault(); pressItem(Number(key.dataset.index), event.pointerId);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resumeOnVisible = !gameScreen.hidden && !explore;
    scheduler.cancel(); clearHighlights();
    if (resumeOnVisible) setPhase("watch", "Paused while you were away");
  } else if (resumeOnVisible) {
    resumeOnVisible = false;
    watchSequence("Here is the pattern again");
  }
});

setChoice("mode", selectedMode); setChoice("length", startLength); setChoice("speed", speed);
if ("serviceWorker" in navigator) window.addEventListener("load", () => Promise.resolve() /* Test Hub staging: no service worker */.catch(() => {}));
