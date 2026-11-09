// crew-logic.js — the game's rules with no DOM, so tools/test-rules.mjs can check them
// with plain node asserts (the same split as memory-echo-app/js/game-logic.js).

export const STORAGE_KEY = "crewRooms.progress.v1";
export const HINT_TEACH = 2;    // misses on one slot before the rule is taught (glow + job card)
export const HINT_REVEAL = 3;   // misses before the answer moves into the slot by itself
export const BUG_FIXER = "cpu"; // "the CPU thinks it through" and fixes the glitch

// The crew words are only NAMES of game pieces; the game is a classic tap-to-match puzzle.
// Each line is the whole teaching payload for one word: short, plain, never hedging.
export const CREW = Object.freeze({
  ram: Object.freeze({ id: "ram", name: "RAM", colour: "#8FDCC2", job: "worktable",
    alt: "a mint memory stick with gold feet",
    line: "RAM is the quick little worktable. It holds our work right now." }),
  storage: Object.freeze({ id: "storage", name: "Storage", colour: "#C7B5EE", job: "saves for later",
    alt: "a lilac chest of drawers",
    line: "Storage keeps things saved for later, even when the computer sleeps." }),
  cpu: Object.freeze({ id: "cpu", name: "CPU", colour: "#5CC3C0", job: "thinker",
    alt: "a teal chip with four little lights",
    line: "The CPU is the thinker. It works out each step." }),
  gpu: Object.freeze({ id: "gpu", name: "GPU", colour: "#E06AB8", job: "painter",
    alt: "a pink paint palette with a rainbow brush",
    line: "The GPU paints pictures super fast." }),
  token: Object.freeze({ id: "token", name: "Tokens", colour: "#F6CB57", job: "word pieces",
    alt: "a glowing gold bean",
    line: "Tokens are the little word pieces the AI reads and writes." }),
  bug: Object.freeze({ id: "bug", name: "Bug", colour: "#B9AEDC", job: "glitch",
    alt: "a lilac tangle of wire",
    line: "A bug is a glitch. The crew finds it and fixes it." })
});

export const CREW_ORDER = Object.freeze(["ram", "storage", "cpu", "gpu", "token", "bug"]);

// Eight rooms. Rooms 1-6 each introduce exactly ONE new crew word; 7 and 8 mix everything
// with 3 choices and 3-4 slots. A bug slot is not filled by the bug: the child picks the
// helper who fixes it (BUG_FIXER). Every slot answer must be choosable in its room.
export const LEVELS = Object.freeze([
  Object.freeze({ word: "ram", slots: ["ram"], choices: ["ram", "token"] }),
  Object.freeze({ word: "storage", slots: ["ram", "storage"], choices: ["ram", "storage"] }),
  Object.freeze({ word: "cpu", slots: ["storage", "cpu", "ram"], choices: ["ram", "cpu", "storage"] }),
  Object.freeze({ word: "gpu", slots: ["gpu", "ram"], choices: ["gpu", "ram", "token"] }),
  Object.freeze({ word: "token", slots: ["token", "storage", "gpu"], choices: ["token", "storage", "gpu"] }),
  Object.freeze({ word: "bug", slots: ["bug", "cpu", "ram"], choices: ["cpu", "ram", "gpu"] }),
  Object.freeze({ word: null, slots: ["gpu", "bug", "token"], choices: ["gpu", "cpu", "token"] }),
  Object.freeze({ word: null, slots: ["ram", "storage", "bug", "cpu"], choices: ["ram", "storage", "cpu"] })
]);

// How many crew words a child has met after finishing room `levelIndex` (0-based).
export const introducedCount = (levelIndex) =>
  LEVELS.slice(0, levelIndex + 1).reduce((count, level) => count + (level.word ? 1 : 0), 0);

export class RoomGame {
  constructor({ level = 0 } = {}) {
    const def = LEVELS[level];
    if (!def) throw new Error("Unknown level");
    this.index = level;
    this.def = def;
    this.slots = def.slots.map((kind, id) => ({ id, kind, filled: null, misses: 0, hint: false, revealed: false }));
  }

  slot(id) { return this.slots[id]; }

  answerFor(slot) { return slot.kind === "bug" ? BUG_FIXER : slot.kind; }

  // The choice buttons open in a shuffled order; the set never changes.
  openChoices(id, random = Math.random) {
    return [...this.def.choices]
      .map((crew) => ({ crew, key: random() }))
      .sort((a, b) => a.key - b.key)
      .map((pick) => pick.crew);
  }

  // One tap is one answer. Wrong picks lose nothing; the two hint thresholds are
  // HINT_TEACH (glow + job card) and HINT_REVEAL (the answer fills the slot itself).
  answer(id, crewId) {
    const slot = this.slots[id];
    if (!slot) return { status: "unknown" };
    if (slot.filled) return { status: "filled" };
    if (crewId === this.answerFor(slot)) {
      slot.filled = crewId;
      slot.hint = false;
      return { status: "correct", done: this.isComplete() };
    }
    slot.misses += 1;
    if (slot.misses >= HINT_REVEAL) {
      slot.filled = this.answerFor(slot);
      slot.revealed = true;
      slot.hint = false;
      return { status: "revealed", answer: slot.filled, done: this.isComplete() };
    }
    if (slot.misses >= HINT_TEACH) {
      slot.hint = true;
      return { status: "wrong", hint: "teach", answer: this.answerFor(slot) };
    }
    return { status: "wrong" };
  }

  isComplete() { return this.slots.every((slot) => slot.filled); }

  placedCrew() { return [...new Set(this.slots.filter((slot) => slot.filled).map((slot) => slot.filled))]; }
}

// Progress (current level + collected stickers) in localStorage wrapped in try/catch;
// every method works when storage is missing, denied, or corrupt.
export class ProgressStore {
  constructor(storage = null) { this.storage = storage; }

  load() {
    let saved = null;
    try { saved = JSON.parse(this.storage?.getItem(STORAGE_KEY)); } catch { saved = null; }
    const unlocked = Math.min(LEVELS.length, Math.max(1, Number(saved?.unlocked) || 1));
    const done = [...new Set((Array.isArray(saved?.done) ? saved.done : [])
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= LEVELS.length))];
    const stickers = [...new Set((Array.isArray(saved?.stickers) ? saved.stickers : [])
      .filter((id) => CREW[id]))];
    return { unlocked, done, stickers };
  }

  save(state) {
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* optional */ }
  }

  completeLevel(levelIndex) {
    const state = this.load();
    const room = levelIndex + 1;
    if (!state.done.includes(room)) state.done.push(room);
    state.unlocked = Math.max(state.unlocked, Math.min(LEVELS.length, room + 1));
    const word = LEVELS[levelIndex].word;
    if (word && !state.stickers.includes(word)) state.stickers.push(word);
    this.save(state);
    return state;
  }

  // The Play button target: the first unfinished unlocked room, or room 1 to replay.
  nextLevel() {
    const { unlocked, done } = this.load();
    for (let index = 0; index < unlocked; index += 1) if (!done.includes(index + 1)) return index;
    return 0;
  }
}
