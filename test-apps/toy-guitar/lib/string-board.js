// Toy Guitar — the physical string / fret state model. Pure; no DOM, no audio.
//
// A guitar has six strings and each string can sound only ONE fret position at
// a time. Every finger touching a string at a fret is a "fret touch" keyed by
// pointer id. The string's active fret is the HIGHEST fret among its touches
// (closest to the body wins); when that finger lifts the next highest takes
// over, and when none are left the string is open again. This is deterministic
// and independent of the order the fingers arrived in.
//
// The board never makes sound. It reports what should happen through the
// `performer` object it is given:
//
//   performer.pluck(lane, fret, { velocity, bend, when, via })
//   performer.retune(lane, fret, { bend, via })      slide / bend while ringing
//   performer.mute()                                   damp everything
//   performer.held(lane, fret | null)                  visual: held fret changed
//
// `when` is seconds from now (0 = immediately); strums use it to preserve the
// real finger-crossing spacing. A recorder wraps a performer and sees the same
// calls, so a take keeps strings, frets, timing, slides and bends.

import { STRING_COUNT, FRET_COUNT, checkPosition } from './theory.js';

export const MAX_BEND_CENTS = 200;

export class StringBoard {
  constructor(performer, clock = () => 0) {
    this.performer = performer;
    this.clock = clock; // seconds; only used to notice a faded string during a slide
    this.touches = Array.from({ length: STRING_COUNT }, () => new Map()); // pointerId -> fret
    this.bends = Array.from({ length: STRING_COUNT }, () => ({ owner: null, cents: 0 }));
    this.lastPluck = new Array(STRING_COUNT).fill(-Infinity);
  }

  // The fret a string currently sounds at: highest held, else open (0).
  activeFret(lane) {
    let best = 0;
    for (const fret of this.touches[lane].values()) if (fret > best) best = fret;
    return best;
  }

  isFretted(lane) { return this.touches[lane].size > 0; }

  // Frets currently held (any pointer) on a string, for the visuals.
  heldFrets(lane) { return [...new Set(this.touches[lane].values())].sort((a, b) => a - b); }

  // The pointer whose finger decides the pitch of this string right now.
  _owner(lane) {
    let best = -1; let owner = null;
    for (const [pointerId, fret] of this.touches[lane]) {
      if (fret > best) { best = fret; owner = pointerId; }
    }
    return owner;
  }

  bendCents(lane) {
    const bend = this.bends[lane];
    return bend.owner !== null && bend.owner === this._owner(lane) ? bend.cents : 0;
  }

  _emitHeld(lane) {
    const frets = this.heldFrets(lane);
    this.performer.held(lane, frets.length ? frets[frets.length - 1] : null, frets);
  }

  // A finger lands on a string in the neck. It plucks at once (tap-to-pluck)
  // and, while it stays down, keeps that string fretted.
  fretDown(pointerId, lane, fret, opts = {}) {
    checkPosition(lane, fret);
    if (this.touches[lane].has(pointerId)) this.fretUp(pointerId, lane);
    this.touches[lane].set(pointerId, fret);
    this._emitHeld(lane);
    this.pluck(lane, { velocity: opts.velocity ?? 0.8, via: 'tap', when: 0 });
  }

  // The same finger drags along the string. Pitch follows the active fret:
  // stepped fret to fret, immediate, no lift needed.
  fretMove(pointerId, lane, fret, sustain = 3) {
    checkPosition(lane, fret);
    const held = this.touches[lane];
    if (!held.has(pointerId) || held.get(pointerId) === fret) return false;
    const before = this.activeFret(lane);
    held.set(pointerId, fret);
    this._emitHeld(lane);
    const after = this.activeFret(lane);
    if (after === before) return true;
    // A string that has long since faded is plucked again, softly, so the
    // slide never goes silent under a finger that is still moving.
    if (this.clock() - this.lastPluck[lane] > sustain) {
      this.pluck(lane, { velocity: 0.5, via: 'slide', when: 0 });
    } else {
      this.performer.retune(lane, after, { bend: this.bendCents(lane), via: 'slide' });
    }
    return true;
  }

  // Bend a held note. Only the finger deciding the pitch can bend the string.
  fretBend(pointerId, lane, cents) {
    if (!this.touches[lane].has(pointerId)) return false;
    const clamped = Math.max(0, Math.min(MAX_BEND_CENTS, cents));
    const bend = this.bends[lane];
    if (bend.owner === pointerId ? Math.abs(bend.cents - clamped) < 1 : clamped < 1) return false;
    bend.owner = pointerId; bend.cents = clamped;
    if (this._owner(lane) !== pointerId) return false;
    this.performer.retune(lane, this.activeFret(lane), { bend: clamped, via: 'bend' });
    return true;
  }

  // The finger lifts (or its pointer is cancelled). The ringing note is left
  // to decay at its own pitch; only FUTURE plucks use the fallback fret.
  fretUp(pointerId, lane) {
    const held = this.touches[lane];
    if (!held.delete(pointerId)) return false;
    const bend = this.bends[lane];
    if (bend.owner === pointerId) { bend.owner = null; bend.cents = 0; }
    this._emitHeld(lane);
    return true;
  }

  // Pluck one string at its active fret (body tap, strum crossing, fret tap).
  pluck(lane, { velocity = 0.8, when = 0, via = 'pick' } = {}) {
    const fret = this.activeFret(lane);
    this.lastPluck[lane] = this.clock() + when;
    this.performer.pluck(lane, fret, { velocity, bend: this.bendCents(lane), when, via });
  }

  // Strum crossings from geometry: [{ lane, t }] in seconds, ascending t.
  // The first crossing sounds at once; the rest keep their real spacing.
  strum(crossings, velocity = 0.74, direction = 'down') {
    if (!crossings.length) return;
    const t0 = crossings[0].t;
    for (const crossing of crossings) {
      this.pluck(crossing.lane, { velocity, when: Math.max(0, crossing.t - t0), via: 'strum-' + direction });
    }
  }

  // Damp every string immediately. Held fingers stay down (state is not
  // cleared) — Mute is a hand on the strings, not a lifted hand.
  mute() { this.performer.mute(); this.lastPluck.fill(-Infinity); }

  // Every cancellation path (guitar switch, blur, page hide, pointer cancel
  // on all pointers) ends here: drop every touch and bend and silence.
  releaseAll({ silence = true } = {}) {
    for (let lane = 0; lane < STRING_COUNT; lane += 1) {
      const had = this.touches[lane].size > 0;
      this.touches[lane].clear();
      this.bends[lane].owner = null; this.bends[lane].cents = 0;
      if (had) this._emitHeld(lane);
    }
    this.lastPluck.fill(-Infinity);
    if (silence) this.performer.mute();
  }

  snapshot() {
    return this.touches.map((_, lane) => ({ lane, fret: this.activeFret(lane), held: this.heldFrets(lane), bend: this.bendCents(lane) }));
  }
}

export { STRING_COUNT, FRET_COUNT };
