// The sound of a place, built live from oscillators and filtered noise.
// Charming and readable beats realistic: the goal is a picture-book cue that
// stays well under the music, not a field recording.

const LEVEL = {
  breeze: 0.115,
  leaves: 0.055,
  hallFloor: 0.14,
  hallAir: 0.04,
  bird: 0.13,
  water: 0.095,
  bubble: 0.075
};

const BIRD_GAP = [4.5, 11];
const BUBBLE_GAP = [0.14, 0.62];

export const SCENES = {
  'melody-detective-workshop': ['hall'],
  'playground-of-patterns': ['breeze', 'birds'],
  'steps-beats-marches': ['hall'],
  'home-distance-belonging': ['breeze'],
  'gardens-season-memory': ['breeze', 'birds'],
  'southeast-asian-courtyard': ['water', 'breeze'],
  'roads-prayer-city-sea': ['water', 'breeze'],
  'celebration-square': ['breeze'],
  'winter-lanterns': ['breeze'],
  'baroque-pattern-workshop': ['hall'],
  'baroque-stage-seasons-water-fireworks': ['water', 'breeze'],
  'vienna-classical-city': ['hall'],
  'beethoven-door-two-eras': ['hall'],
  'music-learns-to-sing': ['hall'],
  'piano-diary': ['hall'],
  'ballet-kingdom': ['water', 'breeze'],
  'when-music-storybook': ['breeze'],
  'three-theatre-cities': ['hall'],
  'painting-with-sound': ['water', 'breeze'],
  'new-century-many-sounds': ['hall']
};

export function hasScene(roomId) {
  return Boolean(SCENES[roomId]);
}

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class Ambience {
  constructor(engine) {
    this.engine = engine;
    this.sceneId = null;
    this.sources = [];
    this.chains = {};
  }

  start(roomId) {
    if (this.sceneId === roomId) return;
    this.stop();
    const layers = SCENES[roomId];
    if (!layers || !this.engine.ctx) return;
    this.sceneId = roomId;
    layers.forEach((layer) => this[`_${layer}`]());
  }

  stop() {
    this.sceneId = null;
    Object.values(this.chains).forEach((id) => clearTimeout(id));
    this.chains = {};
    const ctx = this.engine.ctx;
    this.sources.forEach(({ source, gain }) => {
      try {
        if (ctx) {
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
          source.stop(now + 0.3);
        } else {
          source.stop();
        }
      } catch (err) {
        /* already stopped */
      }
    });
    this.sources = [];
  }

  _noiseLayer({ type, frequency, Q, level, sway, swayRate, send = 0 }) {
    const ctx = this.engine.ctx;
    const bus = this.engine.bus('ambience');
    if (!ctx || !bus) return;
    const source = ctx.createBufferSource();
    source.buffer = this.engine.noiseBuffer();
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    if (Q) filter.Q.value = Q;

    const gain = ctx.createGain();
    gain.gain.value = level;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus.dry);
    if (send > 0) {
      const wet = ctx.createGain();
      wet.gain.value = send;
      gain.connect(wet);
      wet.connect(bus.wet);
    }

    if (sway) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = swayRate;
      const depth = ctx.createGain();
      depth.gain.value = sway;
      lfo.connect(depth);
      depth.connect(gain.gain);
      lfo.start();
      this.sources.push({ source: lfo, gain: depth });
    }

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.8);
    source.start(now);
    this.sources.push({ source, gain });
  }

  _breeze() {
    this._noiseLayer({ type: 'lowpass', frequency: 480, Q: 0.4, level: LEVEL.breeze, sway: LEVEL.breeze * 0.55, swayRate: 0.07 });
    this._noiseLayer({ type: 'bandpass', frequency: 1450, Q: 0.8, level: LEVEL.leaves, sway: LEVEL.leaves * 0.7, swayRate: 0.11 });
  }

  _hall() {
    this._noiseLayer({ type: 'lowpass', frequency: 210, Q: 0.4, level: LEVEL.hallFloor, sway: LEVEL.hallFloor * 0.4, swayRate: 0.04 });
    this._noiseLayer({ type: 'bandpass', frequency: 620, Q: 0.6, level: LEVEL.hallAir, sway: LEVEL.hallAir * 0.5, swayRate: 0.06, send: 0.7 });
  }

  _water() {
    this._noiseLayer({ type: 'bandpass', frequency: 900, Q: 1.1, level: LEVEL.water, sway: LEVEL.water * 0.3, swayRate: 0.19 });
    this._bubbles();
  }

  _bubbles() {
    const drop = () => {
      if (this.sceneId === null) return;
      this._bubble(this.engine.ctx.currentTime + 0.02);
      this.chains.bubbles = setTimeout(drop, rand(...BUBBLE_GAP) * 1000);
    };
    drop();
  }

  _bubble(at) {
    const ctx = this.engine.ctx;
    const bus = this.engine.bus('ambience');
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const base = rand(420, 760);
    osc.frequency.setValueAtTime(base, at);
    osc.frequency.exponentialRampToValueAtTime(base * rand(1.8, 2.4), at + 0.045);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(LEVEL.bubble * rand(0.5, 1), at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);

    osc.connect(gain);
    gain.connect(bus.dry);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    gain.connect(wet);
    wet.connect(bus.wet);
    osc.start(at);
    osc.stop(at + 0.1);
  }

  _birds() {
    const sing = () => {
      if (this.sceneId === null) return;
      this._birdMotif(this.engine.ctx.currentTime + 0.05);
      this.chains.birds = setTimeout(sing, rand(...BIRD_GAP) * 1000);
    };
    this.chains.birds = setTimeout(sing, rand(1.2, 3) * 1000);
  }

  _birdMotif(at) {
    const shape = pick(['rising', 'trill', 'call']);
    const home = rand(2300, 3300);
    if (shape === 'rising') {
      let t = at;
      for (let i = 0; i < Math.floor(rand(2, 5)); i += 1) {
        this._chirp(t, home * (1 + i * 0.09), 1.22, rand(0.05, 0.08));
        t += rand(0.08, 0.16);
      }
    } else if (shape === 'trill') {
      let t = at;
      for (let i = 0; i < Math.floor(rand(5, 8)); i += 1) {
        this._chirp(t, home * rand(0.98, 1.04), 1.1, 0.032);
        t += 0.048;
      }
    } else {
      this._chirp(at, home, 1.3, 0.09);
      this._chirp(at + 0.24, home * 0.8, 1.15, 0.11);
    }
  }

  _chirp(at, from, ratio, duration) {
    const ctx = this.engine.ctx;
    const bus = this.engine.bus('ambience');
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(from * ratio, at + duration * 0.85);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(LEVEL.bird * rand(0.6, 1), at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(gain);
    gain.connect(bus.dry);
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    gain.connect(wet);
    wet.connect(bus.wet);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }
}
