// The sound of a place — the group pages' ambience.
//
// AUDIO-DIRECTION.md decision 9, and decision 6's rule about what to aim for:
// charming, not realistic. Everything here is noise through a filter, or a sine
// wave with its pitch swept, and none of it would survive comparison with a
// field recording. That is the target rather than the limitation. A stylised
// chirp reads as "a bird" to a five-year-old on the first hearing; a real
// recording of a garden reads as background hiss on an iPad speaker.
//
// Three scenes are built, one per open group. Lullaby Lane and Around the World
// are still `status: 'soon'`, so they have no scene: an empty room should sound
// like nothing, and guessing at a place whose art does not exist yet is how you
// end up with ambience that contradicts the picture.
//
// Levels are collected at the top on purpose. They are the numbers the owner
// will want to move after listening on the iPad, and hunting them through four
// builder functions is the difference between a five-second change and a
// twenty-minute one.

// These are not guesses. Every layer was rendered through an OfflineAudioContext
// and measured against a piece playing on the music bus, because "quiet" is the
// easy mistake here: ambience pitched to sound right in headphones at a desk
// disappears entirely on a 9.7" iPad speaker in a room with a child in it.
// The target is roughly 12 dB under a piece — present when nothing else is
// playing, and gone the moment something is.
const LEVEL = {
  breeze: 0.115,       // the low body of moving air
  leaves: 0.055,       // a brighter band on top of it, so the breeze has edges
  hallFloor: 0.14,     // a big room with nobody in it
  hallAir: 0.04,
  bird: 0.13,          // one chirp, at its loudest point
  water: 0.095,        // the steady part of a fountain
  bubble: 0.075        // one drop into it
};

// How far apart the birds are. Long gaps: a bird every two seconds is not a
// garden, it is an alarm, and this plays for as long as the child stays on the
// page.
const BIRD_GAP = [4.5, 11];
const BUBBLE_GAP = [0.14, 0.62];

export const SCENES = {
  'beethoven-hall': ['hall'],
  'mozart-garden': ['breeze', 'birds'],
  'ballet-kingdom': ['water', 'breeze']
};

export function hasScene(groupId) {
  return Boolean(SCENES[groupId]);
}

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class Ambience {
  constructor(engine) {
    this.engine = engine;
    this.sceneId = null;
    this.sources = [];
    // One live timer per intermittent chain, keyed by name and REPLACED rather
    // than appended. Birds and bubbles reschedule themselves for as long as a
    // child stays in a room, so a list would grow by one entry every few
    // hundred milliseconds and never shrink -- a leak with no symptom until it
    // has one.
    this.chains = {};
  }

  start(groupId) {
    if (this.sceneId === groupId) return;
    this.stop();
    const layers = SCENES[groupId];
    if (!layers || !this.engine.ctx) return;
    this.sceneId = groupId;
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
          // Fade rather than cut. Stopping a noise loop on a hard edge is an
          // audible click, and it happens every time a child leaves a room.
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

  // ── the continuous layers ──────────────────────────────────────────────────

  /**
   * Looping filtered noise with a slow swell on it.
   *
   * The swell is what stops it sounding like a broken speaker. Steady filtered
   * noise at a fixed level is heard as equipment; the same noise breathing over
   * fifteen seconds is heard as weather.
   */
  _noiseLayer({ type, frequency, Q, level, sway, swayRate, send = 0 }) {
    const ctx = this.engine.ctx;
    const bus = this.engine.bus('ambience');
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

    // Fade in for the same reason stop fades out.
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

  // A concert hall before anyone plays: almost nothing, but not silence. The
  // reverb send is most of the effect — the room the notes already use, heard
  // on its own.
  _hall() {
    this._noiseLayer({ type: 'lowpass', frequency: 210, Q: 0.4, level: LEVEL.hallFloor, sway: LEVEL.hallFloor * 0.4, swayRate: 0.04 });
    this._noiseLayer({ type: 'bandpass', frequency: 620, Q: 0.6, level: LEVEL.hallAir, sway: LEVEL.hallAir * 0.5, swayRate: 0.06, send: 0.7 });
  }

  _water() {
    this._noiseLayer({ type: 'bandpass', frequency: 900, Q: 1.1, level: LEVEL.water, sway: LEVEL.water * 0.3, swayRate: 0.19 });
    this._bubbles();
  }

  // ── the intermittent layers ───────────────────────────────────────────────

  _bubbles() {
    const drop = () => {
      if (this.sceneId === null) return;
      this._bubble(this.engine.ctx.currentTime + 0.02);
      this.chains.bubbles = setTimeout(drop, rand(...BUBBLE_GAP) * 1000);
    };
    drop();
  }

  /** One drop of water: a short sine sliding UP. Down reads as a plunk. */
  _bubble(at) {
    const ctx = this.engine.ctx;
    const bus = this.engine.bus('ambience');
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const base = rand(420, 760);
    osc.frequency.setValueAtTime(base, at);
    osc.frequency.exponentialRampToValueAtTime(base * rand(1.8, 2.4), at + 0.045);

    const gain = ctx.createGain();
    const level = LEVEL.bubble * rand(0.5, 1);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.004);
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
    // The first bird waits a moment. Arriving in a garden to a chirp on the
    // same beat as the page appearing reads as a sound effect, not a place.
    this.chains.birds = setTimeout(sing, rand(1.2, 3) * 1000);
  }

  /**
   * A bird says a little phrase, not a single beep.
   *
   * This is the whole trick: three chirps with uneven gaps read as a bird, and
   * one chirp on its own reads as a notification. The three shapes below are
   * enough variety that a child listening for a minute never hears the same
   * phrase twice, because the pitch and the gaps are drawn fresh each time.
   */
  _birdMotif(at) {
    const shape = pick(['rising', 'trill', 'call']);
    const home = rand(2300, 3300);
    if (shape === 'rising') {
      const count = Math.floor(rand(2, 5));
      let t = at;
      for (let i = 0; i < count; i += 1) {
        this._chirp(t, home * (1 + i * 0.09), 1.22, rand(0.05, 0.08));
        t += rand(0.08, 0.16);
      }
    } else if (shape === 'trill') {
      const count = Math.floor(rand(5, 8));
      let t = at;
      for (let i = 0; i < count; i += 1) {
        this._chirp(t, home * rand(0.98, 1.04), 1.1, 0.032);
        t += 0.048;
      }
    } else {
      this._chirp(at, home, 1.3, 0.09);
      this._chirp(at + 0.24, home * 0.8, 1.15, 0.11);
    }
  }

  /** One chirp: a sine whose pitch sweeps by `ratio` over its own length. */
  _chirp(at, from, ratio, duration) {
    const ctx = this.engine.ctx;
    const bus = this.engine.bus('ambience');
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(from * ratio, at + duration * 0.85);

    const gain = ctx.createGain();
    const level = LEVEL.bird * rand(0.6, 1);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(gain);
    gain.connect(bus.dry);
    // A little of the room, so the bird is somewhere in the garden rather than
    // inside the iPad.
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    gain.connect(wet);
    wet.connect(bus.wet);

    osc.start(at);
    osc.stop(at + duration + 0.05);
  }
}
