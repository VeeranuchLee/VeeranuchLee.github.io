// Music Book — instrument synthesis.
//
// AUDIO-DIRECTION.md decision 6: this book ships no audio assets. Every timbre
// below is built from oscillators, envelopes, a filter and a synthetic reverb
// at the moment a note sounds. Nothing is fetched. `scripts/preflight.sh`
// enforces that, so if you are here looking for where the samples load: there
// are none, and adding some fails the build.

// Every spelling the note regex can produce, all 21 of them. B# and E# are real
// notes, not typos: B# is the raised seventh of C# minor, which is why Moonlight
// Sonata is written with one. They were missing here, so `SEMITONE['B#']` was
// undefined, the frequency came out NaN, and setting an oscillator to NaN threw
// from a line that named the oscillator rather than the note -- with the result
// that a featured piece was silent on every companion and the console blamed the
// synthesiser. Cb and Fb are included for the same reason before someone needs them.
//
// B#3 and Cb4 are deliberately out of their octave's 0-11 range: the value is a
// semitone offset from C of the WRITTEN octave, so B#3 resolves to MIDI 60 (C4)
// and Cb4 to 59 (B3), which is where those notes actually sound.
const SEMITONE = {
  Cb: -1, C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, Fb: 4, E: 4, 'E#': 5, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, 'B#': 12
};

const MASTER_LEVEL = 0.5;
const MUTE_TIME = 0.08;
const DUCK_LEVEL = 0.2;
const DUCK_DOWN = 0.12;
const DUCK_UP = 0.35;

export function noteToFrequency(name) {
  const parsed = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!parsed) throw new Error(`unreadable note name: ${name}`);
  const semitone = SEMITONE[parsed[1]];
  // The table above is total for this regex, so this cannot fire today. It stays
  // because the failure it replaces was a silent NaN travelling three functions
  // from its cause: if someone trims the table, this names the note instead.
  if (semitone === undefined) throw new Error(`no semitone for note name: ${name}`);
  const midi = (parseInt(parsed[2], 10) + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.reverbBus = null;
    this.convolver = null;
    this.instrument = null;
    this.voices = new Set();
    this.buses = null;
    this.muted = false;
    this.ducks = new Set();
    this._noise = null;
    this._voiceSources = new WeakMap();
  }

  // Browsers refuse to start audio without a gesture, so this is called from
  // the first tap rather than on load.
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    // Gentle volume is a stated requirement, not a default. A child hears this
    // hundreds of times.
    this.master.gain.value = this.muted ? 0 : MASTER_LEVEL;
    this.master.connect(this.ctx.destination);

    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this._impulseResponse(2.0, 2.5);
    this.convolver.connect(this.master);

    this.buses = {
      music: this._bus(),
      bed: this._bus(),
      ambience: this._bus(),
      voice: this._bus()
    };
    this.reverbBus = this.buses.music.wet;

    return this.ctx;
  }

  // A bus has both a dry path to master and a wet path to the shared reverb.
  // Ducking moves both gains together, so the reverb tail cannot wash over a
  // spoken title after the dry sound has moved aside.
  _bus() {
    const dry = this.ctx.createGain();
    dry.gain.value = 1;
    dry.connect(this.master);
    const wet = this.ctx.createGain();
    wet.gain.value = 1;
    wet.connect(this.convolver);
    return { dry, wet };
  }

  bus(name) {
    return this.buses ? this.buses[name] : null;
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(muted ? 0 : MASTER_LEVEL, now + MUTE_TIME);
  }

  duck(key, on) {
    if (on) this.ducks.add(key);
    else this.ducks.delete(key);
    if (!this.ctx || !this.buses) return;
    const target = this.ducks.size ? DUCK_LEVEL : 1;
    const seconds = this.ducks.size ? DUCK_DOWN : DUCK_UP;
    const now = this.ctx.currentTime;
    ['bed', 'ambience'].forEach((name) => {
      const bus = this.buses[name];
      [bus.dry.gain, bus.wet.gain].forEach((g) => {
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(target, now + seconds);
      });
    });
  }

  connectVoice(element) {
    if (!this.ctx || !this.buses) return false;
    if (this._voiceSources.has(element)) return true;
    try {
      const source = this.ctx.createMediaElementSource(element);
      source.connect(this.buses.voice.dry);
      this._voiceSources.set(element, source);
      return true;
    } catch (err) {
      return false;
    }
  }

  noiseBuffer(seconds = 2.5) {
    if (this._noise) return this._noise;
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    this._noise = buffer;
    return buffer;
  }

  // A room, generated. Exponentially decaying noise is a crude impulse
  // response and completely adequate for a picture book.
  _impulseResponse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  setInstrument(instrument) {
    this.instrument = instrument;
  }

  // Silence one bus immediately — used by pause and by switching pieces.
  stopAll(busName = 'music') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.voices.forEach((voice) => {
      if (voice.bus !== busName) return;
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0, now + 0.03);
        voice.sources.forEach((source) => source.stop(now + 0.05));
      } catch (err) {
        /* a voice that already stopped is not a problem */
      }
      this.voices.delete(voice);
    });
  }

  /**
   * Sound one note.
   * @param {string} noteName  e.g. "E4", "D#5"
   * @param {number} at        seconds on the AudioContext clock
   * @param {number} duration  seconds the note is held
   * @param {number|object} [gainScale=1]  old numeric gain scale, or `{ instrument, bus, level }`
   */
  playNote(noteName, at, duration, gainScale = 1) {
    const opts = typeof gainScale === 'object' && gainScale !== null
      ? gainScale
      : { level: gainScale };
    const instrument = opts.instrument || this.instrument;
    if (!this.ctx || !instrument || !this.buses) return;
    const busName = opts.bus || 'music';
    const bus = this.buses[busName];
    if (!bus) return;
    const { timbre } = instrument;
    const frequency = noteToFrequency(noteName);

    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = timbre.filter.type;
    filter.frequency.value = timbre.filter.frequency;
    if (timbre.filter.Q) filter.Q.value = timbre.filter.Q;

    gain.connect(filter);

    const dry = this.ctx.createGain();
    dry.gain.value = 1 - timbre.reverb.mix;
    filter.connect(dry);
    dry.connect(bus.dry);

    const wet = this.ctx.createGain();
    wet.gain.value = timbre.reverb.mix;
    filter.connect(wet);
    wet.connect(bus.wet);

    const sources = timbre.oscillators.map((partial) => {
      const osc = this.ctx.createOscillator();
      osc.type = partial.type;
      osc.frequency.value = frequency * partial.ratio;
      if (partial.detune) osc.detune.value = partial.detune;
      const partialGain = this.ctx.createGain();
      partialGain.gain.value = partial.gain;
      osc.connect(partialGain);
      partialGain.connect(gain);
      return osc;
    });

    const env = timbre.envelope;
    const peak = (timbre.gain ?? 0.28) * Math.max(0, Math.min(1, opts.level ?? 1));
    const g = gain.gain;
    g.setValueAtTime(0.0001, at);
    g.linearRampToValueAtTime(peak, at + env.attack);

    let stopAt;
    if (env.sustain > 0) {
      // Sustained voice — flute, strings. Holds for the written duration.
      g.linearRampToValueAtTime(peak * env.sustain, at + env.attack + env.decay);
      const releaseStart = Math.max(at + env.attack + env.decay, at + duration);
      g.setValueAtTime(peak * env.sustain, releaseStart);
      g.exponentialRampToValueAtTime(0.0001, releaseStart + env.release);
      stopAt = releaseStart + env.release + 0.05;
    } else {
      // Struck or plucked voice — music box, glockenspiel, piano. The note
      // rings and dies on its own; the written duration decides when the next
      // note arrives, not when this one stops.
      g.exponentialRampToValueAtTime(0.0001, at + env.decay);
      stopAt = at + env.decay + 0.05;
    }

    sources.forEach((osc) => {
      osc.start(at);
      osc.stop(stopAt);
    });

    const voice = { gain, sources, bus: busName };
    this.voices.add(voice);
    sources[0].onended = () => this.voices.delete(voice);
  }
}
