export const MODE_SIZES = Object.freeze({ colours: 4, numbers: 9, music: 8 });

export class MemoryGame {
  constructor({ mode = "colours", startLength = 4, random = Math.random, storage = null } = {}) {
    if (!MODE_SIZES[mode]) throw new Error("Unknown mode");
    this.mode = mode;
    this.startLength = Math.max(2, Math.min(5, Number(startLength) || 4));
    this.random = random;
    this.storage = storage;
    this.sequence = [];
    this.inputIndex = 0;
  }

  nextItem() {
    return Math.min(MODE_SIZES[this.mode] - 1, Math.floor(this.random() * MODE_SIZES[this.mode]));
  }

  start() {
    this.sequence = Array.from({ length: this.startLength }, () => this.nextItem());
    this.inputIndex = 0;
    return [...this.sequence];
  }

  resetInput() { this.inputIndex = 0; }

  checkInput(item) {
    if (item !== this.sequence[this.inputIndex]) {
      this.inputIndex = 0;
      return { status: "mistake", sequence: [...this.sequence] };
    }
    this.inputIndex += 1;
    if (this.inputIndex === this.sequence.length) {
      this.inputIndex = 0;
      return { status: "success", length: this.sequence.length };
    }
    return { status: "continue", remaining: this.sequence.length - this.inputIndex };
  }

  advance() {
    const prefix = [...this.sequence];
    this.sequence.push(this.nextItem());
    this.inputIndex = 0;
    return { prefix, sequence: [...this.sequence] };
  }

  bestKey() { return `memoryEcho.best.${this.mode}.${this.startLength}`; }

  getBest() {
    try { return Math.max(0, Number(this.storage?.getItem(this.bestKey())) || 0); }
    catch { return 0; }
  }

  updateBest(length) {
    const previous = this.getBest();
    if (length <= previous) return previous;
    try { this.storage?.setItem(this.bestKey(), String(length)); } catch { /* private storage can fail */ }
    return length;
  }
}

export class GenerationScheduler {
  constructor({ setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id), onCancel = () => {} } = {}) {
    // Arrow wrappers: calling window.setTimeout with this=scheduler throws "Illegal invocation" in browsers.
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.onCancel = onCancel;
    this.generation = 0;
    this.pending = new Set();
  }

  cancel() {
    this.generation += 1;
    for (const timer of this.pending) this.clearTimer(timer);
    this.pending.clear();
    this.onCancel();
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
