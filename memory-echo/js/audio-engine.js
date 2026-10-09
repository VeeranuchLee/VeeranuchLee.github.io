const COLOUR_FREQ = [261.63, 329.63, 392, 523.25];
const NUMBER_FREQ = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33];
const MUSIC_FREQ = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];

export class AudioEngine {
  constructor() { this.context = null; this.master = null; this.voices = new Map(); }

  async unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = .6;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  stopAll() {
    for (const voice of this.voices.values()) {
      try { voice.gain.gain.cancelScheduledValues(this.context.currentTime); voice.gain.gain.setValueAtTime(0, this.context.currentTime); voice.oscs.forEach((o) => o.stop()); } catch { /* already ended */ }
    }
    this.voices.clear();
  }

  stopKey(key) {
    const old = this.voices.get(key);
    if (!old) return;
    try { old.gain.gain.setTargetAtTime(0, this.context.currentTime, .008); old.oscs.forEach((o) => o.stop(this.context.currentTime + .04)); } catch { /* ended */ }
    this.voices.delete(key);
  }

  tone(mode, index, duration = .34) {
    if (!this.context || this.context.state !== "running") return;
    const key = `${mode}-${index}`;
    this.stopKey(key);
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    const frequencies = mode === "colours" ? COLOUR_FREQ : mode === "numbers" ? NUMBER_FREQ : MUSIC_FREQ;
    const frequency = frequencies[index];
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(mode === "music" ? .32 : .25, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    gain.connect(this.master);
    const specs = mode === "music" ? [[1, "sine", 1], [2.76, "sine", .12]] : mode === "colours" ? [[1, index % 2 ? "triangle" : "sine", 1], [2, "sine", .08]] : [[1, "sine", 1], [4, "triangle", .035]];
    const oscs = specs.map(([multiple, type, level]) => {
      const osc = this.context.createOscillator();
      const trim = this.context.createGain();
      osc.type = type; osc.frequency.value = frequency * multiple; trim.gain.value = level;
      osc.connect(trim).connect(gain); osc.start(now); osc.stop(now + duration + .03); return osc;
    });
    this.voices.set(key, { gain, oscs });
    oscs[0].addEventListener("ended", () => this.voices.delete(key), { once: true });
  }

  ui(kind) {
    if (!this.context || this.context.state !== "running") return;
    const notes = kind === "success" ? [523.25, 659.25, 783.99] : kind === "mistake" ? [196] : [440];
    notes.forEach((frequency, i) => {
      const delay = kind === "success" ? i * .09 : 0;
      const now = this.context.currentTime + delay;
      const gain = this.context.createGain();
      const osc = this.context.createOscillator();
      osc.type = kind === "mistake" ? "sine" : "triangle"; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.18, now + .01); gain.gain.exponentialRampToValueAtTime(.0001, now + .22);
      osc.connect(gain).connect(this.master); osc.start(now); osc.stop(now + .24);
    });
  }
}
