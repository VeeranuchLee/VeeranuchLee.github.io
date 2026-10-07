// Toy Guitar — the session: which toy is mounted, its tone switch and amp
// effects, its four pads, and the rules for switching. Pure apart from the
// hooks it is given, so Node can prove the switching and gating rules.
//
// The shell (app.js) supplies the hooks:
//   releasePointers()        drop every finger the surface is tracking
//   padsOff()                silence every support-pad voice still ringing
//   mountToy(id)             mount that toy's guitar, controls and pads
//   applyTone(tone | null)   set the string sound (lib/toys.js tone object)
//   applyFx(state)           set the amp effects ({ drive, echo, ... })
//   save(snapshot)           persist { model, toys: { id: settings } }
//
// Switching follows Toy Keyboard's lifecycle (TOY-ARCHITECTURE.md
// "Lifecycle and switching invariants"): stop input, release every string and
// pad voice and any playback FIRST, then mount the destination.

import { TOYS, TOY_ORDER, toyById, toneById, hasEffect, cleanSettings } from './toys.js';

export class GuitarSession {
  constructor({ board, recorder, performer, hooks = {}, saved = {} }) {
    this.board = board; this.recorder = recorder; this.performer = performer;
    this.hooks = hooks;
    this.settings = {};
    TOY_ORDER.forEach((id) => { this.settings[id] = cleanSettings(id, saved.toys && saved.toys[id]); });
    this.model = TOYS[saved.model] ? saved.model : 'first';
  }

  _hook(name, ...args) { const fn = this.hooks[name]; return fn ? fn(...args) : undefined; }

  get toy() { return toyById(this.model); }
  get current() { return this.settings[this.model]; }
  snapshot() { return { model: this.model, toys: JSON.parse(JSON.stringify(this.settings)) }; }

  // Mount the saved toy at start-up.
  boot() { this._mount(); }

  // A ribbon tap (or a take's own model change, fromPlayback).
  select(id, { fromPlayback = false } = {}) {
    if (!TOYS[id]) return false;
    if (!fromPlayback) {
      this._hook('releasePointers');
      this.board.releaseAll();
      this._hook('padsOff');
      if (this.recorder.getMode() === 'playing') this.recorder.stop();
    }
    if (id === this.model) return false;
    this.model = id;
    this.recorder.record({ type: 'model', id });
    const s = this.current;
    if (s.tone) this.recorder.record({ type: 'tone', id: s.tone });
    if (Object.keys(s.fx).length) this.recorder.record({ type: 'fx', state: { ...s.fx } });
    this._mount();
    this._hook('save', this.snapshot());
    return true;
  }

  _mount() {
    this._hook('mountToy', this.model);
    this._hook('applyTone', toneById(this.model, this.current.tone));
    this._hook('applyFx', { ...this.current.fx });
  }

  // A support pad. Only the four pads of the mounted toy can be struck.
  pad(padId, velocity = 1) {
    if (!this.toy.pads.some((p) => p.id === padId)) return false;
    this.performer.hit(padId, { velocity });
    return true;
  }

  // The toy's tone switch. A toy without one ignores it.
  setTone(toneId, { fromPlayback = false } = {}) {
    const toy = this.toy;
    if (!toy.tones || !toy.tones.some((t) => t.id === toneId)) return false;
    this.current.tone = toneId;
    if (!fromPlayback) this.recorder.record({ type: 'tone', id: toneId });
    this._hook('applyTone', toneById(this.model, toneId));
    if (!fromPlayback) this._hook('save', this.snapshot());
    return true;
  }

  // An amp effect. Only Electric and Rock have any (lib/toys.js `effects`).
  setFx(name, on, { fromPlayback = false } = {}) {
    if (!hasEffect(this.model, name)) return false;
    this.current.fx[name] = Boolean(on);
    if (!fromPlayback) this.recorder.record({ type: 'fx', state: { ...this.current.fx } });
    this._hook('applyFx', { ...this.current.fx });
    if (!fromPlayback) this._hook('save', this.snapshot());
    return true;
  }

  // A take's recorded effect state: apply only what this toy has.
  applyFxState(state = {}, opts = { fromPlayback: true }) {
    Object.keys(this.current.fx).forEach((name) => { if (name in state) this.setFx(name, state[name], opts); });
  }
}
