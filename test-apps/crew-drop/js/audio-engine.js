// Every sound is synthesised here at runtime with WebAudio (AUDIO-DIRECTION.md
// decision 6): no audio files ship, nothing is fetched, there is no speech.
const CHAIN_NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 987.77];

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.mediaUnlockAttempted = false;
  }

  // The iPad Silent-mode unlock path proven in Memory Echo (2026-10-18/19).
  usePlaybackSession() {
    const session = globalThis.navigator?.audioSession;
    if (!session) return false;
    try { session.type = "playback"; return true; } catch { return false; }
  }

  bridgeOlderWebKit() {
    if (this.mediaUnlockAttempted) return;
    this.mediaUnlockAttempted = true;
    try {
      const samples = 200;
      const wav = new Uint8Array(44 + samples);
      const view = new DataView(wav.buffer);
      const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
      text(0, "RIFF"); view.setUint32(4, 36 + samples, true); text(8, "WAVE"); text(12, "fmt ");
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, 8000, true); view.setUint32(28, 8000, true);
      view.setUint16(32, 1, true); view.setUint16(34, 8, true); text(36, "data"); view.setUint32(40, samples, true);
      wav.fill(128, 44);
      const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
      const audio = new Audio();
      audio.preload = "auto";
      audio.playsInline = true;
      audio.setAttribute("playsinline", "");
      audio.src = url;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        URL.revokeObjectURL(url);
      };
      audio.addEventListener("ended", release, { once: true });
      setTimeout(release, 250);
      const play = audio.play();
      if (play?.catch) play.catch(release);
    } catch { /* Web Audio resume below remains the primary unlock path. */ }
  }

  async unlock() {
    if (!this.usePlaybackSession() && !this.mediaUnlockAttempted) this.bridgeOlderWebKit();
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = .6;
      this.master.connect(this.context.destination);
    }
    if (this.context.state !== "running" && this.context.state !== "closed") {
      try { await this.context.resume(); } catch { return false; }
    }
    return this.context.state === "running";
  }

  get running() { return !!this.context && this.context.state === "running"; }

  tone({ freq, type = "sine", dur = .16, gain = .16, delay = 0, slideTo = 0 }) {
    if (!this.running) return;
    const now = this.context.currentTime + delay;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + .012);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + dur);
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur * .9);
    osc.connect(envelope).connect(this.master);
    osc.start(now);
    osc.stop(now + dur + .03);
  }

  // Soft, short, pleasant. The stuck cue is a calm low pair — never a buzzer.
  ui(kind, step = 0) {
    const chainNote = CHAIN_NOTES[Math.min(step, CHAIN_NOTES.length - 1)];
    const arp = (notes, dur, gain) => notes.map((freq, i) => ({ freq, type: "triangle", dur, gain, delay: i * (dur * .55) }));
    const sounds = {
      tap: [{ freq: 520, type: "triangle", dur: .07, gain: .12 }],
      squeak: [{ freq: 660, type: "sine", dur: .1, gain: .14, slideTo: 990 }],
      flip: [{ freq: 620, type: "triangle", dur: .05, gain: .1 }, { freq: 780, type: "triangle", dur: .06, gain: .1, delay: .06 }],
      drop: [{ freq: 150, type: "sine", dur: .12, gain: .2 }, { freq: 300, type: "triangle", dur: .05, gain: .07, delay: .02 }],
      chain: [{ freq: chainNote, type: "triangle", dur: .2, gain: .18 }, { freq: chainNote * 2, type: "sine", dur: .12, gain: .05 }],
      bug: [{ freq: 880, type: "sine", dur: .09, gain: .14, slideTo: 1174 }, { freq: 1174, type: "sine", dur: .1, gain: .1, delay: .09 }],
      sparkle: [{ freq: 1568, type: "sine", dur: .12, gain: .08 }],
      stuck: [{ freq: 233, type: "sine", dur: .3, gain: .14 }, { freq: 174, type: "sine", dur: .34, gain: .12, delay: .18 }],
      paint: arp([523.25, 659.25, 783.99, 1046.5], .12, .14),
      win: arp([523.25, 659.25, 783.99, 1046.5], .22, .16),
      retry: [{ freq: 392, type: "sine", dur: .2, gain: .12 }, { freq: 294, type: "sine", dur: .26, gain: .12, delay: .16 }],
      yawn: [{ freq: 130, type: "sine", dur: .07, gain: .16 }, { freq: 130, type: "sine", dur: .07, gain: .16, delay: .13 }, { freq: 349, type: "sine", dur: .5, gain: .1, slideTo: 196, delay: .22 }],
      chime: [{ freq: 880, type: "sine", dur: .3, gain: .1 }, { freq: 1318.5, type: "sine", dur: .34, gain: .08, delay: .02 }],
      tick: [{ freq: 990, type: "triangle", dur: .04, gain: .08 }],
      wiggle: [{ freq: 196, type: "square", dur: .06, gain: .05 }]
    };
    for (const note of sounds[kind] || []) this.tone(note);
  }
}
