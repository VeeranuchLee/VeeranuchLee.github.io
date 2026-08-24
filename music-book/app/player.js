// Score playback and note following.
//
// Audio is scheduled once, up front, on the AudioContext clock — that is the
// only clock that does not drift. The moving highlight is driven separately by
// requestAnimationFrame reading that same clock, so the picture cannot slide
// out of step with the sound even if the page stutters.

export class Player {
  constructor(engine) {
    this.engine = engine;
    this.score = null;
    this.tempoScale = 1;
    this.timeline = [];
    this.startedAt = 0;
    this.playing = false;
    this.rafId = null;
    this.currentIndex = -1;
    this.onNote = () => {};
    this.onFinish = () => {};
  }

  /** Seconds per beat, after the slow-mode multiplier. */
  _secondsPerBeat() {
    return 60 / (this.score.tempo * this.tempoScale);
  }

  load(score) {
    this.stop();
    this.score = score;
  }

  setTempoScale(scale) {
    const wasPlaying = this.playing;
    this.tempoScale = scale;
    if (wasPlaying) {
      this.stop();
      this.play();
    }
  }

  get duration() {
    if (!this.score) return 0;
    const beats = this.score.notes.reduce((total, note) => total + note.d, 0);
    return beats * this._secondsPerBeat();
  }

  play() {
    if (!this.score || this.playing) return;
    const ctx = this.engine.start();
    const spb = this._secondsPerBeat();

    // A small lead-in so the first note is scheduled in the future, not in the
    // past. Scheduling at exactly currentTime makes the first note click.
    const begin = ctx.currentTime + 0.08;
    let cursor = 0;

    this.timeline = this.score.notes.map((note, index) => {
      const at = begin + cursor * spb;
      const seconds = note.d * spb;
      cursor += note.d;
      if (note.n) this.engine.playNote(note.n, at, seconds);
      return { index, at, until: at + seconds, rest: !note.n };
    });

    this.startedAt = begin;
    this.playing = true;
    this.currentIndex = -1;
    this._follow();
  }

  _follow() {
    const ctx = this.engine.ctx;
    const tick = () => {
      if (!this.playing) return;
      const now = ctx.currentTime;
      const active = this.timeline.findIndex((slot) => now >= slot.at && now < slot.until);

      if (active !== this.currentIndex) {
        this.currentIndex = active;
        this.onNote(active, this.timeline[active] || null);
      }

      const last = this.timeline[this.timeline.length - 1];
      if (now >= last.until) {
        this.playing = false;
        this.currentIndex = -1;
        this.onNote(-1, null);
        this.onFinish();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  pause() {
    if (!this.playing) return;
    this.stop();
  }

  stop() {
    this.playing = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.currentIndex = -1;
    this.engine.stopAll();
    this.onNote(-1, null);
  }

  /** Sound one note on its own, for tapping a note in the strip. */
  pluck(noteName) {
    if (!noteName) return;
    const ctx = this.engine.start();
    this.engine.playNote(noteName, ctx.currentTime + 0.02, 0.6);
  }
}
