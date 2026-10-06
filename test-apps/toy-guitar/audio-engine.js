// Toy Guitar's complete audio shell. Every sound is made at runtime with
// WebAudio; the app ships no audio files, samples or SoundFonts.

const SEMITONE = {
  Cb: -1, C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, Fb: 4, E: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, 'B#': 12
};

export function noteToFrequency(name) {
  const parsed = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!parsed || SEMITONE[parsed[1]] === undefined) throw new Error(`unreadable note name: ${name}`);
  const midi = (Number(parsed[2]) + 1) * 12 + SEMITONE[parsed[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buses = null;
    this.muted = false;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const Context = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Context();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const dry = this.ctx.createGain();
    const wet = this.ctx.createGain();
    dry.connect(this.master);
    wet.connect(this.master);
    dry.gain.value = 1;
    wet.gain.value = 0.7;
    this.buses = { music: { dry, wet } };
    return this.ctx;
  }

  bus(name) { return this.buses?.[name] || null; }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.5, now + 0.08);
  }

  stopAll() {
    // GuitarEngine owns and releases its voices. This method preserves the
    // same small adapter contract used by the offline calibration harness.
  }
}
