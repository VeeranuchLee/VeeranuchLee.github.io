// Music Book — instrument synthesis, and the mixer everything sounds through.
//
// AUDIO-DIRECTION.md decision 6: this book ships no audio assets. Every timbre
// below is built from oscillators, envelopes, a filter and a synthetic reverb
// at the moment a note sounds. Nothing is fetched. `scripts/preflight.sh`
// enforces that, so if you are here looking for where the samples load: there
// are none, and adding some fails the build.
//
// Decision 9 added background music and ambience, which is why this file now
// holds a mixer rather than a single master gain. Four buses hang off master:
//
//   master ── music      the piece the child tapped
//          ├─ bed        the background tune
//          ├─ ambience   birds, water, room tone
//          └─ voice      the spoken title clips (decision 7)
//
// Two things fall out of having them separate, and both are requirements rather
// than tidiness. `setMuted` moves ONE gain, so the Sound toggle cannot leave a
// layer playing that it forgot about. And `duck` can pull the bed and the
// ambience down while leaving the piece and the spoken title at full level —
// the whole reason background sound is allowed here at all.
//
// Each bus is a PAIR of gains, dry and wet, because the reverb send has to be
// duckable too. Ducking only the dry path would leave a bed's reverb tail
// washing over the title clip it was supposed to make room for.

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

// How far the bed and the ambience drop when something in front of them needs
// to be heard, and how long each move takes. Down fast, up slowly: a duck that
// rises as quickly as it falls sounds like a fault, and the child hears the
// background surge back before the last word of the title has finished.
const DUCK_LEVEL = 0.2;
const DUCK_DOWN = 0.12;
const DUCK_UP = 0.5;

// Master level. The Sound toggle ramps between this and silence rather than
// jumping, which is the difference between turning sound off and a click.
const MASTER_LEVEL = 0.5;
const MUTE_TIME = 0.08;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.instrument = null;
    this.voices = new Set();
    this.buses = null;
    this.muted = false;
    // Ducking is keyed rather than counted. A spoken title and a playing piece
    // can both want the background out of the way, and they finish in either
    // order; with a counter, an unbalanced release leaves the bed quiet forever.
    // With keys, releasing a key that was never held is simply nothing.
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

    // One room for the whole book. Every bus sends to the same convolver, so a
    // bird and a piano note sound like they are in the same place.
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this._impulseResponse(2.0, 2.5);
    this.convolver.connect(this.master);

    this.buses = {
      music: this._bus(),
      bed: this._bus(),
      ambience: this._bus(),
      voice: this._bus()
    };

    // Kept because `playNote` defaulted to it and a stray caller elsewhere is
    // cheaper to absorb than to hunt: the reverb send of the music bus.
    this.reverbBus = this.buses.music.wet;

    return this.ctx;
  }

  // A bus is a dry gain into master and a wet gain into the shared room. Both
  // move together when the bus ducks — see the note at the top of the file.
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

  /** The Sound toggle. One gain, so nothing can be left playing unnoticed. */
  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(muted ? 0.0001 : MASTER_LEVEL, now + MUTE_TIME);
  }

  /**
   * Pull the background out of the way, or let it back.
   * @param {string} key   who is asking — 'voice', 'piece'
   * @param {boolean} on   true to duck, false to release this key
   */
  duck(key, on) {
    if (on) this.ducks.add(key); else this.ducks.delete(key);
    if (!this.ctx) return;
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

  /**
   * Route a spoken-title `<audio>` element through the mixer.
   *
   * This is what makes ducking possible at all: before it, the title clips
   * played straight to the output and nothing could move out of their way.
   * A media element accepts exactly one source node in its lifetime, so the
   * node is remembered per element. Returns false if the browser refuses, and
   * the caller then lets the element play on its own — quiet titles would be a
   * worse failure than un-duckable ones.
   */
  connectVoice(element) {
    if (!this.ctx) return false;
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

  /**
   * White noise, generated once and looped. Ambience is built from it, and
   * regenerating it per layer was audibly identical and measurably slower.
   */
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

  /**
   * Silence a bus immediately — used by pause and by switching pieces.
   *
   * It takes a bus name because the bed sounds through this same synthesiser.
   * Stopping "everything" when a child pauses a piece would also cut the
   * background tune, which was never what pause meant.
   */
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
   * @param {object} [opts]
   * @param {object} [opts.instrument]  play on a timbre other than the chosen companion
   * @param {string} [opts.bus]         'music' (default) or 'bed'
   * @param {number} [opts.level]       multiplies the timbre's own gain; the bed is well under 1
   */
  playNote(noteName, at, duration, opts = {}) {
    const instrument = opts.instrument || this.instrument;
    if (!this.ctx || !instrument) return;
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
    const peak = (timbre.gain ?? 0.28) * (opts.level ?? 1);
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
