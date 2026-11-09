// Crew Drop — pure game rules, DOM-free and testable (tools/test-rules.mjs).
// The board is the crew's WORKTABLE: 6 columns, 10 rows. Chips are two square
// halves; three or more of one colour in a row or column clear, bugs included.

export const COLS = 6;
export const ROWS = 10;

// Each colour carries its own shape so colour is never the only cue.
export const COLORS = Object.freeze([
  Object.freeze({ id: "mint", hex: "#8FDCC2", shape: "round" }),
  Object.freeze({ id: "sky", hex: "#9CC7EE", shape: "square" }),
  Object.freeze({ id: "coral", hex: "#F5927A", shape: "star" })
]);

// One new idea per level (about 8 levels). Seeds are fixed so a retried level
// always rebuilds the SAME bugs.
export const LEVELS = Object.freeze([
  Object.freeze({ colors: 2, bugs: 2, tokens: 18, dropSeconds: 14, sticker: "RAM", label: "ram", seed: 1011 }),
  Object.freeze({ colors: 3, bugs: 3, tokens: 16, dropSeconds: 12.5, seed: 2022 }),
  Object.freeze({ colors: 3, bugs: 3, tokens: 16, dropSeconds: 12, sticker: "Storage", label: "storage", seed: 3033 }),
  Object.freeze({ colors: 3, bugs: 4, tokens: 12, dropSeconds: 11.5, sticker: "Tokens", seed: 4044 }),
  Object.freeze({ colors: 3, bugs: 4, tokens: 14, dropSeconds: 10.5, sticker: "GPU", label: "gpu", seed: 5055 }),
  Object.freeze({ colors: 3, bugs: 5, tokens: 15, dropSeconds: 9.5, sticker: "CPU", seed: 6066 }),
  Object.freeze({ colors: 3, bugs: 6, tokens: 16, dropSeconds: 8.5, seed: 7077 }),
  Object.freeze({ colors: 3, bugs: 7, tokens: 18, dropSeconds: 7.5, seed: 8088 })
]);

export const LABEL_TEXT = Object.freeze({ ram: "RAM = working space", storage: "Storage = saved space", gpu: "GPU = super fast painter" });

export const PROGRESS_KEY = "crewDrop.progress";

// mulberry32: deterministic, so "same bugs" on retry is guaranteed by seed.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (random, n) => Math.floor(random() * n);

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function copyBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

// Runs of 3+ same-colour cells, horizontal or vertical. Bugs match like any piece.
export function findMatches(board) {
  const groups = [];
  const scan = (cells) => {
    let run = [];
    let color = -1;
    const flush = () => {
      if (run.length >= 3 && color >= 0) groups.push({ color, cells: run.slice() });
      run = [];
    };
    for (const { r, c, piece } of cells) {
      if (piece && piece.color === color) run.push({ r, c });
      else {
        flush();
        if (piece) {
          run = [{ r, c }];
          color = piece.color;
        } else color = -1;
      }
    }
    flush();
  };
  for (let r = 0; r < ROWS; r += 1) scan(Array.from({ length: COLS }, (_, c) => ({ r, c, piece: board[r][c] })));
  for (let c = 0; c < COLS; c += 1) scan(Array.from({ length: ROWS }, (_, r) => ({ r, c, piece: board[r][c] })));
  return groups;
}

// Pieces fall straight down; returns whether anything moved.
export function applyGravity(board) {
  let moved = false;
  for (let c = 0; c < COLS; c += 1) {
    const stack = [];
    for (let r = ROWS - 1; r >= 0; r -= 1) if (board[r][c]) stack.push(board[r][c]);
    for (let r = ROWS - 1, i = 0; r >= 0; r -= 1, i += 1) {
      const piece = i < stack.length ? stack[i] : null;
      if (board[r][c] !== piece) moved = true;
      board[r][c] = piece;
    }
  }
  return moved;
}

export function landingRow(board, c) {
  for (let r = ROWS - 1; r >= 0; r -= 1) if (!board[r][c]) return r;
  return -1; // column full
}

export class CrewDropGame {
  constructor({ levelIndex = 0, random = Math.random, storage = null } = {}) {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, levelIndex));
    this.level = LEVELS[this.levelIndex];
    this.storage = storage;
    this.random = random; // chips stay fresh; only the bugs come from the level seed
    this.restart();
  }

  restart() {
    this.board = createBoard();
    this.placeBugs(seededRandom(this.level.seed)); // same seed -> same bugs, every retry
    this.tokensLeft = this.level.tokens;
    this.chipsUsed = 0;
    this.helpAvailable = true; // the GPU painter clears bottom rows once per level
    this.stuck = false;
    this.complete = false;
    this.chip = null;
  }

  placeBugs(random) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const board = this.board = createBoard();
      const order = shuffle([0, 1, 2, 3, 4, 5], random);
      const counts = new Array(COLS).fill(0);
      for (let i = 0; i < this.level.bugs; i += 1) {
        const col = order[i % COLS];
        const row = ROWS - 1 - counts[col];
        counts[col] += 1;
        board[row][col] = { color: randInt(random, this.level.colors), bug: true };
      }
      if (findMatches(board).length === 0) return; // never start with a ready match
    }
  }

  bugsLeft() {
    let n = 0;
    for (const row of this.board) for (const cell of row) if (cell && cell.bug) n += 1;
    return n;
  }

  topRowOccupied() { return this.board[0].some(Boolean); }

  spawnChip() {
    if (this.stuck || this.complete || this.tokensLeft <= 0 || this.chip) return null;
    const kinds = this.level.colors;
    this.chip = { left: randInt(this.random, kinds), right: randInt(this.random, kinds), leftCol: randInt(this.random, COLS - 1) };
    return { ...this.chip };
  }

  flipChip() {
    if (!this.chip) return null;
    const { left, right } = this.chip;
    this.chip.left = right;
    this.chip.right = left;
    return { ...this.chip };
  }

  dropChipInto(col) {
    if (!this.chip) return { ok: false, reason: "no-chip" };
    // Tapping the last column uses the last two columns.
    const leftCol = Math.max(0, Math.min(Number(col) || 0, COLS - 2));
    const rows = [landingRow(this.board, leftCol), landingRow(this.board, leftCol + 1)];
    if (rows[0] < 0 || rows[1] < 0) {
      this.stuck = true;
      return { ok: false, reason: "full", stuck: true }; // the incoming chip waits
    }
    this.board[rows[0]][leftCol] = { color: this.chip.left, bug: false };
    this.board[rows[1]][leftCol + 1] = { color: this.chip.right, bug: false };
    const dropPair = [{ r: rows[0], c: leftCol }, { r: rows[1], c: leftCol + 1 }];
    const placed = copyBoard(this.board);
    this.chip = null;
    this.tokensLeft -= 1;
    this.chipsUsed += 1;
    return { ok: true, dropPair, placed, ...this.settle() };
  }

  // Clear matches, let pieces fall, repeat — every pass is one chain step.
  settle() {
    const steps = [];
    let bugsCleared = 0;
    let groupsTotal = 0;
    for (;;) {
      const groups = findMatches(this.board);
      if (!groups.length) break;
      const cleared = [];
      for (const group of groups) {
        groupsTotal += 1;
        for (const { r, c } of group.cells) {
          const piece = this.board[r][c];
          if (!piece) continue;
          cleared.push({ r, c, color: piece.color, bug: piece.bug });
          this.board[r][c] = null;
        }
      }
      applyGravity(this.board);
      steps.push({ step: steps.length + 1, groups: groups.map((g) => ({ color: g.color, cells: g.cells })), cleared, after: copyBoard(this.board) });
      bugsCleared += cleared.filter((cell) => cell.bug).length;
    }
    this.complete = this.bugsLeft() === 0; // clearing every bug finishes the level
    this.stuck = !this.complete && this.topRowOccupied();
    return {
      steps, bugsCleared, groupsTotal,
      complete: this.complete, stuck: this.stuck,
      bugsLeft: this.bugsLeft(), tokensLeft: this.tokensLeft, chipsUsed: this.chipsUsed
    };
  }

  // The once-per-level GPU rescue: a flash of paint clears the bottom two rows.
  useGpuHelp() {
    if (!this.helpAvailable || !this.stuck) return { ok: false };
    this.helpAvailable = false;
    const painted = [];
    for (let r = ROWS - 2; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (this.board[r][c]) {
          painted.push({ r, c, color: this.board[r][c].color, bug: this.board[r][c].bug });
          this.board[r][c] = null;
        }
      }
    }
    applyGravity(this.board);
    const afterPaint = copyBoard(this.board);
    return { ok: true, painted, afterPaint, ...this.settle() };
  }

  tokenRunOut() { return this.tokensLeft <= 0 && !this.complete; }

  // Purely visual "busy" cue for the CPU chip: teal toward coral.
  cpuWarmth() {
    const levelPart = this.levelIndex / (LEVELS.length - 1);
    const usePart = this.level.tokens ? this.chipsUsed / this.level.tokens : 1;
    return Math.max(0, Math.min(1, levelPart * .35 + usePart * .65));
  }
}

export function loadProgress(storage) {
  const fallback = { unlocked: 1, current: 1, stickers: [], creations: 0 };
  try {
    const raw = storage?.getItem(PROGRESS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      unlocked: Math.max(1, Math.min(LEVELS.length, Number(parsed.unlocked) || 1)),
      current: Math.max(1, Math.min(LEVELS.length, Number(parsed.current) || 1)),
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers.filter((s) => typeof s === "string") : [],
      creations: Math.max(0, Number(parsed.creations) || 0)
    };
  } catch {
    return fallback; // the game must work without storage
  }
}

export function saveProgress(storage, progress) {
  try { storage?.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* private mode */ }
}

// Cancellation-safe timers (same pattern as Memory Echo).
export class GenerationScheduler {
  constructor({ setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) } = {}) {
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.generation = 0;
    this.pending = new Set();
  }
  cancel() {
    this.generation += 1;
    for (const timer of this.pending) this.clearTimer(timer);
    this.pending.clear();
    return this.generation;
  }
  token() { return this.generation; }
  current(token) { return token === this.generation; }
  wait(ms, token = this.generation) {
    return new Promise((resolve) => {
      if (!this.current(token)) return resolve(false);
      const timer = this.setTimer(() => {
        this.pending.delete(timer);
        resolve(this.current(token));
      }, ms);
      this.pending.add(timer);
    });
  }
}

// Column taps must keep a >=64px target on the 9.7" iPad in BOTH orientations,
// so shelf rows may run slightly short while columns stay wide.
export function calculateBoardGeometry({ width, height, cols = COLS, rows = ROWS, laneRatio = 1.15, stretch = 1.15, floor = 48 } = {}) {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const cellH = Math.floor(safeHeight / (rows + laneRatio));
  const cellW = Math.min(Math.floor(safeWidth / cols), Math.max(floor, Math.round(cellH * stretch)));
  return { cellW, cellH, boardWidth: cellW * cols, boardHeight: cellH * rows, laneHeight: Math.round(cellH * laneRatio) };
}
