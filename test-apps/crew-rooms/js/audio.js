// audio.js — every sound is synthesised at runtime with WebAudio (AUDIO-DIRECTION.md,
// decision 6: interaction sounds never ship as files). Soft, short, pleasant; no speech.
export class AudioEngine {
  constructor() { this.context = null; this.master = null; }

  async unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.context.destination);
    }
    if (this.context.state !== "running") {
      try { await this.context.resume(); } catch { return false; }
    }
    return this.context.state === "running";
  }

  note(frequency, { dur = 0.22, type = "triangle", at = 0, level = 0.2 } = {}) {
    if (!this.context || this.context.state !== "running") return;
    const start = this.context.currentTime + at;
    const gain = this.context.createGain();
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  ui(kind) {
    const sounds = {
      tap: [[540, { dur: 0.09, level: 0.12 }]],
      pop: [[660, { dur: 0.12, type: "sine", level: 0.14 }]],
      card: [[440, { dur: 0.14, type: "sine", level: 0.12 }]],
      lock: [[240, { dur: 0.12, type: "sine", level: 0.1 }]],
      wrong: [[196, { dur: 0.3, type: "sine", level: 0.16 }]],
      reveal: [[329.63, { dur: 0.18, type: "sine" }], [440, { at: 0.12, dur: 0.22, type: "sine" }]],
      correct: [[523.25, { dur: 0.16 }], [659.25, { at: 0.09, dur: 0.16 }], [783.99, { at: 0.18, dur: 0.3 }]],
      boot: [[261.63, { dur: 0.16 }], [392, { at: 0.11, dur: 0.16 }], [659.25, { at: 0.22, dur: 0.16 }], [783.99, { at: 0.33, dur: 0.4 }]],
      sticker: [[880, { dur: 0.14, type: "sine" }], [1174.66, { at: 0.1, dur: 0.3, type: "sine" }]]
    };
    for (const [frequency, options] of sounds[kind] || []) this.note(frequency, options);
  }
}
